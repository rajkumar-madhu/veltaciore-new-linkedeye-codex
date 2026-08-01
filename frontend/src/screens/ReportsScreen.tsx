// Reports & SLA in ServiceNow form-style.
// Ported from screens/reports.jsx.
import React from "react";
import { Kpi, FormSection, Field, Sev } from "@/components/primitives";
import { useProblems, useSlas } from "@/api/hooks";
import { PROBLEMS, SLAS } from "@/data/itsm";

export default function ReportsScreen() {
  const { data } = useProblems();
  const problems = data ?? [];
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const toggle = (id: string) => setCollapsed(c => ({ ...c, [id]: !c[id] }));
  return (
    <div className="page page-fade sn-dash">
      <div className="sn-breadcrumb">
        <a className="sn-link">Home</a><span className="sn-bc-sep">›</span>
        <span>Reports &amp; Analytics</span>
      </div>
      <div className="sn-form-header">
        <div className="sn-form-title-row">
          <span className="sn-rec-number">REPORTS</span>
          <span className="sn-pill state-progress"><i className="fa-solid fa-spinner fa-spin" /> 18 saved</span>
          <span className="sn-pill state-neutral"><i className="fa-solid fa-clock" /> 4 scheduled</span>
        </div>
        <div className="sn-form-title-meta">
          <div>
            <h1>Reports &amp; Analytics</h1>
            <div className="sn-form-sub">Last refresh 2m ago · monthly window · org-wide</div>
          </div>
          <div className="sn-form-actions">
            <button className="sn-btn"><i className="fa-solid fa-file-export" /> Export</button>
            <button className="sn-btn primary"><i className="fa-solid fa-plus" /> New Report</button>
          </div>
        </div>
      </div>
      <div className="sn-kpi-strip">
        <Kpi l="MTTR p50" v="24m" s="-18% MoM" tone="ok" />
        <Kpi l="MTTD p50" v="2.4m" s="AI correlation" tone="ok" />
        <Kpi l="Change success" v="96.4%" s="+2.1% MoM" tone="ok" />
        <Kpi l="Alert fatigue" v="12/responder" s="-38%" tone="ok" />
        <Kpi l="Saved reports" v="18" s="active" tone="neutral" />
        <Kpi l="Scheduled" v="4" s="auto-delivery" tone="neutral" />
      </div>
      <div className="sn-form-layout">
        <div className="sn-form-main">
          <FormSection id="top" title="Top Problems by Linked Incidents" collapsed={collapsed.top} onToggle={toggle}>
            <table className="sn-list-table">
              <thead><tr><th>Problem</th><th style={{width:130}}>Linked</th><th style={{width:130}}>Time lost</th><th style={{width:130}}>Revenue impact</th><th style={{width:140}}>State</th></tr></thead>
              <tbody>
                {problems.slice(0,5).map((p, i) => (
                  <tr key={p.id}>
                    <td><b>{p.title}</b><div className="text-mute mono" style={{ fontSize: 11, marginTop: 2 }}>{p.id}</div></td>
                    <td className="mono"><b>{p.linked}</b> incidents</td>
                    <td className="mono">{[18.2,24.6,8.1,12.4,6.8][i]}h</td>
                    <td className="mono">${[112,82,18,34,9][i]}k</td>
                    <td><span className={`sn-state-pill ${p.status==="Resolved"?"svc-healthy":p.status==="Known error"?"state-investigating":"state-mitigating"}`}><i className="fa-solid fa-circle" /> {p.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </FormSection>
          <FormSection id="incidents" title="Incident Volume by Severity" badge="30d" collapsed={collapsed.incidents} onToggle={toggle}>
            <table className="sn-list-table">
              <thead><tr><th style={{width:90}}>Severity</th><th>Count</th><th style={{width:140}}>Δ vs last</th><th style={{width:140}}>Avg MTTR</th></tr></thead>
              <tbody>
                {([
                  ["Sev 1", 8, "+2", "42m"],
                  ["Sev 2", 24, "-3", "1h 12m"],
                  ["Sev 3", 84, "+12", "4h 8m"],
                  ["Sev 4", 142, "+18", "12h"],
                ] as [string, number, string, string][]).map((r, i) => (
                  <tr key={i}>
                    <td><Sev n={i+1} /></td>
                    <td className="mono"><b>{r[1]}</b></td>
                    <td className={`mono ${r[2].startsWith("+")?"tone-crit":"tone-ok"}`}><b>{r[2]}</b></td>
                    <td className="mono">{r[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </FormSection>
        </div>
        <aside className="sn-form-side">
          <div className="sn-side-card">
            <div className="sn-side-head">Scheduled Reports <span className="sn-side-count">4</span></div>
            <div className="sn-side-body">
              {[["Weekly ops digest","Mon 09:00","exec@"],["Monthly SLO review","1st of mo","sre-leads@"],["CAB pre-read","Thu 16:00","cab@"],["QBR","Quarterly","leadership@"]].map(([n,w,r],i) => (
                <div key={i} className="sn-related-row">
                  <div><div className="sn-related-title">{n}</div><div className="sn-related-meta">{w} · {r}</div></div>
                  <i className="fa-solid fa-envelope text-mute" style={{ fontSize: 11 }} />
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export function SLAScreen() {
  const { data } = useSlas();
  const slas = data ?? [];
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const toggle = (id: string) => setCollapsed(c => ({ ...c, [id]: !c[id] }));
  return (
    <div className="page page-fade sn-dash">
      <div className="sn-breadcrumb">
        <a className="sn-link">Home</a><span className="sn-bc-sep">›</span>
        <a className="sn-link">Service Level Management</a><span className="sn-bc-sep">›</span>
        <span>SLA Definitions</span>
      </div>
      <div className="sn-form-header">
        <div className="sn-form-title-row">
          <span className="sn-rec-number">SLA</span>
          <span className="sn-pill prio-1"><i className="fa-solid fa-circle" /> 3 breaches</span>
          <span className="sn-pill state-progress"><i className="fa-solid fa-spinner fa-spin" /> 94.6% avg compliance</span>
        </div>
        <div className="sn-form-title-meta">
          <div>
            <h1>SLA Definitions</h1>
            <div className="sn-form-sub">{slas.length} SLAs enforced · monthly window · all priorities</div>
          </div>
          <div className="sn-form-actions">
            <button className="sn-btn"><i className="fa-solid fa-file-export" /> Export</button>
            <button className="sn-btn primary"><i className="fa-solid fa-plus" /> New SLA</button>
          </div>
        </div>
      </div>
      <div className="sn-kpi-strip">
        <Kpi l="Total SLAs" v={slas.length} s="enforced" tone="neutral" />
        <Kpi l="Avg compliance" v="94.6%" s="this month" tone="ok" />
        <Kpi l="Breaches" v={slas.reduce((s,x) => s + x.breach, 0)} s="this month" tone="warn" />
        <Kpi l="At risk" v="2" s="trending breach" tone="warn" />
        <Kpi l="Best" v="Sev 3 resolution" s="99.0%" tone="ok" />
        <Kpi l="Worst" v="Sev 1 resolution" s="88.6%" tone="crit" />
      </div>
      <div className="sn-form-layout">
        <div className="sn-form-main">
          <FormSection id="slas" title="SLA Inventory" badge={`${slas.length} definitions`} collapsed={collapsed.slas} onToggle={toggle}>
            <table className="sn-list-table">
              <thead><tr><th>SLA</th><th style={{width:110}}>Target</th><th style={{width:110}}>Window</th><th style={{width:180}}>Compliance · 30d</th><th style={{width:100}}>Breaches</th><th style={{width:110}}>State</th></tr></thead>
              <tbody>
                {slas.map(s => (
                  <tr key={s.id}>
                    <td><a className="sn-link"><b>{s.name}</b></a><div className="text-mute mono" style={{ fontSize: 11, marginTop: 2 }}>{s.id}</div></td>
                    <td className="mono">{s.target}</td>
                    <td className="text-mute">{s.window}</td>
                    <td>
                      <div className="row row-8">
                        <div className="bar-track" style={{ width: 100 }}>
                          <div className="bar-fill" style={{ width: s.compliance + "%", background: s.compliance > 95 ? "var(--success)" : s.compliance > 90 ? "var(--warning)" : "var(--critical)" }} />
                        </div>
                        <span className={`mono ${s.compliance > 95 ? "tone-ok" : s.compliance > 90 ? "tone-warn" : "tone-crit"}`} style={{ fontSize: 12 }}><b>{s.compliance}%</b></span>
                      </div>
                    </td>
                    <td>{s.breach > 0 ? <span className="sn-state-pill state-active"><i className="fa-solid fa-circle" /> {s.breach}</span> : <span className="text-mute mono">0</span>}</td>
                    <td><span className="sn-state-pill svc-healthy"><i className="fa-solid fa-circle" /> Enforced</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </FormSection>
        </div>
        <aside className="sn-form-side">
          <div className="sn-side-card">
            <div className="sn-side-head">Breach Causes</div>
            <div className="sn-side-body">
              <Field label="Sev 1 resolution" value={<span className="tone-crit"><b>4</b> breaches</span>} />
              <Field label="Sev 1 response" value={<span className="tone-warn"><b>2</b> breaches</span>} />
              <Field label="Problem RCA" value={<span className="tone-warn"><b>1</b> breach</span>} />
              <Field label="Change approval" value={<span className="tone-ok">0 breaches</span>} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
