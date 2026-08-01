from rest_framework import viewsets

from .models import Tenant
from .serializers import TenantSerializer


class TenantViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Tenant.objects.all()
    serializer_class = TenantSerializer
    search_fields = ["name", "code", "plan"]
    ordering_fields = ["name", "users", "incidents", "health", "spend"]
