from django.conf import settings
from django.db import models


class Partnership(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pendente"
        ACTIVE = "ACTIVE", "Ativo"
        REJECTED = "REJECTED", "Recusado"
        ENDED = "ENDED", "Encerrado"

    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="created_partnerships",
    )
    partner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="received_partnerships",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    accepted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["creator", "partner"], name="unique_partnership_pair"
            )
        ]

    def __str__(self):
        return f"{self.creator} <-> {self.partner} ({self.status})"


class PartnershipPermission(models.Model):
    partnership = models.OneToOneField(
        Partnership,
        on_delete=models.CASCADE,
        related_name="permissions",
    )

    share_income_totals = models.BooleanField(default=True)
    share_income_details = models.BooleanField(default=True)
    share_expense_totals = models.BooleanField(default=True)
    share_expense_details = models.BooleanField(default=True)
    share_client_names = models.BooleanField(default=False)
    share_goals = models.BooleanField(default=True)
    share_debts = models.BooleanField(default=True)
    share_accounts = models.BooleanField(default=False)

    def __str__(self):
        return f"Permissões de {self.partnership}"
