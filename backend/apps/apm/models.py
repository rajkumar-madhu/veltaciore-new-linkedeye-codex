from django.db import models

from apps.tenants.models import TenantScopedModel


class Service(TenantScopedModel):
    name = models.CharField(primary_key=True, max_length=64)
    status = models.CharField(max_length=16, default="healthy")
    uptime = models.FloatField(default=100.0)
    p95 = models.CharField(max_length=16, blank=True, default="—")
    err = models.FloatField(default=0.0)
    deps = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["name"]
