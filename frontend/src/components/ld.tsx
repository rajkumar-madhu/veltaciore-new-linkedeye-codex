// Shared LinkedEye UI pieces (cards, pills, panels, donut and trend charts),
// styled with Tailwind via components/ui.tsx.
import React from "react";

import { Icon } from "@/components/Icon";
import { TextButton, cx, toneBg, ui, type Tone } from "@/components/ui";
export type { Tone };

export const PALETTE = ["#2f6bff", "#7c4dff", "#f5a524", "#16a34a", "#e5383b", "#0ea5e9", "#98a2b3"];

export const fmt = (n: number) => n.toLocaleString("en-US");

export function countBy<T>(rows: T[], key: (r: T) => string) {
  const m = new Map<string, number>();
  for (const r of rows) m.set(key(r), (m.get(key(r)) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

const PILL_TONE: Record<Tone, string> = { ...toneBg, muted: "bg-bg-muted text-fg-muted" };

export function Pill({ tone, children, className }: { tone: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-[5px] text-xs font-semibold rounded-full px-2.5 py-[3px] whitespace-nowrap", PILL_TONE[tone], className)}>
      {children}
    </span>
  );
}

/** The coloured dot at the start of a status pill (was ld-pill-dot). */
export const PillDot = () => <span className={ui.pillDot} />;

export function Panel({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: { label: string; onClick: () => void };
  children: React.ReactNode;
  className?: string;
}) {
  const id = React.useId();
  return (
    <section className={cx(ui.card, ui.panel, className)} aria-labelledby={id}>
      <div className={ui.panelHead}>
        <h2 id={id} className={ui.panelTitle}>{title}</h2>
        {action && <TextButton onClick={action.onClick}>{action.label}</TextButton>}
      </div>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className={ui.empty}>{children}</div>;
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
    <button
      type="button"
      data-stat=""
      className={cx(ui.card, "flex items-center gap-4 px-4.5 py-4 text-left cursor-pointer hover:border-line-strong hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2")}
      onClick={onClick}
    >
      <span data-stat-tile="" className={cx("flex-none grid place-items-center w-14 h-14 rounded-[12px] text-3xl", toneBg[tone])} aria-hidden="true">
        <Icon name={icon} />
      </span>
      <span className="flex flex-col gap-0.5 min-w-0">
        <span className="text-sm text-fg-muted">{label}</span>
        <span data-stat-value="" className="text-5xl font-bold tracking-[-0.02em] text-fg leading-[1.2]">{value}</span>
        <span className="text-sm text-fg-muted">{note}</span>
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
    <svg width="150" height="150" viewBox="0 0 160 160" role="img" aria-label={label} className="flex-none">
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
      <text x="80" y={sub ? 80 : 90} textAnchor="middle" className="text-4xl font-bold fill-fg font-sans">
        {center}
      </text>
      {sub && (
        <text x="80" y="100" textAnchor="middle" className="text-xs fill-fg-muted font-sans">
          {sub}
        </text>
      )}
    </svg>
  );
}

export function Legend({ slices }: { slices: Slice[] }) {
  return (
    <ul className="list-none flex-[1_1_140px] flex flex-col gap-2">
      {slices.map((s) => (
        <li key={s.label} className="flex items-center gap-2 text-sm">
          <span className="w-2.5 h-2.5 rounded-[3px] flex-none" style={{ background: s.color }} />
          <span className="flex-1 text-fg-muted">{s.label}</span>
          <span className="font-semibold text-fg">{fmt(s.value)}</span>
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
      className="w-full h-auto block"
    >
      {[0, 1, 2, 3, 4].map((g) => (
        <g key={g}>
          <line x1={left} x2={right} y1={y(g * step)} y2={y(g * step)} className="stroke-line-subtle [stroke-width:1]" />
          <text x={left - 8} y={y(g * step) + 4} textAnchor="end" className="text-xs fill-fg-muted font-sans">
            {g * step}
          </text>
        </g>
      ))}
      {days.map((d, i) =>
        (i % labelEvery === 0 && i < days.length - labelEvery + 1) || i === days.length - 1 ? (
          <text key={d.label} x={x(i)} y={H - 14} textAnchor={i === days.length - 1 ? "end" : i === 0 ? "start" : "middle"} className="text-xs fill-fg-muted font-sans">
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
