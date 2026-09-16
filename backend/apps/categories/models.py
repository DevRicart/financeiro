from django.conf import settings
from django.db import models


class Category(models.Model):
    class CategoryType(models.TextChoices):
        INCOME = "INCOME", "Receita"
        EXPENSE = "EXPENSE", "Despesa"
        BOTH = "BOTH", "Ambos"

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="categories",
        help_text="Nulo para categorias padrão do sistema.",
    )

    name = models.CharField(max_length=100)
    category_type = models.CharField(max_length=10, choices=CategoryType.choices)
    icon = models.CharField(max_length=50, blank=True)
    color = models.CharField(max_length=20, blank=True)
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "categories"
        ordering = ["name"]

    def __str__(self):
        return self.name
