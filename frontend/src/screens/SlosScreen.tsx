// Service Level Objectives — error-budget tracking (the Datadog / SRE SLO view).
// Distinct from the ITSM "SLA definitions" screen: this is observability-driven,
// with burn-down, remaining budget and burn-rate alerting per objective.
// No SLO backend is connected yet, so the objectives are a labelled sample and
// every figure (budget, burn-down, exhaustion estimate) is computed from them.
import React from "react";
import "@/styles/observe.css";
import { useNav } from "@/hooks/useNav";
import { Panel, Pill, StatCard, fmt } from "@/components/ld";
import type { Tone } from "@/components/ld";
import { TimeChart } from "@/components/MetricCharts";
import type { MetricSeries } from "@/api/hooks";

interface Slo {
  id: string;
  name: string;
  service: string;
  type: "Availability" | "Latency" | "Error rate" | "Freshness";
  target: number;      // e.g. 99.9
  actual: number;      // measured SLI over the window
  window: string;
  burnRate: number;    // multiples of budget consumption
}

const SLOS: Slo[] = [
  { id: "SLO-01", name: "Order API availability", service: "oms-gateway", type: "Availability", target: 99.9, actual: 99.94, window: "30d", burnRate: 0.6 },
  { id: "SLO-02", name: "Order round-trip latency p99 < 250µs", service: "oms-core", type: "Latency", target: 99.0, actual: 98.20, window: "30d", burnRate: 2.4 },
  { id: "SLO-03", name: "Market-data freshness < 50ms", service: "feed-handler", type: "Freshness", target: 99.5, actual: 99.71, window: "30d", burnRate: 0.4 },
  { id: "SLO-04", name: "Checkout error rate < 1%", service: "payments", type: "Error rate", target: 99.0, actual: 97.80, window: "30d", burnRate: 4.1 },
  { id: "SLO-05", name: "Login flow availability", service: "auth", type: "Availability", target: 99.95, actual: 99.97, window: "30d", burnRate: 0.3 },
];

// Error budget remaining as a % of the total allowed budget. actual >= target
// ⇒ 100% (under budget); each point below target eats a share of `allowed`.
function budget(s: Slo) {
  const allowed = 100 - s.target;              // e.g. 0.1%
  const remaining = Math.min(1, Math.max(0, (s.actual - s.target) / allowed + 1));
  return { allowed, remainingPct: Math.round(remaining * 100) };
}

const healthTone = (s: Slo): Tone => (s.actual >= s.target ? "ok" : s.burnRate >= 4 ? "crit" : "warn");
const burnTone = (r: number): Tone => (r >= 4 ? "crit" : r >= 2 ? "warn" : "ok");
const budgetColor = (s: Slo, pct: number) => (s.actual >= s.target ? "#16a34a" : pct > 0 ? "#f5a524" : "#e5383b");

const POLICY: [string, string, Tone][] = [
  ["Fast burn", "> 14.4× over 1h → page", "crit"],
  ["Slow burn", "> 3× over 6h → ticket", "warn"],
  ["Budget < 10%", "notify service owner", "info"],
];

export default function SlosScreen() {
  const { setRoute } = useNav();
  const [sel, setSel] = React.useState(SLOS[3]);

  const healthy = SLOS.filter((s) => s.actual >= s.target).length;
  const atRisk = SLOS.filter((s) => s.actual < s.target).length;
  const b = budget(sel);

  // Burn-down series: budget remaining over the window (falling when burning),
  // six samples spread across the 30 days ending now.
  const burndown = React.useMemo<MetricSeries[]>(() => {
    const end = Math.floor(Date.now() / 1000);
    const step = 6 * 86400;
    return [{
      key: "budget", label: "Budget remaining", unit: "%", group: "slo",
      points: Array.from({ length: 6 }, (_, i) => [end - (5 - i) * step, Math.max(0, Math.round((100 - i * (sel.burnRate * 3)) * 10) / 10)] as [number, number]),
    }];
  }, [sel]);
  const chartStart = burndown[0].points[0][0];
  const chartEnd = burndown[0].points[burndown[0].points.length - 1][0];
  const fast = sel.burnRate >= 2;

  return (
    <div className="ld-dash">
      <nav className="ld-crumbs" aria-label="Breadcrumb">
        <button type="button" className="ld-link" onClick={() => setRoute("dashboard")}>Home</button>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <span>Service Level Objectives</span>
      </nav>

      <div className="ld-head">
        <div>
          <h1>Service Level Objectives</h1>
          <p>Error-budget tracking across trading &amp; platform services · 30-day window · burn-rate alerting</p>
        </div>
        <div className="ld-head-actions">
          <button type="button" className="ld-btn"><i className="fa-solid fa-download" aria-hidden="true" /> Export</button>
          <button type="button" className="ld-btn ld-btn-primary"><i className="fa-solid fa-plus" aria-hidden="true" /> New SLO</button>
        </div>
      </div>

      <div className="ld-card ld-metrics-off" role="note">
        <i className="fa-solid fa-flask" aria-hidden="true" />
        <div>
          <b>Sample data</b>
          <p className="ld-muted ld-small">SLO tracking is not connected to a metrics source yet. The objectives below are illustrative; budgets and burn-down are computed from them.</p>
        </div>
      </div>

      <div className="ld-grid ld-grid-stats">
        <StatCard icon="fa-bullseye" tone="info" label="Objectives" value={fmt(SLOS.length)} note="tracked" />
        <StatCard icon="fa-circle-check" tone="ok" label="On track" value={fmt(healthy)} note="within budget" />
        <StatCard icon="fa-fire" tone="crit" label="Breaching" value={fmt(atRisk)} note="below target" />
        <StatCard icon="fa-gauge-high" tone="warn" label="Fast burn" value={fmt(SLOS.filter((s) => s.burnRate >= 2).length)} note="≥ 2× burn rate" />
      </div>

      <div className="ld-split ld-split-wide">
        <Panel title="Objectives">
          <div className="ld-table-wrap">
            <table className="ld-table">
              <thead>
                <tr>
                  <th scope="col">Objective</th>
                  <th scope="col">Type</th>
                  <th scope="col">Target</th>
                  <th scope="col">Actual</th>
                  <th scope="col">Error budget</th>
                  <th scope="col">Burn rate</th>
                </tr>
              </thead>
              <tbody>
                {SLOS.map((s) => {
                  const bb = budget(s);
                  return (
                    <tr key={s.id} className={sel.id === s.id ? "ld-row-selected" : undefined}>
                      <td>
                        <button type="button" className="ld-link ld-strong" aria-pressed={sel.id === s.id} onClick={() => setSel(s)}>{s.name}</button>
                        <span className="ld-sub ld-mono">{s.service}</span>
                      </td>
                      <td><Pill tone="muted">{s.type}</Pill></td>
                      <td className="ld-muted">{s.target}%</td>
                      <td className={`ld-text-${healthTone(s)}`}>{s.actual}%</td>
                      <td>
                        <span className="ld-obs-meter">
                          <span className="ld-bar-track" aria-hidden="true"><span className="ld-bar-fill" style={{ width: `${bb.remainingPct}%`, background: budgetColor(s, bb.remainingPct) }} /></span>
                          <span className="ld-small">{bb.remainingPct}%</span>
                        </span>
                      </td>
                      <td>
                        <Pill tone={burnTone(s.burnRate)}>
                          {s.burnRate.toFixed(1)}× {s.burnRate >= 2 && <i className="fa-solid fa-arrow-trend-up" aria-hidden="true" />}
                        </Pill>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="ld-rail">
          <Panel title={sel.name}>
            <span className="ld-muted ld-small ld-mono">{sel.service} · {sel.window} window</span>
            <div className="ld-obs-pair">
              <div><b className={`ld-text-${healthTone(sel)}`}>{sel.actual}%</b>SLI vs {sel.target}% target</div>
              <div><b className={b.remainingPct > 0 ? "ld-text-ok" : "ld-text-crit"}>{b.remainingPct}%</b>budget remaining</div>
            </div>
            <span className="ld-obs-label">Error budget burn-down</span>
            <TimeChart series={burndown} startSec={chartStart} endSec={chartEnd} compact />
            <div className={`ld-obs-callout ld-${fast ? "crit" : "ok"}`}>
              <b><i className={`fa-solid ${fast ? "fa-fire" : "fa-check"}`} aria-hidden="true" /> {fast ? `Fast burn — ${sel.burnRate}× budget` : "Healthy burn rate"}</b>
              <span>
                {fast
                  ? `At this rate the 30-day budget exhausts in ~${Math.max(1, Math.round(30 / sel.burnRate))} days. Page the on-call service owner.`
                  : "Budget consumption is sustainable for the full window."}
              </span>
            </div>
          </Panel>

          <Panel title="Alerting policy">
            <ul className="ld-obs-list">
              {POLICY.map(([k, v, tone]) => (
                <li key={k}>
                  <Pill tone={tone}>{k}</Pill>
                  <span className="ld-muted">{v}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
