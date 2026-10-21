from django.db import models

from apps.tenants.models import TenantScopedModel, TenantScopedQuerySet


class AuditLog(TenantScopedModel):
    user = models.CharField(max_length=128, blank=True, default="")
    method = models.CharField(max_length=8)
    path = models.CharField(max_length=255)
    status = models.PositiveSmallIntegerField(default=0)
    ip = models.GenericIPAddressField(null=True, blank=True)
    ts = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-ts"]


class AppendOnlyError(RuntimeError):
    """An audit event was modified or deleted; the trail is append-only."""


class AuditEventQuerySet(TenantScopedQuerySet):
    def update(self, **kwargs):
        raise AppendOnlyError("Audit events are append-only and cannot be updated.")

    def delete(self):
        raise AppendOnlyError("Audit events are append-only and cannot be deleted.")


class AuditEvent(TenantScopedModel):
    """Immutable record of a change to inventory data (SEBI CSCRF control).

    One row per mutating action: who did it, to what, and the entity's state
    before and after. Rows can only be inserted — the model, its queryset and
    a database trigger (migration 0002) all refuse UPDATE and DELETE. Write
    through apps.audit.events.record(), which also emits the event as a JSON
    log line for the Filebeat → Loki pipeline.
    """

    ts = models.DateTimeField(auto_now_add=True, db_index=True)
    actor = models.CharField(max_length=128, blank=True, default="")
    actor_groups = models.JSONField(default=list, blank=True)
    action = models.CharField(max_length=64, db_index=True)  # e.g. "device.transition"
    entity_type = models.CharField(max_length=64, db_index=True)  # e.g. "infra.device"
    entity_id = models.CharField(max_length=128, db_index=True)
    before = models.JSONField(null=True, blank=True)
    after = models.JSONField(null=True, blank=True)
    reason = models.TextField(blank=True, default="")
    request_id = models.CharField(max_length=64, blank=True, default="")
    ip = models.GenericIPAddressField(null=True, blank=True)

    objects = models.Manager.from_queryset(AuditEventQuerySet)()

    class Meta:
        ordering = ["-ts", "-id"]
        indexes = [models.Index(fields=["entity_type", "entity_id", "ts"])]

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise AppendOnlyError("Audit events are append-only and cannot be updated.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise AppendOnlyError("Audit events are append-only and cannot be deleted.")
