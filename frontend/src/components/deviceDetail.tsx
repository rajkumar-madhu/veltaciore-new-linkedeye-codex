// Shared building blocks for the LinkedEye-style device detail pages
// (firewall / switch / server): light-theme charts, bars, pills, footer.
import React from "react";

export const TIME_LABELS = ["10:15", "10:18", "10:21", "10:24", "10:27", "10:30"];

export function LineChart({ series, colors, h = 120, yTicks }: { series: number[][]; colors: string[]; h?: number; yTicks?: string[] }) {
  const w = 100;
  const all = series.flat();
  const max = Math.max(...all) * 1.15, min = 0;
  const pts = (data: number[]) => data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / (max - min)) * (h - 14) - 4}`).join(" ");
  return (
    <div>
      <div style={{ display: "flex" }}>
        {yTicks && (
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: h, fontSize: 9, color: "#8a94a3", paddingRight: 6, textAlign: "right" }}>
            {yTicks.map(t => <span key={t}>{t}</span>)}
          </div>
        )}
        <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ flex: 1, height: h, display: "block" }}>
          {[0.25, 0.5, 0.75].map(f => <line key={f} x1="0" x2={w} y1={h * f} y2={h * f} stroke="#eef1f4" strokeWidth="0.6" />)}
          {series.map((data, si) => (
            <React.Fragment key={si}>
              <polyline points={pts(data)} fill="none" stroke={colors[si]} strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
              {data.map((v, i) => (
                <circle key={i} cx={(i / (data.length - 1)) * w} cy={h - ((v - min) / (max - min)) * (h - 14) - 4} r="1.4" fill={colors[si]} />
              ))}
            </React.Fragment>
          ))}
        </svg>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: "#8a94a3", marginTop: 4, paddingLeft: yTicks ? 28 : 0 }}>
        {TIME_LABELS.map(t => <span key={t}>{t}</span>)}
      </div>
    </div>
  );
}

export function Donut({ parts, size = 84 }: { parts: { pct: number; color: string }[]; size?: number }) {
  const r = 30, cx = 40, cy = 40, C = 2 * Math.PI * r;
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox="0 0 80 80">
      {parts.map((p, i) => {
        const dash = (p.pct / 100) * C;
        const el = (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={p.color} strokeWidth="13"
            strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={-acc} transform="rotate(-90 40 40)" />
        );
        acc += dash;
        return el;
      })}
    </svg>
  );
}

export function HBar({ pct, color = "#16a34a" }: { pct: number; color?: string }) {
  return (
    <div style={{ flex: 1, height: 7, background: "#eceff3", borderRadius: 4, overflow: "hidden" }}>
      <div style={{ width: `${Math.min(100, pct)}%`, height: "100%", background: color, borderRadius: 4 }} />
    </div>
  );
}

export type PortHealth = "up" | "warn" | "down" | "disabled";

export const portColor = (s: PortHealth) =>
  s === "up" ? "#22c55e" : s === "warn" ? "#f59e0b" : s === "down" ? "#ef4444" : "#94a3b8";

export function StatusPill({ s }: { s: PortHealth }) {
  const map = { up: ["Up", "#16a34a", "#dcfce7"], warn: ["Warning", "#b45309", "#fef3c7"], down: ["Down", "#b91c1c", "#fee2e2"], disabled: ["Disabled", "#475569", "#f1f5f9"] } as const;
  const [l, fg, bg] = map[s];
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: bg, color: fg, borderRadius: 10, padding: "1px 9px", fontSize: 11, fontWeight: 600 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: fg }} />{l}</span>;
}

export function Card({ title, right, children, pad = 16 }: { title?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode; pad?: number }) {
  return (
    <div className="card" style={{ background: "white", border: "1px solid #e5e8eb", borderRadius: 8, padding: pad }}>
      {(title || right) && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <b style={{ fontSize: 13 }}>{title}</b>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

export function KpiTile({ label, value, delta, up, good = true, sub = "vs last 15m" }: { label: string; value: string; delta?: string; up?: boolean; good?: boolean; sub?: string }) {
  return (
    <div className="card" style={{ background: "white", border: "1px solid #e5e8eb", borderRadius: 8, padding: "12px 14px" }}>
      <div style={{ fontSize: 11, color: "#6b7785", fontWeight: 600 }}>{label}</div>
      <div className="mono" style={{ fontSize: 22, fontWeight: 800, margin: "4px 0" }}>{value}</div>
      {delta && (
        <div style={{ fontSize: 10.5 }}>
          <span style={{ color: good ? "#16a34a" : "#dc2626", fontWeight: 700 }}><i className={`fa-solid fa-arrow-${up ? "up" : "down"}`} style={{ fontSize: 9 }} /> {delta}</span>
          <span style={{ color: "#9aa3af" }}> {sub}</span>
        </div>
      )}
    </div>
  );
}

export function LiveBadge() {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#dcfce7", color: "#15803d", borderRadius: 10, padding: "1px 10px", fontSize: 10.5, fontWeight: 700 }}><span style={{ width: 5, height: 5, borderRadius: "50%", background: "#16a34a" }} /> Live</span>;
}

export function PanelLegend() {
  return (
    <div style={{ display: "flex", gap: 14, fontSize: 11, color: "#6b7785" }}>
      {([["Up", "#22c55e"], ["Warning", "#f59e0b"], ["Down", "#ef4444"], ["Disabled", "#94a3b8"]] as [string, string][]).map(([l, c]) => (
        <span key={l} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: c }} />{l}</span>
      ))}
    </div>
  );
}

export function FooterStrip() {
  const ok = (label: string) => (
    <span>{label} <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#dcfce7", color: "#15803d", borderRadius: 10, padding: "0 8px", fontWeight: 700 }}><span style={{ width: 5, height: 5, borderRadius: "50%", background: "#16a34a" }} />Up</span></span>
  );
  return (
    <div style={{ margin: "0 24px 20px", padding: "10px 16px", background: "white", border: "1px solid #e5e8eb", borderRadius: 8, display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "#6b7785" }}>
      <span>© 2026 Argus-LinkedEye. All rights reserved.</span>
      <span style={{ display: "flex", gap: 16 }}>{ok("Prometheus")}{ok("NPGIC")}<span>Version 2.4.1</span></span>
      <span>Last updated: 10:30:45 AM</span>
    </div>
  );
}

export interface HeaderCtl {
  d: { id: string; model: string; ip: string; uptime: string; status: string };
  tabs: string[];
  tab: string;
  setTab: (t: string) => void;
  site?: string;
  category: string;
}

export function DetailHeader({ d, tabs, tab, setTab, site = "Bangalore DC-1", category }: HeaderCtl) {
  const healthy = d.status === "ok";
  return (
    <div className="sn-form-header">
      <div className="sn-form-title-meta">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: healthy ? "#22c55e" : d.status === "warn" ? "#f59e0b" : "#ef4444", boxShadow: `0 0 6px ${healthy ? "#22c55e" : d.status === "warn" ? "#f59e0b" : "#ef4444"}` }} />
            <h1 style={{ margin: 0 }}>{d.id}</h1>
            <i className="fa-regular fa-star" style={{ color: "#9aa3af", fontSize: 14 }} />
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: healthy ? "#dcfce7" : "#fef3c7", color: healthy ? "#15803d" : "#b45309", borderRadius: 12, padding: "3px 12px", fontSize: 12, fontWeight: 700 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: healthy ? "#16a34a" : "#f59e0b" }} />{healthy ? "Healthy" : d.status === "warn" ? "Warning" : "Degraded"}
            </span>
          </div>
          <div className="sn-form-sub" style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 6 }}>
            <span><b style={{ color: "#3d4a5c" }}>{d.model}</b></span>
            <span className="mono">{d.ip}</span>
            <span>Site: <b style={{ color: "#3d4a5c" }}>{site}</b></span>
            <span>Uptime: <b style={{ color: "#3d4a5c" }}>{d.uptime}</b></span>
            <span>Last Poll: <b style={{ color: "#3d4a5c" }}>10s ago</b></span>
          </div>
        </div>
        <div className="sn-form-actions">
          <button className="sn-btn"><i className="fa-regular fa-calendar" /> Last 15 minutes <i className="fa-solid fa-chevron-down" style={{ fontSize: 9 }} /></button>
          <button className="sn-btn"><i className="fa-solid fa-rotate" /></button>
          <button className="sn-btn">10s <i className="fa-solid fa-chevron-down" style={{ fontSize: 9 }} /></button>
          <button className="sn-btn primary">Actions <i className="fa-solid fa-chevron-down" style={{ fontSize: 9 }} /></button>
        </div>
      </div>
      <div style={{ display: "flex", gap: 2, marginTop: 12, borderBottom: "1px solid #e5e8eb", overflowX: "auto" }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            border: "none", background: "transparent", cursor: "pointer", padding: "9px 14px", fontSize: 12.5,
            fontWeight: tab === t ? 700 : 500, color: tab === t ? "#2563eb" : "#6b7785",
            borderBottom: tab === t ? "2px solid #2563eb" : "2px solid transparent", whiteSpace: "nowrap",
          }}>{t}</button>
        ))}
      </div>
      <span style={{ display: "none" }}>{category}</span>
    </div>
  );
}
