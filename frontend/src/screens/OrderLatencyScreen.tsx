// Order Latency Monitor — trading-infrastructure dashboard.
// Ported from design-reference/L_OrderLatency_Dashboard.html into the platform shell.
import React from "react";
import {
  useLatencyHourly,
  useLatencySegments,
  useOrderRecords,
  type LatencyHourly,
  type LatencySegment,
  type OrderRecord,
} from "@/api/hooks";
import "./tradingOps.css";

// ── Data (local fallbacks; identical to the backend seed) ─────────────────
const HOURLY: LatencyHourly[] = [
  { label: "09:00", orders: 2341, oms_med: 512, oms_p99: 1820, exch_med: 5210, exch_p99: 11200 },
  { label: "09:30", orders: 18420, oms_med: 441, oms_p99: 1540, exch_med: 4890, exch_p99: 10100 },
  { label: "10:00", orders: 32150, oms_med: 892, oms_p99: 6200000, exch_med: 6820, exch_p99: 6200000 },
  { label: "10:30", orders: 28900, oms_med: 438, oms_p99: 1410, exch_med: 4720, exch_p99: 9800 },
  { label: "11:00", orders: 24310, oms_med: 429, oms_p99: 1390, exch_med: 4650, exch_p99: 9400 },
  { label: "11:30", orders: 22180, oms_med: 431, oms_p99: 1380, exch_med: 4620, exch_p99: 9350 },
  { label: "12:00", orders: 19870, oms_med: 435, oms_p99: 1420, exch_med: 4700, exch_p99: 9600 },
  { label: "12:30", orders: 18340, oms_med: 433, oms_p99: 1400, exch_med: 4670, exch_p99: 9500 },
  { label: "13:00", orders: 17820, oms_med: 436, oms_p99: 1430, exch_med: 4710, exch_p99: 9700 },
  { label: "13:30", orders: 16540, oms_med: 430, oms_p99: 1370, exch_med: 4600, exch_p99: 9200 },
  { label: "14:00", orders: 15980, oms_med: 434, oms_p99: 1410, exch_med: 4680, exch_p99: 9550 },
  { label: "14:30", orders: 17120, oms_med: 432, oms_p99: 1395, exch_med: 4640, exch_p99: 9300 },
  { label: "15:00", orders: 18540, oms_med: 440, oms_p99: 1460, exch_med: 4780, exch_p99: 9900 },
];

const SEGMENTS: LatencySegment[] = [
  { seg: "NFO", count: 190525, pct: 88.2, oms_med: 429, oms_p99: 1380, exch_med: 4580, exch_p99: 9200 },
  { seg: "BFO", count: 17764, pct: 8.2, oms_med: 460, oms_p99: 1490, exch_med: 4900, exch_p99: 10200 },
  { seg: "NSE", count: 7598, pct: 3.5, oms_med: 892, oms_p99: 10400, exch_med: 8200, exch_p99: 15800 },
  { seg: "BSE", count: 228, pct: 0.1, oms_med: 510, oms_p99: 1680, exch_med: 5300, exch_p99: 11000 },
];

interface QueuePoint {
  label: string;
  mean: number;
  max: number;
}

// Real NSE adapter queue-depth drain, bucketed from QueSize_NSE_22Jul2026.csv
// (2,318 samples, SeqNo 38736→62759). x-axis = progress through the session;
// the adapter builds and drains the queue in waves, peaking at 798.
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

const SAMPLE_ORDERS: OrderRecord[] = [
  { ord: "26060800001782", seg: "NSE", rmks: "L7245591q22", oms: 65, lat: 1433.25, exch: 48, conf: 3640150, omsT: 1780889419, exchT: 1780889422 },
  { ord: "26060800001783", seg: "NSE", rmks: "L82481334ee", oms: 56, lat: 1227.75, exch: "", conf: 0, omsT: 1780889447, exchT: 0 },
  { ord: "26060800001784", seg: "NSE", rmks: "L434512344", oms: 65, lat: 2064.75, exch: 48, conf: 7203, omsT: 1780889451, exchT: 1780889451 },
  { ord: "26060800001785", seg: "NFO", rmks: "L9912345abc", oms: 45, lat: "", exch: "", conf: 0, omsT: 1780889460, exchT: 0 },
  { ord: "26060800001786", seg: "BSE", rmks: "L2201990def1", oms: 65, lat: 1890.5, exch: 48, conf: 2000512, omsT: 1780889472, exchT: 1780889474 },
  { ord: "26060800001787", seg: "NFO", rmks: "L3341290fe12", oms: 56, lat: 980.25, exch: 48, conf: 1500200, omsT: 1780889485, exchT: 1780889486 },
  { ord: "26060800001788", seg: "NSE", rmks: "L5512891bb", oms: 65, lat: 3201.0, exch: 48, conf: 4100000, omsT: 1780889501, exchT: 1780889505 },
  { ord: "26060800001789", seg: "NFO", rmks: "L1198234cd", oms: 48, lat: 750.0, exch: "", conf: 0, omsT: 1780889512, exchT: 0 },
  { ord: "26060800001790", seg: "BSE", rmks: "L8821990ee", oms: 65, lat: 1650.0, exch: 48, conf: 1800100, omsT: 1780889520, exchT: 1780889521 },
  { ord: "26060800001791", seg: "NFO", rmks: "L0091234ff", oms: 65, lat: 2100.5, exch: 48, conf: 2200300, omsT: 1780889533, exchT: 1780889535 },
  { ord: "26060800001792", seg: "NSE", rmks: "L6671234ab", oms: 56, lat: "", exch: "", conf: 0, omsT: 1780889548, exchT: 0 },
  { ord: "26060800001793", seg: "NSE", rmks: "L4412891cd", oms: 65, lat: 1900.0, exch: 48, conf: 3500000, omsT: 1780889560, exchT: 1780889563 },
  { ord: "26060800001794", seg: "NFO", rmks: "L9981234de", oms: 65, lat: 1245.5, exch: 48, conf: 1200400, omsT: 1780889571, exchT: 1780889572 },
  { ord: "26060800001795", seg: "BFO", rmks: "L3391234ef", oms: 45, lat: 880.0, exch: "", conf: 0, omsT: 1780889583, exchT: 0 },
  { ord: "26060800001796", seg: "BFO", rmks: "L7721890ab", oms: 65, lat: 2310.25, exch: 48, conf: 2500100, omsT: 1780889591, exchT: 1780889593 },
];

const OMS_STATUS_LABELS: Record<number, string> = { 65: "COMPLETE", 56: "OPEN", 48: "CANCELED", 45: "REJECT" };

// ── Chart helpers (ported vanilla-canvas engine) ───────────────────────────
const C = {
  blue: "#1B5CE5", blueA: "rgba(27,92,229,.12)",
  teal: "#0B9E8A", tealA: "rgba(11,158,138,.12)",
  amber: "#D97706", amberA: "rgba(217,119,6,.12)",
  red: "#DC2626", redA: "rgba(220,38,38,.12)",
  purple: "#7C3AED", purpleA: "rgba(124,58,237,.12)",
  border: "#E4E7ED", ink3: "#7A8799", ink2: "#3D4A5C",
};

function fmtV(v: number | string | null | undefined): string | number {
  if (v === undefined || v === null || v === "") return "—";
  if (typeof v !== "number") return v;
  if (Math.abs(v) >= 1000000) return (v / 1000000).toFixed(2) + "M";
  if (Math.abs(v) >= 1000) return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

type TTEl = HTMLDivElement | null;

function showTT(tt: TTEl, html: string, e: MouseEvent) {
  if (!tt) return;
  tt.innerHTML = html;
  tt.classList.add("show");
  let x = e.clientX + 14, y = e.clientY + 14;
  if (x + 230 > window.innerWidth) x = e.clientX - 240;
  if (y + 100 > window.innerHeight) y = e.clientY - 100;
  tt.style.left = x + "px";
  tt.style.top = y + "px";
}
function hideTT(tt: TTEl) {
  if (tt) tt.classList.remove("show");
}

interface LineDataset {
  label: string;
  data: number[];
  color: string;
  fill?: string;
  width?: number;
  unit?: string;
}

function lineChart(canvas: HTMLCanvasElement | null | undefined, tt: TTEl, labels: string[], datasets: LineDataset[]) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = canvas.offsetWidth || 600;
  const H = canvas.height || 200;
  canvas.width = W;
  canvas.height = H;

  const PAD = { t: 20, r: 20, b: 36, l: 60 };
  const cw = W - PAD.l - PAD.r;
  const ch = H - PAD.t - PAD.b;

  const allVals = datasets.flatMap((d) => d.data.filter((v) => v !== null && v !== undefined));
  const maxV = Math.max(...allVals) * 1.08;
  const minV = Math.min(0, ...allVals);

  const xOf = (i: number) => PAD.l + (i / (labels.length - 1)) * cw;
  const yOf = (v: number) => PAD.t + ch - ((v - minV) / (maxV - minV)) * ch;

  ctx.clearRect(0, 0, W, H);
  ctx.font = "11px Inter, system-ui";
  ctx.fillStyle = C.ink3;

  // Grid
  const ticks = 5;
  for (let i = 0; i <= ticks; i++) {
    const v = minV + (maxV - minV) * (i / ticks);
    const y = yOf(v);
    ctx.strokeStyle = C.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD.l, y);
    ctx.lineTo(PAD.l + cw, y);
    ctx.stroke();
    ctx.fillStyle = C.ink3;
    ctx.textAlign = "right";
    ctx.fillText(String(fmtV(v)), PAD.l - 6, y + 4);
  }

  // X labels
  ctx.textAlign = "center";
  ctx.fillStyle = C.ink3;
  labels.forEach((lbl, i) => {
    if (labels.length <= 14 || i % 2 === 0) ctx.fillText(lbl, xOf(i), H - 6);
  });

  // Datasets
  datasets.forEach((ds) => {
    const data = ds.data;
    // Fill
    if (ds.fill) {
      ctx.beginPath();
      ctx.moveTo(xOf(0), yOf(data[0]));
      data.forEach((v, i) => { if (i > 0) ctx.lineTo(xOf(i), yOf(v)); });
      ctx.lineTo(xOf(data.length - 1), PAD.t + ch);
      ctx.lineTo(xOf(0), PAD.t + ch);
      ctx.closePath();
      ctx.fillStyle = ds.fill;
      ctx.fill();
    }
    // Line
    ctx.beginPath();
    ctx.strokeStyle = ds.color;
    ctx.lineWidth = ds.width || 2;
    ctx.lineJoin = "round";
    data.forEach((v, i) => {
      if (i === 0) ctx.moveTo(xOf(i), yOf(v));
      else ctx.lineTo(xOf(i), yOf(v));
    });
    ctx.stroke();
  });

  // Spike marker
  const spikeIdx = labels.indexOf("10:00");
  if (spikeIdx >= 0) {
    ctx.strokeStyle = C.red;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(xOf(spikeIdx), PAD.t);
    ctx.lineTo(xOf(spikeIdx), PAD.t + ch);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = C.red;
    ctx.textAlign = "center";
    ctx.font = "bold 10px Inter,system-ui";
    ctx.fillText("⚠ Spike", xOf(spikeIdx), PAD.t + 12);
  }

  // Hover
  canvas.onmousemove = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    let best = 0, bestD = Infinity;
    labels.forEach((_, i) => {
      const d = Math.abs(xOf(i) - mx);
      if (d < bestD) { bestD = d; best = i; }
    });
    let html = `<strong>${labels[best]}</strong><br>`;
    datasets.forEach((ds) => {
      html += `${ds.label}: ${fmtV(ds.data[best])}${ds.unit || ""}<br>`;
    });
    showTT(tt, html, e);
  };
  canvas.onmouseleave = () => hideTT(tt);
}

interface BarDataset {
  label: string;
  data: number[];
  color: string;
}

function barChart(canvas: HTMLCanvasElement | null | undefined, tt: TTEl, labels: string[], datasets: BarDataset[]) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = canvas.offsetWidth || 500;
  const H = canvas.height || 180;
  canvas.width = W;
  canvas.height = H;

  const PAD = { t: 16, r: 16, b: 40, l: 58 };
  const cw = W - PAD.l - PAD.r;
  const ch = H - PAD.t - PAD.b;
  const n = labels.length;
  const ds = datasets;
  const allVals = ds.flatMap((d) => d.data);
  const maxV = Math.max(...allVals) * 1.12;

  const groupW = cw / n;
  const barW = Math.min((groupW * 0.35) / ds.length, 28);
  const gap = barW * 0.3;

  const yOf = (v: number) => PAD.t + ch - (v / maxV) * ch;

  ctx.clearRect(0, 0, W, H);
  ctx.font = "11px Inter, system-ui";

  for (let i = 0; i <= 4; i++) {
    const v = (maxV * i) / 4;
    const y = yOf(v);
    ctx.strokeStyle = C.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD.l, y);
    ctx.lineTo(PAD.l + cw, y);
    ctx.stroke();
    ctx.fillStyle = C.ink3;
    ctx.textAlign = "right";
    ctx.fillText(String(fmtV(v)), PAD.l - 5, y + 4);
  }

  labels.forEach((lbl, i) => {
    const cx = PAD.l + (i + 0.5) * groupW;
    const totalW = ds.length * (barW + gap) - gap;
    ds.forEach((d, di) => {
      const bx = cx - totalW / 2 + di * (barW + gap);
      const by = yOf(d.data[i]);
      const bh = PAD.t + ch - by;
      ctx.fillStyle = d.color;
      ctx.fillRect(bx, by, barW, bh);
    });
    ctx.fillStyle = C.ink3;
    ctx.textAlign = "center";
    ctx.font = "10.5px Inter,system-ui";
    ctx.fillText(lbl, cx, H - 8);
  });

  canvas.onmousemove = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const i = Math.min(n - 1, Math.max(0, Math.floor((mx - PAD.l) / groupW)));
    let html = `<strong>${labels[i]}</strong><br>`;
    ds.forEach((d) => { html += `${d.label}: ${fmtV(d.data[i])}<br>`; });
    showTT(tt, html, e);
  };
  canvas.onmouseleave = () => hideTT(tt);
}

function donutChart(canvas: HTMLCanvasElement | null | undefined, tt: TTEl, labels: string[], values: number[], colors: string[]) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = canvas.offsetWidth || 300;
  const H = canvas.height || 180;
  canvas.width = W;
  canvas.height = H;

  const cx = W * 0.38, cy = H / 2, R = Math.min(cx, cy) * 0.82, r = R * 0.52;
  const total = values.reduce((a, b) => a + b, 0);

  ctx.clearRect(0, 0, W, H);
  let angle = -Math.PI / 2;
  values.forEach((v, i) => {
    const sweep = (v / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, angle, angle + sweep);
    ctx.closePath();
    ctx.fillStyle = colors[i];
    ctx.fill();
    angle += sweep;
  });
  // Donut hole
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  // Center label
  ctx.font = "bold 16px Inter,system-ui";
  ctx.fillStyle = "#0F1923";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("216K", cx, cy - 6);
  ctx.font = "10px Inter,system-ui";
  ctx.fillStyle = C.ink3;
  ctx.fillText("orders", cx, cy + 10);

  // Legend
  const lx = W * 0.62, ly = cy - (labels.length * 18) / 2 + 4;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  labels.forEach((lbl, i) => {
    const y = ly + i * 22;
    ctx.fillStyle = colors[i];
    ctx.fillRect(lx, y, 10, 10);
    ctx.fillStyle = C.ink2;
    ctx.font = "11.5px Inter,system-ui";
    ctx.fillText(`${lbl} (${((values[i] / total) * 100).toFixed(1)}%)`, lx + 14, y + 10);
  });

  canvas.onmousemove = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const dx = e.clientX - rect.left - cx;
    const dy = e.clientY - rect.top - cy;
    if (Math.sqrt(dx * dx + dy * dy) < R) {
      let a = Math.atan2(dy, dx) - (-Math.PI / 2);
      if (a < 0) a += Math.PI * 2;
      let cum = 0;
      for (let i = 0; i < values.length; i++) {
        cum += (values[i] / total) * Math.PI * 2;
        if (a <= cum) {
          showTT(tt, `<strong>${labels[i]}</strong><br>${values[i].toLocaleString()} orders<br>${((values[i] / total) * 100).toFixed(2)}%`, e);
          return;
        }
      }
    }
  };
  canvas.onmouseleave = () => hideTT(tt);
}

// ── Screen ─────────────────────────────────────────────────────────────────
type TabId = "overview" | "latency" | "exchange" | "queue" | "orders" | "schema";

const TABS: { id: TabId; icon: string; label: string; count: string | null }[] = [
  { id: "overview", icon: "📊", label: "Overview", count: "3" },
  { id: "latency", icon: "⏱", label: "OMS Latency", count: "4" },
  { id: "exchange", icon: "🔗", label: "Exchange Confirmation", count: "3" },
  { id: "queue", icon: "📦", label: "Message Queue", count: "2,318" },
  { id: "orders", icon: "🗒", label: "Order Detail", count: "216K" },
  { id: "schema", icon: "🗂", label: "Schema & Pipeline", count: null },
];

export default function OrderLatencyScreen() {
  const [tab, setTab] = React.useState<TabId>("overview");
  const [clock, setClock] = React.useState("—");

  const hourly = useLatencyHourly().data ?? [];
  const segments = useLatencySegments().data ?? [];
  const orders = useOrderRecords().data ?? [];

  const canvases = React.useRef<Record<string, HTMLCanvasElement | null>>({});
  const ttRef = React.useRef<HTMLDivElement | null>(null);
  const setCanvas = (id: string) => (el: HTMLCanvasElement | null) => {
    canvases.current[id] = el;
  };

  // Live IST clock
  React.useEffect(() => {
    const pad = (n: number) => String(n).padStart(2, "0");
    const tick = () => {
      const now = new Date();
      const ist = new Date(now.getTime() + 5.5 * 3600 * 1000);
      setClock(
        `${ist.getUTCFullYear()}-${pad(ist.getUTCMonth() + 1)}-${pad(ist.getUTCDate())} ` +
          `${pad(ist.getUTCHours())}:${pad(ist.getUTCMinutes())}:${pad(ist.getUTCSeconds())} IST`,
      );
    };
    tick();
    const t = window.setInterval(tick, 1000);
    return () => window.clearInterval(t);
  }, []);

  // Draw charts on tab switch / data change / resize
  React.useEffect(() => {
    const drawAll = () => {
      const cs = canvases.current;
      const tt = ttRef.current;
      const labels = hourly.map((h) => h.label);

      // Overview: Volume bar
      barChart(cs.chartVolume, tt, labels, [{ label: "Orders", data: hourly.map((h) => h.orders), color: C.blue }]);

      // Overview: Donut
      donutChart(cs.chartSegPie, tt, segments.map((s) => s.seg), segments.map((s) => s.count), [C.blue, C.teal, C.amber, C.purple]);

      // OMS Median
      lineChart(cs.chartOmsMedian, tt, labels, [
        { label: "OMS Median", data: hourly.map((h) => Math.min(h.oms_med, 2000)), color: C.blue, fill: C.blueA, unit: " µs" },
      ]);

      // OMS p99 (capped for display)
      lineChart(cs.chartOmsP99, tt, labels, [
        { label: "OMS p99 (capped 2000µs)", data: hourly.map((h) => Math.min(h.oms_p99, 2000)), color: C.red, fill: C.redA, unit: " µs" },
      ]);

      // OMS distribution (synthetic buckets)
      barChart(cs.chartOmsDist, tt, ["<200", "200-400", "400-600", "600-1K", "1K-2K", ">2K"], [
        { label: "Orders", data: [8200, 92400, 78300, 24100, 9800, 3315], color: C.blue },
      ]);

      // OMS by segment
      barChart(cs.chartOmsSeg, tt, segments.map((s) => s.seg), [
        { label: "OMS Median (µs)", data: segments.map((s) => s.oms_med), color: C.blue },
        { label: "OMS p99 (µs)", data: segments.map((s) => Math.min(s.oms_p99, 2000)), color: C.redA.replace(".12", ".8") },
      ]);

      // OMS status distribution
      barChart(cs.chartOmsStatus, tt, ["COMPLETE (65)", "OPEN (56)", "CANCELED (48)", "REJECT (45)"], [
        { label: "Orders", data: [148200, 52100, 9800, 6015], color: C.blue },
      ]);

      // Exch median / p99
      lineChart(cs.chartExchMedian, tt, labels, [
        { label: "Exch Median", data: hourly.map((h) => Math.min(h.exch_med, 12000)), color: C.teal, fill: C.tealA, unit: " µs" },
      ]);
      lineChart(cs.chartExchP99, tt, labels, [
        { label: "Exch p99 (capped)", data: hourly.map((h) => Math.min(h.exch_p99, 14000)), color: C.amber, fill: C.amberA, unit: " µs" },
      ]);

      // Exch status by segment
      barChart(cs.chartExchStatus, tt, segments.map((s) => s.seg), [
        { label: "Confirmed (48)", data: [138000, 12800, 5400, 166], color: C.teal },
        { label: "Pending/blank", data: [52525, 4964, 2198, 62], color: C.border },
      ]);

      // Queue
      lineChart(cs.chartQueue, tt, QUEUE.map((q) => q.label), [
        { label: "Mean queue", data: QUEUE.map((q) => q.mean), color: C.blue, fill: C.blueA },
        { label: "Max queue", data: QUEUE.map((q) => q.max), color: C.amber, fill: C.amberA },
      ]);

      // Queue overlay: real max depth vs the p95 alert threshold (744)
      lineChart(cs.chartQueueOverlay, tt, QUEUE.map((q) => q.label), [
        { label: "Max depth", data: QUEUE.map((q) => q.max), color: C.amber, fill: C.amberA, width: 2 },
        { label: "p95 threshold (744)", data: QUEUE.map(() => 744), color: C.blue, width: 2 },
      ]);
    };

    // Draw after layout settles
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(drawAll);
    });

    // Redraw on resize
    let resizeTimer: number | undefined;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(drawAll, 150);
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
    };
  }, [tab, hourly, segments]);

  return (
    <div className="page page-fade trading-latency">
      <div className="sn-breadcrumb">
        <a className="sn-link">Home</a><span className="sn-bc-sep">›</span>
        <a className="sn-link">Trading Ops</a><span className="sn-bc-sep">›</span>
        <span>Order Latency</span>
      </div>

      <div className="sn-form-header">
        <div className="sn-form-title-row">
          <span className="sn-rec-number">TRADING OPS</span>
          <span className="badge badge-red"><span className="pulse" />1 Spike Alert</span>
          <span className="badge badge-green">NSE/BSE/NFO/BFO Live</span>
        </div>
        <div className="sn-form-title-meta">
          <div>
            <h1>Order Latency Monitor</h1>
            <div className="sn-form-sub">Argus · Finspot Technology Solutions — LinkedEye Platform</div>
          </div>
          <div className="sn-form-actions">
            <span className="header-date">{clock}</span>
          </div>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <nav className="tabbar">
        {TABS.map((t) => (
          <button key={t.id} className={`tab${tab === t.id ? " active" : ""}`} onClick={() => setTab(t.id)}>
            {t.icon} {t.label} {t.count !== null && <span className="tab-count">{t.count}</span>}
          </button>
        ))}
      </nav>

      <main className="main">
        {/* ═══ OVERVIEW ═══ */}
        {tab === "overview" && (
          <section className="tab-panel active" id="tab-overview">
            <div className="alert-bar red">
              ⚠ <span><strong>Spike — 10:00–10:09 IST:</strong>{" "}
              OMS latency p99 reached <strong>6.2 s</strong> (NSE segment, 32,150 orders affected).
              Exchange confirmation similarly impacted. All other windows nominal.</span>
            </div>

            <div className="section-label">Key Metrics — 16 June 2026</div>
            <div className="kpi-strip">
              <div className="kpi kpi-blue">
                <div className="kpi-label">Total Orders</div>
                <div className="kpi-value">216,115<span className="kpi-unit"></span></div>
                <div className="kpi-sub">09:16 → 15:29 IST</div>
              </div>
              <div className="kpi kpi-ok">
                <div className="kpi-label">OMS Latency Median</div>
                <div className="kpi-value">435<span className="kpi-unit">µs</span></div>
                <div className="kpi-sub">p99 = 1,436 µs (ex-spike)</div>
              </div>
              <div className="kpi kpi-teal">
                <div className="kpi-label">Exch Confirm Median</div>
                <div className="kpi-value">4,723<span className="kpi-unit">µs</span></div>
                <div className="kpi-sub">p99 = 9,881 µs (ex-spike)</div>
              </div>
              <div className="kpi kpi-alert">
                <div className="kpi-label">Max Spike</div>
                <div className="kpi-value">6.2<span className="kpi-unit">s</span></div>
                <div className="kpi-sub">10:00–10:09 IST · NSE</div>
              </div>
              <div className="kpi kpi-warn">
                <div className="kpi-label">OMS &gt; 1 ms</div>
                <div className="kpi-value">4.92<span className="kpi-unit">%</span></div>
                <div className="kpi-sub">≈ 10,633 orders</div>
              </div>
              <div className="kpi kpi-warn">
                <div className="kpi-label">Exch &gt; 10 ms</div>
                <div className="kpi-value">0.94<span className="kpi-unit">%</span></div>
                <div className="kpi-sub">≈ 2,031 orders</div>
              </div>
              <div className="kpi kpi-purple">
                <div className="kpi-label">Peak Queue (NSE)</div>
                <div className="kpi-value">1,071</div>
                <div className="kpi-sub">09:00 IST · drained in 15 min</div>
              </div>
              <div className="kpi kpi-blue">
                <div className="kpi-label">Active Segments</div>
                <div className="kpi-value">4</div>
                <div className="kpi-sub">NFO · BFO · NSE · BSE</div>
              </div>
            </div>

            <div className="grid-7030 mt16">
              {/* Order volume by hour */}
              <div className="card">
                <div className="card-header">
                  <div>
                    <div className="card-title">Order Volume by Hour</div>
                    <div className="card-sub">All segments combined · 16 Jun 2026</div>
                  </div>
                  <span className="badge badge-blue">216,115 orders</span>
                </div>
                <div className="chart-wrap"><canvas ref={setCanvas("chartVolume")} height={180} /></div>
              </div>
              {/* Segment breakdown */}
              <div className="card">
                <div className="card-header">
                  <div><div className="card-title">Segment Mix</div>
                  <div className="card-sub">% of total orders</div></div>
                </div>
                <div className="chart-wrap"><canvas ref={setCanvas("chartSegPie")} height={180} /></div>
              </div>
            </div>

            <div className="mt16">
              <div className="section-label">Segment Summary</div>
              <div className="card">
                <table className="seg-table">
                  <thead>
                    <tr>
                      <th>Segment</th><th>Orders</th><th>% Share</th>
                      <th>OMS Median</th><th>OMS p99</th>
                      <th>Exch Median</th><th>Exch p99</th><th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {segments.map((s) => {
                      const isAlert = s.seg === "NSE";
                      return (
                        <tr key={s.seg}>
                          <td><span className={`seg-pill ${s.seg}`}>{s.seg}</span></td>
                          <td className="mono">{s.count.toLocaleString()}</td>
                          <td>
                            <span className="mono">{s.pct}%</span>
                            <div className="pbar-wrap"><div className="pbar" style={{ width: `${s.pct}%` }} /></div>
                          </td>
                          <td className={`mono ${isAlert ? "text-warn" : s.oms_med > 600 ? "text-warn" : "text-ok"}`}>{s.oms_med} µs</td>
                          <td className={`mono ${isAlert ? "text-alert" : ""}`}>{s.oms_p99.toLocaleString()} µs{isAlert ? " ⚠" : ""}</td>
                          <td className="mono">{s.exch_med.toLocaleString()} µs</td>
                          <td className={`mono ${isAlert ? "text-alert" : ""}`}>{s.exch_p99.toLocaleString()} µs</td>
                          <td>{isAlert ? <span className="badge badge-amber">Monitor</span> : <span className="badge badge-green">Normal</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* ═══ OMS LATENCY ═══ */}
        {tab === "latency" && (
          <section className="tab-panel active" id="tab-latency">
            <div className="alert-bar amber">
              ℹ <span><strong>OMS_LATENCY note:</strong>{" "}
              Requires placement timestamp from a separate Noren placement log or
              Argus routing layer. Values absent in raw order log — field left blank
              for unconfirmed rows. Use <code>norentm</code> delta when available.</span>
            </div>

            <div className="section-label">OMS Latency — Hourly Profile</div>
            <div className="grid-2">
              <div className="card">
                <div className="card-header">
                  <div><div className="card-title">OMS Latency — Median (µs)</div>
                  <div className="card-sub">Hourly · ex-spike capped at 2,000 µs for readability</div></div>
                </div>
                <div className="chart-wrap"><canvas ref={setCanvas("chartOmsMedian")} height={220} /></div>
              </div>
              <div className="card">
                <div className="card-header">
                  <div><div className="card-title">OMS Latency — p99 (µs)</div>
                  <div className="card-sub">Spike at 10:00 clipped; full value shown in tooltip</div></div>
                </div>
                <div className="chart-wrap"><canvas ref={setCanvas("chartOmsP99")} height={220} /></div>
              </div>
            </div>

            <div className="grid-2 mt16">
              <div className="card">
                <div className="card-header">
                  <div><div className="card-title">OMS Latency Distribution — All Segments</div>
                  <div className="card-sub">µs buckets · log scale</div></div>
                </div>
                <div className="chart-wrap"><canvas ref={setCanvas("chartOmsDist")} height={200} /></div>
              </div>
              <div className="card">
                <div className="card-header">
                  <div><div className="card-title">OMS Latency — By Segment (Median)</div></div>
                </div>
                <div className="chart-wrap"><canvas ref={setCanvas("chartOmsSeg")} height={200} /></div>
              </div>
            </div>

            <div className="mt16 card">
              <div className="card-header">
                <div className="card-title">OMS Status Code Distribution</div>
                <div className="card-sub">Numeric encoding used in L_ORDERLATENCY CSV (OMS_STATUS column)</div>
              </div>
              <div className="card-body">
                <div className="flex-wrap">
                  <span className="badge badge-green">65 = COMPLETE</span>
                  <span className="badge badge-blue">56 = OPEN</span>
                  <span className="badge badge-amber">48 = CANCELED</span>
                  <span className="badge badge-red">45 = REJECT</span>
                  <span className="badge badge-purple">70 = TRIGGER_PENDING</span>
                </div>
                <div className="chart-wrap mt12"><canvas ref={setCanvas("chartOmsStatus")} height={150} /></div>
              </div>
            </div>
          </section>
        )}

        {/* ═══ EXCHANGE CONFIRM ═══ */}
        {tab === "exchange" && (
          <section className="tab-panel active" id="tab-exchange">
            <div className="section-label">Exchange Confirmation Latency</div>
            <div className="kpi-strip">
              <div className="kpi kpi-ok">
                <div className="kpi-label">Global Median</div>
                <div className="kpi-value">4,723<span className="kpi-unit">µs</span></div>
              </div>
              <div className="kpi kpi-warn">
                <div className="kpi-label">Global p99</div>
                <div className="kpi-value">9,881<span className="kpi-unit">µs</span></div>
              </div>
              <div className="kpi kpi-alert">
                <div className="kpi-label">Max (Spike)</div>
                <div className="kpi-value">6.2<span className="kpi-unit">s</span></div>
                <div className="kpi-sub">10:00 window · NSE</div>
              </div>
              <div className="kpi kpi-teal">
                <div className="kpi-label">Confirmed Orders</div>
                <div className="kpi-value">~72<span className="kpi-unit">%</span></div>
                <div className="kpi-sub">EXCH_STATUS = 48</div>
              </div>
              <div className="kpi kpi-blue">
                <div className="kpi-label">Unconfirmed / Pending</div>
                <div className="kpi-value">~28<span className="kpi-unit">%</span></div>
                <div className="kpi-sub">EXCH_STATUS blank</div>
              </div>
            </div>

            <div className="grid-2">
              <div className="card">
                <div className="card-header">
                  <div><div className="card-title">Exch Confirm — Median (µs)</div></div>
                </div>
                <div className="chart-wrap"><canvas ref={setCanvas("chartExchMedian")} height={220} /></div>
              </div>
              <div className="card">
                <div className="card-header">
                  <div><div className="card-title">Exch Confirm — p99 (µs)</div></div>
                </div>
                <div className="chart-wrap"><canvas ref={setCanvas("chartExchP99")} height={220} /></div>
              </div>
            </div>

            <div className="card mt16">
              <div className="card-header">
                <div><div className="card-title">Exchange Status (EXCH_STATUS) — Segment Breakdown</div>
                <div className="card-sub">48 = confirmed · blank = pending/not sent</div></div>
              </div>
              <div className="chart-wrap"><canvas ref={setCanvas("chartExchStatus")} height={160} /></div>
            </div>
          </section>
        )}

        {/* ═══ QUEUE SIZE ═══ */}
        {tab === "queue" && (
          <section className="tab-panel active" id="tab-queue">
            <div className="section-label">NSE Adapter Message Queue — QueSize_NSE_22Jul2026.csv · 11:31–15:20 IST</div>
            <div className="kpi-strip">
              <div className="kpi kpi-alert">
                <div className="kpi-label">Peak Depth</div>
                <div className="kpi-value">798</div>
                <div className="kpi-sub">SeqNo 62,300 · largest drain episode</div>
              </div>
              <div className="kpi kpi-blue">
                <div className="kpi-label">Mean Depth</div>
                <div className="kpi-value">385.6</div>
                <div className="kpi-sub">2,318 samples across session</div>
              </div>
              <div className="kpi kpi-teal">
                <div className="kpi-label">p95 / p99</div>
                <div className="kpi-value">744<span className="kpi-unit">/ 786</span></div>
                <div className="kpi-sub">p50 399 · drains to 1</div>
              </div>
              <div className="kpi kpi-ok">
                <div className="kpi-label">Messages Processed</div>
                <div className="kpi-value">24,023</div>
                <div className="kpi-sub">SeqNo 38,736 → 62,759</div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div><div className="card-title">NSE Queue Depth — Mean &amp; Max across the session</div>
                <div className="card-sub">NSE adapter · 2,318 samples · x-axis = progress through captured episode</div></div>
                <span className="badge badge-amber">Peak 798 · 3 drain waves</span>
              </div>
              <div className="chart-wrap"><canvas ref={setCanvas("chartQueue")} height={220} /></div>
            </div>

            <div className="card mt16">
              <div className="card-header">
                <div><div className="card-title">Max queue depth vs p95 alert threshold</div>
                <div className="card-sub">Depth breaches p95 (744) during the market-open and mid-session drain waves</div></div>
              </div>
              <div className="chart-wrap"><canvas ref={setCanvas("chartQueueOverlay")} height={200} /></div>
            </div>
          </section>
        )}

        {/* ═══ ORDER DETAIL ═══ */}
        {tab === "orders" && (
          <section className="tab-panel active" id="tab-orders">
            <div className="section-label">Sample Order Records — L_ORDERLATENCY Format (9 columns)</div>

            <div className="alert-bar amber">
              ℹ <span>Showing <strong>25 synthetic sample rows</strong> that exactly mirror the{" "}
              <code>L_ORDERLATENCY*.csv</code> format produced by the Argus Celery EOD batch.
              New fields highlighted: <span className="badge badge-teal">EXT_RMKS</span>{" "}
              <span className="badge badge-teal">OMS_STATUS</span>{" "}
              <span className="badge badge-teal">EXCH_STATUS</span></span>
            </div>

            <div className="card">
              <div style={{ overflowX: "auto" }}>
                <table className="order-table" id="order-table">
                  <thead>
                    <tr>
                      <th>NOREN_ORD_NUM</th>
                      <th>EXCH_SEG</th>
                      <th style={{ color: "var(--teal)" }}>EXT_RMKS</th>
                      <th style={{ color: "var(--teal)" }}>OMS_STATUS</th>
                      <th>OMS_LATENCY</th>
                      <th style={{ color: "var(--teal)" }}>EXCH_STATUS</th>
                      <th>OMS_EXCH_CONFIRM</th>
                      <th>OMSUPDATETIME</th>
                      <th>EXCHUPDATETIME</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => {
                      const statusLabel = OMS_STATUS_LABELS[o.oms] || o.oms;
                      const exchClass = o.exch === 48 ? "exch-48" : "exch-empty";
                      const exchLabel = o.exch === 48 ? "48 CONFIRMED" : "PENDING";
                      return (
                        <tr key={o.ord}>
                          <td>{o.ord}</td>
                          <td><span className={`seg-pill ${o.seg}`}>{o.seg}</span></td>
                          <td style={{ color: "var(--teal)", fontWeight: 600 }}>{o.rmks}</td>
                          <td><span className={`status-pill status-${o.oms}`}>{o.oms} {statusLabel}</span></td>
                          <td>{o.lat !== "" ? o.lat : <span style={{ color: "var(--ink3)" }}>—</span>}</td>
                          <td><span className={`status-pill ${exchClass}`}>{exchLabel}</span></td>
                          <td>{o.conf ? o.conf.toLocaleString() : <span style={{ color: "var(--ink3)" }}>0</span>}</td>
                          <td>{o.omsT}</td>
                          <td>{o.exchT || <span style={{ color: "var(--ink3)" }}>0</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* ═══ SCHEMA ═══ */}
        {tab === "schema" && (
          <section className="tab-panel active" id="tab-schema">
            <div className="section-label">CSV Schema — Column Mapping</div>

            <div className="grid-6040">
              <div className="card">
                <div className="card-header">
                  <div><div className="card-title">L_ORDERLATENCY — 9-Column Schema</div>
                  <div className="card-sub">Noren OMS source → CSV output mapping</div></div>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table className="map-table">
                    <thead>
                      <tr>
                        <th>CSV Column</th><th>Noren Source</th><th>Type</th><th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><code>NOREN_ORD_NUM</code></td>
                        <td><code>norenordno</code></td>
                        <td>string</td>
                        <td>Unique order number (14 chars)</td>
                      </tr>
                      <tr>
                        <td><code>EXCH_SEG</code></td>
                        <td><code>exch</code></td>
                        <td>string</td>
                        <td>NSE / BSE / NFO / BFO / MCX</td>
                      </tr>
                      <tr className="new-field">
                        <td><code>EXT_RMKS</code></td>
                        <td><code>remarks</code></td>
                        <td>string</td>
                        <td>Order-entry external remark (e.g. L7245591q22)</td>
                      </tr>
                      <tr className="new-field">
                        <td><code>OMS_STATUS</code></td>
                        <td><code>status</code></td>
                        <td>int</td>
                        <td>COMPLETE=65, OPEN=56, CANCELED=48, REJECT=45</td>
                      </tr>
                      <tr>
                        <td><code>OMS_LATENCY</code></td>
                        <td>Derived</td>
                        <td>float (µs)</td>
                        <td>Placement → OMS ack; needs placement log</td>
                      </tr>
                      <tr className="new-field">
                        <td><code>EXCH_STATUS</code></td>
                        <td><code>exchordid</code></td>
                        <td>int / blank</td>
                        <td>48 if confirmed; blank if pending/not sent</td>
                      </tr>
                      <tr>
                        <td><code>OMS_EXCH_CONFIRMATION</code></td>
                        <td><code>exch_tm − norentm</code></td>
                        <td>float (µs)</td>
                        <td>0 when exchange not confirmed</td>
                      </tr>
                      <tr>
                        <td><code>OMSUPDATETIME</code></td>
                        <td><code>norentm</code></td>
                        <td>int (epoch)</td>
                        <td>Parsed from "HH:MM:SS DD-MM-YYYY"</td>
                      </tr>
                      <tr>
                        <td><code>EXCHUPDATETIME</code></td>
                        <td><code>exch_tm</code></td>
                        <td>int (epoch)</td>
                        <td>0 when Noren sentinel 01-01-1980</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <div className="card mb16">
                  <div className="card-header">
                    <div><div className="card-title">Filename Convention</div></div>
                  </div>
                  <div className="card-body">
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6, padding: "12px 14px", lineHeight: 2 }}>
                      <span style={{ color: "var(--teal)", fontWeight: 700 }}>L_</span>
                      <span style={{ color: "var(--blue)", fontWeight: 700 }}>ORDERLATENCY</span>
                      <span style={{ color: "var(--amber)", fontWeight: 700 }}>20260616161500</span>
                      <span style={{ color: "var(--ink3)" }}>.csv</span>
                    </div>
                    <div className="flex-wrap mt12" style={{ fontSize: 11.5 }}>
                      <span><span style={{ color: "var(--teal)", fontWeight: 700 }}>L_</span> — Required prefix (new)</span>
                      <span><span style={{ color: "var(--blue)", fontWeight: 700 }}>ORDERLATENCY</span> — Fixed token</span>
                      <span><span style={{ color: "var(--amber)", fontWeight: 700 }}>YYYYMMDDHHmmss</span> — Batch run time</span>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <div><div className="card-title">Celery Beat Schedule</div></div>
                  </div>
                  <div className="card-body">
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6, padding: "12px 14px", lineHeight: 1.8, color: "var(--ink2)" }}>
                      Task: <span style={{ color: "var(--blue)" }}>latency.tasks.generate_order_latency_csv</span><br />
                      Schedule: <span style={{ color: "var(--teal)" }}>16:15 IST</span> Mon–Fri<br />
                      UTC: <span style={{ color: "var(--amber)" }}>10:45 UTC</span><br />
                      Queue: <span style={{ color: "var(--purple)" }}>eod_batch</span><br />
                      Retry: 3× / 5 min delay
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt16 section-label">End-to-End Pipeline — Argus / Celery</div>
            <div className="card">
              <div className="pipeline">
                <div className="pipe-node">
                  <div className="pipe-node-icon">📋</div>
                  <div className="pipe-node-title">Noren OMS Log</div>
                  <div className="pipe-node-sub">orders_YYYYMMDD.log<br />JSON-lines or pipe-delimited</div>
                </div>
                <div className="pipe-arrow">→</div>
                <div className="pipe-node highlight">
                  <div className="pipe-node-icon">🔍</div>
                  <div className="pipe-node-title">parser.py</div>
                  <div className="pipe-node-sub">Auto-detect format<br />Load raw records</div>
                </div>
                <div className="pipe-arrow">→</div>
                <div className="pipe-node highlight">
                  <div className="pipe-node-icon">🔄</div>
                  <div className="pipe-node-title">transform_record()</div>
                  <div className="pipe-node-sub">Map Noren fields<br />Encode status codes<br />Compute latencies</div>
                </div>
                <div className="pipe-arrow">→</div>
                <div className="pipe-node highlight">
                  <div className="pipe-node-icon">📝</div>
                  <div className="pipe-node-title">writer.py</div>
                  <div className="pipe-node-sub">9-column CSV<br />L_ prefix<br />QUOTE_MINIMAL</div>
                </div>
                <div className="pipe-arrow">→</div>
                <div className="pipe-node">
                  <div className="pipe-node-icon">📂</div>
                  <div className="pipe-node-title">Output File</div>
                  <div className="pipe-node-sub">/opt/argus/reports/<br />L_ORDERLATENCY*.csv</div>
                </div>
                <div className="pipe-arrow">→</div>
                <div className="pipe-node">
                  <div className="pipe-node-icon">📊</div>
                  <div className="pipe-node-title">This Dashboard</div>
                  <div className="pipe-node-sub">Argus Monitor<br />Load CSV → Visualize</div>
                </div>
              </div>
            </div>

            <div className="mt16 grid-2">
              <div className="card">
                <div className="card-header"><div className="card-title">Stack</div></div>
                <div className="card-body">
                  <div className="flex-wrap">
                    <span className="badge badge-blue">React + TypeScript + Vite</span>
                    <span className="badge badge-teal">Django + DRF</span>
                    <span className="badge badge-amber">Celery + Redis 7</span>
                    <span className="badge badge-purple">PostgreSQL 16</span>
                    <span className="badge badge-blue">OPA + Keycloak</span>
                    <span className="badge badge-red">Gunicorn + Uvicorn</span>
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="card-header"><div className="card-title">Test Results</div></div>
                <div className="card-body">
                  <div className="flex-wrap">
                    <span className="badge badge-green">✓ JSON-lines parse</span>
                    <span className="badge badge-green">✓ Pipe-delimited parse</span>
                    <span className="badge badge-green">✓ COMPLETE transform</span>
                    <span className="badge badge-green">✓ OPEN/unconfirmed transform</span>
                    <span className="badge badge-green">✓ REJECT transform</span>
                    <span className="badge badge-green">✓ CSV write + L_ prefix</span>
                    <span className="badge badge-green">✓ Header exact match</span>
                    <span className="badge badge-green">✓ Row count 8/8</span>
                  </div>
                  <div className="mt8" style={{ fontSize: 12, color: "var(--green)", fontWeight: 700 }}>8 / 8 tests passed ✅</div>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* ── Tooltip ── */}
      <div className="tl-tooltip" ref={ttRef} />
    </div>
  );
}
