from django.db import models

from apps.tenants.models import TenantScopedModel


class ConfigItem(TenantScopedModel):
    id = models.CharField(primary_key=True, max_length=16)
    name = models.CharField(max_length=128)
    cls = models.CharField(max_length=48)
    env = models.CharField(max_length=16, default="prod")
    region = models.CharField(max_length=32, blank=True, default="")
    owner = models.CharField(max_length=32, null=True, blank=True)
    health = models.CharField(max_length=16, default="healthy")
    deps = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["id"]


class Article(models.Model):
    """Knowledge-base article."""

    id = models.CharField(primary_key=True, max_length=16)
    title = models.CharField(max_length=255)
    cat = models.CharField(max_length=32)
    views = models.PositiveIntegerField(default=0)
    upd = models.CharField(max_length=32, blank=True, default="")
    author = models.CharField(max_length=32, blank=True, default="")
    rating = models.FloatField(default=0)
    tag = models.CharField(max_length=32, blank=True, default="")

    class Meta:
        ordering = ["-views"]
