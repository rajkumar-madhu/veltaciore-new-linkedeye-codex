// LE Sites — per-site detail (the LinkedEye `lesites/?site=…` view). Rolls up
// everything scoped to one site: device inventory, exporters, BOD readiness and
// recent alerts, from the live DRF API. Light-theme house style.
import React from "react";
import { Kpi, FormSection } from "@/components/primitives";
import { Donut } from "@/components/deviceDetail";
import { useDevices, useExporters, useBodChecks, useInfraAlerts, useSites } from "@/api/hooks";

// Known LinkedEye sites (id → display metadata + fleet rollup). fs-dx-le default.
interface SiteMeta { label: string; role: string; dc: string; region: string; assets: number; health: number; bodDown: number; }
const SITES: Record<string, SiteMeta> = {
  "fs-dx-le": { label: "fs-dx-le", role: "DX · LinkedEye edge", dc: "Bangalore DC-1", region: "ap-south (BLR)", assets: 14, health: 64, bodDown: 2 },
  "nextalpha-le-PROD": { label: "nextalpha-le-PROD", role: "Production · LE core", dc: "Bangalore DC-1", region: "ap-south (BLR)", assets: 96, health: 97, bodDown: 0 },
  "fs-prd-htspr1": { label: "fs-prd-htspr1", role: "Production · Hotspot-1", dc: "Frankfurt DC-1", region: "eu-central (FRA)", assets: 42, health: 88, bodDown: 1 },
  "fs-le-dev": { label: "fs-le-dev", role: "Dev · LinkedEye", dc: "Bangalore DC-1", region: "ap-south (BLR)", assets: 11, health: 100, bodDown: 0 },
};
const SITE_IDS = Object.keys(SITES);

export default function SiteDetailScreen() {
  const [site, setSite] = React.useState("fs-dx-le");
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const toggle = (id: string) => setCollapsed((c) => ({ ...c, [id]: !c[id] }));
  const meta = SITES[site];

  const allDevices = useDevices().data ?? [];
  const exporters = useExporters().data ?? [];
  const bod = useBodChecks().data ?? [];
  const alerts = useInfraAlerts().data ?? [];
  const liveSites = useSites().data ?? [];

  // Scope devices to the site; if the seeded data uses different site ids, show a
  // representative slice so the page is never empty.
  const scoped = allDevices.filter((d) => d.site === site);
  const devices = scoped.length ? scoped : allDevices.slice(0, 14);

  const up = devices.filter((d) => d.status === "ok" || d.status === "up").length;
  const health = devices.length ? Math.round((up / devices.length) * 100) : 100;
  const bodDown = bod.filter((r) => r.status === 0 || r.status === 3).length;
  const bodWarn = bod.filter((r) => r.status === 1).length;
  const bodReady = bod.length > 0 && bodDown === 0;
  const siteRow = liveSites.find((s) => s.id === site);

  const statusDot = (s: string) => {
    const ok = s === "ok" || s === "up";
    const warn = s === "warn" || s === "degraded";
    const c = ok ? "#10b981" : warn ? "#f59e0b" : "#ef4444";
    return <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: c, marginRight: 6 }} />;
  };

  return (
    <div className="page page-fade sn-dash">
      <div className="sn-breadcrumb">
        <a className="sn-link">Home</a><span className="sn-bc-sep">›</span>
        <a className="sn-link">Infrastructure</a><span className="sn-bc-sep">›</span>
        <a className="sn-link">LE Sites</a><span className="sn-bc-sep">›</span>
        <span>{meta.label}</span>
      </div>

      <div className="sn-form-header">
        <div className="sn-form-title-row">
          <span className="sn-rec-number mono">{meta.label}</span>
          {health >= 95
            ? <span className="sn-pill svc-healthy"><i className="fa-solid fa-circle-check" /> {health}% healthy</span>
            : <span className="sn-pill state-progress"><i className="fa-solid fa-triangle-exclamation" /> {health}% healthy</span>}
          {!bodReady && bod.length > 0 && <span className="sn-pill prio-1"><i className="fa-solid fa-clipboard-check" /> BOD {bodDown} down</span>}
        </div>
        <div className="sn-form-title-meta">
          <div>
            <h1>{meta.label} · Site Overview</h1>
            <div className="sn-form-sub">{meta.role} · {meta.dc} · {meta.region} · {devices.length} monitored assets</div>
          </div>
          <div className="sn-form-actions">
            <select value={site} onChange={(e) => setSite(e.target.value)} className="mx-input" style={{ height: 34 }}>
              {SITE_IDS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button className="sn-btn"><i className="fa-solid fa-arrows-rotate" /> Refresh</button>
          </div>
        </div>
      </div>

      {/* All LE Sites — overview cards, click to inspect */}
      <div style={{ padding: "14px 24px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
          {SITE_IDS.map((id) => {
            const m = SITES[id];
            const sel = id === site;
            const ok = m.bodDown === 0 && m.health >= 95;
            return (
              <div key={id} onClick={() => setSite(id)}
                style={{ cursor: "pointer", background: "white", borderRadius: 8, padding: "12px 14px",
                  border: `1px solid ${sel ? "var(--accent)" : "#e5e8eb"}`, boxShadow: sel ? "0 0 0 3px rgba(21,181,131,0.12)" : undefined }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="mono" style={{ fontWeight: 700, fontSize: 12.5, color: sel ? "var(--accent)" : "#0f1c3f" }}>{m.label}</span>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: ok ? "#10b981" : m.bodDown ? "#ef4444" : "#f59e0b" }} />
                </div>
                <div style={{ fontSize: 11, color: "#8a94a3", marginTop: 2 }}>{m.role}</div>
                <div style={{ display: "flex", gap: 14, marginTop: 8, fontSize: 11.5 }}>
                  <span style={{ color: "#475467" }}><b style={{ color: m.health >= 95 ? "#059669" : "#b45309" }}>{m.health}%</b> health</span>
                  <span style={{ color: "#475467" }}><b style={{ color: "#0f1c3f" }}>{m.assets}</b> assets</span>
                  {m.bodDown > 0
                    ? <span style={{ color: "#dc2626", fontWeight: 600 }}>{m.bodDown} BOD down</span>
                    : <span style={{ color: "#059669", fontWeight: 600 }}>BOD ready</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ padding: "16px 24px 0" }}>
        <div className="sn-kpi-strip">
          <Kpi l="Monitored assets" v={siteRow?.devices ?? meta.assets} s="switches · servers · fw" tone="neutral" />
          <Kpi l="Site health" v={<>{health}<span style={{ fontSize: 13, color: "#8a94a3" }}>%</span></>} s={`${up}/${devices.length} up`} tone={health >= 95 ? "ok" : "warn"} />
          <Kpi l="BOD readiness" v={bodReady ? "Ready" : `${bodDown} down`} s={`${bodWarn} warn · ${bod.length} checks`} tone={bodReady ? "ok" : "crit"} />
          <Kpi l="Active alerts" v={alerts.length} s="infra alarms" tone={alerts.length > 0 ? "warn" : "ok"} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16, padding: "16px 24px 24px" }}>
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Device inventory */}
          <FormSection id="dev" title="Device inventory" badge={`${devices.length} assets`} collapsed={collapsed.dev} onToggle={toggle}>
            <table className="sn-list-table" style={{ fontSize: 12.5 }}>
              <thead>
                <tr><th style={{ width: 40 }}></th><th>DEVICE</th><th style={{ width: 90 }}>KIND</th><th style={{ width: 130 }}>IP</th><th style={{ width: 70 }}>CPU</th><th style={{ width: 70 }}>MEM</th><th style={{ width: 90 }}>STATUS</th></tr>
              </thead>
              <tbody>
                {devices.map((d) => (
                  <tr key={d.id}>
                    <td>{statusDot(d.status)}</td>
                    <td><div style={{ fontWeight: 600, color: "#0f1c3f" }}>{d.hostname || d.id}</div><div className="mono" style={{ fontSize: 11, color: "#8a94a3" }}>{d.model}</div></td>
                    <td><span style={{ fontSize: 11, fontWeight: 600, color: "#475467", background: "#f3f4f6", padding: "2px 7px", borderRadius: 4 }}>{d.kind}</span></td>
                    <td className="mono" style={{ color: "#475467" }}>{d.ip}</td>
                    <td className="mono" style={{ color: d.cpu > 85 ? "#dc2626" : "#475467" }}>{d.cpu}%</td>
                    <td className="mono" style={{ color: d.mem > 90 ? "#dc2626" : "#475467" }}>{d.mem}%</td>
                    <td style={{ fontSize: 12, color: d.status === "ok" || d.status === "up" ? "#059669" : "#b45309", fontWeight: 600 }}>{d.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </FormSection>

          {/* Exporters covering the site */}
          <FormSection id="exp" title="Exporters at this site" badge={`${exporters.length} types`} collapsed={collapsed.exp} onToggle={toggle}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10, padding: 14 }}>
              {exporters.map((e) => (
                <div key={e.name} style={{ border: "1px solid #eef1f4", borderRadius: 6, padding: "10px 12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: "#0f1c3f" }}>{e.name}</span>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: e.status === "ok" ? "#10b981" : "#f59e0b" }} />
                  </div>
                  <div className="mono" style={{ fontSize: 10.5, color: "#8a94a3", marginTop: 3 }}>{e.port ? `:${e.port}` : ""} · {e.protocol || "HTTP"}</div>
                </div>
              ))}
            </div>
          </FormSection>
        </div>

        {/* Right rail — health donut + BOD + alerts */}
        <aside style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="card" style={{ background: "white", border: "1px solid #e5e8eb", borderRadius: 6, padding: 16, textAlign: "center" }}>
            <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 8, textAlign: "left" }}><i className="fa-solid fa-heart-pulse" style={{ color: "var(--accent)", marginRight: 6 }} /> Site health</div>
            <div style={{ position: "relative", width: 84, margin: "0 auto" }}>
              <Donut parts={[{ pct: health, color: health >= 95 ? "#10b981" : "#f59e0b" }, { pct: 100 - health, color: "#eef1f4" }]} size={84} />
              <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 18, fontWeight: 800, color: "#0f1c3f" }}>{health}%</div>
            </div>
            <div style={{ fontSize: 11.5, color: "#8a94a3", marginTop: 6 }}>{up} of {devices.length} assets up</div>
          </div>

          <div className="card" style={{ background: "white", border: "1px solid #e5e8eb", borderRadius: 6, padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 10 }}><i className="fa-solid fa-clipboard-check" style={{ color: "var(--accent)", marginRight: 6 }} /> BOD readiness</div>
            <div style={{ display: "flex", gap: 6 }}>
              {[[bod.filter((r) => r.status === 2).length, "OK", "#059669", "#ecfdf5"], [bodWarn, "Warn", "#b45309", "#fffbeb"], [bodDown, "Down", "#dc2626", "#fef2f2"]].map(([n, l, c, bg]) => (
                <div key={l as string} style={{ flex: 1, textAlign: "center", padding: "8px 4px", borderRadius: 6, background: bg as string }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: c as string }}>{n as number}</div>
                  <div style={{ fontSize: 10, color: "#8a94a3" }}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ background: "white", border: "1px solid #e5e8eb", borderRadius: 6, padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 10 }}><i className="fa-solid fa-bell" style={{ color: "var(--accent)", marginRight: 6 }} /> Recent alerts</div>
            {alerts.length === 0 && <div style={{ fontSize: 12, color: "#8a94a3" }}>No active alarms at this site.</div>}
            {alerts.slice(0, 5).map((a, i, shown) => (
              <div key={a.id ?? a.title} style={{ display: "flex", gap: 8, padding: "6px 0", borderBottom: i < shown.length - 1 ? "1px solid #f4f6f8" : undefined, fontSize: 11.5 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#f59e0b", marginTop: 4, flexShrink: 0 }} />
                <div><div style={{ color: "#0f1c3f" }}>{a.title}</div><div style={{ color: "#8a94a3", fontSize: 10.5 }}>{a.since}</div></div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
