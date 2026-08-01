// Desktop / endpoint latency monitor: live round-trip latency to monitored
// desktop agents, centred around ~20 ms, with a trend sparkline, p50/p95/p99,
// and a per-location breakdown.
import React from "react";
import { Sparkline } from "@/components/primitives";

interface Agent { site: string; base: number; count: number }
const AGENTS: Agent[] = [
  { site: "Mumbai DC", base: 12, count: 428 },
  { site: "Bangalore DC-1", base: 18, count: 361 },
  { site: "GIFT City · IFSC", base: 24, count: 190 },
  { site: "Singapore edge", base: 41, count: 88 },
  { site: "London LD4", base: 116, count: 42 },
];

const tone = (ms: number) => (ms < 30 ? "#2ecc71" : ms < 80 ? "#f2a01e" : "#e0321c");

export function DesktopLatency() {
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 2000);
    return () => clearInterval(t);
  }, []);

  // deterministic wobble around a base value
  const jitter = (base: number, amp: number, k: number) =>
    Math.max(1, Math.round((base + Math.sin(tick * k + base) * amp) * 10) / 10);

  const current = jitter(20, 3.5, 0.6);
  const series = Array.from({ length: 24 }, (_, i) => 20 + Math.sin(i * 0.5 + tick * 0.2) * 4 + Math.sin(i * 1.7) * 1.5);
  const p50 = 19, p95 = 34, p99 = 61;

  return (
    <div className="sn-form-section" style={{ overflow: "hidden" }}>
      <div className="sn-section-header">
        <span className="sn-section-title">Desktop Latency</span>
        <span className="sn-section-badge">{AGENTS.reduce((a, x) => a + x.count, 0)} agents · live</span>
      </div>
      <div style={{ padding: 16, display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
        {/* current + trend */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{ fontSize: 34, fontWeight: 700, color: tone(current), fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{current}</span>
          <span style={{ fontSize: 14, color: "var(--fg-muted)" }}>ms</span>
        </div>
        <div style={{ flexShrink: 0 }}>
          <Sparkline data={series} color={tone(current)} w={180} h={40} />
        </div>
        <div style={{ display: "flex", gap: 22, marginLeft: "auto" }}>
          {([["p50", p50], ["p95", p95], ["p99", p99]] as const).map(([l, v]) => (
            <div key={l} style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "var(--fg-subtle)", textTransform: "uppercase", letterSpacing: ".04em" }}>{l}</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: tone(v), fontVariantNumeric: "tabular-nums" }}>{v} ms</div>
            </div>
          ))}
        </div>
      </div>

      {/* per-location breakdown */}
      <table className="sn-list-table" style={{ fontSize: 12.5, borderTop: "1px solid var(--border, #e5e8eb)" }}>
        <thead>
          <tr>
            <th>Location</th>
            <th style={{ width: 90, textAlign: "right" }}>Agents</th>
            <th style={{ width: 110, textAlign: "right" }}>RTT (ms)</th>
            <th style={{ width: 160 }}>Trend</th>
          </tr>
        </thead>
        <tbody>
          {AGENTS.map((a, i) => {
            const rtt = jitter(a.base, Math.max(1.5, a.base * 0.12), 0.5 + i * 0.11);
            return (
              <tr key={a.site}>
                <td><b>{a.site}</b></td>
                <td className="mono" style={{ textAlign: "right", color: "var(--fg-muted)" }}>{a.count}</td>
                <td className="mono" style={{ textAlign: "right", fontWeight: 700, color: tone(rtt) }}>{rtt}</td>
                <td>
                  <Sparkline data={Array.from({ length: 16 }, (_, k) => a.base + Math.sin(k * 0.6 + tick * 0.2 + i) * (a.base * 0.14))} color={tone(rtt)} w={130} h={22} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
