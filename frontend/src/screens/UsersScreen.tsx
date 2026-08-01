// People & Roles in ServiceNow form-style
// Ported from screens/users.jsx.
import React from "react";
import { useUiStore } from "@/store/ui";
import { USERS } from "@/data/core";
import { Kpi, FormSection, Field, Avatar } from "@/components/primitives";

export default function UsersScreen() {
  const tenant = useUiStore((s) => s.tenant);
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const toggle = (id: string) => setCollapsed(c => ({ ...c, [id]: !c[id] }));
  return (
    <div className="page page-fade sn-dash">
      <div className="sn-breadcrumb">
        <a className="sn-link">Home</a><span className="sn-bc-sep">›</span>
        <a className="sn-link">{tenant.name}</a><span className="sn-bc-sep">›</span>
        <span>People &amp; Roles</span>
      </div>
      <div className="sn-form-header">
        <div className="sn-form-title-row">
          <span className="sn-rec-number">USERS</span>
          <span className="sn-pill state-progress"><i className="fa-solid fa-spinner fa-spin" /> {USERS.length * 52} users</span>
          <span className="sn-pill state-neutral"><i className="fa-solid fa-user-gear" /> 8 roles</span>
        </div>
        <div className="sn-form-title-meta">
          <div>
            <h1>People &amp; Roles</h1>
            <div className="sn-form-sub">{tenant.name} · {USERS.length * 52} users · 8 roles · provisioned via SCIM</div>
          </div>
          <div className="sn-form-actions">
            <button className="sn-btn"><i className="fa-solid fa-user-gear" /> Role Matrix</button>
            <button className="sn-btn primary"><i className="fa-solid fa-user-plus" /> Invite People</button>
          </div>
        </div>
      </div>
      <div className="sn-kpi-strip">
        <Kpi l="Total users" v={USERS.length * 52} s="+12 this month" tone="ok" />
        <Kpi l="On-call" v="14" s="3 teams rotating" tone="neutral" />
        <Kpi l="Admins" v="8" s="audit via SSO" tone="neutral" />
        <Kpi l="Pending invites" v="3" s="expires in 7d" tone="warn" />
        <Kpi l="Roles" v="8" s="defined" tone="neutral" />
        <Kpi l="Last sync" v="2m" s="SCIM ago" tone="ok" />
      </div>
      <div className="sn-form-layout">
        <div className="sn-form-main">
          <FormSection id="users" title="User Inventory" badge={`${USERS.length} shown`} collapsed={collapsed.users} onToggle={toggle}>
            <table className="sn-list-table">
              <thead><tr><th>User</th><th style={{width:160}}>Role</th><th style={{width:140}}>Team</th><th style={{width:110}}>On-call</th><th style={{width:90}}>Auth</th><th style={{width:110}}>Last active</th><th style={{width:100}}>State</th></tr></thead>
              <tbody>
                {USERS.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div className="row row-8">
                        <Avatar name={u.name} color={u.color} />
                        <div><a className="sn-link"><b>{u.name}</b></a><div className="text-mute mono" style={{ fontSize: 11, marginTop: 2 }}>{u.email}</div></div>
                      </div>
                    </td>
                    <td><span className={`sn-state-pill ${u.role === "Admin" ? "state-investigating" : u.role === "Incident Commander" ? "state-active" : u.role === "Manager" ? "state-mitigating" : "state-neutral"}`}><i className="fa-solid fa-circle" /> {u.role}</span></td>
                    <td>{u.team}</td>
                    <td>{(u.role === "Incident Commander" || u.role === "Responder") ? <span className="sn-state-pill state-investigating"><i className="fa-solid fa-circle" /> Rotating</span> : <span className="text-mute mono">—</span>}</td>
                    <td><span className="sn-state-pill state-neutral"><i className="fa-solid fa-key" /> SSO</span></td>
                    <td className="text-mute mono" style={{ fontSize: 11 }}>{u.last}</td>
                    <td><span className={`sn-state-pill ${u.status === "online" ? "svc-healthy" : u.status === "away" ? "state-mitigating" : "state-neutral"}`}><i className="fa-solid fa-circle" /> {u.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </FormSection>
        </div>
        <aside className="sn-form-side">
          <div className="sn-side-card">
            <div className="sn-side-head">Role Distribution</div>
            <div className="sn-side-body">
              {["Admin","Incident Commander","Manager","Responder","Viewer"].map(r => {
                const count = USERS.filter(u => u.role === r).length;
                return <Field key={r} label={r} value={<span className="mono"><b>{count * 8}</b> users</span>} />;
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
