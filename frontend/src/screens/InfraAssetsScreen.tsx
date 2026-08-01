// Asset inventory in ServiceNow form-style.
// Ported from screens/infra-assets.jsx.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { useDevices } from "@/api/hooks";
import { SITES, DEVICE_KINDS, DEVICES } from "@/data/infra";
import { Kpi, FormSection, Field } from "@/components/primitives";
import type { DeviceKind } from "@/lib/types";

// The seed data carries `iconBrand` for fa-brands icons (win/linux), but the
// shared DeviceKind type does not declare it — extend locally (shared files
// must not be edited).
type KindMeta = DeviceKind & { iconBrand?: boolean };

export default function InfraAssetsScreen() {
  const { setRoute } = useNav();
  const { data } = useDevices();
  const devices = data ?? [];
  const [kind, setKind] = React.useState("all");
  const [site, setSite] = React.useState("all");
  const [q, setQ] = React.useState("");
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const toggle = (id: string) => setCollapsed(c => ({ ...c, [id]: !c[id] }));
  const filtered = devices.filter(d =>
    (kind === "all" || d.kind === kind) &&
    (site === "all" || d.site === site) &&
    (q === "" || (d.id + d.model + d.role + d.ip).toLowerCase().includes(q.toLowerCase()))
  );
  const kindMeta = (id: string) => (DEVICE_KINDS.find(k => k.id === id) || {}) as KindMeta;

  return (
    <div className="page page-fade sn-dash">
      <div className="sn-breadcrumb">
        <a className="sn-link">Home</a><span className="sn-bc-sep">›</span>
        <a className="sn-link" onClick={() => setRoute("infra")}>Infrastructure</a><span className="sn-bc-sep">›</span>
        <span>Asset Inventory</span>
      </div>

      <div className="sn-form-header">
        <div className="sn-form-title-row">
          <span className="sn-rec-number">CMDB-CI</span>
          <span className="sn-pill state-progress"><i className="fa-solid fa-spinner fa-spin" /> {devices.length} monitored</span>
          <span className="sn-pill state-neutral"><i className="fa-solid fa-boxes-stacked" /> {filtered.length} matching</span>
        </div>
        <div className="sn-form-title-meta">
          <div>
            <h1>Asset Inventory</h1>
            <div className="sn-form-sub">Live polling · last sync 4s ago · all sites &amp; device classes</div>
          </div>
          <div className="sn-form-actions">
            <button className="sn-btn"><i className="fa-solid fa-file-csv" /> Export</button>
            <button className="sn-btn"><i className="fa-solid fa-magnifying-glass-arrow-right" /> Discovery</button>
            <button className="sn-btn primary"><i className="fa-solid fa-plus" /> Onboard</button>
          </div>
        </div>
      </div>

      <div className="sn-kpi-strip">
        <Kpi l="Total" v={devices.length} s="all assets" tone="neutral" />
        <Kpi l="Healthy" v={devices.filter(d => d.status === "ok").length} s="reporting OK" tone="ok" />
        <Kpi l="Warning" v={devices.filter(d => d.status === "warn").length} s="thresholds breached" tone="warn" />
        <Kpi l="Critical" v={devices.filter(d => d.status === "critical" || d.status === "down").length} s="urgent" tone="crit" />
        <Kpi l="Device kinds" v={DEVICE_KINDS.length} s="categories" tone="neutral" />
        <Kpi l="Sites" v={SITES.length} s="datacenters" tone="neutral" />
      </div>

      <div className="sn-form-layout">
        <div className="sn-form-main">
          <FormSection id="filters" title="Filters" collapsed={collapsed.filters} onToggle={toggle}>
            <div style={{ padding: 14, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <input className="select" placeholder="Search hostname, IP, model, role…" value={q} onChange={e => setQ(e.target.value)} style={{ flex: 1, minWidth: 220 }} />
              <select className="select" value={kind} onChange={e => setKind(e.target.value)}>
                <option value="all">All kinds</option>
                {DEVICE_KINDS.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
              </select>
              <select className="select" value={site} onChange={e => setSite(e.target.value)}>
                <option value="all">All sites</option>
                {SITES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div style={{ padding: "0 14px 14px", display: "flex", gap: 4, flexWrap: "wrap" }}>
              <button className={`sn-btn ${kind === "all" ? "primary" : ""}`} style={{ fontSize: 11, padding: "3px 10px" }} onClick={() => setKind("all")}>All <span className="sn-side-count" style={{ marginLeft: 4 }}>{devices.length}</span></button>
              {(DEVICE_KINDS as KindMeta[]).map(k => {
                const n = devices.filter(d => d.kind === k.id).length;
                if (n === 0) return null;
                return <button key={k.id} className={`sn-btn ${kind === k.id ? "primary" : ""}`} style={{ fontSize: 11, padding: "3px 10px" }} onClick={() => setKind(k.id)}><i className={`${k.iconBrand?"fa-brands":"fa-solid"} ${k.icon}`} style={{ color: kind === k.id ? "white" : k.color, marginRight: 4 }} />{k.label} <span style={{ marginLeft: 4, opacity: 0.7 }}>{n}</span></button>;
              })}
            </div>
          </FormSection>

          <div className="sn-activity-section">
            <div className="sn-activity-tabs">
              <button className="sn-act-tab active">Inventory ({filtered.length})</button>
              <button className="sn-act-tab">Map View</button>
              <button className="sn-act-tab">By Site</button>
            </div>
            <table className="sn-list-table">
              <thead>
                <tr>
                  <th style={{width:30}}><input type="checkbox" /></th>
                  <th style={{width:200}}>Device</th>
                  <th style={{width:120}}>Kind</th>
                  <th style={{width:90}}>Site</th>
                  <th style={{width:110}}>IP</th>
                  <th>OS / firmware</th>
                  <th style={{width:100}}>CPU</th>
                  <th style={{width:100}}>Memory</th>
                  <th style={{width:100}}>Status</th>
                  <th style={{width:100}}>Last seen</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => {
                  const k = kindMeta(d.kind);
                  return (
                    <tr key={d.id} onClick={() => setRoute("infra-device")} style={{ cursor: "pointer" }}>
                      <td onClick={e => e.stopPropagation()}><input type="checkbox" /></td>
                      <td>
                        <div className="row row-8">
                          <span className="kind-mini" style={{ color: k.color, background: k.color + "18" }}><i className={`${k.iconBrand ? "fa-brands" : "fa-solid"} ${k.icon}`} /></span>
                          <div>
                            <a className="sn-link mono"><b>{d.id}</b></a>
                            <div className="text-mute" style={{ fontSize: 11, marginTop: 2 }}>{d.role}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className="sn-state-pill state-neutral"><i className="fa-solid fa-circle" /> {k.label}</span></td>
                      <td className="mono text-mute">{d.site}</td>
                      <td className="mono">{d.ip}</td>
                      <td><span style={{ fontSize: 11.5 }}>{d.os}</span><div className="text-mute mono" style={{ fontSize: 10.5, marginTop: 2 }}>up {d.uptime}</div></td>
                      <td>{d.cpu > 0 ? (
                        <div className="sn-sla">
                          <div className="sn-sla-bar" style={{ width: 50 }}><div className="sn-sla-fill" style={{ width: d.cpu + "%", background: d.cpu > 80 ? "var(--critical)" : d.cpu > 65 ? "var(--warning)" : "var(--success)" }} /></div>
                          <span className="mono" style={{ fontSize: 11 }}>{d.cpu}%</span>
                        </div>
                      ) : <span className="text-mute mono">—</span>}</td>
                      <td>{d.mem > 0 ? (
                        <div className="sn-sla">
                          <div className="sn-sla-bar" style={{ width: 50 }}><div className="sn-sla-fill" style={{ width: d.mem + "%", background: d.mem > 80 ? "var(--critical)" : d.mem > 65 ? "var(--warning)" : "var(--success)" }} /></div>
                          <span className="mono" style={{ fontSize: 11 }}>{d.mem}%</span>
                        </div>
                      ) : <span className="text-mute mono">—</span>}</td>
                      <td><span className={`sn-state-pill ${d.status === "ok" ? "svc-healthy" : d.status === "warn" ? "state-mitigating" : "state-active"}`}><i className="fa-solid fa-circle" /> {d.status === "ok" ? "healthy" : d.status === "warn" ? "warning" : d.status === "down" ? "down" : "critical"}</span></td>
                      <td className="text-mute mono" style={{ fontSize: 11 }}>{d.lastSeen}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="sn-form-side">
          <div className="sn-side-card">
            <div className="sn-side-head">Site Summary</div>
            <div className="sn-side-body">
              {SITES.map(s => (
                <Field key={s.id} label={s.name} value={
                  <div className="row row-8">
                    <span className="mono">{s.devices}</span>
                    <span className={`sn-state-pill ${s.health > 95 ? "svc-healthy" : s.health > 90 ? "state-mitigating" : "state-active"}`}><i className="fa-solid fa-circle" /> {s.health}%</span>
                  </div>
                } />
              ))}
            </div>
          </div>
          <div className="sn-side-card">
            <div className="sn-side-head">Quick Actions</div>
            <div className="sn-side-body sn-actions-grid">
              {[["fa-magnifying-glass-arrow-right","Run Discovery"],["fa-file-import","Import CSV"],["fa-circle-nodes","Topology"],["fa-tower-broadcast","Exporters"],["fa-plus","Onboard"],["fa-file-csv","Export"]].map(([ic, l]) => (
                <button key={l} className="sn-action" onClick={() => { if (l === "Topology") setRoute("infra-topology"); if (l === "Exporters") setRoute("infra-exporters"); }}>
                  <i className={`fa-solid ${ic}`} /><span>{l}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
