// Single-Node view — Netdata-style per-host deep dive: system charts (CPU
// user/system/iowait, memory, disk I/O, network, load), top processes, and
// per-node alarms.
//
// This screen is not wired to a metrics API yet: the node, its series and
// processes are generated sample data, and the page is labelled as such.
// Live per-host charts live on the server detail page (server-detail).
import React from "react";
import { useNav } from "@/hooks/useNav";
import { Panel, Pill, PillDot, StatCard } from "@/components/ld";
import type { Tone } from "@/components/ld";
import { TimeChart } from "@/components/MetricCharts";
import type { MetricSeries } from "@/api/hooks";
import { wave as sharedWave } from "@/lib/series";
import { Button, Card, Crumbs, Page, Table, cx, ui } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { ClockIcon, CpuIcon, FlaskConicalIcon, RefreshCwIcon, SquareTerminalIcon, TerminalIcon } from "lucide-react";
// Table cells kept the cell's 13px / colour over mono size and (light) status colour.
const cellMono = "font-mono font-semibold";
const cellCrit = "font-semibold dark:text-tone-crit";
// Entity sub-line: items separated by a "|" (inherits the page-head paragraph style).
const entityMeta = "text-base text-fg-muted mt-1 flex flex-wrap gap-x-3.5 gap-y-1 [&_span+span]:before:content-['|'] [&_span+span]:before:mr-3.5 [&_span+span]:before:text-line-strong";
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
    <Card as="section" className={ui.panel} aria-label={`${title} (sample data)`}>
      <div className={ui.panelHead}>
        <h2 className={ui.panelTitle}>{title}</h2>
        <Pill tone="muted">Sample data</Pill>
      </div>
      <TimeChart series={series} startSec={end - (n - 1) * STEP} endSec={end} compact />
    </Card>
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
    <Page>
      <Crumbs items={[{ label: "Home", onClick: () => setRoute("dashboard") }, { label: "Monitoring", onClick: () => setRoute("infra") }, { label: `Node · ${NODE.host}` }]} />

      <div className={cx(ui.head, "!items-start")}>
        <div className="flex items-center gap-3.5 min-w-0">
          <span className="flex-none w-[60px] h-[60px] grid place-items-center text-[46px] text-[#1f2328] dark:text-[#e6edf3]" aria-hidden="true"><Icon icon={TerminalIcon} /></span>
          <div>
            <h1 className={cx(ui.h1, "flex items-center gap-2.5 flex-wrap")}>
              {NODE.host}
              <Pill tone="muted">Sample data</Pill>
            </h1>
            <p className={entityMeta}>
              <span className={ui.mono}>{NODE.ip}</span>
              <span>{NODE.role}</span>
              <span>{NODE.os}</span>
            </p>
          </div>
        </div>
        <div className={ui.headSide}>
          <div className={ui.headActions}>
            <Button><Icon icon={SquareTerminalIcon} /> SSH</Button>
            <Button><Icon icon={RefreshCwIcon} /> 1s refresh</Button>
          </div>
          <ul className={ui.tags} aria-label="Tags">
            <li className={ui.tag}><Icon icon={CpuIcon} /> {NODE.cores} cores</li>
            <li className={ui.tag}><Icon icon={ClockIcon} /> up {NODE.uptime}</li>
          </ul>
        </div>
      </div>

      <Card className="flex items-start gap-3 px-4 py-3 [&_.ld-icon]:text-2xl [&_.ld-icon]:text-fg-muted [&_.ld-icon]:mt-0.5 [&_b]:text-fg" role="note">
        <Icon icon={FlaskConicalIcon} />
        <div>
          <b>Sample data</b>
          <p className="text-fg-muted text-xs">This node view is a layout preview with generated values. Open a server from the asset inventory for live Prometheus charts.</p>
        </div>
      </Card>

      <div className={cx(ui.grid, ui.cols.stats)}>
        <StatCard icon="fa-microchip" tone={cpuNow > 80 ? "crit" : "warn"} label="CPU (sample)" value={`${cpuNow}%`} note={`${NODE.cores} cores · load ${load[load.length - 1]}`} />
        <StatCard icon="fa-memory" tone="warn" label="Memory (sample)" value={`${mem[mem.length - 1]}%`} note={`of ${NODE.ramGb} GB`} />
        <StatCard icon="fa-hard-drive" tone="info" label="Disk I/O (sample)" value={`${Math.round(diskR[diskR.length - 1] + diskW[diskW.length - 1])} MB/s`} note="read + write" />
        <StatCard icon="fa-network-wired" tone="ok" label="Network (sample)" value={`${netIn[netIn.length - 1]} MB/s`} note={`in · ${netOut[netOut.length - 1]} out`} />
      </div>

      <div className={ui.split}>
        <div className={ui.rail}>
          <div className={cx(ui.grid, "grid-cols-[minmax(0,1fr)] min-[900px]:grid-cols-2")}>
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

          <Card as="section" className={ui.panel} aria-labelledby="procs-h">
            <div className={ui.panelHead}>
              <h2 id="procs-h" className={ui.panelTitle}>Top processes</h2>
              <Pill tone="muted">Sample data</Pill>
            </div>
            <Table>
                <thead>
                  <tr><th scope="col">PID</th><th scope="col">Command</th><th scope="col">CPU %</th><th scope="col">Mem %</th><th scope="col">RSS</th></tr>
                </thead>
                <tbody>
                  {PROCS.map((p) => (
                    <tr key={p.pid}>
                      <td className={cellMono}>{p.pid}</td>
                      <td className={cellMono}>{p.cmd}</td>
                      <td className={p.cpu > 100 ? cellCrit : undefined}>{p.cpu}</td>
                      <td>{p.mem}</td>
                      <td>{p.rss}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
          </Card>
        </div>

        <div className={ui.rail}>
          <Card as="section" className={ui.panel} aria-labelledby="alarms-h">
            <div className={ui.panelHead}>
              <h2 id="alarms-h" className={ui.panelTitle}>Node alarms</h2>
              <Pill tone="muted">Sample data</Pill>
            </div>
            <ul className={ui.activity}>
              {ALARMS.map(([id, label, tone]) => (
                <li key={id} className={ui.activityItem}>
                  <Pill tone={tone}><PillDot /><span className="sr-only">{tone}</span></Pill>
                  <span className={ui.activityText}>{label}</span>
                  <span className={cx(ui.mono, "text-fg-muted")}>{id}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Panel title="System">
            <dl className={ui.dl}>
              {facts.map(([l, v]) => (
                <React.Fragment key={l}>
                  <dt>{l}</dt><dd className={ui.mono}>{v}</dd>
                </React.Fragment>
              ))}
            </dl>
          </Panel>
        </div>
      </div>
    </Page>
  );
}
