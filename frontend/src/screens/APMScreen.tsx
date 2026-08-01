// APM screen — ServiceNow form-style
// Ported from screens/apm.jsx.
import React from "react";
import { Kpi, FormSection, FormRow, Field, UserById } from "@/components/primitives";

export default function APMScreen() {
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const toggle = (id: string) => setCollapsed(c => ({ ...c, [id]: !c[id] }));
  return (
    <div className="page page-fade sn-dash">
      <div className="sn-breadcrumb">
        <a className="sn-link">Home</a><span className="sn-bc-sep">›</span>
        <a className="sn-link">Observe</a><span className="sn-bc-sep">›</span>
        <a className="sn-link">APM</a><span className="sn-bc-sep">›</span>
        <span>checkout-api</span>
      </div>

      <div className="sn-form-header">
        <div className="sn-form-title-row">
          <span className="sn-rec-number">APM</span>
          <span className="sn-pill prio-1"><i className="fa-solid fa-circle" /> Apdex 0.62</span>
          <span className="sn-pill state-progress"><i className="fa-solid fa-spinner fa-spin" /> Error rate +184%</span>
          <span className="sn-pill state-neutral">production · v2.41</span>
        </div>
        <div className="sn-form-title-meta">
          <div>
            <h1>checkout-api · Application Performance</h1>
            <div className="sn-form-sub">14 hosts · Node.js · last deploy v2.41 (2h ago) introduced regression</div>
          </div>
          <div className="sn-form-actions">
            <button className="sn-btn"><i className="fa-solid fa-share-nodes" /> Share</button>
            <button className="sn-btn"><i className="fa-solid fa-bell" /> Add Alert</button>
            <button className="sn-btn primary"><i className="fa-solid fa-arrow-rotate-left" /> Rollback v2.40</button>
          </div>
        </div>
      </div>

      <div className="sn-kpi-strip">
        <Kpi l="Response time" v="418ms" s="+24% vs 1h" tone="warn" />
        <Kpi l="Throughput" v="12.4k rpm" s="+4% vs 1h" tone="ok" />
        <Kpi l="Error rate" v="2.14%" s="+184% vs 1h" tone="crit" />
        <Kpi l="Apdex" v="0.62" s="-0.32 vs 1h" tone="warn" />
        <Kpi l="p95" v="842ms" s="exceeded 500ms target" tone="warn" />
        <Kpi l="Active hosts" v="14" s="all reporting" tone="ok" />
      </div>

      <div className="sn-form-layout">
        <div className="sn-form-main">
          <FormSection id="summary" title="Golden Signals" collapsed={collapsed.summary} onToggle={toggle}>
            <FormRow>
              <Field label="Service" value={<b>checkout-api</b>} required />
              <Field label="Tier" value="Edge / Web" />
            </FormRow>
            <FormRow>
              <Field label="Language" value="Node.js 20.11" />
              <Field label="Framework" value="Express 4.18 · TypeScript" />
            </FormRow>
            <FormRow>
              <Field label="Last deploy" value={<span><b>v2.41</b> · 2h ago by ci-bot</span>} />
              <Field label="Compared to" value="v2.40 · regression detected" />
            </FormRow>
            <FormRow>
              <Field label="Apdex target" value="≥ 0.85" />
              <Field label="Current Apdex" value={<span className="tone-crit"><b>0.62</b> · breaching</span>} />
            </FormRow>
          </FormSection>

          <FormSection id="trans" title="Slowest Transactions" badge="by total time" collapsed={collapsed.trans} onToggle={toggle}>
            <table className="sn-list-table">
              <thead><tr><th>Endpoint</th><th style={{width:90}}>Type</th><th style={{width:90}}>Calls/min</th><th style={{width:90}}>Avg</th><th style={{width:90}}>p95</th><th style={{width:90}}>Err %</th></tr></thead>
              <tbody>
                {([
                  ["POST /api/checkout","web",184,"418ms","842ms",2.14],
                  ["POST /api/payments/charge","web",92,"684ms","1.84s",4.82],
                  ["GET /api/orders/:id","web",684,"184ms","412ms",0.18],
                  ["Stripe::charge_card","background",94,"2.14s","2.84s",4.82],
                  ["POST /api/cart/items","web",1240,"92ms","184ms",0.02],
                  ["GET /api/inventory","web",420,"210ms","380ms",0.92],
                ] as [string, string, number, string, string, number][]).map((r,i) => (
                  <tr key={i}>
                    <td className="mono"><b>{r[0]}</b></td>
                    <td><span className={`sn-state-pill ${r[1]==="web"?"state-investigating":"state-neutral"}`}><i className="fa-solid fa-circle" /> {r[1]}</span></td>
                    <td className="mono">{r[2]}</td>
                    <td className="mono">{r[3]}</td>
                    <td className="mono">{r[4]}</td>
                    <td><span className={`mono ${r[5]>2?"tone-crit":r[5]>0.5?"tone-warn":"tone-ok"}`}><b>{r[5].toFixed(2)}%</b></span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </FormSection>

          <FormSection id="deploys" title="Recent Deployments" badge="4 in last 7d" collapsed={collapsed.deploys} onToggle={toggle}>
            <table className="sn-list-table">
              <thead><tr><th style={{width:80}}>Version</th><th>Author</th><th style={{width:110}}>When</th><th style={{width:90}}>Commits</th><th style={{width:110}}>RT Δ</th><th style={{width:110}}>Err Δ</th><th style={{width:130}}>Outcome</th></tr></thead>
              <tbody>
                {([
                  ["v2.41","ci-bot","2h ago",4,"+24%","+184%","regression"],
                  ["v2.40","marcus.o","5h ago",12,"-2%","-8%","improved"],
                  ["v2.39","ci-bot","1d ago",8,"+1%","0%","neutral"],
                  ["v2.38","priya.r","2d ago",32,"-18%","-42%","improved"],
                ] as [string, string, string, number, string, string, string][]).map((r,i) => (
                  <tr key={i}>
                    <td><a className="sn-link mono"><b>{r[0]}</b></a></td>
                    <td className="mono">{r[1]}</td>
                    <td className="text-mute">{r[2]}</td>
                    <td className="mono">{r[3]}</td>
                    <td className={`mono ${r[4].startsWith("+")?"tone-crit":"tone-ok"}`}><b>{r[4]}</b></td>
                    <td className={`mono ${r[5].startsWith("+") && r[5] !== "+0%" && r[5] !== "0%"?"tone-crit":r[5].startsWith("-")?"tone-ok":""}`}><b>{r[5]}</b></td>
                    <td><span className={`sn-state-pill ${r[6]==="regression"?"state-active":r[6]==="improved"?"svc-healthy":"state-neutral"}`}><i className="fa-solid fa-circle" /> {r[6]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </FormSection>

          <FormSection id="db" title="Database Operations" badge="top by time" collapsed={collapsed.db} onToggle={toggle}>
            <table className="sn-list-table">
              <thead><tr><th>Op</th><th>Table</th><th style={{width:90}}>Calls</th><th style={{width:90}}>Avg</th><th style={{width:90}}>p95</th><th style={{width:100}}>Status</th></tr></thead>
              <tbody>
                {[
                  ["SELECT","orders","12.4k","82ms","184ms","good"],
                  ["UPDATE","payments","1.8k","124ms","680ms","slow"],
                  ["INSERT","payment_events","1.2k","18ms","32ms","good"],
                  ["SELECT *","orders WHERE created_at > $1","412","842ms","2.14s","slow"],
                ].map((r,i) => (
                  <tr key={i}>
                    <td className="mono"><b>{r[0]}</b></td>
                    <td className="mono">{r[1]}</td>
                    <td className="mono">{r[2]}</td>
                    <td className={`mono ${r[5]==="slow"?"tone-crit":""}`}><b>{r[3]}</b></td>
                    <td className="mono">{r[4]}</td>
                    <td><span className={`sn-state-pill ${r[5]==="slow"?"state-active":"svc-healthy"}`}><i className="fa-solid fa-circle" /> {r[5]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </FormSection>
        </div>

        <aside className="sn-form-side">
          <div className="sn-side-card">
            <div className="sn-side-head">Service Owner</div>
            <div className="sn-side-body">
              <Field label="Team" value="SRE Platform" />
              <Field label="On-call" value={<UserById id="u1" />} />
              <Field label="Repo" value={<a className="sn-link mono">finspot/checkout-api</a>} />
              <Field label="Runbook" value={<a className="sn-link">KB-2114</a>} />
            </div>
          </div>
          <div className="sn-side-card">
            <div className="sn-side-head">Active Alerts <span className="sn-side-count">3</span></div>
            <div className="sn-side-body">
              {[
                ["Apdex below 0.7", "12m", "critical"],
                ["Error rate > 1%", "12m", "critical"],
                ["Stripe ext err > 5%", "10m", "critical"],
              ].map(([t, since, sev], i) => (
                <div key={i} className="sn-related-row">
                  <div>
                    <div className="sn-related-title">{t}</div>
                    <div className="sn-related-meta">triggered {since} ago</div>
                  </div>
                  <span className="sn-state-pill state-active"><i className="fa-solid fa-circle" /> {sev}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
