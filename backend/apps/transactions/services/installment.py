from decimal import ROUND_HALF_UP, Decimal

from apps.common.dates import add_months

from ..models import Installment, InstallmentPlan, Transaction


def create_installment_plan(*, user, description, category, total_amount, installment_count, first_due_date, is_shared=False):
    plan = InstallmentPlan.objects.create(
        owner=user,
        description=description,
        total_amount=total_amount,
        installment_count=installment_count,
        first_due_date=first_due_date,
    )

    base_amount = (total_amount / installment_count).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    last_amount = total_amount - base_amount * (installment_count - 1)  # absorbs rounding remainder

    for number in range(1, installment_count + 1):
        due_date = add_months(first_due_date, number - 1)
        amount = base_amount if number < installment_count else last_amount

        transaction = Transaction.objects.create(
            owner=user,
            transaction_type=Transaction.TransactionType.EXPENSE,
            category=category,
            title=f"{description} ({number}/{installment_count})",
            total_amount=amount,
            competence_date=due_date,
            due_date=due_date,
            is_shared=is_shared,
        )
        Installment.objects.create(plan=plan, transaction=transaction, number=number)

    return plan
