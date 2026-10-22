// Virtual Machines dashboard, ServiceNow form-style.
// Ported from screens/infra-vms.jsx.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { useVms } from "@/api/hooks";
import { VMS } from "@/data/infra";
import { Kpi, FormSection, Field } from "@/components/primitives";

export default function InfraVMsScreen() {
  const { setRoute } = useNav();
  const { data } = useVms();
  const vms = data ?? [];
  const [tab, setTab] = React.useState("all");
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const toggle = (id: string) => setCollapsed(c => ({ ...c, [id]: !c[id] }));

  const filtered = tab === "all" ? vms : tab === "running" ? vms.filter(v => v.state === "running") : tab === "stopped" ? vms.filter(v => v.state === "stopped") : vms.filter(v => v.cpuUse > 60 || v.memUse > 75);

  const totalVCPU = vms.reduce((s, v) => s + parseInt(v.cpu), 0);
  const totalMem = vms.reduce((s, v) => s + parseInt(v.mem), 0);
  const running = vms.filter(v => v.state === "running").length;
  const avgCpu = Math.round(vms.filter(v => v.state === "running").reduce((s, v) => s + v.cpuUse, 0) / running);
  const avgMem = Math.round(vms.filter(v => v.state === "running").reduce((s, v) => s + v.memUse, 0) / running);

  return (
    <div className="page page-fade sn-dash">
      <div className="sn-breadcrumb">
        <a className="sn-link">Home</a><span className="sn-bc-sep">›</span>
        <a className="sn-link" onClick={() => setRoute("infra")}>Infrastructure</a><span className="sn-bc-sep">›</span>
        <span>Virtual Machines</span>
      </div>

      <div className="sn-form-header">
        <div className="sn-form-title-row">
          <span className="sn-rec-number">VMS</span>
          <span className="sn-pill state-progress"><i className="fa-solid fa-spinner fa-spin" /> {running} Running</span>
          <span className="sn-pill state-neutral"><i className="fa-solid fa-cube" /> 612 total fleet</span>
          <span className="sn-pill prio-1"><i className="fa-solid fa-circle" /> 3 vSphere clusters</span>
        </div>
        <div className="sn-form-title-meta">
          <div>
            <h1>Virtual Machines</h1>
            <div className="sn-form-sub">vCenter sync 2 minutes ago · {totalVCPU} vCPU · {totalMem} GB RAM allocated</div>
          </div>
          <div className="sn-form-actions">
            <button className="sn-btn"><i className="fa-solid fa-rotate" /> Sync vCenter</button>
            <button className="sn-btn"><i className="fa-solid fa-tower-broadcast" /> Migrate</button>
            <button className="sn-btn primary"><i className="fa-solid fa-plus" /> Provision VM</button>
          </div>
        </div>
      </div>

      <div className="sn-kpi-strip">
        <Kpi l="Running" v={running} s="+4 in 24h" tone="ok" />
        <Kpi l="Total Fleet" v="612" s="across 3 clusters" tone="neutral" />
        <Kpi l="Avg CPU" v={avgCpu + "%"} s="+3% vs avg" tone={avgCpu > 60 ? "warn" : "ok"} />
        <Kpi l="Avg Memory" v={avgMem + "%"} s="capacity OK" tone={avgMem > 75 ? "warn" : "ok"} />
        <Kpi l="Snapshots" v="38" s="-12 reclaimed" tone="ok" />
        <Kpi l="Stopped" v={vms.filter(v => v.state === "stopped").length} s="dev/QA" tone="neutral" />
      </div>

      <div className="sn-form-layout">
        <div className="sn-form-main">
          <FormSection id="clusters" title="vSphere Clusters" badge="3 active" collapsed={collapsed.clusters} onToggle={toggle}>
            <table className="sn-list-table">
              <thead><tr><th>Cluster</th><th style={{width:100}}>Site</th><th style={{width:90}}>Hosts</th><th style={{width:90}}>VMs</th><th style={{width:120}}>CPU usage</th><th style={{width:120}}>RAM usage</th><th style={{width:110}}>Status</th></tr></thead>
              <tbody>
                {([
                  ["blr-prod","dc-blr-1",2,vms.filter(v=>v.cluster==="blr-prod").length,68,74,"warn"],
                  ["blr-stg","dc-blr-1",1,vms.filter(v=>v.cluster==="blr-stg").length,22,38,"ok"],
                  ["fra-prod","dc-fra-1",1,vms.filter(v=>v.cluster==="fra-prod").length,34,52,"ok"],
                ] as [string, string, number, number, number, number, string][]).map((r,i) => (
                  <tr key={i}>
                    <td><b className="mono">{r[0]}</b></td>
                    <td className="mono text-mute">{r[1]}</td>
                    <td className="mono">{r[2]}</td>
                    <td className="mono">{r[3]}</td>
                    <td>
                      <div className="sn-sla">
                        <div className="sn-sla-bar" style={{width:80}}><div className="sn-sla-fill" style={{width:r[4]+"%",background:r[4]>70?"var(--warning)":"var(--success)"}} /></div>
                        <span className="mono" style={{fontSize:11.5}}>{r[4]}%</span>
                      </div>
                    </td>
                    <td>
                      <div className="sn-sla">
                        <div className="sn-sla-bar" style={{width:80}}><div className="sn-sla-fill" style={{width:r[5]+"%",background:r[5]>70?"var(--warning)":"var(--success)"}} /></div>
                        <span className="mono" style={{fontSize:11.5}}>{r[5]}%</span>
                      </div>
                    </td>
                    <td><span className={`sn-state-pill ${r[6]==="warn"?"state-mitigating":"svc-healthy"}`}><i className="fa-solid fa-circle" /> {r[6]==="warn"?"degraded":"healthy"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </FormSection>

          <div className="sn-activity-section">
            <div className="sn-activity-tabs">
              {[["all","All VMs"],["running","Running"],["stopped","Stopped"],["hot","Hot · CPU/Mem"]].map(([id,l]) => (
                <button key={id} className={`sn-act-tab${tab===id?" active":""}`} onClick={() => setTab(id)}>{l}</button>
              ))}
            </div>
            <table className="sn-list-table">
              <thead>
                <tr>
                  <th style={{width:30}}><input type="checkbox" /></th>
                  <th style={{width:160}}>VM</th>
                  <th style={{width:130}}>Host</th>
                  <th style={{width:110}}>Cluster</th>
                  <th>OS</th>
                  <th style={{width:120}}>vCPU / RAM</th>
                  <th style={{width:120}}>IP</th>
                  <th style={{width:120}}>CPU</th>
                  <th style={{width:120}}>Memory</th>
                  <th style={{width:100}}>State</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(v => (
                  <tr key={v.id} onClick={() => setRoute("vm-detail", { vmId: v.id })} style={{ cursor: "pointer" }}>
                    <td onClick={e => e.stopPropagation()}><input type="checkbox" /></td>
                    <td><button type="button" className="ld-link ld-mono" onClick={(e) => { e.stopPropagation(); setRoute("vm-detail", { vmId: v.id }); }}><b>{v.id}</b></button></td>
                    <td className="mono text-mute">{v.host}</td>
                    <td><span className="sn-state-pill state-neutral"><i className="fa-solid fa-circle" /> {v.cluster}</span></td>
                    <td><span style={{fontSize:11.5}}>{v.os}</span></td>
                    <td className="mono" style={{fontSize:11.5}}>{v.cpu} / {v.mem}</td>
                    <td className="mono" style={{fontSize:11.5}}>{v.ip}</td>
                    <td>
                      {v.state === "running" ? (
                        <div className="sn-sla">
                          <div className="sn-sla-bar" style={{width:60}}><div className="sn-sla-fill" style={{width:v.cpuUse+"%",background:v.cpuUse>75?"var(--critical)":v.cpuUse>60?"var(--warning)":"var(--success)"}} /></div>
                          <span className="mono" style={{fontSize:11}}>{v.cpuUse}%</span>
                        </div>
                      ) : <span className="text-mute mono">—</span>}
                    </td>
                    <td>
                      {v.state === "running" ? (
                        <div className="sn-sla">
                          <div className="sn-sla-bar" style={{width:60}}><div className="sn-sla-fill" style={{width:v.memUse+"%",background:v.memUse>80?"var(--critical)":v.memUse>65?"var(--warning)":"var(--success)"}} /></div>
                          <span className="mono" style={{fontSize:11}}>{v.memUse}%</span>
                        </div>
                      ) : <span className="text-mute mono">—</span>}
                    </td>
                    <td><span className={`sn-state-pill ${v.state==="running"?"svc-healthy":"state-neutral"}`}><i className="fa-solid fa-circle" /> {v.state}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="sn-form-side">
          <div className="sn-side-card">
            <div className="sn-side-head">Capacity Summary</div>
            <div className="sn-side-body">
              <Field label="Allocated vCPU" value={<span><b>{totalVCPU}</b> cores</span>} />
              <Field label="Allocated RAM" value={<span><b>{totalMem}</b> GB</span>} />
              <Field label="Avg CPU" value={<span className={avgCpu > 60 ? "tone-warn" : "tone-ok"}><b>{avgCpu}%</b></span>} />
              <Field label="Avg Memory" value={<span className={avgMem > 75 ? "tone-warn" : "tone-ok"}><b>{avgMem}%</b></span>} />
              <Field label="Headroom" value={<span className="tone-ok"><b>32%</b> free</span>} />
              <Field label="Last vMotion" value="14 min ago · vm-prod-api-02" />
            </div>
          </div>

          <div className="sn-side-card">
            <div className="sn-side-head">Quick Actions</div>
            <div className="sn-side-body sn-actions-grid">
              {[
                ["fa-plus","Provision VM"],
                ["fa-tower-broadcast","Bulk Migrate"],
                ["fa-camera","Snapshot"],
                ["fa-pause","Suspend Dev"],
                ["fa-rotate","Sync vCenter"],
                ["fa-circle-nodes","View Topology"],
              ].map(([ic,lbl]) => (
                <button key={lbl} className="sn-action"><i className={`fa-solid ${ic}`} /><span>{lbl}</span></button>
              ))}
            </div>
          </div>

          <div className="sn-side-card">
            <div className="sn-side-head">Top by CPU <span className="sn-side-count">3</span></div>
            <div className="sn-side-body">
              {vms.filter(v => v.state === "running").sort((a,b) => b.cpuUse - a.cpuUse).slice(0,3).map(v => (
                <div key={v.id} className="sn-related-row">
                  <div><div className="sn-related-title mono">{v.id}</div><div className="sn-related-meta">{v.host} · {v.cluster}</div></div>
                  <span className={`sn-state-pill ${v.cpuUse > 70 ? "state-mitigating" : "svc-healthy"}`}><i className="fa-solid fa-circle" /> {v.cpuUse}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="sn-side-card">
            <div className="sn-side-head">Recent Events</div>
            <div className="sn-side-body">
              {[
                ["VM provisioned","vm-prod-api-03","8m ago"],
                ["Snapshot taken","vm-prod-web-01","32m ago"],
                ["vMotion completed","vm-prod-api-02","14m ago"],
                ["Stopped (idle policy)","vm-test-04","2h ago"],
              ].map(([action, vm, time], i) => (
                <div key={i} className="sn-related-row">
                  <div><div className="sn-related-title">{action}</div><div className="sn-related-meta mono">{vm}</div></div>
                  <span className="text-mute mono" style={{ fontSize: 11 }}>{time}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
