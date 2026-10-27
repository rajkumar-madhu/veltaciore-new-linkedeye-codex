// Integration detail — LinkedEye entity layout: header with actions, the
// editable connection form (credentials always masked, never pre-filled) and
// a rail with the current configuration. Traffic metrics, endpoint stats,
// webhooks and permissions have no backend yet and are labelled sample data.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { useUiStore } from "@/store/ui";
import { INTEGRATIONS } from "@/data/core";
import { Panel, Pill, PillDot } from "@/components/ld";
import { Button, Crumbs, Page, Table, cx, toneBg, toneText, ui } from "@/components/ui";

import { Icon } from "@/components/Icon";
import { ArrowLeftIcon, CheckIcon, RefreshCwIcon, SaveIcon, TestTubeIcon, Trash2Icon } from "lucide-react";
// Entity title row (was ld-head ld-entity-head / ld-entity / ld-tile ld-info)
const entityHead = "flex flex-wrap items-start justify-between gap-3";
const entity = "flex items-center gap-3.5 min-w-0";
const entityTile = cx("flex-none w-14 h-14 rounded-[12px] grid place-items-center text-5xl", toneBg.info);
const entityTitle = cx(ui.h1, "flex items-center gap-2.5 flex-wrap");
const entityMeta = cx(
  ui.headSub,
  "flex flex-wrap gap-x-3.5 gap-y-1 [&>span+span]:before:content-['|'] [&>span+span]:before:mr-3.5 [&>span+span]:before:text-line-strong",
);
// Form grid, fields and controls (were ld-admin-* / ld-form-field / ld-input)
const formGrid = "grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-x-4 gap-y-3";
const field = cx(ui.field, "[&>label]:font-semibold");
const input = cx(ui.input, "[&[readonly]]:bg-bg-muted [&[readonly]]:text-fg-muted disabled:bg-bg-muted disabled:text-fg-muted");
// (ld-input's `font: inherit` came after ld-mono, so the weight stays normal)
const monoInput = "font-mono !text-[12.5px]";
const inputRow = "flex gap-1.5 items-center max-sm:flex-wrap [&>input]:flex-auto [&>input]:min-w-0";
const check = "inline-flex items-center gap-2 min-h-[38px] text-sm text-fg cursor-pointer [&_input]:w-4 [&_input]:h-4 [&_input]:accent-accent";
const switchRow = "flex items-center gap-2.5 min-h-[38px] text-sm text-fg";
const switchBtn = cx(
  "relative flex-none w-10 h-[22px] p-0 border border-line-strong rounded-full bg-bg-muted cursor-pointer",
  "after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:rounded-full after:bg-bg-raised after:shadow-sm after:[transition:transform_0.15s]",
  "aria-checked:bg-accent aria-checked:border-accent aria-checked:after:translate-x-[18px] aria-checked:after:bg-white",
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
);
// Chart legend row and SVG text (were ld-legend ld-legend-inline / ld-axis)
const legend = "list-none flex-[1_1_140px] flex flex-col flex-wrap gap-x-4 gap-y-1 mt-1 text-[12.5px] text-fg-muted";
const axis = "text-xs fill-fg-muted font-sans";
// Table cells: mono keeps the cell's 13px; status colour shows in dark mode only, as before
const monoCell = "font-mono font-semibold";
const cellTone = { ok: "font-semibold dark:text-tone-ok", warn: "font-semibold dark:text-tone-warn", crit: "font-semibold dark:text-tone-crit" };

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
    <Page>
      <Crumbs items={[{ label: "Home", onClick: () => setRoute("dashboard") }, { label: "Integrations", onClick: () => setRoute("integrations") }, { label: integ.name }]} />

      <div className={entityHead}>
        <div className={entity}>
          <span className={entityTile} aria-hidden="true"><Icon className={integ.icon} /></span>
          <div>
            <h1 className={entityTitle}>
              {integ.name} Integration
              {enabled ? <Pill tone="ok"><PillDot />Connected</Pill> : <Pill tone="warn"><PillDot />Disabled</Pill>}
            </h1>
            <p className={entityMeta}><span>{integ.meta}</span><span>Region {region}</span></p>
          </div>
        </div>
        <div className={ui.headSide}>
          <div className={ui.headActions}>
            <span role="status" className="inline-flex items-center gap-1.5 text-sm text-fg-muted">{saved && <><Icon icon={CheckIcon} className={toneText.ok} /> Saved</>}</span>
            <Button onClick={() => setRoute("integrations")}><Icon icon={ArrowLeftIcon} /> Back</Button>
            <Button onClick={test}><Icon icon={TestTubeIcon} /> Test Connection</Button>
            <Button><Icon icon={Trash2Icon} /> Disconnect</Button>
            <Button variant="primary" onClick={save}><Icon icon={SaveIcon} /> Save Changes</Button>
          </div>
          <ul className={ui.tags}>
            <li className={ui.tag}><Icon className={integ.icon} /> {integ.category}</li>
          </ul>
        </div>
      </div>

      <div className={ui.split}>
        <div className={ui.rail}>
          <section className={cx(ui.card, ui.panel)} aria-labelledby="ic-config-h">
            <div className={ui.panelHead}>
              <h2 className={ui.panelTitle} id="ic-config-h">Connection Configuration</h2>
              <span className="text-fg-muted text-xs">Edit any value, then Save Changes</span>
            </div>
            <form className={ui.form} onSubmit={(e) => { e.preventDefault(); save(); }}>
              <div className={formGrid}>
                <div className={switchRow}>
                  <button type="button" id="ic-enabled" role="switch" aria-checked={enabled} className={switchBtn} onClick={() => setEnabled(v => !v)} />
                  <label htmlFor="ic-enabled">{enabled ? "Enabled" : "Disabled"}</label>
                </div>
                <div className={field}>
                  <label htmlFor="ic-name">Display name <span className={ui.req}>*</span></label>
                  <input id="ic-name" className={input} defaultValue={integ.name} />
                </div>
                <div className={field}>
                  <label htmlFor="ic-endpoint">Endpoint URL <span className={ui.req}>*</span></label>
                  <input id="ic-endpoint" className={cx(input, monoInput)} value={endpoint} onChange={e => setEndpoint(e.target.value)} placeholder="https://api.example.com" />
                </div>
                <div className={field}>
                  <label htmlFor="ic-region">Region</label>
                  <select id="ic-region" className={ui.select} value={region} onChange={e => setRegion(e.target.value)}>
                    <option>us-east-1</option><option>us-west-2</option><option>eu-west-1</option><option>ap-south-1</option>
                  </select>
                </div>
                <div className={field}>
                  <label htmlFor="ic-auth">Auth method <span className={ui.req}>*</span></label>
                  <select id="ic-auth" className={ui.select} value={authMode} onChange={e => setAuthMode(e.target.value)}>
                    <option value="apikey">API Key</option>
                    <option value="basic">Username + Password</option>
                    <option value="oauth">OAuth 2.0</option>
                    <option value="bearer">Bearer Token</option>
                    <option value="mtls">mTLS Certificate</option>
                  </select>
                </div>
                <label className={check} htmlFor="ic-tls">
                  <input id="ic-tls" type="checkbox" defaultChecked /> Strict TLS certificate validation
                </label>

                {authMode === "apikey" && (
                  <>
                    <div className={field}>
                      <label htmlFor="ic-key">API key <span className={ui.req}>*</span></label>
                      <span className={inputRow}>
                        <input id="ic-key" className={cx(input, monoInput)} type="password" autoComplete="new-password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder={STORED} />
                        <Button aria-label="Rotate API key" title="Rotate"><Icon icon={RefreshCwIcon} /></Button>
                      </span>
                    </div>
                    <div className={field}>
                      <label htmlFor="ic-scope">Key scope</label>
                      <select id="ic-scope" className={ui.select}><option>Read + Write</option><option>Read only</option><option>Write only · webhooks</option></select>
                    </div>
                  </>
                )}

                {authMode === "basic" && (
                  <>
                    <div className={field}>
                      <label htmlFor="ic-user">Username <span className={ui.req}>*</span></label>
                      <input id="ic-user" className={cx(input, monoInput)} value={username} onChange={e => setUsername(e.target.value)} placeholder="service-account-name" />
                    </div>
                    <div className={field}>
                      <label htmlFor="ic-pwd">Password <span className={ui.req}>*</span></label>
                      <input id="ic-pwd" className={cx(input, monoInput)} type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} placeholder={STORED} />
                    </div>
                  </>
                )}

                {authMode === "oauth" && (
                  <>
                    <div className={field}>
                      <label htmlFor="ic-cid">Client ID <span className={ui.req}>*</span></label>
                      <input id="ic-cid" className={cx(input, monoInput)} defaultValue="le-oauth-client-984af" />
                    </div>
                    <div className={field}>
                      <label htmlFor="ic-csecret">Client secret <span className={ui.req}>*</span></label>
                      <input id="ic-csecret" className={cx(input, monoInput)} type="password" autoComplete="new-password" placeholder={STORED} />
                    </div>
                    <div className={field}>
                      <label htmlFor="ic-authurl">Authorization URL</label>
                      <input id="ic-authurl" className={cx(input, monoInput)} defaultValue="https://idp.example.com/oauth/authorize" />
                    </div>
                    <div className={field}>
                      <label htmlFor="ic-tokenurl">Token URL</label>
                      <input id="ic-tokenurl" className={cx(input, monoInput)} defaultValue="https://idp.example.com/oauth/token" />
                    </div>
                  </>
                )}

                {authMode === "bearer" && (
                  <>
                    <div className={field}>
                      <label htmlFor="ic-bearer">Bearer token <span className={ui.req}>*</span></label>
                      <input id="ic-bearer" className={cx(input, monoInput)} type="password" autoComplete="new-password" placeholder={STORED} />
                    </div>
                    <div className={field}>
                      <label htmlFor="ic-refresh">Refresh token</label>
                      <input id="ic-refresh" className={cx(input, monoInput)} type="password" autoComplete="new-password" placeholder={STORED} />
                    </div>
                  </>
                )}

                {authMode === "mtls" && (
                  <>
                    <div className={field}>
                      <label htmlFor="ic-cert">Client certificate <span className={ui.req}>*</span></label>
                      <input id="ic-cert" className={input} type="file" accept=".crt,.pem" />
                    </div>
                    <div className={field}>
                      <label htmlFor="ic-pkey">Private key <span className={ui.req}>*</span></label>
                      <input id="ic-pkey" className={input} type="file" accept=".key,.pem" />
                    </div>
                  </>
                )}

                <div className={field}>
                  <label htmlFor="ic-interval">Scrape interval (seconds)</label>
                  <input id="ic-interval" className={cx(input, "w-24 flex-none")} type="number" min="5" max="300" value={scrapeInterval} onChange={e => setScrapeInterval(parseInt(e.target.value) || 15)} />
                </div>
                <div className={field}>
                  <label htmlFor="ic-timeout">Timeout (seconds)</label>
                  <input id="ic-timeout" className={cx(input, "w-24 flex-none")} type="number" defaultValue="10" />
                </div>
                <div className={field}>
                  <label htmlFor="ic-retry">Retry policy</label>
                  <select id="ic-retry" className={ui.select}><option>Exponential backoff · max 5</option><option>Fixed · 3 retries</option><option>None</option></select>
                </div>
                <div className={field}>
                  <label htmlFor="ic-proxy">Proxy</label>
                  <input id="ic-proxy" className={cx(input, monoInput)} placeholder="https://proxy.internal:8080 (optional)" />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-sm text-fg-muted mr-auto">Secrets are write-only and never shown after saving.</span>
                <Button type="submit" variant="primary"><Icon icon={SaveIcon} /> Save Changes</Button>
              </div>
            </form>
          </section>

          <section className={cx(ui.card, ui.panel)} aria-labelledby="ic-metrics-h">
            <div className={ui.panelHead}>
              <h2 className={ui.panelTitle} id="ic-metrics-h">Traffic · last 1h</h2>
              <SampleTag />
            </div>
            <IntegrationMetricsChart />
            <ul className={legend}>
              {SERIES.map(s => (
                <li key={s.label} className="inline-flex items-center gap-1.5 text-sm"><span className="w-2.5 h-2.5 rounded-[3px] flex-none" style={{ background: s.c }} /><span className="flex-1 text-fg-muted">{s.label}</span></li>
              ))}
            </ul>
          </section>

          <section className={cx(ui.card, ui.panel)} aria-labelledby="ic-ep-h">
            <div className={ui.panelHead}>
              <h2 className={ui.panelTitle} id="ic-ep-h">Endpoint Metrics</h2>
              <span className="inline-flex items-center gap-1.5 flex-wrap"><SampleTag /><span className="text-fg-muted text-xs">per route · last 1h</span></span>
            </div>
            <Table>
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
                      <td className="font-mono font-medium">{r[0]}</td>
                      <td><Pill tone={r[1] === "GET" ? "info" : "warn"}>{r[1]}</Pill></td>
                      <td className={monoCell}>{r[2].toLocaleString()}</td>
                      <td className={cx(monoCell, cellTone.ok)}>{r[3]}%</td>
                      <td className={cx(monoCell, r[4] > 0.5 && cellTone.warn)}>{r[4]}%</td>
                      <td className={cx(monoCell, r[5] > 0 && cellTone.crit)}>{r[5]}%</td>
                      <td className={monoCell}>{r[6]}ms</td>
                      <td className={cx(monoCell, r[7] > 500 && cellTone.warn)}>{r[7]}ms</td>
                      <td><Pill tone={r[8] === "ok" ? "ok" : "warn"}><PillDot />{r[8] === "ok" ? "healthy" : "elevated"}</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
          </section>

          <section className={cx(ui.card, ui.panel)} aria-labelledby="ic-hooks-h">
            <div className={ui.panelHead}>
              <h2 className={ui.panelTitle} id="ic-hooks-h">Webhook Subscriptions</h2>
              <SampleTag />
            </div>
            <Table>
                <thead>
                  <tr><th scope="col">Event</th><th scope="col">Target</th><th scope="col">Status</th><th scope="col">Last delivery</th></tr>
                </thead>
                <tbody>
                  {SAMPLE_HOOKS.map((r) => (
                    <tr key={r[0]}>
                      <td className="font-mono font-medium">{r[0]}</td>
                      <td className={monoCell}>{r[1]}</td>
                      <td><Pill tone={r[2] === "ok" ? "ok" : "warn"}><PillDot />{r[2]}</Pill></td>
                      <td>{r[3]}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
          </section>
        </div>

        <div className={ui.rail}>
          <Panel title="Current Configuration">
            <dl className={ui.dl}>
              <dt>Status</dt><dd>{enabled ? <Pill tone="ok"><PillDot />Connected</Pill> : <Pill tone="warn"><PillDot />Disabled</Pill>}</dd>
              <dt>Category</dt><dd>{integ.category}</dd>
              <dt>Auth method</dt><dd>{AUTH_LABEL[authMode] ?? authMode}</dd>
              <dt>Region</dt><dd className={ui.mono}>{region}</dd>
              <dt>Scrape interval</dt><dd>{scrapeInterval}s</dd>
              <dt>Endpoint</dt><dd className={ui.mono}>{endpoint}</dd>
            </dl>
          </Panel>

          <section className={cx(ui.card, ui.panel)} aria-labelledby="ic-perm-h">
            <div className={ui.panelHead}>
              <h2 className={ui.panelTitle} id="ic-perm-h">Permissions</h2>
              <SampleTag />
            </div>
            <ul className={ui.activity}>
              {SAMPLE_PERMS.map(([k, on]) => (
                <li key={k} className={ui.activityItem}>
                  <span className={cx(ui.activityText, ui.mono)}>{k}</span>
                  <Pill tone={on ? "ok" : "muted"}>{on ? "granted" : "off"}</Pill>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </Page>
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
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block" role="img" aria-label="Sample traffic chart for the last hour: API calls, successes, errors and p95 latency">
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
          <line x1={P} x2={W - P} y1={P + g * (H - 2 * P)} y2={P + g * (H - 2 * P)} className="stroke-line-subtle stroke-1" />
          <text x={P - 6} y={P + g * (H - 2 * P) + 4} textAnchor="end" className={axis}>{Math.round((1 - g) * max)}</text>
        </g>
      ))}
      {data.map((arr, i) => <path key={`a${i}`} d={area(arr)} fill={`url(#igrad${i})`} />)}
      {data.map((arr, i) => <path key={`l${i}`} d={path(arr)} fill="none" stroke={SERIES[i].c} strokeWidth="1.6" />)}
      {[0, 15, 30, 45, 59].map(i => (
        <text key={i} x={x(i)} y={H - P + 14} textAnchor="middle" className={axis}>{i === 59 ? "now" : `-${60 - i}m`}</text>
      ))}
    </svg>
  );
}
