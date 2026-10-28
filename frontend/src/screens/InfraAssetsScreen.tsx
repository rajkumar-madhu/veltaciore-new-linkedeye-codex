// Asset inventory — LinkedEye list layout: status summary cards, device-kind
// chips, a searchable / filterable device table and a site summary rail.
// Each device opens its detail page (server, switch, firewall, … or the
// generic device monitoring page) with { deviceId }.
import React from "react";
import { deviceRoute } from "@/lib/deviceRoute";
import { useNav } from "@/hooks/useNav";
import { useDevices } from "@/api/hooks";
import { SITES, DEVICE_KINDS } from "@/data/infra";
import { Empty, Panel, Pill, PillDot, StatCard, fmt } from "@/components/ld";
import type { Tone } from "@/components/ld";
import type { DeviceKind } from "@/lib/types";
import { Button, Card, Crumbs, Page, PageHead, SearchBox, Select, Table, TextButton, cx, ui } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { FileSpreadsheetIcon, LayersIcon, PlusIcon, SearchCodeIcon, SearchIcon } from "lucide-react";
// mono id link: the link's 13px must give way to mono 12px
const monoLink = "font-mono !text-xs font-semibold";
const statusTone = (s: string): Tone => (s === "ok" ? "ok" : s === "warn" ? "warn" : s === "critical" || s === "down" ? "crit" : "muted");
const statusLabel = (s: string) => (s === "ok" ? "Healthy" : s === "warn" ? "Warning" : s === "down" ? "Down" : s === "critical" ? "Critical" : "Unknown");
const usageTone = (v: number): Tone => (v > 80 ? "crit" : v > 65 ? "warn" : "ok");
const barColor = (t: Tone) => (t === "crit" ? "#e5383b" : t === "warn" ? "#f5a524" : "#16a34a");
const siteTone = (h: number): Tone => (h > 95 ? "ok" : h > 90 ? "warn" : "crit");

const chip = "inline-flex flex-col items-center justify-center gap-1 min-w-[104px] min-h-[76px] px-3 py-2.5 border rounded-lg cursor-pointer shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 [&_.ld-icon]:text-2xl";
const chipClass = (active: boolean) => cx(chip, active ? "bg-accent border-accent text-white [&_.ld-icon]:text-white" : "bg-bg-raised border-line text-fg hover:border-line-strong [&_.ld-icon]:text-accent");
const chipLabel = (active: boolean) => cx("text-sm", active ? "text-white" : "text-fg-muted");

function Usage({ v, label }: { v: number; label: string }) {
  if (!(v > 0)) return <span className="text-fg-muted">—</span>;
  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-block align-middle w-16 h-2 rounded-[5px] bg-bg-muted overflow-hidden" role="img" aria-label={`${label} ${v}%`}>
        <span className={ui.barFill} style={{ width: `${Math.min(100, v)}%`, background: barColor(usageTone(v)) }} />
      </span>
      <b className="text-xs font-semibold min-w-[34px]">{v}%</b>
    </span>
  );
}

const QUICK_ACTIONS: [string, string, string | null][] = [
  ["fa-magnifying-glass-arrow-right", "Run Discovery", null],
  ["fa-file-import", "Import CSV", null],
  ["fa-circle-nodes", "Topology", "infra-topology"],
  ["fa-tower-broadcast", "Exporters", "infra-exporters"],
  ["fa-plus", "Onboard", null],
  ["fa-file-csv", "Export", null],
];

export default function InfraAssetsScreen() {
  const { setRoute } = useNav();
  const { data } = useDevices();
  const devices = data ?? [];
  const [kind, setKind] = React.useState("all");
  const [site, setSite] = React.useState("all");
  const [q, setQ] = React.useState("");
  const filtered = devices.filter(d =>
    (kind === "all" || d.kind === kind) &&
    (site === "all" || d.site === site) &&
    (q === "" || (d.id + d.model + d.role + d.ip).toLowerCase().includes(q.toLowerCase()))
  );
  const kindMeta = (id: string) => (DEVICE_KINDS.find(k => k.id === id) || {}) as Partial<DeviceKind>;
  const iconOf = (k: Partial<DeviceKind>) => k.icon ?? "fa-cube";

  const healthy = devices.filter(d => d.status === "ok").length;
  const warning = devices.filter(d => d.status === "warn").length;
  const critical = devices.filter(d => d.status === "critical" || d.status === "down").length;

  return (
    <Page>
      <Crumbs items={[{ label: "Home", onClick: () => setRoute("dashboard") }, { label: "Monitoring", onClick: () => setRoute("infra") }, { label: "Asset Inventory" }]} />

      <PageHead
        title="Asset Inventory"
        subtitle="Every monitored device across sites and device classes"
        actions={
          <>
            <Button><Icon icon={FileSpreadsheetIcon} /> Export</Button>
            <Button><Icon icon={SearchCodeIcon} /> Discovery</Button>
            <Button variant="primary"><Icon icon={PlusIcon} /> Onboard</Button>
          </>
        }
      />

      <div className={cx(ui.grid, ui.cols[6])}>
        <StatCard icon="fa-boxes-stacked" tone="info" label="Total" value={fmt(devices.length)} note="all assets" onClick={() => setKind("all")} />
        <StatCard icon="fa-circle-check" tone="ok" label="Healthy" value={fmt(healthy)} note="reporting OK" />
        <StatCard icon="fa-triangle-exclamation" tone="warn" label="Warning" value={fmt(warning)} note="thresholds breached" />
        <StatCard icon="fa-circle-xmark" tone="crit" label="Critical" value={fmt(critical)} note="urgent" />
        <StatCard icon="fa-layer-group" tone="purple" label="Device kinds" value={fmt(DEVICE_KINDS.length)} note="categories" />
        <StatCard icon="fa-building" tone="muted" label="Sites" value={fmt(SITES.length)} note="datacenters" onClick={() => setSite("all")} />
      </div>

      <div className="flex flex-wrap gap-2.5" role="group" aria-label="Filter by device kind">
        <button type="button" className={chipClass(kind === "all")} aria-pressed={kind === "all"} onClick={() => setKind("all")}>
          <Icon icon={LayersIcon} />
          <span className={chipLabel(kind === "all")}>All</span>
          <span className="text-md font-bold">{devices.length}</span>
        </button>
        {DEVICE_KINDS.map(k => {
          const n = devices.filter(d => d.kind === k.id).length;
          if (n === 0) return null;
          return (
            <button key={k.id} type="button" className={chipClass(kind === k.id)} aria-pressed={kind === k.id} onClick={() => setKind(k.id)}>
              <Icon name={iconOf(k)} />
              <span className={chipLabel(kind === k.id)}>{k.label}</span>
              <span className="text-md font-bold">{n}</span>
            </button>
          );
        })}
      </div>

      <div className={ui.split}>
        <Card as="section" className={ui.panel} aria-labelledby="assets-h">
          <div className={ui.panelHead}>
            <h2 id="assets-h" className={ui.panelTitle}>Inventory ({fmt(filtered.length)})</h2>
          </div>
          <div className={ui.toolbar}>
            <label htmlFor="assets-search" className="sr-only">Search devices</label>
            <SearchBox className="flex-[1_1_240px]" icon={<Icon icon={SearchIcon} />} id="assets-search" type="search" placeholder="Search hostname, IP, model, role…" value={q} onChange={e => setQ(e.target.value)} />
            <label htmlFor="assets-kind" className="sr-only">Device kind</label>
            <Select id="assets-kind" value={kind} onChange={e => setKind(e.target.value)}>
              <option value="all">All kinds</option>
              {DEVICE_KINDS.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
            </Select>
            <label htmlFor="assets-site" className="sr-only">Site</label>
            <Select id="assets-site" value={site} onChange={e => setSite(e.target.value)}>
              <option value="all">All sites</option>
              {SITES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </div>
          {filtered.length ? (
              <Table>
                <thead>
                  <tr>
                    <th scope="col">Device</th>
                    <th scope="col"><span className="sr-only">Select</span></th>
                    <th scope="col">Kind</th>
                    <th scope="col">Site</th>
                    <th scope="col">IP</th>
                    <th scope="col">OS / firmware</th>
                    <th scope="col">CPU</th>
                    <th scope="col">Memory</th>
                    <th scope="col">Status</th>
                    <th scope="col">Last seen</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(d => {
                    const k = kindMeta(d.kind);
                    return (
                      <tr key={d.id}>
                        <td>
                          <div className="flex items-center gap-2.5">
                            <span className="flex-none w-7 h-7 rounded grid place-items-center text-xs bg-bg-muted text-accent" aria-hidden="true"><Icon name={iconOf(k)} /></span>
                            <div className="min-w-0">
                              <TextButton className={monoLink} onClick={() => setRoute(deviceRoute(d.kind), { deviceId: d.id })}>{d.id}</TextButton>
                              <span className={ui.sub}>{d.role}</span>
                            </div>
                          </div>
                        </td>
                        <td><input type="checkbox" aria-label={`Select ${d.id}`} /></td>
                        <td><Pill tone="muted">{k.label ?? d.kind}</Pill></td>
                        <td className="font-mono font-semibold">{d.site}</td>
                        <td className="font-mono font-semibold">{d.ip}</td>
                        <td>{d.os}<span className={ui.sub}>up {d.uptime}</span></td>
                        <td><Usage v={d.cpu} label="CPU" /></td>
                        <td><Usage v={d.mem} label="Memory" /></td>
                        <td><Pill tone={statusTone(d.status)}><PillDot />{statusLabel(d.status)}</Pill></td>
                        <td className="whitespace-nowrap">{d.lastSeen}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
          ) : (
            <Empty>{devices.length ? "No devices match these filters." : "No devices reported yet."}</Empty>
          )}
        </Card>

        <div className={ui.rail}>
          <Panel title="Site Summary">
            <dl className={ui.dl}>
              {SITES.map(s => (
                <React.Fragment key={s.id}>
                  <dt>{s.name}</dt>
                  <dd>{fmt(s.devices)} devices · <Pill tone={siteTone(s.health)}>{s.health}%</Pill></dd>
                </React.Fragment>
              ))}
            </dl>
          </Panel>
          <Panel title="Quick Actions">
            <div className="grid grid-cols-2 gap-2">
              {QUICK_ACTIONS.map(([ic, l, route]) => (
                <Button key={l} size="sm" className="!justify-start" onClick={() => { if (route) setRoute(route); }}>
                  <Icon name={ic} /> {l}
                </Button>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </Page>
  );
}
