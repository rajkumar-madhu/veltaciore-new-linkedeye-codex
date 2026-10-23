// Shared LinkedEye UI pieces (cards, pills, panels, donut and trend charts).
// Styled by the ld-* block in styles.css; used by the dashboard and list screens.
import React from "react";

export type Tone = "crit" | "warn" | "ok" | "info" | "purple" | "muted";

export const PALETTE = ["#2f6bff", "#7c4dff", "#f5a524", "#16a34a", "#e5383b", "#0ea5e9", "#98a2b3"];

export const fmt = (n: number) => n.toLocaleString("en-US");

export function countBy<T>(rows: T[], key: (r: T) => string) {
  const m = new Map<string, number>();
  for (const r of rows) m.set(key(r), (m.get(key(r)) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

export function Pill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <span className={`ld-pill ld-${tone}`}>{children}</span>;
}

export function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: { label: string; onClick: () => void };
  children: React.ReactNode;
}) {
  const id = React.useId();
  return (
    <section className="ld-card ld-panel" aria-labelledby={id}>
      <div className="ld-panel-head">
        <h2 id={id}>{title}</h2>
        {action && (
          <button type="button" className="ld-link" onClick={action.onClick}>
            {action.label}
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="ld-empty">{children}</div>;
}

export function StatCard({
  icon,
  tone,
  label,
  value,
  note,
  onClick,
}: {
  icon: string;
  tone: Tone;
  label: string;
  value: React.ReactNode;
  note: string;
  onClick?: () => void;
}) {
  return (
    <button type="button" className="ld-card ld-stat" onClick={onClick}>
      <span className={`ld-tile ld-${tone}`} aria-hidden="true">
        <i className={`fa-solid ${icon}`} />
      </span>
      <span className="ld-stat-body">
        <span className="ld-stat-label">{label}</span>
        <span className="ld-stat-value">{value}</span>
        <span className="ld-stat-note">{note}</span>
      </span>
    </button>
  );
}

export interface Slice {
  label: string;
  value: number;
  color: string;
}

export function Donut({ slices, center, sub, label }: { slices: Slice[]; center: string; sub?: string; label: string }) {
  const r = 56;
  const C = 2 * Math.PI * r;
  const total = slices.reduce((s, x) => s + x.value, 0);
  let acc = 0;
  return (
    <svg width="150" height="150" viewBox="0 0 160 160" role="img" aria-label={label} className="ld-donut">
      <circle cx="80" cy="80" r={r} fill="none" stroke="var(--border-subtle)" strokeWidth="22" />
      <g transform="rotate(-90 80 80)" fill="none" strokeWidth="22">
        {total > 0 &&
          slices.map((s) => {
            const len = (s.value / total) * C;
            const el = (
              <circle
                key={s.label}
                cx="80"
                cy="80"
                r={r}
                stroke={s.color}
                strokeDasharray={`${Math.max(len - (slices.length > 1 ? 2 : 0), 0)} ${C}`}
                strokeDashoffset={-acc}
              />
            );
            acc += len;
            return el;
          })}
      </g>
      <text x="80" y={sub ? 80 : 90} textAnchor="middle" className="ld-donut-center">
        {center}
      </text>
      {sub && (
        <text x="80" y="100" textAnchor="middle" className="ld-donut-sub">
          {sub}
        </text>
      )}
    </svg>
  );
}

export function Legend({ slices }: { slices: Slice[] }) {
  return (
    <ul className="ld-legend">
      {slices.map((s) => (
        <li key={s.label}>
          <span className="ld-swatch" style={{ background: s.color }} />
          <span className="ld-legend-label">{s.label}</span>
          <span className="ld-legend-value">{fmt(s.value)}</span>
        </li>
      ))}
    </ul>
  );
}

export function TrendChart({ days }: { days: { label: string; opened: number; resolved: number }[] }) {
  const W = 420;
  const H = 200;
  const left = 30;
  const right = 404;
  const top = 12;
  const bottom = 164;
  const max = Math.max(4, ...days.map((d) => d.opened));
  const step = Math.ceil(max / 4);
  const yMax = step * 4;
  const x = (i: number) => left + (i * (right - left)) / Math.max(days.length - 1, 1);
  const y = (v: number) => bottom - (v / yMax) * (bottom - top);
  const line = (k: "opened" | "resolved") => days.map((d, i) => `${x(i).toFixed(1)},${y(d[k]).toFixed(1)}`).join(" ");
  const area = (k: "opened" | "resolved") =>
    `M${x(0)},${bottom} L${days.map((d, i) => `${x(i).toFixed(1)},${y(d[k]).toFixed(1)}`).join(" L")} L${x(days.length - 1)},${bottom} Z`;
  const labelEvery = Math.max(1, Math.ceil(days.length / 5));
  const totalOpened = days.reduce((s, d) => s + d.opened, 0);
  const totalResolved = days.reduce((s, d) => s + d.resolved, 0);
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Tickets opened per day over the last ${days.length} days: ${totalOpened} opened, ${totalResolved} of them since resolved.`}
      className="ld-trend"
    >
      {[0, 1, 2, 3, 4].map((g) => (
        <g key={g}>
          <line x1={left} x2={right} y1={y(g * step)} y2={y(g * step)} className="ld-gridline" />
          <text x={left - 8} y={y(g * step) + 4} textAnchor="end" className="ld-axis">
            {g * step}
          </text>
        </g>
      ))}
      {days.map((d, i) =>
        (i % labelEvery === 0 && i < days.length - labelEvery + 1) || i === days.length - 1 ? (
          <text key={d.label} x={x(i)} y={H - 14} textAnchor={i === days.length - 1 ? "end" : i === 0 ? "start" : "middle"} className="ld-axis">
            {d.label}
          </text>
        ) : null,
      )}
      <path d={area("opened")} fill="#2f6bff" fillOpacity={0.12} />
      <path d={area("resolved")} fill="#16a34a" fillOpacity={0.12} />
      <polyline points={line("opened")} fill="none" stroke="#2f6bff" strokeWidth={2.2} strokeLinejoin="round" />
      <polyline points={line("resolved")} fill="none" stroke="#16a34a" strokeWidth={2.2} strokeLinejoin="round" />
    </svg>
  );
}

/** Parse a ticket's "YYYY-MM-DD HH:MM" opened time (local). NaN when unparseable. */
export const openedAt = (opened: string) => new Date(opened.replace(" ", "T")).getTime();

/**
 * Tickets opened (and since resolved) per day: n days ending at `endAt`, or
 * at the newest ticket when no end is given.
 */
export function dailyTrend<T extends { opened: string; state: string }>(rows: T[], resolved: Set<string>, n = 14, endAt?: number) {
  const parsed = rows
    .map((t) => ({ t, d: new Date(t.opened.replace(" ", "T")) }))
    .filter((p) => !Number.isNaN(p.d.getTime()));
  const end = endAt != null ? new Date(endAt) : parsed.length ? new Date(Math.max(...parsed.map((p) => p.d.getTime()))) : new Date();
  end.setHours(0, 0, 0, 0);
  return Array.from({ length: n }, (_, i) => {
    const day = new Date(end);
    day.setDate(end.getDate() - (n - 1 - i));
    const key = day.toDateString();
    const sameDay = parsed.filter((p) => p.d.toDateString() === key);
    return {
      label: day.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      opened: sameDay.length,
      resolved: sameDay.filter((p) => resolved.has(p.t.state)).length,
    };
  });
}
