from apps.transactions.models import Transaction


def get_user_transactions(*, user):
    return (
        Transaction.objects.filter(owner=user)
        .select_related(
            "category",
            "salary_detail",
            "service_detail",
            "service_detail__client",
            "freelance_detail",
            "freelance_detail__client",
            "installment",
            "installment__plan",
            "credit_card_purchase",
            "credit_card_purchase__credit_card",
        )
        .prefetch_related("settlements")
    )
