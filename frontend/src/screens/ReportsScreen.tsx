// Reports & SLA — LinkedEye layouts. ReportsScreen: problem / incident
// summaries derived from the loaded problems and incidents, plus a sample
// list of scheduled reports. SLAScreen: SLA inventory with compliance bars and
// breach summary, all derived from the loaded SLA definitions.
import "@/styles/admin.css";
import { useNav } from "@/hooks/useNav";
import { useIncidents, useProblems, useSlas } from "@/api/hooks";
import { Empty, Panel, Pill, StatCard, fmt } from "@/components/ld";
import type { Tone } from "@/components/ld";

const SEV_TONE: Record<number, Tone> = { 1: "crit", 2: "warn", 3: "info", 4: "muted" };
const problemTone = (s: string): Tone => (s === "Resolved" ? "ok" : s === "Known error" ? "purple" : "warn");
const complianceColor = (c: number) => (c > 95 ? "#16a34a" : c > 90 ? "#f5a524" : "#e5383b");
const complianceText = (c: number) => (c > 95 ? "ld-text-ok" : c > 90 ? "ld-text-warn" : "ld-text-crit");

const SAMPLE_SCHEDULED: [string, string, string][] = [
  ["Weekly ops digest", "Mon 09:00", "exec@"],
  ["Monthly SLO review", "1st of mo", "sre-leads@"],
  ["CAB pre-read", "Thu 16:00", "cab@"],
  ["QBR", "Quarterly", "leadership@"],
];

export default function ReportsScreen() {
  const { setRoute } = useNav();
  const { data } = useProblems();
  const problems = data ?? [];
  const { data: incData } = useIncidents();
  const incidents = incData ?? [];

  const open = problems.filter((p) => p.status !== "Resolved").length;
  const known = problems.filter((p) => p.status === "Known error").length;
  const linked = problems.reduce((s, p) => s + p.linked, 0);
  const top = [...problems].sort((a, b) => b.linked - a.linked).slice(0, 5);
  const bySev = [1, 2, 3, 4].map((n) => ({ n, count: incidents.filter((i) => i.sev === n).length }));
  const sevMax = Math.max(1, ...bySev.map((s) => s.count));

  return (
    <div className="ld-dash">
      <nav className="ld-crumbs" aria-label="Breadcrumb">
        <button type="button" className="ld-link" onClick={() => setRoute("dashboard")}>Home</button>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <span>Reports &amp; Analytics</span>
      </nav>

      <div className="ld-head">
        <div>
          <h1>Reports &amp; Analytics</h1>
          <p>Problem and incident trends across the organisation</p>
        </div>
        <div className="ld-head-actions">
          <button type="button" className="ld-btn"><i className="fa-solid fa-file-export" aria-hidden="true" /> Export</button>
          <button type="button" className="ld-btn ld-btn-primary"><i className="fa-solid fa-plus" aria-hidden="true" /> New Report</button>
        </div>
      </div>

      <div className="ld-grid ld-grid-stats">
        <StatCard icon="fa-bug" tone="warn" label="Open problems" value={fmt(open)} note={`${fmt(problems.length)} problems in total`} />
        <StatCard icon="fa-book" tone="purple" label="Known errors" value={fmt(known)} note="workaround documented" />
        <StatCard icon="fa-link" tone="info" label="Linked incidents" value={fmt(linked)} note="tied to a problem record" />
        <StatCard icon="fa-ticket" tone="crit" label="Incidents" value={fmt(incidents.length)} note={`${bySev[0].count} Sev 1`} />
      </div>

      <div className="ld-split">
        <div className="ld-rail">
          <Panel title="Top Problems by Linked Incidents">
            {top.length ? (
              <div className="ld-table-wrap">
                <table className="ld-table">
                  <thead>
                    <tr><th scope="col">Problem</th><th scope="col">Linked</th><th scope="col">Impact</th><th scope="col">State</th></tr>
                  </thead>
                  <tbody>
                    {top.map((p) => (
                      <tr key={p.id}>
                        <td className="ld-wrap"><span className="ld-strong">{p.title}</span><div className="ld-sub ld-mono">{p.id}</div></td>
                        <td className="ld-mono"><b>{p.linked}</b> incidents</td>
                        <td className="ld-muted">{p.impact}</td>
                        <td><Pill tone={problemTone(p.status)}><span className="ld-pill-dot" />{p.status}</Pill></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty>No problem records yet.</Empty>
            )}
          </Panel>

          <Panel title="Incident Volume by Severity">
            {incidents.length ? (
              <ul className="ld-bars">
                {bySev.map(({ n, count }) => (
                  <li key={n}>
                    <span className="ld-bar-label"><Pill tone={SEV_TONE[n]}>Sev {n}</Pill></span>
                    <span className="ld-bar-track"><span className="ld-bar-fill" style={{ width: `${(count / sevMax) * 100}%`, background: n === 1 ? "#e5383b" : n === 2 ? "#f5a524" : n === 3 ? "#2f6bff" : "#98a2b3" }} /></span>
                    <span className="ld-bar-value">{count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No incidents loaded.</Empty>
            )}
          </Panel>
        </div>

        <div className="ld-rail">
          <section className="ld-card ld-panel" aria-labelledby="rep-sched-h">
            <div className="ld-panel-head">
              <h2 id="rep-sched-h">Scheduled Reports</h2>
              <Pill tone="muted">Sample data</Pill>
            </div>
            <ul className="ld-activity">
              {SAMPLE_SCHEDULED.map(([n, w, r]) => (
                <li key={n}>
                  <i className="fa-solid fa-envelope ld-muted" aria-hidden="true" />
                  <span className="ld-activity-text">{n} <span className="ld-muted ld-small">· {w} · {r}</span></span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

export function SLAScreen() {
  const { setRoute } = useNav();
  const { data } = useSlas();
  const slas = data ?? [];

  const breaches = slas.reduce((s, x) => s + x.breach, 0);
  const avg = slas.length ? slas.reduce((s, x) => s + x.compliance, 0) / slas.length : 0;
  const atRisk = slas.filter((x) => x.compliance <= 95).length;
  const sorted = [...slas].sort((a, b) => b.compliance - a.compliance);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const causes = [...slas].sort((a, b) => b.breach - a.breach).slice(0, 5);

  return (
    <div className="ld-dash">
      <nav className="ld-crumbs" aria-label="Breadcrumb">
        <button type="button" className="ld-link" onClick={() => setRoute("dashboard")}>Home</button>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <span>Service Level Management</span>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <span>SLA Definitions</span>
      </nav>

      <div className="ld-head">
        <div>
          <h1>SLA Definitions</h1>
          <p>{slas.length} SLAs enforced · monthly window · all priorities</p>
        </div>
        <div className="ld-head-actions">
          <button type="button" className="ld-btn"><i className="fa-solid fa-file-export" aria-hidden="true" /> Export</button>
          <button type="button" className="ld-btn ld-btn-primary"><i className="fa-solid fa-plus" aria-hidden="true" /> New SLA</button>
        </div>
      </div>

      <div className="ld-grid ld-grid-5">
        <StatCard icon="fa-file-contract" tone="info" label="Total SLAs" value={fmt(slas.length)} note="enforced" />
        <StatCard icon="fa-gauge-high" tone={avg > 95 ? "ok" : "warn"} label="Avg compliance" value={slas.length ? `${avg.toFixed(1)}%` : "—"} note="mean across SLAs" />
        <StatCard icon="fa-triangle-exclamation" tone="crit" label="Breaches" value={fmt(breaches)} note="this window" />
        <StatCard icon="fa-arrow-trend-down" tone="warn" label="At risk" value={fmt(atRisk)} note="compliance 95% or below" />
        <StatCard icon="fa-arrows-up-down" tone="muted" label="Best / worst" value={best ? `${best.compliance}%` : "—"} note={best && worst ? `${best.name} · worst ${worst.name} ${worst.compliance}%` : "no SLAs"} />
      </div>

      <div className="ld-split">
        <section className="ld-card ld-panel" aria-labelledby="sla-h">
          <div className="ld-panel-head">
            <h2 id="sla-h">SLA Inventory</h2>
            <span className="ld-muted ld-small">{slas.length} definitions</span>
          </div>
          {slas.length ? (
            <div className="ld-table-wrap">
              <table className="ld-table">
                <thead>
                  <tr>
                    <th scope="col">SLA</th>
                    <th scope="col">Target</th>
                    <th scope="col">Window</th>
                    <th scope="col">Compliance · 30d</th>
                    <th scope="col">Breaches</th>
                    <th scope="col">State</th>
                  </tr>
                </thead>
                <tbody>
                  {slas.map((s) => (
                    <tr key={s.id}>
                      <td><span className="ld-strong">{s.name}</span><div className="ld-sub ld-mono">{s.id}</div></td>
                      <td className="ld-mono">{s.target}</td>
                      <td className="ld-muted">{s.window}</td>
                      <td>
                        <div className="ld-admin-meter">
                          <span className="ld-bar-track"><span className="ld-bar-fill" style={{ width: `${s.compliance}%`, background: complianceColor(s.compliance) }} /></span>
                          <span className={complianceText(s.compliance)}>{s.compliance}%</span>
                        </div>
                      </td>
                      <td>{s.breach > 0 ? <Pill tone="crit">{s.breach}</Pill> : <span className="ld-muted ld-mono">0</span>}</td>
                      <td><Pill tone="ok"><span className="ld-pill-dot" />Enforced</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>No SLA definitions yet.</Empty>
          )}
        </section>

        <div className="ld-rail">
          <Panel title="Breaches by SLA">
            {causes.length ? (
              <ul className="ld-activity">
                {causes.map((s) => (
                  <li key={s.id}>
                    <span className="ld-activity-text">{s.name}</span>
                    <span className={s.breach > 2 ? "ld-text-crit" : s.breach > 0 ? "ld-text-warn" : "ld-text-ok"}>
                      {s.breach} {s.breach === 1 ? "breach" : "breaches"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No SLAs loaded.</Empty>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

