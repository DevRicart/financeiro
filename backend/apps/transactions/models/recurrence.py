from django.conf import settings
from django.db import models


class RecurrenceRule(models.Model):
    class Frequency(models.TextChoices):
        WEEKLY = "WEEKLY", "Semanal"
        MONTHLY = "MONTHLY", "Mensal"
        YEARLY = "YEARLY", "Anual"

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="recurrence_rules",
    )

    title = models.CharField(max_length=200)
    transaction_type = models.CharField(max_length=10)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    category = models.ForeignKey(
        "categories.Category", on_delete=models.PROTECT, related_name="recurrence_rules"
    )

    frequency = models.CharField(max_length=20, choices=Frequency.choices)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["title"]

    def __str__(self):
        return f"{self.title} ({self.get_frequency_display()})"
