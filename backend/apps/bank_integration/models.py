from django.conf import settings
from django.db import models


class BankConnection(models.Model):
    class Status(models.TextChoices):
        UPDATING = "UPDATING", "Sincronizando"
        UPDATED = "UPDATED", "Atualizado"
        LOGIN_ERROR = "LOGIN_ERROR", "Erro de login"
        OUTDATED = "OUTDATED", "Desatualizado"
        ERROR = "ERROR", "Erro"

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="bank_connections",
    )
    pluggy_item_id = models.CharField(max_length=100, unique=True)
    institution_name = models.CharField(max_length=150, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.UPDATING)
    last_synced_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.institution_name or self.pluggy_item_id} ({self.owner})"


class SyncedAccount(models.Model):
    connection = models.ForeignKey(
        BankConnection, on_delete=models.CASCADE, related_name="accounts"
    )
    pluggy_account_id = models.CharField(max_length=100, unique=True)
    financial_account = models.OneToOneField(
        "transactions.FinancialAccount",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="bank_sync",
    )
    name = models.CharField(max_length=150, blank=True)
    account_type = models.CharField(max_length=50, blank=True)
    balance = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    currency_code = models.CharField(max_length=10, default="BRL")
    raw_data = models.JSONField(default=dict, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name or self.pluggy_account_id


class ImportedTransaction(models.Model):
    class Status(models.TextChoices):
        PENDING_REVIEW = "PENDING_REVIEW", "Aguardando revisão"
        CONFIRMED = "CONFIRMED", "Confirmada"
        IGNORED = "IGNORED", "Ignorada"

    synced_account = models.ForeignKey(
        SyncedAccount, on_delete=models.CASCADE, related_name="imported_transactions"
    )
    pluggy_transaction_id = models.CharField(max_length=100, unique=True)

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
