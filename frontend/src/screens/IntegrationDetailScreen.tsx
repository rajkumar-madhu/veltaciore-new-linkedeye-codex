// Integration detail — LinkedEye entity layout: header with actions, the
// editable connection form (credentials always masked, never pre-filled) and
// a rail with the current configuration. Traffic metrics, endpoint stats,
// webhooks and permissions have no backend yet and are labelled sample data.
import React from "react";
import "@/styles/admin.css";
import { useNav } from "@/hooks/useNav";
import { useUiStore } from "@/store/ui";
import { INTEGRATIONS } from "@/data/core";
import { Panel, Pill } from "@/components/ld";

import { Icon } from "@/components/Icon";
import { ArrowLeftIcon, CheckIcon, ChevronRightIcon, RefreshCwIcon, SaveIcon, TestTubeIcon, Trash2Icon } from "lucide-react";
const AUTH_LABEL: Record<string, string> = {
  apikey: "API Key",
  basic: "Username + Password",
  oauth: "OAuth 2.0",
  bearer: "Bearer Token",
  mtls: "mTLS Certificate",
};
const STORED = "Stored — enter a new value to replace";

function SampleTag() {
  return <Pill tone="muted">Sample data</Pill>;
}

export default function IntegrationDetailScreen() {
  const { setRoute } = useNav();
  const integrationName = useUiStore((s) => s.params.integName as string | undefined);
  const integ = INTEGRATIONS.find(i => i.name === (integrationName || "Prometheus")) || INTEGRATIONS[0];

  const [authMode, setAuthMode] = React.useState("apikey");
  const [endpoint, setEndpoint] = React.useState(`https://${integ.name.toLowerCase().replace(/\s+/g, "-")}.finspot.in/api`);
  const [apiKey, setApiKey] = React.useState("");
  const [username, setUsername] = React.useState("svc-linkedeye");
  const [password, setPassword] = React.useState("");
  const [region, setRegion] = React.useState("us-east-1");
  const [scrapeInterval, setScrapeInterval] = React.useState(15);
  const [enabled, setEnabled] = React.useState(integ.connected);
  const [saved, setSaved] = React.useState(false);

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  const test = () => alert(`Test connection to ${integ.name}\n\nEndpoint: ${endpoint}\nAuth: ${AUTH_LABEL[authMode] ?? authMode}\n\nConnection testing is not wired to the backend yet — no request was sent.`);

  return (
    <div className="ld-dash">
      <nav className="ld-crumbs" aria-label="Breadcrumb">
        <button type="button" className="ld-link" onClick={() => setRoute("dashboard")}>Home</button>
        <Icon icon={ChevronRightIcon} />
        <button type="button" className="ld-link" onClick={() => setRoute("integrations")}>Integrations</button>
        <Icon icon={ChevronRightIcon} />
        <span>{integ.name}</span>
      </nav>

      <div className="ld-head ld-entity-head">
        <div className="ld-entity">
          <span className="ld-tile ld-info" aria-hidden="true"><Icon className={integ.icon} /></span>
          <div>
            <h1 className="ld-entity-title">
              {integ.name} Integration
              {enabled ? <Pill tone="ok"><span className="ld-pill-dot" />Connected</Pill> : <Pill tone="warn"><span className="ld-pill-dot" />Disabled</Pill>}
            </h1>
            <p className="ld-entity-meta ld-muted"><span>{integ.meta}</span><span>Region {region}</span></p>
          </div>
        </div>
        <div className="ld-head-side">
          <div className="ld-head-actions">
            <span role="status" className="ld-admin-status">{saved && <><Icon icon={CheckIcon} className="ld-text-ok" /> Saved</>}</span>
            <button type="button" className="ld-btn" onClick={() => setRoute("integrations")}><Icon icon={ArrowLeftIcon} /> Back</button>
            <button type="button" className="ld-btn" onClick={test}><Icon icon={TestTubeIcon} /> Test Connection</button>
            <button type="button" className="ld-btn"><Icon icon={Trash2Icon} /> Disconnect</button>
            <button type="button" className="ld-btn ld-btn-primary" onClick={save}><Icon icon={SaveIcon} /> Save Changes</button>
          </div>
          <ul className="ld-tags">
            <li className="ld-tag"><Icon className={integ.icon} /> {integ.category}</li>
          </ul>
        </div>
      </div>

      <div className="ld-split">
        <div className="ld-rail">
          <section className="ld-card ld-panel" aria-labelledby="ic-config-h">
            <div className="ld-panel-head">
              <h2 id="ic-config-h">Connection Configuration</h2>
              <span className="ld-muted ld-small">Edit any value, then Save Changes</span>
            </div>
            <form className="ld-form" onSubmit={(e) => { e.preventDefault(); save(); }}>
              <div className="ld-admin-form-grid">
                <div className="ld-admin-switch-row">
                  <button type="button" id="ic-enabled" role="switch" aria-checked={enabled} className="ld-admin-switch" onClick={() => setEnabled(v => !v)} />
                  <label htmlFor="ic-enabled">{enabled ? "Enabled" : "Disabled"}</label>
                </div>
                <div className="ld-form-field">
                  <label htmlFor="ic-name">Display name <span className="ld-req">*</span></label>
                  <input id="ic-name" className="ld-input" defaultValue={integ.name} />
                </div>
                <div className="ld-form-field">
                  <label htmlFor="ic-endpoint">Endpoint URL <span className="ld-req">*</span></label>
                  <input id="ic-endpoint" className="ld-input ld-mono" value={endpoint} onChange={e => setEndpoint(e.target.value)} placeholder="https://api.example.com" />
                </div>
                <div className="ld-form-field">
                  <label htmlFor="ic-region">Region</label>
                  <select id="ic-region" className="ld-select" value={region} onChange={e => setRegion(e.target.value)}>
                    <option>us-east-1</option><option>us-west-2</option><option>eu-west-1</option><option>ap-south-1</option>
                  </select>
                </div>
                <div className="ld-form-field">
                  <label htmlFor="ic-auth">Auth method <span className="ld-req">*</span></label>
                  <select id="ic-auth" className="ld-select" value={authMode} onChange={e => setAuthMode(e.target.value)}>
                    <option value="apikey">API Key</option>
                    <option value="basic">Username + Password</option>
                    <option value="oauth">OAuth 2.0</option>
                    <option value="bearer">Bearer Token</option>
                    <option value="mtls">mTLS Certificate</option>
                  </select>
                </div>
                <label className="ld-admin-check" htmlFor="ic-tls">
                  <input id="ic-tls" type="checkbox" defaultChecked /> Strict TLS certificate validation
                </label>

                {authMode === "apikey" && (
                  <>
                    <div className="ld-form-field">
                      <label htmlFor="ic-key">API key <span className="ld-req">*</span></label>
                      <span className="ld-admin-input-row">
                        <input id="ic-key" className="ld-input ld-mono" type="password" autoComplete="new-password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder={STORED} />
                        <button type="button" className="ld-btn" aria-label="Rotate API key" title="Rotate"><Icon icon={RefreshCwIcon} /></button>
                      </span>
                    </div>
                    <div className="ld-form-field">
                      <label htmlFor="ic-scope">Key scope</label>
                      <select id="ic-scope" className="ld-select"><option>Read + Write</option><option>Read only</option><option>Write only · webhooks</option></select>
                    </div>
                  </>
                )}

                {authMode === "basic" && (
                  <>
                    <div className="ld-form-field">
                      <label htmlFor="ic-user">Username <span className="ld-req">*</span></label>
                      <input id="ic-user" className="ld-input ld-mono" value={username} onChange={e => setUsername(e.target.value)} placeholder="service-account-name" />
                    </div>
                    <div className="ld-form-field">
                      <label htmlFor="ic-pwd">Password <span className="ld-req">*</span></label>
                      <input id="ic-pwd" className="ld-input ld-mono" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} placeholder={STORED} />
                    </div>
                  </>
                )}

                {authMode === "oauth" && (
                  <>
                    <div className="ld-form-field">
                      <label htmlFor="ic-cid">Client ID <span className="ld-req">*</span></label>
                      <input id="ic-cid" className="ld-input ld-mono" defaultValue="le-oauth-client-984af" />
                    </div>
                    <div className="ld-form-field">
                      <label htmlFor="ic-csecret">Client secret <span className="ld-req">*</span></label>
                      <input id="ic-csecret" className="ld-input ld-mono" type="password" autoComplete="new-password" placeholder={STORED} />
                    </div>
                    <div className="ld-form-field">
                      <label htmlFor="ic-authurl">Authorization URL</label>
                      <input id="ic-authurl" className="ld-input ld-mono" defaultValue="https://idp.example.com/oauth/authorize" />
                    </div>
                    <div className="ld-form-field">
                      <label htmlFor="ic-tokenurl">Token URL</label>
                      <input id="ic-tokenurl" className="ld-input ld-mono" defaultValue="https://idp.example.com/oauth/token" />
                    </div>
                  </>
                )}

                {authMode === "bearer" && (
                  <>
                    <div className="ld-form-field">
                      <label htmlFor="ic-bearer">Bearer token <span className="ld-req">*</span></label>
                      <input id="ic-bearer" className="ld-input ld-mono" type="password" autoComplete="new-password" placeholder={STORED} />
                    </div>
                    <div className="ld-form-field">
                      <label htmlFor="ic-refresh">Refresh token</label>
                      <input id="ic-refresh" className="ld-input ld-mono" type="password" autoComplete="new-password" placeholder={STORED} />
                    </div>
                  </>
                )}

                {authMode === "mtls" && (
                  <>
                    <div className="ld-form-field">
                      <label htmlFor="ic-cert">Client certificate <span className="ld-req">*</span></label>
                      <input id="ic-cert" className="ld-input" type="file" accept=".crt,.pem" />
                    </div>
                    <div className="ld-form-field">
                      <label htmlFor="ic-pkey">Private key <span className="ld-req">*</span></label>
                      <input id="ic-pkey" className="ld-input" type="file" accept=".key,.pem" />
                    </div>
                  </>
                )}

                <div className="ld-form-field">
                  <label htmlFor="ic-interval">Scrape interval (seconds)</label>
                  <input id="ic-interval" className="ld-input ld-admin-input-sm" type="number" min="5" max="300" value={scrapeInterval} onChange={e => setScrapeInterval(parseInt(e.target.value) || 15)} />
                </div>
                <div className="ld-form-field">
                  <label htmlFor="ic-timeout">Timeout (seconds)</label>
                  <input id="ic-timeout" className="ld-input ld-admin-input-sm" type="number" defaultValue="10" />
                </div>
                <div className="ld-form-field">
                  <label htmlFor="ic-retry">Retry policy</label>
                  <select id="ic-retry" className="ld-select"><option>Exponential backoff · max 5</option><option>Fixed · 3 retries</option><option>None</option></select>
                </div>
                <div className="ld-form-field">
                  <label htmlFor="ic-proxy">Proxy</label>
                  <input id="ic-proxy" className="ld-input ld-mono" placeholder="https://proxy.internal:8080 (optional)" />
                </div>
              </div>
              <div className="ld-admin-actions">
                <span className="ld-admin-hint ld-admin-status">Secrets are write-only and never shown after saving.</span>
                <button type="submit" className="ld-btn ld-btn-primary"><Icon icon={SaveIcon} /> Save Changes</button>
              </div>
            </form>
          </section>

          <section className="ld-card ld-panel" aria-labelledby="ic-metrics-h">
            <div className="ld-panel-head">
              <h2 id="ic-metrics-h">Traffic · last 1h</h2>
              <SampleTag />
            </div>
            <IntegrationMetricsChart />
            <ul className="ld-legend ld-legend-inline">
              {SERIES.map(s => (
                <li key={s.label}><span className="ld-swatch" style={{ background: s.c }} /><span className="ld-legend-label">{s.label}</span></li>
              ))}
            </ul>
          </section>

          <section className="ld-card ld-panel" aria-labelledby="ic-ep-h">
            <div className="ld-panel-head">
              <h2 id="ic-ep-h">Endpoint Metrics</h2>
              <span className="ld-admin-head-tags"><SampleTag /><span className="ld-muted ld-small">per route · last 1h</span></span>
            </div>
            <div className="ld-table-wrap">
              <table className="ld-table">
                <thead>
                  <tr>
                    <th scope="col">Endpoint</th>
                    <th scope="col">Method</th>
                    <th scope="col">Calls</th>
                    <th scope="col">2xx</th>
                    <th scope="col">4xx</th>
                    <th scope="col">5xx</th>
                    <th scope="col">p50</th>
                    <th scope="col">p95</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {SAMPLE_ENDPOINTS.map((r) => (
                    <tr key={r[0] + r[1]}>
                      <td className="ld-mono ld-strong">{r[0]}</td>
                      <td><Pill tone={r[1] === "GET" ? "info" : "warn"}>{r[1]}</Pill></td>
                      <td className="ld-mono">{r[2].toLocaleString()}</td>
                      <td className="ld-mono ld-text-ok">{r[3]}%</td>
                      <td className={`ld-mono${r[4] > 0.5 ? " ld-text-warn" : ""}`}>{r[4]}%</td>
                      <td className={`ld-mono${r[5] > 0 ? " ld-text-crit" : ""}`}>{r[5]}%</td>
                      <td className="ld-mono">{r[6]}ms</td>
                      <td className={`ld-mono${r[7] > 500 ? " ld-text-warn" : ""}`}>{r[7]}ms</td>
                      <td><Pill tone={r[8] === "ok" ? "ok" : "warn"}><span className="ld-pill-dot" />{r[8] === "ok" ? "healthy" : "elevated"}</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="ld-card ld-panel" aria-labelledby="ic-hooks-h">
            <div className="ld-panel-head">
              <h2 id="ic-hooks-h">Webhook Subscriptions</h2>
              <SampleTag />
            </div>
            <div className="ld-table-wrap">
              <table className="ld-table">
                <thead>
                  <tr><th scope="col">Event</th><th scope="col">Target</th><th scope="col">Status</th><th scope="col">Last delivery</th></tr>
                </thead>
                <tbody>
                  {SAMPLE_HOOKS.map((r) => (
                    <tr key={r[0]}>
                      <td className="ld-mono ld-strong">{r[0]}</td>
                      <td className="ld-mono">{r[1]}</td>
                      <td><Pill tone={r[2] === "ok" ? "ok" : "warn"}><span className="ld-pill-dot" />{r[2]}</Pill></td>
                      <td className="ld-muted">{r[3]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="ld-rail">
          <Panel title="Current Configuration">
            <dl className="ld-dl">
              <dt>Status</dt><dd>{enabled ? <Pill tone="ok"><span className="ld-pill-dot" />Connected</Pill> : <Pill tone="warn"><span className="ld-pill-dot" />Disabled</Pill>}</dd>
              <dt>Category</dt><dd>{integ.category}</dd>
              <dt>Auth method</dt><dd>{AUTH_LABEL[authMode] ?? authMode}</dd>
              <dt>Region</dt><dd className="ld-mono">{region}</dd>
              <dt>Scrape interval</dt><dd>{scrapeInterval}s</dd>
              <dt>Endpoint</dt><dd className="ld-mono">{endpoint}</dd>
            </dl>
          </Panel>

          <section className="ld-card ld-panel" aria-labelledby="ic-perm-h">
            <div className="ld-panel-head">
              <h2 id="ic-perm-h">Permissions</h2>
              <SampleTag />
            </div>
            <ul className="ld-activity">
              {SAMPLE_PERMS.map(([k, on]) => (
                <li key={k}>
                  <span className="ld-activity-text ld-mono">{k}</span>
                  <Pill tone={on ? "ok" : "muted"}>{on ? "granted" : "off"}</Pill>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

const SAMPLE_ENDPOINTS: [string, string, number, number, number, number, number, number, string][] = [
  ["/api/v1/query", "GET", 84120, 99.96, 0.04, 0.0, 18, 84, "ok"],
  ["/api/v1/query_range", "GET", 42380, 99.92, 0.08, 0.0, 42, 184, "ok"],
  ["/api/v1/alerts", "GET", 12840, 100, 0, 0, 8, 24, "ok"],
  ["/api/v1/series", "GET", 8420, 99.84, 0.16, 0.0, 184, 684, "warn"],
  ["/api/v1/write", "POST", 184212, 99.98, 0, 0.02, 12, 48, "ok"],
  ["/api/v1/labels", "GET", 2412, 100, 0, 0, 4, 12, "ok"],
];

const SAMPLE_HOOKS: [string, string, string, string][] = [
  ["incident.declared", "https://hooks.example.com/le/inc", "ok", "12s ago"],
  ["change.approved", "https://ci.example.com/webhooks/le", "ok", "2m ago"],
  ["alert.resolved", "https://chatops.example.com/le", "warn", "8h ago · 2 retries"],
];

const SAMPLE_PERMS: [string, boolean][] = [
  ["read.metrics", true],
  ["write.alerts", true],
  ["read.logs", true],
  ["admin.config", false],
  ["delete.data", false],
];

const SERIES = [
  { label: "API calls (k/min)", c: "#2563eb", fn: (i: number) => 120 + 30 * Math.sin(i * 0.3) + 8 * Math.sin(i * 1.7) },
  { label: "Success", c: "#10b981", fn: (i: number) => 118 + 28 * Math.sin(i * 0.3) + 6 * Math.sin(i * 1.5) },
  { label: "Errors", c: "#ef4444", fn: (i: number) => 2 + Math.sin(i * 0.4) + (i > 45 && i < 50 ? 8 : 0) },
  { label: "Latency p95 (ms)", c: "#f59e0b", fn: (i: number) => 40 + 12 * Math.sin(i * 0.4 + 1) + (i > 42 && i < 50 ? 30 : 0) },
];

function IntegrationMetricsChart() {
  const W = 880, H = 200, P = 30;
  const N = 60;
  const data = SERIES.map(s => Array.from({ length: N }, (_, i) => Math.max(0, s.fn(i))));
  const max = Math.max(...data.flat()) * 1.15;
  const x = (i: number) => P + (i / (N - 1)) * (W - 2 * P);
  const y = (v: number) => H - P - (v / max) * (H - 2 * P);
  const path = (arr: number[]) => arr.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = (arr: number[]) => path(arr) + ` L ${x(N - 1)} ${H - P} L ${x(0)} ${H - P} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="ld-trend" role="img" aria-label="Sample traffic chart for the last hour: API calls, successes, errors and p95 latency">
      <defs>
        {SERIES.map((s, i) => (
          <linearGradient key={i} id={`igrad${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={s.c} stopOpacity="0.18" />
            <stop offset="100%" stopColor={s.c} stopOpacity="0" />
          </linearGradient>
        ))}
      </defs>
      {[0.25, 0.5, 0.75, 1].map((g, i) => (
        <g key={i}>
          <line x1={P} x2={W - P} y1={P + g * (H - 2 * P)} y2={P + g * (H - 2 * P)} className="ld-gridline" />
          <text x={P - 6} y={P + g * (H - 2 * P) + 4} textAnchor="end" className="ld-axis">{Math.round((1 - g) * max)}</text>
        </g>
      ))}
      {data.map((arr, i) => <path key={`a${i}`} d={area(arr)} fill={`url(#igrad${i})`} />)}
      {data.map((arr, i) => <path key={`l${i}`} d={path(arr)} fill="none" stroke={SERIES[i].c} strokeWidth="1.6" />)}
      {[0, 15, 30, 45, 59].map(i => (
        <text key={i} x={x(i)} y={H - P + 14} textAnchor="middle" className="ld-axis">{i === 59 ? "now" : `-${60 - i}m`}</text>
      ))}
    </svg>
  );
}
