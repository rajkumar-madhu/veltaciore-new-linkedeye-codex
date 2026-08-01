from rest_framework.routers import DefaultRouter

from .views import (
    BodCheckViewSet,
    DeviceAlertViewSet,
    DeviceViewSet,
    ExporterViewSet,
    RackViewSet,
    SiteViewSet,
    VmViewSet,
)

router = DefaultRouter()
router.register("sites", SiteViewSet, basename="site")
router.register("devices", DeviceViewSet, basename="device")
router.register("alerts", DeviceAlertViewSet, basename="infra-alert")
router.register("vms", VmViewSet, basename="vm")
router.register("exporters", ExporterViewSet, basename="exporter")
router.register("bod-checks", BodCheckViewSet, basename="bod-check")
router.register("racks", RackViewSet, basename="rack")

urlpatterns = router.urls
