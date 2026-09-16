from datetime import date

from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.transactions.filters import TransactionFilter
from apps.transactions.models import (
    Client,
    CreditCard,
    FinancialAccount,
    InstallmentPlan,
    RecurrenceRule,
    Transaction,
    TransactionSettlement,
)
from apps.transactions.permissions import IsTransactionOwner
from apps.transactions.selectors import get_user_transactions
from apps.transactions.serializers import (
    ClientSerializer,
    CreditCardPurchaseSerializer,
    CreditCardSerializer,
    FinancialAccountSerializer,
    InstallmentPlanCreateSerializer,
    InstallmentPlanSerializer,
    RecurrenceRuleSerializer,
    TransactionSerializer,
    TransactionSettlementSerializer,
)
from apps.transactions.services import (
    add_settlement,
    create_installment_plan,
    create_transaction,
    generate_due_transactions,
    get_invoice,
    pay_invoice,
    remove_settlement,
    update_transaction,
)


def _parse_month(month_param):
    year, month = (int(part) for part in month_param.split("-"))
    return date(year, month, 1)


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


class ClientViewSet(viewsets.ModelViewSet):
    serializer_class = ClientSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return Client.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class CreditCardViewSet(viewsets.ModelViewSet):
    serializer_class = CreditCardSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return CreditCard.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=["get"], url_path="invoice")
    def invoice(self, request, pk=None):
        credit_card = self.get_object()
        month_param = request.query_params.get("month")
        if not month_param:
            return Response(
                {"detail": "Informe ?month=YYYY-MM."}, status=status.HTTP_400_BAD_REQUEST
            )

        invoice_month = _parse_month(month_param)
        purchases, total = get_invoice(credit_card=credit_card, invoice_month=invoice_month)
        return Response(
            {
                "month": month_param,
                "total": float(total),
                "purchases": CreditCardPurchaseSerializer(purchases, many=True).data,
            }
        )

    @action(detail=True, methods=["post"], url_path="invoice/pay")
    def pay_invoice_action(self, request, pk=None):
        credit_card = self.get_object()
        month_param = request.data.get("month")
        payment_date = request.data.get("payment_date")
        if not month_param or not payment_date:
            return Response(
                {"detail": "Informe month e payment_date."}, status=status.HTTP_400_BAD_REQUEST
            )

        account = None
        account_id = request.data.get("account")
        if account_id:
            account = FinancialAccount.objects.filter(
                owner=request.user, id=account_id
            ).first()

        settlements = pay_invoice(
            credit_card=credit_card,
            invoice_month=_parse_month(month_param),
            payment_date=payment_date,
            account=account,
        )
        return Response({"settled_count": len(settlements)})


class InstallmentPlanViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None
    http_method_names = ["get", "post", "delete"]

    def get_queryset(self):
        return InstallmentPlan.objects.filter(owner=self.request.user).prefetch_related(
            "installments__transaction__category"
        )

    def get_serializer_class(self):
        return InstallmentPlanCreateSerializer if self.action == "create" else InstallmentPlanSerializer

    def create(self, request, *args, **kwargs):
        serializer = InstallmentPlanCreateSerializer(data=request.data, context=self.get_serializer_context())
        serializer.is_valid(raise_exception=True)
        plan = create_installment_plan(user=request.user, **serializer.validated_data)
        return Response(InstallmentPlanSerializer(plan).data, status=status.HTTP_201_CREATED)

    def perform_destroy(self, instance):
        Transaction.objects.filter(installment__plan=instance).delete()
        instance.delete()


class RecurrenceRuleViewSet(viewsets.ModelViewSet):
    serializer_class = RecurrenceRuleSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return RecurrenceRule.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=False, methods=["post"])
    def generate(self, request):
        created = generate_due_transactions(user=request.user)
        return Response({"created_count": len(created)})
