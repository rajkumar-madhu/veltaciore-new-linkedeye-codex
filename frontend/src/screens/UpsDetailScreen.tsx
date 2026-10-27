// UPS node page in the Netdata Cloud layout, same skeleton as
// ServerDetailScreen: header with model / IP / site / uptime and tags; KPI
// cards; tabbed SNMP charts; recent alerts; relationships and configuration.
//
// Live numbers come from Prometheus via the metrics API (SNMP family). Load is
// read from the device record's role ("Row A · 142 kW load · 87% load").
// Battery, runtime and outlet groups need the UPS-MIB metrics, which are not
// collected yet, so those panels are labelled as sample data.
import "@/styles/devices.css";
import React from "react";
import { useNav } from "@/hooks/useNav";
import { useUiStore } from "@/store/ui";
import { useTimeRange } from "@/store/timeRange";
import { useDevice, useDeviceMetrics, useInfraAlerts } from "@/api/hooks";
import { DEVICES } from "@/data/infra";
import type { Device } from "@/lib/types";
import { Empty, Panel, Pill } from "@/components/ld";
import type { Tone } from "@/components/ld";
import { LiveButton, MetricsBody, RangeSelect, SampleNotice } from "@/components/MetricCharts";
import { Kpi, lastOf, seriesOf } from "@/components/KpiCard";
import { DeviceFamily } from "@/components/DeviceFamily";

const STATUS: Record<string, { label: string; tone: Tone }> = {
  ok: { label: "Online", tone: "ok" },
  warn: { label: "Warning", tone: "warn" },
  critical: { label: "Critical", tone: "crit" },
  down: { label: "Offline", tone: "crit" },
  unknown: { label: "Unknown", tone: "muted" },
};
const sevTone = (s: string): Tone => (s === "critical" ? "crit" : s === "warning" || s === "warn" ? "warn" : "info");
const sevLabel = (s: string) => (s === "critical" ? "Critical" : s === "warning" || s === "warn" ? "Warning" : "Info");

/** Rated capacity from the model ("APC Symmetra PX 160kW" → 160) and load from the role. */
function loadOf(d: Device) {
  const pct = /(\d+(?:\.\d+)?)\s*%\s*load/i.exec(d.role || "");
  const kw = /(\d+(?:\.\d+)?)\s*kW\s*load/i.exec(d.role || "");
  const rated = /(\d+(?:\.\d+)?)\s*kW/i.exec(d.model || "");
  return { pct: pct ? +pct[1] : null, kw: kw ? +kw[1] : null, rated: rated ? +rated[1] : null };
}

// Illustrative only — UPS-MIB battery / outlet metrics are not collected yet.
const SAMPLE_BATTERY: string[][] = [
  ["Charge", "100%"], ["Runtime at current load", "11 min 42 s"], ["Last self-test", "Passed"], ["Battery temperature", "26 °C"], ["Replacement due", "Pack 4"],
];
const SAMPLE_OUTLETS: string[][] = [
  ["Group 1 — Network core", "24%", "On"], ["Group 2 — Compute A", "31%", "On"], ["Group 3 — Compute B", "22%", "On"], ["Group 4 — Storage", "9%", "On"],
];

export default function UpsDetailScreen() {
  const { setRoute } = useNav();
  const paramId = useUiStore((s) => s.params.deviceId as string | undefined);
  const seed = DEVICES.find((x) => x.id === paramId && x.kind === "ups")
    ?? DEVICES.find((x) => x.kind === "ups") ?? DEVICES[0];
  const { data: live } = useDevice(seed.id);
  const d: Device = live ?? seed;

  const { preset, from, to } = useTimeRange();
  const metrics = useDeviceMetrics(d.id, preset, from, to);
  const alerts = (useInfraAlerts().data ?? []).filter((a) => a.device === d.id);
  const [tab, setTab] = React.useState("Overview");
  React.useEffect(() => setTab("Overview"), [d.id]);

  const m = metrics.data;
  const connected = m?.source === "prometheus";
  const st = STATUS[d.status] ?? STATUS.unknown;
  const vendor = d.vendor || (d.model || "").split(" ")[0];
  const load = loadOf(d);
  const uptime = seriesOf(m, "uptime");
  const fromRecord = `device record · ${d.lastSeen || "—"}`;

  const tabs = ["Overview", "Performance", "Battery & Outlets", `Alerts (${alerts.length})`, "Relationships", "Configuration"];
  const is = (name: string) => tab === name || (name === "Alerts" && tab.startsWith("Alerts"));
  const goTab = (prefix: string) => setTab(tabs.find((t) => t.startsWith(prefix)) ?? "Overview");

  const tags: { icon: string; label: string }[] = [
    ...(d.role ? [{ icon: "fa-solid fa-tag", label: d.role.split("·")[0].trim() }] : []),
    { icon: "fa-solid fa-car-battery", label: "UPS" },
    ...(vendor ? [{ icon: "fa-solid fa-industry", label: vendor }] : []),
    { icon: "fa-solid fa-satellite-dish", label: (d.agent || "snmp").toUpperCase() },
  ];

  const charts = (groups: string[]) => <MetricsBody data={m} isLoading={metrics.isLoading} isError={metrics.isError} groups={groups} quietWhenOff compact />;

  const infoPanel = (
    <Panel title="Device Information">
      <dl className="ld-dl">
        <dt>Hostname</dt><dd>{d.hostname || d.id}</dd>
        <dt>IP address</dt><dd className="ld-mono">{d.ip || "—"}</dd>
        <dt>Model</dt><dd>{d.model || "—"}</dd>
        <dt>Vendor</dt><dd>{vendor || "—"}</dd>
        <dt>Serial number</dt><dd className="ld-mono">{d.serial_number || "—"}</dd>
        <dt>Firmware</dt><dd>{d.os || "—"}</dd>
        <dt>Site / location</dt><dd>{d.site}{d.location ? ` · ${d.location}` : ""}</dd>
        <dt>Role</dt><dd>{d.role || "—"}</dd>
        <dt>Last seen</dt><dd>{d.lastSeen || "—"}</dd>
      </dl>
    </Panel>
  );

  const loadPanel = (
    <Panel title="Output Load">
      {load.pct != null ? (
        <>
          <ul className="ld-bars">
            <li>
              <span className="ld-bar-label">Load</span>
              <span className="ld-bar-track"><span className="ld-bar-fill" style={{ width: `${Math.min(100, load.pct)}%`, background: load.pct > 90 ? "#e5383b" : load.pct > 80 ? "#f5a524" : "#16a34a" }} /></span>
              <span className="ld-bar-value">{Math.round(load.pct)}%</span>
            </li>
          </ul>
          <p className="ld-muted ld-small">
            {load.kw != null ? `${load.kw} kW` : "—"}{load.rated != null ? ` of ${load.rated} kW rated` : ""} · from the device record
          </p>
        </>
      ) : (
        <Empty>Output load is not reported for this UPS yet.</Empty>
      )}
    </Panel>
  );

  const alertsPanel = (limit?: number) => (
    <Panel title="Recent Alerts" action={limit ? { label: "View all alerts", onClick: () => goTab("Alerts") } : { label: "Open alert console", onClick: () => setRoute("alerts") }}>
      {alerts.length ? (
        <ul className="ld-activity">
          {alerts.slice(0, limit).map((a) => (
            <li key={a.id}>
              <Pill tone={sevTone(a.sev)}>{sevLabel(a.sev)}</Pill>
              <span className="ld-activity-text">{a.title}{a.detail ? <span className="ld-muted"> · {a.detail}</span> : null}</span>
              <span className="ld-muted ld-nowrap">{a.since}</span>
            </li>
          ))}
        </ul>
      ) : (
        <Empty>No active alerts on {d.id}.</Empty>
      )}
    </Panel>
  );

  const sampleTable = (title: string, cols: string[], rows: string[][]) => (
    <Panel title={`${title} · Sample data — not connected`}>
      <p className="ld-devices-sample"><i className="fa-solid fa-flask" aria-hidden="true" /> Illustrative values, not from {d.id}. This panel fills in once UPS-MIB battery and outlet metrics are collected.</p>
      <div className="ld-table-wrap">
        <table className="ld-table">
          <thead><tr>{cols.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
          <tbody>
            {rows.map((r) => <tr key={r[0]}>{r.map((v, i) => <td key={i} className="ld-muted">{v}</td>)}</tr>)}
          </tbody>
        </table>
      </div>
    </Panel>
  );

  const configPanel = (
    <div className="ld-grid ld-grid-2">
      {infoPanel}
      <Panel title="Monitoring">
        <dl className="ld-dl">
          <dt>Collector</dt><dd>{d.agent || "—"}</dd>
          <dt>Metric family</dt><dd>{m?.family ?? "—"}</dd>
          <dt>Metrics source</dt><dd>{m?.sample ? <Pill tone="muted">Sample data</Pill> : connected ? <Pill tone="ok">Prometheus · connected</Pill> : <Pill tone="muted">{m?.source === "unsupported" ? "Not supported" : "Not connected"}</Pill>}</dd>
          <dt>Uptime</dt><dd>{d.uptime || "—"}</dd>
          <dt>Last seen</dt><dd>{d.lastSeen || "—"}</dd>
        </dl>
      </Panel>
    </div>
  );

  return (
    <div className="ld-dash">
      <nav className="ld-crumbs" aria-label="Breadcrumb">
        <button type="button" className="ld-link" onClick={() => setRoute("dashboard")}>Home</button>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <button type="button" className="ld-link" onClick={() => setRoute("infra")}>Monitoring</button>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <button type="button" className="ld-link" onClick={() => setRoute("infra-assets")}>Nodes</button>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <span>{d.id}</span>
      </nav>

      <div className="ld-head ld-entity-head">
        <div className="ld-entity">
          <span className="ld-devices-tile" aria-hidden="true"><i className="fa-solid fa-car-battery" /></span>
          <div>
            <h1 className="ld-entity-title">
              {d.hostname || d.id}
              <Pill tone={st.tone}><span className="ld-pill-dot" /> {st.label}</Pill>
            </h1>
            <p className="ld-entity-meta">
              <span>{d.model || "UPS"}</span>
              <span className="ld-mono">{d.ip}</span>
              <span>Site: <b>{d.site || "—"}</b></span>
              <span>Uptime: <b>{d.uptime || "—"}</b></span>
            </p>
            <p className="ld-entity-meta">
              <span>{d.os || "—"}</span>
              <span>Last seen: {d.lastSeen || "—"}</span>
            </p>
          </div>
        </div>
        <div className="ld-head-side">
          <div className="ld-head-actions">
            <RangeSelect />
            <LiveButton />
            <button type="button" className="ld-btn" onClick={() => setRoute("infra-topology")}><i className="fa-solid fa-circle-nodes" aria-hidden="true" /> View in map</button>
            <button type="button" className="ld-btn" onClick={() => setRoute("infra-device", { deviceId: d.id })}><i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" /> Device monitoring</button>
          </div>
          <ul className="ld-tags" aria-label="Tags">
            {tags.map((t) => <li key={t.label} className="ld-tag"><i className={t.icon} aria-hidden="true" /> {t.label}</li>)}
          </ul>
        </div>
      </div>

      {m?.sample && <SampleNotice />}
      {!metrics.isLoading && !connected && (
        <div className="ld-card ld-metrics-off" role="status">
          <i className="fa-solid fa-plug-circle-xmark" aria-hidden="true" />
          <div>
            <b>{m?.source === "unsupported" ? "No metrics for this device type yet" : "Prometheus is not connected"}</b>
            <p className="ld-muted ld-small">{m?.message ?? "The metrics API is not reachable from this browser."} Cards show the last values from the device record; charts fill in once the SNMP exporter is scraped.</p>
          </div>
        </div>
      )}

      <div className="ld-kpis">
        <Kpi icon="fa-gauge-high" tone={load.pct != null && load.pct > 85 ? "warn" : "ok"} label="Output Load" value={load.pct != null ? `${Math.round(load.pct)}%` : "n/a"}
          sub={load.pct != null ? fromRecord : "not reported"} />
        <Kpi icon="fa-bolt" tone="info" label="Power Draw" value={load.kw != null ? `${load.kw} kW` : "n/a"}
          sub={load.rated != null ? `of ${load.rated} kW rated` : load.kw != null ? fromRecord : "not reported"} />
        <Kpi icon="fa-plug-circle-check" tone={st.tone} label="Power State" value={st.label} sub={fromRecord} />
        <Kpi icon="fa-bell" tone={alerts.length ? "crit" : "ok"} label="Active Alerts" value={String(alerts.length)} sub={alerts.length ? alerts[0].title : "none open"} />
        <Kpi icon="fa-clock" tone="info" label="Uptime" value={uptime ? `${lastOf(uptime)!.toFixed(1)} d` : d.uptime || "n/a"} sub={uptime ? "sysUpTime" : fromRecord} points={uptime?.points} />
      </div>

      <div className="ld-tabs" role="tablist" aria-label={`${d.id} sections`}>
        {tabs.map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} className={`ld-tab${tab === t ? " active" : ""}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {is("Overview") && (
        <>
          {charts(["cpu", "network", "uptime"])}
          <div className="ld-grid ld-grid-3">
            {loadPanel}
            {infoPanel}
            {alertsPanel(5)}
          </div>
        </>
      )}
      {is("Performance") && charts(["cpu", "network", "errors", "ports", "uptime"])}
      {is("Battery & Outlets") && (
        <div className="ld-grid ld-grid-2">
          {sampleTable("Battery", ["Metric", "Value"], SAMPLE_BATTERY)}
          {sampleTable("Outlet Groups", ["Group", "Load", "State"], SAMPLE_OUTLETS)}
        </div>
      )}
      {is("Alerts") && alertsPanel()}
      {is("Relationships") && <DeviceFamily deviceId={d.id} />}
      {is("Configuration") && configPanel}
    </div>
  );
}
