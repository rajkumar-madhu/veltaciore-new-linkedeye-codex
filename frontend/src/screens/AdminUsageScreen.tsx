// Usage & quotas in ServiceNow form-style
// Ported from screens/admin-usage.jsx.
import React from "react";
import { useTenants } from "@/api/hooks";
import { TENANTS } from "@/data/core";
import { Kpi, FormSection, Field } from "@/components/primitives";
import { colorFor } from "@/components/Shell";

export default function AdminUsageScreen() {
  const { data } = useTenants();
  const tenants = data ?? [];
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const toggle = (id: string) => setCollapsed(c => ({ ...c, [id]: !c[id] }));
  return (
    <div className="page page-fade sn-dash">
      <div className="sn-breadcrumb">
        <a className="sn-link">Home</a><span className="sn-bc-sep">›</span>
        <a className="sn-link">Super-admin</a><span className="sn-bc-sep">›</span>
        <span>Usage &amp; Quotas</span>
      </div>
      <div className="sn-form-header">
        <div className="sn-form-title-row">
          <span className="sn-rec-number">USAGE</span>
          <span className="sn-pill state-progress"><i className="fa-solid fa-spinner fa-spin" /> 87M / 100M events</span>
          <span className="sn-pill state-neutral"><i className="fa-solid fa-database" /> 4.2 / 10 TB storage</span>
        </div>
        <div className="sn-form-title-meta">
          <div>
            <h1>Usage &amp; Quotas</h1>
            <div className="sn-form-sub">Event ingest, storage, API consumption by business unit · monthly window</div>
          </div>
          <div className="sn-form-actions">
            <button className="sn-btn"><i className="fa-solid fa-bell" /> Quota Alerts</button>
            <button className="sn-btn primary"><i className="fa-solid fa-file-export" /> Export</button>
          </div>
        </div>
      </div>
      <div className="sn-kpi-strip">
        <Kpi l="Events" v="87M" s="of 100M · 87%" tone="warn" />
        <Kpi l="Storage" v="4.2 TB" s="of 10 TB · 42%" tone="ok" />
        <Kpi l="API calls" v="24M" s="+22% vs last" tone="neutral" />
        <Kpi l="Pages sent" v="1,204" s="-12% (noise)" tone="ok" />
        <Kpi l="Active alerts" v="3" s="quota warnings" tone="warn" />
        <Kpi l="At risk" v="1" s="IndMoney" tone="crit" />
      </div>
      <div className="sn-form-layout">
        <div className="sn-form-main">
          <FormSection id="quotas" title="Per-Tenant Quotas" badge="monthly" collapsed={collapsed.quotas} onToggle={toggle}>
            <table className="sn-list-table">
              <thead><tr><th>Tenant</th><th style={{width:160}}>Events / mo</th><th style={{width:160}}>Storage</th><th style={{width:130}}>API / day</th><th style={{width:130}}>Pages / mo</th></tr></thead>
              <tbody>
                {tenants.map((t, i) => {
                  const ev = [72,84,112,48,22,66][i] || 50;
                  const st = [38,52,78,30,12,44][i] || 30;
                  const api = [45,62,81,34,20,55][i];
                  const pg = [40,28,72,22,10,48][i];
                  return (
                    <tr key={t.id}>
                      <td><div className="row row-8"><div style={{ width: 24, height: 24, borderRadius: 3, background: colorFor(t.color), color: "#fff", fontWeight: 700, fontSize: 10, display: "grid", placeItems: "center" }}>{t.code}</div><b>{t.name}</b></div></td>
                      <td><QuotaCell pct={ev} label={`${ev}M / ${ev < 80 ? 100 : 120}M`} /></td>
                      <td><QuotaCell pct={st} label={`${(st/10).toFixed(1)} / ${st > 60 ? 2 : 1} TB`} /></td>
                      <td><QuotaCell pct={api} label={`${api}%`} /></td>
                      <td><QuotaCell pct={pg} label={`${[120,84,216,66,30,144][i]} / ${t.plan === "Enterprise" ? 500 : 300}`} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </FormSection>

          <FormSection id="alerts" title="Quota Alerts" badge="3 active" collapsed={collapsed.alerts} onToggle={toggle}>
            <table className="sn-list-table">
              <tbody>
                {[
                  ["IndMoney","Events ingested at 93% of cap","warn"],
                  ["IndMoney","Storage at 78% · projected breach in 9d","warn"],
                  ["BetaFront","API rate limit hit 12× in 24h","crit"],
                ].map(([t, msg, kind], i) => (
                  <tr key={i}>
                    <td style={{ width: 200 }}><b>{t}</b></td>
                    <td>{msg}</td>
                    <td style={{ width: 110 }}><span className={`sn-state-pill ${kind === "crit" ? "state-active" : "state-mitigating"}`}><i className="fa-solid fa-circle" /> {kind === "crit" ? "critical" : "warning"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </FormSection>
        </div>
        <aside className="sn-form-side">
          <div className="sn-side-card">
            <div className="sn-side-head">Org-wide Totals</div>
            <div className="sn-side-body">
              <Field label="Events / mo" value={<span><b>87M</b> / 100M</span>} />
              <Field label="Storage" value={<span><b>4.2</b> / 10 TB</span>} />
              <Field label="API calls / mo" value="24M" />
              <Field label="Pages / mo" value="1,204" />
              <Field label="Avg per tenant" value="14.5M events" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function QuotaCell({ pct, label }: { pct: number; label: string }) {
  return (
    <div className="row row-8">
      <div className="bar-track" style={{ width: 60 }}><div className="bar-fill" style={{ width: pct + "%", background: pct > 85 ? "var(--critical)" : pct > 70 ? "var(--warning)" : "var(--accent)" }} /></div>
      <span className="mono" style={{ fontSize: 11 }}>{label}</span>
    </div>
  );
}
