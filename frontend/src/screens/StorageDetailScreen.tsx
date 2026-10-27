// Storage array node page (SAN / NAS) in the Netdata Cloud layout, same
// skeleton as ServerDetailScreen: header with model / IP / site / uptime and
// tags; KPI cards; tabbed charts from the metrics API; recent alerts;
// relationships and configuration.
//
// Live numbers come from Prometheus via the metrics API; card values shown
// without it come from the device record (capacity is read from its role,
// e.g. "Block · 187 TB used / 280 TB"). Volumes and controller sensors have no
// data source yet (array exporter) and are labelled as sample data.
import "@/styles/devices.css";
import React from "react";
import { useNav } from "@/hooks/useNav";
import { useUiStore } from "@/store/ui";
import { useTimeRange } from "@/store/timeRange";
import { useDevice, useDeviceMetrics, useInfraAlerts } from "@/api/hooks";
import { DEVICES } from "@/data/infra";
import type { Device } from "@/lib/types";
import { Empty, Panel, Pill, PillDot } from "@/components/ld";
import { Crumbs, Tab, Tabs, Table, buttonClass, cx, ui } from "@/components/ui";
import type { Tone } from "@/components/ld";
import { LiveButton, MetricsBody, RangeSelect, fmtValue, SampleNotice } from "@/components/MetricCharts";
import { Kpi, lastOf, node, seriesOf } from "@/components/KpiCard";
import { DeviceFamily } from "@/components/DeviceFamily";

import { Icon } from "@/components/Icon";
import { DatabaseIcon, ExternalLinkIcon, FlaskConicalIcon, NetworkIcon, UnplugIcon } from "lucide-react";
const STORAGE_KINDS = ["storage", "nas"];

const STATUS: Record<string, { label: string; tone: Tone }> = {
  ok: { label: "Online", tone: "ok" },
  warn: { label: "Warning", tone: "warn" },
  critical: { label: "Critical", tone: "crit" },
  down: { label: "Offline", tone: "crit" },
  unknown: { label: "Unknown", tone: "muted" },
};
const sevTone = (s: string): Tone => (s === "critical" ? "crit" : s === "warning" || s === "warn" ? "warn" : "info");
const sevLabel = (s: string) => (s === "critical" ? "Critical" : s === "warning" || s === "warn" ? "Warning" : "Info");
const has = (v?: string) => !!v && v !== "—" && v !== "-";

/** "Block · 187 TB used / 280 TB" → { used: 187, total: 280, unit: "TB" } */
function capacityOf(role?: string) {
  const r = /([\d.]+)\s*(TB|PB|GB)\s*used\s*\/\s*([\d.]+)\s*(TB|PB|GB)/i.exec(role || "");
  return r ? { used: +r[1], total: +r[3], unit: r[2].toUpperCase() } : null;
}

// Illustrative only — no array exporter feeds these yet.
const SAMPLE_VOLUMES: string[][] = [
  ["vol-prod-vmfs-01", "flash-pool-a", "40 TB", "71%"],
  ["vol-prod-vmfs-02", "flash-pool-a", "40 TB", "64%"],
  ["vol-oracle-asm", "flash-pool-b", "24 TB", "82%"],
  ["vol-fileshare", "hybrid-pool", "60 TB", "55%"],
];
const SAMPLE_SENSORS: string[][] = [
  ["Controller A", "Primary · OK"], ["Controller B", "Secondary · OK"], ["NVRAM battery", "Charged"],
  ["PSU 1 / PSU 2", "OK / OK"], ["Replication", "Async · 15 min RPO"],
];

export default function StorageDetailScreen() {
  const { setRoute } = useNav();
  const paramId = useUiStore((s) => s.params.deviceId as string | undefined);
  const seed = DEVICES.find((x) => x.id === paramId && STORAGE_KINDS.includes(x.kind))
    ?? DEVICES.find((x) => x.kind === "storage") ?? DEVICES[0];
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
  const cap = capacityOf(d.role);
  const capPct = cap && cap.total ? (cap.used / cap.total) * 100 : null;

  const cpu = seriesOf(m, "cpu"), mem = seriesOf(m, "mem"), disk = seriesOf(m, "disk");
  const fromRecord = `device record · ${d.lastSeen || "—"}`;

  const tabs = ["Overview", "Performance", "Volumes", `Alerts (${alerts.length})`, "Relationships", "Configuration"];
  const is = (name: string) => tab === name || (name === "Alerts" && tab.startsWith("Alerts"));
  const goTab = (prefix: string) => setTab(tabs.find((t) => t.startsWith(prefix)) ?? "Overview");

  const tags: { icon: string; label: string }[] = [
    ...(d.role ? [{ icon: "fa-solid fa-tag", label: d.role.split("·")[0].trim() }] : []),
    { icon: "fa-solid fa-database", label: "Storage Array" },
    ...(vendor ? [{ icon: "fa-solid fa-industry", label: vendor }] : []),
    ...(d.agent ? [{ icon: "fa-solid fa-satellite-dish", label: d.agent }] : []),
  ];

  const charts = (groups: string[]) => <MetricsBody data={m} isLoading={metrics.isLoading} isError={metrics.isError} groups={groups} quietWhenOff compact />;

  const infoPanel = (
    <Panel title="Device Information">
      <dl className={ui.dl}>
        <dt>Hostname</dt><dd>{d.hostname || d.id}</dd>
        <dt>IP address</dt><dd className={ui.mono}>{d.ip || "—"}</dd>
        <dt>Model</dt><dd>{d.model || "—"}</dd>
        <dt>Vendor</dt><dd>{vendor || "—"}</dd>
        <dt>Serial number</dt><dd className={ui.mono}>{d.serial_number || "—"}</dd>
        <dt>OS version</dt><dd>{d.os || "—"}</dd>
        <dt>Site / location</dt><dd>{d.site}{d.location ? ` · ${d.location}` : ""}</dd>
        <dt>Role</dt><dd>{d.role || "—"}</dd>
        <dt>Last seen</dt><dd>{d.lastSeen || "—"}</dd>
      </dl>
    </Panel>
  );

  const capacityPanel = (
    <Panel title="Capacity">
      {cap && capPct != null ? (
        <>
          <ul className={ui.bars}>
            <li className={ui.barItem}>
              <span className={ui.barLabel}>Used</span>
              <span className={ui.barTrack}><span className={ui.barFill} style={{ width: `${Math.min(100, capPct)}%`, background: capPct > 85 ? "#e5383b" : capPct > 75 ? "#f5a524" : "#2f6bff" }} /></span>
              <span className={ui.barValue}>{Math.round(capPct)}%</span>
            </li>
          </ul>
          <p className="text-fg-muted text-xs">{cap.used} {cap.unit} used of {cap.total} {cap.unit} · {Math.round((cap.total - cap.used) * 10) / 10} {cap.unit} free (device record)</p>
        </>
      ) : (
        <Empty>Capacity is not reported for this array yet.</Empty>
      )}
    </Panel>
  );

  const alertsPanel = (limit?: number) => (
    <Panel title="Recent Alerts" action={limit ? { label: "View all alerts", onClick: () => goTab("Alerts") } : { label: "Open alert console", onClick: () => setRoute("alerts") }}>
      {alerts.length ? (
        <ul className={ui.activity}>
          {alerts.slice(0, limit).map((a) => (
            <li key={a.id} className={ui.activityItem}>
              <Pill tone={sevTone(a.sev)}>{sevLabel(a.sev)}</Pill>
              <span className={ui.activityText}>{a.title}{a.detail ? <span className="text-fg-muted"> · {a.detail}</span> : null}</span>
              <span className="text-fg-muted whitespace-nowrap">{a.since}</span>
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
      <p className={node.sample}><Icon icon={FlaskConicalIcon} /> Illustrative values, not from {d.id}. This panel fills in once the array exporter ({d.agent || "vendor API"}) is connected.</p>
      <Table>
          <thead><tr>{cols.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
          <tbody>
            {rows.map((r) => <tr key={r[0]}>{r.map((v, i) => <td key={i} className={i === 0 ? "font-mono font-semibold" : undefined}>{v}</td>)}</tr>)}
          </tbody>
        </Table>
    </Panel>
  );

  const configPanel = (
    <div className={cx(ui.grid, ui.cols[2])}>
      {infoPanel}
      <Panel title="Monitoring">
        <dl className={ui.dl}>
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
    <div className={ui.page}>
      <Crumbs items={[{ label: "Home", onClick: () => setRoute("dashboard") }, { label: "Monitoring", onClick: () => setRoute("infra") }, { label: "Nodes", onClick: () => setRoute("infra-assets") }, { label: d.id }]} />

      <div className={node.head}>
        <div className={node.entity}>
          <span className={node.deviceTile} aria-hidden="true"><Icon icon={DatabaseIcon} /></span>
          <div>
            <h1 className={node.title}>
              {d.hostname || d.id}
              <Pill tone={st.tone}><PillDot /> {st.label}</Pill>
            </h1>
            <p className={node.meta}>
              <span>{d.model || "Storage array"}</span>
              <span className={ui.mono}>{d.ip}</span>
              <span>Site: <b>{d.site || "—"}</b></span>
              <span>Uptime: <b>{d.uptime || "—"}</b></span>
            </p>
            <p className={node.meta}>
              <span>{d.os || "—"}</span>
              <span>Last seen: {d.lastSeen || "—"}</span>
            </p>
          </div>
        </div>
        <div className={ui.headSide}>
          <div className={ui.headActions}>
            <RangeSelect />
            <LiveButton />
            <button type="button" className={buttonClass()} onClick={() => setRoute("infra-topology")}><Icon icon={NetworkIcon} /> View in map</button>
            <button type="button" className={buttonClass()} onClick={() => setRoute("infra-device", { deviceId: d.id })}><Icon icon={ExternalLinkIcon} /> Device monitoring</button>
          </div>
          <ul className={ui.tags} aria-label="Tags">
            {tags.map((t) => <li key={t.label} className={ui.tag}><Icon className={t.icon} /> {t.label}</li>)}
          </ul>
        </div>
      </div>

      {m?.sample && <SampleNotice />}
      {!metrics.isLoading && !connected && (
        <div className={cx(ui.card, ui.notice)} role="status">
          <Icon icon={UnplugIcon} />
          <div>
            <b>{m?.source === "unsupported" ? "No metrics for this device type yet" : "Prometheus is not connected"}</b>
            <p className="text-fg-muted text-xs">{m?.message ?? "The metrics API is not reachable from this browser."} Cards show the last values from the device record; charts fill in once the array exporter is scraped.</p>
          </div>
        </div>
      )}

      <div className={node.kpis}>
        <Kpi icon="fa-hard-drive" tone="warn" label="Capacity Used" value={disk ? fmtValue(lastOf(disk)!, "%") : capPct != null ? `${Math.round(capPct)}%` : "n/a"}
          sub={disk ? disk.label : cap ? `${cap.used} / ${cap.total} ${cap.unit} · device record` : "not reported"} points={disk?.points} color="#f97316" lowerIsBetter />
        <Kpi icon="fa-microchip" tone="info" label="Controller CPU" value={cpu ? fmtValue(lastOf(cpu)!, "%") : `${d.cpu}%`}
          sub={cpu ? undefined : fromRecord} points={cpu?.points} lowerIsBetter />
        <Kpi icon="fa-memory" tone="ok" label="Memory Usage" value={mem ? fmtValue(lastOf(mem)!, "%") : `${d.mem}%`}
          sub={mem ? undefined : fromRecord} points={mem?.points} color="#16a34a" lowerIsBetter />
        <Kpi icon="fa-gauge-high" tone="purple" label="Throughput" value={has(d.throughput) ? d.throughput : "n/a"} sub={has(d.throughput) ? fromRecord : "not reported"} />
        <Kpi icon="fa-bell" tone={alerts.length ? "crit" : "ok"} label="Active Alerts" value={String(alerts.length)} sub={alerts.length ? alerts[0].title : "none open"} />
        <Kpi icon="fa-clock" tone="info" label="Uptime" value={d.uptime || "n/a"} sub={fromRecord} />
      </div>

      <Tabs aria-label={`${d.id} sections`}>
        {tabs.map((t) => (
          <Tab key={t} active={tab === t} onClick={() => setTab(t)}>{t}</Tab>
        ))}
      </Tabs>

      {is("Overview") && (
        <>
          {charts(["cpu", "memory", "disk_io", "network"])}
          <div className={cx(ui.grid, ui.cols[3])}>
            {capacityPanel}
            {infoPanel}
            {alertsPanel(5)}
          </div>
        </>
      )}
      {is("Performance") && charts(["cpu", "memory", "disk", "disk_io", "network", "uptime"])}
      {is("Volumes") && (
        <div className={cx(ui.grid, ui.cols[2])}>
          {sampleTable("Volumes", ["Volume", "Pool", "Size", "Used"], SAMPLE_VOLUMES)}
          {sampleTable("Controllers & Sensors", ["Component", "State"], SAMPLE_SENSORS)}
        </div>
      )}
      {is("Alerts") && alertsPanel()}
      {is("Relationships") && <DeviceFamily deviceId={d.id} />}
      {is("Configuration") && configPanel}
    </div>
  );
}
