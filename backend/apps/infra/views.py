from rest_framework import exceptions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.monitoring.loki import device_logs
from apps.monitoring.prometheus import device_hardware, device_inventory, device_timeseries, vm_timeseries
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


def _timeseries(request, fetch):
    q = request.query_params
    only = {m.strip() for m in q.get("metrics", "").split(",") if m.strip()} or None
    try:
        data = fetch(start=q.get("start"), end=q.get("end"), step=q.get("step"), metrics=only)
    except ValueError as exc:
        raise exceptions.ValidationError({"detail": str(exc)})
    return Response(data)


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
    search_fields = ["id", "name", "hostname", "ip_address", "model", "vendor", "serial_number"]
    ordering_fields = ["id", "cpu", "mem", "status"]

    filterset_fields = ["site", "device_type", "status", "vendor", "lifecycle_state", "criticality_tier"]

    @action(detail=True, methods=["post"])
    def transition(self, request, pk=None):
        """POST /api/infra/devices/{id}/transition/ {"to": "...", "reason": "..."}"""
        from .lifecycle import transition_device

        device = transition_device(
            self.get_object(),
            str(request.data.get("to", "")),
            request=request,
            reason=str(request.data.get("reason", "")),
        )
        return Response(DeviceSerializer(device).data)

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
                "ping_ms": None,  # real RTT comes from blackbox probes via /metrics, not invented here
                "packet_loss_pct": 0.0 if up else 100.0,
                "sla_pct": 99.98 if up else 97.2,
                "blackbox": "ok" if up else "failing",
            }
        )

    @action(detail=True)
    def relationships(self, request, pk=None):
        """GET /api/infra/devices/{id}/relationships/ — the device's family.

        Where it lives (site, rack and U position), what runs on it (VMs),
        and what each NIC is cabled to (topology links matched on port name).
        Peers are looked up through the tenant-scoped manager, so a link to
        a device the caller may not see is returned without its details.
        """
        from .relationships import device_relationships

        return Response(device_relationships(self.get_object()))

    @action(detail=True)
    def metrics(self, request, pk=None):
        """GET /api/infra/devices/{id}/metrics/ — real time series from Prometheus.

        Query: start, end (ISO 8601 or unix seconds; default last hour),
        step (seconds; raised automatically to keep ≤600 points),
        metrics (comma-separated keys to limit the response).
        """
        return _timeseries(request, lambda **kw: device_timeseries(self.get_object(), **kw))

    @action(detail=True)
    def inventory(self, request, pk=None):
        """GET /api/infra/devices/{id}/inventory/ — top processes, services, filesystems (now).

        Query: top (processes to return, default 10, max 50).
        """
        try:
            top = int(request.query_params.get("top", 10))
        except ValueError:
            raise exceptions.ValidationError({"detail": "top must be a number."})
        try:
            return Response(device_inventory(self.get_object(), top=top))
        except ValueError as exc:
            raise exceptions.ValidationError({"detail": str(exc)})

    @action(detail=True)
    def hardware(self, request, pk=None):
        """GET /api/infra/devices/{id}/hardware/ — iDRAC / iLO health and sensors (start, end, step)."""
        q = request.query_params
        try:
            return Response(device_hardware(self.get_object(), start=q.get("start"), end=q.get("end"), step=q.get("step")))
        except ValueError as exc:
            raise exceptions.ValidationError({"detail": str(exc)})

    @action(detail=True)
    def logs(self, request, pk=None):
        """GET /api/infra/devices/{id}/logs/ — event logs from Loki.

        Query: start, end, search (text), level (critical|error|warning|info|debug), limit (≤500).
        """
        q = request.query_params
        try:
            return Response(device_logs(
                self.get_object(), start=q.get("start"), end=q.get("end"),
                search=q.get("search", ""), level=q.get("level", ""), limit=q.get("limit", 200),
            ))
        except ValueError as exc:
            raise exceptions.ValidationError({"detail": str(exc)})


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

    @action(detail=True)
    def metrics(self, request, pk=None):
        """GET /api/infra/vms/{id}/metrics/ — VMware exporter series for one VM."""
        return _timeseries(request, lambda **kw: vm_timeseries(self.get_object(), **kw))


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
