from django.urls import path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("transactions", views.TransactionViewSet, basename="transaction")
router.register("financial-accounts", views.FinancialAccountViewSet, basename="financial-account")
router.register("clients", views.ClientViewSet, basename="client")
router.register("credit-cards", views.CreditCardViewSet, basename="credit-card")
router.register("installment-plans", views.InstallmentPlanViewSet, basename="installment-plan")
router.register("recurrences", views.RecurrenceRuleViewSet, basename="recurrence")

urlpatterns = [
    path(
        "settlements/<int:pk>/",
        views.TransactionSettlementDeleteView.as_view(),
        name="settlement-delete",
    ),
] + router.urls
