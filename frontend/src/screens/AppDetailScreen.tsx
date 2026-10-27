// Application Detail: Overview, K8s workloads, Dependencies/network path, Deployments/CI-CD, Alerts & Incidents, Runbook & Ownership
// Maps to: /api/catalog/applications/{id}/ · /metrics/ · /alerts/ · /dependencies/
// Those APIs are not connected yet: the entity comes from the sample catalog
// and the detail below is derived from it, so the page is labelled sample data.
import React from "react";
import "@/styles/observe.css";
import { useNav } from "@/hooks/useNav";
import { useUiStore } from "@/store/ui";
import { USERS } from "@/data/core";
import { Empty, Panel, Pill, StatCard } from "@/components/ld";
import type { Tone } from "@/components/ld";
import { Sparkline } from "@/components/MetricCharts";
import { getStatusLabel } from "@/lib/statusColors";
import { CATALOG_ENTITIES, errTone, fmtRt, healthTone, loadTone, outcomeTone } from "@/screens/APMCatalogScreen";

import { Icon } from "@/components/Icon";
import { ArrowRightIcon, BellIcon, BoxIcon, Building2Icon, ChevronRightIcon, CircleCheckIcon, CodeIcon, FlaskConicalIcon, GanttChartIcon, GaugeIcon, GitBranchIcon, LineChartIcon, ListIcon, LockIcon } from "lucide-react";
const SLA_TARGET = 99.9;

export default function AppDetailScreen() {
  const { setRoute } = useNav();
  const appName = useUiStore((s) => s.params.appName as string | undefined);
  const e = CATALOG_ENTITIES.find(x => x.id === appName) || CATALOG_ENTITIES[0];
  const [tab, setTab] = React.useState("overview");
  const seed = e.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const series = (base: number, spread: number, n = 32): [number, number][] =>
    Array.from({ length: n }, (_, i) => [i, Math.max(0, base + Math.sin((seed + i) * 1.6) * spread * 0.5 + Math.sin((seed * 2 + i) * 0.5) * spread * 0.5)]);

  const TABS: [string, string, string][] = [
    ["overview", "Overview", "fa-circle-info"],
    ["kubernetes", "Kubernetes", "fa-dharmachakra"],
    ["dependencies", "Dependencies", "fa-diagram-project"],
    ["deployments", "Deployments", "fa-rocket"],
    ["alerts", "Alerts & Incidents", "fa-bell"],
    ["runbook", "Runbook & Ownership", "fa-book"],
  ];

  // ---- derived, deterministic sample detail (stands in for real API payloads) ----
  const podCount = Math.max(2, Math.round(e.infra / 2)) || 0;
  const pods = Array.from({ length: podCount }, (_, i) => ({
    name: `${e.id}-${(seed + i * 7).toString(16).slice(0, 5)}`, node: `node-${e.cluster}-${(i % 4) + 1}`,
    status: e.health === "crit" && i === 0 ? "CrashLoopBackOff" : e.health === "warn" && i === podCount - 1 ? "Pending" : "Running",
    restarts: e.health === "crit" ? (i === 0 ? 14 : 1) : 0, cpu: Math.round(e.cpu * (0.7 + (i % 3) * 0.15)), mem: Math.round(e.mem * (0.7 + (i % 3) * 0.12)), age: `${9 + i}d`,
  }));
  const services = [{ name: `${e.id}-svc`, type: "ClusterIP", clusterIP: `10.96.${seed % 200}.${(seed * 3) % 250}`, ports: "80/TCP → 8080" }];
  const ingress = e.type.includes("APM") ? [{ name: `${e.id}-ingress`, host: `${e.id}.finspot.internal`, tls: "cert-manager", path: "/*" }] : [];
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
    { stage: "Jenkins Pipeline", icon: "fa-infinity", detail: `${e.id}-pipeline`, sub: "build → test → scan → package" },
    { stage: "Harbor Image", icon: "fa-box", detail: `registry.internal/finspot/${e.id}:2.41`, sub: "scanned" },
    { stage: "ArgoCD Application", icon: "fa-arrows-rotate", detail: `${e.id}-${e.env}`, sub: "Synced · Healthy" },
  ];

  const dependencies = [
    { name: "PostgreSQL", kind: "database", role: "primary datastore", host: `pg-${e.ns}.internal:5432` },
    ...(e.id.includes("payments") || e.id.includes("checkout") ? [{ name: "Redis", kind: "cache", role: "session / rate-limit cache", host: `redis-${e.ns}.internal:6379` }] : []),
    ...(e.id === "payments-svc" ? [{ name: "RabbitMQ", kind: "queue", role: "async payment events", host: "rabbitmq.internal:5672" }] : []),
    ...(e.id === "search-svc" ? [{ name: "Neo4j", kind: "graph", role: "recommendation graph", host: "neo4j.internal:7687" }] : []),
  ];

  const activeAlerts = Array.from({ length: e.alerts }, (_, i) => ({
    title: ["Error rate exceeds 1% threshold", "Apdex below 0.7", "Pod restart loop detected", "p95 latency > 500ms"][i % 4],
    sev: e.health === "crit" ? "critical" : "warning", since: `${12 + i * 6}m ago`, source: "NRQL alert condition",
  }));
  const incidentHistory = [
    { id: "INC-48291", title: "Stripe timeouts cascading to checkout", when: "2h ago", status: e.health === "crit" ? "active" : "resolved" },
    { id: "INC-47110", title: "Elevated 5xx after v2.38 deploy", when: "9d ago", status: "resolved" },
  ];

  // Error budget left: share of the allowed (100 − target) downtime not yet used.
  const budgetLeft = Math.max(0, Math.min(100, Math.round((1 - (100 - e.sla) / (100 - SLA_TARGET)) * 100)));
  const owner = USERS.find((u) => u.id === "u1");
  const slaTone: Tone = e.sla < 99.5 ? "crit" : e.sla < SLA_TARGET ? "warn" : "ok";
  const path = ["User", "DNS", "Firewall", "Load Balancer / Ingress", "K8s Service", `${e.id} Pod`, "API Service", ...dependencies.map(d => d.name), "Storage / External"];

  const golden: { label: string; value: string; sub: string; points: [number, number][]; color: string }[] = [
    { label: "Response time", value: fmtRt(e.rt), sub: "p50", points: series(e.rt, e.rt * 0.3), color: e.rt > 500 ? "#f5a524" : "#16a34a" },
    { label: "Throughput", value: `${(e.tput / 1000).toFixed(1)}k`, sub: "requests/min", points: series(e.tput / 100, e.tput / 400), color: "#0ea5e9" },
    { label: "Error rate", value: `${e.err.toFixed(2)}%`, sub: "errors / requests", points: series(e.err * 10, e.err * 8 || 2), color: e.err > 2 ? "#e5383b" : e.err > 0.5 ? "#f5a524" : "#16a34a" },
    { label: "Apdex", value: (1 - e.err / 100).toFixed(2), sub: "user satisfaction", points: series(80, 12), color: "#16a34a" },
  ];

  return (
    <div className="ld-dash">
      <nav className="ld-crumbs" aria-label="Breadcrumb">
        <button type="button" className="ld-link" onClick={() => setRoute("dashboard")}>Home</button>
        <Icon icon={ChevronRightIcon} />
        <button type="button" className="ld-link" onClick={() => setRoute("apm-catalog")}>Application Catalog</button>
        <Icon icon={ChevronRightIcon} />
        <span>{e.id}</span>
      </nav>

      <div className="ld-head ld-entity-head">
        <div className="ld-entity">
          <span className={`ld-tile ld-${healthTone(e.health)}`} aria-hidden="true"><Icon icon={BoxIcon} /></span>
          <div>
            <h1 className="ld-entity-title">
              {e.id}
              <Pill tone={healthTone(e.health)}><span className="ld-pill-dot" />{getStatusLabel(e.health)}</Pill>
              <Pill tone="muted">Sample data</Pill>
            </h1>
            <p className="ld-entity-meta">
              <span>{e.bizSvc}</span>
              <span>{e.team} team</span>
              <span>{e.env}</span>
              <span className="ld-mono">{e.cluster !== "—" ? `${e.cluster} / ${e.ns}` : "no cluster"}</span>
              <span>Last reporting: {e.lastReport}</span>
            </p>
          </div>
        </div>
        <div className="ld-head-side">
          <div className="ld-head-actions">
            <button type="button" className="ld-btn" onClick={() => setRoute("apm")}><Icon icon={LineChartIcon} /> View traces</button>
            <button type="button" className="ld-btn" onClick={() => setRoute("logs")}><Icon icon={ListIcon} /> View logs</button>
            <button type="button" className="ld-btn ld-btn-primary" onClick={() => setRoute("monitors")}><Icon icon={BellIcon} /> Add alert</button>
          </div>
          <ul className="ld-tags" aria-label="Tags">
            <li className="ld-tag"><Icon icon={BoxIcon} /> {e.type}</li>
            <li className="ld-tag"><Icon icon={Building2Icon} /> {e.client}</li>
            <li className="ld-tag"><Icon icon={CodeIcon} /> {e.lang}</li>
          </ul>
        </div>
      </div>

      <div className="ld-card ld-metrics-off" role="note">
        <Icon icon={FlaskConicalIcon} />
        <div>
          <b>Sample data</b>
          <p className="ld-muted ld-small">The application catalog, metrics and Kubernetes APIs are not connected yet. This page is generated from the sample catalog entry for {e.id}.</p>
        </div>
      </div>

      <div className="ld-grid ld-grid-stats ld-grid-6">
        <StatCard icon="fa-list-check" tone={e.score >= 90 ? "ok" : e.score >= 75 ? "warn" : "crit"} label="Score" value={`${e.score}%`} note="scorecard rules" />
        <StatCard icon="fa-stopwatch" tone={e.rt > 500 ? "warn" : "ok"} label="Response time" value={fmtRt(e.rt)} note="p50" />
        <StatCard icon="fa-arrow-right-arrow-left" tone="info" label="Throughput" value={`${(e.tput / 1000).toFixed(1)}k rpm`} note="requests/min" />
        <StatCard icon="fa-bug" tone={errTone(e.err)} label="Error rate" value={`${e.err.toFixed(2)}%`} note="errors / requests" />
        <StatCard icon="fa-shield-halved" tone={slaTone} label="SLA (30d)" value={`${e.sla}%`} note={`target ${SLA_TARGET}%`} />
        <StatCard icon="fa-bell" tone={e.alerts > 2 ? "crit" : e.alerts > 0 ? "warn" : "ok"} label="Active alerts" value={String(e.alerts)} note={e.alerts > 0 ? "needs attention" : "all clear"} onClick={() => setTab("alerts")} />
      </div>

      <div className="ld-tabs" role="tablist" aria-label={`${e.id} sections`}>
        {TABS.map(([id, label, icon]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={`ld-tab${tab === id ? " active" : ""}`} onClick={() => setTab(id)}>
            <Icon className={`fa-solid ${icon}`} /> {label}
            {id === "alerts" && e.alerts > 0 && <> <Pill tone="crit">{e.alerts}</Pill></>}
          </button>
        ))}
      </div>

      {/* ---------------- OVERVIEW ---------------- */}
      {tab === "overview" && (
        <div className="ld-split">
          <div className="ld-rail">
            <Panel title="Golden metrics · last 4h">
              <div className="ld-obs-tiles">
                {golden.map((g) => (
                  <div key={g.label} className="ld-obs-tile">
                    <span className="ld-obs-label">{g.label}</span>
                    <span className="ld-obs-tile-head"><b className="ld-stat-value">{g.value}</b><span className="ld-muted ld-small">{g.sub}</span></span>
                    <Sparkline points={g.points} color={g.color} label={`${g.label} (sample)`} />
                  </div>
                ))}
              </div>
            </Panel>
            <Panel title="Application summary">
              <dl className="ld-dl">
                <dt>Application name</dt><dd className="ld-mono">{e.id}</dd>
                <dt>Client / tenant</dt><dd>{e.client}</dd>
                <dt>Business service</dt><dd>{e.bizSvc}</dd>
                <dt>Team owner</dt><dd>{e.team}</dd>
                <dt>Entity type</dt><dd>{e.type}</dd>
                <dt>Language</dt><dd>{e.lang}</dd>
                <dt>Environment</dt><dd>{e.env}</dd>
                <dt>Cluster / namespace</dt><dd className="ld-mono">{e.cluster !== "—" ? `${e.cluster} / ${e.ns}` : "not containerized"}</dd>
                <dt>Health status</dt><dd><Pill tone={healthTone(e.health)}><span className="ld-pill-dot" />{getStatusLabel(e.health)}</Pill></dd>
                <dt>Last reporting</dt><dd>{e.lastReport}</dd>
              </dl>
            </Panel>
          </div>
          <div className="ld-rail">
            <Panel title="Quick links">
              <ul className="ld-obs-list">
                <li><Icon icon={ListIcon} /><button type="button" className="ld-link" onClick={() => setRoute("logs")}>Logs</button></li>
                <li><Icon icon={GanttChartIcon} /><button type="button" className="ld-link" onClick={() => setRoute("apm")}>Traces</button></li>
                <li><Icon icon={GaugeIcon} /><button type="button" className="ld-link" onClick={() => setRoute("metrics")}>Metrics</button></li>
                <li><Icon icon={GitBranchIcon} /><span className="ld-mono">git.internal/finspot/{e.id}</span></li>
              </ul>
            </Panel>
            <Panel title="SLA / SLO">
              <dl className="ld-dl">
                <dt>30-day SLA</dt><dd><span className={`ld-text-${slaTone}`}>{e.sla}%</span></dd>
                <dt>Target</dt><dd>{SLA_TARGET}%</dd>
                <dt>Error budget left</dt><dd>{budgetLeft ? `${budgetLeft}%` : "exhausted"}</dd>
              </dl>
            </Panel>
          </div>
        </div>
      )}

      {/* ---------------- KUBERNETES ---------------- */}
      {tab === "kubernetes" && (
        e.cluster === "—" ? (
          <div className="ld-card"><Empty>This entity is not deployed on Kubernetes ({e.type}).</Empty></div>
        ) : (
          <>
            <Panel title={`Pods · ${pods.length} in ns/${e.ns}`}>
              <div className="ld-table-wrap">
                <table className="ld-table">
                  <thead><tr><th scope="col">Pod</th><th scope="col">Node</th><th scope="col">Status</th><th scope="col">Restarts</th><th scope="col">CPU</th><th scope="col">Memory</th><th scope="col">Age</th></tr></thead>
                  <tbody>
                    {pods.map((p) => (
                      <tr key={p.name} className={p.status !== "Running" ? "ld-obs-row-crit" : undefined}>
                        <td className="ld-mono">{p.name}</td>
                        <td className="ld-mono">{p.node}</td>
                        <td><Pill tone={p.status === "Running" ? "ok" : p.status === "Pending" ? "warn" : "crit"}><span className="ld-pill-dot" />{p.status}</Pill></td>
                        <td className={p.restarts > 0 ? "ld-text-crit" : undefined}>{p.restarts}</td>
                        <td><Pill tone={loadTone(p.cpu)}>{p.cpu}%</Pill></td>
                        <td><Pill tone={loadTone(p.mem)}>{p.mem}%</Pill></td>
                        <td className="ld-muted">{p.age}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
            <div className="ld-grid ld-grid-2">
              <Panel title="Services & ingress">
                <div className="ld-table-wrap">
                  <table className="ld-table">
                    <thead><tr><th scope="col">Name</th><th scope="col">Type</th><th scope="col">Detail</th></tr></thead>
                    <tbody>
                      {services.map((s) => <tr key={s.name}><td className="ld-mono">{s.name}</td><td><Pill tone="muted">{s.type}</Pill></td><td className="ld-mono">{s.clusterIP} · {s.ports}</td></tr>)}
                      {ingress.map((g) => <tr key={g.name}><td className="ld-mono">{g.name}</td><td><Pill tone="muted">Ingress</Pill></td><td className="ld-mono">{g.host} · {g.path} · {g.tls}</td></tr>)}
                    </tbody>
                  </table>
                </div>
              </Panel>
              <Panel title="PVC & config">
                <dl className="ld-dl">
                  <dt>Volume claims</dt>
                  <dd>{pvcs.length ? pvcs.map((p) => <span key={p.name} className="ld-sub"><span className="ld-mono">{p.name}</span> · {p.size} · {p.class} · <Pill tone="ok">{p.status}</Pill></span>) : "No PVCs — stateless workload"}</dd>
                  <dt>ConfigMaps</dt>
                  <dd>{configMaps.map((c) => <span key={c.name} className="ld-sub ld-mono">{c.name}</span>)}</dd>
                </dl>
              </Panel>
            </div>
            <Panel title="Secrets · reference only, values never displayed">
              <div className="ld-table-wrap">
                <table className="ld-table">
                  <thead><tr><th scope="col">Secret</th><th scope="col">Keys</th><th scope="col">Value</th></tr></thead>
                  <tbody>
                    {secrets.map((s) => (
                      <tr key={s.name}>
                        <td className="ld-mono">{s.name}</td>
                        <td><ul className="ld-tags ld-obs-tags-left">{s.keys.map(k => <li key={k} className="ld-tag ld-mono">{k}</li>)}</ul></td>
                        <td className="ld-muted"><span className="sr-only">Hidden</span><span aria-hidden="true">••••••••</span> <Icon icon={LockIcon} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </>
        )
      )}

      {/* ---------------- DEPENDENCIES / NETWORK PATH ---------------- */}
      {tab === "dependencies" && (
        <>
          <Panel title="Infrastructure relationship flow">
            <ol className="ld-obs-flow" aria-label="Request path">
              {path.map((step, i) => (
                <li key={step + i}>
                  <span className={`ld-obs-step${i === 5 ? " ld-obs-self" : ""}`}>{step}</span>
                  {i < path.length - 1 && <Icon icon={ArrowRightIcon} />}
                </li>
              ))}
            </ol>
          </Panel>
          <Panel title={`Dependencies · ${dependencies.length} downstream`}>
            <div className="ld-table-wrap">
              <table className="ld-table">
                <thead><tr><th scope="col">Name</th><th scope="col">Kind</th><th scope="col">Role</th><th scope="col">Host</th></tr></thead>
                <tbody>
                  {dependencies.map((d) => (
                    <tr key={d.name}><td className="ld-strong">{d.name}</td><td><Pill tone="muted">{d.kind}</Pill></td><td>{d.role}</td><td className="ld-mono">{d.host}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}

      {/* ---------------- DEPLOYMENTS / CI-CD ---------------- */}
      {tab === "deployments" && (
        <>
          <Panel title="CI/CD pipeline">
            <div className="ld-obs-tiles">
              {cicd.map((c) => (
                <div key={c.stage} className="ld-obs-tile">
                  <Icon className={`fa-solid ${c.icon}`} />
                  <span className="ld-obs-label">{c.stage}</span>
                  <span className="ld-mono">{c.detail}</span>
                  <span className="ld-muted ld-small">{c.sub}</span>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title={`Deployment history · ${deployHistory.length} in last 7d`}>
            <div className="ld-table-wrap">
              <table className="ld-table">
                <thead><tr><th scope="col">Version</th><th scope="col">Author</th><th scope="col">When</th><th scope="col">Commits</th><th scope="col">Outcome</th></tr></thead>
                <tbody>
                  {deployHistory.map((d) => (
                    <tr key={d.v}>
                      <td className="ld-mono">{d.v}</td><td className="ld-mono">{d.who}</td><td className="ld-muted">{d.when}</td><td>{d.commits}</td>
                      <td><Pill tone={outcomeTone(d.outcome)}>{d.outcome}</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}

      {/* ---------------- ALERTS & INCIDENTS ---------------- */}
      {tab === "alerts" && (
        <>
          <Panel title={`Active alerts (${activeAlerts.length})`} action={{ label: "Alert console", onClick: () => setRoute("alerts") }}>
            {activeAlerts.length ? (
              <div className="ld-table-wrap">
                <table className="ld-table">
                  <thead><tr><th scope="col">Severity</th><th scope="col">Alert</th><th scope="col">Source</th><th scope="col">Since</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
                  <tbody>
                    {activeAlerts.map((a, i) => (
                      <tr key={i}>
                        <td><Pill tone={a.sev === "critical" ? "crit" : "warn"}><span className="ld-pill-dot" />{a.sev}</Pill></td>
                        <td className="ld-strong ld-wrap">{a.title}</td>
                        <td className="ld-mono">{a.source}</td>
                        <td className="ld-muted">{a.since}</td>
                        <td><button type="button" className="ld-btn ld-btn-sm">Acknowledge</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty><Icon icon={CircleCheckIcon} className="ld-text-ok" /> No active alerts</Empty>
            )}
          </Panel>
          <Panel title={`Incident history · ${incidentHistory.length} records`}>
            <div className="ld-table-wrap">
              <table className="ld-table">
                <thead><tr><th scope="col">Incident</th><th scope="col">Title</th><th scope="col">When</th><th scope="col">Status</th></tr></thead>
                <tbody>
                  {incidentHistory.map((n) => (
                    <tr key={n.id}>
                      <td className="ld-mono">{n.id}</td><td className="ld-wrap">{n.title}</td><td className="ld-muted">{n.when}</td>
                      <td><Pill tone={n.status === "active" ? "crit" : "ok"}>{n.status}</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}

      {/* ---------------- RUNBOOK & OWNERSHIP ---------------- */}
      {tab === "runbook" && (
        <div className="ld-grid ld-grid-2">
          <Panel title="Runbook & documentation">
            <dl className="ld-dl">
              <dt>Runbook</dt><dd className="ld-mono">{e.runbook}</dd>
              <dt>Architecture doc</dt><dd>Confluence · {e.id} design doc</dd>
              <dt>On-call rotation</dt><dd>{e.team} · PagerDuty schedule</dd>
              <dt>Escalation policy</dt><dd>P1 → team lead → SRE Platform</dd>
            </dl>
          </Panel>
          <Panel title="Owner contacts">
            <dl className="ld-dl">
              <dt>Team</dt><dd>{e.team}</dd>
              <dt>On-call</dt><dd>{owner ? <>{owner.name}<span className="ld-sub">{owner.team}</span></> : "Unassigned"}</dd>
              <dt>Slack</dt><dd className="ld-mono">#{e.team.toLowerCase()}</dd>
              <dt>Business owner</dt><dd>{e.client} · Platform</dd>
            </dl>
          </Panel>
        </div>
      )}
    </div>
  );
}
