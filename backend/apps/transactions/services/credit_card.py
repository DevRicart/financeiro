from django.db.models import Sum

from apps.common.dates import compute_invoice_month  # noqa: F401 - re-exported for callers

from ..models import CreditCardPurchase, Transaction, TransactionSettlement
from .transaction import add_settlement


def get_invoice(*, credit_card, invoice_month):
    purchases = CreditCardPurchase.objects.filter(
        credit_card=credit_card, invoice_month=invoice_month
    ).select_related("transaction", "transaction__category")
    total = purchases.aggregate(total=Sum("transaction__total_amount"))["total"] or 0
    return purchases, total


def pay_invoice(*, credit_card, invoice_month, payment_date, account=None):
    purchases = CreditCardPurchase.objects.filter(
        credit_card=credit_card, invoice_month=invoice_month
    ).select_related("transaction")

    settlements = []
    for purchase in purchases:
        transaction = purchase.transaction
        if transaction.status in (Transaction.Status.COMPLETED, Transaction.Status.CANCELLED):
            continue
        settlements.append(
            add_settlement(
                transaction=transaction,
                validated_data={
                    "amount": transaction.remaining_amount,
                    "settlement_date": payment_date,
                    "payment_method": TransactionSettlement.PaymentMethod.CREDIT_CARD,
                    "account": account,
                    "notes": f"Fatura {credit_card.name} - {invoice_month:%m/%Y}",
                },
            )
        )
    return settlements
