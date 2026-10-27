// Virtual machines — LinkedEye list layout: fleet summary cards, a cluster
// roll-up, the VM table with state tabs, and a capacity / top-CPU rail.
// Every figure is derived from the VMs hook; each VM opens vm-detail.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { useVms } from "@/api/hooks";
import { Empty, Panel, Pill, PillDot, StatCard, fmt } from "@/components/ld";
import type { Tone } from "@/components/ld";
import { Button, Card, Crumbs, Page, PageHead, Tab, Table, Tabs, TextButton, cx, ui } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { PlusIcon, RadioTowerIcon, RefreshCwIcon } from "lucide-react";
// Mono id link: mono's 12px has to beat the link's 13px.
const monoLink = "font-mono !text-xs font-semibold";
// Table cells / dl values kept the cell's colour and 13px over muted, mono size
// and (light mode) status colours.
const cellMono = "font-mono font-semibold";
const cellWarn = "font-semibold dark:text-tone-warn";
const cellOk = "font-semibold dark:text-tone-ok";
const barColor = (t: Tone) => (t === "crit" ? "#e5383b" : t === "warn" ? "#f5a524" : "#16a34a");

function Usage({ v, warn, crit, label }: { v: number; warn: number; crit: number; label: string }) {
  const t: Tone = v > crit ? "crit" : v > warn ? "warn" : "ok";
  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-block align-middle w-16 h-2 rounded-[5px] bg-bg-muted overflow-hidden" role="img" aria-label={`${label} ${v}%`}>
        <span className={ui.barFill} style={{ width: `${Math.min(100, v)}%`, background: barColor(t) }} />
      </span>
      <b className="text-xs font-semibold min-w-[34px]">{v}%</b>
    </span>
  );
}

const TABS: [string, string][] = [["all", "All VMs"], ["running", "Running"], ["stopped", "Stopped"], ["hot", "Hot · CPU/Mem"]];

const QUICK_ACTIONS: [string, string][] = [
  ["fa-plus", "Provision VM"],
  ["fa-tower-broadcast", "Bulk Migrate"],
  ["fa-camera", "Snapshot"],
  ["fa-pause", "Suspend Dev"],
  ["fa-rotate", "Sync vCenter"],
  ["fa-circle-nodes", "View Topology"],
];

const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((s, x) => s + x, 0) / xs.length) : 0);

export default function InfraVMsScreen() {
  const { setRoute } = useNav();
  const { data } = useVms();
  const vms = data ?? [];
  const [tab, setTab] = React.useState("all");

  const filtered = tab === "all" ? vms : tab === "running" ? vms.filter(v => v.state === "running") : tab === "stopped" ? vms.filter(v => v.state === "stopped") : vms.filter(v => v.cpuUse > 60 || v.memUse > 75);

  const totalVCPU = vms.reduce((s, v) => s + (parseInt(v.cpu) || 0), 0);
  const totalMem = vms.reduce((s, v) => s + (parseInt(v.mem) || 0), 0);
  const runningVms = vms.filter(v => v.state === "running");
  const running = runningVms.length;
  const stopped = vms.filter(v => v.state === "stopped").length;
  const avgCpu = avg(runningVms.map(v => v.cpuUse));
  const avgMem = avg(runningVms.map(v => v.memUse));

  // Cluster roll-up from the VM list: hosts, VM count and the average use of
  // the running VMs in each cluster.
  const clusters = [...new Set(vms.map(v => v.cluster))].map(name => {
    const members = vms.filter(v => v.cluster === name);
    const live = members.filter(v => v.state === "running");
    const cpu = avg(live.map(v => v.cpuUse));
    const mem = avg(live.map(v => v.memUse));
    return { name, hosts: new Set(members.map(v => v.host)).size, vms: members.length, running: live.length, cpu, mem, hot: cpu > 70 || mem > 70 };
  });
  const topCpu = [...runningVms].sort((a, b) => b.cpuUse - a.cpuUse).slice(0, 5);

  return (
    <Page>
      <Crumbs items={[{ label: "Home", onClick: () => setRoute("dashboard") }, { label: "Monitoring", onClick: () => setRoute("infra") }, { label: "Virtual Machines" }]} />

      <PageHead
        title="Virtual Machines"
        subtitle={<>{fmt(vms.length)} VMs in {clusters.length} cluster{clusters.length === 1 ? "" : "s"} · {fmt(totalVCPU)} vCPU · {fmt(totalMem)} GB RAM allocated</>}
        actions={
          <>
            <Button><Icon icon={RefreshCwIcon} /> Sync vCenter</Button>
            <Button><Icon icon={RadioTowerIcon} /> Migrate</Button>
            <Button variant="primary"><Icon icon={PlusIcon} /> Provision VM</Button>
          </>
        }
      />

      <div className={cx(ui.grid, ui.cols[6])}>
        <StatCard icon="fa-play" tone="ok" label="Running" value={fmt(running)} note={`of ${fmt(vms.length)} VMs`} onClick={() => setTab("running")} />
        <StatCard icon="fa-cube" tone="info" label="Total VMs" value={fmt(vms.length)} note={`across ${clusters.length} cluster${clusters.length === 1 ? "" : "s"}`} onClick={() => setTab("all")} />
        <StatCard icon="fa-microchip" tone={avgCpu > 60 ? "warn" : "ok"} label="Avg CPU" value={running ? `${avgCpu}%` : "—"} note="of running VMs" />
        <StatCard icon="fa-memory" tone={avgMem > 75 ? "warn" : "ok"} label="Avg memory" value={running ? `${avgMem}%` : "—"} note="of running VMs" />
        <StatCard icon="fa-fire" tone="warn" label="Hot" value={fmt(vms.filter(v => v.cpuUse > 60 || v.memUse > 75).length)} note="CPU > 60% or mem > 75%" onClick={() => setTab("hot")} />
        <StatCard icon="fa-stop" tone="muted" label="Stopped" value={fmt(stopped)} note="powered off" onClick={() => setTab("stopped")} />
      </div>

      <Panel title={`Clusters (${clusters.length})`}>
        {clusters.length ? (
          <Table>
              <thead>
                <tr><th scope="col">Cluster</th><th scope="col">Hosts</th><th scope="col">VMs</th><th scope="col">Avg CPU (running)</th><th scope="col">Avg RAM (running)</th><th scope="col">Status</th></tr>
              </thead>
              <tbody>
                {clusters.map(c => (
                  <tr key={c.name}>
                    <td className={cellMono}>{c.name}</td>
                    <td>{c.hosts}</td>
                    <td>{c.vms}<span className={ui.sub}>{c.running} running</span></td>
                    <td>{c.running ? <Usage v={c.cpu} warn={70} crit={85} label="CPU" /> : <span className="text-fg-muted">—</span>}</td>
                    <td>{c.running ? <Usage v={c.mem} warn={70} crit={85} label="RAM" /> : <span className="text-fg-muted">—</span>}</td>
                    <td><Pill tone={c.hot ? "warn" : "ok"}><PillDot />{c.hot ? "Degraded" : "Healthy"}</Pill></td>
                  </tr>
                ))}
              </tbody>
            </Table>
        ) : (
          <Empty>No clusters reported yet.</Empty>
        )}
      </Panel>

      <div className={ui.split}>
        <Card as="section" className={ui.panel} aria-labelledby="vms-h">
          <div className={ui.panelHead}>
            <h2 id="vms-h" className={ui.panelTitle}>Virtual machines ({fmt(filtered.length)})</h2>
          </div>
          <Tabs aria-label="Filter VMs by state">
            {TABS.map(([id, l]) => (
              <Tab key={id} active={tab === id} onClick={() => setTab(id)}>{l}</Tab>
            ))}
          </Tabs>
          {filtered.length ? (
            <Table>
                <thead>
                  <tr>
                    <th scope="col">VM</th>
                    <th scope="col"><span className="sr-only">Select</span></th>
                    <th scope="col">Host</th>
                    <th scope="col">Cluster</th>
                    <th scope="col">OS</th>
                    <th scope="col">vCPU / RAM</th>
                    <th scope="col">IP</th>
                    <th scope="col">CPU</th>
                    <th scope="col">Memory</th>
                    <th scope="col">State</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(v => (
                    <tr key={v.id}>
                      <td><TextButton className={monoLink} onClick={() => setRoute("vm-detail", { vmId: v.id })}>{v.id}</TextButton></td>
                      <td><input type="checkbox" aria-label={`Select ${v.id}`} /></td>
                      <td className={cellMono}>{v.host}</td>
                      <td><Pill tone="muted">{v.cluster}</Pill></td>
                      <td>{v.os}</td>
                      <td className={cellMono}>{v.cpu} / {v.mem}</td>
                      <td className={cellMono}>{v.ip}</td>
                      <td>{v.state === "running" ? <Usage v={v.cpuUse} warn={60} crit={75} label="CPU" /> : <span className="text-fg-muted">—</span>}</td>
                      <td>{v.state === "running" ? <Usage v={v.memUse} warn={65} crit={80} label="Memory" /> : <span className="text-fg-muted">—</span>}</td>
                      <td><Pill tone={v.state === "running" ? "ok" : "muted"}><PillDot />{v.state}</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
          ) : (
            <Empty>{vms.length ? "No VMs in this view." : "No VMs reported yet."}</Empty>
          )}
        </Card>

        <div className={ui.rail}>
          <Panel title="Capacity Summary">
            <dl className={ui.dl}>
              <dt>Allocated vCPU</dt><dd><b>{fmt(totalVCPU)}</b> cores</dd>
              <dt>Allocated RAM</dt><dd><b>{fmt(totalMem)}</b> GB</dd>
              <dt>Avg CPU</dt><dd className={avgCpu > 60 ? cellWarn : cellOk}>{running ? `${avgCpu}%` : "—"}</dd>
              <dt>Avg memory</dt><dd className={avgMem > 75 ? cellWarn : cellOk}>{running ? `${avgMem}%` : "—"}</dd>
            </dl>
          </Panel>

          <Panel title="Top by CPU">
            {topCpu.length ? (
              <ul className={ui.bars}>
                {topCpu.map(v => (
                  <li key={v.id} className={ui.barItem}>
                    <span className={ui.barLabel}><TextButton className={monoLink} onClick={() => setRoute("vm-detail", { vmId: v.id })}>{v.id}</TextButton></span>
                    <span className={ui.barTrack}>
                      <span className={ui.barFill} style={{ width: `${Math.min(100, v.cpuUse)}%`, background: barColor(v.cpuUse > 75 ? "crit" : v.cpuUse > 60 ? "warn" : "ok") }} />
                    </span>
                    <span className={ui.barValue}>{v.cpuUse}%</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No running VMs.</Empty>
            )}
          </Panel>

          <Panel title="Quick Actions">
            <div className="grid grid-cols-2 gap-2">
              {QUICK_ACTIONS.map(([ic, lbl]) => (
                <Button key={lbl} size="sm" className="!justify-start"><Icon name={ic} /> {lbl}</Button>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </Page>
  );
}
