from django.db.models import Sum

from apps.common.dates import compute_invoice_month
from apps.transactions.models import (
    CreditCardPurchase,
    FreelanceDetail,
    SalaryDetail,
    ServiceIncomeDetail,
    Transaction,
    TransactionSettlement,
)

_DETAIL_MODELS = {
    "salary_detail": SalaryDetail,
    "service_detail": ServiceIncomeDetail,
    "freelance_detail": FreelanceDetail,
}


def _pop_detail_data(validated_data):
    return {key: validated_data.pop(key, None) for key in _DETAIL_MODELS}


def _save_details(transaction, detail_data):
    # A key missing from the request (data is None) means "not sent this
    # time" — leave whatever detail row already exists untouched. It never
    # means "clear it": these nested fields don't allow_null.
    for key, data in detail_data.items():
        if data is not None:
            _DETAIL_MODELS[key].objects.update_or_create(transaction=transaction, defaults=data)


def _recompute_status(transaction):
    """Applies the automatic status rule described in the project spec:
    zero settled -> Pendente, partial -> Parcial, full -> Concluída.
    A manually cancelled transaction is left untouched.

    Queries settlements directly instead of `transaction.settled_amount`:
    the transaction instance passed in often came from a queryset with
    `.prefetch_related("settlements")` (see selectors.get_user_transactions),
    and Django serves `self.settlements.all()` from that stale prefetch
    cache even right after this same request just created a new row.
    """
    if transaction.status == Transaction.Status.CANCELLED:
        return transaction

    settled = TransactionSettlement.objects.filter(transaction=transaction).aggregate(
        total=Sum("amount")
    )["total"] or 0

    if settled <= 0:
        transaction.status = Transaction.Status.PENDING
    elif settled < transaction.total_amount:
        transaction.status = Transaction.Status.PARTIAL
    else:
        transaction.status = Transaction.Status.COMPLETED

    transaction.save(update_fields=["status"])
    return transaction


def create_transaction(*, user, validated_data):
    credit_card = validated_data.pop("credit_card", None)
    detail_data = _pop_detail_data(validated_data)

    transaction = Transaction.objects.create(owner=user, **validated_data)
    _save_details(transaction, detail_data)

    if credit_card is not None:
        CreditCardPurchase.objects.create(
            transaction=transaction,
            credit_card=credit_card,
            purchase_date=transaction.competence_date,
            invoice_month=compute_invoice_month(transaction.competence_date, credit_card.closing_day),
        )

    return transaction


def update_transaction(*, transaction, validated_data):
    detail_data = _pop_detail_data(validated_data)
    for field, value in validated_data.items():
        setattr(transaction, field, value)
    transaction.save()
    _save_details(transaction, detail_data)
    return transaction


def add_settlement(*, transaction, validated_data):
    settlement = TransactionSettlement.objects.create(transaction=transaction, **validated_data)
    _recompute_status(transaction)
    return settlement


def remove_settlement(*, settlement):
    transaction = settlement.transaction
    settlement.delete()
    _recompute_status(transaction)
