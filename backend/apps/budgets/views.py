import calendar
from datetime import date

from django.db.models import Sum
from rest_framework import permissions, viewsets
from rest_framework.response import Response

from apps.transactions.models import Transaction

from .models import MonthlyBudget
from .serializers import MonthlyBudgetSerializer


class MonthlyBudgetViewSet(viewsets.ModelViewSet):
    serializer_class = MonthlyBudgetSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        queryset = MonthlyBudget.objects.filter(owner=self.request.user).select_related("category")

        month_param = self.request.query_params.get("month")
        if month_param:
            year, month = (int(part) for part in month_param.split("-"))
            queryset = queryset.filter(month__year=year, month__month=month)

        return queryset

    def list(self, request, *args, **kwargs):
        budgets = list(self.filter_queryset(self.get_queryset()))
        self._attach_spent_amounts(budgets)
        return Response(self.get_serializer(budgets, many=True).data)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        self._attach_spent_amounts([instance])
        return Response(self.get_serializer(instance).data)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def _attach_spent_amounts(self, budgets):
        spent_by_key = {}
        for month in {budget.month for budget in budgets}:
            last_day = calendar.monthrange(month.year, month.month)[1]
            start, end = month, date(month.year, month.month, last_day)
            rows = (
                Transaction.objects.filter(
                    owner=self.request.user,
                    transaction_type=Transaction.TransactionType.EXPENSE,
                    competence_date__gte=start,
                    competence_date__lte=end,
                )
                .exclude(status=Transaction.Status.CANCELLED)
                .values("category_id")
                .annotate(total=Sum("total_amount"))
            )
            for row in rows:
                spent_by_key[(row["category_id"], month)] = row["total"]

        for budget in budgets:
            budget.spent_amount = spent_by_key.get((budget.category_id, budget.month), 0)
