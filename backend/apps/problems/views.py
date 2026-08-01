from rest_framework import mixins, serializers, viewsets

from apps.tenants.mixins import TenantScopedQuerysetMixin
from .models import Problem, SnProblemRecord


class ProblemSerializer(serializers.ModelSerializer):
    class Meta:
        model = Problem
        fields = ["id", "title", "status", "priority", "assignee", "linked", "created", "age", "impact", "kb"]


class SnProblemRecordSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)

    class Meta:
        model = SnProblemRecord
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


class ProblemViewSet(TenantScopedQuerysetMixin, viewsets.ReadOnlyModelViewSet):
    queryset = Problem.objects.all()
    serializer_class = ProblemSerializer
    filterset_fields = ["status", "priority"]
    search_fields = ["id", "title", "impact"]


class SnProblemRecordViewSet(
    TenantScopedQuerysetMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    viewsets.ReadOnlyModelViewSet,
):
    queryset = SnProblemRecord.objects.all()
    serializer_class = SnProblemRecordSerializer
    filterset_fields = ["pri", "state", "category", "group"]
    search_fields = ["id", "title", "caller", "assignee"]

    def perform_update(self, serializer):
        serializer.save(updated="just now")

    def perform_create(self, serializer):
        last = SnProblemRecord.objects.filter(id__startswith="PRB-").order_by("-id").first()
        n = 1
        if last:
            try:
                n = int(last.id.split("-", 1)[1]) + 1
            except (IndexError, ValueError):
                n = SnProblemRecord.objects.count() + 1
        pri = serializer.validated_data.get("pri", 3)
        serializer.save(
            id=f"PRB-{n:06d}",
            tenant_id=getattr(self.request, "tenant_id", None),
            opened=serializer.validated_data.get("opened") or "just now",
            state=serializer.validated_data.get("state") or "New",
            group=serializer.validated_data.get("group") or "Platform Engineering",
            sla=serializer.validated_data.get("sla") or "ok",
            updated="just now",
            critical=serializer.validated_data.get("critical", pri == 1),
        )
