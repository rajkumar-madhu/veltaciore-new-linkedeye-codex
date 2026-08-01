// Application Catalog (Argus/Argus-LinkedEye native — no third-party branding)
// Ported from screens/apm-catalog.jsx.
// Single-pane inventory across Services · APM/OTel, Browser, Mobile, backed by /api/catalog/applications/
import React from "react";
import { useNav } from "@/hooks/useNav";
import { Kpi, Field } from "@/components/primitives";
import { statusBadgeStyle, getStatusLabel, getMetricColor, getCpuColor, getMemColor } from "@/lib/statusColors";

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

export default function APMCatalogScreen() {
  const { setRoute } = useNav();
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
  const [pop, setPop] = React.useState<{ x: number; y: number; title: string; body: string } | null>(null);     // {x,y,title,body}
  const [drawer, setDrawer] = React.useState<string | null>(null); // entity id

  const langClass = (l: string) => ({ Node: "lang-node", Go: "lang-go", Java: "lang-java", Rust: "lang-rust", Ruby: "lang-ruby", Python: "lang-python", TS: "lang-node", Swift: "lang-java", Kotlin: "lang-go" } as Record<string, string>)[l] || "lang-node";
  const errClass = (v: number) => v > 2 ? "critical" : v > 0.5 ? "warn" : "ok";

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
  const SortIcon = ({ k }: { k: keyof CatalogEntity }) => sortKey === k ? <i className={`fa-solid fa-arrow-${sortDir === 1 ? "up" : "down"}`} style={{ fontSize: 9, marginLeft: 4 }} /> : null;
  const openEntity = (id: string) => { setRoute("app-detail", { appName: id }); };

  const showPop = (e: React.MouseEvent, title: string, body: string) => { const r = e.currentTarget.getBoundingClientRect(); setPop({ x: r.left, y: r.bottom + 4, title, body }); };
  const hidePop = () => setPop(null);

  const exportCSV = () => {
    const cols: (keyof CatalogEntity)[] = ["id", ...CATALOG_COLUMNS];
    const lines = [cols.map(c => COLUMN_LABELS[c] || c).join(",")];
    rows.forEach(e => lines.push(cols.map(c => c === "id" ? e.id : e[c]).join(",")));
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "application-catalog.csv"; a.click();
  };

  React.useEffect(() => { setPage(1); }, [query, envFilter, teamFilter, statusFilter, langFilter, clientFilter, clusterFilter, pageSize]);

  const Row = ({ e }: { e: CatalogEntity }) => (
    <tr key={e.id} className="apm-table" style={{ background: e.health === "crit" ? "rgba(239,68,68,.04)" : undefined }}>
      <td>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className={`apm-lang-dot ${langClass(e.lang)}`}>{e.lang.slice(0, 2).toUpperCase()}</span>
          <div>
            <a className="sn-link mono" onClick={() => openEntity(e.id)}><b>{e.id}</b></a>
            <div className="text-mute" style={{ fontSize: 10.5 }}>{e.bizSvc} · {e.client}</div>
          </div>
        </div>
      </td>
      {visCols.type && <td><span className="sn-state-pill state-neutral"><i className="fa-solid fa-circle" /> {e.type}</span></td>}
      {visCols.env && <td className="mono" style={{ fontSize: 11 }}>{e.env}</td>}
      {visCols.lang && <td className="mono">{e.lang}</td>}
      {visCols.team && <td><a className="sn-link" onMouseEnter={ev => showPop(ev, e.team, `On-call: Priya R. · 6 members · Slack #${e.team.toLowerCase()}`)} onMouseLeave={hidePop}>{e.team}</a></td>}
      {visCols.bizSvc && <td>{e.bizSvc}</td>}
      {visCols.health && <td><span style={statusBadgeStyle(e.health)}><i className="fa-solid fa-circle" style={{ fontSize: 6 }} /> {getStatusLabel(e.health)}</span></td>}
      {visCols.score && <td>
        <div className="apdex" style={{ minWidth: 56 }} onMouseEnter={ev => showPop(ev, "Scorecard", `${e.score}% of rules met · security 92% · reliability ${e.score}% · docs 74%`)} onMouseLeave={hidePop}>
          <span className="apdex-val" style={{ color: getMetricColor(100 - e.score, 15, 30).fg }}>{e.score}%</span>
          <div className="apdex-bar"><div className="apdex-fill" style={{ width: e.score + "%", background: getMetricColor(100 - e.score, 15, 30).line }} /></div>
        </div>
      </td>}
      {visCols.infra && <td className="mono" onMouseEnter={ev => e.infra > 0 && showPop(ev, "Infrastructure", `${e.infra} resources · ${e.cluster !== "—" ? e.cluster : "no cluster"} · ${Math.ceil(e.infra/2)} pods · ${Math.floor(e.infra/4)} hosts`)} onMouseLeave={hidePop}>{e.infra > 0 ? e.infra : <span className="text-mute">—</span>}</td>}
      {visCols.ns && <td className="mono" style={{ fontSize: 11 }}>{e.ns}</td>}
      {visCols.cluster && <td className="mono" style={{ fontSize: 11 }}>{e.cluster}</td>}
      {visCols.alerts && <td onMouseEnter={ev => e.alerts > 0 && showPop(ev, "Active alerts", `${e.alerts} alert${e.alerts>1?"s":""} · highest severity ${e.health === "crit" ? "critical" : "warning"}`)} onMouseLeave={hidePop}>{e.alerts > 0 ? <span className={`apm-err ${e.alerts > 2 ? "critical" : "warn"}`}><i className="fa-solid fa-bell" style={{ fontSize: 9 }} /> {e.alerts}</span> : <span className="text-mute mono">0</span>}</td>}
      {visCols.lastDeploy && <td>
        <div style={{ fontSize: 11.5 }}>{e.lastDeploy}</div>
        <span className={`sn-state-pill ${e.deployOutcome === "regression" ? "state-active" : e.deployOutcome === "improved" ? "svc-healthy" : "state-neutral"}`} style={{ fontSize: 9.5, marginTop: 2 }}><i className="fa-solid fa-circle" /> {e.deployOutcome}</span>
      </td>}
      {visCols.lastReport && <td className="mono" style={{ fontSize: 11 }}>{e.lastReport}</td>}
      {visCols.repos && <td className="mono" onMouseEnter={ev => showPop(ev, "Repository", `${e.id}-service · git.internal/finspot/${e.id} · main branch`)} onMouseLeave={hidePop}>{e.repos}</td>}
      {visCols.ai && <td>{e.ai ? <span className="sn-pill state-progress" style={{ fontSize: 10.5 }}><i className="fa-solid fa-wand-magic-sparkles" /> {e.ai}</span> : <span className="text-mute">—</span>}</td>}
      {visCols.rt && <td className="mono" style={{ fontSize: 11 }}>{e.rt >= 1000 ? (e.rt/1000).toFixed(1)+"s" : e.rt+"ms"}</td>}
      {visCols.tput && <td className="mono" style={{ fontSize: 11 }}>{(e.tput/1000).toFixed(1)}k rpm</td>}
      {visCols.err && <td><span className={`apm-err ${errClass(e.err)}`}>{e.err.toFixed(2)}%</span></td>}
      {visCols.cpu && <td>{e.cpu > 0 ? <span style={{ color: getCpuColor(e.cpu).fg, fontWeight: 700, fontFamily: "var(--font-mono)", fontSize: 11 }}>{e.cpu}%</span> : <span className="text-mute">—</span>}</td>}
      {visCols.mem && <td>{e.mem > 0 ? <span style={{ color: getMemColor(e.mem).fg, fontWeight: 700, fontFamily: "var(--font-mono)", fontSize: 11 }}>{e.mem}%</span> : <span className="text-mute">—</span>}</td>}
      {visCols.uptime && <td className="mono" style={{ fontSize: 11 }}>{e.uptime}</td>}
      {visCols.sla && <td><span style={{ color: getMetricColor(100 - e.sla, 0.5, 1.5).fg, fontWeight: 700, fontFamily: "var(--font-mono)", fontSize: 11 }}>{e.sla}%</span></td>}
      {visCols.runbook && <td><a className="sn-link mono" style={{ fontSize: 11 }}>{e.runbook}</a></td>}
      <td>
        <div style={{ display: "flex", gap: 4 }}>
          <button className="sn-btn" style={{ padding: "2px 7px", fontSize: 10.5 }} onClick={() => setDrawer(e.id)}><i className="fa-regular fa-eye" /></button>
          <button className="sn-btn" style={{ padding: "2px 7px", fontSize: 10.5 }} onClick={() => openEntity(e.id)}><i className="fa-solid fa-arrow-up-right-from-square" /></button>
        </div>
      </td>
    </tr>
  );

  const drawerEntity = drawer ? CATALOG_ENTITIES.find(e => e.id === drawer) : null;

  return (
    <div className="page page-fade sn-dash">
      <div className="sn-breadcrumb">
        <a className="sn-link">Home</a><span className="sn-bc-sep">›</span>
        <a className="sn-link">Catalogs</a><span className="sn-bc-sep">›</span>
        <span>Application Catalog</span>
      </div>

      <div className="sn-form-header">
        <div className="sn-form-title-row">
          <span className="sn-rec-number">CATALOG</span>
          <span className="sn-pill state-neutral"><i className="fa-solid fa-cubes" /> {CATALOG_ENTITIES.length} applications</span>
          <span className="sn-pill prio-1"><i className="fa-solid fa-circle" /> {CATALOG_ENTITIES.reduce((s, e) => s + e.alerts, 0)} active alerts</span>
        </div>
        <div className="sn-form-title-meta">
          <div>
            <h1>Application Catalog</h1>
            <div className="sn-form-sub">Every application, service, and mobile/browser entity — health, ownership, deployments, and golden metrics in one table</div>
          </div>
          <div className="sn-form-actions">
            <button className="sn-btn" onClick={exportCSV}><i className="fa-solid fa-file-csv" /> Export CSV</button>
            <button className="sn-btn primary"><i className="fa-solid fa-plus" /> Add application</button>
          </div>
        </div>
      </div>

      <div className="sn-kpi-strip">
        <Kpi l="Applications" v={CATALOG_ENTITIES.length} s="all types" tone="neutral" />
        <Kpi l="Healthy" v={CATALOG_ENTITIES.filter(e => e.health === "ok").length} s="green" tone="ok" />
        <Kpi l="Warning" v={CATALOG_ENTITIES.filter(e => e.health === "warn").length} s="yellow" tone="warn" />
        <Kpi l="Critical" v={CATALOG_ENTITIES.filter(e => e.health === "crit").length} s="red" tone="crit" />
        <Kpi l="With AI assets" v={CATALOG_ENTITIES.filter(e => e.ai).length} s="OpenAI · Bedrock" tone="neutral" />
        <Kpi l="Regressions" v={CATALOG_ENTITIES.filter(e => e.deployOutcome === "regression").length} s="last deploy" tone="crit" />
      </div>

      <div style={{ background: "white", border: "1px solid var(--border, #e5e8eb)", borderRadius: "4px 4px 0 0", padding: "10px 14px", display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 220px", minWidth: 200 }}>
          <i className="fa-solid fa-magnifying-glass" style={{ color: "var(--fg-muted)", fontSize: 12 }} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search application name…" style={{ flex: 1, border: "none", outline: "none", fontSize: 12.5, background: "transparent" }} />
        </div>
        {([["Env", envFilter, setEnvFilter, envs], ["Team", teamFilter, setTeamFilter, teams], ["Client", clientFilter, setClientFilter, clients], ["Language", langFilter, setLangFilter, langs], ["Cluster", clusterFilter, setClusterFilter, clusters]] as [string, string, (v: string) => void, string[]][]).map(([label, val, setter, opts]) => (
          <select key={label} className="select" value={val} onChange={e => setter(e.target.value)} style={{ fontSize: 11.5 }}>
            {opts.map(o => <option key={o} value={o}>{o === "all" ? `All ${label.toLowerCase()}s` : o}</option>)}
          </select>
        ))}
        <div style={{ display: "flex", gap: 4 }}>
          {["all", "ok", "warn", "crit", "unknown"].map(s => (
            <button key={s} className={`sn-btn${statusFilter === s ? " primary" : ""}`} style={{ padding: "3px 9px", fontSize: 10.5 }} onClick={() => setStatusFilter(s)}>{s === "all" ? "All status" : getStatusLabel(s)}</button>
          ))}
        </div>
        <span style={{ flex: 1 }} />
        <label style={{ fontSize: 11, color: "var(--fg-muted)", display: "flex", alignItems: "center", gap: 6 }}>
          Group by
          <select className="select" value={groupBy} onChange={e => setGroupBy(e.target.value)} style={{ fontSize: 11.5 }}>
            {GROUP_OPTIONS.map(g => <option key={g}>{g}</option>)}
          </select>
        </label>
        <div style={{ position: "relative" }}>
          <button className="sn-btn" style={{ padding: "3px 9px", fontSize: 11 }} onClick={() => setColMenuOpen(o => !o)}><i className="fa-solid fa-table-columns" /> Columns</button>
          {colMenuOpen && (
            <div style={{ position: "absolute", right: 0, top: "110%", background: "white", border: "1px solid var(--border, #e5e8eb)", borderRadius: 4, boxShadow: "0 6px 18px rgba(16,32,48,.14)", padding: 8, zIndex: 20, minWidth: 210, maxHeight: 320, overflowY: "auto" }}>
              {CATALOG_COLUMNS.map(c => (
                <label key={c} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 6px", fontSize: 11.5, cursor: "pointer" }}>
                  <input type="checkbox" checked={visCols[c]} onChange={() => setVisCols(v => ({ ...v, [c]: !v[c] }))} />
                  {COLUMN_LABELS[c]}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ background: "white", border: "1px solid var(--border, #e5e8eb)", borderTop: "none", overflowX: "auto" }}>
        <table className="sn-list-table apm-table" style={{ minWidth: 1400 }}>
          <thead>
            <tr>
              <th onClick={() => toggleSort("id")} style={{ cursor: "pointer" }}>Application<SortIcon k="id" /></th>
              {CATALOG_COLUMNS.filter(c => visCols[c]).map(c => (
                <th key={c} onClick={() => toggleSort(c)} style={{ cursor: "pointer", whiteSpace: "nowrap" }}>{COLUMN_LABELS[c]}<SortIcon k={c} /></th>
              ))}
              <th style={{ width: 70 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {groups.map(([label, items]) => (
              <React.Fragment key={label || "all"}>
                {groupBy !== "None" && (
                  <tr><td colSpan={CATALOG_COLUMNS.length + 2} style={{ background: "#f2f5f8", fontWeight: 700, fontSize: 11, padding: "6px 12px", color: "var(--fg-muted)" }}>{label} <span style={{ fontWeight: 500 }}>· {items.length}</span></td></tr>
                )}
                {items.map(e => <Row key={e.id} e={e} />)}
              </React.Fragment>
            ))}
            {rows.length === 0 && <tr><td colSpan={CATALOG_COLUMNS.length + 2} style={{ textAlign: "center", padding: 32, color: "var(--fg-muted)" }}>No applications match the current filters</td></tr>}
          </tbody>
        </table>
      </div>

      {!groupKeyFn && (
        <div style={{ background: "white", border: "1px solid var(--border, #e5e8eb)", borderTop: "none", borderRadius: "0 0 4px 4px", padding: "8px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11.5, color: "var(--fg-muted)" }}>
          <span>Showing {rows.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, rows.length)} of {rows.length}</span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select className="select" value={pageSize} onChange={e => setPageSize(+e.target.value)} style={{ fontSize: 11 }}>{[10, 25, 50].map(n => <option key={n} value={n}>{n} / page</option>)}</select>
            <button className="sn-btn" style={{ padding: "2px 9px" }} disabled={page === 1} onClick={() => setPage(p => p - 1)}><i className="fa-solid fa-chevron-left" /></button>
            <span>Page {page} / {totalPages}</span>
            <button className="sn-btn" style={{ padding: "2px 9px" }} disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><i className="fa-solid fa-chevron-right" /></button>
          </div>
        </div>
      )}

      {/* Hover popover */}
      {pop && (
        <div style={{ position: "fixed", left: pop.x, top: pop.y, zIndex: 50, background: "#16212e", color: "white", borderRadius: 5, padding: "8px 11px", fontSize: 11.5, maxWidth: 260, boxShadow: "0 8px 20px rgba(0,0,0,.25)", pointerEvents: "none" }}>
          <div style={{ fontWeight: 700, marginBottom: 3 }}>{pop.title}</div>
          <div style={{ color: "#c4cdd6", lineHeight: 1.4 }}>{pop.body}</div>
        </div>
      )}

      {/* Quick-view drawer */}
      {drawerEntity && (
        <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setDrawer(null)}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(16,24,32,.28)" }} />
          <div onClick={e => e.stopPropagation()} style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 360, background: "white", boxShadow: "-8px 0 24px rgba(0,0,0,.14)", overflowY: "auto", padding: 0 }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border, #e5e8eb)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div className="mono" style={{ fontWeight: 700, fontSize: 14 }}>{drawerEntity.id}</div>
                <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>{drawerEntity.bizSvc} · {drawerEntity.client}</div>
              </div>
              <button className="sn-btn" style={{ padding: "3px 8px" }} onClick={() => setDrawer(null)}><i className="fa-solid fa-xmark" /></button>
            </div>
            <div style={{ padding: "6px 4px" }}>
              <Field label="Health" value={<span style={statusBadgeStyle(drawerEntity.health)}><i className="fa-solid fa-circle" style={{ fontSize: 6 }} /> {getStatusLabel(drawerEntity.health)}</span>} />
              <Field label="Score" value={drawerEntity.score + "%"} />
              <Field label="Team owner" value={drawerEntity.team} />
              <Field label="Environment" value={drawerEntity.env} />
              <Field label="Cluster / namespace" value={`${drawerEntity.cluster} / ${drawerEntity.ns}`} />
              <Field label="Response time" value={drawerEntity.rt >= 1000 ? (drawerEntity.rt/1000).toFixed(1)+"s" : drawerEntity.rt+"ms"} />
              <Field label="Error rate" value={<span className={`apm-err ${errClass(drawerEntity.err)}`}>{drawerEntity.err.toFixed(2)}%</span>} />
              <Field label="CPU / Memory" value={drawerEntity.cpu > 0 ? `${drawerEntity.cpu}% / ${drawerEntity.mem}%` : "—"} />
              <Field label="SLA (30d)" value={drawerEntity.sla + "%"} />
              <Field label="Active alerts" value={drawerEntity.alerts} />
              <Field label="Last deployment" value={`${drawerEntity.lastDeploy} · ${drawerEntity.deployOutcome}`} />
              <Field label="Runbook" value={<a className="sn-link mono">{drawerEntity.runbook}</a>} />
              <div style={{ padding: "12px" }}>
                <button className="sn-btn primary" style={{ width: "100%" }} onClick={() => openEntity(drawerEntity.id)}><i className="fa-solid fa-arrow-up-right-from-square" /> Open full detail</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
