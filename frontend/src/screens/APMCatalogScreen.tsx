// Application Catalog (Argus/Argus-LinkedEye native — no third-party branding)
// Single-pane inventory across Services · APM/OTel, Browser, Mobile, to be
// backed by /api/catalog/applications/. Until that API exists the catalog is
// the labelled sample below (also read by AppDetailScreen).
import React from "react";
import { useNav } from "@/hooks/useNav";
import { getStatusLabel } from "@/lib/statusColors";
import { Empty, Pill, PillDot, StatCard, fmt } from "@/components/ld";
import { Button, Card, buttonClass, Crumbs, Page, PageHead, SearchBox, Select, Table, cx, ui } from "@/components/ui";
import type { Tone } from "@/components/ld";

import { Icon } from "@/components/Icon";
import { BellIcon, ChevronLeftIcon, ChevronRightIcon, Columns3Icon, ExternalLinkIcon, EyeIcon, FileSpreadsheetIcon, FlaskConicalIcon, PlusIcon, SearchIcon, WandSparklesIcon, XIcon } from "lucide-react";
export interface CatalogEntity {
  id: string;
  type: string;
  env: string;
  lang: string;
  team: string;
  client: string;
  bizSvc: string;
  health: string;
  score: number;
  infra: number;
  ns: string;
  cluster: string;
  alerts: number;
  lastDeploy: string;
  deployOutcome: string;
  lastReport: string;
  repos: number;
  ai: string | null;
  rt: number;
  tput: number;
  err: number;
  cpu: number;
  mem: number;
  uptime: string;
  sla: number;
  runbook: string;
}

export const CATALOG_ENTITIES: CatalogEntity[] = [
  { id: "checkout-api",     type: "Services - APM",           env: "production", lang: "Node",   team: "Checkout",      client: "Fyers", bizSvc: "Checkout",      health: "crit", score: 74, infra: 14, ns: "checkout",    cluster: "prod-blr-1", alerts: 3, lastDeploy: "2h ago",  deployOutcome: "regression", lastReport: "12s ago", repos: 1, ai: null,      rt: 418,  tput: 12400, err: 2.14, cpu: 68, mem: 74, uptime: "41d 6h",  sla: 99.4,  runbook: "KB-2114" },
  { id: "web-bff",          type: "Services - APM",           env: "production", lang: "Node",   team: "Checkout",      client: "Fyers", bizSvc: "Checkout",      health: "warn", score: 88, infra: 8,  ns: "checkout",    cluster: "prod-blr-1", alerts: 1, lastDeploy: "6h ago",  deployOutcome: "neutral",   lastReport: "8s ago",  repos: 1, ai: null,      rt: 142,  tput: 18200, err: 0.42, cpu: 44, mem: 51, uptime: "12d 3h",  sla: 99.9,  runbook: "KB-2098" },
  { id: "checkout.web",     type: "Browser",                  env: "production", lang: "TS",     team: "Checkout",      client: "Fyers", bizSvc: "Checkout",      health: "warn", score: 81, infra: 0,  ns: "—",           cluster: "—",          alerts: 1, lastDeploy: "1d ago",  deployOutcome: "neutral",   lastReport: "40s ago", repos: 1, ai: null,      rt: 1800, tput: 9200,  err: 0.9,  cpu: 0,  mem: 0,  uptime: "—",        sla: 99.7,  runbook: "KB-1882" },
  { id: "checkout.ios",     type: "Mobile",                   env: "production", lang: "Swift",  team: "Checkout",      client: "Fyers", bizSvc: "Checkout",      health: "ok",   score: 95, infra: 0,  ns: "—",           cluster: "—",          alerts: 0, lastDeploy: "4d ago",  deployOutcome: "improved",  lastReport: "2m ago",  repos: 1, ai: null,      rt: 620,  tput: 3100,  err: 0.12, cpu: 0,  mem: 0,  uptime: "—",        sla: 99.95, runbook: "KB-1881" },
  { id: "checkout.android", type: "Mobile",                   env: "production", lang: "Kotlin", team: "Checkout",      client: "Fyers", bizSvc: "Checkout",      health: "ok",   score: 93, infra: 0,  ns: "—",           cluster: "—",          alerts: 0, lastDeploy: "4d ago",  deployOutcome: "improved",  lastReport: "1m ago",  repos: 1, ai: null,      rt: 680,  tput: 2900,  err: 0.18, cpu: 0,  mem: 0,  uptime: "—",        sla: 99.94, runbook: "KB-1881" },
  { id: "payments-svc",     type: "Services - APM",           env: "production", lang: "Java",   team: "Payments",      client: "Fyers", bizSvc: "Payments",      health: "crit", score: 52, infra: 10, ns: "payments",    cluster: "prod-blr-1", alerts: 4, lastDeploy: "5h ago",  deployOutcome: "regression", lastReport: "6s ago",  repos: 1, ai: null,      rt: 684,  tput: 4200,  err: 4.82, cpu: 82, mem: 88, uptime: "3d 1h",   sla: 98.1,  runbook: "KB-2214" },
  { id: "stripe-adapter",   type: "Services - APM",           env: "production", lang: "Go",     team: "Payments",      client: "Fyers", bizSvc: "Payments",      health: "crit", score: 58, infra: 4,  ns: "payments",    cluster: "prod-blr-1", alerts: 2, lastDeploy: "5h ago",  deployOutcome: "regression", lastReport: "9s ago",  repos: 1, ai: null,      rt: 312,  tput: 4000,  err: 2.9,  cpu: 61, mem: 55, uptime: "3d 1h",   sla: 98.6,  runbook: "KB-2215" },
  { id: "fraud-svc",        type: "Services - APM",           env: "production", lang: "Python", team: "Payments",      client: "Fyers", bizSvc: "Payments",      health: "ok",   score: 96, infra: 6,  ns: "payments",    cluster: "prod-blr-1", alerts: 0, lastDeploy: "2d ago",  deployOutcome: "improved",  lastReport: "4s ago",  repos: 1, ai: "Bedrock", rt: 88,   tput: 4000,  err: 0.06, cpu: 22, mem: 38, uptime: "19d 4h",  sla: 99.99, runbook: "KB-1904" },
  { id: "inventory-svc",    type: "Services - APM",           env: "production", lang: "Go",     team: "Inventory",     client: "Fyers", bizSvc: "Inventory",     health: "ok",   score: 97, infra: 6,  ns: "inventory",   cluster: "prod-blr-1", alerts: 0, lastDeploy: "3d ago",  deployOutcome: "improved",  lastReport: "3s ago",  repos: 1, ai: null,      rt: 64,   tput: 22000, err: 0.02, cpu: 18, mem: 29, uptime: "19d 4h",  sla: 99.99, runbook: "KB-1755" },
  { id: "auth-svc",         type: "Services - APM",           env: "production", lang: "Rust",   team: "Identity",      client: "Fyers", bizSvc: "Identity",      health: "ok",   score: 98, infra: 5,  ns: "identity",    cluster: "prod-blr-1", alerts: 0, lastDeploy: "6d ago",  deployOutcome: "neutral",   lastReport: "2s ago",  repos: 1, ai: null,      rt: 22,   tput: 31000, err: 0.01, cpu: 14, mem: 21, uptime: "44d 2h",  sla: 99.99, runbook: "KB-1602" },
  { id: "search-svc",       type: "Services - OpenTelemetry", env: "production", lang: "Java",   team: "Discovery",     client: "IndMoney",    bizSvc: "Discovery",     health: "warn", score: 79, infra: 7,  ns: "discovery",   cluster: "prod-blr-1", alerts: 1, lastDeploy: "1d ago",  deployOutcome: "neutral",   lastReport: "15s ago", repos: 1, ai: "OpenAI",  rt: 210,  tput: 6800,  err: 0.9,  cpu: 58, mem: 66, uptime: "9d 8h",   sla: 99.5,  runbook: "KB-1990" },
  { id: "notify-svc",       type: "Services - APM",           env: "production", lang: "Ruby",   team: "Notifications", client: "IndMoney",    bizSvc: "Notifications", health: "ok",   score: 94, infra: 3,  ns: "notify",      cluster: "prod-blr-1", alerts: 0, lastDeploy: "2d ago",  deployOutcome: "improved",  lastReport: "5s ago",  repos: 1, ai: null,      rt: 48,   tput: 9400,  err: 0.05, cpu: 12, mem: 19, uptime: "19d 4h",  sla: 99.98, runbook: "KB-1622" },
  { id: "checkout-api-stg", type: "Services - APM",           env: "staging",    lang: "Node",   team: "Checkout",      client: "Fyers", bizSvc: "Checkout",      health: "unknown", score: 82, infra: 2,  ns: "checkout-stg", cluster: "stg-blr-1",  alerts: 0, lastDeploy: "18m ago", deployOutcome: "neutral",   lastReport: "1s ago",  repos: 1, ai: null,      rt: 220,  tput: 1100,  err: 0.3,  cpu: 21, mem: 33, uptime: "0d 4h",   sla: 100,   runbook: "KB-2114" },
];

const CATALOG_COLUMNS: (keyof CatalogEntity)[] = ["type","env","lang","team","bizSvc","health","score","infra","ns","cluster","alerts","lastDeploy","lastReport","repos","ai","rt","tput","err","cpu","mem","uptime","sla","runbook"];
const COLUMN_LABELS: Record<string, string> = { type:"Entity Type", env:"Environment", lang:"Language", team:"Team Owner", bizSvc:"Business Service", health:"Health Status", score:"Score", infra:"Infra Count", ns:"K8s Namespace", cluster:"Cluster", alerts:"Active Alerts", lastDeploy:"Last Deployment", lastReport:"Last Reporting", repos:"Repositories", ai:"AI Assets", rt:"Response Time", tput:"Throughput", err:"Error Rate", cpu:"CPU Usage", mem:"Memory Usage", uptime:"Uptime", sla:"SLA/SLO", runbook:"Runbook" };
const DEFAULT_COLS: string[] = ["type","env","lang","team","health","score","infra","alerts","lastDeploy","repos","ai","rt","err"];
const GROUP_OPTIONS = ["None", "Entity type", "Environment", "Team", "Client", "Language", "AI asset"];

export const healthTone = (h: string): Tone => (h === "crit" ? "crit" : h === "warn" ? "warn" : h === "ok" ? "ok" : "muted");
export const errTone = (v: number): Tone => (v > 2 ? "crit" : v > 0.5 ? "warn" : "ok");
export const loadTone = (v: number): Tone => (v >= 85 ? "crit" : v >= 70 ? "warn" : "ok");
export const outcomeTone = (o: string): Tone => (o === "regression" ? "crit" : o === "improved" ? "ok" : "muted");
export const fmtRt = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`);
// Observe-area pieces (Tailwind versions of the old observe.css rules).
const focusRing = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2";
/** Text link in mono (the old link + mono pair: mono's 12px / 600 won). */
const linkMono = cx("border-0 bg-transparent p-0 text-accent cursor-pointer hover:underline font-mono text-xs font-semibold", focusRing);
/** Mono text in a table cell keeps the cell's 13px (the old mono class lost to it). */
const cellMono = "font-mono font-semibold";
/** Segmented button group. */
const seg = "inline-flex flex-wrap gap-1";
/** Sortable column header button. */
const sortBtn = cx("inline-flex items-center gap-1 border-0 bg-transparent p-0 [font:inherit] text-inherit cursor-pointer whitespace-nowrap [&_.ld-icon]:text-[9px]", focusRing);
const nameCell = "flex items-center gap-2.5 min-w-0";
const badge = "flex-none inline-grid place-items-center w-[30px] h-[30px] rounded bg-bg-muted text-fg-muted font-mono text-[10px] font-bold";
const meter = "inline-flex items-center gap-2";
const meterTrack = "w-20 h-2 rounded-[5px] bg-bg-muted overflow-hidden";
const meterFill = "block h-2 rounded-[5px]";
const menu = "m-0 absolute right-0 top-[calc(100%+4px)] z-20 flex flex-col gap-0.5 min-w-[220px] max-h-[320px] overflow-y-auto p-2 bg-bg-raised border border-line rounded shadow-lg [&_label]:flex [&_label]:items-center [&_label]:gap-2 [&_label]:px-1.5 [&_label]:py-1 [&_label]:text-sm [&_label]:text-fg [&_label]:cursor-pointer";
const backdrop = "fixed inset-0 z-40 bg-[rgba(10,20,51,0.32)] border-0 p-0 cursor-default";
const drawerCls = "fixed top-0 right-0 bottom-0 z-[41] w-[min(380px,100vw)] flex flex-col gap-3.5 px-4.5 py-4 overflow-y-auto bg-bg-raised border-l border-line shadow-lg";
/** Six-up stat row: 180px columns (the old dense-card overrides never reached StatCard). */
const sixUp = ui.cols[6];
// Status text in a table cell / figure box: in light mode the cell's own colour
// won (only the weight showed); in dark mode the status colour won.
const cellTone = { crit: "font-semibold dark:text-tone-crit", warn: "font-semibold dark:text-tone-warn", ok: "font-semibold dark:text-tone-ok" } as const;
const scoreColor = (s: number) => (s >= 90 ? "#16a34a" : s >= 75 ? "#f5a524" : "#e5383b");

export default function APMCatalogScreen() {
  const { setRoute } = useNav();
  const idp = React.useId();
  const [query, setQuery] = React.useState("");
  const [envFilter, setEnvFilter] = React.useState("all");
  const [teamFilter, setTeamFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [langFilter, setLangFilter] = React.useState("all");
  const [clientFilter, setClientFilter] = React.useState("all");
  const [clusterFilter, setClusterFilter] = React.useState("all");
  const [groupBy, setGroupBy] = React.useState("None");
  const [visCols, setVisCols] = React.useState<Record<string, boolean>>(Object.fromEntries(CATALOG_COLUMNS.map(c => [c, DEFAULT_COLS.includes(c)])));
  const [colMenuOpen, setColMenuOpen] = React.useState(false);
  const [sortKey, setSortKey] = React.useState<keyof CatalogEntity | null>(null);
  const [sortDir, setSortDir] = React.useState(1);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [drawer, setDrawer] = React.useState<string | null>(null); // entity id
  const closeRef = React.useRef<HTMLButtonElement>(null);

  const uniq = (k: "env" | "team" | "lang" | "client" | "cluster") => ["all", ...new Set(CATALOG_ENTITIES.map(e => e[k]))];
  const envs = uniq("env"), teams = uniq("team"), langs = uniq("lang"), clients = uniq("client"), clusters = uniq("cluster");
  const q = query.trim().toLowerCase();

  let rows = CATALOG_ENTITIES.filter(e =>
    (envFilter === "all" || e.env === envFilter) && (teamFilter === "all" || e.team === teamFilter) &&
    (statusFilter === "all" || e.health === statusFilter) && (langFilter === "all" || e.lang === langFilter) &&
    (clientFilter === "all" || e.client === clientFilter) && (clusterFilter === "all" || e.cluster === clusterFilter) &&
    (!q || [e.id, e.type, e.lang, e.team, e.client, e.bizSvc].some(v => String(v).toLowerCase().includes(q)))
  );
  if (sortKey) rows = [...rows].sort((a, b) => ((a[sortKey] as any) > (b[sortKey] as any) ? 1 : (a[sortKey] as any) < (b[sortKey] as any) ? -1 : 0) * sortDir);

  const groupKeyFn = ({ "None": null, "Entity type": (e: CatalogEntity) => e.type, "Environment": (e: CatalogEntity) => e.env, "Team": (e: CatalogEntity) => e.team, "Client": (e: CatalogEntity) => e.client, "Language": (e: CatalogEntity) => e.lang, "AI asset": (e: CatalogEntity) => e.ai || "None" } as Record<string, ((e: CatalogEntity) => string) | null>)[groupBy];
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const pageRows = groupKeyFn ? rows : rows.slice((page - 1) * pageSize, page * pageSize);
  const groups: [string, CatalogEntity[]][] = groupKeyFn ? Object.entries(rows.reduce<Record<string, CatalogEntity[]>>((acc, e) => { const k = groupKeyFn(e); (acc[k] = acc[k] || []).push(e); return acc; }, {})) : [["", pageRows]];

  const toggleSort = (k: keyof CatalogEntity) => { if (sortKey === k) setSortDir(d => -d); else { setSortKey(k); setSortDir(1); } setPage(1); };
  const ariaSort = (k: keyof CatalogEntity) => (sortKey === k ? (sortDir === 1 ? "ascending" : "descending") : undefined);
  const SortIcon = ({ k }: { k: keyof CatalogEntity }) => sortKey === k ? <Icon className={`fa-solid fa-arrow-${sortDir === 1 ? "up" : "down"}`} /> : null;
  const openEntity = (id: string) => { setRoute("app-detail", { appName: id }); };

  const exportCSV = () => {
    const cols: (keyof CatalogEntity)[] = ["id", ...CATALOG_COLUMNS];
    const lines = [cols.map(c => COLUMN_LABELS[c] || c).join(",")];
    rows.forEach(e => lines.push(cols.map(c => c === "id" ? e.id : e[c]).join(",")));
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "application-catalog.csv"; a.click();
  };

  React.useEffect(() => { setPage(1); }, [query, envFilter, teamFilter, statusFilter, langFilter, clientFilter, clusterFilter, pageSize]);

  // Quick-view drawer: focus the close button, close on Escape.
  React.useEffect(() => {
    if (!drawer) return;
    closeRef.current?.focus();
    const onKey = (ev: KeyboardEvent) => { if (ev.key === "Escape") setDrawer(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawer]);

  const shownCols = CATALOG_COLUMNS.filter(c => visCols[c]);

  const Row = ({ e }: { e: CatalogEntity }) => (
    <tr className={e.health === "crit" ? "[&>td]:bg-warning-bg" : undefined}>
      <td>
        <span className={nameCell}>
          <span className={badge} aria-hidden="true">{e.lang.slice(0, 2).toUpperCase()}</span>
          <span>
            <button type="button" className={linkMono} onClick={() => openEntity(e.id)}>{e.id}</button>
            <span className={ui.sub}>{e.bizSvc} · {e.client}</span>
          </span>
        </span>
      </td>
      {visCols.type && <td><Pill tone="muted">{e.type}</Pill></td>}
      {visCols.env && <td className={cellMono}>{e.env}</td>}
      {visCols.lang && <td>{e.lang}</td>}
      {visCols.team && <td>{e.team}</td>}
      {visCols.bizSvc && <td>{e.bizSvc}</td>}
      {visCols.health && <td><Pill tone={healthTone(e.health)}><PillDot />{getStatusLabel(e.health)}</Pill></td>}
      {visCols.score && <td>
        <span className={meter} title={`${e.score}% of scorecard rules met`}>
          <span className="font-medium">{e.score}%</span>
          <span className={meterTrack} aria-hidden="true"><span className={meterFill} style={{ width: `${e.score}%`, background: scoreColor(e.score) }} /></span>
        </span>
      </td>}
      {visCols.infra && <td title={e.infra > 0 ? `${e.infra} resources · ${e.cluster !== "—" ? e.cluster : "no cluster"}` : undefined}>{e.infra > 0 ? e.infra : <span className="text-fg-muted">—</span>}</td>}
      {visCols.ns && <td className={cellMono}>{e.ns}</td>}
      {visCols.cluster && <td className={cellMono}>{e.cluster}</td>}
      {visCols.alerts && <td>{e.alerts > 0 ? <Pill tone={e.alerts > 2 ? "crit" : "warn"}><Icon icon={BellIcon} /> {e.alerts}</Pill> : <span className="text-fg-muted">0</span>}</td>}
      {visCols.lastDeploy && <td>
        {e.lastDeploy}
        <span className={ui.sub}><Pill tone={outcomeTone(e.deployOutcome)}>{e.deployOutcome}</Pill></span>
      </td>}
      {visCols.lastReport && <td>{e.lastReport}</td>}
      {visCols.repos && <td title={`git.internal/finspot/${e.id}`}>{e.repos}</td>}
      {visCols.ai && <td>{e.ai ? <Pill tone="purple"><Icon icon={WandSparklesIcon} /> {e.ai}</Pill> : <span className="text-fg-muted">—</span>}</td>}
      {visCols.rt && <td>{fmtRt(e.rt)}</td>}
      {visCols.tput && <td>{(e.tput/1000).toFixed(1)}k rpm</td>}
      {visCols.err && <td><Pill tone={errTone(e.err)}>{e.err.toFixed(2)}%</Pill></td>}
      {visCols.cpu && <td>{e.cpu > 0 ? <Pill tone={loadTone(e.cpu)}>{e.cpu}%</Pill> : <span className="text-fg-muted">—</span>}</td>}
      {visCols.mem && <td>{e.mem > 0 ? <Pill tone={loadTone(e.mem)}>{e.mem}%</Pill> : <span className="text-fg-muted">—</span>}</td>}
      {visCols.uptime && <td className={cellMono}>{e.uptime}</td>}
      {visCols.sla && <td className={e.sla < 99.5 ? cellTone.crit : e.sla < 99.9 ? cellTone.warn : cellTone.ok}>{e.sla}%</td>}
      {visCols.runbook && <td className={cellMono}>{e.runbook}</td>}
      <td>
        <span className={seg}>
          <Button size="sm" onClick={() => setDrawer(e.id)} aria-label={`Quick view ${e.id}`} title="Quick view"><Icon icon={EyeIcon} /></Button>
          <Button size="sm" onClick={() => openEntity(e.id)} aria-label={`Open ${e.id}`} title="Open detail"><Icon icon={ExternalLinkIcon} /></Button>
        </span>
      </td>
    </tr>
  );

  const drawerEntity = drawer ? CATALOG_ENTITIES.find(e => e.id === drawer) : null;
  const filters: [string, string, string, (v: string) => void, string[]][] = [
    ["env", "Environment", envFilter, setEnvFilter, envs],
    ["team", "Team", teamFilter, setTeamFilter, teams],
    ["client", "Client", clientFilter, setClientFilter, clients],
    ["lang", "Language", langFilter, setLangFilter, langs],
    ["cluster", "Cluster", clusterFilter, setClusterFilter, clusters],
  ];

  return (
    <Page>
      <Crumbs items={[{ label: "Home", onClick: () => setRoute("dashboard") }, { label: "Application Catalog" }]} />

      <PageHead
        title="Application Catalog"
        subtitle="Every application, service, and mobile/browser entity — health, ownership, deployments, and golden metrics in one table"
        actions={<>
          <Button onClick={exportCSV}><Icon icon={FileSpreadsheetIcon} /> Export CSV</Button>
          <Button variant="primary"><Icon icon={PlusIcon} /> Add application</Button>
        </>}
      />

      <Card className={ui.notice} role="note">
        <Icon icon={FlaskConicalIcon} />
        <div>
          <b>Sample data</b>
          <p className="text-fg-muted text-xs">The application catalog API is not connected yet. These {CATALOG_ENTITIES.length} entities and their metrics are illustrative.</p>
        </div>
      </Card>

      <div className={cx(ui.grid, sixUp)}>
        <StatCard icon="fa-cubes" tone="info" label="Applications" value={fmt(CATALOG_ENTITIES.length)} note="all types" onClick={() => setStatusFilter("all")} />
        <StatCard icon="fa-circle-check" tone="ok" label="Healthy" value={fmt(CATALOG_ENTITIES.filter(e => e.health === "ok").length)} note="green" onClick={() => setStatusFilter("ok")} />
        <StatCard icon="fa-triangle-exclamation" tone="warn" label="Warning" value={fmt(CATALOG_ENTITIES.filter(e => e.health === "warn").length)} note="yellow" onClick={() => setStatusFilter("warn")} />
        <StatCard icon="fa-circle-xmark" tone="crit" label="Critical" value={fmt(CATALOG_ENTITIES.filter(e => e.health === "crit").length)} note="red" onClick={() => setStatusFilter("crit")} />
        <StatCard icon="fa-wand-magic-sparkles" tone="purple" label="With AI assets" value={fmt(CATALOG_ENTITIES.filter(e => e.ai).length)} note={[...new Set(CATALOG_ENTITIES.map(e => e.ai).filter(Boolean))].join(" · ") || "none"} />
        <StatCard icon="fa-code-branch" tone="crit" label="Regressions" value={fmt(CATALOG_ENTITIES.filter(e => e.deployOutcome === "regression").length)} note="last deploy" />
      </div>

      <section className={cx(ui.card, ui.panel)} aria-labelledby={`${idp}-h`}>
        <div className={ui.panelHead}>
          <h2 id={`${idp}-h`} className={ui.panelTitle}>Applications ({fmt(rows.length)})</h2>
          <span className="text-fg-muted text-xs">{fmt(CATALOG_ENTITIES.reduce((s, e) => s + e.alerts, 0))} active alerts</span>
        </div>

        <div className={ui.filters}>
          <div className={cx(ui.filterField, ui.fieldGrow)}>
            <label htmlFor={`${idp}-q`}>Search</label>
            <SearchBox icon={<Icon icon={SearchIcon} />} id={`${idp}-q`} type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search application name…" />
          </div>
          {filters.map(([key, label, val, setter, opts]) => (
            <div key={key} className={ui.filterField}>
              <label htmlFor={`${idp}-${key}`}>{label}</label>
              <Select id={`${idp}-${key}`} value={val} onChange={e => setter(e.target.value)}>
                {opts.map(o => <option key={o} value={o}>{o === "all" ? `All` : o}</option>)}
              </Select>
            </div>
          ))}
          <div className={ui.filterField}>
            <label htmlFor={`${idp}-group`}>Group by</label>
            <Select id={`${idp}-group`} value={groupBy} onChange={e => setGroupBy(e.target.value)}>
              {GROUP_OPTIONS.map(g => <option key={g}>{g}</option>)}
            </Select>
          </div>
        </div>

        <div className={ui.toolbar}>
          <span className={seg} role="group" aria-label="Filter by health status">
            {["all", "ok", "warn", "crit", "unknown"].map(s => (
              <Button key={s} size="sm" variant={statusFilter === s ? "primary" : "default"} aria-pressed={statusFilter === s} onClick={() => setStatusFilter(s)}>
                {s === "all" ? "All status" : getStatusLabel(s)}
              </Button>
            ))}
          </span>
          <span className={ui.fieldGrow} />
          <div className="relative">
            <Button size="sm" aria-expanded={colMenuOpen} aria-controls={`${idp}-cols`} onClick={() => setColMenuOpen(o => !o)}>
              <Icon icon={Columns3Icon} /> Columns
            </Button>
            {colMenuOpen && (
              <fieldset id={`${idp}-cols`} className={menu}>
                <legend className="sr-only">Visible columns</legend>
                {CATALOG_COLUMNS.map(c => (
                  <label key={c}>
                    <input type="checkbox" checked={visCols[c]} onChange={() => setVisCols(v => ({ ...v, [c]: !v[c] }))} />
                    {COLUMN_LABELS[c]}
                  </label>
                ))}
              </fieldset>
            )}
          </div>
        </div>

        {rows.length ? (
          <Table>
              <thead>
                <tr>
                  <th scope="col" aria-sort={ariaSort("id")}><button type="button" className={sortBtn} onClick={() => toggleSort("id")}>Application<SortIcon k="id" /></button></th>
                  {shownCols.map(c => (
                    <th key={c} scope="col" aria-sort={ariaSort(c)}><button type="button" className={sortBtn} onClick={() => toggleSort(c)}>{COLUMN_LABELS[c]}<SortIcon k={c} /></button></th>
                  ))}
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {groups.map(([label, items]) => (
                  <React.Fragment key={label || "all"}>
                    {groupBy !== "None" && (
                      <tr><th scope="rowgroup" colSpan={shownCols.length + 2}>{label} · {items.length}</th></tr>
                    )}
                    {items.map(e => <Row key={e.id} e={e} />)}
                  </React.Fragment>
                ))}
              </tbody>
          </Table>
        ) : (
          <Empty>No applications match the current filters.</Empty>
        )}

        {!groupKeyFn && (
          <nav className={ui.pager} aria-label="Pagination">
            <span className="text-fg-muted text-xs">Showing {rows.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, rows.length)} of {rows.length}</span>
            <div className={ui.pagerBtns}>
              <label htmlFor={`${idp}-size`} className="sr-only">Rows per page</label>
              <Select id={`${idp}-size`} value={pageSize} onChange={e => setPageSize(+e.target.value)}>{[10, 25, 50].map(n => <option key={n} value={n}>{n} / page</option>)}</Select>
              <Button size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)} aria-label="Previous page"><Icon icon={ChevronLeftIcon} /></Button>
              <span className="text-fg-muted text-xs">Page {page} / {totalPages}</span>
              <Button size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)} aria-label="Next page"><Icon icon={ChevronRightIcon} /></Button>
            </div>
          </nav>
        )}
      </section>

      {/* Quick-view drawer */}
      {drawerEntity && (
        <>
          <button type="button" className={backdrop} aria-label="Close quick view" tabIndex={-1} onClick={() => setDrawer(null)} />
          <aside className={drawerCls} role="dialog" aria-modal="true" aria-labelledby={`${idp}-drawer-h`}>
            <div className="flex justify-between items-start gap-2.5">
              <div>
                <h2 id={`${idp}-drawer-h`} className="font-mono text-md font-bold text-fg">{drawerEntity.id}</h2>
                <span className={ui.sub}>{drawerEntity.bizSvc} · {drawerEntity.client}</span>
              </div>
              <button ref={closeRef} type="button" className={buttonClass("default", "sm")} onClick={() => setDrawer(null)} aria-label="Close"><Icon icon={XIcon} /></button>
            </div>
            <Pill tone="muted">Sample data</Pill>
            <dl className={ui.dl}>
              <dt>Health</dt><dd><Pill tone={healthTone(drawerEntity.health)}><PillDot />{getStatusLabel(drawerEntity.health)}</Pill></dd>
              <dt>Score</dt><dd>{drawerEntity.score}%</dd>
              <dt>Team owner</dt><dd>{drawerEntity.team}</dd>
              <dt>Environment</dt><dd>{drawerEntity.env}</dd>
              <dt>Cluster / ns</dt><dd className={ui.mono}>{drawerEntity.cluster} / {drawerEntity.ns}</dd>
              <dt>Response time</dt><dd>{fmtRt(drawerEntity.rt)}</dd>
              <dt>Error rate</dt><dd><Pill tone={errTone(drawerEntity.err)}>{drawerEntity.err.toFixed(2)}%</Pill></dd>
              <dt>CPU / Memory</dt><dd>{drawerEntity.cpu > 0 ? `${drawerEntity.cpu}% / ${drawerEntity.mem}%` : "—"}</dd>
              <dt>SLA (30d)</dt><dd>{drawerEntity.sla}%</dd>
              <dt>Active alerts</dt><dd>{drawerEntity.alerts}</dd>
              <dt>Last deployment</dt><dd>{drawerEntity.lastDeploy} · {drawerEntity.deployOutcome}</dd>
              <dt>Runbook</dt><dd className={ui.mono}>{drawerEntity.runbook}</dd>
            </dl>
            <Button variant="primary" onClick={() => openEntity(drawerEntity.id)}><Icon icon={ExternalLinkIcon} /> Open full detail</Button>
          </aside>
        </>
      )}
    </Page>
  );
}
