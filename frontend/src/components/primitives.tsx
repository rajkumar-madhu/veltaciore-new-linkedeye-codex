// Shared small components (avatars, sparklines, pills, gauges, form primitives).
// Ported from primitives.jsx + FormSection/FormRow/Field (dashboard.jsx) + Kpi (incidents.jsx).
import React from "react";
import { USERS } from "@/data/core";

import { Icon } from "@/components/Icon";
export const Avatar = ({ name, color = "slate", size }: { name: string; color?: string; size?: string }) => {
  const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("");
  return <div className={`avatar ${color}${size ? " " + size : ""}`}>{initials}</div>;
};

export const UserById = ({ id, showName = true, size = "sm" }: { id: string | null | undefined; showName?: boolean; size?: string }) => {
  const u = USERS.find((x) => x.id === id);
  if (!u) return <span className="text-mute" style={{ fontStyle: "italic" }}>Unassigned</span>;
  return (
    <div className="row row-8">
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
    <svg width={w} height={h} className="mini-chart" style={{ color, display: "block" }}>
      {area && <path className="spark-area" d={areaD} />}
      <path className="spark-line" d={d} />
    </svg>
  );
};

export const Pill = ({ kind = "neutral", children, noDot }: { kind?: string; children: React.ReactNode; noDot?: boolean }) => (
  <span className={`pill ${kind}${noDot ? " no-dot" : ""}`}>{children}</span>
);

export const Sev = ({ n }: { n: number }) => (
  <span className={`sev sev-${n}`}>SEV {n}</span>
);

export const SLAIndicator = ({ pct, label }: { pct: number; label?: string }) => {
  const kind = pct < 0.4 ? "bad" : pct < 0.7 ? "warn" : "good";
  return (
    <div className="sla">
      <div className="sla-bar"><div className={`sla-fill ${kind}`} style={{ width: `${pct * 100}%` }} /></div>
      <span className="sla-text">{label || `${Math.round(pct * 100)}%`}</span>
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
      <path className="arc-bg" d={`M ${stroke / 2} ${cy} A ${r} ${r} 0 0 1 ${size - stroke / 2} ${cy}`} strokeWidth={stroke} />
      <path className="arc-fg" d={`M ${stroke / 2} ${cy} A ${r} ${r} 0 0 1 ${size - stroke / 2} ${cy}`}
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
  <div className="kpi">
    <div className="kpi-label">{icon && <Icon className={`fa-solid ${icon}`} style={{ fontSize: 11 }} />} {label}</div>
    <div className="kpi-value">{value}{unit && <span className="unit">{unit}</span>}</div>
    {delta != null && (
      <div className={`kpi-delta ${deltaKind}`}>
        <Icon className={`fa-solid ${deltaKind === "up" ? "fa-arrow-trend-up" : deltaKind === "down" ? "fa-arrow-trend-down" : "fa-minus"}`} />
        {delta}
      </div>
    )}
    {showSpark && sparkData && <div className="kpi-spark"><Sparkline data={sparkData} color={sparkColor} w={80} h={30} /></div>}
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
    <div className="sn-form-section">
      <div className="sn-section-header" onClick={() => onToggle && onToggle(id)}>
        <Icon className={`fa-solid fa-chevron-${collapsed ? "right" : "down"}`} />
        <span className="sn-section-title">{title}</span>
        {badge && <span className="sn-section-badge">{badge}</span>}
      </div>
      {!collapsed && <div className="sn-section-content">{children}</div>}
    </div>
  );
}

export function FormRow({ children }: { children?: React.ReactNode }) {
  return <div className="sn-form-row">{children}</div>;
}

export function Field({ label, value, required }: { label: React.ReactNode; value: React.ReactNode; required?: boolean }) {
  return (
    <div className="sn-form-group">
      <div className={`sn-field-label${required ? " required" : ""}`}>{label}</div>
      <div className="sn-field-value">{value}</div>
    </div>
  );
}

// ── KPI strip tile (from incidents.jsx) ─────────────────────────────────────

export function Kpi({ l, v, s, tone }: { l: React.ReactNode; v: React.ReactNode; s?: React.ReactNode; tone?: string }) {
  return (
    <div className={`sn-kpi tone-${tone}`}>
      <div className="sn-kpi-l">{l}</div>
      <div className="sn-kpi-v">{v}</div>
      <div className="sn-kpi-s">{s}</div>
    </div>
  );
}
