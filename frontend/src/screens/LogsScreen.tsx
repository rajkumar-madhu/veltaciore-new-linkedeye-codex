// Logs screen — ServiceNow form-style with query, facets, stream
// Ported from screens/logs.jsx.
import React from "react";
import { Kpi, FormSection, Field } from "@/components/primitives";

export default function LogsScreen() {
  const [q, setQ] = React.useState('service:checkout-api status:error @http.status_code:>=500');
  const [tab, setTab] = React.useState("stream");
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const toggle = (id: string) => setCollapsed(c => ({ ...c, [id]: !c[id] }));

  return (
    <div className="page page-fade sn-dash">
      <div className="sn-breadcrumb">
        <a className="sn-link">Home</a><span className="sn-bc-sep">›</span>
        <a className="sn-link">Observe</a><span className="sn-bc-sep">›</span>
        <span>Logs</span>
      </div>

      <div className="sn-form-header">
        <div className="sn-form-title-row">
          <span className="sn-rec-number">LOGS</span>
          <span className="sn-pill prio-1"><i className="fa-solid fa-circle" /> 184k events/sec</span>
          <span className="sn-pill state-progress"><i className="fa-solid fa-spinner fa-spin" /> live tailing</span>
          <span className="sn-pill state-neutral">14 sources · 2.8B / day</span>
        </div>
        <div className="sn-form-title-meta">
          <div>
            <h1>Log Stream</h1>
            <div className="sn-form-sub">Spike detected at 14:32 UTC · checkout flow degradation</div>
          </div>
          <div className="sn-form-actions">
            <button className="sn-btn"><i className="fa-solid fa-pause" /> Pause</button>
            <button className="sn-btn"><i className="fa-solid fa-bookmark" /> Save</button>
            <button className="sn-btn primary"><i className="fa-solid fa-bell" /> Alert on this</button>
          </div>
        </div>
      </div>

      <div className="sn-kpi-strip">
        <Kpi l="Total events" v="1.6M" s="last 1h" tone="neutral" />
        <Kpi l="Errors" v="184k" s="+1840% vs 1h" tone="crit" />
        <Kpi l="Warnings" v="84k" s="elevated" tone="warn" />
        <Kpi l="p95 latency" v="84ms" s="ingestion" tone="ok" />
        <Kpi l="Patterns" v="184" s="ML-clustered" tone="neutral" />
        <Kpi l="Saved metrics" v="12" s="active" tone="ok" />
      </div>

      <div className="sn-form-layout">
        <div className="sn-form-main">
          <FormSection id="query" title="Query" collapsed={collapsed.query} onToggle={toggle}>
            <div style={{ padding: "12px 14px" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", background: "#fafbfc", border: "1px solid #d2d6dc", borderRadius: 3, padding: "8px 12px" }}>
                <i className="fa-solid fa-magnifying-glass" style={{ color: "var(--fg-muted)" }} />
                <input className="mono" value={q} onChange={e => setQ(e.target.value)} style={{ flex: 1, border: 0, background: "transparent", outline: 0, fontSize: 12.5, color: "#000" }} />
                <button className="sn-btn primary">Run</button>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
                <span className="text-mute" style={{ fontSize: 11.5 }}>Quick filters:</span>
                {["status:error","status:warn","@duration:>1s","env:production","NOT @http.status_code:200"].map(s => (
                  <span key={s} className="sn-state-pill state-neutral" style={{ cursor: "pointer" }}><i className="fa-solid fa-circle" /> {s}</span>
                ))}
              </div>
            </div>
          </FormSection>

          <FormSection id="vol" title="Volume Histogram" badge="last 1h · stacked by level" collapsed={collapsed.vol} onToggle={toggle}>
            <div style={{ padding: "14px 14px" }}>
              <LogsHist />
              <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 11.5 }}>
                <span><i style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: "#ef4444", verticalAlign: "middle", marginRight: 4 }} />error</span>
                <span><i style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: "#f59e0b", verticalAlign: "middle", marginRight: 4 }} />warn</span>
                <span><i style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: "#3b82f6", verticalAlign: "middle", marginRight: 4 }} />info</span>
                <span><i style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: "#94a3b8", verticalAlign: "middle", marginRight: 4 }} />debug</span>
              </div>
            </div>
          </FormSection>

          <div className="sn-activity-section">
            <div className="sn-activity-tabs">
              {[["stream","Stream"],["patterns","Patterns"],["analytics","Analytics"]].map(([id,l]) => (
                <button key={id} className={`sn-act-tab${tab===id?" active":""}`} onClick={() => setTab(id)}>{l}</button>
              ))}
            </div>
            {tab === "stream" && (
              <div style={{ background: "#0b1220", color: "#e2e8f0", padding: 12, fontFamily: "var(--font-mono)", fontSize: 11.5, lineHeight: 1.65, overflowX: "auto" }}>
                {[
                  ["14:32:41.842","ERROR","payments-svc",'Stripe API timeout after 30000ms charge_id=ch_3OqLn82eZvKYlo2C user_id=u_184210'],
                  ["14:32:41.812","ERROR","checkout-api",'Failed to create order: timeout from payments-svc trace_id=4f2a8c91d3e7b612'],
                  ["14:32:41.798","WARN","checkout-api",'Retry 2/3 for downstream payments-svc backoff=2400ms'],
                  ["14:32:41.612","INFO","web-bff",'POST /api/checkout 502 user_id=u_184210 duration=30418ms'],
                  ["14:32:41.484","ERROR","payments-svc",'Connection pool exhausted: 0/64 available, 184 waiting'],
                  ["14:32:41.282","WARN","payments-svc",'High DB query latency p95=1842ms threshold=1000ms'],
                  ["14:32:41.184","INFO","auth-svc",'JWT verified user_id=u_184210 tier=enterprise'],
                  ["14:32:41.082","ERROR","checkout-api",'TimeoutError: Stripe API request exceeded 30s at lib/payments/stripe_client.rb:42'],
                  ["14:32:40.984","INFO","inventory-svc",'Reserved 1 unit of sku_18421 for order_842102'],
                  ["14:32:40.842","DEBUG","checkout-api",'Cache miss for key checkout:cart:u_184210 backing=redis'],
                ].map((l, i) => {
                  const c = l[1] === "ERROR" ? "#f87171" : l[1] === "WARN" ? "#fbbf24" : l[1] === "INFO" ? "#60a5fa" : "#94a3b8";
                  return (
                    <div key={i} style={{ display: "flex", gap: 10, padding: "3px 0" }}>
                      <span style={{ color: "#94a3b8" }}>{l[0]}</span>
                      <span style={{ color: c, fontWeight: 700, width: 50 }}>{l[1]}</span>
                      <span style={{ color: "#a78bfa", width: 130 }}>{l[2]}</span>
                      <span style={{ flex: 1, color: "#e2e8f0" }}>{l[3]}</span>
                    </div>
                  );
                })}
              </div>
            )}
            {tab === "patterns" && (
              <table className="sn-list-table">
                <thead><tr><th>Pattern</th><th style={{width:80}}>Level</th><th style={{width:120}}>Service</th><th style={{width:100}}>Count</th><th style={{width:100}}>Δ vs 1h</th></tr></thead>
                <tbody>
                  {([
                    ['Stripe API timeout after * charge_id=*',"ERROR","payments-svc",12842,"+1840%"],
                    ['Connection pool exhausted: */* available',"ERROR","payments-svc",4218,"+3380%"],
                    ['POST /api/checkout * duration=*ms',"INFO","web-bff",184212,"-37%"],
                    ['Circuit breaker OPEN for *',"WARN","web-bff",842,"+∞"],
                    ['Reserved * unit of * for order_*',"INFO","inventory-svc",24180,"+37%"],
                  ] as [string, string, string, number, string][]).map((r,i) => (
                    <tr key={i}>
                      <td className="mono">{r[0]}</td>
                      <td><span className={`sn-state-pill ${r[1]==="ERROR"?"state-active":r[1]==="WARN"?"state-mitigating":"state-investigating"}`}><i className="fa-solid fa-circle" /> {r[1]}</span></td>
                      <td className="mono">{r[2]}</td>
                      <td className="mono">{r[3].toLocaleString()}</td>
                      <td className={`mono ${r[4].startsWith("+")?"tone-crit":"tone-ok"}`}><b>{r[4]}</b></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {tab === "analytics" && (
              <div style={{ padding: 14, color: "var(--fg-muted)", fontSize: 12.5 }}>
                Top errors and latency breakdowns over 1h window. Drill into any cell to filter the stream.
              </div>
            )}
          </div>
        </div>

        <aside className="sn-form-side">
          <div className="sn-side-card">
            <div className="sn-side-head">Facets</div>
            <div className="sn-side-body">
              {[
                ["Status","error 184k · warn 84k · info 1.2M"],
                ["Service","checkout-api · payments-svc · inventory-svc · auth-svc"],
                ["Environment","production · staging · dev"],
                ["HTTP status","200 · 500 · 502 · 404 · 301"],
                ["Host","ip-10-0-3-12 · ip-10-0-3-18 · ip-10-0-2-44"],
              ].map(([k, v]) => <Field key={k} label={k} value={<span style={{ fontSize: 11.5 }} className="text-mute">{v}</span>} />)}
            </div>
          </div>
          <div className="sn-side-card">
            <div className="sn-side-head">Saved Queries <span className="sn-side-count">12</span></div>
            <div className="sn-side-body">
              {[
                ["payments.timeouts","412/min"],
                ["pool.exhaustion","184/min"],
                ["circuit.breaker.open","42/min"],
                ["slow.queries","48/min"],
              ].map(([n, r]) => (
                <div key={n} className="sn-related-row">
                  <div><div className="sn-related-title mono">{n}</div><div className="sn-related-meta">{r}</div></div>
                  <a className="sn-link"><i className="fa-solid fa-chart-line" /></a>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function LogsHist() {
  const W = 900, H = 140, P = 20, N = 60;
  const colors = ["#94a3b8","#3b82f6","#f59e0b","#ef4444"];
  const series = [
    Array.from({length:N}, (_,i) => 200 + 80*Math.sin(i*0.4) + (i>40?80:0)),
    Array.from({length:N}, (_,i) => 120 + 40*Math.sin(i*0.5+1)),
    Array.from({length:N}, (_,i) => 30 + 20*Math.sin(i*0.7+2) + (i>40 && i<48 ? 90 : 0)),
    Array.from({length:N}, (_,i) => 8 + 6*Math.sin(i*0.6+3) + (i>40 && i<50 ? 184 : 0)),
  ];
  const stacked: { lo: number; hi: number }[][] = [];
  for (let j=0;j<N;j++){let acc=0;stacked[j]=series.map(s=>{const lo=acc;acc+=s[j];return {lo,hi:acc};});}
  const max = Math.max(...stacked.map(c=>c[c.length-1].hi));
  const x = (i: number) => P + (i/N)*(W-2*P);
  const bw = (W-2*P)/N - 2;
  const y = (v: number) => H-P - (v/max)*(H-2*P);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:160,display:"block"}}>
      {[0.25,0.5,0.75,1].map((g,i) => <line key={i} x1={P} x2={W-P} y1={P+(1-g)*(H-2*P)} y2={P+(1-g)*(H-2*P)} stroke="#e5e8eb" strokeDasharray="2 4" />)}
      <line x1={x(44)} x2={x(44)} y1={P-4} y2={H-P} stroke="#ef4444" strokeDasharray="3 3" strokeWidth="1" />
      {stacked.map((c,i) => (
        <g key={i}>
          {c.map((s,k) => <rect key={k} x={x(i)} y={y(s.hi)} width={bw} height={Math.max(0.5, y(s.lo)-y(s.hi))} fill={colors[k]} />)}
        </g>
      ))}
    </svg>
  );
}
