// Integration marketplace — LinkedEye list layout: catalog summary cards,
// category chips, a filterable integration table (Manage / Connect actions),
// the custom webhook payload and a per-category connection rail.
import React from "react";
import "@/styles/admin.css";
import { useNav } from "@/hooks/useNav";
import { INTEGRATIONS } from "@/data/core";
import { Empty, Panel, Pill, StatCard, fmt } from "@/components/ld";
import { ConnectModal } from "@/screens/ConnectModal";
import type { Integration } from "@/lib/types";

import { Icon } from "@/components/Icon";
import { BookIcon, ChevronRightIcon, GripIcon, KeyRoundIcon, PlugIcon, PlusIcon } from "lucide-react";
export default function IntegrationsScreen() {
  const { setRoute } = useNav();
  const [cat, setCat] = React.useState("all");
  const [connectFor, setConnectFor] = React.useState<Integration | null>(null); // integration object being connected
  const [connectedNames, setConnectedNames] = React.useState(() => new Set(INTEGRATIONS.filter(i => i.connected).map(i => i.name)));
  const isConnected = (g: Integration) => connectedNames.has(g.name);

  const categories = ["Observability", "On-call", "Automation", "ITSM", "Comms", "SCM", "Cloud", "Identity", "Business"];
  const filtered = cat === "all" ? INTEGRATIONS : INTEGRATIONS.filter(i => i.category === cat);
  const catColor = (c: string) => ({ Observability: "#2563eb", "On-call": "#dc2626", Automation: "#8b5cf6", ITSM: "#0891b2", Comms: "#10b981", SCM: "#475569", Cloud: "#f59e0b", Identity: "#7c3aed", Business: "#ec4899" } as Record<string, string>)[c] || "#6b7785";
  const catIcon = (c: string) => ({ Observability: "fa-chart-line", "On-call": "fa-bell", Automation: "fa-bolt", ITSM: "fa-building", Comms: "fa-comments", SCM: "fa-code-branch", Cloud: "fa-cloud", Identity: "fa-key", Business: "fa-briefcase" } as Record<string, string>)[c];

  const connected = INTEGRATIONS.filter(isConnected).length;
  const available = INTEGRATIONS.length - connected;

  return (
    <div className="ld-dash">
      <nav className="ld-crumbs" aria-label="Breadcrumb">
        <button type="button" className="ld-link" onClick={() => setRoute("dashboard")}>Home</button>
        <Icon icon={ChevronRightIcon} />
        <span>Build</span>
        <Icon icon={ChevronRightIcon} />
        <span>Integrations</span>
      </nav>

      <div className="ld-head">
        <div>
          <h1>Integration Marketplace</h1>
          <p>{INTEGRATIONS.length} integrations · OAuth, API key and webhook support · bidirectional sync where applicable</p>
        </div>
        <div className="ld-head-actions">
          <button type="button" className="ld-btn"><Icon icon={BookIcon} /> API Docs</button>
          <button type="button" className="ld-btn"><Icon icon={KeyRoundIcon} /> API Tokens</button>
          <button type="button" className="ld-btn ld-btn-primary"><Icon icon={PlusIcon} /> Custom Webhook</button>
        </div>
      </div>

      <div className="ld-grid ld-grid-stats">
        <StatCard icon="fa-puzzle-piece" tone="info" label="Total" value={fmt(INTEGRATIONS.length)} note="in the catalog" onClick={() => setCat("all")} />
        <StatCard icon="fa-plug-circle-check" tone="ok" label="Connected" value={fmt(connected)} note="active connections" />
        <StatCard icon="fa-plug" tone="muted" label="Available" value={fmt(available)} note="not connected" />
        <StatCard icon="fa-layer-group" tone="purple" label="Categories" value={fmt(categories.length)} note="integration types" />
      </div>

      <section className="ld-card ld-panel" aria-labelledby="int-cat-h">
        <div className="ld-panel-head"><h2 id="int-cat-h">Browse by Category</h2></div>
        <div className="ld-chips" role="group" aria-label="Filter by category">
          <button type="button" className={`ld-chip${cat === "all" ? " active" : ""}`} aria-pressed={cat === "all"} onClick={() => setCat("all")}>
            <Icon icon={GripIcon} />
            <span className="ld-chip-label">All</span>
            <span className="ld-chip-count">{INTEGRATIONS.length}</span>
          </button>
          {categories.map(c => (
            <button key={c} type="button" className={`ld-chip${cat === c ? " active" : ""}`} aria-pressed={cat === c} onClick={() => setCat(c)}>
              <Icon className={`fa-solid ${catIcon(c)}`} style={cat === c ? undefined : { color: catColor(c) }} />
              <span className="ld-chip-label">{c}</span>
              <span className="ld-chip-count">{INTEGRATIONS.filter(i => i.category === c).length}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="ld-split">
        <div className="ld-rail">
          <section className="ld-card ld-panel" aria-labelledby="int-list-h">
            <div className="ld-panel-head">
              <h2 id="int-list-h">{cat === "all" ? "All Integrations" : cat}</h2>
              <span className="ld-muted ld-small">{fmt(filtered.length)} items</span>
            </div>
            {filtered.length ? (
              <div className="ld-table-wrap">
                <table className="ld-table">
                  <thead>
                    <tr>
                      <th scope="col">Integration</th>
                      <th scope="col">Category</th>
                      <th scope="col">Notes</th>
                      <th scope="col">Status</th>
                      <th scope="col"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(g => (
                      <tr key={g.name}>
                        <td>
                          <div className="ld-admin-who">
                            <span className="ld-tile ld-tile-sm" style={{ color: catColor(g.category), background: catColor(g.category) + "18" }} aria-hidden="true"><Icon className={g.icon} /></span>
                            <button type="button" className="ld-link ld-strong" onClick={() => setRoute("integration-detail", { integName: g.name })}>{g.name}</button>
                          </div>
                        </td>
                        <td><Pill tone="muted">{g.category}</Pill></td>
                        <td className="ld-muted ld-wrap">{g.meta}</td>
                        <td>{isConnected(g) ? <Pill tone="ok"><span className="ld-pill-dot" />Connected</Pill> : <Pill tone="muted"><span className="ld-pill-dot" />Available</Pill>}</td>
                        <td>
                          {isConnected(g)
                            ? <button type="button" className="ld-btn ld-btn-sm" onClick={() => setRoute("integration-detail", { integName: g.name })}>Manage</button>
                            : <button type="button" className="ld-btn ld-btn-sm ld-btn-primary" onClick={() => setConnectFor(g)}><Icon icon={PlugIcon} /> Connect</button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty>No integrations in this category.</Empty>
            )}
          </section>

          <Panel title="Outbound Webhooks · Custom">
            <pre className="ld-code ld-admin-term" aria-label="Example webhook request">
              <span className="c"># POST to your endpoint on every incident event</span>{"\n"}
              <span className="p">POST</span> https://hooks.your-domain.io/linkedeye{"\n"}
              <span className="k">Content-Type:</span> application/json{"\n"}
              <span className="k">X-LinkedEye-Signature:</span> sha256=...{"\n"}
              {"{"}{"\n"}
              {"  "}<span className="y">"event":</span> <span className="s">"incident.declared"</span>,{"\n"}
              {"  "}<span className="y">"incident":</span> {"{ \"id\": \"INC-48291\", \"severity\": 1, ... }"}{"\n"}
              {"}"}
            </pre>
          </Panel>
        </div>

        <div className="ld-rail">
          <Panel title="Connections by Category">
            <ul className="ld-bars">
              {categories.map(c => {
                const items = INTEGRATIONS.filter(i => i.category === c);
                const on = items.filter(isConnected).length;
                return (
                  <li key={c}>
                    <span className="ld-bar-label">{c}</span>
                    <span className="ld-bar-track"><span className="ld-bar-fill" style={{ width: `${items.length ? (on / items.length) * 100 : 0}%`, background: catColor(c) }} /></span>
                    <span className="ld-bar-value">{on}/{items.length}</span>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>
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
