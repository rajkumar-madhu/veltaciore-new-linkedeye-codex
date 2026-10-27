// Integration marketplace — LinkedEye list layout: catalog summary cards,
// category chips, a filterable integration table (Manage / Connect actions),
// the custom webhook payload and a per-category connection rail.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { INTEGRATIONS } from "@/data/core";
import { Empty, Panel, Pill, PillDot, StatCard, fmt } from "@/components/ld";
import { Button, Crumbs, Page, PageHead, Table, TextButton, Tile, cx, ui } from "@/components/ui";
import { ConnectModal } from "@/screens/ConnectModal";
import type { Integration } from "@/lib/types";

import { Icon } from "@/components/Icon";
import { BookIcon, GripIcon, KeyRoundIcon, PlugIcon, PlusIcon } from "lucide-react";
// Category filter chips (were ld-chip / ld-chip-label)
const chipClass = (active: boolean) =>
  cx(
    "inline-flex flex-col items-center justify-center gap-1 min-w-[104px] min-h-[76px] py-2.5 px-3 border rounded-lg cursor-pointer shadow-sm [&_.ld-icon]:text-2xl",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
    active ? "bg-accent border-accent text-white [&_.ld-icon]:text-white" : "bg-bg-raised border-line text-fg hover:border-line-strong [&_.ld-icon]:text-accent",
  );
const chipLabel = (active: boolean) => cx("text-sm", active ? "text-white" : "text-fg-muted");
// Dark code block with terminal colouring (was ld-code ld-admin-term)
const codeBlock = "m-0 py-3.5 px-4 rounded bg-[#0b1220] text-[#e2e8f0] font-mono text-[12.5px] leading-[1.7] overflow-x-auto whitespace-pre-wrap";
const term = { c: "text-[#94a3b8]", p: "text-[#38bdf8]", k: "text-[#a78bfa]", s: "text-[#4ade80]", y: "text-[#fbbf24]" };

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
    <Page>
      <Crumbs items={[{ label: "Home", onClick: () => setRoute("dashboard") }, { label: "Build" }, { label: "Integrations" }]} />

      <PageHead
        title="Integration Marketplace"
        subtitle={<>{INTEGRATIONS.length} integrations · OAuth, API key and webhook support · bidirectional sync where applicable</>}
        actions={
          <>
            <Button><Icon icon={BookIcon} /> API Docs</Button>
            <Button><Icon icon={KeyRoundIcon} /> API Tokens</Button>
            <Button variant="primary"><Icon icon={PlusIcon} /> Custom Webhook</Button>
          </>
        }
      />

      <div className={cx(ui.grid, ui.cols.stats)}>
        <StatCard icon="fa-puzzle-piece" tone="info" label="Total" value={fmt(INTEGRATIONS.length)} note="in the catalog" onClick={() => setCat("all")} />
        <StatCard icon="fa-plug-circle-check" tone="ok" label="Connected" value={fmt(connected)} note="active connections" />
        <StatCard icon="fa-plug" tone="muted" label="Available" value={fmt(available)} note="not connected" />
        <StatCard icon="fa-layer-group" tone="purple" label="Categories" value={fmt(categories.length)} note="integration types" />
      </div>

      <section className={cx(ui.card, ui.panel)} aria-labelledby="int-cat-h">
        <div className={ui.panelHead}><h2 className={ui.panelTitle} id="int-cat-h">Browse by Category</h2></div>
        <div className="flex flex-wrap gap-2.5" role="group" aria-label="Filter by category">
          <button type="button" className={chipClass(cat === "all")} aria-pressed={cat === "all"} onClick={() => setCat("all")}>
            <Icon icon={GripIcon} />
            <span className={chipLabel(cat === "all")}>All</span>
            <span className="text-md font-bold">{INTEGRATIONS.length}</span>
          </button>
          {categories.map(c => (
            <button key={c} type="button" className={chipClass(cat === c)} aria-pressed={cat === c} onClick={() => setCat(c)}>
              <Icon className={`fa-solid ${catIcon(c)}`} style={cat === c ? undefined : { color: catColor(c) }} />
              <span className={chipLabel(cat === c)}>{c}</span>
              <span className="text-md font-bold">{INTEGRATIONS.filter(i => i.category === c).length}</span>
            </button>
          ))}
        </div>
      </section>

      <div className={ui.split}>
        <div className={ui.rail}>
          <section className={cx(ui.card, ui.panel)} aria-labelledby="int-list-h">
            <div className={ui.panelHead}>
              <h2 className={ui.panelTitle} id="int-list-h">{cat === "all" ? "All Integrations" : cat}</h2>
              <span className="text-fg-muted text-xs">{fmt(filtered.length)} items</span>
            </div>
            {filtered.length ? (
              <Table>
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
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Tile tone="muted" size="sm" style={{ color: catColor(g.category), background: catColor(g.category) + "18" }}><Icon className={g.icon} /></Tile>
                            <TextButton className="font-medium" onClick={() => setRoute("integration-detail", { integName: g.name })}>{g.name}</TextButton>
                          </div>
                        </td>
                        <td><Pill tone="muted">{g.category}</Pill></td>
                        <td className={ui.cellWrap}>{g.meta}</td>
                        <td>{isConnected(g) ? <Pill tone="ok"><PillDot />Connected</Pill> : <Pill tone="muted"><PillDot />Available</Pill>}</td>
                        <td>
                          {isConnected(g)
                            ? <Button size="sm" onClick={() => setRoute("integration-detail", { integName: g.name })}>Manage</Button>
                            : <Button variant="primary" size="sm" onClick={() => setConnectFor(g)}><Icon icon={PlugIcon} /> Connect</Button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
            ) : (
              <Empty>No integrations in this category.</Empty>
            )}
          </section>

          <Panel title="Outbound Webhooks · Custom">
            <pre className={codeBlock} aria-label="Example webhook request">
              <span className={term.c}># POST to your endpoint on every incident event</span>{"\n"}
              <span className={term.p}>POST</span> https://hooks.your-domain.io/linkedeye{"\n"}
              <span className={term.k}>Content-Type:</span> application/json{"\n"}
              <span className={term.k}>X-LinkedEye-Signature:</span> sha256=...{"\n"}
              {"{"}{"\n"}
              {"  "}<span className={term.y}>"event":</span> <span className={term.s}>"incident.declared"</span>,{"\n"}
              {"  "}<span className={term.y}>"incident":</span> {"{ \"id\": \"INC-48291\", \"severity\": 1, ... }"}{"\n"}
              {"}"}
            </pre>
          </Panel>
        </div>

        <div className={ui.rail}>
          <Panel title="Connections by Category">
            <ul className={ui.bars}>
              {categories.map(c => {
                const items = INTEGRATIONS.filter(i => i.category === c);
                const on = items.filter(isConnected).length;
                return (
                  <li key={c} className={ui.barItem}>
                    <span className={ui.barLabel}>{c}</span>
                    <span className={ui.barTrack}><span className={ui.barFill} style={{ width: `${items.length ? (on / items.length) * 100 : 0}%`, background: catColor(c) }} /></span>
                    <span className={ui.barValue}>{on}/{items.length}</span>
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
    </Page>
  );
}
