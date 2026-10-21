"""Device relationships: location, hosted VMs and NIC-to-switch-port links."""
from __future__ import annotations

from apps.sites.models import RackUnit

from .models import DeviceInterface, InfraDevice, TopologyConnection, VirtualMachine
from .serializers import VmSerializer


def _peer(device_id: str, visible: dict[str, InfraDevice]) -> dict:
    d = visible.get(device_id)
    if d is None:
        # Linked to a device outside the caller's tenant scope: say so, show nothing else.
        return {"id": None, "restricted": True}
    return {
        "id": d.id, "restricted": False, "name": d.name or d.hostname or d.id,
        "kind": d.device_type, "model": d.model, "ip": str(d.ip_address or ""), "status": d.status,
    }


def device_relationships(device: InfraDevice) -> dict:
    links = list(TopologyConnection.objects.filter(src=device)) + list(TopologyConnection.objects.filter(dst=device))
    peer_ids = {l.dst_id if l.src_id == device.id else l.src_id for l in links}
    visible = {d.id: d for d in InfraDevice.objects.filter(id__in=peer_ids)}

    connections = []
    for l in links:
        outbound = l.src_id == device.id
        connections.append({
            "local_port": l.src_port if outbound else l.dst_port,
            "peer_port": l.dst_port if outbound else l.src_port,
            "peer": _peer(l.dst_id if outbound else l.src_id, visible),
            "bandwidth": l.bandwidth,
            "status": l.status,
        })
    by_port = {c["local_port"]: c for c in connections if c["local_port"]}

    nics = []
    for i in DeviceInterface.objects.filter(device=device).order_by("name"):
        link = by_port.get(i.name)
        nics.append({
            "name": i.name, "description": i.description, "mac": i.mac_address, "speed": i.speed,
            "admin_status": i.admin_status, "oper_status": i.oper_status, "vlan": i.vlan, "mtu": i.mtu,
            "rx_mbps": round(i.rx_mbps, 1), "tx_mbps": round(i.tx_mbps, 1),
            "connected_to": None if link is None else {
                "peer": link["peer"], "port": link["peer_port"], "bandwidth": link["bandwidth"], "status": link["status"],
            },
        })

    unit = RackUnit.objects.filter(device_id=device.id).select_related("rack").first()
    rack = None
    if unit is not None:
        # The rack itself is tenant-scoped; only reveal it if the caller can see it.
        from apps.sites.models import Rack

        if Rack.objects.filter(pk=unit.rack_id).exists():
            rack = {"id": unit.rack.pk, "name": unit.rack.name, "u_top": unit.u_top, "u_bottom": unit.u_bottom}

    vms = VirtualMachine.objects.filter(host=device).order_by("id")
    return {
        "device": {"id": device.id, "kind": device.device_type, "model": device.model, "ip": str(device.ip_address or "")},
        "site": {"id": device.site_id, "name": device.site.name if device.site_id else ""},
        "rack": rack,
        "vms": VmSerializer(vms, many=True).data,
        "nics": nics,
        # Links whose local port matches no known NIC (e.g. discovered by LLDP before inventory).
        "other_links": [c for c in connections if c["local_port"] not in {n["name"] for n in nics}],
    }
