"""Real device metrics from the provisioned Prometheus (no local TSDB).

The monitoring module manages exporter registration; the metrics themselves
live in Prometheus. ``device_timeseries()`` maps a device to the exporter
family it reports through, builds PromQL from the catalog below, and runs
``/api/v1/query_range`` for the requested window.

Configuration (environment, via settings):
  PROMETHEUS_URL           e.g. https://fs-le-dev-prometheus.finspot.in
  PROMETHEUS_TOKEN         optional bearer token (from the secrets store / env)
  PROMETHEUS_TENANT_LABEL  optional label added to every selector, e.g.
                           "tenant" → {tenant="<device tenant id>"}
  PROMETHEUS_TIMEOUT       seconds (default 10)

Device → series selection: ``InfraDevice.metrics_labels`` (JSON label map)
wins when set; otherwise it is derived from the device (instance=IP:port for
node/windows exporters, instance=IP for SNMP, host_name / vm_name for the
VMware exporter). Label values are escaped, label names validated, so device
data cannot inject PromQL.

Metric names follow the upstream exporters (node_exporter, windows_exporter,
snmp_exporter if_mib, pryorda/vmware_exporter). Adjust CATALOG if a site
uses different exporters or recording rules.
"""
from __future__ import annotations

import math
import re
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import requests
from django.conf import settings


class PrometheusUnavailable(RuntimeError):
    """Prometheus is not configured or did not answer."""


@dataclass(frozen=True)
class MetricDef:
    key: str
    label: str
    unit: str  # "%", "Mbps", "MB/s", "count", "°C", "W"
    group: str  # chart grouping on the frontend: cpu, memory, disk, network, …
    promql: str  # uses {sel} for the label selector and {rate} for the range window


# ── Catalog ─────────────────────────────────────────────────────────────────
NODE = [
    MetricDef("cpu", "CPU", "%", "cpu",
              '100 * (1 - avg(rate(node_cpu_seconds_total{{mode="idle",{sel}}}[{rate}])))'),
    MetricDef("cpu_user", "User", "%", "cpu",
              '100 * avg(rate(node_cpu_seconds_total{{mode="user",{sel}}}[{rate}]))'),
    MetricDef("cpu_system", "System", "%", "cpu",
              '100 * avg(rate(node_cpu_seconds_total{{mode="system",{sel}}}[{rate}]))'),
    MetricDef("cpu_iowait", "I/O wait", "%", "cpu",
              '100 * avg(rate(node_cpu_seconds_total{{mode="iowait",{sel}}}[{rate}]))'),
    MetricDef("mem", "Memory used", "%", "memory",
              '100 * (1 - sum(node_memory_MemAvailable_bytes{{{sel}}}) / sum(node_memory_MemTotal_bytes{{{sel}}}))'),
    MetricDef("load1", "Load (1m)", "count", "load", 'avg(node_load1{{{sel}}})'),
    MetricDef("disk", "Disk used (fullest FS)", "%", "disk",
              '100 * max(1 - node_filesystem_avail_bytes{{fstype!~"tmpfs|overlay|squashfs",{sel}}}'
              ' / node_filesystem_size_bytes{{fstype!~"tmpfs|overlay|squashfs",{sel}}})'),
    MetricDef("disk_read", "Disk read", "MB/s", "disk_io",
              'sum(rate(node_disk_read_bytes_total{{{sel}}}[{rate}])) / 1e6'),
    MetricDef("disk_write", "Disk write", "MB/s", "disk_io",
              'sum(rate(node_disk_written_bytes_total{{{sel}}}[{rate}])) / 1e6'),
    MetricDef("net_rx", "Inbound", "Mbps", "network",
              'sum(rate(node_network_receive_bytes_total{{device!~"lo|veth.*|docker.*",{sel}}}[{rate}])) * 8 / 1e6'),
    MetricDef("net_tx", "Outbound", "Mbps", "network",
              'sum(rate(node_network_transmit_bytes_total{{device!~"lo|veth.*|docker.*",{sel}}}[{rate}])) * 8 / 1e6'),
]

WINDOWS = [
    MetricDef("cpu", "CPU", "%", "cpu",
              '100 - 100 * avg(rate(windows_cpu_time_total{{mode="idle",{sel}}}[{rate}]))'),
    MetricDef("cpu_user", "User", "%", "cpu",
              '100 * avg(rate(windows_cpu_time_total{{mode="user",{sel}}}[{rate}]))'),
    MetricDef("cpu_system", "Privileged", "%", "cpu",
              '100 * avg(rate(windows_cpu_time_total{{mode="privileged",{sel}}}[{rate}]))'),
    MetricDef("mem", "Memory used", "%", "memory",
              '100 * (1 - sum(windows_memory_available_bytes{{{sel}}}) / sum(windows_cs_physical_memory_bytes{{{sel}}}))'),
    MetricDef("disk", "Disk C: used", "%", "disk",
              '100 * (1 - sum(windows_logical_disk_free_bytes{{volume="C:",{sel}}})'
              ' / sum(windows_logical_disk_size_bytes{{volume="C:",{sel}}}))'),
    MetricDef("disk_read", "Disk read", "MB/s", "disk_io",
              'sum(rate(windows_logical_disk_read_bytes_total{{{sel}}}[{rate}])) / 1e6'),
    MetricDef("disk_write", "Disk write", "MB/s", "disk_io",
              'sum(rate(windows_logical_disk_write_bytes_total{{{sel}}}[{rate}])) / 1e6'),
    MetricDef("net_rx", "Inbound", "Mbps", "network",
              'sum(rate(windows_net_bytes_received_total{{{sel}}}[{rate}])) * 8 / 1e6'),
    MetricDef("net_tx", "Outbound", "Mbps", "network",
              'sum(rate(windows_net_bytes_sent_total{{{sel}}}[{rate}])) * 8 / 1e6'),
    MetricDef("processes", "Processes", "count", "load", 'sum(windows_os_processes{{{sel}}})'),
]

SNMP = [
    MetricDef("cpu", "CPU", "%", "cpu",
              'avg(cpmCPUTotal5minRev{{{sel}}}) or avg(hrProcessorLoad{{{sel}}})'),
    MetricDef("net_rx", "Inbound", "Mbps", "network",
              'sum(rate(ifHCInOctets{{{sel}}}[{rate}])) * 8 / 1e6'),
    MetricDef("net_tx", "Outbound", "Mbps", "network",
              'sum(rate(ifHCOutOctets{{{sel}}}[{rate}])) * 8 / 1e6'),
    MetricDef("if_in_errors", "Input errors", "count", "errors",
              'sum(rate(ifInErrors{{{sel}}}[{rate}]))'),
    MetricDef("if_out_errors", "Output errors", "count", "errors",
              'sum(rate(ifOutErrors{{{sel}}}[{rate}]))'),
    MetricDef("ports_up", "Ports up", "count", "ports",
              'count(ifOperStatus{{{sel}}} == 1)'),
    MetricDef("uptime", "Uptime", "days", "uptime", 'max(sysUpTime{{{sel}}}) / 100 / 86400'),
]

VMWARE_HOST = [
    MetricDef("cpu", "CPU", "%", "cpu",
              '100 * sum(vmware_host_cpu_usage{{{sel}}}) / sum(vmware_host_cpu_max{{{sel}}})'),
    MetricDef("mem", "Memory used", "%", "memory",
              '100 * sum(vmware_host_memory_usage{{{sel}}}) / sum(vmware_host_memory_max{{{sel}}})'),
    MetricDef("vms_running", "VMs powered on", "count", "virtualization",
              'count(vmware_vm_power_state{{{vmsel}}} == 1)'),
    MetricDef("vms_total", "VMs", "count", "virtualization",
              'count(vmware_vm_power_state{{{vmsel}}})'),
    MetricDef("net_rx", "Inbound", "Mbps", "network",
              'sum(vmware_vm_net_received_average{{{vmsel}}}) * 8 / 1000'),
    MetricDef("net_tx", "Outbound", "Mbps", "network",
              'sum(vmware_vm_net_transmitted_average{{{vmsel}}}) * 8 / 1000'),
]

VMWARE_VM = [
    MetricDef("cpu", "CPU", "%", "cpu", 'avg(vmware_vm_cpu_usage_average{{{sel}}}) / 100'),
    MetricDef("mem", "Memory used", "%", "memory", 'avg(vmware_vm_mem_usage_average{{{sel}}}) / 100'),
    MetricDef("disk_read", "Disk read", "MB/s", "disk_io",
              'sum(vmware_vm_disk_read_average{{{sel}}}) / 1000'),
    MetricDef("disk_write", "Disk write", "MB/s", "disk_io",
              'sum(vmware_vm_disk_write_average{{{sel}}}) / 1000'),
    MetricDef("net_rx", "Inbound", "Mbps", "network",
              'sum(vmware_vm_net_received_average{{{sel}}}) * 8 / 1000'),
    MetricDef("net_tx", "Outbound", "Mbps", "network",
              'sum(vmware_vm_net_transmitted_average{{{sel}}}) * 8 / 1000'),
    MetricDef("power", "Powered on", "count", "state", 'max(vmware_vm_power_state{{{sel}}})'),
]

CATALOG: dict[str, list[MetricDef]] = {
    "node": NODE, "windows": WINDOWS, "snmp": SNMP,
    "vmware-host": VMWARE_HOST, "vmware-vm": VMWARE_VM,
}

NETWORK_KINDS = {"switch", "router", "firewall", "loadbal", "ups", "generic"}
DEFAULT_PORTS = {"node": 9100, "windows": 9182}


def family_for_device(device) -> str | None:
    agent = (device.agent or device.exporter_type or "").lower()
    kind = device.device_type
    if "win-exporter" in agent or "windows" in agent or kind == "win-srv":
        return "windows"
    if "vmware" in agent or kind == "hypervisor":
        return "vmware-host"
    if "node-exporter" in agent or kind in {"linux-srv", "phys-srv", "k8s-node"}:
        return "node"
    if "snmp" in agent or kind in NETWORK_KINDS:
        return "snmp"
    return None


# ── Selectors ───────────────────────────────────────────────────────────────
_LABEL_NAME = re.compile(r"^[a-zA-Z_][a-zA-Z0-9_]*$")


def _escape(value: str) -> str:
    return str(value).replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")


def _matchers(labels: dict[str, str], regex_labels: set[str] = frozenset()) -> str:
    parts = []
    for name, value in labels.items():
        if not _LABEL_NAME.match(name):
            raise ValueError(f"Invalid Prometheus label name: {name!r}")
        op = "=~" if name in regex_labels else "="
        parts.append(f'{name}{op}"{_escape(value) if name not in regex_labels else value}"')
    return ",".join(parts)


def _tenant_labels(tenant_id: str | None) -> dict[str, str]:
    label = getattr(settings, "PROMETHEUS_TENANT_LABEL", "")
    return {label: tenant_id} if label and tenant_id else {}


def device_selector(device, family: str) -> tuple[str, str]:
    """(selector, vm_selector) for a device; vm_selector is used by host-level VM queries."""
    tenant = _tenant_labels(device.tenant_id)
    custom = dict(device.metrics_labels or {})
    if custom:
        sel = _matchers({**tenant, **{k: str(v) for k, v in custom.items()}})
        return sel, sel
    ip = str(device.ip_address or "")
    if family in DEFAULT_PORTS:
        if not ip:
            raise ValueError("Device has no IP address to match its exporter instance.")
        # instance="10.1.2.3:9100" — any port, IP matched literally.
        return _matchers({**tenant}) + ("," if tenant else "") + f'instance=~"{re.escape(ip)}(:[0-9]+)?"', ""
    if family == "snmp":
        if not ip:
            raise ValueError("Device has no IP address to match its SNMP target.")
        return _matchers({**tenant, "instance": ip}), ""
    if family == "vmware-host":
        host = device.hostname or device.id
        return _matchers({**tenant, "host_name": host}), _matchers({**tenant, "host_name": host})
    raise ValueError(f"No selector for family {family}")


def vm_selector(vm) -> str:
    return _matchers({**_tenant_labels(vm.tenant_id), "vm_name": vm.id})


# ── Range handling ──────────────────────────────────────────────────────────
MAX_RANGE = timedelta(days=90)
MAX_POINTS = 600
MIN_STEP = 15  # seconds; the usual scrape interval


def parse_time(value: str | None, default: datetime) -> datetime:
    if not value:
        return default
    try:
        if re.fullmatch(r"\d+(\.\d+)?", value):
            return datetime.fromtimestamp(float(value), tz=timezone.utc)
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except (ValueError, OverflowError, OSError):
        raise ValueError(f"Invalid time {value!r}; use ISO 8601 or unix seconds.")


def resolve_window(start: str | None, end: str | None, step: str | None) -> tuple[datetime, datetime, int]:
    now = datetime.now(timezone.utc)
    t_end = parse_time(end, now)
    t_start = parse_time(start, t_end - timedelta(hours=1))
    if t_start >= t_end:
        raise ValueError("start must be before end.")
    if t_end - t_start > MAX_RANGE:
        raise ValueError("Range is limited to 90 days.")
    span = (t_end - t_start).total_seconds()
    auto = max(MIN_STEP, math.ceil(span / MAX_POINTS))
    if step:
        try:
            requested = int(float(step))
        except ValueError:
            raise ValueError("step must be a number of seconds.")
        auto = max(auto, requested, MIN_STEP)  # never more than MAX_POINTS points
    return t_start, t_end, auto


def rate_window(step: int) -> str:
    # At least 4 scrapes so rate() has samples, and never narrower than a step.
    return f"{max(step * 2, 60)}s"


# ── Query ───────────────────────────────────────────────────────────────────
def _query_range(promql: str, start: datetime, end: datetime, step: int) -> list[list[float]]:
    base = getattr(settings, "PROMETHEUS_URL", "")
    if not base:
        raise PrometheusUnavailable("PROMETHEUS_URL is not configured.")
    headers = {}
    token = getattr(settings, "PROMETHEUS_TOKEN", "")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    try:
        res = requests.get(
            f"{base.rstrip('/')}/api/v1/query_range",
            params={"query": promql, "start": start.timestamp(), "end": end.timestamp(), "step": step},
            headers=headers,
            timeout=getattr(settings, "PROMETHEUS_TIMEOUT", 10),
        )
        res.raise_for_status()
        body = res.json()
    except (requests.RequestException, ValueError) as exc:
        raise PrometheusUnavailable(f"Prometheus query failed: {exc}") from exc
    if body.get("status") != "success":
        raise PrometheusUnavailable(body.get("error", "Prometheus returned an error."))
    result = body.get("data", {}).get("result", [])
    if not result:
        return []
    points = []
    for ts, val in result[0].get("values", []):
        try:
            v = float(val)
        except (TypeError, ValueError):
            continue
        if math.isfinite(v):
            points.append([float(ts), round(v, 3)])
    return points


def run_catalog(defs: list[MetricDef], sel: str, vmsel: str, start, end, step, only: set[str] | None):
    rate = rate_window(step)
    series = []
    for m in defs:
        if only and m.key not in only:
            continue
        promql = m.promql.format(sel=sel, vmsel=vmsel or sel, rate=rate)
        series.append({
            "key": m.key, "label": m.label, "unit": m.unit, "group": m.group,
            "points": _query_range(promql, start, end, step),
        })
    return series


def timeseries_response(defs, sel, vmsel, family, start, end, step, only):
    base = {
        "family": family,
        "start": start.isoformat(),
        "end": end.isoformat(),
        "step": step,
    }
    try:
        series = run_catalog(defs, sel, vmsel, start, end, step, only)
    except PrometheusUnavailable as exc:
        return {**base, "source": "unavailable", "message": str(exc), "series": []}
    return {**base, "source": "prometheus", "series": series}


def device_timeseries(device, *, start=None, end=None, step=None, metrics=None) -> dict:
    t_start, t_end, t_step = resolve_window(start, end, step)
    family = family_for_device(device)
    if family is None:
        return {"family": None, "source": "unsupported", "series": [], "step": t_step,
                "start": t_start.isoformat(), "end": t_end.isoformat(),
                "message": f"No metric catalog for device type '{device.device_type}' / agent '{device.agent}'."}
    sel, vmsel = device_selector(device, family)
    return timeseries_response(CATALOG[family], sel, vmsel, family, t_start, t_end, t_step, metrics)


def vm_timeseries(vm, *, start=None, end=None, step=None, metrics=None) -> dict:
    t_start, t_end, t_step = resolve_window(start, end, step)
    sel = vm_selector(vm)
    return timeseries_response(VMWARE_VM, sel, sel, "vmware-vm", t_start, t_end, t_step, metrics)
