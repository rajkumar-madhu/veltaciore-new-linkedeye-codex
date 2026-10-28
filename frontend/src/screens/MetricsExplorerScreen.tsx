// Metrics Explorer — ad-hoc metric querying & graphing, the core of any
// metrics tool (Datadog Metrics Explorer / Netdata): a query bar (metric · tag
// filter · aggregation · rollup), a large multi-series time-series chart, a
// metric catalog rail, and a small-multiples grid of the group-by breakdown.
// There is no ad-hoc query API yet (device pages read Prometheus per device),
// so the series are a labelled, deterministic sample.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { Panel, StatCard, fmt } from "@/components/ld";
import { Button, Card, Crumbs, Page, PageHead, Select, cx, ui } from "@/components/ui";
import { COLORS, Sparkline, TimeChart, fmtValue } from "@/components/MetricCharts";
import type { MetricSeries } from "@/api/hooks";

import { Icon } from "@/components/Icon";
import { FilterIcon, FlaskConicalIcon, PlusIcon, Share2Icon } from "lucide-react";
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

const N_POINTS = 24;
// Deterministic pseudo-series so the sample charts are stable between renders.
const wave = (seed: number, base: number, amp: number) =>
  Array.from({ length: N_POINTS }, (_, i) => Math.round((base + amp * Math.sin(i * 0.9 + seed) + amp * 0.4 * Math.cos(i * 1.7 + seed)) * 10) / 10);

const HOSTS = ["kvm1", "kvm2", "kvm3", "edge-01"];
const seg = "inline-flex flex-wrap gap-1";
const tiles = "grid gap-3 grid-cols-[repeat(auto-fill,minmax(220px,1fr))]";
const tile = "flex flex-col gap-1.5 min-w-0 px-3.5 py-3 border border-line-subtle rounded bg-bg-raised";
// Metric catalog rail: bleeds to the panel edges; namespace headings in small caps.
const catalog = "flex flex-col max-h-[520px] overflow-y-auto -mx-4.5 [&_h3]:px-4.5 [&_h3]:pt-2.5 [&_h3]:pb-1 [&_h3]:text-2xs [&_h3]:font-bold [&_h3]:tracking-[0.05em] [&_h3]:uppercase [&_h3]:text-fg-muted";
const option = "block w-full text-left text-sm text-fg border-b border-line-subtle px-4.5 py-2 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:-outline-offset-2";
const RANGES: Record<string, number> = { "15m": 900, "1h": 3600, "4h": 14400, "1d": 86400 };
const AGGS = ["avg", "max", "sum", "p95"] as const;

export default function MetricsExplorerScreen() {
  const { setRoute } = useNav();
  const idp = React.useId();
  const [metric, setMetric] = React.useState("system.cpu.user");
  const [agg, setAgg] = React.useState<"avg" | "max" | "sum" | "p95">("avg");
  const [groupBy, setGroupBy] = React.useState("host");
  const [range, setRange] = React.useState("1h");

  const meta = METRICS.flatMap((g) => g.items).find((i) => i.m === metric);
  const unit = meta?.unit || "count";
  // Per-host series for the selected metric (seeded on the metric name length).
  const seed = metric.length;
  const perHost = HOSTS.map((_, i) => wave(seed + i, 40 + i * 8, 14 + i * 2));
  const aggregate = perHost[0].map((_, t) => {
    const col = perHost.map((s) => s[t]);
    if (agg === "max") return Math.max(...col);
    if (agg === "sum") return Math.round(col.reduce((a, b) => a + b, 0));
    if (agg === "p95") return Math.round(Math.max(...col) * 0.97);
    return Math.round((col.reduce((a, b) => a + b, 0) / col.length) * 10) / 10;
  });
  const latest = aggregate[aggregate.length - 1];
  const peak = Math.max(...aggregate);

  // Sample timestamps: N_POINTS samples spread across the selected range.
  const end = Math.floor(Date.now() / 1000);
  const span = RANGES[range] ?? 3600;
  const start = end - span;
  const series: MetricSeries[] = HOSTS.map((h, i) => ({
    key: h, label: h, unit, group: "explore",
    points: perHost[i].map((v, j) => [Math.round(start + (j * span) / (N_POINTS - 1)), v] as [number, number]),
  }));

  const query = `${agg}:${metric}{tenant:fyers} by {${groupBy}}`;

  return (
    <Page>
      <Crumbs items={[{ label: "Home", onClick: () => setRoute("dashboard") }, { label: "Metrics Explorer" }]} />

      <PageHead
        title="Metrics Explorer"
        subtitle={<>Ad-hoc query across tenant infrastructure · {METRICS.reduce((s, g) => s + g.items.length, 0)} metrics in the catalog</>}
        actions={<>
          <Button><Icon icon={Share2Icon} /> Share</Button>
          <Button variant="primary"><Icon icon={PlusIcon} /> Add to dashboard</Button>
        </>}
      />

      <Card className={ui.notice} role="note">
        <Icon icon={FlaskConicalIcon} />
        <div>
          <b>Sample data</b>
          <p className="text-fg-muted text-xs">Ad-hoc metric queries are not connected yet; the series below are illustrative. Live Prometheus graphs are on each server and VM page.</p>
        </div>
      </Card>

      {/* Query bar */}
      <div className={cx(ui.card, ui.filters)}>
        <div className={ui.filterField}>
          <label htmlFor={`${idp}-metric`}>Metric</label>
          <Select id={`${idp}-metric`} value={metric} onChange={(e) => setMetric(e.target.value)}>
            {METRICS.map((g) => (
              <optgroup key={g.ns} label={g.ns}>
                {g.items.map((i) => <option key={i.m} value={i.m}>{i.m}</option>)}
              </optgroup>
            ))}
          </Select>
        </div>
        <div className={ui.filterField}>
          <span>From</span>
          <span className={ui.tag}><Icon icon={FilterIcon} /> tenant:fyers</span>
        </div>
        <div className={ui.filterField}>
          <span id={`${idp}-agg`}>Aggregate</span>
          <span className={seg} role="group" aria-labelledby={`${idp}-agg`}>
            {AGGS.map((a) => (
              <Button key={a} size="sm" variant={agg === a ? "primary" : "default"} aria-pressed={agg === a} onClick={() => setAgg(a)}>{a}</Button>
            ))}
          </span>
        </div>
        <div className={ui.filterField}>
          <label htmlFor={`${idp}-group`}>Group by</label>
          <Select id={`${idp}-group`} value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
            <option value="host">host</option>
            <option value="datacenter">datacenter</option>
            <option value="service">service</option>
          </Select>
        </div>
        <div className={ui.filterField}>
          <span id={`${idp}-range`}>Time range</span>
          <span className={seg} role="group" aria-labelledby={`${idp}-range`}>
            {Object.keys(RANGES).map((r) => (
              <Button key={r} size="sm" variant={range === r ? "primary" : "default"} aria-pressed={range === r} onClick={() => setRange(r)}>{r}</Button>
            ))}
          </span>
        </div>
        <div className={cx(ui.filterField, ui.fieldGrow)}>
          <span>Query</span>
          <code className="font-mono text-xs px-2.5 py-2 rounded bg-bg-muted text-fg [overflow-wrap:anywhere]">{query}</code>
        </div>
      </div>

      <div className={ui.split}>
        <div className={ui.rail}>
          <div className={cx(ui.grid, ui.cols.stats)}>
            <StatCard icon="fa-chart-line" tone="info" label={`Current (${agg})`} value={fmtValue(latest, unit)} note={metric} />
            <StatCard icon="fa-arrow-up" tone="warn" label="Peak in range" value={fmtValue(peak, unit)} note={`over ${range}`} />
            <StatCard icon="fa-layer-group" tone="purple" label="Series" value={fmt(HOSTS.length)} note={`by ${groupBy}`} />
            <StatCard icon="fa-database" tone="ok" label="Data points" value={fmt(HOSTS.length * N_POINTS)} note={`${N_POINTS} per series`} />
          </div>

          <Panel title={`${metric}${meta?.desc ? ` — ${meta.desc}` : ""}`}>
            <TimeChart series={series} startSec={start} endSec={end} />
          </Panel>

          <Panel title={`Breakdown by ${groupBy} · ${HOSTS.length} series`}>
            <div className={tiles}>
              {HOSTS.map((h, i) => {
                const s = series[i];
                const cur = s.points[s.points.length - 1][1];
                return (
                  <div key={h} className={tile}>
                    <span className="flex justify-between items-baseline gap-2">
                      <span className={ui.mono}>{h}</span>
                      <b style={{ color: COLORS[i % COLORS.length] }}>{fmtValue(cur, unit)}</b>
                    </span>
                    <Sparkline points={s.points} color={COLORS[i % COLORS.length]} label={`${h} ${metric} (sample)`} />
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>

        <Panel title="Metric catalog">
          <div className={catalog}>
            {METRICS.map((g) => (
              <div key={g.ns} role="group" aria-label={g.ns}>
                <h3>{g.ns}</h3>
                {g.items.map((i) => (
                  <button key={i.m} type="button" className={cx(option, metric === i.m ? "bg-info-bg font-bold" : "bg-bg-raised hover:bg-bg-hover")} aria-pressed={metric === i.m} onClick={() => setMetric(i.m)}>
                    <span className={ui.mono}>{i.m}</span>
                    <span className={cx(ui.sub, "font-normal")}>{i.desc}{i.unit && ` · ${i.unit}`}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </Page>
  );
}
