// Monitoring overview — LinkedEye layout: fleet status cards, sites table,
// device categories, active infrastructure alerts and a rail with the device
// status breakdown and quick actions. Every number is derived from the
// devices / sites / alerts hooks.
import { useNav } from "@/hooks/useNav";
import { deviceRoute } from "@/lib/deviceRoute";
import { useInfraAlerts, useSites, useDevices } from "@/api/hooks";
import { DEVICE_KINDS } from "@/data/infra";
import { Donut, Empty, Legend, Panel, Pill, PillDot, StatCard, fmt } from "@/components/ld";
import type { Slice, Tone } from "@/components/ld";
import type { Device } from "@/lib/types";
import { Button, Crumbs, Page, PageHead, Table, TextButton, cx, ui } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { FileOutputIcon, PlusIcon, WorkflowIcon } from "lucide-react";
// mono id link: the link's 13px must give way to mono 12px
const monoLink = "font-mono !text-xs font-semibold";
const siteTone = (h: number): Tone => (h > 95 ? "ok" : h > 90 ? "warn" : "crit");
const siteLabel = (h: number) => (h > 95 ? "Healthy" : h > 90 ? "Degraded" : "Critical");
const sevTone = (s: string): Tone => (s === "critical" ? "crit" : s === "warn" || s === "warning" ? "warn" : "info");
const sevLabel = (s: string) => (s === "critical" ? "Critical" : s === "warn" || s === "warning" ? "Warning" : "Info");
const barColor = (t: Tone) => (t === "crit" ? "#e5383b" : t === "warn" ? "#f5a524" : "#16a34a");

// inline health bar with its value
const usage = "inline-flex items-center gap-2";
const usageTrack = "inline-block align-middle w-16 h-2 rounded-[5px] bg-bg-muted overflow-hidden";
const usageValue = "text-xs font-semibold min-w-[34px]";
// device-kind chips
const chips = "flex flex-wrap gap-2.5";
const chip = "inline-flex flex-col items-center justify-center gap-1 min-w-[104px] min-h-[76px] px-3 py-2.5 border border-line rounded-lg bg-bg-raised text-fg cursor-pointer shadow-sm hover:border-line-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 [&_.ld-icon]:text-2xl [&_.ld-icon]:text-accent";

const QUICK_ACTIONS: [string, string, string | null][] = [
  ["fa-magnifying-glass-arrow-right", "Discovery Scan", null],
  ["fa-rotate", "Re-poll All", null],
  ["fa-file-import", "Import CSV", null],
  ["fa-tower-broadcast", "Manage Exporters", "infra-exporters"],
  ["fa-circle-nodes", "View Topology", "infra-topology"],
  ["fa-cube", "Inventory", "infra-assets"],
];

export default function InfraScreen() {
  const { setRoute } = useNav();
  const { data: sitesData } = useSites();
  const sites = sitesData ?? [];
  const { data: alertsData } = useInfraAlerts();
  const alerts = alertsData ?? [];
  const { data: devicesData } = useDevices();
  const devices = devicesData ?? [];
  const total = devices.length;
  const ok = devices.filter(d => d.status === "ok").length;
  const warn = devices.filter(d => d.status === "warn").length;
  const crit = devices.filter(d => d.status === "critical" || d.status === "down").length;
  const other = total - ok - warn - crit;
  const regions = new Set(sites.map(s => s.region)).size;

  const byId = new Map<string, Device>(devices.map(d => [d.id, d]));
  const openDevice = (id: string, kind?: string) => {
    setRoute(deviceRoute(kind ?? byId.get(id)?.kind), { deviceId: id });
  };

  const statusSlices: Slice[] = [
    { label: "Healthy", value: ok, color: "#16a34a" },
    { label: "Warning", value: warn, color: "#f5a524" },
    { label: "Critical / down", value: crit, color: "#e5383b" },
    ...(other > 0 ? [{ label: "Unknown", value: other, color: "#98a2b3" }] : []),
  ];

  return (
    <Page>
      <Crumbs items={[{ label: "Home", onClick: () => setRoute("dashboard") }, { label: "Monitoring" }]} />

      <PageHead
        title="On-Prem Infrastructure"
        subtitle={`${fmt(total)} devices monitored over SNMP, NetFlow, WMI, vSphere and node-exporter`}
        actions={
          <>
            <Button onClick={() => setRoute("infra-topology")}><Icon icon={WorkflowIcon} /> Topology</Button>
            <Button><Icon icon={FileOutputIcon} /> Export CMDB</Button>
            <Button variant="primary"><Icon icon={PlusIcon} /> Add Device</Button>
          </>
        }
      />

      <div className={cx(ui.grid, ui.cols[6])}>
        <StatCard icon="fa-server" tone="info" label="Total devices" value={fmt(total)} note="all sites" onClick={() => setRoute("infra-assets")} />
        <StatCard icon="fa-circle-check" tone="ok" label="Healthy" value={fmt(ok)} note={total ? `${Math.round((ok / total) * 100)}% of monitored` : "—"} onClick={() => setRoute("infra-assets")} />
        <StatCard icon="fa-triangle-exclamation" tone="warn" label="Warning" value={fmt(warn)} note="thresholds breached" onClick={() => setRoute("infra-assets")} />
        <StatCard icon="fa-circle-xmark" tone="crit" label="Critical / down" value={fmt(crit)} note={crit ? "needs attention" : "all clear"} onClick={() => setRoute("infra-assets")} />
        <StatCard icon="fa-building" tone="purple" label="Sites" value={fmt(sites.length)} note={`across ${regions} region${regions === 1 ? "" : "s"}`} />
        <StatCard icon="fa-bell" tone={alerts.length ? "warn" : "ok"} label="Active alerts" value={fmt(alerts.length)} note="infrastructure" />
      </div>

      <div className={ui.split}>
        <div className={ui.rail}>
          <Panel title={`Sites (${sites.length})`}>
            {sites.length ? (
              <Table>
                <thead>
                  <tr><th scope="col">Site</th><th scope="col">Region</th><th scope="col">Devices</th><th scope="col">Health</th><th scope="col">Status</th></tr>
                </thead>
                <tbody>
                  {sites.map(s => {
                    const t = siteTone(s.health);
                    return (
                      <tr key={s.id}>
                        <td><span className="font-medium">{s.name}</span><span className={cx(ui.sub, ui.mono)}>{s.id}</span></td>
                        <td><Pill tone="muted">{s.region}</Pill></td>
                        <td>{fmt(s.devices)}</td>
                        <td>
                          <span className={usage}>
                            <span className={usageTrack} role="img" aria-label={`${s.health}% healthy`}>
                              <span className={ui.barFill} style={{ width: `${s.health}%`, background: barColor(t) }} />
                            </span>
                            <b className={usageValue}>{s.health}%</b>
                          </span>
                        </td>
                        <td><Pill tone={t}><PillDot />{siteLabel(s.health)}</Pill></td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            ) : (
              <Empty>No sites reported yet.</Empty>
            )}
          </Panel>

          <Panel title="Device Categories" action={{ label: "Open inventory", onClick: () => setRoute("infra-assets") }}>
            <div className={chips} role="group" aria-label="Device categories">
              {DEVICE_KINDS.map(k => (
                <button key={k.id} type="button" className={chip} onClick={() => setRoute("infra-assets")}>
                  <Icon name={k.icon} />
                  <span className="text-md font-bold">{devices.filter(d => d.kind === k.id).length}</span>
                  <span className="text-sm text-fg-muted">{k.label}</span>
                </button>
              ))}
            </div>
          </Panel>

          <Panel title={`Active Infrastructure Alerts (${alerts.length})`} action={{ label: "Open alert console", onClick: () => setRoute("alerts") }}>
            {alerts.length ? (
              <Table>
                <thead>
                  <tr><th scope="col">Device</th><th scope="col">Severity</th><th scope="col">Alert</th><th scope="col">Detail</th><th scope="col">Since</th><th scope="col">Rule</th></tr>
                </thead>
                <tbody>
                  {alerts.map(a => (
                    <tr key={a.id}>
                      <td><TextButton className={monoLink} onClick={() => openDevice(a.device, a.deviceKind)}>{a.device}</TextButton></td>
                      <td><Pill tone={sevTone(a.sev)}><PillDot />{sevLabel(a.sev)}</Pill></td>
                      <td className={cx("font-medium", ui.cellWrap)}>{a.title}</td>
                      <td className={ui.cellWrap}>{a.detail}</td>
                      <td className="whitespace-nowrap">{a.since}</td>
                      <td className="font-mono font-semibold">{a.rule}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <Empty>No active infrastructure alerts.</Empty>
            )}
          </Panel>
        </div>

        <div className={ui.rail}>
          <Panel title="Device Status">
            <div className="flex flex-wrap items-center gap-4.5">
              <Donut slices={statusSlices} center={fmt(total)} sub="Devices" label={`${ok} healthy, ${warn} warning and ${crit} critical or down devices`} />
              <Legend slices={statusSlices} />
            </div>
          </Panel>

          <Panel title="Quick Actions">
            <div className="grid grid-cols-2 gap-2">
              {QUICK_ACTIONS.map(([ic, lbl, route]) => (
                <Button key={lbl} size="sm" className="!justify-start" onClick={() => { if (route) setRoute(route); }}>
                  <Icon name={ic} /> {lbl}
                </Button>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </Page>
  );
}
