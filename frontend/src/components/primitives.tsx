// Shared small components (avatars, sparklines, pills, gauges, form primitives).
// Ported from primitives.jsx + FormSection/FormRow/Field (dashboard.jsx) + Kpi (incidents.jsx).
import React from "react";
import { USERS } from "@/data/core";

import { Icon } from "@/components/Icon";
import { cx } from "@/components/ui";

const AVATAR_BG: Record<string, string> = {
  amber: "bg-[linear-gradient(135deg,#f59e0b,#ef4444)]",
  green: "bg-[linear-gradient(135deg,#10b981,#059669)]",
  purple: "bg-[linear-gradient(135deg,#8b5cf6,#6366f1)]",
  pink: "bg-[linear-gradient(135deg,#ec4899,#8b5cf6)]",
  teal: "bg-[linear-gradient(135deg,#14b8a6,#0891b2)]",
  slate: "bg-[linear-gradient(135deg,#64748b,#475569)]",
};

export const Avatar = ({ name, color = "slate", size }: { name: string; color?: string; size?: string }) => {
  const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("");
  return (
    <div className={cx(
      "rounded-[50%] grid place-items-center text-white font-semibold shrink-0",
      size === "sm" ? "w-[22px] h-[22px] text-[9.5px]" : "w-7 h-7 text-2xs",
      AVATAR_BG[color] ?? "bg-[linear-gradient(135deg,#2563eb,#8b5cf6)]",
    )}>{initials}</div>
  );
};

export const UserById = ({ id, showName = true, size = "sm" }: { id: string | null | undefined; showName?: boolean; size?: string }) => {
  const u = USERS.find((x) => x.id === id);
  if (!u) return <span className="text-fg-subtle" style={{ fontStyle: "italic" }}>Unassigned</span>;
  return (
    <div className="flex items-center gap-2">
      <Avatar name={u.name} color={u.color} size={size} />
      {showName && (
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 550, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.name}</div>
          <div style={{ fontSize: 11, color: "var(--fg-subtle)" }}>{u.team}</div>
        </div>
      )}
    </div>
  );
};

export const Sparkline = ({ data, color = "var(--accent)", w = 80, h = 30, area = true }: { data: number[]; color?: string; w?: number; h?: number; area?: boolean }) => {
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = Math.max(max - min, 1);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - 2 - ((v - min) / range) * (h - 4);
    return [x, y];
  });
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const areaD = `${d} L${w},${h} L0,${h} Z`;
  return (
    <svg width={w} height={h} className="w-full h-[60px] block" style={{ color, display: "block" }}>
      {area && <path className="fill-current opacity-[.12]" d={areaD} />}
      <path className="stroke-current fill-none stroke-[1.5]" d={d} />
    </svg>
  );
};

const PILL_KIND: Record<string, string> = {
  success: "bg-[#ecfdf3] text-[#027a48] dark:bg-[rgba(16,185,129,.15)] dark:text-[#6ee7b7]",
  warning: "bg-[#fffaeb] text-[#b54708] dark:bg-[rgba(245,158,11,.15)] dark:text-[#fcd34d]",
  critical: "bg-[#fef3f2] text-[#b42318] dark:bg-[rgba(239,68,68,.15)] dark:text-[#fca5a5]",
  info: "bg-[#eff8ff] text-[#175cd3] dark:bg-[rgba(59,130,246,.15)] dark:text-[#93c5fd]",
  purple: "bg-[#f4ebff] text-[#6941c6]",
  neutral: "bg-bg-muted text-fg-muted",
  ghost: "bg-transparent border border-line text-fg-muted",
};

export const Pill = ({ kind = "neutral", children, noDot }: { kind?: string; children: React.ReactNode; noDot?: boolean }) => (
  <span className={cx(
    "inline-flex items-center gap-[5px] py-0.5 px-2 text-2xs font-semibold rounded-[4px] tracking-[0.005em] whitespace-nowrap leading-[1.6]",
    !noDot && "before:content-[''] before:w-[5px] before:h-[5px] before:rounded-[50%] before:bg-current",
    PILL_KIND[kind],
  )}>{children}</span>
);

const SEV_KIND: Record<number, string> = {
  1: "bg-critical text-white",
  2: "bg-[#ea580c] text-white",
  3: "bg-warning text-[#7c2d12]",
  4: "bg-info text-white",
  5: "bg-bg-muted text-fg-muted",
};

export const Sev = ({ n }: { n: number }) => (
  <span className={cx("inline-flex items-center gap-1.5 text-2xs font-semibold py-0.5 px-2 rounded-[4px] uppercase tracking-[0.04em] [font-family:var(--font-mono)]", SEV_KIND[n])}>SEV {n}</span>
);

export const SLAIndicator = ({ pct, label }: { pct: number; label?: string }) => {
  const kind = pct < 0.4 ? "bad" : pct < 0.7 ? "warn" : "good";
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-1 bg-bg-muted rounded-[2px] overflow-hidden min-w-[40px]">
        <div className={cx("h-full rounded-[2px] [transition:width_0.3s]", kind === "bad" ? "bg-critical" : kind === "warn" ? "bg-warning" : "bg-success")} style={{ width: `${pct * 100}%` }} />
      </div>
      <span className="text-2xs text-fg-subtle tabular-nums min-w-[36px]">{label || `${Math.round(pct * 100)}%`}</span>
    </div>
  );
};

export const Gauge = ({ value, size = 100, stroke = 10, color = "var(--accent)" }: { value: number; size?: number; stroke?: number; color?: string }) => {
  const r = (size - stroke) / 2;
  const c = Math.PI * r; // half circle
  const offset = c * (1 - value / 100);
  const cy = size / 2 + r / 2;
  return (
    <svg width={size} height={size / 2 + stroke} style={{ overflow: "visible" }}>
      <path className="stroke-bg-muted fill-none" d={`M ${stroke / 2} ${cy} A ${r} ${r} 0 0 1 ${size - stroke / 2} ${cy}`} strokeWidth={stroke} />
      <path className="fill-none [stroke-linecap:round] [transition:stroke-dashoffset_0.5s]" d={`M ${stroke / 2} ${cy} A ${r} ${r} 0 0 1 ${size - stroke / 2} ${cy}`}
        strokeWidth={stroke} stroke={color}
        strokeDasharray={c} strokeDashoffset={offset} />
    </svg>
  );
};

export const AreaChart = ({ data, color = "var(--accent)", w = 560, h = 140 }: { data: number[]; color?: string; w?: number; h?: number }) => {
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - 8 - (v / max) * (h - 16);
    return [x, y];
  });
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const areaD = `${d} L${w},${h} L0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: h, color, display: "block" }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="ag" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#ag)" />
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
};

export const BarChart = ({ data, color = "var(--accent)", h = 140 }: { data: number[]; color?: string; h?: number }) => {
  const max = Math.max(...data, 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: h, padding: "0 2px" }}>
      {data.map((v, i) => (
        <div key={i} style={{ flex: 1, height: `${(v / max) * 100}%`, background: color, borderRadius: "3px 3px 0 0", opacity: 0.2 + (v / max) * 0.8, minHeight: 2 }} />
      ))}
    </div>
  );
};

export const Heatmap = ({ rows = 7, cols = 24, seed = 1 }: { rows?: number; cols?: number; seed?: number }) => {
  const cells: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = (Math.sin(seed + r * 1.7 + c * 0.5) + 1) / 2;
      const intensity = v * v;
      cells.push(
        <div key={`${r}-${c}`} style={{
          aspectRatio: 1,
          borderRadius: 2,
          background: intensity > 0.1 ? `rgba(37, 99, 235, ${0.08 + intensity * 0.8})` : "var(--bg-muted)",
        }} />,
      );
    }
  }
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 2 }}>
      {cells}
    </div>
  );
};

export const KPI = ({ label, value, unit, delta, deltaKind = "up", sparkData, sparkColor = "var(--accent)", icon, showSpark = true }: {
  label: React.ReactNode;
  value: React.ReactNode;
  unit?: string;
  delta?: React.ReactNode;
  deltaKind?: "up" | "down" | "flat";
  sparkData?: number[];
  sparkColor?: string;
  icon?: string;
  showSpark?: boolean;
}) => (
  <div className="py-4 px-4.5 relative overflow-hidden [[data-density=compact]_&]:py-3 [[data-density=compact]_&]:px-3.5 [[data-density=comfy]_&]:py-5 [[data-density=comfy]_&]:px-5.5">
    <div className="text-2xs font-semibold text-fg-subtle uppercase tracking-[0.05em] mb-1.5 flex items-center gap-1.5">{icon && <Icon className={`fa-solid ${icon}`} style={{ fontSize: 11 }} />} {label}</div>
    <div className="text-5xl font-semibold tracking-[-0.025em] text-fg mt-1.5 leading-[1.1] tabular-nums [[data-density=compact]_&]:text-3xl [[data-density=comfy]_&]:text-[30px]">{value}{unit && <span className="text-base text-fg-subtle font-medium ml-0.5">{unit}</span>}</div>
    {delta != null && (
      <div className={cx("mt-1 text-[11.5px] font-medium inline-flex items-center gap-1", deltaKind === "down" ? "text-critical" : "text-success")}>
        <Icon className={`fa-solid ${deltaKind === "up" ? "fa-arrow-trend-up" : deltaKind === "down" ? "fa-arrow-trend-down" : "fa-minus"}`} />
        {delta}
      </div>
    )}
    {showSpark && sparkData && <div className="absolute right-4 top-4 w-20 h-[30px] pointer-events-none"><Sparkline data={sparkData} color={sparkColor} w={80} h={30} /></div>}
  </div>
);

// ── ServiceNow-style form primitives (from dashboard.jsx) ───────────────────

export function FormSection({ id, title, badge, collapsed, onToggle, children }: {
  id: string;
  title: React.ReactNode;
  badge?: React.ReactNode;
  collapsed?: boolean;
  onToggle?: (id: string) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-[#d2d6dc] rounded-[3px] overflow-hidden dark:bg-bg-raised dark:border-line">
      <div className="bg-[linear-gradient(180deg,#fafbfc_0%,#f4f6f9_100%)] py-2.5 px-3.5 border-b border-[#d2d6dc] flex items-center gap-2 cursor-pointer select-none text-sm font-semibold text-black hover:bg-[#eaf0f7] dark:bg-bg-muted dark:text-fg" onClick={() => onToggle && onToggle(id)}>
        <Icon className={cx(`fa-solid fa-chevron-${collapsed ? "right" : "down"}`, "text-[10px] text-fg-muted w-3")} />
        <span className="flex-1">{title}</span>
        {badge && <span className="text-[10.5px] font-medium text-fg-muted bg-white border border-[#d2d6dc] py-px px-2 rounded-[10px]">{badge}</span>}
      </div>
      {!collapsed && <div className="py-1 px-0">{children}</div>}
    </div>
  );
}

export function FormRow({ children }: { children?: React.ReactNode }) {
  return <div className="grid grid-cols-[1fr_1fr] gap-0 border-b border-[#e5e8eb] last:border-b-0">{children}</div>;
}

export function Field({ label, value, required }: { label: React.ReactNode; value: React.ReactNode; required?: boolean }) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-center min-h-8 first:border-r first:border-[#e5e8eb]">
      <div className={cx("py-2 px-3 text-xs text-[#424952] bg-[#fafbfc] border-r border-[#e5e8eb] h-full flex items-center dark:bg-bg-muted", required && "after:content-['_*'] after:text-[#c62828]")}>{label}</div>
      <div className="py-2 px-3 text-[12.5px] text-black dark:text-fg [&_.mono]:text-[11.5px]">{value}</div>
    </div>
  );
}

// ── KPI strip tile (from incidents.jsx) ─────────────────────────────────────

// [tile colour, value colour] per tone (was sn-kpi tone-*)
const KPI_TONE: Record<string, [string, string]> = {
  crit: ["text-[#c62828]", "text-[#c62828]"],
  warn: ["text-[#ef6c00]", "text-[#ef6c00]"],
  ok: ["text-[#2e7d32]", "text-[#2e7d32]"],
  neutral: ["text-fg-muted", ""],
};

export function Kpi({ l, v, s, tone }: { l: React.ReactNode; v: React.ReactNode; s?: React.ReactNode; tone?: string }) {
  return (
    <div className={cx("bg-white py-3.5 px-4 dark:bg-bg-raised dark:border-line", tone && KPI_TONE[tone]?.[0])}>
      <div className="text-[10.5px] font-semibold text-fg-subtle uppercase tracking-[0.04em] mb-1.5">{l}</div>
      <div className={cx("text-3xl font-semibold tracking-[-0.02em] tabular-nums leading-[1.1]", (tone && KPI_TONE[tone]?.[1]) || "text-black dark:text-fg")}>{v}</div>
      <div className="text-2xs text-fg-subtle mt-[3px]">{s}</div>
    </div>
  );
}
