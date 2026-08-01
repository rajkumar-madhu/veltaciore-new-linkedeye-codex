// Flow Designer in ServiceNow form-style.
// Ported from screens/flow.jsx.
import React from "react";
import { Kpi, FormSection, FormRow, Field, UserById } from "@/components/primitives";

export default function FlowScreen() {
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const toggle = (id: string) => setCollapsed(c => ({ ...c, [id]: !c[id] }));
  return (
    <div className="page page-fade sn-dash">
      <div className="sn-breadcrumb">
        <a className="sn-link">Home</a><span className="sn-bc-sep">›</span>
        <a className="sn-link">Automation</a><span className="sn-bc-sep">›</span>
        <span>Flow Designer · Sev-1 auto-response</span>
      </div>
      <div className="sn-form-header">
        <div className="sn-form-title-row">
          <span className="sn-rec-number">FLOW-0042</span>
          <span className="sn-pill svc-healthy"><i className="fa-solid fa-circle" /> Active</span>
          <span className="sn-pill state-neutral"><i className="fa-solid fa-bolt" /> 127 runs / week</span>
        </div>
        <div className="sn-form-title-meta">
          <div>
            <h1>Sev-1 Auto-Response</h1>
            <div className="sn-form-sub">Triggered when a Sev 1 is declared · last run 14 min ago</div>
          </div>
          <div className="sn-form-actions">
            <button className="sn-btn"><i className="fa-solid fa-clock-rotate-left" /> History</button>
            <button className="sn-btn"><i className="fa-solid fa-vial" /> Test Run</button>
            <button className="sn-btn primary"><i className="fa-solid fa-play" /> Activate</button>
          </div>
        </div>
      </div>
      <div className="sn-kpi-strip">
        <Kpi l="Runs / week" v="127" s="last 7 days" tone="neutral" />
        <Kpi l="Success rate" v="98.4%" s="125 / 127" tone="ok" />
        <Kpi l="Avg duration" v="2.4s" s="end-to-end" tone="ok" />
        <Kpi l="Steps" v="8" s="in this flow" tone="neutral" />
        <Kpi l="Last run" v="14m ago" s="auto-triggered" tone="neutral" />
        <Kpi l="State" v="Active" s="enabled" tone="ok" />
      </div>
      <div className="sn-form-layout">
        <div className="sn-form-main">
          <FormSection id="props" title="Flow Properties" collapsed={collapsed.props} onToggle={toggle}>
            <FormRow>
              <Field label="Name" value={<b>Sev-1 Auto-Response</b>} required />
              <Field label="Application" value="Incident Management" required />
            </FormRow>
            <FormRow>
              <Field label="Trigger" value="When Sev-1 incident declared" required />
              <Field label="Run as" value="System Service Account" />
            </FormRow>
            <FormRow>
              <Field label="Owner" value={<UserById id="u1" />} />
              <Field label="Maintenance window" value="None" />
            </FormRow>
          </FormSection>

          <FormSection id="canvas" title="Flow Canvas" badge="8 steps" collapsed={collapsed.canvas} onToggle={toggle}>
            <div style={{ background: "#fafbfc", padding: 24, minHeight: 380, position: "relative", overflow: "hidden" }}>
              <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
                <defs>
                  <marker id="farr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#6b7785" /></marker>
                </defs>
                <path d="M160 70 L160 130" stroke="#6b7785" markerEnd="url(#farr)" />
                <path d="M160 190 L160 250" stroke="#6b7785" markerEnd="url(#farr)" />
                <path d="M160 310 L80 370 M160 310 L240 370 M160 310 L400 370" stroke="#6b7785" markerEnd="url(#farr)" />
              </svg>
              <FlowNode x={80} y={20} kind="trigger" icon="fa-bolt" title="Sev-1 declared" sub="Trigger" />
              <FlowNode x={80} y={130} kind="ai" icon="fa-sparkles" title="AI correlate & RCA" sub="Find similar in 90d" />
              <FlowNode x={80} y={250} kind="logic" icon="fa-code-branch" title="Has runbook?" sub="Decision · KB match" />
              <FlowNode x={10} y={370} kind="action" icon="fa-play" title="Run runbook" sub="pool-expansion-v3" />
              <FlowNode x={150} y={370} kind="action" icon="fa-user-plus" title="Page on-call" sub="PagerDuty Tier 1" />
              <FlowNode x={320} y={370} kind="action" icon="fa-comment" title="Open war-room" sub="Slack + Zoom" />
            </div>
          </FormSection>
        </div>

        <aside className="sn-form-side">
          <div className="sn-side-card">
            <div className="sn-side-head">Recent Runs <span className="sn-side-count">5</span></div>
            <div className="sn-side-body">
              {[["14m ago","INC-48291","success"],["2h ago","INC-48279","success"],["1d ago","INC-48241","success"],["1d ago","INC-48238","failed"],["2d ago","INC-48201","success"]].map(([t, inc, st], i) => (
                <div key={i} className="sn-related-row">
                  <div><div className="sn-related-title mono">{inc}</div><div className="sn-related-meta">{t}</div></div>
                  <span className={`sn-state-pill ${st === "success" ? "svc-healthy" : "state-active"}`}><i className="fa-solid fa-circle" /> {st}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="sn-side-card">
            <div className="sn-side-head">AI Suggestions</div>
            <div className="sn-side-body" style={{ padding: 14, fontSize: 12.5, lineHeight: 1.6, color: "#000" }}>
              Add "Attach runbook link" after this step — runs of this flow without that attachment have 23% longer MTTR.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function FlowNode({ x, y, kind, icon, title, sub }: { x: number; y: number; kind: string; icon: string; title: string; sub: string }) {
  const c = ({ trigger: "#2563eb", ai: "#8b5cf6", logic: "#f59e0b", action: "#6b7785" } as Record<string, string>)[kind];
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 160, background: "white", border: `1.5px solid ${c}`, borderLeft: `5px solid ${c}`, borderRadius: 3, padding: 10 }}>
      <div className="row row-8" style={{ marginBottom: 4 }}>
        <div style={{ width: 22, height: 22, borderRadius: 4, background: c + "20", color: c, display: "grid", placeItems: "center", fontSize: 11 }}><i className={`fa-solid ${icon}`} /></div>
        <b style={{ fontSize: 12, color: "#000" }}>{title}</b>
      </div>
      <div style={{ fontSize: 10.5, color: "var(--fg-muted)" }}>{sub}</div>
    </div>
  );
}
