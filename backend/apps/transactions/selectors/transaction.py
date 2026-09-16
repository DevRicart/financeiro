from apps.transactions.models import Transaction


def get_user_transactions(*, user):
    return (
        Transaction.objects.filter(owner=user)
        .select_related("category")
        .prefetch_related("settlements")
    )
