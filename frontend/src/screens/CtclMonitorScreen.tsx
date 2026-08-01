// CTCL Data Monitor — Noren OMS adapter-line queue dashboard.
// Ported from design-reference/CTCL_Data_Monitor.html into the platform shell.
import React from "react";
import { useCtclLines, useBrokers, type CtclLine, type BrokerCtcl } from "@/api/hooks";
import "./tradingOps.css";

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

// Peaks bar data
const PEAK_LABELS = ["NSE-2729", "NSE-5864\n(close)", "NSE-48621", "BSE", "NFO", "BFO"];
const PEAK_VALUES = [5538, 1114, 1071, 1222, 507, 420];
const PEAK_COLORS = ["#DC2626", "#D97706", "#D97706", "#7C3AED", "#0891B2", "#C2410C"];

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

const STATUS_BADGE: Record<string, string> = {
  "Full Day": "b-green",
  "Truncated ⚠": "b-red",
  "Flash only": "b-amber",
  Empty: "b-red",
  Active: "b-green",
};

const BROKERS: BrokerCtcl[] = [
  { n: "BetaFront", ctcls: { n1: "5864-101", n2: "2729-101", nf1: "13424-101", nf2: "57507-101", bse: "BSE-101", bfo: "BFO-101" }, nse: 1, nfo: 1, bse: 1, bfo: 1 },
  { n: "IndMoney", ctcls: { n1: "5864-102", n2: "2729-102", nf1: "13424-102", nf2: "57507-102", bse: "BSE-102", bfo: "BFO-102" }, nse: 1, nfo: 1, bse: 1, bfo: 1 },
  { n: "FlatTrade", ctcls: { n1: "5864-103", n2: "2729-103", nf1: "13424-103", nf2: "57507-103", bse: "BSE-103", bfo: "BFO-103" }, nse: 1, nfo: 1, bse: 1, bfo: 1 },
  { n: "W2W", ctcls: { n1: "5864-104", n2: "2729-104", nf1: "13424-104", nf2: "—", bse: "BSE-104", bfo: "BFO-104" }, nse: 1, nfo: 0, bse: 1, bfo: 1 },
  { n: "Lemonn", ctcls: { n1: "5864-105", n2: "2729-105", nf1: "13424-105", nf2: "57507-105", bse: "BSE-105", bfo: "BFO-105" }, nse: 1, nfo: 1, bse: 1, bfo: 1 },
  { n: "Neo", ctcls: { n1: "5864-106", n2: "2729-106", nf1: "13424-106", nf2: "57507-106", bse: "BSE-106", bfo: "BFO-106" }, nse: 1, nfo: 1, bse: 1, bfo: 1 },
  { n: "Fyers", ctcls: { n1: "5864-107", n2: "2729-107", nf1: "13424-107", nf2: "57507-107", bse: "BSE-107", bfo: "BFO-107" }, nse: 1, nfo: 1, bse: 1, bfo: 1 },
  { n: "SMC Global", ctcls: { n1: "5864-108", n2: "2729-108", nf1: "—", nf2: "57507-108", bse: "BSE-108", bfo: "BFO-108" }, nse: 1, nfo: 1, bse: 0, bfo: 1 },
  { n: "Marwadi", ctcls: { n1: "5864-109", n2: "2729-109", nf1: "—", nf2: "57507-109", bse: "BSE-109", bfo: "BFO-109" }, nse: 1, nfo: 1, bse: 0, bfo: 1 },
  { n: "Geojit", ctcls: { n1: "5864-110", n2: "2729-110", nf1: "13424-110", nf2: "57507-110", bse: "BSE-110", bfo: "BFO-110" }, nse: 1, nfo: 1, bse: 1, bfo: 1 },
  { n: "CapitalVia", ctcls: { n1: "5864-111", n2: "2729-111", nf1: "—", nf2: "57507-111", bse: "BSE-111", bfo: "—" }, nse: 1, nfo: 1, bse: 0, bfo: 0 },
  { n: "Navia", ctcls: { n1: "5864-112", n2: "2729-112", nf1: "13424-112", nf2: "57507-112", bse: "BSE-112", bfo: "BFO-112" }, nse: 1, nfo: 1, bse: 1, bfo: 1 },
  { n: "Profitmart", ctcls: { n1: "5864-113", n2: "2729-113", nf1: "13424-113", nf2: "57507-113", bse: "BSE-113", bfo: "BFO-113" }, nse: 1, nfo: 1, bse: 1, bfo: 1 },
  { n: "Tradingo", ctcls: { n1: "5864-114", n2: "—", nf1: "—", nf2: "57507-114", bse: "BSE-114", bfo: "BFO-114" }, nse: 0, nfo: 1, bse: 1, bfo: 1 },
  { n: "Nirmal Bang", ctcls: { n1: "5864-115", n2: "2729-115", nf1: "13424-115", nf2: "57507-115", bse: "BSE-115", bfo: "BFO-115" }, nse: 1, nfo: 1, bse: 1, bfo: 1 },
  { n: "Stock19", ctcls: { n1: "5864-116", n2: "2729-116", nf1: "13424-116", nf2: "57507-116", bse: "BSE-116", bfo: "—" }, nse: 1, nfo: 1, bse: 1, bfo: 0 },
  { n: "Asit C Mehta", ctcls: { n1: "—", n2: "2729-117", nf1: "—", nf2: "—", bse: "BSE-117", bfo: "BFO-117" }, nse: 0, nfo: 0, bse: 1, bfo: 1 },
  { n: "SMIFS", ctcls: { n1: "—", n2: "2729-118", nf1: "—", nf2: "—", bse: "BSE-118", bfo: "BFO-118" }, nse: 0, nfo: 0, bse: 1, bfo: 1 },
];

// ── Chart engine (ported vanilla-canvas engine; null-aware, sparse dots) ──
type TTEl = HTMLDivElement | null;

function showTT(tt: TTEl, html: string, e: MouseEvent) {
  if (!tt) return;
  tt.innerHTML = html;
  tt.classList.add("show");
  let x = e.clientX + 14, y = e.clientY + 14;
  if (x + 210 > window.innerWidth) x = e.clientX - 220;
  if (y + 90 > window.innerHeight) y = e.clientY - 90;
  tt.style.left = x + "px";
  tt.style.top = y + "px";
}
function hideTT(tt: TTEl) {
  if (tt) tt.classList.remove("show");
}

function fmtN(v: number | string | null | undefined): string {
  if (v == null || v === "") return "—";
  if (typeof v !== "number") return v;
  return v >= 1000 ? v.toLocaleString(undefined, { maximumFractionDigits: 0 }) : v.toFixed(v % 1 ? 1 : 0);
}

interface CtclDataset {
  label: string;
  data: (number | null)[];
  color: string;
  fill?: string;
  w?: number;
  dots?: boolean;
}

function lineChart(cvs: HTMLCanvasElement | null | undefined, tt: TTEl, labels: string[], datasets: CtclDataset[], opts?: { maxV?: number }) {
  if (!cvs) return;
  const ctx = cvs.getContext("2d");
  if (!ctx) return;
  const W = (cvs.parentElement && cvs.parentElement.clientWidth) || 400;
  const H = parseInt(cvs.getAttribute("height") || "", 10) || 180;
  cvs.width = W;
  cvs.height = H;

  const P = { t: 18, r: 16, b: 34, l: 52 };
  const cw = W - P.l - P.r, ch = H - P.t - P.b;

  const vals = datasets.flatMap((d) => d.data.filter((v): v is number => v != null));
  const maxV = (opts && opts.maxV) || Math.max(...vals) * 1.1 || 10;
  const minV = 0;

  const xOf = (i: number, n: number) => P.l + (i / (n - 1)) * cw;
  const yOf = (v: number) => P.t + ch - ((v - minV) / (maxV - minV)) * ch;

  ctx.clearRect(0, 0, W, H);
  ctx.font = "10px Inter,system-ui";
  ctx.fillStyle = "#7B8BA0";

  // Grid lines
  const ticks = 5;
  for (let i = 0; i <= ticks; i++) {
    const v = minV + (maxV - minV) * (i / ticks);
    const y = yOf(v);
    ctx.strokeStyle = "#E1E5EC";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(P.l, y);
    ctx.lineTo(P.l + cw, y);
    ctx.stroke();
    ctx.textAlign = "right";
    ctx.fillText(fmtN(v), P.l - 5, y + 4);
  }

  // X labels
  ctx.textAlign = "center";
  const step = Math.ceil(labels.length / 10);
  labels.forEach((lbl, i) => {
    if (i % step === 0) ctx.fillText(lbl, xOf(i, labels.length), H - 4);
  });

  // Spike zone (only if labels include 10:00)
  const si = labels.indexOf("10:00");
  if (si >= 0) {
    ctx.fillStyle = "rgba(220,38,38,.05)";
    const x1 = xOf(si, labels.length) - 2, x2 = xOf(Math.min(si + 1, labels.length - 1), labels.length) + 2;
    ctx.fillRect(x1, P.t, x2 - x1, ch);
  }

  // Datasets
  datasets.forEach((ds) => {
    const data = ds.data, n = data.length;
    // Fill
    if (ds.fill) {
      ctx.beginPath();
      let first = true;
      data.forEach((v, i) => {
        if (v == null) return;
        if (first) { ctx.moveTo(xOf(i, n), yOf(v)); first = false; }
        else ctx.lineTo(xOf(i, n), yOf(v));
      });
      ctx.lineTo(xOf(n - 1, n), P.t + ch);
      ctx.lineTo(xOf(0, n), P.t + ch);
      ctx.closePath();
      ctx.fillStyle = ds.fill;
      ctx.fill();
    }
    // Line (skip nulls)
    ctx.strokeStyle = ds.color;
    ctx.lineWidth = ds.w || 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    let seg = false;
    data.forEach((v, i) => {
      if (v == null) { seg = false; return; }
      if (!seg) { ctx.beginPath(); ctx.moveTo(xOf(i, n), yOf(v)); seg = true; }
      else ctx.lineTo(xOf(i, n), yOf(v));
    });
    if (seg) ctx.stroke();

    // Dots for sparse data
    if (ds.dots) {
      data.forEach((v, i) => {
        if (v == null) return;
        ctx.beginPath();
        ctx.arc(xOf(i, n), yOf(v), 3, 0, Math.PI * 2);
        ctx.fillStyle = ds.color;
        ctx.fill();
      });
    }
  });

  // Hover
  cvs.onmousemove = (e: MouseEvent) => {
    const rect = cvs.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    let best = 0, bestD = Infinity;
    labels.forEach((_, i) => {
      const d = Math.abs(xOf(i, labels.length) - mx);
      if (d < bestD) { bestD = d; best = i; }
    });
    let html = `<strong>${labels[best]}</strong><br>`;
    datasets.forEach((d) => {
      const v = d.data[best];
      html += `${d.label}: ${v == null ? "—" : fmtN(v)}<br>`;
    });
    showTT(tt, html, e);
  };
  cvs.onmouseleave = () => hideTT(tt);
}

function barChart(cvs: HTMLCanvasElement | null | undefined, tt: TTEl, labels: string[], values: number[], colors: string[]) {
  if (!cvs) return;
  const ctx = cvs.getContext("2d");
  if (!ctx) return;
  const W = (cvs.parentElement && cvs.parentElement.clientWidth) || 400;
  const H = parseInt(cvs.getAttribute("height") || "", 10) || 200;
  cvs.width = W;
  cvs.height = H;

  const P = { t: 20, r: 16, b: 40, l: 58 };
  const cw = W - P.l - P.r, ch = H - P.t - P.b;
  const n = labels.length;
  const maxV = Math.max(...values) * 1.12;
  const barW = Math.min((cw / n) * 0.55, 50);

  const xOf = (i: number) => P.l + (i + 0.5) * (cw / n);
  const yOf = (v: number) => P.t + ch - (v / maxV) * ch;

  ctx.clearRect(0, 0, W, H);
  ctx.font = "10px Inter,system-ui";
  ctx.fillStyle = "#7B8BA0";

  for (let i = 0; i <= 4; i++) {
    const v = maxV * (i / 4);
    const y = yOf(v);
    ctx.strokeStyle = "#E1E5EC";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(P.l, y);
    ctx.lineTo(P.l + cw, y);
    ctx.stroke();
    ctx.textAlign = "right";
    ctx.fillText(fmtN(v), P.l - 5, y + 4);
  }

  labels.forEach((lbl, i) => {
    const x = xOf(i), y = yOf(values[i]), h = yOf(0) - y;
    ctx.fillStyle = colors[i];
    ctx.fillRect(x - barW / 2, y, barW, h);
    ctx.fillStyle = "#7B8BA0";
    ctx.textAlign = "center";
    // Multi-line label
    const parts = lbl.split("\n");
    parts.forEach((p, pi) => ctx.fillText(p, x, H - 6 - (parts.length - 1 - pi) * 12));
    // Value on top
    ctx.fillStyle = colors[i];
    ctx.font = "bold 11px Inter,system-ui";
    ctx.fillText(fmtN(values[i]), x, y - 5);
    ctx.font = "10px Inter,system-ui";
  });

  cvs.onmousemove = (e: MouseEvent) => {
    const rect = cvs.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    let best = 0, bestD = Infinity;
    labels.forEach((_, i) => {
      const d = Math.abs(xOf(i) - mx);
      if (d < bestD) { bestD = d; best = i; }
    });
    showTT(tt, `<strong>${labels[best].replace("\n", " ")}</strong><br>Peak: ${fmtN(values[best])}`, e);
  };
  cvs.onmouseleave = () => hideTT(tt);
}

// ── Time-range filtering ───────────────────────────────────────────────────
const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

/** Bracket [from, to] with the nearest sampled labels (inclusive). */
function rangeIndices(labels: string[], from: string, to: string): [number, number] {
  const f = toMin(from), t = toMin(to);
  let lo = 0, hi = labels.length - 1;
  for (let i = 0; i < labels.length; i++) if (toMin(labels[i]) <= f) lo = i;
  for (let i = labels.length - 1; i >= 0; i--) if (toMin(labels[i]) >= t) hi = i;
  if (hi <= lo) hi = Math.min(lo + 1, labels.length - 1);
  return [lo, hi];
}

/** Slice a series whose resolution may differ from the label resolution. */
function sliceSeries(data: (number | null)[], lo: number, hi: number, nLabels: number): (number | null)[] {
  if (data.length === 0) return data;
  const li = Math.round((lo / (nLabels - 1)) * (data.length - 1));
  const hiI = Math.round((hi / (nLabels - 1)) * (data.length - 1));
  return data.slice(li, hiI + 1);
}

// ── Screen ─────────────────────────────────────────────────────────────────
type PanelId = "overview" | "queue" | "windows" | "ctclmap" | "alerts";

const NAV: { id: PanelId; icon: string; label: string; count: string | null }[] = [
  { id: "overview", icon: "📊", label: "Overview", count: "18" },
  { id: "queue", icon: "📈", label: "Queue Size", count: "6" },
  { id: "windows", icon: "⏱", label: "Trading Windows", count: null },
  { id: "ctclmap", icon: "🗂", label: "CTCL Map", count: "18" },
  { id: "alerts", icon: "🔔", label: "Alerts", count: null },
];

const PRESETS: { label: string; from: string; to: string }[] = [
  { label: "Full Day", from: "09:00", to: "15:30" },
  { label: "Open 09:10–09:20", from: "09:10", to: "09:20" },
  { label: "Pre-Market", from: "09:00", to: "09:15" },
  { label: "Close 15:15–15:30", from: "15:15", to: "15:30" },
  { label: "Mid-Day", from: "12:00", to: "14:00" },
];

export default function CtclMonitorScreen() {
  const [tab, setTab] = React.useState<PanelId>("overview");
  const [clock, setClock] = React.useState("—");
  const [trFrom, setTrFrom] = React.useState("09:00");
  const [trTo, setTrTo] = React.useState("15:30");
  const [preset, setPreset] = React.useState(0);
  const [applied, setApplied] = React.useState<{ from: string; to: string }>({ from: "09:00", to: "15:30" });

  const lines = useCtclLines().data ?? [];
  const brokers = useBrokers().data ?? [];

  const seriesOf = React.useCallback(
    (id: string, fb: (number | null)[]): (number | null)[] => {
      const s = lines.find((l) => l.id === id)?.series;
      return s && s.length ? s : fb;
    },
    [lines],
  );

  const canvases = React.useRef<Record<string, HTMLCanvasElement | null>>({});
  const ttRef = React.useRef<HTMLDivElement | null>(null);
  const setCanvas = (id: string) => (el: HTMLCanvasElement | null) => {
    canvases.current[id] = el;
  };

  // Live IST clock
  React.useEffect(() => {
    const p = (n: number) => String(n).padStart(2, "0");
    const tick = () => {
      const now = new Date();
      const ist = new Date(now.getTime() + 5.5 * 3600 * 1000);
      setClock(`${p(ist.getUTCHours())}:${p(ist.getUTCMinutes())}:${p(ist.getUTCSeconds())} IST`);
    };
    tick();
    const t = window.setInterval(tick, 1000);
    return () => window.clearInterval(t);
  }, []);

  // Draw charts on tab switch / applied range / data change / resize
  React.useEffect(() => {
    const q5864 = seriesOf("NSE-5864", Q5864);
    const q2729 = seriesOf("NSE-2729", Q2729_FULL);
    const q48621 = seriesOf("NSE-48621", Q48621);
    const qnfo = seriesOf("NFO-12492", QNFO);
    const qbse = seriesOf("BSE-L1", QBSE);
    const qbfo = seriesOf("BFO-L1", QBFO);

    const drawAllCharts = () => {
      const cs = canvases.current;
      const tt = ttRef.current;

      // Overview: peaks bar
      barChart(cs["c-peaks"], tt, PEAK_LABELS, PEAK_VALUES, PEAK_COLORS);

      // Overview: NSE day overlay
      lineChart(cs["c-nse-day"], tt, LABELS_30, [
        { label: "NSE-5864", data: q5864, color: "#1552D4", fill: "rgba(21,82,212,.08)", w: 2 },
        { label: "NSE-48621", data: q48621, color: "#0891B2", fill: "rgba(8,145,178,.08)", w: 2 },
        { label: "NSE-2729", data: q2729, color: "#DC2626", fill: "rgba(220,38,38,.08)", w: 2, dots: true },
      ]);

      // Queue tab: individual CTCLs (filtered by the applied time range)
      const [lo, hi] = rangeIndices(LABELS_30, applied.from, applied.to);
      const ql = LABELS_30.slice(lo, hi + 1);
      const cut = (d: (number | null)[]) => sliceSeries(d, lo, hi, LABELS_30.length);
      lineChart(cs["c-q5864"], tt, ql, [{ label: "NSE-5864", data: cut(q5864), color: "#1552D4", fill: "rgba(21,82,212,.1)", w: 2 }]);
      lineChart(cs["c-q2729"], tt, ql, [{ label: "NSE-2729", data: cut(q2729), color: "#DC2626", fill: "rgba(220,38,38,.1)", w: 2, dots: true }], { maxV: 6000 });
      lineChart(cs["c-q48621"], tt, ql, [{ label: "NSE-48621", data: cut(q48621), color: "#2563EB", fill: "rgba(37,99,235,.1)", w: 2 }]);
      lineChart(cs["c-qnfo"], tt, ql, [{ label: "NFO-12492", data: cut(qnfo), color: "#0891B2", fill: "rgba(8,145,178,.1)", w: 2 }]);
      lineChart(cs["c-qbse"], tt, ql, [{ label: "BSE", data: cut(qbse), color: "#7C3AED", fill: "rgba(124,58,237,.1)", w: 2 }]);
      lineChart(cs["c-qbfo"], tt, ql, [{ label: "BFO", data: cut(qbfo), color: "#C2410C", fill: "rgba(194,65,12,.1)", w: 2 }]);

      // Window zooms
      lineChart(cs["c-win-open-nse2"], tt, WO_LABELS,
        [{ label: "NSE-2729", data: WO_NSE2, color: "#DC2626", fill: "rgba(220,38,38,.1)", w: 2.5, dots: true }], { maxV: 6000 });
      lineChart(cs["c-win-open-nse1"], tt, WO_LABELS, [
        { label: "NSE-48621", data: WO_NSE1, color: "#1552D4", fill: "rgba(21,82,212,.1)", w: 2 },
        { label: "BSE", data: WO_BSE, color: "#7C3AED", fill: "rgba(124,58,237,.1)", w: 2 },
      ]);
      lineChart(cs["c-win-close-nse1"], tt, WC_LABELS,
        [{ label: "NSE-5864", data: WC_NSE5, color: "#D97706", fill: "rgba(217,119,6,.1)", w: 2.5 }], { maxV: 1400 });
      lineChart(cs["c-win-close-mix"], tt, WC_LABELS, [
        { label: "NSE-48621", data: WC_48621, color: "#1552D4", fill: "rgba(21,82,212,.1)", w: 2 },
        { label: "BSE", data: WC_BSE, color: "#7C3AED", fill: "rgba(124,58,237,.1)", w: 2 },
      ]);
    };

    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(drawAllCharts);
    });

    let rz: number | undefined;
    const onResize = () => {
      window.clearTimeout(rz);
      rz = window.setTimeout(drawAllCharts, 150);
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.clearTimeout(rz);
      window.removeEventListener("resize", onResize);
    };
  }, [tab, applied, seriesOf]);

  const pickPreset = (i: number) => {
    setPreset(i);
    setTrFrom(PRESETS[i].from);
    setTrTo(PRESETS[i].to);
  };

  const lineTable = (rows: CtclLine[], roleHead: string) => (
    <table className="dtable">
      <thead><tr><th>CTCL ID</th><th>{roleHead}</th><th>Samples</th><th>Status</th></tr></thead>
      <tbody>
        {rows.map((l) => (
          <tr key={l.id}>
            <td className="mono ctcl-id">{l.id}</td>
            <td>{l.role}</td>
            <td>{l.samples == null ? "—" : l.samples.toLocaleString()}</td>
            <td><span className={`badge ${STATUS_BADGE[l.status] || "b-gray"}`}>{l.status}</span></td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="page page-fade trading-ctcl">
      <div className="sn-breadcrumb">
        <a className="sn-link">Home</a><span className="sn-bc-sep">›</span>
        <a className="sn-link">Trading Ops</a><span className="sn-bc-sep">›</span>
        <span>CTCL Monitor</span>
      </div>

      <div className="sn-form-header">
        <div className="sn-form-title-row">
          <span className="sn-rec-number">TRADING OPS</span>
          <span className="tb-pill warn"><span className="tb-pulse" />NSE-2729 Truncated</span>
          <span className="tb-pill ok"><span className="tb-pulse" />4 Segments Active</span>
        </div>
        <div className="sn-form-title-meta">
          <div>
            <h1>CTCL Data Monitor</h1>
            <div className="sn-form-sub">Finspot Technology Solutions — Noren OMS Infrastructure</div>
          </div>
          <div className="sn-form-actions">
            <span className="tc-clock">{clock}</span>
          </div>
        </div>
      </div>

      {/* Sub-nav */}
      <nav className="subnav">
        {NAV.map((t) => (
          <button key={t.id} className={`snav${tab === t.id ? " active" : ""}`} onClick={() => setTab(t.id)}>
            {t.icon} {t.label} {t.count !== null && <span className="snav-cnt">{t.count}</span>}
          </button>
        ))}
      </nav>

      <main className="tc-body">
        {/* ═══ OVERVIEW ═══ */}
        {tab === "overview" && (
          <section className="panel active" id="p-overview">
            <div className="abar amber">
              ⚠ <span><strong>NSE-2729 data truncated:</strong> Queue log stops at 09:15:53 (only 8,556 samples). Pre-market peak 5,538 — 40% higher than 2025 (3,955). Investigate adapter queue logging process for full-day coverage.</span>
            </div>

            <div className="slbl">Platform Overview — Today</div>
            <div className="krow">
              <div className="kpi ka-blue">
                <div className="kpi-lbl">CTCL Lines</div>
                <div className="kpi-val">6<span className="kpi-unit">active</span></div>
                <div className="kpi-sub">NSE×2 · NFO×2 · BSE · BFO</div>
              </div>
              <div className="kpi ka-teal">
                <div className="kpi-lbl">Broker Clients</div>
                <div className="kpi-val">18</div>
                <div className="kpi-sub">NSE/BSE/NFO/BFO segments</div>
              </div>
              <div className="kpi ka-red">
                <div className="kpi-lbl">NSE-2729 Peak</div>
                <div className="kpi-val">5,538</div>
                <div className="kpi-sub">09:15:12 · Pre-market</div>
              </div>
              <div className="kpi ka-amber">
                <div className="kpi-lbl">NSE-5864 Peak</div>
                <div className="kpi-val">1,114</div>
                <div className="kpi-sub">15:20 close window</div>
              </div>
              <div className="kpi ka-orange">
                <div className="kpi-lbl">NSE-48621 Peak</div>
                <div className="kpi-val">1,071</div>
                <div className="kpi-sub">09:00 · drained 15 min</div>
              </div>
              <div className="kpi ka-purple">
                <div className="kpi-lbl">BSE Peak</div>
                <div className="kpi-val">1,222</div>
                <div className="kpi-sub">09:15 market open rush</div>
              </div>
              <div className="kpi ka-teal">
                <div className="kpi-lbl">NFO-12492 Peak</div>
                <div className="kpi-val">507</div>
                <div className="kpi-sub">AMO line · normal</div>
              </div>
              <div className="kpi ka-green">
                <div className="kpi-lbl">NFO-57507 Peak</div>
                <div className="kpi-val">507</div>
                <div className="kpi-sub">Line-2 · AMO</div>
              </div>
            </div>

            <div className="g73">
              <div>
                <div className="slbl">All-CTCL Queue Peaks — Day View</div>
                <div className="card">
                  <div className="ch"><div><div className="ct">Queue Peak Comparison by CTCL</div><div className="cs">Peak queue depth per adapter line</div></div><span className="badge b-amber">NSE-2729 ⚠</span></div>
                  <div className="cw"><canvas ref={setCanvas("c-peaks")} height={200} /></div>
                </div>
                <div className="card">
                  <div className="ch"><div><div className="ct">NSE Adapter Lines — Intraday Queue (09:00–15:30)</div><div className="cs">NSE-5864 vs NSE-48621 vs NSE-2729</div></div></div>
                  <div className="cw"><canvas ref={setCanvas("c-nse-day")} height={180} /></div>
                </div>
              </div>
              <div>
                <div className="slbl">Segment Health</div>
                <div className="win-grid" style={{ gridTemplateColumns: "1fr" }}>
                  <div className="win-card">
                    <div className="win-head"><span className="win-title">NSE</span><span className="badge b-amber">Monitor</span></div>
                    <div className="win-body">
                      <div className="win-stat-row"><span className="win-stat-lbl">Line-1 (5864) Status</span><span className="win-stat-val ok">FULL DAY ✓</span></div>
                      <div className="win-stat-row"><span className="win-stat-lbl">Line-2 (2729) Status</span><span className="win-stat-val alert">TRUNCATED ⚠</span></div>
                      <div className="win-stat-row"><span className="win-stat-lbl">Open Peak (2729)</span><span className="win-stat-val alert">5,538</span></div>
                      <div className="win-stat-row"><span className="win-stat-lbl">Close Peak (5864)</span><span className="win-stat-val warn">1,114</span></div>
                    </div>
                  </div>
                  <div className="win-card">
                    <div className="win-head"><span className="win-title">NFO</span><span className="badge b-green">Normal</span></div>
                    <div className="win-body">
                      <div className="win-stat-row"><span className="win-stat-lbl">Line-1 (13424) Status</span><span className="win-stat-val warn">Flash only (09:15)</span></div>
                      <div className="win-stat-row"><span className="win-stat-lbl">Line-2 (12492/57507)</span><span className="win-stat-val ok">Normal ✓</span></div>
                      <div className="win-stat-row"><span className="win-stat-lbl">AMO Peak (57507)</span><span className="win-stat-val ok">507</span></div>
                    </div>
                  </div>
                  <div className="win-card">
                    <div className="win-head"><span className="win-title">BSE</span><span className="badge b-green">Normal</span></div>
                    <div className="win-body">
                      <div className="win-stat-row"><span className="win-stat-lbl">Open Peak</span><span className="win-stat-val warn">1,222</span></div>
                      <div className="win-stat-row"><span className="win-stat-lbl">Day Mean</span><span className="win-stat-val ok">~380</span></div>
                      <div className="win-stat-row"><span className="win-stat-lbl">Samples</span><span className="win-stat-val ok">99,219</span></div>
                    </div>
                  </div>
                  <div className="win-card">
                    <div className="win-head"><span className="win-title">BFO</span><span className="badge b-green">Normal</span></div>
                    <div className="win-body">
                      <div className="win-stat-row"><span className="win-stat-lbl">Status</span><span className="win-stat-val ok">Active ✓</span></div>
                      <div className="win-stat-row"><span className="win-stat-lbl">Open Peak</span><span className="win-stat-val ok">~420</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ═══ QUEUE SIZE ═══ */}
        {tab === "queue" && (
          <section className="panel active" id="p-queue">
            <div className="abar blue">
              ℹ <span>Select a CTCL line to view its full queue depth profile. Use the custom time range selector to zoom into specific trading windows (market open 09:10–09:20 · square-off 15:15–15:30).</span>
            </div>

            {/* Time range controls */}
            <div className="card mb0" style={{ marginBottom: 14 }}>
              <div className="trange">
                <label>From</label>
                <input type="time" id="tr-from" value={trFrom} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTrFrom(e.target.value)} />
                <label>To</label>
                <input type="time" id="tr-to" value={trTo} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTrTo(e.target.value)} />
                {PRESETS.map((p, i) => (
                  <button key={p.label} className={`preset-btn${preset === i ? " active" : ""}`} onClick={() => pickPreset(i)}>
                    {p.label}
                  </button>
                ))}
                <button className="apply-btn" onClick={() => setApplied({ from: trFrom, to: trTo })}>Apply</button>
              </div>
            </div>

            <div className="qrow">
              <div className="ctcl-card">
                <div className="ctcl-card-head">
                  <div>
                    <div className="ctcl-card-title">NSE-5864 <span className="badge b-blue" style={{ marginLeft: 6 }}>Line-1</span></div>
                    <div className="ctcl-meta">Full day · 29,901 samples · Primary NSE adapter</div>
                  </div>
                  <span className="badge b-amber">Close spike 1,114</span>
                </div>
                <div className="ctcl-stats">
                  <div className="cstat"><div className="cstat-val">720</div><div className="cstat-lbl">Open Peak</div></div>
                  <div className="cstat"><div className="cstat-val">1,114</div><div className="cstat-lbl">Close Peak</div></div>
                  <div className="cstat"><div className="cstat-val">~440</div><div className="cstat-lbl">Day Mean</div></div>
                </div>
                <div className="chart-canvas-wrap"><canvas ref={setCanvas("c-q5864")} height={160} /></div>
              </div>

              <div className="ctcl-card">
                <div className="ctcl-card-head">
                  <div>
                    <div className="ctcl-card-title">NSE-2729 <span className="badge b-red" style={{ marginLeft: 6 }}>Line-2 ⚠</span></div>
                    <div className="ctcl-meta">Pre-market only · 8,556 samples · Truncated 09:15:53</div>
                  </div>
                  <span className="badge b-red">5,538 peak ⚠</span>
                </div>
                <div className="ctcl-stats">
                  <div className="cstat"><div className="cstat-val" style={{ color: "var(--red)" }}>5,538</div><div className="cstat-lbl">Max Peak</div></div>
                  <div className="cstat"><div className="cstat-val">2,991</div><div className="cstat-lbl">09:00 Start</div></div>
                  <div className="cstat"><div className="cstat-val" style={{ color: "var(--amber)" }}>09:15:53</div><div className="cstat-lbl">Data Ends</div></div>
                </div>
                <div className="chart-canvas-wrap"><canvas ref={setCanvas("c-q2729")} height={160} /></div>
              </div>

              <div className="ctcl-card">
                <div className="ctcl-card-head">
                  <div>
                    <div className="ctcl-card-title">NSE-48621 <span className="badge b-blue" style={{ marginLeft: 6 }}>Line-3</span></div>
                    <div className="ctcl-meta">Full day · 1,347 samples · AMO + regular</div>
                  </div>
                  <span className="badge b-amber">Peak 1,071 at open</span>
                </div>
                <div className="ctcl-stats">
                  <div className="cstat"><div className="cstat-val" style={{ color: "var(--amber)" }}>1,071</div><div className="cstat-lbl">Open Peak</div></div>
                  <div className="cstat"><div className="cstat-val">443</div><div className="cstat-lbl">Day Mean</div></div>
                  <div className="cstat"><div className="cstat-val" style={{ color: "var(--green)" }}>~15min</div><div className="cstat-lbl">Drain Time</div></div>
                </div>
                <div className="chart-canvas-wrap"><canvas ref={setCanvas("c-q48621")} height={160} /></div>
              </div>

              <div className="ctcl-card">
                <div className="ctcl-card-head">
                  <div>
                    <div className="ctcl-card-title">NFO-12492 / 57507 <span className="badge b-teal" style={{ marginLeft: 6 }}>AMO</span></div>
                    <div className="ctcl-meta">NFO Line-2 · Full day · 266 samples</div>
                  </div>
                  <span className="badge b-green">Normal</span>
                </div>
                <div className="ctcl-stats">
                  <div className="cstat"><div className="cstat-val" style={{ color: "var(--green)" }}>507</div><div className="cstat-lbl">Peak</div></div>
                  <div className="cstat"><div className="cstat-val">~180</div><div className="cstat-lbl">Mean</div></div>
                  <div className="cstat"><div className="cstat-val" style={{ color: "var(--green)" }}>OK</div><div className="cstat-lbl">Status</div></div>
                </div>
                <div className="chart-canvas-wrap"><canvas ref={setCanvas("c-qnfo")} height={160} /></div>
              </div>

              <div className="ctcl-card">
                <div className="ctcl-card-head">
                  <div>
                    <div className="ctcl-card-title">BSE <span className="badge b-purple" style={{ marginLeft: 6 }}>Line-1</span></div>
                    <div className="ctcl-meta">Full day · 99,219 samples (post-fix)</div>
                  </div>
                  <span className="badge b-green">Normal</span>
                </div>
                <div className="ctcl-stats">
                  <div className="cstat"><div className="cstat-val" style={{ color: "var(--amber)" }}>1,222</div><div className="cstat-lbl">Open Peak</div></div>
                  <div className="cstat"><div className="cstat-val">~380</div><div className="cstat-lbl">Day Mean</div></div>
                  <div className="cstat"><div className="cstat-val">99,219</div><div className="cstat-lbl">Samples</div></div>
                </div>
                <div className="chart-canvas-wrap"><canvas ref={setCanvas("c-qbse")} height={160} /></div>
              </div>

              <div className="ctcl-card">
                <div className="ctcl-card-head">
                  <div>
                    <div className="ctcl-card-title">BFO <span className="badge b-orange" style={{ marginLeft: 6 }}>Line-1</span></div>
                    <div className="ctcl-meta">Commodity segment · Full day</div>
                  </div>
                  <span className="badge b-green">Normal</span>
                </div>
                <div className="ctcl-stats">
                  <div className="cstat"><div className="cstat-val" style={{ color: "var(--green)" }}>420</div><div className="cstat-lbl">Peak</div></div>
                  <div className="cstat"><div className="cstat-val">~210</div><div className="cstat-lbl">Mean</div></div>
                  <div className="cstat"><div className="cstat-val" style={{ color: "var(--green)" }}>OK</div><div className="cstat-lbl">Status</div></div>
                </div>
                <div className="chart-canvas-wrap"><canvas ref={setCanvas("c-qbfo")} height={160} /></div>
              </div>
            </div>
          </section>
        )}

        {/* ═══ TRADING WINDOWS ═══ */}
        {tab === "windows" && (
          <section className="panel active" id="p-windows">
            <div className="slbl">Critical Trading Windows — Queue Behaviour</div>

            <div className="win-grid">
              {/* Open window */}
              <div className="win-card">
                <div className="win-head" style={{ background: "var(--red-lt)" }}>
                  <span className="win-title" style={{ color: "var(--red)" }}>🔔 Market Open · 09:10–09:20</span>
                  <span className="badge b-red">High Risk</span>
                </div>
                <div className="win-body">
                  <div className="win-stat-row"><span className="win-stat-lbl">NSE-2729 Peak</span><span className="win-stat-val alert">5,538</span></div>
                  <div className="win-stat-row"><span className="win-stat-lbl">NSE-5864 Queue</span><span className="win-stat-val warn">720</span></div>
                  <div className="win-stat-row"><span className="win-stat-lbl">NSE-48621 Queue</span><span className="win-stat-val warn">1,071</span></div>
                  <div className="win-stat-row"><span className="win-stat-lbl">BSE Queue</span><span className="win-stat-val warn">1,222</span></div>
                  <div className="win-stat-row"><span className="win-stat-lbl">NFO Queue</span><span className="win-stat-val ok">~280</span></div>
                  <div className="win-stat-row"><span className="win-stat-lbl">BFO Queue</span><span className="win-stat-val ok">~190</span></div>
                </div>
              </div>

              {/* Pre-market */}
              <div className="win-card">
                <div className="win-head" style={{ background: "var(--amber-lt)" }}>
                  <span className="win-title" style={{ color: "var(--amber)" }}>⏰ Pre-Market · 09:00–09:15</span>
                  <span className="badge b-amber">Monitor</span>
                </div>
                <div className="win-body">
                  <div className="win-stat-row"><span className="win-stat-lbl">NSE-2729 Start</span><span className="win-stat-val warn">2,991</span></div>
                  <div className="win-stat-row"><span className="win-stat-lbl">NSE-2729 Peak @09:15</span><span className="win-stat-val alert">5,538</span></div>
                  <div className="win-stat-row"><span className="win-stat-lbl">YoY Change</span><span className="win-stat-val alert">+40% vs 2025</span></div>
                  <div className="win-stat-row"><span className="win-stat-lbl">NSE-48621 Pre-mkt</span><span className="win-stat-val warn">823</span></div>
                  <div className="win-stat-row"><span className="win-stat-lbl">BSE Pre-mkt</span><span className="win-stat-val warn">~800</span></div>
                  <div className="win-stat-row"><span className="win-stat-lbl">NFO Pre-mkt</span><span className="win-stat-val ok">~150</span></div>
                </div>
              </div>

              {/* Square-off */}
              <div className="win-card">
                <div className="win-head" style={{ background: "var(--amber-lt)" }}>
                  <span className="win-title" style={{ color: "var(--amber)" }}>📉 Square-Off · 15:15–15:30</span>
                  <span className="badge b-amber">Watch</span>
                </div>
                <div className="win-body">
                  <div className="win-stat-row"><span className="win-stat-lbl">NSE-5864 Peak</span><span className="win-stat-val alert">1,114</span></div>
                  <div className="win-stat-row"><span className="win-stat-lbl">NSE-48621 Close</span><span className="win-stat-val warn">660</span></div>
                  <div className="win-stat-row"><span className="win-stat-lbl">BSE Close</span><span className="win-stat-val warn">~750</span></div>
                  <div className="win-stat-row"><span className="win-stat-lbl">NFO Close</span><span className="win-stat-val ok">~200</span></div>
                  <div className="win-stat-row"><span className="win-stat-lbl">Alert threshold</span><span className="win-stat-val">NSE-5864: 1,000</span></div>
                </div>
              </div>

              {/* Mid-day */}
              <div className="win-card">
                <div className="win-head" style={{ background: "var(--green-lt)" }}>
                  <span className="win-title" style={{ color: "var(--green)" }}>✅ Mid-Day · 11:00–14:00</span>
                  <span className="badge b-green">Stable</span>
                </div>
                <div className="win-body">
                  <div className="win-stat-row"><span className="win-stat-lbl">NSE-5864 Mean</span><span className="win-stat-val ok">~430</span></div>
                  <div className="win-stat-row"><span className="win-stat-lbl">NSE-48621 Mean</span><span className="win-stat-val ok">418–421</span></div>
                  <div className="win-stat-row"><span className="win-stat-lbl">BSE Mean</span><span className="win-stat-val ok">~340</span></div>
                  <div className="win-stat-row"><span className="win-stat-lbl">NFO Mean</span><span className="win-stat-val ok">~120</span></div>
                  <div className="win-stat-row"><span className="win-stat-lbl">All segments</span><span className="win-stat-val ok">Normal ✓</span></div>
                </div>
              </div>
            </div>

            <div className="slbl mt14">Window Zoom — Open (09:10–09:20)</div>
            <div className="g2">
              <div className="card">
                <div className="ch"><div><div className="ct">NSE-2729 Queue — Open Window 09:10–09:20</div><div className="cs">Pre-market build-up &amp; AMO flush</div></div><span className="badge b-red">5,538 peak</span></div>
                <div className="cw"><canvas ref={setCanvas("c-win-open-nse2")} height={180} /></div>
              </div>
              <div className="card">
                <div className="ch"><div><div className="ct">NSE-48621 + BSE Queue — Open Window</div></div></div>
                <div className="cw"><canvas ref={setCanvas("c-win-open-nse1")} height={180} /></div>
              </div>
            </div>

            <div className="slbl mt14">Window Zoom — Square-Off (15:15–15:30)</div>
            <div className="g2">
              <div className="card">
                <div className="ch"><div><div className="ct">NSE-5864 — Square-Off Window 15:15–15:30</div><div className="cs">Close-side pressure peak 1,114</div></div><span className="badge b-amber">1,114 ⚠</span></div>
                <div className="cw"><canvas ref={setCanvas("c-win-close-nse1")} height={180} /></div>
              </div>
              <div className="card">
                <div className="ch"><div><div className="ct">NSE-48621 + BSE — Square-Off Window</div></div></div>
                <div className="cw"><canvas ref={setCanvas("c-win-close-mix")} height={180} /></div>
              </div>
            </div>
          </section>
        )}

        {/* ═══ CTCL MAP ═══ */}
        {tab === "ctclmap" && (
          <section className="panel active" id="p-ctclmap">
            <div className="slbl">CTCL / Adapter → Broker Mapping (18 Clients)</div>
            <div className="abar blue">ℹ <span>CTCL IDs are per-segment per-line. Each broker accesses Noren OMS through specific CTCL codes assigned per exchange segment (NSE/NFO/BSE/BFO). Status reflects last polling cycle.</span></div>

            <div className="card">
              <div style={{ overflowX: "auto" }}>
                <table className="ctcl-table" id="ctcl-matrix">
                  <thead>
                    <tr>
                      <th>Broker</th>
                      <th>CTCL (NSE-L1)</th>
                      <th>CTCL (NSE-L2)</th>
                      <th>CTCL (NFO-L1)</th>
                      <th>CTCL (NFO-L2)</th>
                      <th>CTCL (BSE)</th>
                      <th>CTCL (BFO)</th>
                      <th className="center">NSE</th>
                      <th className="center">NFO</th>
                      <th className="center">BSE</th>
                      <th className="center">BFO</th>
                      <th>Overall</th>
                    </tr>
                  </thead>
                  <tbody>
                    {brokers.map((b) => {
                      const segs = [b.nse, b.nfo, b.bse, b.bfo];
                      const fail = segs.filter((s) => s === 0).length;
                      const ok = segs.filter((s) => s === 1).length;
                      const sc = (v: number) => (
                        <div className="sc-wrap"><div className={`sc ${v ? "ok" : "fail"}`}>{v ? "✓" : "✗"}</div></div>
                      );
                      const ctclCell = (id: string | undefined) =>
                        !id || id === "—" ? <span style={{ color: "var(--ink4)" }}>—</span> : <span className="ctcl-id">{id}</span>;
                      return (
                        <tr key={b.n}>
                          <td><div className="broker-name">{b.n}</div></td>
                          <td>{ctclCell(b.ctcls.n1)}</td>
                          <td>{ctclCell(b.ctcls.n2)}</td>
                          <td>{ctclCell(b.ctcls.nf1)}</td>
                          <td>{ctclCell(b.ctcls.nf2)}</td>
                          <td>{ctclCell(b.ctcls.bse)}</td>
                          <td>{ctclCell(b.ctcls.bfo)}</td>
                          <td>{sc(b.nse)}</td>
                          <td>{sc(b.nfo)}</td>
                          <td>{sc(b.bse)}</td>
                          <td>{sc(b.bfo)}</td>
                          <td>
                            {fail > 0
                              ? <span className="ov-tag ov-fail">⚠ {fail} seg(s)</span>
                              : <span className="ov-tag ov-ok">✓ {ok}/4</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="slbl mt14">CTCL Line Identifiers</div>
            <div className="g3">
              <div className="card">
                <div className="ch"><div><div className="ct">NSE Lines</div></div></div>
                <div className="cb">{lineTable(lines.filter((l) => l.segment === "NSE"), "Role")}</div>
              </div>
              <div className="card">
                <div className="ch"><div><div className="ct">NFO Lines</div></div></div>
                <div className="cb">{lineTable(lines.filter((l) => l.segment === "NFO"), "Role")}</div>
              </div>
              <div className="card">
                <div className="ch"><div><div className="ct">BSE / BFO Lines</div></div></div>
                <div className="cb">{lineTable(lines.filter((l) => l.segment === "BSE" || l.segment === "BFO"), "Segment")}</div>
              </div>
            </div>
          </section>
        )}

        {/* ═══ ALERTS ═══ */}
        {tab === "alerts" && (
          <section className="panel active" id="p-alerts">
            <div className="slbl">Active Incidents</div>

            <div className="abar red">
              🚨 <span><strong>P1 — NSE-2729 Data Truncation:</strong> Queue log stops at 09:15:53. Pre-market peak 5,538 (40% above 2025 baseline 3,955). Possible causes: adapter queue monitoring process died, file rotation issue on second CTCL, or AMO flush caused OOM crash. Action: check if NSE-2729 adapter queue logging process is running post market open on the Noren server.</span>
            </div>
            <div className="abar amber">
              ⚠ <span><strong>P2 — NSE-5864 Close Spike:</strong> Queue hits 1,114 at 15:20–15:30 (above alert threshold 1,000). Morning peak normal (720). Monitor close window daily. Consider alert on &gt;1,000 for 3 consecutive samples.</span>
            </div>
            <div className="abar amber">
              ⚠ <span><strong>P2 — BSE Pipeline Break (historical):</strong> BSE queue data previously dropped from 99,219 to 163 samples due to MySQL max_allowed_packet overflow in executemany batch. Fix deployed (batch chunks of 1,000 rows). Verify fix is active on both production servers.</span>
            </div>
            <div className="abar blue">
              ℹ <span><strong>Info — NSE-48621 Open Surge:</strong> Peak 1,071 at 09:00, drains in ~15 min. Expected behaviour. No action required. Alert threshold recommended at 1,200 for anomaly detection.</span>
            </div>

            <div className="slbl mt14">Recommended Alert Thresholds</div>
            <div className="card">
              <table className="dtable">
                <thead><tr><th>CTCL</th><th>Metric</th><th>Warn (P2)</th><th>Critical (P1)</th><th>Window</th><th>Action</th></tr></thead>
                <tbody>
                  <tr><td className="mono ctcl-id">NSE-2729</td><td>Queue depth</td><td>&gt;4,000</td><td>&gt;5,000</td><td>09:00–09:16</td><td>Page on-call, check adapter process</td></tr>
                  <tr><td className="mono ctcl-id">NSE-2729</td><td>Data present</td><td>—</td><td>No data after 09:17</td><td>Continuous</td><td>P1 escalate to Hoysala</td></tr>
                  <tr><td className="mono ctcl-id">NSE-5864</td><td>Queue depth</td><td>&gt;1,000</td><td>&gt;1,500</td><td>15:15–15:30</td><td>Alert, log for review</td></tr>
                  <tr><td className="mono ctcl-id">NSE-48621</td><td>Queue depth</td><td>&gt;900</td><td>&gt;1,200</td><td>09:00–09:30</td><td>Investigate batch orders</td></tr>
                  <tr><td className="mono ctcl-id">BSE-L1</td><td>Samples/hr</td><td>&lt;5,000</td><td>&lt;500</td><td>Continuous</td><td>Check MySQL pipeline / batch insert</td></tr>
                  <tr><td className="mono ctcl-id">NFO-13424</td><td>Data window</td><td>—</td><td>&lt;5 min data</td><td>09:15</td><td>Investigate adapter logging</td></tr>
                  <tr><td className="mono ctcl-id">All CTCLs</td><td>YoY queue change</td><td>&gt;20% higher</td><td>&gt;40% higher</td><td>Open window</td><td>Capacity review</td></tr>
                </tbody>
              </table>
            </div>

            <div className="slbl mt14">Broker Impact — NSE-2729 Truncation</div>
            <div className="card">
              <div className="cb">
                <div className="flex-wrap" id="broker-impact">
                  {brokers.map((b) => (
                    <span key={b.n} className="badge b-red">{b.n}</span>
                  ))}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--ink3)", marginTop: 10 }}>All 18 broker clients route NSE orders through the NSE-2729 / NSE-5864 CTCL lines. Queue truncation means post 09:15 queue depth is unmonitored for these clients on Line-2.</div>
              </div>
            </div>
          </section>
        )}
      </main>

      <div className="tc-tooltip" ref={ttRef} />
    </div>
  );
}
