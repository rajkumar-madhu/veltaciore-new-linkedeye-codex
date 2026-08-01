from django.db import models

from apps.tenants.models import TenantScopedModel


class Site(TenantScopedModel):
    """A datacenter or branch location."""

    id = models.SlugField(primary_key=True, max_length=64)
    name = models.CharField(max_length=200)
    region = models.CharField(max_length=32)
    devices = models.PositiveIntegerField(default=0)
    health = models.PositiveIntegerField(default=100)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Rack(TenantScopedModel):
    """A physical rack enclosure. `name` is the short rack id (e.g. R12)."""

    site = models.ForeignKey(Site, on_delete=models.CASCADE, related_name="racks")
    name = models.CharField(max_length=64)
    row = models.CharField(max_length=16, blank=True, default="")
    role = models.CharField(max_length=64, blank=True, default="")
    height_u = models.PositiveIntegerField(default=42)
    power_kw = models.FloatField(default=0)
    capacity_kw = models.FloatField(default=160)
    inlet_c = models.FloatField(default=22)
    exhaust_c = models.FloatField(default=34)
    humidity = models.FloatField(default=48)
    ups_runtime = models.CharField(max_length=24, blank=True, default="")
    position = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["position", "site", "name"]
        unique_together = [("site", "name")]

    def __str__(self) -> str:
        return f"{self.site_id}/{self.name}"


class RackUnit(models.Model):
    """One occupant of a rack, spanning u_bottom..u_top on the front elevation."""

    rack = models.ForeignKey(Rack, on_delete=models.CASCADE, related_name="rack_units")
    u_top = models.PositiveSmallIntegerField()
    u_bottom = models.PositiveSmallIntegerField()
    kind = models.CharField(max_length=24)
    label = models.CharField(max_length=64, blank=True, default="")
    description = models.CharField(max_length=255, blank=True, default="")
    model = models.CharField(max_length=128, blank=True, default="")
    color = models.CharField(max_length=16, default="#64748b")
    icon = models.CharField(max_length=48, default="fa-server")
    status = models.CharField(max_length=12, default="ok")
    asset = models.CharField(max_length=64)
    ip = models.GenericIPAddressField(null=True, blank=True)
    device_id = models.CharField(max_length=64, blank=True, default="")
    chip = models.CharField(max_length=32, blank=True, default="")
    position = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["rack", "position"]

    def __str__(self) -> str:
        return f"{self.rack_id}:{self.asset}"
