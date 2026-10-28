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

import { Button, Page, PageHead, SearchBox, Select, Tab, Table, Tabs, Tile, cx, toneBg, ui } from "@/components/ui";
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

/** SLA cell ink per tone (light / dark via the tone tokens). */
const SLA_TEXT: Record<Tone, string> = {
  crit: "text-tone-crit", warn: "text-tone-warn", ok: "text-tone-ok", info: "text-tone-info", purple: "text-tone-purple", muted: "text-fg-muted",
};

/** A record id shown as a monospace link (ld-link + ld-mono: the mono size and weight win). */
export const monoLink =
  "[font-feature-settings:'cv02','cv03','cv04','cv11','ss01'] border-0 bg-transparent p-0 font-mono text-xs font-semibold text-accent cursor-pointer hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2";


const focusRing = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2";
// The legacy rule [class*="mono"] { font-feature-settings: "tnum", "ss01" } matches any class
// containing "mono" (font-mono too). Where the old class had no "mono" in it, put the body's
// features back so numerals render as before.
const bodyFeatures = "[font-feature-settings:'cv02','cv03','cv04','cv11','ss01']";
/** inline <code> chip; <code> already gets the mono family from the base rule */
const codeChip = "[&_code]:text-xs [&_code]:px-[5px] [&_code]:py-px [&_code]:rounded-sm [&_code]:bg-bg-muted [&_code]:text-fg";

/** Service-desk pieces shared by the ITSM screens (were the ld-sd-* / ld-entity-* classes;
 * ui.tsx has no equivalent). */
export const sd = {
  /** form grid (was ld-sd-fields); give controls inside it w-full, wide cells sd.wide */
  fields: "grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-x-4 gap-y-3",
  wide: "col-span-full",
  /** ld-req was #b42318 in both themes (ui.req follows the dark tone) */
  req: "text-[#b42318]",
  input: cx(ui.input, "w-full"),
  select: cx(ui.select, "w-full"),
  /** ld-form + ld-rail on one element: the form's 10px gap wins */
  formRail: "flex flex-col gap-2.5 min-w-0",
  static: "min-h-[38px] flex items-center gap-2 text-sm text-fg",
  /** ld-sd-static + ld-mono (+ ld-muted): the static row's 13px and fg colour win */
  staticMono: "min-h-[38px] flex items-center gap-2 text-sm text-fg font-mono font-semibold",
  check: "inline-flex items-center gap-2 min-h-[38px] text-sm text-fg cursor-pointer [&_input]:w-4 [&_input]:h-4 [&_input]:accent-accent",
  /** ld-input ld-textarea ld-sd-textarea */
  textarea: cx(ui.textarea.replace("min-h-[76px]", "min-h-[120px]"), "w-full"),
  actions: "flex flex-wrap items-center gap-2",
  actionsEnd: "flex flex-wrap items-center gap-2 justify-end",
  /** card-style alert row (ld-card ld-sd-alert ld-sd-alert-crit / -ok) */
  alertCrit: "flex items-start gap-2.5 px-4 py-3 text-sm text-fg rounded-lg shadow-sm border border-[#f3b8b4] bg-critical-bg [&_.ld-icon]:mt-0.5 [&_.ld-icon]:text-[#b42318] dark:[&_.ld-icon]:text-[#fca5a5]",
  alertOk: "flex items-start gap-2.5 px-4 py-3 text-sm text-fg rounded-lg shadow-sm border border-[#a6dfbd] bg-success-bg [&_.ld-icon]:mt-0.5 [&_.ld-icon]:text-[#137a3f] dark:[&_.ld-icon]:text-[#6ee7b7]",
  /** td.ld-mono: the table cell's 13px beat ld-mono's 12px */
  cellMono: "font-mono font-semibold",
  number: cx("font-mono text-sm font-semibold text-fg-muted", bodyFeatures),
  /** an ld-activity li in a feed (ld-sd-feed: top-aligned) */
  feedItem: "flex items-start gap-2.5 text-sm",
  entry: "flex-1 min-w-0 flex flex-col gap-[3px]",
  entryMeta: "flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs text-fg-muted [&_b]:text-fg [&_b]:font-semibold",
  entryText: cx("text-sm leading-normal text-fg [overflow-wrap:anywhere]", codeChip),
  time: cx("flex-none min-w-[64px] font-mono text-xs text-fg-muted pt-1.5", bodyFeatures),
  steps: "list-none m-0 p-0 flex flex-col",
  step: "flex items-start gap-2.5 py-[9px] border-b border-line-subtle last:border-b-0 text-sm text-fg",
  stepN: "flex-none w-6 h-6 rounded-full grid place-items-center text-2xs font-bold bg-info-bg text-accent",
  list: "m-0 pl-4.5 flex flex-col gap-1.5 text-sm leading-normal text-fg",
  listPlain: "list-none m-0 pl-0 flex flex-col gap-1.5 text-sm leading-normal text-fg [&_li]:flex [&_li]:items-start [&_li]:gap-2 [&_.ld-icon]:mt-[3px]",
  prose: cx(
    "text-base leading-[1.7] text-fg max-w-[820px]",
    "[&_h3]:text-md [&_h3]:font-semibold [&_h3]:mt-4.5 [&_h3]:mb-1.5 [&_h3:first-child]:mt-0",
    "[&_p]:mb-2 [&_ol]:pl-5.5 [&_ol]:mb-2 [&_ul]:pl-5.5 [&_ul]:mb-2",
    codeChip,
  ),
  callout: "my-3.5 px-4 py-3 border-l-[3px] border-accent rounded-sm bg-info-bg text-sm",
  stages: "list-none m-0 p-0 flex flex-wrap gap-1.5",
  toggles: "flex flex-wrap gap-1.5",
  toggle: cx(
    "inline-flex items-center gap-1.5 min-h-[32px] px-3 border border-line-strong rounded-full bg-bg-raised text-fg-muted text-[12.5px] font-semibold cursor-pointer hover:text-fg",
    "aria-pressed:border-accent aria-pressed:bg-info-bg aria-pressed:text-accent",
    focusRing,
  ),
  fieldset: "border-0 m-0 p-0 min-w-0 [&_legend]:p-0 [&_legend]:mb-1 [&_legend]:text-xs [&_legend]:text-fg-muted",
  tagsStart: ui.tags.replace(" max-[720px]:justify-start", "").replace("justify-end", "justify-start"),
  // entity header (ld-head ld-entity-head > ld-entity)
  entityHead: ui.head.replace("items-end", "items-start"),
  entity: "flex items-center gap-3.5 min-w-0",
  entityTitle: cx(ui.h1, "flex items-center gap-2.5 flex-wrap"),
  /** a <p class="ld-entity-meta"> inside the head (also gets the ld-head p text style) */
  entityMeta: "flex flex-wrap gap-x-3.5 gap-y-1 mt-1 text-base text-fg-muted [&_span+span]:before:content-['|'] [&_span+span]:before:mr-3.5 [&_span+span]:before:text-line-strong",
};

/** Category filter chip (was ld-chip / ld-chip.active). */
export const chipClass = (active: boolean) =>
  cx(
    "inline-flex flex-col items-center justify-center gap-1 min-w-[104px] min-h-[76px] px-3 py-2.5 border rounded-lg shadow-sm cursor-pointer [&_.ld-icon]:text-2xl",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
    active ? "bg-accent border-accent text-white [&_.ld-icon]:text-white" : "bg-bg-raised border-line text-fg hover:border-line-strong [&_.ld-icon]:text-accent",
  );
export const chipLabel = (active: boolean) => cx("text-sm", active ? "text-white" : "text-fg-muted");

/** dd.ld-text-*: the dl's dd colour beat the tone in light mode; the dark tone rule won. */
export const ddTone = {
  ok: "font-semibold dark:text-tone-ok",
  warn: "font-semibold dark:text-tone-warn",
  crit: "font-semibold dark:text-tone-crit",
} as const;

/** The big entity tile (ld-tile inside ld-entity: 56px, 26px icon). */
export const entityTile = (tone: Tone) => cx("flex-none grid place-items-center w-14 h-14 rounded-[12px] text-5xl", toneBg[tone]);

const chartLegend = "flex gap-3.5 text-sm text-fg-muted -mt-1";
const donutRow = "flex flex-wrap items-center gap-4.5";

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
    <Page>
      <PageHead
        title={cfg.title}
        subtitle={<>{cfg.subtitle} · {tenant.name}</>}
        actions={
          <>
            <ReadOnlyBadge />
            {canWrite && (
              <Button variant="primary" onClick={() => setRoute(cfg.newRoute)}>
                <Icon icon={PlusIcon} /> New {noun.one}
              </Button>
            )}
          </>
        }
      />

      <Tabs aria-label={`${noun.one} views`}>
        {tabs.map((t) => (
          <Tab key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
          </Tab>
        ))}
      </Tabs>

      <div className={cx(ui.grid, ui.cols[5])}>
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
        <div className={cx(ui.grid, ui.cols[3])}>
          <Panel title={`${noun.one} Trend`}>
            <div className={chartLegend}>
              <span className="inline-flex items-center gap-1.5"><span className={ui.dot} style={{ background: "#2f6bff" }} />Opened</span>
              <span className="inline-flex items-center gap-1.5"><span className={ui.dot} style={{ background: "#16a34a" }} />Since {doneLabel}</span>
            </div>
            {records.length ? <TrendChart days={days} /> : <Empty>No {noun.many.toLowerCase()} yet.</Empty>}
          </Panel>
          <Panel title={`${noun.many} by Status`}>
            {records.length ? (
              <div className={donutRow}>
                <Donut slices={statusSlices} center={fmt(records.length)} sub="Total" label={`${records.length} ${noun.many.toLowerCase()} by status`} />
                <Legend slices={statusSlices} />
              </div>
            ) : (
              <Empty>No {noun.many.toLowerCase()} yet.</Empty>
            )}
          </Panel>
          <Panel title="SLA Compliance">
            {slaTotal ? (
              <div className={donutRow}>
                <div className="flex flex-col items-center gap-1">
                  <Donut slices={slaSlices} center={slaPct} label={`${slaPct} of ${noun.one.toLowerCase()} SLAs met`} />
                  <span className="text-base font-medium text-fg">SLA Met</span>
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
        className={cx(ui.card, ui.filters)}
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(query.trim());
        }}
        onReset={(e) => {
          e.preventDefault();
          reset();
        }}
      >
        <span className="w-[38px] h-[38px] rounded bg-bg-muted grid place-items-center text-fg-muted" aria-hidden="true"><Icon icon={FilterIcon} /></span>
        <div className={ui.filterField}>
          <label htmlFor={`${idp}-status`}>Status</label>
          <Select id={`${idp}-status`} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value={ANY}>All Statuses</option>
            {states.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
        <div className={ui.filterField}>
          <label htmlFor={`${idp}-priority`}>Priority</label>
          <Select id={`${idp}-priority`} value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value={ANY}>All Priorities</option>
            {[1, 2, 3, 4].map((p) => <option key={p} value={p}>{PRIORITY[p].label}</option>)}
          </Select>
        </div>
        <div className={ui.filterField}>
          <label htmlFor={`${idp}-category`}>Category</label>
          <Select id={`${idp}-category`} value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value={ANY}>All Categories</option>
            {categories.map(([c]) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </div>
        <div className={ui.filterField}>
          <label htmlFor={`${idp}-assignee`}>Assigned To</label>
          <Select id={`${idp}-assignee`} value={assignee} onChange={(e) => setAssignee(e.target.value)}>
            <option value={ANY}>All Users</option>
            <option value="__none">Unassigned</option>
            {people.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
        </div>
        <div className={cx(ui.filterField, ui.fieldGrow)}>
          <label htmlFor={`${idp}-search`} className="sr-only">Search {noun.many.toLowerCase()}</label>
          <SearchBox
            icon={<Icon icon={SearchIcon} />}
            id={`${idp}-search`}
            type="search"
            placeholder={`Search ${noun.many.toLowerCase()}…`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button type="submit" variant="primary">Search</Button>
        <Button type="reset">Reset</Button>
      </form>

      <div className={ui.split}>
        <section className={cx(ui.card, ui.panel)} aria-labelledby={`${idp}-list-h`}>
          <div className={ui.panelHead}>
            <h2 id={`${idp}-list-h`} className={ui.panelTitle}>{tab === "overview" ? `Recent ${noun.many}` : tabs.find((t) => t.id === tab)?.label}</h2>
            <span className="text-fg-muted text-xs">{fmt(visible.length)} records · auto-refresh 30s</span>
          </div>
          {pageRows.length ? (
            <Table>
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
                    <tr key={r.id} className={r.id === cfg.highlightId ? "[&>td]:bg-success-bg" : undefined}>
                      <td>
                        <button type="button" className={monoLink} onClick={() => setRoute(cfg.detailRoute, { id: r.id })}>
                          {r.id}
                        </button>
                      </td>
                      <td className={cx("overflow-hidden text-ellipsis", cfg.extraColumn ? "max-w-[140px]" : "max-w-[180px]")} title={`${r.title} · ${r.category} · ${r.group}`}>{r.title}</td>
                      <td><Pill tone={p.tone}>{p.label}</Pill></td>
                      <td><Pill tone={cfg.stateTone[r.state] ?? "muted"}>{r.state}</Pill></td>
                      {cfg.extraColumn && <td>{cfg.extraColumn.render(r)}</td>}
                      <td>{r.assignee || "Unassigned"}</td>
                      <td>{shortDate(r.opened, !!cfg.extraColumn)}</td>
                      <td>
                        <span className={cx("inline-flex items-center gap-[5px] text-xs font-semibold", SLA_TEXT[sla.tone])}>
                          <Icon name={sla.icon} /> {sla.label}
                        </span>
                      </td>
                      <td>
                        {canWrite && next && (
                          <Button
                            size="sm"
                            onClick={() => advance(r)}
                            disabled={cfg.advancing}
                            title={`Move ${r.id} to ${next}`}
                          >
                            {next} <Icon icon={ArrowRightIcon} />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          ) : (
            <Empty>{records.length ? `No ${noun.many.toLowerCase()} match these filters.` : `No ${noun.many.toLowerCase()} yet.`}</Empty>
          )}
          {visible.length > PAGE_SIZE && (
            <nav className={ui.pager} aria-label="Pagination">
              <span className="text-fg-muted text-xs">
                Showing {page * PAGE_SIZE + 1}–{Math.min(visible.length, (page + 1) * PAGE_SIZE)} of {fmt(visible.length)}
              </span>
              <div className={ui.pagerBtns}>
                <Button size="sm" onClick={() => setPage(page - 1)} disabled={page === 0} aria-label="Previous page">
                  <Icon icon={ChevronLeftIcon} />
                </Button>
                {Array.from({ length: pages }, (_, i) => (
                  <Button
                    key={i}
                    size="sm"
                    variant={i === page ? "primary" : "default"}
                    aria-current={i === page ? "page" : undefined}
                    onClick={() => setPage(i)}
                  >
                    {i + 1}
                  </Button>
                ))}
                <Button size="sm" onClick={() => setPage(page + 1)} disabled={page >= pages - 1} aria-label="Next page">
                  <Icon icon={ChevronRightIcon} />
                </Button>
              </div>
            </nav>
          )}
        </section>

        <div className={ui.rail}>
          <Panel title={cfg.majorTitle} action={{ label: "View All", onClick: () => setTab("major") }}>
            {major.length ? (
              <ul className="list-none flex flex-col gap-3">
                {major.map((r) => (
                  <li key={r.id} className="flex items-start gap-2.5">
                    <Tile tone="crit" size="sm"><Icon name={cfg.majorIcon} /></Tile>
                    <span className="flex-1 min-w-0 flex flex-col items-start gap-px">
                      <button type="button" className={monoLink} onClick={() => setRoute(cfg.detailRoute, { id: r.id })}>{r.id}</button>
                      <span className="text-sm text-fg max-w-full overflow-hidden text-ellipsis whitespace-nowrap" title={r.title}>{r.title}</span>
                      <span className="text-fg-muted text-xs">{r.updated} · {r.group}</span>
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
              <ul className={ui.bars}>
                {categories.slice(0, 7).map(([label, value], i) => (
                  <li key={label} className={ui.barItem}>
                    <span className={ui.barLabel}>{label}</span>
                    <span className={ui.barTrack}>
                      <span className={ui.barFill} style={{ width: `${(value / topCat) * 100}%`, background: PALETTE[i % PALETTE.length] }} />
                    </span>
                    <span className={ui.barValue}>{value}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No {noun.many.toLowerCase()} yet.</Empty>
            )}
          </Panel>
        </div>
      </div>
    </Page>
  );
}
