// Device family: where a device sits (site → rack → U), what runs on it
// (hosted VMs) and what each NIC is cabled to (switch + port), from
// GET /api/infra/devices/{id}/relationships/. Used on the server page; the VM
// page uses NetworkPath to show VM → host → NIC → switch port.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { useDeviceRelationships, type NicLink, type PeerRef } from "@/api/hooks";
import { Empty, Panel, Pill } from "@/components/ld";
import type { Tone } from "@/components/ld";

const KIND_ICON: Record<string, string> = {
  switch: "fa-network-wired", router: "fa-route", firewall: "fa-shield-halved", loadbal: "fa-scale-balanced",
  hypervisor: "fa-server", "phys-srv": "fa-server", "win-srv": "fa-server", "linux-srv": "fa-server",
};
const statusTone = (s?: string): Tone => (s === "ok" || s === "up" || s === "running" ? "ok" : s === "warn" ? "warn" : s ? "crit" : "muted");
const routeFor = (kind?: string) => (kind === "switch" ? "switch-detail" : kind === "hypervisor" || kind === "phys-srv" ? "server-detail" : "infra-device");

function PeerName({ peer }: { peer: PeerRef }) {
  const { setRoute } = useNav();
  if (peer.restricted || !peer.id) return <span className="ld-muted">Restricted device (other client)</span>;
  return (
    <button type="button" className="ld-link" onClick={() => setRoute(routeFor(peer.kind), { deviceId: peer.id })}>
      {peer.name ?? peer.id}
    </button>
  );
}

function NicRow({ n }: { n: NicLink }) {
  const c = n.connected_to;
  return (
    <tr>
      <td>
        <span className="ld-mono ld-strong">{n.name}</span>
        <span className="ld-sub">{n.description}</span>
      </td>
      <td className="ld-mono ld-muted">{n.mac || "—"}</td>
      <td>{n.speed || "—"}</td>
      <td className="ld-muted">{n.vlan || "—"}</td>
      <td><Pill tone={statusTone(n.oper_status)}><span className="ld-pill-dot" />{n.oper_status === "up" ? "Up" : "Down"}</Pill></td>
      <td>
        {c ? (
          <>
            <PeerName peer={c.peer} />
            {!c.peer.restricted && <span className="ld-sub ld-mono">port {c.port || "—"} · {c.bandwidth}</span>}
          </>
        ) : (
          <span className="ld-muted">Not cabled / not discovered</span>
        )}
      </td>
    </tr>
  );
}

export function DeviceFamily({ deviceId }: { deviceId: string }) {
  const { setRoute } = useNav();
  const { data, isLoading, isError } = useDeviceRelationships(deviceId);

  if (isLoading) return <div className="ld-card"><Empty>Loading relationships…</Empty></div>;
  if (isError || !data) return <div className="ld-card"><Empty>Relationships are not available for this device.</Empty></div>;

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
    <section className="ld-metrics" aria-label="Device relationships">
      <div className="ld-metrics-head">
        <h2>Relationships</h2>
        <nav className="ld-crumbs" aria-label="Location">
          <i className="fa-solid fa-location-dot" aria-hidden="true" />
          <button type="button" className="ld-link" onClick={() => setRoute("site-detail")}>{data.site.name || data.site.id}</button>
          <i className="fa-solid fa-chevron-right" aria-hidden="true" />
          {data.rack ? (
            <button type="button" className="ld-link" onClick={() => setRoute("infra-rack")}>
              Rack {data.rack.name} · U{data.rack.u_bottom}–{data.rack.u_top}
            </button>
          ) : (
            <span>No rack position</span>
          )}
          <i className="fa-solid fa-chevron-right" aria-hidden="true" />
          <b>{data.device.id}</b>
        </nav>
      </div>

      <div className="ld-card ld-family" role="img" aria-label={`${data.device.id}: ${switches.size} connected switches, ${data.vms.length} hosted VMs`}>
        <div className="ld-family-col">
          <span className="ld-family-label">Connected to</span>
          {switches.size ? (
            [...switches.values()].map(({ peer, ports }) => (
              <div key={peer.id ?? "restricted"} className="ld-family-node">
                <i className={`fa-solid ${KIND_ICON[peer.kind ?? ""] ?? "fa-network-wired"}`} aria-hidden="true" />
                <div>
                  <b>{peer.restricted ? "Restricted" : peer.name ?? peer.id}</b>
                  {ports.map((p) => <span key={p} className="ld-sub ld-mono">{p}</span>)}
                </div>
              </div>
            ))
          ) : (
            <span className="ld-muted ld-small">No uplinks discovered</span>
          )}
        </div>
        <div className="ld-family-link" aria-hidden="true" />
        <div className="ld-family-col ld-family-center">
          <span className="ld-family-label">This device</span>
          <div className="ld-family-node ld-family-self">
            <i className={`fa-solid ${KIND_ICON[data.device.kind] ?? "fa-server"}`} aria-hidden="true" />
            <div>
              <b>{data.device.id}</b>
              <span className="ld-sub">{data.device.model}</span>
              <span className="ld-sub ld-mono">{data.device.ip}</span>
              <span className="ld-sub">{data.nics.length} NICs · {data.nics.filter((n) => n.connected_to).length} cabled</span>
            </div>
          </div>
        </div>
        <div className="ld-family-link" aria-hidden="true" />
        <div className="ld-family-col">
          <span className="ld-family-label">Hosted VMs ({data.vms.length})</span>
          {data.vms.length ? (
            data.vms.slice(0, 6).map((v) => (
              <button key={v.id} type="button" className="ld-family-node ld-family-vm" onClick={() => setRoute("vm-detail", { vmId: v.id })}>
                <i className="fa-solid fa-cube" aria-hidden="true" />
                <div>
                  <b>{v.id}</b>
                  <span className="ld-sub ld-mono">{v.ip}</span>
                </div>
                <Pill tone={statusTone(v.state)}>{v.state}</Pill>
              </button>
            ))
          ) : (
            <span className="ld-muted ld-small">No VMs on this device</span>
          )}
          {data.vms.length > 6 && <span className="ld-muted ld-small">+{data.vms.length - 6} more below</span>}
        </div>
      </div>

      <div className="ld-metrics">
        <Panel title={`Network Interfaces (${data.nics.length})`}>
          {data.nics.length ? (
            <div className="ld-table-wrap">
              <table className="ld-table">
                <thead>
                  <tr><th scope="col">NIC</th><th scope="col">MAC</th><th scope="col">Speed</th><th scope="col">VLAN</th><th scope="col">Status</th><th scope="col">Connected to</th></tr>
                </thead>
                <tbody>{data.nics.map((n) => <NicRow key={n.name} n={n} />)}</tbody>
              </table>
            </div>
          ) : (
            <Empty>No interfaces discovered for this device yet.</Empty>
          )}
          {data.other_links.length > 0 && (
            <p className="ld-muted ld-small">
              {data.other_links.length} more link(s) found by discovery without a matching NIC:{" "}
              {data.other_links.map((l) => `${l.local_port || "?"} → ${l.peer.restricted ? "restricted" : l.peer.id}:${l.peer_port || "?"}`).join(", ")}
            </p>
          )}
        </Panel>

        <Panel title={`Hosted Virtual Machines (${data.vms.length})`} action={data.vms.length ? { label: "All VMs", onClick: () => setRoute("infra-vms") } : undefined}>
          {data.vms.length ? (
            <div className="ld-table-wrap">
              <table className="ld-table">
                <thead>
                  <tr><th scope="col">VM</th><th scope="col">OS</th><th scope="col">vCPU / RAM</th><th scope="col">CPU</th><th scope="col">Memory</th><th scope="col">State</th></tr>
                </thead>
                <tbody>
                  {data.vms.map((v) => (
                    <tr key={v.id}>
                      <td>
                        <button type="button" className="ld-link ld-mono" onClick={() => setRoute("vm-detail", { vmId: v.id })}>{v.id}</button>
                        <span className="ld-sub ld-mono">{v.ip}</span>
                      </td>
                      <td className="ld-muted">{v.os}</td>
                      <td className="ld-muted">{v.cpu} / {v.mem}</td>
                      <td>{v.cpuUse}%</td>
                      <td>{v.memUse}%</td>
                      <td><Pill tone={statusTone(v.state)}>{v.state}</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>No virtual machines run on this device.</Empty>
          )}
        </Panel>
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
        <ol className="ld-path">
          <li><i className="fa-solid fa-cube" aria-hidden="true" /> <b>{vmId}</b><span className="ld-sub">virtual machine</span></li>
          <li>
            <i className="fa-solid fa-server" aria-hidden="true" />{" "}
            <button type="button" className="ld-link" onClick={() => setRoute("server-detail", { deviceId: hostId })}>{hostId}</button>
            <span className="ld-sub">host · {data.site.name}{data.rack ? ` · rack ${data.rack.name} U${data.rack.u_bottom}` : ""}</span>
          </li>
          {uplinks.length ? (
            uplinks.map((n) => (
              <li key={n.name}>
                <i className="fa-solid fa-network-wired" aria-hidden="true" />{" "}
                <span className="ld-mono">{n.name}</span> ({n.speed}) → <PeerName peer={n.connected_to!.peer} />
                {!n.connected_to!.peer.restricted && <span className="ld-sub ld-mono">switch port {n.connected_to!.port}</span>}
              </li>
            ))
          ) : (
            <li className="ld-muted">No host uplinks discovered</li>
          )}
        </ol>
      ) : (
        <Empty>Host network details are not available.</Empty>
      )}
      <p className="ld-muted ld-small">Which host NIC carries this VM's traffic depends on the vSwitch, which comes with the vCenter integration.</p>
    </Panel>
  );
}
