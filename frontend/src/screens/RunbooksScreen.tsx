// Runbooks library in ServiceNow form-style.
// Ported from screens/runbooks.jsx.
import React from "react";
import { Kpi, FormSection, UserById } from "@/components/primitives";
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

export default function RunbooksScreen() {
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const toggle = (id: string) => setCollapsed(c => ({ ...c, [id]: !c[id] }));
  const [tab, setTab] = React.useState("all");
  const [running, setRunning] = React.useState<Runbook | null>(null);
  const canWrite = useCanWrite();

  const filtered = tab === "auto" ? RUNBOOKS.filter(r => r.auto) : tab === "manual" ? RUNBOOKS.filter(r => !r.auto) : RUNBOOKS;

  return (
    <div className="page page-fade sn-dash">
      <div className="sn-breadcrumb">
        <a className="sn-link">Home</a><span className="sn-bc-sep">›</span>
        <a className="sn-link">Automation</a><span className="sn-bc-sep">›</span>
        <span>Runbooks</span>
      </div>

      <div className="sn-form-header">
        <div className="sn-form-title-row">
          <span className="sn-rec-number">RUNBOOKS</span>
          <span className="sn-pill state-progress"><i className="fa-solid fa-spinner fa-spin" /> {RUNBOOKS.length} published</span>
          <span className="sn-pill state-neutral"><i className="fa-solid fa-bolt" /> {RUNBOOKS.filter(r => r.auto).length} auto-executable</span>
          <span className="sn-pill svc-healthy"><i className="fa-solid fa-circle" /> 96.4% success</span>
        </div>
        <div className="sn-form-title-meta">
          <div>
            <h1>Runbook Library</h1>
            <div className="sn-form-sub">Operational playbooks · executable shell / kubectl / terraform / ansible · {RUNBOOKS.reduce((s,r) => s + r.runs, 0).toLocaleString()} total executions</div>
          </div>
          <div className="sn-form-actions">
            <ReadOnlyBadge />
            <button className="sn-btn"><i className="fa-solid fa-clock-rotate-left" /> Run History</button>
            <button className="sn-btn"><i className="fa-solid fa-file-import" /> Import</button>
            {canWrite && <button className="sn-btn primary"><i className="fa-solid fa-plus" /> New Runbook</button>}
          </div>
        </div>
      </div>

      <div className="sn-kpi-strip">
        <Kpi l="Total runbooks" v={RUNBOOKS.length} s="published" tone="neutral" />
        <Kpi l="Auto-executable" v={RUNBOOKS.filter(r => r.auto).length} s="zero-touch" tone="ok" />
        <Kpi l="Executions / mo" v={RUNBOOKS.reduce((s,r) => s + r.runs, 0).toLocaleString()} s="across fleet" tone="neutral" />
        <Kpi l="Avg success" v="96.4%" s="last 30 days" tone="ok" />
        <Kpi l="Avg duration" v="4m 02s" s="end-to-end" tone="ok" />
        <Kpi l="Failed runs" v="42" s="last 30d · review" tone="warn" />
      </div>

      <div className="sn-form-layout">
        <div className="sn-form-main">
          <FormSection id="cats" title="Categories" collapsed={collapsed.cats} onToggle={toggle}>
            <div className="sn-kind-grid">
              {([
                ["Database", 2, "fa-database", "#8b5cf6"],
                ["Kubernetes", 2, "fa-cube", "#2563eb"],
                ["Network", 1, "fa-network-wired", "#7c3aed"],
                ["Security", 1, "fa-shield-halved", "#dc2626"],
                ["CDN", 1, "fa-bolt", "#0ea5e9"],
                ["Payments", 1, "fa-credit-card", "#10b981"],
                ["Virtualization", 1, "fa-server", "#475569"],
                ["Logs", 1, "fa-file-lines", "#f59e0b"],
              ] as [string, number, string, string][]).map(([n, c, ic, col]) => (
                <div key={n} className="sn-kind-card">
                  <div className="sn-kind-icon" style={{ color: col, background: col + "14" }}><i className={`fa-solid ${ic}`} /></div>
                  <div className="sn-kind-body">
                    <div className="sn-kind-count">{c}</div>
                    <div className="sn-kind-label">{n}</div>
                  </div>
                </div>
              ))}
            </div>
          </FormSection>

          <div className="sn-activity-section">
            <div className="sn-activity-tabs">
              {[["all","All Runbooks"],["auto","Auto-executable"],["manual","Manual"],["failed","Recent failures"]].map(([id, l]) => (
                <button key={id} className={`sn-act-tab${tab === id ? " active" : ""}`} onClick={() => setTab(id)}>{l}</button>
              ))}
            </div>
            <table className="sn-list-table">
              <thead>
                <tr>
                  <th style={{width:110}}>Number</th>
                  <th>Title</th>
                  <th style={{width:130}}>Service</th>
                  <th style={{width:100}}>Language</th>
                  <th style={{width:90}}>Runs</th>
                  <th style={{width:110}}>Success</th>
                  <th style={{width:110}}>Avg time</th>
                  <th style={{width:130}}>Owner</th>
                  <th style={{width:100}}>Mode</th>
                  <th style={{width:72}}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} style={{ cursor: "pointer" }}>
                    <td><a className="sn-link mono"><b>{r.id}</b></a></td>
                    <td>
                      <div className="row row-8">
                        <span className="kind-mini" style={{ color: "#2563eb", background: "#2563eb18" }}><i className="fa-solid fa-book-bookmark" /></span>
                        <div>
                          <a className="sn-link mono"><b>{r.title}</b></a>
                          <div className="text-mute" style={{ fontSize: 11, marginTop: 2 }}>{r.desc}</div>
                        </div>
                      </div>
                    </td>
                    <td className="mono">{r.svc}</td>
                    <td><span className="sn-state-pill state-neutral"><i className="fa-solid fa-circle" /> {r.lang}</span></td>
                    <td className="mono">{r.runs.toLocaleString()}</td>
                    <td>
                      <div className="row row-8">
                        <div className="bar-track" style={{ width: 50 }}><div className="bar-fill" style={{ width: r.success + "%", background: r.success > 95 ? "var(--success)" : r.success > 85 ? "var(--warning)" : "var(--critical)" }} /></div>
                        <span className={`mono ${r.success > 95 ? "tone-ok" : r.success > 85 ? "tone-warn" : "tone-crit"}`} style={{ fontSize: 11.5 }}><b>{r.success}%</b></span>
                      </div>
                    </td>
                    <td className="mono">{r.avg}</td>
                    <td><UserById id={r.owner} /></td>
                    <td>{r.auto ? <span className="sn-state-pill svc-healthy"><i className="fa-solid fa-circle" /> Auto</span> : <span className="sn-state-pill state-mitigating"><i className="fa-solid fa-circle" /> Manual</span>}</td>
                    <td>
                      {canWrite ? (
                        <button className="sn-btn primary" style={{ padding: "3px 11px", fontSize: 11 }} onClick={(e) => { e.stopPropagation(); setRunning(r); }}>
                          <i className="fa-solid fa-play" /> Run
                        </button>
                      ) : (
                        <button className="sn-btn" style={{ padding: "3px 11px", fontSize: 11 }} disabled title="Read-only">
                          <i className="fa-solid fa-lock" /> Run
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <FormSection id="featured" title="Featured Runbook · pool-expansion-v3" badge="executable preview" collapsed={collapsed.featured} onToggle={toggle}>
            <div style={{ padding: 14 }}>
              <div style={{ background: "#0b1220", color: "#e2e8f0", padding: 16, borderRadius: 3, fontFamily: "var(--font-mono)", fontSize: 11.5, lineHeight: 1.7 }}>
                <div style={{ color: "#94a3b8" }}># Step 1 · Verify pool utilization above 90%</div>
                <div><span style={{ color: "#38bdf8" }}>$</span> aws rds describe-db-clusters --db-cluster-identifier payments-primary \</div>
                <div>    --query 'DBClusters[0].DBClusterMembers[*].DBInstanceIdentifier'</div>
                <div style={{ color: "#94a3b8" }}># Step 2 · Scale connection pool from 120 → 200</div>
                <div><span style={{ color: "#38bdf8" }}>$</span> kubectl set env deployment/payments-primary \</div>
                <div>    DB_POOL_SIZE=200 -n production</div>
                <div style={{ color: "#94a3b8" }}># Step 3 · Wait for rollout</div>
                <div><span style={{ color: "#38bdf8" }}>$</span> kubectl rollout status deployment/payments-primary -n production</div>
                <div style={{ color: "#4ade80" }}>  ✓ deployment "payments-primary" successfully rolled out</div>
                <div style={{ color: "#94a3b8" }}># Step 4 · Verify recovery</div>
                <div><span style={{ color: "#38bdf8" }}>$</span> linkedeye verify --slo checkout-availability --window 5m</div>
                <div style={{ color: "#4ade80" }}>  ✓ checkout-availability: 99.94% (target 99.9%)</div>
              </div>
              <div className="row row-8" style={{ marginTop: 10 }}>
                {canWrite
                  ? <button className="sn-btn primary" onClick={() => setRunning(RUNBOOKS[0])}><i className="fa-solid fa-play" /> Dry Run</button>
                  : <button className="sn-btn" disabled title="Read-only"><i className="fa-solid fa-lock" /> Dry Run</button>}
                {canWrite && <button className="sn-btn"><i className="fa-solid fa-pen" /> Edit</button>}
                <button className="sn-btn"><i className="fa-solid fa-clock-rotate-left" /> History (1,842)</button>
                <button className="sn-btn"><i className="fa-solid fa-copy" /> Copy</button>
              </div>
            </div>
          </FormSection>
        </div>

        <aside className="sn-form-side">
          <div className="sn-side-card">
            <div className="sn-side-head">Recent Executions <span className="sn-side-count">5</span></div>
            <div className="sn-side-body">
              {[
                ["pool-expansion-v3", "INC-48291", "14m ago", "success"],
                ["cdn-cache-purge", "manual", "1h ago", "success"],
                ["k8s-rolling-restart", "CHG-2216", "2h ago", "success"],
                ["log-archive-flush", "scheduled", "6h ago", "success"],
                ["etcd-recovery", "INC-48279", "4h ago", "failed"],
              ].map(([rb, trig, time, st], i) => (
                <div key={i} className="sn-related-row">
                  <div>
                    <div className="sn-related-title mono">{rb}</div>
                    <div className="sn-related-meta">{trig} · {time}</div>
                  </div>
                  <span className={`sn-state-pill ${st === "success" ? "svc-healthy" : "state-active"}`}><i className="fa-solid fa-circle" /> {st}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="sn-side-card">
            <div className="sn-side-head">Quick Actions</div>
            <div className="sn-side-body sn-actions-grid">
              {[
                ["fa-plus", "New Runbook"],
                ["fa-file-import", "Import YAML"],
                ["fa-vial", "Sandbox"],
                ["fa-key", "API Tokens"],
                ["fa-clock-rotate-left", "All History"],
                ["fa-book", "Style Guide"],
              ].map(([ic, l]) => (
                <button key={l} className="sn-action"><i className={`fa-solid ${ic}`} /><span>{l}</span></button>
              ))}
            </div>
          </div>

          <div className="sn-side-card">
            <div className="sn-side-head">AI Authoring</div>
            <div className="sn-side-body" style={{ padding: 14, fontSize: 12.5, lineHeight: 1.6, color: "#000" }}>
              Generate runbook drafts from resolved incidents.
              <button className="sn-btn primary" style={{ marginTop: 10, width: "100%", justifyContent: "center" }}>
                <i className="fa-solid fa-robot" /> Generate from INC-48291
              </button>
            </div>
          </div>
        </aside>
      </div>

      {running && <RunOverlay rb={running} onClose={() => setRunning(null)} />}
    </div>
  );
}

// ── Live runbook execution overlay ──────────────────────────────────────────
// Streams generated steps for the runbook with per-step timing, a progress bar,
// and a terminal-style log; ends in a success summary.
function RunOverlay({ rb, onClose }: { rb: Runbook; onClose: () => void }) {
  const steps = React.useMemo(() => stepsFor(rb), [rb]);
  const [done, setDone] = React.useState(0); // number of completed steps
  const finished = done >= steps.length;

  React.useEffect(() => {
    if (finished) return;
    const t = setTimeout(() => setDone((d) => d + 1), done === 0 ? 350 : 750);
    return () => clearTimeout(t);
  }, [done, finished, steps.length]);

  const elapsed = (steps.slice(0, done).reduce((s, st) => s + st.ms, 0) / 1000).toFixed(1);
  const pct = Math.round((done / steps.length) * 100);

  return (
    <div className="tsw-backdrop" onClick={finished ? onClose : undefined} style={{ alignItems: "flex-start", paddingTop: "6vh" }}>
      <div className="tsw" onClick={(e) => e.stopPropagation()} style={{ width: 720, maxWidth: "94vw" }}>
        <div className="sn-side-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px" }}>
          <span><i className={`fa-solid ${finished ? "fa-circle-check" : "fa-circle-notch fa-spin"}`} style={{ marginRight: 8, color: finished ? "#10b981" : "#38bdf8" }} />Executing <b className="mono">{rb.title}</b> · {rb.id}</span>
          <span className="mono" style={{ fontSize: 12, color: "var(--fg-muted)" }}>{rb.lang} · {elapsed}s</span>
        </div>

        {/* progress bar */}
        <div style={{ height: 4, background: "var(--border, #e5e8eb)" }}>
          <div style={{ height: "100%", width: pct + "%", background: finished ? "var(--success)" : "linear-gradient(90deg,#38bdf8,#2563eb)", transition: "width .4s" }} />
        </div>

        {/* terminal log */}
        <div style={{ background: "#0b1220", color: "#e2e8f0", padding: 16, fontFamily: "var(--font-mono)", fontSize: 11.5, lineHeight: 1.8, maxHeight: 340, overflowY: "auto" }}>
          {steps.slice(0, Math.max(done, 1)).map((st, i) => {
            const complete = i < done;
            const active = i === done && !finished;
            return (
              <div key={i} style={{ opacity: complete || active ? 1 : 0.5, marginBottom: 6 }}>
                <div style={{ color: "#94a3b8" }}># {st.title}</div>
                <div><span style={{ color: "#38bdf8" }}>$</span> {st.cmd}</div>
                {complete && <div style={{ color: "#4ade80" }}>  <i className="fa-solid fa-check" /> {st.out}</div>}
                {active && <div style={{ color: "#fbbf24" }}>  <i className="fa-solid fa-circle-notch fa-spin" /> running…</div>}
              </div>
            );
          })}
          {finished && (
            <div style={{ color: "#4ade80", marginTop: 8, borderTop: "1px solid #1e2b45", paddingTop: 8 }}>
              ✓ Runbook <b>{rb.title}</b> completed successfully · {steps.length} steps · {elapsed}s
            </div>
          )}
        </div>

        <div className="row row-8" style={{ padding: 12, justifyContent: "flex-end", background: "var(--bg-raised, #fff)" }}>
          {!finished ? (
            <button className="sn-btn" onClick={onClose}><i className="fa-solid fa-stop" /> Abort</button>
          ) : (
            <>
              <span className="mono" style={{ fontSize: 11.5, color: "var(--success)", marginRight: "auto", alignSelf: "center" }}><i className="fa-solid fa-circle-check" /> Execution recorded</span>
              <button className="sn-btn primary" onClick={onClose}><i className="fa-solid fa-check" /> Close</button>
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
