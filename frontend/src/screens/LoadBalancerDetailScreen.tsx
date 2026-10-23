// Load balancer node page (Netdata Cloud layout, same skeleton as
// ServerDetailScreen): header with model / IP / site / uptime and tags; KPI
// cards (CPU, memory, connections, throughput, interface errors, uptime);
// tabbed SNMP charts; interfaces from discovery; recent alerts; relationships.
//
// Live numbers come from Prometheus via the metrics API; card values shown
// without it come from the device record. Virtual servers / pools / SSL have
// no data source yet (iControl / iStats integration) and are labelled as
// sample data.
import "@/styles/devices.css";
import React from "react";
import { useNav } from "@/hooks/useNav";
import { useUiStore } from "@/store/ui";
import { useTimeRange } from "@/store/timeRange";
import { useDevice, useDeviceMetrics, useDeviceRelationships, useInfraAlerts, type MetricSeries, type NicLink, type PeerRef } from "@/api/hooks";
import { DEVICES } from "@/data/infra";
import type { Device } from "@/lib/types";
import { Empty, Panel, Pill } from "@/components/ld";
import type { Tone } from "@/components/ld";
import { LiveButton, MetricsBody, RangeSelect, fmtValue } from "@/components/MetricCharts";
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

const PEER_ROUTE: Record<string, string> = {
  switch: "switch-detail", firewall: "firewall-detail", loadbal: "loadbal-detail", ups: "ups-detail", storage: "storage-detail",
  hypervisor: "server-detail", "phys-srv": "server-detail", "linux-srv": "server-detail", "win-srv": "server-detail",
};

function sumPoints(a?: MetricSeries, b?: MetricSeries): [number, number][] {
  if (a && b) return a.points.map(([t, v]) => [t, v + (b.points.find((p) => p[0] === t)?.[1] ?? 0)]);
  return (a ?? b)?.points ?? [];
}
const has = (v?: string) => !!v && v !== "—" && v !== "-";

type PortState = "up" | "down" | "off";
const portState = (n: NicLink): PortState => (n.oper_status === "up" ? "up" : n.admin_status === "down" ? "off" : "down");
const PORT_LABEL: Record<PortState, string> = { up: "Up", down: "Down", off: "Admin down" };
const PORT_TONE: Record<PortState, Tone> = { up: "ok", down: "crit", off: "muted" };

// Illustrative only — no iControl / iStats integration feeds these yet.
const SAMPLE_VIPS: string[][] = [
  ["vs-checkout-https", "10.10.5.20:443", "pool-checkout", "4/4", "Up"],
  ["vs-api-https", "10.10.5.21:443", "pool-api", "6/6", "Up"],
  ["vs-web-http", "10.10.5.22:80", "pool-web", "3/4", "Degraded"],
  ["vs-legacy-soap", "10.10.5.24:8443", "pool-legacy", "0/2", "Down"],
];
const SAMPLE_POOLS: string[][] = [
  ["pool-api", "least-conn", "6/6 up"], ["pool-checkout", "round-robin", "4/4 up"],
  ["pool-web", "round-robin", "3/4 up"], ["pool-legacy", "round-robin", "0/2 up"],
];
const SAMPLE_CERTS: string[][] = [
  ["*.example.com", "Expires in 214 days"], ["checkout.example.com", "Expires in 62 days"], ["legacy.example.com", "Expires in 9 days"],
];

export default function LoadBalancerDetailScreen() {
  const { setRoute } = useNav();
  const paramId = useUiStore((s) => s.params.deviceId as string | undefined);
  const seed = DEVICES.find((x) => x.id === paramId && x.kind === "loadbal")
    ?? DEVICES.find((x) => x.kind === "loadbal") ?? DEVICES[0];
  const { data: live } = useDevice(seed.id);
  const d: Device = live ?? seed;

  const { preset, from, to } = useTimeRange();
  const metrics = useDeviceMetrics(d.id, preset, from, to);
  const rel = useDeviceRelationships(d.id);
  const alerts = (useInfraAlerts().data ?? []).filter((a) => a.device === d.id);
  const [tab, setTab] = React.useState("Overview");
  React.useEffect(() => setTab("Overview"), [d.id]);

  const m = metrics.data;
  const connected = m?.source === "prometheus";
  const st = STATUS[d.status] ?? STATUS.unknown;
  const vendor = d.vendor || (d.model || "").split(" ")[0];
  const nics = rel.data?.nics ?? [];

  const cpu = seriesOf(m, "cpu"), rx = seriesOf(m, "net_rx"), tx = seriesOf(m, "net_tx");
  const errIn = seriesOf(m, "if_in_errors"), errOut = seriesOf(m, "if_out_errors"), uptime = seriesOf(m, "uptime");
  const net = sumPoints(rx, tx), errs = sumPoints(errIn, errOut);
  const fromRecord = `device record · ${d.lastSeen || "—"}`;

  const tabs = ["Overview", "Performance", "Interfaces", "Virtual Servers", `Alerts (${alerts.length})`, "Relationships", "Configuration"];
  const is = (name: string) => tab === name || (name === "Alerts" && tab.startsWith("Alerts"));
  const goTab = (prefix: string) => setTab(tabs.find((t) => t.startsWith(prefix)) ?? "Overview");

  const tags: { icon: string; label: string }[] = [
    ...(d.role ? [{ icon: "fa-solid fa-tag", label: d.role }] : []),
    { icon: "fa-solid fa-scale-balanced", label: "Load Balancer" },
    ...(vendor ? [{ icon: "fa-solid fa-industry", label: vendor }] : []),
    { icon: "fa-solid fa-satellite-dish", label: (d.agent || "snmp").toUpperCase() },
  ];

  const charts = (groups: string[]) => <MetricsBody data={m} isLoading={metrics.isLoading} isError={metrics.isError} groups={groups} quietWhenOff compact />;

  const peerButton = (peer: PeerRef) => peer.restricted || !peer.id
    ? <span className="ld-muted">Restricted device (other client)</span>
    : <button type="button" className="ld-link" onClick={() => setRoute(PEER_ROUTE[peer.kind ?? ""] ?? "infra-device", { deviceId: peer.id })}>{peer.name ?? peer.id}</button>;

  const infoPanel = (
    <Panel title="Device Information">
      <dl className="ld-dl">
        <dt>Hostname</dt><dd>{d.hostname || d.id}</dd>
        <dt>IP address</dt><dd className="ld-mono">{d.ip || "—"}</dd>
        <dt>Model</dt><dd>{d.model || "—"}</dd>
        <dt>Vendor</dt><dd>{vendor || "—"}</dd>
        <dt>Serial number</dt><dd className="ld-mono">{d.serial_number || "—"}</dd>
        <dt>OS version</dt><dd>{d.os || "—"}</dd>
        <dt>Site / location</dt><dd>{d.site}{d.location ? ` · ${d.location}` : ""}</dd>
        <dt>Role</dt><dd>{d.role || "—"}</dd>
        <dt>Last seen</dt><dd>{d.lastSeen || "—"}</dd>
      </dl>
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

  const interfaceTable = (
    <Panel title={`Interfaces (${nics.length})`}>
      {nics.length ? (
        <div className="ld-table-wrap">
          <table className="ld-table">
            <thead><tr><th scope="col">Interface</th><th scope="col">Status</th><th scope="col">Speed</th><th scope="col">VLAN</th><th scope="col">In</th><th scope="col">Out</th><th scope="col">Connected to</th></tr></thead>
            <tbody>
              {nics.map((n) => {
                const s = portState(n);
                return (
                  <tr key={n.name}>
                    <td><span className="ld-mono ld-strong">{n.name}</span><span className="ld-sub">{n.description}</span></td>
                    <td><Pill tone={PORT_TONE[s]}><span className="ld-pill-dot" />{PORT_LABEL[s]}</Pill></td>
                    <td>{n.speed || "—"}</td>
                    <td className="ld-muted">{n.vlan || "—"}</td>
                    <td className="ld-mono">{fmtValue(n.rx_mbps, "Mbps")}</td>
                    <td className="ld-mono">{fmtValue(n.tx_mbps, "Mbps")}</td>
                    <td>{n.connected_to ? <>{peerButton(n.connected_to.peer)}<span className="ld-sub ld-mono">port {n.connected_to.port || "—"}</span></> : <span className="ld-muted">—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>{rel.isLoading ? "Loading interfaces…" : rel.isError ? "Interface discovery is not available for this load balancer." : "No interfaces discovered yet."}</Empty>
      )}
    </Panel>
  );

  const sampleTable = (title: string, cols: string[], rows: string[][]) => (
    <Panel title={`${title} · Sample data — not connected`}>
      <p className="ld-devices-sample"><i className="fa-solid fa-flask" aria-hidden="true" /> Illustrative values, not from {d.id}. This panel fills in once the iControl / iStats integration is connected.</p>
      <div className="ld-table-wrap">
        <table className="ld-table">
          <thead><tr>{cols.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
          <tbody>
            {rows.map((r) => <tr key={r[0]}>{r.map((v, i) => <td key={i} className={i === 0 ? "ld-mono ld-muted" : "ld-muted"}>{v}</td>)}</tr>)}
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
          <dt>Metrics source</dt><dd>{connected ? <Pill tone="ok">Prometheus · connected</Pill> : <Pill tone="muted">{m?.source === "unsupported" ? "Not supported" : "Not connected"}</Pill>}</dd>
          <dt>Discovery</dt><dd>{rel.data ? `${nics.length} interfaces` : "Not available"}</dd>
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
          <span className="ld-devices-tile" aria-hidden="true"><i className="fa-solid fa-scale-balanced" /></span>
          <div>
            <h1 className="ld-entity-title">
              {d.hostname || d.id}
              <Pill tone={st.tone}><span className="ld-pill-dot" /> {st.label}</Pill>
            </h1>
            <p className="ld-entity-meta">
              <span>{d.model || "Load balancer"}</span>
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
        <Kpi icon="fa-microchip" tone="info" label="CPU Usage" value={cpu ? fmtValue(lastOf(cpu)!, "%") : `${d.cpu}%`}
          sub={cpu ? undefined : fromRecord} points={cpu?.points} lowerIsBetter />
        <Kpi icon="fa-memory" tone="ok" label="Memory Usage" value={`${d.mem}%`} sub={fromRecord} />
        <Kpi icon="fa-arrows-left-right" tone="info" label="Connections" value={has(d.sessions) ? d.sessions : "n/a"} sub={has(d.sessions) ? fromRecord : "not reported"} />
        <Kpi icon="fa-network-wired" tone="purple" label="Throughput" value={net.length ? fmtValue(net[net.length - 1][1], "Mbps") : has(d.throughput) ? d.throughput : "n/a"}
          sub={rx || tx ? <><span><i className="fa-solid fa-arrow-down" aria-hidden="true" /> {rx ? fmtValue(lastOf(rx)!, "Mbps") : "—"}</span> <span><i className="fa-solid fa-arrow-up" aria-hidden="true" /> {tx ? fmtValue(lastOf(tx)!, "Mbps") : "—"}</span></> : has(d.throughput) ? fromRecord : "needs SNMP metrics"}
          points={net.length ? net : undefined} color="#7c4dff" />
        <Kpi icon="fa-triangle-exclamation" tone="warn" label="Interface Errors" value={errs.length ? `${fmtValue(errs[errs.length - 1][1], "count")}/s` : "n/a"}
          sub={errs.length ? "in + out, all interfaces" : "needs SNMP metrics"} points={errs.length ? errs : undefined} color="#f97316" lowerIsBetter />
        <Kpi icon="fa-clock" tone="info" label="Uptime" value={uptime ? `${lastOf(uptime)!.toFixed(1)} d` : d.uptime || "n/a"} sub={uptime ? "sysUpTime" : fromRecord} />
      </div>

      <div className="ld-tabs" role="tablist" aria-label={`${d.id} sections`}>
        {tabs.map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} className={`ld-tab${tab === t ? " active" : ""}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {is("Overview") && (
        <>
          {charts(["cpu", "network"])}
          <div className="ld-grid ld-grid-2">
            {infoPanel}
            {alertsPanel(5)}
          </div>
        </>
      )}
      {is("Performance") && charts(["cpu", "network", "errors", "ports", "uptime"])}
      {is("Interfaces") && interfaceTable}
      {is("Virtual Servers") && (
        <>
          {sampleTable("Virtual Servers", ["Name", "VIP", "Pool", "Members", "Status"], SAMPLE_VIPS)}
          <div className="ld-grid ld-grid-2">
            {sampleTable("Pools", ["Pool", "Method", "Members"], SAMPLE_POOLS)}
            {sampleTable("SSL Certificates", ["Common name", "Validity"], SAMPLE_CERTS)}
          </div>
        </>
      )}
      {is("Alerts") && alertsPanel()}
      {is("Relationships") && <DeviceFamily deviceId={d.id} />}
      {is("Configuration") && configPanel}
    </div>
  );
}
