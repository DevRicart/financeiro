import calendar
from datetime import date

from django.db.models import Sum
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.debts.models import Debt
from apps.debts.serializers import DebtSerializer
from apps.goals.models import FinancialGoal
from apps.goals.serializers import FinancialGoalSerializer
from apps.transactions.models import Transaction


def _month_bounds(request):
    month_param = request.query_params.get("month")  # expected "YYYY-MM"
    today = date.today()
    if month_param:
        year, month = (int(part) for part in month_param.split("-"))
    else:
        year, month = today.year, today.month
    last_day = calendar.monthrange(year, month)[1]
    return date(year, month, 1), date(year, month, last_day)


class DashboardSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        start, end = _month_bounds(request)
        qs = Transaction.objects.filter(
            owner=request.user, competence_date__gte=start, competence_date__lte=end
        ).exclude(status=Transaction.Status.CANCELLED)

        income_qs = qs.filter(transaction_type=Transaction.TransactionType.INCOME)
        expense_qs = qs.filter(transaction_type=Transaction.TransactionType.EXPENSE)

        # Cast every value to float: Sum() returns Decimal (which DRF's
        # JSONEncoder serializes as a *string*) while the `or 0` fallback for
        # "no rows this month" is a plain int (serializes as a *number*) —
        # without normalizing, the same field's JSON type would flip depending
        # on whether the month has data, breaking the frontend charts.
        income_total = float(income_qs.aggregate(total=Sum("total_amount"))["total"] or 0)
        expense_total = float(expense_qs.aggregate(total=Sum("total_amount"))["total"] or 0)

        income_received = float(sum((t.settled_amount for t in income_qs), 0))
        expense_paid = float(sum((t.settled_amount for t in expense_qs), 0))

        return Response(
            {
                "month": start.strftime("%Y-%m"),
                "income_total": income_total,
                "income_received": income_received,
                "income_pending": income_total - income_received,
                "expense_total": expense_total,
                "expense_paid": expense_paid,
                "expense_pending": expense_total - expense_paid,
                "cash_profit": income_received - expense_paid,
                "accrual_profit": income_total - expense_total,
            }
        )


class ExpensesByCategoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        start, end = _month_bounds(request)
        data = (
            Transaction.objects.filter(
                owner=request.user,
                transaction_type=Transaction.TransactionType.EXPENSE,
                competence_date__gte=start,
                competence_date__lte=end,
            )
            .exclude(status=Transaction.Status.CANCELLED)
            .values("category__id", "category__name", "category__icon", "category__color")
            .annotate(total=Sum("total_amount"))
            .order_by("-total")
        )
        return Response([{**row, "total": float(row["total"])} for row in data])


class IncomeByTypeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        start, end = _month_bounds(request)
        data = (
            Transaction.objects.filter(
                owner=request.user,
                transaction_type=Transaction.TransactionType.INCOME,
                competence_date__gte=start,
                competence_date__lte=end,
            )
            .exclude(status=Transaction.Status.CANCELLED)
            .values("income_type")
            .annotate(total=Sum("total_amount"))
            .order_by("-total")
        )
        return Response([{**row, "total": float(row["total"])} for row in data])


class MonthlyEvolutionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        months = int(request.query_params.get("months", 6))
        today = date.today()
        year, month = today.year, today.month
        buckets = []
        for _ in range(months):
            buckets.append((year, month))
            month -= 1
            if month == 0:
                month, year = 12, year - 1
        buckets.reverse()

        results = []
        for year, month in buckets:
            last_day = calendar.monthrange(year, month)[1]
            start, end = date(year, month, 1), date(year, month, last_day)
            qs = Transaction.objects.filter(
                owner=request.user, competence_date__gte=start, competence_date__lte=end
            ).exclude(status=Transaction.Status.CANCELLED)
            income = float(
                qs.filter(transaction_type=Transaction.TransactionType.INCOME).aggregate(
                    total=Sum("total_amount")
                )["total"] or 0
            )
            expense = float(
                qs.filter(transaction_type=Transaction.TransactionType.EXPENSE).aggregate(
                    total=Sum("total_amount")
                )["total"] or 0
            )
            results.append(
                {
                    "month": start.strftime("%Y-%m"),
                    "income": income,
                    "expense": expense,
                    "balance": income - expense,
                }
            )
        return Response(results)


class DashboardGoalsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        goals = FinancialGoal.objects.filter(owner=request.user).prefetch_related("contributions")
        return Response(FinancialGoalSerializer(goals, many=True).data)


class DashboardDebtsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        debts = Debt.objects.filter(owner=request.user).prefetch_related("payments")
        return Response(DebtSerializer(debts, many=True).data)
