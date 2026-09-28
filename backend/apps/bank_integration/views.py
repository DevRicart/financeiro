from django.db import transaction as db_transaction
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.transactions.models import FinancialAccount, Transaction, TransactionSettlement
from apps.transactions.services import add_settlement

from .models import ImportedTransaction, StatementImport
from .serializers import (
    ImportedTransactionConfirmSerializer,
    ImportedTransactionSerializer,
    StatementImportSerializer,
)
from .services.exceptions import InvalidStatementFile
from .services.statement_import import import_statement


class StatementImportView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request):
        uploaded_file = request.FILES.get("file")
        account_id = request.data.get("account")
        if not uploaded_file or not account_id:
            return Response(
                {"detail": "Envie a conta ('account') e o arquivo ('file')."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        account = FinancialAccount.objects.filter(id=account_id, owner=request.user).first()
        if not account:
            return Response({"detail": "Conta inválida."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            statement_import = import_statement(
                owner=request.user,
                account=account,
                file_name=uploaded_file.name,
                file_obj=uploaded_file,
            )
        except InvalidStatementFile as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(StatementImportSerializer(statement_import).data, status=status.HTTP_201_CREATED)


class StatementImportListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        imports = StatementImport.objects.filter(owner=request.user).select_related("account")
        return Response(StatementImportSerializer(imports, many=True).data)


class ImportedTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ImportedTransactionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["status"]

    def get_queryset(self):
        return ImportedTransaction.objects.filter(
            statement_import__owner=self.request.user
        ).select_related("statement_import__account", "suggested_category")

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
                    "account": imported.statement_import.account,
                    "notes": "Importado de extrato bancário (OFX).",
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
