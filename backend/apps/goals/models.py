from django.conf import settings
from django.db import models


class FinancialGoal(models.Model):
    class GoalType(models.TextChoices):
        INDIVIDUAL = "INDIVIDUAL", "Individual"
        SHARED = "SHARED", "Compartilhada"

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="owned_goals",
    )
    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="participating_goals",
        blank=True,
    )

    name = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    goal_type = models.CharField(max_length=20, choices=GoalType.choices)

    target_amount = models.DecimalField(max_digits=14, decimal_places=2)
    deadline = models.DateField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name

    @property
    def current_amount(self):
        return sum((c.amount for c in self.contributions.all()), 0)

    @property
    def progress_percentage(self):
        if not self.target_amount:
            return 0
        return min(100, round((self.current_amount / self.target_amount) * 100, 1))


class GoalContribution(models.Model):
    goal = models.ForeignKey(
        FinancialGoal,
        on_delete=models.CASCADE,
        related_name="contributions",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
    )
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    contribution_date = models.DateField()
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-contribution_date"]

    def __str__(self):
        return f"{self.goal} - {self.amount}"
