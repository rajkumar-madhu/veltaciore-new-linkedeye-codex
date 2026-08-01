from django.db import models

from apps.tenants.models import TenantScopedModel


class Incident(TenantScopedModel):
    id = models.CharField(primary_key=True, max_length=16)
    sev = models.PositiveSmallIntegerField()
    title = models.CharField(max_length=255)
    service = models.CharField(max_length=64)
    assignee = models.CharField(max_length=32, null=True, blank=True)
    status = models.CharField(max_length=24, default="open")
    age = models.CharField(max_length=24, blank=True, default="")
    sla = models.FloatField(default=1.0)
    slo_burn = models.FloatField(default=0.0)
    impacted = models.CharField(max_length=128, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.id


class SnIncidentRecord(TenantScopedModel):
    """ServiceNow-style incident list record backing the Incidents screen."""

    id = models.CharField(primary_key=True, max_length=16)
    opened = models.CharField(max_length=24)
    title = models.CharField(max_length=255)
    caller = models.CharField(max_length=64)
    pri = models.PositiveSmallIntegerField()
    state = models.CharField(max_length=24)
    category = models.CharField(max_length=32)
    group = models.CharField(max_length=64)
    assignee = models.CharField(max_length=64, null=True, blank=True)
    sla = models.CharField(max_length=12, default="ok")
    updated = models.CharField(max_length=24, blank=True, default="")
    critical = models.BooleanField(default=False)

    class Meta:
        ordering = ["id"]


class Sla(models.Model):
    id = models.CharField(primary_key=True, max_length=16)
    name = models.CharField(max_length=64)
    target = models.CharField(max_length=24)
    window = models.CharField(max_length=24)
    breach = models.PositiveIntegerField(default=0)
    compliance = models.FloatField(default=100.0)

    class Meta:
        ordering = ["id"]
