// Live data-center topology: WAN → router → firewall → core → access → server → VM.
// Devices come from GET /api/infra/devices/, links from
// GET /api/infra/sites/{id}/topology/ (seed graph when that is not reachable).
// Two views of the same graph: a layered traffic-path diagram and a grouped
// view by device type. Every node is a button that opens the device page;
// link labels are buttons that show the link in the side panel.
//
// Only what the inventory / topology API reports is shown: status, CPU and
// memory from the device record, link ports, bandwidth and status. Per-link
// utilisation, error rates and port counters need the SNMP exporter and are
// shown on the device pages' live charts instead.
import "@/styles/devices.css";
import React from "react";
import { useNav } from "@/hooks/useNav";
import { useDevices, useInfraAlerts, useTopology } from "@/api/hooks";
import { SITES, DEVICE_KINDS, DEVICES, NET_LINKS, VMS, INFRA_ALERTS } from "@/data/infra";
import { Empty, Panel, Pill } from "@/components/ld";
import type { Tone } from "@/components/ld";
import { Kpi } from "@/components/KpiCard";
import { STATUS_COLORS, getHealthColor, getStatusLabel, normalizeStatus, type NormalizedStatus } from "@/lib/statusColors";
import type { Device, Site, Vm } from "@/lib/types";

import { Icon } from "@/components/Icon";
import { BoxIcon, ChevronRightIcon, ExternalLinkIcon, NetworkIcon, PlusIcon, RadioTowerIcon, SearchIcon, ServerIcon, UnplugIcon, WorkflowIcon } from "lucide-react";
interface TopoNode {
  id: string;
  layer: number;
  status: string;
  virtual?: boolean;
  d?: Device;
  vm?: Vm;
}

interface TopoLink {
  id: string;
  a: string;
  b: string;
  srcPort?: string;
  dstPort?: string;
  bandwidth?: string;
  status: string;
  type: "wan" | "physical" | "virtual";
  live: boolean;
}

const LAYER_LABELS = ["Internet / WAN", "Edge Routers", "Firewalls", "Core & Delivery", "Access / ToR", "Servers & Storage", "VMs / Workloads"];
const SERVER_KINDS = ["hypervisor", "phys-srv", "linux-srv", "win-srv"];
const ROUTE_BY_KIND: Record<string, string> = {
  firewall: "firewall-detail", switch: "switch-detail", loadbal: "loadbal-detail", ups: "ups-detail", storage: "storage-detail", nas: "storage-detail",
  ...Object.fromEntries(SERVER_KINDS.map((k) => [k, "server-detail"])),
};
const TONE: Record<NormalizedStatus, Tone> = { ok: "ok", warn: "warn", crit: "crit", unknown: "muted" };
const statusTone = (s: string) => TONE[normalizeStatus(s)];
const kindOf = (kind: string) => DEVICE_KINDS.find((k) => k.id === kind);

function layerOf(d: Device): number | undefined {
  if (d.kind === "switch") return d.role === "ToR" || d.role === "Distribution" ? 4 : 3;
  return ({ router: 1, firewall: 2, loadbal: 3, hypervisor: 5, "phys-srv": 5, "win-srv": 5, "linux-srv": 5, storage: 5 } as Record<string, number>)[d.kind];
}

/** "48 / 52 up" → { up: 48, total: 52 } (null when the record has no interface count) */
function parseIface(s?: string) {
  const r = /(\d+)\s*\/\s*(\d+)/.exec(s || "");
  return r ? { up: +r[1], total: +r[2] } : null;
}

// layered-view geometry, in viewBox units
const NW = 152, NH = 58, GAPY = 64, W = 1120, TOP = 40;

export default function InfraTopologyScreen() {
  const { setRoute } = useNav();
  const { data: devicesData } = useDevices();
  const allDevices = devicesData ?? [];
  const alertsList = useInfraAlerts().data ?? INFRA_ALERTS;
  const [site, setSite] = React.useState("dc-blr-1");
  const topoQuery = useTopology(site);
  const liveLinks = topoQuery.data?.links;
  const [query, setQuery] = React.useState("");
  const [selLinkId, setSelLinkId] = React.useState<string | null>(null);
  const [focusId, setFocusId] = React.useState<string | null>(null);
  const [view, setView] = React.useState<"layered" | "grouped">("layered");

  const changeSite = (id: string) => { setSelLinkId(null); setFocusId(null); setSite(id); };

  const siteDevices = allDevices.filter((d) => d.site === site);
  const byId: Record<string, Device> = Object.fromEntries(siteDevices.map((d) => [d.id, d] as [string, Device]));
  const q = query.trim().toLowerCase();
  const matches = (d: Device) => !q || [d.id, d.ip, d.model, d.os, d.role].some((v) => String(v ?? "").toLowerCase().includes(q));
  const alertCount = (id: string) => alertsList.filter((a) => a.device === id).length;

  // ── graph ─────────────────────────────────────────────────────────────────
  const nodes: TopoNode[] = [{ id: "__wan", virtual: true, layer: 0, status: "unknown" }];
  siteDevices.forEach((d) => { const L = layerOf(d); if (L != null) nodes.push({ id: d.id, layer: L, d, status: d.status }); });
  const siteVMs = VMS.filter((v) => byId[v.host] && v.state === "running").slice(0, 6);
  siteVMs.forEach((v) => nodes.push({ id: v.id, layer: 6, vm: v, status: v.state === "running" ? "ok" : "unknown" }));

  const endDown = (a: string, b: string) => [a, b].some((id) => byId[id]?.status === "down");
  const useLive = !!(liveLinks && liveLinks.length);
  const links: TopoLink[] = [];
  siteDevices.filter((d) => d.kind === "router").forEach((r) =>
    links.push({ id: `__wan→${r.id}`, a: "__wan", b: r.id, status: r.status === "down" ? "down" : "unknown", type: "wan", live: false }));
  if (useLive) {
    liveLinks!.forEach((l) => {
      if (!byId[l.src] || !byId[l.dst]) return;
      links.push({
        id: `${l.src}→${l.dst}`, a: l.src, b: l.dst, srcPort: l.src_port || undefined, dstPort: l.dst_port || undefined,
        bandwidth: l.bandwidth ? String(l.bandwidth) : undefined, status: endDown(l.src, l.dst) ? "down" : l.status || "unknown", type: "physical", live: true,
      });
    });
  } else {
    NET_LINKS.forEach(([a, b]) => {
      if (byId[a] && byId[b]) links.push({ id: `${a}→${b}`, a, b, status: endDown(a, b) ? "down" : "unknown", type: "physical", live: false });
    });
  }
  siteVMs.forEach((v) => links.push({ id: `${v.host}→${v.id}`, a: v.host, b: v.id, srcPort: "vSwitch", status: byId[v.host]?.status === "down" ? "down" : "ok", type: "virtual", live: false }));

  // ── layout (layered view) ─────────────────────────────────────────────────
  const present = [...new Set(nodes.map((n) => n.layer))].sort((x, y) => x - y);
  const H = present.length * (NH + GAPY) + 10;
  const pos: Record<string, { x: number; y: number; w: number; n: TopoNode }> = {};
  present.forEach((L, li) => {
    const row = nodes.filter((n) => n.layer === L);
    const w = Math.min(NW, W / row.length - 10);
    row.forEach((n, i) => { pos[n.id] = { x: (i + 0.5) * (W / row.length), y: TOP + li * (NH + GAPY) + NH / 2, w, n }; });
  });
  const drawLinks = links.filter((l) => pos[l.a] && pos[l.b]);
  const pct = (v: number, of: number) => `${(v / of) * 100}%`;

  const counts = {
    up: siteDevices.filter((d) => d.status === "ok").length, warn: siteDevices.filter((d) => d.status === "warn").length,
    crit: siteDevices.filter((d) => d.status === "critical").length, down: siteDevices.filter((d) => d.status === "down").length,
  };
  const linksDown = drawLinks.filter((l) => l.status === "down").length;

  const openDevice = (id: string) => {
    const dev = byId[id] ?? DEVICES.find((x) => x.id === id);
    if (!dev && VMS.some((v) => v.id === id)) { setRoute("vm-detail", { vmId: id }); return; }
    setRoute((dev && ROUTE_BY_KIND[dev.kind]) ?? "infra-device", { deviceId: id });
  };

  const siteObj = SITES.find((s) => s.id === site) || ({} as Site);
  const selLink = selLinkId ? drawLinks.find((l) => l.id === selLinkId) ?? null : null;
  const focusDev = focusId ? byId[focusId] : undefined;
  const focusVm = focusId ? VMS.find((v) => v.id === focusId) : undefined;
  const nameOf = (id: string) => (id === "__wan" ? "WAN" : id);

  // ── pieces ────────────────────────────────────────────────────────────────
  const nodeProps = (id: string, label: string) => ({
    type: "button" as const,
    onClick: () => openDevice(id),
    onMouseEnter: () => setFocusId(id),
    onFocus: () => setFocusId(id),
    "aria-label": label,
  });

  const layered = (
    <div className="ld-devices-topo-scroll">
      <div className="ld-devices-topo-canvas" style={{ aspectRatio: `${W} / ${H}` }}>
        <svg className="ld-devices-topo-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
          <defs>
            {(["ok", "warn", "crit", "unknown"] as NormalizedStatus[]).map((s) => (
              <marker key={s} id={`ld-topo-arr-${s}`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5.5" markerHeight="5.5" orient="auto">
                <path d="M0,0 L8,4 L0,8 z" fill={STATUS_COLORS[s].line} />
              </marker>
            ))}
          </defs>
          {present.map((L, li) => li % 2 === 1 && (
            <rect key={L} className="ld-devices-topo-band" x="0" y={TOP + li * (NH + GAPY) - GAPY / 2 + 4} width={W} height={NH + GAPY - 8} />
          ))}
          {drawLinks.map((l) => {
            const A = pos[l.a], B = pos[l.b];
            const s = normalizeStatus(l.status);
            const midY = (A.y + B.y) / 2;
            const path = `M ${A.x} ${A.y + NH / 2} C ${A.x} ${midY}, ${B.x} ${midY}, ${B.x} ${B.y - NH / 2}`;
            const isSel = selLink?.id === l.id;
            return (
              <path key={l.id} d={path} fill="none" stroke={STATUS_COLORS[s].line} strokeWidth={isSel ? 3.4 : 2} vectorEffect="non-scaling-stroke"
                strokeDasharray={l.status === "down" ? "3 5" : undefined} className={l.status === "down" || l.type === "wan" ? undefined : "ld-devices-flow"}
                opacity={0.85} markerEnd={`url(#ld-topo-arr-${s})`} />
            );
          })}
        </svg>

        {present.map((L, li) => (
          <span key={L} className="ld-devices-topo-layer" style={{ top: pct(TOP + li * (NH + GAPY) - 14, H) }}>{LAYER_LABELS[L]}</span>
        ))}

        {drawLinks.map((l) => {
          const A = pos[l.a], B = pos[l.b];
          const label = l.status === "down" ? "DOWN" : l.type === "virtual" ? "vNIC" : l.type === "wan" ? "WAN" : l.bandwidth ?? "link";
          return (
            <button key={l.id} type="button" className={`ld-devices-link-label${l.status === "down" ? " is-down" : ""}`}
              style={{ left: pct((A.x + B.x) / 2, W), top: pct((A.y + B.y) / 2, H) }}
              aria-pressed={selLinkId === l.id} aria-label={`Link ${nameOf(l.a)} to ${l.b}, ${getStatusLabel(l.status)}`}
              onClick={() => setSelLinkId(selLinkId === l.id ? null : l.id)}>
              {label}
            </button>
          );
        })}

        {Object.values(pos).map(({ x, y, w, n }) => {
          const c = getHealthColor(n.status === "critical" || n.status === "down" ? "crit" : n.status);
          const style = { left: pct(x - w / 2, W), top: pct(y - NH / 2, H), width: pct(w, W), height: pct(NH, H), borderLeftColor: c.line };
          if (n.virtual) {
            return (
              <div key={n.id} className="ld-devices-node is-static" style={style}>
                <b>Internet / WAN</b>
                <span>Upstream · {siteDevices.filter((d) => d.kind === "router").length} edge router(s)</span>
              </div>
            );
          }
          if (n.vm) {
            const v = n.vm;
            return (
              <button key={n.id} {...nodeProps(v.id, `VM ${v.id}, ${v.state}, open VM page`)} className={`ld-devices-node${focusId === v.id ? " is-selected" : ""}`} style={style}>
                <b>{v.id}</b>
                <span className="ld-mono">{v.ip} · {v.os.split(" ")[0]}</span>
                <span>CPU {v.cpuUse}% · MEM {v.memUse}%</span>
              </button>
            );
          }
          const d = n.d!;
          const alerts = alertCount(d.id);
          return (
            <button key={n.id} {...nodeProps(d.id, `${d.id}, ${getStatusLabel(d.status)}${alerts ? `, ${alerts} alerts` : ""}, open device page`)}
              className={`ld-devices-node${focusId === d.id ? " is-selected" : ""}${matches(d) ? "" : " is-dim"}`} style={style}>
              <b>{d.id}</b>
              <span className="ld-mono">{d.ip} · {(d.model || "").split(" ")[0]}</span>
              <span>CPU {d.cpu}% · MEM {d.mem}%</span>
              {alerts > 0 && <span className="ld-devices-node-alerts" aria-hidden="true">{alerts}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );

  const sidePanel = selLink ? (
    <Panel title="Link Detail" action={{ label: "Clear", onClick: () => setSelLinkId(null) }}>
      <dl className="ld-dl">
        <dt>From</dt><dd className="ld-mono">{nameOf(selLink.a)}{selLink.srcPort ? ` : ${selLink.srcPort}` : ""}</dd>
        <dt>To</dt><dd className="ld-mono">{selLink.b}{selLink.dstPort ? ` : ${selLink.dstPort}` : ""}</dd>
        <dt>Status</dt><dd><Pill tone={statusTone(selLink.status)}><span className="ld-pill-dot" />{getStatusLabel(selLink.status)}</Pill></dd>
        <dt>Bandwidth</dt><dd>{selLink.bandwidth ?? "—"}</dd>
        <dt>Type</dt><dd>{selLink.type === "wan" ? "WAN uplink" : selLink.type === "virtual" ? "Virtual (host → VM)" : "Physical"}</dd>
        <dt>Source</dt><dd className="ld-muted">{selLink.live ? "Topology API" : selLink.type === "physical" ? "Seed graph (topology API not reachable)" : "Inventory"}</dd>
      </dl>
      <p className="ld-muted ld-small">Traffic and error counters for this link are on the device pages' interface charts.</p>
    </Panel>
  ) : focusDev ? (
    <Panel title="Device Detail">
      <dl className="ld-dl">
        <dt>Hostname</dt><dd className="ld-mono">{focusDev.id}</dd>
        <dt>IP</dt><dd className="ld-mono">{focusDev.ip}</dd>
        <dt>Model</dt><dd>{focusDev.model}</dd>
        <dt>Type</dt><dd>{kindOf(focusDev.kind)?.label ?? focusDev.kind}</dd>
        <dt>Status</dt><dd><Pill tone={statusTone(focusDev.status)}><span className="ld-pill-dot" />{getStatusLabel(focusDev.status)}</Pill></dd>
        <dt>CPU / Mem</dt><dd>{focusDev.cpu}% / {focusDev.mem}%</dd>
        <dt>Uptime</dt><dd>{focusDev.uptime || "—"}</dd>
        <dt>Active alerts</dt><dd>{alertCount(focusDev.id)}</dd>
      </dl>
      <button type="button" className="ld-btn ld-btn-primary" onClick={() => openDevice(focusDev.id)}><Icon icon={ExternalLinkIcon} /> Open device page</button>
    </Panel>
  ) : focusVm ? (
    <Panel title="VM Detail">
      <dl className="ld-dl">
        <dt>VM</dt><dd className="ld-mono">{focusVm.id}</dd>
        <dt>IP</dt><dd className="ld-mono">{focusVm.ip}</dd>
        <dt>Host</dt><dd><button type="button" className="ld-link ld-mono" onClick={() => openDevice(focusVm.host)}>{focusVm.host}</button></dd>
        <dt>Size</dt><dd>{focusVm.cpu} · {focusVm.mem} · {focusVm.disk}</dd>
        <dt>CPU / Mem</dt><dd>{focusVm.cpuUse}% / {focusVm.memUse}%</dd>
        <dt>State</dt><dd>{focusVm.state}</dd>
      </dl>
      <button type="button" className="ld-btn ld-btn-primary" onClick={() => openDevice(focusVm.id)}><Icon icon={ExternalLinkIcon} /> Open VM page</button>
    </Panel>
  ) : (
    <Panel title="Details">
      <Empty>Hover or tab to a device to see it here; select it to open its page. Select a link label for link details.</Empty>
    </Panel>
  );

  const heatSorted = [...siteDevices].sort((a, b) => {
    const rank: Record<NormalizedStatus, number> = { crit: 0, warn: 1, unknown: 2, ok: 3 };
    return rank[normalizeStatus(a.status)] - rank[normalizeStatus(b.status)];
  });

  return (
    <div className="ld-dash">
      <nav className="ld-crumbs" aria-label="Breadcrumb">
        <button type="button" className="ld-link" onClick={() => setRoute("dashboard")}>Home</button>
        <Icon icon={ChevronRightIcon} />
        <button type="button" className="ld-link" onClick={() => setRoute("infra")}>Monitoring</button>
        <Icon icon={ChevronRightIcon} />
        <span>Live Topology</span>
      </nav>

      <div className="ld-head">
        <div>
          <h1>Live Data-Center Topology</h1>
          <p>Traffic path WAN → firewall → switch → server → VM for {siteObj.name || site}, from the inventory and topology APIs.</p>
        </div>
        <div className="ld-head-actions">
          <label htmlFor="ld-topo-site" className="sr-only">Site</label>
          <select id="ld-topo-site" className="ld-select" value={site} onChange={(e) => changeSite(e.target.value)}>
            {SITES.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.region}</option>)}
          </select>
          <button type="button" className="ld-btn" onClick={() => setRoute("infra-onboarding")}><Icon icon={PlusIcon} /> Onboard device</button>
          <button type="button" className="ld-btn" onClick={() => topoQuery.refetch()} disabled={topoQuery.isFetching}>
            <Icon className={`fa-solid fa-rotate${topoQuery.isFetching ? " fa-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      <div className="ld-head-actions" role="status">
        {useLive
          ? <Pill tone="ok"><Icon icon={RadioTowerIcon} /> Links: topology API · refreshes every 15 s</Pill>
          : <Pill tone="warn"><Icon icon={UnplugIcon} /> Links: seed graph — topology API not reachable</Pill>}
        <Pill tone="muted"><Icon icon={NetworkIcon} /> {drawLinks.length} links</Pill>
      </div>

      <div className="ld-kpis">
        <Kpi icon="fa-server" tone="info" label="Devices" value={String(siteDevices.length)} sub={siteObj.name || site} />
        <Kpi icon="fa-circle-check" tone="ok" label="Up" value={String(counts.up)} sub="reporting OK" />
        <Kpi icon="fa-triangle-exclamation" tone="warn" label="Warning" value={String(counts.warn)} sub="elevated" />
        <Kpi icon="fa-circle-xmark" tone="crit" label="Critical" value={String(counts.crit)} sub="urgent" />
        <Kpi icon="fa-power-off" tone={counts.down ? "crit" : "muted"} label="Down" value={String(counts.down)} sub="unreachable" />
        <Kpi icon="fa-link-slash" tone={linksDown ? "crit" : "ok"} label="Links down" value={String(linksDown)} sub="broken paths" />
      </div>

      <div className="ld-devices-topo-layout">
        <div className="ld-devices-topo-main">
          <section className="ld-card" aria-label="Topology map">
            <div className="ld-devices-topo-toolbar">
              <label className="ld-search">
                <Icon icon={SearchIcon} />
                <span className="sr-only">Highlight devices</span>
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Highlight by name, IP, model…" />
              </label>
              {q && <button type="button" className="ld-btn ld-btn-sm" onClick={() => setQuery("")}>Clear</button>}
              <span className="ld-devices-seg" role="group" aria-label="View">
                <button type="button" aria-pressed={view === "layered"} onClick={() => setView("layered")}><Icon icon={WorkflowIcon} /> Traffic path</button>
                <button type="button" aria-pressed={view === "grouped"} onClick={() => setView("grouped")}><Icon icon={ServerIcon} /> By type</button>
              </span>
              <span className="ld-devices-legend" aria-hidden="true">
                <span><span className="ld-devices-swatch is-up" /> Healthy</span>
                <span><span className="ld-devices-swatch is-warn" /> Warning</span>
                <span><span className="ld-devices-swatch is-down" /> Down / critical</span>
                <span><span className="ld-devices-swatch" /> Unknown</span>
              </span>
            </div>
            {!siteDevices.length ? (
              <Empty>{devicesData ? `No devices discovered at ${siteObj.name || site} yet.` : "Loading devices…"}</Empty>
            ) : view === "layered" ? layered : (
              <GroupedView siteDevices={siteDevices} siteVMs={VMS.filter((v) => byId[v.host])} links={links} matches={matches}
                focusId={focusId} nodeProps={nodeProps} alertCount={alertCount} />
            )}
          </section>
        </div>

        <aside className="ld-devices-topo-side" aria-label="Topology details">
          {sidePanel}
          <Panel title={`Domain Status · ${siteObj.name || site}`}>
            {heatSorted.length ? (
              <>
                <div className="ld-devices-heat">
                  {heatSorted.map((d) => (
                    <button key={d.id} type="button" style={{ background: getHealthColor(d.status).line }} title={`${d.id} · ${getStatusLabel(d.status)}`}
                      aria-label={`${d.id}, ${getStatusLabel(d.status)}, open device page`} onClick={() => openDevice(d.id)} onFocus={() => setFocusId(d.id)} onMouseEnter={() => setFocusId(d.id)} />
                  ))}
                </div>
                <div className="ld-devices-legend">
                  <span><span className="ld-devices-swatch is-up" /> Up <b>{counts.up}</b></span>
                  <span><span className="ld-devices-swatch is-warn" /> Warning <b>{counts.warn}</b></span>
                  <span><span className="ld-devices-swatch is-down" /> Critical / down <b>{counts.crit + counts.down}</b></span>
                </div>
              </>
            ) : (
              <Empty>No monitored hosts yet.</Empty>
            )}
          </Panel>
          <Panel title="Site Summary">
            <dl className="ld-dl">
              <dt>Site</dt><dd>{siteObj.name || site}</dd>
              <dt>Region</dt><dd>{siteObj.region || "—"}</dd>
              <dt>Devices</dt><dd>{siteDevices.length}</dd>
              <dt>Links</dt><dd>{drawLinks.length}</dd>
              <dt>Health</dt><dd>{siteObj.health != null ? `${siteObj.health}%` : "—"}</dd>
              <dt>Link source</dt><dd>{useLive ? "Topology API (LLDP / CDP discovery)" : "Seed graph"}</dd>
            </dl>
          </Panel>
        </aside>
      </div>
    </div>
  );
}

// ── Grouped view: devices by type, with the discovered links drawn between cards ──
function GroupedView({ siteDevices, siteVMs, links, matches, focusId, nodeProps, alertCount }: {
  siteDevices: Device[];
  siteVMs: Vm[];
  links: TopoLink[];
  matches: (d: Device) => boolean;
  focusId: string | null;
  nodeProps: (id: string, label: string) => React.ButtonHTMLAttributes<HTMLButtonElement>;
  alertCount: (id: string) => number;
}) {
  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const [lines, setLines] = React.useState<{ d: string; status: string; key: string }[]>([]);
  const drawn = links.filter((l) => l.type !== "wan");
  const linkKey = drawn.map((l) => l.id + l.status).join("|");

  React.useEffect(() => {
    const measure = () => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      const wr = wrap.getBoundingClientRect();
      const c: Record<string, { x: number; top: number; bottom: number }> = {};
      wrap.querySelectorAll<HTMLElement>("[data-dev]").forEach((el) => {
        const r = el.getBoundingClientRect();
        c[el.dataset.dev as string] = { x: r.left + r.width / 2 - wr.left, top: r.top - wr.top, bottom: r.bottom - wr.top };
      });
      const ls: { d: string; status: string; key: string }[] = [];
      drawn.forEach((l) => {
        const A = c[l.a], B = c[l.b];
        if (!A || !B) return;
        const y1 = A.top < B.top ? A.bottom : A.top, y2 = A.top < B.top ? B.top : B.bottom;
        ls.push({ d: `M ${A.x} ${y1} C ${A.x} ${(y1 + y2) / 2}, ${B.x} ${(y1 + y2) / 2}, ${B.x} ${y2}`, status: l.status, key: l.id });
      });
      setLines(ls);
    };
    const t = setTimeout(measure, 60);
    window.addEventListener("resize", measure);
    return () => { clearTimeout(t); window.removeEventListener("resize", measure); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkKey, siteDevices.length]);

  const groups: { label: string; devs: Device[] }[] = [
    { label: "Network — Routers & Firewalls", devs: siteDevices.filter((d) => ["router", "firewall"].includes(d.kind)) },
    { label: "Switches", devs: siteDevices.filter((d) => d.kind === "switch") },
    { label: "Load Balancers", devs: siteDevices.filter((d) => d.kind === "loadbal") },
    { label: "Physical Servers", devs: siteDevices.filter((d) => ["hypervisor", "phys-srv"].includes(d.kind)) },
    { label: "Servers — OS", devs: siteDevices.filter((d) => ["win-srv", "linux-srv"].includes(d.kind)) },
    { label: "Storage & Power", devs: siteDevices.filter((d) => ["storage", "nas", "ups"].includes(d.kind)) },
  ].filter((g) => g.devs.length > 0);

  return (
    <div ref={wrapRef} className="ld-devices-groups">
      <svg width="100%" height="100%" aria-hidden="true">
        {lines.map((l) => {
          const s = normalizeStatus(l.status);
          return <path key={l.key} d={l.d} fill="none" stroke={STATUS_COLORS[s].line} strokeWidth={1.6} strokeDasharray={s === "crit" ? "4 4" : undefined} opacity="0.55" />;
        })}
      </svg>
      {groups.map((g) => (
        <section key={g.label} className="ld-devices-group" aria-label={g.label}>
          <h3>{g.label} <Pill tone="muted">{g.devs.length}</Pill></h3>
          <div className="ld-devices-cards">
            {g.devs.map((d) => {
              const c = getHealthColor(d.status === "critical" || d.status === "down" ? "crit" : d.status);
              const k = DEVICE_KINDS.find((kk) => kk.id === d.kind);
              const ifc = parseIface(d.iface);
              const alerts = alertCount(d.id);
              return (
                <button key={d.id} data-dev={d.id} {...nodeProps(d.id, `${d.id}, ${getStatusLabel(d.status)}${alerts ? `, ${alerts} alerts` : ""}, open device page`)}
                  className={`ld-devices-card${focusId === d.id ? " is-selected" : ""}${matches(d) ? "" : " is-dim"}`} style={{ borderLeftColor: c.line }}>
                  <span className="ld-devices-card-top">
                    <Icon className={`${k?.iconBrand ? "fa-brands" : "fa-solid"} ${k?.icon ?? "fa-server"}`} />
                    <b>{d.id}</b>
                    <Pill tone={statusTone(d.status)}>{getStatusLabel(d.status)}</Pill>
                  </span>
                  <span className="ld-devices-card-meta"><span className="ld-mono">{d.ip}</span><span>{(d.model || "").split(" ").slice(0, 2).join(" ")}</span></span>
                  <span className="ld-devices-card-meta"><span>CPU {d.cpu}% · MEM {d.mem}%</span>{alerts > 0 && <span className="ld-text-crit">{alerts} alert{alerts > 1 ? "s" : ""}</span>}</span>
                  {ifc && ifc.total > 0 && (
                    <>
                      <span className="ld-bar-track" aria-hidden="true"><span className="ld-bar-fill" style={{ width: `${Math.min(100, (ifc.up / ifc.total) * 100)}%`, background: STATUS_COLORS.ok.line }} /></span>
                      <span className="ld-devices-card-meta"><span>Interfaces up</span><span>{ifc.up} / {ifc.total}</span></span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      ))}
      {siteVMs.length > 0 && (
        <section className="ld-devices-group" aria-label="Virtual machines">
          <h3>Virtual Machines <Pill tone="muted">{siteVMs.length}</Pill></h3>
          <div className="ld-devices-cards">
            {siteVMs.map((v) => {
              const st = v.state === "running" ? "ok" : "unknown";
              return (
                <button key={v.id} data-dev={v.id} {...nodeProps(v.id, `VM ${v.id}, ${v.state}, open VM page`)}
                  className={`ld-devices-card${focusId === v.id ? " is-selected" : ""}`} style={{ borderLeftColor: getHealthColor(st).line }}>
                  <span className="ld-devices-card-top">
                    <Icon icon={BoxIcon} />
                    <b>{v.id}</b>
                    <Pill tone={statusTone(st)}>{v.state}</Pill>
                  </span>
                  <span className="ld-devices-card-meta"><span className="ld-mono">{v.ip}</span><span>{v.cpu} · {v.mem}</span></span>
                  <span className="ld-devices-card-meta"><span>CPU {v.cpuUse}% · MEM {v.memUse}%</span><span>on {v.host}</span></span>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
