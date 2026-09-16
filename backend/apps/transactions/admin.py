from django.contrib import admin

from .models import FinancialAccount, Transaction, TransactionSettlement


class TransactionSettlementInline(admin.TabularInline):
    model = TransactionSettlement
    extra = 0


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ["title", "owner", "transaction_type", "total_amount", "status", "competence_date"]
    list_filter = ["transaction_type", "status", "is_shared"]
    search_fields = ["title", "description"]
    inlines = [TransactionSettlementInline]


@admin.register(FinancialAccount)
class FinancialAccountAdmin(admin.ModelAdmin):
    list_display = ["name", "owner", "account_type", "is_active"]
