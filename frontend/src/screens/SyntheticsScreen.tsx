// Synthetic Monitoring — uptime & API checks from multiple locations, the
// Datadog Synthetics equivalent. A checks table (HTTP / TCP / ICMP / browser),
// uptime %, latency by location, and a request waterfall for the selected check.
// No synthetic probe backend is connected yet: the checks are a labelled
// sample and the summary figures are computed from them.
import React from "react";
import "@/styles/observe.css";
import { useNav } from "@/hooks/useNav";
import { Panel, Pill, StatCard, fmt } from "@/components/ld";
import type { Tone } from "@/components/ld";
import { TimeChart } from "@/components/MetricCharts";
import type { MetricSeries } from "@/api/hooks";

import { Icon } from "@/components/Icon";
import { ChevronRightIcon, FlaskConicalIcon, MapPinnedIcon, PlusIcon } from "lucide-react";
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

const STATUS: Record<Check["status"], { tone: Tone; label: string; icon: string }> = {
  up: { tone: "ok", label: "Up", icon: "fa-circle-check" },
  degraded: { tone: "warn", label: "Degraded", icon: "fa-triangle-exclamation" },
  down: { tone: "crit", label: "Down", icon: "fa-circle-xmark" },
};

// Request waterfall phases (ms) for the selected HTTP check.
const WATERFALL = [
  { phase: "DNS", ms: 8, color: "#7c4dff" },
  { phase: "TCP connect", ms: 22, color: "#2f6bff" },
  { phase: "TLS handshake", ms: 41, color: "#0ea5e9" },
  { phase: "TTFB (server)", ms: 118, color: "#f5a524" },
  { phase: "Content download", ms: 25, color: "#16a34a" },
];

const uptimeClass = (u: number) => (u >= 99.9 ? "ld-text-ok" : u >= 99 ? "ld-text-warn" : "ld-text-crit");

export default function SyntheticsScreen() {
  const { setRoute } = useNav();
  const [sel, setSel] = React.useState(CHECKS[1]);

  const totalMs = WATERFALL.reduce((s, w) => s + w.ms, 0);
  const upCount = CHECKS.filter((c) => c.status === "up").length;
  const downCount = CHECKS.filter((c) => c.status === "down").length;
  const fleetUptime = (CHECKS.reduce((s, c) => s + c.uptime, 0) / CHECKS.length).toFixed(2);

  // One sample series per location across the last hour.
  const latency = React.useMemo(() => {
    const end = Math.floor(Date.now() / 1000);
    const n = 12, step = 300;
    const series: MetricSeries[] = LOCATIONS.map((l) => ({
      key: l.code, label: l.name, unit: "ms", group: "latency",
      points: Array.from({ length: n }, (_, i) => [end - (n - 1 - i) * step, l.ms + Math.round(8 * Math.sin(i * 1.3 + l.ms))] as [number, number]),
    }));
    return { series, start: end - (n - 1) * step, end };
  }, []);

  const assertions: [string, boolean][] = [
    ["Status code is 200", sel.status !== "down"],
    ["Response time < 2s", sel.p95 < 2000],
    ["Body contains \"ok\"", sel.status === "up"],
    ["TLS cert valid > 30d", true],
  ];

  return (
    <div className="ld-dash">
      <nav className="ld-crumbs" aria-label="Breadcrumb">
        <button type="button" className="ld-link" onClick={() => setRoute("dashboard")}>Home</button>
        <Icon icon={ChevronRightIcon} />
        <span>Synthetic Monitoring</span>
      </nav>

      <div className="ld-head">
        <div>
          <h1>Synthetic Monitoring</h1>
          <p>Uptime &amp; API checks from {LOCATIONS.length} probe locations</p>
        </div>
        <div className="ld-head-actions">
          <button type="button" className="ld-btn"><Icon icon={MapPinnedIcon} /> Locations</button>
          <button type="button" className="ld-btn ld-btn-primary"><Icon icon={PlusIcon} /> New Check</button>
        </div>
      </div>

      <div className="ld-card ld-metrics-off" role="note">
        <Icon icon={FlaskConicalIcon} />
        <div>
          <b>Sample data</b>
          <p className="ld-muted ld-small">Synthetic probes are not connected yet. The checks, latencies and waterfall below are illustrative; summary figures are computed from them.</p>
        </div>
      </div>

      <div className="ld-grid ld-grid-stats">
        <StatCard icon="fa-heart-pulse" tone="ok" label="Fleet availability" value={`${fleetUptime}%`} note="average check uptime" />
        <StatCard icon="fa-circle-check" tone={upCount === CHECKS.length ? "ok" : "warn"} label="Checks up" value={`${upCount}/${CHECKS.length}`} note={downCount ? `${downCount} down` : "across all probes"} />
        <StatCard icon="fa-circle-xmark" tone="crit" label="Failing now" value={fmt(CHECKS.filter((c) => c.status !== "up").length)} note="degraded or down" />
        <StatCard icon="fa-globe" tone="info" label="Probe locations" value={fmt(LOCATIONS.length)} note={LOCATIONS.map((l) => l.code).join(" · ")} />
      </div>

      <div className="ld-split">
        <div className="ld-rail">
          <Panel title={`Checks (${CHECKS.length})`}>
            <div className="ld-table-wrap">
              <table className="ld-table">
                <thead>
                  <tr>
                    <th scope="col">Check</th>
                    <th scope="col">Type</th>
                    <th scope="col">Uptime</th>
                    <th scope="col">p95</th>
                    <th scope="col">Status</th>
                    <th scope="col">Every</th>
                    <th scope="col">Last run</th>
                  </tr>
                </thead>
                <tbody>
                  {CHECKS.map((c) => {
                    const st = STATUS[c.status];
                    return (
                      <tr key={c.id} className={sel.id === c.id ? "ld-row-selected" : undefined}>
                        <td>
                          <button type="button" className="ld-link ld-strong" aria-pressed={sel.id === c.id} onClick={() => setSel(c)}>{c.name}</button>
                          <span className="ld-sub ld-mono ld-ellipsis">{c.target}</span>
                        </td>
                        <td><Pill tone="muted">{c.type}</Pill></td>
                        <td className={uptimeClass(c.uptime)}>{c.uptime.toFixed(2)}%</td>
                        <td>{c.p95}ms</td>
                        <td><Pill tone={st.tone}><Icon className={`fa-solid ${st.icon}`} /> {st.label}</Pill></td>
                        <td className="ld-muted">{c.interval}</td>
                        <td className="ld-muted">{c.lastRun}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title={`Latency by location · ${sel.name} · last 1h`}>
            <TimeChart series={latency.series} startSec={latency.start} endSec={latency.end} compact />
          </Panel>
        </div>

        <div className="ld-rail">
          <Panel title="Request waterfall">
            <span className="ld-muted ld-small">{sel.name} · from {LOCATIONS[0].name}</span>
            <ul className="ld-bars">
              {WATERFALL.map((w) => (
                <li key={w.phase}>
                  <span className="ld-bar-label">{w.phase}</span>
                  <span className="ld-bar-track">
                    <span className="ld-bar-fill" style={{ width: `${(w.ms / totalMs) * 100}%`, background: w.color }} />
                  </span>
                  <span className="ld-bar-value ld-bar-value-wide">{w.ms}ms</span>
                </li>
              ))}
            </ul>
            <dl className="ld-dl">
              <dt>Total response</dt><dd className="ld-strong">{totalMs}ms</dd>
            </dl>
          </Panel>

          <Panel title="Assertions">
            <ul className="ld-obs-list">
              {assertions.map(([label, pass]) => (
                <li key={label}>
                  <Icon className={`fa-solid ${pass ? "fa-circle-check ld-text-ok" : "fa-circle-xmark ld-text-crit"}`} />
                  <span>{label}</span>
                  <span className="sr-only">{pass ? "passing" : "failing"}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
