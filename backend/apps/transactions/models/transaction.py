from django.conf import settings
from django.db import models


class Transaction(models.Model):
    class TransactionType(models.TextChoices):
        INCOME = "INCOME", "Receita"
        EXPENSE = "EXPENSE", "Despesa"

    class Status(models.TextChoices):
        PLANNED = "PLANNED", "Prevista"
        PENDING = "PENDING", "Pendente"
        PARTIAL = "PARTIAL", "Parcial"
        COMPLETED = "COMPLETED", "Concluída"
        CANCELLED = "CANCELLED", "Cancelada"

    class IncomeType(models.TextChoices):
        SALARY = "SALARY", "Salário"
        APPOINTMENT = "APPOINTMENT", "Atendimento"
        FREELANCE = "FREELANCE", "Freelancer"
        EXTRA = "EXTRA", "Receita extra"
        INVESTMENT = "INVESTMENT", "Investimento"
        REFUND = "REFUND", "Reembolso"
        SALE = "SALE", "Venda"
        OTHER = "OTHER", "Outros"

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="transactions",
    )

    transaction_type = models.CharField(max_length=10, choices=TransactionType.choices)
    income_type = models.CharField(
        max_length=20, choices=IncomeType.choices, null=True, blank=True
    )

    category = models.ForeignKey(
        "categories.Category",
        on_delete=models.PROTECT,
        related_name="transactions",
    )

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    total_amount = models.DecimalField(max_digits=14, decimal_places=2)

    competence_date = models.DateField()
    due_date = models.DateField(null=True, blank=True)

    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    is_shared = models.BooleanField(default=False)

    recurrence_rule = models.ForeignKey(
        "transactions.RecurrenceRule",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="generated_transactions",
        help_text="Preenchido quando esta transação foi gerada automaticamente por uma recorrência.",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-competence_date", "-created_at"]

    def __str__(self):
        return self.title

    @property
    def settled_amount(self):
        return sum((settlement.amount for settlement in self.settlements.all()), 0)

    @property
    def remaining_amount(self):
        return self.total_amount - self.settled_amount
