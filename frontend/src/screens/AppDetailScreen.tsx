// Application Detail: Overview, K8s workloads, Dependencies/network path, Deployments/CI-CD, Alerts & Incidents, Runbook & Ownership
// Ported from screens/app-detail.jsx.
// Maps to: /api/catalog/applications/{id}/ · /metrics/ · /alerts/ · /dependencies/
import React from "react";
import { useNav } from "@/hooks/useNav";
import { useUiStore } from "@/store/ui";
import { INFRA_ALERTS } from "@/data/infra";
import { Kpi, FormSection, FormRow, Field, UserById } from "@/components/primitives";
import { STATUS_COLORS, statusBadgeStyle, getStatusLabel, getMetricColor, getCpuColor, getMemColor, getErrorRateColor } from "@/lib/statusColors";
import { CATALOG_ENTITIES } from "@/screens/APMCatalogScreen";

export default function AppDetailScreen() {
  const { setRoute } = useNav();
  const appName = useUiStore((s) => s.params.appName as string | undefined);
  const e = CATALOG_ENTITIES.find(x => x.id === appName) || CATALOG_ENTITIES[0];
  const [tab, setTab] = React.useState("overview");
  const seed = e.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const series = (base: number, spread: number, n = 32) => Array.from({ length: n }, (_, i) => Math.max(0, base + Math.sin((seed + i) * 1.6) * spread * 0.5 + Math.sin((seed * 2 + i) * 0.5) * spread * 0.5));

  const Spark = ({ data, color = "var(--success)", h = 60 }: { data: number[]; color?: string; h?: number }) => {
    const w = 100, max = Math.max(...data) * 1.15 || 1;
    const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * (h - 6) - 3}`).join(" ");
    return (
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: "100%", height: h, display: "block" }}>
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.6" />
        <polygon points={`0,${h} ${pts} ${w},${h}`} fill={color} opacity="0.09" />
      </svg>
    );
  };
  const MetricCard = ({ label, value, sub, data, color }: { label: React.ReactNode; value: React.ReactNode; sub?: React.ReactNode; data?: number[]; color?: string }) => (
    <div style={{ background: "white", border: "1px solid var(--border, #e5e8eb)", borderRadius: 4, padding: "10px 12px" }}>
      <div style={{ fontSize: 10.5, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--fg-muted)", fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--fg-muted)", marginBottom: 6 }}>{sub}</div>
      {data && <Spark data={data} color={color} />}
    </div>
  );

  const TABS: [string, string, string][] = [
    ["overview", "Overview", "fa-circle-info"],
    ["kubernetes", "Kubernetes", "fa-dharmachakra"],
    ["dependencies", "Dependencies", "fa-diagram-project"],
    ["deployments", "Deployments", "fa-rocket"],
    ["alerts", "Alerts & Incidents", "fa-bell"],
    ["runbook", "Runbook & Ownership", "fa-book"],
  ];

  // ---- derived, deterministic mock detail (stands in for real API payloads) ----
  const podCount = Math.max(2, Math.round(e.infra / 2)) || 0;
  const pods = Array.from({ length: podCount }, (_, i) => ({
    name: `${e.id}-${(seed + i * 7).toString(16).slice(0, 5)}`, node: `node-${e.cluster}-${(i % 4) + 1}`,
    status: e.health === "crit" && i === 0 ? "CrashLoopBackOff" : e.health === "warn" && i === podCount - 1 ? "Pending" : "Running",
    restarts: e.health === "crit" ? (i === 0 ? 14 : 1) : 0, cpu: Math.round(e.cpu * (0.7 + (i % 3) * 0.15)), mem: Math.round(e.mem * (0.7 + (i % 3) * 0.12)), age: `${9 + i}d`,
  }));
  const services = [{ name: `${e.id}-svc`, type: "ClusterIP", clusterIP: `10.96.${seed % 200}.${(seed * 3) % 250}`, ports: "80/TCP → 8080" }];
  const ingress = e.type.includes("APM") ? [{ name: `${e.id}-ingress`, host: `${e.id}.finspot.internal`, tls: "cert-manager · valid 84d", path: "/*" }] : [];
  const pvcs = ["payments-svc", "inventory-svc"].includes(e.id) ? [{ name: `${e.id}-data`, size: "50Gi", status: "Bound", class: "gp3-encrypted" }] : [];
  const configMaps = [{ name: `${e.id}-config` }, { name: `${e.id}-feature-flags` }];
  const secrets = [{ name: `${e.id}-db-credentials`, keys: ["DB_USER", "DB_PASSWORD"] }, { name: `${e.id}-api-keys`, keys: ["STRIPE_KEY", "SENTRY_DSN"] }];

  const deployHistory = [
    { v: "v2.41", who: "ci-bot", when: e.lastDeploy, commits: 4, outcome: e.deployOutcome },
    { v: "v2.40", who: "marcus.o", when: "5h ago", commits: 12, outcome: "improved" },
    { v: "v2.39", who: "ci-bot", when: "1d ago", commits: 8, outcome: "neutral" },
    { v: "v2.38", who: "priya.r", when: "2d ago", commits: 32, outcome: "improved" },
  ];
  const cicd = [
    { stage: "Git Repository", icon: "fa-code-branch", detail: `git.internal/finspot/${e.id}`, sub: "main · protected" },
    { stage: "Jenkins Pipeline", icon: "fa-infinity", detail: `${e.id}-pipeline #482`, sub: "build → test → scan → package" },
    { stage: "Harbor Image", icon: "fa-box", detail: `registry.internal/finspot/${e.id}:2.41`, sub: "scanned · 0 critical CVEs" },
    { stage: "ArgoCD Application", icon: "fa-arrows-rotate", detail: `${e.id}-${e.env}`, sub: "Synced · Healthy" },
  ];

  const dependencies = [
    { name: "PostgreSQL", kind: "database", role: "primary datastore", host: `pg-${e.ns}.internal:5432` },
    ...(e.id.includes("payments") || e.id.includes("checkout") ? [{ name: "Redis", kind: "cache", role: "session / rate-limit cache", host: `redis-${e.ns}.internal:6379` }] : []),
    ...(e.id === "payments-svc" ? [{ name: "RabbitMQ", kind: "queue", role: "async payment events", host: "rabbitmq.internal:5672" }] : []),
    ...(e.id === "search-svc" ? [{ name: "Neo4j", kind: "graph", role: "recommendation graph", host: "neo4j.internal:7687" }] : []),
  ];

  const alerts = INFRA_ALERTS && INFRA_ALERTS.length ? [] : [];
  const activeAlerts = Array.from({ length: e.alerts }, (_, i) => ({
    title: ["Error rate exceeds 1% threshold", "Apdex below 0.7", "Pod restart loop detected", "p95 latency > 500ms"][i % 4],
    sev: e.health === "crit" ? "critical" : "warning", since: `${12 + i * 6}m ago`, source: "NRQL alert condition",
  }));
  const incidentHistory = [
    { id: "INC-48291", title: "Stripe timeouts cascading to checkout", when: "2h ago", status: e.health === "crit" ? "active" : "resolved" },
    { id: "INC-47110", title: "Elevated 5xx after v2.38 deploy", when: "9d ago", status: "resolved" },
  ];

  return (
    <div className="page page-fade sn-dash">
      <div className="sn-breadcrumb">
        <a className="sn-link">Home</a><span className="sn-bc-sep">›</span>
        <a className="sn-link">Catalogs</a><span className="sn-bc-sep">›</span>
        <a className="sn-link" onClick={() => setRoute("apm-catalog")}>Application Catalog</a><span className="sn-bc-sep">›</span>
        <span>{e.id}</span>
      </div>

      <div className="sn-form-header">
        <div className="sn-form-title-row">
          <span className="sn-rec-number">{e.id.toUpperCase()}</span>
          <span style={statusBadgeStyle(e.health)}><i className="fa-solid fa-circle" style={{ fontSize: 6 }} /> {getStatusLabel(e.health)}</span>
          <span className="sn-pill state-neutral"><i className="fa-solid fa-cube" /> {e.type}</span>
          <span className="sn-pill state-neutral"><i className="fa-solid fa-building" /> {e.client}</span>
        </div>
        <div className="sn-form-title-meta">
          <div>
            <h1>{e.id}</h1>
            <div className="sn-form-sub">{e.bizSvc} · {e.team} team · {e.env} · {e.cluster !== "—" ? `${e.cluster} / ${e.ns}` : "no cluster"} · last reporting {e.lastReport}</div>
          </div>
          <div className="sn-form-actions">
            <button className="sn-btn"><i className="fa-solid fa-chart-line" /> View traces</button>
            <button className="sn-btn"><i className="fa-solid fa-list-ul" /> View logs</button>
            <button className="sn-btn primary"><i className="fa-solid fa-bell" /> Add alert</button>
          </div>
        </div>
      </div>

      <div className="sn-kpi-strip">
        <Kpi l="Score" v={e.score + "%"} s="scorecard rules" tone={e.score >= 90 ? "ok" : e.score >= 75 ? "warn" : "crit"} />
        <Kpi l="Response time" v={e.rt >= 1000 ? (e.rt/1000).toFixed(1)+"s" : e.rt+"ms"} s="p50" tone={e.rt > 500 ? "warn" : "ok"} />
        <Kpi l="Throughput" v={(e.tput/1000).toFixed(1)+"k rpm"} s="requests/min" tone="ok" />
        <Kpi l="Error rate" v={e.err.toFixed(2) + "%"} s="last 15m" tone={e.err > 2 ? "crit" : e.err > 0.5 ? "warn" : "ok"} />
        <Kpi l="SLA (30d)" v={e.sla + "%"} s="target 99.9%" tone={e.sla < 99.5 ? "crit" : e.sla < 99.9 ? "warn" : "ok"} />
        <Kpi l="Active alerts" v={e.alerts} s={e.alerts > 0 ? "needs attention" : "all clear"} tone={e.alerts > 2 ? "crit" : e.alerts > 0 ? "warn" : "ok"} />
      </div>

      <div style={{ display: "flex", gap: 2, borderBottom: "2px solid var(--border, #e5e8eb)", marginBottom: 14, overflowX: "auto" }}>
        {TABS.map(([id, label, icon]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ border: "none", background: "transparent", padding: "9px 14px", fontSize: 12.5, fontWeight: tab === id ? 700 : 500, cursor: "pointer", color: tab === id ? "var(--fg, #16212e)" : "var(--fg-muted)", borderBottom: tab === id ? "2px solid var(--accent, #24ebaf)" : "2px solid transparent", marginBottom: -2, whiteSpace: "nowrap", fontFamily: "inherit" }}>
            <i className={`fa-solid ${icon}`} style={{ marginRight: 6, fontSize: 11 }} />{label}
            {id === "alerts" && e.alerts > 0 && <span style={{ marginLeft: 6, background: STATUS_COLORS.crit.line, color: "white", borderRadius: 8, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>{e.alerts}</span>}
          </button>
        ))}
      </div>

      {/* ---------------- OVERVIEW ---------------- */}
      {tab === "overview" && (
        <div className="sn-form-layout">
          <div className="sn-form-main">
            <FormSection id="golden" title="Golden Metrics">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, padding: 12, background: "#fafbfc" }}>
                <MetricCard label="Response time" value={e.rt >= 1000 ? (e.rt/1000).toFixed(1)+"s" : e.rt+"ms"} sub="p50 · last 4h" data={series(e.rt, e.rt * 0.3)} color={e.rt > 500 ? STATUS_COLORS.warn.line : STATUS_COLORS.ok.line} />
                <MetricCard label="Throughput" value={(e.tput/1000).toFixed(1)+"k"} sub="requests/min" data={series(e.tput/100, e.tput/400)} color="#0ea5e9" />
                <MetricCard label="Error rate" value={e.err.toFixed(2)+"%"} sub="last 4h" data={series(e.err * 10, e.err * 8 || 2)} color={getErrorRateColor(e.err).line} />
                <MetricCard label="Apdex" value={(1 - e.err/100).toFixed(2)} sub="user satisfaction" data={series(80, 12)} color={STATUS_COLORS.ok.line} />
              </div>
            </FormSection>
            <FormSection id="ov-summary" title="Application Summary">
              <FormRow><Field label="Application name" value={<span className="mono"><b>{e.id}</b></span>} required /><Field label="Client / tenant" value={e.client} /></FormRow>
              <FormRow><Field label="Business service" value={e.bizSvc} /><Field label="Team owner" value={e.team} /></FormRow>
              <FormRow><Field label="Entity type" value={e.type} /><Field label="Language" value={e.lang} /></FormRow>
              <FormRow><Field label="Environment" value={e.env} /><Field label="Cluster / namespace" value={e.cluster !== "—" ? `${e.cluster} / ${e.ns}` : "not containerized"} /></FormRow>
              <FormRow><Field label="Health status" value={<span style={statusBadgeStyle(e.health)}><i className="fa-solid fa-circle" style={{ fontSize: 6 }} /> {getStatusLabel(e.health)}</span>} /><Field label="Last reporting" value={e.lastReport} /></FormRow>
            </FormSection>
          </div>
          <aside className="sn-form-side">
            <div className="sn-side-card">
              <div className="sn-side-head">Quick Links</div>
              <div className="sn-side-body">
                {[["Logs", "fa-list-ul"], ["Traces", "fa-timeline"], ["Dashboards", "fa-gauge-high"], ["Git repository", "fa-code-branch"]].map(([l, ic]) => (
                  <div key={l} className="sn-related-row"><div className="sn-related-title"><i className={`fa-solid ${ic}`} style={{ width: 16, color: "var(--fg-muted)" }} /> {l}</div><i className="fa-solid fa-chevron-right text-mute" style={{ fontSize: 11 }} /></div>
                ))}
              </div>
            </div>
            <div className="sn-side-card">
              <div className="sn-side-head">SLA / SLO</div>
              <div className="sn-side-body">
                <Field label="30-day SLA" value={<span style={{ color: getMetricColor(100 - e.sla, 0.5, 1.5).fg, fontWeight: 700 }}>{e.sla}%</span>} />
                <Field label="Target" value="99.9%" />
                <Field label="Error budget left" value={e.sla >= 99.9 ? "full" : e.sla >= 99.5 ? "62%" : "exhausted"} />
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* ---------------- KUBERNETES ---------------- */}
      {tab === "kubernetes" && (
        <div>
          {e.cluster === "—" ? (
            <div style={{ background: "white", border: "1px solid var(--border, #e5e8eb)", borderRadius: 4, padding: 32, textAlign: "center", color: "var(--fg-muted)", fontSize: 12.5 }}>
              <i className="fa-solid fa-dharmachakra" style={{ fontSize: 24, color: "var(--fg-faint)" }} />
              <div style={{ marginTop: 8 }}>This entity is not deployed on Kubernetes ({e.type})</div>
            </div>
          ) : (
            <>
              <FormSection id="pods" title="Pods" badge={`${pods.length} pods · ns/${e.ns}`}>
                <table className="sn-list-table">
                  <thead><tr><th>Pod</th><th style={{width:150}}>Node</th><th style={{width:130}}>Status</th><th style={{width:80}}>Restarts</th><th style={{width:90}}>CPU</th><th style={{width:90}}>Memory</th><th style={{width:70}}>Age</th></tr></thead>
                  <tbody>
                    {pods.map((p, i) => (
                      <tr key={i} style={p.status !== "Running" ? { background: "rgba(239,68,68,.05)" } : undefined}>
                        <td className="mono">{p.name}</td><td className="mono" style={{ fontSize: 11 }}>{p.node}</td>
                        <td><span style={statusBadgeStyle(p.status === "Running" ? "ok" : p.status === "Pending" ? "warn" : "crit")}><i className="fa-solid fa-circle" style={{ fontSize: 6 }} /> {p.status}</span></td>
                        <td className="mono" style={{ color: p.restarts > 0 ? STATUS_COLORS.crit.fg : undefined, fontWeight: p.restarts > 0 ? 700 : 400 }}>{p.restarts}</td>
                        <td style={{ color: getCpuColor(p.cpu).fg, fontWeight: 600 }} className="mono">{p.cpu}%</td>
                        <td style={{ color: getMemColor(p.mem).fg, fontWeight: 600 }} className="mono">{p.mem}%</td>
                        <td className="mono">{p.age}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </FormSection>
              <FormSection id="svc" title="Services & Ingress">
                <table className="sn-list-table">
                  <thead><tr><th>Name</th><th style={{width:110}}>Type</th><th>Detail</th></tr></thead>
                  <tbody>
                    {services.map((s, i) => <tr key={i}><td className="mono">{s.name}</td><td><span className="sn-state-pill state-neutral"><i className="fa-solid fa-circle" /> {s.type}</span></td><td className="mono" style={{ fontSize: 11.5 }}>{s.clusterIP} · {s.ports}</td></tr>)}
                    {ingress.map((g, i) => <tr key={"i"+i}><td className="mono">{g.name}</td><td><span className="sn-state-pill state-neutral"><i className="fa-solid fa-circle" /> Ingress</span></td><td className="mono" style={{ fontSize: 11.5 }}>{g.host} · {g.path} · {g.tls}</td></tr>)}
                    {services.length === 0 && ingress.length === 0 && <tr><td colSpan={3} style={{ textAlign: "center", color: "var(--fg-muted)", padding: 18 }}>None</td></tr>}
                  </tbody>
                </table>
              </FormSection>
              <FormSection id="storage" title="PVC & Config">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
                  <div style={{ padding: 14, borderRight: "1px solid var(--border, #e5e8eb)" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--fg-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".05em" }}>Persistent Volume Claims</div>
                    {pvcs.length === 0 && <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>No PVCs — stateless workload</div>}
                    {pvcs.map((p, i) => <div key={i} style={{ fontSize: 12, marginBottom: 6 }}><span className="mono"><b>{p.name}</b></span> · {p.size} · {p.class} · <span style={statusBadgeStyle("ok")}>{p.status}</span></div>)}
                  </div>
                  <div style={{ padding: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--fg-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".05em" }}>ConfigMaps</div>
                    {configMaps.map((c, i) => <div key={i} className="mono" style={{ fontSize: 12, marginBottom: 4 }}>{c.name}</div>)}
                  </div>
                </div>
              </FormSection>
              <FormSection id="secrets" title="Secrets" badge="reference only — values never displayed">
                <table className="sn-list-table">
                  <thead><tr><th>Secret</th><th>Keys</th><th style={{width:110}}>Value</th></tr></thead>
                  <tbody>
                    {secrets.map((s, i) => (
                      <tr key={i}>
                        <td className="mono">{s.name}</td>
                        <td>{s.keys.map(k => <span key={k} className="logmx-tag" style={{ marginRight: 6 }}>{k}</span>)}</td>
                        <td className="mono text-mute">•••••••• <i className="fa-solid fa-lock" style={{ marginLeft: 4, fontSize: 10 }} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </FormSection>
            </>
          )}
        </div>
      )}

      {/* ---------------- DEPENDENCIES / NETWORK PATH ---------------- */}
      {tab === "dependencies" && (
        <div>
          <FormSection id="path" title="Infrastructure Relationship Flow">
            <div style={{ padding: 20, background: "#fafbfc", overflowX: "auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 920 }}>
                {["User", "DNS", "Firewall", "Load Balancer / Ingress", "K8s Service", `${e.id} Pod`, "API Service", ...dependencies.map(d => d.name), "Storage / External"].map((step, i, arr) => (
                  <React.Fragment key={step + i}>
                    <div style={{ flex: "0 0 auto", background: "white", border: `1.5px solid ${i === 5 ? "#0ea5e9" : "var(--border, #d5dbe1)"}`, borderRadius: 6, padding: "10px 12px", minWidth: 120, textAlign: "center", boxShadow: i === 5 ? "0 0 0 3px rgba(14,165,233,.15)" : "none" }}>
                      <div style={{ fontSize: 11, fontWeight: 700 }}>{step}</div>
                    </div>
                    {i < arr.length - 1 && <i className="fa-solid fa-arrow-right" style={{ color: "var(--fg-faint)", flexShrink: 0 }} />}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </FormSection>
          <FormSection id="deps" title="Dependencies" badge={`${dependencies.length} downstream`}>
            <table className="sn-list-table">
              <thead><tr><th>Name</th><th style={{width:110}}>Kind</th><th>Role</th><th style={{width:220}}>Host</th></tr></thead>
              <tbody>
                {dependencies.map((d, i) => (
                  <tr key={i}><td><b>{d.name}</b></td><td><span className="sn-state-pill state-neutral"><i className="fa-solid fa-circle" /> {d.kind}</span></td><td>{d.role}</td><td className="mono" style={{ fontSize: 11.5 }}>{d.host}</td></tr>
                ))}
              </tbody>
            </table>
          </FormSection>
        </div>
      )}

      {/* ---------------- DEPLOYMENTS / CI-CD ---------------- */}
      {tab === "deployments" && (
        <div>
          <FormSection id="cicd" title="CI/CD Pipeline">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, padding: 12, background: "#fafbfc" }}>
              {cicd.map((c, i) => (
                <div key={i} style={{ background: "white", border: "1px solid var(--border, #e5e8eb)", borderRadius: 5, padding: "12px 14px" }}>
                  <i className={`fa-solid ${c.icon}`} style={{ color: "#0ea5e9", fontSize: 16 }} />
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--fg-muted)", marginTop: 8, textTransform: "uppercase", letterSpacing: ".05em" }}>{c.stage}</div>
                  <div className="mono" style={{ fontSize: 12, marginTop: 4, fontWeight: 600 }}>{c.detail}</div>
                  <div style={{ fontSize: 11, color: "var(--fg-muted)", marginTop: 2 }}>{c.sub}</div>
                </div>
              ))}
            </div>
          </FormSection>
          <FormSection id="deploy-hist" title="Deployment History" badge={`${deployHistory.length} in last 7d`}>
            <table className="sn-list-table">
              <thead><tr><th style={{width:80}}>Version</th><th>Author</th><th style={{width:110}}>When</th><th style={{width:90}}>Commits</th><th style={{width:130}}>Outcome</th></tr></thead>
              <tbody>
                {deployHistory.map((d, i) => (
                  <tr key={i}>
                    <td><a className="sn-link mono"><b>{d.v}</b></a></td><td className="mono">{d.who}</td><td className="text-mute">{d.when}</td><td className="mono">{d.commits}</td>
                    <td><span className={`sn-state-pill ${d.outcome === "regression" ? "state-active" : d.outcome === "improved" ? "svc-healthy" : "state-neutral"}`}><i className="fa-solid fa-circle" /> {d.outcome}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </FormSection>
        </div>
      )}

      {/* ---------------- ALERTS & INCIDENTS ---------------- */}
      {tab === "alerts" && (
        <div>
          <FormSection id="active-alerts" title="Active Alerts" badge={`${activeAlerts.length} active`}>
            {activeAlerts.length === 0 && <div style={{ padding: 28, textAlign: "center", color: "var(--fg-muted)", fontSize: 12.5 }}><i className="fa-solid fa-circle-check" style={{ fontSize: 24, color: STATUS_COLORS.ok.line }} /><div style={{ marginTop: 8 }}>No active alerts</div></div>}
            {activeAlerts.length > 0 && (
              <table className="sn-list-table">
                <thead><tr><th style={{width:90}}>Severity</th><th>Alert</th><th style={{width:200}}>Source</th><th style={{width:90}}>Since</th><th style={{width:110}}>Ack</th></tr></thead>
                <tbody>
                  {activeAlerts.map((a, i) => (
                    <tr key={i}>
                      <td><span style={statusBadgeStyle(a.sev === "critical" ? "crit" : "warn")}><i className="fa-solid fa-circle" style={{ fontSize: 6 }} /> {a.sev}</span></td>
                      <td><b>{a.title}</b></td><td className="mono" style={{ fontSize: 11.5 }}>{a.source}</td><td>{a.since}</td>
                      <td><button className="sn-btn" style={{ padding: "2px 10px", fontSize: 11 }}>Acknowledge</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </FormSection>
          <FormSection id="incidents" title="Incident History" badge={`${incidentHistory.length} records`}>
            <table className="sn-list-table">
              <thead><tr><th style={{width:110}}>Incident</th><th>Title</th><th style={{width:100}}>When</th><th style={{width:110}}>Status</th></tr></thead>
              <tbody>
                {incidentHistory.map((n, i) => (
                  <tr key={i}><td><a className="sn-link mono">{n.id}</a></td><td>{n.title}</td><td className="text-mute">{n.when}</td>
                    <td><span className={`sn-state-pill ${n.status === "active" ? "state-active" : "svc-healthy"}`}><i className="fa-solid fa-circle" /> {n.status}</span></td></tr>
                ))}
              </tbody>
            </table>
          </FormSection>
        </div>
      )}

      {/* ---------------- RUNBOOK & OWNERSHIP ---------------- */}
      {tab === "runbook" && (
        <div className="sn-form-layout">
          <div className="sn-form-main">
            <FormSection id="runbook-doc" title="Runbook & Documentation">
              <FormRow><Field label="Runbook" value={<a className="sn-link mono">{e.runbook}</a>} /><Field label="Architecture doc" value={<a className="sn-link">Confluence · {e.id} design doc</a>} /></FormRow>
              <FormRow><Field label="On-call rotation" value={`${e.team} · PagerDuty schedule`} /><Field label="Escalation policy" value="P1 → team lead → SRE Platform" /></FormRow>
            </FormSection>
          </div>
          <aside className="sn-form-side">
            <div className="sn-side-card">
              <div className="sn-side-head">Owner Contacts</div>
              <div className="sn-side-body">
                <Field label="Team" value={e.team} />
                <Field label="On-call" value={<UserById id="u1" />} />
                <Field label="Slack" value={`#${e.team.toLowerCase()}`} />
                <Field label="Business owner" value={e.client + " · Platform"} />
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
