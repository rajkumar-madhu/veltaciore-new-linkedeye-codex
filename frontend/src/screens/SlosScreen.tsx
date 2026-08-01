// Service Level Objectives — error-budget tracking (the Datadog / SRE SLO view).
// Distinct from the ITSM "SLA definitions" screen: this is observability-driven,
// with burn-down, remaining budget and burn-rate alerting per objective.
import React from "react";
import { Kpi, FormSection } from "@/components/primitives";
import { LineChart } from "@/components/deviceDetail";

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

const healthColor = (s: Slo) => (s.actual >= s.target ? "#059669" : s.burnRate >= 4 ? "#dc2626" : "#b45309");

export default function SlosScreen() {
  const [sel, setSel] = React.useState(SLOS[3]);
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const toggle = (id: string) => setCollapsed((c) => ({ ...c, [id]: !c[id] }));

  const healthy = SLOS.filter((s) => s.actual >= s.target).length;
  const atRisk = SLOS.filter((s) => s.actual < s.target).length;
  const b = budget(sel);
  // Burn-down series: budget remaining over the window (falling when burning).
  const burndown = Array.from({ length: 6 }, (_, i) => Math.round((100 - i * (sel.burnRate * 3)) * 10) / 10).map((v) => Math.max(0, v));

  return (
    <div className="page page-fade sn-dash">
      <div className="sn-breadcrumb">
        <a className="sn-link">Home</a><span className="sn-bc-sep">›</span>
        <a className="sn-link">Observe</a><span className="sn-bc-sep">›</span>
        <span>Service Level Objectives</span>
      </div>

      <div className="sn-form-header">
        <div className="sn-form-title-row">
          <span className="sn-rec-number">SLOs</span>
          <span className="sn-pill svc-healthy"><i className="fa-solid fa-circle-check" /> {healthy} on track</span>
          {atRisk > 0 && <span className="sn-pill prio-1"><i className="fa-solid fa-fire" /> {atRisk} breaching budget</span>}
          <span className="sn-pill state-neutral"><i className="fa-solid fa-calendar" /> 30-day window</span>
        </div>
        <div className="sn-form-title-meta">
          <div>
            <h1>Service Level Objectives</h1>
            <div className="sn-form-sub">Error-budget tracking across trading & platform services · burn-rate alerting enabled</div>
          </div>
          <div className="sn-form-actions">
            <button className="sn-btn"><i className="fa-solid fa-download" /> Export</button>
            <button className="sn-btn primary"><i className="fa-solid fa-plus" /> New SLO</button>
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 24px 0" }}>
        <div className="sn-kpi-strip">
          <Kpi l="Objectives" v={SLOS.length} s="tracked" tone="neutral" />
          <Kpi l="On track" v={healthy} s="within budget" tone="ok" />
          <Kpi l="Breaching" v={atRisk} s="budget exhausted" tone="crit" />
          <Kpi l="Fast burn alerts" v={SLOS.filter((s) => s.burnRate >= 2).length} s="≥2× burn rate" tone="warn" />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 16, padding: "16px 24px 24px" }}>
        {/* SLO list */}
        <div className="card" style={{ background: "white", border: "1px solid #e5e8eb", borderRadius: 6, overflow: "hidden", alignSelf: "start" }}>
          <table className="sn-list-table" style={{ fontSize: 12.5 }}>
            <thead>
              <tr>
                <th>OBJECTIVE</th>
                <th style={{ width: 96 }}>TYPE</th>
                <th style={{ width: 74 }}>TARGET</th>
                <th style={{ width: 74 }}>ACTUAL</th>
                <th style={{ width: 150 }}>ERROR BUDGET</th>
                <th style={{ width: 90 }}>BURN RATE</th>
              </tr>
            </thead>
            <tbody>
              {SLOS.map((s) => {
                const bb = budget(s);
                const ok = s.actual >= s.target;
                return (
                  <tr key={s.id} onClick={() => setSel(s)} style={{ cursor: "pointer", background: sel.id === s.id ? "#eff6ff" : !ok ? "#fef2f2" : undefined }}>
                    <td>
                      <div style={{ fontWeight: 600, color: "#0f1c3f" }}>{s.name}</div>
                      <div className="mono" style={{ fontSize: 11, color: "#8a94a3" }}>{s.service}</div>
                    </td>
                    <td><span style={{ fontSize: 11, fontWeight: 600, color: "#475467", background: "#f3f4f6", padding: "2px 7px", borderRadius: 4 }}>{s.type}</span></td>
                    <td className="mono" style={{ color: "#475467" }}>{s.target}%</td>
                    <td className="mono" style={{ fontWeight: 700, color: healthColor(s) }}>{s.actual}%</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <div style={{ flex: 1, height: 8, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ width: `${bb.remainingPct}%`, height: "100%", background: ok ? "#10b981" : bb.remainingPct > 0 ? "#f59e0b" : "#dc2626", borderRadius: 4 }} />
                        </div>
                        <span className="mono" style={{ fontSize: 11, color: "#475467", minWidth: 30 }}>{bb.remainingPct}%</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, fontWeight: 700, color: s.burnRate >= 4 ? "#dc2626" : s.burnRate >= 2 ? "#b45309" : "#059669" }}>
                        {s.burnRate.toFixed(1)}× {s.burnRate >= 2 && <i className="fa-solid fa-arrow-trend-up" style={{ fontSize: 10 }} />}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Detail rail — burn-down + budget for the selected SLO */}
        <aside style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="card" style={{ background: "white", border: "1px solid #e5e8eb", borderRadius: 6, padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#0f1c3f" }}>{sel.name}</div>
            <div className="mono" style={{ fontSize: 11, color: "#8a94a3", marginBottom: 14 }}>{sel.service} · {sel.window} window</div>

            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1, textAlign: "center", padding: "10px 6px", background: "#f8fafc", borderRadius: 6 }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: healthColor(sel) }}>{sel.actual}%</div>
                <div style={{ fontSize: 10.5, color: "#8a94a3" }}>SLI vs {sel.target}% target</div>
              </div>
              <div style={{ flex: 1, textAlign: "center", padding: "10px 6px", background: "#f8fafc", borderRadius: 6 }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: b.remainingPct > 0 ? "#059669" : "#dc2626" }}>{b.remainingPct}%</div>
                <div style={{ fontSize: 10.5, color: "#8a94a3" }}>budget remaining</div>
              </div>
            </div>

            <div style={{ fontSize: 11.5, fontWeight: 700, color: "#475467", marginBottom: 8 }}>Error budget burn-down</div>
            <LineChart series={[burndown]} colors={[b.remainingPct > 0 ? "#2563eb" : "#dc2626"]} h={110} yTicks={["100%", "50%", "0"]} />

            <div style={{ marginTop: 14, padding: 12, borderRadius: 6, background: sel.burnRate >= 2 ? "#fef2f2" : "#ecfdf5", border: `1px solid ${sel.burnRate >= 2 ? "#fecaca" : "#a7f3d0"}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 700, color: sel.burnRate >= 2 ? "#b91c1c" : "#047857" }}>
                <i className={`fa-solid ${sel.burnRate >= 2 ? "fa-fire" : "fa-check"}`} />
                {sel.burnRate >= 2 ? `Fast burn — ${sel.burnRate}× budget` : "Healthy burn rate"}
              </div>
              <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 4 }}>
                {sel.burnRate >= 2
                  ? `At this rate the 30-day budget exhausts in ~${Math.max(1, Math.round(30 / sel.burnRate))} days. Page the on-call service owner.`
                  : "Budget consumption is sustainable for the full window."}
              </div>
            </div>
          </div>

          <FormSection id="policy" title="Alerting policy" collapsed={collapsed.policy} onToggle={toggle}>
            <div style={{ padding: 14, fontSize: 12 }}>
              {[
                ["Fast burn", "> 14.4× over 1h → page", "#dc2626"],
                ["Slow burn", "> 3× over 6h → ticket", "#b45309"],
                ["Budget < 10%", "notify service owner", "#2563eb"],
              ].map(([k, v, c]) => (
                <div key={k as string} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: c as string }} />
                  <b style={{ color: "#0f1c3f", minWidth: 92 }}>{k}</b>
                  <span style={{ color: "#64748b" }}>{v}</span>
                </div>
              ))}
            </div>
          </FormSection>
        </aside>
      </div>
    </div>
  );
}
