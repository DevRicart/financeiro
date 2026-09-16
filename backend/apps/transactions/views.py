from rest_framework import generics, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.transactions.filters import TransactionFilter
from apps.transactions.models import FinancialAccount, TransactionSettlement
from apps.transactions.permissions import IsTransactionOwner
from apps.transactions.selectors import get_user_transactions
from apps.transactions.serializers import (
    FinancialAccountSerializer,
    TransactionSerializer,
    TransactionSettlementSerializer,
)
from apps.transactions.services import (
    add_settlement,
    create_transaction,
    remove_settlement,
    update_transaction,
)


class FinancialAccountViewSet(viewsets.ModelViewSet):
    serializer_class = FinancialAccountSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return FinancialAccount.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class TransactionViewSet(viewsets.ModelViewSet):
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated, IsTransactionOwner]
    filterset_class = TransactionFilter

    def get_queryset(self):
        return get_user_transactions(user=self.request.user)

    def perform_create(self, serializer):
        serializer.instance = create_transaction(
            user=self.request.user, validated_data=serializer.validated_data
        )

    def perform_update(self, serializer):
        serializer.instance = update_transaction(
            transaction=serializer.instance, validated_data=serializer.validated_data
        )

    @action(detail=True, methods=["post"], url_path="settlements")
    def create_settlement(self, request, pk=None):
        transaction = self.get_object()
        serializer = TransactionSettlementSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        settlement = add_settlement(
            transaction=transaction, validated_data=serializer.validated_data
        )
        return Response(TransactionSettlementSerializer(settlement).data, status=201)


class TransactionSettlementDeleteView(generics.DestroyAPIView):
    serializer_class = TransactionSettlementSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return TransactionSettlement.objects.filter(transaction__owner=self.request.user)

    def perform_destroy(self, instance):
        remove_settlement(settlement=instance)
