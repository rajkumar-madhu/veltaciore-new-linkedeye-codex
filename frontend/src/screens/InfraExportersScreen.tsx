// ServiceNow form-style exporter fleet.
// Ported from screens/infra-exporters.jsx.
import React from "react";
import { useExporters } from "@/api/hooks";
import { EXPORTERS } from "@/data/infra";
import { Kpi, FormSection, Field } from "@/components/primitives";

export default function InfraExportersScreen() {
  const { data } = useExporters();
  // Exporters are a static catalog (reference data): fall back to the local
  // seed when the backend is unreachable so the inventory always renders.
  const exporters = data ?? EXPORTERS;
  const totalHosts = exporters.reduce((a,b) => a + b.hosts, 0);
  const healthy = exporters.filter(e => e.status === "ok").length;
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const toggle = (id: string) => setCollapsed(c => ({ ...c, [id]: !c[id] }));

  return (
    <div className="page page-fade sn-dash">
      <div className="sn-breadcrumb">
        <a className="sn-link">Home</a><span className="sn-bc-sep">›</span>
        <a className="sn-link">Infrastructure</a><span className="sn-bc-sep">›</span>
        <span>Exporters &amp; Collectors</span>
      </div>

      <div className="sn-form-header">
        <div className="sn-form-title-row">
          <span className="sn-rec-number">AGENTS</span>
          <span className="sn-pill state-progress"><i className="fa-solid fa-spinner fa-spin" /> {healthy}/{exporters.length} Healthy</span>
          <span className="sn-pill state-neutral"><i className="fa-solid fa-tower-broadcast" /> {totalHosts.toLocaleString()} installs</span>
        </div>
        <div className="sn-form-title-meta">
          <div>
            <h1>Exporters &amp; Collectors</h1>
            <div className="sn-form-sub">{exporters.length} exporter types · Prometheus-compatible · 18.6k scrapes/sec</div>
          </div>
          <div className="sn-form-actions">
            <button className="sn-btn"><i className="fa-solid fa-book" /> Install Docs</button>
            <button className="sn-btn"><i className="fa-solid fa-rotate" /> Re-deploy</button>
            <button className="sn-btn primary"><i className="fa-solid fa-plus" /> Add Exporter</button>
          </div>
        </div>
      </div>

      <div className="sn-kpi-strip">
        <Kpi l="Exporter types" v={exporters.length} s="installed" tone="neutral" />
        <Kpi l="Healthy" v={`${healthy}/${exporters.length}`} s="reporting" tone="ok" />
        <Kpi l="Agent installs" v={totalHosts.toLocaleString()} s="+18 this week" tone="ok" />
        <Kpi l="Scrape volume" v="18.6k/s" s="stable" tone="neutral" />
        <Kpi l="Avg lag" v="0.9s" s="+0.2s vs avg" tone="warn" />
        <Kpi l="Degraded" v={exporters.length - healthy} s="needs check" tone={exporters.length - healthy > 0 ? "warn" : "ok"} />
      </div>

      <div className="sn-form-layout">
        <div className="sn-form-main">
          <FormSection id="inv" title="Exporter Inventory" badge={`${exporters.length} types`} collapsed={collapsed.inv} onToggle={toggle}>
            <table className="sn-list-table">
              <thead>
                <tr>
                  <th>Exporter</th><th style={{width:90}}>Version</th>
                  <th style={{width:70}}>Port</th><th style={{width:150}}>Protocol</th><th style={{width:70}}>Hosts</th>
                  <th>Sites</th><th style={{width:100}}>Scrape rate</th><th style={{width:70}}>Lag</th>
                  <th style={{width:120}}>Status</th>
                </tr>
              </thead>
              <tbody>
                {exporters.map(e => (
                  <tr key={e.name} style={{ cursor: "pointer" }}>
                    <td>
                      <div className="row row-8">
                        <span className="kind-mini" style={{ color: "#14b8a6", background: "#14b8a618" }}><i className="fa-solid fa-tower-broadcast" /></span>
                        <div>
                          <a className="sn-link mono"><b>{e.name}</b></a>
                          <div className="text-mute mono" style={{ fontSize: 11, marginTop: 2 }}>prom · {e.port ? `:${e.port}` : ""}/metrics</div>
                          {e.note && (
                            <div style={{ fontSize: 10.5, color: "#b45309", marginTop: 3, maxWidth: 340 }}>
                              <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 4 }} />{e.note}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="mono">v{e.version}</td>
                    <td className="mono"><b>{e.port ?? "—"}</b></td>
                    <td className="mono" style={{ fontSize: 11.5, color: "#475467" }}>{e.protocol ?? "—"}</td>
                    <td className="mono"><b>{e.hosts}</b></td>
                    <td>
                      <div className="row row-4" style={{ flexWrap: "wrap" }}>
                        {e.sites.map(s => <span key={s} className="sn-state-pill state-neutral" style={{ fontSize: 10.5 }}><i className="fa-solid fa-circle" /> {s}</span>)}
                      </div>
                    </td>
                    <td className="mono">{e.scrapes}</td>
                    <td className={`mono ${parseFloat(e.lag) > 5 ? "tone-warn" : ""}`}>{e.lag}</td>
                    <td><span className={`sn-state-pill ${e.status === "ok" ? "svc-healthy" : "state-mitigating"}`}><i className="fa-solid fa-circle" /> {e.status === "ok" ? "healthy" : "degraded"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </FormSection>

          <FormSection id="install" title="Install Snippet · node-exporter" badge="Linux hosts" collapsed={collapsed.install} onToggle={toggle}>
            <div style={{ padding: 14 }}>
              <div style={{ background: "#0b1220", color: "#e2e8f0", padding: 14, borderRadius: 3, fontFamily: "var(--font-mono)", fontSize: 11.5, lineHeight: 1.7 }}>
                <div><span style={{ color: "#38bdf8" }}>$</span> curl -sSL https://linkedeye.in/agent/install.sh \</div>
                <div>    | sudo TENANT=fyers ROLE=linux-host sh</div>
                <div style={{ color: "#94a3b8" }}>  ✓ verified signature · sha256:a91c…7e43</div>
                <div style={{ color: "#94a3b8" }}>  ✓ installed node-exporter v1.7.0 to /opt/linkedeye</div>
                <div style={{ color: "#94a3b8" }}>  ✓ registered with le-collector-blr-1.linkedeye.in:9090</div>
                <div><span style={{ color: "#38bdf8" }}>$</span> systemctl status linkedeye-agent</div>
                <div style={{ color: "#4ade80" }}>  ● active (running) since Wed 14:22 IST</div>
              </div>
              <div className="row row-8" style={{ marginTop: 10 }}>
                <button className="sn-btn"><i className="fa-solid fa-copy" /> Copy</button>
                <button className="sn-btn"><i className="fa-solid fa-key" /> Generate scoped token</button>
              </div>
            </div>
          </FormSection>
        </div>

        <aside className="sn-form-side">
          <div className="sn-side-card">
            <div className="sn-side-head">Coverage</div>
            <div className="sn-side-body">
              {([
                ["Linux hosts", 412, 414],
                ["Windows hosts", 98, 98],
                ["Network (SNMP)", 218, 260],
                ["vSphere clusters", 3, 3],
                ["Storage arrays", 16, 16],
                ["UPS / Power", 22, 24],
              ] as [string, number, number][]).map(([l, h, t]) => (
                <Field key={l} label={l} value={
                  <div className="row row-8">
                    <div className="bar-track" style={{ width: 70 }}>
                      <div className="bar-fill" style={{ width: (h/t*100) + "%", background: h === t ? "var(--success)" : "var(--warning)" }} />
                    </div>
                    <span className="mono" style={{ fontSize: 11 }}>{h}/{t}</span>
                  </div>
                } />
              ))}
            </div>
          </div>

          <div className="sn-side-card">
            <div className="sn-side-head">Quick Actions</div>
            <div className="sn-side-body sn-actions-grid">
              {[["fa-plus","Add Exporter"],["fa-rotate","Re-deploy All"],["fa-key","Tokens"],["fa-bell","Lag Alerts"],["fa-book","Docs"],["fa-circle-question","Help"]].map(([ic,l]) => (
                <button key={l} className="sn-action"><i className={`fa-solid ${ic}`} /><span>{l}</span></button>
              ))}
            </div>
          </div>

          <div className="sn-side-card">
            <div className="sn-side-head">Recent Activity</div>
            <div className="sn-side-body">
              {[
                ["vmware-exporter scrape lag","38s ago","warn"],
                ["18 new node-exporter installs","12m ago","ok"],
                ["snmp-exporter v0.25 deployed","2h ago","ok"],
              ].map(([t, time, sev], i) => (
                <div key={i} className="sn-related-row">
                  <div><div className="sn-related-title">{t}</div><div className="sn-related-meta">{time}</div></div>
                  <span className={`sn-state-pill ${sev === "warn" ? "state-mitigating" : "svc-healthy"}`}><i className="fa-solid fa-circle" /> {sev}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
