// Application Detail: Overview, K8s workloads, Dependencies/network path, Deployments/CI-CD, Alerts & Incidents, Runbook & Ownership
// Maps to: /api/catalog/applications/{id}/ · /metrics/ · /alerts/ · /dependencies/
// Those APIs are not connected yet: the entity comes from the sample catalog
// and the detail below is derived from it, so the page is labelled sample data.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { useUiStore } from "@/store/ui";
import { USERS } from "@/data/core";
import { Empty, Panel, Pill, PillDot, StatCard } from "@/components/ld";
import { Button, Card, Crumbs, Page, Tab, Table, Tabs, TextButton, cx, toneBg, toneText, ui } from "@/components/ui";
import type { Tone } from "@/components/ld";
import { Sparkline } from "@/components/MetricCharts";
import { getStatusLabel } from "@/lib/statusColors";
import { CATALOG_ENTITIES, errTone, fmtRt, healthTone, loadTone, outcomeTone } from "@/screens/APMCatalogScreen";

import { Icon } from "@/components/Icon";
import { ArrowRightIcon, BellIcon, BoxIcon, Building2Icon, CircleCheckIcon, CodeIcon, FlaskConicalIcon, GanttChartIcon, GaugeIcon, GitBranchIcon, LineChartIcon, ListIcon, LockIcon } from "lucide-react";
const SLA_TARGET = 99.9;

// Status text in a table cell / figure box: in light mode the cell's own colour
// won (only the weight showed); in dark mode the status colour won.
const cellTone = { crit: "font-semibold dark:text-tone-crit", warn: "font-semibold dark:text-tone-warn", ok: "font-semibold dark:text-tone-ok" } as const;
// Entity page head (tile, title with pills, "|"-separated meta line).
const entityHead = "flex flex-wrap items-start justify-between gap-3";
const entity = "flex items-center gap-3.5 min-w-0";
const entityTile = "flex-none grid place-items-center w-14 h-14 rounded-[12px] text-5xl";
const entityTitle = cx(ui.h1, "flex items-center gap-2.5 flex-wrap");
const entityMeta = cx(ui.headSub, "flex flex-wrap gap-x-3.5 gap-y-1 [&>span+span]:before:content-['|'] [&>span+span]:before:mr-3.5 [&>span+span]:before:text-line-strong");
/** Six-up stat row: 180px columns (the old dense-card overrides never reached StatCard). */
const sixUp = ui.cols[6];
/** Mono text in a table cell keeps the cell's 13px (the old mono class lost to it). */
const cellMono = "font-mono font-semibold";
/** Row highlight for a failing pod. */
const rowCrit = "[&>td]:bg-warning-bg";
// Small labelled cards
const tiles = "grid gap-3 grid-cols-[repeat(auto-fill,minmax(220px,1fr))]";
const tile = "flex flex-col gap-1.5 min-w-0 px-3.5 py-3 border border-line-subtle rounded bg-bg-raised [&>.ld-icon]:text-lg [&>.ld-icon]:text-accent";
const tileLabel = "text-2xs font-bold tracking-[0.05em] uppercase text-fg-muted";
// Plain icon list; an icon without its own text colour is 16px wide and accent-coloured.
const iconList = "list-none flex flex-col gap-2 m-0 p-0 text-sm text-fg [&>li]:flex [&>li]:items-center [&>li]:gap-2.5 [&>li]:min-w-0 [&>li>.ld-icon:not([class*='text-'])]:w-4 [&>li>.ld-icon:not([class*='text-'])]:text-center [&>li>.ld-icon:not([class*='text-'])]:text-accent";
// Request path chain
const flow = "list-none flex flex-wrap items-center gap-2 m-0 p-0 [&>li]:inline-flex [&>li]:items-center [&>li]:gap-2 [&>li>.ld-icon]:text-2xs [&>li>.ld-icon]:text-fg-faint";
const stepBox = "px-3 py-2 border rounded bg-bg-raised text-sm font-semibold text-fg";

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
    <Page>
      <Crumbs items={[{ label: "Home", onClick: () => setRoute("dashboard") }, { label: "Application Catalog", onClick: () => setRoute("apm-catalog") }, { label: e.id }]} />

      <div className={entityHead}>
        <div className={entity}>
          <span className={cx(entityTile, toneBg[healthTone(e.health)])} aria-hidden="true"><Icon icon={BoxIcon} /></span>
          <div>
            <h1 className={entityTitle}>
              {e.id}
              <Pill tone={healthTone(e.health)}><PillDot />{getStatusLabel(e.health)}</Pill>
              <Pill tone="muted">Sample data</Pill>
            </h1>
            <p className={entityMeta}>
              <span>{e.bizSvc}</span>
              <span>{e.team} team</span>
              <span>{e.env}</span>
              <span className={ui.mono}>{e.cluster !== "—" ? `${e.cluster} / ${e.ns}` : "no cluster"}</span>
              <span>Last reporting: {e.lastReport}</span>
            </p>
          </div>
        </div>
        <div className={ui.headSide}>
          <div className={ui.headActions}>
            <Button onClick={() => setRoute("apm")}><Icon icon={LineChartIcon} /> View traces</Button>
            <Button onClick={() => setRoute("logs")}><Icon icon={ListIcon} /> View logs</Button>
            <Button variant="primary" onClick={() => setRoute("monitors")}><Icon icon={BellIcon} /> Add alert</Button>
          </div>
          <ul className={ui.tags} aria-label="Tags">
            <li className={ui.tag}><Icon icon={BoxIcon} /> {e.type}</li>
            <li className={ui.tag}><Icon icon={Building2Icon} /> {e.client}</li>
            <li className={ui.tag}><Icon icon={CodeIcon} /> {e.lang}</li>
          </ul>
        </div>
      </div>

      <Card className={ui.notice} role="note">
        <Icon icon={FlaskConicalIcon} />
        <div>
          <b>Sample data</b>
          <p className="text-fg-muted text-xs">The application catalog, metrics and Kubernetes APIs are not connected yet. This page is generated from the sample catalog entry for {e.id}.</p>
        </div>
      </Card>

      <div className={cx(ui.grid, sixUp)}>
        <StatCard icon="fa-list-check" tone={e.score >= 90 ? "ok" : e.score >= 75 ? "warn" : "crit"} label="Score" value={`${e.score}%`} note="scorecard rules" />
        <StatCard icon="fa-stopwatch" tone={e.rt > 500 ? "warn" : "ok"} label="Response time" value={fmtRt(e.rt)} note="p50" />
        <StatCard icon="fa-arrow-right-arrow-left" tone="info" label="Throughput" value={`${(e.tput / 1000).toFixed(1)}k rpm`} note="requests/min" />
        <StatCard icon="fa-bug" tone={errTone(e.err)} label="Error rate" value={`${e.err.toFixed(2)}%`} note="errors / requests" />
        <StatCard icon="fa-shield-halved" tone={slaTone} label="SLA (30d)" value={`${e.sla}%`} note={`target ${SLA_TARGET}%`} />
        <StatCard icon="fa-bell" tone={e.alerts > 2 ? "crit" : e.alerts > 0 ? "warn" : "ok"} label="Active alerts" value={String(e.alerts)} note={e.alerts > 0 ? "needs attention" : "all clear"} onClick={() => setTab("alerts")} />
      </div>

      <Tabs aria-label={`${e.id} sections`}>
        {TABS.map(([id, label, icon]) => (
          <Tab key={id} active={tab === id} onClick={() => setTab(id)}>
            <Icon className={`fa-solid ${icon}`} /> {label}
            {id === "alerts" && e.alerts > 0 && <> <Pill tone="crit">{e.alerts}</Pill></>}
          </Tab>
        ))}
      </Tabs>

      {/* ---------------- OVERVIEW ---------------- */}
      {tab === "overview" && (
        <div className={ui.split}>
          <div className={ui.rail}>
            <Panel title="Golden metrics · last 4h">
              <div className={tiles}>
                {golden.map((g) => (
                  <div key={g.label} className={tile}>
                    <span className={tileLabel}>{g.label}</span>
                    <span className="flex justify-between items-baseline gap-2"><b className="text-5xl font-bold tracking-[-0.02em] text-fg leading-[1.2]">{g.value}</b><span className="text-fg-muted text-xs">{g.sub}</span></span>
                    <Sparkline points={g.points} color={g.color} label={`${g.label} (sample)`} />
                  </div>
                ))}
              </div>
            </Panel>
            <Panel title="Application summary">
              <dl className={ui.dl}>
                <dt>Application name</dt><dd className={ui.mono}>{e.id}</dd>
                <dt>Client / tenant</dt><dd>{e.client}</dd>
                <dt>Business service</dt><dd>{e.bizSvc}</dd>
                <dt>Team owner</dt><dd>{e.team}</dd>
                <dt>Entity type</dt><dd>{e.type}</dd>
                <dt>Language</dt><dd>{e.lang}</dd>
                <dt>Environment</dt><dd>{e.env}</dd>
                <dt>Cluster / namespace</dt><dd className={ui.mono}>{e.cluster !== "—" ? `${e.cluster} / ${e.ns}` : "not containerized"}</dd>
                <dt>Health status</dt><dd><Pill tone={healthTone(e.health)}><PillDot />{getStatusLabel(e.health)}</Pill></dd>
                <dt>Last reporting</dt><dd>{e.lastReport}</dd>
              </dl>
            </Panel>
          </div>
          <div className={ui.rail}>
            <Panel title="Quick links">
              <ul className={iconList}>
                <li><Icon icon={ListIcon} /><TextButton onClick={() => setRoute("logs")}>Logs</TextButton></li>
                <li><Icon icon={GanttChartIcon} /><TextButton onClick={() => setRoute("apm")}>Traces</TextButton></li>
                <li><Icon icon={GaugeIcon} /><TextButton onClick={() => setRoute("metrics")}>Metrics</TextButton></li>
                <li><Icon icon={GitBranchIcon} /><span className={ui.mono}>git.internal/finspot/{e.id}</span></li>
              </ul>
            </Panel>
            <Panel title="SLA / SLO">
              <dl className={ui.dl}>
                <dt>30-day SLA</dt><dd><span className={toneText[slaTone]}>{e.sla}%</span></dd>
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
          <Card><Empty>This entity is not deployed on Kubernetes ({e.type}).</Empty></Card>
        ) : (
          <>
            <Panel title={`Pods · ${pods.length} in ns/${e.ns}`}>
              <Table>
                  <thead><tr><th scope="col">Pod</th><th scope="col">Node</th><th scope="col">Status</th><th scope="col">Restarts</th><th scope="col">CPU</th><th scope="col">Memory</th><th scope="col">Age</th></tr></thead>
                  <tbody>
                    {pods.map((p) => (
                      <tr key={p.name} className={p.status !== "Running" ? rowCrit : undefined}>
                        <td className={cellMono}>{p.name}</td>
                        <td className={cellMono}>{p.node}</td>
                        <td><Pill tone={p.status === "Running" ? "ok" : p.status === "Pending" ? "warn" : "crit"}><PillDot />{p.status}</Pill></td>
                        <td className={p.restarts > 0 ? cellTone.crit : undefined}>{p.restarts}</td>
                        <td><Pill tone={loadTone(p.cpu)}>{p.cpu}%</Pill></td>
                        <td><Pill tone={loadTone(p.mem)}>{p.mem}%</Pill></td>
                        <td>{p.age}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
            </Panel>
            <div className={cx(ui.grid, ui.cols[2])}>
              <Panel title="Services & ingress">
                <Table>
                    <thead><tr><th scope="col">Name</th><th scope="col">Type</th><th scope="col">Detail</th></tr></thead>
                    <tbody>
                      {services.map((s) => <tr key={s.name}><td className={cellMono}>{s.name}</td><td><Pill tone="muted">{s.type}</Pill></td><td className={cellMono}>{s.clusterIP} · {s.ports}</td></tr>)}
                      {ingress.map((g) => <tr key={g.name}><td className={cellMono}>{g.name}</td><td><Pill tone="muted">Ingress</Pill></td><td className={cellMono}>{g.host} · {g.path} · {g.tls}</td></tr>)}
                    </tbody>
                  </Table>
              </Panel>
              <Panel title="PVC & config">
                <dl className={ui.dl}>
                  <dt>Volume claims</dt>
                  <dd>{pvcs.length ? pvcs.map((p) => <span key={p.name} className={ui.sub}><span className={ui.mono}>{p.name}</span> · {p.size} · {p.class} · <Pill tone="ok">{p.status}</Pill></span>) : "No PVCs — stateless workload"}</dd>
                  <dt>ConfigMaps</dt>
                  <dd>{configMaps.map((c) => <span key={c.name} className={cx(ui.sub, "font-mono font-semibold")}>{c.name}</span>)}</dd>
                </dl>
              </Panel>
            </div>
            <Panel title="Secrets · reference only, values never displayed">
              <Table>
                  <thead><tr><th scope="col">Secret</th><th scope="col">Keys</th><th scope="col">Value</th></tr></thead>
                  <tbody>
                    {secrets.map((s) => (
                      <tr key={s.name}>
                        <td className={cellMono}>{s.name}</td>
                        <td><ul className="list-none flex flex-wrap justify-start gap-1.5 m-0 p-0">{s.keys.map(k => <li key={k} className={cx(ui.tag, "font-mono")}>{k}</li>)}</ul></td>
                        <td><span className="sr-only">Hidden</span><span aria-hidden="true">••••••••</span> <Icon icon={LockIcon} /></td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
            </Panel>
          </>
        )
      )}

      {/* ---------------- DEPENDENCIES / NETWORK PATH ---------------- */}
      {tab === "dependencies" && (
        <>
          <Panel title="Infrastructure relationship flow">
            <ol className={flow} aria-label="Request path">
              {path.map((step, i) => (
                <li key={step + i}>
                  <span className={cx(stepBox, i === 5 ? "border-accent shadow-[0_0_0_3px_var(--info-bg)]" : "border-line-strong")}>{step}</span>
                  {i < path.length - 1 && <Icon icon={ArrowRightIcon} />}
                </li>
              ))}
            </ol>
          </Panel>
          <Panel title={`Dependencies · ${dependencies.length} downstream`}>
            <Table>
                <thead><tr><th scope="col">Name</th><th scope="col">Kind</th><th scope="col">Role</th><th scope="col">Host</th></tr></thead>
                <tbody>
                  {dependencies.map((d) => (
                    <tr key={d.name}><td className="font-medium">{d.name}</td><td><Pill tone="muted">{d.kind}</Pill></td><td>{d.role}</td><td className={cellMono}>{d.host}</td></tr>
                  ))}
                </tbody>
              </Table>
          </Panel>
        </>
      )}

      {/* ---------------- DEPLOYMENTS / CI-CD ---------------- */}
      {tab === "deployments" && (
        <>
          <Panel title="CI/CD pipeline">
            <div className={tiles}>
              {cicd.map((c) => (
                <div key={c.stage} className={tile}>
                  <Icon className={`fa-solid ${c.icon}`} />
                  <span className={tileLabel}>{c.stage}</span>
                  <span className={ui.mono}>{c.detail}</span>
                  <span className="text-fg-muted text-xs">{c.sub}</span>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title={`Deployment history · ${deployHistory.length} in last 7d`}>
            <Table>
                <thead><tr><th scope="col">Version</th><th scope="col">Author</th><th scope="col">When</th><th scope="col">Commits</th><th scope="col">Outcome</th></tr></thead>
                <tbody>
                  {deployHistory.map((d) => (
                    <tr key={d.v}>
                      <td className={cellMono}>{d.v}</td><td className={cellMono}>{d.who}</td><td>{d.when}</td><td>{d.commits}</td>
                      <td><Pill tone={outcomeTone(d.outcome)}>{d.outcome}</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
          </Panel>
        </>
      )}

      {/* ---------------- ALERTS & INCIDENTS ---------------- */}
      {tab === "alerts" && (
        <>
          <Panel title={`Active alerts (${activeAlerts.length})`} action={{ label: "Alert console", onClick: () => setRoute("alerts") }}>
            {activeAlerts.length ? (
              <Table>
                  <thead><tr><th scope="col">Severity</th><th scope="col">Alert</th><th scope="col">Source</th><th scope="col">Since</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
                  <tbody>
                    {activeAlerts.map((a, i) => (
                      <tr key={i}>
                        <td><Pill tone={a.sev === "critical" ? "crit" : "warn"}><PillDot />{a.sev}</Pill></td>
                        <td className={cx("font-medium", ui.cellWrap)}>{a.title}</td>
                        <td className={cellMono}>{a.source}</td>
                        <td>{a.since}</td>
                        <td><Button size="sm">Acknowledge</Button></td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
            ) : (
              <Empty><Icon icon={CircleCheckIcon} className={toneText.ok} /> No active alerts</Empty>
            )}
          </Panel>
          <Panel title={`Incident history · ${incidentHistory.length} records`}>
            <Table>
                <thead><tr><th scope="col">Incident</th><th scope="col">Title</th><th scope="col">When</th><th scope="col">Status</th></tr></thead>
                <tbody>
                  {incidentHistory.map((n) => (
                    <tr key={n.id}>
                      <td className={cellMono}>{n.id}</td><td className={ui.cellWrap}>{n.title}</td><td>{n.when}</td>
                      <td><Pill tone={n.status === "active" ? "crit" : "ok"}>{n.status}</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
          </Panel>
        </>
      )}

      {/* ---------------- RUNBOOK & OWNERSHIP ---------------- */}
      {tab === "runbook" && (
        <div className={cx(ui.grid, ui.cols[2])}>
          <Panel title="Runbook & documentation">
            <dl className={ui.dl}>
              <dt>Runbook</dt><dd className={ui.mono}>{e.runbook}</dd>
              <dt>Architecture doc</dt><dd>Confluence · {e.id} design doc</dd>
              <dt>On-call rotation</dt><dd>{e.team} · PagerDuty schedule</dd>
              <dt>Escalation policy</dt><dd>P1 → team lead → SRE Platform</dd>
            </dl>
          </Panel>
          <Panel title="Owner contacts">
            <dl className={ui.dl}>
              <dt>Team</dt><dd>{e.team}</dd>
              <dt>On-call</dt><dd>{owner ? <>{owner.name}<span className={ui.sub}>{owner.team}</span></> : "Unassigned"}</dd>
              <dt>Slack</dt><dd className={ui.mono}>#{e.team.toLowerCase()}</dd>
              <dt>Business owner</dt><dd>{e.client} · Platform</dd>
            </dl>
          </Panel>
        </div>
      )}
    </Page>
  );
}
