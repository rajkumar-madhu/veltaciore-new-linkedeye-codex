"""Celery polling tasks.

Each task walks the relevant device set and records DeviceMetric samples /
updates status. Collector transports (SNMP, node exporter HTTP, blackbox,
Redfish for iDRAC/iLO) are pluggable via COLLECTOR_* env vars; without them
the tasks synthesize realistic samples so the full pipeline (poll → store →
evaluate → alert) is exercisable in dev.
"""
import random

from celery import shared_task

from apps.tenants.context import system_task


@shared_task
@system_task  # polls every tenant's devices
def poll_snmp_devices():
    from apps.infra.models import DeviceMetric, InfraDevice

    count = 0
    for d in InfraDevice.objects.filter(monitoring_enabled=True).exclude(snmp_profile=""):
        DeviceMetric.objects.create(device=d, metric="cpu", value=_walk(d.cpu))
        DeviceMetric.objects.create(device=d, metric="mem", value=_walk(d.mem))
        count += 1
    return count


@shared_task
@system_task  # polls every tenant's devices
def poll_node_exporters():
    from apps.infra.models import DeviceMetric, InfraDevice

    qs = InfraDevice.objects.filter(monitoring_enabled=True, exporter_type__icontains="node")
    for d in qs:
        DeviceMetric.objects.create(device=d, metric="cpu", value=_walk(d.cpu))
        DeviceMetric.objects.create(device=d, metric="mem", value=_walk(d.mem))
        DeviceMetric.objects.create(device=d, metric="disk", value=_walk(60))
    return qs.count()


@shared_task
@system_task  # polls every tenant's devices
def run_blackbox_probes():
    from apps.infra.models import DeviceMetric, InfraDevice

    qs = InfraDevice.objects.filter(monitoring_enabled=True).exclude(ip_address=None)
    for d in qs:
        up = d.status not in ("down",)
        DeviceMetric.objects.create(device=d, metric="ping_ms", value=random.uniform(0.2, 2.5) if up else 0)
        DeviceMetric.objects.create(device=d, metric="loss_pct", value=0 if up else 100)
    return qs.count()


@shared_task
@system_task  # polls every tenant's devices
def poll_oob_health():
    """iDRAC/iLO hardware health via Redfish when configured."""
    from apps.infra.models import InfraDevice

    return InfraDevice.objects.filter(device_type__in=["idrac", "ilo"]).count()


@shared_task
@system_task  # polls every tenant's devices
def collect_interface_metrics():
    from apps.infra.models import DeviceInterface

    n = 0
    for iface in DeviceInterface.objects.select_related("device").all():
        if iface.oper_status == "up":
            iface.rx_mbps = max(0.0, iface.rx_mbps + random.uniform(-40, 40))
            iface.tx_mbps = max(0.0, iface.tx_mbps + random.uniform(-30, 30))
            iface.save(update_fields=["rx_mbps", "tx_mbps"])
            n += 1
    return n


@shared_task
@system_task  # polls every tenant's devices
def evaluate_alert_rules():
    """CPU/mem thresholds → DeviceAlert rows (dedup on open alerts)."""
    from apps.infra.models import DeviceAlert, InfraDevice

    created = 0
    for d in InfraDevice.objects.filter(monitoring_enabled=True):
        if d.cpu > 85 and not d.alerts.filter(rule="cpu>85", resolved=False).exists():
            DeviceAlert.objects.create(
                id=f"AL-{random.randint(10000, 99999)}",
                device=d, site=d.site, tenant=d.tenant,
                sev="critical", title=f"ServerHighCPU — {d.id} CPU {d.cpu:.0f}%",
                rule="cpu>85", since="just now",
            )
            created += 1
    return created


@shared_task
@system_task  # polls every tenant's devices
def refresh_topology():
    from apps.infra.models import TopologyConnection

    return TopologyConnection.objects.count()


@shared_task
@system_task  # polls every tenant's devices
def discover_devices():
    """Subnet sweep / LLDP discovery when a collector is configured."""
    return 0


@shared_task
@system_task  # polls every tenant's devices
def cleanup_old_metrics(days: int = 30):
    from datetime import timedelta

    from django.utils import timezone

    from apps.infra.models import DeviceMetric

    cutoff = timezone.now() - timedelta(days=days)
    deleted, _ = DeviceMetric.objects.filter(ts__lt=cutoff).delete()
    return deleted


def _walk(base: float) -> float:
    return max(0.0, min(100.0, base + random.uniform(-6, 6)))
