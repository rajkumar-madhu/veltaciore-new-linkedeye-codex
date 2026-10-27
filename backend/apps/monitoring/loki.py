"""Device logs from the provisioned Loki (Windows Event Logs, syslog, journald).

A device's streams are selected by ``{<LOKI_HOST_LABEL>="<hostname or id>"}``
(plus the tenant label when LOKI_TENANT_LABEL is set). Promtail / Alloy ship
Windows Event Logs with the ``windows_events`` source; Linux hosts ship the
journal. Search text is passed as a LogQL line filter with the value escaped,
so it cannot change the query.
"""
from __future__ import annotations

import json
import re
from datetime import datetime, timezone

import requests
from django.conf import settings

from . import sample
from .prometheus import _LABEL_NAME, _escape, resolve_window

MAX_LINES = 500
LEVELS = ("critical", "error", "warning", "info", "debug")
_LEVEL_WORDS = {
    "crit": "critical", "critical": "critical", "fatal": "critical", "emerg": "critical", "alert": "critical",
    "err": "error", "error": "error",
    "warn": "warning", "warning": "warning",
    "info": "info", "information": "info", "notice": "info",
    "debug": "debug", "verbose": "debug", "trace": "debug",
}
_LEVEL_IN_TEXT = re.compile(r"\b(critical|fatal|error|err|warning|warn|info|information|notice|debug)\b", re.I)


class LokiUnavailable(RuntimeError):
    pass


def _level(labels: dict, line: str, parsed: dict | None) -> str:
    for key in ("level", "detected_level", "severity", "levelText", "levelText_"):
        val = labels.get(key) or (parsed or {}).get(key)
        if isinstance(val, str) and val.lower() in _LEVEL_WORDS:
            return _LEVEL_WORDS[val.lower()]
    m = _LEVEL_IN_TEXT.search(line[:200])
    return _LEVEL_WORDS[m.group(1).lower()] if m else "info"


def stream_selector(device) -> str:
    host_label = getattr(settings, "LOKI_HOST_LABEL", "host") or "host"
    if not _LABEL_NAME.match(host_label):
        raise ValueError(f"Invalid LOKI_HOST_LABEL {host_label!r}")
    parts = [f'{host_label}="{_escape(getattr(device, "hostname", "") or device.id)}"']
    tenant_label = getattr(settings, "LOKI_TENANT_LABEL", "")
    if tenant_label and device.tenant_id:
        if not _LABEL_NAME.match(tenant_label):
            raise ValueError(f"Invalid LOKI_TENANT_LABEL {tenant_label!r}")
        parts.append(f'{tenant_label}="{_escape(device.tenant_id)}"')
    return "{" + ",".join(parts) + "}"


def build_query(device, search: str = "") -> str:
    q = stream_selector(device)
    if search:
        q += f' |= "{_escape(search[:200])}"'
    return q


def device_logs(device, *, start=None, end=None, search="", level="", limit=200) -> dict:
    t_start, t_end, _ = resolve_window(start, end, None)
    level = level.lower() if level and level.lower() in LEVELS else ""
    limit = max(1, min(int(limit or 200), MAX_LINES))
    query = build_query(device, search)
    base = {"start": t_start.isoformat(), "end": t_end.isoformat(), "query": query}
    if sample.loki_sample_mode():
        return sample.logs(device, t_start, t_end, search, level, limit, query)
    url = getattr(settings, "LOKI_URL", "")
    if not url:
        return {**base, "source": "unavailable", "message": "LOKI_URL is not configured.", "entries": []}
    headers = {}
    if getattr(settings, "LOKI_TOKEN", ""):
        headers["Authorization"] = f"Bearer {settings.LOKI_TOKEN}"
    if getattr(settings, "LOKI_ORG_ID", ""):
        headers["X-Scope-OrgID"] = settings.LOKI_ORG_ID
    try:
        res = requests.get(
            f"{url.rstrip('/')}/loki/api/v1/query_range",
            params={"query": query, "start": int(t_start.timestamp() * 1e9), "end": int(t_end.timestamp() * 1e9),
                    "limit": limit, "direction": "backward"},
            headers=headers,
            timeout=getattr(settings, "LOKI_TIMEOUT", 10),
        )
        res.raise_for_status()
        body = res.json()
    except (requests.RequestException, ValueError) as exc:
        return {**base, "source": "unavailable", "message": f"Loki query failed: {exc}", "entries": []}
    if body.get("status") != "success":
        return {**base, "source": "unavailable", "message": body.get("error", "Loki returned an error."), "entries": []}

    entries = []
    for stream in body.get("data", {}).get("result", []):
        labels = stream.get("stream", {})
        for ns, line in stream.get("values", []):
            parsed = None
            if line.startswith("{"):
                try:
                    parsed = json.loads(line)
                except ValueError:
                    parsed = None
            lvl = _level(labels, line, parsed)
            if level and lvl != level:
                continue
            message = line
            if isinstance(parsed, dict):
                message = str(parsed.get("message") or parsed.get("msg") or parsed.get("MESSAGE") or line)
            entries.append({
                "ts": datetime.fromtimestamp(int(ns) / 1e9, tz=timezone.utc).isoformat(),
                "level": lvl,
                "source": labels.get("source") or labels.get("channel") or labels.get("unit") or labels.get("job", ""),
                "event_id": (parsed or {}).get("event_id") or (parsed or {}).get("eventID") or labels.get("event_id"),
                "message": message[:2000],
            })
    entries.sort(key=lambda e: e["ts"], reverse=True)
    return {**base, "source": "loki", "entries": entries[:limit]}
