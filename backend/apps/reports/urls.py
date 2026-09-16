from django.urls import path

from . import views

urlpatterns = [
    path("reports/transactions/export/", views.TransactionExportView.as_view(), name="report-transactions-export"),
    path("reports/monthly-summary/pdf/", views.MonthlySummaryPdfView.as_view(), name="report-monthly-summary-pdf"),
]
