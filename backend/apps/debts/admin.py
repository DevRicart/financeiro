from django.contrib import admin

from .models import Debt, DebtPayment, DebtRecurrenceRule


class DebtPaymentInline(admin.TabularInline):
    model = DebtPayment
    extra = 0


@admin.register(Debt)
class DebtAdmin(admin.ModelAdmin):
    list_display = ["person_name", "reason", "owner", "direction", "total_amount", "status", "due_date"]
    list_filter = ["direction", "status"]
    search_fields = ["person_name", "reason"]
    inlines = [DebtPaymentInline]


@admin.register(DebtRecurrenceRule)
class DebtRecurrenceRuleAdmin(admin.ModelAdmin):
    list_display = ["person_name", "reason", "owner", "direction", "amount", "frequency", "is_active"]
    list_filter = ["direction", "frequency", "is_active"]
    search_fields = ["person_name", "reason"]
