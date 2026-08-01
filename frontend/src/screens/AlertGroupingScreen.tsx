// Event intelligence: alert grouping & noise reduction
// Datadog / PagerDuty concept: raw alerts collapsed into incidents, grouping rules, suppression.
// Ported from screens/alert-grouping.jsx.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { Sparkline, FormSection, Field } from "@/components/primitives";

export default function AlertGroupingScreen() {
  const { setRoute } = useNav();
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const toggle = (id: string) => setCollapsed(c => ({ ...c, [id]: !c[id] }));

  const GROUPS = [
    { title: "Stripe connection pool exhaustion", count: 14, svc: "payments-api", strat: "Intelligent", status: "open", age: "6m", spark: [2,3,5,8,11,13,14] },
    { title: "k8s node memory pressure — pool-3", count: 9, svc: "platform", strat: "Content", status: "open", age: "18m", spark: [1,2,2,4,6,7,9] },
    { title: "Elevated p99 latency · checkout flow", count: 6, svc: "web-frontend", strat: "Time", status: "ack", age: "31m", spark: [1,1,3,4,5,6,6] },
    { title: "TLS cert expiry warnings (batch)", count: 23, svc: "edge-proxy", strat: "Content", status: "suppressed", age: "2h", spark: [4,8,12,16,19,22,23] },
    { title: "Disk usage > 80% · db-replica-02", count: 4, svc: "database", strat: "Intelligent", status: "open", age: "44m", spark: [1,1,2,2,3,3,4] },
  ];
  const stratMeta: Record<string, { color: string; ic: string }> = { Intelligent: { color: "#7c3aed", ic: "fa-wand-magic-sparkles" }, Content: { color: "#2563eb", ic: "fa-align-left" }, Time: { color: "#0891b2", ic: "fa-clock" } };
  const statusMeta: Record<string, { cls: string; ic: string; label: string }> = {
    open: { cls: "state-active", ic: "fa-fire", label: "Open" },
    ack: { cls: "state-progress", ic: "fa-user-check", label: "Acknowledged" },
    suppressed: { cls: "state-neutral", ic: "fa-bell-slash", label: "Suppressed" },
  };

  const RULES = [
    { name: "Collapse by service + alert name", strat: "Content", window: "5 min", on: true, matched: "1,204 / 24h" },
    { name: "Intelligent correlation (ML)", strat: "Intelligent", window: "rolling", on: true, matched: "842 / 24h" },
    { name: "Flapping detector — auto-resolve", strat: "Time", window: "10 min", on: true, matched: "318 / 24h" },
    { name: "Deploy-window mute · production", strat: "Time", window: "during deploys", on: false, matched: "0 / 24h" },
  ];

  const NOISY = [
    { src: "prometheus-alertmanager", n: 1840, pct: 42 },
    { src: "datadog-monitors", n: 1120, pct: 26 },
    { src: "cloudwatch", n: 690, pct: 16 },
    { src: "blackbox-probes", n: 410, pct: 9 },
    { src: "custom-webhooks", n: 320, pct: 7 },
  ];

  return (
    <div className="page page-fade sn-dash">
      <div className="sn-breadcrumb">
        <a className="sn-link">Home</a><span className="sn-bc-sep">›</span>
        <a className="sn-link" onClick={() => setRoute("alerts")}>Observe</a><span className="sn-bc-sep">›</span>
        <span>Alert grouping</span>
      </div>

      <div className="sn-form-header">
        <div className="sn-form-title-row">
          <span className="sn-rec-number">EVENT-INTEL</span>
          <span className="sn-pill svc-healthy"><i className="fa-solid fa-wand-magic-sparkles" /> Intelligent grouping on</span>
          <span className="sn-pill state-neutral"><i className="fa-solid fa-layer-group" /> 4 rules active</span>
          <span className="sn-pill state-progress"><i className="fa-solid fa-arrow-trend-down" /> 91% noise reduced</span>
        </div>
        <div className="sn-form-title-meta">
          <div>
            <h1>Alert Grouping &amp; Noise Reduction</h1>
            <div className="sn-form-sub">4,360 raw alerts collapsed into 42 actionable incidents in the last 24h · ML correlation + rules</div>
          </div>
          <div className="sn-form-actions">
            <button className="sn-btn"><i className="fa-solid fa-flask" /> Simulate</button>
            <button className="sn-btn"><i className="fa-solid fa-clock-rotate-left" /> History</button>
            <button className="sn-btn primary"><i className="fa-solid fa-plus" /> New rule</button>
          </div>
        </div>
      </div>

      <div className="sn-kpi-strip">
        <div className="sn-kpi tone-neutral"><div className="sn-kpi-l">Raw alerts (24h)</div><div className="sn-kpi-row"><div className="sn-kpi-v">4,360</div><div className="sn-kpi-spark"><Sparkline data={[120,180,160,240,300,280,360]} color="#6b7785" w={68} h={28} /></div></div><div className="sn-kpi-s">before grouping</div></div>
        <div className="sn-kpi tone-ok"><div className="sn-kpi-l">After grouping</div><div className="sn-kpi-row"><div className="sn-kpi-v">42</div><div className="sn-kpi-spark"><Sparkline data={[6,5,7,6,8,7,6]} color="#059669" w={68} h={28} /></div></div><div className="sn-kpi-s">actionable</div></div>
        <div className="sn-kpi tone-ok"><div className="sn-kpi-l">Noise reduced</div><div className="sn-kpi-v">91%</div><div className="sn-kpi-s">+4% vs last week</div></div>
        <div className="sn-kpi tone-ok"><div className="sn-kpi-l">Auto-resolved</div><div className="sn-kpi-v">318</div><div className="sn-kpi-s">flapping closed</div></div>
        <div className="sn-kpi tone-warn"><div className="sn-kpi-l">Suppressed</div><div className="sn-kpi-v">23</div><div className="sn-kpi-s">maintenance window</div></div>
        <div className="sn-kpi tone-crit"><div className="sn-kpi-l">Open after dedup</div><div className="sn-kpi-v">11</div><div className="sn-kpi-s">need triage</div></div>
      </div>

      <div className="sn-form-layout">
        <div className="sn-form-main">
          <FormSection id="groups" title="Grouped alerts" badge={`${GROUPS.length} groups · 56 raw`} collapsed={collapsed.groups} onToggle={toggle}>
            <table className="sn-list-table">
              <thead><tr><th>Group</th><th style={{ width: 130 }}>Service</th><th style={{ width: 130 }}>Strategy</th><th style={{ width: 90 }}>Trend</th><th style={{ width: 140 }}>Status</th><th style={{ width: 70 }}>Age</th></tr></thead>
              <tbody>
                {GROUPS.map((g, i) => {
                  const sm = stratMeta[g.strat], st = statusMeta[g.status];
                  return (
                    <tr key={i} onClick={() => setRoute("incident-detail")} style={{ cursor: "pointer" }}>
                      <td>
                        <div className="ag-group-cell">
                          <span className="ag-count">{g.count}</span>
                          <div>
                            <div className="ag-title"><b>{g.title}</b></div>
                            <div className="ag-sub text-mute">{g.count} alerts collapsed → 1 incident</div>
                          </div>
                        </div>
                      </td>
                      <td className="mono text-mute">{g.svc}</td>
                      <td><span className="ag-strat" style={{ color: sm.color, background: sm.color + "16" }}><i className={`fa-solid ${sm.ic}`} /> {g.strat}</span></td>
                      <td><Sparkline data={g.spark} color={sm.color} w={56} h={22} /></td>
                      <td><span className={`sn-state-pill ${st.cls}`}><i className={`fa-solid ${st.ic}`} /> {st.label}</span></td>
                      <td className="mono text-mute">{g.age}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </FormSection>

          <FormSection id="rules" title="Grouping rules" badge={`${RULES.filter(r => r.on).length} of ${RULES.length} active`} collapsed={collapsed.rules} onToggle={toggle}>
            <table className="sn-list-table">
              <thead><tr><th>Rule</th><th style={{ width: 130 }}>Strategy</th><th style={{ width: 130 }}>Window</th><th style={{ width: 130 }}>Matched</th><th style={{ width: 90 }}>Enabled</th></tr></thead>
              <tbody>
                {RULES.map((r, i) => {
                  const sm = stratMeta[r.strat];
                  return (
                    <tr key={i}>
                      <td><b>{r.name}</b></td>
                      <td><span className="ag-strat" style={{ color: sm.color, background: sm.color + "16" }}><i className={`fa-solid ${sm.ic}`} /> {r.strat}</span></td>
                      <td className="mono text-mute">{r.window}</td>
                      <td className="mono text-mute">{r.matched}</td>
                      <td><span className={`ag-switch${r.on ? " on" : ""}`}><span className="ag-knob" /></span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </FormSection>
        </div>

        <aside className="sn-form-side">
          <div className="sn-side-card">
            <div className="sn-side-head">Noise reduction</div>
            <div className="sn-side-body" style={{ textAlign: "center", padding: "18px 14px" }}>
              <div className="ag-bigpct">91%</div>
              <div className="text-mute" style={{ fontSize: 12, marginBottom: 12 }}>of raw alerts auto-handled</div>
              <div className="ag-bar"><div className="ag-bar-fill" style={{ width: "91%" }} /></div>
              <div className="ag-legend">
                <span><b>4,360</b> raw</span>
                <span><b>42</b> shown</span>
              </div>
            </div>
          </div>

          <div className="sn-side-card">
            <div className="sn-side-head">Top noisy sources</div>
            <div className="sn-side-body" style={{ padding: "6px 14px 12px" }}>
              {NOISY.map(n => (
                <div key={n.src} className="ag-noisy-row">
                  <div className="ag-noisy-head"><span className="mono">{n.src}</span><span className="text-mute">{n.n.toLocaleString()}</span></div>
                  <div className="ag-noisy-bar"><div className="ag-noisy-fill" style={{ width: n.pct + "%" }} /></div>
                </div>
              ))}
            </div>
          </div>

          <div className="sn-side-card">
            <div className="sn-side-head">Intelligent grouping</div>
            <div className="sn-side-body">
              <Field label="Model" value={<span className="mono">correlation-v3</span>} />
              <Field label="Confidence" value={<span className="tone-ok"><b>94.1%</b> precision</span>} />
              <Field label="Trained on" value="180d of incident history" />
              <Field label="Last retrain" value="3 days ago" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
