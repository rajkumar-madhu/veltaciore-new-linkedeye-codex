// screens/entity-map.jsx — ServiceNow ITSM Business Service Map style
// Ported from screens/entity-map.jsx.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { Kpi, FormSection, Field, UserById } from "@/components/primitives";

interface MapEntity {
  id: string;
  type: string;
  lang: string;
  tier: string;
  health: string;
  apdex: number;
  group: string;
}

export default function EntityMapScreen() {
  const { setRoute } = useNav();
  const [filter, setFilter] = React.useState("all");
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const toggle = (id: string) => setCollapsed(c => ({ ...c, [id]: !c[id] }));

  const entities: MapEntity[] = [
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
  const filtered = filter === "all" ? entities : entities.filter(e => e.health === filter);

  return (
    <div className="page page-fade sn-dash">
      <div className="sn-breadcrumb">
        <a className="sn-link">Home</a><span className="sn-bc-sep">›</span>
        <a className="sn-link">Observe</a><span className="sn-bc-sep">›</span>
        <a className="sn-link">Service Mapping</a><span className="sn-bc-sep">›</span>
        <span>Business Services</span>
      </div>

      <div className="sn-form-header">
        <div className="sn-form-title-row">
          <span className="sn-rec-number">BSM</span>
          <span className="sn-pill prio-1"><i className="fa-solid fa-circle" /> {entities.filter(e => e.health === "critical").length} Critical</span>
          <span className="sn-pill state-progress"><i className="fa-solid fa-spinner fa-spin" /> {entities.filter(e => e.health === "warning").length} Warning</span>
          <span className="sn-pill state-neutral"><i className="fa-solid fa-diagram-project" /> {entities.length} entities</span>
        </div>
        <div className="sn-form-title-meta">
          <div>
            <h1>Business Service Map</h1>
            <div className="sn-form-sub">6 business services · {entities.length} CIs · auto-discovered via ServiceNow Discovery + Pattern Designer</div>
          </div>
          <div className="sn-form-actions">
            <button className="sn-btn"><i className="fa-solid fa-rotate" /> Re-discover</button>
            <button className="sn-btn"><i className="fa-solid fa-file-export" /> Export Map</button>
            <button className="sn-btn primary"><i className="fa-solid fa-plus" /> Add Service</button>
          </div>
        </div>
      </div>

      <div className="sn-kpi-strip">
        <Kpi l="Business Services" v="6" s="all domains" tone="neutral" />
        <Kpi l="Healthy" v={entities.filter(e => e.health === "ok").length} s="meeting SLO" tone="ok" />
        <Kpi l="Warning" v={entities.filter(e => e.health === "warning").length} s="at risk" tone="warn" />
        <Kpi l="Critical" v={entities.filter(e => e.health === "critical").length} s="degraded" tone="crit" />
        <Kpi l="Avg Apdex" v={(entities.reduce((s,e) => s + e.apdex, 0) / entities.length).toFixed(2)} s="org-wide" tone="warn" />
        <Kpi l="Last Discovery" v="14m" s="ago · auto" tone="neutral" />
      </div>

      <div className="sn-form-layout">
        <div className="sn-form-main">
          <FormSection id="map" title="Service Dependency Map" badge="live · click any node to drill in" collapsed={collapsed.map} onToggle={toggle}>
            <div style={{ padding: 14, background: "#fafbfc", borderBottom: "1px solid #e5e8eb", display: "flex", gap: 8, alignItems: "center" }}>
              <span className="text-mute" style={{ fontSize: 11.5 }}>Filter:</span>
              {[["all","All"],["critical","Critical"],["warning","Warning"],["ok","Healthy"]].map(([id, l]) => (
                <button key={id} className={`sn-btn ${filter === id ? "primary" : ""}`} style={{ padding: "3px 10px", fontSize: 11.5 }} onClick={() => setFilter(id)}>{l}</button>
              ))}
              <span style={{ flex: 1 }} />
              <span className="text-mute" style={{ fontSize: 11 }}>edge thickness = call volume</span>
            </div>
            <div style={{ padding: 0, background: "white" }}>
              <BSMGraph entities={filtered} />
            </div>
          </FormSection>

          <FormSection id="services" title="Business Services" badge="6 services · grouped" collapsed={collapsed.services} onToggle={toggle}>
            <table className="sn-list-table">
              <thead><tr><th>Service</th><th style={{width:90}}>CIs</th><th style={{width:120}}>Owner</th><th style={{width:140}}>Status</th><th style={{width:100}}>Apdex</th><th style={{width:120}}>SLA</th></tr></thead>
              <tbody>
                {([
                  ["Checkout","checkout",5,"u1","critical",0.74,"breaching"],
                  ["Payments","payments",4,"u4","critical",0.64,"breaching"],
                  ["Inventory","inventory",2,"u3","ok",0.97,"meeting"],
                  ["Identity","identity",3,"u8","ok",0.97,"meeting"],
                  ["Discovery","discovery",2,"u3","warning",0.76,"at-risk"],
                  ["Notifications","notifications",1,"u7","ok",0.95,"meeting"],
                ] as [string, string, number, string, string, number, string][]).map((r,i) => (
                  <tr key={i} style={{ cursor: "pointer" }}>
                    <td><b>{r[0]}</b><div className="text-mute mono" style={{ fontSize: 11, marginTop: 2 }}>{r[1]}</div></td>
                    <td className="mono">{r[2]}</td>
                    <td><UserById id={r[3]} /></td>
                    <td><span className={`sn-state-pill ${r[4]==="critical"?"state-active":r[4]==="warning"?"state-mitigating":"svc-healthy"}`}><i className="fa-solid fa-circle" /> {r[4]}</span></td>
                    <td className={`mono ${r[5]<0.8?"tone-crit":r[5]<0.9?"tone-warn":"tone-ok"}`}><b>{r[5].toFixed(2)}</b></td>
                    <td><span className={`sn-state-pill ${r[6]==="breaching"?"state-active":r[6]==="at-risk"?"state-mitigating":"svc-healthy"}`}><i className="fa-solid fa-circle" /> {r[6]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </FormSection>

          <FormSection id="cis" title="Configuration Items" badge={`${filtered.length} CIs`} collapsed={collapsed.cis} onToggle={toggle}>
            <table className="sn-list-table">
              <thead><tr><th>Name</th><th style={{width:90}}>Type</th><th style={{width:90}}>Tier</th><th style={{width:120}}>Service</th><th style={{width:90}}>Tech</th><th style={{width:90}}>Apdex</th><th style={{width:130}}>Status</th></tr></thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e.id} onClick={() => setRoute("apm")} style={{ cursor: "pointer" }}>
                    <td><a className="sn-link mono"><b>{e.id}</b></a></td>
                    <td><span className="sn-state-pill state-neutral"><i className="fa-solid fa-circle" /> {e.type}</span></td>
                    <td className="mono">{e.tier}</td>
                    <td className="mono">{e.group}</td>
                    <td className="mono">{e.lang}</td>
                    <td className={`mono ${e.apdex<0.8?"tone-crit":e.apdex<0.9?"tone-warn":"tone-ok"}`}><b>{e.apdex.toFixed(2)}</b></td>
                    <td><span className={`sn-state-pill ${e.health==="critical"?"state-active":e.health==="warning"?"state-mitigating":"svc-healthy"}`}><i className="fa-solid fa-circle" /> {e.health}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </FormSection>
        </div>

        <aside className="sn-form-side">
          <div className="sn-side-card">
            <div className="sn-side-head">Service Domains</div>
            <div className="sn-side-body">
              {["checkout","payments","inventory","identity","discovery","notifications"].map(g => {
                const items = entities.filter(e => e.group === g);
                const crit = items.some(e => e.health === "critical");
                const warn = items.some(e => e.health === "warning");
                return (
                  <div key={g} className="sn-related-row">
                    <div><div className="sn-related-title">{g}</div><div className="sn-related-meta">{items.length} CIs</div></div>
                    <span className={`sn-state-pill ${crit?"state-active":warn?"state-mitigating":"svc-healthy"}`}><i className="fa-solid fa-circle" /> {crit?"degraded":warn?"warning":"healthy"}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="sn-side-card">
            <div className="sn-side-head">Impact Analysis</div>
            <div className="sn-side-body">
              <Field label="Business impact" value={<span className="tone-crit"><b>Checkout</b> · revenue blocking</span>} />
              <Field label="Users affected" value="12,400 active sessions" />
              <Field label="Downstream CIs" value="9 critical · 4 warning" />
              <Field label="Upstream CIs" value="2 healthy" />
              <Field label="Root cause" value={<a className="sn-link">payments-svc · pool exhaustion</a>} />
              <Field label="Recommended" value={<a className="sn-link">Rollback v2.41 → v2.40</a>} />
            </div>
          </div>

          <div className="sn-side-card">
            <div className="sn-side-head">Related Records <span className="sn-side-count">3</span></div>
            <div className="sn-side-body">
              <div className="sn-related-row">
                <div><div className="sn-related-title">Stripe timeouts</div><div className="sn-related-meta">Incident · active</div></div>
                <a className="sn-link mono">INC-48291</a>
              </div>
              <div className="sn-related-row">
                <div><div className="sn-related-title">Pool sizing regression</div><div className="sn-related-meta">Problem · RCA</div></div>
                <a className="sn-link mono">PRB-3912</a>
              </div>
              <div className="sn-related-row">
                <div><div className="sn-related-title">Pool config rollback</div><div className="sn-related-meta">Change · implementing</div></div>
                <a className="sn-link mono">CHG-2219</a>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
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
  const colorOf = (h: string) => h === "critical" ? "#d32f2f" : h === "warning" ? "#ff9800" : "#4caf50";
  const typeIcon: Record<string, string> = {service:"\uf233",browser:"\uf57d",mobile:"\uf3cd",db:"\uf1c0",cache:"\uf0e7",infra:"\uf1b3"};
  const ents: Record<string, MapEntity> = {}; entities.forEach(e => { ents[e.id] = e; });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 540, display: "block", background: "#fafbfc" }}>
      <defs>
        {["critical","warning","ok"].map(s => (
          <marker key={s} id={`bsm-${s}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={colorOf(s)} />
          </marker>
        ))}
      </defs>
      {edges.filter(e => positions[e[0]] && positions[e[1]] && ents[e[0]] && ents[e[1]]).map(([a,b,s],i) => {
        const [x1,y1] = positions[a], [x2,y2] = positions[b];
        const mx = (x1+x2)/2, my = (y1+y2)/2 - 30;
        return <path key={i} d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`} stroke={colorOf(s)} strokeOpacity="0.65" strokeWidth={s === "critical" ? 2.4 : 1.6} fill="none" markerEnd={`url(#bsm-${s})`} />;
      })}
      {Object.entries(positions).map(([id,[x,y]]) => {
        const e = ents[id];
        if (!e) return null;
        const c = colorOf(e.health);
        return (
          <g key={id} transform={`translate(${x},${y})`} style={{ cursor: "pointer" }}>
            <rect x="-50" y="-22" width="100" height="44" rx="4" fill="white" stroke={c} strokeWidth="2" />
            <rect x="-50" y="-22" width="6" height="44" fill={c} />
            <text x="-32" y="-2" fontSize="11" fontFamily="var(--font-mono)" fontWeight="700" fill="#000">{e.id.length > 14 ? e.id.slice(0,13)+"…" : e.id}</text>
            <text x="-32" y="12" fontSize="9" fontFamily="var(--font-mono)" fill="#6b7785">{e.type} · {e.lang}</text>
            <circle cx="42" cy="-12" r="6" fill={c} />
            <text x="42" y="-9" fontSize="8" fontWeight="700" fill="white" textAnchor="middle">{e.apdex.toFixed(1)}</text>
          </g>
        );
      })}
    </svg>
  );
}
