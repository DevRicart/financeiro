from django.contrib import admin

from .models import BankConnection, ImportedTransaction, SyncedAccount


class SyncedAccountInline(admin.TabularInline):
    model = SyncedAccount
    extra = 0


@admin.register(BankConnection)
class BankConnectionAdmin(admin.ModelAdmin):
    list_display = ["institution_name", "owner", "status", "last_synced_at"]
    inlines = [SyncedAccountInline]


@admin.register(ImportedTransaction)
class ImportedTransactionAdmin(admin.ModelAdmin):
    list_display = ["description", "amount", "date", "status", "synced_account"]
    list_filter = ["status"]
    search_fields = ["description"]
