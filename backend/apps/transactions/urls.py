from django.urls import path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("transactions", views.TransactionViewSet, basename="transaction")
router.register("financial-accounts", views.FinancialAccountViewSet, basename="financial-account")

urlpatterns = [
    path(
        "settlements/<int:pk>/",
        views.TransactionSettlementDeleteView.as_view(),
        name="settlement-delete",
    ),
] + router.urls
