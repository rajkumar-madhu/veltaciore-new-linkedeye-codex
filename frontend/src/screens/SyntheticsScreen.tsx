// Synthetic Monitoring — uptime & API checks from multiple locations, the
// Datadog Synthetics equivalent. A checks table (HTTP / TCP / ICMP / browser),
// uptime %, latency by location, and a request waterfall for the selected check.
// Light-theme house style. Illustrative but internally consistent data.
import React from "react";
import { Kpi, FormSection } from "@/components/primitives";
import { LineChart, TIME_LABELS } from "@/components/deviceDetail";
import { StatusPill, type PillTone } from "@/components/StatusPill";

interface Check {
  id: string;
  name: string;
  type: "HTTP" | "TCP" | "ICMP" | "Browser";
  target: string;
  uptime: number;
  p95: number;
  status: "up" | "degraded" | "down";
  interval: string;
  locations: number;
  lastRun: string;
}

const CHECKS: Check[] = [
  { id: "SYN-01", name: "Fyers login flow", type: "Browser", target: "https://fs-le-uat.finspot.in/login", uptime: 99.98, p95: 842, status: "up", interval: "1m", locations: 5, lastRun: "12s ago" },
  { id: "SYN-02", name: "Order API /v2/orders", type: "HTTP", target: "https://api.fyers.in/v2/orders", uptime: 99.91, p95: 214, status: "up", interval: "30s", locations: 5, lastRun: "8s ago" },
  { id: "SYN-03", name: "Market-data websocket", type: "TCP", target: "wss://feed.fyers.in:443", uptime: 99.62, p95: 38, status: "degraded", interval: "30s", locations: 4, lastRun: "5s ago" },
  { id: "SYN-04", name: "NSE gateway reachability", type: "ICMP", target: "10.20.4.11", uptime: 100, p95: 2, status: "up", interval: "1m", locations: 3, lastRun: "20s ago" },
  { id: "SYN-05", name: "Status page availability", type: "HTTP", target: "https://status.finspot.in", uptime: 100, p95: 96, status: "up", interval: "1m", locations: 5, lastRun: "18s ago" },
  { id: "SYN-06", name: "Payments gateway checkout", type: "HTTP", target: "https://pay.finspot.in/checkout", uptime: 98.40, p95: 1120, status: "down", interval: "1m", locations: 5, lastRun: "3s ago" },
];

const LOCATIONS = [
  { code: "BLR", name: "Mumbai (BLR)", ms: 12 },
  { code: "DEL", name: "Delhi", ms: 34 },
  { code: "SGP", name: "Singapore", ms: 58 },
  { code: "FRA", name: "Frankfurt", ms: 142 },
  { code: "NYC", name: "New York", ms: 218 },
];

const statusPill = (s: Check["status"]) => {
  const map: Record<Check["status"], { tone: PillTone; label: string; icon: string }> = {
    up: { tone: "ok", label: "Up", icon: "fa-circle-check" },
    degraded: { tone: "warn", label: "Degraded", icon: "fa-triangle-exclamation" },
    down: { tone: "crit", label: "Down", icon: "fa-circle-xmark" },
  };
  return <StatusPill {...map[s]} />;
};

// Request waterfall phases (ms) for the selected HTTP check.
const WATERFALL = [
  { phase: "DNS", ms: 8, color: "#8b5cf6" },
  { phase: "TCP connect", ms: 22, color: "#3b82f6" },
  { phase: "TLS handshake", ms: 41, color: "#06b6d4" },
  { phase: "TTFB (server)", ms: 118, color: "#f59e0b" },
  { phase: "Content download", ms: 25, color: "#10b981" },
];

export default function SyntheticsScreen() {
  const [sel, setSel] = React.useState(CHECKS[1]);
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const toggle = (id: string) => setCollapsed((c) => ({ ...c, [id]: !c[id] }));

  const totalMs = WATERFALL.reduce((s, w) => s + w.ms, 0);
  const upCount = CHECKS.filter((c) => c.status === "up").length;
  const fleetUptime = (CHECKS.reduce((s, c) => s + c.uptime, 0) / CHECKS.length).toFixed(2);
  // One series per location, sampled across the time axis (not the location count).
  const latencySeries = LOCATIONS.map((l) => TIME_LABELS.map((_, i) => l.ms + Math.round(8 * Math.sin(i * 1.3 + l.ms))));
  const locColors = ["#2563eb", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899"];

  return (
    <div className="page page-fade sn-dash">
      <div className="sn-breadcrumb">
        <a className="sn-link">Home</a><span className="sn-bc-sep">›</span>
        <a className="sn-link">Observe</a><span className="sn-bc-sep">›</span>
        <span>Synthetic Monitoring</span>
      </div>

      <div className="sn-form-header">
        <div className="sn-form-title-row">
          <span className="sn-rec-number">SYNTHETICS</span>
          <span className="sn-pill svc-healthy"><i className="fa-solid fa-circle-check" /> {upCount}/{CHECKS.length} up</span>
          {CHECKS.some((c) => c.status === "down") && <span className="sn-pill prio-1"><i className="fa-solid fa-circle" /> {CHECKS.filter((c) => c.status === "down").length} down</span>}
          <span className="sn-pill state-neutral"><i className="fa-solid fa-globe" /> 5 locations</span>
        </div>
        <div className="sn-form-title-meta">
          <div>
            <h1>Synthetic Monitoring</h1>
            <div className="sn-form-sub">Uptime & API checks from global probes · {fleetUptime}% fleet availability (30d)</div>
          </div>
          <div className="sn-form-actions">
            <button className="sn-btn"><i className="fa-solid fa-map-location-dot" /> Locations</button>
            <button className="sn-btn primary"><i className="fa-solid fa-plus" /> New Check</button>
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 24px 0" }}>
        <div className="sn-kpi-strip">
          <Kpi l="Fleet availability" v={<>{fleetUptime}<span style={{ fontSize: 13, color: "#8a94a3" }}>%</span></>} s="30-day SLA window" tone="ok" />
          <Kpi l="Checks up" v={`${upCount}/${CHECKS.length}`} s="across all probes" tone={upCount === CHECKS.length ? "ok" : "warn"} />
          <Kpi l="Failing now" v={CHECKS.filter((c) => c.status !== "up").length} s="degraded or down" tone="crit" />
          <Kpi l="Probe locations" v="5" s="BLR · DEL · SGP · FRA · NYC" tone="neutral" />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, padding: "16px 24px 24px" }}>
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Checks table */}
          <div className="card" style={{ background: "white", border: "1px solid #e5e8eb", borderRadius: 6, overflow: "hidden" }}>
            <table className="sn-list-table" style={{ fontSize: 12.5 }}>
              <thead>
                <tr>
                  <th>CHECK</th>
                  <th style={{ width: 84 }}>TYPE</th>
                  <th style={{ width: 92 }}>UPTIME</th>
                  <th style={{ width: 80 }}>P95</th>
                  <th style={{ width: 120 }}>STATUS</th>
                  <th style={{ width: 70 }}>EVERY</th>
                  <th style={{ width: 90 }}>LAST RUN</th>
                </tr>
              </thead>
              <tbody>
                {CHECKS.map((c) => (
                  <tr key={c.id} onClick={() => setSel(c)} style={{ cursor: "pointer", background: sel.id === c.id ? "#eff6ff" : c.status === "down" ? "#fef2f2" : undefined }}>
                    <td>
                      <div style={{ fontWeight: 600, color: "#0f1c3f" }}>{c.name}</div>
                      <div className="mono" style={{ fontSize: 11, color: "#8a94a3" }}>{c.target}</div>
                    </td>
                    <td><span style={{ fontSize: 11, fontWeight: 600, color: "#475467", background: "#f3f4f6", padding: "2px 7px", borderRadius: 4 }}>{c.type}</span></td>
                    <td className="mono" style={{ fontWeight: 700, color: c.uptime >= 99.9 ? "#059669" : c.uptime >= 99 ? "#b45309" : "#dc2626" }}>{c.uptime.toFixed(2)}%</td>
                    <td className="mono" style={{ color: "#475467" }}>{c.p95}ms</td>
                    <td>{statusPill(c.status)}</td>
                    <td className="mono" style={{ color: "#475467" }}>{c.interval}</td>
                    <td className="text-mute" style={{ fontSize: 11 }}>{c.lastRun}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Latency by location */}
          <FormSection id="latency" title={`Latency by location · ${sel.name}`} badge="last 1h" collapsed={collapsed.latency} onToggle={toggle}>
            <div style={{ padding: 16 }}>
              <div style={{ display: "flex", gap: 14, fontSize: 11, marginBottom: 10, flexWrap: "wrap" }}>
                {LOCATIONS.map((l, i) => (
                  <span key={l.code} style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#475467" }}>
                    <span style={{ width: 9, height: 3, borderRadius: 2, background: locColors[i] }} /> {l.name} · {l.ms}ms
                  </span>
                ))}
              </div>
              <LineChart series={latencySeries} colors={locColors} h={170} yTicks={["250", "125", "0"]} />
            </div>
          </FormSection>
        </div>

        {/* Right rail — request waterfall */}
        <aside style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="card" style={{ background: "white", border: "1px solid #e5e8eb", borderRadius: 6, padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 4 }}><i className="fa-solid fa-stopwatch" style={{ color: "var(--accent)", marginRight: 6 }} /> Request waterfall</div>
            <div style={{ fontSize: 11, color: "#8a94a3", marginBottom: 12 }}>{sel.name} · from Mumbai (BLR)</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {WATERFALL.map((w) => (
                <div key={w.phase}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 3 }}>
                    <span style={{ color: "#475467" }}>{w.phase}</span>
                    <span className="mono" style={{ fontWeight: 600, color: "#0f1c3f" }}>{w.ms}ms</span>
                  </div>
                  <div style={{ height: 8, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${(w.ms / totalMs) * 100}%`, height: "100%", background: w.color, borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTop: "1px solid #eef1f4", fontSize: 12.5 }}>
              <b>Total response</b>
              <b className="mono" style={{ color: "var(--accent)" }}>{totalMs}ms</b>
            </div>
          </div>

          <div className="card" style={{ background: "white", border: "1px solid #e5e8eb", borderRadius: 6, padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 10 }}><i className="fa-solid fa-list-check" style={{ color: "var(--accent)", marginRight: 6 }} /> Assertions</div>
            {[
              ["Status code is 200", sel.status !== "down"],
              ["Response time < 2s", sel.p95 < 2000],
              ["Body contains \"ok\"", sel.status === "up"],
              ["TLS cert valid > 30d", true],
            ].map(([label, pass]) => (
              <div key={label as string} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", fontSize: 12 }}>
                <i className={`fa-solid ${pass ? "fa-circle-check" : "fa-circle-xmark"}`} style={{ color: pass ? "#059669" : "#dc2626" }} />
                <span style={{ color: "#475467" }}>{label}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
