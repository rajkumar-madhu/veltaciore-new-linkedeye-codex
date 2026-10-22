// Real metric charts for device and VM pages: a time-range picker (presets +
// custom start/end) and one chart per metric group, drawn from the series the
// API reads from Prometheus. When Prometheus is not connected the panel says
// so instead of drawing placeholder lines.
import React from "react";
import { useDeviceMetrics, useVmMetrics, type MetricSeries, type MetricsResponse } from "@/api/hooks";
import { MAX_RANGE_DAYS, PRESETS, useTimeRange } from "@/store/timeRange";
import { Empty, Panel } from "@/components/ld";

export const COLORS = ["#2f6bff", "#16a34a", "#f5a524", "#7c4dff", "#e5383b", "#0ea5e9"];

// Fixed colours for well-known series so a CPU mode or memory kind looks the
// same on every chart (Netdata convention: idle green, user blue, system orange).
const SERIES_COLOR: Record<string, string> = {
  cpu_user: "#2f6bff", cpu_system: "#f97316", cpu_interrupt: "#7c4dff", cpu_dpc: "#eab308",
  cpu_iowait: "#7c4dff", cpu_irq: "#eab308", cpu_idle: "#86efac",
  mem_used_gb: "#2f6bff", mem_cached_gb: "#f97316", mem_available_gb: "#16a34a", mem_total_gb: "#98a2b3",
  net_rx: "#2f6bff", net_tx: "#f97316", disk_read: "#16a34a", disk_write: "#7c4dff",
};
const colorOf = (s: MetricSeries, i: number) => SERIES_COLOR[s.key] ?? COLORS[i % COLORS.length];

export const GROUP_TITLE: Record<string, string> = {
  cpu: "CPU Utilization",
  memory: "Memory Usage",
  memory_gb: "Memory Usage",
  disk: "Disk Usage",
  disk_io: "Disk I/O",
  network: "Network Traffic",
  load: "Load",
  errors: "Interface Errors",
  ports: "Ports Up",
  virtualization: "Virtualization",
  state: "Power State",
  uptime: "Uptime",
};
const CHART_NOTE: Record<string, string> = { disk_io: "(all disks)", network: "(all interfaces)" };
const GROUP_ORDER = ["cpu", "memory_gb", "memory", "disk", "disk_io", "network", "virtualization", "load", "errors", "ports", "state", "uptime"];

// ── helpers ─────────────────────────────────────────────────────────────────
const toLocalInput = (ms: number) => {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function fmtValue(v: number, unit: string) {
  const n = Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2);
  if (unit === "%") return `${n}%`;
  if (unit === "count") return n;
  return `${n} ${unit}`;
}

/** Compact axis label: 1200 → "1.2k"; percent keeps its sign. */
function fmtAxis(v: number, unit: string) {
  const n = Math.abs(v) >= 1e6 ? `${+(v / 1e6).toFixed(1)}M` : Math.abs(v) >= 1e3 ? `${+(v / 1e3).toFixed(1)}k` : `${+v.toFixed(v < 10 ? 1 : 0)}`;
  return unit === "%" ? `${n}%` : n;
}

function fmtTick(ts: number, spanSec: number) {
  const d = new Date(ts * 1000);
  if (spanSec <= 2 * 86400) return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function niceMax(v: number, unit: string) {
  if (unit === "%") return v > 80 ? 100 : Math.max(10, Math.ceil(v / 10) * 10 + 10);
  if (v <= 0) return 1;
  const mag = 10 ** Math.floor(Math.log10(v));
  return Math.ceil((v * 1.15) / mag) * mag;
}

// ── time range picker ───────────────────────────────────────────────────────
const fmtWhen = (ms: number) => new Date(ms).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

export function rangeLabel(preset: string, from: number | null, to: number | null) {
  return preset === "custom" && from != null && to != null
    ? `${fmtWhen(from)} – ${fmtWhen(to)}`
    : PRESETS.find((p) => p.id === preset)?.label ?? "";
}

/** Start/end form shared by both pickers; validates against the API's limits. */
function CustomRangeForm({ id, onDone }: { id: string; onDone: () => void }) {
  const { from, to, setCustom } = useTimeRange();
  const now = Date.now();
  const [start, setStart] = React.useState(toLocalInput(from ?? now - 86400_000));
  const [end, setEnd] = React.useState(toLocalInput(to ?? now));
  const [error, setError] = React.useState("");
  const apply = (e: React.FormEvent) => {
    e.preventDefault();
    const s = new Date(start).getTime();
    const t = new Date(end).getTime();
    if (Number.isNaN(s) || Number.isNaN(t)) return setError("Enter both a start and an end.");
    if (s >= t) return setError("Start must be before end.");
    if (t - s > MAX_RANGE_DAYS * 86400_000) return setError(`Range is limited to ${MAX_RANGE_DAYS} days.`);
    if (t > Date.now() + 60_000) return setError("End can't be in the future.");
    setError("");
    setCustom(s, t);
    onDone();
  };
  return (
    <form id={`${id}-custom`} className="ld-card ld-range-custom" onSubmit={apply}>
      <div className="ld-form-field">
        <label htmlFor={`${id}-start`}>Start</label>
        <input id={`${id}-start`} className="ld-input" type="datetime-local" value={start} max={end} onChange={(e) => setStart(e.target.value)} required />
      </div>
      <div className="ld-form-field">
        <label htmlFor={`${id}-end`}>End</label>
        <input id={`${id}-end`} className="ld-input" type="datetime-local" value={end} min={start} max={toLocalInput(Date.now())} onChange={(e) => setEnd(e.target.value)} required />
      </div>
      <button type="submit" className="ld-btn ld-btn-primary">Apply</button>
      {error && <p className="ld-text-crit ld-small" role="alert">{error}</p>}
    </form>
  );
}

export function TimeRangePicker() {
  const { preset, from, to, setPreset } = useTimeRange();
  const [open, setOpen] = React.useState(false);
  const id = React.useId();
  return (
    <div className="ld-range">
      <div className="ld-range-presets" role="group" aria-label="Time range">
        {PRESETS.map((p) => (
          <button key={p.id} type="button" className={`ld-btn ld-btn-sm${preset === p.id ? " ld-btn-primary" : ""}`} aria-pressed={preset === p.id} onClick={() => { setPreset(p.id); setOpen(false); }}>
            {p.id}
          </button>
        ))}
        <button type="button" className={`ld-btn ld-btn-sm${preset === "custom" ? " ld-btn-primary" : ""}`} aria-expanded={open} aria-controls={`${id}-custom`} onClick={() => setOpen(!open)}>
          <i className="fa-solid fa-calendar-days" aria-hidden="true" /> Custom
        </button>
      </div>
      <span className="ld-muted ld-small" aria-live="polite">
        {rangeLabel(preset, from, to)}
        {preset !== "custom" && <span className="ld-live"><span className="ld-pill-dot" /> Live · refresh 30s</span>}
      </span>
      {open && <CustomRangeForm id={id} onDone={() => setOpen(false)} />}
    </div>
  );
}

/** Compact header control: "Last 1 hour ▾" with presets and a custom range. */
export function RangeSelect() {
  const { preset, from, to, setPreset } = useTimeRange();
  const [open, setOpen] = React.useState(false);
  const [custom, setCustomOpen] = React.useState(false);
  const id = React.useId();
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) { setOpen(false); setCustomOpen(false); } };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); setCustomOpen(false); } };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);
  return (
    <div className="ld-rangesel" ref={ref}>
      <button type="button" className="ld-btn" aria-haspopup="true" aria-expanded={open} aria-controls={`${id}-menu`} onClick={() => setOpen(!open)}>
        <i className="fa-regular fa-clock" aria-hidden="true" />
        <span className="ld-rangesel-label">{preset === "custom" ? "Custom range" : rangeLabel(preset, from, to)}</span>
        <i className="fa-solid fa-chevron-down ld-small" aria-hidden="true" />
      </button>
      {open && (
        <div id={`${id}-menu`} className="ld-rangesel-menu">
          {PRESETS.map((p) => (
            <button key={p.id} type="button" aria-pressed={preset === p.id} className={preset === p.id ? "on" : ""}
              onClick={() => { setPreset(p.id); setOpen(false); setCustomOpen(false); }}>
              {p.label}{preset === p.id && <i className="fa-solid fa-check" aria-hidden="true" />}
            </button>
          ))}
          <button type="button" aria-expanded={custom} className={preset === "custom" ? "on" : ""} onClick={() => setCustomOpen(!custom)}>
            Custom range…{preset === "custom" && <i className="fa-solid fa-check" aria-hidden="true" />}
          </button>
          {preset === "custom" && from != null && to != null && <span className="ld-muted ld-small ld-rangesel-now">{rangeLabel(preset, from, to)}</span>}
          {custom && <CustomRangeForm id={id} onDone={() => { setOpen(false); setCustomOpen(false); }} />}
        </div>
      )}
    </div>
  );
}

/** "● Live" while a relative range auto-refreshes; on a fixed range, a button back to live. */
export function LiveButton() {
  const { preset, setPreset } = useTimeRange();
  const live = preset !== "custom";
  return (
    <button type="button" className={`ld-btn ld-live-btn${live ? " on" : ""}`} aria-pressed={live}
      title={live ? "Refreshing every 30 seconds" : "Return to the last hour, refreshing live"}
      onClick={() => { if (!live) setPreset("1h"); }}>
      <span className="ld-pill-dot" aria-hidden="true" /> {live ? "Live" : "Go live"}
    </button>
  );
}

// ── chart ───────────────────────────────────────────────────────────────────
/** Stack series on shared timestamps: returns [t, lower, upper] per point. */
function stackSeries(series: MetricSeries[]) {
  const base = new Map<number, number>();
  return series.map((s) =>
    s.points.map(([t, v]) => {
      const lo = base.get(t) ?? 0;
      base.set(t, lo + v);
      return [t, lo, lo + v] as [number, number, number];
    }),
  );
}

export function TimeChart({ series, startSec, endSec, stacked = false, compact = false, legendOnly = [] }: {
  series: MetricSeries[]; startSec: number; endSec: number; stacked?: boolean;
  /** shorter plot and a one-line legend (last values) instead of the last/avg/max table */
  compact?: boolean;
  /** series listed in the legend but not drawn (e.g. CPU idle on a stacked chart) */
  legendOnly?: MetricSeries[];
}) {
  const W = 560, H = compact ? 170 : 210, L = 44, R = 10, T = 20, B = 26;
  const unit = series[0]?.unit ?? "";
  const bands = stacked ? stackSeries(series) : null;
  const all = bands ? bands.flatMap((b) => b.map((p) => p[2])) : series.flatMap((s) => s.points.map((p) => p[1]));
  const yMax = stacked && unit === "%" ? 100 : niceMax(all.length ? Math.max(...all) : 0, unit);
  const span = Math.max(1, endSec - startSec);
  const x = (t: number) => L + ((t - startSec) / span) * (W - L - R);
  const y = (v: number) => H - B - (Math.min(v, yMax) / yMax) * (H - T - B);
  const [hover, setHover] = React.useState<number | null>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);

  const onMove = (e: React.MouseEvent) => {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r) return;
    const t = startSec + ((((e.clientX - r.left) / r.width) * W - L) / (W - L - R)) * span;
    setHover(Math.min(endSec, Math.max(startSec, t)));
  };
  const nearest = (s: MetricSeries, t: number) =>
    s.points.reduce<[number, number] | null>((best, p) => (!best || Math.abs(p[0] - t) < Math.abs(best[0] - t) ? p : best), null);

  const ticks = Array.from({ length: 5 }, (_, i) => startSec + (span * i) / 4);
  const summary = series.map((s) => {
    const vals = s.points.map((p) => p[1]);
    return {
      s,
      last: vals.length ? vals[vals.length - 1] : null,
      avg: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null,
      max: vals.length ? Math.max(...vals) : null,
    };
  });

  return (
    <div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="ld-trend"
        role="img"
        aria-label={summary.map(({ s, last }) => `${s.label} ${last == null ? "no data" : fmtValue(last, s.unit)}`).join(", ")}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1={L} x2={W - R} y1={y(yMax * f)} y2={y(yMax * f)} className="ld-gridline" />
            <text x={L - 6} y={y(yMax * f) + 4} textAnchor="end" className="ld-axis">{fmtAxis(yMax * f, unit)}</text>
          </g>
        ))}
        {unit !== "%" && unit !== "count" && <text x={4} y={11} className="ld-axis">{unit}</text>}
        {ticks.map((t, i) => (
          <text key={t} x={x(t)} y={H - 8} textAnchor={i === 0 ? "start" : i === 4 ? "end" : "middle"} className="ld-axis">{fmtTick(t, span)}</text>
        ))}
        {bands
          ? bands.map((b, i) => (
              <polygon
                key={series[i].key}
                points={[...b.map(([t, , hi]) => `${x(t).toFixed(1)},${y(hi).toFixed(1)}`), ...[...b].reverse().map(([t, lo]) => `${x(t).toFixed(1)},${y(lo).toFixed(1)}`)].join(" ")}
                fill={colorOf(series[i], i)}
                fillOpacity={0.7}
                stroke={colorOf(series[i], i)}
                strokeWidth={0.8}
              />
            ))
          : series.map((s, i) => {
              const line = s.points.map(([t, v]) => `${x(t).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
              const first = s.points[0], last = s.points[s.points.length - 1];
              return (
                <g key={s.key}>
                  {first && last && (
                    <polygon points={`${x(first[0]).toFixed(1)},${y(0)} ${line} ${x(last[0]).toFixed(1)},${y(0)}`} fill={colorOf(s, i)} fillOpacity={compact ? 0.16 : 0.08} />
                  )}
                  <polyline points={line} fill="none" stroke={colorOf(s, i)} strokeWidth={1.8} strokeLinejoin="round" />
                </g>
              );
            })}
        {hover != null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} stroke="var(--border-strong)" strokeDasharray="3 3" />
            {series.map((s, i) => {
              const p = nearest(s, hover);
              if (!p) return null;
              const cy = bands ? y(bands[i].find((b) => b[0] === p[0])?.[2] ?? p[1]) : y(p[1]);
              return <circle key={s.key} cx={x(p[0])} cy={cy} r={3} fill={colorOf(s, i)} />;
            })}
          </g>
        )}
      </svg>
      {hover != null && (
        <div className="ld-chart-tip ld-small">
          <b>{new Date(hover * 1000).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</b>
          {series.map((s, i) => {
            const p = nearest(s, hover);
            return (
              <span key={s.key}><span className="ld-dot" style={{ background: colorOf(s, i) }} /> {s.label} {p ? fmtValue(p[1], s.unit) : "—"}</span>
            );
          })}
        </div>
      )}
      {compact ? (
        <ul className="ld-legend-inline">
          {[...summary, ...legendOnly.map((s) => ({ s, last: s.points.length ? s.points[s.points.length - 1][1] : null }))].map(({ s, last }, i) => (
            <li key={s.key}>
              <span className="ld-dot" style={{ background: i < series.length ? colorOf(s, i) : SERIES_COLOR[s.key] ?? "var(--fg-faint)" }} />
              {s.label} <b>{last == null ? "—" : fmtValue(last, s.unit)}</b>
            </li>
          ))}
        </ul>
      ) : (
      <table className="ld-legend-table">
        <thead><tr><th scope="col">Series</th><th scope="col">Last</th><th scope="col">Avg</th><th scope="col">Max</th></tr></thead>
        <tbody>
          {summary.map(({ s, last, avg, max }, i) => (
            <tr key={s.key}>
              <td><span className="ld-dot" style={{ background: colorOf(s, i) }} /> {s.label}</td>
              <td>{last == null ? "—" : fmtValue(last, s.unit)}</td>
              <td>{avg == null ? "—" : fmtValue(avg, s.unit)}</td>
              <td>{max == null ? "—" : fmtValue(max, s.unit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      )}
    </div>
  );
}

/** Small trend line for a KPI card. */
export function Sparkline({ points, color = COLORS[0], label }: { points: [number, number][]; color?: string; label: string }) {
  const W = 160, H = 34;
  if (points.length < 2) return <svg className="ld-spark" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${label}: no trend data`} />;
  const t0 = points[0][0], t1 = points[points.length - 1][0];
  const vals = points.map((p) => p[1]);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const x = (t: number) => ((t - t0) / Math.max(1, t1 - t0)) * W;
  const y = (v: number) => H - 3 - ((v - lo) / Math.max(1e-9, hi - lo)) * (H - 6);
  const line = points.map(([t, v]) => `${x(t).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg className="ld-spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`${label} trend`}>
      <polygon points={`0,${H} ${line} ${W},${H}`} fill={color} fillOpacity={0.12} />
      <polyline points={line} fill="none" stroke={color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function MetricsBody({ data, isLoading, isError, groups: only, quietWhenOff, compact }: {
  data?: MetricsResponse; isLoading: boolean; isError: boolean; groups?: string[];
  /** Netdata-style cards: short plots, one-line legends, range shown in the card header */
  compact?: boolean;
  /** the page already explains a missing source (e.g. a banner above) */
  quietWhenOff?: boolean;
}) {
  const { preset: rangePreset, from: rangeFrom, to: rangeTo } = useTimeRange();
  if (isLoading) return <div className="ld-card"><Empty>Loading metrics…</Empty></div>;
  if (isError || !data) {
    return <div className="ld-card"><Empty>Metrics service is not reachable from this browser.</Empty></div>;
  }
  if (data.source !== "prometheus") {
    if (quietWhenOff) return null;
    return (
      <div className="ld-card ld-metrics-off" role="status">
        <i className="fa-solid fa-plug-circle-xmark" aria-hidden="true" />
        <div>
          <b>{data.source === "unsupported" ? "No metrics for this device type yet" : "Prometheus is not connected"}</b>
          <p className="ld-muted ld-small">{data.message}</p>
          {data.source === "unavailable" && (
            <p className="ld-muted ld-small">Set PROMETHEUS_URL on the API to your Prometheus (for example fs-le-dev-prometheus) to see live graphs.</p>
          )}
        </div>
      </div>
    );
  }
  const startSec = Date.parse(data.start) / 1000;
  const endSec = Date.parse(data.end) / 1000;
  const present = new Set(data.series.map((s) => s.group));
  const groups = (only ? only.filter((g) => present.has(g)) : [...present]).sort((a, b) => GROUP_ORDER.indexOf(a) - GROUP_ORDER.indexOf(b));
  if (!groups.length) return <div className="ld-card"><Empty>No metrics of this kind for this device.</Empty></div>;
  return (
    <div className="ld-grid ld-chart-grid">
      {groups.map((g) => {
        const inGroup = data.series.filter((s) => s.group === g);
        // A group with mode breakdowns (CPU user/system/…/idle) is drawn as a
        // stacked area of the parts; the total is shown on the KPI card.
        const parts = inGroup.filter((s) => s.stack && s.points.length);
        const stacked = parts.length > 1;
        // Idle is the remainder of 100%; drawing it would bury the busy modes.
        const idle = stacked ? parts.filter((s) => s.key.endsWith("_idle")) : [];
        const series = stacked ? parts.filter((s) => !idle.includes(s)) : inGroup;
        const hasData = series.some((s) => s.points.length);
        const chart = hasData
          ? <TimeChart series={series} startSec={startSec} endSec={endSec} stacked={stacked} compact={compact} legendOnly={idle} />
          : <Empty>No samples in this range.</Empty>;
        return compact ? (
          <section key={g} className="ld-card ld-chart-card" aria-label={GROUP_TITLE[g] ?? g}>
            <header>
              <h3>{GROUP_TITLE[g] ?? g}{CHART_NOTE[g] && <span className="ld-muted"> {CHART_NOTE[g]}</span>}</h3>
              <span className="ld-muted ld-small"><i className="fa-regular fa-clock" aria-hidden="true" /> {rangeLabel(rangePreset, rangeFrom, rangeTo)}</span>
            </header>
            {chart}
          </section>
        ) : (
          <Panel key={g} title={GROUP_TITLE[g] ?? g}>{chart}</Panel>
        );
      })}
    </div>
  );
}

/** Live metrics section for a device page (server, switch, any InfraDevice). */
export function DeviceMetrics({ deviceId, title = "Performance" }: { deviceId: string; title?: string }) {
  const { preset, from, to } = useTimeRange();
  const q = useDeviceMetrics(deviceId, preset, from, to);
  return (
    <section className="ld-metrics" aria-label={`${title} metrics`}>
      <div className="ld-metrics-head">
        <h2>{title}</h2>
        <TimeRangePicker />
      </div>
      <MetricsBody data={q.data} isLoading={q.isLoading} isError={q.isError} />
    </section>
  );
}

/** Live metrics section for a VM page. */
export function VmMetrics({ vmId, title = "Performance" }: { vmId: string; title?: string }) {
  const { preset, from, to } = useTimeRange();
  const q = useVmMetrics(vmId, preset, from, to);
  return (
    <section className="ld-metrics" aria-label={`${title} metrics`}>
      <div className="ld-metrics-head">
        <h2>{title}</h2>
        <TimeRangePicker />
      </div>
      <MetricsBody data={q.data} isLoading={q.isLoading} isError={q.isError} />
    </section>
  );
}

