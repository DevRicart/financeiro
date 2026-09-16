from django.db.models import Sum

from apps.transactions.models import Transaction, TransactionSettlement


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
    return Transaction.objects.create(owner=user, **validated_data)


def update_transaction(*, transaction, validated_data):
    for field, value in validated_data.items():
        setattr(transaction, field, value)
    transaction.save()
    return transaction


def add_settlement(*, transaction, validated_data):
    settlement = TransactionSettlement.objects.create(transaction=transaction, **validated_data)
    _recompute_status(transaction)
    return settlement


def remove_settlement(*, settlement):
    transaction = settlement.transaction
    settlement.delete()
    _recompute_status(transaction)
