from django.contrib import admin

from .models import ImportedTransaction, StatementImport


@admin.register(StatementImport)
class StatementImportAdmin(admin.ModelAdmin):
    list_display = ["file_name", "account", "owner", "transaction_count", "imported_at"]


@admin.register(ImportedTransaction)
class ImportedTransactionAdmin(admin.ModelAdmin):
    list_display = ["description", "amount", "date", "status", "statement_import"]
    list_filter = ["status"]
    search_fields = ["description"]
