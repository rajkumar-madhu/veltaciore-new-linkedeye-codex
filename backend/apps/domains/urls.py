from rest_framework.routers import DefaultRouter

from .views import MonitoredDomainViewSet, ServiceDomainViewSet

router = DefaultRouter()
router.register("domains", MonitoredDomainViewSet, basename="domain")
router.register("service-domains", ServiceDomainViewSet, basename="service-domain")

urlpatterns = router.urls
