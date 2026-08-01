// Cross-tenant rollup in ServiceNow form-style
// Ported from screens/cross-tenant.jsx.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { useUiStore } from "@/store/ui";
import { useTenants } from "@/api/hooks";
import { ORG, TENANTS, INCIDENTS } from "@/data/core";
import { Kpi, FormSection, Sev } from "@/components/primitives";
import { colorFor } from "@/components/Shell";

export default function CrossTenantScreen() {
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
        <a className="sn-link">{ORG.name}</a><span className="sn-bc-sep">›</span>
        <span>Cross-tenant Operations</span>
      </div>
      <div className="sn-form-header">
        <div className="sn-form-title-row">
          <span className="sn-rec-number">ORG-OPS</span>
          <span className="sn-pill prio-1"><i className="fa-solid fa-circle" /> {tenants.reduce((s,t) => s + t.sev1, 0)} Active Sev-1</span>
          <span className="sn-pill state-progress"><i className="fa-solid fa-spinner fa-spin" /> {tenants.length} Business Units</span>
        </div>
        <div className="sn-form-title-meta">
          <div>
            <h1>Cross-tenant Operations</h1>
            <div className="sn-form-sub">{ORG.name} · {tenants.length} business units · live rollup · {ORG.seatsUsed.toLocaleString()} seats</div>
          </div>
          <div className="sn-form-actions">
            <button className="sn-btn"><i className="fa-solid fa-file-export" /> Executive Report</button>
            <button className="sn-btn primary"><i className="fa-solid fa-plus" /> New Business Unit</button>
          </div>
        </div>
      </div>
      <div className="sn-kpi-strip">
        <Kpi l="Org Health" v="92%" s="2 BUs degraded" tone="warn" />
        <Kpi l="BOD ready" v={`${tenants.filter(t => t.health >= 88).length}/${tenants.length}`} s="units cleared to trade" tone={tenants.some(t => t.health < 88) ? "warn" : "ok"} />
        <Kpi l="Sev 1" v={tenants.reduce((s,t) => s + t.sev1, 0)} s="across 3 BUs" tone="crit" />
        <Kpi l="Open Incidents" v={tenants.reduce((s,t) => s + t.incidents, 0)} s="all units" tone="warn" />
        <Kpi l="Org MTTR" v="24m" s="p50 · 18% faster" tone="ok" />
        <Kpi l="Users" v={ORG.seatsUsed.toLocaleString()} s={`/ ${ORG.seatsTotal.toLocaleString()} seats`} tone="neutral" />
        <Kpi l="Spend / mo" v={`$${(tenants.reduce((s,t) => s + t.spend, 0)/1000).toFixed(0)}k`} s="+14% QoQ" tone="neutral" />
      </div>
      <div className="sn-form-layout">
        <div className="sn-form-main">
          <FormSection id="bus" title="Business Units" badge={`${tenants.length} active`} collapsed={collapsed.bus} onToggle={toggle}>
            <table className="sn-list-table">
              <thead><tr><th>Unit</th><th style={{width:110}}>Health</th><th style={{width:120}}>BOD</th><th style={{width:90}}>Open</th><th style={{width:90}}>Sev 1</th><th style={{width:90}}>MTTR</th><th style={{width:90}}>Users</th><th style={{width:110}}>Plan</th><th style={{width:110}}>Spend/mo</th></tr></thead>
              <tbody>
                {tenants.map(t => (
                  <tr key={t.id} onClick={() => { setTenant(t); setRoute("dashboard"); }} style={{ cursor: "pointer" }}>
                    <td>
                      <div className="row row-8">
                        <div style={{ width: 24, height: 24, borderRadius: 3, background: colorFor(t.color), color: "#fff", fontWeight: 700, fontSize: 10, display: "grid", placeItems: "center" }}>{t.code}</div>
                        <div><a className="sn-link"><b>{t.name}</b></a><div className="text-mute mono" style={{ fontSize: 11, marginTop: 2 }}>{t.id}</div></div>
                      </div>
                    </td>
                    <td>
                      <div className="row row-8">
                        <div className="bar-track" style={{ width: 50 }}><div className="bar-fill" style={{ width: t.health + "%", background: t.health > 95 ? "var(--success)" : t.health > 85 ? "var(--warning)" : "var(--critical)" }} /></div>
                        <span className={`mono ${t.health > 95 ? "tone-ok" : t.health > 85 ? "tone-warn" : "tone-crit"}`}><b>{t.health}%</b></span>
                      </div>
                    </td>
                    <td>
                      {(() => {
                        const down = t.health < 70 ? 2 : t.health < 88 ? 1 : 0;
                        return down === 0
                          ? <span className="sn-state-pill svc-healthy"><i className="fa-solid fa-circle-check" /> Ready</span>
                          : <span className="sn-state-pill state-active"><i className="fa-solid fa-circle-xmark" /> {down} down</span>;
                      })()}
                    </td>
                    <td className="mono"><b>{t.incidents}</b></td>
                    <td>{t.sev1 > 0 ? <span className="sn-state-pill state-active"><i className="fa-solid fa-circle" /> {t.sev1}</span> : <span className="text-mute mono">—</span>}</td>
                    <td className="mono">{t.mttr}m</td>
                    <td className="mono">{t.users}</td>
                    <td><span className="sn-state-pill state-neutral"><i className="fa-solid fa-circle" /> {t.plan}</span></td>
                    <td className="mono">${(t.spend/1000).toFixed(1)}k</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </FormSection>

          <FormSection id="active" title="Active Sev 1 & 2 across org" collapsed={collapsed.active} onToggle={toggle}>
            <table className="sn-list-table">
              <thead><tr><th style={{width:60}}>Sev</th><th style={{width:110}}>Number</th><th>Incident</th><th style={{width:160}}>Business Unit</th><th style={{width:80}}>Age</th></tr></thead>
              <tbody>
                {INCIDENTS.filter(i => (i.sev === 1 || i.sev === 2) && i.status === "active").map(inc => {
                  const t = tenants.find(x => x.id === inc.tenant);
                  return (
                    <tr key={inc.id} onClick={() => setRoute("incident-detail")} style={{ cursor: "pointer" }}>
                      <td><Sev n={inc.sev} /></td>
                      <td><a className="sn-link mono">{inc.id}</a></td>
                      <td><b>{inc.title}</b></td>
                      <td>{t?.name}</td>
                      <td className="mono text-mute">{inc.age}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </FormSection>
        </div>
        <aside className="sn-form-side">
          <div className="sn-side-card">
            <div className="sn-side-head">Insights</div>
            <div className="sn-side-body" style={{ padding: 14, fontSize: 12.5, lineHeight: 1.6, color: "#000" }}>
              <b>IndMoney</b> has 31 open incidents — 2.3× its 4-week baseline. <a className="sn-link">Investigate →</a>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
