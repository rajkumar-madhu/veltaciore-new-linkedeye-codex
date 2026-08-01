"""Serializers + viewsets for the ITSM domain (incidents/problems/changes/
cmdb/knowledge/slas/services), aggregated in apps/itsm_urls.py."""
from rest_framework import mixins, serializers, viewsets

from apps.apm.models import Service
from apps.changes.models import ChangeRequest
from apps.cmdb.models import Article, ConfigItem
from apps.tenants.mixins import TenantScopedQuerysetMixin
from .models import Incident, Sla, SnIncidentRecord


class IncidentSerializer(serializers.ModelSerializer):
    sloBurn = serializers.FloatField(source="slo_burn")

    class Meta:
        model = Incident
        fields = ["id", "sev", "title", "service", "assignee", "status", "age", "sla", "sloBurn", "impacted"]


class SnIncidentRecordSerializer(serializers.ModelSerializer):
    # id is assigned server-side (INC-NNNNNN); everything but the essentials
    # has a sensible default so the create form can stay lightweight.
    id = serializers.CharField(read_only=True)

    class Meta:
        model = SnIncidentRecord
        fields = ["id", "opened", "title", "caller", "pri", "state", "category", "group", "assignee", "sla", "updated", "critical"]
        extra_kwargs = {
            "opened": {"required": False},
            "state": {"required": False},
            "category": {"required": False},
            "group": {"required": False},
            "assignee": {"required": False, "allow_null": True},
            "sla": {"required": False},
            "updated": {"required": False},
            "critical": {"required": False},
        }


class SlaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sla
        fields = ["id", "name", "target", "window", "breach", "compliance"]


class IncidentViewSet(
    TenantScopedQuerysetMixin,
    mixins.UpdateModelMixin,
    viewsets.ReadOnlyModelViewSet,
):
    queryset = Incident.objects.all()
    serializer_class = IncidentSerializer
    filterset_fields = ["sev", "status", "service"]
    search_fields = ["id", "title", "service", "impacted"]
    ordering_fields = ["sev", "created_at", "sla"]


class SnIncidentRecordViewSet(
    TenantScopedQuerysetMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    viewsets.ReadOnlyModelViewSet,
):
    queryset = SnIncidentRecord.objects.all()
    serializer_class = SnIncidentRecordSerializer
    filterset_fields = ["pri", "state", "category", "group"]
    search_fields = ["id", "title", "caller", "assignee"]

    def perform_update(self, serializer):
        # State transitions (Acknowledge/Assign/Resolve) touch the updated stamp.
        serializer.save(updated="just now")

    def perform_create(self, serializer):
        # Allocate the next INC-NNNNNN id (ids are zero-padded, so string
        # ordering is numeric ordering) and bind the row to the acting tenant.
        last = SnIncidentRecord.objects.filter(id__startswith="INC-").order_by("-id").first()
        n = 1
        if last:
            try:
                n = int(last.id.split("-", 1)[1]) + 1
            except (IndexError, ValueError):
                n = SnIncidentRecord.objects.count() + 1
        pri = serializer.validated_data.get("pri", 3)
        serializer.save(
            id=f"INC-{n:06d}",
            tenant_id=getattr(self.request, "tenant_id", None),
            opened=serializer.validated_data.get("opened") or "just now",
            state=serializer.validated_data.get("state") or "New",
            group=serializer.validated_data.get("group") or "Platform Engineering",
            sla=serializer.validated_data.get("sla") or "ok",
            updated="just now",
            critical=serializer.validated_data.get("critical", pri == 1),
        )


class SlaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Sla.objects.all()
    serializer_class = SlaSerializer
