// Business Service Map — service dependency graph, business services, CIs,
// service domains, impact analysis and related records.
// No service-mapping / discovery backend is connected yet, so the entities
// are a labelled sample; counts and averages are computed from them.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { USERS } from "@/data/core";
import { Empty, Panel, Pill, PillDot, StatCard, fmt } from "@/components/ld";
import { Button, Card, Crumbs, Page, PageHead, Table, cx, toneText, ui } from "@/components/ui";
import type { Tone } from "@/components/ld";

import { Icon } from "@/components/Icon";
import { FileOutputIcon, FlaskConicalIcon, PlusIcon, RefreshCwIcon } from "lucide-react";
interface MapEntity {
  id: string;
  type: string;
  lang: string;
  tier: string;
  health: string;
  apdex: number;
  group: string;
}

const ENTITIES: MapEntity[] = [
  { id: "checkout-api",    type: "service", lang: "Node",    tier: "edge",    health: "critical", apdex: 0.62, group: "checkout" },
  { id: "web-bff",         type: "service", lang: "Node",    tier: "edge",    health: "warning",  apdex: 0.81, group: "checkout" },
  { id: "checkout.web",    type: "browser", lang: "TS",      tier: "browser", health: "warning",  apdex: 0.78, group: "checkout" },
  { id: "checkout.ios",    type: "mobile",  lang: "Swift",   tier: "mobile",  health: "ok",       apdex: 0.92, group: "checkout" },
  { id: "checkout.android",type: "mobile",  lang: "Kotlin",  tier: "mobile",  health: "ok",       apdex: 0.91, group: "checkout" },
  { id: "payments-svc",    type: "service", lang: "Java",    tier: "core",    health: "critical", apdex: 0.41, group: "payments" },
  { id: "stripe-adapter",  type: "service", lang: "Go",      tier: "core",    health: "critical", apdex: 0.48, group: "payments" },
  { id: "payments-db",     type: "db",      lang: "PG",      tier: "data",    health: "warning",  apdex: 0.74, group: "payments" },
  { id: "fraud-svc",       type: "service", lang: "Python",  tier: "core",    health: "ok",       apdex: 0.94, group: "payments" },
  { id: "inventory-svc",   type: "service", lang: "Go",      tier: "core",    health: "ok",       apdex: 0.96, group: "inventory" },
  { id: "inventory-db",    type: "db",      lang: "PG",      tier: "data",    health: "ok",       apdex: 0.98, group: "inventory" },
  { id: "auth-svc",        type: "service", lang: "Rust",    tier: "core",    health: "ok",       apdex: 0.97, group: "identity" },
  { id: "session-cache",   type: "cache",   lang: "Redis",   tier: "data",    health: "ok",       apdex: 0.99, group: "identity" },
  { id: "search-svc",      type: "service", lang: "Java",    tier: "core",    health: "warning",  apdex: 0.78, group: "discovery" },
  { id: "elastic-cluster", type: "infra",   lang: "—",       tier: "data",    health: "warning",  apdex: 0.74, group: "discovery" },
  { id: "notify-svc",      type: "service", lang: "Ruby",    tier: "core",    health: "ok",       apdex: 0.95, group: "notifications" },
];

// Business services: display name, domain key, owner.
const BUSINESS: [string, string, string][] = [
  ["Checkout", "checkout", "u1"],
  ["Payments", "payments", "u4"],
  ["Inventory", "inventory", "u3"],
  ["Identity", "identity", "u8"],
  ["Discovery", "discovery", "u3"],
  ["Notifications", "notifications", "u7"],
];

const HEALTH: Record<string, { tone: Tone; label: string }> = {
  critical: { tone: "crit", label: "Critical" },
  warning: { tone: "warn", label: "Warning" },
  ok: { tone: "ok", label: "Healthy" },
};
const apdexClass = (a: number) => (a < 0.8 ? cellTone.crit : a < 0.9 ? cellTone.warn : cellTone.ok);
// Status text in a table cell / figure box: in light mode the cell's own colour
// won (only the weight showed); in dark mode the status colour won.
const cellTone = { crit: "font-semibold dark:text-tone-crit", warn: "font-semibold dark:text-tone-warn", ok: "font-semibold dark:text-tone-ok" } as const;
const seg = "inline-flex flex-wrap gap-1";
/** Mono text in a table cell keeps the cell's 13px (the old mono class lost to it). */
const cellMono = "font-mono font-semibold";
/** Text link in mono (the old link + mono pair: mono's 12px / 600 won). */
const linkMono = "border-0 bg-transparent p-0 text-accent cursor-pointer hover:underline font-mono text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2";
const worst = (items: MapEntity[]) => (items.some((e) => e.health === "critical") ? "critical" : items.some((e) => e.health === "warning") ? "warning" : "ok");
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export default function EntityMapScreen() {
  const { setRoute } = useNav();
  const [filter, setFilter] = React.useState("all");

  const entities = ENTITIES;
  const filtered = filter === "all" ? entities : entities.filter(e => e.health === filter);
  const count = (h: string) => entities.filter(e => e.health === h).length;
  const userName = (id: string) => USERS.find((u) => u.id === id)?.name ?? "Unassigned";
  const services = BUSINESS.map(([name, key, owner]) => {
    const items = entities.filter((e) => e.group === key);
    const h = worst(items);
    return { name, key, owner, items, health: h, apdex: avg(items.map((e) => e.apdex)), sla: h === "critical" ? "breaching" : h === "warning" ? "at-risk" : "meeting" };
  });

  return (
    <Page>
      <Crumbs items={[{ label: "Home", onClick: () => setRoute("dashboard") }, { label: "Business Service Map" }]} />

      <PageHead
        title="Business Service Map"
        subtitle={<>{services.length} business services · {entities.length} configuration items and the dependencies between them</>}
        actions={<>
          <Button><Icon icon={RefreshCwIcon} /> Re-discover</Button>
          <Button><Icon icon={FileOutputIcon} /> Export Map</Button>
          <Button variant="primary"><Icon icon={PlusIcon} /> Add Service</Button>
        </>}
      />

      <Card className={ui.notice} role="note">
        <Icon icon={FlaskConicalIcon} />
        <div>
          <b>Sample data</b>
          <p className="text-fg-muted text-xs">Service discovery is not connected yet. The services, CIs and dependencies below are illustrative; counts and averages are computed from them.</p>
        </div>
      </Card>

      <div className={cx(ui.grid, ui.cols[5])}>
        <StatCard icon="fa-briefcase" tone="info" label="Business services" value={fmt(services.length)} note="all domains" onClick={() => setFilter("all")} />
        <StatCard icon="fa-circle-check" tone="ok" label="Healthy" value={fmt(count("ok"))} note="meeting SLO" onClick={() => setFilter("ok")} />
        <StatCard icon="fa-triangle-exclamation" tone="warn" label="Warning" value={fmt(count("warning"))} note="at risk" onClick={() => setFilter("warning")} />
        <StatCard icon="fa-circle-xmark" tone="crit" label="Critical" value={fmt(count("critical"))} note="degraded" onClick={() => setFilter("critical")} />
        <StatCard icon="fa-face-smile" tone="warn" label="Avg Apdex" value={avg(entities.map((e) => e.apdex)).toFixed(2)} note="across all CIs" />
      </div>

      <div className={ui.split}>
        <div className={ui.rail}>
          <Panel title="Service dependency map">
            <div className={ui.toolbar}>
              <span className={seg} role="group" aria-label="Filter by health">
                {[["all", "All"], ["critical", "Critical"], ["warning", "Warning"], ["ok", "Healthy"]].map(([id, l]) => (
                  <Button key={id} size="sm" variant={filter === id ? "primary" : "default"} aria-pressed={filter === id} onClick={() => setFilter(id)}>{l}</Button>
                ))}
              </span>
              <span className={ui.fieldGrow} />
              <span className="text-fg-muted text-xs">edge colour = health of the call path</span>
            </div>
            {filtered.length ? <div className="overflow-x-auto rounded bg-bg-muted"><BSMGraph entities={filtered} /></div> : <Empty>No CIs match this filter.</Empty>}
          </Panel>

          <Panel title={`Business services (${services.length})`}>
            <Table>
                <thead><tr><th scope="col">Service</th><th scope="col">CIs</th><th scope="col">Owner</th><th scope="col">Status</th><th scope="col">Apdex</th><th scope="col">SLA</th></tr></thead>
                <tbody>
                  {services.map((s) => (
                    <tr key={s.key}>
                      <td><span className="font-medium">{s.name}</span><span className={cx(ui.sub, "font-mono font-semibold")}>{s.key}</span></td>
                      <td>{s.items.length}</td>
                      <td>{userName(s.owner)}</td>
                      <td><Pill tone={HEALTH[s.health].tone}><PillDot />{HEALTH[s.health].label}</Pill></td>
                      <td className={apdexClass(s.apdex)}>{s.apdex.toFixed(2)}</td>
                      <td><Pill tone={s.sla === "breaching" ? "crit" : s.sla === "at-risk" ? "warn" : "ok"}>{s.sla}</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
          </Panel>

          <Panel title={`Configuration items (${filtered.length})`}>
            <Table>
                <thead><tr><th scope="col">Name</th><th scope="col">Type</th><th scope="col">Tier</th><th scope="col">Service</th><th scope="col">Tech</th><th scope="col">Apdex</th><th scope="col">Status</th></tr></thead>
                <tbody>
                  {filtered.map(e => (
                    <tr key={e.id}>
                      <td><button type="button" className={linkMono} onClick={() => setRoute("apm")}>{e.id}</button></td>
                      <td><Pill tone="muted">{e.type}</Pill></td>
                      <td className={cellMono}>{e.tier}</td>
                      <td className={cellMono}>{e.group}</td>
                      <td className={cellMono}>{e.lang}</td>
                      <td className={apdexClass(e.apdex)}>{e.apdex.toFixed(2)}</td>
                      <td><Pill tone={HEALTH[e.health].tone}><PillDot />{HEALTH[e.health].label}</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
          </Panel>
        </div>

        <div className={ui.rail}>
          <Panel title="Service domains">
            <ul className={ui.activity}>
              {services.map((s) => (
                <li key={s.key} className={ui.activityItem}>
                  <span className={ui.activityText}>{s.key} <span className="text-fg-muted">· {s.items.length} CIs</span></span>
                  <Pill tone={HEALTH[s.health].tone}>{s.health === "critical" ? "degraded" : s.health === "warning" ? "warning" : "healthy"}</Pill>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Impact analysis">
            <dl className={ui.dl}>
              <dt>Business impact</dt><dd><span className={toneText.crit}>Checkout</span> · revenue blocking</dd>
              <dt>Affected CIs</dt><dd>{count("critical")} critical · {count("warning")} warning</dd>
              <dt>Healthy CIs</dt><dd>{count("ok")}</dd>
              <dt>Root cause</dt><dd className={ui.mono}>payments-svc · pool exhaustion</dd>
              <dt>Recommended</dt><dd>Rollback v2.41 → v2.40</dd>
            </dl>
          </Panel>

          <Panel title="Related records (3)">
            <ul className={ui.activity}>
              {[["Stripe timeouts", "Incident · active", "INC-48291"], ["Pool sizing regression", "Problem · RCA", "PRB-3912"], ["Pool config rollback", "Change · implementing", "CHG-2219"]].map(([t, meta, id]) => (
                <li key={id} className={ui.activityItem}>
                  <span className={ui.activityText}>{t}<span className={ui.sub}>{meta}</span></span>
                  <span className={ui.mono}>{id}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </Page>
  );
}

function BSMGraph({ entities }: { entities: MapEntity[] }) {
  const W = 1100, H = 520;
  const positions: Record<string, [number, number]> = {
    "checkout.web":     [110, 100], "checkout.ios": [110, 200], "checkout.android": [110, 300], "auth-svc": [110, 420],
    "web-bff":          [310, 100], "checkout-api": [310, 250], "session-cache": [310, 420],
    "payments-svc":     [560, 180], "stripe-adapter":[820, 180], "fraud-svc":  [560, 320], "inventory-svc": [560, 80],
    "search-svc":       [560, 420], "notify-svc":   [820, 320],
    "payments-db":      [1020, 210], "inventory-db": [1020, 80], "elastic-cluster": [1020, 420],
  };
  const edges: [string, string, string][] = [
    ["checkout.web","web-bff","warning"],["checkout.ios","web-bff","ok"],["checkout.android","web-bff","ok"],
    ["web-bff","checkout-api","critical"],["web-bff","auth-svc","ok"],
    ["checkout-api","payments-svc","critical"],["checkout-api","inventory-svc","ok"],["checkout-api","fraud-svc","ok"],
    ["payments-svc","stripe-adapter","critical"],["payments-svc","payments-db","warning"],
    ["inventory-svc","inventory-db","ok"],["search-svc","elastic-cluster","warning"],
    ["auth-svc","session-cache","ok"],["checkout-api","notify-svc","ok"],
  ];
  const colorOf = (h: string) => h === "critical" ? "#e5383b" : h === "warning" ? "#f5a524" : "#16a34a";
  const ents: Record<string, MapEntity> = {}; entities.forEach(e => { ents[e.id] = e; });
  const shown = edges.filter(e => positions[e[0]] && positions[e[1]] && ents[e[0]] && ents[e[1]]);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full min-w-[760px] h-auto" role="img" aria-label={`Dependency map of ${entities.length} CIs with ${shown.length} call paths`}>
      <defs>
        {["critical","warning","ok"].map(s => (
          <marker key={s} id={`bsm-${s}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={colorOf(s)} />
          </marker>
        ))}
      </defs>
      {shown.map(([a,b,s]) => {
        const [x1,y1] = positions[a], [x2,y2] = positions[b];
        const mx = (x1+x2)/2, my = (y1+y2)/2 - 30;
        return <path key={a + b} d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`} stroke={colorOf(s)} strokeOpacity="0.65" strokeWidth={s === "critical" ? 2.4 : 1.6} fill="none" markerEnd={`url(#bsm-${s})`} />;
      })}
      {Object.entries(positions).map(([id,[x,y]]) => {
        const e = ents[id];
        if (!e) return null;
        const c = colorOf(e.health);
        return (
          <g key={id} transform={`translate(${x},${y})`}>
            <title>{`${e.id} · ${e.type} · ${HEALTH[e.health].label} · Apdex ${e.apdex.toFixed(2)}`}</title>
            <rect x="-50" y="-22" width="100" height="44" rx="6" className="fill-bg-raised" stroke={c} strokeWidth="2" />
            <rect x="-50" y="-22" width="6" height="44" fill={c} />
            <text x="-38" y="-2" className="fill-fg font-mono text-2xs font-bold">{e.id.length > 13 ? e.id.slice(0,12)+"…" : e.id}</text>
            <text x="-38" y="12" className="fill-fg-muted font-mono text-[9px]">{e.type} · {e.lang}</text>
            <circle cx="40" cy="-12" r="7" fill={c} />
            <text x="40" y="-9" fontSize="8" fontWeight="700" fill="#fff" textAnchor="middle">{e.apdex.toFixed(1)}</text>
          </g>
        );
      })}
    </svg>
  );
}
