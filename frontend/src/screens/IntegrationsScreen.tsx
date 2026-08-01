// Integrations marketplace — ported from the IntegrationsScreen defined in app.jsx.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { INTEGRATIONS } from "@/data/core";
import { Kpi, FormSection, Field } from "@/components/primitives";
import { ConnectModal } from "@/screens/ConnectModal";
import type { Integration } from "@/lib/types";

export default function IntegrationsScreen() {
  const { setRoute } = useNav();
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const toggle = (id: string) => setCollapsed(c => ({ ...c, [id]: !c[id] }));
  const [cat, setCat] = React.useState("all");
  const [connectFor, setConnectFor] = React.useState<Integration | null>(null); // integration object being connected
  const [connectedNames, setConnectedNames] = React.useState(() => new Set(INTEGRATIONS.filter(i => i.connected).map(i => i.name)));
  const isConnected = (g: Integration) => connectedNames.has(g.name);

  const categories = ["Observability", "On-call", "Automation", "ITSM", "Comms", "SCM", "Cloud", "Identity", "Business"];
  const filtered = cat === "all" ? INTEGRATIONS : INTEGRATIONS.filter(i => i.category === cat);
  const catColor = (c: string) => ({ Observability: "#2563eb", "On-call": "#dc2626", Automation: "#8b5cf6", ITSM: "#0891b2", Comms: "#10b981", SCM: "#475569", Cloud: "#f59e0b", Identity: "#7c3aed", Business: "#ec4899" } as Record<string, string>)[c] || "#6b7785";
  const catIcon = (c: string) => ({ Observability: "fa-chart-line", "On-call": "fa-bell", Automation: "fa-bolt", ITSM: "fa-building", Comms: "fa-comments", SCM: "fa-code-branch", Cloud: "fa-cloud", Identity: "fa-key", Business: "fa-briefcase" } as Record<string, string>)[c];

  return (
    <div className="page page-fade sn-dash">
      <div className="sn-breadcrumb">
        <a className="sn-link">Home</a><span className="sn-bc-sep">›</span>
        <a className="sn-link">Build</a><span className="sn-bc-sep">›</span>
        <span>Integrations</span>
      </div>
      <div className="sn-form-header">
        <div className="sn-form-title-row">
          <span className="sn-rec-number">INTEGRATIONS</span>
          <span className="sn-pill svc-healthy"><i className="fa-solid fa-circle" /> {INTEGRATIONS.filter(i => i.connected).length} connected</span>
          <span className="sn-pill state-neutral"><i className="fa-solid fa-plug" /> {INTEGRATIONS.length - INTEGRATIONS.filter(i => i.connected).length} available</span>
          <span className="sn-pill state-progress"><i className="fa-solid fa-spinner fa-spin" /> {categories.length} categories</span>
        </div>
        <div className="sn-form-title-meta">
          <div>
            <h1>Integration Marketplace</h1>
            <div className="sn-form-sub">{INTEGRATIONS.length} integrations · OAuth + API key + webhook support · bidirectional sync where applicable</div>
          </div>
          <div className="sn-form-actions">
            <button className="sn-btn"><i className="fa-solid fa-book" /> API Docs</button>
            <button className="sn-btn"><i className="fa-solid fa-key" /> API Tokens</button>
            <button className="sn-btn primary"><i className="fa-solid fa-plus" /> Custom Webhook</button>
          </div>
        </div>
      </div>
      <div className="sn-kpi-strip">
        <Kpi l="Total" v={INTEGRATIONS.length} s="catalog" tone="neutral" />
        <Kpi l="Connected" v={INTEGRATIONS.filter(i => i.connected).length} s="active" tone="ok" />
        <Kpi l="Available" v={INTEGRATIONS.length - INTEGRATIONS.filter(i => i.connected).length} s="not connected" tone="neutral" />
        <Kpi l="Health" v="100%" s="all healthy" tone="ok" />
        <Kpi l="API calls (24h)" v="2.4M" s="across integrations" tone="neutral" />
        <Kpi l="Webhooks" v="42" s="active endpoints" tone="neutral" />
      </div>
      <div className="sn-form-layout">
        <div className="sn-form-main">
          <FormSection id="cats" title="Browse by Category" collapsed={collapsed.cats} onToggle={toggle}>
            <div className="sn-kind-grid">
              <div className={`sn-kind-card`} onClick={() => setCat("all")} style={{ borderLeft: cat === "all" ? `3px solid #016` : "" }}>
                <div className="sn-kind-icon" style={{ color: "#016", background: "#01620" }}><i className="fa-solid fa-grip" /></div>
                <div className="sn-kind-body">
                  <div className="sn-kind-count">{INTEGRATIONS.length}</div>
                  <div className="sn-kind-label">All</div>
                </div>
              </div>
              {categories.map(c => {
                const n = INTEGRATIONS.filter(i => i.category === c).length;
                return (
                  <div key={c} className={`sn-kind-card`} onClick={() => setCat(c)} style={{ borderLeft: cat === c ? `3px solid ${catColor(c)}` : "" }}>
                    <div className="sn-kind-icon" style={{ color: catColor(c), background: catColor(c) + "14" }}><i className={`fa-solid ${catIcon(c)}`} /></div>
                    <div className="sn-kind-body">
                      <div className="sn-kind-count">{n}</div>
                      <div className="sn-kind-label">{c}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </FormSection>

          <FormSection id="list" title={cat === "all" ? "All Integrations" : cat} badge={`${filtered.length} items`} collapsed={collapsed.list} onToggle={toggle}>
            <table className="sn-list-table">
              <thead><tr><th>Integration</th><th style={{width:140}}>Category</th><th style={{width:230}}>Notes</th><th style={{width:130}}>Status</th><th style={{width:130}}>Last sync</th><th style={{width:120}}>Actions</th></tr></thead>
              <tbody>
                {filtered.map(g => (
                  <tr key={g.name}>
                    <td>
                      <div className="row row-8">
                        <span className="kind-mini" style={{ color: catColor(g.category), background: catColor(g.category) + "18" }}><i className={g.icon} /></span>
                        <a className="sn-link" onClick={() => setRoute("integration-detail", { integName: g.name })}><b>{g.name}</b></a>
                      </div>
                    </td>
                    <td><span className="sn-state-pill state-neutral"><i className="fa-solid fa-circle" /> {g.category}</span></td>
                    <td className="text-mute" style={{ fontSize: 12 }}>{g.meta}</td>
                    <td>{isConnected(g) ? <span className="sn-state-pill svc-healthy"><i className="fa-solid fa-circle" /> Connected</span> : <span className="sn-state-pill state-neutral"><i className="fa-solid fa-circle" /> Available</span>}</td>
                    <td className="text-mute" style={{ fontSize: 11.5 }}>{isConnected(g) ? "2h ago" : "—"}</td>
                    <td>
                      {isConnected(g)
                        ? <button className="sn-btn" style={{ padding: "2px 8px", fontSize: 11 }} onClick={() => setRoute("integration-detail", { integName: g.name })}>Manage</button>
                        : <button className="sn-btn primary" style={{ padding: "2px 8px", fontSize: 11 }} onClick={() => setConnectFor(g)}><i className="fa-solid fa-plug" /> Connect</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </FormSection>

          <FormSection id="webhook" title="Outbound Webhooks · Custom" collapsed={collapsed.webhook} onToggle={toggle}>
            <div style={{ padding: 14 }}>
              <div style={{ background: "#0b1220", color: "#e2e8f0", padding: 14, borderRadius: 3, fontFamily: "var(--font-mono)", fontSize: 11.5, lineHeight: 1.7 }}>
                <div style={{ color: "#94a3b8" }}># POST to your endpoint on every incident event</div>
                <div><span style={{ color: "#38bdf8" }}>POST</span> https://hooks.your-domain.io/linkedeye</div>
                <div><span style={{ color: "#a78bfa" }}>Content-Type:</span> application/json</div>
                <div><span style={{ color: "#a78bfa" }}>X-LinkedEye-Signature:</span> sha256=...</div>
                <div>{"{"}</div>
                <div>  <span style={{ color: "#fbbf24" }}>"event":</span> <span style={{ color: "#4ade80" }}>"incident.declared"</span>,</div>
                <div>  <span style={{ color: "#fbbf24" }}>"incident":</span> {"{ \"id\": \"INC-48291\", \"severity\": 1, ... }"}</div>
                <div>{"}"}</div>
              </div>
            </div>
          </FormSection>
        </div>

        <aside className="sn-form-side">
          <div className="sn-side-card">
            <div className="sn-side-head">Health Summary</div>
            <div className="sn-side-body">
              {categories.map(c => {
                const items = INTEGRATIONS.filter(i => i.category === c);
                const connected = items.filter(i => i.connected).length;
                return <Field key={c} label={c} value={<span><b>{connected}</b> / {items.length} connected</span>} />;
              })}
            </div>
          </div>
          <div className="sn-side-card">
            <div className="sn-side-head">API Activity</div>
            <div className="sn-side-body">
              <Field label="Calls (24h)" value={<span className="mono"><b>2.4M</b></span>} />
              <Field label="Errors (24h)" value={<span className="tone-ok">142 · 0.006%</span>} />
              <Field label="Rate limit" value="10,000 / min" />
              <Field label="Webhooks active" value="42" />
              <Field label="Avg latency" value="84ms" />
            </div>
          </div>
        </aside>
      </div>

      {connectFor && (
        <ConnectModal
          integ={connectFor}
          catColor={catColor}
          onClose={() => setConnectFor(null)}
          onConnected={(integ) => {
            setConnectedNames(s => new Set([...s, integ.name]));
            setConnectFor(null);
            setRoute("integration-detail", { integName: integ.name });
          }}
        />
      )}
    </div>
  );
}
