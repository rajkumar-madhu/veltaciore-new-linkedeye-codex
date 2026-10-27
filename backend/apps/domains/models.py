"""Monitored DNS domains and business (service) domains.

MonitoredDomain — a domain name the platform resolves, checks the TLS
certificate of, and probes the associated service ports for (Domains page).
ServiceDomain — a business grouping such as "Trading" that collects APM
services and devices for the health heatmap.
"""
from django.db import models

from apps.tenants.models import TenantScopedModel


class MonitoredDomain(TenantScopedModel):
    TYPES = ["Production", "Application", "API", "Monitoring", "Backup", "VPN", "Mail", "Test", "Other"]
    DNS_STATES = ["Unknown", "Resolved", "Error"]
    SSL_STATES = ["Unknown", "Valid", "Expiring", "Expired", "Error", "Off"]

    name = models.CharField(max_length=253)
    type = models.CharField(max_length=16, choices=[(t, t) for t in TYPES], default="Production")
    site = models.CharField(max_length=128, blank=True, default="")
    description = models.CharField(max_length=500, blank=True, default="")
    active = models.BooleanField(default=True)
    check_ssl = models.BooleanField(default=True)
    ssl_port = models.PositiveIntegerField(default=443)

    # Results of the last check (written by checks.run_check).
    dns_status = models.CharField(max_length=16, default="Unknown")
    resolved_ips = models.JSONField(default=list, blank=True)
    ssl_status = models.CharField(max_length=16, default="Unknown")
    ssl_expiry = models.DateTimeField(null=True, blank=True)
    ssl_issuer = models.CharField(max_length=255, blank=True, default="")
    check_error = models.CharField(max_length=500, blank=True, default="")
    last_checked = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        constraints = [models.UniqueConstraint(fields=["tenant", "name"], name="uniq_domain_per_tenant")]

    def __str__(self) -> str:
        return self.name


class DomainService(models.Model):
    """A TCP port on the domain that is probed with each check."""

    domain = models.ForeignKey(MonitoredDomain, on_delete=models.CASCADE, related_name="services")
    name = models.CharField(max_length=128)
    type = models.CharField(max_length=32, blank=True, default="")
    port = models.PositiveIntegerField()
    up = models.BooleanField(null=True)  # None until checked
    response_ms = models.FloatField(null=True, blank=True)
    last_checked = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["port", "name"]


class ServiceDomain(TenantScopedModel):
    """Business domain for the heatmap: explicit services and devices, plus
    every device of the listed kinds."""

    key = models.SlugField(max_length=64)
    name = models.CharField(max_length=128)
    description = models.CharField(max_length=500, blank=True, default="")
    icon = models.CharField(max_length=48, default="fa-layer-group")
    order = models.PositiveIntegerField(default=0)
    services = models.ManyToManyField("apm.Service", blank=True, related_name="+")
    devices = models.ManyToManyField("infra.InfraDevice", blank=True, related_name="+")
    device_kinds = models.JSONField(default=list, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "name"]
        constraints = [models.UniqueConstraint(fields=["tenant", "key"], name="uniq_service_domain_key")]

    def __str__(self) -> str:
        return self.name
