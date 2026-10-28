// Order Latency Monitor — trading-infrastructure dashboard (LinkedEye layout).
//
// Every figure is derived from the three live feeds: hourly latency profile
// (/trading/latency/hourly/), per-segment summary (/trading/latency/segments/)
// and the latest order records (/trading/latency/orders/). The NSE adapter
// queue profile has no feed yet: it is a captured file (QueSize_NSE_22Jul2026
// .csv) and is labelled "Sample data — not connected".
import React from "react";
import {
  useLatencyHourly,
  useLatencySegments,
  useOrderRecords,
  type LatencyHourly,
  type LatencySegment,
  type OrderRecord,
} from "@/api/hooks";
import { useNav } from "@/hooks/useNav";
import { Donut, Empty, Legend, PALETTE, Panel, Pill, StatCard, fmt } from "@/components/ld";
import type { Slice, Tone } from "@/components/ld";
import { Card, Crumbs, Page, PageHead, Tab, Table, Tabs, cx, ui } from "@/components/ui";

import { Icon } from "@/components/Icon";
import { CircleDotIcon, FlaskConicalIcon, InfoIcon, TriangleAlertIcon, UnplugIcon } from "lucide-react";
// ── Local class strings (were the trading-ops CSS rules) ─────────────────────
// Table cells keep the cell size (13px); the old mono class only set 12px outside tables.
const monoCell = "font-mono font-semibold";
// In table cells the old status-text classes lost to the cell colour: bold in
// light mode, the tone colour only in dark mode.
const CELL_CRIT = "font-semibold dark:text-tone-crit";
/** Panel sub-title under the heading */
const sub = "text-[12.5px] text-fg-muted -mt-1.5";
/** Notice banner (card with a coloured left edge); tone picks the edge + icon colour. */
const NOTE_TONE = {
  info: "border-l-info [&>.ld-icon]:text-info",
  crit: "border-l-critical [&>.ld-icon]:text-critical",
  warn: "border-l-warning [&>.ld-icon]:text-warning",
  muted: "border-l-line-strong [&>.ld-icon]:text-fg-muted",
} as const;
const note = (tone: keyof typeof NOTE_TONE) =>
  cx(ui.card, "flex items-start gap-3 px-4 py-3 border-l-4 text-sm text-fg leading-[1.5] [&_b]:text-fg [&>.ld-icon]:mt-[3px] [&>.ld-icon]:text-md [&>.ld-icon]:flex-none", NOTE_TONE[tone]);
const legendInline = "list-none mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-fg-muted [&>li]:inline-flex [&>li]:items-center [&>li]:gap-1.5";
const badges = "flex flex-wrap gap-1.5";
// Pipeline step icon: the old tile rule was overridden by the node's span rule
// (block, mono 11.5px, muted ink; tone ink in dark mode).
const flowTile = "block flex-none w-7 h-7 rounded-[8px] bg-tone-info-soft text-fg-muted dark:text-tone-info font-mono text-[11.5px] [overflow-wrap:anywhere]";

interface QueuePoint {
  label: string;
  mean: number;
  max: number;
}

// NSE adapter queue-depth drain, bucketed from QueSize_NSE_22Jul2026.csv
// (2,318 samples, SeqNo 38736→62759). x-axis = progress through the session.
// Captured file, not a live feed — shown as sample data.
const QUEUE: QueuePoint[] = [
  { label: "0%", mean: 243, max: 657 },
  { label: "7%", mean: 711, max: 797 },
  { label: "15%", mean: 556, max: 643 },
  { label: "23%", mean: 379, max: 462 },
  { label: "30%", mean: 212, max: 296 },
  { label: "38%", mean: 51, max: 120 },
  { label: "46%", mean: 83, max: 171 },
  { label: "53%", mean: 223, max: 255 },
  { label: "61%", mean: 342, max: 423 },
  { label: "69%", mean: 458, max: 509 },
  { label: "76%", mean: 596, max: 663 },
  { label: "84%", mean: 681, max: 765 },
  { label: "92%", mean: 479, max: 798 },
];

const OMS_STATUS_LABELS: Record<number, string> = { 65: "COMPLETE", 56: "OPEN", 48: "CANCELED", 45: "REJECT", 70: "TRIGGER_PENDING" };
const OMS_STATUS_TONE: Record<number, Tone> = { 65: "ok", 56: "info", 48: "warn", 45: "crit", 70: "purple" };

/** OMS p99 above this is flagged (it is also the display cap on the p99 charts). */
const OMS_P99_WATCH = 2000;
/** An hour whose p99 is this many times the day's median hourly p99 is a spike. */
const SPIKE_FACTOR = 10;

const COLOR = { blue: "#2f6bff", teal: "#0ea5e9", amber: "#f5a524", red: "#e5383b", purple: "#7c4dff", green: "#16a34a" };

// ── Number helpers ──────────────────────────────────────────────────────────
function fmtV(v: number | string | null | undefined): string {
  if (v === undefined || v === null || v === "") return "—";
  if (typeof v !== "number") return v;
  if (Math.abs(v) >= 1000000) return (v / 1000000).toFixed(2) + "M";
  if (Math.abs(v) >= 1000) return v.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
}
const compact = (v: number) => (v >= 1e6 ? `${+(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${+(v / 1e3).toFixed(v >= 1e4 ? 0 : 1)}K` : String(Math.round(v)));
/** µs → "435 µs" / "4.7 ms" / "6.2 s" */
const fmtUs = (us: number) => (us >= 1e6 ? `${(us / 1e6).toFixed(1)} s` : us >= 1e4 ? `${(us / 1e3).toFixed(1)} ms` : `${Math.round(us).toLocaleString("en-US")} µs`);
const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const num = (v: number | string) => (typeof v === "number" ? v : v === "" ? null : Number.isFinite(Number(v)) ? Number(v) : null);

// ── Line chart over category labels (SVG, theme tokens) ─────────────────────
interface LineSeries { label: string; data: (number | null)[]; color: string; unit?: string; dashed?: boolean; fill?: boolean }

function LineChart({ labels, series, cap, marker, height = 200, title }: {
  labels: string[]; series: LineSeries[]; cap?: number; marker?: { index: number; text: string }; height?: number; title: string;
}) {
  const W = 560, H = height, L = 52, R = 12, T = 16, B = 26;
  const [hover, setHover] = React.useState<number | null>(null);
  const ref = React.useRef<SVGSVGElement>(null);
  if (!labels.length) return <Empty>No data.</Empty>;
  const shown = (v: number | null) => (v == null ? null : cap != null ? Math.min(v, cap) : v);
  const vals = series.flatMap((s) => s.data.map(shown).filter((v): v is number => v != null));
  const maxV = Math.max(1, ...vals) * 1.1;
  const x = (i: number) => L + (labels.length === 1 ? (W - L - R) / 2 : (i / (labels.length - 1)) * (W - L - R));
  const y = (v: number) => H - B - (v / maxV) * (H - T - B);
  const step = Math.max(1, Math.ceil(labels.length / 8));
  const onMove = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - L) / (W - L - R)) * (labels.length - 1));
    setHover(Math.min(labels.length - 1, Math.max(0, i)));
  };
  const runs = (data: (number | null)[]) => {
    const out: [number, number][][] = [];
    let cur: [number, number][] = [];
    data.forEach((v, i) => {
      const s = shown(v);
      if (s == null) { if (cur.length) out.push(cur); cur = []; }
      else cur.push([x(i), y(s)]);
    });
    if (cur.length) out.push(cur);
    return out;
  };
  const last = (s: LineSeries) => [...s.data].reverse().find((v) => v != null) ?? null;
  return (
    <div className="relative min-w-0">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block cursor-crosshair" role="img"
        aria-label={`${title}: ${series.map((s) => `${s.label} latest ${fmtV(last(s))}${s.unit ?? ""}, peak ${fmtV(Math.max(0, ...s.data.filter((v): v is number => v != null)))}${s.unit ?? ""}`).join("; ")}`}
        onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1={L} x2={W - R} y1={y(maxV * f)} y2={y(maxV * f)} className="stroke-line-subtle stroke-1" />
            <text x={L - 6} y={y(maxV * f) + 4} textAnchor="end" className="text-xs fill-fg-muted font-sans">{compact(maxV * f)}</text>
          </g>
        ))}
        {labels.map((lb, i) => (i % step === 0 || i === labels.length - 1) && (
          <text key={lb + i} x={x(i)} y={H - 8} textAnchor={i === 0 ? "start" : i === labels.length - 1 ? "end" : "middle"} className="text-xs fill-fg-muted font-sans">{lb}</text>
        ))}
        {marker && marker.index >= 0 && (
          <g>
            <line x1={x(marker.index)} x2={x(marker.index)} y1={T} y2={H - B} className="stroke-critical [stroke-dasharray:4_3] [stroke-width:1.5]" />
            <text x={x(marker.index) + 4} y={T + 10} className="text-2xs font-bold fill-critical font-sans">{marker.text}</text>
          </g>
        )}
        {series.map((s) => runs(s.data).map((run, ri) => {
          const pts = run.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(" ");
          return (
            <g key={`${s.label}-${ri}`}>
              {s.fill !== false && !s.dashed && run.length > 1 && (
                <polygon points={`${run[0][0].toFixed(1)},${y(0)} ${pts} ${run[run.length - 1][0].toFixed(1)},${y(0)}`} fill={s.color} fillOpacity={0.1} />
              )}
              {run.length > 1
                ? <polyline points={pts} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" className={s.dashed ? "[stroke-dasharray:6_4]" : undefined} />
                : <circle cx={run[0][0]} cy={run[0][1]} r={3} fill={s.color} />}
            </g>
          );
        }))}
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} stroke="var(--border-strong)" strokeDasharray="3 3" />}
      </svg>
      {hover != null ? (
        <div className="flex flex-wrap gap-x-3.5 gap-y-1 items-center px-2 py-1.5 mt-1 bg-bg-muted rounded-sm text-fg text-xs [&_span]:inline-flex [&_span]:items-center [&_span]:gap-[5px]">
          <b>{labels[hover]}</b>
          {series.map((s) => (
            <span key={s.label}><span className={ui.dot} style={{ background: s.color }} /> {s.label} {fmtV(s.data[hover])}{s.data[hover] != null ? s.unit ?? "" : ""}</span>
          ))}
        </div>
      ) : (
        <ul className={legendInline}>
          {series.map((s) => <li key={s.label}><span className={ui.dot} style={{ background: s.color }} /> {s.label}</li>)}
        </ul>
      )}
    </div>
  );
}

/** Horizontal bars with a formatted value column. */
function Bars({ rows, color = COLOR.blue, format = fmtV }: { rows: { label: string; value: number; color?: string }[]; color?: string; format?: (v: number) => string }) {
  if (!rows.length) return <Empty>No data.</Empty>;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className={ui.bars}>
      {rows.map((r) => (
        <li key={r.label} className={ui.barItemWide}>
          <span className={ui.barLabel}>{r.label}</span>
          <span className={ui.barTrack}><span className={ui.barFill} style={{ width: `${(r.value / max) * 100}%`, background: r.color ?? color }} /></span>
          <span className={cx(ui.barValue, "min-w-16")}>{format(r.value)}</span>
        </li>
      ))}
    </ul>
  );
}

function SampleBadge() {
  return <Pill tone="warn"><Icon icon={FlaskConicalIcon} /> Sample data — not connected</Pill>;
}

// ── Screen ─────────────────────────────────────────────────────────────────
type TabId = "overview" | "latency" | "exchange" | "queue" | "orders" | "schema";

export default function OrderLatencyScreen() {
  const { setRoute } = useNav();
  const [tab, setTab] = React.useState<TabId>("overview");
  const [clock, setClock] = React.useState("—");

  const hourly: LatencyHourly[] = useLatencyHourly().data ?? [];
  const segments: LatencySegment[] = useLatencySegments().data ?? [];
  const orders: OrderRecord[] = useOrderRecords().data ?? [];

  // Live IST clock
  React.useEffect(() => {
    const pad = (n: number) => String(n).padStart(2, "0");
    const tick = () => {
      const ist = new Date(Date.now() + 5.5 * 3600 * 1000);
      setClock(
        `${ist.getUTCFullYear()}-${pad(ist.getUTCMonth() + 1)}-${pad(ist.getUTCDate())} ` +
          `${pad(ist.getUTCHours())}:${pad(ist.getUTCMinutes())}:${pad(ist.getUTCSeconds())} IST`,
      );
    };
    tick();
    const t = window.setInterval(tick, 1000);
    return () => window.clearInterval(t);
  }, []);

  // ── Derived figures ──
  const labels = hourly.map((h) => h.label);
  const segTotal = segments.reduce((a, s) => a + s.count, 0);
  const totalOrders = segTotal || hourly.reduce((a, h) => a + h.orders, 0);
  const wavg = (k: "oms_med" | "oms_p99" | "exch_med" | "exch_p99") =>
    segTotal ? segments.reduce((a, s) => a + s[k] * s.count, 0) / segTotal : null;
  const omsMed = wavg("oms_med"), omsP99 = wavg("oms_p99"), exchMed = wavg("exch_med"), exchP99 = wavg("exch_p99");

  const p99Base = median(hourly.map((h) => h.oms_p99));
  const spikes = hourly.filter((h) => p99Base > 0 && h.oms_p99 > p99Base * SPIKE_FACTOR);
  const peakOms = hourly.reduce<LatencyHourly | null>((b, h) => (!b || h.oms_p99 > b.oms_p99 ? h : b), null);
  const peakExch = hourly.reduce<LatencyHourly | null>((b, h) => (!b || h.exch_p99 > b.exch_p99 ? h : b), null);
  const firstSpike = spikes[0];
  const spikeIdx = firstSpike ? labels.indexOf(firstSpike.label) : -1;
  const hourlyP99Median = median(hourly.filter((h) => !spikes.includes(h)).map((h) => h.oms_p99));
  const hourlyExchP99Median = median(hourly.filter((h) => !spikes.includes(h)).map((h) => h.exch_p99));

  const lat = orders.map((o) => num(o.lat)).filter((v): v is number => v != null);
  const confirmed = orders.filter((o) => o.exch === 48);
  const confLat = confirmed.map((o) => o.conf).filter((v) => v > 0);
  const pct = (n: number, d: number) => (d ? `${((n / d) * 100).toFixed(1)}%` : "—");

  const buckets: [string, (v: number) => boolean][] = [
    ["< 200 µs", (v) => v < 200], ["200–400 µs", (v) => v >= 200 && v < 400], ["400–600 µs", (v) => v >= 400 && v < 600],
    ["600 µs–1 ms", (v) => v >= 600 && v < 1000], ["1–2 ms", (v) => v >= 1000 && v < 2000], ["> 2 ms", (v) => v >= 2000],
  ];
  const statusCounts = [...orders.reduce((m, o) => m.set(o.oms, (m.get(o.oms) ?? 0) + 1), new Map<number, number>())].sort((a, b) => b[1] - a[1]);
  const exchBySeg = [...new Set(orders.map((o) => o.seg))].map((seg) => {
    const rows = orders.filter((o) => o.seg === seg);
    return { seg, ok: rows.filter((o) => o.exch === 48).length, pending: rows.filter((o) => o.exch !== 48).length };
  });

  const segSlices: Slice[] = segments.map((s, i) => ({ label: s.seg, value: s.count, color: PALETTE[i % PALETTE.length] }));
  const segWatch = (s: LatencySegment) => s.oms_p99 > OMS_P99_WATCH;

  const TABS: { id: TabId; icon: string; label: string; count?: string }[] = [
    { id: "overview", icon: "fa-chart-pie", label: "Overview" },
    { id: "latency", icon: "fa-stopwatch", label: "OMS Latency" },
    { id: "exchange", icon: "fa-link", label: "Exchange Confirmation" },
    { id: "queue", icon: "fa-layer-group", label: "Message Queue", count: "sample" },
    { id: "orders", icon: "fa-list", label: "Order Detail", count: fmt(orders.length) },
    { id: "schema", icon: "fa-sitemap", label: "Schema & Pipeline" },
  ];

  const noData = !hourly.length && !segments.length;

  return (
    <Page>
      <Crumbs items={[{ label: "Home", onClick: () => setRoute("dashboard") }, { label: "BOD / EOD" }, { label: "Order Latency" }]} />

      <PageHead
        title="Order Latency Monitor"
        subtitle="OMS and exchange-confirmation latency per hour and segment, from the L_ORDERLATENCY EOD batch"
        actions={
          <>
            {spikes.length > 0 && <Pill tone="crit"><span className={ui.pillDot} aria-hidden="true" /> {spikes.length} spike {spikes.length === 1 ? "window" : "windows"}</Pill>}
            {segments.length > 0 && <Pill tone="ok"><span className={ui.pillDot} aria-hidden="true" /> {segments.map((s) => s.seg).join(" / ")} reporting</Pill>}
            <span className={cx(ui.mono, "text-fg-muted")} aria-label="Current time in IST">{clock}</span>
          </>
        }
      />

      <Tabs aria-label="Order latency sections">
        {TABS.map((t) => (
          <Tab key={t.id} active={tab === t.id} id={`ol-tab-${t.id}`} aria-controls="ol-panel" onClick={() => setTab(t.id)}>
            <Icon name={t.icon} /> {t.label}{t.count && <> <span className="text-fg-muted">({t.count})</span></>}
          </Tab>
        ))}
      </Tabs>

      <div id="ol-panel" role="tabpanel" aria-labelledby={`ol-tab-${tab}`} className="flex flex-col gap-4 min-w-0">
        {noData && tab !== "schema" && tab !== "queue" && tab !== "orders" && (
          <div className={note("muted")} role="status">
            <Icon icon={UnplugIcon} />
            <p><b>No latency data loaded.</b> /trading/latency/hourly/ and /trading/latency/segments/ returned nothing — cards and charts fill in once the EOD batch has run.</p>
          </div>
        )}

        {/* ═══ OVERVIEW ═══ */}
        {tab === "overview" && (
          <>
            {firstSpike && (
              <div className={note("crit")} role="alert">
                <Icon icon={TriangleAlertIcon} />
                <p>
                  <b>Spike — {spikes.map((s) => s.label).join(", ")} IST:</b> OMS latency p99 reached <b>{fmtUs(firstSpike.oms_p99)}</b>
                  {" "}({fmtV(firstSpike.orders)} orders in that window, {SPIKE_FACTOR}× above the day's median hourly p99 of {fmtUs(p99Base)}).
                  {" "}Exchange confirmation p99 in the same window: {fmtUs(firstSpike.exch_p99)}.
                </p>
              </div>
            )}
            <div className={cx(ui.grid, ui.cols[6])}>
              <StatCard icon="fa-receipt" tone="info" label="Total orders" value={fmt(totalOrders)} note={labels.length ? `${labels[0]} → ${labels[labels.length - 1]} IST` : "no hourly data"} onClick={() => setTab("orders")} />
              <StatCard icon="fa-stopwatch" tone="ok" label="OMS latency median" value={omsMed != null ? fmtUs(omsMed) : "—"} note={hourly.length ? `hourly p99 median ${fmtUs(hourlyP99Median)} (ex-spike)` : "order-weighted"} onClick={() => setTab("latency")} />
              <StatCard icon="fa-link" tone="info" label="Exch confirm median" value={exchMed != null ? fmtUs(exchMed) : "—"} note={hourly.length ? `hourly p99 median ${fmtUs(hourlyExchP99Median)} (ex-spike)` : "order-weighted"} onClick={() => setTab("exchange")} />
              <StatCard icon="fa-bolt" tone={spikes.length ? "crit" : "ok"} label="Max OMS p99" value={peakOms ? fmtUs(peakOms.oms_p99) : "—"} note={peakOms ? `${peakOms.label} IST window` : "no hourly data"} />
              <StatCard icon="fa-gauge-high" tone="warn" label="OMS > 1 ms" value={pct(lat.filter((v) => v > 1000).length, lat.length)} note={`of ${fmt(lat.length)} loaded records with a latency`} />
              <StatCard icon="fa-layer-group" tone="purple" label="Active segments" value={fmt(segments.length)} note={segments.map((s) => s.seg).join(" · ") || "none reporting"} />
            </div>

            <div className={ui.split}>
              <Panel title="Order volume by hour">
                <p className={sub}>All segments combined · {fmt(hourly.reduce((a, h) => a + h.orders, 0))} orders</p>
                <Bars rows={hourly.map((h) => ({ label: `${h.label} IST`, value: h.orders, color: spikes.includes(h) ? COLOR.red : COLOR.blue }))} format={(v) => fmt(v)} />
              </Panel>
              <Panel title="Segment mix">
                {segments.length ? (
                  <div className="flex flex-wrap items-center gap-4.5">
                    <Donut slices={segSlices} center={compact(segTotal)} sub="orders" label={segments.map((s) => `${s.seg} ${s.pct}%`).join(", ")} />
                    <Legend slices={segSlices} />
                  </div>
                ) : <Empty>No segment data.</Empty>}
              </Panel>
            </div>

            <Panel title="Segment summary">
              {segments.length ? (
                <Table>
                    <thead>
                      <tr>
                        <th scope="col">Segment</th><th scope="col">Orders</th><th scope="col">Share</th>
                        <th scope="col">OMS median</th><th scope="col">OMS p99</th>
                        <th scope="col">Exch median</th><th scope="col">Exch p99</th><th scope="col">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {segments.map((s) => {
                        const watch = segWatch(s);
                        return (
                          <tr key={s.seg} className={watch ? "[&>td]:bg-warning-bg" : undefined}>
                            <td className="font-medium">{s.seg}</td>
                            <td className={monoCell}>{fmt(s.count)}</td>
                            <td>
                              <span className={ui.mono}>{s.pct}%</span>
                              <span className="block w-full max-w-[120px] h-[5px] mt-1 rounded-[3px] bg-bg-muted overflow-hidden" aria-hidden="true"><span className="block h-full rounded-[3px] bg-accent" style={{ width: `${Math.min(100, s.pct)}%` }} /></span>
                            </td>
                            <td className={monoCell}>{fmtUs(s.oms_med)}</td>
                            <td className={cx(monoCell, watch && CELL_CRIT)}>{fmtUs(s.oms_p99)}</td>
                            <td className={monoCell}>{fmtUs(s.exch_med)}</td>
                            <td className={monoCell}>{fmtUs(s.exch_p99)}</td>
                            <td>{watch ? <Pill tone="warn">Monitor · p99 &gt; {fmtUs(OMS_P99_WATCH)}</Pill> : <Pill tone="ok">Normal</Pill>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
              ) : <Empty>No segment data.</Empty>}
            </Panel>
          </>
        )}

        {/* ═══ OMS LATENCY ═══ */}
        {tab === "latency" && (
          <>
            <div className={note("warn")}>
              <Icon icon={InfoIcon} />
              <p><b>OMS_LATENCY note:</b> requires the placement timestamp from a separate Noren placement log or the Argus routing layer. The field is blank for unconfirmed rows; use the <code>norentm</code> delta when available.</p>
            </div>

            <div className={cx(ui.grid, ui.cols[2])}>
              <Panel title="OMS latency — median (µs)">
                <p className={sub}>Hourly · capped at {fmt(OMS_P99_WATCH)} µs for readability</p>
                <LineChart title="OMS latency median per hour" labels={labels} cap={OMS_P99_WATCH} marker={spikeIdx >= 0 ? { index: spikeIdx, text: "Spike" } : undefined}
                  series={[{ label: "OMS median", data: hourly.map((h) => h.oms_med), color: COLOR.blue, unit: " µs" }]} />
              </Panel>
              <Panel title="OMS latency — p99 (µs)">
                <p className={sub}>Spike windows clipped at {fmt(OMS_P99_WATCH)} µs; the hover readout shows the full value</p>
                <LineChart title="OMS latency p99 per hour" labels={labels} cap={OMS_P99_WATCH} marker={spikeIdx >= 0 ? { index: spikeIdx, text: "Spike" } : undefined}
                  series={[{ label: "OMS p99", data: hourly.map((h) => h.oms_p99), color: COLOR.red, unit: " µs" }]} />
              </Panel>
            </div>

            <div className={cx(ui.grid, ui.cols[2])}>
              <Panel title="OMS latency distribution">
                <p className={sub}>{fmt(lat.length)} loaded order records with an OMS latency</p>
                <Bars rows={buckets.map(([label, f]) => ({ label, value: lat.filter(f).length }))} format={(v) => fmt(v)} />
              </Panel>
              <Panel title="OMS latency by segment">
                <p className={sub}>Median and p99 per segment</p>
                {segments.length ? (
                  <Table>
                      <thead><tr><th scope="col">Segment</th><th scope="col">Median</th><th scope="col">p99</th><th scope="col">p99 vs {fmtUs(OMS_P99_WATCH)}</th></tr></thead>
                      <tbody>
                        {segments.map((s) => (
                          <tr key={s.seg}>
                            <td className="font-medium">{s.seg}</td>
                            <td className={monoCell}>{fmtUs(s.oms_med)}</td>
                            <td className={cx(monoCell, segWatch(s) && CELL_CRIT)}>{fmtUs(s.oms_p99)}</td>
                            <td className="min-w-[140px]">
                              <span className={cx(ui.barTrack, "block")}>
                                <span className={ui.barFill} style={{ width: `${Math.min(100, (s.oms_p99 / OMS_P99_WATCH) * 100)}%`, background: segWatch(s) ? COLOR.red : COLOR.blue }} />
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                ) : <Empty>No segment data.</Empty>}
              </Panel>
            </div>

            <Panel title="OMS status code distribution">
              <p className={sub}>OMS_STATUS column of the L_ORDERLATENCY CSV · {fmt(orders.length)} loaded records</p>
              <div className={badges}>
                {Object.entries(OMS_STATUS_LABELS).map(([code, label]) => <Pill key={code} tone={OMS_STATUS_TONE[Number(code)] ?? "muted"}>{code} = {label}</Pill>)}
              </div>
              <Bars rows={statusCounts.map(([code, n]) => ({ label: `${OMS_STATUS_LABELS[code] ?? code} (${code})`, value: n }))} format={(v) => fmt(v)} />
            </Panel>
          </>
        )}

        {/* ═══ EXCHANGE CONFIRM ═══ */}
        {tab === "exchange" && (
          <>
            <div className={cx(ui.grid, ui.cols.stats)}>
              <StatCard icon="fa-link" tone="ok" label="Median (order-weighted)" value={exchMed != null ? fmtUs(exchMed) : "—"} note="across segments" />
              <StatCard icon="fa-gauge-high" tone="warn" label="p99 (order-weighted)" value={exchP99 != null ? fmtUs(exchP99) : "—"} note={omsP99 != null ? `OMS p99 ${fmtUs(omsP99)}` : "across segments"} />
              <StatCard icon="fa-bolt" tone="crit" label="Max hourly p99" value={peakExch ? fmtUs(peakExch.exch_p99) : "—"} note={peakExch ? `${peakExch.label} IST window` : "no hourly data"} />
              <StatCard icon="fa-circle-check" tone="info" label="Confirmed orders" value={pct(confirmed.length, orders.length)} note={`EXCH_STATUS = 48 · ${fmt(confirmed.length)} of ${fmt(orders.length)} loaded`} />
              <StatCard icon="fa-hourglass-half" tone="muted" label="Exch confirm > 10 ms" value={pct(confLat.filter((v) => v > 10000).length, confLat.length)} note={`of ${fmt(confLat.length)} confirmed records`} />
            </div>

            <div className={cx(ui.grid, ui.cols[2])}>
              <Panel title="Exchange confirmation — median (µs)">
                <LineChart title="Exchange confirmation median per hour" labels={labels} cap={12000} marker={spikeIdx >= 0 ? { index: spikeIdx, text: "Spike" } : undefined}
                  series={[{ label: "Exch median", data: hourly.map((h) => h.exch_med), color: COLOR.teal, unit: " µs" }]} />
              </Panel>
              <Panel title="Exchange confirmation — p99 (µs)">
                <LineChart title="Exchange confirmation p99 per hour" labels={labels} cap={14000} marker={spikeIdx >= 0 ? { index: spikeIdx, text: "Spike" } : undefined}
                  series={[{ label: "Exch p99", data: hourly.map((h) => h.exch_p99), color: COLOR.amber, unit: " µs" }]} />
              </Panel>
            </div>

            <Panel title="Exchange status (EXCH_STATUS) by segment">
              <p className={sub}>48 = confirmed · blank = pending / not sent · {fmt(orders.length)} loaded records</p>
              {exchBySeg.length ? (
                <>
                  <ul className={ui.bars}>
                    {exchBySeg.map((r) => {
                      const tot = r.ok + r.pending || 1;
                      return (
                        <li key={r.seg} className={ui.barItemWide}>
                          <span className={ui.barLabel}>{r.seg}</span>
                          <span className="flex h-2.5 rounded-[5px] bg-bg-muted overflow-hidden" role="img" aria-label={`${r.seg}: ${r.ok} confirmed, ${r.pending} pending`}>
                            <span className="block h-full" style={{ width: `${(r.ok / tot) * 100}%`, background: COLOR.teal }} />
                            <span className="block h-full" style={{ width: `${(r.pending / tot) * 100}%`, background: "var(--border-strong)" }} />
                          </span>
                          <span className={cx(ui.barValue, "min-w-16")}>{r.ok}/{r.ok + r.pending}</span>
                        </li>
                      );
                    })}
                  </ul>
                  <ul className={legendInline}>
                    <li><span className={ui.dot} style={{ background: COLOR.teal }} /> Confirmed (48)</li>
                    <li><span className={ui.dot} style={{ background: "var(--border-strong)" }} /> Pending / blank</li>
                  </ul>
                </>
              ) : <Empty>No order records loaded.</Empty>}
            </Panel>
          </>
        )}

        {/* ═══ QUEUE SIZE ═══ */}
        {tab === "queue" && (
          <>
            <div className={note("warn")} role="status">
              <Icon icon={FlaskConicalIcon} />
              <p><b>Sample data — not connected.</b> The NSE adapter queue has no live feed yet. These figures come from a single captured file, QueSize_NSE_22Jul2026.csv (11:31–15:20 IST, 2,318 samples).</p>
            </div>

            <div className={cx(ui.grid, ui.cols.stats)}>
              <StatCard icon="fa-arrow-up" tone="muted" label="Peak depth (sample)" value={fmt(Math.max(...QUEUE.map((q) => q.max)))} note="largest drain episode" />
              <StatCard icon="fa-wave-square" tone="muted" label="Mean of bucket means (sample)" value={(QUEUE.reduce((a, q) => a + q.mean, 0) / QUEUE.length).toFixed(1)} note={`${QUEUE.length} buckets`} />
              <StatCard icon="fa-chart-line" tone="muted" label="p95 threshold (sample)" value="744" note="from the captured file" />
              <StatCard icon="fa-envelope" tone="muted" label="Messages (sample)" value="24,023" note="SeqNo 38,736 → 62,759" />
            </div>

            <Card as="section" className={ui.panel} aria-labelledby="ol-q1">
              <div className={ui.panelHead}><h2 id="ol-q1" className={ui.panelTitle}>NSE queue depth — mean &amp; max</h2><SampleBadge /></div>
              <p className={sub}>NSE adapter · x-axis = progress through the captured episode</p>
              <LineChart title="NSE queue depth (sample data)" labels={QUEUE.map((q) => q.label)} series={[
                { label: "Mean queue", data: QUEUE.map((q) => q.mean), color: COLOR.blue },
                { label: "Max queue", data: QUEUE.map((q) => q.max), color: COLOR.amber },
              ]} />
            </Card>

            <Card as="section" className={ui.panel} aria-labelledby="ol-q2">
              <div className={ui.panelHead}><h2 id="ol-q2" className={ui.panelTitle}>Max queue depth vs p95 alert threshold</h2><SampleBadge /></div>
              <LineChart title="NSE max queue depth against the 744 threshold (sample data)" labels={QUEUE.map((q) => q.label)} series={[
                { label: "Max depth", data: QUEUE.map((q) => q.max), color: COLOR.amber },
                { label: "p95 threshold (744)", data: QUEUE.map(() => 744), color: COLOR.blue, dashed: true },
              ]} />
            </Card>
          </>
        )}

        {/* ═══ ORDER DETAIL ═══ */}
        {tab === "orders" && (
          <Panel title={`Order records — L_ORDERLATENCY format (${fmt(orders.length)})`}>
            <p className={sub}>
              Latest records returned by /trading/latency/orders/ (up to 200), in the 9-column <code>L_ORDERLATENCY*.csv</code> format produced by the Argus Celery EOD batch.
              New fields: EXT_RMKS, OMS_STATUS, EXCH_STATUS.
            </p>
            {orders.length ? (
              <Table>
                  <thead>
                    <tr>
                      <th scope="col">NOREN_ORD_NUM</th>
                      <th scope="col">EXCH_SEG</th>
                      <th scope="col">EXT_RMKS</th>
                      <th scope="col">OMS_STATUS</th>
                      <th scope="col">OMS_LATENCY</th>
                      <th scope="col">EXCH_STATUS</th>
                      <th scope="col">OMS_EXCH_CONFIRM</th>
                      <th scope="col">OMSUPDATETIME</th>
                      <th scope="col">EXCHUPDATETIME</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.ord}>
                        <td className={monoCell}>{o.ord}</td>
                        <td className="font-medium">{o.seg}</td>
                        <td className={monoCell}>{o.rmks}</td>
                        <td><Pill tone={OMS_STATUS_TONE[o.oms] ?? "muted"}>{o.oms} {OMS_STATUS_LABELS[o.oms] ?? ""}</Pill></td>
                        <td className={monoCell}>{o.lat !== "" ? o.lat : <span className="text-fg-muted">—</span>}</td>
                        <td>{o.exch === 48 ? <Pill tone="ok">48 CONFIRMED</Pill> : <Pill tone="muted">PENDING</Pill>}</td>
                        <td className={monoCell}>{o.conf ? o.conf.toLocaleString("en-US") : <span className="text-fg-muted">0</span>}</td>
                        <td className={monoCell}>{o.omsT}</td>
                        <td className={monoCell}>{o.exchT || <span className="text-fg-muted">0</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
            ) : <Empty>No order records loaded.</Empty>}
          </Panel>
        )}

        {/* ═══ SCHEMA ═══ */}
        {tab === "schema" && (
          <>
            <div className={ui.splitWide}>
              <Panel title="L_ORDERLATENCY — 9-column schema">
                <p className={sub}>Noren OMS source → CSV output mapping (new fields highlighted)</p>
                <Table>
                    <thead>
                      <tr><th scope="col">CSV column</th><th scope="col">Noren source</th><th scope="col">Type</th><th scope="col">Notes</th></tr>
                    </thead>
                    <tbody>
                      {([
                        ["NOREN_ORD_NUM", "norenordno", "string", "Unique order number (14 chars)", false],
                        ["EXCH_SEG", "exch", "string", "NSE / BSE / NFO / BFO / MCX", false],
                        ["EXT_RMKS", "remarks", "string", "Order-entry external remark (e.g. L7245591q22)", true],
                        ["OMS_STATUS", "status", "int", "COMPLETE=65, OPEN=56, CANCELED=48, REJECT=45", true],
                        ["OMS_LATENCY", "Derived", "float (µs)", "Placement → OMS ack; needs placement log", false],
                        ["EXCH_STATUS", "exchordid", "int / blank", "48 if confirmed; blank if pending/not sent", true],
                        ["OMS_EXCH_CONFIRMATION", "exch_tm − norentm", "float (µs)", "0 when exchange not confirmed", false],
                        ["OMSUPDATETIME", "norentm", "int (epoch)", 'Parsed from "HH:MM:SS DD-MM-YYYY"', false],
                        ["EXCHUPDATETIME", "exch_tm", "int (epoch)", "0 when Noren sentinel 01-01-1980", false],
                      ] as [string, string, string, string, boolean][]).map(([col, src, type, note, isNew]) => (
                        <tr key={col} className={isNew ? ui.rowSelected : undefined}>
                          <td className={monoCell}>{col}{isNew && <> <Pill tone="info">new</Pill></>}</td>
                          <td className={monoCell}>{src}</td>
                          <td>{type}</td>
                          <td className={ui.cellWrap}>{note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
              </Panel>

              <div className="flex flex-col gap-2.5 min-w-0">
                <Panel title="Filename convention">
                  <div className="font-mono text-sm px-3.5 py-2.5 border border-line rounded bg-bg-muted [overflow-wrap:anywhere]">
                    <span className="text-success font-bold">L_</span><span className="text-accent font-bold">ORDERLATENCY</span><span className="text-warning font-bold">20260616161500</span><span className="text-fg-muted">.csv</span>
                  </div>
                  <dl className={ui.dl}>
                    <dt className={ui.mono}>L_</dt><dd>Required prefix (new)</dd>
                    <dt className={ui.mono}>ORDERLATENCY</dt><dd>Fixed token</dd>
                    <dt className={ui.mono}>YYYYMMDDHHmmss</dt><dd>Batch run time</dd>
                  </dl>
                </Panel>
                <Panel title="Celery beat schedule">
                  <dl className={ui.dl}>
                    <dt>Task</dt><dd className={ui.mono}>latency.tasks.generate_order_latency_csv</dd>
                    <dt>Schedule</dt><dd>16:15 IST Mon–Fri (10:45 UTC)</dd>
                    <dt>Queue</dt><dd className={ui.mono}>eod_batch</dd>
                    <dt>Retry</dt><dd>3× / 5 min delay</dd>
                  </dl>
                </Panel>
              </div>
            </div>

            <Panel title="End-to-end pipeline — Argus / Celery">
              {/* An arrow between pipeline steps (hidden on phones, where the steps stack). */}
              <ol className="list-none flex flex-wrap items-stretch gap-2.5 [&>li+li]:before:content-['→'] [&>li+li]:before:font-semibold [&>li+li]:before:text-sm [&>li+li]:before:self-center [&>li+li]:before:text-fg-faint max-sm:[&>li+li]:before:hidden" aria-label="Order latency pipeline">
                {([
                  ["fa-file-lines", "Noren OMS log", "orders_YYYYMMDD.log", false],
                  ["fa-magnifying-glass", "parser.py", "auto-detect format", true],
                  ["fa-arrows-rotate", "transform_record()", "map fields · status codes · latencies", true],
                  ["fa-pen", "writer.py", "9-column CSV · L_ prefix", true],
                  ["fa-folder-open", "Output file", "/opt/argus/reports/", false],
                  ["fa-chart-column", "This dashboard", "load CSV → visualise", false],
                ] as [string, string, string, boolean][]).map(([ic, t, sub, hl]) => (
                  <li key={t} className="flex items-center gap-2.5 max-sm:flex-[1_1_100%]">
                    <div className={cx("flex items-center gap-2.5 px-3 py-2 border rounded min-w-0 max-sm:flex-1", hl ? "border-accent bg-info-bg" : "border-line bg-bg-muted")}>
                      <span className={flowTile} aria-hidden="true"><Icon name={ic} /></span>
                      <div><b className="block text-sm text-fg">{t}</b><span className="block text-[11.5px] text-fg-muted font-mono [overflow-wrap:anywhere]">{sub}</span></div>
                    </div>
                  </li>
                ))}
              </ol>
            </Panel>

            <div className={cx(ui.grid, ui.cols[2])}>
              <Panel title="Stack">
                <div className={badges}>
                  {["React + TypeScript + Vite", "Django + DRF", "Celery + Redis 7", "PostgreSQL 16", "OPA + Keycloak", "Gunicorn + Uvicorn"].map((t) => <Pill key={t} tone="info">{t}</Pill>)}
                </div>
              </Panel>
              <Card as="section" className={ui.panel} aria-labelledby="ol-tests">
                <div className={ui.panelHead}><h2 id="ol-tests" className={ui.panelTitle}>Parser test suite</h2><SampleBadge /></div>
                <p className={sub}>Cases covered by the parser tests. Results are not reported to this page yet.</p>
                <ul className="list-none grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-x-3.5 gap-y-1.5">
                  {["JSON-lines parse", "Pipe-delimited parse", "COMPLETE transform", "OPEN/unconfirmed transform", "REJECT transform", "CSV write + L_ prefix", "Header exact match", "Row count"].map((t) => (
                    <li key={t} className="flex items-center gap-2 text-[12.5px] text-fg-muted"><Icon icon={CircleDotIcon} className="text-fg-faint" /> {t}</li>
                  ))}
                </ul>
              </Card>
            </div>
          </>
        )}
      </div>
    </Page>
  );
}
