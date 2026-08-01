"""Root URL configuration — all API routes are versionless under /api/."""
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("apps.tenants.urls")),
    path("api/", include("apps.itsm_urls")),
    path("api/infra/", include("apps.infra.urls")),
    path("api/trading/", include("apps.trading.urls")),
]
