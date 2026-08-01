from django.db import models

from apps.tenants.models import TenantScopedModel


class AuditLog(TenantScopedModel):
    user = models.CharField(max_length=128, blank=True, default="")
    method = models.CharField(max_length=8)
    path = models.CharField(max_length=255)
    status = models.PositiveSmallIntegerField(default=0)
    ip = models.GenericIPAddressField(null=True, blank=True)
    ts = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-ts"]
