from rest_framework.routers import DefaultRouter

from .views import DebtRecurrenceRuleViewSet, DebtViewSet

router = DefaultRouter()
router.register("debts", DebtViewSet, basename="debt")
router.register("debt-recurrences", DebtRecurrenceRuleViewSet, basename="debt-recurrence")

urlpatterns = router.urls
