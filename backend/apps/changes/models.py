from django.db import models

from apps.tenants.models import TenantScopedModel


class ChangeRequest(TenantScopedModel):
    id = models.CharField(primary_key=True, max_length=16)
    title = models.CharField(max_length=255)
    type = models.CharField(max_length=24)
    state = models.CharField(max_length=32)
    risk = models.CharField(max_length=16)
    window = models.CharField(max_length=64, blank=True, default="")
    assignee = models.CharField(max_length=32, blank=True, default="")
    approvers = models.PositiveIntegerField(default=0)
    approved = models.PositiveIntegerField(default=0)
    service = models.CharField(max_length=64, blank=True, default="")

    class Meta:
        ordering = ["id"]


class SnChangeRecord(TenantScopedModel):
    """ServiceNow-style change list record backing the Changes screen."""

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
    risk = models.CharField(max_length=16, blank=True, default="Low")

    class Meta:
        ordering = ["id"]
