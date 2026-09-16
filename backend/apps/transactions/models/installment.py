from django.conf import settings
from django.db import models


class InstallmentPlan(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="installment_plans",
    )

    description = models.CharField(max_length=200)
    total_amount = models.DecimalField(max_digits=14, decimal_places=2)
    installment_count = models.PositiveIntegerField()
    first_due_date = models.DateField()

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.description} ({self.installment_count}x)"


class Installment(models.Model):
    plan = models.ForeignKey(
        InstallmentPlan,
        on_delete=models.CASCADE,
        related_name="installments",
    )
    transaction = models.OneToOneField(
        "transactions.Transaction",
        on_delete=models.CASCADE,
        related_name="installment",
    )
    number = models.PositiveIntegerField()

    class Meta:
        ordering = ["number"]

    def __str__(self):
        return f"{self.plan} - {self.number}/{self.plan.installment_count}"
