from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/partnerships/", include("apps.couples.urls")),
    path("api/", include("apps.categories.urls")),
    path("api/", include("apps.transactions.urls")),
    path("api/", include("apps.goals.urls")),
    path("api/", include("apps.debts.urls")),
    path("api/dashboard/", include("apps.dashboards.urls")),
    path("api/bank/", include("apps.bank_integration.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
