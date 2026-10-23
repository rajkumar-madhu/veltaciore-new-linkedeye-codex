// Runbook library — LinkedEye list layout: summary cards derived from the
// runbook catalog, category chips, a tabbed runbook table with Run actions,
// an example script and a simulated execution dialog. The catalog is a local
// sample (no runbook endpoint yet) and is labelled as such.
import React from "react";
import "@/styles/admin.css";
import { useNav } from "@/hooks/useNav";
import { USERS } from "@/data/core";
import { Empty, Panel, Pill, StatCard, countBy, fmt } from "@/components/ld";
import type { Tone } from "@/components/ld";
import { useCanWrite } from "@/auth/auth";
import ReadOnlyBadge from "@/components/ReadOnlyBadge";

interface Runbook {
  id: string;
  title: string;
  desc: string;
  svc: string;
  lang: string;
  runs: number;
  avg: string;
  success: number;
  last: string;
  owner: string;
  tag: string;
  auto: boolean;
}

const RUNBOOKS: Runbook[] = [
  { id: "RB-001", title: "pool-expansion-v3", desc: "Scale DB connection pool on payments-primary during exhaustion event", svc: "payments-primary", lang: "shell", runs: 1842, avg: "2m 14s", success: 96.4, last: "14m ago", owner: "u1", tag: "database", auto: true },
  { id: "RB-002", title: "k8s-rolling-restart", desc: "Cordon, drain and roll a Kubernetes Deployment with health gates", svc: "k8s-control", lang: "kubectl", runs: 412, avg: "4m 02s", success: 99.1, last: "2h ago", owner: "u2", tag: "k8s", auto: true },
  { id: "RB-003", title: "cdn-cache-purge", desc: "Invalidate CloudFront / Fastly edges for path or hostname", svc: "cdn", lang: "shell", runs: 318, avg: "0m 32s", success: 100, last: "1h ago", owner: "u7", tag: "cdn", auto: true },
  { id: "RB-004", title: "stripe-failover", desc: "Switch primary Stripe API region from us-east to us-west", svc: "stripe-adapter", lang: "python", runs: 24, avg: "8m 41s", success: 91.7, last: "3d ago", owner: "u4", tag: "payments", auto: false },
  { id: "RB-005", title: "ssl-cert-rotate", desc: "Rotate ACM/LetsEncrypt cert and warm caches", svc: "edge", lang: "terraform", runs: 142, avg: "12m 18s", success: 98.6, last: "1d ago", owner: "u8", tag: "security", auto: true },
  { id: "RB-006", title: "rds-failover", desc: "Promote read replica to primary in RDS multi-AZ", svc: "payments-primary", lang: "aws-cli", runs: 12, avg: "6m 22s", success: 100, last: "2w ago", owner: "u4", tag: "database", auto: false },
  { id: "RB-007", title: "fw-policy-rollback", desc: "Revert firewall policy to previous known-good snapshot", svc: "FW-BLR-CORE-01", lang: "ansible", runs: 8, avg: "3m 18s", success: 100, last: "5d ago", owner: "u7", tag: "network", auto: false },
  { id: "RB-008", title: "etcd-recovery", desc: "Restore etcd quorum after partition or member loss", svc: "k8s-control", lang: "shell", runs: 4, avg: "18m 02s", success: 75, last: "1mo ago", owner: "u2", tag: "k8s", auto: false },
  { id: "RB-009", title: "log-archive-flush", desc: "Force flush log archive to S3 cold storage", svc: "log-pipeline", lang: "python", runs: 84, avg: "1m 02s", success: 99.8, last: "6h ago", owner: "u5", tag: "logs", auto: true },
  { id: "RB-010", title: "vmware-host-evac", desc: "vMotion all VMs off a host before maintenance", svc: "ESX-BLR-01", lang: "powercli", runs: 18, avg: "14m 48s", success: 100, last: "1w ago", owner: "u3", tag: "virtualization", auto: false },
];

const TAG_META: Record<string, { label: string; icon: string; color: string }> = {
  database: { label: "Database", icon: "fa-database", color: "#8b5cf6" },
  k8s: { label: "Kubernetes", icon: "fa-cube", color: "#2563eb" },
  network: { label: "Network", icon: "fa-network-wired", color: "#7c3aed" },
  security: { label: "Security", icon: "fa-shield-halved", color: "#dc2626" },
  cdn: { label: "CDN", icon: "fa-bolt", color: "#0ea5e9" },
  payments: { label: "Payments", icon: "fa-credit-card", color: "#10b981" },
  virtualization: { label: "Virtualization", icon: "fa-server", color: "#475569" },
  logs: { label: "Logs", icon: "fa-file-lines", color: "#f59e0b" },
};

const SAMPLE_EXECUTIONS: [string, string, string, "success" | "failed"][] = [
  ["pool-expansion-v3", "INC-48291", "14m ago", "success"],
  ["cdn-cache-purge", "manual", "1h ago", "success"],
  ["k8s-rolling-restart", "CHG-2216", "2h ago", "success"],
  ["log-archive-flush", "scheduled", "6h ago", "success"],
  ["etcd-recovery", "INC-48279", "4h ago", "failed"],
];

const QUICK_ACTIONS: [string, string][] = [
  ["fa-plus", "New Runbook"],
  ["fa-file-import", "Import YAML"],
  ["fa-vial", "Sandbox"],
  ["fa-key", "API Tokens"],
  ["fa-clock-rotate-left", "All History"],
  ["fa-book", "Style Guide"],
];

/** "2m 14s" → 134 */
const toSeconds = (v: string) => {
  const m = /(?:(\d+)m)?\s*(?:(\d+)s)?/.exec(v);
  return (m && (parseInt(m[1] ?? "0") * 60 + parseInt(m[2] ?? "0"))) || 0;
};
const fmtDuration = (sec: number) => `${Math.floor(sec / 60)}m ${String(Math.round(sec % 60)).padStart(2, "0")}s`;
const successTone = (p: number): Tone => (p > 95 ? "ok" : p > 85 ? "warn" : "crit");
const successColor = (p: number) => (p > 95 ? "#16a34a" : p > 85 ? "#f5a524" : "#e5383b");
const ownerName = (id: string) => USERS.find((u) => u.id === id)?.name ?? id;

const TABS: [string, string][] = [["all", "All Runbooks"], ["auto", "Auto-executable"], ["manual", "Manual"], ["failed", "Recent failures"]];

export default function RunbooksScreen() {
  const { setRoute } = useNav();
  const [tab, setTab] = React.useState("all");
  const [running, setRunning] = React.useState<Runbook | null>(null);
  const canWrite = useCanWrite();

  const filtered = tab === "auto" ? RUNBOOKS.filter(r => r.auto) : tab === "manual" ? RUNBOOKS.filter(r => !r.auto) : RUNBOOKS;

  const totalRuns = RUNBOOKS.reduce((s, r) => s + r.runs, 0);
  const autoCount = RUNBOOKS.filter(r => r.auto).length;
  const okRuns = RUNBOOKS.reduce((s, r) => s + r.runs * (r.success / 100), 0);
  const successPct = totalRuns ? (okRuns / totalRuns) * 100 : 0;
  const failedRuns = Math.round(totalRuns - okRuns);
  const avgSec = RUNBOOKS.length ? RUNBOOKS.reduce((s, r) => s + toSeconds(r.avg), 0) / RUNBOOKS.length : 0;
  const tags = countBy(RUNBOOKS, (r) => r.tag);

  return (
    <div className="ld-dash">
      <nav className="ld-crumbs" aria-label="Breadcrumb">
        <button type="button" className="ld-link" onClick={() => setRoute("dashboard")}>Home</button>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <span>Automation</span>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <span>Runbooks</span>
      </nav>

      <div className="ld-head">
        <div>
          <h1>Runbook Library</h1>
          <p>Operational playbooks · executable shell / kubectl / terraform / ansible · {fmt(totalRuns)} recorded executions</p>
        </div>
        <div className="ld-head-actions">
          <ReadOnlyBadge />
          <button type="button" className="ld-btn"><i className="fa-solid fa-clock-rotate-left" aria-hidden="true" /> Run History</button>
          <button type="button" className="ld-btn"><i className="fa-solid fa-file-import" aria-hidden="true" /> Import</button>
          {canWrite && <button type="button" className="ld-btn ld-btn-primary"><i className="fa-solid fa-plus" aria-hidden="true" /> New Runbook</button>}
        </div>
      </div>

      <div className="ld-grid ld-grid-6">
        <StatCard icon="fa-book-bookmark" tone="info" label="Total runbooks" value={fmt(RUNBOOKS.length)} note="published" onClick={() => setTab("all")} />
        <StatCard icon="fa-bolt" tone="ok" label="Auto-executable" value={fmt(autoCount)} note="zero-touch" onClick={() => setTab("auto")} />
        <StatCard icon="fa-play" tone="purple" label="Executions" value={fmt(totalRuns)} note="across all runbooks" />
        <StatCard icon="fa-circle-check" tone={successTone(successPct)} label="Success rate" value={`${successPct.toFixed(1)}%`} note="weighted by runs" />
        <StatCard icon="fa-stopwatch" tone="muted" label="Avg duration" value={fmtDuration(avgSec)} note="mean per runbook" />
        <StatCard icon="fa-triangle-exclamation" tone="warn" label="Failed runs" value={fmt(failedRuns)} note="estimated from success rate" />
      </div>

      <section className="ld-card ld-panel" aria-labelledby="rb-cat-h">
        <div className="ld-panel-head"><h2 id="rb-cat-h">Categories</h2></div>
        <div className="ld-chips">
          {tags.map(([tag, n]) => {
            const meta = TAG_META[tag] ?? { label: tag, icon: "fa-tag", color: "#6b7785" };
            return (
              <span key={tag} className="ld-chip ld-choice-static">
                <i className={`fa-solid ${meta.icon}`} style={{ color: meta.color }} aria-hidden="true" />
                <span className="ld-chip-label">{meta.label}</span>
                <span className="ld-chip-count">{n}</span>
              </span>
            );
          })}
        </div>
      </section>

      <div className="ld-split">
        <div className="ld-rail">
          <section className="ld-card ld-panel" aria-labelledby="rb-list-h">
            <div className="ld-panel-head">
              <h2 id="rb-list-h">Runbooks</h2>
              <span className="ld-muted ld-small">{fmt(filtered.length)} shown</span>
            </div>
            <div className="ld-tabs" role="tablist" aria-label="Runbook filters">
              {TABS.map(([id, l]) => (
                <button key={id} type="button" role="tab" aria-selected={tab === id} className={`ld-tab${tab === id ? " active" : ""}`} onClick={() => setTab(id)}>{l}</button>
              ))}
            </div>
            {filtered.length ? (
              <div className="ld-table-wrap">
                <table className="ld-table">
                  <thead>
                    <tr>
                      <th scope="col">Number</th>
                      <th scope="col">Title</th>
                      <th scope="col">Service</th>
                      <th scope="col">Language</th>
                      <th scope="col">Runs</th>
                      <th scope="col">Success</th>
                      <th scope="col">Avg time</th>
                      <th scope="col">Owner</th>
                      <th scope="col">Mode</th>
                      <th scope="col"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(r => (
                      <tr key={r.id}>
                        <td className="ld-mono ld-strong">{r.id}</td>
                        <td className="ld-wrap">
                          <span className="ld-mono-name">{r.title}</span>
                          <div className="ld-sub">{r.desc}</div>
                        </td>
                        <td className="ld-mono">{r.svc}</td>
                        <td><Pill tone="muted">{r.lang}</Pill></td>
                        <td className="ld-mono">{fmt(r.runs)}</td>
                        <td>
                          <div className="ld-admin-meter">
                            <span className="ld-bar-track"><span className="ld-bar-fill" style={{ width: `${r.success}%`, background: successColor(r.success) }} /></span>
                            <span>{r.success}%</span>
                          </div>
                        </td>
                        <td className="ld-mono">{r.avg}</td>
                        <td>{ownerName(r.owner)}</td>
                        <td>{r.auto ? <Pill tone="ok"><span className="ld-pill-dot" />Auto</Pill> : <Pill tone="warn"><span className="ld-pill-dot" />Manual</Pill>}</td>
                        <td>
                          {canWrite ? (
                            <button type="button" className="ld-btn ld-btn-sm ld-btn-primary" onClick={() => setRunning(r)} aria-label={`Run ${r.title}`}>
                              <i className="fa-solid fa-play" aria-hidden="true" /> Run
                            </button>
                          ) : (
                            <button type="button" className="ld-btn ld-btn-sm" disabled title="Read-only">
                              <i className="fa-solid fa-lock" aria-hidden="true" /> Run
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty>No runbooks match this filter.</Empty>
            )}
          </section>

          <section className="ld-card ld-panel" aria-labelledby="rb-feat-h">
            <div className="ld-panel-head">
              <h2 id="rb-feat-h">Featured Runbook · pool-expansion-v3</h2>
              <Pill tone="muted">Example script</Pill>
            </div>
            <pre className="ld-code ld-admin-term">
              <span className="c"># Step 1 · Verify pool utilization above 90%</span>{"\n"}
              <span className="p">$</span> aws rds describe-db-clusters --db-cluster-identifier payments-primary \{"\n"}
              {"    "}--query 'DBClusters[0].DBClusterMembers[*].DBInstanceIdentifier'{"\n"}
              <span className="c"># Step 2 · Scale connection pool from 120 → 200</span>{"\n"}
              <span className="p">$</span> kubectl set env deployment/payments-primary \{"\n"}
              {"    "}DB_POOL_SIZE=200 -n production{"\n"}
              <span className="c"># Step 3 · Wait for rollout</span>{"\n"}
              <span className="p">$</span> kubectl rollout status deployment/payments-primary -n production{"\n"}
              <span className="c"># Step 4 · Verify recovery against the SLO</span>{"\n"}
              <span className="p">$</span> linkedeye verify --slo checkout-availability --window 5m
            </pre>
            <div className="ld-admin-actions">
              {canWrite
                ? <button type="button" className="ld-btn ld-btn-primary" onClick={() => setRunning(RUNBOOKS[0])}><i className="fa-solid fa-play" aria-hidden="true" /> Dry Run</button>
                : <button type="button" className="ld-btn" disabled title="Read-only"><i className="fa-solid fa-lock" aria-hidden="true" /> Dry Run</button>}
              {canWrite && <button type="button" className="ld-btn"><i className="fa-solid fa-pen" aria-hidden="true" /> Edit</button>}
              <button type="button" className="ld-btn"><i className="fa-solid fa-clock-rotate-left" aria-hidden="true" /> History ({fmt(RUNBOOKS[0].runs)})</button>
              <button type="button" className="ld-btn"><i className="fa-solid fa-copy" aria-hidden="true" /> Copy</button>
            </div>
          </section>
        </div>

        <div className="ld-rail">
          <section className="ld-card ld-panel" aria-labelledby="rb-exec-h">
            <div className="ld-panel-head">
              <h2 id="rb-exec-h">Recent Executions</h2>
              <Pill tone="muted">Sample data</Pill>
            </div>
            <ul className="ld-activity">
              {SAMPLE_EXECUTIONS.map(([rb, trig, time, st], i) => (
                <li key={i}>
                  <span className="ld-activity-text"><span className="ld-mono">{rb}</span> <span className="ld-muted ld-small">· {trig} · {time}</span></span>
                  <Pill tone={st === "success" ? "ok" : "crit"}><span className="ld-pill-dot" />{st}</Pill>
                </li>
              ))}
            </ul>
          </section>

          <Panel title="Quick Actions">
            <div className="ld-admin-quick">
              {QUICK_ACTIONS.map(([ic, l]) => (
                <button key={l} type="button" className="ld-btn ld-btn-sm"><i className={`fa-solid ${ic}`} aria-hidden="true" /> {l}</button>
              ))}
            </div>
          </Panel>

          <Panel title="AI Authoring">
            <p className="ld-small">Generate runbook drafts from resolved incidents.</p>
            <button type="button" className="ld-btn ld-btn-primary"><i className="fa-solid fa-robot" aria-hidden="true" /> Generate from INC-48291</button>
          </Panel>
        </div>
      </div>

      <p className="ld-muted ld-small">Sample runbook library — runbook storage and execution are not connected to the backend yet.</p>

      {running && <RunOverlay rb={running} onClose={() => setRunning(null)} />}
    </div>
  );
}

// ── Simulated runbook execution dialog ──────────────────────────────────────
// Steps through generated stages for the runbook with a progress bar and a
// terminal-style log. Nothing is executed; the dialog says so.
function RunOverlay({ rb, onClose }: { rb: Runbook; onClose: () => void }) {
  const steps = React.useMemo(() => stepsFor(rb), [rb]);
  const [done, setDone] = React.useState(0); // number of completed steps
  const finished = done >= steps.length;

  React.useEffect(() => {
    if (finished) return;
    const t = setTimeout(() => setDone((d) => d + 1), done === 0 ? 350 : 750);
    return () => clearTimeout(t);
  }, [done, finished, steps.length]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && finished) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finished, onClose]);

  const elapsed = (steps.slice(0, done).reduce((s, st) => s + st.ms, 0) / 1000).toFixed(1);
  const pct = Math.round((done / steps.length) * 100);

  return (
    <div className="le-modal-backdrop ld-admin-modal-top" onClick={finished ? onClose : undefined}>
      <div className="le-modal ld-admin-modal" role="dialog" aria-modal="true" aria-labelledby="rb-run-h" onClick={(e) => e.stopPropagation()}>
        <div className="le-modal-head">
          <span className={`le-modal-icon ${finished ? "ld-ok" : "ld-info"}`} aria-hidden="true">
            <i className={`fa-solid ${finished ? "fa-circle-check" : "fa-circle-notch fa-spin"}`} />
          </span>
          <div className="le-modal-titles">
            <h3 id="rb-run-h">Executing <span className="ld-mono">{rb.title}</span> · {rb.id}</h3>
            <p>{rb.lang} · {elapsed}s · simulated run</p>
          </div>
          <Pill tone="muted">Simulation</Pill>
        </div>

        <div className={`ld-admin-progress${finished ? " done" : ""}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Execution progress">
          <span style={{ width: `${pct}%` }} />
        </div>

        <div className="le-modal-body">
          <pre className="ld-code ld-admin-term ld-admin-term-scroll" aria-live="polite">
            {steps.slice(0, Math.max(done, 1)).map((st, i) => {
              const complete = i < done;
              const active = i === done && !finished;
              return (
                <React.Fragment key={i}>
                  <span className="c"># {st.title}</span>{"\n"}
                  <span className="p">$</span> {st.cmd}{"\n"}
                  {complete && <><span className="ok">  ✓ {st.out}</span>{"\n"}</>}
                  {active && <><span className="run">  … running</span>{"\n"}</>}
                </React.Fragment>
              );
            })}
            {finished && <span className="ok">{"\n"}✓ Runbook {rb.title} completed · {steps.length} steps · {elapsed}s (simulated)</span>}
          </pre>
        </div>

        <div className="le-modal-foot">
          {!finished ? (
            <button type="button" className="ld-btn" onClick={onClose}><i className="fa-solid fa-stop" aria-hidden="true" /> Abort</button>
          ) : (
            <>
              <span className="ld-admin-status spacer"><i className="fa-solid fa-circle-check ld-text-ok" aria-hidden="true" /> Simulation finished — nothing was executed</span>
              <button type="button" className="ld-btn ld-btn-primary" onClick={onClose}><i className="fa-solid fa-check" aria-hidden="true" /> Close</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface RunStep { title: string; cmd: string; out: string; ms: number }
function stepsFor(rb: Runbook): RunStep[] {
  const engineCmd: Record<string, string> = {
    shell: `bash ${rb.title}.sh --target ${rb.svc}`,
    kubectl: `kubectl apply -f ${rb.title}.yaml -n production`,
    python: `python -m runbooks.${rb.title.replace(/-/g, "_")} --svc ${rb.svc}`,
    terraform: `terraform apply -auto-approve -target=${rb.svc}`,
    "aws-cli": `aws ssm start-automation-execution --document ${rb.title}`,
    ansible: `ansible-playbook ${rb.title}.yml -l ${rb.svc}`,
    powercli: `Invoke-VMScript -Runbook ${rb.title} -Host ${rb.svc}`,
  };
  return [
    { title: "Precondition check", cmd: `linkedeye preflight --runbook ${rb.id} --svc ${rb.svc}`, out: `${rb.svc} reachable · change-window open · lock acquired`, ms: 900 },
    { title: `Execute ${rb.lang} playbook`, cmd: engineCmd[rb.lang] ?? `run ${rb.title}`, out: `applied · exit 0`, ms: 2400 },
    { title: "Health gate", cmd: `linkedeye verify --slo checkout-availability --window 5m`, out: `checkout-availability 99.94% (target 99.9%)`, ms: 1500 },
    { title: "Release & record", cmd: `linkedeye finalize --runbook ${rb.id} --release-lock`, out: `lock released · execution ${rb.runs + 1} recorded`, ms: 700 },
  ];
}
