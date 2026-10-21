from rest_framework import serializers

from .models import AuditEvent


class AuditEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditEvent
        fields = [
            "id", "ts", "tenant", "actor", "actor_groups", "action", "entity_type",
            "entity_id", "before", "after", "reason", "request_id", "ip",
        ]
        read_only_fields = fields
