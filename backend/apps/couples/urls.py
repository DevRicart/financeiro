from django.urls import path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("", views.PartnershipViewSet, basename="partnership")

urlpatterns = [
    path(
        "<int:pk>/permissions/",
        views.PartnershipPermissionUpdateView.as_view(),
        name="partnership-permissions",
    ),
] + router.urls
