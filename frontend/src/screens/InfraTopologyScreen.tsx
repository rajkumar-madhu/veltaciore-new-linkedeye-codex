// LIVE data-center topology: WAN → FW → Core → Access → Server → VM
// Ported from screens/infra-topology.jsx.
// Maps to: GET /api/infra/sites/{id}/topology/live/ · GET /api/infra/sites/{id}/topology/links/
import React from "react";
import { useNav } from "@/hooks/useNav";
import { useDevices, useTopology } from "@/api/hooks";
import { SITES, DEVICE_KINDS, DEVICES, NET_LINKS, VMS, INFRA_ALERTS } from "@/data/infra";
import { Kpi, Field } from "@/components/primitives";
import { DomainHeatmap } from "@/components/DomainHeatmap";
import {
  STATUS_COLORS,
  getHealthColor,
  getMetricColor,
  getCpuColor,
  getMemColor,
  getDiskColor,
  getUtilColor,
  getErrorRateColor,
  getLinkColor,
  getStatusLabel,
  statusBadgeStyle,
  type NormalizedStatus,
} from "@/lib/statusColors";
import type { Device, DeviceKind, Site, Vm } from "@/lib/types";

interface TopoNode {
  id: string;
  layer: number;
  status: string;
  virtual?: boolean;
  label?: string;
  sub?: string;
  d?: Device;
  vm?: Vm;
}

interface TopoLink {
  id: string;
  a: string;
  b: string;
  srcPort: string;
  dstPort: string;
  status: string;
  bwG: number;
  util: number;
  errRate: number;
  rx: number;
  tx: number;
  drops: number;
  changed: string;
  type: string;
}

type Sel = { type: "node" | "link"; id: string } | null;

export default function InfraTopologyScreen() {
  const { setRoute } = useNav();
  const { data: devicesData } = useDevices();
  const allDevices = devicesData ?? [];
  const [site, setSite] = React.useState("dc-blr-1");
  // Live per-site topology (devices + links) from the API; falls back to the
  // seed graph when the backend is unreachable.
  const topoQuery = useTopology(site);
  const liveLinks = topoQuery.data?.links;
  const [query, setQuery] = React.useState("");
  const [sel, setSel] = React.useState<Sel>(null);          // {type:"node"|"link", id}
  const [loading, setLoading] = React.useState(false);
  const [tick, setTick] = React.useState(0);
  const [view, setView] = React.useState("physical"); // physical | schematic

  React.useEffect(() => { const t = setInterval(() => setTick(x => x + 1), 10000); return () => clearInterval(t); }, []);
  const changeSite = (id: string) => { setLoading(true); setSel(null); setSite(id); setTimeout(() => setLoading(false), 450); };

  const hash = (s: string) => s.split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const jitter = (key: string, base: number, spread: number) => {
    const v = base + Math.sin((hash(key) + tick * 2.7)) * spread;
    return Math.max(0, Math.round(v * 10) / 10);
  };

  const siteDevices = allDevices.filter(d => d.site === site);
  const byId: Record<string, Device> = Object.fromEntries(siteDevices.map(d => [d.id, d] as [string, Device]));
  const q = query.trim().toLowerCase();
  const matches = (d: Device) => !q || [d.id, d.ip, d.model, d.os, d.role].some(v => String(v).toLowerCase().includes(q));

  // ---- Build layered node graph: WAN → Router → Firewall → Core/LB → Access → Server/Storage → VM ----
  const layerOf = (d: Device) => ({ router: 1, firewall: 2, loadbal: 3, switch: (d.role === "ToR" || d.role === "Distribution") ? 4 : 3, hypervisor: 5, "phys-srv": 5, "win-srv": 5, "linux-srv": 5, storage: 5 } as Record<string, number | undefined>)[d.kind === "switch" ? "switch" : d.kind];
  const LAYER_LABELS = ["Internet / WAN", "Edge Routers", "Firewalls", "Core & Delivery", "Access / ToR", "Servers & Storage", "VMs / Workloads"];

  const nodes: TopoNode[] = [{ id: "__wan", virtual: true, layer: 0, label: "Internet / WAN", sub: "2 × 10G DIA · BGP AS-65010", status: "ok" }];
  siteDevices.forEach(d => { const L = layerOf(d); if (L != null) nodes.push({ id: d.id, layer: L, d, status: d.status }); });
  const siteVMs = VMS.filter(v => byId[v.host] && v.state === "running").slice(0, 6);
  siteVMs.forEach(v => nodes.push({ id: v.id, layer: 6, vm: v, status: v.cpuUse > 70 ? "warn" : "ok" }));

  // ---- Links with port + live traffic metadata ----
  const portFor = (dev: string, peer: string) => {
    if (!byId[dev]) return "eth0";
    const kind = byId[dev].kind, h = hash(dev + peer);
    if (kind === "firewall") return "eth1/" + (1 + h % 4);
    if (kind === "router") return "Te0/0/" + (h % 4);
    if (kind === "switch") return "Gi1/0/" + (1 + h % 48);
    if (kind === "loadbal") return "1." + (1 + h % 8);
    return ["eno1", "eno2", "vmnic0", "vmnic1"][h % 4];
  };
  const mkLink = (a: string, b: string, opts: { down?: boolean; bw?: number; util?: number; err?: number; srcPort?: string; dstPort?: string; type?: string } = {}): TopoLink => {
    const key = a + "→" + b;
    const down = opts.down || byId[a]?.status === "down" || byId[b]?.status === "down";
    const bwG = opts.bw ?? [10, 25, 40, 100][hash(key) % 4];
    const util = down ? 0 : jitter(key + "u", opts.util ?? (18 + hash(key) % 55), 6);
    const errRate = down ? 0 : (opts.err ?? (hash(key) % 17 === 0 ? 2.4 : hash(key) % 7 === 0 ? 0.6 : 0));
    const rx = down ? 0 : Math.round(bwG * 1000 * util / 100 * 0.55);
    const tx = down ? 0 : Math.round(bwG * 1000 * util / 100 * 0.45);
    return { id: key, a, b, srcPort: opts.srcPort || portFor(a, b), dstPort: opts.dstPort || portFor(b, a), status: down ? "down" : errRate > 2 ? "warn" : "ok", bwG, util, errRate, rx, tx, drops: down ? 0 : (errRate > 0 ? Math.round(errRate * 40) : 0), changed: down ? "44m ago" : "187d ago", type: opts.type || "ethernet" };
  };
  const links: TopoLink[] = [];
  siteDevices.filter(d => d.kind === "router").forEach(r => links.push(mkLink("__wan", r.id, { bw: 10, srcPort: "DIA-" + (links.length + 1), type: "wan" })));
  // Prefer live links from GET /infra/sites/{id}/topology/; fall back to the seed graph.
  const linkPairs: [string, string][] = liveLinks && liveLinks.length
    ? liveLinks.map(l => [l.src, l.dst] as [string, string])
    : NET_LINKS;
  linkPairs.forEach(([a, b]) => { if (byId[a] && byId[b]) links.push(mkLink(a, b)); });
  siteVMs.forEach(v => links.push(mkLink(v.host, v.id, { bw: 10, srcPort: "vSwitch0", dstPort: "vNIC-0", util: Math.min(90, v.cpuUse + 8), type: "virtual" })));

  // ---- Layout ----
  const present = [...new Set(nodes.map(n => n.layer))].sort((x, y) => x - y);
  const NW = 152, NH = 58, GAPY = 64, W = 1120;
  const H = present.length * (NH + GAPY) + 30;
  const pos: Record<string, { x: number; y: number; n: TopoNode }> = {};
  present.forEach((L, li) => {
    const row = nodes.filter(n => n.layer === L);
    row.forEach((n, i) => { pos[n.id] = { x: (i + 0.5) * (W / row.length), y: 40 + li * (NH + GAPY) + NH / 2, n }; });
  });
  const drawLinks = links.filter(l => pos[l.a] && pos[l.b]);

  const counts = {
    up: siteDevices.filter(d => d.status === "ok").length, warn: siteDevices.filter(d => d.status === "warn").length,
    crit: siteDevices.filter(d => d.status === "critical").length, down: siteDevices.filter(d => d.status === "down").length,
  };
  const alertCount = (id: string) => INFRA_ALERTS.filter(a => a.device === id).length;
  const openDevice = (id: string) => {
    const dev = DEVICES.find(x => x.id === id);
    // firewalls / switches / servers get dedicated LinkedEye-style detail pages
    const route =
      dev?.kind === "firewall" ? "firewall-detail"
      : dev?.kind === "switch" ? "switch-detail"
      : dev?.kind === "loadbal" ? "loadbal-detail"
      : dev?.kind === "ups" ? "ups-detail"
      : dev && ["storage", "nas"].includes(dev.kind) ? "storage-detail"
      : dev && ["hypervisor", "phys-srv", "linux-srv", "win-srv"].includes(dev.kind) ? "server-detail"
      : "infra-device";
    setRoute(route, { deviceId: id });
  };
  const fmtBps = (m: number) => m >= 1000 ? (m / 1000).toFixed(1) + " Gbps" : m + " Mbps";
  const siteObj = SITES.find(s => s.id === site) || ({} as Site);
  const selNode: { id: string; d?: Device; vm?: Vm } | null | undefined = sel?.type === "node" ? (nodes.find(n => n.id === sel.id) || (VMS.some(v => v.id === sel.id) ? { id: sel.id, vm: VMS.find(v => v.id === sel.id) } : null)) : null;
  const selLink = sel?.type === "link" ? drawLinks.find(l => l.id === sel.id) : null;

  return (
    <div className="page page-fade sn-dash">
      <style>{`
        @keyframes topoFlow { to { stroke-dashoffset: -26; } }
        .topo-flow { stroke-dasharray: 7 6; animation: topoFlow 1.1s linear infinite; }
        .topo-flow.slow { animation-duration: 2.2s; }
        .topo-node { cursor: pointer; } .topo-node:hover rect.card { filter: brightness(0.97); }
      `}</style>

      <div className="sn-breadcrumb">
        <a className="sn-link">Home</a><span className="sn-bc-sep">›</span>
        <a className="sn-link" onClick={() => setRoute("infra")}>Infrastructure</a><span className="sn-bc-sep">›</span>
        <span>Live Topology</span>
      </div>

      <div className="sn-form-header">
        <div className="sn-form-title-row">
          <span className="sn-rec-number">LIVE-TOPO</span>
          <span className="sn-pill state-neutral"><i className="fa-solid fa-building" /> {siteObj.name}</span>
          <span className="sn-pill state-progress"><i className={`fa-solid ${topoQuery.isFetching ? "fa-circle-notch fa-spin" : "fa-tower-broadcast"}`} /> {liveLinks && liveLinks.length ? "live · API" : "live · 10s"}</span>
          <span className="sn-pill state-neutral"><i className="fa-solid fa-circle-nodes" /> {drawLinks.length} links</span>
        </div>
        <div className="sn-form-title-meta">
          <div>
            <h1>Live Data-Center Topology</h1>
            <div className="sn-form-sub">Traffic flow WAN → firewall → switch → server → VM · SNMP + LLDP + NetFlow · links refresh every 10s</div>
          </div>
          <div className="sn-form-actions">
            <select className="select" value={site} onChange={e => changeSite(e.target.value)}>
              {SITES.map(s => <option key={s.id} value={s.id}>{s.name} · {s.region}</option>)}
            </select>
            <button className="sn-btn" onClick={() => setRoute("infra-onboarding")}><i className="fa-solid fa-plus" /> Onboard device</button>
            <button className="sn-btn" onClick={() => { setLoading(true); topoQuery.refetch().finally(() => setTimeout(() => setLoading(false), 450)); }} disabled={topoQuery.isFetching}><i className={`fa-solid fa-rotate${topoQuery.isFetching ? " fa-spin" : ""}`} /> Re-discover</button>
            <button className="sn-btn primary"><i className="fa-solid fa-camera" /> Snapshot</button>
          </div>
        </div>
      </div>

      <div className="sn-kpi-strip">
        <Kpi l="Devices" v={siteDevices.length} s={siteObj.name || ""} tone="neutral" />
        <Kpi l="Up" v={counts.up} s="reporting OK" tone="ok" />
        <Kpi l="Warning" v={counts.warn} s="elevated" tone="warn" />
        <Kpi l="Critical" v={counts.crit} s="urgent" tone="crit" />
        <Kpi l="Down" v={counts.down} s="unreachable" tone={counts.down > 0 ? "crit" : "neutral"} />
        <Kpi l="Links down" v={drawLinks.filter(l => l.status === "down").length} s="broken paths" tone={drawLinks.some(l => l.status === "down") ? "crit" : "ok"} />
      </div>

      <div className="sn-form-layout">
        <div className="sn-form-main">
          <div style={{ display: "flex", gap: 10, alignItems: "center", background: "white", border: "1px solid var(--border, #e5e8eb)", borderRadius: 4, padding: "8px 12px", marginBottom: 12 }}>
            <i className="fa-solid fa-magnifying-glass" style={{ color: "var(--fg-muted)", fontSize: 12 }} />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Highlight by name, IP, model, vendor…" style={{ flex: 1, border: "none", outline: "none", fontSize: 12.5, background: "transparent" }} />
            {q && <button className="sn-btn" style={{ padding: "2px 8px", fontSize: 11 }} onClick={() => setQuery("")}>Clear</button>}
            <span style={{ display: "flex", gap: 2, borderLeft: "1px solid var(--border, #e5e8eb)", paddingLeft: 10 }}>
              {[["physical", "Physical", "fa-server"], ["schematic", "Schematic", "fa-diagram-project"]].map(([id, l, ic]) => (
                <button key={id} className={`sn-btn${view === id ? " primary" : ""}`} style={{ padding: "3px 10px", fontSize: 11 }} onClick={() => setView(id)}><i className={`fa-solid ${ic}`} /> {l}</button>
              ))}
            </span>
            <span style={{ display: "flex", gap: 10, fontSize: 10.5, color: "var(--fg-muted)", borderLeft: "1px solid var(--border, #e5e8eb)", paddingLeft: 10 }}>
              {[["ok", "Healthy"], ["warn", "Warning"], ["crit", "Down / critical"], ["unknown", "Unknown"]].map(([s, l]) => (
                <span key={s}><i className="fa-solid fa-minus" style={{ color: STATUS_COLORS[s as NormalizedStatus].line, marginRight: 4 }} />{l}</span>
              ))}
            </span>
          </div>

          {/* Fleet-health heatmap overview (LinkedEye Domain Status) */}
          <div style={{ marginBottom: 12 }}>
            <DomainHeatmap devices={siteDevices} title={`Domain Status · ${siteObj.name || site}`} />
          </div>

          {loading && (
            <div style={{ background: "white", border: "1px solid var(--border, #e5e8eb)", borderRadius: 4, padding: 40, textAlign: "center", color: "var(--fg-muted)", fontSize: 12.5 }}>
              <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 22 }} /><div style={{ marginTop: 10 }}>Loading live topology…</div>
            </div>
          )}

          {!loading && view === "schematic" && (
            <div style={{ background: "white", border: "1px solid var(--border, #e5e8eb)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ padding: "8px 14px", borderBottom: "1px solid var(--border, #e5e8eb)", display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--fg-muted)" }}>
                <span><b style={{ color: "var(--fg, #16212e)" }}>Traffic-flow canvas</b> · click a device or a link for details</span>
                <span>last refresh {tick === 0 ? "just now" : "2s ago"} · auto 10s</span>
              </div>
              <div style={{ overflowX: "auto", background: "#fafbfc" }}>
                <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", minWidth: 900, height: "auto", display: "block" }}>
                  <defs>
                    {(["ok", "warn", "crit", "unknown"] as NormalizedStatus[]).map(s => (
                      <marker key={s} id={"arr-" + s} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5.5" markerHeight="5.5" orient="auto">
                        <path d="M0,0 L8,4 L0,8 z" fill={STATUS_COLORS[s].line} />
                      </marker>
                    ))}
                  </defs>

                  {/* layer bands + labels */}
                  {present.map((L, li) => (
                    <g key={L}>
                      {li % 2 === 1 && <rect x="0" y={40 + li * (NH + GAPY) - GAPY / 2 + NH / 2 + 4} width={W} height={NH + GAPY - 8} fill="#f2f5f8" opacity="0.55" />}
                      <text x="10" y={40 + li * (NH + GAPY) + NH / 2 + 4} fontSize="10" fontWeight="700" fill="#8896a5" style={{ textTransform: "uppercase", letterSpacing: ".08em" }} transform={`rotate(-90 10 ${40 + li * (NH + GAPY) + NH / 2 + 4})`} textAnchor="middle">{LAYER_LABELS[L]}</text>
                    </g>
                  ))}

                  {/* links */}
                  {drawLinks.map(l => {
                    const A = pos[l.a], B = pos[l.b];
                    const c = getLinkColor(l.status, l.util, l.errRate);
                    const s = c === STATUS_COLORS.crit ? "crit" : c === STATUS_COLORS.warn ? "warn" : c === STATUS_COLORS.unknown ? "unknown" : "ok";
                    const wLine = l.status === "down" ? 1.6 : 1.2 + Math.min(3.4, l.bwG / 28 + l.util / 40);
                    const midX = (A.x + B.x) / 2, midY = (A.y + B.y) / 2;
                    const path = `M ${A.x} ${A.y + NH / 2} C ${A.x} ${midY}, ${B.x} ${midY}, ${B.x} ${B.y - NH / 2}`;
                    const isSel = selLink?.id === l.id;
                    return (
                      <g key={l.id} onClick={() => setSel({ type: "link", id: l.id })} style={{ cursor: "pointer" }}>
                        <path d={path} fill="none" stroke="transparent" strokeWidth="14" />
                        <path d={path} fill="none" stroke={c.line} strokeWidth={isSel ? wLine + 1.4 : wLine} opacity={l.status === "down" ? 0.9 : 0.8}
                          className={l.status === "down" ? "" : "topo-flow" + (l.util < 35 ? " slow" : "")} markerEnd={`url(#arr-${s})`} />
                        {l.status === "down" && <path d={path} fill="none" stroke={c.line} strokeWidth={wLine} strokeDasharray="3 5" />}
                        <g transform={`translate(${midX}, ${midY})`}>
                          <rect x="-34" y="-9" width="68" height="16" rx="8" fill="white" stroke={c.border} strokeWidth="1" />
                          <text textAnchor="middle" y="3.5" fontSize="8.5" fontWeight="700" fill={c.fg} fontFamily="var(--font-mono)">{l.status === "down" ? "LINK DOWN" : fmtBps(l.rx + l.tx)}</text>
                        </g>
                      </g>
                    );
                  })}

                  {/* nodes */}
                  {Object.values(pos).map(({ x, y, n }) => {
                    const c = getHealthColor(n.status === "critical" || n.status === "down" ? "crit" : n.status);
                    const dim = n.d && !matches(n.d);
                    const isSel = selNode && (selNode.id === n.id);
                    const alerts = n.d ? alertCount(n.id) : 0;
                    const k = n.d ? (DEVICE_KINDS.find(kk => kk.id === n.d!.kind) || ({} as DeviceKind)) : ({} as DeviceKind);
                    return (
                      <g key={n.id} className="topo-node" opacity={dim ? 0.25 : 1} transform={`translate(${x - NW / 2}, ${y - NH / 2})`}
                         onClick={() => n.virtual ? null : setSel({ type: "node", id: n.id })} onDoubleClick={() => n.d && openDevice(n.id)}>
                        <rect className="card" width={NW} height={NH} rx="5" fill="white" stroke={isSel ? "#0ea5e9" : c.border} strokeWidth={isSel ? 2.2 : 1.4} />
                        <rect width="4" height={NH} rx="2" fill={c.line} />
                        <circle cx="14" cy="13" r="4" fill={c.line} />
                        {n.virtual ? (
                          <>
                            <text x="24" y="17" fontSize="10.5" fontWeight="700" fill="#16212e">{n.label}</text>
                            <text x="24" y="33" fontSize="8.5" fill="#7a8794">{n.sub}</text>
                            <text x="24" y="47" fontSize="8.5" fill="#7a8794">latency 4.2ms · loss 0%</text>
                          </>
                        ) : n.vm ? (
                          <>
                            <text x="24" y="17" fontSize="10" fontWeight="700" fontFamily="var(--font-mono)" fill="#16212e">{n.vm.id.length > 17 ? n.vm.id.slice(0, 16) + "…" : n.vm.id}</text>
                            <text x="24" y="31" fontSize="8.5" fill="#7a8794" fontFamily="var(--font-mono)">{n.vm.ip} · {n.vm.os.split(" ")[0]}</text>
                            <text x="24" y="46" fontSize="8.5" fill={getCpuColor(n.vm.cpuUse).fg} fontWeight="600">CPU {n.vm.cpuUse}%</text>
                            <text x="82" y="46" fontSize="8.5" fill={getMemColor(n.vm.memUse).fg} fontWeight="600">MEM {n.vm.memUse}%</text>
                          </>
                        ) : (
                          <>
                            <text x="24" y="17" fontSize="10" fontWeight="700" fontFamily="var(--font-mono)" fill="#16212e">{n.id.length > 17 ? n.id.slice(0, 16) + "…" : n.id}</text>
                            <text x="24" y="31" fontSize="8.5" fill="#7a8794" fontFamily="var(--font-mono)">{n.d!.ip} · {(n.d!.model || "").split(" ")[0]}</text>
                            <text x="24" y="46" fontSize="8.5" fill={getCpuColor(n.d!.cpu).fg} fontWeight="600">CPU {n.d!.cpu}%</text>
                            <text x="82" y="46" fontSize="8.5" fill={getMemColor(n.d!.mem).fg} fontWeight="600">MEM {n.d!.mem}%</text>
                            <foreignObject x={NW - 24} y="4" width="18" height="18"><div style={{ color: k.color, fontSize: 10, textAlign: "center" }}><i className={`${k.iconBrand ? "fa-brands" : "fa-solid"} ${k.icon}`} /></div></foreignObject>
                            {alerts > 0 && (
                              <g transform={`translate(${NW - 12}, ${NH - 12})`}>
                                <circle r="8" fill="#ef4444" /><text textAnchor="middle" y="3" fontSize="9" fontWeight="700" fill="white">{alerts}</text>
                              </g>
                            )}
                          </>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          )}

          {!loading && view === "physical" && (
            <PhysicalTopologyView siteDevices={siteDevices} matches={matches} sel={sel} setSel={setSel} openDevice={openDevice} alertCount={alertCount} site={site} tick={tick} />
          )}
        </div>

        <aside className="sn-form-side">
          {/* Selected link */}
          {selLink && (
            <div className="sn-side-card">
              <div className="sn-side-head">Link Detail</div>
              <div className="sn-side-body">
                <Field label="Path" value={<span className="mono" style={{ fontSize: 11 }}><b>{selLink.a === "__wan" ? "WAN" : selLink.a}</b> : {selLink.srcPort}<br />→ <b>{selLink.b}</b> : {selLink.dstPort}</span>} />
                <Field label="Status" value={<span style={statusBadgeStyle(selLink.status)}><i className="fa-solid fa-circle" style={{ fontSize: 6 }} /> {getStatusLabel(selLink.status)}</span>} />
                <Field label="Bandwidth" value={<span className="mono">{selLink.bwG}G {selLink.type}</span>} />
                <Field label="RX / TX" value={<span className="mono">{fmtBps(selLink.rx)} / {fmtBps(selLink.tx)}</span>} />
                <Field label="Utilization" value={<span style={{ color: getUtilColor(selLink.util).fg, fontWeight: 700 }}>{selLink.util}%</span>} />
                <Field label="Error rate" value={<span style={{ color: getErrorRateColor(selLink.errRate).fg, fontWeight: 700 }}>{selLink.errRate}%</span>} />
                <Field label="Packet drops" value={<span className="mono">{selLink.drops}/s</span>} />
                <Field label="Last changed" value={selLink.changed} />
              </div>
            </div>
          )}
          {/* Selected node */}
          {selNode && !selLink && (selNode.d || selNode.vm) && (
            <div className="sn-side-card">
              <div className="sn-side-head">{selNode.vm ? "VM Detail" : "Device Detail"}</div>
              <div className="sn-side-body">
                {selNode.d && <>
                  <Field label="Hostname" value={<span className="mono"><b>{selNode.id}</b></span>} />
                  <Field label="IP" value={<span className="mono">{selNode.d.ip}</span>} />
                  <Field label="Vendor / model" value={selNode.d.model} />
                  <Field label="Type" value={(DEVICE_KINDS.find(kk => kk.id === selNode.d!.kind) || ({} as DeviceKind)).label} />
                  <Field label="Status" value={<span style={statusBadgeStyle(selNode.d.status)}><i className="fa-solid fa-circle" style={{ fontSize: 6 }} /> {getStatusLabel(selNode.d.status)}</span>} />
                  <Field label="CPU / Mem" value={<span><b style={{ color: getCpuColor(selNode.d.cpu).fg }}>{selNode.d.cpu}%</b> / <b style={{ color: getMemColor(selNode.d.mem).fg }}>{selNode.d.mem}%</b></span>} />
                  <Field label="Uptime" value={selNode.d.uptime} />
                  <Field label="Active alerts" value={alertCount(selNode.id)} />
                  <div style={{ padding: "10px 12px" }}>
                    <button className="sn-btn primary" style={{ width: "100%" }} onClick={() => openDevice(selNode!.id)}><i className="fa-solid fa-arrow-up-right-from-square" /> Open device monitoring</button>
                  </div>
                </>}
                {selNode.vm && <>
                  <Field label="VM" value={<span className="mono"><b>{selNode.vm.id}</b></span>} />
                  <Field label="IP" value={<span className="mono">{selNode.vm.ip}</span>} />
                  <Field label="Host server" value={<a className="sn-link mono" onClick={() => openDevice(selNode!.vm!.host)}>{selNode.vm.host}</a>} />
                  <Field label="vNIC → vSwitch" value={<span className="mono">vNIC-0 → vSwitch0</span>} />
                  <Field label="Size" value={`${selNode.vm.cpu} · ${selNode.vm.mem} · ${selNode.vm.disk}`} />
                  <Field label="CPU / Mem" value={<span><b style={{ color: getCpuColor(selNode.vm.cpuUse).fg }}>{selNode.vm.cpuUse}%</b> / <b style={{ color: getMemColor(selNode.vm.memUse).fg }}>{selNode.vm.memUse}%</b></span>} />
                  <Field label="Path to WAN" value={<span className="mono" style={{ fontSize: 10.5 }}>{selNode.vm.id} → {selNode.vm.host} → ToR → Dist → Core → FW → WAN</span>} />
                </>}
              </div>
            </div>
          )}
          {!sel && (
            <div className="sn-side-card">
              <div className="sn-side-head">Details</div>
              <div className="sn-side-body">
                <div style={{ padding: 18, textAlign: "center", color: "var(--fg-muted)", fontSize: 12 }}>
                  <i className="fa-solid fa-hand-pointer" style={{ fontSize: 24, color: "var(--fg-faint)" }} />
                  <div style={{ marginTop: 8 }}>Click a device node or a traffic link<br />Double-click a node to open monitoring</div>
                </div>
              </div>
            </div>
          )}
          <div className="sn-side-card">
            <div className="sn-side-head">Site Summary</div>
            <div className="sn-side-body">
              <Field label="Site" value={<b>{siteObj.name}</b>} />
              <Field label="Region" value={siteObj.region} />
              <Field label="Devices" value={siteDevices.length} />
              <Field label="Links" value={drawLinks.length} />
              <Field label="Health" value={<span style={{ color: getMetricColor(100 - siteObj.health, 5, 10).fg, fontWeight: 700 }}>{siteObj.health}%</span>} />
              <Field label="Sources" value="SNMP · LLDP · NetFlow · node-exporter" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ---- Physical view: real faceplates with lit ports, grouped sections, measured link curves ----
export function PhysicalTopologyView({ siteDevices, matches, sel, setSel, openDevice, alertCount, site, tick }: {
  siteDevices: Device[];
  matches: (d: Device) => boolean;
  sel: Sel;
  setSel: React.Dispatch<React.SetStateAction<Sel>>;
  openDevice: (id: string) => void;
  alertCount: (id: string) => number;
  site: string;
  tick: number;
}) {
  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const [lines, setLines] = React.useState<{ d: string; down: boolean; key: string }[]>([]);
  const [size, setSize] = React.useState({ w: 0, h: 0 });
  const [portPop, setPortPop] = React.useState<{ x: number; y: number; d: Device; idx: number; connected: boolean } | null>(null); // {x,y,d,idx,connected}
  const [modalDevId, setModalDevId] = React.useState<string | null>(null);
  const siteVMs = VMS.filter(v => siteDevices.some(d => d.id === v.host));
  const allLinks: [string, string][] = [
    ...NET_LINKS.filter(([a, b]) => siteDevices.some(d => d.id === a) && siteDevices.some(d => d.id === b)),
    ...siteVMs.map(v => [v.host, v.id] as [string, string]),
  ];

  const hash = (s: string) => s.split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const neighborsOf = (id: string) => NET_LINKS.filter(([a, b]) => a === id || b === id).map(([a, b]) => (a === id ? b : a));
  const portDetail = (d: Device, idx: number, connected: boolean) => {
    const key = d.id + "#" + idx;
    const h = hash(key);
    const neighbors = neighborsOf(d.id);
    const peer = connected ? (neighbors[idx % Math.max(1, neighbors.length)] || `endpoint-${idx + 1}`) : null;
    const peerDev = peer ? siteDevices.find(x => x.id === peer) : null;
    const speed = ((d.kind === "router" ? ["10G", "40G"] : d.kind === "firewall" ? ["1G", "10G"] : ["1G", "10G", "25G"])[h % 3]) || "1G";
    const vlan = idx < 2 ? "trunk" : String(100 + (h % 4) * 10);
    const baseUtil = 8 + (h % 70);
    const wobble = Math.sin((h + tick * 3.1)) * 6;
    const util = connected ? Math.max(1, Math.min(98, Math.round(baseUtil + wobble))) : 0;
    const rx = connected ? Math.round(util * 9.4) : 0, tx = connected ? Math.round(util * 6.8) : 0;
    const err = connected && h % 19 === 0 ? 1.4 : 0;
    return { name: `${(d.model || "").split(" ")[0].slice(0,2).toUpperCase()}${idx+1}`, connected, peer, peerIp: peerDev ? peerDev.ip : (connected ? `10.10.${h % 200}.${(h*3) % 250}` : null), speed, duplex: connected ? "full" : "—", vlan, util, rx, tx, err, upSince: connected ? `${3 + (h % 180)}d ${h % 24}h` : "—" };
  };
  const showPortPop = (ev: React.MouseEvent, d: Device, idx: number, connected: boolean) => {
    const r = ev.currentTarget.getBoundingClientRect();
    setPortPop({ x: r.left + 8, y: r.bottom + 8, d, idx, connected });
  };

  const measure = () => {
    const wrap = wrapRef.current; if (!wrap) return;
    const wr = wrap.getBoundingClientRect();
    const c: Record<string, { x: number; top: number; bottom: number }> = {};
    wrap.querySelectorAll("[data-dev]").forEach(el => {
      const r = el.getBoundingClientRect();
      c[el.getAttribute("data-dev") as string] = { x: r.left + r.width / 2 - wr.left, top: r.top - wr.top, bottom: r.bottom - wr.top };
    });
    const ls: { d: string; down: boolean; key: string }[] = [];
    allLinks.forEach(([a, b]) => {
      const A = c[a], B = c[b]; if (!A || !B) return;
      const downEnd = [a, b].some(id => (siteDevices.find(d => d.id === id) || ({} as Partial<Device>)).status === "down");
      const y1 = A.top < B.top ? A.bottom : A.top, y2 = A.top < B.top ? B.top : B.bottom;
      ls.push({ d: `M ${A.x} ${y1} C ${A.x} ${(y1 + y2) / 2}, ${B.x} ${(y1 + y2) / 2}, ${B.x} ${y2}`, down: downEnd, key: a + "→" + b });
    });
    setLines(ls);
    setSize({ w: wrap.scrollWidth, h: wrap.scrollHeight });
  };
  React.useEffect(() => {
    const t = setTimeout(measure, 80);
    window.addEventListener("resize", measure);
    return () => { clearTimeout(t); window.removeEventListener("resize", measure); };
  }, [site, siteDevices.length]);

  const parseIface = (s?: string) => { const m = /(\d+)\s*\/\s*(\d+)/.exec(s || ""); return m ? { up: +m[1], total: +m[2] } : { up: 24, total: 24 }; };
  const GREEN = "#10b981", DARK = "#39424c", RED = "#ef4444";

  interface BrandStyle { chassis: string; frame: string; brand: string; brandColor: string; portBg: string; dark?: boolean; italicBrand?: boolean }
  const brandFor = (d: Device): BrandStyle => {
    const vendor = (d.model || "").split(" ")[0];
    if (d.kind === "firewall") {
      if (/forti/i.test(vendor)) return { chassis: "linear-gradient(180deg,#f6f3ee,#e6e2da)", frame: "#f59e0b", brand: "FORTINET.", brandColor: "#dc2626", portBg: "#20242a", italicBrand: true };
      return { chassis: "linear-gradient(180deg,#f2efe9,#e0dcd3)", frame: "#c9a44a", brand: vendor.toUpperCase(), brandColor: "#8a6a1c", portBg: "#20242a" };
    }
    if (d.kind === "router" || d.kind === "loadbal")
      return { chassis: "linear-gradient(180deg,#23272e,#15181d)", frame: "#3a4048", brand: vendor.toUpperCase(), brandColor: "#9aa4b1", portBg: "#0c0f13", dark: true };
    // switches — light Huawei/Cisco/Arista chassis
    return { chassis: "linear-gradient(180deg,#e9ebee,#cbd0d6)", frame: "#aab0b8", brand: vendor.toUpperCase(), brandColor: "#5a6472", portBg: "#2a2e35" };
  };

  const Faceplate = ({ d }: { d: Device }) => {
    const { up, total } = parseIface(d.iface);
    const T = Math.min(48, total), U = d.status === "down" ? 0 : Math.round(T * up / total);
    const c = getHealthColor(d.status === "critical" || d.status === "down" ? "crit" : d.status);
    const isSel = sel?.type === "node" && sel.id === d.id;
    const [tools, setTools] = React.useState(false);
    const brand = brandFor(d);
    return (
      <div data-dev={d.id} onClick={() => { setSel({ type: "node", id: d.id }); setModalDevId(d.id); }} onDoubleClick={() => openDevice(d.id)}
        onMouseEnter={() => setTools(true)} onMouseLeave={() => setTools(false)}
        style={{ opacity: matches(d) ? 1 : 0.25, cursor: "pointer", background: "#191c22", border: `1px solid ${isSel ? "#0ea5e9" : d.status === "down" || d.status === "critical" ? RED : "#2f6e57"}`, borderRadius: 10, padding: "10px 12px", minWidth: 340, flex: "1 1 340px", maxWidth: 560, boxShadow: isSel ? "0 0 0 3px rgba(14,165,233,.2)" : "0 2px 8px rgba(0,0,0,.35)", position: "relative", zIndex: 1 }}>
        {tools && (
          <div onClick={e => e.stopPropagation()} onDoubleClick={e => e.stopPropagation()}
            style={{ position: "absolute", left: "50%", top: "58%", transform: "translate(-50%, -50%)", zIndex: 5, display: "flex", alignItems: "center", gap: 4, background: "#16212e", borderRadius: 22, padding: "6px 10px", boxShadow: "0 8px 20px rgba(0,0,0,.4)" }}>
            {([
              ["fa-chart-column", "Device report", () => openDevice(d.id)],
              ["fa-heart-pulse", "Health & availability", () => openDevice(d.id)],
              ["fa-circle-question", "Help", () => {}],
              ["fa-envelope", "Notify owner", () => {}],
              ["fa-clock-rotate-left", "History", () => {}],
              ["fa-xmark", "Close", () => setTools(false)],
            ] as [string, string, () => void][]).map(([ic, title, fn]) => (
              <span key={ic} title={title} onClick={fn}
                style={{ width: 26, height: 26, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "white", cursor: "pointer", fontSize: 12 }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#2a3a4d"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                <i className={`fa-solid ${ic}`} />
              </span>
            ))}
          </div>
        )}
        {/* centered title + [T]/(i) buttons — real Domain Status layout */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 7 }}>
          <span className="mono" style={{ flex: 1, textAlign: "center", fontSize: 12.5, fontWeight: 600, color: "#dfe5ec" }}>{d.ip} <span style={{ color: "#8b95a3", fontWeight: 400 }}>( {d.id} )</span></span>
          <span style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <span title="Terminal" style={{ width: 20, height: 20, borderRadius: 4, border: "1.5px solid #aeb7c2", color: "#aeb7c2", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800 }}>T</span>
            <span title="Device info" onClick={e => { e.stopPropagation(); openDevice(d.id); }} style={{ width: 20, height: 20, borderRadius: "50%", border: "1.5px solid #aeb7c2", color: "#aeb7c2", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, cursor: "pointer" }}><i className="fa-solid fa-info" /></span>
          </span>
        </div>
        {/* capability icon strip — green tiles like the real product */}
        <div style={{ display: "flex", gap: 8, marginBottom: 9 }}>
          {["fa-clock", "fa-microchip", "fa-memory", "fa-temperature-half", "fa-fan"].map((ic, i) => (
            <span key={ic} style={{ width: 26, height: 26, borderRadius: 3, background: i === 4 && d.status !== "ok" ? "#1d2a26" : "#2dd4a8", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <i className={`fa-solid ${ic}`} style={{ fontSize: 12, color: i === 4 && d.status !== "ok" ? "#2dd4a8" : "#0c1512" }} />
            </span>
          ))}
          {alertCount(d.id) > 0 && <span style={{ width: 26, height: 26, borderRadius: 3, background: RED, color: "white", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800 }}>{alertCount(d.id)}</span>}
        </div>
        {/* vendor-styled chassis */}
        <div style={{ background: brand.chassis, borderRadius: 4, padding: "8px 10px", display: "flex", alignItems: "center", gap: 10, border: `1.5px solid ${brand.frame}`, borderTop: `3px solid ${brand.frame}`, borderBottom: `3px solid ${brand.frame}`, position: "relative" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, flexShrink: 0, minWidth: 54 }}>
            <span className="mono" style={{ fontSize: 9, fontWeight: 800, color: brand.brandColor, letterSpacing: 0.3, fontStyle: brand.italicBrand ? "italic" : "normal" }}>{brand.brand}</span>
            <span style={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {["PWR", "SYS", "SPD"].map((l, i) => (
                <span key={l} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <span style={{ width: 4, height: 4, borderRadius: "50%", background: i === 0 || d.status === "ok" ? GREEN : i === 1 && d.status !== "down" ? GREEN : "#4a5158", boxShadow: i === 0 ? `0 0 3px ${GREEN}` : "none" }} />
                  <span style={{ fontSize: 6.5, fontFamily: "var(--font-mono)", color: brand.dark ? "#7c86a0" : "#6a7380" }}>{l}</span>
                </span>
              ))}
            </span>
          </div>
          <div style={{ display: "grid", gridAutoFlow: "column", gridTemplateRows: "repeat(2, 14px)", gap: 3, flex: 1 }}>
            {Array.from({ length: T }, (_, i) => (
              <span key={i}
                onMouseEnter={e => { e.stopPropagation(); showPortPop(e, d, i, i < U); }}
                onMouseLeave={() => setPortPop(null)}
                onClick={e => { e.stopPropagation(); showPortPop(e, d, i, i < U); }}
                title={`port ${i + 1}`}
                style={{
                  width: 16, height: 14, cursor: "pointer",
                  background: i < U ? GREEN : d.status === "down" ? RED : brand.portBg,
                  clipPath: "polygon(0 0, 100% 0, 100% 58%, 76% 58%, 76% 100%, 24% 100%, 24% 58%, 0 58%)",
                  boxShadow: i < U ? "0 0 4px rgba(16,185,129,.75)" : "none",
                  animation: i < U ? "portPulse 2.4s ease-in-out infinite" : "none",
                  animationDelay: (i % 6) * 0.3 + "s",
                }} />
            ))}
          </div>
          {/* SFP uplink cage */}
          <div style={{ display: "grid", gridTemplateRows: "repeat(2, 14px)", gridAutoFlow: "column", gap: 3, flexShrink: 0 }}>
            {[0, 1, 2, 3].map(i => <span key={i} style={{ width: 22, height: 14, borderRadius: 1.5, background: i < 2 ? GREEN : brand.portBg, border: `1px solid ${brand.dark ? "#31363d" : "#9aa1aa"}`, boxShadow: i < 2 ? "0 0 4px rgba(16,185,129,.6)" : "none" }} />)}
          </div>
          <span className="mono" style={{ color: brand.dark ? "#6b7583" : "#7d8692", fontSize: 8.5, writingMode: "vertical-rl", textOrientation: "mixed", flexShrink: 0 }}>{(d.model || "").split(" ").slice(0, 2).join(" ")}</span>
        </div>
        {/* status pills — outlined, dark theme */}
        <div style={{ display: "flex", gap: 6, marginTop: 9, flexWrap: "wrap" }}>
          {([["Disconnected", total - up, false], ["Connected", d.status === "down" ? 0 : up, true], ["Unknown", 0, false]] as [string, number, boolean][]).map(([l, n, on]) => (
            <span key={l} style={{ border: `1px solid ${on && n > 0 ? "#14b8a6" : "#3d4654"}`, color: on && n > 0 ? "#2dd4bf" : "#8b95a3", borderRadius: 4, padding: "2px 10px", fontSize: 10.5, fontWeight: 600 }}>{l} ({n})</span>
          ))}
          <span style={{ marginLeft: "auto", border: `1px solid ${c.line}`, color: c.line, borderRadius: 4, padding: "2px 10px", fontSize: 10.5, fontWeight: 700 }}><i className="fa-solid fa-circle" style={{ fontSize: 5, marginRight: 5 }} />{getStatusLabel(d.status)}</span>
        </div>
      </div>
    );
  };

  const NodeCard = ({ id, ip, name, badge, status, vm }: { id: string; ip: string; name: string; badge: { n: number; tone: string }; status: string; vm: Vm | null }) => {
    const c = getHealthColor(status === "critical" || status === "down" ? "crit" : status);
    const isSel = sel?.type === "node" && sel.id === id;
    const dev = siteDevices.find(x => x.id === id);
    return (
      <div data-dev={id} onClick={() => { setSel({ type: "node", id }); if (dev) setModalDevId(id); }} onDoubleClick={() => dev && openDevice(id)}
        style={{ opacity: !dev || matches(dev) ? 1 : 0.25, cursor: "pointer", position: "relative", zIndex: 1, background: "#15181d", border: `1.5px solid ${isSel ? "#0ea5e9" : c.line}`, borderRadius: 8, padding: "16px 12px 14px", width: 190, textAlign: "center", boxShadow: isSel ? "0 0 0 3px rgba(14,165,233,.2)" : "0 2px 8px rgba(0,0,0,.35)" }}>
        {/* corner dashes like the real product cards */}
        {[{ top: -1, left: 14 }, { top: -1, right: 14 }, { bottom: -1, left: 14 }, { bottom: -1, right: 14 }].map((pos, i) => (
          <span key={i} style={{ position: "absolute", ...pos, width: 26, height: 2, background: "#e8ecf1", borderRadius: 2 }} />
        ))}
        <span style={{ position: "absolute", top: -10, right: -9, minWidth: 20, height: 20, borderRadius: 10, padding: "0 6px", background: badge.tone === "warn" ? "#f59e0b" : status === "down" || status === "critical" ? RED : "#16a34a", color: badge.tone === "warn" ? "#1c1917" : "white", fontSize: 10.5, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", border: "2px solid #101318" }}>{badge.n}</span>
        <div className="mono" style={{ fontSize: 13.5, fontWeight: 600, color: "#e5e9ee" }}>{ip}</div>
        <div style={{ fontSize: 11.5, color: "#8b95a3", marginTop: 3 }}>({name})</div>
        {vm && <div style={{ marginTop: 5, fontSize: 10, color: "#5f6975" }}>{vm.cpu} · {vm.mem}</div>}
      </div>
    );
  };

  const Section = ({ label, count, children }: { label: string; count: number; children: React.ReactNode }) => (
    <div style={{ marginBottom: 30 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 15, fontWeight: 500, letterSpacing: ".1em", textTransform: "uppercase", color: "#e5e9ee" }}>{label}</span>
        <span style={{ width: 22, height: 22, borderRadius: 11, background: "#d4c22b", color: "#1c1917", fontSize: 11, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{count}</span>
        <i className="fa-solid fa-magnifying-glass" style={{ fontSize: 12, color: "#aeb7c2" }} />
      </div>
      {children}
    </div>
  );

  const faceKinds = ["router", "firewall", "switch", "loadbal"];
  const groups: { label: string; devs: Device[]; face?: boolean }[] = [
    { label: "Network — Routers & Firewalls", devs: siteDevices.filter(d => ["router", "firewall"].includes(d.kind)), face: true },
    { label: "Switches", devs: siteDevices.filter(d => d.kind === "switch"), face: true },
    { label: "Load Balancers", devs: siteDevices.filter(d => d.kind === "loadbal"), face: true },
    { label: "Physical Servers", devs: siteDevices.filter(d => ["hypervisor", "phys-srv"].includes(d.kind)) },
    { label: "Servers — OS", devs: siteDevices.filter(d => ["win-srv", "linux-srv"].includes(d.kind)) },
    { label: "Storage", devs: siteDevices.filter(d => d.kind === "storage") },
  ].filter(g => g.devs.length > 0);

  return (
    <div style={{ background: "#131519", border: "1px solid #23262c", borderRadius: 8, color: "#e5e9ee" }}>
      <style>{`@keyframes portPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }`}</style>
      {/* Domain Status header — real product layout */}
      <div style={{ padding: "16px 20px 4px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 13, color: "#8b95a3" }}>{site} <span style={{ margin: "0 4px" }}>›</span></div>
            <div style={{ fontSize: 24, fontWeight: 500, letterSpacing: 0.2 }}>Domain Status</div>
          </div>
          <div style={{ display: "flex", gap: 18, paddingTop: 6 }}>
            {[0, 1].map(i => (
              <span key={i} style={{ color: "#2dd4a8", fontSize: 18 }} title={i === 0 ? "WAN reachable" : "LAN reachable"}><i className="fa-solid fa-desktop" /><i className="fa-solid fa-check" style={{ fontSize: 9, marginLeft: -7, verticalAlign: "top", background: "#131519", borderRadius: 3 }} /></span>
            ))}
          </div>
        </div>
        <div style={{ fontSize: 11, color: "#5f6975", marginTop: 4 }}>hover or click a port for live link detail · click a device, double-click to open monitoring · links auto-drawn from LLDP · refreshed every 10s</div>
      </div>
      {portPop && (
        <div style={{ padding: "8px 14px 0" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#7c3aed", color: "white", borderRadius: 6, padding: "5px 14px", fontSize: 12.5, fontWeight: 600, letterSpacing: 0.2, boxShadow: "0 2px 8px rgba(124,58,237,.35)" }}>
            {portPop.d.ip.replace(/\./g, "_")} port {portPop.idx + 1} selected
          </span>
        </div>
      )}
      <div ref={wrapRef} style={{ position: "relative", padding: 18, overflow: "hidden" }}>
        <svg width={size.w} height={size.h} style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
          {lines.map(l => (
            <path key={l.key} d={l.d} fill="none" stroke={l.down ? RED : GREEN} strokeWidth={l.down ? 1.8 : 1.5} strokeDasharray={l.down ? "4 4" : "none"} opacity="0.55" />
          ))}
        </svg>
        {groups.map(g => (
          <Section key={g.label} label={g.label} count={g.devs.length}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-start" }}>
              {g.devs.map(d => g.face
                ? <Faceplate key={d.id} d={d} />
                : <NodeCard key={d.id} id={d.id} ip={d.ip} name={d.id} status={d.status}
                    badge={{ n: d.kind === "hypervisor" ? VMS.filter(v => v.host === d.id).length || 16 : parseIface(d.iface).up, tone: d.status === "ok" ? "ok" : "warn" }} vm={null} />)}
            </div>
          </Section>
        ))}
        {siteVMs.length > 0 && (
          <Section label="Virtual Machines" count={siteVMs.length}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
              {siteVMs.map(v => (
                <NodeCard key={v.id} id={v.id} ip={v.ip} name={v.id} status={v.state === "running" ? (v.cpuUse > 70 ? "warn" : "ok") : "unknown"}
                  badge={{ n: 1, tone: v.cpuUse > 70 ? "warn" : "ok" }} vm={v} />
              ))}
            </div>
          </Section>
        )}
      </div>

      {modalDevId && (() => {
        const d = siteDevices.find(x => x.id === modalDevId);
        if (!d) return null;
        return <DeviceQuickModal d={d} onClose={() => { setModalDevId(null); setPortPop(null); }} openDevice={openDevice} parseIface={parseIface}
          showPortPop={showPortPop} hidePortPop={() => setPortPop(null)} GREEN={GREEN} DARK={DARK} RED={RED} alertCount={alertCount} />;
      })()}

      {portPop && (() => {
        const p = portDetail(portPop.d, portPop.idx, portPop.connected);
        const c = p.connected ? (p.err > 0 ? STATUS_COLORS.warn : STATUS_COLORS.ok) : STATUS_COLORS.unknown;
        return (
          <div style={{ position: "fixed", left: portPop.x, top: portPop.y, zIndex: 60, background: "#16212e", color: "white", borderRadius: 6, padding: "10px 13px", fontSize: 11.5, minWidth: 210, boxShadow: "0 10px 24px rgba(0,0,0,.3)", pointerEvents: "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span className="mono" style={{ fontWeight: 800 }}>{portPop.d.id} · {p.name}</span>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: c.line, animation: p.connected ? "portPulse 1.4s ease-in-out infinite" : "none" }} />
            </div>
            {p.connected ? (
              <>
                <div style={{ color: "#c4cdd6", marginBottom: 4 }}>→ <b style={{ color: "white" }}>{p.peer}</b> {p.peerIp && <span className="mono">({p.peerIp})</span>}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 10px", color: "#c4cdd6" }}>
                  <span>Speed / duplex</span><span className="mono" style={{ color: "white" }}>{p.speed} · {p.duplex}</span>
                  <span>VLAN</span><span className="mono" style={{ color: "white" }}>{p.vlan}</span>
                  <span>RX / TX</span><span className="mono" style={{ color: "white" }}>{p.rx} / {p.tx} Mbps</span>
                  <span>Utilization</span><span className="mono" style={{ color: c.line, fontWeight: 700 }}>{p.util}%</span>
                  <span>Errors</span><span className="mono" style={{ color: p.err > 0 ? STATUS_COLORS.warn.line : "white", fontWeight: p.err > 0 ? 700 : 400 }}>{p.err}%</span>
                  <span>Up since</span><span className="mono" style={{ color: "white" }}>{p.upSince}</span>
                </div>
              </>
            ) : (
              <div style={{ color: "#8a97a5" }}>Empty port · no link partner detected</div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

// ---- Quick-view modal opened from a device card — CPU/Mem/Ports/Fan/Disk/Temp/Tools tabs + status footer ----
export function DeviceQuickModal({ d, onClose, openDevice, parseIface, showPortPop, hidePortPop, GREEN, DARK, RED, alertCount }: {
  d: Device;
  onClose: () => void;
  openDevice: (id: string) => void;
  parseIface: (s?: string) => { up: number; total: number };
  showPortPop: (ev: React.MouseEvent, d: Device, idx: number, connected: boolean) => void;
  hidePortPop: () => void;
  GREEN: string;
  DARK: string;
  RED: string;
  alertCount: (id: string) => number;
}) {
  const [tab, setTab] = React.useState("ports");
  const seed = d.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const { up, total } = parseIface(d.iface);
  const T = Math.min(48, total), U = d.status === "down" ? 0 : Math.round(T * up / total);
  const disk = 30 + (seed % 55), temp = 28 + (seed % 22), fanOk = d.status !== "critical";

  const TABS: [string, string][] = [
    ["cpu", "fa-microchip"], ["mem", "fa-memory"], ["ports", "fa-table-cells"], ["fan", "fa-fan"],
    ["disk", "fa-hard-drive"], ["uptime", "fa-clock"], ["temp", "fa-temperature-half"], ["tools", "fa-screwdriver-wrench"],
  ];
  const StatBlock = ({ label, value, sub, color }: { label: React.ReactNode; value: React.ReactNode; sub?: React.ReactNode; color?: string }) => (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 34, fontWeight: 800, color: color || "white", fontFamily: "var(--font-mono)" }}>{value}</div>
      <div style={{ fontSize: 12, color: "#8a97a5", marginTop: 4, textTransform: "uppercase", letterSpacing: ".06em" }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: "#5c6b7a", marginTop: 6 }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 55, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(8,12,16,.45)" }} />
      <div onClick={e => e.stopPropagation()} style={{ position: "relative", width: 620, maxWidth: "92vw", background: "#10161c", borderRadius: 8, border: "1px solid #232d36", boxShadow: "0 24px 60px rgba(0,0,0,.4)" }}>
        {/* header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #232d36" }}>
          <span className="mono" style={{ color: "white", fontWeight: 700, fontSize: 13.5 }}>{d.ip} <span style={{ color: "#7a8794", fontWeight: 500 }}>( {d.id} )</span></span>
          <div style={{ display: "flex", gap: 6 }}>
            {["fa-tag", "fa-magnifying-glass", "fa-circle-info", "fa-table-cells-large"].map(ic => (
              <span key={ic} style={{ width: 22, height: 22, borderRadius: 4, background: "#1b232c", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#8a97a5", fontSize: 10, cursor: "pointer" }}><i className={`fa-solid ${ic}`} /></span>
            ))}
            <span onClick={onClose} style={{ width: 22, height: 22, borderRadius: 4, background: "#1b232c", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#e5e8eb", fontSize: 10, cursor: "pointer" }}><i className="fa-solid fa-xmark" /></span>
          </div>
        </div>

        {/* icon tab strip */}
        <div style={{ display: "flex", gap: 6, padding: "12px 16px 0" }}>
          {TABS.map(([id, ic]) => (
            <span key={id} onClick={() => setTab(id)} title={id}
              style={{ width: 34, height: 34, borderRadius: 5, background: tab === id ? "#0d3a30" : "#1b232c", border: `1.5px solid ${tab === id ? GREEN : "#232d36"}`, display: "inline-flex", alignItems: "center", justifyContent: "center", color: tab === id ? GREEN : "#8a97a5", fontSize: 13, cursor: "pointer" }}>
              <i className={`fa-solid ${ic}`} />
            </span>
          ))}
          {alertCount(d.id) > 0 && <span style={{ marginLeft: "auto", alignSelf: "center", background: RED, color: "white", borderRadius: 9, padding: "2px 8px", fontSize: 10.5, fontWeight: 700 }}>{alertCount(d.id)} alerts</span>}
        </div>

        {/* content */}
        <div style={{ minHeight: 190, padding: "22px 20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {tab === "cpu" && <StatBlock label="CPU usage" value={d.cpu + "%"} sub={`load avg ${(d.cpu/25).toFixed(2)}`} color={getCpuColor(d.cpu).line} />}
          {tab === "mem" && <StatBlock label="Memory usage" value={d.mem + "%"} sub="of installed RAM" color={getMemColor(d.mem).line} />}
          {tab === "disk" && <StatBlock label="Disk usage" value={disk + "%"} sub="/ mount point" color={getDiskColor(disk).line} />}
          {tab === "uptime" && <StatBlock label="Uptime" value={d.uptime} sub={`last reboot ${d.uptime} ago`} />}
          {tab === "temp" && <StatBlock label="Inlet temperature" value={temp + "°C"} sub={temp > 40 ? "above threshold" : "nominal"} color={temp > 40 ? RED : GREEN} />}
          {tab === "fan" && (
            <div style={{ display: "flex", gap: 22 }}>
              {["FAN-1", "FAN-2", "FAN-3"].map((f, i) => (
                <div key={f} style={{ textAlign: "center" }}>
                  <i className="fa-solid fa-fan" style={{ fontSize: 24, color: (i === 2 && !fanOk) ? RED : GREEN }} />
                  <div style={{ color: "#8a97a5", fontSize: 11, marginTop: 6 }}>{f}</div>
                  <div style={{ color: "white", fontSize: 10.5, fontFamily: "var(--font-mono)" }}>{(i === 2 && !fanOk) ? "FAIL" : "8,4xx RPM"}</div>
                </div>
              ))}
            </div>
          )}
          {tab === "tools" && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
              {[["SSH", "fa-terminal"], ["Re-poll", "fa-rotate"], ["Mute alerts", "fa-bell-slash"]].map(([l, ic]) => (
                <button key={l} className="sn-btn" style={{ background: "#1b232c", color: "white", border: "1px solid #232d36" }}><i className={`fa-solid ${ic}`} /> {l}</button>
              ))}
              <button className="sn-btn primary" onClick={() => openDevice(d.id)}><i className="fa-solid fa-arrow-up-right-from-square" /> Open full monitoring</button>
            </div>
          )}
          {tab === "ports" && (
            <div style={{ width: "100%" }}>
              <div style={{ background: "#1b232c", borderRadius: 5, padding: "12px 14px", border: "1px solid #0d1319", display: "grid", gridAutoFlow: "column", gridTemplateRows: "repeat(4, 13px)", gap: 3, gridAutoColumns: 15, overflowX: "auto" }}>
                {Array.from({ length: T }, (_, i) => (
                  <span key={i}
                    onMouseEnter={e => { e.stopPropagation(); showPortPop(e, d, i, i < U); }}
                    onMouseLeave={hidePortPop}
                    style={{ width: 15, height: 13, borderRadius: 2, background: i < U ? GREEN : d.status === "down" ? RED : DARK, boxShadow: i < U ? "0 0 3px rgba(16,185,129,.7)" : "none", cursor: "pointer", animation: i < U ? "portPulse 2.4s ease-in-out infinite" : "none", animationDelay: (i % 6) * 0.3 + "s" }} />
                ))}
              </div>
              <div style={{ textAlign: "center", color: "#5c6b7a", fontSize: 11, marginTop: 10 }}>hover a port for live link detail</div>
            </div>
          )}
        </div>

        {/* footer status filter */}
        <div style={{ display: "flex", gap: 8, padding: "12px 16px", borderTop: "1px solid #232d36" }}>
          {([["Critical", d.status === "critical" ? 1 : 0, RED], ["Ok", d.status !== "critical" && d.status !== "down" ? U : 0, GREEN], ["Warning", d.status === "warn" ? 1 : 0, "#f59e0b"], ["Unknown", total - up, "#64748b"]] as [string, number, string][]).map(([l, n, color]) => (
            <span key={l} style={{ background: "#1b232c", border: `1px solid ${color}`, color: "white", borderRadius: 4, padding: "4px 10px", fontSize: 11.5, fontWeight: 600 }}>{l}({n})</span>
          ))}
          <span style={{ marginLeft: "auto", background: "#1b232c", border: "1px solid #232d36", color: "#8a97a5", borderRadius: 4, padding: "4px 10px", fontSize: 11.5, cursor: "pointer" }}>All</span>
        </div>
      </div>
    </div>
  );
}
