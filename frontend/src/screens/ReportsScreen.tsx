// Reports & SLA — LinkedEye layouts. ReportsScreen: problem / incident
// summaries derived from the loaded problems and incidents, plus a sample
// list of scheduled reports. SLAScreen: SLA inventory with compliance bars and
// breach summary, all derived from the loaded SLA definitions.
import "@/styles/admin.css";
import { useNav } from "@/hooks/useNav";
import { useIncidents, useProblems, useSlas } from "@/api/hooks";
import { Empty, Panel, Pill, PillDot, StatCard, fmt } from "@/components/ld";
import type { Tone } from "@/components/ld";

import { buttonClass, cx, toneText, ui } from "@/components/ui";
import { sd } from "@/components/RecordList";
import { Icon } from "@/components/Icon";
import { ChevronRightIcon, FileOutputIcon, MailIcon, PlusIcon } from "lucide-react";
const SEV_TONE: Record<number, Tone> = { 1: "crit", 2: "warn", 3: "info", 4: "muted" };
const problemTone = (s: string): Tone => (s === "Resolved" ? "ok" : s === "Known error" ? "purple" : "warn");
const complianceColor = (c: number) => (c > 95 ? "#16a34a" : c > 90 ? "#f5a524" : "#e5383b");

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
    <div className={ui.page}>
      <nav className={ui.crumbs} aria-label="Breadcrumb">
        <button type="button" className={ui.link} onClick={() => setRoute("dashboard")}>Home</button>
        <Icon icon={ChevronRightIcon} />
        <span>Reports &amp; Analytics</span>
      </nav>

      <div className={ui.head}>
        <div>
          <h1 className={ui.h1}>Reports &amp; Analytics</h1>
          <p className={ui.headSub}>Problem and incident trends across the organisation</p>
        </div>
        <div className={ui.headActions}>
          <button type="button" className={buttonClass()}><Icon icon={FileOutputIcon} /> Export</button>
          <button type="button" className={buttonClass("primary")}><Icon icon={PlusIcon} /> New Report</button>
        </div>
      </div>

      <div className={cx(ui.grid, ui.cols.stats)}>
        <StatCard icon="fa-bug" tone="warn" label="Open problems" value={fmt(open)} note={`${fmt(problems.length)} problems in total`} />
        <StatCard icon="fa-book" tone="purple" label="Known errors" value={fmt(known)} note="workaround documented" />
        <StatCard icon="fa-link" tone="info" label="Linked incidents" value={fmt(linked)} note="tied to a problem record" />
        <StatCard icon="fa-ticket" tone="crit" label="Incidents" value={fmt(incidents.length)} note={`${bySev[0].count} Sev 1`} />
      </div>

      <div className={ui.split}>
        <div className={ui.rail}>
          <Panel title="Top Problems by Linked Incidents">
            {top.length ? (
              <div className={ui.tableWrap}>
                <table className={ui.table}>
                  <thead>
                    <tr><th scope="col">Problem</th><th scope="col">Linked</th><th scope="col">Impact</th><th scope="col">State</th></tr>
                  </thead>
                  <tbody>
                    {top.map((p) => (
                      <tr key={p.id}>
                        <td className={ui.cellWrap}><span className="font-medium">{p.title}</span><div className={cx(ui.sub, ui.mono)}>{p.id}</div></td>
                        <td className={sd.cellMono}><b>{p.linked}</b> incidents</td>
                        <td>{p.impact}</td>
                        <td><Pill tone={problemTone(p.status)}><PillDot />{p.status}</Pill></td>
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
              <ul className={ui.bars}>
                {bySev.map(({ n, count }) => (
                  <li key={n} className={ui.barItem}>
                    <span className={ui.barLabel}><Pill tone={SEV_TONE[n]}>Sev {n}</Pill></span>
                    <span className={ui.barTrack}><span className={ui.barFill} style={{ width: `${(count / sevMax) * 100}%`, background: n === 1 ? "#e5383b" : n === 2 ? "#f5a524" : n === 3 ? "#2f6bff" : "#98a2b3" }} /></span>
                    <span className={ui.barValue}>{count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No incidents loaded.</Empty>
            )}
          </Panel>
        </div>

        <div className={ui.rail}>
          <section className={cx(ui.card, ui.panel)} aria-labelledby="rep-sched-h">
            <div className={ui.panelHead}>
              <h2 id="rep-sched-h" className={ui.panelTitle}>Scheduled Reports</h2>
              <Pill tone="muted">Sample data</Pill>
            </div>
            <ul className={ui.activity}>
              {SAMPLE_SCHEDULED.map(([n, w, r]) => (
                <li key={n} className={ui.activityItem}>
                  <Icon icon={MailIcon} className="text-fg-muted" />
                  <span className={ui.activityText}>{n} <span className="text-fg-muted text-xs">· {w} · {r}</span></span>
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
    <div className={ui.page}>
      <nav className={ui.crumbs} aria-label="Breadcrumb">
        <button type="button" className={ui.link} onClick={() => setRoute("dashboard")}>Home</button>
        <Icon icon={ChevronRightIcon} />
        <span>Service Level Management</span>
        <Icon icon={ChevronRightIcon} />
        <span>SLA Definitions</span>
      </nav>

      <div className={ui.head}>
        <div>
          <h1 className={ui.h1}>SLA Definitions</h1>
          <p className={ui.headSub}>{slas.length} SLAs enforced · monthly window · all priorities</p>
        </div>
        <div className={ui.headActions}>
          <button type="button" className={buttonClass()}><Icon icon={FileOutputIcon} /> Export</button>
          <button type="button" className={buttonClass("primary")}><Icon icon={PlusIcon} /> New SLA</button>
        </div>
      </div>

      <div className={cx(ui.grid, ui.cols[5])}>
        <StatCard icon="fa-file-contract" tone="info" label="Total SLAs" value={fmt(slas.length)} note="enforced" />
        <StatCard icon="fa-gauge-high" tone={avg > 95 ? "ok" : "warn"} label="Avg compliance" value={slas.length ? `${avg.toFixed(1)}%` : "—"} note="mean across SLAs" />
        <StatCard icon="fa-triangle-exclamation" tone="crit" label="Breaches" value={fmt(breaches)} note="this window" />
        <StatCard icon="fa-arrow-trend-down" tone="warn" label="At risk" value={fmt(atRisk)} note="compliance 95% or below" />
        <StatCard icon="fa-arrows-up-down" tone="muted" label="Best / worst" value={best ? `${best.compliance}%` : "—"} note={best && worst ? `${best.name} · worst ${worst.name} ${worst.compliance}%` : "no SLAs"} />
      </div>

      <div className={ui.split}>
        <section className={cx(ui.card, ui.panel)} aria-labelledby="sla-h">
          <div className={ui.panelHead}>
            <h2 id="sla-h" className={ui.panelTitle}>SLA Inventory</h2>
            <span className="text-fg-muted text-xs">{slas.length} definitions</span>
          </div>
          {slas.length ? (
            <div className={ui.tableWrap}>
              <table className={ui.table}>
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
                      <td><span className="font-medium">{s.name}</span><div className={cx(ui.sub, ui.mono)}>{s.id}</div></td>
                      <td className={sd.cellMono}>{s.target}</td>
                      <td>{s.window}</td>
                      <td>
                        <div className="flex items-center gap-2 min-w-[150px]">
                          <span className="flex-[1_1_60px] h-2 rounded-[5px] bg-bg-muted overflow-hidden"><span className="block h-2 rounded-[5px]" style={{ width: `${s.compliance}%`, background: complianceColor(s.compliance) }} /></span>
                          {/* the meter's value style outranked the ld-text-* colour: only the weight shows */}
                          <span className="font-mono text-xs font-semibold text-fg whitespace-nowrap [font-feature-settings:'cv02','cv03','cv04','cv11','ss01']">{s.compliance}%</span>
                        </div>
                      </td>
                      <td>{s.breach > 0 ? <Pill tone="crit">{s.breach}</Pill> : <span className={cx("text-fg-muted", ui.mono)}>0</span>}</td>
                      <td><Pill tone="ok"><PillDot />Enforced</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>No SLA definitions yet.</Empty>
          )}
        </section>

        <div className={ui.rail}>
          <Panel title="Breaches by SLA">
            {causes.length ? (
              <ul className={ui.activity}>
                {causes.map((s) => (
                  <li key={s.id} className={ui.activityItem}>
                    <span className={ui.activityText}>{s.name}</span>
                    <span className={s.breach > 2 ? toneText.crit : s.breach > 0 ? toneText.warn : toneText.ok}>
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

