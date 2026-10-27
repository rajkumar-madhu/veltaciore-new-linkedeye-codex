// Shared LinkedEye list screen for ITSM records (incidents, problems, changes):
// view tabs, total + per-priority cards, trend / status / SLA charts on the
// Overview tab, a filter bar, a paginated table with a next-state action, and a
// "major" + top-categories rail. Each screen supplies its records and config.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { useUiStore } from "@/store/ui";
import { useAuth, useCanWrite } from "@/auth/auth";
import ReadOnlyBadge from "@/components/ReadOnlyBadge";
import { Donut, Empty, Legend, PALETTE, Panel, Pill, StatCard, TrendChart, countBy, dailyTrend, fmt } from "@/components/ld";
import type { Slice, Tone } from "@/components/ld";

import { Icon } from "@/components/Icon";
import { ArrowRightIcon, ChevronLeftIcon, ChevronRightIcon, FilterIcon, PlusIcon, SearchIcon } from "lucide-react";
export interface ItsmRecord {
  id: string;
  opened: string;
  title: string;
  pri: number;
  state: string;
  category: string;
  group: string;
  assignee: string | null;
  sla: string;
  updated: string;
}

export interface RecordListConfig<T extends ItsmRecord> {
  title: string;
  subtitle: string;
  noun: { one: string; many: string };
  totalIcon: string;
  records: T[];
  /** Workflow: state → next state. */
  nextState: Record<string, string>;
  /** States that count as closed out (resolved / completed). */
  doneStates: Set<string>;
  /** Word for a closed-out record, e.g. "resolved" or "completed". */
  doneLabel?: string;
  stateColor: Record<string, string>;
  stateTone: Record<string, Tone>;
  onAdvance?: (r: T, next: string) => void;
  advancing?: boolean;
  newRoute: string;
  detailRoute: string;
  highlightId?: string;
  majorTitle: string;
  majorIcon: string;
  majorEmpty: string;
  majorFilter: (r: T) => boolean;
  extraTabs?: { id: string; label: string; filter: (r: T) => boolean }[];
  extraColumn?: { header: string; render: (r: T) => React.ReactNode };
}

export const PRIORITY: Record<number, { label: string; tone: Tone; icon: string }> = {
  1: { label: "Critical", tone: "crit", icon: "fa-fire" },
  2: { label: "High", tone: "warn", icon: "fa-circle-exclamation" },
  3: { label: "Medium", tone: "info", icon: "fa-triangle-exclamation" },
  4: { label: "Low", tone: "ok", icon: "fa-circle-info" },
};

const SLA_VIEW: Record<string, { label: string; tone: Tone; icon: string }> = {
  breach: { label: "Breached", tone: "crit", icon: "fa-triangle-exclamation" },
  warn: { label: "At risk", tone: "warn", icon: "fa-clock" },
  met: { label: "Met", tone: "ok", icon: "fa-check" },
  ok: { label: "On track", tone: "ok", icon: "fa-check" },
};

const BASE_TABS: { id: string; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "all", label: "All" },
  { id: "mine", label: "Assigned to me" },
  { id: "unassigned", label: "Unassigned" },
  { id: "major", label: "Major" },
  { id: "breaches", label: "SLA Breaches" },
];

const PAGE_SIZE = 10;
const ANY = "";

/** "2026-04-24 06:32" → "Apr 24, 06:32"; unparseable values pass through. */
function shortDate(v: string, dateOnly = false) {
  const d = new Date(v.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return v;
  const day = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return dateOnly ? day : `${day}, ${v.slice(11, 16)}`;
}

export function RecordListScreen<T extends ItsmRecord>(cfg: RecordListConfig<T>) {
  const { setRoute } = useNav();
  const tenant = useUiStore((s) => s.tenant);
  const search = useUiStore((s) => s.search);
  const setSearch = useUiStore((s) => s.setSearch);
  const me = useAuth((s) => s.identity.name);
  const canWrite = useCanWrite();
  const idp = React.useId();
  const doneLabel = cfg.doneLabel ?? "resolved";
  const { records, nextState: NEXT_STATE, doneStates: RESOLVED_STATES, noun } = cfg;
  const tabs = React.useMemo(() => {
    const label: Record<string, string> = { all: `All ${noun.many}`, mine: `My ${noun.many}`, major: cfg.majorTitle };
    const base = BASE_TABS.map((t) => ({ ...t, label: label[t.id] ?? t.label }));
    return [...base.slice(0, 5), ...(cfg.extraTabs ?? []), base[5]];
  }, [cfg.extraTabs, cfg.majorTitle, noun.many]);

  const [tab, setTab] = React.useState<string>("overview");
  const [status, setStatus] = React.useState(ANY);
  const [priority, setPriority] = React.useState(ANY);
  const [category, setCategory] = React.useState(ANY);
  const [assignee, setAssignee] = React.useState(ANY);
  const [query, setQuery] = React.useState(search);
  const [page, setPage] = React.useState(0);

  const advance = (r: T) => {
    const next = NEXT_STATE[r.state];
    if (canWrite && next && cfg.onAdvance) cfg.onAdvance(r, next);
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
      if (tab === "major" && !cfg.majorFilter(r)) return false;
      const extra = cfg.extraTabs?.find((t) => t.id === tab);
      if (extra && !extra.filter(r)) return false;
      if (tab === "breaches" && r.sla !== "breach") return false;
      if (status && r.state !== status) return false;
      if (priority && r.pri !== Number(priority)) return false;
      if (category && (r.category || "Uncategorised") !== category) return false;
      if (assignee === "__none" ? !!r.assignee : assignee && r.assignee !== assignee) return false;
      return true;
    });
    return rows.sort((a, b) => b.opened.localeCompare(a.opened));
  }, [records, tab, me, status, priority, category, assignee, cfg]);

  React.useEffect(() => setPage(0), [tab, status, priority, category, assignee, search]);
  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const pageRows = visible.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  // Summary cards
  const open = records.filter((r) => !RESOLVED_STATES.has(r.state));
  const byPri = (p: number) => records.filter((r) => r.pri === p);
  const unassignedOf = (rows: T[]) => rows.filter((r) => !r.assignee && !RESOLVED_STATES.has(r.state)).length;

  // Overview charts
  const days = React.useMemo(() => dailyTrend(records, RESOLVED_STATES), [records]);
  const statusSlices: Slice[] = countBy(records, (r) => r.state).map(([label, value], i) => ({
    label,
    value,
    color: cfg.stateColor[label] ?? PALETTE[i % PALETTE.length],
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

  const major = records.filter((r) => cfg.majorFilter(r) && !RESOLVED_STATES.has(r.state)).slice(0, 5);
  const topCat = categories[0]?.[1] ?? 1;

  return (
    <div className="ld-dash">
      <div className="ld-head">
        <div>
          <h1>{cfg.title}</h1>
          <p>{cfg.subtitle} · {tenant.name}</p>
        </div>
        <div className="ld-head-actions">
          <ReadOnlyBadge />
          {canWrite && (
            <button type="button" className="ld-btn ld-btn-primary" onClick={() => setRoute(cfg.newRoute)}>
              <Icon icon={PlusIcon} /> New {noun.one}
            </button>
          )}
        </div>
      </div>

      <div className="ld-tabs" role="tablist" aria-label={`${noun.one} views`}>
        {tabs.map((t) => (
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
          icon={cfg.totalIcon}
          tone="info"
          label={`Total ${noun.many}`}
          value={fmt(records.length)}
          note={`${fmt(open.length)} open, ${fmt(records.length - open.length)} ${doneLabel}`}
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
          <Panel title={`${noun.one} Trend`}>
            <div className="ld-chart-legend">
              <span><span className="ld-dot" style={{ background: "#2f6bff" }} />Opened</span>
              <span><span className="ld-dot" style={{ background: "#16a34a" }} />Since {doneLabel}</span>
            </div>
            {records.length ? <TrendChart days={days} /> : <Empty>No {noun.many.toLowerCase()} yet.</Empty>}
          </Panel>
          <Panel title={`${noun.many} by Status`}>
            {records.length ? (
              <div className="ld-donut-row">
                <Donut slices={statusSlices} center={fmt(records.length)} sub="Total" label={`${records.length} ${noun.many.toLowerCase()} by status`} />
                <Legend slices={statusSlices} />
              </div>
            ) : (
              <Empty>No {noun.many.toLowerCase()} yet.</Empty>
            )}
          </Panel>
          <Panel title="SLA Compliance">
            {slaTotal ? (
              <div className="ld-donut-row">
                <div className="ld-donut-col">
                  <Donut slices={slaSlices} center={slaPct} label={`${slaPct} of ${noun.one.toLowerCase()} SLAs met`} />
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
        <span className="ld-filter-icon" aria-hidden="true"><Icon icon={FilterIcon} /></span>
        <div className="ld-field">
          <label htmlFor={`${idp}-status`}>Status</label>
          <select id={`${idp}-status`} className="ld-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value={ANY}>All Statuses</option>
            {states.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="ld-field">
          <label htmlFor={`${idp}-priority`}>Priority</label>
          <select id={`${idp}-priority`} className="ld-select" value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value={ANY}>All Priorities</option>
            {[1, 2, 3, 4].map((p) => <option key={p} value={p}>{PRIORITY[p].label}</option>)}
          </select>
        </div>
        <div className="ld-field">
          <label htmlFor={`${idp}-category`}>Category</label>
          <select id={`${idp}-category`} className="ld-select" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value={ANY}>All Categories</option>
            {categories.map(([c]) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="ld-field">
          <label htmlFor={`${idp}-assignee`}>Assigned To</label>
          <select id={`${idp}-assignee`} className="ld-select" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
            <option value={ANY}>All Users</option>
            <option value="__none">Unassigned</option>
            {people.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="ld-field ld-field-grow">
          <label htmlFor={`${idp}-search`} className="sr-only">Search {noun.many.toLowerCase()}</label>
          <span className="ld-search">
            <Icon icon={SearchIcon} />
            <input id={`${idp}-search`} type="search" placeholder={`Search ${noun.many.toLowerCase()}…`} value={query} onChange={(e) => setQuery(e.target.value)} />
          </span>
        </div>
        <button type="submit" className="ld-btn ld-btn-primary">Search</button>
        <button type="reset" className="ld-btn">Reset</button>
      </form>

      <div className="ld-split">
        <section className="ld-card ld-panel" aria-labelledby={`${idp}-list-h`}>
          <div className="ld-panel-head">
            <h2 id={`${idp}-list-h`}>{tab === "overview" ? `Recent ${noun.many}` : tabs.find((t) => t.id === tab)?.label}</h2>
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
                    {cfg.extraColumn && <th scope="col">{cfg.extraColumn.header}</th>}
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
                      <tr key={r.id} className={r.id === cfg.highlightId ? "ld-row-new" : undefined}>
                        <td>
                          <button type="button" className="ld-link ld-mono" onClick={() => setRoute(cfg.detailRoute, { id: r.id })}>
                            {r.id}
                          </button>
                        </td>
                        <td className={`ld-ellipsis ${cfg.extraColumn ? "ld-ellipsis-xs" : "ld-ellipsis-sm"}`} title={`${r.title} · ${r.category} · ${r.group}`}>{r.title}</td>
                        <td><Pill tone={p.tone}>{p.label}</Pill></td>
                        <td><Pill tone={cfg.stateTone[r.state] ?? "muted"}>{r.state}</Pill></td>
                        {cfg.extraColumn && <td>{cfg.extraColumn.render(r)}</td>}
                        <td className={r.assignee ? undefined : "ld-muted"}>{r.assignee || "Unassigned"}</td>
                        <td className="ld-muted">{shortDate(r.opened, !!cfg.extraColumn)}</td>
                        <td>
                          <span className={`ld-sla ld-sla-${sla.tone}`}>
                            <Icon className={`fa-solid ${sla.icon}`} /> {sla.label}
                          </span>
                        </td>
                        <td>
                          {canWrite && next && (
                            <button
                              type="button"
                              className="ld-btn ld-btn-sm"
                              onClick={() => advance(r)}
                              disabled={cfg.advancing}
                              title={`Move ${r.id} to ${next}`}
                            >
                              {next} <Icon icon={ArrowRightIcon} />
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
            <Empty>{records.length ? `No ${noun.many.toLowerCase()} match these filters.` : `No ${noun.many.toLowerCase()} yet.`}</Empty>
          )}
          {visible.length > PAGE_SIZE && (
            <nav className="ld-pager" aria-label="Pagination">
              <span className="ld-muted ld-small">
                Showing {page * PAGE_SIZE + 1}–{Math.min(visible.length, (page + 1) * PAGE_SIZE)} of {fmt(visible.length)}
              </span>
              <div className="ld-pager-btns">
                <button type="button" className="ld-btn ld-btn-sm" onClick={() => setPage(page - 1)} disabled={page === 0} aria-label="Previous page">
                  <Icon icon={ChevronLeftIcon} />
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
                  <Icon icon={ChevronRightIcon} />
                </button>
              </div>
            </nav>
          )}
        </section>

        <div className="ld-rail">
          <Panel title={cfg.majorTitle} action={{ label: "View All", onClick: () => setTab("major") }}>
            {major.length ? (
              <ul className="ld-major">
                {major.map((r) => (
                  <li key={r.id}>
                    <span className="ld-tile ld-tile-sm ld-crit" aria-hidden="true"><Icon className={`fa-solid ${cfg.majorIcon}`} /></span>
                    <span className="ld-major-body">
                      <button type="button" className="ld-link ld-mono" onClick={() => setRoute(cfg.detailRoute, { id: r.id })}>{r.id}</button>
                      <span className="ld-major-title" title={r.title}>{r.title}</span>
                      <span className="ld-muted ld-small">{r.updated} · {r.group}</span>
                    </span>
                    <Pill tone={cfg.stateTone[r.state] ?? "muted"}>{r.state}</Pill>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>{cfg.majorEmpty}</Empty>
            )}
          </Panel>
          <Panel title={`Top ${noun.one} Categories`}>
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
              <Empty>No {noun.many.toLowerCase()} yet.</Empty>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
