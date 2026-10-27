// CTCL Data Monitor — Noren OMS adapter-line queue dashboard (LinkedEye layout).
//
// Lines and their queue series come from /trading/ctcl/lines/, the broker map
// from /trading/ctcl/brokers/. Peaks, means, window figures and alerts are all
// computed from those series. When the lines feed is empty the screen falls
// back to the embedded seed series and says so. The 5-minute window-zoom
// series have no feed yet and are labelled "Sample data — not connected".
import React from "react";
import { useCtclLines, useBrokers, type CtclLine, type BrokerCtcl } from "@/api/hooks";
import { useNav } from "@/hooks/useNav";
import { Empty, Panel, Pill, StatCard, fmt } from "@/components/ld";
import type { Tone } from "@/components/ld";
import "@/styles/trading.css";

import { Icon } from "@/components/Icon";
import { CheckIcon, ChevronRightIcon, FlaskConicalIcon, HistoryIcon, TriangleAlertIcon, UnplugIcon } from "lucide-react";
// ── Data (local fallbacks; identical to the backend seed) ─────────────────

// Generate intraday time labels 09:00–15:30 in N-min steps
function timeLabels(from: string, to: string, stepMin: number): string[] {
  const labels: string[] = [];
  const [fh, fm] = from.split(":").map(Number);
  const [th, tm] = to.split(":").map(Number);
  let cur = fh * 60 + fm;
  const end = th * 60 + tm;
  while (cur <= end) {
    const h = Math.floor(cur / 60), m = cur % 60;
    labels.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    cur += stepMin;
  }
  return labels;
}

const LABELS_30 = timeLabels("09:00", "15:30", 30);
export const LABELS_5 = timeLabels("09:00", "15:30", 5);

// NSE-5864: full day, 30-min intervals — morning normal, close spike
const Q5864: (number | null)[] = [580, 680, 720, 610, 510, 490, 480, 478, 472, 460, 458, 452, 455, 460, 470, 500, 520, 560, 640, 720, 810, 920, 1060, 1114, 920, 800, 720];

// NSE-2729: pre-market only — data ends at 09:15:53
// Sparse: 09:00→2991, 09:05→3800, 09:10→4750, 09:15→5538, rest null
const Q2729_FULL: (number | null)[] = [2991, 3800, 4750, 5538, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null];

// NSE-48621: full day
const Q48621: (number | null)[] = [1071, 890, 810, 700, 680, 650, 630, 610, 620, 600, 615, 635, 660, 630, 600, 598, 592, 590, 600, 610, 640, 660, 648, 640, 630, 620, 600];

// NFO-12492/57507
const QNFO: (number | null)[] = [280, 320, 350, 280, 200, 180, 170, 160, 150, 145, 140, 140, 145, 150, 155, 160, 165, 160, 155, 165, 175, 185, 210, 240, 310, 380, 420];

// BSE
const QBSE: (number | null)[] = [1222, 880, 780, 680, 620, 580, 560, 520, 500, 490, 480, 475, 470, 460, 468, 472, 480, 490, 510, 530, 560, 590, 640, 700, 760, 820, 880];

// BFO
const QBFO: (number | null)[] = [390, 350, 300, 260, 230, 220, 210, 200, 195, 190, 188, 186, 188, 192, 196, 200, 205, 210, 220, 230, 245, 260, 280, 310, 350, 380, 410];

// Window-zoom data (5-min steps)
// Open window 09:10–09:20: 09:00,09:05,09:10,09:15,09:20
const WO_NSE2: (number | null)[] = [4750, 5080, 5300, 5538, null]; // NSE-2729 open window
const WO_NSE1: (number | null)[] = [820, 950, 1010, 1071, 880]; // NSE-48621 open window
const WO_BSE: (number | null)[] = [980, 1100, 1180, 1222, 900]; // BSE open window
const WO_LABELS = ["09:00", "09:05", "09:10", "09:15", "09:20"];

// Close window 15:15–15:30
const WC_NSE5: (number | null)[] = [840, 920, 1010, 1060, 1114, 1050, 980, 920]; // NSE-5864
const WC_48621: (number | null)[] = [610, 620, 625, 640, 648, 640, 630, 610];
const WC_BSE: (number | null)[] = [720, 760, 790, 820, 850, 820, 790, 760];
const WC_LABELS = ["15:15", "15:17", "15:18", "15:19", "15:20", "15:22", "15:25", "15:30"];

// CTCL line identifiers (matches the useCtclLines() payload shape)
const CTCL_LINES: CtclLine[] = [
  { id: "NSE-5864", segment: "NSE", role: "Line-1 Primary", samples: 29901, status: "Full Day", series: Q5864 },
  { id: "NSE-2729", segment: "NSE", role: "Line-2 Secondary", samples: 8556, status: "Truncated ⚠", series: Q2729_FULL },
  { id: "NSE-48621", segment: "NSE", role: "Line-3 AMO/Reg", samples: 1347, status: "Full Day", series: Q48621 },
  { id: "NFO-13424", segment: "NFO", role: "Line-1 Primary", samples: 266, status: "Flash only", series: [] },
  { id: "NFO-13429", segment: "NFO", role: "Line-2 Secondary", samples: 0, status: "Empty", series: [] },
  { id: "NFO-12492", segment: "NFO", role: "AMO Line-1", samples: null, status: "Active", series: QNFO },
  { id: "NFO-57507", segment: "NFO", role: "AMO Line-2", samples: null, status: "Active", series: QNFO },
  { id: "BSE-L1", segment: "BSE", role: "BSE Regular", samples: 99219, status: "Full Day", series: QBSE },
  { id: "BFO-L1", segment: "BFO", role: "BSE F&O", samples: null, status: "Active", series: QBFO },
];


const STATUS_TONE: Record<string, Tone> = {
  "Full Day": "ok",
  "Truncated ⚠": "crit",
  "Flash only": "warn",
  Empty: "crit",
  Active: "ok",
};
const statusText = (s: string) => s.replace(/\s*⚠\s*/g, "").trim();
const statusTone = (s: string): Tone => STATUS_TONE[s] ?? (/truncat|empty/i.test(s) ? "crit" : /flash/i.test(s) ? "warn" : "muted");

// Queue-depth thresholds per CTCL (operations recommendation; configuration, not a measurement).
interface Threshold { id: string; metric: string; warn: string; crit: string; window: string; action: string; warnV?: number; critV?: number }
const THRESHOLDS: Threshold[] = [
  { id: "NSE-2729", metric: "Queue depth", warn: ">4,000", crit: ">5,000", window: "09:00–09:16", action: "Page on-call, check adapter process", warnV: 4000, critV: 5000 },
  { id: "NSE-2729", metric: "Data present", warn: "—", crit: "No data after 09:17", window: "Continuous", action: "P1 escalate to Hoysala" },
  { id: "NSE-5864", metric: "Queue depth", warn: ">1,000", crit: ">1,500", window: "15:15–15:30", action: "Alert, log for review", warnV: 1000, critV: 1500 },
  { id: "NSE-48621", metric: "Queue depth", warn: ">900", crit: ">1,200", window: "09:00–09:30", action: "Investigate batch orders", warnV: 900, critV: 1200 },
  { id: "BSE-L1", metric: "Samples/hr", warn: "<5,000", crit: "<500", window: "Continuous", action: "Check MySQL pipeline / batch insert" },
  { id: "NFO-13424", metric: "Data window", warn: "—", crit: "<5 min data", window: "09:15", action: "Investigate adapter logging" },
  { id: "All CTCLs", metric: "YoY queue change", warn: ">20% higher", crit: ">40% higher", window: "Open window", action: "Capacity review" },
];
const depthLimit = (id: string) => THRESHOLDS.find((t) => t.id === id && t.warnV != null);

// The six lines charted on this page, with their seed fallback series.
const CHARTED: { id: string; fb: (number | null)[]; color: string; title?: string }[] = [
  { id: "NSE-5864", fb: Q5864, color: "#2f6bff" },
  { id: "NSE-2729", fb: Q2729_FULL, color: "#e5383b" },
  { id: "NSE-48621", fb: Q48621, color: "#0ea5e9" },
  { id: "NFO-12492", fb: QNFO, color: "#16a34a", title: "NFO-12492 / 57507" },
  { id: "BSE-L1", fb: QBSE, color: "#7c4dff", title: "BSE" },
  { id: "BFO-L1", fb: QBFO, color: "#f5a524", title: "BFO" },
];

// ── Series helpers ──────────────────────────────────────────────────────────
const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const hm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/** Time labels for an n-point series spread evenly over 09:00–15:30. */
function labelsFor(n: number): string[] {
  if (n <= 1) return n ? ["09:00"] : [];
  return Array.from({ length: n }, (_, i) => hm(540 + Math.round((i * 390) / (n - 1))));
}

/** Bracket [from, to] with the nearest sampled labels (inclusive). */
function rangeIndices(labels: string[], from: string, to: string): [number, number] {
  const f = toMin(from), t = toMin(to);
  let lo = 0, hi = labels.length - 1;
  for (let i = 0; i < labels.length; i++) if (toMin(labels[i]) <= f) lo = i;
  for (let i = labels.length - 1; i >= 0; i--) if (toMin(labels[i]) >= t) hi = i;
  if (hi <= lo) hi = Math.min(lo + 1, labels.length - 1);
  return [lo, hi];
}

/** Cut a series to a time window: returns its labels and values. */
function cut(data: (number | null)[], from: string, to: string) {
  const labels = labelsFor(data.length);
  if (!labels.length) return { labels, data };
  const [lo, hi] = rangeIndices(labels, from, to);
  return { labels: labels.slice(lo, hi + 1), data: data.slice(lo, hi + 1) };
}

interface Stats { peak: number | null; peakAt: string; mean: number | null; first: number | null; lastAt: string; points: number }
function statsOf(data: (number | null)[]): Stats {
  const labels = labelsFor(data.length);
  let peak: number | null = null, peakAt = "—", sum = 0, n = 0, first: number | null = null, lastAt = "—";
  data.forEach((v, i) => {
    if (v == null) return;
    if (first == null) first = v;
    if (peak == null || v > peak) { peak = v; peakAt = labels[i]; }
    sum += v; n++; lastAt = labels[i];
  });
  return { peak, peakAt, mean: n ? sum / n : null, first, lastAt, points: n };
}

const fmtN = (v: number | null | undefined) => (v == null ? "—" : Math.round(v).toLocaleString("en-US"));
const compact = (v: number) => (v >= 1e3 ? `${+(v / 1e3).toFixed(1)}k` : String(Math.round(v)));

// ── Line chart over time labels (SVG, theme tokens, null-aware) ─────────────
interface LineSeries { label: string; data: (number | null)[]; color: string }

function LineChart({ labels, series, maxV, height = 180, title }: { labels: string[]; series: LineSeries[]; maxV?: number; height?: number; title: string }) {
  const W = 560, H = height, L = 46, R = 12, T = 14, B = 26;
  const [hover, setHover] = React.useState<number | null>(null);
  const ref = React.useRef<SVGSVGElement>(null);
  const vals = series.flatMap((s) => s.data.filter((v): v is number => v != null));
  if (!labels.length || !vals.length) return <Empty>No queue samples in this range.</Empty>;
  const top = maxV ?? Math.max(10, ...vals) * 1.1;
  const x = (i: number) => L + (labels.length === 1 ? (W - L - R) / 2 : (i / (labels.length - 1)) * (W - L - R));
  const y = (v: number) => H - B - (Math.min(v, top) / top) * (H - T - B);
  const step = Math.max(1, Math.ceil(labels.length / 8));
  const onMove = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const px = ((e.clientX - r.left) / r.width) * W;
    setHover(Math.min(labels.length - 1, Math.max(0, Math.round(((px - L) / (W - L - R)) * (labels.length - 1)))));
  };
  const runs = (data: (number | null)[]) => {
    const out: [number, number][][] = [];
    let cur: [number, number][] = [];
    data.forEach((v, i) => {
      if (v == null) { if (cur.length) out.push(cur); cur = []; }
      else cur.push([x(i), y(v)]);
    });
    if (cur.length) out.push(cur);
    return out;
  };
  return (
    <div className="ld-trading-chart">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="ld-trend" role="img"
        aria-label={`${title}: ${series.map((s) => { const st = statsOf(s.data); return `${s.label} peak ${fmtN(st.peak)}`; }).join("; ")}`}
        onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1={L} x2={W - R} y1={y(top * f)} y2={y(top * f)} className="ld-gridline" />
            <text x={L - 6} y={y(top * f) + 4} textAnchor="end" className="ld-axis">{compact(top * f)}</text>
          </g>
        ))}
        {labels.map((lb, i) => (i % step === 0 || i === labels.length - 1) && (
          <text key={lb + i} x={x(i)} y={H - 8} textAnchor={i === 0 ? "start" : i === labels.length - 1 ? "end" : "middle"} className="ld-axis">{lb}</text>
        ))}
        {series.map((s) => {
          const sparse = s.data.filter((v) => v != null).length <= 6;
          return runs(s.data).map((run, ri) => {
            const pts = run.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(" ");
            return (
              <g key={`${s.label}-${ri}`}>
                {run.length > 1 && <polygon points={`${run[0][0].toFixed(1)},${y(0)} ${pts} ${run[run.length - 1][0].toFixed(1)},${y(0)}`} fill={s.color} fillOpacity={0.1} />}
                {run.length > 1 && <polyline points={pts} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" />}
                {(sparse || run.length === 1) && run.map(([px, py]) => <circle key={px} cx={px} cy={py} r={3} fill={s.color} />)}
              </g>
            );
          });
        })}
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} stroke="var(--border-strong)" strokeDasharray="3 3" />}
      </svg>
      {hover != null ? (
        <div className="ld-chart-tip ld-small">
          <b>{labels[hover]}</b>
          {series.map((s) => <span key={s.label}><span className="ld-dot" style={{ background: s.color }} /> {s.label} {fmtN(s.data[hover])}</span>)}
        </div>
      ) : (
        <ul className="ld-legend-inline">
          {series.map((s) => <li key={s.label}><span className="ld-dot" style={{ background: s.color }} /> {s.label}</li>)}
        </ul>
      )}
    </div>
  );
}

function SampleBadge() {
  return <Pill tone="warn"><Icon icon={FlaskConicalIcon} /> Sample data — not connected</Pill>;
}

// ── Screen ─────────────────────────────────────────────────────────────────
type PanelId = "overview" | "queue" | "windows" | "ctclmap" | "alerts";

const PRESETS: { label: string; from: string; to: string }[] = [
  { label: "Full Day", from: "09:00", to: "15:30" },
  { label: "Open 09:10–09:20", from: "09:10", to: "09:20" },
  { label: "Pre-Market", from: "09:00", to: "09:15" },
  { label: "Close 15:15–15:30", from: "15:15", to: "15:30" },
  { label: "Mid-Day", from: "12:00", to: "14:00" },
];

const WINDOWS: { id: string; icon: string; title: string; from: string; to: string; agg: "max" | "mean" }[] = [
  { id: "open", icon: "fa-bell", title: "Market Open · 09:10–09:20", from: "09:10", to: "09:20", agg: "max" },
  { id: "pre", icon: "fa-clock", title: "Pre-Market · 09:00–09:15", from: "09:00", to: "09:15", agg: "max" },
  { id: "close", icon: "fa-arrow-trend-down", title: "Square-Off · 15:15–15:30", from: "15:15", to: "15:30", agg: "max" },
  { id: "mid", icon: "fa-sun", title: "Mid-Day · 11:00–14:00", from: "11:00", to: "14:00", agg: "mean" },
];

type Level = "crit" | "warn" | "ok";
const levelOf = (id: string, v: number | null): Level => {
  const t = depthLimit(id);
  if (!t || v == null) return "ok";
  return v > (t.critV ?? Infinity) ? "crit" : v > (t.warnV ?? Infinity) ? "warn" : "ok";
};
const LEVEL: Record<Level, { tone: Tone; label: string }> = {
  crit: { tone: "crit", label: "Above critical" },
  warn: { tone: "warn", label: "Above warning" },
  ok: { tone: "ok", label: "Within thresholds" },
};

export default function CtclMonitorScreen() {
  const { setRoute } = useNav();
  const [tab, setTab] = React.useState<PanelId>("overview");
  const [clock, setClock] = React.useState("—");
  const [trFrom, setTrFrom] = React.useState("09:00");
  const [trTo, setTrTo] = React.useState("15:30");
  const [preset, setPreset] = React.useState(0);
  const [applied, setApplied] = React.useState<{ from: string; to: string }>({ from: "09:00", to: "15:30" });

  const lines = useCtclLines().data ?? [];
  const brokers = useBrokers().data ?? [];
  const seed = lines.length === 0;
  const known: CtclLine[] = seed ? CTCL_LINES : lines;

  const seriesOf = React.useCallback(
    (id: string, fb: (number | null)[]): (number | null)[] => {
      const s = lines.find((l) => l.id === id)?.series;
      return s && s.length ? s : fb;
    },
    [lines],
  );
  const metaOf = (id: string) => known.find((l) => l.id === id);

  // Live IST clock
  React.useEffect(() => {
    const p = (n: number) => String(n).padStart(2, "0");
    const tick = () => {
      const ist = new Date(Date.now() + 5.5 * 3600 * 1000);
      setClock(`${p(ist.getUTCHours())}:${p(ist.getUTCMinutes())}:${p(ist.getUTCSeconds())} IST`);
    };
    tick();
    const t = window.setInterval(tick, 1000);
    return () => window.clearInterval(t);
  }, []);

  const pickPreset = (i: number) => {
    setPreset(i);
    setTrFrom(PRESETS[i].from);
    setTrTo(PRESETS[i].to);
  };

  // ── Derived figures ──
  const charted = CHARTED.map((c) => {
    const data = seriesOf(c.id, c.fb);
    const meta = metaOf(c.id);
    return { ...c, name: c.title ?? c.id, data, meta, stats: statsOf(data) };
  });
  const chartedOf = (id: string) => charted.find((c) => c.id === id);
  const activeLines = known.filter((l) => statusTone(l.status) === "ok");
  const problemLines = known.filter((l) => statusTone(l.status) !== "ok");
  const segmentsActive = [...new Set(activeLines.map((l) => l.segment))];
  const nseDayLabels = labelsFor(Math.max(...["NSE-5864", "NSE-48621", "NSE-2729"].map((id) => chartedOf(id)?.data.length ?? 0)));

  const windowValue = (data: (number | null)[], from: string, to: string, agg: "max" | "mean") => {
    const v = cut(data, from, to).data.filter((x): x is number => x != null);
    if (!v.length) return null;
    return agg === "max" ? Math.max(...v) : v.reduce((a, b) => a + b, 0) / v.length;
  };

  /** Brokers routed through a CTCL line: any CTCL code that starts with the line's number. */
  const brokersOn = (lineId: string) => {
    const num = lineId.split("-")[1];
    return brokers.filter((b) => Object.values(b.ctcls).some((c) => c && c !== "—" && c.startsWith(`${num}-`)));
  };

  interface Alert { id: string; tone: Tone; prio: string; title: string; text: string }
  const alerts: Alert[] = [
    ...problemLines.map((l): Alert => {
      const st = statsOf(chartedOf(l.id)?.data ?? l.series);
      const crit = statusTone(l.status) === "crit";
      return {
        id: `status-${l.id}`, tone: crit ? "crit" : "warn", prio: crit ? "P1" : "P2",
        title: `${l.id} — ${statusText(l.status)}`,
        text: st.points
          ? `${l.role}. Queue data ends at ${st.lastAt}${l.samples != null ? ` (${fmt(l.samples)} samples)` : ""}; peak ${fmtN(st.peak)} at ${st.peakAt}. Check that the adapter queue logging process is running on the Noren server.`
          : `${l.role}. ${l.samples ? `${fmt(l.samples)} samples, ` : ""}no queue series for the day. Check the adapter queue logging process.`,
      };
    }),
    ...charted.flatMap((c): Alert[] => {
      const lvl = levelOf(c.id, c.stats.peak);
      const t = depthLimit(c.id);
      if (lvl === "ok" || !t) return [];
      return [{
        id: `depth-${c.id}`, tone: lvl === "crit" ? "crit" : "warn", prio: lvl === "crit" ? "P1" : "P2",
        title: `${c.name} — queue depth ${fmtN(c.stats.peak)} at ${c.stats.peakAt}`,
        text: `Above the ${lvl === "crit" ? "critical" : "warning"} threshold (${lvl === "crit" ? t.crit : t.warn}, window ${t.window}). ${t.action}.`,
      }];
    }),
  ];
  const p1 = alerts.filter((a) => a.prio === "P1").length;

  const NAV: { id: PanelId; icon: string; label: string; count?: number }[] = [
    { id: "overview", icon: "fa-chart-pie", label: "Overview" },
    { id: "queue", icon: "fa-chart-line", label: "Queue Size", count: charted.length },
    { id: "windows", icon: "fa-stopwatch", label: "Trading Windows" },
    { id: "ctclmap", icon: "fa-table-cells", label: "CTCL Map", count: brokers.length },
    { id: "alerts", icon: "fa-bell", label: "Alerts", count: alerts.length },
  ];

  const lineTable = (rows: CtclLine[], roleHead: string) => (
    rows.length ? (
      <div className="ld-table-wrap">
        <table className="ld-table">
          <thead><tr><th scope="col">CTCL ID</th><th scope="col">{roleHead}</th><th scope="col">Samples</th><th scope="col">Status</th></tr></thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id}>
                <td className="ld-mono">{l.id}</td>
                <td className="ld-muted">{l.role}</td>
                <td className="ld-mono">{l.samples == null ? "—" : l.samples.toLocaleString("en-US")}</td>
                <td><Pill tone={statusTone(l.status)}>{statusText(l.status)}</Pill></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : <Empty>No lines reported.</Empty>
  );

  const seedNote = seed && (
    <div className="ld-card ld-trading-note warn" role="status">
      <Icon icon={UnplugIcon} />
      <p><b>No data from /trading/ctcl/lines/.</b> Lines, peaks and charts below use the embedded seed series, not a live feed.</p>
    </div>
  );

  return (
    <div className="ld-dash">
      <nav className="ld-crumbs" aria-label="Breadcrumb">
        <button type="button" className="ld-link" onClick={() => setRoute("dashboard")}>Home</button>
        <Icon icon={ChevronRightIcon} />
        <span>BOD / EOD</span>
        <Icon icon={ChevronRightIcon} />
        <span>CTCL Monitor</span>
      </nav>

      <div className="ld-head">
        <div>
          <h1>CTCL Data Monitor</h1>
          <p>Noren OMS adapter-line queue depth per CTCL, trading-window behaviour and the broker → CTCL map</p>
        </div>
        <div className="ld-head-actions">
          {problemLines.map((l) => (
            <Pill key={l.id} tone={statusTone(l.status)}><span className="ld-pill-dot" aria-hidden="true" /> {l.id} {statusText(l.status)}</Pill>
          ))}
          <Pill tone={segmentsActive.length ? "ok" : "muted"}><span className="ld-pill-dot" aria-hidden="true" /> {segmentsActive.length} segments active</Pill>
          <span className="ld-mono ld-muted" aria-label="Current time in IST">{clock}</span>
        </div>
      </div>

      <div className="ld-tabs" role="tablist" aria-label="CTCL monitor sections">
        {NAV.map((t) => (
          <button key={t.id} type="button" role="tab" id={`ctcl-tab-${t.id}`} aria-selected={tab === t.id} aria-controls="ctcl-panel"
            className={`ld-tab${tab === t.id ? " active" : ""}`} onClick={() => setTab(t.id)}>
            <Icon className={`fa-solid ${t.icon}`} /> {t.label}{t.count != null && <> <span className="ld-muted">({t.count})</span></>}
          </button>
        ))}
      </div>

      <div id="ctcl-panel" role="tabpanel" aria-labelledby={`ctcl-tab-${tab}`} className="ld-trading-tabpanel">
        {tab !== "ctclmap" && seedNote}

        {/* ═══ OVERVIEW ═══ */}
        {tab === "overview" && (
          <>
            {problemLines.length > 0 && (
              <div className="ld-card ld-trading-note warn" role="alert">
                <Icon icon={TriangleAlertIcon} />
                <p>
                  {problemLines.map((l, i) => {
                    const st = statsOf(chartedOf(l.id)?.data ?? l.series);
                    return (
                      <React.Fragment key={l.id}>
                        {i > 0 && " · "}
                        <b>{l.id} {statusText(l.status).toLowerCase()}:</b>{" "}
                        {st.points ? `queue data ends at ${st.lastAt}, peak ${fmtN(st.peak)}` : "no queue series"}
                        {l.samples != null ? ` (${fmt(l.samples)} samples)` : ""}
                      </React.Fragment>
                    );
                  })}
                  . Investigate the adapter queue logging process for full-day coverage.
                </p>
              </div>
            )}

            <div className="ld-grid ld-grid-stats ld-grid-6">
              <StatCard icon="fa-network-wired" tone="info" label="CTCL lines" value={`${activeLines.length}/${known.length}`} note={`active · ${[...new Set(known.map((l) => l.segment))].join(" · ")}`} onClick={() => setTab("ctclmap")} />
              <StatCard icon="fa-users" tone="purple" label="Broker clients" value={fmt(brokers.length)} note="mapped to CTCL codes" onClick={() => setTab("ctclmap")} />
              {charted.map((c) => {
                const lvl = levelOf(c.id, c.stats.peak);
                return (
                  <StatCard key={c.id} icon="fa-arrow-up" tone={lvl === "ok" ? "info" : lvl}
                    label={`${c.name} peak`} value={fmtN(c.stats.peak)} note={c.stats.points ? `at ${c.stats.peakAt}` : "no samples"} onClick={() => setTab("queue")} />
                );
              })}
            </div>

            <div className="ld-split ld-split-wide">
              <div className="ld-trading-stack-notes">
                <Panel title="Queue peak by CTCL">
                  <p className="ld-trading-sub">Peak queue depth per adapter line over the day</p>
                  <ul className="ld-bars">
                    {(() => {
                      const max = Math.max(1, ...charted.map((c) => c.stats.peak ?? 0));
                      return charted.map((c) => (
                        <li key={c.id}>
                          <span className="ld-bar-label">{c.name}</span>
                          <span className="ld-bar-track"><span className="ld-bar-fill" style={{ width: `${((c.stats.peak ?? 0) / max) * 100}%`, background: c.color }} /></span>
                          <span className="ld-bar-value ld-bar-value-wide">{fmtN(c.stats.peak)}</span>
                        </li>
                      ));
                    })()}
                  </ul>
                </Panel>
                <Panel title="NSE adapter lines — intraday queue (09:00–15:30)">
                  <LineChart title="NSE adapter queue depth through the day" labels={nseDayLabels}
                    series={["NSE-5864", "NSE-48621", "NSE-2729"].map((id) => chartedOf(id)!).map((c) => ({ label: c.name, data: c.data, color: c.color }))} />
                </Panel>
              </div>

              <Panel title="Segment health">
                <div className="ld-trading-stack-notes">
                  {[...new Set(known.map((l) => l.segment))].map((seg) => {
                    const segLines = known.filter((l) => l.segment === seg);
                    const worst: Tone = segLines.some((l) => statusTone(l.status) === "crit") ? "crit" : segLines.some((l) => statusTone(l.status) === "warn") ? "warn" : "ok";
                    return (
                      <section key={seg} className="ld-card ld-panel" aria-label={`${seg} segment`}>
                        <div className="ld-panel-head">
                          <h3 className="ld-strong">{seg}</h3>
                          <Pill tone={worst}>{worst === "ok" ? "Normal" : "Monitor"}</Pill>
                        </div>
                        <dl className="ld-dl">
                          {segLines.map((l) => {
                            const c = chartedOf(l.id);
                            return (
                              <React.Fragment key={l.id}>
                                <dt>{l.id}</dt>
                                <dd>
                                  <Pill tone={statusTone(l.status)}>{statusText(l.status)}</Pill>
                                  {c?.stats.points ? <span className="ld-muted ld-small"> · peak {fmtN(c.stats.peak)}</span> : null}
                                </dd>
                              </React.Fragment>
                            );
                          })}
                        </dl>
                      </section>
                    );
                  })}
                </div>
              </Panel>
            </div>
          </>
        )}

        {/* ═══ QUEUE SIZE ═══ */}
        {tab === "queue" && (
          <>
            <section className="ld-card ld-panel" aria-labelledby="ctcl-range-h">
              <div className="ld-panel-head"><h2 id="ctcl-range-h">Time range</h2></div>
              <p className="ld-trading-sub">Zoom every line into a trading window (market open 09:10–09:20 · square-off 15:15–15:30). Ranges snap to the nearest samples.</p>
              <div className="ld-trading-range">
                <div className="ld-form-field">
                  <label htmlFor="tr-from">From</label>
                  <input id="tr-from" type="time" className="ld-input" value={trFrom} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTrFrom(e.target.value)} />
                </div>
                <div className="ld-form-field">
                  <label htmlFor="tr-to">To</label>
                  <input id="tr-to" type="time" className="ld-input" value={trTo} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTrTo(e.target.value)} />
                </div>
                <div className="ld-trading-presets" role="group" aria-label="Range presets">
                  {PRESETS.map((p, i) => (
                    <button key={p.label} type="button" className="ld-btn ld-btn-sm" aria-pressed={preset === i} onClick={() => pickPreset(i)}>
                      {preset === i && <Icon icon={CheckIcon} />} {p.label}
                    </button>
                  ))}
                </div>
                <button type="button" className="ld-btn ld-btn-primary" onClick={() => setApplied({ from: trFrom, to: trTo })}>Apply</button>
              </div>
            </section>

            <div className="ld-grid ld-grid-2">
              {charted.map((c) => {
                const view = cut(c.data, applied.from, applied.to);
                const lvl = levelOf(c.id, c.stats.peak);
                return (
                  <section key={c.id} className="ld-card ld-panel" aria-labelledby={`q-${c.id}`}>
                    <div className="ld-panel-head">
                      <h2 id={`q-${c.id}`}>{c.name} {c.meta && <Pill tone="info">{c.meta.role}</Pill>}</h2>
                      {c.meta && <Pill tone={statusTone(c.meta.status)}>{statusText(c.meta.status)}</Pill>}
                    </div>
                    <p className="ld-trading-sub">
                      {c.meta?.samples != null ? `${fmt(c.meta.samples)} samples` : "samples not reported"}
                      {c.stats.points ? ` · data ${labelsFor(c.data.length)[c.data.findIndex((v) => v != null)]}–${c.stats.lastAt}` : ""}
                    </p>
                    <dl className="ld-trading-mini">
                      <div><dt>Peak</dt><dd className={lvl === "crit" ? "ld-text-crit" : lvl === "warn" ? "ld-text-warn" : undefined}>{fmtN(c.stats.peak)}</dd></div>
                      <div><dt>Peak at</dt><dd>{c.stats.peakAt}</dd></div>
                      <div><dt>Day mean</dt><dd>{fmtN(c.stats.mean)}</dd></div>
                    </dl>
                    <LineChart title={`${c.name} queue depth ${applied.from}–${applied.to}`} labels={view.labels}
                      series={[{ label: c.name, data: view.data, color: c.color }]} height={160} />
                  </section>
                );
              })}
            </div>
          </>
        )}

        {/* ═══ TRADING WINDOWS ═══ */}
        {tab === "windows" && (
          <>
            <p className="ld-trading-sub">Window figures are computed from each line's intraday series; short windows are bracketed by the nearest samples.</p>
            <div className="ld-grid ld-grid-2">
              {WINDOWS.map((w) => {
                const rows = charted.map((c) => ({ c, v: windowValue(c.data, w.from, w.to, w.agg) }));
                const lv: Level = w.agg === "mean" ? "ok" : rows.some((r) => levelOf(r.c.id, r.v) === "crit") ? "crit" : rows.some((r) => levelOf(r.c.id, r.v) === "warn") ? "warn" : "ok";
                return (
                  <section key={w.id} className="ld-card ld-panel" aria-labelledby={`win-${w.id}`}>
                    <div className="ld-panel-head">
                      <h2 id={`win-${w.id}`}><Icon className={`fa-solid ${w.icon} ld-muted`} /> {w.title}</h2>
                      <Pill tone={LEVEL[lv].tone}>{LEVEL[lv].label}</Pill>
                    </div>
                    <div className="ld-table-wrap">
                      <table className="ld-table">
                        <thead><tr><th scope="col">CTCL</th><th scope="col">{w.agg === "max" ? "Peak queue" : "Mean queue"}</th><th scope="col">Threshold</th></tr></thead>
                        <tbody>
                          {rows.map(({ c, v }) => {
                            const l = w.agg === "max" ? levelOf(c.id, v) : "ok";
                            const t = depthLimit(c.id);
                            return (
                              <tr key={c.id}>
                                <td className="ld-strong">{c.name}</td>
                                <td className={`ld-mono${l === "crit" ? " ld-text-crit" : l === "warn" ? " ld-text-warn" : ""}`}>{fmtN(v)}</td>
                                <td className="ld-muted">{t ? `warn ${t.warn} · crit ${t.crit}` : "—"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </section>
                );
              })}
            </div>

            <div className="ld-grid ld-grid-2">
              <section className="ld-card ld-panel" aria-labelledby="zoom-o1">
                <div className="ld-panel-head"><h2 id="zoom-o1">NSE-2729 — open window (5-min)</h2><SampleBadge /></div>
                <p className="ld-trading-sub">Pre-market build-up &amp; AMO flush · 5-minute samples have no feed yet</p>
                <LineChart title="NSE-2729 open window (sample data)" labels={WO_LABELS} maxV={6000} series={[{ label: "NSE-2729", data: WO_NSE2, color: "#e5383b" }]} />
              </section>
              <section className="ld-card ld-panel" aria-labelledby="zoom-o2">
                <div className="ld-panel-head"><h2 id="zoom-o2">NSE-48621 + BSE — open window (5-min)</h2><SampleBadge /></div>
                <LineChart title="NSE-48621 and BSE open window (sample data)" labels={WO_LABELS} series={[
                  { label: "NSE-48621", data: WO_NSE1, color: "#2f6bff" },
                  { label: "BSE", data: WO_BSE, color: "#7c4dff" },
                ]} />
              </section>
              <section className="ld-card ld-panel" aria-labelledby="zoom-c1">
                <div className="ld-panel-head"><h2 id="zoom-c1">NSE-5864 — square-off window</h2><SampleBadge /></div>
                <p className="ld-trading-sub">Close-side pressure · minute samples have no feed yet</p>
                <LineChart title="NSE-5864 square-off window (sample data)" labels={WC_LABELS} maxV={1400} series={[{ label: "NSE-5864", data: WC_NSE5, color: "#f5a524" }]} />
              </section>
              <section className="ld-card ld-panel" aria-labelledby="zoom-c2">
                <div className="ld-panel-head"><h2 id="zoom-c2">NSE-48621 + BSE — square-off window</h2><SampleBadge /></div>
                <LineChart title="NSE-48621 and BSE square-off window (sample data)" labels={WC_LABELS} series={[
                  { label: "NSE-48621", data: WC_48621, color: "#2f6bff" },
                  { label: "BSE", data: WC_BSE, color: "#7c4dff" },
                ]} />
              </section>
            </div>
          </>
        )}

        {/* ═══ CTCL MAP ═══ */}
        {tab === "ctclmap" && (
          <>
            <Panel title={`CTCL / adapter → broker mapping (${fmt(brokers.length)} clients)`}>
              <p className="ld-trading-sub">CTCL IDs are per segment and per line. Each broker reaches Noren OMS through the CTCL codes assigned per exchange segment; segment status reflects the last polling cycle.</p>
              {brokers.length ? (
                <div className="ld-table-wrap">
                  <table className="ld-table">
                    <thead>
                      <tr>
                        <th scope="col">Broker</th>
                        <th scope="col">CTCL (NSE-L1)</th>
                        <th scope="col">CTCL (NSE-L2)</th>
                        <th scope="col">CTCL (NFO-L1)</th>
                        <th scope="col">CTCL (NFO-L2)</th>
                        <th scope="col">CTCL (BSE)</th>
                        <th scope="col">CTCL (BFO)</th>
                        <th scope="col" className="ld-trading-center">NSE</th>
                        <th scope="col" className="ld-trading-center">NFO</th>
                        <th scope="col" className="ld-trading-center">BSE</th>
                        <th scope="col" className="ld-trading-center">BFO</th>
                        <th scope="col">Overall</th>
                      </tr>
                    </thead>
                    <tbody>
                      {brokers.map((b: BrokerCtcl) => {
                        const segs = [b.nse, b.nfo, b.bse, b.bfo];
                        const fail = segs.filter((s) => s === 0).length;
                        const ok = segs.filter((s) => s === 1).length;
                        const sc = (v: number, seg: string) => (
                          <td className="ld-trading-center">
                            <span className={`ld-trading-check ${v ? "ld-ok" : "ld-crit"}`}>
                              <Icon className={`fa-solid ${v ? "fa-check" : "fa-xmark"}`} />
                              <span className="sr-only">{seg} {v ? "ok" : "failed"}</span>
                            </span>
                          </td>
                        );
                        const ctclCell = (id: string | undefined) =>
                          !id || id === "—" ? <td className="ld-muted">—</td> : <td className="ld-mono">{id}</td>;
                        return (
                          <tr key={b.n}>
                            <td className="ld-strong">{b.n}</td>
                            {ctclCell(b.ctcls.n1)}
                            {ctclCell(b.ctcls.n2)}
                            {ctclCell(b.ctcls.nf1)}
                            {ctclCell(b.ctcls.nf2)}
                            {ctclCell(b.ctcls.bse)}
                            {ctclCell(b.ctcls.bfo)}
                            {sc(b.nse, "NSE")}
                            {sc(b.nfo, "NFO")}
                            {sc(b.bse, "BSE")}
                            {sc(b.bfo, "BFO")}
                            <td>
                              {fail > 0
                                ? <Pill tone="crit"><Icon icon={TriangleAlertIcon} /> {fail} seg(s)</Pill>
                                : <Pill tone="ok"><Icon icon={CheckIcon} /> {ok}/4</Pill>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : <Empty>No broker mapping from /trading/ctcl/brokers/.</Empty>}
            </Panel>

            <div className="ld-grid ld-grid-3">
              <Panel title="NSE lines">{lineTable(lines.filter((l) => l.segment === "NSE"), "Role")}</Panel>
              <Panel title="NFO lines">{lineTable(lines.filter((l) => l.segment === "NFO"), "Role")}</Panel>
              <Panel title="BSE / BFO lines">{lineTable(lines.filter((l) => l.segment === "BSE" || l.segment === "BFO"), "Segment")}</Panel>
            </div>
          </>
        )}

        {/* ═══ ALERTS ═══ */}
        {tab === "alerts" && (
          <>
            <Panel title={`Active alerts (${alerts.length}${p1 ? ` · ${p1} P1` : ""})`}>
              <p className="ld-trading-sub">Raised from line status and from each line's queue peak against the thresholds below.</p>
              {alerts.length ? (
                <div className="ld-trading-stack-notes">
                  {alerts.map((a) => (
                    <div key={a.id} className={`ld-card ld-trading-note ${a.tone}`}>
                      <Icon className={`fa-solid ${a.tone === "crit" ? "fa-circle-exclamation" : "fa-triangle-exclamation"}`} />
                      <p><Pill tone={a.tone}>{a.prio}</Pill> <b>{a.title}.</b> {a.text}</p>
                    </div>
                  ))}
                </div>
              ) : <Empty>No active alerts.</Empty>}
            </Panel>

            <div className="ld-card ld-trading-note muted">
              <Icon icon={HistoryIcon} />
              <p><b>Historical note (not live) — BSE pipeline break:</b> BSE queue data once dropped from 99,219 to 163 samples because of a MySQL max_allowed_packet overflow in the executemany batch. Fix deployed (batches of 1,000 rows); verify it is active on both production servers.</p>
            </div>

            <Panel title="Recommended alert thresholds">
              <div className="ld-table-wrap">
                <table className="ld-table">
                  <thead><tr><th scope="col">CTCL</th><th scope="col">Metric</th><th scope="col">Warn (P2)</th><th scope="col">Critical (P1)</th><th scope="col">Window</th><th scope="col">Action</th></tr></thead>
                  <tbody>
                    {THRESHOLDS.map((t) => (
                      <tr key={`${t.id}-${t.metric}`}>
                        <td className="ld-mono">{t.id}</td>
                        <td>{t.metric}</td>
                        <td className="ld-text-warn">{t.warn}</td>
                        <td className="ld-text-crit">{t.crit}</td>
                        <td className="ld-muted">{t.window}</td>
                        <td className="ld-wrap">{t.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

            {problemLines.map((l) => {
              const hit = brokersOn(l.id);
              return (
                <Panel key={l.id} title={`Broker impact — ${l.id} ${statusText(l.status).toLowerCase()}`}>
                  {hit.length ? (
                    <>
                      <div className="ld-trading-badges">
                        {hit.map((b) => <Pill key={b.n} tone="crit">{b.n}</Pill>)}
                      </div>
                      <p className="ld-small ld-muted">{hit.length} of {brokers.length} broker clients have a CTCL code on {l.id}; queue depth on this line is unmonitored for them while its data is missing.</p>
                    </>
                  ) : <Empty>No mapped broker routes through {l.id}.</Empty>}
                </Panel>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
