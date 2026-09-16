from django.db import models


class TransactionSettlement(models.Model):
    class PaymentMethod(models.TextChoices):
        PIX = "PIX", "PIX"
        CASH = "CASH", "Dinheiro"
        DEBIT_CARD = "DEBIT_CARD", "Cartão de débito"
        CREDIT_CARD = "CREDIT_CARD", "Cartão de crédito"
        BANK_TRANSFER = "BANK_TRANSFER", "Transferência bancária"
        BOLETO = "BOLETO", "Boleto"
        OTHER = "OTHER", "Outros"

    transaction = models.ForeignKey(
        "transactions.Transaction",
        on_delete=models.CASCADE,
        related_name="settlements",
    )

    amount = models.DecimalField(max_digits=14, decimal_places=2)
    settlement_date = models.DateField()

    payment_method = models.CharField(max_length=30, choices=PaymentMethod.choices)

    account = models.ForeignKey(
        "transactions.FinancialAccount",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="settlements",
    )

    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-settlement_date"]

    def __str__(self):
        return f"{self.transaction_id} - {self.amount}"
