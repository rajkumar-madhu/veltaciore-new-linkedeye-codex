from django.db import models

from apps.tenants.models import TenantScopedModel


class Problem(TenantScopedModel):
    id = models.CharField(primary_key=True, max_length=16)
    title = models.CharField(max_length=255)
    status = models.CharField(max_length=32)
    priority = models.PositiveSmallIntegerField()
    assignee = models.CharField(max_length=32, blank=True, default="")
    linked = models.PositiveIntegerField(default=0)
    created = models.CharField(max_length=32, blank=True, default="")
    age = models.CharField(max_length=16, blank=True, default="")
    impact = models.CharField(max_length=128, blank=True, default="")
    kb = models.CharField(max_length=16, null=True, blank=True)

    class Meta:
        ordering = ["id"]


class SnProblemRecord(TenantScopedModel):
    """ServiceNow-style problem list record backing the Problems screen."""

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
