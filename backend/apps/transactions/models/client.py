from django.conf import settings
from django.db import models


class Client(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="clients",
    )

    display_name = models.CharField(max_length=150)
    internal_code = models.CharField(max_length=50, blank=True)

    default_amount = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )

    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=30, blank=True)
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["display_name"]

    def __str__(self):
        return self.display_name
