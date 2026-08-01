// ServiceNow form-style problem detail.
// Ported from screens/problem-detail.jsx.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { INCIDENTS } from "@/data/core";
import { FormSection, FormRow, Field, Sev, UserById } from "@/components/primitives";

export default function ProblemDetailScreen() {
  const { setRoute } = useNav();
  const p = { id: "PRB-000001", title: "Recurring SwitchPortFlapping on MGMT-SW Gi1/0/3", status: "Root cause analysis", priority: 1, assignee: "u2", created: "3 days ago", linked: 4, kb: null, impact: "High · Network · NOC" };
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const toggle = (id: string) => setCollapsed(c => ({ ...c, [id]: !c[id] }));
  return (
    <div className="page page-fade sn-dash">
      <div className="sn-breadcrumb">
        <a className="sn-link" onClick={() => setRoute("problems")}>Problem Management</a><span className="sn-bc-sep">›</span>
        <span>{p.id}</span>
      </div>
      <div className="sn-form-header">
        <div className="sn-form-title-row">
          <span className="sn-rec-number">{p.id}</span>
          <span className="sn-pill prio-1"><i className="fa-solid fa-circle" /> P1 — Critical</span>
          <span className="sn-pill state-progress"><i className="fa-solid fa-spinner fa-spin" /> {p.status}</span>
        </div>
        <div className="sn-form-title-meta">
          <div>
            <h1>{p.title}</h1>
            <div className="sn-form-sub">Opened {p.created} · {p.linked} incidents linked · {p.impact}</div>
          </div>
          <div className="sn-form-actions">
            <button className="sn-btn"><i className="fa-solid fa-link" /> Link Incident</button>
            <button className="sn-btn"><i className="fa-solid fa-copy" /> Clone</button>
            <button className="sn-btn primary"><i className="fa-solid fa-book" /> Publish Known Error</button>
          </div>
        </div>
      </div>
      <div className="sn-form-layout">
        <div className="sn-form-main">
          <FormSection id="ident" title="Problem Identification" collapsed={collapsed.ident} onToggle={toggle}>
            <FormRow>
              <Field label="Number" value={<span className="mono">{p.id}</span>} required />
              <Field label="Priority" value={<Sev n={p.priority} />} required />
            </FormRow>
            <FormRow>
              <Field label="Short description" value={<b>{p.title}</b>} required />
              <Field label="Category" value="Network · Switch port" />
            </FormRow>
            <FormRow>
              <Field label="Assigned to" value={<UserById id={p.assignee} />} />
              <Field label="Assignment Group" value="NOC — Network Ops" />
            </FormRow>
            <FormRow>
              <Field label="Service" value={<a className="sn-link">MGMT-SW Gi1/0/3</a>} />
              <Field label="Configuration Item" value={<a className="sn-link mono">CI-SW-08</a>} />
            </FormRow>
          </FormSection>
          <FormSection id="rca" title="Root Cause Analysis" badge="AI-synthesized · 91% confidence" collapsed={collapsed.rca} onToggle={toggle}>
            <div style={{ padding: "12px 14px" }}>
              <p style={{ fontSize: 12.5, lineHeight: 1.6, color: "#000" }}>
                Across 4 linked incidents the common trigger is <b>SFP transceiver flap</b> on port Gi1/0/3 during peak traffic windows. Optical Rx levels approach receive threshold.
              </p>
              <ul style={{ marginTop: 10, paddingLeft: 20, fontSize: 12.5, lineHeight: 1.8, color: "#000" }}>
                <li><b>Five whys:</b> SFP module is past its 5-year recommended lifespan.</li>
                <li><b>Contributing:</b> No automated optical-monitoring threshold alert.</li>
                <li><b>Recommended fix:</b> Replace SFP and add DOM threshold alert in NMS.</li>
              </ul>
            </div>
          </FormSection>
          <FormSection id="linked" title="Linked Incidents" badge={`${p.linked} incidents`} collapsed={collapsed.linked} onToggle={toggle}>
            <table className="sn-list-table">
              <tbody>
                {INCIDENTS.slice(0, 4).map(inc => (
                  <tr key={inc.id} onClick={() => setRoute("incident-detail")} style={{ cursor: "pointer" }}>
                    <td style={{ width: 110 }}><a className="sn-link mono">{inc.id}</a></td>
                    <td style={{ width: 60 }}><Sev n={inc.sev} /></td>
                    <td><b>{inc.title}</b></td>
                    <td style={{ width: 130 }}><UserById id={inc.assignee} /></td>
                    <td style={{ width: 110 }}>
                      <span className={`sn-state-pill state-${inc.status}`}><i className="fa-solid fa-circle" /> {inc.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </FormSection>
        </div>
        <aside className="sn-form-side">
          <div className="sn-side-card">
            <div className="sn-side-head">Assignment</div>
            <div className="sn-side-body">
              <Field label="Owner" value={<UserById id={p.assignee} />} />
              <Field label="Group" value="NOC — Network Ops" />
              <Field label="Target RCA" value="Apr 28, 2026" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
