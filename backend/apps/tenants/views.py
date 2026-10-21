from rest_framework import viewsets

from .models import Tenant
from .serializers import TenantSerializer


class TenantViewSet(viewsets.ReadOnlyModelViewSet):
    # The tenant list is how the UI discovers which tenants exist, so it must
    # not require a valid X-Tenant-ID (a fresh deployment's default tenant id
    # may not exist yet). Tenant rows are not tenant-scoped data.
    tenant_scope_exempt = True
    queryset = Tenant.objects.all()
    serializer_class = TenantSerializer
    search_fields = ["name", "code", "plan"]
    ordering_fields = ["name", "users", "incidents", "health", "spend"]
