// ServiceNow form-style infrastructure overview.
// Ported from screens/infra.jsx.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { useInfraAlerts, useSites, useDevices } from "@/api/hooks";
import { SITES, DEVICE_KINDS, DEVICE_COUNTS, DEVICES, INFRA_ALERTS } from "@/data/infra";
import { Kpi, FormSection, Field } from "@/components/primitives";
import type { DeviceKind } from "@/lib/types";

// The seed data carries `iconBrand` for fa-brands icons (win/linux), but the
// shared DeviceKind type does not declare it — extend locally (shared files
// must not be edited).
type KindMeta = DeviceKind & { iconBrand?: boolean };

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
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const toggle = (id: string) => setCollapsed(c => ({ ...c, [id]: !c[id] }));

  return (
    <div className="page page-fade sn-dash">
      <div className="sn-breadcrumb">
        <a className="sn-link">Home</a>
        <span className="sn-bc-sep">›</span>
        <a className="sn-link">Infrastructure</a>
        <span className="sn-bc-sep">›</span>
        <span>Overview</span>
      </div>

      <div className="sn-form-header">
        <div className="sn-form-title-row">
          <span className="sn-rec-number">INFRA</span>
          <span className="sn-pill prio-1"><i className="fa-solid fa-circle" /> {crit} Critical</span>
          <span className="sn-pill state-progress"><i className="fa-solid fa-spinner fa-spin" /> {warn} Warning</span>
          <span className="sn-pill state-neutral"><i className="fa-solid fa-server" /> {sites.length} sites</span>
        </div>
        <div className="sn-form-title-meta">
          <div>
            <h1>On-Prem Infrastructure</h1>
            <div className="sn-form-sub">{total.toLocaleString()} devices monitored · live SNMP, NetFlow, WMI, vSphere &amp; node-exporter</div>
          </div>
          <div className="sn-form-actions">
            <button className="sn-btn" onClick={() => setRoute("infra-topology")}><i className="fa-solid fa-diagram-project" /> Topology</button>
            <button className="sn-btn"><i className="fa-solid fa-file-export" /> Export CMDB</button>
            <button className="sn-btn primary"><i className="fa-solid fa-plus" /> Add Device</button>
          </div>
        </div>
      </div>

      <div className="sn-kpi-strip">
        <Kpi l="Total Devices" v={total.toLocaleString()} s="all sites" tone="neutral" />
        <Kpi l="Healthy" v={ok.toLocaleString()} s={`${devices.length ? Math.round(ok/devices.length*100) : 0}% of monitored`} tone="ok" />
        <Kpi l="Warning" v={warn} s="3 new in 1h" tone="warn" />
        <Kpi l="Critical / Down" v={crit} s="needs attention" tone="crit" />
        <Kpi l="Sites" v={sites.length} s="across 3 regions" tone="neutral" />
        <Kpi l="Polling Lag" v="1.4s" s="-0.2s vs avg" tone="ok" />
      </div>

      <div className="sn-form-layout">
        <div className="sn-form-main">
          <FormSection id="sites" title="Sites" badge={`${sites.length} locations`} collapsed={collapsed.sites} onToggle={toggle}>
            <table className="sn-list-table">
              <thead>
                <tr>
                  <th>Site</th><th style={{ width: 90 }}>Region</th><th style={{ width: 110 }}>Devices</th>
                  <th style={{ width: 140 }}>Health</th><th style={{ width: 110 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {sites.map(s => (
                  <tr key={s.id}>
                    <td><b>{s.name}</b><div className="text-mute mono" style={{ fontSize: 11, marginTop: 2 }}>{s.id}</div></td>
                    <td><span className="sn-state-pill state-neutral"><i className="fa-solid fa-circle" /> {s.region}</span></td>
                    <td className="mono">{s.devices.toLocaleString()}</td>
                    <td>
                      <div className="sn-sla">
                        <div className="sn-sla-bar" style={{ width: 90 }}>
                          <div className="sn-sla-fill" style={{ width: s.health + "%", background: s.health > 95 ? "var(--success)" : s.health > 90 ? "var(--warning)" : "var(--critical)" }} />
                        </div>
                        <span className="mono" style={{ fontSize: 11.5 }}>{s.health}%</span>
                      </div>
                    </td>
                    <td>
                      <span className={`sn-state-pill ${s.health > 95 ? "svc-healthy" : s.health > 90 ? "svc-degraded" : "svc-down"}`}>
                        <i className="fa-solid fa-circle" /> {s.health > 95 ? "healthy" : s.health > 90 ? "degraded" : "critical"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </FormSection>

          <FormSection id="kinds" title="Device Categories" badge={`${DEVICE_KINDS.length} types`} collapsed={collapsed.kinds} onToggle={toggle}>
            <div className="sn-kind-grid">
              {(DEVICE_KINDS as KindMeta[]).map(k => (
                <div key={k.id} className="sn-kind-card" onClick={() => setRoute("infra-assets")}>
                  <div className="sn-kind-icon" style={{ color: k.color, background: k.color + "14" }}>
                    <i className={`${k.iconBrand ? "fa-brands" : "fa-solid"} ${k.icon}`} />
                  </div>
                  <div className="sn-kind-body">
                    <div className="sn-kind-count">{devices.filter(d => d.kind === k.id).length}</div>
                    <div className="sn-kind-label">{k.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </FormSection>

          <FormSection id="alerts" title="Active Infrastructure Alerts" badge={`${alerts.length} active`} collapsed={collapsed.alerts} onToggle={toggle}>
            <table className="sn-list-table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>Sev</th>
                  <th style={{ width: 140 }}>Device</th>
                  <th>Alert</th>
                  <th style={{ width: 220 }}>Detail</th>
                  <th style={{ width: 100 }}>Since</th>
                  <th style={{ width: 160 }}>Rule</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map(a => (
                  <tr key={a.id} onClick={() => setRoute("infra-device")} style={{ cursor: "pointer" }}>
                    <td><span className={`sn-state-pill ${a.sev === "critical" ? "state-active" : a.sev === "warn" ? "state-mitigating" : "state-investigating"}`}><i className="fa-solid fa-circle" /> {a.sev}</span></td>
                    <td><a className="sn-link mono">{a.device}</a></td>
                    <td><b>{a.title}</b></td>
                    <td className="text-mute" style={{ fontSize: 12 }}>{a.detail}</td>
                    <td className="mono text-mute">{a.since}</td>
                    <td className="mono text-mute" style={{ fontSize: 11 }}>{a.rule}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </FormSection>
        </div>

        <aside className="sn-form-side">
          <div className="sn-side-card">
            <div className="sn-side-head">Coverage</div>
            <div className="sn-side-body">
              <Field label="Linux hosts" value={<span><b>412</b> / 414 covered</span>} />
              <Field label="Windows hosts" value={<span className="tone-ok"><b>98</b> / 98 covered</span>} />
              <Field label="Network (SNMP)" value={<span className="tone-warn"><b>218</b> / 260</span>} />
              <Field label="vSphere clusters" value={<span className="tone-ok"><b>3</b> / 3</span>} />
              <Field label="Storage arrays" value={<span className="tone-ok"><b>16</b> / 16</span>} />
              <Field label="UPS / Power" value={<span className="tone-warn"><b>22</b> / 24</span>} />
            </div>
          </div>

          <div className="sn-side-card">
            <div className="sn-side-head">Quick Actions</div>
            <div className="sn-side-body sn-actions-grid">
              {[
                ["fa-magnifying-glass-arrow-right", "Discovery Scan"],
                ["fa-rotate", "Re-poll All"],
                ["fa-file-import", "Import CSV"],
                ["fa-tower-broadcast", "Manage Exporters"],
                ["fa-circle-nodes", "View Topology"],
                ["fa-cube", "Inventory"],
              ].map(([ic, lbl]) => (
                <button key={lbl} className="sn-action" onClick={() => {
                  if (lbl === "View Topology") setRoute("infra-topology");
                  if (lbl === "Manage Exporters") setRoute("infra-exporters");
                  if (lbl === "Inventory") setRoute("infra-assets");
                }}>
                  <i className={`fa-solid ${ic}`} />
                  <span>{lbl}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="sn-side-card">
            <div className="sn-side-head">Related Records <span className="sn-side-count">3</span></div>
            <div className="sn-side-body">
              <div className="sn-related-row">
                <div><div className="sn-related-title">Switch fan-tray failure</div><div className="sn-related-meta">Incident · 8m ago</div></div>
                <a className="sn-link mono">INC-48298</a>
              </div>
              <div className="sn-related-row">
                <div><div className="sn-related-title">UPS battery runtime</div><div className="sn-related-meta">Problem · investigating</div></div>
                <a className="sn-link mono">PRB-3920</a>
              </div>
              <div className="sn-related-row">
                <div><div className="sn-related-title">K8s control plane upgrade</div><div className="sn-related-meta">Change · CAB pending</div></div>
                <a className="sn-link mono">CHG-2218</a>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
