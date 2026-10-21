// VM Details — LinkedEye layout: VM header with state and tags, summary cards,
// VM information, resource utilization, the host device, other VMs on the
// same host and the host's alerts. Live from useVms / useDevice /
// useInfraAlerts, falling back to the seed inventory like the VM list does.
// Power, console and snapshot controls need the vCenter integration, which
// is not connected, so they are not shown.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { useUiStore } from "@/store/ui";
import { useDevice, useInfraAlerts, useVms } from "@/api/hooks";
import { DEVICES, VMS } from "@/data/infra";
import { Empty, Panel, Pill, StatCard } from "@/components/ld";
import { VmMetrics } from "@/components/MetricCharts";
import type { Tone } from "@/components/ld";

const STATE_TONE: Record<string, Tone> = { running: "ok", stopped: "muted", suspended: "warn", error: "crit" };
const HOST_STATUS: Record<string, string> = { ok: "Healthy", warn: "Warning", critical: "Critical", down: "Down", unknown: "Unknown" };
const loadTone = (v: number): Tone => (v >= 85 ? "crit" : v >= 70 ? "warn" : "ok");
const barColor = (v: number) => (v >= 85 ? "#e5383b" : v >= 70 ? "#f5a524" : "#16a34a");

function UsageBar({ label, value }: { label: string; value: number }) {
  return (
    <li>
      <span className="ld-bar-label">{label}</span>
      <span className="ld-bar-track" role="img" aria-label={`${label} ${value}%`}>
        <span className="ld-bar-fill" style={{ width: `${Math.min(100, value)}%`, background: barColor(value) }} />
      </span>
      <span className="ld-bar-value">{value}%</span>
    </li>
  );
}

export default function VmDetailScreen() {
  const { setRoute } = useNav();
  const vmId = useUiStore((s) => s.params.vmId as string | undefined);
  const vms = useVms().data ?? VMS;
  const vm = vms.find((v) => v.id === vmId) ?? vms[0];
  const { data: liveHost } = useDevice(vm?.host);
  const host = liveHost ?? DEVICES.find((d) => d.id === vm?.host);
  const alerts = (useInfraAlerts().data ?? []).filter((a) => a.device === vm?.host);

  if (!vm) {
    return (
      <div className="ld-dash">
        <div className="ld-card"><Empty>No virtual machines found.</Empty></div>
      </div>
    );
  }

  const siblings = vms.filter((v) => v.host === vm.host && v.id !== vm.id);
  const openVm = (id: string) => setRoute("vm-detail", { vmId: id });
  const openHost = () => setRoute("infra-device", { deviceId: vm.host });

  return (
    <div className="ld-dash">
      <nav className="ld-crumbs" aria-label="Breadcrumb">
        <button type="button" className="ld-link" onClick={() => setRoute("infra-vms")}>Virtual Machines</button>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <span>VM details</span>
      </nav>

      <div className="ld-head ld-entity-head">
        <div className="ld-entity">
          <span className="ld-tile ld-info" aria-hidden="true"><i className="fa-solid fa-cube" /></span>
          <div>
            <h1 className="ld-entity-title">
              {vm.id}
              <Pill tone={STATE_TONE[vm.state] ?? "muted"}><span className="ld-pill-dot" />{vm.state[0].toUpperCase() + vm.state.slice(1)}</Pill>
            </h1>
            <p className="ld-entity-meta">
              <span>Host <b>{vm.host}</b></span>
              <span className="ld-mono">{vm.ip}</span>
              <span>Cluster <b>{vm.cluster}</b></span>
              <span>OS <b>{vm.os}</b></span>
            </p>
          </div>
        </div>
        <div className="ld-head-actions">
          <button type="button" className="ld-btn" onClick={openHost}><i className="fa-solid fa-server" aria-hidden="true" /> Open host</button>
          <button type="button" className="ld-btn" onClick={() => setRoute("infra-topology")}><i className="fa-solid fa-circle-nodes" aria-hidden="true" /> View in topology</button>
        </div>
      </div>

      <div className="ld-grid ld-grid-stats ld-grid-6">
        <StatCard icon="fa-microchip" tone={loadTone(vm.cpuUse)} label="CPU Usage" value={`${vm.cpuUse}%`} note={`of ${vm.cpu}`} />
        <StatCard icon="fa-memory" tone={loadTone(vm.memUse)} label="Memory Usage" value={`${vm.memUse}%`} note={`of ${vm.mem}`} />
        <StatCard icon="fa-gauge" tone="info" label="vCPU" value={vm.cpu.replace(/\s*vCPU/i, "")} note="allocated" />
        <StatCard icon="fa-memory" tone="purple" label="Memory" value={vm.mem} note="allocated" />
        <StatCard icon="fa-hard-drive" tone="info" label="Disk" value={vm.disk} note="provisioned" />
        <StatCard icon="fa-power-off" tone={STATE_TONE[vm.state] ?? "muted"} label="State" value={vm.state[0].toUpperCase() + vm.state.slice(1)} note={`on ${vm.host}`} />
      </div>

      <div className="ld-grid ld-grid-3">
        <Panel title="VM Information">
          <dl className="ld-dl">
            <dt>VM name</dt><dd>{vm.id}</dd>
            <dt>IP address</dt><dd className="ld-mono">{vm.ip}</dd>
            <dt>Cluster</dt><dd>{vm.cluster}</dd>
            <dt>Host</dt><dd>{vm.host}{host ? ` (${host.ip})` : ""}</dd>
            <dt>vCPU</dt><dd>{vm.cpu}</dd>
            <dt>Memory</dt><dd>{vm.mem}</dd>
            <dt>Disk</dt><dd>{vm.disk}</dd>
            <dt>OS</dt><dd>{vm.os}</dd>
            <dt>VM state</dt><dd><Pill tone={STATE_TONE[vm.state] ?? "muted"}>{vm.state}</Pill></dd>
          </dl>
        </Panel>

        <Panel title="Resource Utilization">
          <ul className="ld-bars">
            <UsageBar label="CPU" value={vm.cpuUse} />
            <UsageBar label="Memory" value={vm.memUse} />
            {host && <UsageBar label={`Host CPU (${host.id})`} value={Math.round(host.cpu)} />}
            {host && <UsageBar label={`Host memory`} value={Math.round(host.mem)} />}
          </ul>
          <p className="ld-muted ld-small">Current values from the inventory. History over any time range is in Performance below.</p>
        </Panel>

        <Panel title="Host" action={host ? { label: "Open host", onClick: openHost } : undefined}>
          {host ? (
            <dl className="ld-dl">
              <dt>Device</dt><dd>{host.id}</dd>
              <dt>Model</dt><dd>{host.model}</dd>
              <dt>IP address</dt><dd className="ld-mono">{host.ip}</dd>
              <dt>Hypervisor</dt><dd>{host.os}</dd>
              <dt>Status</dt>
              <dd><Pill tone={host.status === "ok" ? "ok" : host.status === "warn" ? "warn" : "crit"}><span className="ld-pill-dot" />{HOST_STATUS[host.status] ?? host.status}</Pill></dd>
              <dt>Uptime</dt><dd>{host.uptime}</dd>
              <dt>Site</dt><dd>{host.site}</dd>
            </dl>
          ) : (
            <Empty>Host {vm.host} is not in the inventory.</Empty>
          )}
        </Panel>
      </div>

      <VmMetrics vmId={vm.id} />

      <div className="ld-grid ld-grid-2">
        <Panel title={`Other VMs on ${vm.host}`}>
          {siblings.length ? (
            <div className="ld-table-wrap">
              <table className="ld-table">
                <thead>
                  <tr><th scope="col">VM</th><th scope="col">IP</th><th scope="col">CPU</th><th scope="col">Memory</th><th scope="col">State</th></tr>
                </thead>
                <tbody>
                  {siblings.map((s) => (
                    <tr key={s.id}>
                      <td><button type="button" className="ld-link ld-mono" onClick={() => openVm(s.id)}>{s.id}</button></td>
                      <td className="ld-mono">{s.ip}</td>
                      <td><Pill tone={loadTone(s.cpuUse)}>{s.cpuUse}%</Pill></td>
                      <td><Pill tone={loadTone(s.memUse)}>{s.memUse}%</Pill></td>
                      <td><Pill tone={STATE_TONE[s.state] ?? "muted"}>{s.state}</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>No other VMs on this host.</Empty>
          )}
        </Panel>

        <Panel title="Host Alerts" action={{ label: "View All", onClick: () => setRoute("alerts") }}>
          {alerts.length ? (
            <ul className="ld-activity">
              {alerts.map((a) => (
                <li key={a.id}>
                  <span className={`ld-tile ld-tile-sm ld-${a.sev === "critical" ? "crit" : a.sev === "warning" || a.sev === "warn" ? "warn" : "info"}`} aria-hidden="true">
                    <i className="fa-solid fa-bell" />
                  </span>
                  <span className="ld-activity-text">{a.title} · <span className="ld-muted">{a.detail}</span></span>
                  <span className="ld-muted ld-nowrap">{a.since}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No active alerts on {vm.host}.</Empty>
          )}
        </Panel>
      </div>

      <p className="ld-muted ld-small">Power, console and snapshot actions need the vCenter integration, which is not connected yet.</p>
    </div>
  );
}
