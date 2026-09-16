from rest_framework.routers import DefaultRouter

from .views import FinancialGoalViewSet

router = DefaultRouter()
router.register("goals", FinancialGoalViewSet, basename="goal")

urlpatterns = router.urls
