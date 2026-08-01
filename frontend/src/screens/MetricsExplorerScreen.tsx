// Metrics Explorer — ad-hoc metric querying & graphing, the core of any
// metrics tool (Datadog Metrics Explorer / Netdata). Light-theme, house style:
// a query bar (metric · tag filter · aggregation · rollup), a large multi-series
// time-series chart, a metric catalog rail, and a small-multiples grid of the
// group-by breakdown. Data is illustrative but internally consistent.
import React from "react";
import { Kpi, FormSection } from "@/components/primitives";
import { LineChart, TIME_LABELS } from "@/components/deviceDetail";
import { wave as sharedWave } from "@/lib/series";

// A small catalog of on-prem infrastructure metrics, grouped by namespace.
const METRICS: { ns: string; items: { m: string; unit: string; desc: string }[] }[] = [
  { ns: "system", items: [
    { m: "system.cpu.user", unit: "%", desc: "CPU time in user space" },
    { m: "system.cpu.iowait", unit: "%", desc: "CPU time waiting on I/O" },
    { m: "system.mem.used", unit: "%", desc: "Used physical memory" },
    { m: "system.load.1", unit: "", desc: "1-minute load average" },
    { m: "system.disk.in_use", unit: "%", desc: "Disk space in use" },
    { m: "system.net.bytes_rcvd", unit: "MB/s", desc: "Bytes received per NIC" },
  ] },
  { ns: "network", items: [
    { m: "net.fortigate.sessions", unit: "", desc: "FortiGate session table size" },
    { m: "net.switch.if_errors", unit: "/s", desc: "Interface errors per second" },
    { m: "net.tcp.retrans", unit: "%", desc: "TCP retransmit ratio" },
  ] },
  { ns: "trading", items: [
    { m: "oms.order.latency.p99", unit: "µs", desc: "Order round-trip p99 latency" },
    { m: "mq.queue.depth", unit: "", desc: "Message queue backlog depth" },
    { m: "feed.nse.gap", unit: "ms", desc: "NSE feed sequence gap" },
  ] },
];

// Deterministic pseudo-series so charts look alive without Math.random.
const wave = (seed: number, base: number, amp: number) => sharedWave(seed, base, amp, { f1: 0.9, f2: 1.7 });

const HOSTS = ["kvm1", "kvm2", "kvm3", "edge-01"];
const HOST_COLORS = ["#2563eb", "#f59e0b", "#10b981", "#8b5cf6"];

export default function MetricsExplorerScreen() {
  const [metric, setMetric] = React.useState("system.cpu.user");
  const [agg, setAgg] = React.useState<"avg" | "max" | "sum" | "p95">("avg");
  const [groupBy, setGroupBy] = React.useState("host");
  const [range, setRange] = React.useState("1h");
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const toggle = (id: string) => setCollapsed((c) => ({ ...c, [id]: !c[id] }));

  const meta = METRICS.flatMap((g) => g.items).find((i) => i.m === metric);
  // Per-host series for the selected metric (seeded on the metric name length).
  const seed = metric.length;
  const perHost = HOSTS.map((_, i) => wave(seed + i, 40 + i * 8, 14 + i * 2));
  const aggregate = TIME_LABELS.map((_, t) => {
    const col = perHost.map((s) => s[t]);
    if (agg === "max") return Math.max(...col);
    if (agg === "sum") return Math.round(col.reduce((a, b) => a + b, 0));
    if (agg === "p95") return Math.round(Math.max(...col) * 0.97);
    return Math.round((col.reduce((a, b) => a + b, 0) / col.length) * 10) / 10;
  });
  const latest = aggregate[aggregate.length - 1];
  const peak = Math.max(...aggregate);
  const yTicks = [`${peak}`, `${Math.round(peak / 2)}`, "0"];

  const query = `${agg}:${metric}{tenant:fyers} by {${groupBy}}`;

  return (
    <div className="page page-fade sn-dash">
      <div className="sn-breadcrumb">
        <a className="sn-link">Home</a><span className="sn-bc-sep">›</span>
        <a className="sn-link">Observe</a><span className="sn-bc-sep">›</span>
        <span>Metrics Explorer</span>
      </div>

      <div className="sn-form-header">
        <div className="sn-form-title-row">
          <span className="sn-rec-number">METRICS</span>
          <span className="sn-pill state-neutral"><i className="fa-solid fa-chart-line" /> {METRICS.reduce((s, g) => s + g.items.length, 0)} metrics</span>
          <span className="sn-pill svc-healthy"><i className="fa-solid fa-database" /> 1s granularity</span>
        </div>
        <div className="sn-form-title-meta">
          <div>
            <h1>Metrics Explorer</h1>
            <div className="sn-form-sub">Ad-hoc query across tenant infrastructure · retained 15 months · last scrape 1s ago</div>
          </div>
          <div className="sn-form-actions">
            <button className="sn-btn"><i className="fa-solid fa-clock-rotate-left" /> {range}</button>
            <button className="sn-btn"><i className="fa-solid fa-share-nodes" /> Share</button>
            <button className="sn-btn primary"><i className="fa-solid fa-plus" /> Add to dashboard</button>
          </div>
        </div>
      </div>

      {/* Query bar */}
      <div className="card" style={{ margin: "16px 24px 0", background: "white", border: "1px solid #e5e8eb", borderRadius: 6, padding: "14px 18px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
          <QField label="Metric">
            <select value={metric} onChange={(e) => setMetric(e.target.value)} className="mx-input" style={{ minWidth: 220 }}>
              {METRICS.map((g) => (
                <optgroup key={g.ns} label={g.ns}>
                  {g.items.map((i) => <option key={i.m} value={i.m}>{i.m}</option>)}
                </optgroup>
              ))}
            </select>
          </QField>
          <QField label="From">
            <span className="mx-tag"><i className="fa-solid fa-filter" style={{ fontSize: 9 }} /> tenant:fyers</span>
          </QField>
          <QField label="Aggregate">
            <div className="mx-seg">
              {(["avg", "max", "sum", "p95"] as const).map((a) => (
                <button key={a} className={agg === a ? "on" : ""} onClick={() => setAgg(a)}>{a}</button>
              ))}
            </div>
          </QField>
          <QField label="Group by">
            <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} className="mx-input">
              <option value="host">host</option>
              <option value="datacenter">datacenter</option>
              <option value="service">service</option>
            </select>
          </QField>
          <QField label="Time range">
            <div className="mx-seg">
              {["15m", "1h", "4h", "1d"].map((r) => (
                <button key={r} className={range === r ? "on" : ""} onClick={() => setRange(r)}>{r}</button>
              ))}
            </div>
          </QField>
          <span style={{ flex: 1 }} />
          <code className="mx-query"><i className="fa-solid fa-terminal" style={{ opacity: 0.5, marginRight: 6 }} />{query}</code>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16, padding: "16px 24px 24px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          {/* KPI strip */}
          <div className="sn-kpi-strip">
            <Kpi l={`Current (${agg})`} v={<>{latest}<span style={{ fontSize: 13, color: "#8a94a3" }}> {meta?.unit}</span></>} s={metric} tone="neutral" />
            <Kpi l="Peak in range" v={<>{peak}<span style={{ fontSize: 13, color: "#8a94a3" }}> {meta?.unit}</span></>} s={`over ${range}`} tone="warn" />
            <Kpi l="Series" v={HOSTS.length} s={`by ${groupBy}`} tone="neutral" />
            <Kpi l="Data points" v="3,600" s="1s × 1h" tone="ok" />
          </div>

          {/* Primary chart */}
          <div className="card" style={{ background: "white", border: "1px solid #e5e8eb", borderRadius: 6, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <b style={{ fontSize: 13.5 }}>{metric}</b>
                <span style={{ color: "#8a94a3", fontSize: 12, marginLeft: 8 }}>{meta?.desc}</span>
              </div>
              <div style={{ display: "flex", gap: 14, fontSize: 11 }}>
                {HOSTS.map((h, i) => (
                  <span key={h} style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#475467" }}>
                    <span style={{ width: 9, height: 3, borderRadius: 2, background: HOST_COLORS[i] }} /> {h}
                  </span>
                ))}
              </div>
            </div>
            <LineChart series={perHost} colors={HOST_COLORS} h={200} yTicks={yTicks} />
          </div>

          {/* Small multiples — the group-by breakdown */}
          <FormSection id="breakdown" title={`Breakdown by ${groupBy}`} badge={`${HOSTS.length} series`} collapsed={collapsed.breakdown} onToggle={toggle}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12, padding: 14 }}>
              {HOSTS.map((h, i) => {
                const s = perHost[i];
                const cur = s[s.length - 1];
                return (
                  <div key={h} style={{ border: "1px solid #eef1f4", borderRadius: 6, padding: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                      <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: "#0f1c3f" }}>{h}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: HOST_COLORS[i] }}>{cur}<span style={{ fontSize: 10, color: "#8a94a3" }}> {meta?.unit}</span></span>
                    </div>
                    <LineChart series={[s]} colors={[HOST_COLORS[i]]} h={56} />
                  </div>
                );
              })}
            </div>
          </FormSection>
        </div>

        {/* Metric catalog rail */}
        <aside style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="card" style={{ background: "white", border: "1px solid #e5e8eb", borderRadius: 6, overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid #eef1f4", fontWeight: 700, fontSize: 12.5, display: "flex", alignItems: "center", gap: 8 }}>
              <i className="fa-solid fa-layer-group" style={{ color: "var(--accent)" }} /> Metric catalog
            </div>
            <div style={{ maxHeight: 520, overflowY: "auto" }}>
              {METRICS.map((g) => (
                <div key={g.ns}>
                  <div style={{ padding: "8px 14px 4px", fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.4, color: "#8a94a3", fontWeight: 700 }}>{g.ns}</div>
                  {g.items.map((i) => (
                    <div key={i.m} onClick={() => setMetric(i.m)}
                      style={{ padding: "7px 14px", cursor: "pointer", background: metric === i.m ? "#eff6ff" : undefined, borderLeft: metric === i.m ? "3px solid var(--accent)" : "3px solid transparent" }}>
                      <div className="mono" style={{ fontSize: 11.5, color: metric === i.m ? "#1d4ed8" : "#0f1c3f", fontWeight: metric === i.m ? 700 : 500 }}>{i.m}</div>
                      <div style={{ fontSize: 10.5, color: "#8a94a3" }}>{i.desc}{i.unit && ` · ${i.unit}`}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function QField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontSize: 10.5, fontWeight: 700, color: "#8a94a3", textTransform: "uppercase", letterSpacing: 0.3 }}>{label}</span>
      {children}
    </div>
  );
}
