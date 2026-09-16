from django.db.models import Sum

from ..models import Transaction


def compute_monthly_summary(*, user, start, end):
    qs = Transaction.objects.filter(
        owner=user, competence_date__gte=start, competence_date__lte=end
    ).exclude(status=Transaction.Status.CANCELLED)

    income_qs = qs.filter(transaction_type=Transaction.TransactionType.INCOME)
    expense_qs = qs.filter(transaction_type=Transaction.TransactionType.EXPENSE)

    # Cast every value to float: Sum() returns Decimal (which DRF's
    # JSONEncoder serializes as a *string*) while "no rows this month" would
    # otherwise fall back to a plain int (serializes as a *number*) —
    # normalizing here keeps every consumer (dashboard JSON, PDF report)
    # working with a single, predictable numeric type.
    income_total = float(income_qs.aggregate(total=Sum("total_amount"))["total"] or 0)
    expense_total = float(expense_qs.aggregate(total=Sum("total_amount"))["total"] or 0)
    income_received = float(sum((t.settled_amount for t in income_qs), 0))
    expense_paid = float(sum((t.settled_amount for t in expense_qs), 0))

    return {
        "income_total": income_total,
        "income_received": income_received,
        "income_pending": income_total - income_received,
        "expense_total": expense_total,
        "expense_paid": expense_paid,
        "expense_pending": expense_total - expense_paid,
        "cash_profit": income_received - expense_paid,
        "accrual_profit": income_total - expense_total,
    }


def compute_expenses_by_category(*, user, start, end):
    rows = (
        Transaction.objects.filter(
            owner=user,
            transaction_type=Transaction.TransactionType.EXPENSE,
            competence_date__gte=start,
            competence_date__lte=end,
        )
        .exclude(status=Transaction.Status.CANCELLED)
        .values("category__id", "category__name", "category__icon", "category__color")
        .annotate(total=Sum("total_amount"))
        .order_by("-total")
    )
    return [{**row, "total": float(row["total"])} for row in rows]
