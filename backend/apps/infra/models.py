from django.db import models

from apps.sites.models import Rack, Site
from apps.tenants.models import TenantScopedModel


class InfraDevice(TenantScopedModel):
    """A monitored infrastructure device (switch/server/VM host/…)."""

    DEVICE_TYPES = [
        ("firewall", "Firewall"), ("switch", "Switch"), ("router", "Router"),
        ("loadbal", "Load balancer"), ("phys-srv", "Physical server"),
        ("win-srv", "Windows server"), ("linux-srv", "Linux server"),
        ("vm", "VM"), ("hypervisor", "Hypervisor"), ("k8s-node", "Kubernetes node"),
        ("k8s-cluster", "Kubernetes cluster"), ("storage", "Storage"),
        ("database", "Database"), ("application", "Application"),
        ("container", "Container"), ("idrac", "iDRAC"), ("ilo", "iLO"),
        ("ups", "UPS / Power"), ("exporter", "Exporter"), ("generic", "Generic"),
    ]
    STATUS = [("ok", "OK"), ("warn", "Warning"), ("critical", "Critical"),
              ("down", "Down"), ("unknown", "Unknown")]

    id = models.CharField(primary_key=True, max_length=64)
    site = models.ForeignKey(Site, on_delete=models.CASCADE, related_name="device_set")
    name = models.CharField(max_length=128, blank=True, default="")
    hostname = models.CharField(max_length=255, blank=True, default="")
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    device_type = models.CharField(max_length=24, choices=DEVICE_TYPES, default="generic")
    vendor = models.CharField(max_length=64, blank=True, default="")
    model = models.CharField(max_length=128, blank=True, default="")
    serial_number = models.CharField(max_length=64, blank=True, default="")
    os_name = models.CharField(max_length=64, blank=True, default="")
    os_version = models.CharField(max_length=64, blank=True, default="")
    LIFECYCLE = [("discovered", "Discovered"), ("pending_review", "Pending review"),
                 ("active", "Active"), ("decommissioned", "Decommissioned")]
    CRITICALITY = [("tier1", "Tier 1 — business critical"), ("tier2", "Tier 2 — high"),
                   ("tier3", "Tier 3 — standard"), ("tier4", "Tier 4 — low")]

    status = models.CharField(max_length=12, choices=STATUS, default="unknown")
    # Change only through apps.infra.lifecycle.transition_device (OPA + audit).
    lifecycle_state = models.CharField(max_length=16, choices=LIFECYCLE, default="active", db_index=True)
    criticality_tier = models.CharField(max_length=8, choices=CRITICALITY, default="tier3")
    owning_team = models.CharField(max_length=128, blank=True, default="")
    # Prometheus label matchers for this device's series, e.g.
    # {"instance": "10.10.1.21:9100", "job": "node"}. Empty → derived from
    # the device (apps.monitoring.prometheus.device_selector).
    metrics_labels = models.JSONField(default=dict, blank=True)
    health_status = models.CharField(max_length=12, choices=STATUS, default="unknown")
    monitoring_enabled = models.BooleanField(default=True)
    snmp_version = models.CharField(max_length=8, blank=True, default="")
    snmp_profile = models.CharField(max_length=64, blank=True, default="")
    exporter_type = models.CharField(max_length=64, blank=True, default="")
    rack = models.ForeignKey(Rack, null=True, blank=True, on_delete=models.SET_NULL)
    location = models.CharField(max_length=128, blank=True, default="")
    role = models.CharField(max_length=128, blank=True, default="")
    uptime = models.CharField(max_length=32, blank=True, default="")
    cpu = models.FloatField(default=0)
    mem = models.FloatField(default=0)
    iface_summary = models.CharField(max_length=32, blank=True, default="—")
    throughput = models.CharField(max_length=32, blank=True, default="—")
    sessions = models.CharField(max_length=32, blank=True, default="—")
    last_seen = models.CharField(max_length=32, blank=True, default="")
    agent = models.CharField(max_length=64, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["id"]

    def __str__(self) -> str:
        return self.id


class DeviceInterface(models.Model):
    device = models.ForeignKey(InfraDevice, on_delete=models.CASCADE, related_name="interfaces")
    name = models.CharField(max_length=64)
    description = models.CharField(max_length=255, blank=True, default="")
    mac_address = models.CharField(max_length=24, blank=True, default="")
    admin_status = models.CharField(max_length=8, default="up")
    oper_status = models.CharField(max_length=8, default="up")
    speed = models.CharField(max_length=24, blank=True, default="")
    duplex = models.CharField(max_length=8, blank=True, default="full")
    mtu = models.PositiveIntegerField(default=1500)
    vlan = models.CharField(max_length=32, blank=True, default="")
    rx_mbps = models.FloatField(default=0)
    tx_mbps = models.FloatField(default=0)
    rx_packets = models.BigIntegerField(default=0)
    tx_packets = models.BigIntegerField(default=0)
    rx_errors = models.BigIntegerField(default=0)
    tx_errors = models.BigIntegerField(default=0)
    rx_drops = models.BigIntegerField(default=0)
    tx_drops = models.BigIntegerField(default=0)
    crc_errors = models.BigIntegerField(default=0)
    error_rate = models.FloatField(default=0)
    utilization = models.FloatField(default=0)
    last_change = models.CharField(max_length=32, blank=True, default="")

    class Meta:
        ordering = ["device", "name"]
        unique_together = [("device", "name")]


class DeviceMetric(models.Model):
    """Point-in-time metric sample (retention handled by the cleanup task)."""

    device = models.ForeignKey(InfraDevice, on_delete=models.CASCADE, related_name="metrics")
    metric = models.CharField(max_length=48)  # cpu, mem, disk, ping_ms, loss_pct…
    value = models.FloatField()
    ts = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-ts"]
        indexes = [models.Index(fields=["device", "metric", "-ts"])]


class DeviceAlert(TenantScopedModel):
    SEVERITIES = [("critical", "Critical"), ("warn", "Warning"), ("info", "Info")]

    id = models.CharField(primary_key=True, max_length=32)
    device = models.ForeignKey(InfraDevice, on_delete=models.CASCADE, related_name="alerts")
    site = models.ForeignKey(Site, on_delete=models.CASCADE)
    sev = models.CharField(max_length=12, choices=SEVERITIES)
    title = models.CharField(max_length=255)
    detail = models.TextField(blank=True, default="")
    since = models.CharField(max_length=32, blank=True, default="")
    rule = models.CharField(max_length=128, blank=True, default="")
    acknowledged = models.BooleanField(default=False)
    resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class VirtualMachine(TenantScopedModel):
    id = models.CharField(primary_key=True, max_length=64)
    host = models.ForeignKey(InfraDevice, on_delete=models.CASCADE, related_name="vms")
    cluster = models.CharField(max_length=64, blank=True, default="")
    os = models.CharField(max_length=64, blank=True, default="")
    cpu = models.CharField(max_length=24, blank=True, default="")
    mem = models.CharField(max_length=24, blank=True, default="")
    disk = models.CharField(max_length=24, blank=True, default="")
    state = models.CharField(max_length=16, default="running")
    cpu_use = models.FloatField(default=0)
    mem_use = models.FloatField(default=0)
    ip = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        ordering = ["id"]


class Exporter(models.Model):
    name = models.CharField(primary_key=True, max_length=64)
    version = models.CharField(max_length=24, blank=True, default="")
    port = models.PositiveIntegerField(null=True, blank=True)
    protocol = models.CharField(max_length=32, blank=True, default="")
    hosts = models.PositiveIntegerField(default=0)
    scrapes = models.CharField(max_length=24, blank=True, default="—")
    lag = models.CharField(max_length=16, blank=True, default="")
    status = models.CharField(max_length=12, default="ok")
    note = models.CharField(max_length=240, blank=True, default="")
    sites = models.JSONField(default=list)

    class Meta:
        ordering = ["name"]


class BodCheck(models.Model):
    """A single beginning-of-day check (url / telnet / k8s), mirroring the
    Finspot checker output. status: 0 down · 1 warn · 2 ok · 3 timeout."""
    KIND = [("url", "url"), ("telnet", "telnet"), ("k8s", "k8s")]
    env = models.CharField(max_length=64, default="nextalpha-le-PROD")
    kind = models.CharField(max_length=8, choices=KIND, default="url")
    target = models.CharField(max_length=200)          # url / host / component
    port = models.PositiveIntegerField(null=True, blank=True)
    code = models.IntegerField(null=True, blank=True)  # http status code
    ssl_expiry = models.CharField(max_length=32, blank=True, default="")
    ssl_days = models.IntegerField(null=True, blank=True)
    status = models.PositiveSmallIntegerField(default=2)
    remark = models.CharField(max_length=120, blank=True, default="")
    note = models.CharField(max_length=200, blank=True, default="")
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["kind", "order"]


class TopologyConnection(models.Model):
    src = models.ForeignKey(InfraDevice, on_delete=models.CASCADE, related_name="links_out")
    dst = models.ForeignKey(InfraDevice, on_delete=models.CASCADE, related_name="links_in")
    src_port = models.CharField(max_length=48, blank=True, default="")
    dst_port = models.CharField(max_length=48, blank=True, default="")
    bandwidth = models.CharField(max_length=24, blank=True, default="")
    status = models.CharField(max_length=12, default="ok")

    class Meta:
        unique_together = [("src", "dst", "src_port", "dst_port")]
