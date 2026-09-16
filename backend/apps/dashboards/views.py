import calendar
from datetime import date

from django.db.models import Q, Sum
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.couples.models import Partnership
from apps.debts.models import Debt
from apps.debts.serializers import DebtSerializer
from apps.goals.models import FinancialGoal
from apps.goals.serializers import FinancialGoalSerializer
from apps.transactions.models import Transaction
from apps.transactions.services import compute_expenses_by_category, compute_monthly_summary


def month_bounds(month_param):
    """Parses an optional "YYYY-MM" string into that month's (first, last) day.
    Defaults to the current month when not given."""
    today = date.today()
    if month_param:
        year, month = (int(part) for part in month_param.split("-"))
    else:
        year, month = today.year, today.month
    last_day = calendar.monthrange(year, month)[1]
    return date(year, month, 1), date(year, month, last_day)


def _month_bounds(request):
    return month_bounds(request.query_params.get("month"))


class DashboardSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        start, end = _month_bounds(request)
        summary = compute_monthly_summary(user=request.user, start=start, end=end)
        return Response({"month": start.strftime("%Y-%m"), **summary})


class ExpensesByCategoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        start, end = _month_bounds(request)
        data = compute_expenses_by_category(user=request.user, start=start, end=end)
        return Response(data)


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


class CoupleSummaryView(APIView):
    """Cross-partner view of the dashboard, gated by each partnership's
    PartnershipPermission flags. Note the flags are per-partnership, not
    per-direction (see docs/permissions.md) — so they currently grant the
    same visibility to both people in the couple, symmetrically."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        start, end = _month_bounds(request)
        user = request.user

        own_summary = compute_monthly_summary(user=user, start=start, end=end)
        combined_income_total = own_summary["income_total"]
        combined_expense_total = own_summary["expense_total"]

        partnerships = Partnership.objects.filter(
            Q(creator=user) | Q(partner=user), status=Partnership.Status.ACTIVE
        ).select_related("creator", "partner", "permissions")

        partners_data = []
        for partnership in partnerships:
            other_user = partnership.partner if partnership.creator_id == user.id else partnership.creator
            perms = getattr(partnership, "permissions", None)

            entry = {
                "partnership_id": partnership.id,
                "partner_id": other_user.id,
                "partner_name": other_user.preferred_name or other_user.email,
                "shares_income_totals": bool(perms and perms.share_income_totals),
                "shares_expense_totals": bool(perms and perms.share_expense_totals),
                "shares_goals": bool(perms and perms.share_goals),
                "shares_debts": bool(perms and perms.share_debts),
            }

            if entry["shares_income_totals"] or entry["shares_expense_totals"]:
                partner_summary = compute_monthly_summary(user=other_user, start=start, end=end)
                if entry["shares_income_totals"]:
                    entry["income_total"] = partner_summary["income_total"]
                    entry["income_received"] = partner_summary["income_received"]
                    combined_income_total += partner_summary["income_total"]
                if entry["shares_expense_totals"]:
                    entry["expense_total"] = partner_summary["expense_total"]
                    entry["expense_paid"] = partner_summary["expense_paid"]
                    combined_expense_total += partner_summary["expense_total"]

            if entry["shares_goals"]:
                partner_goals = FinancialGoal.objects.filter(owner=other_user).prefetch_related("contributions")
                entry["goals"] = FinancialGoalSerializer(partner_goals, many=True).data

            if entry["shares_debts"]:
                partner_debts = Debt.objects.filter(owner=other_user).prefetch_related("payments")
                entry["debts"] = DebtSerializer(partner_debts, many=True).data

            partners_data.append(entry)

        return Response(
            {
                "month": start.strftime("%Y-%m"),
                "own": own_summary,
                "partners": partners_data,
                "combined": {
                    "income_total": combined_income_total,
                    "expense_total": combined_expense_total,
                    "balance": combined_income_total - combined_expense_total,
                },
            }
        )
