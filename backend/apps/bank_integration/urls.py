from django.urls import path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("connections", views.BankConnectionViewSet, basename="bank-connection")
router.register("imports", views.ImportedTransactionViewSet, basename="bank-import")

urlpatterns = [
    path("connect-token/", views.ConnectTokenView.as_view(), name="bank-connect-token"),
    path("sync-all/", views.SyncAllConnectionsView.as_view(), name="bank-sync-all"),
    path("webhook/", views.PluggyWebhookView.as_view(), name="bank-webhook"),
] + router.urls
