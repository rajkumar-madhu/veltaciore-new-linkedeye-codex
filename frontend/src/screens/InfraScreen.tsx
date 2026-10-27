// Monitoring overview — LinkedEye layout: fleet status cards, sites table,
// device categories, active infrastructure alerts and a rail with the device
// status breakdown and quick actions. Every number is derived from the
// devices / sites / alerts hooks.
import "@/styles/infra.css";
import { useNav } from "@/hooks/useNav";
import { deviceRoute } from "@/lib/deviceRoute";
import { useInfraAlerts, useSites, useDevices } from "@/api/hooks";
import { DEVICE_KINDS } from "@/data/infra";
import { Donut, Empty, Legend, Panel, Pill, StatCard, fmt } from "@/components/ld";
import type { Slice, Tone } from "@/components/ld";
import type { Device } from "@/lib/types";



import { Icon } from "@/components/Icon";
import { ChevronRightIcon, FileOutputIcon, PlusIcon, WorkflowIcon } from "lucide-react";
const siteTone = (h: number): Tone => (h > 95 ? "ok" : h > 90 ? "warn" : "crit");
const siteLabel = (h: number) => (h > 95 ? "Healthy" : h > 90 ? "Degraded" : "Critical");
const sevTone = (s: string): Tone => (s === "critical" ? "crit" : s === "warn" || s === "warning" ? "warn" : "info");
const sevLabel = (s: string) => (s === "critical" ? "Critical" : s === "warn" || s === "warning" ? "Warning" : "Info");
const barColor = (t: Tone) => (t === "crit" ? "#e5383b" : t === "warn" ? "#f5a524" : "#16a34a");

const QUICK_ACTIONS: [string, string, string | null][] = [
  ["fa-magnifying-glass-arrow-right", "Discovery Scan", null],
  ["fa-rotate", "Re-poll All", null],
  ["fa-file-import", "Import CSV", null],
  ["fa-tower-broadcast", "Manage Exporters", "infra-exporters"],
  ["fa-circle-nodes", "View Topology", "infra-topology"],
  ["fa-cube", "Inventory", "infra-assets"],
];

export default function InfraScreen() {
  const { setRoute } = useNav();
  const { data: sitesData } = useSites();
  const sites = sitesData ?? [];
  const { data: alertsData } = useInfraAlerts();
  const alerts = alertsData ?? [];
  const { data: devicesData } = useDevices();
  const devices = devicesData ?? [];
  const total = devices.length;
  const ok = devices.filter(d => d.status === "ok").length;
  const warn = devices.filter(d => d.status === "warn").length;
  const crit = devices.filter(d => d.status === "critical" || d.status === "down").length;
  const other = total - ok - warn - crit;
  const regions = new Set(sites.map(s => s.region)).size;

  const byId = new Map<string, Device>(devices.map(d => [d.id, d]));
  const openDevice = (id: string, kind?: string) => {
    setRoute(deviceRoute(kind ?? byId.get(id)?.kind), { deviceId: id });
  };

  const statusSlices: Slice[] = [
    { label: "Healthy", value: ok, color: "#16a34a" },
    { label: "Warning", value: warn, color: "#f5a524" },
    { label: "Critical / down", value: crit, color: "#e5383b" },
    ...(other > 0 ? [{ label: "Unknown", value: other, color: "#98a2b3" }] : []),
  ];

  return (
    <div className="ld-dash">
      <nav className="ld-crumbs" aria-label="Breadcrumb">
        <button type="button" className="ld-link" onClick={() => setRoute("dashboard")}>Home</button>
        <Icon icon={ChevronRightIcon} />
        <span>Monitoring</span>
      </nav>

      <div className="ld-head">
        <div>
          <h1>On-Prem Infrastructure</h1>
          <p>{fmt(total)} devices monitored over SNMP, NetFlow, WMI, vSphere and node-exporter</p>
        </div>
        <div className="ld-head-actions">
          <button type="button" className="ld-btn" onClick={() => setRoute("infra-topology")}><Icon icon={WorkflowIcon} /> Topology</button>
          <button type="button" className="ld-btn"><Icon icon={FileOutputIcon} /> Export CMDB</button>
          <button type="button" className="ld-btn ld-btn-primary"><Icon icon={PlusIcon} /> Add Device</button>
        </div>
      </div>

      <div className="ld-grid ld-grid-stats ld-grid-6">
        <StatCard icon="fa-server" tone="info" label="Total devices" value={fmt(total)} note="all sites" onClick={() => setRoute("infra-assets")} />
        <StatCard icon="fa-circle-check" tone="ok" label="Healthy" value={fmt(ok)} note={total ? `${Math.round((ok / total) * 100)}% of monitored` : "—"} onClick={() => setRoute("infra-assets")} />
        <StatCard icon="fa-triangle-exclamation" tone="warn" label="Warning" value={fmt(warn)} note="thresholds breached" onClick={() => setRoute("infra-assets")} />
        <StatCard icon="fa-circle-xmark" tone="crit" label="Critical / down" value={fmt(crit)} note={crit ? "needs attention" : "all clear"} onClick={() => setRoute("infra-assets")} />
        <StatCard icon="fa-building" tone="purple" label="Sites" value={fmt(sites.length)} note={`across ${regions} region${regions === 1 ? "" : "s"}`} />
        <StatCard icon="fa-bell" tone={alerts.length ? "warn" : "ok"} label="Active alerts" value={fmt(alerts.length)} note="infrastructure" />
      </div>

      <div className="ld-split">
        <div className="ld-rail">
          <Panel title={`Sites (${sites.length})`}>
            {sites.length ? (
              <div className="ld-table-wrap">
                <table className="ld-table">
                  <thead>
                    <tr><th scope="col">Site</th><th scope="col">Region</th><th scope="col">Devices</th><th scope="col">Health</th><th scope="col">Status</th></tr>
                  </thead>
                  <tbody>
                    {sites.map(s => {
                      const t = siteTone(s.health);
                      return (
                        <tr key={s.id}>
                          <td><span className="ld-strong">{s.name}</span><span className="ld-sub ld-mono">{s.id}</span></td>
                          <td><Pill tone="muted">{s.region}</Pill></td>
                          <td>{fmt(s.devices)}</td>
                          <td>
                            <span className="ld-infra-usage">
                              <span className="ld-bar-track ld-bar-inline" role="img" aria-label={`${s.health}% healthy`}>
                                <span className="ld-bar-fill" style={{ width: `${s.health}%`, background: barColor(t) }} />
                              </span>
                              <b>{s.health}%</b>
                            </span>
                          </td>
                          <td><Pill tone={t}><span className="ld-pill-dot" />{siteLabel(s.health)}</Pill></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty>No sites reported yet.</Empty>
            )}
          </Panel>

          <Panel title="Device Categories" action={{ label: "Open inventory", onClick: () => setRoute("infra-assets") }}>
            <div className="ld-chips" role="group" aria-label="Device categories">
              {DEVICE_KINDS.map(k => (
                <button key={k.id} type="button" className="ld-chip" onClick={() => setRoute("infra-assets")}>
                  <Icon className={`${k.iconBrand ? "fa-brands" : "fa-solid"} ${k.icon}`} />
                  <span className="ld-chip-count">{devices.filter(d => d.kind === k.id).length}</span>
                  <span className="ld-chip-label">{k.label}</span>
                </button>
              ))}
            </div>
          </Panel>

          <Panel title={`Active Infrastructure Alerts (${alerts.length})`} action={{ label: "Open alert console", onClick: () => setRoute("alerts") }}>
            {alerts.length ? (
              <div className="ld-table-wrap">
                <table className="ld-table">
                  <thead>
                    <tr><th scope="col">Device</th><th scope="col">Severity</th><th scope="col">Alert</th><th scope="col">Detail</th><th scope="col">Since</th><th scope="col">Rule</th></tr>
                  </thead>
                  <tbody>
                    {alerts.map(a => (
                      <tr key={a.id}>
                        <td><button type="button" className="ld-link ld-mono" onClick={() => openDevice(a.device, a.deviceKind)}>{a.device}</button></td>
                        <td><Pill tone={sevTone(a.sev)}><span className="ld-pill-dot" />{sevLabel(a.sev)}</Pill></td>
                        <td className="ld-strong ld-wrap">{a.title}</td>
                        <td className="ld-muted ld-wrap">{a.detail}</td>
                        <td className="ld-muted ld-nowrap">{a.since}</td>
                        <td className="ld-muted ld-mono">{a.rule}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty>No active infrastructure alerts.</Empty>
            )}
          </Panel>
        </div>

        <div className="ld-rail">
          <Panel title="Device Status">
            <div className="ld-donut-row">
              <Donut slices={statusSlices} center={fmt(total)} sub="Devices" label={`${ok} healthy, ${warn} warning and ${crit} critical or down devices`} />
              <Legend slices={statusSlices} />
            </div>
          </Panel>

          <Panel title="Quick Actions">
            <div className="ld-infra-actions">
              {QUICK_ACTIONS.map(([ic, lbl, route]) => (
                <button key={lbl} type="button" className="ld-btn ld-btn-sm" onClick={() => { if (route) setRoute(route); }}>
                  <Icon className={`fa-solid ${ic}`} /> {lbl}
                </button>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
