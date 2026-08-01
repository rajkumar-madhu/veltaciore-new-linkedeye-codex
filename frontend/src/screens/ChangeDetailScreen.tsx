// ServiceNow form-style change detail (CAB review).
// Ported from screens/change-detail.jsx.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { FormSection, FormRow, Field, UserById } from "@/components/primitives";

export default function ChangeDetailScreen() {
  const { setRoute } = useNav();
  const c = { id: "CHG-000004", title: "Kubernetes 1.29 control plane upgrade prod-west", state: "CAB Review", risk: "High", type: "Normal", window: "Sat Apr 27 · 02:00–04:00 UTC", assignee: "u2", service: "k8s-control" };
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const toggle = (id: string) => setCollapsed(c => ({ ...c, [id]: !c[id] }));
  return (
    <div className="page page-fade sn-dash">
      <div className="sn-breadcrumb">
        <a className="sn-link" onClick={() => setRoute("changes")}>Change Management</a><span className="sn-bc-sep">›</span>
        <span>{c.id}</span>
      </div>
      <div className="sn-form-header">
        <div className="sn-form-title-row">
          <span className="sn-rec-number">{c.id}</span>
          <span className="sn-pill state-progress"><i className="fa-solid fa-gavel" /> {c.state}</span>
          <span className="sn-pill prio-1"><i className="fa-solid fa-circle" /> {c.risk} risk</span>
          <span className="sn-pill state-neutral"><i className="fa-solid fa-code-branch" /> {c.type}</span>
        </div>
        <div className="sn-form-title-meta">
          <div>
            <h1>{c.title}</h1>
            <div className="sn-form-sub">Planned window: {c.window} · Service: {c.service}</div>
          </div>
          <div className="sn-form-actions">
            <button className="sn-btn"><i className="fa-solid fa-xmark" /> Reject</button>
            <button className="sn-btn"><i className="fa-solid fa-comment" /> Request Info</button>
            <button className="sn-btn primary"><i className="fa-solid fa-check" /> Approve</button>
          </div>
        </div>
      </div>
      <div className="sn-form-layout">
        <div className="sn-form-main">
          <FormSection id="details" title="Change Request Details" collapsed={collapsed.details} onToggle={toggle}>
            <FormRow>
              <Field label="Number" value={<span className="mono">{c.id}</span>} required />
              <Field label="Type" value={c.type} required />
            </FormRow>
            <FormRow>
              <Field label="Short description" value={<b>{c.title}</b>} required />
              <Field label="Category" value="Infrastructure" />
            </FormRow>
            <FormRow>
              <Field label="Requested by" value={<UserById id={c.assignee} />} />
              <Field label="Assignment Group" value="Platform" />
            </FormRow>
            <FormRow>
              <Field label="Configuration Item" value={<a className="sn-link mono">{c.service}</a>} />
              <Field label="Service" value="k8s-control-plane" />
            </FormRow>
            <FormRow>
              <Field label="Risk" value={<span className="tone-crit"><b>{c.risk}</b> · cluster-wide blast radius</span>} required />
              <Field label="Impact" value="Production · multi-region" />
            </FormRow>
            <FormRow>
              <Field label="Planned start" value={c.window} required />
              <Field label="Planned end" value="Sat Apr 27 · 04:00 UTC" />
            </FormRow>
          </FormSection>
          <FormSection id="risk" title="Risk Assessment" badge="auto-computed" collapsed={collapsed.risk} onToggle={toggle}>
            <FormRow>
              <Field label="Blast radius" value={<span className="tone-warn">Cluster-wide</span>} />
              <Field label="Rollback time" value={<span className="tone-ok">≤ 5 min</span>} />
            </FormRow>
            <FormRow>
              <Field label="Peer review" value={<span className="tone-warn">3 / 5 reviewers</span>} />
              <Field label="Tests" value={<span className="tone-ok">Passing</span>} />
            </FormRow>
          </FormSection>
          <FormSection id="plan" title="Implementation Plan" collapsed={collapsed.plan} onToggle={toggle}>
            <div style={{ padding: "10px 14px" }}>
              {[
                "Drain traffic from us-east-1c control plane nodes",
                "Upgrade etcd cluster first (quorum preserved)",
                "Upgrade api-server in rolling fashion, 1 at a time",
                "Validate pod scheduling on canary namespace",
                "Flip traffic back; monitor for 15 minutes",
                "Proceed only if error rate < 0.1% — otherwise rollback",
              ].map((s, i, arr) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: i < arr.length - 1 ? "1px solid #e5e8eb" : "none", alignItems: "center" }}>
                  <span style={{ width: 22, height: 22, borderRadius: 11, background: "#eaf0f7", color: "#016", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ fontSize: 12.5, color: "#000" }}>{s}</span>
                </div>
              ))}
            </div>
          </FormSection>
        </div>
        <aside className="sn-form-side">
          <div className="sn-side-card">
            <div className="sn-side-head">CAB Approvals <span className="sn-side-count">3 / 5</span></div>
            <div className="sn-side-body">
              {[
                { who: "u2", role: "Platform Lead", state: "approved" },
                { who: "u5", role: "SRE Manager", state: "approved" },
                { who: "u8", role: "Security", state: "approved" },
                { who: "u1", role: "CAB Chair", state: "pending" },
                { who: "u7", role: "Ops Director", state: "pending" },
              ].map((a, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: i < 4 ? "1px solid #e5e8eb" : "none" }}>
                  <UserById id={a.who} />
                  <div style={{ flex: 1, minWidth: 0 }}><div className="text-mute" style={{ fontSize: 11 }}>{a.role}</div></div>
                  {a.state === "approved" ? <span className="sn-state-pill svc-healthy"><i className="fa-solid fa-check" /> approved</span> : <span className="sn-state-pill state-mitigating"><i className="fa-solid fa-clock" /> pending</span>}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
