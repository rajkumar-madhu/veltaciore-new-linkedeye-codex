from django.db import models

from apps.tenants.models import TenantScopedModel


class AlertRule(TenantScopedModel):
    """A configured alert condition (thresholds evaluated by Celery)."""

    name = models.CharField(max_length=128)
    metric = models.CharField(max_length=48)
    warn_threshold = models.FloatField(null=True, blank=True)
    critical_threshold = models.FloatField(null=True, blank=True)
    window = models.CharField(max_length=48, blank=True, default="")
    action = models.CharField(max_length=255, blank=True, default="")
    enabled = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name
