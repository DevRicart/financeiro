from django.urls import path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("imports", views.ImportedTransactionViewSet, basename="bank-import")

urlpatterns = [
    path("statements/", views.StatementImportView.as_view(), name="bank-statement-import"),
    path("statements/history/", views.StatementImportListView.as_view(), name="bank-statement-history"),
] + router.urls
