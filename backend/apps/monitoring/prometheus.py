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
    stack: bool = False  # drawn stacked (parts of a whole, e.g. CPU modes)


# ── Catalog ─────────────────────────────────────────────────────────────────
NODE = [
    MetricDef("cpu", "CPU", "%", "cpu",
              '100 * (1 - avg(rate(node_cpu_seconds_total{{mode="idle",{sel}}}[{rate}])))'),
    MetricDef("cpu_user", "User", "%", "cpu",
              '100 * avg(rate(node_cpu_seconds_total{{mode="user",{sel}}}[{rate}]))', True),
    MetricDef("cpu_system", "System", "%", "cpu",
              '100 * avg(rate(node_cpu_seconds_total{{mode="system",{sel}}}[{rate}]))', True),
    MetricDef("cpu_iowait", "I/O wait", "%", "cpu",
              '100 * avg(rate(node_cpu_seconds_total{{mode="iowait",{sel}}}[{rate}]))', True),
    MetricDef("cpu_irq", "IRQ", "%", "cpu",
              '100 * sum(rate(node_cpu_seconds_total{{mode=~"irq|softirq",{sel}}}[{rate}]))'
              ' / count(node_cpu_seconds_total{{mode="idle",{sel}}})', True),
    MetricDef("cpu_idle", "Idle", "%", "cpu",
              '100 * avg(rate(node_cpu_seconds_total{{mode="idle",{sel}}}[{rate}]))', True),
    MetricDef("mem", "Memory used", "%", "memory",
              '100 * (1 - sum(node_memory_MemAvailable_bytes{{{sel}}}) / sum(node_memory_MemTotal_bytes{{{sel}}}))'),
    MetricDef("mem_used_gb", "Used", "GB", "memory_gb",
              '(sum(node_memory_MemTotal_bytes{{{sel}}}) - sum(node_memory_MemAvailable_bytes{{{sel}}})) / 1073741824'),
    MetricDef("mem_cached_gb", "Cached", "GB", "memory_gb",
              '(sum(node_memory_Cached_bytes{{{sel}}}) + sum(node_memory_Buffers_bytes{{{sel}}})) / 1073741824'),
    MetricDef("mem_available_gb", "Available", "GB", "memory_gb",
              'sum(node_memory_MemAvailable_bytes{{{sel}}}) / 1073741824'),
    MetricDef("mem_total_gb", "Total", "GB", "memory_gb", 'sum(node_memory_MemTotal_bytes{{{sel}}}) / 1073741824'),
    MetricDef("load1", "Load (1m)", "count", "load", 'avg(node_load1{{{sel}}})'),
    MetricDef("processes", "Processes", "count", "load", 'sum(node_processes_pids{{{sel}}})'),
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
              '100 * avg(rate(windows_cpu_time_total{{mode="user",{sel}}}[{rate}]))', True),
    MetricDef("cpu_system", "Privileged", "%", "cpu",
              '100 * avg(rate(windows_cpu_time_total{{mode="privileged",{sel}}}[{rate}]))', True),
    MetricDef("cpu_interrupt", "Interrupt", "%", "cpu",
              '100 * avg(rate(windows_cpu_time_total{{mode="interrupt",{sel}}}[{rate}]))', True),
    MetricDef("cpu_dpc", "DPC", "%", "cpu",
              '100 * avg(rate(windows_cpu_time_total{{mode="dpc",{sel}}}[{rate}]))', True),
    MetricDef("cpu_idle", "Idle", "%", "cpu",
              '100 * avg(rate(windows_cpu_time_total{{mode="idle",{sel}}}[{rate}]))', True),
    MetricDef("mem", "Memory used", "%", "memory",
              '100 * (1 - sum(windows_memory_available_bytes{{{sel}}}) / sum(windows_cs_physical_memory_bytes{{{sel}}}))'),
    MetricDef("mem_used_gb", "Used", "GB", "memory_gb",
              '(sum(windows_cs_physical_memory_bytes{{{sel}}}) - sum(windows_memory_available_bytes{{{sel}}})) / 1073741824'),
    MetricDef("mem_cached_gb", "Cached", "GB", "memory_gb", 'sum(windows_memory_cache_bytes{{{sel}}}) / 1073741824'),
    MetricDef("mem_available_gb", "Available", "GB", "memory_gb",
              'sum(windows_memory_available_bytes{{{sel}}}) / 1073741824'),
    MetricDef("mem_total_gb", "Total", "GB", "memory_gb", 'sum(windows_cs_physical_memory_bytes{{{sel}}}) / 1073741824'),
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
    MetricDef("disk", "Guest disk used", "%", "disk",
              '100 * (1 - sum(vmware_vm_guest_disk_free{{{sel}}}) / sum(vmware_vm_guest_disk_capacity{{{sel}}}))'),
    MetricDef("uptime", "Uptime", "days", "uptime", '(time() - max(vmware_vm_boot_timestamp_seconds{{{sel}}})) / 86400'),
]

CATALOG: dict[str, list[MetricDef]] = {
    "node": NODE, "windows": WINDOWS, "snmp": SNMP,
    "vmware-host": VMWARE_HOST, "vmware-vm": VMWARE_VM,
}

NETWORK_KINDS = {"switch", "router", "firewall", "loadbal", "ups", "generic"}
DEFAULT_PORTS = {"node": 9100, "windows": 9182}


# One series per exporter family, used to check that a device is scraped.
KEY_METRIC = {
    "node": "node_cpu_seconds_total",
    "windows": "windows_cpu_time_total",
    "snmp": "sysUpTime",
    "vmware-host": "vmware_host_cpu_usage",
}


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
def _api(path: str, params: dict) -> list[dict]:
    """GET a Prometheus HTTP API path; returns data.result or raises PrometheusUnavailable."""
    data = api_data(path, params)
    return data.get("result", []) if isinstance(data, dict) else []


def api_data(path: str, params: dict | None = None):
    """GET a Prometheus HTTP API path; returns the response's `data` or raises PrometheusUnavailable."""
    base = getattr(settings, "PROMETHEUS_URL", "")
    if not base:
        raise PrometheusUnavailable("PROMETHEUS_URL is not configured.")
    headers = {}
    token = getattr(settings, "PROMETHEUS_TOKEN", "")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    try:
        res = requests.get(
            f"{base.rstrip('/')}{path}",
            params=params,
            headers=headers,
            timeout=getattr(settings, "PROMETHEUS_TIMEOUT", 10),
        )
        res.raise_for_status()
        body = res.json()
    except (requests.RequestException, ValueError) as exc:
        raise PrometheusUnavailable(f"Prometheus query failed: {exc}") from exc
    if body.get("status") != "success":
        raise PrometheusUnavailable(body.get("error", "Prometheus returned an error."))
    return body.get("data", {})


def _num(val) -> float | None:
    try:
        v = float(val)
    except (TypeError, ValueError):
        return None
    return round(v, 3) if math.isfinite(v) else None


def _query_range(promql: str, start: datetime, end: datetime, step: int) -> list[list[float]]:
    result = _api("/api/v1/query_range",
                  {"query": promql, "start": start.timestamp(), "end": end.timestamp(), "step": step})
    if not result:
        return []
    points = []
    for ts, val in result[0].get("values", []):
        v = _num(val)
        if v is not None:
            points.append([float(ts), v])
    return points


def _query(promql: str) -> list[tuple[dict, float]]:
    """Instant query → [(labels, value)] for every returned series."""
    out = []
    for r in _api("/api/v1/query", {"query": promql}):
        v = _num((r.get("value") or [None, None])[1])
        if v is not None:
            out.append((r.get("metric", {}), v))
    return out


def run_catalog(defs: list[MetricDef], sel: str, vmsel: str, start, end, step, only: set[str] | None):
    rate = rate_window(step)
    series = []
    for m in defs:
        if only and m.key not in only:
            continue
        promql = m.promql.format(sel=sel, vmsel=vmsel or sel, rate=rate)
        series.append({
            "key": m.key, "label": m.label, "unit": m.unit, "group": m.group, "stack": m.stack,
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


# ── Inventory: processes, services, filesystems (instant queries) ──────────
# Windows: windows_exporter process/service/logical_disk collectors.
# Linux: process-exporter (namedprocess_*), node_exporter systemd + filesystem.
INVENTORY = {
    "windows": {
        "proc_label": "process",
        "proc_cpu": 'topk({n}, 100 * sum by (process) (rate(windows_process_cpu_time_total{{{sel}}}[5m]))'
                    ' / scalar(count(windows_cpu_time_total{{mode="idle",{sel}}})))',
        "proc_mem": 'sum by (process) (windows_process_working_set_private_bytes{{{sel}}})',
        "proc_threads": 'sum by (process) (windows_process_threads{{{sel}}})',
        "svc_state": 'windows_service_state{{{sel}}} == 1',
        "svc_mode": 'windows_service_start_mode{{{sel}}} == 1',
        "fs_label": "volume",
        "fs_size": 'max by (volume) (windows_logical_disk_size_bytes{{volume!~"HarddiskVolume.*",{sel}}})',
        "fs_free": 'max by (volume) (windows_logical_disk_free_bytes{{volume!~"HarddiskVolume.*",{sel}}})',
    },
    "node": {
        "proc_label": "groupname",
        "proc_cpu": 'topk({n}, 100 * sum by (groupname) (rate(namedprocess_namegroup_cpu_seconds_total{{{sel}}}[5m]))'
                    ' / scalar(count(node_cpu_seconds_total{{mode="idle",{sel}}})))',
        "proc_mem": 'sum by (groupname) (namedprocess_namegroup_memory_bytes{{memtype="resident",{sel}}})',
        "proc_threads": 'sum by (groupname) (namedprocess_namegroup_num_threads{{{sel}}})',
        "svc_state": 'node_systemd_unit_state{{type="service",{sel}}} == 1',
        "svc_mode": None,
        "fs_label": "mountpoint",
        "fs_size": 'max by (mountpoint) (node_filesystem_size_bytes{{fstype!~"tmpfs|overlay|squashfs",{sel}}})',
        "fs_free": 'max by (mountpoint) (node_filesystem_avail_bytes{{fstype!~"tmpfs|overlay|squashfs",{sel}}})',
    },
}
RUNNING_STATES = {"running", "active"}
MAX_PROCESSES = 50


def _services(q: dict, sel: str) -> dict:
    modes = {}
    if q["svc_mode"]:
        modes = {m.get("name", ""): m.get("start_mode", "") for m, _ in _query(q["svc_mode"].format(sel=sel))}
    running = stopped = other = 0
    problems = []
    for m, _ in _query(q["svc_state"].format(sel=sel)):
        name, state = m.get("name", ""), m.get("state", "")
        mode = modes.get(name, "")
        if state in RUNNING_STATES:
            running += 1
        elif state == "failed" or (state == "stopped" and mode == "auto"):
            # A failed unit, or a Windows service set to start automatically that is not running.
            stopped += 1
            problems.append({"name": name, "state": state, "start_mode": mode})
        else:
            other += 1
    problems.sort(key=lambda p: p["name"].lower())
    return {"running": running, "stopped": stopped, "other": other, "problems": problems[:100]}


def device_inventory(device, *, top: int = 10) -> dict:
    family = family_for_device(device)
    if family not in INVENTORY:
        return {"family": family, "source": "unsupported",
                "message": "Processes, services and filesystems are collected for Linux and Windows servers.",
                "processes": [], "services": None, "filesystems": []}
    q = INVENTORY[family]
    sel, _ = device_selector(device, family)
    n = max(1, min(int(top), MAX_PROCESSES))
    try:
        label = q["proc_label"]
        cpu = _query(q["proc_cpu"].format(sel=sel, n=n))
        mem = {m.get(label): v for m, v in _query(q["proc_mem"].format(sel=sel))}
        threads = {m.get(label): v for m, v in _query(q["proc_threads"].format(sel=sel))}
        processes = sorted(
            ({"name": m.get(label, "?"), "cpu": v, "mem_bytes": mem.get(m.get(label)),
              "threads": threads.get(m.get(label))} for m, v in cpu),
            key=lambda p: -p["cpu"],
        )
        services = _services(q, sel)
        fl = q["fs_label"]
        free = {m.get(fl): v for m, v in _query(q["fs_free"].format(sel=sel))}
        filesystems = []
        for m, size in _query(q["fs_size"].format(sel=sel)):
            mount = m.get(fl, "?")
            if size <= 0:
                continue
            avail = free.get(mount)
            used = None if avail is None else max(0.0, size - avail)
            filesystems.append({"mount": mount, "size_bytes": size, "used_bytes": used,
                                "used_pct": None if used is None else round(100 * used / size, 1)})
        filesystems.sort(key=lambda f: f["mount"])
    except PrometheusUnavailable as exc:
        return {"family": family, "source": "unavailable", "message": str(exc),
                "processes": [], "services": None, "filesystems": []}
    return {"family": family, "source": "prometheus", "processes": processes,
            "services": services, "filesystems": filesystems}


# ── Hardware: iDRAC / iLO through the Redfish exporter ──────────────────────
# A BMC is its own InfraDevice (type idrac / ilo) with managed_by → the server.
# Metric names follow jenningsloy318/redfish_exporter; the BMC is matched by
# instance=<BMC IP> unless its metrics_labels say otherwise.
REDFISH = [
    MetricDef("health", "System health", "count", "health", 'max(redfish_system_health_state{{{sel}}})'),
    MetricDef("temperature", "Temperature", "°C", "temperature",
              'max(redfish_chassis_temperature_celsius{{sensor=~"(?i).*inlet.*",{sel}}})'
              ' or max(redfish_chassis_temperature_celsius{{{sel}}})'),
    MetricDef("fan", "Fan speed", "RPM", "fan", 'avg(redfish_chassis_fan_rpm{{{sel}}})'),
    MetricDef("power", "Power", "W", "power", 'sum(redfish_chassis_power_average_consumed_watts{{{sel}}})'),
]
HEALTH = {1: "ok", 2: "warn", 3: "crit"}


def bmc_selector(bmc) -> str:
    tenant = _tenant_labels(bmc.tenant_id)
    if bmc.metrics_labels:
        return _matchers({**tenant, **{k: str(v) for k, v in bmc.metrics_labels.items()}})
    if not bmc.ip_address:
        raise ValueError(f"BMC {bmc.id} has no IP address.")
    return _matchers({**tenant, "instance": str(bmc.ip_address)})


def device_hardware(device, *, start=None, end=None, step=None) -> dict:
    t_start, t_end, t_step = resolve_window(start, end, step)
    bmcs = list(device.bmcs.all().order_by("id"))
    base = {"start": t_start.isoformat(), "end": t_end.isoformat(), "step": t_step}
    if not bmcs:
        return {**base, "source": "none", "controllers": [],
                "message": "No iDRAC / iLO is linked to this device."}
    controllers = []
    try:
        for b in bmcs:
            series = {s["key"]: s for s in run_catalog(REDFISH, bmc_selector(b), "", t_start, t_end, t_step, None)}
            health_pts = series["health"]["points"]
            controllers.append({
                "id": b.id,
                "kind": b.device_type,
                "vendor": b.vendor,
                "model": b.model,
                "ip": str(b.ip_address or ""),
                "firmware": b.os_version,
                "health": HEALTH.get(int(health_pts[-1][1]), "unknown") if health_pts else "unknown",
                "sensors": [series[k] for k in ("temperature", "fan", "power")],
            })
    except PrometheusUnavailable as exc:
        return {**base, "source": "unavailable", "message": str(exc),
                "controllers": [{"id": b.id, "kind": b.device_type, "vendor": b.vendor, "model": b.model,
                                 "ip": str(b.ip_address or ""), "firmware": b.os_version,
                                 "health": "unknown", "sensors": []} for b in bmcs]}
    return {**base, "source": "prometheus", "controllers": controllers}


# ── VM inventory: VMware Tools, snapshots, guest disks, datastore ──────────
# pryorda/vmware_exporter: VM series carry vm_name, host_name, ds_name,
# cluster_name and dc_name labels; datastore series are keyed by ds_name.
def vm_inventory(vm) -> dict:
    sel = vm_selector(vm)
    tenant = _tenant_labels(vm.tenant_id)
    try:
        power = _query(f"vmware_vm_power_state{{{sel}}}")
        labels = power[0][0] if power else {}
        tools_status = _query(f"vmware_vm_guest_tools_running_status{{{sel}}}")
        tools_version = _query(f"vmware_vm_guest_tools_version{{{sel}}}")
        boot = _query(f"max(vmware_vm_boot_timestamp_seconds{{{sel}}})")
        snaps = _query(f"vmware_vm_snapshot_timestamp_seconds{{{sel}}}")
        cap = {m.get("partition"): v for m, v in _query(f"vmware_vm_guest_disk_capacity{{{sel}}}")}
        free = {m.get("partition"): v for m, v in _query(f"vmware_vm_guest_disk_free{{{sel}}}")}
        datastore = None
        ds = labels.get("ds_name")
        if ds:
            ds_sel = _matchers({**tenant, "ds_name": ds})
            ds_vals = {}
            for key, metric in (("capacity", "vmware_datastore_capacity_size"), ("free", "vmware_datastore_freespace_size"),
                                ("provisioned", "vmware_datastore_provisoned_size"), ("accessible", "vmware_datastore_accessible")):
                rows = _query(f"max({metric}{{{ds_sel}}})")
                ds_vals[key] = rows[0][1] if rows else None
            datastore = {"name": ds, **ds_vals}
    except PrometheusUnavailable as exc:
        return {"source": "unavailable", "message": str(exc)}
    if not power:
        return {"source": "prometheus", "found": False,
                "message": f"No vmware_vm_* series for vm_name={vm.id} — check the VMware exporter and the VM name."}
    disks = []
    for part, size in sorted(cap.items(), key=lambda kv: str(kv[0])):
        if not size:
            continue
        f = free.get(part)
        disks.append({"partition": part or "?", "capacity_bytes": size, "free_bytes": f,
                      "used_pct": None if f is None else round(100 * (1 - f / size), 1)})
    return {
        "source": "prometheus",
        "found": True,
        "host": labels.get("host_name", ""),
        "cluster": labels.get("cluster_name", ""),
        "datacenter": labels.get("dc_name", ""),
        "powered_on": bool(power[0][1] == 1),
        "boot_time": datetime.fromtimestamp(boot[0][1], tz=timezone.utc).isoformat() if boot else None,
        "tools": {
            "status": tools_status[0][0].get("tools_status", "") if tools_status else "",
            "version": tools_version[0][0].get("tools_version", "") if tools_version else "",
        },
        "snapshots": sorted(
            ({"name": m.get("vm_snapshot_name", "?"),
              "created": datetime.fromtimestamp(v, tz=timezone.utc).isoformat()} for m, v in snaps),
            key=lambda x: x["created"], reverse=True,
        ),
        "disks": disks,
        "datastore": datastore,
    }


# ── Fleet load: current CPU / memory for many devices in two queries per family
FLEET = {
    "node": (
        '100 * (1 - avg by (instance) (rate(node_cpu_seconds_total{{mode="idle"{t}}}[5m])))',
        '100 * (1 - sum by (instance) (node_memory_MemAvailable_bytes{{{t0}}}) / sum by (instance) (node_memory_MemTotal_bytes{{{t0}}}))',
    ),
    "windows": (
        '100 - 100 * avg by (instance) (rate(windows_cpu_time_total{{mode="idle"{t}}}[5m]))',
        '100 * (1 - sum by (instance) (windows_memory_available_bytes{{{t0}}}) / sum by (instance) (windows_cs_physical_memory_bytes{{{t0}}}))',
    ),
}


def _host(instance: str) -> str:
    """'10.1.2.3:9100' → '10.1.2.3' (also handles [v6]:port)."""
    if instance.startswith("["):
        return instance[1:].split("]")[0]
    return instance.rsplit(":", 1)[0] if instance.count(":") == 1 else instance


def fleet_load(devices) -> dict:
    """Current CPU / memory % for node / windows devices, matched by IP.

    Devices with custom metrics_labels are matched by their `instance` label
    when it is set; others by IP. Families without a fleet query (SNMP,
    VMware) are left out — the caller keeps their inventory values.
    """
    if not getattr(settings, "PROMETHEUS_URL", ""):
        return {"source": "unavailable", "message": "PROMETHEUS_URL is not configured.", "devices": []}
    by_family: dict[str, dict[str, list]] = {}
    for d in devices:
        family = family_for_device(d)
        if family not in FLEET:
            continue
        key = str((d.metrics_labels or {}).get("instance") or d.ip_address or "")
        if key:
            by_family.setdefault(family, {}).setdefault(_host(key), []).append(d)
    out = []
    try:
        for family, index in by_family.items():
            cpu_q, mem_q = FLEET[family]
            label = getattr(settings, "PROMETHEUS_TENANT_LABEL", "")
            tenants = {d.tenant_id for ds in index.values() for d in ds if d.tenant_id}
            # Restrict to the caller's clients when series carry a tenant label.
            tsel = f'{label}=~"{"|".join(re.escape(t) for t in sorted(tenants))}"' if label and tenants else ""
            fmt_args = {"t": f",{tsel}" if tsel else "", "t0": tsel}
            cpu = {_host(m.get("instance", "")): v for m, v in _query(cpu_q.format(**fmt_args))}
            mem = {_host(m.get("instance", "")): v for m, v in _query(mem_q.format(**fmt_args))}
            for host, ds in index.items():
                if host in cpu or host in mem:
                    for d in ds:
                        out.append({"id": d.id, "cpu": cpu.get(host), "mem": mem.get(host)})
    except PrometheusUnavailable as exc:
        return {"source": "unavailable", "message": str(exc), "devices": []}
    return {"source": "prometheus", "devices": out}
