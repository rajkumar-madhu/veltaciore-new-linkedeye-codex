// Public status page editor + stakeholder communications
// PagerDuty / Statuspage.io concept: components, posted updates, subscribers, scheduled maintenance.
// Ported from screens/status-page.jsx.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { FormSection, Field } from "@/components/primitives";

export default function StatusPageScreen() {
  const { setRoute } = useNav();
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const toggle = (id: string) => setCollapsed(c => ({ ...c, [id]: !c[id] }));
  const [phase, setPhase] = React.useState("identified");
  const [channels, setChannels] = React.useState<Record<string, boolean>>({ email: true, sms: true, slack: true, webhook: false });
  const tgl = (k: string) => setChannels(c => ({ ...c, [k]: !c[k] }));

  const COMPONENTS = [
    { name: "API Gateway",        group: "Core", status: "degraded",  uptime: "99.94%" },
    { name: "Web Dashboard",      group: "Core", status: "operational", uptime: "99.99%" },
    { name: "Payments Service",   group: "Core", status: "partial",   uptime: "99.81%" },
    { name: "Webhooks & Events",  group: "Platform", status: "operational", uptime: "99.97%" },
    { name: "Mobile API",         group: "Platform", status: "operational", uptime: "99.98%" },
    { name: "Data Pipeline",      group: "Platform", status: "operational", uptime: "99.95%" },
  ];
  const statusMeta: Record<string, { cls: string; ic: string; label: string; color: string }> = {
    operational: { cls: "svc-healthy", ic: "fa-circle-check", label: "Operational", color: "#059669" },
    degraded:    { cls: "svc-degraded", ic: "fa-triangle-exclamation", label: "Degraded", color: "#ea580c" },
    partial:     { cls: "svc-degraded", ic: "fa-circle-exclamation", label: "Partial outage", color: "#d97706" },
    major:       { cls: "svc-down", ic: "fa-circle-xmark", label: "Major outage", color: "#dc2626" },
  };

  const UPDATES = [
    { phase: "identified", t: "14:38", ago: "6m ago", by: "Priya Raghunathan", title: "Root cause identified — Stripe connection pool exhaustion",
      body: "We've identified elevated error rates on the Payments Service caused by connection pool saturation. A fix is being rolled out now.", ch: ["email", "sms", "slack"] },
    { phase: "investigating", t: "14:21", ago: "23m ago", by: "Monitoring System", title: "Investigating elevated payment error rates",
      body: "We are investigating reports of failed payment attempts. Some customers may see errors at checkout. Updates to follow.", ch: ["email", "slack"] },
    { phase: "monitoring", t: "11:02", ago: "Today", by: "Marcus Okafor", title: "Mobile API latency resolved — monitoring",
      body: "Latency on the Mobile API has returned to normal. We are monitoring to confirm full recovery.", ch: ["email"] },
  ];
  const phaseMeta: Record<string, { color: string; bg: string; label: string }> = {
    investigating: { color: "#ea580c", bg: "rgba(234,88,12,.12)", label: "Investigating" },
    identified:    { color: "#d97706", bg: "rgba(217,119,6,.12)", label: "Identified" },
    monitoring:    { color: "#2563eb", bg: "rgba(37,99,235,.12)", label: "Monitoring" },
    resolved:      { color: "#059669", bg: "rgba(5,150,105,.12)", label: "Resolved" },
  };

  return (
    <div className="page page-fade sn-dash">
      <div className="sn-breadcrumb">
        <a className="sn-link">Home</a><span className="sn-bc-sep">›</span>
        <a className="sn-link" onClick={() => setRoute("dashboard")}>Operate</a><span className="sn-bc-sep">›</span>
        <span>Status page</span>
      </div>

      <div className="sn-form-header">
        <div className="sn-form-title-row">
          <span className="sn-rec-number">STATUS</span>
          <span className="sn-pill svc-degraded"><i className="fa-solid fa-triangle-exclamation" /> Degraded</span>
          <span className="sn-pill state-neutral"><i className="fa-solid fa-globe" /> Public · live</span>
          <span className="sn-pill state-progress"><i className="fa-solid fa-spinner fa-spin" /> 1 active incident</span>
        </div>
        <div className="sn-form-title-meta">
          <div>
            <h1>Status Page &amp; Stakeholder Comms</h1>
            <div className="sn-form-sub">status.linkedeye.in · auto-publishes to email, SMS, Slack &amp; webhooks · 1,566 subscribers</div>
          </div>
          <div className="sn-form-actions">
            <button className="sn-btn"><i className="fa-solid fa-arrow-up-right-from-square" /> Preview public page</button>
            <button className="sn-btn"><i className="fa-solid fa-users" /> Subscribers</button>
            <button className="sn-btn primary"><i className="fa-solid fa-bullhorn" /> Post update</button>
          </div>
        </div>
      </div>

      <div className="sn-kpi-strip">
        <div className="sn-kpi tone-warn"><div className="sn-kpi-l">Overall status</div><div className="sn-kpi-v" style={{ fontSize: 19 }}>Degraded</div><div className="sn-kpi-s">2 components affected</div></div>
        <div className="sn-kpi tone-crit"><div className="sn-kpi-l">On the page</div><div className="sn-kpi-v">1</div><div className="sn-kpi-s">active incident</div></div>
        <div className="sn-kpi tone-neutral"><div className="sn-kpi-l">Subscribers</div><div className="sn-kpi-v">1,566</div><div className="sn-kpi-s">across 4 channels</div></div>
        <div className="sn-kpi tone-ok"><div className="sn-kpi-l">Uptime (90d)</div><div className="sn-kpi-v">99.95%</div><div className="sn-kpi-s">SLA 99.9%</div></div>
        <div className="sn-kpi tone-neutral"><div className="sn-kpi-l">Maintenance</div><div className="sn-kpi-v">1</div><div className="sn-kpi-s">scheduled</div></div>
        <div className="sn-kpi tone-ok"><div className="sn-kpi-l">Last update</div><div className="sn-kpi-v" style={{ fontSize: 19 }}>6m</div><div className="sn-kpi-s">ago · Identified</div></div>
      </div>

      <div className="sn-form-layout">
        <div className="sn-form-main">

          {/* Compose update */}
          <FormSection id="compose" title="Compose stakeholder update" collapsed={collapsed.compose} onToggle={toggle}>
            <div style={{ padding: 14 }}>
              <div className="sp-phase-row">
                {Object.entries(phaseMeta).map(([k, m]) => (
                  <button key={k} className={`sp-phase-chip${phase === k ? " on" : ""}`}
                    style={phase === k ? { color: m.color, borderColor: m.color, background: m.bg } : {}}
                    onClick={() => setPhase(k)}>{m.label}</button>
                ))}
              </div>
              <textarea className="select" rows={3} placeholder="What should stakeholders know? Keep it clear and blameless…"
                defaultValue="We've identified the root cause and are rolling out a fix. Next update in 30 minutes." style={{ width: "100%", marginTop: 12, resize: "vertical" }} />
              <div className="sp-affected">
                <span className="sp-affected-lbl">Affected components</span>
                <span className="sp-chip on">API Gateway</span>
                <span className="sp-chip on">Payments Service</span>
                <span className="sp-chip">Web Dashboard</span>
                <span className="sp-chip">Webhooks &amp; Events</span>
              </div>
              <div className="sp-compose-foot">
                <div className="sp-channels">
                  {[["email", "fa-envelope", "Email"], ["sms", "fa-comment-sms", "SMS"], ["slack", "fa-slack fa-brands", "Slack"], ["webhook", "fa-bolt", "Webhook"]].map(([k, ic, lbl]) => (
                    <button key={k} className={`sp-ch-toggle${channels[k] ? " on" : ""}`} onClick={() => tgl(k)}>
                      <i className={`${ic.includes("brands") ? "fa-brands " + ic.split(" ")[0] : "fa-solid " + ic}`} /> {lbl}
                    </button>
                  ))}
                </div>
                <button className="sn-btn primary"><i className="fa-solid fa-paper-plane" /> Publish update</button>
              </div>
            </div>
          </FormSection>

          {/* Components */}
          <FormSection id="components" title="Public components" badge={`${COMPONENTS.length} components`} collapsed={collapsed.components} onToggle={toggle}>
            <table className="sn-list-table">
              <thead><tr><th>Component</th><th style={{ width: 110 }}>Group</th><th style={{ width: 170 }}>Status</th><th style={{ width: 120 }}>Uptime (90d)</th><th style={{ width: 90 }} /></tr></thead>
              <tbody>
                {COMPONENTS.map(c => {
                  const m = statusMeta[c.status];
                  return (
                    <tr key={c.name}>
                      <td><div className="row row-8"><span className="sn-status-dot" style={{ background: m.color }} /><span className="mono"><b>{c.name}</b></span></div></td>
                      <td className="text-mute">{c.group}</td>
                      <td><span className={`sn-state-pill ${m.cls}`}><i className={`fa-solid ${m.ic}`} /> {m.label}</span></td>
                      <td className="mono text-mute">{c.uptime}</td>
                      <td><button className="sn-btn" style={{ padding: "2px 8px", fontSize: 11 }}>Set status</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </FormSection>

          {/* Update history */}
          <FormSection id="updates" title="Posted updates" badge={`${UPDATES.length} this incident`} collapsed={collapsed.updates} onToggle={toggle}>
            <div className="sp-timeline">
              {UPDATES.map((u, i) => {
                const m = phaseMeta[u.phase];
                return (
                  <div key={i} className="sp-tl-item">
                    <div className="sp-tl-rail"><span className="sp-tl-dot" style={{ background: m.color }} />{i < UPDATES.length - 1 && <span className="sp-tl-line" />}</div>
                    <div className="sp-tl-body">
                      <div className="sp-tl-head">
                        <span className="sp-phase-badge" style={{ color: m.color, background: m.bg }}>{m.label}</span>
                        <span className="sp-tl-time mono">{u.t}</span>
                        <span className="text-mute" style={{ fontSize: 11.5 }}>· {u.ago} · {u.by}</span>
                      </div>
                      <div className="sp-tl-title">{u.title}</div>
                      <div className="sp-tl-text">{u.body}</div>
                      <div className="sp-tl-channels">
                        {u.ch.map(ch => <span key={ch} className="sp-sent"><i className={`fa-solid ${ch === "email" ? "fa-envelope" : ch === "sms" ? "fa-comment-sms" : "fa-slack fa-brands"}`} /> sent</span>)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </FormSection>
        </div>

        <aside className="sn-form-side">
          <div className="sn-side-card">
            <div className="sn-side-head">Public page</div>
            <div className="sn-side-body">
              <Field label="URL" value={<a className="sn-link mono">status.linkedeye.in</a>} />
              <Field label="Visibility" value={<span className="sn-state-pill svc-healthy"><i className="fa-solid fa-globe" /> Public</span>} />
              <Field label="Theme" value="Argus-LinkedEye · dark header" />
              <Field label="Custom domain" value={<span className="tone-ok">verified · SSL</span>} />
            </div>
          </div>

          <div className="sn-side-card">
            <div className="sn-side-head">Subscribers <span className="sn-side-count">1,566</span></div>
            <div className="sn-side-body">
              <Field label="Email" value={<span><b>1,228</b> confirmed</span>} />
              <Field label="SMS" value={<span><b>318</b> verified</span>} />
              <Field label="Slack" value={<span><b>12</b> workspaces</span>} />
              <Field label="Webhook" value={<span><b>8</b> endpoints</span>} />
            </div>
          </div>

          <div className="sn-side-card">
            <div className="sn-side-head">Scheduled maintenance</div>
            <div className="sn-side-body">
              <div className="sp-maint">
                <div className="sp-maint-title">Database failover drill</div>
                <div className="sp-maint-when"><i className="fa-regular fa-calendar" /> Sun, Jun 7 · 02:00–04:00 UTC</div>
                <div className="sp-maint-comp text-mute">Affects: Payments Service, Data Pipeline</div>
                <span className="sn-state-pill state-neutral" style={{ marginTop: 8 }}><i className="fa-solid fa-clock" /> Notice sent to 1,566</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
