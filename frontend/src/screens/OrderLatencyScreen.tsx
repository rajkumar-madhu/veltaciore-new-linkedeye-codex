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
import "@/styles/trading.css";

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
    <div className="ld-trading-chart">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="ld-trend" role="img"
        aria-label={`${title}: ${series.map((s) => `${s.label} latest ${fmtV(last(s))}${s.unit ?? ""}, peak ${fmtV(Math.max(0, ...s.data.filter((v): v is number => v != null)))}${s.unit ?? ""}`).join("; ")}`}
        onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1={L} x2={W - R} y1={y(maxV * f)} y2={y(maxV * f)} className="ld-gridline" />
            <text x={L - 6} y={y(maxV * f) + 4} textAnchor="end" className="ld-axis">{compact(maxV * f)}</text>
          </g>
        ))}
        {labels.map((lb, i) => (i % step === 0 || i === labels.length - 1) && (
          <text key={lb + i} x={x(i)} y={H - 8} textAnchor={i === 0 ? "start" : i === labels.length - 1 ? "end" : "middle"} className="ld-axis">{lb}</text>
        ))}
        {marker && marker.index >= 0 && (
          <g>
            <line x1={x(marker.index)} x2={x(marker.index)} y1={T} y2={H - B} className="ld-trading-marker-line" />
            <text x={x(marker.index) + 4} y={T + 10} className="ld-trading-marker-text">{marker.text}</text>
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
                ? <polyline points={pts} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" className={s.dashed ? "ld-trading-threshold" : undefined} />
                : <circle cx={run[0][0]} cy={run[0][1]} r={3} fill={s.color} />}
            </g>
          );
        }))}
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} stroke="var(--border-strong)" strokeDasharray="3 3" />}
      </svg>
      {hover != null ? (
        <div className="ld-chart-tip ld-small">
          <b>{labels[hover]}</b>
          {series.map((s) => (
            <span key={s.label}><span className="ld-dot" style={{ background: s.color }} /> {s.label} {fmtV(s.data[hover])}{s.data[hover] != null ? s.unit ?? "" : ""}</span>
          ))}
        </div>
      ) : (
        <ul className="ld-legend-inline">
          {series.map((s) => <li key={s.label}><span className="ld-dot" style={{ background: s.color }} /> {s.label}</li>)}
        </ul>
      )}
    </div>
  );
}

/** Horizontal bars (ld-bars) with a formatted value column. */
function Bars({ rows, color = COLOR.blue, format = fmtV }: { rows: { label: string; value: number; color?: string }[]; color?: string; format?: (v: number) => string }) {
  if (!rows.length) return <Empty>No data.</Empty>;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="ld-bars">
      {rows.map((r) => (
        <li key={r.label}>
          <span className="ld-bar-label">{r.label}</span>
          <span className="ld-bar-track"><span className="ld-bar-fill" style={{ width: `${(r.value / max) * 100}%`, background: r.color ?? color }} /></span>
          <span className="ld-bar-value ld-bar-value-wide">{format(r.value)}</span>
        </li>
      ))}
    </ul>
  );
}

function SampleBadge() {
  return <Pill tone="warn"><i className="fa-solid fa-flask" aria-hidden="true" /> Sample data — not connected</Pill>;
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
    <div className="ld-dash">
      <nav className="ld-crumbs" aria-label="Breadcrumb">
        <button type="button" className="ld-link" onClick={() => setRoute("dashboard")}>Home</button>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <span>BOD / EOD</span>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <span>Order Latency</span>
      </nav>

      <div className="ld-head">
        <div>
          <h1>Order Latency Monitor</h1>
          <p>OMS and exchange-confirmation latency per hour and segment, from the L_ORDERLATENCY EOD batch</p>
        </div>
        <div className="ld-head-actions">
          {spikes.length > 0 && <Pill tone="crit"><span className="ld-pill-dot" aria-hidden="true" /> {spikes.length} spike {spikes.length === 1 ? "window" : "windows"}</Pill>}
          {segments.length > 0 && <Pill tone="ok"><span className="ld-pill-dot" aria-hidden="true" /> {segments.map((s) => s.seg).join(" / ")} reporting</Pill>}
          <span className="ld-mono ld-muted" aria-label="Current time in IST">{clock}</span>
        </div>
      </div>

      <div className="ld-tabs" role="tablist" aria-label="Order latency sections">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" id={`ol-tab-${t.id}`} aria-selected={tab === t.id} aria-controls="ol-panel"
            className={`ld-tab${tab === t.id ? " active" : ""}`} onClick={() => setTab(t.id)}>
            <i className={`fa-solid ${t.icon}`} aria-hidden="true" /> {t.label}{t.count && <> <span className="ld-muted">({t.count})</span></>}
          </button>
        ))}
      </div>

      <div id="ol-panel" role="tabpanel" aria-labelledby={`ol-tab-${tab}`} className="ld-trading-tabpanel">
        {noData && tab !== "schema" && tab !== "queue" && tab !== "orders" && (
          <div className="ld-card ld-trading-note muted" role="status">
            <i className="fa-solid fa-plug-circle-xmark" aria-hidden="true" />
            <p><b>No latency data loaded.</b> /trading/latency/hourly/ and /trading/latency/segments/ returned nothing — cards and charts fill in once the EOD batch has run.</p>
          </div>
        )}

        {/* ═══ OVERVIEW ═══ */}
        {tab === "overview" && (
          <>
            {firstSpike && (
              <div className="ld-card ld-trading-note crit" role="alert">
                <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                <p>
                  <b>Spike — {spikes.map((s) => s.label).join(", ")} IST:</b> OMS latency p99 reached <b>{fmtUs(firstSpike.oms_p99)}</b>
                  {" "}({fmtV(firstSpike.orders)} orders in that window, {SPIKE_FACTOR}× above the day's median hourly p99 of {fmtUs(p99Base)}).
                  {" "}Exchange confirmation p99 in the same window: {fmtUs(firstSpike.exch_p99)}.
                </p>
              </div>
            )}

            <div className="ld-grid ld-grid-stats ld-grid-6">
              <StatCard icon="fa-receipt" tone="info" label="Total orders" value={fmt(totalOrders)} note={labels.length ? `${labels[0]} → ${labels[labels.length - 1]} IST` : "no hourly data"} onClick={() => setTab("orders")} />
              <StatCard icon="fa-stopwatch" tone="ok" label="OMS latency median" value={omsMed != null ? fmtUs(omsMed) : "—"} note={hourly.length ? `hourly p99 median ${fmtUs(hourlyP99Median)} (ex-spike)` : "order-weighted"} onClick={() => setTab("latency")} />
              <StatCard icon="fa-link" tone="info" label="Exch confirm median" value={exchMed != null ? fmtUs(exchMed) : "—"} note={hourly.length ? `hourly p99 median ${fmtUs(hourlyExchP99Median)} (ex-spike)` : "order-weighted"} onClick={() => setTab("exchange")} />
              <StatCard icon="fa-bolt" tone={spikes.length ? "crit" : "ok"} label="Max OMS p99" value={peakOms ? fmtUs(peakOms.oms_p99) : "—"} note={peakOms ? `${peakOms.label} IST window` : "no hourly data"} />
              <StatCard icon="fa-gauge-high" tone="warn" label="OMS > 1 ms" value={pct(lat.filter((v) => v > 1000).length, lat.length)} note={`of ${fmt(lat.length)} loaded records with a latency`} />
              <StatCard icon="fa-layer-group" tone="purple" label="Active segments" value={fmt(segments.length)} note={segments.map((s) => s.seg).join(" · ") || "none reporting"} />
            </div>

            <div className="ld-split">
              <Panel title="Order volume by hour">
                <p className="ld-trading-sub">All segments combined · {fmt(hourly.reduce((a, h) => a + h.orders, 0))} orders</p>
                <Bars rows={hourly.map((h) => ({ label: `${h.label} IST`, value: h.orders, color: spikes.includes(h) ? COLOR.red : COLOR.blue }))} format={(v) => fmt(v)} />
              </Panel>
              <Panel title="Segment mix">
                {segments.length ? (
                  <div className="ld-donut-row">
                    <Donut slices={segSlices} center={compact(segTotal)} sub="orders" label={segments.map((s) => `${s.seg} ${s.pct}%`).join(", ")} />
                    <Legend slices={segSlices} />
                  </div>
                ) : <Empty>No segment data.</Empty>}
              </Panel>
            </div>

            <Panel title="Segment summary">
              {segments.length ? (
                <div className="ld-table-wrap">
                  <table className="ld-table">
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
                          <tr key={s.seg} className={watch ? "ld-trading-row-warn" : undefined}>
                            <td className="ld-strong">{s.seg}</td>
                            <td className="ld-mono">{fmt(s.count)}</td>
                            <td>
                              <span className="ld-mono">{s.pct}%</span>
                              <span className="ld-trading-pbar" aria-hidden="true"><span style={{ width: `${Math.min(100, s.pct)}%` }} /></span>
                            </td>
                            <td className="ld-mono">{fmtUs(s.oms_med)}</td>
                            <td className={`ld-mono${watch ? " ld-text-crit" : ""}`}>{fmtUs(s.oms_p99)}</td>
                            <td className="ld-mono">{fmtUs(s.exch_med)}</td>
                            <td className="ld-mono">{fmtUs(s.exch_p99)}</td>
                            <td>{watch ? <Pill tone="warn">Monitor · p99 &gt; {fmtUs(OMS_P99_WATCH)}</Pill> : <Pill tone="ok">Normal</Pill>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : <Empty>No segment data.</Empty>}
            </Panel>
          </>
        )}

        {/* ═══ OMS LATENCY ═══ */}
        {tab === "latency" && (
          <>
            <div className="ld-card ld-trading-note warn">
              <i className="fa-solid fa-circle-info" aria-hidden="true" />
              <p><b>OMS_LATENCY note:</b> requires the placement timestamp from a separate Noren placement log or the Argus routing layer. The field is blank for unconfirmed rows; use the <code>norentm</code> delta when available.</p>
            </div>

            <div className="ld-grid ld-grid-2">
              <Panel title="OMS latency — median (µs)">
                <p className="ld-trading-sub">Hourly · capped at {fmt(OMS_P99_WATCH)} µs for readability</p>
                <LineChart title="OMS latency median per hour" labels={labels} cap={OMS_P99_WATCH} marker={spikeIdx >= 0 ? { index: spikeIdx, text: "Spike" } : undefined}
                  series={[{ label: "OMS median", data: hourly.map((h) => h.oms_med), color: COLOR.blue, unit: " µs" }]} />
              </Panel>
              <Panel title="OMS latency — p99 (µs)">
                <p className="ld-trading-sub">Spike windows clipped at {fmt(OMS_P99_WATCH)} µs; the hover readout shows the full value</p>
                <LineChart title="OMS latency p99 per hour" labels={labels} cap={OMS_P99_WATCH} marker={spikeIdx >= 0 ? { index: spikeIdx, text: "Spike" } : undefined}
                  series={[{ label: "OMS p99", data: hourly.map((h) => h.oms_p99), color: COLOR.red, unit: " µs" }]} />
              </Panel>
            </div>

            <div className="ld-grid ld-grid-2">
              <Panel title="OMS latency distribution">
                <p className="ld-trading-sub">{fmt(lat.length)} loaded order records with an OMS latency</p>
                <Bars rows={buckets.map(([label, f]) => ({ label, value: lat.filter(f).length }))} format={(v) => fmt(v)} />
              </Panel>
              <Panel title="OMS latency by segment">
                <p className="ld-trading-sub">Median and p99 per segment</p>
                {segments.length ? (
                  <div className="ld-table-wrap">
                    <table className="ld-table">
                      <thead><tr><th scope="col">Segment</th><th scope="col">Median</th><th scope="col">p99</th><th scope="col">p99 vs {fmtUs(OMS_P99_WATCH)}</th></tr></thead>
                      <tbody>
                        {segments.map((s) => (
                          <tr key={s.seg}>
                            <td className="ld-strong">{s.seg}</td>
                            <td className="ld-mono">{fmtUs(s.oms_med)}</td>
                            <td className={`ld-mono${segWatch(s) ? " ld-text-crit" : ""}`}>{fmtUs(s.oms_p99)}</td>
                            <td className="ld-trading-barcell">
                              <span className="ld-bar-track">
                                <span className="ld-bar-fill" style={{ width: `${Math.min(100, (s.oms_p99 / OMS_P99_WATCH) * 100)}%`, background: segWatch(s) ? COLOR.red : COLOR.blue }} />
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <Empty>No segment data.</Empty>}
              </Panel>
            </div>

            <Panel title="OMS status code distribution">
              <p className="ld-trading-sub">OMS_STATUS column of the L_ORDERLATENCY CSV · {fmt(orders.length)} loaded records</p>
              <div className="ld-trading-badges">
                {Object.entries(OMS_STATUS_LABELS).map(([code, label]) => <Pill key={code} tone={OMS_STATUS_TONE[Number(code)] ?? "muted"}>{code} = {label}</Pill>)}
              </div>
              <Bars rows={statusCounts.map(([code, n]) => ({ label: `${OMS_STATUS_LABELS[code] ?? code} (${code})`, value: n }))} format={(v) => fmt(v)} />
            </Panel>
          </>
        )}

        {/* ═══ EXCHANGE CONFIRM ═══ */}
        {tab === "exchange" && (
          <>
            <div className="ld-grid ld-grid-stats">
              <StatCard icon="fa-link" tone="ok" label="Median (order-weighted)" value={exchMed != null ? fmtUs(exchMed) : "—"} note="across segments" />
              <StatCard icon="fa-gauge-high" tone="warn" label="p99 (order-weighted)" value={exchP99 != null ? fmtUs(exchP99) : "—"} note={omsP99 != null ? `OMS p99 ${fmtUs(omsP99)}` : "across segments"} />
              <StatCard icon="fa-bolt" tone="crit" label="Max hourly p99" value={peakExch ? fmtUs(peakExch.exch_p99) : "—"} note={peakExch ? `${peakExch.label} IST window` : "no hourly data"} />
              <StatCard icon="fa-circle-check" tone="info" label="Confirmed orders" value={pct(confirmed.length, orders.length)} note={`EXCH_STATUS = 48 · ${fmt(confirmed.length)} of ${fmt(orders.length)} loaded`} />
              <StatCard icon="fa-hourglass-half" tone="muted" label="Exch confirm > 10 ms" value={pct(confLat.filter((v) => v > 10000).length, confLat.length)} note={`of ${fmt(confLat.length)} confirmed records`} />
            </div>

            <div className="ld-grid ld-grid-2">
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
              <p className="ld-trading-sub">48 = confirmed · blank = pending / not sent · {fmt(orders.length)} loaded records</p>
              {exchBySeg.length ? (
                <>
                  <ul className="ld-bars">
                    {exchBySeg.map((r) => {
                      const tot = r.ok + r.pending || 1;
                      return (
                        <li key={r.seg}>
                          <span className="ld-bar-label">{r.seg}</span>
                          <span className="ld-trading-stack" role="img" aria-label={`${r.seg}: ${r.ok} confirmed, ${r.pending} pending`}>
                            <span style={{ width: `${(r.ok / tot) * 100}%`, background: COLOR.teal }} />
                            <span style={{ width: `${(r.pending / tot) * 100}%`, background: "var(--border-strong)" }} />
                          </span>
                          <span className="ld-bar-value ld-bar-value-wide">{r.ok}/{r.ok + r.pending}</span>
                        </li>
                      );
                    })}
                  </ul>
                  <ul className="ld-legend-inline">
                    <li><span className="ld-dot" style={{ background: COLOR.teal }} /> Confirmed (48)</li>
                    <li><span className="ld-dot" style={{ background: "var(--border-strong)" }} /> Pending / blank</li>
                  </ul>
                </>
              ) : <Empty>No order records loaded.</Empty>}
            </Panel>
          </>
        )}

        {/* ═══ QUEUE SIZE ═══ */}
        {tab === "queue" && (
          <>
            <div className="ld-card ld-trading-note warn" role="status">
              <i className="fa-solid fa-flask" aria-hidden="true" />
              <p><b>Sample data — not connected.</b> The NSE adapter queue has no live feed yet. These figures come from a single captured file, QueSize_NSE_22Jul2026.csv (11:31–15:20 IST, 2,318 samples).</p>
            </div>

            <div className="ld-grid ld-grid-stats">
              <StatCard icon="fa-arrow-up" tone="muted" label="Peak depth (sample)" value={fmt(Math.max(...QUEUE.map((q) => q.max)))} note="largest drain episode" />
              <StatCard icon="fa-wave-square" tone="muted" label="Mean of bucket means (sample)" value={(QUEUE.reduce((a, q) => a + q.mean, 0) / QUEUE.length).toFixed(1)} note={`${QUEUE.length} buckets`} />
              <StatCard icon="fa-chart-line" tone="muted" label="p95 threshold (sample)" value="744" note="from the captured file" />
              <StatCard icon="fa-envelope" tone="muted" label="Messages (sample)" value="24,023" note="SeqNo 38,736 → 62,759" />
            </div>

            <section className="ld-card ld-panel" aria-labelledby="ol-q1">
              <div className="ld-panel-head"><h2 id="ol-q1">NSE queue depth — mean &amp; max</h2><SampleBadge /></div>
              <p className="ld-trading-sub">NSE adapter · x-axis = progress through the captured episode</p>
              <LineChart title="NSE queue depth (sample data)" labels={QUEUE.map((q) => q.label)} series={[
                { label: "Mean queue", data: QUEUE.map((q) => q.mean), color: COLOR.blue },
                { label: "Max queue", data: QUEUE.map((q) => q.max), color: COLOR.amber },
              ]} />
            </section>

            <section className="ld-card ld-panel" aria-labelledby="ol-q2">
              <div className="ld-panel-head"><h2 id="ol-q2">Max queue depth vs p95 alert threshold</h2><SampleBadge /></div>
              <LineChart title="NSE max queue depth against the 744 threshold (sample data)" labels={QUEUE.map((q) => q.label)} series={[
                { label: "Max depth", data: QUEUE.map((q) => q.max), color: COLOR.amber },
                { label: "p95 threshold (744)", data: QUEUE.map(() => 744), color: COLOR.blue, dashed: true },
              ]} />
            </section>
          </>
        )}

        {/* ═══ ORDER DETAIL ═══ */}
        {tab === "orders" && (
          <Panel title={`Order records — L_ORDERLATENCY format (${fmt(orders.length)})`}>
            <p className="ld-trading-sub">
              Latest records returned by /trading/latency/orders/ (up to 200), in the 9-column <code>L_ORDERLATENCY*.csv</code> format produced by the Argus Celery EOD batch.
              New fields: EXT_RMKS, OMS_STATUS, EXCH_STATUS.
            </p>
            {orders.length ? (
              <div className="ld-table-wrap">
                <table className="ld-table">
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
                        <td className="ld-mono">{o.ord}</td>
                        <td className="ld-strong">{o.seg}</td>
                        <td className="ld-mono">{o.rmks}</td>
                        <td><Pill tone={OMS_STATUS_TONE[o.oms] ?? "muted"}>{o.oms} {OMS_STATUS_LABELS[o.oms] ?? ""}</Pill></td>
                        <td className="ld-mono">{o.lat !== "" ? o.lat : <span className="ld-muted">—</span>}</td>
                        <td>{o.exch === 48 ? <Pill tone="ok">48 CONFIRMED</Pill> : <Pill tone="muted">PENDING</Pill>}</td>
                        <td className="ld-mono">{o.conf ? o.conf.toLocaleString("en-US") : <span className="ld-muted">0</span>}</td>
                        <td className="ld-mono">{o.omsT}</td>
                        <td className="ld-mono">{o.exchT || <span className="ld-muted">0</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <Empty>No order records loaded.</Empty>}
          </Panel>
        )}

        {/* ═══ SCHEMA ═══ */}
        {tab === "schema" && (
          <>
            <div className="ld-split ld-split-wide">
              <Panel title="L_ORDERLATENCY — 9-column schema">
                <p className="ld-trading-sub">Noren OMS source → CSV output mapping (new fields highlighted)</p>
                <div className="ld-table-wrap">
                  <table className="ld-table">
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
                        <tr key={col} className={isNew ? "ld-trading-row-next" : undefined}>
                          <td className="ld-mono">{col}{isNew && <> <Pill tone="info">new</Pill></>}</td>
                          <td className="ld-mono ld-muted">{src}</td>
                          <td className="ld-muted">{type}</td>
                          <td className="ld-wrap">{note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>

              <div className="ld-rail ld-trading-stack-notes">
                <Panel title="Filename convention">
                  <div className="ld-trading-fname">
                    <span className="t1">L_</span><span className="t2">ORDERLATENCY</span><span className="t3">20260616161500</span><span className="t4">.csv</span>
                  </div>
                  <dl className="ld-dl">
                    <dt className="ld-mono">L_</dt><dd>Required prefix (new)</dd>
                    <dt className="ld-mono">ORDERLATENCY</dt><dd>Fixed token</dd>
                    <dt className="ld-mono">YYYYMMDDHHmmss</dt><dd>Batch run time</dd>
                  </dl>
                </Panel>
                <Panel title="Celery beat schedule">
                  <dl className="ld-dl">
                    <dt>Task</dt><dd className="ld-mono">latency.tasks.generate_order_latency_csv</dd>
                    <dt>Schedule</dt><dd>16:15 IST Mon–Fri (10:45 UTC)</dd>
                    <dt>Queue</dt><dd className="ld-mono">eod_batch</dd>
                    <dt>Retry</dt><dd>3× / 5 min delay</dd>
                  </dl>
                </Panel>
              </div>
            </div>

            <Panel title="End-to-end pipeline — Argus / Celery">
              <ol className="ld-trading-flow" aria-label="Order latency pipeline">
                {([
                  ["fa-file-lines", "Noren OMS log", "orders_YYYYMMDD.log", false],
                  ["fa-magnifying-glass", "parser.py", "auto-detect format", true],
                  ["fa-arrows-rotate", "transform_record()", "map fields · status codes · latencies", true],
                  ["fa-pen", "writer.py", "9-column CSV · L_ prefix", true],
                  ["fa-folder-open", "Output file", "/opt/argus/reports/", false],
                  ["fa-chart-column", "This dashboard", "load CSV → visualise", false],
                ] as [string, string, string, boolean][]).map(([ic, t, sub, hl]) => (
                  <li key={t}>
                    <div className={`ld-trading-flow-node${hl ? " hl" : ""}`}>
                      <span className="ld-tile ld-tile-sm ld-info" aria-hidden="true"><i className={`fa-solid ${ic}`} /></span>
                      <div><b>{t}</b><span>{sub}</span></div>
                    </div>
                  </li>
                ))}
              </ol>
            </Panel>

            <div className="ld-grid ld-grid-2">
              <Panel title="Stack">
                <div className="ld-trading-badges">
                  {["React + TypeScript + Vite", "Django + DRF", "Celery + Redis 7", "PostgreSQL 16", "OPA + Keycloak", "Gunicorn + Uvicorn"].map((t) => <Pill key={t} tone="info">{t}</Pill>)}
                </div>
              </Panel>
              <section className="ld-card ld-panel" aria-labelledby="ol-tests">
                <div className="ld-panel-head"><h2 id="ol-tests">Parser test suite</h2><SampleBadge /></div>
                <p className="ld-trading-sub">Cases covered by the parser tests. Results are not reported to this page yet.</p>
                <ul className="ld-trading-steps">
                  {["JSON-lines parse", "Pipe-delimited parse", "COMPLETE transform", "OPEN/unconfirmed transform", "REJECT transform", "CSV write + L_ prefix", "Header exact match", "Row count"].map((t) => (
                    <li key={t} className="pending"><i className="fa-solid fa-circle-dot none" aria-hidden="true" /> {t}</li>
                  ))}
                </ul>
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
