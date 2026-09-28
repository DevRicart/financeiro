from django.conf import settings
from django.db import models


class StatementImport(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="statement_imports",
    )
    account = models.ForeignKey(
        "transactions.FinancialAccount",
        on_delete=models.CASCADE,
        related_name="statement_imports",
    )
    file_name = models.CharField(max_length=255, blank=True)
    transaction_count = models.PositiveIntegerField(default=0)
    imported_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-imported_at"]

    def __str__(self):
        return f"{self.file_name or 'extrato'} ({self.account})"


class ImportedTransaction(models.Model):
    class Status(models.TextChoices):
        PENDING_REVIEW = "PENDING_REVIEW", "Aguardando revisão"
        CONFIRMED = "CONFIRMED", "Confirmada"
        IGNORED = "IGNORED", "Ignorada"

    statement_import = models.ForeignKey(
        StatementImport, on_delete=models.CASCADE, related_name="imported_transactions"
    )
    # FITID do OFX — só é garantido único dentro da mesma conta, nunca globalmente.
    external_id = models.CharField(max_length=200, db_index=True)

    description = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    date = models.DateField()

    suggested_category = models.ForeignKey(
        "categories.Category",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )

    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING_REVIEW
    )
    resulting_transaction = models.OneToOneField(
        "transactions.Transaction",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="imported_from",
    )

    raw_payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]

    def __str__(self):
        return f"{self.description} ({self.amount})"
