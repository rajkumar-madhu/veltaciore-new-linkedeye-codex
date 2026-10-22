from rest_framework import viewsets

from .models import AuditEvent
from .serializers import AuditEventSerializer


class AuditEventViewSet(viewsets.ReadOnlyModelViewSet):
    """GET /api/audit/events/ — the immutable inventory change trail.

    Read-only by construction (no create/update/delete routes); tenant-scoped
    like every other model, and gated by OPA as a sensitive read.
    """

    queryset = AuditEvent.objects.all()
    serializer_class = AuditEventSerializer
    filterset_fields = ["action", "entity_type", "entity_id", "actor"]
    search_fields = ["entity_id", "actor", "reason"]
    ordering_fields = ["ts"]
