from django.conf import settings
from django.db import models


class MonthlyBudget(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="budgets",
    )
    category = models.ForeignKey(
        "categories.Category",
        on_delete=models.CASCADE,
        related_name="budgets",
    )

    month = models.DateField(help_text="Sempre armazenado como o primeiro dia do mês.")
    limit_amount = models.DecimalField(max_digits=14, decimal_places=2)
    alert_percentage = models.PositiveSmallIntegerField(default=80)

    class Meta:
        ordering = ["-month"]
        constraints = [
            models.UniqueConstraint(
                fields=["owner", "category", "month"], name="unique_budget_per_category_month"
            )
        ]

    def __str__(self):
        return f"{self.category} - {self.month:%Y-%m}"
