// Alert console — opened from the header bell. Every active alert raised by
// device monitoring: severity summary cards, a severity / site / search filter
// bar, the alert table (device opens its detail page) and by-rule / by-site
// breakdowns. Live data only (/infra/alerts/, /infra/devices/); the API has no
// acknowledge / resolve endpoint yet, so the console is read-only.
import React from "react";
import "@/styles/observe.css";
import { useNav } from "@/hooks/useNav";
import { deviceRoute } from "@/lib/deviceRoute";
import { useDevices, useInfraAlerts } from "@/api/hooks";
import type { InfraAlert } from "@/lib/types";
import { Empty, PALETTE, Panel, Pill, StatCard, countBy, fmt } from "@/components/ld";
import type { Tone } from "@/components/ld";


import { Icon } from "@/components/Icon";
import { ChevronRightIcon, FilterIcon, LayersIcon, SearchIcon, SlidersHorizontalIcon } from "lucide-react";
type Sev = "critical" | "warning" | "info";
const sevOf = (s: string): Sev => (s === "critical" ? "critical" : s === "warning" || s === "warn" ? "warning" : "info");
const SEV: Record<Sev, { label: string; tone: Tone; icon: string; rank: number }> = {
  critical: { label: "Critical", tone: "crit", icon: "fa-circle-xmark", rank: 0 },
  warning: { label: "Warning", tone: "warn", icon: "fa-triangle-exclamation", rank: 1 },
  info: { label: "Info", tone: "info", icon: "fa-circle-info", rank: 2 },
};

const ANY = "";

export default function AlertsScreen() {
  const { setRoute } = useNav();
  const alertsQ = useInfraAlerts();
  const alerts = alertsQ.data ?? [];
  const devices = useDevices().data ?? [];
  const idp = React.useId();

  const [sev, setSev] = React.useState(ANY);
  const [site, setSite] = React.useState(ANY);
  const [query, setQuery] = React.useState("");

  const kindOf = React.useMemo(() => new Map(devices.map((d) => [d.id, d.kind])), [devices]);
  const openDevice = (a: InfraAlert) => {
    setRoute(deviceRoute(a.deviceKind ?? kindOf.get(a.device)), { deviceId: a.device });
  };

  const bySev = (s: Sev) => alerts.filter((a) => sevOf(a.sev) === s).length;
  const sites = countBy(alerts, (a) => a.site || "—").map(([s]) => s).sort();

  const q = query.trim().toLowerCase();
  const visible = alerts
    .filter((a) => {
      if (sev && sevOf(a.sev) !== sev) return false;
      if (site && (a.site || "—") !== site) return false;
      if (q && ![a.title, a.detail, a.device, a.rule, a.id].some((v) => (v ?? "").toLowerCase().includes(q))) return false;
      return true;
    })
    .sort((a, b) => SEV[sevOf(a.sev)].rank - SEV[sevOf(b.sev)].rank);

  const reset = () => { setSev(ANY); setSite(ANY); setQuery(""); };

  const byRule = countBy(alerts, (a) => a.rule || "—").slice(0, 8);
  const ruleMax = byRule[0]?.[1] ?? 1;
  const bySite = countBy(alerts, (a) => a.site || "—").slice(0, 8);
  const siteMax = bySite[0]?.[1] ?? 1;
  const affected = new Set(alerts.map((a) => a.device)).size;

  return (
    <div className="ld-dash">
      <nav className="ld-crumbs" aria-label="Breadcrumb">
        <button type="button" className="ld-link" onClick={() => setRoute("dashboard")}>Home</button>
        <Icon icon={ChevronRightIcon} />
        <button type="button" className="ld-link" onClick={() => setRoute("infra")}>Monitoring</button>
        <Icon icon={ChevronRightIcon} />
        <span>Alerts</span>
      </nav>

      <div className="ld-head">
        <div>
          <h1>Alert Console</h1>
          <p>Active alerts raised by device monitoring across every site · refreshes every 30s</p>
        </div>
        <div className="ld-head-actions">
          <button type="button" className="ld-btn" onClick={() => setRoute("alert-grouping")}>
            <Icon icon={LayersIcon} /> Alert grouping
          </button>
          <button type="button" className="ld-btn" onClick={() => setRoute("monitors")}>
            <Icon icon={SlidersHorizontalIcon} /> Monitors
          </button>
        </div>
      </div>

      <div className="ld-grid ld-grid-stats">
        <StatCard icon="fa-bell" tone="info" label="Active alerts" value={fmt(alerts.length)} note={`${fmt(affected)} devices affected`} onClick={reset} />
        <StatCard icon={SEV.critical.icon} tone="crit" label="Critical" value={fmt(bySev("critical"))} note="needs response now" onClick={() => setSev("critical")} />
        <StatCard icon={SEV.warning.icon} tone="warn" label="Warning" value={fmt(bySev("warning"))} note="at risk" onClick={() => setSev("warning")} />
        <StatCard icon={SEV.info.icon} tone="ok" label="Info" value={fmt(bySev("info"))} note="informational" onClick={() => setSev("info")} />
      </div>

      <form
        className="ld-card ld-filters"
        onSubmit={(e) => e.preventDefault()}
        onReset={(e) => { e.preventDefault(); reset(); }}
      >
        <span className="ld-filter-icon" aria-hidden="true"><Icon icon={FilterIcon} /></span>
        <div className="ld-field">
          <label htmlFor={`${idp}-sev`}>Severity</label>
          <select id={`${idp}-sev`} className="ld-select" value={sev} onChange={(e) => setSev(e.target.value)}>
            <option value={ANY}>All severities</option>
            {(Object.keys(SEV) as Sev[]).map((s) => <option key={s} value={s}>{SEV[s].label}</option>)}
          </select>
        </div>
        <div className="ld-field">
          <label htmlFor={`${idp}-site`}>Site</label>
          <select id={`${idp}-site`} className="ld-select" value={site} onChange={(e) => setSite(e.target.value)}>
            <option value={ANY}>All sites</option>
            {sites.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="ld-field ld-field-grow">
          <label htmlFor={`${idp}-q`} className="sr-only">Search alerts</label>
          <span className="ld-search">
            <Icon icon={SearchIcon} />
            <input id={`${idp}-q`} type="search" placeholder="Search by alert, device, rule or ID…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </span>
        </div>
        <button type="reset" className="ld-btn">Reset</button>
      </form>

      <div className="ld-split">
        <section className="ld-card ld-panel" aria-labelledby={`${idp}-list-h`}>
          <div className="ld-panel-head">
            <h2 id={`${idp}-list-h`}>Alerts ({fmt(visible.length)})</h2>
            <span className="ld-muted ld-small">Read-only · acknowledge and resolve from the source monitor</span>
          </div>
          {alertsQ.isLoading ? (
            <Empty>Loading alerts…</Empty>
          ) : visible.length ? (
            <div className="ld-table-wrap">
              <table className="ld-table">
                <thead>
                  <tr>
                    <th scope="col">Severity</th>
                    <th scope="col">Alert</th>
                    <th scope="col">Device</th>
                    <th scope="col">Site</th>
                    <th scope="col">Rule</th>
                    <th scope="col">Since</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((a) => {
                    const s = SEV[sevOf(a.sev)];
                    return (
                      <tr key={a.id}>
                        <td><Pill tone={s.tone}><Icon className={`fa-solid ${s.icon}`} /> {s.label}</Pill></td>
                        <td className="ld-wrap">
                          <span className="ld-strong">{a.title}</span>
                          {a.detail && <span className="ld-sub">{a.detail}</span>}
                        </td>
                        <td>
                          <button type="button" className="ld-link ld-mono" onClick={() => openDevice(a)} title={`Open ${a.device}`}>
                            {a.device}
                          </button>
                        </td>
                        <td className="ld-muted">{a.site || "—"}</td>
                        <td><span className="ld-mono-name">{a.rule || "—"}</span></td>
                        <td className="ld-muted ld-nowrap">{a.since}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>{alerts.length ? "No alerts match these filters." : alertsQ.isError ? "The alerts API is not reachable from this browser." : "No active alerts. All clear."}</Empty>
          )}
        </section>

        <div className="ld-rail">
          <Panel title="Alerts by rule">
            {byRule.length ? (
              <ul className="ld-bars">
                {byRule.map(([label, value], i) => (
                  <li key={label}>
                    <span className="ld-bar-label ld-mono" title={label}>{label}</span>
                    <span className="ld-bar-track">
                      <span className="ld-bar-fill" style={{ width: `${(value / ruleMax) * 100}%`, background: PALETTE[i % PALETTE.length] }} />
                    </span>
                    <span className="ld-bar-value">{value}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No active alerts.</Empty>
            )}
          </Panel>
          <Panel title="Alerts by site">
            {bySite.length ? (
              <ul className="ld-bars">
                {bySite.map(([label, value], i) => (
                  <li key={label}>
                    <span className="ld-bar-label">
                      <button type="button" className="ld-link" onClick={() => setSite(label)}>{label}</button>
                    </span>
                    <span className="ld-bar-track">
                      <span className="ld-bar-fill" style={{ width: `${(value / siteMax) * 100}%`, background: PALETTE[(i + 2) % PALETTE.length] }} />
                    </span>
                    <span className="ld-bar-value">{value}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No active alerts.</Empty>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
