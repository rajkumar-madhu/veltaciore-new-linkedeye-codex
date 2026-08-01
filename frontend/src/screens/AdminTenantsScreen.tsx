// Super-admin Tenants in ServiceNow form-style
// Ported from screens/admin-tenants.jsx.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { useUiStore } from "@/store/ui";
import { useTenants } from "@/api/hooks";
import { ORG, TENANTS } from "@/data/core";
import { Kpi, FormSection, Field } from "@/components/primitives";
import { colorFor } from "@/components/Shell";

export default function AdminTenantsScreen() {
  const { setRoute } = useNav();
  const setTenant = useUiStore((s) => s.setTenant);
  const { data } = useTenants();
  const tenants = data ?? [];
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const toggle = (id: string) => setCollapsed(c => ({ ...c, [id]: !c[id] }));
  return (
    <div className="page page-fade sn-dash">
      <div className="sn-breadcrumb">
        <a className="sn-link">Home</a><span className="sn-bc-sep">›</span>
        <a className="sn-link">Super-admin</a><span className="sn-bc-sep">›</span>
        <span>Tenants</span>
      </div>
      <div className="sn-form-header">
        <div className="sn-form-title-row">
          <span className="sn-rec-number">TENANTS</span>
          <span className="sn-pill state-progress"><i className="fa-solid fa-spinner fa-spin" /> {tenants.length} active</span>
          <span className="sn-pill state-neutral"><i className="fa-solid fa-building" /> {ORG.name}</span>
        </div>
        <div className="sn-form-title-meta">
          <div>
            <h1>Tenant Management</h1>
            <div className="sn-form-sub">All workspaces under {ORG.name} · {ORG.seatsUsed.toLocaleString()} seats used / {ORG.seatsTotal.toLocaleString()} total</div>
          </div>
          <div className="sn-form-actions">
            <button className="sn-btn"><i className="fa-solid fa-file-export" /> Export CSV</button>
            <button className="sn-btn primary" onClick={() => setRoute("onboarding")}><i className="fa-solid fa-plus" /> Provision Tenant</button>
          </div>
        </div>
      </div>
      <div className="sn-kpi-strip">
        <Kpi l="Total tenants" v={tenants.length} s="+2 this quarter" tone="neutral" />
        <Kpi l="Seats used" v={ORG.seatsUsed.toLocaleString()} s={`${Math.round(ORG.seatsUsed/ORG.seatsTotal*100)}% utilization`} tone="neutral" />
        <Kpi l="Healthy" v={tenants.filter(t => t.health > 95).length} s="above 95%" tone="ok" />
        <Kpi l="At risk" v={tenants.filter(t => t.health <= 90).length} s="needs attention" tone="warn" />
        <Kpi l="Enterprise" v={tenants.filter(t => t.plan === "Enterprise").length} s="plan tier" tone="neutral" />
        <Kpi l="Total spend" v={`$${(tenants.reduce((s,t)=>s+t.spend,0)/1000).toFixed(0)}k`} s="per month" tone="neutral" />
      </div>
      <div className="sn-form-layout">
        <div className="sn-form-main">
          <FormSection id="list" title="Tenant Inventory" badge={`${tenants.length} active`} collapsed={collapsed.list} onToggle={toggle}>
            <table className="sn-list-table">
              <thead><tr><th>Tenant</th><th style={{width:120}}>Plan</th><th style={{width:90}}>Users</th><th style={{width:110}}>Health</th><th style={{width:110}}>Incidents</th><th style={{width:110}}>Region</th><th style={{width:120}}>Created</th></tr></thead>
              <tbody>
                {tenants.map(t => (
                  <tr key={t.id} onClick={() => { setTenant(t); setRoute("dashboard"); }} style={{ cursor: "pointer" }}>
                    <td>
                      <div className="row row-8">
                        <div style={{ width: 24, height: 24, borderRadius: 3, background: colorFor(t.color), color: "#fff", fontWeight: 700, fontSize: 10, display: "grid", placeItems: "center" }}>{t.code}</div>
                        <div><a className="sn-link"><b>{t.name}</b></a><div className="text-mute mono" style={{ fontSize: 11, marginTop: 2 }}>{t.id}.linkedeye.in</div></div>
                      </div>
                    </td>
                    <td><span className="sn-state-pill state-neutral"><i className="fa-solid fa-circle" /> {t.plan}</span></td>
                    <td className="mono">{t.users}</td>
                    <td><span className={`sn-state-pill ${t.health > 95 ? "svc-healthy" : t.health > 85 ? "state-mitigating" : "state-active"}`}><i className="fa-solid fa-circle" /> {t.health}%</span></td>
                    <td className="mono">{t.incidents}{t.sev1 > 0 && <span style={{ marginLeft: 6 }} className="sn-state-pill state-active"><i className="fa-solid fa-circle" /> {t.sev1} S1</span>}</td>
                    <td className="mono text-mute">us-east-1</td>
                    <td className="text-mute" style={{ fontSize: 11.5 }}>Mar 12, 2024</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </FormSection>
        </div>
        <aside className="sn-form-side">
          <div className="sn-side-card">
            <div className="sn-side-head">Org Tree</div>
            <div className="sn-side-body">
              <Field label="Parent" value={<b>{ORG.name}</b>} />
              <Field label="Plan" value={ORG.plan} />
              <Field label="Tenants" value={tenants.length} />
              <Field label="Total users" value={ORG.seatsUsed.toLocaleString()} />
              <Field label="Default region" value="us-east-1" />
              <Field label="SSO" value="Okta · inherited" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
