// Alerts screen — ServiceNow form-style
// Ported from screens/alerts.jsx.
import React from "react";
import { Kpi, FormSection, Field } from "@/components/primitives";

interface AlertCondition {
  name: string;
  type: string;
  target: string;
  window: string;
  priority: string;
  state: string;
  since: string;
  policy: string;
}

export default function AlertsScreen() {
  const [tab, setTab] = React.useState("all");
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const toggle = (id: string) => setCollapsed(c => ({ ...c, [id]: !c[id] }));

  const conditions: AlertCondition[] = [
    { name: "Apdex below 0.7 · checkout-api", type: "NRQL", target: "< 0.7", window: "5m", priority: "critical", state: "triggered", since: "12m", policy: "Checkout SLOs" },
    { name: "Error rate > 1% · checkout-api", type: "NRQL", target: "> 1%", window: "5m", priority: "critical", state: "triggered", since: "12m", policy: "Checkout SLOs" },
    { name: "Stripe external errors > 5%", type: "NRQL", target: "> 5%", window: "5m", priority: "critical", state: "triggered", since: "10m", policy: "Payments deps" },
    { name: "DB connection pool > 90%", type: "Metric", target: "> 0.9", window: "2m", priority: "warning", state: "warning", since: "8m", policy: "Infra capacity" },
    { name: "Synthetic: checkout flow", type: "Synth", target: "any fail", window: "1m", priority: "critical", state: "triggered", since: "4m", policy: "Synthetics" },
    { name: "Heap usage > 85% · payments-svc", type: "Metric", target: "> 0.85", window: "2m", priority: "warning", state: "ok", since: "—", policy: "JVM health" },
    { name: "Log: timeout pattern surge", type: "Log", target: "> 100/min", window: "5m", priority: "critical", state: "triggered", since: "10m", policy: "Log alerts" },
    { name: "p95 > 1s · payments-svc", type: "NRQL", target: "> 1000ms", window: "5m", priority: "warning", state: "warning", since: "14m", policy: "Latency SLOs" },
    { name: "Pod CrashLoopBackOff", type: "Infra", target: "> 5/10m", window: "10m", priority: "critical", state: "ok", since: "—", policy: "K8s health" },
    { name: "Disk usage > 90%", type: "Metric", target: "> 0.9", window: "5m", priority: "warning", state: "ok", since: "—", policy: "Infra capacity" },
  ];
  const filtered = tab === "all" ? conditions : tab === "triggered" ? conditions.filter(c => c.state === "triggered") : tab === "warning" ? conditions.filter(c => c.state === "warning") : conditions.filter(c => c.state === "ok");

  return (
    <div className="page page-fade sn-dash">
      <div className="sn-breadcrumb">
        <a className="sn-link">Home</a><span className="sn-bc-sep">›</span>
        <a className="sn-link">Observe</a><span className="sn-bc-sep">›</span>
        <span>Alert Conditions</span>
      </div>

      <div className="sn-form-header">
        <div className="sn-form-title-row">
          <span className="sn-rec-number">ALERTS</span>
          <span className="sn-pill prio-1"><i className="fa-solid fa-circle" /> {conditions.filter(c => c.state === "triggered").length} Triggered</span>
          <span className="sn-pill state-progress"><i className="fa-solid fa-spinner fa-spin" /> {conditions.filter(c => c.state === "warning").length} Warning</span>
          <span className="sn-pill state-neutral">{conditions.length} total</span>
        </div>
        <div className="sn-form-title-meta">
          <div>
            <h1>Alert Conditions</h1>
            <div className="sn-form-sub">Evaluated every 10–60s · 5 destinations configured</div>
          </div>
          <div className="sn-form-actions">
            <button className="sn-btn"><i className="fa-solid fa-clock-rotate-left" /> History</button>
            <button className="sn-btn"><i className="fa-solid fa-volume-xmark" /> Muted</button>
            <button className="sn-btn primary"><i className="fa-solid fa-plus" /> New Condition</button>
          </div>
        </div>
      </div>

      <div className="sn-kpi-strip">
        <Kpi l="Total" v={conditions.length} s="all conditions" tone="neutral" />
        <Kpi l="Triggered" v={conditions.filter(c => c.state === "triggered").length} s="needs response" tone="crit" />
        <Kpi l="Warning" v={conditions.filter(c => c.state === "warning").length} s="at risk" tone="warn" />
        <Kpi l="Healthy" v={conditions.filter(c => c.state === "ok").length} s="meeting SLO" tone="ok" />
        <Kpi l="Policies" v="6" s="grouped" tone="neutral" />
        <Kpi l="Destinations" v="5" s="Slack · PD · email" tone="neutral" />
      </div>

      <div className="sn-form-layout">
        <div className="sn-form-main">
          <div className="sn-activity-section">
            <div className="sn-activity-tabs">
              {[["all","All"],["triggered","Triggered"],["warning","Warning"],["ok","Healthy"]].map(([id,l]) => (
                <button key={id} className={`sn-act-tab${tab===id?" active":""}`} onClick={() => setTab(id)}>{l}</button>
              ))}
            </div>
            <table className="sn-list-table">
              <thead>
                <tr>
                  <th>Condition</th><th style={{width:80}}>Type</th><th style={{width:120}}>Threshold</th>
                  <th style={{width:80}}>Window</th><th style={{width:100}}>Priority</th>
                  <th style={{width:140}}>State</th><th style={{width:140}}>Policy</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={i}>
                    <td><b>{c.name}</b></td>
                    <td><span className="sn-state-pill state-neutral"><i className="fa-solid fa-circle" /> {c.type}</span></td>
                    <td className="mono">{c.target}</td>
                    <td className="mono">{c.window}</td>
                    <td><span className={`sn-state-pill ${c.priority === "critical" ? "state-active" : "state-mitigating"}`}><i className="fa-solid fa-circle" /> {c.priority}</span></td>
                    <td>
                      <span className={`sn-state-pill ${c.state === "triggered" ? "state-active" : c.state === "warning" ? "state-mitigating" : "svc-healthy"}`}>
                        <i className="fa-solid fa-circle" /> {c.state} {c.state !== "ok" && c.since}
                      </span>
                    </td>
                    <td className="mono text-mute">{c.policy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <FormSection id="policies" title="Notification Policies" badge="6 policies" collapsed={collapsed.policies} onToggle={toggle}>
            <table className="sn-list-table">
              <thead><tr><th>Policy</th><th style={{width:120}}>Conditions</th><th style={{width:180}}>On-call</th><th>Destination</th></tr></thead>
              <tbody>
                {[
                  ["Checkout SLOs","18","payments-oncall","Slack #checkout-alerts"],
                  ["Payments deps","12","payments-oncall","PagerDuty: payments"],
                  ["JVM health","24","platform-oncall","Slack #platform-alerts"],
                  ["Synthetics","8","sre-oncall","Slack #sre"],
                  ["RUM","14","web-oncall","Email web-team@"],
                  ["Anomaly","42","sre-oncall","Slack #anomalies"],
                ].map((r,i) => (
                  <tr key={i}>
                    <td><b>{r[0]}</b></td>
                    <td className="mono">{r[1]} conditions</td>
                    <td className="mono">{r[2]}</td>
                    <td className="mono">{r[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </FormSection>
        </div>

        <aside className="sn-form-side">
          <div className="sn-side-card">
            <div className="sn-side-head">Destinations</div>
            <div className="sn-side-body">
              {[
                ["fa-brands fa-slack", "Slack", "5 channels"],
                ["fa-solid fa-bell", "PagerDuty", "3 services"],
                ["fa-solid fa-envelope", "Email", "12 lists"],
                ["fa-solid fa-link", "Webhook", "2 URLs"],
              ].map(([ic, name, count], i) => (
                <div key={i} className="sn-related-row">
                  <div><div className="sn-related-title"><i className={ic} style={{ marginRight: 6, width: 14 }} /> {name}</div><div className="sn-related-meta">{count}</div></div>
                  <i className="fa-solid fa-chevron-right text-mute" style={{ fontSize: 11 }} />
                </div>
              ))}
            </div>
          </div>
          <div className="sn-side-card">
            <div className="sn-side-head">Recent Activity</div>
            <div className="sn-side-body">
              {[
                ["Apdex below 0.7","12m ago","critical"],
                ["Stripe ext err","10m ago","critical"],
                ["Heap > 85%","2h ago","resolved"],
              ].map(([t, time, sev], i) => (
                <div key={i} className="sn-related-row">
                  <div><div className="sn-related-title">{t}</div><div className="sn-related-meta">{time}</div></div>
                  <span className={`sn-state-pill ${sev === "resolved" ? "svc-healthy" : "state-active"}`}><i className="fa-solid fa-circle" /> {sev}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
