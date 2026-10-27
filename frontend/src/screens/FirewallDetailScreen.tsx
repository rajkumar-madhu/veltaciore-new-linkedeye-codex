// Firewall node page (Netdata Cloud layout, same skeleton as ServerDetailScreen):
// header with model / IP / site / uptime and tags; KPI cards (CPU, memory,
// sessions, throughput, interface errors, uptime); tabbed SNMP charts;
// interface status from discovery (GET /api/infra/devices/{id}/relationships/);
// recent alerts; relationships and configuration.
//
// Live numbers come from Prometheus via the metrics API; card values shown
// without it come from the device record. Security / HA panels have no data
// source yet and are labelled as sample data.
import "@/styles/devices.css";
import React from "react";
import { useNav } from "@/hooks/useNav";
import { useUiStore } from "@/store/ui";
import { useTimeRange } from "@/store/timeRange";
import { useDevice, useDeviceMetrics, useDeviceRelationships, useInfraAlerts, type MetricSeries, type NicLink, type PeerRef } from "@/api/hooks";
import { DEVICES } from "@/data/infra";
import type { Device } from "@/lib/types";
import { Empty, Panel, Pill, PillDot } from "@/components/ld";
import { Crumbs, Tab, Tabs, Table, buttonClass, cx, ui } from "@/components/ui";
import type { Tone } from "@/components/ld";
import { LiveButton, MetricsBody, RangeSelect, fmtValue, SampleNotice } from "@/components/MetricCharts";
import { Kpi, lastOf, node, seriesOf } from "@/components/KpiCard";
import { DeviceFamily } from "@/components/DeviceFamily";

import { Icon } from "@/components/Icon";
import { ArrowDownIcon, ArrowUpIcon, ExternalLinkIcon, FlaskConicalIcon, NetworkIcon, ShieldIcon, UnplugIcon } from "lucide-react";
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

// Illustrative only — no threat-log / HA integration feeds these yet.
const SAMPLE_SECURITY: [string, string][] = [
  ["Threats blocked", "8,347"], ["IPS detections", "2,153"], ["Botnet C&C hits", "126"],
  ["URL filtering events", "4,281"], ["Denied connections", "3,152"], ["Geo-blocked traffic", "1,245"],
];
const SAMPLE_HA: [string, string][] = [
  ["Mode", "Active-Passive"], ["This device", "Active"], ["Peer", "Reachable"], ["Config sync", "Synced"], ["Failover count", "3"],
];

export default function FirewallDetailScreen() {
  const { setRoute } = useNav();
  const paramId = useUiStore((s) => s.params.deviceId as string | undefined);
  const seed = DEVICES.find((x) => x.id === paramId && x.kind === "firewall")
    ?? DEVICES.find((x) => x.kind === "firewall") ?? DEVICES[0];
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

  const tabs = ["Overview", "Interfaces", "Performance", "Security", `Alerts (${alerts.length})`, "Relationships", "Configuration"];
  const is = (name: string) => tab === name || (name === "Alerts" && tab.startsWith("Alerts"));
  const goTab = (prefix: string) => setTab(tabs.find((t) => t.startsWith(prefix)) ?? "Overview");

  const tags: { icon: string; label: string }[] = [
    ...(d.role ? [{ icon: "fa-solid fa-tag", label: d.role }] : []),
    { icon: "fa-solid fa-shield-halved", label: "Firewall" },
    ...(vendor ? [{ icon: "fa-solid fa-industry", label: vendor }] : []),
    { icon: "fa-solid fa-satellite-dish", label: (d.agent || "snmp").toUpperCase() },
  ];

  const charts = (groups: string[]) => <MetricsBody data={m} isLoading={metrics.isLoading} isError={metrics.isError} groups={groups} quietWhenOff compact />;

  const peerButton = (peer: PeerRef) => peer.restricted || !peer.id
    ? <span className="text-fg-muted">Restricted device (other client)</span>
    : <button type="button" className={ui.link} onClick={() => setRoute(PEER_ROUTE[peer.kind ?? ""] ?? "infra-device", { deviceId: peer.id })}>{peer.name ?? peer.id}</button>;

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
        <dt>Interfaces</dt><dd>{d.iface || "—"}</dd>
        <dt>Last seen</dt><dd>{d.lastSeen || "—"}</dd>
      </dl>
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

  const interfaceTable = (limit?: number) => (
    <Panel title={`Interface Status (${nics.length})`} action={limit && nics.length > limit ? { label: "View all", onClick: () => goTab("Interfaces") } : undefined}>
      {nics.length ? (
        <Table>
            <thead><tr><th scope="col">Interface</th><th scope="col">Status</th><th scope="col">Admin</th><th scope="col">Speed</th><th scope="col">VLAN</th><th scope="col">In</th><th scope="col">Out</th><th scope="col">Connected to</th></tr></thead>
            <tbody>
              {nics.slice(0, limit).map((n) => {
                const s = portState(n);
                return (
                  <tr key={n.name}>
                    <td><span className="font-mono text-xs font-medium">{n.name}</span><span className={ui.sub}>{n.description}</span></td>
                    <td><Pill tone={PORT_TONE[s]}><PillDot />{PORT_LABEL[s]}</Pill></td>
                    <td>{n.admin_status === "up" ? "Up" : "Down"}</td>
                    <td>{n.speed || "—"}</td>
                    <td>{n.vlan || "—"}</td>
                    <td className="font-mono font-semibold">{fmtValue(n.rx_mbps, "Mbps")}</td>
                    <td className="font-mono font-semibold">{fmtValue(n.tx_mbps, "Mbps")}</td>
                    <td>{n.connected_to ? <>{peerButton(n.connected_to.peer)}<span className={cx(ui.sub, "font-mono font-semibold")}>port {n.connected_to.port || "—"}</span></> : <span className="text-fg-muted">—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
      ) : (
        <Empty>{rel.isLoading ? "Loading interfaces…" : rel.isError ? "Interface discovery is not available for this firewall." : "No interfaces discovered yet."}</Empty>
      )}
    </Panel>
  );

  const samplePanel = (title: string, rows: [string, string][], what: string) => (
    <Panel title={`${title} · Sample data — not connected`}>
      <p className={node.sample}><Icon icon={FlaskConicalIcon} /> Illustrative values, not from {d.id}. This panel fills in once the {what} integration is connected.</p>
      <dl className={ui.dl}>
        {rows.map(([k, v]) => <React.Fragment key={k}><dt>{k}</dt><dd>{v}</dd></React.Fragment>)}
      </dl>
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
          <dt>Discovery</dt><dd>{rel.data ? `${nics.length} interfaces` : "Not available"}</dd>
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
          <span className={node.deviceTile} aria-hidden="true"><Icon icon={ShieldIcon} /></span>
          <div>
            <h1 className={node.title}>
              {d.hostname || d.id}
              <Pill tone={st.tone}><PillDot /> {st.label}</Pill>
            </h1>
            <p className={node.meta}>
              <span>{d.model || "Firewall"}</span>
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
            <p className="text-fg-muted text-xs">{m?.message ?? "The metrics API is not reachable from this browser."} Cards show the last values from the device record; charts fill in once the SNMP exporter is scraped.</p>
          </div>
        </div>
      )}

      <div className={node.kpis}>
        <Kpi icon="fa-microchip" tone="info" label="CPU Usage" value={cpu ? fmtValue(lastOf(cpu)!, "%") : `${d.cpu}%`}
          sub={cpu ? undefined : fromRecord} points={cpu?.points} lowerIsBetter />
        <Kpi icon="fa-memory" tone="ok" label="Memory Usage" value={`${d.mem}%`} sub={fromRecord} />
        <Kpi icon="fa-arrows-left-right" tone="info" label="Sessions" value={has(d.sessions) ? d.sessions : "n/a"} sub={has(d.sessions) ? fromRecord : "not reported"} />
        <Kpi icon="fa-network-wired" tone="purple" label="Throughput" value={net.length ? fmtValue(net[net.length - 1][1], "Mbps") : has(d.throughput) ? d.throughput : "n/a"}
          sub={rx || tx ? <><span><Icon icon={ArrowDownIcon} /> {rx ? fmtValue(lastOf(rx)!, "Mbps") : "—"}</span> <span><Icon icon={ArrowUpIcon} /> {tx ? fmtValue(lastOf(tx)!, "Mbps") : "—"}</span></> : has(d.throughput) ? fromRecord : "needs SNMP metrics"}
          points={net.length ? net : undefined} color="#7c4dff" />
        <Kpi icon="fa-triangle-exclamation" tone="warn" label="Interface Errors" value={errs.length ? `${fmtValue(errs[errs.length - 1][1], "count")}/s` : "n/a"}
          sub={errs.length ? "in + out, all interfaces" : "needs SNMP metrics"} points={errs.length ? errs : undefined} color="#f97316" lowerIsBetter />
        <Kpi icon="fa-clock" tone="info" label="Uptime" value={uptime ? `${lastOf(uptime)!.toFixed(1)} d` : d.uptime || "n/a"} sub={uptime ? "sysUpTime" : fromRecord} />
      </div>

      <Tabs aria-label={`${d.id} sections`}>
        {tabs.map((t) => (
          <Tab key={t} active={tab === t} onClick={() => setTab(t)}>{t}</Tab>
        ))}
      </Tabs>

      {is("Overview") && (
        <>
          {charts(["cpu", "network", "errors"])}
          <div className={cx(ui.grid, ui.cols[2])}>
            {infoPanel}
            {alertsPanel(5)}
          </div>
          {interfaceTable(8)}
        </>
      )}
      {is("Interfaces") && interfaceTable()}
      {is("Performance") && charts(["cpu", "network", "errors", "ports", "uptime"])}
      {is("Security") && (
        <div className={cx(ui.grid, ui.cols[2])}>
          {samplePanel("Security Overview", SAMPLE_SECURITY, "threat-log")}
          {samplePanel("HA Overview", SAMPLE_HA, "HA status")}
        </div>
      )}
      {is("Alerts") && alertsPanel()}
      {is("Relationships") && <DeviceFamily deviceId={d.id} />}
      {is("Configuration") && configPanel}
    </div>
  );
}
