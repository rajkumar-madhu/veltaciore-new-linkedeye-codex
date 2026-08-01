from django.db import models


class Tenant(models.Model):
    """A business unit under the parent organization."""

    id = models.SlugField(primary_key=True, max_length=64)
    name = models.CharField(max_length=200)
    parent = models.CharField(max_length=64, blank=True, default="")
    code = models.CharField(max_length=8)
    color = models.CharField(max_length=16, default="slate")
    users = models.PositiveIntegerField(default=0)
    incidents = models.PositiveIntegerField(default=0)
    sev1 = models.PositiveIntegerField(default=0)
    health = models.PositiveIntegerField(default=100)
    mttr = models.PositiveIntegerField(default=0)
    spend = models.PositiveIntegerField(default=0)
    plan = models.CharField(max_length=32, default="Business")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class TenantScopedModel(models.Model):
    """Base for anything that belongs to a tenant. Null tenant = shared/global."""

    tenant = models.ForeignKey(
        Tenant, null=True, blank=True, on_delete=models.CASCADE, related_name="+"
    )

    class Meta:
        abstract = True
