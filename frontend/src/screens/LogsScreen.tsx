// Logs — query bar, volume histogram, stream / patterns / analytics tabs,
// facets and saved queries. A tenant-wide log backend is not connected yet
// (device logs live on each server page), so the stream, patterns and
// histogram are a labelled sample; the summary cards are computed from them.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { Panel, Pill, StatCard, fmt } from "@/components/ld";
import { Button, Card, Crumbs, Page, PageHead, SearchBox, Tab, Table, Tabs, cx, ui } from "@/components/ui";
import type { Tone } from "@/components/ld";

import { Icon } from "@/components/Icon";
import { BellIcon, BookmarkIcon, FlaskConicalIcon, LineChartIcon, PauseIcon, SearchIcon } from "lucide-react";
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

/** Mono text in a table cell keeps the cell's 13px (the old mono class lost to it). */
const cellMono = "font-mono font-semibold";
const chips = "flex flex-wrap items-center gap-1.5 text-xs text-fg-muted";
const chip = "border border-line rounded-full bg-bg-muted text-fg px-2.5 py-[3px] font-mono text-xs cursor-pointer hover:border-line-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2";
const chartLegend = "flex gap-3.5 text-sm text-fg-muted -mt-1 [&>span]:inline-flex [&>span]:items-center [&>span]:gap-1.5";
// Plain icon list; an icon without its own text colour is 16px wide and accent-coloured.
const iconList = "list-none flex flex-col gap-2 m-0 p-0 text-sm text-fg [&>li]:flex [&>li]:items-center [&>li]:gap-2.5 [&>li]:min-w-0 [&>li>.ld-icon:not([class*='text-'])]:w-4 [&>li>.ld-icon:not([class*='text-'])]:text-center [&>li>.ld-icon:not([class*='text-'])]:text-accent";

// Status text in a table cell / figure box: in light mode the cell's own colour
// won (only the weight showed); in dark mode the status colour won.
const cellTone = { crit: "font-semibold dark:text-tone-crit", warn: "font-semibold dark:text-tone-warn", ok: "font-semibold dark:text-tone-ok" } as const;
const compact = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}k` : String(n));

export default function LogsScreen() {
  const { setRoute } = useNav();
  const idp = React.useId();
  const [q, setQ] = React.useState('service:checkout-api status:error @http.status_code:>=500');
  const [tab, setTab] = React.useState("stream");

  const total = PATTERNS.reduce((s, p) => s + p[3], 0);
  const byLevel = (l: Level) => PATTERNS.filter((p) => p[1] === l).reduce((s, p) => s + p[3], 0);

  return (
    <Page>
      <Crumbs items={[{ label: "Home", onClick: () => setRoute("dashboard") }, { label: "Logs" }]} />

      <PageHead
        title="Log Stream"
        subtitle="Search, tail and cluster application logs across services"
        actions={<>
          <Button><Icon icon={PauseIcon} /> Pause</Button>
          <Button><Icon icon={BookmarkIcon} /> Save</Button>
          <Button variant="primary" onClick={() => setRoute("monitors")}><Icon icon={BellIcon} /> Alert on this</Button>
        </>}
      />

      <Card className={ui.notice} role="note">
        <Icon icon={FlaskConicalIcon} />
        <div>
          <b>Sample data</b>
          <p className="text-fg-muted text-xs">No tenant-wide log source is connected yet. The stream, patterns and histogram below are illustrative; per-device logs are on each server page.</p>
        </div>
      </Card>

      <div className={cx(ui.grid, ui.cols.stats)}>
        <StatCard icon="fa-file-lines" tone="info" label="Events in patterns" value={compact(total)} note={`${PATTERNS.length} patterns`} />
        <StatCard icon="fa-circle-xmark" tone="crit" label="Errors" value={compact(byLevel("ERROR"))} note={total ? `${((byLevel("ERROR") / total) * 100).toFixed(1)}% of events` : "—"} onClick={() => setQ("status:error")} />
        <StatCard icon="fa-triangle-exclamation" tone="warn" label="Warnings" value={compact(byLevel("WARN"))} note={total ? `${((byLevel("WARN") / total) * 100).toFixed(1)}% of events` : "—"} onClick={() => setQ("status:warn")} />
        <StatCard icon="fa-bookmark" tone="purple" label="Saved queries" value={fmt(SAVED.length)} note="for this tenant" />
      </div>

      <form className={cx(ui.card, ui.panel)} aria-labelledby={`${idp}-q-h`} onSubmit={(e) => e.preventDefault()}>
        <div className={ui.panelHead}><h2 id={`${idp}-q-h`} className={ui.panelTitle}>Query</h2></div>
        <div className={ui.toolbar}>
          <label htmlFor={`${idp}-q`} className="sr-only">Log query</label>
          {/* The old mono-font class on this input lost to the search box's font: inherit. */}
          <SearchBox className="flex-[1_1_240px]" icon={<Icon icon={SearchIcon} />} id={`${idp}-q`} type="search" value={q} onChange={(e) => setQ(e.target.value)} />
          <Button type="submit" variant="primary">Run</Button>
        </div>
        <div className={chips} role="group" aria-label="Quick filters">
          <span>Quick filters:</span>
          {QUICK.map((s) => (
            <button key={s} type="button" className={chip} onClick={() => setQ(s)}>{s}</button>
          ))}
        </div>
      </form>

      <div className={ui.split}>
        <div className={ui.rail}>
          <Panel title="Volume histogram · last 1h, stacked by level">
            <LogsHist />
            <div className={chartLegend}>
              {(["ERROR", "WARN", "INFO", "DEBUG"] as Level[]).map((l) => (
                <span key={l}><span className={ui.dot} style={{ background: LEVEL_COLOR[l] }} />{l.toLowerCase()}</span>
              ))}
            </div>
          </Panel>

          <section className={cx(ui.card, ui.panel)} aria-label="Log results">
            <Tabs aria-label="Log views">
              {[["stream", "Stream"], ["patterns", "Patterns"], ["analytics", "Analytics"]].map(([id, l]) => (
                <Tab key={id} active={tab === id} onClick={() => setTab(id)}>{l}</Tab>
              ))}
            </Tabs>
            {tab === "stream" && (
              <Table className="[&_td]:align-top">
                  <thead><tr><th scope="col">Time</th><th scope="col">Level</th><th scope="col">Service</th><th scope="col">Message</th></tr></thead>
                  <tbody>
                    {STREAM.map((l) => (
                      <tr key={l[0] + l[2]}>
                        <td className={cellMono}>{l[0]}</td>
                        <td><Pill tone={LEVEL_TONE[l[1]]}>{l[1]}</Pill></td>
                        <td className={cellMono}>{l[2]}</td>
                        <td className={cx(ui.cellWrap, cellMono)}>{l[3]}</td>
                      </tr>
                    ))}
                  </tbody>
              </Table>
            )}
            {tab === "patterns" && (
              <Table>
                  <thead><tr><th scope="col">Pattern</th><th scope="col">Level</th><th scope="col">Service</th><th scope="col">Count</th><th scope="col">Δ vs 1h</th></tr></thead>
                  <tbody>
                    {PATTERNS.map((r) => (
                      <tr key={r[0]}>
                        <td className={cx(ui.cellWrap, cellMono)}>{r[0]}</td>
                        <td><Pill tone={LEVEL_TONE[r[1]]}>{r[1]}</Pill></td>
                        <td className={cellMono}>{r[2]}</td>
                        <td>{fmt(r[3])}</td>
                        <td className={r[4].startsWith("+") ? cellTone.crit : cellTone.ok}>{r[4]}</td>
                      </tr>
                    ))}
                  </tbody>
              </Table>
            )}
            {tab === "analytics" && (
              <p className="text-fg-muted text-xs">Top errors and latency breakdowns over 1h window. Drill into any cell to filter the stream.</p>
            )}
          </section>
        </div>

        <div className={ui.rail}>
          <Panel title="Facets">
            <dl className={ui.dl}>
              {FACETS.map(([k, v]) => (
                <React.Fragment key={k}><dt>{k}</dt><dd className="text-xs">{v}</dd></React.Fragment>
              ))}
            </dl>
          </Panel>
          <Panel title={`Saved queries (${SAVED.length})`}>
            <ul className={iconList}>
              {SAVED.map((n) => (
                <li key={n}>
                  <Icon icon={LineChartIcon} />
                  <span className={ui.mono}>{n}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </Page>
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
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-[160px] block" role="img" aria-label="Sample log volume per minute over the last hour, stacked by level, with an error spike around minute 44">
      {[0.25, 0.5, 0.75, 1].map((g) => <line key={g} x1={P} x2={W - P} y1={P + (1 - g) * (H - 2 * P)} y2={P + (1 - g) * (H - 2 * P)} className="stroke-line-subtle stroke-1" strokeDasharray="2 4" />)}
      <line x1={x(44)} x2={x(44)} y1={P - 4} y2={H - P} stroke={LEVEL_COLOR.ERROR} strokeDasharray="3 3" strokeWidth="1" />
      {stacked.map((c, i) => (
        <g key={i}>
          {c.map((s, k) => <rect key={k} x={x(i)} y={y(s.hi)} width={bw} height={Math.max(0.5, y(s.lo) - y(s.hi))} fill={colors[k]} />)}
        </g>
      ))}
    </svg>
  );
}
