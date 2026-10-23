from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import CrossTenantSummaryView, TenantViewSet

router = DefaultRouter()
router.register("tenants", TenantViewSet, basename="tenant")

urlpatterns = [path("tenants-summary/", CrossTenantSummaryView.as_view(), name="tenants-summary"), *router.urls]
