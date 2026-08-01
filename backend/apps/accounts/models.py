from django.db import models

from apps.tenants.models import TenantScopedModel


class Person(TenantScopedModel):
    """Directory entry mirroring the platform's people & roles."""

    id = models.SlugField(primary_key=True, max_length=32)
    name = models.CharField(max_length=200)
    email = models.EmailField()
    role = models.CharField(max_length=64)
    team = models.CharField(max_length=64)
    color = models.CharField(max_length=16, default="slate")
    status = models.CharField(max_length=16, default="offline")
    last = models.CharField(max_length=32, default="")

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name
