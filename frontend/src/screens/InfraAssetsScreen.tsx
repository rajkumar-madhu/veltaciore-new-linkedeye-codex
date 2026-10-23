// Asset inventory — LinkedEye list layout: status summary cards, device-kind
// chips, a searchable / filterable device table and a site summary rail.
// Each device opens its detail page (server, switch, firewall, … or the
// generic device monitoring page) with { deviceId }.
import React from "react";
import "@/styles/infra.css";
import { useNav } from "@/hooks/useNav";
import { useDevices } from "@/api/hooks";
import { SITES, DEVICE_KINDS } from "@/data/infra";
import { Empty, Panel, Pill, StatCard, fmt } from "@/components/ld";
import type { Tone } from "@/components/ld";
import type { DeviceKind } from "@/lib/types";

const SERVER_KINDS = ["hypervisor", "phys-srv", "linux-srv", "win-srv"];

/** Detail route for a device, by kind. */
function deviceRoute(kind: string) {
  if (SERVER_KINDS.includes(kind)) return "server-detail";
  if (kind === "switch") return "switch-detail";
  if (kind === "firewall") return "firewall-detail";
  if (kind === "storage") return "storage-detail";
  if (kind === "loadbal") return "loadbal-detail";
  if (kind === "ups") return "ups-detail";
  return "infra-device";
}

const statusTone = (s: string): Tone => (s === "ok" ? "ok" : s === "warn" ? "warn" : s === "critical" || s === "down" ? "crit" : "muted");
const statusLabel = (s: string) => (s === "ok" ? "Healthy" : s === "warn" ? "Warning" : s === "down" ? "Down" : s === "critical" ? "Critical" : "Unknown");
const usageTone = (v: number): Tone => (v > 80 ? "crit" : v > 65 ? "warn" : "ok");
const barColor = (t: Tone) => (t === "crit" ? "#e5383b" : t === "warn" ? "#f5a524" : "#16a34a");
const siteTone = (h: number): Tone => (h > 95 ? "ok" : h > 90 ? "warn" : "crit");

function Usage({ v, label }: { v: number; label: string }) {
  if (!(v > 0)) return <span className="ld-muted">—</span>;
  return (
    <span className="ld-infra-usage">
      <span className="ld-bar-track ld-bar-inline" role="img" aria-label={`${label} ${v}%`}>
        <span className="ld-bar-fill" style={{ width: `${Math.min(100, v)}%`, background: barColor(usageTone(v)) }} />
      </span>
      <b>{v}%</b>
    </span>
  );
}

const QUICK_ACTIONS: [string, string, string | null][] = [
  ["fa-magnifying-glass-arrow-right", "Run Discovery", null],
  ["fa-file-import", "Import CSV", null],
  ["fa-circle-nodes", "Topology", "infra-topology"],
  ["fa-tower-broadcast", "Exporters", "infra-exporters"],
  ["fa-plus", "Onboard", null],
  ["fa-file-csv", "Export", null],
];

export default function InfraAssetsScreen() {
  const { setRoute } = useNav();
  const { data } = useDevices();
  const devices = data ?? [];
  const [kind, setKind] = React.useState("all");
  const [site, setSite] = React.useState("all");
  const [q, setQ] = React.useState("");
  const filtered = devices.filter(d =>
    (kind === "all" || d.kind === kind) &&
    (site === "all" || d.site === site) &&
    (q === "" || (d.id + d.model + d.role + d.ip).toLowerCase().includes(q.toLowerCase()))
  );
  const kindMeta = (id: string) => (DEVICE_KINDS.find(k => k.id === id) || {}) as Partial<DeviceKind>;
  const iconOf = (k: Partial<DeviceKind>) => `${k.iconBrand ? "fa-brands" : "fa-solid"} ${k.icon ?? "fa-cube"}`;

  const healthy = devices.filter(d => d.status === "ok").length;
  const warning = devices.filter(d => d.status === "warn").length;
  const critical = devices.filter(d => d.status === "critical" || d.status === "down").length;

  return (
    <div className="ld-dash">
      <nav className="ld-crumbs" aria-label="Breadcrumb">
        <button type="button" className="ld-link" onClick={() => setRoute("dashboard")}>Home</button>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <button type="button" className="ld-link" onClick={() => setRoute("infra")}>Monitoring</button>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <span>Asset Inventory</span>
      </nav>

      <div className="ld-head">
        <div>
          <h1>Asset Inventory</h1>
          <p>Every monitored device across sites and device classes</p>
        </div>
        <div className="ld-head-actions">
          <button type="button" className="ld-btn"><i className="fa-solid fa-file-csv" aria-hidden="true" /> Export</button>
          <button type="button" className="ld-btn"><i className="fa-solid fa-magnifying-glass-arrow-right" aria-hidden="true" /> Discovery</button>
          <button type="button" className="ld-btn ld-btn-primary"><i className="fa-solid fa-plus" aria-hidden="true" /> Onboard</button>
        </div>
      </div>

      <div className="ld-grid ld-grid-stats ld-grid-6">
        <StatCard icon="fa-boxes-stacked" tone="info" label="Total" value={fmt(devices.length)} note="all assets" onClick={() => setKind("all")} />
        <StatCard icon="fa-circle-check" tone="ok" label="Healthy" value={fmt(healthy)} note="reporting OK" />
        <StatCard icon="fa-triangle-exclamation" tone="warn" label="Warning" value={fmt(warning)} note="thresholds breached" />
        <StatCard icon="fa-circle-xmark" tone="crit" label="Critical" value={fmt(critical)} note="urgent" />
        <StatCard icon="fa-layer-group" tone="purple" label="Device kinds" value={fmt(DEVICE_KINDS.length)} note="categories" />
        <StatCard icon="fa-building" tone="muted" label="Sites" value={fmt(SITES.length)} note="datacenters" onClick={() => setSite("all")} />
      </div>

      <div className="ld-chips" role="group" aria-label="Filter by device kind">
        <button type="button" className={`ld-chip${kind === "all" ? " active" : ""}`} aria-pressed={kind === "all"} onClick={() => setKind("all")}>
          <i className="fa-solid fa-layer-group" aria-hidden="true" />
          <span className="ld-chip-label">All</span>
          <span className="ld-chip-count">{devices.length}</span>
        </button>
        {DEVICE_KINDS.map(k => {
          const n = devices.filter(d => d.kind === k.id).length;
          if (n === 0) return null;
          return (
            <button key={k.id} type="button" className={`ld-chip${kind === k.id ? " active" : ""}`} aria-pressed={kind === k.id} onClick={() => setKind(k.id)}>
              <i className={iconOf(k)} aria-hidden="true" />
              <span className="ld-chip-label">{k.label}</span>
              <span className="ld-chip-count">{n}</span>
            </button>
          );
        })}
      </div>

      <div className="ld-split">
        <section className="ld-card ld-panel" aria-labelledby="assets-h">
          <div className="ld-panel-head">
            <h2 id="assets-h">Inventory ({fmt(filtered.length)})</h2>
          </div>
          <div className="ld-toolbar">
            <label htmlFor="assets-search" className="sr-only">Search devices</label>
            <span className="ld-search ld-field-grow">
              <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
              <input id="assets-search" type="search" placeholder="Search hostname, IP, model, role…" value={q} onChange={e => setQ(e.target.value)} />
            </span>
            <label htmlFor="assets-kind" className="sr-only">Device kind</label>
            <select id="assets-kind" className="ld-select" value={kind} onChange={e => setKind(e.target.value)}>
              <option value="all">All kinds</option>
              {DEVICE_KINDS.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
            </select>
            <label htmlFor="assets-site" className="sr-only">Site</label>
            <select id="assets-site" className="ld-select" value={site} onChange={e => setSite(e.target.value)}>
              <option value="all">All sites</option>
              {SITES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          {filtered.length ? (
            <div className="ld-table-wrap">
              <table className="ld-table">
                <thead>
                  <tr>
                    <th scope="col">Device</th>
                    <th scope="col"><span className="sr-only">Select</span></th>
                    <th scope="col">Kind</th>
                    <th scope="col">Site</th>
                    <th scope="col">IP</th>
                    <th scope="col">OS / firmware</th>
                    <th scope="col">CPU</th>
                    <th scope="col">Memory</th>
                    <th scope="col">Status</th>
                    <th scope="col">Last seen</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(d => {
                    const k = kindMeta(d.kind);
                    return (
                      <tr key={d.id}>
                        <td>
                          <div className="ld-infra-cell">
                            <span className="ld-infra-kind" aria-hidden="true"><i className={iconOf(k)} /></span>
                            <div>
                              <button type="button" className="ld-link ld-mono" onClick={() => setRoute(deviceRoute(d.kind), { deviceId: d.id })}>{d.id}</button>
                              <span className="ld-sub">{d.role}</span>
                            </div>
                          </div>
                        </td>
                        <td><input type="checkbox" aria-label={`Select ${d.id}`} /></td>
                        <td><Pill tone="muted">{k.label ?? d.kind}</Pill></td>
                        <td className="ld-muted ld-mono">{d.site}</td>
                        <td className="ld-mono">{d.ip}</td>
                        <td>{d.os}<span className="ld-sub">up {d.uptime}</span></td>
                        <td><Usage v={d.cpu} label="CPU" /></td>
                        <td><Usage v={d.mem} label="Memory" /></td>
                        <td><Pill tone={statusTone(d.status)}><span className="ld-pill-dot" />{statusLabel(d.status)}</Pill></td>
                        <td className="ld-muted ld-nowrap">{d.lastSeen}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>{devices.length ? "No devices match these filters." : "No devices reported yet."}</Empty>
          )}
        </section>

        <div className="ld-rail">
          <Panel title="Site Summary">
            <dl className="ld-dl">
              {SITES.map(s => (
                <React.Fragment key={s.id}>
                  <dt>{s.name}</dt>
                  <dd>{fmt(s.devices)} devices · <Pill tone={siteTone(s.health)}>{s.health}%</Pill></dd>
                </React.Fragment>
              ))}
            </dl>
          </Panel>
          <Panel title="Quick Actions">
            <div className="ld-infra-actions">
              {QUICK_ACTIONS.map(([ic, l, route]) => (
                <button key={l} type="button" className="ld-btn ld-btn-sm" onClick={() => { if (route) setRoute(route); }}>
                  <i className={`fa-solid ${ic}`} aria-hidden="true" /> {l}
                </button>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
