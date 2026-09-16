from rest_framework.routers import DefaultRouter

from .views import MonthlyBudgetViewSet

router = DefaultRouter()
router.register("budgets", MonthlyBudgetViewSet, basename="budget")

urlpatterns = router.urls
