// Runbook library — LinkedEye list layout: summary cards derived from the
// runbook catalog, category chips, a tabbed runbook table with Run actions,
// an example script and a simulated execution dialog. The catalog is a local
// sample (no runbook endpoint yet) and is labelled as such.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { USERS } from "@/data/core";
import { Empty, Panel, Pill, PillDot, StatCard, countBy, fmt } from "@/components/ld";
import { Button, Crumbs, Page, PageHead, Tab, Table, Tabs, cx, toneBg, toneText, ui } from "@/components/ui";
import type { Tone } from "@/components/ld";
import { useCanWrite } from "@/auth/auth";
import ReadOnlyBadge from "@/components/ReadOnlyBadge";

import { Icon } from "@/components/Icon";
import { BotIcon, CheckIcon, CircleCheckIcon, CopyIcon, FileInputIcon, HistoryIcon, LockIcon, PencilIcon, PlayIcon, PlusIcon, SquareIcon } from "lucide-react";
// Category chip (static), success meter, code block (were ld-chip / ld-admin-meter / ld-code ld-admin-term)
const chip = cx(
  "inline-flex flex-col items-center justify-center gap-1 min-w-[104px] min-h-[76px] py-2.5 px-3 border border-line rounded-lg bg-bg-raised text-fg cursor-default shadow-sm hover:border-line-strong",
  "[&_.ld-icon]:text-2xl [&_.ld-icon]:text-accent",
);
const meter = "flex items-center gap-2 min-w-[150px]";
const meterTrack = "flex-[1_1_60px] h-2 rounded-[5px] bg-bg-muted overflow-hidden";
const meterFill = "block h-2 rounded-[5px]";
const meterValue = "font-mono text-xs text-fg whitespace-nowrap";
const codeBlock = "m-0 py-3.5 px-4 rounded bg-[#0b1220] text-[#e2e8f0] font-mono text-[12.5px] leading-[1.7] overflow-x-auto whitespace-pre-wrap";
const term = { c: "text-[#94a3b8]", p: "text-[#38bdf8]", ok: "text-[#4ade80]", run: "text-[#fbbf24]" };
// mono table cell: the cell keeps its 13px size
const monoCell = "font-mono font-semibold";
// Run dialog shell (was le-modal-* + ld-admin-modal / ld-admin-modal-top)
const runBackdrop = "fixed inset-0 bg-[rgba(10,20,51,0.5)] backdrop-blur-[3px] z-[1200] grid justify-items-center items-start pt-[6vh] pb-10 px-5 overflow-y-auto max-sm:pt-4";
const m = {
  modal: "bg-bg-raised rounded-[12px] max-w-full shadow-pop border border-line overflow-hidden flex flex-col max-h-[calc(100vh-80px)] animate-[modalpop_0.16s_cubic-bezier(.2,.8,.3,1)]",
  head: "flex items-center gap-3 py-4 px-4.5 border-b border-line",
  icon: "w-[38px] h-[38px] rounded-[9px] grid place-items-center text-[17px] shrink-0",
  titles: "flex-1 min-w-0",
  title: "text-[15.5px] font-bold text-fg leading-[1.25] whitespace-nowrap overflow-hidden text-ellipsis",
  subtitle: "text-xs text-fg-subtle mt-0.5",
  body: "p-4.5 overflow-y-auto",
  foot: "flex items-center justify-end gap-2 py-[13px] px-4.5 border-t border-line bg-bg-muted flex-wrap",
};

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
    <Page>
      <Crumbs items={[{ label: "Home", onClick: () => setRoute("dashboard") }, { label: "Automation" }, { label: "Runbooks" }]} />

      <PageHead
        title="Runbook Library"
        subtitle={<>Operational playbooks · executable shell / kubectl / terraform / ansible · {fmt(totalRuns)} recorded executions</>}
        actions={
          <>
            <ReadOnlyBadge />
            <Button><Icon icon={HistoryIcon} /> Run History</Button>
            <Button><Icon icon={FileInputIcon} /> Import</Button>
            {canWrite && <Button variant="primary"><Icon icon={PlusIcon} /> New Runbook</Button>}
          </>
        }
      />

      {/* six-up row; the stat cards keep their full size, as in the reference */}
      <div className={cx(ui.grid, "grid-cols-[repeat(auto-fit,minmax(180px,1fr))]")}>
        <StatCard icon="fa-book-bookmark" tone="info" label="Total runbooks" value={fmt(RUNBOOKS.length)} note="published" onClick={() => setTab("all")} />
        <StatCard icon="fa-bolt" tone="ok" label="Auto-executable" value={fmt(autoCount)} note="zero-touch" onClick={() => setTab("auto")} />
        <StatCard icon="fa-play" tone="purple" label="Executions" value={fmt(totalRuns)} note="across all runbooks" />
        <StatCard icon="fa-circle-check" tone={successTone(successPct)} label="Success rate" value={`${successPct.toFixed(1)}%`} note="weighted by runs" />
        <StatCard icon="fa-stopwatch" tone="muted" label="Avg duration" value={fmtDuration(avgSec)} note="mean per runbook" />
        <StatCard icon="fa-triangle-exclamation" tone="warn" label="Failed runs" value={fmt(failedRuns)} note="estimated from success rate" />
      </div>

      <section className={cx(ui.card, ui.panel)} aria-labelledby="rb-cat-h">
        <div className={ui.panelHead}><h2 className={ui.panelTitle} id="rb-cat-h">Categories</h2></div>
        <div className="flex flex-wrap gap-2.5">
          {tags.map(([tag, n]) => {
            const meta = TAG_META[tag] ?? { label: tag, icon: "fa-tag", color: "#6b7785" };
            return (
              <span key={tag} className={chip}>
                <Icon className={`fa-solid ${meta.icon}`} style={{ color: meta.color }} />
                <span className="text-sm text-fg-muted">{meta.label}</span>
                <span className="text-md font-bold">{n}</span>
              </span>
            );
          })}
        </div>
      </section>

      <div className={ui.split}>
        <div className={ui.rail}>
          <section className={cx(ui.card, ui.panel)} aria-labelledby="rb-list-h">
            <div className={ui.panelHead}>
              <h2 className={ui.panelTitle} id="rb-list-h">Runbooks</h2>
              <span className="text-fg-muted text-xs">{fmt(filtered.length)} shown</span>
            </div>
            <Tabs aria-label="Runbook filters">
              {TABS.map(([id, l]) => (
                <Tab key={id} active={tab === id} onClick={() => setTab(id)}>{l}</Tab>
              ))}
            </Tabs>
            {filtered.length ? (
              <Table>
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
                        <td className="font-mono font-medium">{r.id}</td>
                        <td className={ui.cellWrap}>
                          <span className="font-mono text-[12.5px] text-accent">{r.title}</span>
                          <div className={ui.sub}>{r.desc}</div>
                        </td>
                        <td className={monoCell}>{r.svc}</td>
                        <td><Pill tone="muted">{r.lang}</Pill></td>
                        <td className={monoCell}>{fmt(r.runs)}</td>
                        <td>
                          <div className={meter}>
                            <span className={meterTrack}><span className={meterFill} style={{ width: `${r.success}%`, background: successColor(r.success) }} /></span>
                            <span className={meterValue}>{r.success}%</span>
                          </div>
                        </td>
                        <td className={monoCell}>{r.avg}</td>
                        <td>{ownerName(r.owner)}</td>
                        <td>{r.auto ? <Pill tone="ok"><PillDot />Auto</Pill> : <Pill tone="warn"><PillDot />Manual</Pill>}</td>
                        <td>
                          {canWrite ? (
                            <Button variant="primary" size="sm" onClick={() => setRunning(r)} aria-label={`Run ${r.title}`}>
                              <Icon icon={PlayIcon} /> Run
                            </Button>
                          ) : (
                            <Button size="sm" disabled title="Read-only">
                              <Icon icon={LockIcon} /> Run
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
            ) : (
              <Empty>No runbooks match this filter.</Empty>
            )}
          </section>

          <section className={cx(ui.card, ui.panel)} aria-labelledby="rb-feat-h">
            <div className={ui.panelHead}>
              <h2 className={ui.panelTitle} id="rb-feat-h">Featured Runbook · pool-expansion-v3</h2>
              <Pill tone="muted">Example script</Pill>
            </div>
            <pre className={codeBlock}>
              <span className={term.c}># Step 1 · Verify pool utilization above 90%</span>{"\n"}
              <span className={term.p}>$</span> aws rds describe-db-clusters --db-cluster-identifier payments-primary \{"\n"}
              {"    "}--query 'DBClusters[0].DBClusterMembers[*].DBInstanceIdentifier'{"\n"}
              <span className={term.c}># Step 2 · Scale connection pool from 120 → 200</span>{"\n"}
              <span className={term.p}>$</span> kubectl set env deployment/payments-primary \{"\n"}
              {"    "}DB_POOL_SIZE=200 -n production{"\n"}
              <span className={term.c}># Step 3 · Wait for rollout</span>{"\n"}
              <span className={term.p}>$</span> kubectl rollout status deployment/payments-primary -n production{"\n"}
              <span className={term.c}># Step 4 · Verify recovery against the SLO</span>{"\n"}
              <span className={term.p}>$</span> linkedeye verify --slo checkout-availability --window 5m
            </pre>
            <div className="flex flex-wrap items-center gap-2">
              {canWrite
                ? <Button variant="primary" onClick={() => setRunning(RUNBOOKS[0])}><Icon icon={PlayIcon} /> Dry Run</Button>
                : <Button disabled title="Read-only"><Icon icon={LockIcon} /> Dry Run</Button>}
              {canWrite && <Button><Icon icon={PencilIcon} /> Edit</Button>}
              <Button><Icon icon={HistoryIcon} /> History ({fmt(RUNBOOKS[0].runs)})</Button>
              <Button><Icon icon={CopyIcon} /> Copy</Button>
            </div>
          </section>
        </div>

        <div className={ui.rail}>
          <section className={cx(ui.card, ui.panel)} aria-labelledby="rb-exec-h">
            <div className={ui.panelHead}>
              <h2 className={ui.panelTitle} id="rb-exec-h">Recent Executions</h2>
              <Pill tone="muted">Sample data</Pill>
            </div>
            <ul className={ui.activity}>
              {SAMPLE_EXECUTIONS.map(([rb, trig, time, st], i) => (
                <li key={i} className={ui.activityItem}>
                  <span className={ui.activityText}><span className={ui.mono}>{rb}</span> <span className="text-fg-muted text-xs">· {trig} · {time}</span></span>
                  <Pill tone={st === "success" ? "ok" : "crit"}><PillDot />{st}</Pill>
                </li>
              ))}
            </ul>
          </section>

          <Panel title="Quick Actions">
            <div className="grid grid-cols-2 gap-2 [&>button]:justify-start">
              {QUICK_ACTIONS.map(([ic, l]) => (
                <Button key={l} size="sm"><Icon className={`fa-solid ${ic}`} /> {l}</Button>
              ))}
            </div>
          </Panel>

          <Panel title="AI Authoring">
            <p className="text-xs">Generate runbook drafts from resolved incidents.</p>
            <Button variant="primary"><Icon icon={BotIcon} /> Generate from INC-48291</Button>
          </Panel>
        </div>
      </div>

      <p className="text-fg-muted text-xs">Sample runbook library — runbook storage and execution are not connected to the backend yet.</p>

      {running && <RunOverlay rb={running} onClose={() => setRunning(null)} />}
    </Page>
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
    <div className={runBackdrop} onClick={finished ? onClose : undefined}>
      <div className={cx(m.modal, "w-[720px]")} role="dialog" aria-modal="true" aria-labelledby="rb-run-h" onClick={(e) => e.stopPropagation()}>
        <div className={m.head}>
          <span className={cx(m.icon, toneBg[finished ? "ok" : "info"])} aria-hidden="true">
            <Icon className={`fa-solid ${finished ? "fa-circle-check" : "fa-circle-notch fa-spin"}`} />
          </span>
          <div className={m.titles}>
            <h3 id="rb-run-h" className={m.title}>Executing <span className={ui.mono}>{rb.title}</span> · {rb.id}</h3>
            <p className={m.subtitle}>{rb.lang} · {elapsed}s · simulated run</p>
          </div>
          <Pill tone="muted">Simulation</Pill>
        </div>

        <div className="h-1 bg-bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Execution progress">
          <span className={cx("block h-full [transition:width_0.4s]", finished ? "bg-[#16a34a]" : "bg-accent")} style={{ width: `${pct}%` }} />
        </div>

        <div className={cx(m.body, "flex flex-col gap-3")}>
          <pre className={cx(codeBlock, "max-h-[340px] overflow-y-auto")} aria-live="polite">
            {steps.slice(0, Math.max(done, 1)).map((st, i) => {
              const complete = i < done;
              const active = i === done && !finished;
              return (
                <React.Fragment key={i}>
                  <span className={term.c}># {st.title}</span>{"\n"}
                  <span className={term.p}>$</span> {st.cmd}{"\n"}
                  {complete && <><span className={term.ok}>  ✓ {st.out}</span>{"\n"}</>}
                  {active && <><span className={term.run}>  … running</span>{"\n"}</>}
                </React.Fragment>
              );
            })}
            {finished && <span className={term.ok}>{"\n"}✓ Runbook {rb.title} completed · {steps.length} steps · {elapsed}s (simulated)</span>}
          </pre>
        </div>

        <div className={m.foot}>
          {!finished ? (
            <Button onClick={onClose}><Icon icon={SquareIcon} /> Abort</Button>
          ) : (
            <>
              <span className="inline-flex items-center gap-1.5 text-sm text-fg-muted flex-1 mr-auto"><Icon icon={CircleCheckIcon} className={toneText.ok} /> Simulation finished — nothing was executed</span>
              <Button variant="primary" onClick={onClose}><Icon icon={CheckIcon} /> Close</Button>
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
