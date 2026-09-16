from django.conf import settings
from django.db import models


class CreditCard(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="credit_cards",
    )

    name = models.CharField(max_length=100)
    institution = models.CharField(max_length=100)
    last_four_digits = models.CharField(max_length=4, blank=True)

    credit_limit = models.DecimalField(
        max_digits=14, decimal_places=2, null=True, blank=True
    )

    closing_day = models.PositiveSmallIntegerField()
    due_day = models.PositiveSmallIntegerField()
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class CreditCardPurchase(models.Model):
    transaction = models.OneToOneField(
        "transactions.Transaction",
        on_delete=models.CASCADE,
        related_name="credit_card_purchase",
    )
    credit_card = models.ForeignKey(
        CreditCard,
        on_delete=models.PROTECT,
        related_name="purchases",
    )

    purchase_date = models.DateField()
    invoice_month = models.DateField()

    class Meta:
        ordering = ["-purchase_date"]

    def __str__(self):
        return f"{self.credit_card} - {self.transaction_id}"
