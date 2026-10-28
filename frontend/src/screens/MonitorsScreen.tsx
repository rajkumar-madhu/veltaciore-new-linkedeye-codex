// Monitors — alert-rule list + builder (the Datadog Monitors equivalent).
// The Alerts screen only *lists* firing alerts; this lets you author a
// monitor: pick type, write the query, set warning/critical thresholds and an
// evaluation window, and see a preview of the metric against the threshold
// bands before saving. No monitor API is connected yet, so the monitors and
// the preview series are a labelled sample.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { useCanWrite } from "@/auth/auth";
import ReadOnlyBadge from "@/components/ReadOnlyBadge";
import { Panel, Pill, StatCard, fmt } from "@/components/ld";
import { Button, Card, Crumbs, Input, Page, PageHead, Select, Table, TextButton, cx, toneText, ui } from "@/components/ui";
import type { Tone } from "@/components/ld";

import { Icon } from "@/components/Icon";
import { DownloadIcon, FlaskConicalIcon, PlusIcon, SaveIcon, VolumeXIcon } from "lucide-react";
type MonType = "Metric" | "Anomaly" | "Composite" | "Log" | "Synthetic";
type MonState = "ok" | "warn" | "alert" | "nodata";

interface Monitor {
  id: string;
  name: string;
  type: MonType;
  query: string;
  state: MonState;
  warn: number;
  crit: number;
  window: string;
  scope: string;
  since: string;
}

const MONITORS: Monitor[] = [
  { id: "MON-01", name: "Order round-trip p99 > 250µs", type: "Metric", query: "p99:oms.order.latency{tenant:fyers}", state: "alert", warn: 200, crit: 250, window: "5m", scope: "oms-core", since: "12m" },
  { id: "MON-02", name: "NSE queue depth > 700", type: "Metric", query: "max:mq.queue.depth{adapter:nse}", state: "warn", warn: 500, crit: 700, window: "2m", scope: "feed-handler", since: "4m" },
  { id: "MON-03", name: "Checkout error rate anomaly", type: "Anomaly", query: "anomalies(sum:payments.errors{*}, 'basic', 2)", state: "alert", warn: 1, crit: 2, window: "10m", scope: "payments", since: "10m" },
  { id: "MON-04", name: "Feed freshness > 50ms", type: "Metric", query: "avg:feed.nse.gap{*}", state: "ok", warn: 40, crit: 50, window: "1m", scope: "feed-handler", since: "—" },
  { id: "MON-05", name: "iLO exporter down", type: "Synthetic", query: "up{job='ilo-exporter'} == 0", state: "warn", warn: 1, crit: 1, window: "1m", scope: "hardware", since: "1h" },
  { id: "MON-06", name: "OMS latency AND queue high", type: "Composite", query: "MON-01 && MON-02", state: "ok", warn: 1, crit: 1, window: "5m", scope: "trading", since: "—" },
  { id: "MON-07", name: "Timeout log surge > 100/min", type: "Log", query: "logs('service:oms status:error \"timeout\"').index('*').rollup('count')", state: "ok", warn: 60, crit: 100, window: "5m", scope: "oms-gateway", since: "—" },
];

/** Deterministic sample series for the evaluation preview. */
const wave = (seed: number, base: number, amp: number, n = 24) =>
  Array.from({ length: n }, (_, i) => Math.round((base + amp * Math.sin(i * 0.8 + seed) + amp * 0.3 * Math.cos(i * 1.9 + seed)) * 10) / 10);

const STATE: Record<MonState, { tone: Tone; label: string; icon: string }> = {
  ok: { tone: "ok", label: "OK", icon: "fa-circle-check" },
  warn: { tone: "warn", label: "Warn", icon: "fa-triangle-exclamation" },
  alert: { tone: "crit", label: "Alert", icon: "fa-fire" },
  nodata: { tone: "muted", label: "No Data", icon: "fa-circle-question" },
};

const CRIT_COLOR = "#e5383b", WARN_COLOR = "#f5a524", LINE_COLOR = "#2f6bff";

const NOTIFY: [string, string, string][] = [
  ["fa-brands fa-slack", "#trading-critical", "on Alert"],
  ["fa-solid fa-envelope", "on-call@finspot.in", "on Alert / Warn"],
  ["fa-solid fa-phone", "PagerDuty · Trading", "on Alert"],
];

// Plain icon list; an icon without its own text colour is 16px wide and accent-coloured.
const iconList = "list-none flex flex-col gap-2 m-0 p-0 text-sm text-fg [&>li]:flex [&>li]:items-center [&>li]:gap-2.5 [&>li]:min-w-0 [&>li>.ld-icon:not([class*='text-'])]:w-4 [&>li>.ld-icon:not([class*='text-'])]:text-center [&>li>.ld-icon:not([class*='text-'])]:text-accent";
const chartLegend = "flex gap-3.5 text-sm text-fg-muted -mt-1 [&>span]:inline-flex [&>span]:items-center [&>span]:gap-1.5";

export default function MonitorsScreen() {
  const { setRoute } = useNav();
  const canWrite = useCanWrite();
  const idp = React.useId();
  const [sel, setSel] = React.useState(MONITORS[0]);
  // Builder state, seeded from the selected monitor.
  const [warn, setWarn] = React.useState(sel.warn);
  const [crit, setCrit] = React.useState(sel.crit);
  const [win, setWin] = React.useState(sel.window);

  React.useEffect(() => { setWarn(sel.warn); setCrit(sel.crit); setWin(sel.window); }, [sel]);

  const series = wave(sel.id.length, crit * 0.8, crit * 0.35);
  const breaches = series.filter((v) => v >= crit).length;

  const alerting = MONITORS.filter((m) => m.state === "alert").length;
  const warning = MONITORS.filter((m) => m.state === "warn").length;

  return (
    <Page>
      <Crumbs items={[{ label: "Home", onClick: () => setRoute("dashboard") }, { label: "Alerts", onClick: () => setRoute("alerts") }, { label: "Monitors" }]} />

      <PageHead
        title="Monitors"
        subtitle="Metric · anomaly · composite · log · synthetic alert rules"
        actions={<>
          <ReadOnlyBadge />
          <Button><Icon icon={DownloadIcon} /> Export</Button>
          {canWrite && <Button variant="primary"><Icon icon={PlusIcon} /> New Monitor</Button>}
        </>}
      />

      <Card className={ui.notice} role="note">
        <Icon icon={FlaskConicalIcon} />
        <div>
          <b>Sample data</b>
          <p className="text-fg-muted text-xs">The monitor API is not connected yet. These monitors and the evaluation preview are illustrative.</p>
        </div>
      </Card>

      <div className={cx(ui.grid, ui.cols.stats)}>
        <StatCard icon="fa-sliders" tone="info" label="Monitors" value={fmt(MONITORS.length)} note="configured" />
        <StatCard icon="fa-fire" tone="crit" label="Alerting" value={fmt(alerting)} note="critical threshold" />
        <StatCard icon="fa-triangle-exclamation" tone="warn" label="Warning" value={fmt(warning)} note="warn threshold" />
        <StatCard icon="fa-circle-check" tone="ok" label="OK" value={fmt(MONITORS.length - alerting - warning)} note="within thresholds" />
      </div>

      <div className={ui.splitWide}>
        <Panel title={`Monitors (${MONITORS.length})`}>
          <Table>
              <thead>
                <tr>
                  <th scope="col">Monitor</th>
                  <th scope="col">Type</th>
                  <th scope="col">State</th>
                  <th scope="col">Every</th>
                  <th scope="col">Since</th>
                </tr>
              </thead>
              <tbody>
                {MONITORS.map((m) => {
                  const st = STATE[m.state];
                  return (
                    <tr key={m.id} className={sel.id === m.id ? ui.rowSelected : undefined}>
                      <td>
                        <TextButton aria-pressed={sel.id === m.id} onClick={() => setSel(m)}>{m.name}</TextButton>
                        <span className={cx(ui.sub, "font-mono font-semibold max-w-[220px] overflow-hidden text-ellipsis")} title={m.query}>{m.query}</span>
                      </td>
                      <td><Pill tone="muted">{m.type}</Pill></td>
                      <td><Pill tone={st.tone}><Icon className={`fa-solid ${st.icon}`} /> {st.label}</Pill></td>
                      <td>{m.window}</td>
                      <td>{m.since}</td>
                    </tr>
                  );
                })}
              </tbody>
          </Table>
        </Panel>

        <div className={ui.rail}>
          <section className={cx(ui.card, ui.panel)} aria-labelledby={`${idp}-b-h`}>
            <div className={ui.panelHead}>
              <h2 id={`${idp}-b-h`} className={ui.panelTitle}>{canWrite ? "Edit monitor" : "Monitor"}</h2>
              <span className="text-fg-muted text-xs">{sel.type} · {sel.scope}</span>
            </div>
            <form className={ui.form} onSubmit={(e) => e.preventDefault()}>
              <div className={ui.field}>
                <span>Query</span>
                <div className="font-mono text-xs px-2.5 py-2 rounded bg-bg-muted text-fg [overflow-wrap:anywhere]">{sel.query}</div>
              </div>
              <div className="flex flex-wrap gap-2.5 [&>div]:flex-[1_1_120px]">
                <div className={ui.field}>
                  <label htmlFor={`${idp}-warn`}>Warning ≥</label>
                  <Input id={`${idp}-warn`} type="number" value={warn} disabled={!canWrite} onChange={(e) => setWarn(+e.target.value)} />
                </div>
                <div className={ui.field}>
                  <label htmlFor={`${idp}-crit`}>Critical ≥</label>
                  <Input id={`${idp}-crit`} type="number" value={crit} disabled={!canWrite} onChange={(e) => setCrit(+e.target.value)} />
                </div>
                <div className={ui.field}>
                  <label htmlFor={`${idp}-win`}>Window</label>
                  <Select id={`${idp}-win`} value={win} disabled={!canWrite} onChange={(e) => setWin(e.target.value)}>
                    {["1m", "2m", "5m", "10m", "1h"].map((w) => <option key={w}>{w}</option>)}
                  </Select>
                </div>
              </div>

              <div className={ui.field}>
                <span>Evaluation preview · last {win}</span>
                <PreviewChart series={series} warn={warn} crit={crit} breaching={breaches > 0} />
                <div className={chartLegend}>
                  <span><span className={ui.dot} style={{ background: CRIT_COLOR }} />critical {crit}</span>
                  <span><span className={ui.dot} style={{ background: WARN_COLOR }} />warning {warn}</span>
                  <span className={breaches ? toneText.crit : toneText.ok}>
                    {breaches ? `${breaches}/${series.length} points breach critical` : "no breach in window"}
                  </span>
                </div>
              </div>

              {canWrite && (
                <div className={ui.headActions}>
                  <Button type="submit" variant="primary"><Icon icon={SaveIcon} /> Save monitor</Button>
                  <Button><Icon icon={VolumeXIcon} /> Mute</Button>
                </div>
              )}
            </form>
          </section>

          <Panel title="Notifications">
            <ul className={iconList}>
              {NOTIFY.map(([ic, who, when]) => (
                <li key={who}>
                  <Icon className={ic} />
                  <span className="font-medium">{who}</span>
                  <span className="ml-auto text-fg-muted text-xs">{when}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </Page>
  );
}

/** Sample metric line against the warning / critical threshold lines. */
function PreviewChart({ series, warn, crit, breaching }: { series: number[]; warn: number; crit: number; breaching: boolean }) {
  const W = 400, H = 150, L = 36, R = 8, T = 10, B = 10;
  const peak = Math.max(...series, crit, warn) * 1.1 || 1;
  const x = (i: number) => L + (i / Math.max(1, series.length - 1)) * (W - L - R);
  const y = (v: number) => H - B - (Math.max(0, v) / peak) * (H - T - B);
  const line = series.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const color = breaching ? CRIT_COLOR : LINE_COLOR;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block" role="img" aria-label={`Sample series peaking at ${Math.max(...series)} against warning ${warn} and critical ${crit}`}>
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={L} x2={W - R} y1={y(peak * f)} y2={y(peak * f)} className="stroke-line-subtle stroke-1" />
          <text x={L - 6} y={y(peak * f) + 4} textAnchor="end" className="text-xs fill-fg-muted font-sans">{Math.round(peak * f)}</text>
        </g>
      ))}
      <line x1={L} x2={W - R} y1={y(warn)} y2={y(warn)} stroke={WARN_COLOR} strokeDasharray="4 3" strokeWidth={1.5} />
      <line x1={L} x2={W - R} y1={y(crit)} y2={y(crit)} stroke={CRIT_COLOR} strokeDasharray="4 3" strokeWidth={1.5} />
      <polygon points={`${x(0)},${y(0)} ${line} ${x(series.length - 1)},${y(0)}`} fill={color} fillOpacity={0.1} />
      <polyline points={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
    </svg>
  );
}
