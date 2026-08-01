// Host Map — at-a-glance fleet health as a hexagon grid (the Datadog
// infrastructure hostmap). Each hex is a host, filled by a chosen metric and
// grouped by datacenter/role. Hover shows the host + value. Light-theme.
import React from "react";
import { Kpi } from "@/components/primitives";

interface Host {
  name: string;
  dc: string;
  role: string;
  cpu: number;    // %
  mem: number;    // %
  load: number;   // 1m load avg
  status: "ok" | "warn" | "crit";
}

// Deterministic fleet across three datacenters and a few roles.
const ROLES = ["trading", "db", "k8s", "edge", "storage"];
const DCS = ["dc-blr-1", "dc-fra-1", "dc-nyc-1"];
function mkHosts(): Host[] {
  const out: Host[] = [];
  let n = 1;
  for (const dc of DCS) {
    const count = dc === "dc-blr-1" ? 34 : dc === "dc-fra-1" ? 22 : 16;
    for (let i = 0; i < count; i++) {
      const role = ROLES[(n + i) % ROLES.length];
      const cpu = Math.round(18 + ((n * 37 + i * 13) % 78));
      const mem = Math.round(30 + ((n * 19 + i * 29) % 65));
      const load = Math.round((0.4 + ((n * 7 + i * 11) % 40) / 10) * 10) / 10;
      const status: Host["status"] = cpu > 88 || mem > 92 ? "crit" : cpu > 75 || mem > 82 ? "warn" : "ok";
      out.push({ name: `${role}-${dc.split("-")[1]}${String(i + 1).padStart(2, "0")}`, dc, role, cpu, mem, load, status });
      n++;
    }
  }
  return out;
}
const HOSTS = mkHosts();

type Metric = "cpu" | "mem" | "load";
const METRIC_MAX: Record<Metric, number> = { cpu: 100, mem: 100, load: 6 };

// Green→amber→red fill by metric intensity.
function fill(v: number, max: number): string {
  const t = Math.min(1, v / max);
  if (t < 0.5) return "#10b981";
  if (t < 0.7) return "#84cc16";
  if (t < 0.82) return "#f59e0b";
  if (t < 0.92) return "#f97316";
  return "#dc2626";
}

// Pointy-top hexagon path in a 100×100 viewBox cell.
const HEX = "50,3 93,26 93,74 50,97 7,74 7,26";

export default function HostMapScreen() {
  const [metric, setMetric] = React.useState<Metric>("cpu");
  const [groupBy, setGroupBy] = React.useState<"dc" | "role">("dc");
  const [hover, setHover] = React.useState<Host | null>(null);

  const groups = groupBy === "dc" ? DCS : ROLES;
  const val = (h: Host) => (metric === "cpu" ? h.cpu : metric === "mem" ? h.mem : h.load);
  const unit = metric === "load" ? "" : "%";
  const crit = HOSTS.filter((h) => h.status === "crit").length;
  const warn = HOSTS.filter((h) => h.status === "warn").length;
  const avg = Math.round(HOSTS.reduce((s, h) => s + val(h), 0) / HOSTS.length * 10) / 10;

  return (
    <div className="page page-fade sn-dash">
      <div className="sn-breadcrumb">
        <a className="sn-link">Home</a><span className="sn-bc-sep">›</span>
        <a className="sn-link">Infrastructure</a><span className="sn-bc-sep">›</span>
        <span>Host Map</span>
      </div>

      <div className="sn-form-header">
        <div className="sn-form-title-row">
          <span className="sn-rec-number">HOST MAP</span>
          <span className="sn-pill state-neutral"><i className="fa-solid fa-server" /> {HOSTS.length} hosts</span>
          {crit > 0 && <span className="sn-pill prio-1"><i className="fa-solid fa-fire" /> {crit} critical</span>}
          <span className="sn-pill state-progress"><i className="fa-solid fa-triangle-exclamation" /> {warn} warning</span>
        </div>
        <div className="sn-form-title-meta">
          <div>
            <h1>Host Map · {metric.toUpperCase()}</h1>
            <div className="sn-form-sub">Live fleet health across {DCS.length} datacenters · fill by {metric} · grouped by {groupBy}</div>
          </div>
          <div className="sn-form-actions">
            <div className="mx-seg">
              {(["cpu", "mem", "load"] as Metric[]).map((m) => <button key={m} className={metric === m ? "on" : ""} onClick={() => setMetric(m)}>{m}</button>)}
            </div>
            <div className="mx-seg">
              {(["dc", "role"] as const).map((g) => <button key={g} className={groupBy === g ? "on" : ""} onClick={() => setGroupBy(g)}>{g}</button>)}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 24px 0" }}>
        <div className="sn-kpi-strip">
          <Kpi l="Hosts" v={HOSTS.length} s={`${DCS.length} datacenters`} tone="neutral" />
          <Kpi l={`Avg ${metric}`} v={<>{avg}<span style={{ fontSize: 13, color: "#8a94a3" }}>{unit}</span></>} s="across fleet" tone={avg > 75 ? "warn" : "ok"} />
          <Kpi l="Critical" v={crit} s="needs attention" tone="crit" />
          <Kpi l="Warning" v={warn} s="elevated" tone="warn" />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 16, padding: "16px 24px 24px" }}>
        <div className="card" style={{ background: "white", border: "1px solid #e5e8eb", borderRadius: 6, padding: 18 }}>
          {groups.map((g) => {
            const members = HOSTS.filter((h) => (groupBy === "dc" ? h.dc : h.role) === g);
            return (
              <div key={g} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#475467", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                  <i className={`fa-solid ${groupBy === "dc" ? "fa-warehouse" : "fa-layer-group"}`} style={{ color: "var(--accent)" }} /> {g}
                  <span style={{ fontWeight: 400, color: "#8a94a3" }}>· {members.length} hosts</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, 52px)", gap: 4 }}>
                  {members.map((h) => (
                    <svg key={h.name} viewBox="0 0 100 100" width={52} height={52} style={{ cursor: "pointer", display: "block" }}
                      onMouseEnter={() => setHover(h)} onMouseLeave={() => setHover(null)}>
                      <polygon points={HEX} fill={fill(val(h), METRIC_MAX[metric])} stroke={hover?.name === h.name ? "#0f1c3f" : "white"} strokeWidth={hover?.name === h.name ? 4 : 2} />
                      <text x="50" y="56" textAnchor="middle" fontSize="20" fontWeight="700" fill="white">{Math.round(val(h))}</text>
                    </svg>
                  ))}
                </div>
              </div>
            );
          })}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, fontSize: 11, color: "#8a94a3" }}>
            <span>low</span>
            {["#10b981", "#84cc16", "#f59e0b", "#f97316", "#dc2626"].map((c) => <span key={c} style={{ width: 26, height: 10, background: c, borderRadius: 2 }} />)}
            <span>high {metric}{unit}</span>
          </div>
        </div>

        {/* Hover detail rail */}
        <aside>
          <div className="card" style={{ background: "white", border: "1px solid #e5e8eb", borderRadius: 6, padding: 16, position: "sticky", top: 16 }}>
            {hover ? (
              <>
                <div className="mono" style={{ fontWeight: 700, fontSize: 13, color: "#0f1c3f" }}>{hover.name}</div>
                <div style={{ fontSize: 11, color: "#8a94a3", marginBottom: 12 }}>{hover.dc} · {hover.role}</div>
                {([["CPU", hover.cpu, "%"], ["Memory", hover.mem, "%"], ["Load 1m", hover.load, ""]] as const).map(([l, v, u]) => (
                  <div key={l} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 3 }}>
                      <span style={{ color: "#475467" }}>{l}</span><span className="mono" style={{ fontWeight: 700 }}>{v}{u}</span>
                    </div>
                    <div style={{ height: 7, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: `${Math.min(100, (v / (l === "Load 1m" ? 6 : 100)) * 100)}%`, height: "100%", background: fill(v, l === "Load 1m" ? 6 : 100), borderRadius: 4 }} />
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: 8, paddingTop: 10, borderTop: "1px solid #eef1f4", fontSize: 12 }}>
                  Status: <b style={{ color: hover.status === "crit" ? "#dc2626" : hover.status === "warn" ? "#b45309" : "#059669" }}>{hover.status.toUpperCase()}</b>
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center", color: "#8a94a3", fontSize: 12, padding: "24px 8px" }}>
                <i className="fa-solid fa-hexagon-nodes" style={{ fontSize: 28, opacity: 0.4, display: "block", marginBottom: 10 }} />
                Hover a hex to inspect a host.
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
