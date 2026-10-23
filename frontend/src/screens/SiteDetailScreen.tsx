// LE Sites — per-site detail (the LinkedEye `lesites/?site=…` view). Rolls up
// everything scoped to one site: device inventory, exporters, BOD readiness and
// recent alerts, from the live DRF API.
import React from "react";
import "@/styles/infra.css";
import { useNav } from "@/hooks/useNav";
import { Donut, Empty, Panel, Pill, StatCard, fmt } from "@/components/ld";
import type { Slice, Tone } from "@/components/ld";
import { useDevices, useExporters, useBodChecks, useInfraAlerts, useSites } from "@/api/hooks";

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
    <div className="ld-dash">
      <nav className="ld-crumbs" aria-label="Breadcrumb">
        <button type="button" className="ld-link" onClick={() => setRoute("dashboard")}>Home</button>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <button type="button" className="ld-link" onClick={() => setRoute("infra")}>Monitoring</button>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <span>LE Sites</span>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <span>{meta.label}</span>
      </nav>

      <div className="ld-head ld-entity-head">
        <div className="ld-entity">
          <span className="ld-tile ld-info" aria-hidden="true"><i className="fa-solid fa-building" /></span>
          <div>
            <h1 className="ld-entity-title">
              {meta.label}
              <Pill tone={health >= 95 ? "ok" : "warn"}><i className={`fa-solid ${health >= 95 ? "fa-circle-check" : "fa-triangle-exclamation"}`} aria-hidden="true" /> {health}% healthy</Pill>
              {!bodReady && bod.length > 0 && <Pill tone="crit"><i className="fa-solid fa-clipboard-check" aria-hidden="true" /> BOD {bodDown} down</Pill>}
            </h1>
            <p className="ld-entity-meta">
              <span>{meta.role}</span>
              <span>{meta.dc}</span>
              <span>{meta.region}</span>
              <span>{devices.length} monitored assets</span>
            </p>
          </div>
        </div>
        <div className="ld-head-side">
          <div className="ld-head-actions">
            <label htmlFor="site-pick" className="sr-only">Site</label>
            <select id="site-pick" className="ld-select" value={site} onChange={(e) => setSite(e.target.value)}>
              {SITE_IDS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button type="button" className="ld-btn"><i className="fa-solid fa-arrows-rotate" aria-hidden="true" /> Refresh</button>
          </div>
        </div>
      </div>

      {/* All LE Sites — pick one to inspect */}
      <div className="ld-infra-picker" role="group" aria-label="LE sites">
        {SITE_IDS.map((id) => {
          const m = SITES[id];
          const n = liveSites.find((s) => s.id === id)?.devices ?? allDevices.filter((d) => d.site === id).length;
          return (
            <button key={id} type="button" className="ld-card ld-infra-pick" aria-pressed={id === site} onClick={() => setSite(id)}>
              <span className="ld-tile ld-tile-sm ld-info" aria-hidden="true"><i className="fa-solid fa-building" /></span>
              <span className="ld-infra-pick-body">
                <span className="ld-infra-pick-title ld-mono">{m.label}</span>
                <span className="ld-infra-pick-sub">{m.role}</span>
                <span className="ld-infra-pick-sub">{m.dc} · {fmt(n)} assets</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="ld-grid ld-grid-stats">
        <StatCard icon="fa-server" tone="info" label="Monitored assets" value={fmt(assets)} note="switches · servers · firewalls" />
        <StatCard icon="fa-heart-pulse" tone={health >= 95 ? "ok" : "warn"} label="Site health" value={`${health}%`} note={`${up}/${devices.length} up`} />
        <StatCard icon="fa-clipboard-check" tone={bodReady ? "ok" : "crit"} label="BOD readiness" value={bod.length ? (bodReady ? "Ready" : `${bodDown} down`) : "—"} note={`${bodWarn} warn · ${bod.length} checks`} />
        <StatCard icon="fa-bell" tone={alerts.length > 0 ? "warn" : "ok"} label="Active alerts" value={fmt(alerts.length)} note="infra alarms, all sites" />
      </div>

      <div className="ld-split">
        <div className="ld-rail">
          <Panel title={`Device inventory (${devices.length})`}>
            {unscoped && <p className="ld-muted ld-small">No devices are tagged with site {meta.label} yet; showing a sample of the fleet.</p>}
            {devices.length ? (
              <div className="ld-table-wrap">
                <table className="ld-table">
                  <thead>
                    <tr><th scope="col">Device</th><th scope="col">Kind</th><th scope="col">IP</th><th scope="col">CPU</th><th scope="col">Memory</th><th scope="col">Status</th></tr>
                  </thead>
                  <tbody>
                    {devices.map((d) => (
                      <tr key={d.id}>
                        <td><span className="ld-strong">{d.hostname || d.id}</span><span className="ld-sub ld-mono">{d.model}</span></td>
                        <td><Pill tone="muted">{d.kind}</Pill></td>
                        <td className="ld-mono ld-muted">{d.ip}</td>
                        <td className={d.cpu > 85 ? "ld-text-crit" : "ld-muted"}>{d.cpu}%</td>
                        <td className={d.mem > 90 ? "ld-text-crit" : "ld-muted"}>{d.mem}%</td>
                        <td><Pill tone={statusTone(d.status)}><span className="ld-pill-dot" />{d.status}</Pill></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty>No devices reported yet.</Empty>
            )}
          </Panel>

          <Panel title={`Exporters (${exporters.length} types)`}>
            {exporters.length ? (
              <ul className="ld-infra-tiles">
                {exporters.map((e) => (
                  <li key={e.name}>
                    <div>
                      <span className="ld-mono-name">{e.name}</span>
                      <Pill tone={e.status === "ok" ? "ok" : "warn"}>{e.status === "ok" ? "Healthy" : "Degraded"}</Pill>
                    </div>
                    <span className="ld-sub ld-mono">{e.port ? `:${e.port} · ` : ""}{e.protocol || "HTTP"}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No exporters reported yet.</Empty>
            )}
          </Panel>
        </div>

        <div className="ld-rail">
          <Panel title="Site health">
            <div className="ld-donut-row">
              <Donut slices={healthSlices} center={`${health}%`} sub="up" label={`${up} of ${devices.length} assets up`} />
              <p className="ld-muted ld-small">{up} of {devices.length} assets up</p>
            </div>
          </Panel>

          <Panel title="BOD readiness">
            {bod.length ? (
              <div className="ld-infra-counts">
                <div className="ld-ok"><b>{bodOk}</b><span>OK</span></div>
                <div className="ld-warn"><b>{bodWarn}</b><span>Warn</span></div>
                <div className="ld-crit"><b>{bodDown}</b><span>Down</span></div>
              </div>
            ) : (
              <Empty>No BOD checks reported yet.</Empty>
            )}
          </Panel>

          <Panel title="Recent alerts">
            {alerts.length ? (
              <ul className="ld-activity">
                {alerts.slice(0, 5).map((a) => (
                  <li key={a.id ?? a.title}>
                    <Pill tone={sevTone(a.sev)}><span className="ld-pill-dot" /><span className="sr-only">{a.sev}</span></Pill>
                    <span className="ld-activity-text" title={a.title}>{a.title}</span>
                    <span className="ld-muted ld-small ld-nowrap">{a.since}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No active alarms.</Empty>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
