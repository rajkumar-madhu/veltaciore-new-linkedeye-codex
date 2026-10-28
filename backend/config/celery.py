"""Celery application + beat schedule for polling/EOD tasks."""
import os

from celery import Celery
from celery.schedules import crontab

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

app = Celery("veltacore")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

app.conf.beat_schedule = {
    "domain-checks": {
        "task": "apps.domains.tasks.check_domains",
        "schedule": 900.0,
    },
    "snmp-poll": {
        "task": "apps.monitoring.tasks.poll_snmp_devices",
        "schedule": 60.0,
    },
    "node-exporter-poll": {
        "task": "apps.monitoring.tasks.poll_node_exporters",
        "schedule": 30.0,
    },
    "blackbox-probes": {
        "task": "apps.monitoring.tasks.run_blackbox_probes",
        "schedule": 60.0,
    },
    "oob-health": {
        "task": "apps.monitoring.tasks.poll_oob_health",
        "schedule": 300.0,
    },
    "interface-metrics": {
        "task": "apps.monitoring.tasks.collect_interface_metrics",
        "schedule": 60.0,
    },
    "alert-rules": {
        "task": "apps.monitoring.tasks.evaluate_alert_rules",
        "schedule": 30.0,
    },
    "topology-refresh": {
        "task": "apps.monitoring.tasks.refresh_topology",
        "schedule": 600.0,
    },
    "device-discovery": {
        "task": "apps.monitoring.tasks.discover_devices",
        "schedule": crontab(minute=0, hour="*/6"),
    },
    "metrics-cleanup": {
        "task": "apps.monitoring.tasks.cleanup_old_metrics",
        "schedule": crontab(minute=30, hour=2),
    },
    # EOD order-latency CSV batch (16:15 IST == 10:45 UTC, Mon-Fri)
    "order-latency-csv": {
        "task": "apps.trading.tasks.generate_order_latency_csv",
        "schedule": crontab(minute=45, hour=10, day_of_week="mon-fri"),
        "options": {"queue": "eod_batch"},
    },
}
