from django.contrib import admin

from .models import (
    Client,
    CreditCard,
    CreditCardPurchase,
    FinancialAccount,
    FreelanceDetail,
    Installment,
    InstallmentPlan,
    RecurrenceRule,
    SalaryDetail,
    ServiceIncomeDetail,
    Transaction,
    TransactionSettlement,
)


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


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ["display_name", "owner", "email", "is_active"]
    search_fields = ["display_name", "email"]


@admin.register(CreditCard)
class CreditCardAdmin(admin.ModelAdmin):
    list_display = ["name", "owner", "institution", "closing_day", "due_day", "is_active"]


@admin.register(CreditCardPurchase)
class CreditCardPurchaseAdmin(admin.ModelAdmin):
    list_display = ["credit_card", "transaction", "purchase_date", "invoice_month"]
    list_filter = ["invoice_month"]


class InstallmentInline(admin.TabularInline):
    model = Installment
    extra = 0


@admin.register(InstallmentPlan)
class InstallmentPlanAdmin(admin.ModelAdmin):
    list_display = ["description", "owner", "total_amount", "installment_count", "first_due_date"]
    inlines = [InstallmentInline]


@admin.register(RecurrenceRule)
class RecurrenceRuleAdmin(admin.ModelAdmin):
    list_display = ["title", "owner", "transaction_type", "amount", "frequency", "is_active"]
    list_filter = ["frequency", "is_active"]


admin.site.register(SalaryDetail)
admin.site.register(ServiceIncomeDetail)
admin.site.register(FreelanceDetail)
