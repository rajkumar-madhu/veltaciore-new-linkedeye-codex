// Virtual machines — LinkedEye list layout: fleet summary cards, a cluster
// roll-up, the VM table with state tabs, and a capacity / top-CPU rail.
// Every figure is derived from the VMs hook; each VM opens vm-detail.
import React from "react";
import "@/styles/infra.css";
import { useNav } from "@/hooks/useNav";
import { useVms } from "@/api/hooks";
import { Empty, Panel, Pill, StatCard, fmt } from "@/components/ld";
import type { Tone } from "@/components/ld";

import { Icon } from "@/components/Icon";
import { ChevronRightIcon, PlusIcon, RadioTowerIcon, RefreshCwIcon } from "lucide-react";
const barColor = (t: Tone) => (t === "crit" ? "#e5383b" : t === "warn" ? "#f5a524" : "#16a34a");

function Usage({ v, warn, crit, label }: { v: number; warn: number; crit: number; label: string }) {
  const t: Tone = v > crit ? "crit" : v > warn ? "warn" : "ok";
  return (
    <span className="ld-infra-usage">
      <span className="ld-bar-track ld-bar-inline" role="img" aria-label={`${label} ${v}%`}>
        <span className="ld-bar-fill" style={{ width: `${Math.min(100, v)}%`, background: barColor(t) }} />
      </span>
      <b>{v}%</b>
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
    <div className="ld-dash">
      <nav className="ld-crumbs" aria-label="Breadcrumb">
        <button type="button" className="ld-link" onClick={() => setRoute("dashboard")}>Home</button>
        <Icon icon={ChevronRightIcon} />
        <button type="button" className="ld-link" onClick={() => setRoute("infra")}>Monitoring</button>
        <Icon icon={ChevronRightIcon} />
        <span>Virtual Machines</span>
      </nav>

      <div className="ld-head">
        <div>
          <h1>Virtual Machines</h1>
          <p>{fmt(vms.length)} VMs in {clusters.length} cluster{clusters.length === 1 ? "" : "s"} · {fmt(totalVCPU)} vCPU · {fmt(totalMem)} GB RAM allocated</p>
        </div>
        <div className="ld-head-actions">
          <button type="button" className="ld-btn"><Icon icon={RefreshCwIcon} /> Sync vCenter</button>
          <button type="button" className="ld-btn"><Icon icon={RadioTowerIcon} /> Migrate</button>
          <button type="button" className="ld-btn ld-btn-primary"><Icon icon={PlusIcon} /> Provision VM</button>
        </div>
      </div>

      <div className="ld-grid ld-grid-stats ld-grid-6">
        <StatCard icon="fa-play" tone="ok" label="Running" value={fmt(running)} note={`of ${fmt(vms.length)} VMs`} onClick={() => setTab("running")} />
        <StatCard icon="fa-cube" tone="info" label="Total VMs" value={fmt(vms.length)} note={`across ${clusters.length} cluster${clusters.length === 1 ? "" : "s"}`} onClick={() => setTab("all")} />
        <StatCard icon="fa-microchip" tone={avgCpu > 60 ? "warn" : "ok"} label="Avg CPU" value={running ? `${avgCpu}%` : "—"} note="of running VMs" />
        <StatCard icon="fa-memory" tone={avgMem > 75 ? "warn" : "ok"} label="Avg memory" value={running ? `${avgMem}%` : "—"} note="of running VMs" />
        <StatCard icon="fa-fire" tone="warn" label="Hot" value={fmt(vms.filter(v => v.cpuUse > 60 || v.memUse > 75).length)} note="CPU > 60% or mem > 75%" onClick={() => setTab("hot")} />
        <StatCard icon="fa-stop" tone="muted" label="Stopped" value={fmt(stopped)} note="powered off" onClick={() => setTab("stopped")} />
      </div>

      <Panel title={`Clusters (${clusters.length})`}>
        {clusters.length ? (
          <div className="ld-table-wrap">
            <table className="ld-table">
              <thead>
                <tr><th scope="col">Cluster</th><th scope="col">Hosts</th><th scope="col">VMs</th><th scope="col">Avg CPU (running)</th><th scope="col">Avg RAM (running)</th><th scope="col">Status</th></tr>
              </thead>
              <tbody>
                {clusters.map(c => (
                  <tr key={c.name}>
                    <td className="ld-mono">{c.name}</td>
                    <td>{c.hosts}</td>
                    <td>{c.vms}<span className="ld-sub">{c.running} running</span></td>
                    <td>{c.running ? <Usage v={c.cpu} warn={70} crit={85} label="CPU" /> : <span className="ld-muted">—</span>}</td>
                    <td>{c.running ? <Usage v={c.mem} warn={70} crit={85} label="RAM" /> : <span className="ld-muted">—</span>}</td>
                    <td><Pill tone={c.hot ? "warn" : "ok"}><span className="ld-pill-dot" />{c.hot ? "Degraded" : "Healthy"}</Pill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>No clusters reported yet.</Empty>
        )}
      </Panel>

      <div className="ld-split">
        <section className="ld-card ld-panel" aria-labelledby="vms-h">
          <div className="ld-panel-head">
            <h2 id="vms-h">Virtual machines ({fmt(filtered.length)})</h2>
          </div>
          <div className="ld-tabs" role="tablist" aria-label="Filter VMs by state">
            {TABS.map(([id, l]) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} className={`ld-tab${tab === id ? " active" : ""}`} onClick={() => setTab(id)}>{l}</button>
            ))}
          </div>
          {filtered.length ? (
            <div className="ld-table-wrap">
              <table className="ld-table">
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
                      <td><button type="button" className="ld-link ld-mono" onClick={() => setRoute("vm-detail", { vmId: v.id })}>{v.id}</button></td>
                      <td><input type="checkbox" aria-label={`Select ${v.id}`} /></td>
                      <td className="ld-muted ld-mono">{v.host}</td>
                      <td><Pill tone="muted">{v.cluster}</Pill></td>
                      <td>{v.os}</td>
                      <td className="ld-mono">{v.cpu} / {v.mem}</td>
                      <td className="ld-mono">{v.ip}</td>
                      <td>{v.state === "running" ? <Usage v={v.cpuUse} warn={60} crit={75} label="CPU" /> : <span className="ld-muted">—</span>}</td>
                      <td>{v.state === "running" ? <Usage v={v.memUse} warn={65} crit={80} label="Memory" /> : <span className="ld-muted">—</span>}</td>
                      <td><Pill tone={v.state === "running" ? "ok" : "muted"}><span className="ld-pill-dot" />{v.state}</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>{vms.length ? "No VMs in this view." : "No VMs reported yet."}</Empty>
          )}
        </section>

        <div className="ld-rail">
          <Panel title="Capacity Summary">
            <dl className="ld-dl">
              <dt>Allocated vCPU</dt><dd><b>{fmt(totalVCPU)}</b> cores</dd>
              <dt>Allocated RAM</dt><dd><b>{fmt(totalMem)}</b> GB</dd>
              <dt>Avg CPU</dt><dd className={avgCpu > 60 ? "ld-text-warn" : "ld-text-ok"}>{running ? `${avgCpu}%` : "—"}</dd>
              <dt>Avg memory</dt><dd className={avgMem > 75 ? "ld-text-warn" : "ld-text-ok"}>{running ? `${avgMem}%` : "—"}</dd>
            </dl>
          </Panel>

          <Panel title="Top by CPU">
            {topCpu.length ? (
              <ul className="ld-bars">
                {topCpu.map(v => (
                  <li key={v.id}>
                    <span className="ld-bar-label"><button type="button" className="ld-link ld-mono" onClick={() => setRoute("vm-detail", { vmId: v.id })}>{v.id}</button></span>
                    <span className="ld-bar-track">
                      <span className="ld-bar-fill" style={{ width: `${Math.min(100, v.cpuUse)}%`, background: barColor(v.cpuUse > 75 ? "crit" : v.cpuUse > 60 ? "warn" : "ok") }} />
                    </span>
                    <span className="ld-bar-value">{v.cpuUse}%</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No running VMs.</Empty>
            )}
          </Panel>

          <Panel title="Quick Actions">
            <div className="ld-infra-actions">
              {QUICK_ACTIONS.map(([ic, lbl]) => (
                <button key={lbl} type="button" className="ld-btn ld-btn-sm"><Icon className={`fa-solid ${ic}`} /> {lbl}</button>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
