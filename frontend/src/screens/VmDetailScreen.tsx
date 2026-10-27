// VM Details in the LinkedEye / Netdata layout: header with state, host,
// cluster, datastore and tags; KPI cards with trend and change; resource,
// disk and network charts; VMware Tools, datastore and snapshots; network
// path (VM → host → NIC → switch port); guest logs.
//
// Live sources only: inventory API (VM record), Prometheus via the VMware
// exporter (…/vms/{id}/metrics/ and …/inventory/), Loki (…/vms/{id}/logs/).
// Power, console, snapshot and migrate actions need the vCenter API; they are
// shown disabled until that integration exists.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { useUiStore } from "@/store/ui";
import { useTimeRange } from "@/store/timeRange";
import { useDevice, useInfraAlerts, useVmInventory, useVmMetrics, useVms } from "@/api/hooks";
import { DEVICES, VMS } from "@/data/infra";
import { Empty, Panel, Pill } from "@/components/ld";
import type { Tone } from "@/components/ld";
import { LiveButton, MetricsBody, RangeSelect, TimeChart, fmtValue, rangeLabel, SampleNotice } from "@/components/MetricCharts";
import { Kpi, lastOf, seriesOf } from "@/components/KpiCard";
import { NetworkPath } from "@/components/DeviceFamily";
import { EventLogs, fmtBytes } from "@/components/HostPanels";

const STATE_TONE: Record<string, Tone> = { running: "ok", stopped: "muted", suspended: "warn", error: "crit" };
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const sevTone = (s: string): Tone => (s === "critical" ? "crit" : s === "warning" || s === "warn" ? "warn" : "info");

const TABS = ["Overview", "Performance", "Storage & Disks", "Network", "Snapshots", "Guest OS", "Logs", "Alerts", "Topology", "Configuration"];

const ACTIONS: [string, string][] = [
  ["fa-play", "Power On"], ["fa-power-off", "Power Off"], ["fa-rotate-right", "Restart"],
  ["fa-pause", "Suspend"], ["fa-arrow-rotate-left", "Reset"], ["fa-right-left", "Migrate"],
  ["fa-display", "Open Console"], ["fa-camera", "Take Snapshot"], ["fa-clone", "Clone VM"],
];

function fmtUptime(days: number) {
  const d = Math.floor(days), h = Math.floor((days - d) * 24);
  return d ? `${d}d ${h}h` : `${h}h`;
}

export default function VmDetailScreen() {
  const { setRoute } = useNav();
  const vmId = useUiStore((s) => s.params.vmId as string | undefined);
  const vms = useVms().data ?? VMS;
  const vm = vms.find((v) => v.id === vmId) ?? vms[0];
  const { data: liveHost } = useDevice(vm?.host);
  const host = liveHost ?? DEVICES.find((d) => d.id === vm?.host);
  const alerts = (useInfraAlerts().data ?? []).filter((a) => a.device === vm?.id || a.device === vm?.host);
  const { preset, from, to } = useTimeRange();
  const metrics = useVmMetrics(vm?.id, preset, from, to);
  const invQ = useVmInventory(vm?.id);
  const [tab, setTab] = React.useState("Overview");
  React.useEffect(() => setTab("Overview"), [vm?.id]);

  if (!vm) {
    return <div className="ld-dash"><div className="ld-card"><Empty>No virtual machines found.</Empty></div></div>;
  }

  const m = metrics.data;
  const connected = m?.source === "prometheus";
  const inv = invQ.data?.source === "prometheus" && invQ.data.found ? invQ.data : undefined;
  const cpu = seriesOf(m, "cpu"), mem = seriesOf(m, "mem"), disk = seriesOf(m, "disk"), up = seriesOf(m, "uptime");
  const rx = seriesOf(m, "net_rx"), tx = seriesOf(m, "net_tx");
  const netTotal: [number, number][] = rx && tx
    ? rx.points.map(([t, v]) => [t, v + (tx.points.find((p) => p[0] === t)?.[1] ?? 0)])
    : (rx ?? tx)?.points ?? [];
  const na = connected ? "—" : "n/a";
  const state = inv ? (inv.powered_on ? "running" : "stopped") : vm.state;
  const tools = inv?.tools?.status;
  const toolsOk = tools === "toolsOk";
  const isWin = /windows/i.test(vm.os);
  const datastore = inv?.datastore;

  const openHost = () => setRoute("server-detail", { deviceId: vm.host });
  const startSec = m ? Date.parse(m.start) / 1000 : 0, endSec = m ? Date.parse(m.end) / 1000 : 0;
  const utilSeries = [cpu, mem, disk].filter(Boolean) as NonNullable<typeof cpu>[];

  const info = (
    <Panel title="VM Information">
      <p className="ld-vmware" aria-label="VMware"><span>vm</span>ware</p>
      <dl className="ld-dl">
        <dt>VM name</dt><dd>{vm.id}</dd>
        <dt>IP address</dt><dd className="ld-mono">{vm.ip || "—"}</dd>
        <dt>Cluster</dt><dd>{inv?.cluster || vm.cluster || "—"}</dd>
        <dt>Host</dt><dd><button type="button" className="ld-link" onClick={openHost}>{inv?.host || vm.host}</button>{host?.ip ? ` (${host.ip})` : ""}</dd>
        <dt>Datastore</dt><dd>{datastore?.name ?? "—"}</dd>
        <dt>vCPU</dt><dd>{vm.cpu || "—"}</dd>
        <dt>Memory</dt><dd>{vm.mem || "—"}</dd>
        <dt>Disk</dt><dd>{vm.disk || "—"}</dd>
        <dt>OS</dt><dd>{vm.os || "—"}</dd>
        <dt>Tools status</dt>
        <dd>{inv ? <Pill tone={toolsOk ? "ok" : "warn"}><i className={`fa-solid ${toolsOk ? "fa-circle-check" : "fa-circle-exclamation"}`} aria-hidden="true" /> {tools || "unknown"}{inv.tools?.version ? ` (${inv.tools.version})` : ""}</Pill> : "—"}</dd>
        <dt>VM state</dt><dd><Pill tone={STATE_TONE[state] ?? "muted"}><i className="fa-solid fa-circle-check" aria-hidden="true" /> {state === "running" ? "Powered On" : cap(state)}</Pill></dd>
        <dt>Booted</dt><dd>{inv?.boot_time ? new Date(inv.boot_time).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—"}</dd>
      </dl>
    </Panel>
  );

  const utilization = (
    <section className="ld-card ld-chart-card" aria-label="Resource utilization">
      <header>
        <h3>Resource Utilization</h3>
        <span className="ld-muted ld-small"><i className="fa-regular fa-clock" aria-hidden="true" /> {rangeLabel(preset, from, to)}</span>
      </header>
      {connected && utilSeries.length
        ? <TimeChart series={utilSeries.map((s) => ({ ...s, label: s.key === "cpu" ? "CPU" : s.key === "mem" ? "Memory" : "Disk" }))} startSec={startSec} endSec={endSec} compact />
        : <Empty>{connected ? "No samples in this range." : "Prometheus is not connected."}</Empty>}
    </section>
  );

  const actions = (
    <Panel title="VM Actions">
      <div className="ld-vm-actions">
        {ACTIONS.map(([icon, label]) => (
          <button key={label} type="button" className="ld-btn" disabled title="Needs the vCenter integration">
            <i className={`fa-solid ${icon}`} aria-hidden="true" /> {label}
          </button>
        ))}
      </div>
      <p className="ld-muted ld-small">Actions run through the vCenter API, which is not connected yet. They are disabled so nothing is triggered by accident.</p>
    </Panel>
  );

  const dsPanel = (
    <Panel title="Datastore Details">
      {datastore ? (
        <dl className="ld-dl">
          <dt>Datastore</dt><dd>{datastore.name}</dd>
          <dt>Total capacity</dt><dd>{fmtBytes(datastore.capacity)}</dd>
          <dt>Used space</dt><dd>{datastore.capacity != null && datastore.free != null ? `${fmtBytes(datastore.capacity - datastore.free)} (${((1 - datastore.free / datastore.capacity) * 100).toFixed(1)}%)` : "—"}</dd>
          <dt>Free space</dt><dd>{datastore.free != null && datastore.capacity ? `${fmtBytes(datastore.free)} (${((datastore.free / datastore.capacity) * 100).toFixed(1)}%)` : "—"}</dd>
          <dt>Provisioned</dt><dd>{fmtBytes(datastore.provisioned)}</dd>
          <dt>Status</dt><dd>{datastore.accessible == null ? "—" : <Pill tone={datastore.accessible ? "ok" : "crit"}>{datastore.accessible ? "Accessible" : "Not accessible"}</Pill>}</dd>
        </dl>
      ) : (
        <Empty>{invQ.data?.source === "unavailable" ? "Prometheus is not connected." : "The VMware exporter reports no datastore for this VM."}</Empty>
      )}
    </Panel>
  );

  const snapshots = (limit?: number) => (
    <Panel title={`Snapshots${inv?.snapshots ? ` (${inv.snapshots.length})` : ""}`} action={limit && inv?.snapshots?.length ? { label: "View all", onClick: () => setTab("Snapshots") } : undefined}>
      {inv?.snapshots?.length ? (
        <div className="ld-table-wrap">
          <table className="ld-table">
            <thead><tr><th scope="col">Name</th><th scope="col">Created on</th></tr></thead>
            <tbody>
              {inv.snapshots.slice(0, limit).map((s) => (
                <tr key={s.name + s.created}><td className="ld-strong">{s.name}</td><td className="ld-muted">{new Date(s.created).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>{invQ.data?.source === "unavailable" ? "Prometheus is not connected." : inv ? "No snapshots." : "No VMware exporter data for this VM."}</Empty>
      )}
    </Panel>
  );

  const disksTable = (
    <Panel title="Guest Disks">
      {inv?.disks?.length ? (
        <div className="ld-table-wrap">
          <table className="ld-table">
            <thead><tr><th scope="col">Partition</th><th scope="col">Capacity</th><th scope="col">Free</th><th scope="col">Used</th></tr></thead>
            <tbody>
              {inv.disks.map((d) => (
                <tr key={d.partition}>
                  <td className="ld-mono ld-strong">{d.partition}</td>
                  <td>{fmtBytes(d.capacity_bytes)}</td>
                  <td>{fmtBytes(d.free_bytes)}</td>
                  <td><Pill tone={d.used_pct == null ? "muted" : d.used_pct >= 90 ? "crit" : d.used_pct >= 75 ? "warn" : "ok"}>{d.used_pct == null ? "—" : `${d.used_pct}%`}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>No guest disk data. VMware Tools must be running for the exporter to report partitions.</Empty>
      )}
    </Panel>
  );

  const alertsPanel = (
    <Panel title={`Alerts (${alerts.length})`} action={{ label: "Open alert console", onClick: () => setRoute("alerts") }}>
      {alerts.length ? (
        <div className="ld-table-wrap">
          <table className="ld-table">
            <thead><tr><th scope="col">Time</th><th scope="col">Severity</th><th scope="col">Source</th><th scope="col">Message</th></tr></thead>
            <tbody>
              {alerts.map((a) => (
                <tr key={a.id}>
                  <td className="ld-muted ld-nowrap">{a.since}</td>
                  <td><Pill tone={sevTone(a.sev)}>{cap(a.sev)}</Pill></td>
                  <td className="ld-muted">{a.device}</td>
                  <td className="ld-wrap">{a.title}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>No active alerts on {vm.id} or its host.</Empty>
      )}
    </Panel>
  );

  const charts = (groups: string[]) => <MetricsBody data={m} isLoading={metrics.isLoading} isError={metrics.isError} groups={groups} quietWhenOff compact />;

  return (
    <div className="ld-dash">
      <nav className="ld-crumbs" aria-label="Breadcrumb">
        <button type="button" className="ld-link" onClick={() => setRoute("dashboard")}>Home</button>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <button type="button" className="ld-link" onClick={() => setRoute("infra-vms")}>Virtual Machines</button>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <span>VM Details</span>
      </nav>

      <div className="ld-head ld-entity-head">
        <div className="ld-entity">
          <span className="ld-tile ld-info" aria-hidden="true"><i className="fa-solid fa-cube" /></span>
          <div>
            <h1 className="ld-entity-title">
              {vm.id}
              <Pill tone={STATE_TONE[state] ?? "muted"}><i className="fa-solid fa-circle-check" aria-hidden="true" /> {cap(state)}</Pill>
            </h1>
            <p className="ld-entity-meta">
              <span>{host?.os || "VMware ESXi"}</span>
              <span className="ld-mono">{vm.ip}</span>
              <span>Site: <b>{host?.site ?? "—"}</b></span>
              <span>Uptime: <b>{up ? fmtUptime(lastOf(up)!) : "—"}</b></span>
            </p>
            <p className="ld-entity-meta">
              <span>Cluster: {inv?.cluster || vm.cluster || "—"}</span>
              <span>Host: {inv?.host || vm.host}</span>
              <span>Datastore: {datastore?.name ?? "—"}</span>
              <span>OS: {vm.os || "—"}</span>
            </p>
          </div>
        </div>
        <div className="ld-head-side">
          <div className="ld-head-actions">
            <RangeSelect />
            <LiveButton />
            <button type="button" className="ld-btn" onClick={openHost}><i className="fa-solid fa-server" aria-hidden="true" /> Open host</button>
            <button type="button" className="ld-btn" onClick={() => setRoute("infra-topology")}><i className="fa-solid fa-circle-nodes" aria-hidden="true" /> View in topology</button>
          </div>
          <ul className="ld-tags" aria-label="Tags">
            <li className="ld-tag"><i className="fa-solid fa-cube" aria-hidden="true" /> VMware</li>
            <li className="ld-tag"><i className={isWin ? "fa-brands fa-windows" : "fa-brands fa-linux"} aria-hidden="true" /> {isWin ? "Windows" : "Linux"}</li>
            {inv && <li className="ld-tag"><i className="fa-solid fa-toolbox" aria-hidden="true" /> Tools {toolsOk ? "OK" : tools || "unknown"}</li>}
          </ul>
        </div>
      </div>

      {m?.sample && <SampleNotice />}
      {!metrics.isLoading && !connected && (
        <div className="ld-card ld-metrics-off" role="status">
          <i className="fa-solid fa-plug-circle-xmark" aria-hidden="true" />
          <div>
            <b>Prometheus is not connected</b>
            <p className="ld-muted ld-small">{m?.message ?? "The metrics API is not reachable from this browser."} Cards and charts fill in once the VMware exporter is scraped. The allocations below come from the inventory.</p>
          </div>
        </div>
      )}

      <div className="ld-kpis">
        <Kpi icon="fa-microchip" tone="info" label="CPU Usage" value={cpu ? fmtValue(lastOf(cpu)!, "%") : na} sub={`of ${vm.cpu}`} points={cpu?.points} lowerIsBetter />
        <Kpi icon="fa-memory" tone="ok" label="Memory Usage" value={mem ? fmtValue(lastOf(mem)!, "%") : na} sub={`of ${vm.mem}`} points={mem?.points} color="#16a34a" lowerIsBetter />
        <Kpi icon="fa-hard-drive" tone="purple" label="Disk Usage (Total)" value={disk ? fmtValue(lastOf(disk)!, "%") : na} sub={`of ${vm.disk}`} points={disk?.points} color="#f97316" lowerIsBetter />
        <Kpi icon="fa-network-wired" tone="purple" label="Network (Total)" value={netTotal.length ? fmtValue(netTotal[netTotal.length - 1][1], "Mbps") : na} points={netTotal.length ? netTotal : undefined} color="#7c4dff" />
        <Kpi icon="fa-clock" tone="info" label="Uptime" value={up ? fmtUptime(lastOf(up)!) : na} sub={inv?.boot_time ? `since ${new Date(inv.boot_time).toLocaleDateString("en-GB", { dateStyle: "medium" })}` : undefined} />
        <Kpi icon="fa-circle-check" tone={STATE_TONE[state] ?? "muted"} label="Status" value={cap(state)} sub={inv ? `VMware Tools: ${toolsOk ? "running" : tools || "unknown"}` : `on ${vm.host}`} />
      </div>

      <div className="ld-tabs" role="tablist" aria-label={`${vm.id} sections`}>
        {TABS.map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} className={`ld-tab${tab === t ? " active" : ""}`} onClick={() => setTab(t)}>
            {t === "Alerts" ? `Alerts (${alerts.length})` : t}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <>
          <div className="ld-grid ld-vm-row">
            {info}
            <div className="ld-vm-stack">
              {utilization}
              {charts(["network"])}
            </div>
            {actions}
          </div>
          <div className="ld-grid ld-grid-3">
            {dsPanel}
            {snapshots(3)}
            <EventLogs deviceId={vm.id} kind="vms" title="Recent Events" compact onViewAll={() => setTab("Logs")} />
          </div>
        </>
      )}
      {tab === "Performance" && charts(["cpu", "memory", "disk", "disk_io", "network", "uptime"])}
      {tab === "Storage & Disks" && (<>{charts(["disk", "disk_io"])}<div className="ld-grid ld-grid-2">{disksTable}{dsPanel}</div></>)}
      {tab === "Network" && (<>{charts(["network"])}<NetworkPath vmId={vm.id} hostId={vm.host} /></>)}
      {tab === "Snapshots" && snapshots()}
      {tab === "Guest OS" && (<div className="ld-grid ld-grid-2">{info}{disksTable}</div>)}
      {tab === "Logs" && <EventLogs deviceId={vm.id} kind="vms" title={isWin ? "Windows Event Logs" : "Guest Logs"} />}
      {tab === "Alerts" && alertsPanel}
      {tab === "Topology" && <NetworkPath vmId={vm.id} hostId={vm.host} />}
      {tab === "Configuration" && (<div className="ld-grid ld-grid-2">{info}{actions}</div>)}
    </div>
  );
}
