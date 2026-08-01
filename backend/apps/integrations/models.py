from django.db import models

from apps.tenants.models import TenantScopedModel


class Integration(TenantScopedModel):
    name = models.CharField(primary_key=True, max_length=64)
    category = models.CharField(max_length=32)
    connected = models.BooleanField(default=False)
    meta = models.CharField(max_length=255, blank=True, default="")
    icon = models.CharField(max_length=64, blank=True, default="")

    class Meta:
        ordering = ["name"]
