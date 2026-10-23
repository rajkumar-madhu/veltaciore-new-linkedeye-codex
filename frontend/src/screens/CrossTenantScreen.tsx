// Cross-client view (admins): one row per client with live counts from
// GET /api/tenants-summary/ — open tickets, SLA, active incidents, open
// changes, device health and alerts. Read without a client header, so the
// policy limits it to admins. Clicking a client switches to it and opens its
// dashboard.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { NO_TENANT, useUiStore } from "@/store/ui";
import type { Tenant } from "@/lib/types";
import { useCrossClientSummary, useTenants, type ClientSummary } from "@/api/hooks";
import { ApiError } from "@/api/client";
import { Empty, Panel, Pill, StatCard, fmt } from "@/components/ld";
import type { Tone } from "@/components/ld";
import { colorFor } from "@/components/Shell";

type SortKey = "name" | "sev1" | "incidents_active" | "tickets_open" | "devices_online_pct" | "alerts_critical";

const healthTone = (pct: number | null): Tone => (pct == null ? "muted" : pct >= 98 ? "ok" : pct >= 90 ? "warn" : "crit");
const slaTone = (pct: number | null): Tone => (pct == null ? "muted" : pct >= 95 ? "ok" : pct >= 85 ? "warn" : "crit");

export default function CrossTenantScreen() {
  const { setRoute } = useNav();
  const setTenant = useUiStore((s) => s.setTenant);
  const tenants = useTenants().data ?? [];
  const q = useCrossClientSummary();
  const [sort, setSort] = React.useState<SortKey>("sev1");
  const [search, setSearch] = React.useState("");

  // Prefer the full tenant record; the summary row is enough to switch when
  // the tenant list is still loading or the client is past its first page.
  const open = (c: ClientSummary) => {
    const t: Tenant = tenants.find((x) => x.id === c.id) ?? {
      ...NO_TENANT, id: c.id, name: c.name, code: c.code, color: c.color, plan: c.plan,
      incidents: c.incidents_active, sev1: c.sev1,
    };
    setTenant(t);
    setRoute("dashboard");
  };

  const forbidden = q.error instanceof ApiError && (q.error.status === 401 || q.error.status === 403);
  const rows = (q.data?.clients ?? [])
    .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      const av = a[sort] ?? -1, bv = b[sort] ?? -1;
      // Health sorts worst first; counts sort highest first.
      return sort === "devices_online_pct" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  const t = q.data?.totals;
  const id = React.useId();

  return (
    <div className="ld-dash">
      <nav className="ld-crumbs" aria-label="Breadcrumb">
        <button type="button" className="ld-link" onClick={() => setRoute("dashboard")}>Home</button>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <span>Analytics</span>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <span>Cross-client view</span>
      </nav>

      <div className="ld-head">
        <div>
          <h1>Cross-client view</h1>
          <p>Live operations rollup across every client. Admins only.</p>
        </div>
        <div className="ld-head-actions">
          <button type="button" className="ld-btn" onClick={() => setRoute("admin-tenants")}>
            <i className="fa-solid fa-building" aria-hidden="true" /> Manage clients
          </button>
        </div>
      </div>

      {forbidden ? (
        <div className="ld-card ld-metrics-off" role="status">
          <i className="fa-solid fa-lock" aria-hidden="true" />
          <div>
            <b>Admins only</b>
            <p className="ld-muted ld-small">Your role can see one client at a time. Ask an administrator for cross-client access.</p>
          </div>
        </div>
      ) : q.isLoading ? (
        <div className="ld-card"><Empty>Loading…</Empty></div>
      ) : !q.data || !t ? (
        <div className="ld-card"><Empty>The API is not reachable from this browser.</Empty></div>
      ) : (
        <>
          <div className="ld-grid ld-grid-stats">
            <StatCard icon="fa-building" tone="info" label="Clients" value={fmt(q.data.clients.filter((c) => c.id !== "shared").length)} note={`${fmt(t.tickets_open)} open tickets`} />
            <StatCard icon="fa-triangle-exclamation" tone="crit" label="Active incidents" value={fmt(t.incidents_active)} note={`${t.sev1} Sev 1 · ${t.sev2} Sev 2`} />
            <StatCard icon="fa-server" tone={healthTone(t.devices_online_pct)} label="Devices online" value={t.devices_online_pct == null ? "—" : `${t.devices_online_pct}%`} note={`${fmt(t.devices_down)} down of ${fmt(t.devices_total)}`} />
            <StatCard icon="fa-bell" tone="warn" label="Open alerts" value={fmt(t.alerts_open)} note={`${t.alerts_critical} critical`} />
          </div>

          <Panel title={`Clients (${rows.length})`}>
            <div className="ld-filters">
              <label className="ld-field ld-field-grow" htmlFor={`${id}-q`}>
                Search
                <span className="ld-search">
                  <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
                  <input id={`${id}-q`} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Client name…" />
                </span>
              </label>
              <label className="ld-field" htmlFor={`${id}-sort`}>
                Sort by
                <select id={`${id}-sort`} className="ld-select" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                  <option value="sev1">Sev 1 incidents</option>
                  <option value="incidents_active">Active incidents</option>
                  <option value="tickets_open">Open tickets</option>
                  <option value="alerts_critical">Critical alerts</option>
                  <option value="devices_online_pct">Device health (worst first)</option>
                  <option value="name">Name</option>
                </select>
              </label>
            </div>
            {rows.length ? (
              <div className="ld-table-wrap">
                <table className="ld-table">
                  <thead>
                    <tr>
                      <th scope="col">Client</th><th scope="col">Devices online</th><th scope="col">Incidents</th>
                      <th scope="col">Open tickets</th><th scope="col">SLA met</th><th scope="col">Open changes</th>
                      <th scope="col">Alerts</th><th scope="col">Plan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <span className="ld-client">
                            <span className="ld-client-badge" style={{ background: colorFor(c.color) }} aria-hidden="true">{c.code}</span>
                            {c.id === "shared" ? <b>{c.name}</b> : (
                              <button type="button" className="ld-link ld-strong" onClick={() => open(c)} title={`Switch to ${c.name}`}>{c.name}</button>
                            )}
                          </span>
                        </td>
                        <td>
                          <Pill tone={healthTone(c.devices_online_pct)}>{c.devices_online_pct == null ? "No devices" : `${c.devices_online_pct}%`}</Pill>
                          <span className="ld-sub">{c.devices_down} down · {c.devices_warn} warning of {c.devices_total}</span>
                        </td>
                        <td>
                          {c.sev1 > 0 ? <Pill tone="crit">{c.sev1} Sev 1</Pill> : <span className="ld-muted">No Sev 1</span>}
                          <span className="ld-sub">{c.incidents_active} active</span>
                        </td>
                        <td>{fmt(c.tickets_open)}<span className="ld-sub">of {fmt(c.tickets_total)}</span></td>
                        <td><Pill tone={slaTone(c.sla_met_pct)}>{c.sla_met_pct == null ? "—" : `${c.sla_met_pct}%`}</Pill>{c.sla_breached > 0 && <span className="ld-sub">{c.sla_breached} breached</span>}</td>
                        <td>{fmt(c.changes_open)}{c.changes_implementing > 0 && <span className="ld-sub">{c.changes_implementing} implementing</span>}</td>
                        <td>{c.alerts_critical > 0 ? <Pill tone="crit">{c.alerts_critical} critical</Pill> : <span className="ld-muted">{c.alerts_open} open</span>}</td>
                        <td className="ld-muted">{c.plan || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty>No clients match.</Empty>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
