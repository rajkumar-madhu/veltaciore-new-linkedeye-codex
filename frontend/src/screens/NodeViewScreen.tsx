// Single-Node view — Netdata-style per-host deep dive: system charts (CPU
// user/system/iowait, memory, disk I/O, network, load), top processes, and
// per-node alarms.
//
// This screen is not wired to a metrics API yet: the node, its series and
// processes are generated sample data, and the page is labelled as such.
// Live per-host charts live on the server detail page (server-detail).
import React from "react";
import "@/styles/infra.css";
import { useNav } from "@/hooks/useNav";
import { Panel, Pill, StatCard } from "@/components/ld";
import type { Tone } from "@/components/ld";
import { TimeChart } from "@/components/MetricCharts";
import type { MetricSeries } from "@/api/hooks";
import { wave as sharedWave } from "@/lib/series";

import { Icon } from "@/components/Icon";
import { ChevronRightIcon, ClockIcon, CpuIcon, FlaskConicalIcon, RefreshCwIcon, SquareTerminalIcon, TerminalIcon } from "lucide-react";
const wave = (seed: number, base: number, amp: number, n?: number) => sharedWave(seed, base, amp, { n, f1: 0.7, f2: 1.6, floor: true });

const NODE = {
  host: "trading-blr07",
  ip: "10.10.10.15",
  role: "OMS core · NSE adapter",
  os: "Ubuntu 22.04 LTS · kernel 6.5.0",
  uptime: "48d 6h",
  cores: 32,
  ramGb: 128,
};

interface Proc { pid: number; cmd: string; cpu: number; mem: number; rss: string; }
const PROCS: Proc[] = [
  { pid: 2841, cmd: "oms-core --nse", cpu: 214.6, mem: 18.2, rss: "23.3 GB" },
  { pid: 3120, cmd: "feed-handler nse", cpu: 96.4, mem: 6.1, rss: "7.8 GB" },
  { pid: 1044, cmd: "node_exporter", cpu: 2.1, mem: 0.3, rss: "384 MB" },
  { pid: 5561, cmd: "rabbitmq-server", cpu: 41.8, mem: 4.4, rss: "5.6 GB" },
  { pid: 7788, cmd: "postgres: writer", cpu: 12.3, mem: 3.2, rss: "4.1 GB" },
  { pid: 9011, cmd: "redis-server", cpu: 8.7, mem: 1.1, rss: "1.4 GB" },
];

const ALARMS: [string, string, Tone][] = [
  ["10m_cpu", "CPU > 80% for 10m", "crit"],
  ["ram_in_use", "RAM in use 76%", "warn"],
  ["disk_space", "/ 48% used", "ok"],
  ["net_drops", "0 packet drops", "ok"],
];

const STEP = 180; // seconds between sample points

/** Turn a sample value array into a chart series ending at `end`. */
function toSeries(key: string, label: string, unit: string, group: string, values: number[], end: number): MetricSeries {
  return { key, label, unit, group, points: values.map((v, i) => [end - (values.length - 1 - i) * STEP, v] as [number, number]) };
}

function SampleChart({ title, series, end }: { title: string; series: MetricSeries[]; end: number }) {
  const n = series[0]?.points.length ?? 1;
  return (
    <section className="ld-card ld-panel" aria-label={`${title} (sample data)`}>
      <div className="ld-panel-head">
        <h2>{title}</h2>
        <Pill tone="muted">Sample data</Pill>
      </div>
      <TimeChart series={series} startSec={end - (n - 1) * STEP} endSec={end} compact />
    </section>
  );
}

export default function NodeViewScreen() {
  const { setRoute } = useNav();
  const end = React.useMemo(() => Math.floor(Date.now() / 1000), []);

  const cpuUser = wave(1, 42, 16);
  const cpuSys = wave(2, 14, 6);
  const cpuWait = wave(3, 6, 4);
  const cpuNow = Math.round(cpuUser[cpuUser.length - 1] + cpuSys[cpuSys.length - 1] + cpuWait[cpuWait.length - 1]);
  const mem = wave(4, 68, 8);
  const diskR = wave(5, 120, 60);
  const diskW = wave(6, 80, 40);
  const netIn = wave(7, 340, 120);
  const netOut = wave(8, 210, 90);
  const load = wave(9, 12, 5);

  const facts: [string, string][] = [
    ["Hostname", NODE.host], ["IP", NODE.ip], ["Cores", `${NODE.cores} vCPU`], ["Memory", `${NODE.ramGb} GB`],
    ["OS", NODE.os], ["Uptime", NODE.uptime], ["Exporter", "node-exporter :9100"],
  ];

  return (
    <div className="ld-dash">
      <nav className="ld-crumbs" aria-label="Breadcrumb">
        <button type="button" className="ld-link" onClick={() => setRoute("dashboard")}>Home</button>
        <Icon icon={ChevronRightIcon} />
        <button type="button" className="ld-link" onClick={() => setRoute("infra")}>Monitoring</button>
        <Icon icon={ChevronRightIcon} />
        <span>Node · {NODE.host}</span>
      </nav>

      <div className="ld-head ld-entity-head">
        <div className="ld-entity">
          <span className="ld-os-logo ld-os-linux" aria-hidden="true"><Icon icon={TerminalIcon} /></span>
          <div>
            <h1 className="ld-entity-title">
              {NODE.host}
              <Pill tone="muted">Sample data</Pill>
            </h1>
            <p className="ld-entity-meta">
              <span className="ld-mono">{NODE.ip}</span>
              <span>{NODE.role}</span>
              <span>{NODE.os}</span>
            </p>
          </div>
        </div>
        <div className="ld-head-side">
          <div className="ld-head-actions">
            <button type="button" className="ld-btn"><Icon icon={SquareTerminalIcon} /> SSH</button>
            <button type="button" className="ld-btn"><Icon icon={RefreshCwIcon} /> 1s refresh</button>
          </div>
          <ul className="ld-tags" aria-label="Tags">
            <li className="ld-tag"><Icon icon={CpuIcon} /> {NODE.cores} cores</li>
            <li className="ld-tag"><Icon icon={ClockIcon} /> up {NODE.uptime}</li>
          </ul>
        </div>
      </div>

      <div className="ld-card ld-infra-sample" role="note">
        <Icon icon={FlaskConicalIcon} />
        <div>
          <b>Sample data</b>
          <p className="ld-muted ld-small">This node view is a layout preview with generated values. Open a server from the asset inventory for live Prometheus charts.</p>
        </div>
      </div>

      <div className="ld-grid ld-grid-stats">
        <StatCard icon="fa-microchip" tone={cpuNow > 80 ? "crit" : "warn"} label="CPU (sample)" value={`${cpuNow}%`} note={`${NODE.cores} cores · load ${load[load.length - 1]}`} />
        <StatCard icon="fa-memory" tone="warn" label="Memory (sample)" value={`${mem[mem.length - 1]}%`} note={`of ${NODE.ramGb} GB`} />
        <StatCard icon="fa-hard-drive" tone="info" label="Disk I/O (sample)" value={`${Math.round(diskR[diskR.length - 1] + diskW[diskW.length - 1])} MB/s`} note="read + write" />
        <StatCard icon="fa-network-wired" tone="ok" label="Network (sample)" value={`${netIn[netIn.length - 1]} MB/s`} note={`in · ${netOut[netOut.length - 1]} out`} />
      </div>

      <div className="ld-split">
        <div className="ld-rail">
          <div className="ld-chart-grid ld-grid">
            <SampleChart title="CPU utilization" end={end} series={[
              toSeries("cpu_user", "user", "%", "cpu", cpuUser, end),
              toSeries("cpu_system", "system", "%", "cpu", cpuSys, end),
              toSeries("cpu_iowait", "iowait", "%", "cpu", cpuWait, end),
            ]} />
            <SampleChart title={`Memory · ${NODE.ramGb} GB total`} end={end} series={[toSeries("mem_pct", "used", "%", "memory", mem, end)]} />
            <SampleChart title="Disk I/O" end={end} series={[
              toSeries("disk_read", "read", "MB/s", "disk_io", diskR, end),
              toSeries("disk_write", "write", "MB/s", "disk_io", diskW, end),
            ]} />
            <SampleChart title="Network" end={end} series={[
              toSeries("net_rx", "in", "MB/s", "network", netIn, end),
              toSeries("net_tx", "out", "MB/s", "network", netOut, end),
            ]} />
          </div>

          <section className="ld-card ld-panel" aria-labelledby="procs-h">
            <div className="ld-panel-head">
              <h2 id="procs-h">Top processes</h2>
              <Pill tone="muted">Sample data</Pill>
            </div>
            <div className="ld-table-wrap">
              <table className="ld-table">
                <thead>
                  <tr><th scope="col">PID</th><th scope="col">Command</th><th scope="col">CPU %</th><th scope="col">Mem %</th><th scope="col">RSS</th></tr>
                </thead>
                <tbody>
                  {PROCS.map((p) => (
                    <tr key={p.pid}>
                      <td className="ld-mono ld-muted">{p.pid}</td>
                      <td className="ld-mono">{p.cmd}</td>
                      <td className={p.cpu > 100 ? "ld-text-crit" : undefined}>{p.cpu}</td>
                      <td className="ld-muted">{p.mem}</td>
                      <td className="ld-muted">{p.rss}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="ld-rail">
          <section className="ld-card ld-panel" aria-labelledby="alarms-h">
            <div className="ld-panel-head">
              <h2 id="alarms-h">Node alarms</h2>
              <Pill tone="muted">Sample data</Pill>
            </div>
            <ul className="ld-activity">
              {ALARMS.map(([id, label, tone]) => (
                <li key={id}>
                  <Pill tone={tone}><span className="ld-pill-dot" /><span className="sr-only">{tone}</span></Pill>
                  <span className="ld-activity-text">{label}</span>
                  <span className="ld-mono ld-muted">{id}</span>
                </li>
              ))}
            </ul>
          </section>

          <Panel title="System">
            <dl className="ld-dl">
              {facts.map(([l, v]) => (
                <React.Fragment key={l}>
                  <dt>{l}</dt><dd className="ld-mono">{v}</dd>
                </React.Fragment>
              ))}
            </dl>
          </Panel>
        </div>
      </div>
    </div>
  );
}
