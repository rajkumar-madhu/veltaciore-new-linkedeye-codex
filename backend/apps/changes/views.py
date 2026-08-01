from rest_framework import mixins, serializers, viewsets

from apps.tenants.mixins import TenantScopedQuerysetMixin
from .models import ChangeRequest, SnChangeRecord


class ChangeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChangeRequest
        fields = ["id", "title", "type", "state", "risk", "window", "assignee", "approvers", "approved", "service"]


class SnChangeRecordSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)

    class Meta:
        model = SnChangeRecord
        fields = ["id", "opened", "title", "caller", "pri", "state", "category", "group", "assignee", "sla", "updated", "critical", "risk"]
        extra_kwargs = {
            "opened": {"required": False},
            "state": {"required": False},
            "category": {"required": False},
            "group": {"required": False},
            "assignee": {"required": False, "allow_null": True},
            "sla": {"required": False},
            "updated": {"required": False},
            "critical": {"required": False},
            "risk": {"required": False},
        }


class ChangeViewSet(TenantScopedQuerysetMixin, viewsets.ReadOnlyModelViewSet):
    queryset = ChangeRequest.objects.all()
    serializer_class = ChangeSerializer
    filterset_fields = ["type", "state", "risk"]
    search_fields = ["id", "title", "service"]


class SnChangeRecordViewSet(
    TenantScopedQuerysetMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    viewsets.ReadOnlyModelViewSet,
):
    queryset = SnChangeRecord.objects.all()
    serializer_class = SnChangeRecordSerializer
    filterset_fields = ["pri", "state", "category", "group", "risk"]
    search_fields = ["id", "title", "caller", "assignee"]

    def perform_update(self, serializer):
        serializer.save(updated="just now")

    def perform_create(self, serializer):
        last = SnChangeRecord.objects.filter(id__startswith="CHG-").order_by("-id").first()
        n = 1
        if last:
            try:
                n = int(last.id.split("-", 1)[1]) + 1
            except (IndexError, ValueError):
                n = SnChangeRecord.objects.count() + 1
        pri = serializer.validated_data.get("pri", 3)
        serializer.save(
            id=f"CHG-{n:06d}",
            tenant_id=getattr(self.request, "tenant_id", None),
            opened=serializer.validated_data.get("opened") or "just now",
            state=serializer.validated_data.get("state") or "New",
            group=serializer.validated_data.get("group") or "Platform Engineering",
            sla=serializer.validated_data.get("sla") or "ok",
            updated="just now",
            critical=serializer.validated_data.get("critical", pri == 1),
        )
