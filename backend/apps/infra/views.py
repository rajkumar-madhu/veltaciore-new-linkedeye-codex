import random

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.sites.models import Rack, Site
from apps.tenants.mixins import TenantScopedQuerysetMixin
from .models import (
    BodCheck,
    DeviceAlert,
    Exporter,
    InfraDevice,
    TopologyConnection,
    VirtualMachine,
)
from .serializers import (
    BodCheckSerializer,
    DeviceAlertSerializer,
    DeviceInterfaceSerializer,
    DeviceSerializer,
    ExporterSerializer,
    RackSerializer,
    SiteSerializer,
    TopologyConnectionSerializer,
    VmSerializer,
)


class SiteViewSet(TenantScopedQuerysetMixin, viewsets.ReadOnlyModelViewSet):
    queryset = Site.objects.all()
    serializer_class = SiteSerializer
    search_fields = ["name", "region"]

    @action(detail=True)
    def topology(self, request, pk=None):
        """GET /api/infra/sites/{id}/topology/ — devices + links for a site."""
        devices = InfraDevice.objects.filter(site_id=pk)
        links = TopologyConnection.objects.filter(src__site_id=pk, dst__site_id=pk)
        return Response(
            {
                "site": pk,
                "devices": DeviceSerializer(devices, many=True).data,
                "links": TopologyConnectionSerializer(links, many=True).data,
            }
        )

    @action(detail=True)
    def devices(self, request, pk=None):
        devices = InfraDevice.objects.filter(site_id=pk)
        return Response(DeviceSerializer(devices, many=True).data)


class DeviceViewSet(TenantScopedQuerysetMixin, viewsets.ReadOnlyModelViewSet):
    queryset = InfraDevice.objects.select_related("site").all()
    serializer_class = DeviceSerializer
    filterset_fields = ["site", "device_type", "status", "vendor"]
    search_fields = ["id", "name", "hostname", "ip_address", "model", "vendor", "serial_number"]
    ordering_fields = ["id", "cpu", "mem", "status"]

    @action(detail=True)
    def overview(self, request, pk=None):
        return Response(DeviceSerializer(self.get_object()).data)

    @action(detail=True)
    def interfaces(self, request, pk=None):
        ifaces = self.get_object().interfaces.all()
        return Response(DeviceInterfaceSerializer(ifaces, many=True).data)

    @action(detail=True)
    def alerts(self, request, pk=None):
        alerts = self.get_object().alerts.all()
        return Response(DeviceAlertSerializer(alerts, many=True).data)

    @action(detail=True)
    def availability(self, request, pk=None):
        d = self.get_object()
        up = d.status not in ("down", "critical")
        return Response(
            {
                "status": "up" if up else "down",
                "uptime": d.uptime,
                "last_reboot": "2026-01-18 03:12 UTC",
                "ping_ms": round(random.uniform(0.2, 2.4), 2) if up else None,
                "packet_loss_pct": 0.0 if up else 100.0,
                "sla_pct": 99.98 if up else 97.2,
                "blackbox": "ok" if up else "failing",
            }
        )

    @action(detail=True)
    def metrics(self, request, pk=None):
        """Recent metric series (24 points per metric) for graphs."""
        d = self.get_object()
        rng = random.Random(hash(d.id) & 0xFFFF)

        def series(base: float, spread: float) -> list[float]:
            return [
                max(0.0, min(100.0, base + rng.uniform(-spread, spread)))
                for _ in range(24)
            ]

        return Response(
            {
                "cpu": series(d.cpu, 8),
                "mem": series(d.mem, 5),
                "disk": series(min(96.0, d.mem * 0.8 + 10), 3),
                "rx_mbps": [round(rng.uniform(80, 940), 1) for _ in range(24)],
                "tx_mbps": [round(rng.uniform(60, 720), 1) for _ in range(24)],
            }
        )


class DeviceAlertViewSet(TenantScopedQuerysetMixin, viewsets.ReadOnlyModelViewSet):
    queryset = DeviceAlert.objects.select_related("device", "site").all()
    serializer_class = DeviceAlertSerializer
    filterset_fields = ["sev", "site", "acknowledged", "resolved"]
    search_fields = ["id", "title", "rule", "device__id"]


class VmViewSet(TenantScopedQuerysetMixin, viewsets.ReadOnlyModelViewSet):
    queryset = VirtualMachine.objects.select_related("host").all()
    serializer_class = VmSerializer
    filterset_fields = ["cluster", "state"]
    search_fields = ["id", "os", "ip"]


class ExporterViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Exporter.objects.all()
    serializer_class = ExporterSerializer
    search_fields = ["name", "version"]


class BodCheckViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = BodCheck.objects.all()
    serializer_class = BodCheckSerializer
    search_fields = ["target", "env"]
    pagination_class = None  # small fixed catalog; return the full BOD run


class RackViewSet(TenantScopedQuerysetMixin, viewsets.ReadOnlyModelViewSet):
    queryset = (
        Rack.objects.prefetch_related("rack_units").select_related("site").all()
    )
    serializer_class = RackSerializer
    filterset_fields = ["site", "row"]
    search_fields = ["name", "role", "row"]
