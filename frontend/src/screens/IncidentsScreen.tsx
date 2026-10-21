// Incidents — LinkedEye layout: tabs, priority summary cards, trend + status/SLA
// donuts (Overview), a filter bar, and the incidents table beside a major
// incidents / top categories rail. Live data from useIncidentRecords.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { useUiStore } from "@/store/ui";
import { useIncidentRecords, useUpdateIncident } from "@/api/hooks";
import { useAuth, useCanWrite } from "@/auth/auth";
import ReadOnlyBadge from "@/components/ReadOnlyBadge";
import { Donut, Empty, Legend, PALETTE, Panel, Pill, StatCard, TrendChart, countBy, dailyTrend, fmt } from "@/components/ld";
import type { Slice, Tone } from "@/components/ld";

// State machine for the click-to-advance action.
const NEXT_STATE: Record<string, string> = {
  New: "Assigned",
  Assigned: "In Progress",
  "In Progress": "Resolved",
  Resolved: "Closed",
};

const RESOLVED_STATES = new Set(["Resolved", "Closed", "Cancelled", "Canceled"]);

const PRIORITY: Record<number, { label: string; tone: Tone; icon: string }> = {
  1: { label: "Critical", tone: "crit", icon: "fa-fire" },
  2: { label: "High", tone: "warn", icon: "fa-circle-exclamation" },
  3: { label: "Medium", tone: "info", icon: "fa-triangle-exclamation" },
  4: { label: "Low", tone: "ok", icon: "fa-circle-info" },
};

const STATE_TONE: Record<string, Tone> = {
  New: "crit",
  Assigned: "warn",
  "In Progress": "warn",
  "On Hold": "info",
  Resolved: "ok",
  Closed: "muted",
};

const STATE_COLOR: Record<string, string> = {
  New: "#e5383b",
  Assigned: "#f5a524",
  "In Progress": "#2f6bff",
  "On Hold": "#7c4dff",
  Resolved: "#16a34a",
  Closed: "#98a2b3",
};

const SLA_VIEW: Record<string, { label: string; tone: Tone; icon: string }> = {
  breach: { label: "Breached", tone: "crit", icon: "fa-triangle-exclamation" },
  warn: { label: "At risk", tone: "warn", icon: "fa-clock" },
  met: { label: "Met", tone: "ok", icon: "fa-check" },
  ok: { label: "On track", tone: "ok", icon: "fa-check" },
};

type TabId = "overview" | "all" | "mine" | "unassigned" | "major" | "breaches";
const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "all", label: "All Incidents" },
  { id: "mine", label: "My Incidents" },
  { id: "unassigned", label: "Unassigned" },
  { id: "major", label: "Major Incidents" },
  { id: "breaches", label: "SLA Breaches" },
];

const PAGE_SIZE = 10;

/** "2026-04-24 06:32" → "Apr 24, 06:32"; unparseable values pass through. */
function shortDate(v: string) {
  const d = new Date(v.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return v;
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${v.slice(11, 16)}`;
}
const ANY = "";

export interface SnIncident {
  id: string;
  opened: string;
  title: string;
  caller: string;
  pri: number;
  state: string;
  category: string;
  group: string;
  assignee: string | null;
  sla: string;
  updated: string;
  critical?: boolean;
}

export const SN_INCIDENTS: SnIncident[] = [
  { id: "INC-000001", opened: "2026-04-24 06:32", title: "SwitchPortDown — GM-SW Gi1/0/5 down, no link detecte…", caller: "System (Alert)", pri: 1, state: "New", category: "Network", group: "NOC — Network Ops", assignee: null, sla: "breach", updated: "2m ago", critical: true },
  { id: "INC-000002", opened: "2026-04-24 06:26", title: "ServerHighCPU — KVM2 (10.10.10.15) sustained CPU usa…", caller: "System (Alert)", pri: 1, state: "Assigned", category: "Server", group: "Platform Engineering", assignee: "Rajkumar M", sla: "breach", updated: "8m ago", critical: true },
  { id: "INC-000003", opened: "2026-04-24 06:11", title: "FortiGateSessionTableHigh — 100F-FW session table at 5…", caller: "System (Alert)", pri: 2, state: "In Progress", category: "Firewall", group: "NOC — Network Ops", assignee: "Siva K", sla: "ok", updated: "23m ago" },
  { id: "INC-000007", opened: "2026-04-24 06:29", title: "SwitchPortFlapping — MGMT-SW Gi1/0/3 flapped 6 times …", caller: "System (Alert)", pri: 1, state: "New", category: "Network", group: "NOC — Network Ops", assignee: null, sla: "warn", updated: "5m ago" },
  { id: "INC-000008", opened: "2026-04-24 06:22", title: "OOMKilled — pod-analytics-worker-7f8d9 terminated by K…", caller: "System (Alert)", pri: 2, state: "New", category: "Kubernetes", group: "Platform Engineering", assignee: null, sla: "ok", updated: "12m ago" },
  { id: "INC-000006", opened: "2026-04-24 03:34", title: "ServerDiskCritical — KVM1 /data partition at 92% utilization", caller: "System (Alert)", pri: 2, state: "Assigned", category: "Server", group: "Platform Engineering", assignee: "Edukondalu P", sla: "ok", updated: "3h ago" },
  { id: "INC-000005", opened: "2026-04-24 04:34", title: "TradingHighLatency — NSE Adapter OMS latency exceede…", caller: "System (Alert)", pri: 1, state: "Resolved", category: "Trading", group: "Trading Systems", assignee: "Rajkumar M", sla: "met", updated: "2h ago" },
  { id: "INC-000004", opened: "2026-04-24 05:34", title: "SSLCertExpiring — fs-le-dx.finspot.in certificate expires in …", caller: "System (Alert)", pri: 3, state: "New", category: "Security", group: "Platform Engineering", assignee: null, sla: "ok", updated: "1h ago" },
];

export default function IncidentsScreen() {
  const { setRoute } = useNav();
  const tenant = useUiStore((s) => s.tenant);
  const createdId = useUiStore((s) => s.params.createdIncidentId) as string | undefined;
  const search = useUiStore((s) => s.search);
  const setSearch = useUiStore((s) => s.setSearch);
  const me = useAuth((s) => s.identity.name);
  const { data } = useIncidentRecords(search);
  const update = useUpdateIncident();
  const canWrite = useCanWrite();
  const records = React.useMemo(() => data ?? [], [data]);

  const [tab, setTab] = React.useState<TabId>("overview");
  const [status, setStatus] = React.useState(ANY);
  const [priority, setPriority] = React.useState(ANY);
  const [category, setCategory] = React.useState(ANY);
  const [assignee, setAssignee] = React.useState(ANY);
  const [query, setQuery] = React.useState(search);
  const [page, setPage] = React.useState(0);

  const advance = (inc: SnIncident) => {
    const next = NEXT_STATE[inc.state];
    if (canWrite && next) update.mutate({ id: inc.id, patch: { state: next } });
  };

  const reset = () => {
    setStatus(ANY);
    setPriority(ANY);
    setCategory(ANY);
    setAssignee(ANY);
    setQuery("");
    setSearch("");
    setPage(0);
  };

  // Options come from the data so filters never offer empty choices.
  const states = countBy(records, (r) => r.state).map(([s]) => s);
  const categories = countBy(records, (r) => r.category || "Uncategorised");
  const people = [...new Set(records.map((r) => r.assignee).filter((a): a is string => !!a))].sort();

  const visible = React.useMemo(() => {
    const rows = records.filter((r) => {
      if (tab === "mine" && r.assignee !== me) return false;
      if (tab === "unassigned" && r.assignee) return false;
      if (tab === "major" && r.pri !== 1) return false;
      if (tab === "breaches" && r.sla !== "breach") return false;
      if (status && r.state !== status) return false;
      if (priority && r.pri !== Number(priority)) return false;
      if (category && (r.category || "Uncategorised") !== category) return false;
      if (assignee === "__none" ? !!r.assignee : assignee && r.assignee !== assignee) return false;
      return true;
    });
    return rows.sort((a, b) => b.opened.localeCompare(a.opened));
  }, [records, tab, me, status, priority, category, assignee]);

  React.useEffect(() => setPage(0), [tab, status, priority, category, assignee, search]);
  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const pageRows = visible.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  // Summary cards
  const open = records.filter((r) => !RESOLVED_STATES.has(r.state));
  const byPri = (p: number) => records.filter((r) => r.pri === p);
  const unassignedOf = (rows: SnIncident[]) => rows.filter((r) => !r.assignee && !RESOLVED_STATES.has(r.state)).length;

  // Overview charts
  const days = React.useMemo(() => dailyTrend(records, RESOLVED_STATES), [records]);
  const statusSlices: Slice[] = countBy(records, (r) => r.state).map(([label, value], i) => ({
    label,
    value,
    color: STATE_COLOR[label] ?? PALETTE[i % PALETTE.length],
  }));
  const slaMet = records.filter((r) => r.sla === "met" || r.sla === "ok").length;
  const slaBreached = records.filter((r) => r.sla === "breach").length;
  const slaAtRisk = records.filter((r) => r.sla === "warn").length;
  const slaTotal = slaMet + slaBreached + slaAtRisk;
  const slaSlices: Slice[] = [
    { label: "Met", value: slaMet, color: "#16a34a" },
    { label: "Breached", value: slaBreached, color: "#e5383b" },
    { label: "At Risk", value: slaAtRisk, color: "#f5a524" },
  ];
  const slaPct = slaTotal ? `${Math.round((slaMet / slaTotal) * 100)}%` : "—";

  const major = records.filter((r) => r.pri === 1 && !RESOLVED_STATES.has(r.state)).slice(0, 5);
  const topCat = categories[0]?.[1] ?? 1;

  return (
    <div className="ld-dash">
      <div className="ld-head">
        <div>
          <h1>Incidents</h1>
          <p>View, manage and resolve incidents across your IT infrastructure and services · {tenant.name}</p>
        </div>
        <div className="ld-head-actions">
          <ReadOnlyBadge />
          {canWrite && (
            <button type="button" className="ld-btn ld-btn-primary" onClick={() => setRoute("incident-new")}>
              <i className="fa-solid fa-plus" aria-hidden="true" /> New Incident
            </button>
          )}
        </div>
      </div>

      <div className="ld-tabs" role="tablist" aria-label="Incident views">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`ld-tab${tab === t.id ? " active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="ld-grid ld-grid-5">
        <StatCard
          icon="fa-triangle-exclamation"
          tone="crit"
          label="Total Incidents"
          value={fmt(records.length)}
          note={`${fmt(open.length)} open, ${fmt(records.length - open.length)} resolved`}
          onClick={() => { reset(); setTab("all"); }}
        />
        {[1, 2, 3, 4].map((p) => (
          <StatCard
            key={p}
            icon={PRIORITY[p].icon}
            tone={PRIORITY[p].tone}
            label={PRIORITY[p].label}
            value={fmt(byPri(p).length)}
            note={`${unassignedOf(byPri(p))} unassigned`}
            onClick={() => { setTab("all"); setPriority(String(p)); }}
          />
        ))}
      </div>

      {tab === "overview" && (
        <div className="ld-grid ld-grid-3">
          <Panel title="Incident Trend">
            <div className="ld-chart-legend">
              <span><span className="ld-dot" style={{ background: "#2f6bff" }} />Opened</span>
              <span><span className="ld-dot" style={{ background: "#16a34a" }} />Since resolved</span>
            </div>
            {records.length ? <TrendChart days={days} /> : <Empty>No incidents yet.</Empty>}
          </Panel>
          <Panel title="Incidents by Status">
            {records.length ? (
              <div className="ld-donut-row">
                <Donut slices={statusSlices} center={fmt(records.length)} sub="Total" label={`${records.length} incidents by status`} />
                <Legend slices={statusSlices} />
              </div>
            ) : (
              <Empty>No incidents yet.</Empty>
            )}
          </Panel>
          <Panel title="SLA Compliance">
            {slaTotal ? (
              <div className="ld-donut-row">
                <div className="ld-donut-col">
                  <Donut slices={slaSlices} center={slaPct} label={`${slaPct} of incident SLAs met`} />
                  <span className="ld-donut-caption">SLA Met</span>
                </div>
                <Legend slices={slaSlices} />
              </div>
            ) : (
              <Empty>No SLA data yet.</Empty>
            )}
          </Panel>
        </div>
      )}

      <form
        className="ld-card ld-filters"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(query.trim());
        }}
        onReset={(e) => {
          e.preventDefault();
          reset();
        }}
      >
        <span className="ld-filter-icon" aria-hidden="true"><i className="fa-solid fa-filter" /></span>
        <div className="ld-field">
          <label htmlFor="inc-f-status">Status</label>
          <select id="inc-f-status" className="ld-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value={ANY}>All Statuses</option>
            {states.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="ld-field">
          <label htmlFor="inc-f-priority">Priority</label>
          <select id="inc-f-priority" className="ld-select" value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value={ANY}>All Priorities</option>
            {[1, 2, 3, 4].map((p) => <option key={p} value={p}>{PRIORITY[p].label}</option>)}
          </select>
        </div>
        <div className="ld-field">
          <label htmlFor="inc-f-category">Category</label>
          <select id="inc-f-category" className="ld-select" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value={ANY}>All Categories</option>
            {categories.map(([c]) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="ld-field">
          <label htmlFor="inc-f-assignee">Assigned To</label>
          <select id="inc-f-assignee" className="ld-select" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
            <option value={ANY}>All Users</option>
            <option value="__none">Unassigned</option>
            {people.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="ld-field ld-field-grow">
          <label htmlFor="inc-f-search" className="sr-only">Search incidents</label>
          <span className="ld-search">
            <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
            <input id="inc-f-search" type="search" placeholder="Search incidents…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </span>
        </div>
        <button type="submit" className="ld-btn ld-btn-primary">Search</button>
        <button type="reset" className="ld-btn">Reset</button>
      </form>

      <div className="ld-split">
        <section className="ld-card ld-panel" aria-labelledby="inc-list-h">
          <div className="ld-panel-head">
            <h2 id="inc-list-h">{tab === "overview" ? "Recent Incidents" : TABS.find((t) => t.id === tab)?.label}</h2>
            <span className="ld-muted ld-small">{fmt(visible.length)} records · auto-refresh 30s</span>
          </div>
          {pageRows.length ? (
            <div className="ld-table-wrap">
              <table className="ld-table">
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Title</th>
                    <th scope="col">Priority</th>
                    <th scope="col">Status</th>
                    <th scope="col">Assigned To</th>
                    <th scope="col">Opened</th>
                    <th scope="col">SLA</th>
                    <th scope="col"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((r) => {
                    const p = PRIORITY[r.pri] ?? { label: `P${r.pri}`, tone: "muted" as Tone, icon: "" };
                    const sla = SLA_VIEW[r.sla] ?? { label: r.sla || "—", tone: "muted" as Tone, icon: "fa-minus" };
                    const next = NEXT_STATE[r.state];
                    return (
                      <tr key={r.id} className={r.id === createdId ? "ld-row-new" : undefined}>
                        <td>
                          <button type="button" className="ld-link ld-mono" onClick={() => setRoute("incident-detail", { id: r.id })}>
                            {r.id}
                          </button>
                        </td>
                        <td className="ld-ellipsis ld-ellipsis-sm" title={`${r.title} · ${r.category} · ${r.group}`}>{r.title}</td>
                        <td><Pill tone={p.tone}>{p.label}</Pill></td>
                        <td><Pill tone={STATE_TONE[r.state] ?? "muted"}>{r.state}</Pill></td>
                        <td className={r.assignee ? undefined : "ld-muted"}>{r.assignee || "Unassigned"}</td>
                        <td className="ld-muted">{shortDate(r.opened)}</td>
                        <td>
                          <span className={`ld-sla ld-sla-${sla.tone}`}>
                            <i className={`fa-solid ${sla.icon}`} aria-hidden="true" /> {sla.label}
                          </span>
                        </td>
                        <td>
                          {canWrite && next && (
                            <button
                              type="button"
                              className="ld-btn ld-btn-sm"
                              onClick={() => advance(r)}
                              disabled={update.isPending}
                              title={`Move ${r.id} to ${next}`}
                            >
                              {next} <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>{records.length ? "No incidents match these filters." : "No incidents yet."}</Empty>
          )}
          {visible.length > PAGE_SIZE && (
            <nav className="ld-pager" aria-label="Pagination">
              <span className="ld-muted ld-small">
                Showing {page * PAGE_SIZE + 1}–{Math.min(visible.length, (page + 1) * PAGE_SIZE)} of {fmt(visible.length)}
              </span>
              <div className="ld-pager-btns">
                <button type="button" className="ld-btn ld-btn-sm" onClick={() => setPage(page - 1)} disabled={page === 0} aria-label="Previous page">
                  <i className="fa-solid fa-chevron-left" aria-hidden="true" />
                </button>
                {Array.from({ length: pages }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`ld-btn ld-btn-sm${i === page ? " ld-btn-primary" : ""}`}
                    aria-current={i === page ? "page" : undefined}
                    onClick={() => setPage(i)}
                  >
                    {i + 1}
                  </button>
                ))}
                <button type="button" className="ld-btn ld-btn-sm" onClick={() => setPage(page + 1)} disabled={page >= pages - 1} aria-label="Next page">
                  <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                </button>
              </div>
            </nav>
          )}
        </section>

        <div className="ld-rail">
          <Panel title="Major Incidents" action={{ label: "View All", onClick: () => setTab("major") }}>
            {major.length ? (
              <ul className="ld-major">
                {major.map((r) => (
                  <li key={r.id}>
                    <span className="ld-tile ld-tile-sm ld-crit" aria-hidden="true"><i className="fa-solid fa-fire" /></span>
                    <span className="ld-major-body">
                      <button type="button" className="ld-link ld-mono" onClick={() => setRoute("incident-detail", { id: r.id })}>{r.id}</button>
                      <span className="ld-major-title" title={r.title}>{r.title}</span>
                      <span className="ld-muted ld-small">{r.updated} · {r.group}</span>
                    </span>
                    <Pill tone={STATE_TONE[r.state] ?? "muted"}>{r.state}</Pill>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No open critical incidents.</Empty>
            )}
          </Panel>
          <Panel title="Top Incident Categories">
            {categories.length ? (
              <ul className="ld-bars">
                {categories.slice(0, 7).map(([label, value], i) => (
                  <li key={label}>
                    <span className="ld-bar-label">{label}</span>
                    <span className="ld-bar-track">
                      <span className="ld-bar-fill" style={{ width: `${(value / topCat) * 100}%`, background: PALETTE[i % PALETTE.length] }} />
                    </span>
                    <span className="ld-bar-value">{value}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No incidents yet.</Empty>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
