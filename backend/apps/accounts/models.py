from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    email = models.EmailField(unique=True)
    preferred_name = models.CharField(max_length=100, blank=True)

    avatar = models.ImageField(
        upload_to="avatars/",
        null=True,
        blank=True,
    )

    currency = models.CharField(max_length=3, default="BRL")
    timezone = models.CharField(max_length=50, default="America/Sao_Paulo")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    def __str__(self):
        return self.preferred_name or self.email
