// Logs — query bar, volume histogram, stream / patterns / analytics tabs,
// facets and saved queries. A tenant-wide log backend is not connected yet
// (device logs live on each server page), so the stream, patterns and
// histogram are a labelled sample; the summary cards are computed from them.
import React from "react";
import "@/styles/observe.css";
import { useNav } from "@/hooks/useNav";
import { Panel, Pill, StatCard, fmt } from "@/components/ld";
import type { Tone } from "@/components/ld";

type Level = "ERROR" | "WARN" | "INFO" | "DEBUG";
const LEVEL_TONE: Record<Level, Tone> = { ERROR: "crit", WARN: "warn", INFO: "info", DEBUG: "muted" };
const LEVEL_COLOR = { DEBUG: "#98a2b3", INFO: "#2f6bff", WARN: "#f5a524", ERROR: "#e5383b" };

const STREAM: [string, Level, string, string][] = [
  ["14:32:41.842", "ERROR", "payments-svc", "Stripe API timeout after 30000ms charge_id=ch_3OqLn82eZvKYlo2C user_id=u_184210"],
  ["14:32:41.812", "ERROR", "checkout-api", "Failed to create order: timeout from payments-svc trace_id=4f2a8c91d3e7b612"],
  ["14:32:41.798", "WARN", "checkout-api", "Retry 2/3 for downstream payments-svc backoff=2400ms"],
  ["14:32:41.612", "INFO", "web-bff", "POST /api/checkout 502 user_id=u_184210 duration=30418ms"],
  ["14:32:41.484", "ERROR", "payments-svc", "Connection pool exhausted: 0/64 available, 184 waiting"],
  ["14:32:41.282", "WARN", "payments-svc", "High DB query latency p95=1842ms threshold=1000ms"],
  ["14:32:41.184", "INFO", "auth-svc", "JWT verified user_id=u_184210 tier=enterprise"],
  ["14:32:41.082", "ERROR", "checkout-api", "TimeoutError: Stripe API request exceeded 30s at lib/payments/stripe_client.rb:42"],
  ["14:32:40.984", "INFO", "inventory-svc", "Reserved 1 unit of sku_18421 for order_842102"],
  ["14:32:40.842", "DEBUG", "checkout-api", "Cache miss for key checkout:cart:u_184210 backing=redis"],
];

const PATTERNS: [string, Level, string, number, string][] = [
  ["Stripe API timeout after * charge_id=*", "ERROR", "payments-svc", 12842, "+1840%"],
  ["Connection pool exhausted: */* available", "ERROR", "payments-svc", 4218, "+3380%"],
  ["POST /api/checkout * duration=*ms", "INFO", "web-bff", 184212, "-37%"],
  ["Circuit breaker OPEN for *", "WARN", "web-bff", 842, "+∞"],
  ["Reserved * unit of * for order_*", "INFO", "inventory-svc", 24180, "+37%"],
];

const QUICK = ["status:error", "status:warn", "@duration:>1s", "env:production", "NOT @http.status_code:200"];
const SAVED = ["payments.timeouts", "pool.exhaustion", "circuit.breaker.open", "slow.queries"];
const FACETS: [string, string][] = [
  ["Status", "error · warn · info · debug"],
  ["Service", "checkout-api · payments-svc · inventory-svc · auth-svc"],
  ["Environment", "production · staging · dev"],
  ["HTTP status", "200 · 500 · 502 · 404 · 301"],
  ["Host", "ip-10-0-3-12 · ip-10-0-3-18 · ip-10-0-2-44"],
];

const compact = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}k` : String(n));

export default function LogsScreen() {
  const { setRoute } = useNav();
  const idp = React.useId();
  const [q, setQ] = React.useState('service:checkout-api status:error @http.status_code:>=500');
  const [tab, setTab] = React.useState("stream");

  const total = PATTERNS.reduce((s, p) => s + p[3], 0);
  const byLevel = (l: Level) => PATTERNS.filter((p) => p[1] === l).reduce((s, p) => s + p[3], 0);

  return (
    <div className="ld-dash">
      <nav className="ld-crumbs" aria-label="Breadcrumb">
        <button type="button" className="ld-link" onClick={() => setRoute("dashboard")}>Home</button>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <span>Logs</span>
      </nav>

      <div className="ld-head">
        <div>
          <h1>Log Stream</h1>
          <p>Search, tail and cluster application logs across services</p>
        </div>
        <div className="ld-head-actions">
          <button type="button" className="ld-btn"><i className="fa-solid fa-pause" aria-hidden="true" /> Pause</button>
          <button type="button" className="ld-btn"><i className="fa-solid fa-bookmark" aria-hidden="true" /> Save</button>
          <button type="button" className="ld-btn ld-btn-primary" onClick={() => setRoute("monitors")}><i className="fa-solid fa-bell" aria-hidden="true" /> Alert on this</button>
        </div>
      </div>

      <div className="ld-card ld-metrics-off" role="note">
        <i className="fa-solid fa-flask" aria-hidden="true" />
        <div>
          <b>Sample data</b>
          <p className="ld-muted ld-small">No tenant-wide log source is connected yet. The stream, patterns and histogram below are illustrative; per-device logs are on each server page.</p>
        </div>
      </div>

      <div className="ld-grid ld-grid-stats">
        <StatCard icon="fa-file-lines" tone="info" label="Events in patterns" value={compact(total)} note={`${PATTERNS.length} patterns`} />
        <StatCard icon="fa-circle-xmark" tone="crit" label="Errors" value={compact(byLevel("ERROR"))} note={total ? `${((byLevel("ERROR") / total) * 100).toFixed(1)}% of events` : "—"} onClick={() => setQ("status:error")} />
        <StatCard icon="fa-triangle-exclamation" tone="warn" label="Warnings" value={compact(byLevel("WARN"))} note={total ? `${((byLevel("WARN") / total) * 100).toFixed(1)}% of events` : "—"} onClick={() => setQ("status:warn")} />
        <StatCard icon="fa-bookmark" tone="purple" label="Saved queries" value={fmt(SAVED.length)} note="for this tenant" />
      </div>

      <form className="ld-card ld-panel" aria-labelledby={`${idp}-q-h`} onSubmit={(e) => e.preventDefault()}>
        <div className="ld-panel-head"><h2 id={`${idp}-q-h`}>Query</h2></div>
        <div className="ld-toolbar">
          <label htmlFor={`${idp}-q`} className="sr-only">Log query</label>
          <span className="ld-search">
            <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
            <input id={`${idp}-q`} className="ld-obs-mono-input" type="search" value={q} onChange={(e) => setQ(e.target.value)} />
          </span>
          <button type="submit" className="ld-btn ld-btn-primary">Run</button>
        </div>
        <div className="ld-obs-chips" role="group" aria-label="Quick filters">
          <span>Quick filters:</span>
          {QUICK.map((s) => (
            <button key={s} type="button" className="ld-obs-chip" onClick={() => setQ(s)}>{s}</button>
          ))}
        </div>
      </form>

      <div className="ld-split">
        <div className="ld-rail">
          <Panel title="Volume histogram · last 1h, stacked by level">
            <LogsHist />
            <div className="ld-chart-legend">
              {(["ERROR", "WARN", "INFO", "DEBUG"] as Level[]).map((l) => (
                <span key={l}><span className="ld-dot" style={{ background: LEVEL_COLOR[l] }} />{l.toLowerCase()}</span>
              ))}
            </div>
          </Panel>

          <section className="ld-card ld-panel" aria-label="Log results">
            <div className="ld-tabs" role="tablist" aria-label="Log views">
              {[["stream", "Stream"], ["patterns", "Patterns"], ["analytics", "Analytics"]].map(([id, l]) => (
                <button key={id} type="button" role="tab" aria-selected={tab === id} className={`ld-tab${tab === id ? " active" : ""}`} onClick={() => setTab(id)}>{l}</button>
              ))}
            </div>
            {tab === "stream" && (
              <div className="ld-table-wrap">
                <table className="ld-table ld-logs">
                  <thead><tr><th scope="col">Time</th><th scope="col">Level</th><th scope="col">Service</th><th scope="col">Message</th></tr></thead>
                  <tbody>
                    {STREAM.map((l) => (
                      <tr key={l[0] + l[2]}>
                        <td className="ld-mono ld-muted">{l[0]}</td>
                        <td><Pill tone={LEVEL_TONE[l[1]]}>{l[1]}</Pill></td>
                        <td className="ld-mono">{l[2]}</td>
                        <td className="ld-wrap ld-mono">{l[3]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {tab === "patterns" && (
              <div className="ld-table-wrap">
                <table className="ld-table">
                  <thead><tr><th scope="col">Pattern</th><th scope="col">Level</th><th scope="col">Service</th><th scope="col">Count</th><th scope="col">Δ vs 1h</th></tr></thead>
                  <tbody>
                    {PATTERNS.map((r) => (
                      <tr key={r[0]}>
                        <td className="ld-mono ld-wrap">{r[0]}</td>
                        <td><Pill tone={LEVEL_TONE[r[1]]}>{r[1]}</Pill></td>
                        <td className="ld-mono">{r[2]}</td>
                        <td>{fmt(r[3])}</td>
                        <td className={r[4].startsWith("+") ? "ld-text-crit" : "ld-text-ok"}>{r[4]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {tab === "analytics" && (
              <p className="ld-muted ld-small">Top errors and latency breakdowns over 1h window. Drill into any cell to filter the stream.</p>
            )}
          </section>
        </div>

        <div className="ld-rail">
          <Panel title="Facets">
            <dl className="ld-dl">
              {FACETS.map(([k, v]) => (
                <React.Fragment key={k}><dt>{k}</dt><dd className="ld-muted ld-small">{v}</dd></React.Fragment>
              ))}
            </dl>
          </Panel>
          <Panel title={`Saved queries (${SAVED.length})`}>
            <ul className="ld-obs-list">
              {SAVED.map((n) => (
                <li key={n}>
                  <i className="fa-solid fa-chart-line" aria-hidden="true" />
                  <span className="ld-mono">{n}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}

// Sample histogram: four stacked level series with a spike two-thirds in.
function LogsHist() {
  const W = 900, H = 140, P = 20, N = 60;
  const colors = [LEVEL_COLOR.DEBUG, LEVEL_COLOR.INFO, LEVEL_COLOR.WARN, LEVEL_COLOR.ERROR];
  const series = [
    Array.from({ length: N }, (_, i) => 200 + 80 * Math.sin(i * 0.4) + (i > 40 ? 80 : 0)),
    Array.from({ length: N }, (_, i) => 120 + 40 * Math.sin(i * 0.5 + 1)),
    Array.from({ length: N }, (_, i) => 30 + 20 * Math.sin(i * 0.7 + 2) + (i > 40 && i < 48 ? 90 : 0)),
    Array.from({ length: N }, (_, i) => 8 + 6 * Math.sin(i * 0.6 + 3) + (i > 40 && i < 50 ? 184 : 0)),
  ];
  const stacked: { lo: number; hi: number }[][] = [];
  for (let j = 0; j < N; j++) { let acc = 0; stacked[j] = series.map((s) => { const lo = acc; acc += s[j]; return { lo, hi: acc }; }); }
  const max = Math.max(...stacked.map((c) => c[c.length - 1].hi));
  const x = (i: number) => P + (i / N) * (W - 2 * P);
  const bw = (W - 2 * P) / N - 2;
  const y = (v: number) => H - P - (v / max) * (H - 2 * P);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="ld-obs-hist" role="img" aria-label="Sample log volume per minute over the last hour, stacked by level, with an error spike around minute 44">
      {[0.25, 0.5, 0.75, 1].map((g) => <line key={g} x1={P} x2={W - P} y1={P + (1 - g) * (H - 2 * P)} y2={P + (1 - g) * (H - 2 * P)} className="ld-gridline" strokeDasharray="2 4" />)}
      <line x1={x(44)} x2={x(44)} y1={P - 4} y2={H - P} stroke={LEVEL_COLOR.ERROR} strokeDasharray="3 3" strokeWidth="1" />
      {stacked.map((c, i) => (
        <g key={i}>
          {c.map((s, k) => <rect key={k} x={x(i)} y={y(s.hi)} width={bw} height={Math.max(0.5, y(s.lo) - y(s.hi))} fill={colors[k]} />)}
        </g>
      ))}
    </svg>
  );
}
