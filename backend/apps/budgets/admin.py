from django.contrib import admin

from .models import MonthlyBudget


@admin.register(MonthlyBudget)
class MonthlyBudgetAdmin(admin.ModelAdmin):
    list_display = ["category", "owner", "month", "limit_amount", "alert_percentage"]
    list_filter = ["month"]
