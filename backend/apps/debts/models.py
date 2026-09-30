from django.conf import settings
from django.db import models


class Debt(models.Model):
    class Direction(models.TextChoices):
        RECEIVABLE = "RECEIVABLE", "A receber"
        PAYABLE = "PAYABLE", "A pagar"

    class Status(models.TextChoices):
        OPEN = "OPEN", "Aberta"
        PARTIAL = "PARTIAL", "Parcial"
        PAID = "PAID", "Paga"
        OVERDUE = "OVERDUE", "Atrasada"
        CANCELLED = "CANCELLED", "Cancelada"

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="debts",
    )

    client = models.ForeignKey(
        "transactions.Client",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="debts",
        help_text="Opcional — alternativa a digitar person_name livremente.",
    )
    person_name = models.CharField(
        max_length=150,
        blank=True,
        help_text="Preenchido automaticamente quando `client` é usado.",
    )
    reason = models.CharField(max_length=255)
    direction = models.CharField(max_length=20, choices=Direction.choices)

    total_amount = models.DecimalField(max_digits=14, decimal_places=2)
    due_date = models.DateField(null=True, blank=True)

    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.OPEN
    )

    recurrence_rule = models.ForeignKey(
        "DebtRecurrenceRule",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="debts",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(client__isnull=False) | ~models.Q(person_name=""),
                name="debt_requires_client_or_person_name",
            )
        ]

    def __str__(self):
        return f"{self.display_name} - {self.reason}"

    @property
    def display_name(self):
        return self.client.display_name if self.client_id else self.person_name

    @property
    def paid_amount(self):
        return sum((p.amount for p in self.payments.all()), 0)

    @property
    def remaining_amount(self):
        return self.total_amount - self.paid_amount


class DebtPayment(models.Model):
    debt = models.ForeignKey(
        Debt,
        on_delete=models.CASCADE,
        related_name="payments",
    )
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    payment_date = models.DateField()
    payment_method = models.CharField(max_length=30)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-payment_date"]

    def __str__(self):
        return f"{self.debt} - {self.amount}"


class DebtRecurrenceRule(models.Model):
    class Frequency(models.TextChoices):
        WEEKLY = "WEEKLY", "Semanal"
        MONTHLY = "MONTHLY", "Mensal"
        YEARLY = "YEARLY", "Anual"

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="debt_recurrence_rules",
    )

    client = models.ForeignKey(
        "transactions.Client",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="debt_recurrence_rules",
        help_text="Opcional — alternativa a digitar person_name livremente.",
    )
    person_name = models.CharField(
        max_length=150,
        blank=True,
        help_text="Preenchido automaticamente quando `client` é usado.",
    )
    reason = models.CharField(max_length=255)
    direction = models.CharField(max_length=20, choices=Debt.Direction.choices)
    amount = models.DecimalField(max_digits=14, decimal_places=2)

    frequency = models.CharField(max_length=20, choices=Frequency.choices)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["reason"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(client__isnull=False) | ~models.Q(person_name=""),
                name="debt_recurrence_requires_client_or_person_name",
            )
        ]

    def __str__(self):
        return f"{self.display_name} - {self.reason} ({self.get_frequency_display()})"

    @property
    def display_name(self):
        return self.client.display_name if self.client_id else self.person_name
