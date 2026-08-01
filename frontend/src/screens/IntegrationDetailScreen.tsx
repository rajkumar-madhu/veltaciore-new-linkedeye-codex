// screens/integration-detail.jsx — Editable integration config + metrics
// Ported from screens/integration-detail.jsx.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { useUiStore } from "@/store/ui";
import { INTEGRATIONS } from "@/data/core";
import { Kpi, FormSection, FormRow, Field } from "@/components/primitives";

export default function IntegrationDetailScreen() {
  const { setRoute } = useNav();
  const integrationName = useUiStore((s) => s.params.integName as string | undefined);
  const integ = INTEGRATIONS.find(i => i.name === (integrationName || "Prometheus")) || INTEGRATIONS[0];
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const toggle = (id: string) => setCollapsed(c => ({ ...c, [id]: !c[id] }));

  const [authMode, setAuthMode] = React.useState("apikey");
  const [endpoint, setEndpoint] = React.useState(`https://${integ.name.toLowerCase().replace(/\s+/g, "-")}.finspot.in/api`);
  const [apiKey, setApiKey] = React.useState("vc_sk_live_8f3a2c1e9d7b4520");
  const [username, setUsername] = React.useState("svc-linkedeye");
  const [password, setPassword] = React.useState("");
  const [region, setRegion] = React.useState("us-east-1");
  const [scrapeInterval, setScrapeInterval] = React.useState(15);
  const [showKey, setShowKey] = React.useState(false);
  const [showPwd, setShowPwd] = React.useState(false);
  const [enabled, setEnabled] = React.useState(integ.connected);
  const [saved, setSaved] = React.useState(false);

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  const test = () => alert(`Test connection to ${integ.name}\n\nEndpoint: ${endpoint}\nAuth: ${authMode}\n\n✓ TCP reachable · 12ms\n✓ TLS verified\n✓ API auth ok (200)\n✓ Rate limit headroom: 96%\n\nConnection healthy.`);

  return (
    <div className="page page-fade sn-dash">
      <div className="sn-breadcrumb">
        <a className="sn-link">Home</a><span className="sn-bc-sep">›</span>
        <a className="sn-link" onClick={() => setRoute("integrations")}>Integrations</a><span className="sn-bc-sep">›</span>
        <span>{integ.name}</span>
      </div>

      <div className="sn-form-header">
        <div className="sn-form-title-row">
          <span className="sn-rec-number">{integ.name.toUpperCase().replace(/\s+/g, "-")}</span>
          {enabled
            ? <span className="sn-pill svc-healthy"><i className="fa-solid fa-circle" /> Connected</span>
            : <span className="sn-pill state-mitigating"><i className="fa-solid fa-circle" /> Disabled</span>}
          <span className="sn-pill state-neutral"><i className={integ.icon} /> {integ.category}</span>
          {saved && <span className="sn-pill svc-healthy" style={{ animation: "pulse 1s" }}><i className="fa-solid fa-check" /> Saved</span>}
        </div>
        <div className="sn-form-title-meta">
          <div>
            <h1>{integ.name} Integration</h1>
            <div className="sn-form-sub">{integ.meta} · last test 12s ago · region {region}</div>
          </div>
          <div className="sn-form-actions">
            <button className="sn-btn" onClick={() => setRoute("integrations")}><i className="fa-solid fa-arrow-left" /> Back</button>
            <button className="sn-btn" onClick={test}><i className="fa-solid fa-vial" /> Test Connection</button>
            <button className="sn-btn"><i className="fa-solid fa-trash" /> Disconnect</button>
            <button className="sn-btn primary" onClick={save}><i className="fa-solid fa-floppy-disk" /> Save Changes</button>
          </div>
        </div>
      </div>

      <div className="sn-kpi-strip">
        <Kpi l="API calls (24h)" v="184k" s="+12% vs avg" tone="neutral" />
        <Kpi l="Error rate" v="0.04%" s="74 of 184k" tone="ok" />
        <Kpi l="P50 latency" v="42ms" s="endpoint healthy" tone="ok" />
        <Kpi l="P95 latency" v="184ms" s="within SLO" tone="ok" />
        <Kpi l="Last sync" v="12s" s="ago · auto" tone="ok" />
        <Kpi l="Rate limit" v="96%" s="headroom remaining" tone="ok" />
      </div>

      <div className="sn-form-layout">
        <div className="sn-form-main">
          {/* CONFIG SECTION — EDITABLE */}
          <FormSection id="config" title="Connection Configuration" badge="editable" collapsed={collapsed.config} onToggle={toggle}>
            <div className="sn-kind-hint"><i className="fa-solid fa-pen" /> All fields below are editable — change any value and click <b>Save Changes</b> to apply.</div>
            <FormRow>
              <Field label="Enabled" value={
                <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12.5 }}>
                  <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} style={{ width: 14, height: 14 }} />
                  {enabled ? <span className="tone-ok"><b>Active</b></span> : <span className="text-mute">Disabled</span>}
                </label>
              } required />
              <Field label="Display name" value={<input className="select" defaultValue={integ.name} style={{ width: "100%" }} />} required />
            </FormRow>
            <FormRow>
              <Field label="Endpoint URL" value={<input className="select" value={endpoint} onChange={e => setEndpoint(e.target.value)} placeholder="https://api.example.com" style={{ width: "100%", fontFamily: "var(--font-mono)" }} />} required />
              <Field label="Region" value={
                <select className="select" value={region} onChange={e => setRegion(e.target.value)}>
                  <option>us-east-1</option><option>us-west-2</option><option>eu-west-1</option><option>ap-south-1</option>
                </select>
              } />
            </FormRow>
            <FormRow>
              <Field label="Auth method" value={
                <select className="select" value={authMode} onChange={e => setAuthMode(e.target.value)}>
                  <option value="apikey">API Key</option>
                  <option value="basic">Username + Password</option>
                  <option value="oauth">OAuth 2.0</option>
                  <option value="bearer">Bearer Token</option>
                  <option value="mtls">mTLS Certificate</option>
                </select>
              } required />
              <Field label="Verify TLS" value={
                <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>
                  <input type="checkbox" defaultChecked /> Strict certificate validation
                </label>
              } />
            </FormRow>

            {authMode === "apikey" && (
              <FormRow>
                <Field label="API Key" value={
                  <div style={{ display: "flex", gap: 6, width: "100%" }}>
                    <input className="select" type={showKey ? "text" : "password"} value={apiKey} onChange={e => setApiKey(e.target.value)} style={{ flex: 1, fontFamily: "var(--font-mono)" }} placeholder="vc_sk_live_..." />
                    <button className="sn-btn" onClick={() => setShowKey(s => !s)} title={showKey ? "Hide" : "Show"}><i className={`fa-solid ${showKey ? "fa-eye-slash" : "fa-eye"}`} /></button>
                    <button className="sn-btn" title="Rotate"><i className="fa-solid fa-rotate" /></button>
                    <button className="sn-btn" title="Copy"><i className="fa-solid fa-copy" /></button>
                  </div>
                } required />
                <Field label="Key scope" value={
                  <select className="select"><option>Read + Write</option><option>Read only</option><option>Write only · webhooks</option></select>
                } />
              </FormRow>
            )}

            {authMode === "basic" && (
              <FormRow>
                <Field label="Username" value={
                  <input className="select" value={username} onChange={e => setUsername(e.target.value)} style={{ width: "100%", fontFamily: "var(--font-mono)" }} placeholder="service-account-name" />
                } required />
                <Field label="Password" value={
                  <div style={{ display: "flex", gap: 6, width: "100%" }}>
                    <input className="select" type={showPwd ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} style={{ flex: 1, fontFamily: "var(--font-mono)" }} placeholder="••••••••••••" />
                    <button className="sn-btn" onClick={() => setShowPwd(s => !s)}><i className={`fa-solid ${showPwd ? "fa-eye-slash" : "fa-eye"}`} /></button>
                  </div>
                } required />
              </FormRow>
            )}

            {authMode === "oauth" && (
              <>
                <FormRow>
                  <Field label="Client ID" value={<input className="select" defaultValue="le-oauth-client-984af" style={{ width: "100%", fontFamily: "var(--font-mono)" }} />} required />
                  <Field label="Client Secret" value={<input className="select" type="password" defaultValue="•••••••••••••••" style={{ width: "100%", fontFamily: "var(--font-mono)" }} />} required />
                </FormRow>
                <FormRow>
                  <Field label="Authorization URL" value={<input className="select" defaultValue="https://idp.example.com/oauth/authorize" style={{ width: "100%", fontFamily: "var(--font-mono)" }} />} />
                  <Field label="Token URL" value={<input className="select" defaultValue="https://idp.example.com/oauth/token" style={{ width: "100%", fontFamily: "var(--font-mono)" }} />} />
                </FormRow>
              </>
            )}

            {authMode === "bearer" && (
              <FormRow>
                <Field label="Bearer Token" value={
                  <div style={{ display: "flex", gap: 6, width: "100%" }}>
                    <input className="select" type={showKey ? "text" : "password"} defaultValue="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." style={{ flex: 1, fontFamily: "var(--font-mono)" }} />
                    <button className="sn-btn" onClick={() => setShowKey(s => !s)}><i className={`fa-solid ${showKey ? "fa-eye-slash" : "fa-eye"}`} /></button>
                  </div>
                } required />
                <Field label="Refresh token" value={<input className="select" type="password" defaultValue="refresh_•••••" style={{ width: "100%", fontFamily: "var(--font-mono)" }} />} />
              </FormRow>
            )}

            {authMode === "mtls" && (
              <FormRow>
                <Field label="Client cert" value={<button className="sn-btn" style={{ width: "100%" }}><i className="fa-solid fa-file-arrow-up" /> Upload client.crt</button>} required />
                <Field label="Private key" value={<button className="sn-btn" style={{ width: "100%" }}><i className="fa-solid fa-file-arrow-up" /> Upload client.key</button>} required />
              </FormRow>
            )}

            <FormRow>
              <Field label="Scrape interval" value={
                <div style={{ display: "flex", gap: 6, alignItems: "center", width: "100%" }}>
                  <input className="select" type="number" min="5" max="300" value={scrapeInterval} onChange={e => setScrapeInterval(parseInt(e.target.value) || 15)} style={{ width: 80 }} />
                  <span className="text-mute">seconds</span>
                </div>
              } />
              <Field label="Timeout" value={<input className="select" type="number" defaultValue="10" style={{ width: 80 }} />} />
            </FormRow>
            <FormRow>
              <Field label="Retry policy" value={<select className="select"><option>Exponential backoff · max 5</option><option>Fixed · 3 retries</option><option>None</option></select>} />
              <Field label="Proxy" value={<input className="select" placeholder="https://proxy.internal:8080 (optional)" style={{ width: "100%", fontFamily: "var(--font-mono)" }} />} />
            </FormRow>
          </FormSection>

          {/* METRICS SECTION */}
          <FormSection id="metrics" title="Live Metrics" badge="last 1h" collapsed={collapsed.metrics} onToggle={toggle}>
            <div style={{ padding: 14 }}>
              <IntegrationMetricsChart />
              <div className="row row-16" style={{ marginTop: 12, fontSize: 11.5, gap: 18, flexWrap: "wrap" }}>
                <span><i style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: "#2563eb", marginRight: 6, verticalAlign: "middle" }} /> API calls (k/min)</span>
                <span><i style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: "#10b981", marginRight: 6, verticalAlign: "middle" }} /> Success</span>
                <span><i style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: "#ef4444", marginRight: 6, verticalAlign: "middle" }} /> Errors</span>
                <span><i style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: "#f59e0b", marginRight: 6, verticalAlign: "middle" }} /> Latency p95 (ms)</span>
              </div>
            </div>
          </FormSection>

          {/* METRICS TABLE */}
          <FormSection id="table" title="Endpoint Metrics" badge="per route · last 1h" collapsed={collapsed.table} onToggle={toggle}>
            <table className="sn-list-table">
              <thead>
                <tr>
                  <th>Endpoint</th>
                  <th style={{width:80}}>Method</th>
                  <th style={{width:90}}>Calls</th>
                  <th style={{width:90}}>2xx</th>
                  <th style={{width:90}}>4xx</th>
                  <th style={{width:90}}>5xx</th>
                  <th style={{width:90}}>p50</th>
                  <th style={{width:90}}>p95</th>
                  <th style={{width:120}}>Status</th>
                </tr>
              </thead>
              <tbody>
                {([
                  ["/api/v1/query","GET",84120,99.96,0.04,0.0,18,84,"ok"],
                  ["/api/v1/query_range","GET",42380,99.92,0.08,0.0,42,184,"ok"],
                  ["/api/v1/alerts","GET",12840,100,0,0,8,24,"ok"],
                  ["/api/v1/series","GET",8420,99.84,0.16,0.0,184,684,"warn"],
                  ["/api/v1/write","POST",184212,99.98,0,0.02,12,48,"ok"],
                  ["/api/v1/labels","GET",2412,100,0,0,4,12,"ok"],
                ] as [string, string, number, number, number, number, number, number, string][]).map((r, i) => (
                  <tr key={i}>
                    <td className="mono"><b>{r[0]}</b></td>
                    <td><span className={`sn-state-pill ${r[1] === "GET" ? "state-investigating" : "state-mitigating"}`}><i className="fa-solid fa-circle" /> {r[1]}</span></td>
                    <td className="mono">{r[2].toLocaleString()}</td>
                    <td className="mono tone-ok"><b>{r[3]}%</b></td>
                    <td className={`mono ${r[4] > 0.5 ? "tone-warn" : ""}`}>{r[4]}%</td>
                    <td className={`mono ${r[5] > 0 ? "tone-crit" : ""}`}>{r[5]}%</td>
                    <td className="mono">{r[6]}ms</td>
                    <td className={`mono ${r[7] > 500 ? "tone-warn" : ""}`}>{r[7]}ms</td>
                    <td><span className={`sn-state-pill ${r[8] === "ok" ? "svc-healthy" : "state-mitigating"}`}><i className="fa-solid fa-circle" /> {r[8] === "ok" ? "healthy" : "elevated"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </FormSection>

          {/* WEBHOOKS */}
          <FormSection id="hooks" title="Webhooks · Subscriptions" badge="3 active" collapsed={collapsed.hooks} onToggle={toggle}>
            <table className="sn-list-table">
              <tbody>
                {[
                  ["incident.declared","https://hooks.example.com/le/inc","ok","12s ago"],
                  ["change.approved","https://ci.example.com/webhooks/le","ok","2m ago"],
                  ["alert.resolved","https://chatops.example.com/le","warn","8h ago · 2 retries"],
                ].map((r, i) => (
                  <tr key={i}>
                    <td style={{ width: 200 }}><b className="mono">{r[0]}</b></td>
                    <td className="mono" style={{ fontSize: 11.5 }}>{r[1]}</td>
                    <td style={{ width: 130 }}><span className={`sn-state-pill ${r[2] === "ok" ? "svc-healthy" : "state-mitigating"}`}><i className="fa-solid fa-circle" /> {r[2]}</span></td>
                    <td style={{ width: 130 }} className="text-mute mono">{r[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </FormSection>
        </div>

        <aside className="sn-form-side">
          <div className="sn-side-card">
            <div className="sn-side-head">Quick Stats</div>
            <div className="sn-side-body">
              <Field label="Status" value={enabled ? <span className="sn-state-pill svc-healthy"><i className="fa-solid fa-circle" /> Connected</span> : <span className="sn-state-pill state-mitigating"><i className="fa-solid fa-circle" /> Disabled</span>} />
              <Field label="Calls (24h)" value={<span className="mono"><b>184k</b></span>} />
              <Field label="Error rate" value={<span className="tone-ok"><b>0.04%</b></span>} />
              <Field label="p95 latency" value={<span className="mono">184ms</span>} />
              <Field label="Last test" value="12s ago" />
              <Field label="Connected since" value="Mar 12, 2024" />
            </div>
          </div>

          <div className="sn-side-card">
            <div className="sn-side-head">Auth Activity</div>
            <div className="sn-side-body">
              <Field label="Key rotated" value="14d ago" />
              <Field label="Next rotation" value={<span className="tone-warn">in 16d</span>} />
              <Field label="Failed auth (24h)" value={<span className="tone-ok">0</span>} />
              <Field label="Token expires" value="Sep 12, 2026" />
            </div>
          </div>

          <div className="sn-side-card">
            <div className="sn-side-head">Permissions</div>
            <div className="sn-side-body">
              {([
                ["read.metrics", true],
                ["write.alerts", true],
                ["read.logs", true],
                ["admin.config", false],
                ["delete.data", false],
              ] as [string, boolean][]).map(([k, on], i) => (
                <div key={i} className="sn-related-row">
                  <div><div className="sn-related-title mono">{k}</div></div>
                  <span className={`sn-state-pill ${on ? "svc-healthy" : "state-neutral"}`}><i className="fa-solid fa-circle" /> {on ? "granted" : "off"}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="sn-side-card">
            <div className="sn-side-head">Activity Log</div>
            <div className="sn-side-body">
              {[
                ["API key tested", "12s ago", "ok"],
                ["Config updated", "2h ago", "ok"],
                ["Scrape interval changed", "1d ago", "ok"],
                ["Key rotated", "14d ago", "ok"],
              ].map((r, i) => (
                <div key={i} className="sn-related-row">
                  <div><div className="sn-related-title">{r[0]}</div><div className="sn-related-meta">{r[1]}</div></div>
                  <span className="sn-state-pill svc-healthy"><i className="fa-solid fa-circle" /> {r[2]}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function IntegrationMetricsChart() {
  const W = 880, H = 200, P = 30;
  const N = 60;
  const series = [
    { c: "#2563eb", fn: (i: number) => 120 + 30 * Math.sin(i*0.3) + 8 * Math.sin(i*1.7) },
    { c: "#10b981", fn: (i: number) => 118 + 28 * Math.sin(i*0.3) + 6 * Math.sin(i*1.5) },
    { c: "#ef4444", fn: (i: number) => 2 + Math.sin(i*0.4) + (i > 45 && i < 50 ? 8 : 0) },
    { c: "#f59e0b", fn: (i: number) => 40 + 12 * Math.sin(i*0.4 + 1) + (i > 42 && i < 50 ? 30 : 0) },
  ];
  const data = series.map(s => Array.from({ length: N }, (_, i) => Math.max(0, s.fn(i))));
  const max = Math.max(...data.flat()) * 1.15;
  const x = (i: number) => P + (i / (N - 1)) * (W - 2 * P);
  const y = (v: number) => H - P - (v / max) * (H - 2 * P);
  const path = (arr: number[]) => arr.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = (arr: number[]) => path(arr) + ` L ${x(N-1)} ${H-P} L ${x(0)} ${H-P} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 200, display: "block", background: "#fafbfc", borderRadius: 3 }}>
      <defs>
        {series.map((s, i) => (
          <linearGradient key={i} id={`igrad${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={s.c} stopOpacity="0.18" />
            <stop offset="100%" stopColor={s.c} stopOpacity="0" />
          </linearGradient>
        ))}
      </defs>
      {[0.25, 0.5, 0.75, 1].map((g, i) => (
        <g key={i}>
          <line x1={P} x2={W - P} y1={P + g * (H - 2 * P)} y2={P + g * (H - 2 * P)} stroke="#e5e8eb" strokeDasharray="2 4" />
          <text x={P - 6} y={P + g * (H - 2 * P) + 4} fontSize="9" fill="#94a3b8" textAnchor="end">{Math.round((1 - g) * max)}</text>
        </g>
      ))}
      {data.map((arr, i) => <path key={`a${i}`} d={area(arr)} fill={`url(#igrad${i})`} />)}
      {data.map((arr, i) => <path key={`l${i}`} d={path(arr)} fill="none" stroke={series[i].c} strokeWidth="1.6" />)}
      {[0, 15, 30, 45, 59].map(i => (
        <text key={i} x={x(i)} y={H - P + 14} fontSize="9.5" fill="#94a3b8" textAnchor="middle" fontFamily="var(--font-mono)">{i === 59 ? "now" : `-${60 - i}m`}</text>
      ))}
    </svg>
  );
}
