from django.db import transaction as db_transaction
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.transactions.models import Transaction, TransactionSettlement
from apps.transactions.services import add_settlement

from .models import BankConnection, ImportedTransaction
from .serializers import (
    BankConnectionSerializer,
    ImportedTransactionConfirmSerializer,
    ImportedTransactionSerializer,
)
from .services.pluggy_client import pluggy_client, pluggy_error_handling
from .services.sync import sync_bank_connection


class ConnectTokenView(APIView):
    """Returns a short-lived token for the frontend's Pluggy Connect widget.

    Pass `item_id` to reopen the widget in "update" mode for an existing
    connection (e.g. after a LOGIN_ERROR); omit it to start a new one.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        item_id = request.data.get("item_id")
        connection = None
        if item_id:
            connection = BankConnection.objects.filter(
                owner=request.user, pluggy_item_id=item_id
            ).first()
        with pluggy_error_handling():
            token = pluggy_client.create_connect_token(
                item_id=connection.pluggy_item_id if connection else None
            )
        return Response({"access_token": token})


class BankConnectionViewSet(viewsets.ModelViewSet):
    serializer_class = BankConnectionSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "delete"]
    pagination_class = None

    def get_queryset(self):
        return BankConnection.objects.filter(owner=self.request.user).prefetch_related("accounts")

    def create(self, request, *args, **kwargs):
        item_id = request.data.get("item_id")
        if not item_id:
            return Response({"detail": "item_id é obrigatório."}, status=status.HTTP_400_BAD_REQUEST)

        with pluggy_error_handling():
            item_data = pluggy_client.get_item(item_id)
            connection, _ = BankConnection.objects.update_or_create(
                pluggy_item_id=item_id,
                defaults={
                    "owner": request.user,
                    "institution_name": (item_data.get("connector") or {}).get("name", ""),
                },
            )
            sync_bank_connection(connection)
        return Response(BankConnectionSerializer(connection).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def sync(self, request, pk=None):
        connection = self.get_object()
        with pluggy_error_handling():
            sync_bank_connection(connection)
        return Response(BankConnectionSerializer(connection).data)


class SyncAllConnectionsView(APIView):
    """Meant to be called once when the user opens the app, so every
    connected bank is refreshed before they see the review queue."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        connections = BankConnection.objects.filter(owner=request.user)
        with pluggy_error_handling():
            for connection in connections:
                sync_bank_connection(connection)
        return Response(BankConnectionSerializer(connections, many=True).data)


class ImportedTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ImportedTransactionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["status"]

    def get_queryset(self):
        return ImportedTransaction.objects.filter(
            synced_account__connection__owner=self.request.user
        ).select_related("synced_account", "suggested_category")

    @action(detail=True, methods=["post"])
    def confirm(self, request, pk=None):
        imported = self.get_object()
        serializer = ImportedTransactionConfirmSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with db_transaction.atomic():
            transaction_type = (
                Transaction.TransactionType.EXPENSE
                if imported.amount < 0
                else Transaction.TransactionType.INCOME
            )
            real_transaction = Transaction.objects.create(
                owner=request.user,
                transaction_type=transaction_type,
                category=data["category"],
                title=data["title"],
                description=data.get("description", ""),
                total_amount=abs(imported.amount),
                competence_date=imported.date,
                status=Transaction.Status.COMPLETED,
                is_shared=data.get("is_shared", False),
            )
            add_settlement(
                transaction=real_transaction,
                validated_data={
                    "amount": abs(imported.amount),
                    "settlement_date": imported.date,
                    "payment_method": TransactionSettlement.PaymentMethod.BANK_TRANSFER,
                    "account": imported.synced_account.financial_account,
                    "notes": "Importado automaticamente via Open Finance.",
                },
            )
            imported.status = ImportedTransaction.Status.CONFIRMED
            imported.resulting_transaction = real_transaction
            imported.save(update_fields=["status", "resulting_transaction"])

        return Response(ImportedTransactionSerializer(imported).data)

    @action(detail=True, methods=["post"])
    def ignore(self, request, pk=None):
        imported = self.get_object()
        imported.status = ImportedTransaction.Status.IGNORED
        imported.save(update_fields=["status"])
        return Response(ImportedTransactionSerializer(imported).data)


class PluggyWebhookView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        event = request.data.get("event")
        item_id = request.data.get("itemId")

        if event in ("item/updated", "transactions/created") and item_id:
            connection = BankConnection.objects.filter(pluggy_item_id=item_id).first()
            if connection:
                with pluggy_error_handling():
                    sync_bank_connection(connection)

        return Response(status=status.HTTP_200_OK)
