// Switch node page (Netdata Cloud layout, same skeleton as ServerDetailScreen):
// header with model / IP / site / uptime and tags; KPI cards from the SNMP
// exporter (CPU, traffic, interface errors, ports up, uptime); tabbed charts;
// a port map, interface table and CDP/LLDP neighbours from the discovered
// interfaces (GET /api/infra/devices/{id}/relationships/); recent alerts.
//
// Live numbers come from Prometheus via the metrics API. Values shown when
// Prometheus is not connected come from the device record only.
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
import { LiveButton, MetricsBody, RangeSelect, TimeChart, fmtValue, SampleNotice } from "@/components/MetricCharts";
import { Kpi, lastOf, seriesOf } from "@/components/KpiCard";
import { DeviceFamily } from "@/components/DeviceFamily";

import { Icon } from "@/components/Icon";
import { ArrowDownIcon, ArrowUpIcon, ChevronRightIcon, ExternalLinkIcon, NetworkIcon, UnplugIcon } from "lucide-react";
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

/** Point-wise sum of two series (e.g. inbound + outbound traffic). */
function sumPoints(a?: MetricSeries, b?: MetricSeries): [number, number][] {
  if (a && b) return a.points.map(([t, v]) => [t, v + (b.points.find((p) => p[0] === t)?.[1] ?? 0)]);
  return (a ?? b)?.points ?? [];
}
const has = (v?: string) => !!v && v !== "—" && v !== "-";

type PortState = "up" | "down" | "off";
const portState = (n: NicLink): PortState => (n.oper_status === "up" ? "up" : n.admin_status === "down" ? "off" : "down");
const PORT_LABEL: Record<PortState, string> = { up: "Up", down: "Down", off: "Admin down" };
const PORT_TONE: Record<PortState, Tone> = { up: "ok", down: "crit", off: "muted" };

export default function SwitchDetailScreen() {
  const { setRoute } = useNav();
  const paramId = useUiStore((s) => s.params.deviceId as string | undefined);
  const seed = DEVICES.find((x) => x.id === paramId && x.kind === "switch")
    ?? DEVICES.find((x) => x.kind === "switch") ?? DEVICES[0];
  const { data: live } = useDevice(seed.id);
  const d: Device = live ?? seed;

  const { preset, from, to } = useTimeRange();
  const metrics = useDeviceMetrics(d.id, preset, from, to);
  const rel = useDeviceRelationships(d.id);
  const alerts = (useInfraAlerts().data ?? []).filter((a) => a.device === d.id);
  const [tab, setTab] = React.useState("Overview");
  const [port, setPort] = React.useState<string | null>(null);
  React.useEffect(() => { setTab("Overview"); setPort(null); }, [d.id]);

  const m = metrics.data;
  const connected = m?.source === "prometheus";
  const st = STATUS[d.status] ?? STATUS.unknown;
  const vendor = d.vendor || (d.model || "").split(" ")[0];
  const nics = rel.data?.nics ?? [];
  const selPort = nics.find((n) => n.name === port) ?? null;

  // KPI values: live series first, device record as fallback
  const cpu = seriesOf(m, "cpu"), rx = seriesOf(m, "net_rx"), tx = seriesOf(m, "net_tx");
  const errIn = seriesOf(m, "if_in_errors"), errOut = seriesOf(m, "if_out_errors");
  const portsUp = seriesOf(m, "ports_up"), uptime = seriesOf(m, "uptime");
  const net = sumPoints(rx, tx), errs = sumPoints(errIn, errOut);
  const fromRecord = `device record · ${d.lastSeen || "—"}`;

  const tabs = ["Overview", "Interfaces", "Performance", "Neighbors", `Alerts (${alerts.length})`, "Relationships", "Configuration"];
  const is = (name: string) => tab === name || (name === "Alerts" && tab.startsWith("Alerts"));
  const goTab = (prefix: string) => setTab(tabs.find((t) => t.startsWith(prefix)) ?? "Overview");

  const tags: { icon: string; label: string }[] = [
    ...(d.role ? [{ icon: "fa-solid fa-tag", label: d.role }] : []),
    { icon: "fa-solid fa-network-wired", label: "Switch" },
    ...(vendor ? [{ icon: "fa-solid fa-industry", label: vendor }] : []),
    { icon: "fa-solid fa-satellite-dish", label: (d.agent || "snmp").toUpperCase() },
  ];

  const charts = (groups: string[]) => <MetricsBody data={m} isLoading={metrics.isLoading} isError={metrics.isError} groups={groups} quietWhenOff compact />;

  // ── panels ────────────────────────────────────────────────────────────────
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
        <dt>Interfaces</dt><dd>{d.iface || "—"}</dd>
        <dt>Monitoring</dt><dd>{d.agent || "—"}</dd>
        <dt>Last seen</dt><dd>{d.lastSeen || "—"}</dd>
      </dl>
    </Panel>
  );

  const downPorts = nics.filter((n) => n.admin_status !== "down" && n.oper_status !== "up");
  const errSeries = connected ? m!.series.filter((s) => s.group === "errors" && s.points.length) : [];
  const errorsPanel = (
    <Panel title="Interface Errors">
      {errSeries.length ? (
        <TimeChart series={errSeries} startSec={Date.parse(m!.start) / 1000} endSec={Date.parse(m!.end) / 1000} compact />
      ) : (
        <p className="ld-muted ld-small">
          {connected ? "No error counters reported in this range." : "Error rates (ifInErrors / ifOutErrors) appear here once the SNMP exporter is scraped by Prometheus."}
        </p>
      )}
      {downPorts.length > 0 && (
        <div className="ld-table-wrap">
          <table className="ld-table">
            <thead><tr><th scope="col">Interface</th><th scope="col">Status</th><th scope="col">Description</th></tr></thead>
            <tbody>
              {downPorts.slice(0, 5).map((n) => (
                <tr key={n.name}>
                  <td className="ld-mono">{n.name}</td>
                  <td><Pill tone="crit"><span className="ld-pill-dot" />Down</Pill></td>
                  <td className="ld-muted">{n.description || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );

  const peerButton = (peer: PeerRef) => peer.restricted || !peer.id
    ? <span className="ld-muted">Restricted device (other client)</span>
    : <button type="button" className="ld-link" onClick={() => setRoute(PEER_ROUTE[peer.kind ?? ""] ?? "infra-device", { deviceId: peer.id })}>{peer.name ?? peer.id}</button>;

  const neighbors = [
    ...nics.filter((n) => n.connected_to).map((n) => ({ key: n.name, peer: n.connected_to!.peer, local: n.name, remote: n.connected_to!.port, bw: n.connected_to!.bandwidth, status: n.connected_to!.status })),
    ...(rel.data?.other_links ?? []).map((l, i) => ({ key: `other-${i}`, peer: l.peer, local: l.local_port, remote: l.peer_port, bw: l.bandwidth, status: l.status })),
  ];
  const neighborsPanel = (limit?: number) => (
    <Panel title="Neighbors (CDP/LLDP)" action={limit && neighbors.length > limit ? { label: "View all", onClick: () => goTab("Neighbors") } : undefined}>
      {rel.isLoading ? <Empty>Loading neighbours…</Empty> : neighbors.length ? (
        <div className="ld-table-wrap">
          <table className="ld-table">
            <thead><tr><th scope="col">Neighbor device</th><th scope="col">Local port</th><th scope="col">Remote port</th><th scope="col">Bandwidth</th><th scope="col">Status</th></tr></thead>
            <tbody>
              {neighbors.slice(0, limit).map((r) => (
                <tr key={r.key}>
                  <td>{peerButton(r.peer)}</td>
                  <td className="ld-mono">{r.local || "—"}</td>
                  <td className="ld-mono ld-muted">{r.remote || "—"}</td>
                  <td className="ld-muted">{r.bw || "—"}</td>
                  <td><Pill tone={r.status === "up" || r.status === "ok" ? "ok" : r.status ? "crit" : "muted"}><span className="ld-pill-dot" />{r.status || "unknown"}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>{rel.isError ? "Discovery data is not available for this switch." : "No CDP/LLDP neighbours discovered yet."}</Empty>
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

  const portMap = (
    <Panel title={`Port Map${nics.length ? ` (${nics.filter((n) => n.oper_status === "up").length} / ${nics.length} up)` : ""}`}>
      {rel.isLoading ? <Empty>Loading interfaces…</Empty> : nics.length ? (
        <>
          <div className="ld-devices-legend" aria-hidden="true">
            <span><span className="ld-devices-swatch is-up" /> Up</span>
            <span><span className="ld-devices-swatch is-down" /> Down</span>
            <span><span className="ld-devices-swatch" /> Admin down</span>
          </div>
          <div className="ld-devices-ports" role="group" aria-label="Switch ports">
            {nics.map((n) => {
              const s = portState(n);
              return (
                <button key={n.name} type="button" className={`ld-devices-port is-${s}`} aria-pressed={port === n.name}
                  aria-label={`${n.name}: ${PORT_LABEL[s]}${n.connected_to?.peer.name ? `, connected to ${n.connected_to.peer.name}` : ""}`}
                  title={`${n.name} · ${PORT_LABEL[s]}`} onClick={() => setPort(port === n.name ? null : n.name)}>
                  <span>{n.name.replace(/^[A-Za-z-]+/, "") || n.name}</span>
                </button>
              );
            })}
          </div>
          {selPort && (
            <div className="ld-devices-port-detail">
              <dl className="ld-dl">
                <dt>Interface</dt><dd className="ld-mono">{selPort.name}{selPort.description ? ` · ${selPort.description}` : ""}</dd>
                <dt>Status</dt><dd><Pill tone={PORT_TONE[portState(selPort)]}><span className="ld-pill-dot" />{PORT_LABEL[portState(selPort)]}</Pill></dd>
                <dt>Speed / MTU</dt><dd>{selPort.speed || "—"} · {selPort.mtu || "—"}</dd>
                <dt>VLAN</dt><dd>{selPort.vlan || "—"}</dd>
                <dt>MAC</dt><dd className="ld-mono">{selPort.mac || "—"}</dd>
                <dt>RX / TX</dt><dd className="ld-mono">{fmtValue(selPort.rx_mbps, "Mbps")} / {fmtValue(selPort.tx_mbps, "Mbps")}</dd>
                <dt>Connected to</dt><dd>{selPort.connected_to ? <>{peerButton(selPort.connected_to.peer)} <span className="ld-muted ld-mono">port {selPort.connected_to.port || "—"}</span></> : <span className="ld-muted">Not cabled / not discovered</span>}</dd>
              </dl>
            </div>
          )}
        </>
      ) : (
        <Empty>{rel.isError ? "Interface discovery is not available for this switch." : "No interfaces discovered yet."}</Empty>
      )}
    </Panel>
  );

  const interfaceTable = (limit?: number) => (
    <Panel title={`Interfaces (${nics.length})`} action={limit && nics.length > limit ? { label: "View all", onClick: () => goTab("Interfaces") } : undefined}>
      {nics.length ? (
        <div className="ld-table-wrap">
          <table className="ld-table">
            <thead><tr><th scope="col">Interface</th><th scope="col">Status</th><th scope="col">VLAN</th><th scope="col">Speed</th><th scope="col">In</th><th scope="col">Out</th><th scope="col">Connected to</th></tr></thead>
            <tbody>
              {nics.slice(0, limit).map((n) => {
                const s = portState(n);
                return (
                  <tr key={n.name}>
                    <td><span className="ld-mono ld-strong">{n.name}</span><span className="ld-sub">{n.description}</span></td>
                    <td><Pill tone={PORT_TONE[s]}><span className="ld-pill-dot" />{PORT_LABEL[s]}</Pill></td>
                    <td className="ld-muted">{n.vlan || "—"}</td>
                    <td>{n.speed || "—"}</td>
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
        <Empty>{rel.isLoading ? "Loading interfaces…" : "No interfaces discovered yet."}</Empty>
      )}
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
          <dt>Discovery</dt><dd>{rel.data ? `${nics.length} interfaces · ${neighbors.length} neighbours` : "Not available"}</dd>
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
        <Icon icon={ChevronRightIcon} />
        <button type="button" className="ld-link" onClick={() => setRoute("infra")}>Monitoring</button>
        <Icon icon={ChevronRightIcon} />
        <button type="button" className="ld-link" onClick={() => setRoute("infra-assets")}>Nodes</button>
        <Icon icon={ChevronRightIcon} />
        <span>{d.id}</span>
      </nav>

      <div className="ld-head ld-entity-head">
        <div className="ld-entity">
          <span className="ld-devices-tile" aria-hidden="true"><Icon icon={NetworkIcon} /></span>
          <div>
            <h1 className="ld-entity-title">
              {d.hostname || d.id}
              <Pill tone={st.tone}><span className="ld-pill-dot" /> {st.label}</Pill>
            </h1>
            <p className="ld-entity-meta">
              <span>{d.model || "Switch"}</span>
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
            <button type="button" className="ld-btn" onClick={() => setRoute("infra-topology")}><Icon icon={NetworkIcon} /> View in map</button>
            <button type="button" className="ld-btn" onClick={() => setRoute("infra-device", { deviceId: d.id })}><Icon icon={ExternalLinkIcon} /> Device monitoring</button>
          </div>
          <ul className="ld-tags" aria-label="Tags">
            {tags.map((t) => <li key={t.label} className="ld-tag"><Icon className={t.icon} /> {t.label}</li>)}
          </ul>
        </div>
      </div>

      {m?.sample && <SampleNotice />}
      {!metrics.isLoading && !connected && (
        <div className="ld-card ld-metrics-off" role="status">
          <Icon icon={UnplugIcon} />
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
        <Kpi icon="fa-network-wired" tone="purple" label="Traffic (Total)" value={net.length ? fmtValue(net[net.length - 1][1], "Mbps") : has(d.throughput) ? d.throughput : "n/a"}
          sub={rx || tx ? <><span><Icon icon={ArrowDownIcon} /> {rx ? fmtValue(lastOf(rx)!, "Mbps") : "—"}</span> <span><Icon icon={ArrowUpIcon} /> {tx ? fmtValue(lastOf(tx)!, "Mbps") : "—"}</span></> : has(d.throughput) ? fromRecord : "needs SNMP metrics"}
          points={net.length ? net : undefined} color="#7c4dff" />
        <Kpi icon="fa-triangle-exclamation" tone="warn" label="Interface Errors" value={errs.length ? `${fmtValue(errs[errs.length - 1][1], "count")}/s` : "n/a"}
          sub={errs.length ? "in + out, all interfaces" : "needs SNMP metrics"} points={errs.length ? errs : undefined} color="#f97316" lowerIsBetter />
        <Kpi icon="fa-ethernet" tone="ok" label="Ports Up" value={portsUp ? String(Math.round(lastOf(portsUp)!)) : has(d.iface) ? d.iface : "n/a"}
          sub={portsUp ? "ifOperStatus up" : has(d.iface) ? fromRecord : undefined} points={portsUp?.points} color="#16a34a" />
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
            {errorsPanel}
          </div>
          {portMap}
          <div className="ld-grid ld-grid-2">
            {neighborsPanel(8)}
            {alertsPanel(5)}
          </div>
        </>
      )}
      {is("Interfaces") && (<>{portMap}{interfaceTable()}</>)}
      {is("Performance") && charts(["cpu", "network", "errors", "ports", "uptime"])}
      {is("Neighbors") && neighborsPanel()}
      {is("Alerts") && alertsPanel()}
      {is("Relationships") && <DeviceFamily deviceId={d.id} />}
      {is("Configuration") && configPanel}
    </div>
  );
}
