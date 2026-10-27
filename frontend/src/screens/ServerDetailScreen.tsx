// Server node page (Windows / Linux / hypervisor) in the Netdata Cloud
// layout: header with OS, IP, uptime, agent and tags; six KPI cards with a
// trend and change over the selected range; tabbed CPU / memory / disk /
// network charts; iDRAC / iLO cards; recent alerts; top processes; services;
// event logs; relationships (VMs, NIC → switch port).
//
// Every number comes from a live source: Prometheus (…/metrics/, …/inventory/,
// …/hardware/), Loki (…/logs/) or the inventory API. When a source is not
// connected the panel says so; nothing is filled in with sample values.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { useUiStore } from "@/store/ui";
import { useTimeRange } from "@/store/timeRange";
import { useDevice, useDeviceHardware, useDeviceInventory, useDeviceMetrics, useInfraAlerts, } from "@/api/hooks";
import { DEVICES } from "@/data/infra";
import type { Device } from "@/lib/types";
import { Donut, Empty, Panel, Pill } from "@/components/ld";
import type { Tone } from "@/components/ld";
import { LiveButton, MetricsBody, RangeSelect, fmtValue, SampleNotice } from "@/components/MetricCharts";
import { Kpi, lastOf, seriesOf } from "@/components/KpiCard";
import { DeviceFamily } from "@/components/DeviceFamily";
import { EventLogs, FilesystemTable, HardwareSection, ProcessTable, ServicesPanel, serviceSlices } from "@/components/HostPanels";

const SERVER_KINDS = ["hypervisor", "phys-srv", "linux-srv", "win-srv"];

const STATUS: Record<string, { label: string; tone: Tone }> = {
  ok: { label: "Online", tone: "ok" },
  warn: { label: "Warning", tone: "warn" },
  critical: { label: "Critical", tone: "crit" },
  down: { label: "Offline", tone: "crit" },
  unknown: { label: "Unknown", tone: "muted" },
};

const sevTone = (s: string): Tone => (s === "critical" ? "crit" : s === "warning" || s === "warn" ? "warn" : "info");
const sevLabel = (s: string) => (s === "critical" ? "Critical" : s === "warning" || s === "warn" ? "Warning" : "Info");

function osOf(d: Device) {
  const os = `${d.os} ${d.kind}`.toLowerCase();
  if (os.includes("windows") || d.kind === "win-srv") return { name: "Windows", icon: "fa-brands fa-windows", cls: "ld-os-win" };
  if (d.kind === "hypervisor" || os.includes("esxi")) return { name: "VMware ESXi", icon: "fa-solid fa-server", cls: "ld-os-esx" };
  return { name: "Linux", icon: "fa-brands fa-linux", cls: "ld-os-linux" };
}

const isVirtual = (d: Device) => /^vm\b/i.test(d.model || "") || d.kind === "vm";

// ── Screen ──────────────────────────────────────────────────────────────────
export default function ServerDetailScreen() {
  const { setRoute } = useNav();
  const paramId = useUiStore((s) => s.params.deviceId as string | undefined);
  const seed = DEVICES.find((x) => x.id === paramId && SERVER_KINDS.includes(x.kind))
    ?? DEVICES.find((x) => x.kind === "hypervisor") ?? DEVICES[0];
  const { data: live } = useDevice(paramId ?? seed.id);
  const d: Device = live ?? seed;

  const { preset, from, to } = useTimeRange();
  const metrics = useDeviceMetrics(d.id, preset, from, to);
  const inventory = useDeviceInventory(d.id, 25);
  const hardware = useDeviceHardware(d.id, preset, from, to);
  const alerts = (useInfraAlerts().data ?? []).filter((a) => a.device === d.id);
  const [tab, setTab] = React.useState("Overview");
  React.useEffect(() => setTab("Overview"), [d.id]);

  const m = metrics.data;
  const connected = m?.source === "prometheus";
  const os = osOf(d);
  const st = STATUS[d.status] ?? STATUS.unknown;
  const controllers = hardware.data?.controllers ?? [];
  const inv = inventory.data;

  // KPI values
  const cpu = seriesOf(m, "cpu"), mem = seriesOf(m, "mem"), disk = seriesOf(m, "disk");
  const rx = seriesOf(m, "net_rx"), tx = seriesOf(m, "net_tx"), procs = seriesOf(m, "processes");
  const memUsed = lastOf(seriesOf(m, "mem_used_gb")), memTotal = lastOf(seriesOf(m, "mem_total_gb"));
  const netTotal: [number, number][] = rx && tx
    ? rx.points.map(([t, v]) => [t, v + (tx.points.find((p) => p[0] === t)?.[1] ?? 0)])
    : (rx ?? tx)?.points ?? [];
  const na = connected ? "—" : "n/a";
  const svc = inv?.services;
  const svcTotal = svc ? svc.running + svc.stopped + svc.other : 0;

  const tabs = [
    "Overview", "CPU", "Memory", "Disks", "Network", "Processes", "Services", "Event Logs",
    controllers.length ? "Hardware (iDRAC/iLO)" : "Hardware", `Alerts (${alerts.length})`, "Relationships", "Configuration",
  ];
  const is = (name: string) => tab === name || (name === "Hardware" && tab.startsWith("Hardware")) || (name === "Alerts" && tab.startsWith("Alerts"));
  const goTab = (prefix: string) => setTab(tabs.find((t) => t.startsWith(prefix)) ?? "Overview");

  const tags: { icon: string; label: string }[] = [
    ...(d.role ? [{ icon: "fa-solid fa-tag", label: d.role }] : []),
    { icon: os.icon, label: os.name },
    { icon: "fa-solid fa-cube", label: isVirtual(d) ? "Virtual Machine" : d.kind === "hypervisor" ? "Hypervisor" : "Physical Server" },
    ...controllers.map((c) => ({ icon: "fa-solid fa-microchip", label: c.kind === "idrac" ? "Dell iDRAC" : c.kind === "ilo" ? "HPE iLO" : c.vendor })),
  ];

  const alertsTable = (limit?: number) => (
    <Panel title="Recent Alerts" action={limit ? { label: "View all alerts", onClick: () => goTab("Alerts") } : { label: "Open alert console", onClick: () => setRoute("alerts") }}>
      {alerts.length ? (
        <div className="ld-table-wrap">
          <table className="ld-table">
            <thead><tr><th scope="col">Time</th><th scope="col">Severity</th><th scope="col">Source</th><th scope="col">Message</th></tr></thead>
            <tbody>
              {alerts.slice(0, limit).map((a) => (
                <tr key={a.id}>
                  <td className="ld-nowrap ld-muted">{a.since}</td>
                  <td><Pill tone={sevTone(a.sev)}><i className={`fa-solid ${a.sev === "critical" ? "fa-circle-xmark" : a.sev === "warning" || a.sev === "warn" ? "fa-triangle-exclamation" : "fa-circle-info"}`} aria-hidden="true" /> {sevLabel(a.sev)}</Pill></td>
                  <td className="ld-muted">{a.detail || a.device}</td>
                  <td className="ld-wrap">{a.title}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>No active alerts on {d.id}.</Empty>
      )}
    </Panel>
  );

  const configPanel = (
    <div className="ld-grid ld-grid-2">
      <Panel title="Device Information">
        <dl className="ld-dl">
          <dt>Hostname</dt><dd>{d.hostname || d.id}</dd>
          <dt>IP address</dt><dd className="ld-mono">{d.ip || "—"}</dd>
          <dt>Model</dt><dd>{d.model || "—"}</dd>
          <dt>Vendor</dt><dd>{d.vendor || "—"}</dd>
          <dt>Serial number</dt><dd className="ld-mono">{d.serial_number || "—"}</dd>
          <dt>Operating system</dt><dd>{d.os || "—"}</dd>
          <dt>Site / location</dt><dd>{d.site}{d.location ? ` · ${d.location}` : ""}</dd>
          <dt>Role</dt><dd>{d.role || "—"}</dd>
        </dl>
      </Panel>
      <Panel title="Monitoring">
        <dl className="ld-dl">
          <dt>Agent</dt><dd>{d.agent || "—"}</dd>
          <dt>Metric family</dt><dd>{m?.family ?? "—"}</dd>
          <dt>Metrics source</dt><dd>{m?.sample ? <Pill tone="muted">Sample data</Pill> : connected ? <Pill tone="ok">Prometheus · connected</Pill> : <Pill tone="muted">{m?.source === "unsupported" ? "Not supported" : "Not connected"}</Pill>}</dd>
          <dt>Out-of-band</dt><dd>{controllers.length ? controllers.map((c) => c.id).join(", ") : "None linked"}</dd>
          <dt>Uptime</dt><dd>{d.uptime || "—"}</dd>
          <dt>Last seen</dt><dd>{d.lastSeen || "—"}</dd>
        </dl>
      </Panel>
    </div>
  );

  const charts = (groups: string[]) => <MetricsBody data={m} isLoading={metrics.isLoading} isError={metrics.isError} groups={groups} quietWhenOff compact />;
  const memGroup = m?.series.some((s) => s.group === "memory_gb" && s.points.length) ? "memory_gb" : "memory";

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
          <span className={`ld-os-logo ${os.cls}`} aria-hidden="true"><i className={os.icon} /></span>
          <div>
            <h1 className="ld-entity-title">
              {d.hostname || d.id}
              <Pill tone={st.tone}><i className="fa-solid fa-circle-check" aria-hidden="true" /> {st.label}</Pill>
            </h1>
            <p className="ld-entity-meta">
              <span>{d.os || os.name}</span>
              <span className="ld-mono">{d.ip}</span>
              <span>Uptime: <b>{d.uptime || "—"}</b></span>
            </p>
            <p className="ld-entity-meta">
              <span>{d.agent || "No agent"}</span>
              <span>Last seen: {d.lastSeen || "—"}</span>
            </p>
          </div>
        </div>
        <div className="ld-head-side">
          <div className="ld-head-actions">
            <RangeSelect />
            <LiveButton />
            <button type="button" className="ld-btn" onClick={() => setRoute("infra-topology")}><i className="fa-solid fa-circle-nodes" aria-hidden="true" /> View in map</button>
            <button type="button" className="ld-btn" onClick={() => goTab("Event Logs")}><i className="fa-solid fa-file-lines" aria-hidden="true" /> Logs</button>
          </div>
          <ul className="ld-tags" aria-label="Tags">
            {tags.map((t) => (
              <li key={t.label} className="ld-tag"><i className={t.icon} aria-hidden="true" /> {t.label}</li>
            ))}
          </ul>
        </div>
      </div>

      {m?.sample && <SampleNotice />}
      {!metrics.isLoading && !connected && (
        <div className="ld-card ld-metrics-off" role="status">
          <i className="fa-solid fa-plug-circle-xmark" aria-hidden="true" />
          <div>
            <b>{m?.source === "unsupported" ? "No metrics for this device type yet" : "Prometheus is not connected"}</b>
            <p className="ld-muted ld-small">{m?.message ?? "The metrics API is not reachable from this browser."} Cards and charts fill in once the exporter is scraped.</p>
          </div>
        </div>
      )}

      <div className="ld-kpis">
        <Kpi icon="fa-microchip" tone="info" label="CPU Usage" value={cpu ? fmtValue(lastOf(cpu)!, "%") : na} points={cpu?.points} lowerIsBetter />
        <Kpi icon="fa-memory" tone="ok" label="Memory Usage" value={mem ? fmtValue(lastOf(mem)!, "%") : na}
          sub={memUsed != null && memTotal != null ? `${memUsed.toFixed(1)} / ${memTotal.toFixed(0)} GB` : undefined}
          points={mem?.points} color="#16a34a" lowerIsBetter />
        <Kpi icon="fa-hard-drive" tone="warn" label={os.name === "Windows" ? "Disk Usage (C:)" : "Disk Usage"} value={disk ? fmtValue(lastOf(disk)!, "%") : na}
          sub={disk ? disk.label : undefined} points={disk?.points} color="#f97316" lowerIsBetter />
        <Kpi icon="fa-network-wired" tone="purple" label="Network (Total)" value={netTotal.length ? fmtValue(netTotal[netTotal.length - 1][1], "Mbps") : na}
          sub={rx || tx ? <><span><i className="fa-solid fa-arrow-down" aria-hidden="true" /> {rx ? fmtValue(lastOf(rx)!, "Mbps") : "—"}</span> <span><i className="fa-solid fa-arrow-up" aria-hidden="true" /> {tx ? fmtValue(lastOf(tx)!, "Mbps") : "—"}</span></> : undefined}
          points={netTotal.length ? netTotal : undefined} color="#7c4dff" />
        <Kpi icon="fa-gears" tone="info" label="Processes" value={procs ? String(Math.round(lastOf(procs)!)) : na} points={procs?.points} />
        <Kpi icon="fa-cubes" tone="purple" label="Services">
          {svc && svcTotal ? (
            <>
              <div className="ld-kpi-value"><b>{Math.round((svc.running / svcTotal) * 100)}% running</b></div>
              <div className="ld-kpi-donut">
                <Donut slices={serviceSlices(inv)} center="" label={`${svc.running} of ${svcTotal} services running`} />
                <ul className="ld-kpi-legend">
                  {serviceSlices(inv).map((s) => <li key={s.label}><span className="ld-dot" style={{ background: s.color }} /> {s.label} <b>{s.value}</b></li>)}
                </ul>
              </div>
            </>
          ) : (
            <div className="ld-kpi-value"><b>{na}</b><span className="ld-kpi-sub">{inv?.source === "unsupported" ? "not collected" : inventory.isLoading ? "loading" : "no data"}</span></div>
          )}
        </Kpi>
      </div>

      <div className="ld-tabs" role="tablist" aria-label={`${d.id} sections`}>
        {tabs.map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} className={`ld-tab${tab === t ? " active" : ""}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {is("Overview") && (
        <>
          {charts(["cpu", memGroup, "disk_io", "network"])}
          <HardwareSection hw={hardware.data} loading={hardware.isLoading} onDetails={() => goTab("Hardware")} />
          <div className="ld-grid ld-grid-2">
            {alertsTable(5)}
            <ProcessTable inv={inv} loading={inventory.isLoading} limit={5} onViewAll={() => goTab("Processes")} />
          </div>
        </>
      )}
      {is("CPU") && charts(["cpu", "load"])}
      {is("Memory") && charts(["memory_gb", "memory"])}
      {is("Disks") && (<>{charts(["disk", "disk_io"])}<FilesystemTable inv={inv} loading={inventory.isLoading} /></>)}
      {is("Network") && (<>{charts(["network"])}<DeviceFamily deviceId={d.id} /></>)}
      {is("Processes") && <ProcessTable inv={inv} loading={inventory.isLoading} />}
      {is("Services") && <ServicesPanel inv={inv} loading={inventory.isLoading} />}
      {is("Event Logs") && <EventLogs deviceId={d.id} title={os.name === "Windows" ? "Windows Event Logs" : "System Logs"} />}
      {is("Hardware") && <HardwareSection hw={hardware.data} loading={hardware.isLoading} detailed />}
      {is("Alerts") && alertsTable()}
      {is("Relationships") && <DeviceFamily deviceId={d.id} />}
      {is("Configuration") && configPanel}
    </div>
  );
}
