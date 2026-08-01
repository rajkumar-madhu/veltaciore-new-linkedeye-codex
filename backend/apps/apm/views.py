from rest_framework import serializers, viewsets

from apps.tenants.mixins import TenantScopedQuerysetMixin
from .models import Service


class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = ["name", "status", "uptime", "p95", "err", "deps"]


class ServiceViewSet(TenantScopedQuerysetMixin, viewsets.ReadOnlyModelViewSet):
    queryset = Service.objects.all()
    serializer_class = ServiceSerializer
    filterset_fields = ["status"]
    search_fields = ["name"]
