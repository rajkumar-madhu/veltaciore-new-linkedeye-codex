// Service health heatmap — LinkedEye layout: a domain / service × signal grid
// on the left, a domain summary and the selected domain's details on the
// right. Domains come from /api/infra/service-domains/ (business domains such
// as "Trading" that list APM services, devices and device kinds); with none
// defined, services form an Applications domain and devices are grouped by
// kind. Every cell is live API data; a signal with no source is grey.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { useAllDevices, useAllServices, useDeviceLoad, useInfraAlerts, useServiceDomains } from "@/api/hooks";
import type { ServiceDomain } from "@/api/hooks";
import { DomainEditor } from "@/components/ServiceDomainEditor";
import type { Device, InfraAlert, Service } from "@/lib/types";
import { deviceRoute } from "@/lib/deviceRoute";
import { Empty, Pill, PillDot, fmt } from "@/components/ld";
import type { Tone } from "@/components/ld";

import { Icon } from "@/components/Icon";
import { Button, Card, Crumbs, Page, PageHead, SearchBox, Select, Tab, Table, Tabs, TextButton, Tile, cx, ui } from "@/components/ui";
import { ArrowRightIcon, ListIcon, NetworkIcon, PencilIcon, PlusIcon, SearchIcon } from "lucide-react";
/** The global input:focus outline colour beats SearchBox's outline-none; keep the inner input unringed (the box shows the ring). */
const searchInputFix = "focus:outline-none";
type Health = "ok" | "warn" | "crit" | "unknown";
type ColKey = "health" | "availability" | "response" | "errors" | "alerts" | "cpu" | "memory";

const COLS: { key: ColKey; label: string; hint: string }[] = [
  { key: "health", label: "Health", hint: "Worst reported status" },
  { key: "availability", label: "Availability", hint: "Uptime (services) or share of devices reachable" },
  { key: "response", label: "Response", hint: "p95 response time" },
  { key: "errors", label: "Errors", hint: "Error rate" },
  { key: "alerts", label: "Alerts", hint: "Open alerts on these devices" },
  { key: "cpu", label: "CPU", hint: "Busiest device" },
  { key: "memory", label: "Memory", hint: "Busiest device" },
];

interface Cell { health: Health; value: string }
interface Row {
  id: string;
  name: string;
  cells: Record<ColKey, Cell>;
  availability: number | null;
  errRate: number | null;
  p95ms: number | null;
  devices: Device[];
  /** CPU / memory per device as the row's cells used them (live where reported) */
  usage: Map<string, { cpu: number | null; mem: number | null }>;
  service?: Service;
}
interface Domain {
  id: string; name: string; icon: string; description: string; rows: Row[]; alerts: InfraAlert[];
  /** the saved business domain this group shows, if any */
  source?: ServiceDomain;
}

// Infrastructure domains by device kind; anything else lands in "Other devices".
const INFRA: { id: string; name: string; icon: string; description: string; kinds: Record<string, string> }[] = [
  { id: "network", name: "Network", icon: "fa-network-wired", description: "Switching, routing, firewalls and load balancing",
    kinds: { switch: "Switches", router: "Routers", firewall: "Firewalls", loadbal: "Load balancers", wireless: "Wireless" } },
  { id: "compute", name: "Compute", icon: "fa-server", description: "Physical, Windows and Linux servers and hypervisors",
    kinds: { "phys-srv": "Physical servers", "win-srv": "Windows servers", "linux-srv": "Linux servers", hypervisor: "Hypervisors", idrac: "iDRAC", ilo: "iLO" } },
  { id: "storage", name: "Storage & Power", icon: "fa-hard-drive", description: "Storage arrays, UPS and power",
    kinds: { storage: "Storage", ups: "UPS", pdu: "PDU" } },
  { id: "monitoring", name: "Monitoring", icon: "fa-tower-broadcast", description: "Exporters and probes that collect the data",
    kinds: { exporter: "Exporters", probe: "Probes" } },
];

/** Display label for a device kind. */
export const KIND_LABEL: Record<string, string> = Object.assign({}, ...INFRA.map((g) => g.kinds));

const RANK: Record<Health, number> = { crit: 3, warn: 2, ok: 1, unknown: 0 };
const worst = (hs: Health[]): Health => hs.reduce<Health>((w, h) => (RANK[h] > RANK[w] ? h : w), "unknown");
const NONE: Cell = { health: "unknown", value: "No data" };
const TONE: Record<Health, Tone> = { ok: "ok", warn: "warn", crit: "crit", unknown: "muted" };
const LABEL: Record<Health, string> = { ok: "Healthy", warn: "Warning", crit: "Critical", unknown: "Unknown" };
/** Heat cell and legend swatch colour per health. */
const HEAT: Record<Health, string> = {
  ok: "bg-[#5fcf80] text-[#064e2b]",
  warn: "bg-warning text-[#4a2a00]",
  crit: "bg-critical text-white",
  unknown: "bg-line text-fg-muted",
};
const heatTh = "text-xs font-semibold text-fg px-0.5 py-1.5 whitespace-nowrap";
/** Highlighted (selected) table row. */
const heatSelected = "[&>*]:bg-bg-raised";
/** Side panels, their h2 and the note right under it. */
const heatPanel = "p-4 flex flex-col gap-3";
const heatPanelTitle = "m-0 text-2xl";
const heatPanelNote = "-mt-2 text-fg-muted text-xs";
/** A device id link (monospace). */
const monoLink = "font-mono !text-xs font-semibold";
/** A tab-styled link to another screen (looks like a Tab, without the tab role). */
const navTab = "border-0 border-b-2 border-transparent bg-transparent text-base text-fg-muted px-3.5 py-2.5 -mb-px cursor-pointer hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2";

function statusHealth(s: string): Health {
  const v = s.toLowerCase();
  if (["ok", "up", "healthy", "online"].includes(v)) return "ok";
  if (["warn", "warning", "degraded"].includes(v)) return "warn";
  if (["critical", "crit", "down", "offline", "failed", "unreachable"].includes(v)) return "crit";
  return "unknown";
}
const isDown = (d: Device) => ["down", "offline"].includes(d.status.toLowerCase());
const level = (v: number, warn: number, crit: number): Health => (v >= crit ? "crit" : v >= warn ? "warn" : "ok");

/** "420ms" / "1.2s" → milliseconds; null for "—" or anything unparsable. */
export function parseMs(s: string | undefined): number | null {
  const m = /^\s*([\d.]+)\s*(ms|s)\s*$/i.exec(s ?? "");
  if (!m) return null;
  return m[2].toLowerCase() === "s" ? parseFloat(m[1]) * 1000 : parseFloat(m[1]);
}
const fmtMs = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`);
const pct = (v: number, digits = 2) => `${v.toFixed(digits)}%`;

function serviceRow(s: Service): Row {
  const p95 = parseMs(s.p95);
  const cells: Record<ColKey, Cell> = {
    health: { health: statusHealth(s.status), value: s.status },
    availability: { health: s.uptime >= 99.9 ? "ok" : s.uptime >= 99 ? "warn" : "crit", value: pct(s.uptime) },
    response: p95 == null ? NONE : { health: level(p95, 500, 2000), value: fmtMs(p95) },
    errors: { health: level(s.err, 0.5, 2), value: pct(s.err) },
    alerts: NONE, cpu: NONE, memory: NONE,
  };
  return { id: `svc:${s.name}`, name: s.name, cells, availability: s.uptime, errRate: s.err, p95ms: p95, devices: [], usage: new Map(), service: s };
}

function deviceRow(id: string, name: string, devices: Device[], alerts: InfraAlert[], load: Map<string, { cpu: number | null; mem: number | null }>): Row {
  const up = devices.filter((d) => !isDown(d)).length;
  const avail = (up / devices.length) * 100;
  const cpuOf = (d: Device) => load.get(d.id)?.cpu ?? d.cpu;
  const memOf = (d: Device) => load.get(d.id)?.mem ?? d.mem;
  // Controllers, UPS and the like report 0 for CPU / memory they do not have.
  const reported = (vs: (number | null | undefined)[]) => { const n = vs.filter((v): v is number => typeof v === "number"); return n.some((v) => v > 0) ? n : []; };
  const cpus = reported(devices.map(cpuOf));
  const mems = reported(devices.map(memOf));
  const crit = alerts.filter((a) => a.sev === "critical").length;
  const warnA = alerts.filter((a) => a.sev === "warn" || a.sev === "warning").length;
  const cells: Record<ColKey, Cell> = {
    health: { health: worst(devices.map((d) => statusHealth(d.status))), value: `${devices.length} device${devices.length === 1 ? "" : "s"}` },
    availability: { health: avail >= 100 ? "ok" : avail >= 90 ? "warn" : "crit", value: `${up} of ${devices.length} reachable` },
    response: NONE, errors: NONE,
    alerts: { health: crit ? "crit" : warnA ? "warn" : "ok", value: alerts.length ? `${alerts.length} open (${crit} critical)` : "None open" },
    cpu: cpus.length ? { health: level(Math.max(...cpus), 75, 90), value: `max ${Math.round(Math.max(...cpus))}%` } : NONE,
    memory: mems.length ? { health: level(Math.max(...mems), 80, 92), value: `max ${Math.round(Math.max(...mems))}%` } : NONE,
  };
  const usage = new Map(devices.map((d) => [d.id, { cpu: cpuOf(d), mem: memOf(d) }]));
  return { id, name, cells, availability: avail, errRate: null, p95ms: null, devices, usage };
}

function useDomains() {
  const devicesQ = useAllDevices();
  const servicesQ = useAllServices();
  const alertsQ = useInfraAlerts();
  const loadQ = useDeviceLoad();
  const sdQ = useServiceDomains();
  const devices = devicesQ.data ?? [];
  const services = servicesQ.data ?? [];
  const alerts = alertsQ.data ?? [];
  const saved = sdQ.data ?? [];
  // Live CPU / memory where Prometheus reports it; generated samples are not
  // mixed in here, the inventory's last values stand in instead.
  const load = new Map(loadQ.data?.source === "prometheus" && !loadQ.data.sample ? loadQ.data.devices.map((l) => [l.id, l]) : []);

  const domains = React.useMemo(() => {
    const alertsFor = (ds: Device[]) => { const ids = new Set(ds.map((d) => d.id)); return alerts.filter((a) => ids.has(a.device)); };
    /** One row per device kind, in the INFRA order, unknown kinds last. */
    const kindRows = (ds: Device[]) => {
      const byKind = new Map<string, Device[]>();
      ds.forEach((d) => byKind.set(d.kind, [...(byKind.get(d.kind) ?? []), d]));
      const order = Object.keys(KIND_LABEL);
      return [...byKind.keys()]
        .sort((x, y) => (order.indexOf(x) + 1 || 999) - (order.indexOf(y) + 1 || 999) || x.localeCompare(y))
        .map((k) => deviceRow(`kind:${k}`, KIND_LABEL[k] ?? k, byKind.get(k)!, alertsFor(byKind.get(k)!), load));
    };
    const out: Domain[] = [];

    if (saved.length) {
      const svcByName = new Map(services.map((x) => [x.name, x]));
      const usedSvc = new Set<string>(), usedDev = new Set<string>();
      for (const sd of saved) {
        const kinds = new Set(sd.device_kinds), ids = new Set(sd.devices);
        const ds = devices.filter((d) => ids.has(d.id) || kinds.has(d.kind));
        const ss = sd.services.map((n) => svcByName.get(n)).filter((x): x is Service => !!x);
        ss.forEach((x) => usedSvc.add(x.name));
        ds.forEach((d) => usedDev.add(d.id));
        out.push({ id: `sd:${sd.id}`, name: sd.name, icon: sd.icon, description: sd.description, source: sd,
          rows: [...ss.map(serviceRow), ...kindRows(ds)], alerts: alertsFor(ds) });
      }
      const restSvc = services.filter((x) => !usedSvc.has(x.name));
      const restDev = devices.filter((d) => !usedDev.has(d.id));
      if (restSvc.length || restDev.length) {
        out.push({ id: "unassigned", name: "Not in a domain", icon: "fa-circle-question", description: "Services and devices no domain lists yet",
          rows: [...restSvc.map(serviceRow), ...kindRows(restDev)], alerts: alertsFor(restDev) });
      }
      return out;
    }

    // No saved domains: Applications + one domain per INFRA group.
    if (services.length) {
      out.push({ id: "applications", name: "Applications", icon: "fa-cubes", description: "Business services traced by APM",
        rows: services.map(serviceRow), alerts: [] });
    }
    const placed = new Set<string>();
    for (const g of INFRA) {
      const ds = devices.filter((d) => d.kind in g.kinds);
      ds.forEach((d) => placed.add(d.id));
      if (ds.length) out.push({ id: g.id, name: g.name, icon: g.icon, description: g.description, rows: kindRows(ds), alerts: alertsFor(ds) });
    }
    const rest = devices.filter((d) => !placed.has(d.id));
    if (rest.length) out.push({ id: "other", name: "Other devices", icon: "fa-microchip", description: "Device kinds without a domain", rows: kindRows(rest), alerts: alertsFor(rest) });
    return out;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devicesQ.data, servicesQ.data, alertsQ.data, loadQ.data, sdQ.data]);

  return {
    domains,
    saved,
    devices,
    services,
    loading: devicesQ.isLoading || servicesQ.isLoading || sdQ.isLoading,
    unreachable: devicesQ.isError && servicesQ.isError,
    updatedAt: Math.max(devicesQ.dataUpdatedAt, servicesQ.dataUpdatedAt),
    liveLoad: load.size > 0,
  };
}

const domainHealth = (d: Domain) => worst(d.rows.flatMap((r) => Object.values(r.cells).map((c) => c.health)));
const avg = (vs: (number | null)[]) => { const n = vs.filter((v): v is number => v != null); return n.length ? n.reduce((a, b) => a + b, 0) / n.length : null; };

export default function HeatmapScreen() {
  const { setRoute } = useNav();
  const { domains, saved, devices, services, loading, unreachable, updatedAt, liveLoad } = useDomains();
  // "new", a saved domain's id, or null when the editor is closed
  const [editing, setEditing] = React.useState<number | "new" | null>(null);
  const [domainFilter, setDomainFilter] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [showValues, setShowValues] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set());
  const [selected, setSelected] = React.useState("");
  const [selectedRow, setSelectedRow] = React.useState("");
  const [tab, setTab] = React.useState<"overview" | "alerts">("overview");
  const id = React.useId();

  const q = search.trim().toLowerCase();
  const visible = domains
    .filter((d) => !domainFilter || d.id === domainFilter)
    .map((d) => ({ ...d, rows: d.rows.filter((r) => !q || r.name.toLowerCase().includes(q) || r.devices.some((x) => x.id.toLowerCase().includes(q))) }))
    .filter((d) => d.rows.length);

  const current = domains.find((d) => d.id === selected) ?? [...domains].sort((a, b) => RANK[domainHealth(b)] - RANK[domainHealth(a)])[0];
  const counts: Record<Health, number> = { ok: 0, warn: 0, crit: 0, unknown: 0 };
  domains.forEach((d) => (counts[domainHealth(d)] += 1));
  const pick = (domainId: string, rowId = "") => { setSelected(domainId); setSelectedRow(rowId); setTab("overview"); };
  const toggle = (domainId: string) => setCollapsed((s) => { const n = new Set(s); n.has(domainId) ? n.delete(domainId) : n.add(domainId); return n; });

  return (
    <Page>
      <Crumbs items={[{ label: "Home", onClick: () => setRoute("dashboard") }, { label: "Monitoring", onClick: () => setRoute("infra") }, { label: "Heatmap" }]} />

      <PageHead
        title="Heatmap"
        subtitle="Service and infrastructure health at a glance"
        actions={<>
          {updatedAt > 0 && (
            <span className="text-fg-muted text-xs"><span className={ui.live}><PillDot /> Live</span> Updated {new Date(updatedAt).toLocaleTimeString("en-GB")}</span>
          )}
          <Button onClick={() => setRoute("infra-topology")}>
            <Icon icon={NetworkIcon} /> View Topology
          </Button>
          <Button variant="primary" onClick={() => setEditing("new")}>
            <Icon icon={PlusIcon} /> Add Domain
          </Button>
        </>}
      />

      <Card className="flex flex-wrap items-end gap-3 px-4 py-3">
        <label className={ui.filterField} htmlFor={`${id}-dom`}>
          Domain
          <Select id={`${id}-dom`} value={domainFilter} onChange={(e) => setDomainFilter(e.target.value)}>
            <option value="">All domains</option>
            {domains.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </label>
        <label className={cx(ui.filterField, ui.fieldGrow)} htmlFor={`${id}-q`}>
          Search
          <SearchBox inputClassName={searchInputFix} id={`${id}-q`} icon={<Icon icon={SearchIcon} />} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Service, device kind or device id…" />
        </label>
        <ul className="list-none flex flex-wrap gap-3.5 mt-0 mr-auto mb-2 ml-0 p-0 text-sm text-fg-muted" aria-label="Legend">
          {(["ok", "warn", "crit", "unknown"] as Health[]).map((h) => (
            <li key={h} className="flex items-center gap-1.5"><span className={cx("w-3 h-3 rounded-full inline-block", HEAT[h])} aria-hidden="true" /> {h === "unknown" ? "No data" : LABEL[h]}</li>
          ))}
        </ul>
        <Button variant={showValues ? "primary" : "default"} aria-pressed={showValues} onClick={() => setShowValues((v) => !v)}>
          <Icon icon={ListIcon} /> {showValues ? "Show colours" : "Show values"}
        </Button>
      </Card>

      {loading ? (
        <Card><Empty>Loading…</Empty></Card>
      ) : unreachable ? (
        <Card><Empty>The API is not reachable from this browser.</Empty></Card>
      ) : !domains.length ? (
        <Card><Empty>No services or devices are monitored for this client yet.</Empty></Card>
      ) : (
        <div className="grid grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] gap-4 items-start [@media(max-width:1200px)]:grid-cols-1">
          <Card as="section" className="px-3 pt-2 pb-3" aria-label="Health heatmap">
            {visible.length ? (
              <div className={ui.tableWrap}>
                <table className="w-full border-separate [border-spacing:4px_3px] text-sm">
                  <thead>
                    <tr>
                      <th scope="col" className={cx(heatTh, "text-left")}>Domain / Service</th>
                      {COLS.map((c) => <th key={c.key} scope="col" title={c.hint} className={cx(heatTh, "text-center")}>{c.label}</th>)}
                    </tr>
                  </thead>
                  {visible.map((d) => {
                    const open = !collapsed.has(d.id);
                    const dh = domainHealth(d);
                    return (
                      <tbody key={d.id}>
                        <tr>
                          <th scope="rowgroup" colSpan={COLS.length + 1} className="text-left pt-3 pb-1 px-0 [&>*]:mr-2 [&>*]:align-middle">
                            <button type="button" className="bg-transparent border-0 p-0 font-bold text-base text-fg cursor-pointer inline-flex items-center gap-2 [&_.ld-icon]:text-2xs [&_.ld-icon]:text-fg-muted [&_.ld-icon]:w-3" aria-expanded={open} onClick={() => toggle(d.id)}>
                              <Icon className={`fa-solid ${open ? "fa-chevron-down" : "fa-chevron-right"}`} />
                              {d.name}
                            </button>
                            <Pill tone={TONE[dh]}>{LABEL[dh]}</Pill>
                            <TextButton className="!text-xs" onClick={() => pick(d.id)}>Details</TextButton>
                          </th>
                        </tr>
                        {open && d.rows.map((r) => (
                          <tr key={r.id} className={selectedRow === r.id ? heatSelected : undefined}>
                            <th scope="row" className="text-left font-normal pl-6 pr-1.5 py-0.5 whitespace-nowrap">
                              <TextButton onClick={() => pick(d.id, r.id)}>{r.name}</TextButton>
                            </th>
                            {COLS.map((c) => {
                              const cell = r.cells[c.key];
                              return (
                                <td key={c.key} className="p-0 min-w-[38px]">
                                  <span className={cx("flex items-center justify-center rounded-[4px] text-2xs font-semibold whitespace-nowrap px-1", showValues ? "min-h-[22px]" : "h-5", HEAT[cell.health])} title={`${r.name} · ${c.label}: ${cell.value}`}>
                                    {showValues ? cell.value : <span className="sr-only">{c.label}: {cell.value} ({LABEL[cell.health]})</span>}
                                  </span>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    );
                  })}
                </table>
              </div>
            ) : (
              <Empty>Nothing matches these filters.</Empty>
            )}
            <p className="text-fg-muted text-xs mt-3 mx-1 mb-0">
              Grey means the signal has no source for that row: APM gives services availability, response and errors; devices give status, alerts and CPU / memory ({liveLoad ? "live from Prometheus where reported, otherwise the last inventory values" : "last inventory values"}).
            </p>
          </Card>

          <div className="flex flex-col gap-4 min-w-0">
            <Card as="section" className={heatPanel} aria-labelledby={`${id}-domains`}>
              <h2 id={`${id}-domains`} className={heatPanelTitle}>Domains</h2>
              <p className={heatPanelNote}>Business and infrastructure domains and their health</p>
              <ul className="list-none m-0 p-0 grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-2.5">
                {([
                  ["fa-layer-group", "info", "Total domains", domains.length],
                  ["fa-circle-check", "ok", "Healthy", counts.ok],
                  ["fa-triangle-exclamation", "warn", "Warning", counts.warn],
                  ["fa-circle-xmark", "crit", "Critical", counts.crit],
                ] as const).map(([icon, tone, label, n]) => (
                  <li key={label} className="flex items-center gap-2.5 px-3 py-2.5 border border-line rounded-[10px]">
                    <Tile tone={tone}><Icon className={`fa-solid ${icon}`} /></Tile>
                    <span className="flex flex-col"><span className="text-fg-muted text-xs">{label}</span><b className="text-[20px] leading-[1.2]">{fmt(n)}</b></span>
                  </li>
                ))}
              </ul>
              <Table>
                <thead>
                  <tr><th scope="col">Domain</th><th scope="col">Health</th><th scope="col">Availability</th><th scope="col">Error rate</th><th scope="col">p95</th></tr>
                </thead>
                <tbody>
                  {domains.map((d) => {
                    const h = domainHealth(d);
                    const a = avg(d.rows.map((r) => r.availability));
                    const e = avg(d.rows.map((r) => r.errRate));
                    const p = d.rows.map((r) => r.p95ms).filter((v): v is number => v != null);
                    return (
                      <tr key={d.id} className={current?.id === d.id ? heatSelected : undefined}>
                        <td>
                          <TextButton className="font-medium" onClick={() => pick(d.id)}>
                            <Icon className={`fa-solid ${d.icon}`} /> {d.name}
                          </TextButton>
                          <span className={ui.sub}>{d.rows.length} {d.rows.every((r) => r.service) ? "service" : d.rows.every((r) => !r.service) ? "device kind" : "row"}{d.rows.length === 1 ? "" : "s"}</span>
                        </td>
                        <td><Pill tone={TONE[h]}><PillDot />{LABEL[h]}</Pill></td>
                        <td>{a == null ? "—" : pct(a)}</td>
                        <td>{e == null ? "—" : pct(e)}</td>
                        <td>{p.length ? fmtMs(Math.max(...p)) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </Card>

            {editing != null ? (
              <DomainEditor
                key={editing}
                domain={editing === "new" ? undefined : saved.find((x) => x.id === editing)}
                services={services}
                devices={devices}
                kindLabel={KIND_LABEL}
                onDone={(savedId) => { setEditing(null); if (savedId) pick(`sd:${savedId}`); }}
              />
            ) : current && (
              <DomainDetails domain={current} rowId={selectedRow} tab={tab} setTab={setTab} onRow={(r) => setSelectedRow(r)}
                onEdit={current.source ? () => setEditing(current.source!.id) : undefined} />
            )}
          </div>
        </div>
      )}
    </Page>
  );
}

function DomainDetails({ domain, rowId, tab, setTab, onRow, onEdit }: {
  domain: Domain; rowId: string; tab: "overview" | "alerts"; setTab: (t: "overview" | "alerts") => void; onRow: (id: string) => void;
  onEdit?: () => void;
}) {
  const { setRoute } = useNav();
  const h = domainHealth(domain);
  const a = avg(domain.rows.map((r) => r.availability));
  const row = domain.rows.find((r) => r.id === rowId);
  const sevRank: Record<string, number> = { critical: 0, warn: 1, warning: 1, info: 2 };
  const alerts = [...domain.alerts].sort((x, y) => (sevRank[x.sev] ?? 3) - (sevRank[y.sev] ?? 3));
  const hasDevices = domain.rows.some((r) => !r.service);
  const hasServices = domain.rows.some((r) => r.service);
  const tabs = [{ id: "overview" as const, label: "Overview" }, ...(hasDevices ? [{ id: "alerts" as const, label: `Alerts (${alerts.length})` }] : [])];

  return (
    <Card as="section" className={heatPanel} aria-labelledby="ld-heat-detail">
      <div className="flex items-center gap-2.5 flex-wrap">
        <h2 id="ld-heat-detail" className={heatPanelTitle}>Domain details — {domain.name}</h2>
        <Pill tone={TONE[h]}><PillDot />{LABEL[h]}</Pill>
        {onEdit && <Button size="sm" className="ml-auto" onClick={onEdit}><Icon icon={PencilIcon} /> Edit domain</Button>}
      </div>
      <Tabs>
        {tabs.map((t) => (
          <Tab key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</Tab>
        ))}
        {hasServices && <button type="button" className={navTab} onClick={() => setRoute("apm")}>APM <Icon icon={ArrowRightIcon} /></button>}
        {hasDevices && <button type="button" className={navTab} onClick={() => setRoute("infra-assets")}>Assets <Icon icon={ArrowRightIcon} /></button>}
      </Tabs>

      {tab === "alerts" && hasDevices ? (
        alerts.length ? (
          <ul className={ui.activity}>
            {alerts.slice(0, 8).map((x) => (
              <li key={x.id} className={ui.activityItem}>
                <Pill tone={x.sev === "critical" ? "crit" : x.sev === "info" ? "info" : "warn"}>{x.sev}</Pill>{" "}
                <TextButton className={monoLink} onClick={() => setRoute(deviceRoute(x.deviceKind), { deviceId: x.device })}>{x.device}</TextButton>{" "}
                {x.title} <span className="text-fg-muted text-xs">· {x.since}</span>
              </li>
            ))}
          </ul>
        ) : <Empty>No open alerts in this domain.</Empty>
      ) : (
        <>
          <div className="flex items-center gap-3.5 p-3 border border-line rounded-[10px] [&>.ld-icon]:text-5xl [&>.ld-icon]:text-accent">
            <Icon className={`fa-solid ${domain.icon}`} />
            <div><b>{domain.name}</b><p className="text-fg-muted text-xs mt-0.5">{domain.description}</p></div>
            <div className="ml-auto text-right flex flex-col"><b className="text-[20px]">{a == null ? "—" : pct(a)}</b><span className="text-fg-muted text-xs">Availability</span></div>
          </div>
          <Table>
            <thead>
              <tr>
                <th scope="col">{hasServices && hasDevices ? "Service / device kind" : hasServices ? "Service" : "Device kind"}</th><th scope="col">Health</th><th scope="col">Availability</th>
                <th scope="col">{hasServices && hasDevices ? "Errors / alerts" : hasServices ? "Error rate" : "Alerts"}</th><th scope="col">{hasServices && hasDevices ? "p95 / CPU" : hasServices ? "p95" : "CPU"}</th>
              </tr>
            </thead>
            <tbody>
              {[...domain.rows].sort((x, y) => RANK[y.cells.health.health] - RANK[x.cells.health.health]).map((r) => (
                <tr key={r.id} className={r.id === rowId ? heatSelected : undefined}>
                  <td><TextButton onClick={() => (r.service ? setRoute("apm") : onRow(r.id))}>{r.name}</TextButton></td>
                  <td><Pill tone={TONE[r.cells.health.health]}>{r.service ? r.cells.health.value : LABEL[r.cells.health.health]}</Pill></td>
                  <td>{r.cells.availability.value}</td>
                  <td>{r.service ? r.cells.errors.value : r.cells.alerts.value}</td>
                  <td>{r.service ? r.cells.response.value : r.cells.cpu.value}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          {row && row.devices.length > 0 && (
            <>
              <h3 className="mt-1 mb-0 text-base">{row.name} ({row.devices.length})</h3>
              <Table>
                <thead><tr><th scope="col">Device</th><th scope="col">Status</th><th scope="col">Site</th><th scope="col">CPU</th><th scope="col">Memory</th></tr></thead>
                <tbody>
                  {[...row.devices].sort((x, y) => RANK[statusHealth(y.status)] - RANK[statusHealth(x.status)]).map((d) => (
                    <tr key={d.id}>
                      <td><TextButton className={monoLink} onClick={() => setRoute(deviceRoute(d.kind), { deviceId: d.id })}>{d.id}</TextButton><span className={ui.sub}>{d.role}</span></td>
                      <td><Pill tone={TONE[statusHealth(d.status)]}><PillDot />{d.status}</Pill></td>
                      <td>{d.site}</td>
                      <td>{row.usage.get(d.id)?.cpu ?? "—"}{row.usage.get(d.id)?.cpu != null && "%"}</td>
                      <td>{row.usage.get(d.id)?.mem ?? "—"}{row.usage.get(d.id)?.mem != null && "%"}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </>
          )}
        </>
      )}
    </Card>
  );
}
