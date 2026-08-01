// Firewall device monitoring — LinkedEye-style detail page for firewall
// devices: live front panel with interactive ports, device health, security
// KPIs, charts, interface status, WAN/HA/GeoIP panels.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { useUiStore } from "@/store/ui";
import { useDevice } from "@/api/hooks";
import { DEVICES } from "@/data/infra";
import type { Device } from "@/lib/types";

/* ── screen-local dataset (mirrors the reference dashboard) ──────────────── */

interface FwPort {
  n: string;            // faceplate label
  name: string;         // logical name: port1 (wan1)
  zone: string;
  vlan: number;
  status: "up" | "warn" | "down" | "disabled";
  admin: "up" | "down";
  speed: string;
  inBps: string;
  outBps: string;
  util: number;
  errIn: number;
  errOut: number;
}

const FW_PORTS: FwPort[] = [
  { n: "1",  name: "port1 (wan1)",     zone: "wan",      vlan: 0,  status: "down",     admin: "up",   speed: "1 Gbps", inBps: "0",          outBps: "0",          util: 0,  errIn: 12, errOut: 45 },
  { n: "2",  name: "port2 (wan2)",     zone: "wan",      vlan: 0,  status: "up",       admin: "up",   speed: "1 Gbps", inBps: "312.5 Mbps", outBps: "245.6 Mbps", util: 41, errIn: 0,  errOut: 0 },
  { n: "3",  name: "port3 (dmz)",      zone: "dmz",      vlan: 30, status: "up",       admin: "up",   speed: "1 Gbps", inBps: "98.6 Mbps",  outBps: "87.3 Mbps",  util: 18, errIn: 0,  errOut: 0 },
  { n: "4",  name: "port4 (internal)", zone: "internal", vlan: 10, status: "up",       admin: "up",   speed: "1 Gbps", inBps: "256.8 Mbps", outBps: "312.6 Mbps", util: 28, errIn: 0,  errOut: 0 },
  { n: "5",  name: "port5 (server)",   zone: "server",   vlan: 20, status: "warn",     admin: "up",   speed: "1 Gbps", inBps: "721.4 Mbps", outBps: "512.3 Mbps", util: 72, errIn: 3,  errOut: 0 },
  { n: "6",  name: "port6 (voice)",    zone: "voice",    vlan: 40, status: "up",       admin: "up",   speed: "1 Gbps", inBps: "65.4 Mbps",  outBps: "54.6 Mbps",  util: 11, errIn: 0,  errOut: 0 },
  { n: "7",  name: "port7 (guest)",    zone: "guest",    vlan: 50, status: "disabled", admin: "down", speed: "—",      inBps: "0",          outBps: "0",          util: 0,  errIn: 0,  errOut: 0 },
  { n: "8",  name: "port8",            zone: "unused",   vlan: 0,  status: "up",       admin: "up",   speed: "1 Gbps", inBps: "12.1 Mbps",  outBps: "8.4 Mbps",   util: 2,  errIn: 0,  errOut: 0 },
  { n: "9",  name: "port9",            zone: "unused",   vlan: 0,  status: "up",       admin: "up",   speed: "1 Gbps", inBps: "4.2 Mbps",   outBps: "3.1 Mbps",   util: 1,  errIn: 0,  errOut: 0 },
  { n: "10", name: "port10",           zone: "unused",   vlan: 0,  status: "up",       admin: "up",   speed: "1 Gbps", inBps: "0",          outBps: "0",          util: 0,  errIn: 0,  errOut: 0 },
  { n: "11", name: "port11",           zone: "mgmt",     vlan: 99, status: "up",       admin: "up",   speed: "1 Gbps", inBps: "1.8 Mbps",   outBps: "2.2 Mbps",   util: 1,  errIn: 0,  errOut: 0 },
  { n: "12", name: "port12",           zone: "unused",   vlan: 0,  status: "up",       admin: "up",   speed: "1 Gbps", inBps: "0",          outBps: "0",          util: 0,  errIn: 0,  errOut: 0 },
];

const SFP_WAN: FwPort[] = [
  { n: "SFP1", name: "sfp1 (uplink-a)", zone: "core", vlan: 0, status: "up",   admin: "up", speed: "10 Gbps", inBps: "1.02 Gbps", outBps: "846 Mbps", util: 19, errIn: 0, errOut: 0 },
  { n: "SFP2", name: "sfp2 (uplink-b)", zone: "core", vlan: 0, status: "up",   admin: "up", speed: "10 Gbps", inBps: "0.98 Gbps", outBps: "801 Mbps", util: 17, errIn: 0, errOut: 0 },
  { n: "WAN1", name: "wan1 (ISP-A)",    zone: "wan",  vlan: 0, status: "down", admin: "up", speed: "1 Gbps",  inBps: "0",         outBps: "0",        util: 0,  errIn: 12, errOut: 45 },
  { n: "WAN2", name: "wan2 (ISP-B)",    zone: "wan",  vlan: 0, status: "up",   admin: "up", speed: "1 Gbps",  inBps: "412 Mbps",  outBps: "388 Mbps", util: 41, errIn: 0, errOut: 0 },
];

const TIME_LABELS = ["10:15", "10:18", "10:21", "10:24", "10:27", "10:30"];
const CPU_SERIES = [26, 31, 27, 24, 29, 33, 28, 25, 30, 27, 26, 28];
const MEM_SERIES = [44, 45, 47, 46, 44, 46, 48, 47, 45, 46, 47, 46];
const SESS_SERIES = [11.9, 12.4, 12.1, 12.8, 12.3, 12.6, 13.1, 12.7, 12.5, 12.9, 12.6, 12.84];
const THR_IN = [0.9, 1.05, 0.98, 1.12, 1.2, 1.08, 1.15, 1.23, 1.1, 1.18, 1.21, 1.23];
const THR_OUT = [0.71, 0.82, 0.78, 0.9, 0.95, 0.85, 0.92, 0.99, 0.88, 0.93, 0.96, 0.987];
const LAT_SERIES = [21, 16, 24, 14, 30, 18, 22, 12, 26, 17, 20, 15, 28, 19, 16, 23, 14, 21, 18, 18];

const SEC_KPIS = [
  { label: "Threats Blocked", value: "8,347", delta: "12.5%", up: true, good: true },
  { label: "IPS Detections", value: "2,153", delta: "8.2%", up: true, good: true },
  { label: "Botnet C&C Hits", value: "126", delta: "3.1%", up: false, good: true },
  { label: "URL Filtering Events", value: "4,281", delta: "9.3%", up: true, good: true },
];

const SEC_OVERVIEW = [
  { icon: "fa-shield-virus", label: "DDoS Events", value: "23", extra: "↑ 9", extraTone: "#dc2626" },
  { icon: "fa-earth-asia", label: "Geo-blocked Traffic", value: "1,245", extra: "↑ 5.4%", extraTone: "#16a34a" },
  { icon: "fa-ban", label: "Denied Connections", value: "3,152", extra: "↑ 7.6%", extraTone: "#16a34a" },
  { icon: "fa-user-secret", label: "Top Attacker", value: "203.0.113.45", extra: "2,153 hits", extraTone: "#6b7785" },
  { icon: "fa-bullseye", label: "Top Destination", value: "8.8.8.8", extra: "1,842 hits", extraTone: "#6b7785" },
];

const TOP_APPS = [
  { name: "YouTube", pct: 25, color: "#dc2626" },
  { name: "SSL", pct: 18, color: "#16a34a" },
  { name: "HTTP", pct: 16, color: "#2563eb" },
  { name: "Facebook", pct: 12, color: "#7c3aed" },
  { name: "Others", pct: 29, color: "#94a3b8" },
];

const TOP_COUNTRIES = [
  { name: "China", n: 812, color: "#dc2626" },
  { name: "Russia", n: 432, color: "#f59e0b" },
  { name: "United States", n: 310, color: "#2563eb" },
  { name: "India", n: 212, color: "#16a34a" },
  { name: "Others", n: 489, color: "#94a3b8" },
];

const portColor = (s: FwPort["status"]) =>
  s === "up" ? "#22c55e" : s === "warn" ? "#f59e0b" : s === "down" ? "#ef4444" : "#94a3b8";

/* ── small chart primitives (light theme, reference style) ───────────────── */

function LineChart({ series, colors, h = 120, unit, yTicks }: { series: number[][]; colors: string[]; h?: number; unit?: string; yTicks?: string[] }) {
  const w = 100; // viewBox units; scales to container
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
      {unit && <span style={{ display: "none" }}>{unit}</span>}
    </div>
  );
}

function Donut({ parts, size = 84 }: { parts: { pct: number; color: string }[]; size?: number }) {
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

function HBar({ pct, color = "#16a34a" }: { pct: number; color?: string }) {
  return (
    <div style={{ flex: 1, height: 7, background: "#eceff3", borderRadius: 4, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4 }} />
    </div>
  );
}

/* ── front panel ─────────────────────────────────────────────────────────── */

function Rj45({ p, onHover, onLeave }: { p: FwPort; onHover: (e: React.MouseEvent, p: FwPort) => void; onLeave: () => void }) {
  const c = portColor(p.status);
  return (
    <div onMouseEnter={e => onHover(e, p)} onMouseLeave={onLeave} onClick={e => { e.stopPropagation(); onHover(e, p); }}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, cursor: "pointer" }}>
      <span style={{ fontSize: 7.5, color: "#6b7785", fontFamily: "var(--font-mono)" }}>{p.n}</span>
      <div style={{ width: 26, height: 24, background: "#20242a", borderRadius: 2, border: "1px solid #40464e", position: "relative", display: "grid", placeItems: "center" }}>
        <span style={{ width: 14, height: 10, background: "#0c0f13", clipPath: "polygon(0 0,100% 0,100% 55%,75% 55%,75% 100%,25% 100%,25% 55%,0 55%)" }} />
        <span style={{ position: "absolute", left: 2, bottom: 2, width: 4, height: 4, borderRadius: "50%", background: c, boxShadow: p.status !== "disabled" ? `0 0 4px ${c}` : "none" }} />
        <span style={{ position: "absolute", right: 2, bottom: 2, width: 4, height: 4, borderRadius: "50%", background: p.status === "up" || p.status === "warn" ? "#22c55e" : "#3a4048" }} />
      </div>
    </div>
  );
}

function FrontPanel({ model, onHover, onLeave }: { model: string; onHover: (e: React.MouseEvent, p: FwPort) => void; onLeave: () => void }) {
  return (
    <div style={{ background: "linear-gradient(180deg,#f2f0eb 0%,#e5e2da 70%,#d5d2c9 100%)", border: "1px solid #c9c5bb", borderRadius: 8, padding: "18px 20px", display: "flex", alignItems: "center", gap: 18, boxShadow: "inset 0 1px 0 rgba(255,255,255,.7), 0 3px 10px rgba(15,25,35,.12)" }}>
      {/* brand + LEDs */}
      <div style={{ flexShrink: 0 }}>
        {/forti/i.test(model) ? (
          <div style={{ fontWeight: 900, fontSize: 15, color: "#c62f2f", letterSpacing: 0.4, fontStyle: "italic" }}>F<span style={{ color: "#3d4550" }}>ORTINET</span><span style={{ color: "#c62f2f" }}>.</span></div>
        ) : (
          <div style={{ fontWeight: 900, fontSize: 13, color: "#3d4550", letterSpacing: 0.6 }}>{model.split(" ").slice(0, 2).join(" ").toUpperCase()}<span style={{ color: "#e8710a" }}>®</span></div>
        )}
        <div style={{ fontSize: 9.5, color: "#5b6472", marginBottom: 8 }}>{model}</div>
        {["STATUS", "HA", "POWER"].map((l, i) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: i === 1 ? "#f59e0b" : "#22c55e", boxShadow: `0 0 5px ${i === 1 ? "#f59e0b" : "#22c55e"}` }} />
            <span style={{ fontSize: 7.5, fontFamily: "var(--font-mono)", color: "#5b6472" }}>{l}</span>
          </div>
        ))}
      </div>
      {/* console + usb */}
      <div style={{ flexShrink: 0, textAlign: "center" }}>
        <span style={{ fontSize: 7.5, color: "#6b7785", fontFamily: "var(--font-mono)" }}>CONSOLE</span>
        <div style={{ width: 28, height: 24, background: "#20242a", borderRadius: 2, border: "1px solid #40464e", display: "grid", placeItems: "center", margin: "2px 0 4px" }}>
          <span style={{ width: 14, height: 10, background: "#0c0f13", clipPath: "polygon(0 0,100% 0,100% 55%,75% 55%,75% 100%,25% 100%,25% 55%,0 55%)" }} />
        </div>
        <span style={{ fontSize: 7.5, color: "#6b7785", fontFamily: "var(--font-mono)" }}>USB</span>
        <div style={{ display: "flex", gap: 3, justifyContent: "center", marginTop: 2 }}>
          {[0, 1].map(i => <span key={i} style={{ width: 12, height: 6, background: "#1f6feb", borderRadius: 1, border: "1px solid #40464e" }} />)}
        </div>
      </div>
      {/* ports 1-12 in pairs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, auto)", gap: "4px 10px", flexShrink: 0 }}>
        {FW_PORTS.map(p => <Rj45 key={p.n} p={p} onHover={onHover} onLeave={onLeave} />)}
      </div>
      <div style={{ flex: 1 }} />
      {/* SFP + WAN */}
      <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
        {SFP_WAN.map(p => (
          <div key={p.n} onMouseEnter={e => onHover(e, p)} onMouseLeave={onLeave} onClick={e => { e.stopPropagation(); onHover(e, p); }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, cursor: "pointer" }}>
            <span style={{ fontSize: 7.5, color: "#6b7785", fontFamily: "var(--font-mono)" }}>{p.n}</span>
            <div style={{ width: 30, height: 24, background: "#20242a", borderRadius: 2, border: "1px solid #40464e", position: "relative", display: "grid", placeItems: "center" }}>
              <span style={{ width: 20, height: 8, background: "#0c0f13", borderRadius: 1 }} />
              <span style={{ position: "absolute", left: 2, bottom: 2, width: 4, height: 4, borderRadius: "50%", background: portColor(p.status), boxShadow: p.status !== "disabled" ? `0 0 4px ${portColor(p.status)}` : "none" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── screen ──────────────────────────────────────────────────────────────── */

const TABS = ["Overview", "Interfaces", "Performance", "Security", "Network", "HA", "Logs", "Alerts", "Topology", "Settings"];

export default function FirewallDetailScreen() {
  const { setRoute } = useNav();
  const paramId = useUiStore(s => s.params.deviceId as string | undefined);
  const seed = DEVICES.find(d => d.id === paramId && d.kind === "firewall")
    ?? DEVICES.find(d => d.kind === "firewall") ?? DEVICES[0];
  const { data: live } = useDevice(seed.id);
  const d: Device = live ?? seed;

  const [tab, setTab] = React.useState("Overview");
  const [pop, setPop] = React.useState<{ x: number; y: number; p: FwPort } | null>(null);
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 10_000);
    return () => clearInterval(t);
  }, []);

  const showPop = (e: React.MouseEvent, p: FwPort) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPop({ x: Math.min(r.left, window.innerWidth - 260), y: r.bottom + 8, p });
  };

  const healthy = d.status === "ok";
  const jitter = (v: number, amp: number) => Math.max(0, v + Math.sin(tick * 1.7) * amp);

  const statusPill = (s: FwPort["status"]) => {
    const map = { up: ["Up", "#16a34a", "#dcfce7"], warn: ["Warning", "#b45309", "#fef3c7"], down: ["Down", "#b91c1c", "#fee2e2"], disabled: ["Disabled", "#475569", "#f1f5f9"] } as const;
    const [l, fg, bg] = map[s];
    return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: bg, color: fg, borderRadius: 10, padding: "1px 9px", fontSize: 11, fontWeight: 600 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: fg }} />{l}</span>;
  };

  /* panel building blocks reused across tabs */
  const interfaceTable = (
    <div className="card" style={{ background: "white", border: "1px solid #e5e8eb", borderRadius: 8, overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", fontWeight: 700, fontSize: 13, borderBottom: "1px solid #eef1f4" }}>Interface Status</div>
      <table className="sn-list-table" style={{ fontSize: 12 }}>
        <thead><tr><th>Name</th><th style={{ width: 100 }}>Status</th><th style={{ width: 70 }}>Admin</th><th style={{ width: 80 }}>Speed</th><th style={{ width: 100 }}>In (bps)</th><th style={{ width: 100 }}>Out (bps)</th><th style={{ width: 140 }}>Utilization</th><th style={{ width: 90 }}>Errors In / Out</th></tr></thead>
        <tbody>
          {FW_PORTS.slice(0, 7).map(p => (
            <tr key={p.name}>
              <td className="mono" style={{ fontWeight: 600 }}>{p.name}</td>
              <td>{statusPill(p.status)}</td>
              <td style={{ color: p.admin === "up" ? "#16a34a" : "#94a3b8", fontWeight: 600 }}>{p.admin === "up" ? "Up" : "Down"}</td>
              <td className="mono">{p.speed}</td>
              <td className="mono">{p.inBps}</td>
              <td className="mono">{p.outBps}</td>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <HBar pct={p.util} color={p.util > 70 ? "#f59e0b" : p.status === "down" ? "#e5e8eb" : "#16a34a"} />
                  <span className="mono" style={{ fontSize: 11, width: 30 }}>{p.status === "disabled" ? "—" : `${p.util}%`}</span>
                </div>
              </td>
              <td className="mono" style={{ color: p.errIn + p.errOut > 0 ? "#dc2626" : "#16a34a", fontWeight: p.errIn + p.errOut > 0 ? 700 : 400 }}>{p.errIn} / {p.errOut}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const haPanel = (
    <div className="card" style={{ background: "white", border: "1px solid #e5e8eb", borderRadius: 8, padding: 16 }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>HA Overview</div>
      {([["Mode", "Active-Passive", ""], ["This Device", "Active", "#16a34a"], ["Peer Status", "Reachable", "#16a34a"], ["Sync Status", "Synced", "#16a34a"], ["Failover Count", "3", ""], ["Last Failover", "12d 4h ago", ""], ["Last Failover Reason", "Peer Failure", ""]] as [string, string, string][]).map(([l, v, tone]) => (
        <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 12, borderBottom: "1px solid #f3f5f7" }}>
          <span style={{ color: "#6b7785" }}>{l}</span>
          <span style={{ fontWeight: 600, color: tone || "#16212e", display: "inline-flex", alignItems: "center", gap: 5 }}>{tone && <span style={{ width: 6, height: 6, borderRadius: "50%", background: tone }} />}{v}</span>
        </div>
      ))}
    </div>
  );

  const securityPanel = (
    <div className="card" style={{ background: "white", border: "1px solid #e5e8eb", borderRadius: 8, padding: 16 }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Security Overview</div>
      {SEC_OVERVIEW.map(r => (
        <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px solid #f3f5f7", fontSize: 12.5 }}>
          <span style={{ width: 26, height: 26, borderRadius: "50%", background: "#eef4ff", color: "#2563eb", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}><i className={`fa-solid ${r.icon}`} /></span>
          <span style={{ flex: 1, color: "#3d4a5c" }}>{r.label}</span>
          <b className="mono" style={{ fontSize: 12.5 }}>{r.value}</b>
          <span style={{ fontSize: 11, color: r.extraTone, fontWeight: 600, minWidth: 48, textAlign: "right" }}>{r.extra}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="page page-fade sn-dash" onClick={() => setPop(null)}>
      <div className="sn-breadcrumb">
        <a className="sn-link" onClick={() => setRoute("infra")}>Infra</a><span className="sn-bc-sep">›</span>
        <a className="sn-link" onClick={() => setRoute("infra-assets")}>Devices</a><span className="sn-bc-sep">›</span>
        <a className="sn-link">Firewalls</a><span className="sn-bc-sep">›</span>
        <span>{d.id}</span>
      </div>

      {/* header */}
      <div className="sn-form-header">
        <div className="sn-form-title-meta">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: healthy ? "#22c55e" : "#ef4444", boxShadow: `0 0 6px ${healthy ? "#22c55e" : "#ef4444"}` }} />
              <h1 style={{ margin: 0 }}>{d.id}</h1>
              <i className="fa-regular fa-star" style={{ color: "#9aa3af", fontSize: 14 }} />
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#dcfce7", color: "#15803d", borderRadius: 12, padding: "3px 12px", fontSize: 12, fontWeight: 700 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "#16a34a" }} />{healthy ? "Healthy" : "Degraded"}</span>
            </div>
            <div className="sn-form-sub" style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 6 }}>
              <span><b style={{ color: "#3d4a5c" }}>{d.model}</b></span>
              <span className="mono">{d.ip}</span>
              <span>Site: <b style={{ color: "#3d4a5c" }}>Bangalore DC-1</b></span>
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
        {/* tabs */}
        <div style={{ display: "flex", gap: 2, marginTop: 12, borderBottom: "1px solid #e5e8eb", overflowX: "auto" }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              border: "none", background: "transparent", cursor: "pointer", padding: "9px 14px", fontSize: 12.5,
              fontWeight: tab === t ? 700 : 500, color: tab === t ? "#2563eb" : "#6b7785",
              borderBottom: tab === t ? "2px solid #2563eb" : "2px solid transparent", whiteSpace: "nowrap",
            }}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: "16px 24px", display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, alignItems: "start" }}>
        {/* ── main column ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          {(tab === "Overview" || tab === "Interfaces" || tab === "Topology") && (
            <div className="card" style={{ background: "white", border: "1px solid #e5e8eb", borderRadius: 8, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <b style={{ fontSize: 13 }}>Device Front Panel</b>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#dcfce7", color: "#15803d", borderRadius: 10, padding: "1px 10px", fontSize: 10.5, fontWeight: 700 }}><span style={{ width: 5, height: 5, borderRadius: "50%", background: "#16a34a" }} /> Live</span>
                </div>
                <div style={{ display: "flex", gap: 14, fontSize: 11, color: "#6b7785" }}>
                  {([["Up", "#22c55e"], ["Warning", "#f59e0b"], ["Down", "#ef4444"], ["Disabled", "#94a3b8"]] as [string, string][]).map(([l, c]) => (
                    <span key={l} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: c }} />{l}</span>
                  ))}
                </div>
              </div>
              <FrontPanel model={d.model} onHover={showPop} onLeave={() => setPop(null)} />
            </div>
          )}

          {(tab === "Overview" || tab === "Security") && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {SEC_KPIS.map(k => (
                <div key={k.label} className="card" style={{ background: "white", border: "1px solid #e5e8eb", borderRadius: 8, padding: "12px 14px" }}>
                  <div style={{ fontSize: 11, color: "#6b7785", fontWeight: 600 }}>{k.label}</div>
                  <div className="mono" style={{ fontSize: 22, fontWeight: 800, margin: "4px 0" }}>{k.value}</div>
                  <div style={{ fontSize: 10.5 }}>
                    <span style={{ color: k.good ? "#16a34a" : "#dc2626", fontWeight: 700 }}><i className={`fa-solid fa-arrow-${k.up ? "up" : "down"}`} style={{ fontSize: 9 }} /> {k.delta}</span>
                    <span style={{ color: "#9aa3af" }}> vs last 15m</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {(tab === "Overview" || tab === "Performance") && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              <div className="card" style={{ background: "white", border: "1px solid #e5e8eb", borderRadius: 8, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <b style={{ fontSize: 12.5 }}>CPU & Memory</b>
                  <span style={{ fontSize: 10.5, color: "#6b7785" }}><span style={{ color: "#2563eb" }}>●</span> CPU <span style={{ color: "#16a34a" }}>●</span> Memory</span>
                </div>
                <LineChart series={[MEM_SERIES, CPU_SERIES]} colors={["#16a34a", "#2563eb"]} yTicks={["100%", "75%", "50%", "25%", "0%"]} />
              </div>
              <div className="card" style={{ background: "white", border: "1px solid #e5e8eb", borderRadius: 8, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <b style={{ fontSize: 12.5 }}>Sessions</b>
                  <b className="mono" style={{ fontSize: 12.5, color: "#16a34a" }}>{Math.round(jitter(12842, 120)).toLocaleString()}</b>
                </div>
                <LineChart series={[SESS_SERIES]} colors={["#16a34a"]} yTicks={["20K", "15K", "10K", "5K", "0"]} />
              </div>
              <div className="card" style={{ background: "white", border: "1px solid #e5e8eb", borderRadius: 8, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <b style={{ fontSize: 12.5 }}>Throughput (bps)</b>
                  <span style={{ fontSize: 10.5 }}><b className="mono" style={{ color: "#16a34a" }}>1.23 Gbps</b> <b className="mono" style={{ color: "#2563eb" }}>987 Mbps</b></span>
                </div>
                <LineChart series={[THR_IN, THR_OUT]} colors={["#16a34a", "#2563eb"]} yTicks={["2G", "1.5G", "1G", "500M", "0"]} />
              </div>
            </div>
          )}

          {(tab === "Overview" || tab === "Interfaces" || tab === "Network") && interfaceTable}

          {(tab === "Logs" || tab === "Alerts" || tab === "Settings") && (
            <div className="card" style={{ background: "white", border: "1px solid #e5e8eb", borderRadius: 8, padding: 24, textAlign: "center", color: "#6b7785", fontSize: 13 }}>
              <i className="fa-solid fa-arrow-up-right-from-square" style={{ marginRight: 8 }} />
              Full {tab.toLowerCase()} for {d.id} live in the device monitoring workspace —
              <a className="sn-link" style={{ marginLeft: 6 }} onClick={() => setRoute("infra-device", { deviceId: d.id })}>open device monitoring</a>
            </div>
          )}
          {tab === "HA" && haPanel}
          {tab === "Security" && securityPanel}
        </div>

        {/* ── right column ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card" style={{ background: "white", border: "1px solid #e5e8eb", borderRadius: 8, padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Device Health</div>
            {([["CPU Utilization", Math.round(jitter(28, 3)), "#16a34a"], ["Memory Utilization", Math.round(jitter(46, 2)), "#16a34a"]] as [string, number, string][]).map(([l, v, c]) => (
              <div key={l} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: "#6b7785" }}>{l}</span><b className="mono">{v}%</b>
                </div>
                <HBar pct={v as number} color={c as string} />
              </div>
            ))}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 14px", marginTop: 12, fontSize: 12 }}>
              <div><div style={{ color: "#6b7785", fontSize: 11 }}>Session Count</div><b className="mono" style={{ fontSize: 15 }}>{Math.round(jitter(12842, 120)).toLocaleString()}</b></div>
              <div><div style={{ color: "#6b7785", fontSize: 11 }}>Concurrent Users</div><b className="mono" style={{ fontSize: 15 }}>342</b></div>
              <div><div style={{ color: "#6b7785", fontSize: 11 }}>VPN Tunnels</div><b className="mono" style={{ fontSize: 15 }}>8 <span style={{ color: "#16a34a", fontSize: 11 }}>Up</span></b></div>
              <div><div style={{ color: "#6b7785", fontSize: 11 }}>HA Status</div><b style={{ fontSize: 12 }}>Active-Passive <span style={{ color: "#16a34a" }}>Synced</span></b></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 14, paddingTop: 12, borderTop: "1px solid #f0f2f5" }}>
              {([["fa-temperature-half", "Temperature", "42 °C"], ["fa-fan", "Fan Speed", "2400 RPM"], ["fa-plug", "PSU Status", "2 / 2"]] as [string, string, string][]).map(([ic, l, v]) => (
                <div key={l} style={{ textAlign: "center" }}>
                  <i className={`fa-solid ${ic}`} style={{ color: "#2563eb", fontSize: 13 }} />
                  <div style={{ fontSize: 9.5, color: "#8a94a3", margin: "3px 0 1px" }}>{l}</div>
                  <b className="mono" style={{ fontSize: 12 }}>{v}</b>
                </div>
              ))}
            </div>
          </div>

          {securityPanel}

          <div className="card" style={{ background: "white", border: "1px solid #e5e8eb", borderRadius: 8, padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>WAN Utilization</div>
            {([["WAN1", 0, true], ["WAN2", 41, false]] as [string, number, boolean][]).map(([l, pct, down]) => (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, fontSize: 12 }}>
                <span style={{ width: 44, color: "#6b7785" }}>{l}</span>
                {down ? <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#b91c1c", fontWeight: 700, fontSize: 11 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444" }} />Down</span> : null}
                <HBar pct={pct} color={down ? "#e5e8eb" : "#16a34a"} />
                <b className="mono" style={{ width: 34, textAlign: "right" }}>{pct}%</b>
              </div>
            ))}
            <div style={{ fontWeight: 700, fontSize: 13, margin: "14px 0 6px" }}>Latency (ms)</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <svg viewBox="0 0 100 26" style={{ flex: 1, height: 34 }} preserveAspectRatio="none">
                <polyline points={LAT_SERIES.map((v, i) => `${(i / (LAT_SERIES.length - 1)) * 100},${26 - (v / 35) * 22}`).join(" ")} fill="none" stroke="#7c3aed" strokeWidth="1.3" vectorEffect="non-scaling-stroke" />
              </svg>
              <b className="mono" style={{ fontSize: 13 }}>18 ms</b>
            </div>
            <div style={{ fontWeight: 700, fontSize: 13, margin: "14px 0 8px" }}>Top Applications</div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Donut parts={TOP_APPS} />
              <div style={{ flex: 1, fontSize: 11.5 }}>
                {TOP_APPS.map(a => (
                  <div key={a.name} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                    <span style={{ color: "#3d4a5c" }}><span style={{ color: a.color }}>●</span> {a.name}</span>
                    <span className="mono" style={{ color: "#6b7785" }}>{a.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {haPanel}

          <div className="card" style={{ background: "white", border: "1px solid #e5e8eb", borderRadius: 8, padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Top Countries (Blocked)</div>
            <div style={{ height: 74, borderRadius: 6, background: "#f4f6f8", display: "grid", placeItems: "center", marginBottom: 10 }}>
              <i className="fa-solid fa-earth-americas" style={{ fontSize: 34, color: "#cfd6dd" }} />
            </div>
            {TOP_COUNTRIES.map(cn => (
              <div key={cn.name} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12 }}>
                <span style={{ color: "#3d4a5c" }}><span style={{ color: cn.color }}>●</span> {cn.name}</span>
                <b className="mono">{cn.n}</b>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* footer strip */}
      <div style={{ margin: "0 24px 20px", padding: "10px 16px", background: "white", border: "1px solid #e5e8eb", borderRadius: 8, display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "#6b7785" }}>
        <span>© 2026 Argus-LinkedEye. All rights reserved.</span>
        <span style={{ display: "flex", gap: 16 }}>
          <span>Prometheus <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#dcfce7", color: "#15803d", borderRadius: 10, padding: "0 8px", fontWeight: 700 }}><span style={{ width: 5, height: 5, borderRadius: "50%", background: "#16a34a" }} />Up</span></span>
          <span>NPGIC <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#dcfce7", color: "#15803d", borderRadius: 10, padding: "0 8px", fontWeight: 700 }}><span style={{ width: 5, height: 5, borderRadius: "50%", background: "#16a34a" }} />Up</span></span>
          <span>Version 2.4.1</span>
        </span>
        <span>Last updated: 10:30:45 AM</span>
      </div>

      {/* port tooltip */}
      {pop && (
        <div style={{ position: "fixed", left: pop.x, top: pop.y, zIndex: 70, background: "#16212e", color: "white", borderRadius: 8, padding: "12px 14px", fontSize: 12, minWidth: 210, boxShadow: "0 12px 28px rgba(0,0,0,.35)" }} onClick={e => e.stopPropagation()}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>{pop.p.name}</div>
          <div style={{ display: "grid", gridTemplateColumns: "auto auto", gap: "3px 18px", color: "#c4cdd6" }}>
            <span>VLAN</span><span className="mono" style={{ color: "white", textAlign: "right" }}>{pop.p.vlan || "—"}</span>
            <span>Zone</span><span className="mono" style={{ color: "white", textAlign: "right" }}>{pop.p.zone}</span>
            <span>Speed</span><span className="mono" style={{ color: "white", textAlign: "right" }}>{pop.p.speed}</span>
            <span>Duplex</span><span className="mono" style={{ color: "white", textAlign: "right" }}>{pop.p.status === "disabled" ? "—" : "Full"}</span>
            <span>Status</span><span className="mono" style={{ color: portColor(pop.p.status), textAlign: "right", fontWeight: 700 }}>{pop.p.status === "up" ? "Up" : pop.p.status === "warn" ? "Warning" : pop.p.status === "down" ? "Down" : "Disabled"}</span>
            <span>RX / TX</span><span className="mono" style={{ color: "white", textAlign: "right" }}>{pop.p.inBps} / {pop.p.outBps}</span>
            <span>Utilization</span><span className="mono" style={{ color: "white", textAlign: "right" }}>{pop.p.util}%</span>
            <span>Errors (In/Out)</span><span className="mono" style={{ color: pop.p.errIn + pop.p.errOut > 0 ? "#f87171" : "white", textAlign: "right" }}>{pop.p.errIn} / {pop.p.errOut}</span>
          </div>
        </div>
      )}
    </div>
  );
}
