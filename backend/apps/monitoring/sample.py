"""Sample monitoring data for demos and development.

When Prometheus (or Loki) is not configured and METRICS_SAMPLE_DATA is on —
the default in DEBUG, off in production — the monitoring endpoints answer
with generated series instead of "unavailable", so every chart, card and
table on the device / server / VM pages has something to show. Every such
response carries ``"sample": True`` and the UI labels it "Sample data".
Setting PROMETHEUS_URL / LOKI_URL switches it off for that source.

Values are deterministic: each device gets its own seed, and a point depends
only on (device, metric, timestamp), so a refresh continues the same line.
Where the device record has a value (cpu, mem), the series is centred on it.
"""
from __future__ import annotations

import hashlib
import math
from datetime import datetime, timedelta, timezone

from django.conf import settings


def prometheus_sample_mode() -> bool:
    return bool(getattr(settings, "METRICS_SAMPLE_DATA", False)) and not getattr(settings, "PROMETHEUS_URL", "")


def loki_sample_mode() -> bool:
    return bool(getattr(settings, "METRICS_SAMPLE_DATA", False)) and not getattr(settings, "LOKI_URL", "")


NOTE = "Sample data — Prometheus is not connected. Set PROMETHEUS_URL to see real metrics."
LOG_NOTE = "Sample data — Loki is not connected. Set LOKI_URL to see real logs."


def _seed(*parts: str) -> int:
    return int(hashlib.sha256("|".join(parts).encode()).hexdigest()[:12], 16)


def _unit(seed: int, k: int) -> float:
    """Deterministic value in [0, 1) for (seed, k)."""
    return ((seed * 2654435761 + k * 40503) % 1_000_003) / 1_000_003


def _wave(seed: int, t: float, base: float, amp: float, lo: float = 0.0, hi: float | None = None) -> float:
    p1 = _unit(seed, 1) * 2 * math.pi
    p2 = _unit(seed, 2) * 2 * math.pi
    slow = math.sin(2 * math.pi * t / 5400 + p1)          # ~90 min swell
    fast = math.sin(2 * math.pi * t / 600 + p2)           # ~10 min ripple
    jitter = _unit(seed, int(t // 15)) - 0.5              # per-scrape noise
    v = base + amp * (0.6 * slow + 0.25 * fast + 0.3 * jitter)
    v = max(lo, v)
    return round(min(hi, v) if hi is not None else v, 3)


# (base, amplitude, lower, upper) per metric key; None base → derived below.
PROFILE: dict[str, tuple[float, float, float, float | None]] = {
    "cpu": (28, 12, 0, 100), "cpu_user": (16, 7, 0, 100), "cpu_system": (6, 3, 0, 100),
    "cpu_iowait": (1.5, 1, 0, 100), "cpu_irq": (0.4, 0.2, 0, 100), "cpu_interrupt": (0.4, 0.2, 0, 100),
    "cpu_dpc": (0.5, 0.3, 0, 100),
    "mem": (55, 5, 0, 100), "load1": (2.5, 1.5, 0, None), "processes": (165, 8, 0, None),
    "disk": (58, 0.6, 0, 100), "disk_read": (32, 22, 0, None), "disk_write": (16, 11, 0, None),
    "net_rx": (140, 70, 0, None), "net_tx": (90, 45, 0, None),
    "if_in_errors": (0.15, 0.2, 0, None), "if_out_errors": (0.08, 0.1, 0, None),
    "vms_running": (12, 0, 0, None), "vms_total": (14, 0, 0, None), "power": (1, 0, 0, 1),
    "temperature": (24, 2, 0, None), "fan": (7800, 350, 0, None), "health": (1, 0, 1, 1),
}
SNMP_SCALE = {"net_rx": 6.0, "net_tx": 6.0}  # switch / firewall traffic is busier


def _series_points(seed: int, key: str, start: datetime, end: datetime, step: int, base_override=None, family=""):
    base, amp, lo, hi = PROFILE.get(key, (10, 3, 0, None))
    if family == "redfish" and key == "power":
        base, amp, lo, hi = 220, 25, 0, None          # watts, not a VM's on/off state
    if base_override is not None:
        base = float(base_override)
    if family == "snmp" and key in SNMP_SCALE:
        base, amp = base * SNMP_SCALE[key], amp * SNMP_SCALE[key]
    pts, t = [], start.timestamp() - start.timestamp() % step
    while t <= end.timestamp():
        pts.append([t, _wave(seed + _seed(key) % 997, t, base, amp, lo, hi)])
        t += step
    return pts


def timeseries(defs, family: str, ident: str, start, end, step, only, record=None) -> dict:
    """Sample series for every MetricDef in ``defs`` (same shape as the live response)."""
    seed = _seed(ident)
    rec_cpu = getattr(record, "cpu", None) or None
    rec_mem = getattr(record, "mem", None) or None
    total_gb = 16 * (1 + _seed(ident, "ram") % 4)        # 16 / 32 / 48 / 64 GB
    series: dict[str, dict] = {}
    for m in defs:
        if only and m.key not in only:
            continue
        override = None
        if m.key == "cpu" and rec_cpu:
            override = rec_cpu
        elif m.key == "mem" and rec_mem:
            override = rec_mem
        if m.key in {"mem_used_gb", "mem_cached_gb", "mem_available_gb", "mem_total_gb", "cpu_idle", "uptime"}:
            continue  # derived below
        series[m.key] = {"key": m.key, "label": m.label, "unit": m.unit, "group": m.group, "stack": m.stack,
                         "points": _series_points(seed, m.key, start, end, step, override, family)}
    by_key = {m.key: m for m in defs if not only or m.key in only}
    times = [p[0] for p in next(iter(series.values()))["points"]] if series else \
        [t for t in range(int(start.timestamp() - start.timestamp() % step), int(end.timestamp()) + 1, step)]

    def add(key, values):
        m = by_key.get(key)
        if m:
            series[key] = {"key": key, "label": m.label, "unit": m.unit, "group": m.group, "stack": m.stack,
                           "points": [[t, round(v, 3)] for t, v in zip(times, values)]}

    mem_pts = series.get("mem", {}).get("points") or _series_points(seed, "mem", start, end, step, rec_mem, family)
    mem_pct = [v for _, v in mem_pts]
    add("mem_total_gb", [total_gb] * len(times))
    add("mem_used_gb", [total_gb * p / 100 for p in mem_pct])
    add("mem_cached_gb", [total_gb * 0.18 for _ in mem_pct])
    add("mem_available_gb", [total_gb * (1 - p / 100) for p in mem_pct])
    busy_keys = [k for k in ("cpu_user", "cpu_system", "cpu_iowait", "cpu_irq", "cpu_interrupt", "cpu_dpc") if k in series]
    if busy_keys and "cpu" in series:
        # Scale the modes so they add up to the total, as they do in real data.
        for i, (_, total) in enumerate(series["cpu"]["points"]):
            raw = sum(series[k]["points"][i][1] for k in busy_keys) or 1.0
            for k in busy_keys:
                series[k]["points"][i][1] = round(series[k]["points"][i][1] * total / raw, 3)
    if busy_keys:
        add("cpu_idle", [max(0.0, 100 - sum(series[k]["points"][i][1] for k in busy_keys)) for i in range(len(times))])
    boot_days = 20 + _seed(ident, "boot") % 120
    now = datetime.now(timezone.utc).timestamp()
    add("uptime", [max(0.0, boot_days + (t - now) / 86400) for t in times])
    ordered = [series[m.key] for m in defs if m.key in series]
    return {"family": family, "start": start.isoformat(), "end": end.isoformat(), "step": step,
            "source": "prometheus", "sample": True, "message": NOTE, "series": ordered}


# ── Inventory ───────────────────────────────────────────────────────────────
WIN_PROCS = ["sqlservr", "w3wp", "MsMpEng", "svchost", "explorer", "lsass", "dwm", "System", "spoolsv", "WmiPrvSE"]
LINUX_PROCS = ["java", "postgres", "nginx", "dockerd", "containerd", "node_exporter", "sshd", "systemd-journal", "rsyslogd", "cron"]


def inventory(device, family: str, top: int) -> dict:
    seed = _seed(device.id, "inv")
    names = WIN_PROCS if family == "windows" else LINUX_PROCS
    procs = []
    for i, name in enumerate(names[:top]):
        procs.append({
            "name": name,
            "cpu": round(max(0.1, 9 / (i + 1) * (0.6 + _unit(seed, i))), 2),
            "mem_bytes": float(int((2.2e9 / (i + 1)) * (0.5 + _unit(seed, i + 50)))),
            "threads": float(int(10 + 120 / (i + 1) * _unit(seed, i + 90))),
        })
    if family == "windows":
        problems = [{"name": n, "state": "stopped", "start_mode": "auto"} for n in ["Spooler", "wuauserv"][: 1 + seed % 2]]
        fs = [("C:", 256e9, 0.46), ("D:", 2e12, 0.71)]
    else:
        problems = [{"name": "backup-sync.service", "state": "failed", "start_mode": ""}][: seed % 2]
        fs = [("/", 100e9, 0.52), ("/var", 200e9, 0.38), ("/data", 2e12, 0.67)]
    filesystems = [{"mount": m, "size_bytes": size, "used_bytes": size * u, "used_pct": round(u * 100, 1)} for m, size, u in fs]
    return {"family": family, "source": "prometheus", "sample": True, "message": NOTE, "processes": procs,
            "services": {"running": 120 + seed % 40, "stopped": len(problems), "other": 20 + seed % 15, "problems": problems},
            "filesystems": filesystems}


def hardware(bmcs, start, end, step, catalog) -> dict:
    controllers = []
    for b in bmcs:
        out = timeseries([m for m in catalog if m.key != "health"], "redfish", b.id, start, end, step, None)
        controllers.append({"id": b.id, "kind": b.device_type, "vendor": b.vendor, "model": b.model,
                            "ip": str(b.ip_address or ""), "firmware": b.os_version, "health": "ok",
                            "sensors": out["series"]})
    return {"start": start.isoformat(), "end": end.isoformat(), "step": step, "source": "prometheus",
            "sample": True, "message": NOTE, "controllers": controllers}


def vm_inventory(vm) -> dict:
    seed = _seed(vm.id, "vm")
    now = datetime.now(timezone.utc)
    return {
        "source": "prometheus", "sample": True, "message": NOTE, "found": True,
        "host": vm.host_id, "cluster": vm.cluster, "datacenter": "",
        "powered_on": vm.state == "running",
        "boot_time": (now - timedelta(days=5 + seed % 60, hours=seed % 24)).isoformat(),
        "tools": {"status": "toolsOk", "version": "12.4.5"},
        "snapshots": [{"name": n, "created": (now - timedelta(days=d)).isoformat()}
                      for n, d in (("pre-upgrade", 3), ("weekly-backup", 6))][: 1 + seed % 2],
        "disks": [{"partition": p, "capacity_bytes": c, "free_bytes": c * (1 - u), "used_pct": round(u * 100, 1)}
                  for p, c, u in (("/", 80e9, 0.58), ("/data", 200e9, 0.44))],
        "datastore": {"name": f"datastore{1 + seed % 3}", "capacity": 4e12, "free": 1.5e12, "provisioned": 3.1e12, "accessible": 1.0},
    }


def fleet_load(devices, families) -> dict:
    out = []
    now = datetime.now(timezone.utc).timestamp()
    for d in devices:
        if families(d) not in {"node", "windows"}:
            continue
        seed = _seed(d.id)
        out.append({"id": d.id,
                    "cpu": _wave(seed + _seed("cpu") % 997, now, d.cpu or 28, 12, 0, 100),
                    "mem": _wave(seed + _seed("mem") % 997, now, d.mem or 55, 5, 0, 100)})
    return {"source": "prometheus", "sample": True, "message": NOTE, "devices": out}


# ── Logs ────────────────────────────────────────────────────────────────────
WIN_EVENTS = [
    ("info", "Service Control Manager", 7036, "The Windows Update service entered the running state."),
    ("warning", "Microsoft-Windows-Time-Service", 129, "NtpClient was unable to set a domain peer as a time source."),
    ("info", "Microsoft-Windows-Kernel-General", 16, "The access history in hive was cleared."),
    ("error", "Application Error", 1000, "Faulting application name: w3wp.exe, exception code 0xc0000005."),
    ("info", "Microsoft-Windows-Winlogon", 7001, "User logon notification for Customer Experience Improvement Program."),
    ("warning", "disk", 153, "The IO operation at logical block address was retried."),
]
LINUX_EVENTS = [
    ("info", "systemd", None, "Started Daily apt download activities."),
    ("info", "sshd", None, "Accepted publickey for deploy from 10.10.0.5 port 51234 ssh2"),
    ("warning", "kernel", None, "TCP: request_sock_TCP: Possible SYN flooding on port 443. Sending cookies."),
    ("info", "CRON", None, "(root) CMD (/usr/local/bin/backup-sync)"),
    ("error", "backup-sync", None, "Upload failed: connection reset by peer"),
    ("info", "nginx", None, "worker process exited on signal 1"),
]


def logs(device, start, end, search: str, level: str, limit: int, query: str) -> dict:
    seed = _seed(device.id, "logs")
    is_win = "win" in (getattr(device, "device_type", "") or "") or "windows" in (getattr(device, "os", "") or "").lower()
    events = WIN_EVENTS if is_win else LINUX_EVENTS
    span = max(1.0, (end - start).total_seconds())
    entries = []
    for i in range(24):
        lvl, src, eid, msg = events[(seed + i) % len(events)]
        ts = end - timedelta(seconds=span * (i + _unit(seed, i)) / 24)
        if (level and lvl != level) or (search and search.lower() not in msg.lower()):
            continue
        entries.append({"ts": ts.isoformat(), "level": lvl, "source": src, "event_id": eid, "message": msg})
    return {"start": start.isoformat(), "end": end.isoformat(), "query": query, "source": "loki",
            "sample": True, "message": LOG_NOTE, "entries": entries[:limit]}
