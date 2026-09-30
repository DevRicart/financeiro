from django.db.models import Sum
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Debt, DebtPayment, DebtRecurrenceRule
from .serializers import DebtPaymentSerializer, DebtRecurrenceRuleSerializer, DebtSerializer
from .services import generate_due_debts


def _recompute_debt_status(debt):
    """Queries payments directly rather than trusting `debt.remaining_amount`:
    `debt` here comes from a queryset with `.prefetch_related("payments")`,
    whose cache would still be empty right after this same request just
    created a new payment (see the identical fix in transactions/services)."""
    if debt.status == Debt.Status.CANCELLED:
        return debt

    paid = DebtPayment.objects.filter(debt=debt).aggregate(total=Sum("amount"))["total"] or 0
    remaining = debt.total_amount - paid
    if remaining <= 0:
        debt.status = Debt.Status.PAID
    elif remaining < debt.total_amount:
        debt.status = Debt.Status.PARTIAL
    else:
        debt.status = Debt.Status.OPEN
    debt.save(update_fields=["status"])
    return debt


class DebtViewSet(viewsets.ModelViewSet):
    serializer_class = DebtSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return Debt.objects.filter(owner=self.request.user).prefetch_related("payments")

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=["post"])
    def payments(self, request, pk=None):
        debt = self.get_object()
        serializer = DebtPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payment = serializer.save(debt=debt)
        _recompute_debt_status(debt)
        return Response(DebtPaymentSerializer(payment).data, status=201)


class DebtRecurrenceRuleViewSet(viewsets.ModelViewSet):
    serializer_class = DebtRecurrenceRuleSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return DebtRecurrenceRule.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=False, methods=["post"])
    def generate(self, request):
        created = generate_due_debts(user=request.user)
        return Response({"created_count": len(created)})
