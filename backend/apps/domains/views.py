from rest_framework import exceptions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .checks import run_check
from .models import MonitoredDomain, ServiceDomain
from .serializers import MonitoredDomainSerializer, ServiceDomainSerializer


class _TenantCreateMixin:
    """New rows belong to the acting client. Shared rows (no client) are
    visible to every client but only editable from the all-clients scope."""

    def perform_create(self, serializer):
        serializer.save(tenant_id=getattr(self.request, "tenant_id", None))

    def _guard_shared(self, obj):
        if obj.tenant_id is None and getattr(self.request, "tenant_id", None):
            raise exceptions.PermissionDenied("Shared entries can only be changed by an administrator from the all-clients view.")

    def perform_update(self, serializer):
        self._guard_shared(serializer.instance)
        serializer.save()

    def perform_destroy(self, instance):
        self._guard_shared(instance)
        instance.delete()


class MonitoredDomainViewSet(_TenantCreateMixin, viewsets.ModelViewSet):
    """/api/infra/domains/ — monitored domain names; POST …/{id}/check/ runs
    the DNS, certificate and port checks now."""

    queryset = MonitoredDomain.objects.prefetch_related("services")
    serializer_class = MonitoredDomainSerializer
    filterset_fields = ["type", "active", "dns_status", "ssl_status", "site"]
    search_fields = ["name", "description", "site"]

    @action(detail=True, methods=["post"])
    def check(self, request, pk=None):
        domain = self.get_object()
        run_check(domain)
        return Response(self.get_serializer(domain).data)


class ServiceDomainViewSet(_TenantCreateMixin, viewsets.ModelViewSet):
    """/api/infra/service-domains/ — business domains grouping services and
    devices for the health heatmap."""

    queryset = ServiceDomain.objects.prefetch_related("services", "devices")
    serializer_class = ServiceDomainSerializer
    search_fields = ["name", "key"]
