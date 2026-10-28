"""Check the connection to Prometheus and Loki and which devices they cover.

    python manage.py check_monitoring            # summary
    python manage.py check_monitoring --devices  # one line per device

Read-only: it runs a handful of Prometheus / Loki queries and prints what it
finds — the Prometheus version, scrape jobs and how many targets are up,
which exporter families have series, and for every active device whether its
selector matches any series (so a wrong IP, port or label shows up here
rather than as an empty chart). Exits with status 1 when Prometheus is not
reachable.
"""
from __future__ import annotations

import requests
from django.conf import settings
from django.core.management.base import BaseCommand

from apps.infra.models import InfraDevice
from apps.monitoring import prometheus as prom
from apps.tenants.context import all_tenants

FAMILY_METRICS = {
    "node_exporter (Linux)": "node_cpu_seconds_total",
    "windows_exporter": "windows_cpu_time_total",
    "  windows process collector": "windows_process_cpu_time_total",
    "  windows service collector": "windows_service_state",
    "process-exporter (Linux processes)": "namedprocess_namegroup_cpu_seconds_total",
    "node_exporter systemd collector": "node_systemd_unit_state",
    "snmp_exporter (network devices)": "sysUpTime",
    "vmware_exporter (hosts)": "vmware_host_cpu_usage",
    "vmware_exporter (VMs)": "vmware_vm_power_state",
    "redfish_exporter (iDRAC / iLO)": "redfish_system_health_state",
}


class Command(BaseCommand):
    help = "Check Prometheus / Loki connectivity and which devices have metrics."

    def add_arguments(self, parser):
        parser.add_argument("--devices", action="store_true", help="List every device with its match result.")

    def ok(self, msg):
        self.stdout.write(self.style.SUCCESS("  ✔ ") + msg)

    def warn(self, msg):
        self.stdout.write(self.style.WARNING("  ! ") + msg)

    def bad(self, msg):
        self.stdout.write(self.style.ERROR("  ✘ ") + msg)

    def handle(self, *args, devices=False, **opts):
        self.stdout.write(self.style.MIGRATE_HEADING("Prometheus"))
        url = getattr(settings, "PROMETHEUS_URL", "")
        if not url:
            self.bad("PROMETHEUS_URL is not set. Put it in .env (see .env.example) and restart the API.")
            raise SystemExit(1)
        self.stdout.write(f"  URL {url}" + ("  (bearer token set)" if getattr(settings, "PROMETHEUS_TOKEN", "") else ""))
        try:
            info = prom.api_data("/api/v1/status/buildinfo")
            self.ok(f"reachable · Prometheus {info.get('version', '?')}")
        except prom.PrometheusUnavailable as exc:
            self.bad(f"not reachable: {exc}")
            raise SystemExit(1)

        try:
            jobs = prom._query("count by (job) (up)")
            up = {m.get("job", "?"): v for m, v in prom._query("sum by (job) (up)")}
            if jobs:
                self.stdout.write("  Scrape jobs (targets up / total):")
                for m, total in sorted(jobs, key=lambda r: r[0].get("job", "")):
                    job = m.get("job", "?")
                    line = f"{job}: {int(up.get(job, 0))}/{int(total)}"
                    (self.ok if up.get(job, 0) == total else self.warn)(line)
            else:
                self.warn("no `up` series — Prometheus is reachable but scrapes nothing yet")

            self.stdout.write("  Exporter families:")
            for name, metric in FAMILY_METRICS.items():
                n = prom._query(f"count({metric})")
                count = int(n[0][1]) if n else 0
                (self.ok if count else self.warn)(f"{name}: {count} series of {metric}" if count else f"{name}: none ({metric})")

            label = getattr(settings, "PROMETHEUS_TENANT_LABEL", "")
            if label:
                vals = prom.api_data(f"/api/v1/label/{label}/values")
                (self.ok if vals else self.warn)(f"tenant label '{label}': {', '.join(vals) if vals else 'no values'}")

            self._devices(devices)
        except prom.PrometheusUnavailable as exc:
            self.bad(f"query failed: {exc}")
            raise SystemExit(1)

        self._loki()

    def _devices(self, verbose: bool):
        self.stdout.write(self.style.MIGRATE_HEADING("Devices"))
        with all_tenants():
            rows = list(InfraDevice.unscoped.exclude(lifecycle_state="decommissioned").order_by("id"))
        matched = unmatched = unsupported = 0
        for d in rows:
            family = prom.family_for_device(d)
            if family not in prom.KEY_METRIC:
                unsupported += 1
                if verbose:
                    self.stdout.write(f"    {d.id}: no metric family for type '{d.device_type}' / agent '{d.agent}'")
                continue
            try:
                sel, _ = prom.device_selector(d, family)
            except ValueError as exc:
                unmatched += 1
                if verbose:
                    self.warn(f"{d.id}: {exc}")
                continue
            found = prom._query(f"count({prom.KEY_METRIC[family]}{{{sel}}})")
            if found:
                matched += 1
                if verbose:
                    self.ok(f"{d.id} ({family}): {{{sel}}}")
            else:
                unmatched += 1
                if verbose:
                    self.warn(f"{d.id} ({family}): no series for {{{sel}}} — check IP / port, or set metrics_labels")
        total = len(rows)
        self.stdout.write(f"  {matched} of {total} devices have metrics · {unmatched} not found · {unsupported} without a metric family")
        if unmatched and not verbose:
            self.stdout.write("  Run with --devices to see which ones and the selector tried.")

    def _loki(self):
        self.stdout.write(self.style.MIGRATE_HEADING("Loki"))
        url = getattr(settings, "LOKI_URL", "")
        if not url:
            self.warn("LOKI_URL is not set — Event Logs tabs will say Loki is not connected.")
            return
        headers = {}
        if getattr(settings, "LOKI_TOKEN", ""):
            headers["Authorization"] = f"Bearer {settings.LOKI_TOKEN}"
        if getattr(settings, "LOKI_ORG_ID", ""):
            headers["X-Scope-OrgID"] = settings.LOKI_ORG_ID
        host_label = getattr(settings, "LOKI_HOST_LABEL", "host") or "host"
        try:
            labels = requests.get(f"{url.rstrip('/')}/loki/api/v1/labels", headers=headers,
                                  timeout=getattr(settings, "LOKI_TIMEOUT", 10)).json().get("data", [])
            self.ok(f"reachable · labels: {', '.join(labels[:20]) or 'none'}")
            if host_label not in labels:
                self.bad(f"LOKI_HOST_LABEL='{host_label}' is not a stream label here; set it to the one holding the hostname.")
                return
            hosts = requests.get(f"{url.rstrip('/')}/loki/api/v1/label/{host_label}/values", headers=headers,
                                 timeout=getattr(settings, "LOKI_TIMEOUT", 10)).json().get("data", [])
            with all_tenants():
                names = {(d.hostname or d.id) for d in InfraDevice.unscoped.all()}
            hit = sorted(names & set(hosts))
            (self.ok if hit else self.warn)(f"{len(hit)} of {len(names)} devices have log streams under '{host_label}'")
        except (requests.RequestException, ValueError) as exc:
            self.bad(f"not reachable: {exc}")
