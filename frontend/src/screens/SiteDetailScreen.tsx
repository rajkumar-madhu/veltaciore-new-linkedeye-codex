// LE Sites — per-site detail (the LinkedEye `lesites/?site=…` view). Rolls up
// everything scoped to one site: device inventory, exporters, BOD readiness and
// recent alerts, from the live DRF API.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { Donut, Empty, Panel, Pill, PillDot, StatCard, fmt } from "@/components/ld";
import type { Slice, Tone } from "@/components/ld";
import { useDevices, useExporters, useBodChecks, useInfraAlerts, useSites } from "@/api/hooks";
import { Button, Crumbs, Page, Select, Table, Tile, cx, toneBg, ui } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { Building2Icon, ClipboardCheckIcon, RefreshCwIcon } from "lucide-react";
// Table cells kept the cell's 13px / colour over mono size, muted and (light) status colour.
const cellMono = "font-mono font-semibold";
const cellCrit = "font-semibold dark:text-tone-crit";
// Entity sub-line: items separated by a "|" (inherits the page-head paragraph style).
const entityMeta = "text-base text-fg-muted mt-1 flex flex-wrap gap-x-3.5 gap-y-1 [&_span+span]:before:content-['|'] [&_span+span]:before:mr-3.5 [&_span+span]:before:text-line-strong";
const pickCard = cx(
  ui.card,
  "flex items-center gap-3 w-full text-left text-fg px-3.5 py-3 cursor-pointer hover:border-line-strong",
  "aria-pressed:border-accent aria-pressed:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_18%,transparent)]",
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
);

// Known LinkedEye sites (id → display metadata). fs-dx-le default.
interface SiteMeta { label: string; role: string; dc: string; region: string; }
const SITES: Record<string, SiteMeta> = {
  "fs-dx-le": { label: "fs-dx-le", role: "DX · LinkedEye edge", dc: "Bangalore DC-1", region: "ap-south (BLR)" },
  "nextalpha-le-PROD": { label: "nextalpha-le-PROD", role: "Production · LE core", dc: "Bangalore DC-1", region: "ap-south (BLR)" },
  "fs-prd-htspr1": { label: "fs-prd-htspr1", role: "Production · Hotspot-1", dc: "Frankfurt DC-1", region: "eu-central (FRA)" },
  "fs-le-dev": { label: "fs-le-dev", role: "Dev · LinkedEye", dc: "Bangalore DC-1", region: "ap-south (BLR)" },
};
const SITE_IDS = Object.keys(SITES);

const isUp = (s: string) => s === "ok" || s === "up";
const statusTone = (s: string): Tone => (isUp(s) ? "ok" : s === "warn" || s === "degraded" ? "warn" : "crit");
const sevTone = (s: string): Tone => (s === "critical" ? "crit" : s === "warn" || s === "warning" ? "warn" : "info");

export default function SiteDetailScreen() {
  const { setRoute } = useNav();
  const [site, setSite] = React.useState("fs-dx-le");
  const meta = SITES[site];

  const allDevices = useDevices().data ?? [];
  const exporters = useExporters().data ?? [];
  const bod = useBodChecks().data ?? [];
  const alerts = useInfraAlerts().data ?? [];
  const liveSites = useSites().data ?? [];

  // Scope devices to the site; if the seeded data uses different site ids, show a
  // representative slice so the page is never empty (and say so).
  const scoped = allDevices.filter((d) => d.site === site);
  const devices = scoped.length ? scoped : allDevices.slice(0, 14);
  const unscoped = !scoped.length && devices.length > 0;

  const up = devices.filter((d) => isUp(d.status)).length;
  const health = devices.length ? Math.round((up / devices.length) * 100) : 100;
  const bodOk = bod.filter((r) => r.status === 2).length;
  const bodDown = bod.filter((r) => r.status === 0 || r.status === 3).length;
  const bodWarn = bod.filter((r) => r.status === 1).length;
  const bodReady = bod.length > 0 && bodDown === 0;
  const siteRow = liveSites.find((s) => s.id === site);
  const assets = siteRow?.devices ?? devices.length;

  const healthSlices: Slice[] = [
    { label: "Up", value: up, color: "#16a34a" },
    { label: "Not up", value: devices.length - up, color: "#f5a524" },
  ];

  return (
    <Page>
      <Crumbs items={[{ label: "Home", onClick: () => setRoute("dashboard") }, { label: "Monitoring", onClick: () => setRoute("infra") }, { label: "LE Sites" }, { label: meta.label }]} />

      <div className={cx(ui.head, "!items-start")}>
        <div className="flex items-center gap-3.5 min-w-0">
          <Tile tone="info" className="!text-5xl"><Icon icon={Building2Icon} /></Tile>
          <div>
            <h1 className={cx(ui.h1, "flex items-center gap-2.5 flex-wrap")}>
              {meta.label}
              <Pill tone={health >= 95 ? "ok" : "warn"}><Icon name={health >= 95 ? "circle-check" : "triangle-exclamation"} /> {health}% healthy</Pill>
              {!bodReady && bod.length > 0 && <Pill tone="crit"><Icon icon={ClipboardCheckIcon} /> BOD {bodDown} down</Pill>}
            </h1>
            <p className={entityMeta}>
              <span>{meta.role}</span>
              <span>{meta.dc}</span>
              <span>{meta.region}</span>
              <span>{devices.length} monitored assets</span>
            </p>
          </div>
        </div>
        <div className={ui.headSide}>
          <div className={ui.headActions}>
            <label htmlFor="site-pick" className="sr-only">Site</label>
            <Select id="site-pick" value={site} onChange={(e) => setSite(e.target.value)}>
              {SITE_IDS.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
            <Button><Icon icon={RefreshCwIcon} /> Refresh</Button>
          </div>
        </div>
      </div>

      {/* All LE Sites — pick one to inspect */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3" role="group" aria-label="LE sites">
        {SITE_IDS.map((id) => {
          const m = SITES[id];
          const n = liveSites.find((s) => s.id === id)?.devices ?? allDevices.filter((d) => d.site === id).length;
          return (
            <button key={id} type="button" className={pickCard} aria-pressed={id === site} onClick={() => setSite(id)}>
              <Tile tone="info" size="sm"><Icon icon={Building2Icon} /></Tile>
              <span className="flex flex-col gap-0.5 min-w-0">
                <span className="font-mono font-bold text-sm">{m.label}</span>
                <span className="text-xs text-fg-muted">{m.role}</span>
                <span className="text-xs text-fg-muted">{m.dc} · {fmt(n)} assets</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className={cx(ui.grid, ui.cols.stats)}>
        <StatCard icon="fa-server" tone="info" label="Monitored assets" value={fmt(assets)} note="switches · servers · firewalls" />
        <StatCard icon="fa-heart-pulse" tone={health >= 95 ? "ok" : "warn"} label="Site health" value={`${health}%`} note={`${up}/${devices.length} up`} />
        <StatCard icon="fa-clipboard-check" tone={bodReady ? "ok" : "crit"} label="BOD readiness" value={bod.length ? (bodReady ? "Ready" : `${bodDown} down`) : "—"} note={`${bodWarn} warn · ${bod.length} checks`} />
        <StatCard icon="fa-bell" tone={alerts.length > 0 ? "warn" : "ok"} label="Active alerts" value={fmt(alerts.length)} note="infra alarms, all sites" />
      </div>

      <div className={ui.split}>
        <div className={ui.rail}>
          <Panel title={`Device inventory (${devices.length})`}>
            {unscoped && <p className="text-fg-muted text-xs">No devices are tagged with site {meta.label} yet; showing a sample of the fleet.</p>}
            {devices.length ? (
              <Table>
                  <thead>
                    <tr><th scope="col">Device</th><th scope="col">Kind</th><th scope="col">IP</th><th scope="col">CPU</th><th scope="col">Memory</th><th scope="col">Status</th></tr>
                  </thead>
                  <tbody>
                    {devices.map((d) => (
                      <tr key={d.id}>
                        <td><span className="font-medium">{d.hostname || d.id}</span><span className={cx(ui.sub, ui.mono)}>{d.model}</span></td>
                        <td><Pill tone="muted">{d.kind}</Pill></td>
                        <td className={cellMono}>{d.ip}</td>
                        <td className={d.cpu > 85 ? cellCrit : undefined}>{d.cpu}%</td>
                        <td className={d.mem > 90 ? cellCrit : undefined}>{d.mem}%</td>
                        <td><Pill tone={statusTone(d.status)}><PillDot />{d.status}</Pill></td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
            ) : (
              <Empty>No devices reported yet.</Empty>
            )}
          </Panel>

          <Panel title={`Exporters (${exporters.length} types)`}>
            {exporters.length ? (
              <ul className="list-none m-0 p-0 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2.5">
                {exporters.map((e) => (
                  <li key={e.name} className="border border-line rounded px-3 py-2.5 flex flex-col gap-0.5 min-w-0">
                    <div className="flex justify-between items-center gap-2">
                      <span className="font-mono text-[12.5px] text-accent">{e.name}</span>
                      <Pill tone={e.status === "ok" ? "ok" : "warn"}>{e.status === "ok" ? "Healthy" : "Degraded"}</Pill>
                    </div>
                    <span className={cx(ui.sub, ui.mono)}>{e.port ? `:${e.port} · ` : ""}{e.protocol || "HTTP"}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No exporters reported yet.</Empty>
            )}
          </Panel>
        </div>

        <div className={ui.rail}>
          <Panel title="Site health">
            <div className="flex flex-wrap items-center gap-4.5">
              <Donut slices={healthSlices} center={`${health}%`} sub="up" label={`${up} of ${devices.length} assets up`} />
              <p className="text-fg-muted text-xs">{up} of {devices.length} assets up</p>
            </div>
          </Panel>

          <Panel title="BOD readiness">
            {bod.length ? (
              <div className="grid grid-cols-3 gap-2 [&>div]:text-center [&>div]:py-2 [&>div]:px-1 [&>div]:rounded [&_b]:block [&_b]:text-2xl [&_span]:text-xs">
                <div className={toneBg.ok}><b>{bodOk}</b><span>OK</span></div>
                <div className={toneBg.warn}><b>{bodWarn}</b><span>Warn</span></div>
                <div className={toneBg.crit}><b>{bodDown}</b><span>Down</span></div>
              </div>
            ) : (
              <Empty>No BOD checks reported yet.</Empty>
            )}
          </Panel>

          <Panel title="Recent alerts">
            {alerts.length ? (
              <ul className={ui.activity}>
                {alerts.slice(0, 5).map((a) => (
                  <li key={a.id ?? a.title} className={ui.activityItem}>
                    <Pill tone={sevTone(a.sev)}><PillDot /><span className="sr-only">{a.sev}</span></Pill>
                    <span className={ui.activityText} title={a.title}>{a.title}</span>
                    <span className="text-fg-muted text-xs whitespace-nowrap">{a.since}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No active alarms.</Empty>
            )}
          </Panel>
        </div>
      </div>
    </Page>
  );
}
