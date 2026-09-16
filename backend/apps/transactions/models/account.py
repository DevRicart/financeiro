from django.conf import settings
from django.db import models


class FinancialAccount(models.Model):
    class AccountType(models.TextChoices):
        CHECKING = "CHECKING", "Conta corrente"
        SAVINGS = "SAVINGS", "Poupança"
        WALLET = "WALLET", "Carteira"
        DIGITAL = "DIGITAL", "Conta digital"
        INVESTMENT = "INVESTMENT", "Investimento"
        CASH = "CASH", "Dinheiro"

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="financial_accounts",
    )
    name = models.CharField(max_length=100)
    institution = models.CharField(max_length=100, blank=True)
    account_type = models.CharField(max_length=20, choices=AccountType.choices)
    initial_balance = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name
