// Device family: where a device sits (site → rack → U), what runs on it
// (hosted VMs) and what each NIC is cabled to (switch + port), from
// GET /api/infra/devices/{id}/relationships/. Used on the server page; the VM
// page uses NetworkPath to show VM → host → NIC → switch port.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { useDeviceRelationships, type NicLink, type PeerRef } from "@/api/hooks";
import { Empty, Panel, Pill, PillDot } from "@/components/ld";
import { Card, Table, TextButton, cx, ui } from "@/components/ui";
import { metricsSection } from "@/components/MetricCharts";
import type { Tone } from "@/components/ld";

import { Icon } from "@/components/Icon";
import { BoxIcon, ChevronRightIcon, MapPinIcon, NetworkIcon, ServerIcon } from "lucide-react";
const KIND_ICON: Record<string, string> = {
  switch: "fa-network-wired", router: "fa-route", firewall: "fa-shield-halved", loadbal: "fa-scale-balanced",
  hypervisor: "fa-server", "phys-srv": "fa-server", "win-srv": "fa-server", "linux-srv": "fa-server",
};
const statusTone = (s?: string): Tone => (s === "ok" || s === "up" || s === "running" ? "ok" : s === "warn" ? "warn" : s ? "crit" : "muted");
const routeFor = (kind?: string) => (kind === "switch" ? "switch-detail" : kind === "hypervisor" || kind === "phys-srv" ? "server-detail" : "infra-device");

/** secondary line under a name, in mono (e.g. an IP or a port) */
const subMono = cx(ui.sub, "font-mono font-semibold");
/** an accent text button in mono (a VM id in a table) */
const monoLink = "border-0 bg-transparent p-0 font-mono text-xs font-semibold text-accent cursor-pointer hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2";

// The "connected to · this device · hosted VMs" strip.
const family = {
  col: "flex flex-col gap-2 min-w-0",
  label: "text-xs font-semibold text-fg-muted uppercase tracking-[.04em]",
  link: "h-0.5 bg-[repeating-linear-gradient(90deg,var(--border-strong)_0_6px,transparent_6px_10px)] max-[900px]:hidden",
  node: "flex items-center gap-2.5 py-2.5 px-3 rounded bg-bg-raised text-left text-fg min-w-0 [&>.ld-icon]:text-2xl [&>.ld-icon]:text-accent [&>.ld-icon]:w-[22px] [&>.ld-icon]:text-center [&>.ld-icon]:flex-none [&>div]:flex-1 [&>div]:min-w-0 [&>div]:flex [&>div]:flex-col [&_b]:text-sm [&_b]:overflow-hidden [&_b]:text-ellipsis [&_b]:whitespace-nowrap",
  nodeBorder: "border border-line",
};

function PeerName({ peer }: { peer: PeerRef }) {
  const { setRoute } = useNav();
  if (peer.restricted || !peer.id) return <span className="text-fg-muted">Restricted device (other client)</span>;
  return (
    <TextButton onClick={() => setRoute(routeFor(peer.kind), { deviceId: peer.id })}>
      {peer.name ?? peer.id}
    </TextButton>
  );
}

function NicRow({ n }: { n: NicLink }) {
  const c = n.connected_to;
  return (
    <tr>
      <td>
        <span className="font-mono text-xs font-medium">{n.name}</span>
        <span className={ui.sub}>{n.description}</span>
      </td>
      <td className="font-mono font-semibold">{n.mac || "—"}</td>
      <td>{n.speed || "—"}</td>
      <td>{n.vlan || "—"}</td>
      <td><Pill tone={statusTone(n.oper_status)}><PillDot />{n.oper_status === "up" ? "Up" : "Down"}</Pill></td>
      <td>
        {c ? (
          <>
            <PeerName peer={c.peer} />
            {!c.peer.restricted && <span className={subMono}>port {c.port || "—"} · {c.bandwidth}</span>}
          </>
        ) : (
          <span className="text-fg-muted">Not cabled / not discovered</span>
        )}
      </td>
    </tr>
  );
}

export function DeviceFamily({ deviceId }: { deviceId: string }) {
  const { setRoute } = useNav();
  const { data, isLoading, isError } = useDeviceRelationships(deviceId);

  if (isLoading) return <Card><Empty>Loading relationships…</Empty></Card>;
  if (isError || !data) return <Card><Empty>Relationships are not available for this device.</Empty></Card>;

  const switches = new Map<string, { peer: PeerRef; ports: string[] }>();
  for (const n of data.nics) {
    const c = n.connected_to;
    if (!c) continue;
    const key = c.peer.id ?? "restricted";
    const entry = switches.get(key) ?? { peer: c.peer, ports: [] };
    entry.ports.push(`${n.name} → ${c.port || "?"}`);
    switches.set(key, entry);
  }

  return (
    <section className={metricsSection.section} aria-label="Device relationships">
      <div className={metricsSection.head}>
        <h2 className={metricsSection.title}>Relationships</h2>
        <nav className={ui.crumbs} aria-label="Location">
          <Icon icon={MapPinIcon} />
          <TextButton onClick={() => setRoute("site-detail")}>{data.site.name || data.site.id}</TextButton>
          <Icon icon={ChevronRightIcon} />
          {data.rack ? (
            <TextButton onClick={() => setRoute("infra-rack")}>
              Rack {data.rack.name} · U{data.rack.u_bottom}–{data.rack.u_top}
            </TextButton>
          ) : (
            <span>No rack position</span>
          )}
          <Icon icon={ChevronRightIcon} />
          <b>{data.device.id}</b>
        </nav>
      </div>

      <Card className="grid grid-cols-[minmax(0,1fr)_40px_minmax(0,1fr)_40px_minmax(0,1fr)] items-center gap-0 py-4 px-4.5 max-[900px]:grid-cols-[minmax(0,1fr)] max-[900px]:gap-3" role="img" aria-label={`${data.device.id}: ${switches.size} connected switches, ${data.vms.length} hosted VMs`}>
        <div className={family.col}>
          <span className={family.label}>Connected to</span>
          {switches.size ? (
            [...switches.values()].map(({ peer, ports }) => (
              <div key={peer.id ?? "restricted"} className={cx(family.node, family.nodeBorder)}>
                <Icon className={`fa-solid ${KIND_ICON[peer.kind ?? ""] ?? "fa-network-wired"}`} />
                <div>
                  <b>{peer.restricted ? "Restricted" : peer.name ?? peer.id}</b>
                  {ports.map((p) => <span key={p} className={subMono}>{p}</span>)}
                </div>
              </div>
            ))
          ) : (
            <span className="text-fg-muted text-xs">No uplinks discovered</span>
          )}
        </div>
        <div className={family.link} aria-hidden="true" />
        <div className={family.col}>
          <span className={family.label}>This device</span>
          <div className={cx(family.node, "border-2 border-accent shadow-[0_0_0_3px_var(--info-bg)]")}>
            <Icon className={`fa-solid ${KIND_ICON[data.device.kind] ?? "fa-server"}`} />
            <div>
              <b>{data.device.id}</b>
              <span className={ui.sub}>{data.device.model}</span>
              <span className={subMono}>{data.device.ip}</span>
              <span className={ui.sub}>{data.nics.length} NICs · {data.nics.filter((n) => n.connected_to).length} cabled</span>
            </div>
          </div>
        </div>
        <div className={family.link} aria-hidden="true" />
        <div className={family.col}>
          <span className={family.label}>Hosted VMs ({data.vms.length})</span>
          {data.vms.length ? (
            data.vms.slice(0, 6).map((v) => (
              <button key={v.id} type="button" className={cx(family.node, family.nodeBorder, "cursor-pointer hover:border-line-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2")} onClick={() => setRoute("vm-detail", { vmId: v.id })}>
                <Icon icon={BoxIcon} />
                <div>
                  <b>{v.id}</b>
                  <span className={subMono}>{v.ip}</span>
                </div>
                <Pill tone={statusTone(v.state)}>{v.state}</Pill>
              </button>
            ))
          ) : (
            <span className="text-fg-muted text-xs">No VMs on this device</span>
          )}
          {data.vms.length > 6 && <span className="text-fg-muted text-xs">+{data.vms.length - 6} more below</span>}
        </div>
      </Card>

      <div className={metricsSection.section}>
        <Panel title={`Network Interfaces (${data.nics.length})`}>
          {data.nics.length ? (
            <Table>
                <thead>
                  <tr><th scope="col">NIC</th><th scope="col">MAC</th><th scope="col">Speed</th><th scope="col">VLAN</th><th scope="col">Status</th><th scope="col">Connected to</th></tr>
                </thead>
                <tbody>{data.nics.map((n) => <NicRow key={n.name} n={n} />)}</tbody>
              </Table>
          ) : (
            <Empty>No interfaces discovered for this device yet.</Empty>
          )}
          {data.other_links.length > 0 && (
            <p className="text-fg-muted text-xs">
              {data.other_links.length} more link(s) found by discovery without a matching NIC:{" "}
              {data.other_links.map((l) => `${l.local_port || "?"} → ${l.peer.restricted ? "restricted" : l.peer.id}:${l.peer_port || "?"}`).join(", ")}
            </p>
          )}
        </Panel>

        {(data.vms.length > 0 || data.device.kind === "hypervisor") && (
        <Panel title={`Hosted Virtual Machines (${data.vms.length})`} action={data.vms.length ? { label: "All VMs", onClick: () => setRoute("infra-vms") } : undefined}>
          {data.vms.length ? (
            <Table>
                <thead>
                  <tr><th scope="col">VM</th><th scope="col">OS</th><th scope="col">vCPU / RAM</th><th scope="col">CPU</th><th scope="col">Memory</th><th scope="col">State</th></tr>
                </thead>
                <tbody>
                  {data.vms.map((v) => (
                    <tr key={v.id}>
                      <td>
                        <button type="button" className={monoLink} onClick={() => setRoute("vm-detail", { vmId: v.id })}>{v.id}</button>
                        <span className={subMono}>{v.ip}</span>
                      </td>
                      <td>{v.os}</td>
                      <td>{v.cpu} / {v.mem}</td>
                      <td>{v.cpuUse}%</td>
                      <td>{v.memUse}%</td>
                      <td><Pill tone={statusTone(v.state)}>{v.state}</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
          ) : (
            <Empty>No virtual machines run on this device.</Empty>
          )}
        </Panel>
        )}
      </div>
    </section>
  );
}

/** VM page: VM → host → host NIC → switch port. */
export function NetworkPath({ vmId, hostId }: { vmId: string; hostId: string }) {
  const { setRoute } = useNav();
  const { data } = useDeviceRelationships(hostId);
  const uplinks = data?.nics.filter((n) => n.connected_to) ?? [];
  return (
    <Panel title="Network Path">
      {data ? (
        <ol className="list-none flex flex-col gap-0 [&>li]:relative [&>li]:py-2 [&>li]:pl-7 [&>li]:text-sm [&>li]:text-fg [&>li_.ld-icon]:absolute [&>li_.ld-icon]:left-0 [&>li_.ld-icon]:top-2.5 [&>li_.ld-icon]:w-[18px] [&>li_.ld-icon]:text-center [&>li_.ld-icon]:text-accent [&>li:not(:last-child)]:after:content-[''] [&>li:not(:last-child)]:after:absolute [&>li:not(:last-child)]:after:left-2 [&>li:not(:last-child)]:after:top-[30px] [&>li:not(:last-child)]:after:-bottom-1.5 [&>li:not(:last-child)]:after:border-l-2 [&>li:not(:last-child)]:after:border-dashed [&>li:not(:last-child)]:after:border-line-strong">
          <li><Icon icon={BoxIcon} /> <b>{vmId}</b><span className={ui.sub}>virtual machine</span></li>
          <li>
            <Icon icon={ServerIcon} />{" "}
            <TextButton onClick={() => setRoute("server-detail", { deviceId: hostId })}>{hostId}</TextButton>
            <span className={ui.sub}>host · {data.site.name}{data.rack ? ` · rack ${data.rack.name} U${data.rack.u_bottom}` : ""}</span>
          </li>
          {uplinks.length ? (
            uplinks.map((n) => (
              <li key={n.name}>
                <Icon icon={NetworkIcon} />{" "}
                <span className={ui.mono}>{n.name}</span> ({n.speed}) → <PeerName peer={n.connected_to!.peer} />
                {!n.connected_to!.peer.restricted && <span className={subMono}>switch port {n.connected_to!.port}</span>}
              </li>
            ))
          ) : (
            <li>No host uplinks discovered</li>
          )}
        </ol>
      ) : (
        <Empty>Host network details are not available.</Empty>
      )}
      <p className="text-fg-muted text-xs">Which host NIC carries this VM's traffic depends on the vSwitch, which comes with the vCenter integration.</p>
    </Panel>
  );
}
