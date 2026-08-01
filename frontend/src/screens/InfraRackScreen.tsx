// Physical datacenter rack visualization — realistic 42U elevations modeled on
// the datacenter-rack reference. Multiple racks per site (picker), front and
// rear views (PSUs / fans / cabling on the rear), labeled callouts, and
// click-through to device monitoring.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { Kpi, FormSection, Field } from "@/components/primitives";
import { useRacks } from "@/api/hooks";
import { RACKS, type Rack, type RackUnit } from "@/data/racks";

const U_TOTAL = 42;
const U_H = 15; // px per rack unit

const statusColor = (s: string) => (s === "ok" ? "#10b981" : s === "warn" ? "#f59e0b" : "#ef4444");

/* ── shared faceplate atoms ──────────────────────────────────────────────── */

function PortGrid({ n, lit, cable }: { n: number; lit: number; cable?: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${n / 2}, 1fr)`, gap: 2, flex: 1, maxWidth: 320 }}>
      {Array.from({ length: n }).map((_, i) => (
        <span key={i} style={{
          height: 8, borderRadius: 1,
          background: i < lit ? (cable ?? "#22c55e") : "#0b0f14",
          border: "1px solid #262b33",
          boxShadow: i < lit ? `0 0 4px ${cable ?? "#22c55e"}` : "none",
        }} title={i < lit ? "link up" : "no link"} />
      ))}
    </div>
  );
}

function DriveBays({ n, vertical, failed }: { n: number; vertical?: boolean; failed?: number }) {
  return (
    <div style={{ display: "flex", gap: 3, flex: 1, maxWidth: 340 }}>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} style={{
          flex: 1, height: vertical ? 26 : 14,
          background: "linear-gradient(180deg,#20242c,#141820)",
          border: "1px solid #2c313a", borderRadius: 2,
          display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 2,
        }}>
          <span style={{ width: 3, height: 3, borderRadius: "50%", background: i === failed ? "#ef4444" : "#22c55e", boxShadow: `0 0 3px ${i === failed ? "#ef4444" : "#22c55e"}` }} />
        </div>
      ))}
    </div>
  );
}

function VentGrille({ w = 54 }: { w?: number }) {
  return (
    <div style={{
      width: w, alignSelf: "stretch", borderRadius: 2, flexShrink: 0,
      backgroundImage: "radial-gradient(circle, #2e333c 1.2px, transparent 1.3px)",
      backgroundSize: "5px 5px", border: "1px solid #262b33",
    }} />
  );
}

function Lcd({ text, color = "#67e8f9" }: { text: string; color?: string }) {
  return (
    <div style={{
      background: "#082f49", border: "1px solid #0c4a6e", borderRadius: 2,
      padding: "2px 8px", color, fontSize: 9.5, fontFamily: "var(--font-mono)",
      fontWeight: 700, letterSpacing: 0.4, flexShrink: 0, boxShadow: "inset 0 0 6px rgba(103,232,249,.25)",
    }}>{text}</div>
  );
}

/* rear-side atoms */

function Psu({ ok = true }: { ok?: boolean }) {
  return (
    <div style={{ width: 44, alignSelf: "stretch", minHeight: 14, background: "linear-gradient(180deg,#262b33,#181c23)", border: "1px solid #333945", borderRadius: 2, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px" }} title={ok ? "PSU · OK" : "PSU · failed"}>
      <span style={{ width: 8, height: 8, background: "#0b0f14", border: "1px solid #3a414c", borderRadius: 1 }} />
      <span style={{ width: 4, height: 4, borderRadius: "50%", background: ok ? "#22c55e" : "#ef4444", boxShadow: `0 0 4px ${ok ? "#22c55e" : "#ef4444"}` }} />
    </div>
  );
}

function FanBank({ n = 4, failed }: { n?: number; failed?: number }) {
  return (
    <div style={{ display: "flex", gap: 3, flex: 1, maxWidth: 220 }}>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} style={{ flex: 1, height: 16, borderRadius: 2, border: "1px solid #2c313a", background: "radial-gradient(circle at 50% 50%, #2a303a 25%, #171b22 70%)", display: "grid", placeItems: "center" }} title={i === failed ? "fan failed" : "fan OK"}>
          <span style={{ width: 3, height: 3, borderRadius: "50%", background: i === failed ? "#ef4444" : "#22c55e", boxShadow: `0 0 3px ${i === failed ? "#ef4444" : "#22c55e"}` }} />
        </div>
      ))}
    </div>
  );
}

function CableBundle({ color = "#3b82f6", n = 6 }: { color?: string; n?: number }) {
  return (
    <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
      {Array.from({ length: n }).map((_, i) => (
        <span key={i} style={{ width: 3, height: 16, borderRadius: 2, background: color, opacity: 0.5 + (i % 3) * 0.18 }} />
      ))}
    </div>
  );
}

/* ── faceplates ──────────────────────────────────────────────────────────── */

function FrontFace({ r }: { r: RackUnit }) {
  switch (r.kind) {
    case "patch":
      return (<><VentGrille w={20} /><PortGrid n={24} lit={18} cable="#3b82f6" /><span style={{ color: "#5b6472", fontSize: 8.5, fontFamily: "var(--font-mono)" }}>{r.model.includes("fiber") ? "OM4" : "CAT6A"}</span></>);
    case "switch":
      return (
        <>
          <span style={{ color: "#8b94a3", fontSize: 8.5, fontFamily: "var(--font-mono)", flexShrink: 0 }}>SYS<br />STAT</span>
          <PortGrid n={24} lit={r.status === "crit" ? 9 : 20} />
          <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
            {[0, 1, 2, 3].map((i) => <span key={i} style={{ width: 10, height: 8, background: i < 2 ? "#22c55e" : "#0b0f14", border: "1px solid #262b33", borderRadius: 1, boxShadow: i < 2 ? "0 0 4px #22c55e" : "none" }} />)}
          </div>
          <span style={{ color: "#5b6472", fontSize: 8.5 }}>SFP+</span>
        </>
      );
    case "router":
      return (<><Lcd text="ASR · WAN" color="#93c5fd" /><PortGrid n={12} lit={8} cable="#3b82f6" /><VentGrille w={26} /></>);
    case "firewall":
      return (
        <>
          <Lcd text={`${r.model.split(" ")[0].toUpperCase()} · ${r.status === "warn" ? "HA-SYNC" : "ACTIVE"}`} />
          <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
            {["#22c55e", "#22c55e", r.status === "warn" ? "#f59e0b" : "#22c55e", "#22c55e"].map((c, i) => <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: c, boxShadow: `0 0 4px ${c}` }} />)}
          </div>
          <PortGrid n={12} lit={9} />
          <VentGrille w={26} />
        </>
      );
    case "server":
      return (
        <>
          <VentGrille />
          <DriveBays n={6} failed={r.status === "crit" ? 2 : undefined} />
          <div style={{ display: "flex", flexDirection: "column", gap: 3, flexShrink: 0, alignItems: "center" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusColor(r.status), boxShadow: `0 0 5px ${statusColor(r.status)}` }} />
            <span style={{ width: 8, height: 8, borderRadius: "50%", border: "1.5px solid #3b82f6", boxShadow: "0 0 4px #3b82f6" }} title="power" />
          </div>
        </>
      );
    case "nas":
      return (<><span style={{ color: "#8b94a3", fontSize: 8.5, fontFamily: "var(--font-mono)", flexShrink: 0 }}>NAS</span><DriveBays n={8} /><span style={{ width: 6, height: 6, borderRadius: "50%", background: statusColor(r.status), boxShadow: `0 0 5px ${statusColor(r.status)}`, flexShrink: 0 }} /></>);
    case "storage":
    case "raid":
      return (
        <>
          <VentGrille w={24} />
          <DriveBays n={10} vertical={r.kind === "storage"} failed={r.status === "warn" ? 6 : undefined} />
          <div style={{ display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 4px #22c55e" }} />
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: statusColor(r.status), boxShadow: `0 0 4px ${statusColor(r.status)}` }} />
          </div>
        </>
      );
    case "tape":
      return (
        <>
          <Lcd text="LTO-9 · VAULT" color="#cbd5e1" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 3, flex: 1, maxWidth: 300 }}>
            {Array.from({ length: 16 }).map((_, i) => <span key={i} style={{ height: 10, background: i % 5 === 0 ? "#0b0f14" : "#3f4650", border: "1px solid #2c313a", borderRadius: 1 }} title={i % 5 === 0 ? "empty slot" : "cartridge"} />)}
          </div>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 5px #22c55e", flexShrink: 0 }} />
        </>
      );
    case "loadbal":
      return (<><Lcd text="LOAD BALANCER" color="#86efac" /><PortGrid n={12} lit={8} /><VentGrille w={22} /></>);
    case "ups":
      return (
        <>
          <VentGrille w={70} />
          <div style={{ flex: 1 }} />
          <div style={{ background: "#082f49", border: "1px solid #0c4a6e", borderRadius: 3, padding: "6px 14px", color: "#67e8f9", fontFamily: "var(--font-mono)", textAlign: "center", boxShadow: "inset 0 0 10px rgba(103,232,249,.3)" }}>
            <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1 }}>230<span style={{ fontSize: 9 }}>V</span></div>
            <div style={{ fontSize: 8.5, color: "#38bdf8" }}>Online</div>
          </div>
          <div style={{ flex: 1 }} />
          <VentGrille w={70} />
        </>
      );
    case "pdu":
      return (
        <>
          <span style={{ width: 14, height: 20, background: "#7f1d1d", border: "1px solid #b91c1c", borderRadius: 2, flexShrink: 0, boxShadow: "inset 0 -8px 0 #dc2626" }} title="master switch" />
          <div style={{ display: "flex", gap: 4, flex: 1, maxWidth: 340 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ flex: 1, height: 16, background: "#0b0f14", border: "1px solid #2c313a", borderRadius: 2, display: "grid", placeItems: "center" }}>
                <span style={{ width: 6, height: 6, background: "#1f242c", border: "1px solid #343a44", borderRadius: 1 }} />
              </div>
            ))}
          </div>
          <span style={{ color: "#5b6472", fontSize: 8.5, fontFamily: "var(--font-mono)" }}>32A</span>
        </>
      );
    default:
      return null;
  }
}

function RearFace({ r }: { r: RackUnit }) {
  switch (r.kind) {
    case "patch":
      return (<><CableBundle color="#3b82f6" n={10} /><div style={{ flex: 1 }} /><span style={{ color: "#5b6472", fontSize: 8.5, fontFamily: "var(--font-mono)" }}>punch-down</span><CableBundle color="#3b82f6" n={10} /></>);
    case "switch":
    case "router":
    case "firewall":
    case "loadbal":
      return (
        <>
          <Psu /><Psu ok={r.status !== "crit"} />
          <FanBank n={4} failed={r.status === "crit" ? 1 : undefined} />
          <div style={{ flex: 1 }} />
          <span style={{ color: "#5b6472", fontSize: 8, fontFamily: "var(--font-mono)" }}>MGMT</span>
          <span style={{ width: 12, height: 9, background: "#22c55e", border: "1px solid #262b33", borderRadius: 1, boxShadow: "0 0 4px #22c55e", flexShrink: 0 }} title="mgmt · up" />
          <CableBundle color={r.kind === "firewall" ? "#f97316" : "#22c55e"} n={5} />
        </>
      );
    case "server":
      return (
        <>
          <Psu /><Psu ok={r.status !== "crit"} />
          <FanBank n={3} />
          <div style={{ flex: 1 }} />
          <span style={{ color: "#5b6472", fontSize: 8, fontFamily: "var(--font-mono)" }}>iDRAC</span>
          <span style={{ width: 12, height: 9, background: r.status === "crit" ? "#ef4444" : "#22c55e", border: "1px solid #262b33", borderRadius: 1, boxShadow: `0 0 4px ${r.status === "crit" ? "#ef4444" : "#22c55e"}`, flexShrink: 0 }} title="OOB mgmt" />
          <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
            {[0, 1].map((i) => <span key={i} style={{ width: 12, height: 9, background: "#22c55e", border: "1px solid #262b33", borderRadius: 1, boxShadow: "0 0 4px #22c55e" }} title={`NIC ${i + 1} · 25G`} />)}
          </div>
        </>
      );
    case "nas":
    case "storage":
    case "raid":
      return (
        <>
          <Psu /><Psu />
          <FanBank n={4} failed={r.status === "warn" ? 2 : undefined} />
          <div style={{ flex: 1 }} />
          <span style={{ color: "#5b6472", fontSize: 8, fontFamily: "var(--font-mono)" }}>CTRL A/B</span>
          <CableBundle color="#f59e0b" n={4} />
        </>
      );
    case "tape":
      return (<><Psu /><FanBank n={2} /><div style={{ flex: 1 }} /><span style={{ color: "#5b6472", fontSize: 8, fontFamily: "var(--font-mono)" }}>SAS ×4</span><CableBundle color="#64748b" n={4} /></>);
    case "ups":
      return (
        <>
          <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
            {Array.from({ length: 4 }).map((_, i) => <span key={i} style={{ width: 12, height: 22, background: "#101418", border: "1px solid #2c313a", borderRadius: 2, boxShadow: i === 0 ? "inset 0 -10px 0 #16a34a" : "inset 0 -10px 0 #1f242c" }} title={`breaker ${i + 1}`} />)}
          </div>
          <VentGrille w={90} />
          <div style={{ flex: 1 }} />
          <Lcd text={`BATT · ${r.status === "warn" ? "11m" : "OK"}`} color={r.status === "warn" ? "#fbbf24" : "#67e8f9"} />
          <CableBundle color="#dc2626" n={3} />
        </>
      );
    case "pdu":
      return (
        <>
          <div style={{ display: "flex", gap: 4, flex: 1, maxWidth: 360 }}>
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} style={{ flex: 1, height: 16, background: "#0b0f14", border: "1px solid #2c313a", borderRadius: 2, display: "grid", placeItems: "center" }}>
                <span style={{ width: 4, height: 4, borderRadius: "50%", background: i < 8 ? "#22c55e" : "#1f242c", boxShadow: i < 8 ? "0 0 3px #22c55e" : "none" }} title={i < 8 ? "outlet in use" : "free outlet"} />
              </div>
            ))}
          </div>
          <span style={{ color: "#5b6472", fontSize: 8.5, fontFamily: "var(--font-mono)" }}>C13 ×24</span>
        </>
      );
    default:
      return null;
  }
}

/* ── screen ──────────────────────────────────────────────────────────────── */

export default function InfraRackScreen() {
  const { setRoute } = useNav();
  const { data } = useRacks();
  const racks = data && data.length ? data : RACKS;
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const [hover, setHover] = React.useState<string | null>(null);
  const [rackId, setRackId] = React.useState<string | null>(null);
  const [side, setSide] = React.useState<"front" | "rear">("front");
  const toggle = (id: string) => setCollapsed((c) => ({ ...c, [id]: !c[id] }));

  const rack = racks.find((r) => r.id === rackId) ?? racks[0];
  const units = rack.units;
  const occupied = units.reduce((n, r) => n + (r.uTop - r.uBottom + 1), 0);
  const counts = {
    ok: units.filter((r) => r.status === "ok").length,
    warn: units.filter((r) => r.status === "warn").length,
    crit: units.filter((r) => r.status === "crit").length,
  };
  const open = (r: RackUnit) => {
    if (!r.device) return;
    const route =
      r.kind === "firewall" ? "firewall-detail"
      : r.kind === "switch" ? "switch-detail"
      : r.kind === "server" ? "server-detail"
      : ["storage", "raid", "nas"].includes(r.kind) ? "storage-detail"
      : r.kind === "loadbal" ? "loadbal-detail"
      : r.kind === "ups" ? "ups-detail"
      : "infra-device";
    setRoute(route, { deviceId: r.device });
  };
  const callouts = units.filter((r) => r.label);
  const uLabel = (r: RackUnit) => (r.uTop === r.uBottom ? `U${String(r.uTop).padStart(2, "0")}` : `U${String(r.uBottom).padStart(2, "0")}–${String(r.uTop).padStart(2, "0")}`);

  return (
    <div className="page page-fade sn-dash">
      <div className="sn-breadcrumb">
        <a className="sn-link">Home</a><span className="sn-bc-sep">›</span>
        <a className="sn-link" onClick={() => setRoute("infra")}>Infrastructure</a><span className="sn-bc-sep">›</span>
        <a className="sn-link">Bangalore DC-1</a><span className="sn-bc-sep">›</span>
        <span>Rack {rack.id} · {rack.row}</span>
      </div>

      <div className="sn-form-header">
        <div className="sn-form-title-row">
          <span className="sn-rec-number">RACK-{rack.id}</span>
          <span className="sn-pill svc-healthy"><i className="fa-solid fa-circle" /> {counts.ok} / {units.length} healthy</span>
          <span className="sn-pill state-mitigating"><i className="fa-solid fa-circle" /> {counts.warn} warning</span>
          <span className="sn-pill prio-1"><i className="fa-solid fa-circle" /> {counts.crit} critical</span>
        </div>
        <div className="sn-form-title-meta">
          <div>
            <h1>Datacenter Rack · {rack.id} / {rack.row}</h1>
            <div className="sn-form-sub">dc-blr-1 · {rack.role} · 42U enclosure · {occupied}U occupied · {rack.powerKw} kW load · {Math.round(rack.powerKw / rack.capacityKw * 100)}% capacity · ambient {rack.inletC}°C</div>
          </div>
          <div className="sn-form-actions">
            <button className="sn-btn"><i className="fa-solid fa-camera" /> Photo</button>
            <button className="sn-btn"><i className="fa-solid fa-arrow-up-right-from-square" /> Open in CMDB</button>
            <button className="sn-btn primary"><i className="fa-solid fa-plus" /> Add Device</button>
          </div>
        </div>
      </div>

      {/* Rack picker — all racks in Row C */}
      <div style={{ display: "flex", gap: 10, padding: "14px 24px 0", flexWrap: "wrap" }}>
        {racks.map((r) => {
          const active = r.id === rackId;
          const crit = r.units.some((u) => u.status === "crit");
          const warn = r.units.some((u) => u.status === "warn");
          const tone = crit ? "#ef4444" : warn ? "#f59e0b" : "#10b981";
          return (
            <div key={r.id} onClick={() => { setRackId(r.id); setHover(null); }}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", background: "white", cursor: "pointer",
                border: `1.5px solid ${active ? "#0ea5e9" : "#dde2e8"}`, borderRadius: 8,
                boxShadow: active ? "0 0 0 3px rgba(14,165,233,.15)" : "0 1px 2px rgba(15,25,35,.05)", minWidth: 210,
              }}>
              {/* mini rack glyph */}
              <div style={{ width: 22, height: 34, background: "#171b22", borderRadius: 3, border: "1px solid #2c313a", display: "flex", flexDirection: "column", gap: 1.5, padding: 2 }}>
                {Array.from({ length: 7 }).map((_, i) => <span key={i} style={{ flex: 1, borderRadius: 1, background: i % 3 === 0 ? tone : "#2b303a" }} />)}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 12.5 }}>Rack {r.id} <span style={{ color: "var(--fg-muted)", fontWeight: 500 }}>· {r.role}</span></div>
                <div style={{ fontSize: 10.5, color: "#5b6472" }}>{r.units.length} devices · {r.powerKw} kW · <span style={{ color: tone, fontWeight: 700 }}>{crit ? "critical" : warn ? "warning" : "healthy"}</span></div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="sn-kpi-strip">
        <Kpi l="Rack units" v={`${occupied} / 42`} s="U occupied" tone="neutral" />
        <Kpi l="Power draw" v={`${rack.powerKw} kW`} s={`${Math.round(rack.powerKw / rack.capacityKw * 100)}% of capacity`} tone={rack.powerKw / rack.capacityKw > 0.8 ? "warn" : "ok"} />
        <Kpi l="Ambient temp" v={`${rack.inletC}°C`} s="within range" tone="ok" />
        <Kpi l="Devices" v={units.length} s="in this rack" tone="neutral" />
        <Kpi l="Critical" v={counts.crit} s={counts.crit ? "attention" : "none"} tone={counts.crit ? "crit" : "ok"} />
        <Kpi l="Last audit" v="3d" s="ago" tone="neutral" />
      </div>

      <div className="sn-form-layout">
        <div className="sn-form-main">
          <FormSection id="rack" title="Physical Rack View" badge={`42U · ${side} elevation`} collapsed={collapsed.rack} onToggle={toggle}>
            <div style={{ padding: 20, background: "#f4f6f8" }}>
              {/* front / rear toggle */}
              <div style={{ display: "flex", justifyContent: "center", gap: 0, marginBottom: 14 }}>
                {(["front", "rear"] as const).map((s) => (
                  <button key={s} className="sn-btn" onClick={() => setSide(s)}
                    style={{
                      padding: "5px 22px", fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6,
                      borderRadius: s === "front" ? "6px 0 0 6px" : "0 6px 6px 0",
                      background: side === s ? "#16212e" : "white", color: side === s ? "white" : "#5b6472",
                      border: `1px solid ${side === s ? "#16212e" : "#d2d6dc"}`,
                    }}>
                    <i className={`fa-solid ${s === "front" ? "fa-square-caret-down" : "fa-plug"}`} style={{ marginRight: 6 }} />{s}
                  </button>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "230px minmax(430px, 1fr) 150px", gap: 18, alignItems: "start" }}>

                {/* Left: labeled callout cards */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10, position: "sticky", top: 12 }}>
                  {callouts.map((r) => (
                    <div key={r.asset}
                      onMouseEnter={() => setHover(r.asset)} onMouseLeave={() => setHover(null)}
                      onClick={() => open(r)}
                      style={{
                        display: "flex", gap: 10, padding: "10px 12px", background: "white",
                        border: `1.5px solid ${hover === r.asset ? r.color : "#dde2e8"}`,
                        borderRadius: 10, cursor: r.device ? "pointer" : "default",
                        boxShadow: hover === r.asset ? `0 2px 10px ${r.color}33` : "0 1px 2px rgba(15,25,35,.05)",
                        transition: "border-color .15s, box-shadow .15s",
                      }}>
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: "#0f1723", color: r.color, display: "grid", placeItems: "center", fontSize: 14, flexShrink: 0 }}>
                        <i className={`fa-solid ${r.icon}`} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: 12.5, color: r.color, letterSpacing: 0.2 }}>{r.label.toUpperCase()}</div>
                        <div style={{ fontSize: 10.5, color: "#5b6472", lineHeight: 1.45 }}>{r.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Center: rack chassis */}
                <div style={{
                  background: "linear-gradient(180deg,#23272e,#171a20)", borderRadius: 10,
                  border: "6px solid #14171c", boxShadow: "0 14px 34px rgba(0,0,0,.35), inset 0 0 0 1px rgba(255,255,255,.05)",
                  padding: "12px 6px 10px",
                }}>
                  <div style={{ color: "#8b94a3", fontSize: 10, textAlign: "center", marginBottom: 8, letterSpacing: "0.18em", fontWeight: 700 }}>{side.toUpperCase()} · 42U</div>

                  <div style={{ display: "grid", gridTemplateColumns: "24px 1fr 24px", gap: 4 }}>
                    {/* left U-rail numbers */}
                    <div style={{ display: "grid", gridTemplateRows: `repeat(${U_TOTAL}, ${U_H}px)`, rowGap: 2 }}>
                      {Array.from({ length: U_TOTAL }).map((_, i) => (
                        <span key={i} style={{ color: "#59606c", fontSize: 8, fontFamily: "var(--font-mono)", display: "grid", placeItems: "center" }}>{U_TOTAL - i}</span>
                      ))}
                    </div>

                    <div style={{ position: "relative", display: "grid", gridTemplateRows: `repeat(${U_TOTAL}, ${U_H}px)`, rowGap: 2 }}>
                      {Array.from({ length: U_TOTAL }).map((_, i) => (
                        <div key={i} style={{ gridRow: `${i + 1} / span 1`, gridColumn: 1, background: "repeating-linear-gradient(90deg,#1b1f26 0 10px,#181c22 10px 20px)", border: "1px solid #242932", borderRadius: 2 }} />
                      ))}
                      {units.map((r) => {
                        const rowStart = U_TOTAL - r.uTop + 1;
                        const span = r.uTop - r.uBottom + 1;
                        const active = hover === r.asset;
                        return (
                          <div key={r.asset}
                            onMouseEnter={() => setHover(r.asset)} onMouseLeave={() => setHover(null)}
                            onClick={() => open(r)}
                            title={`${r.asset} · ${r.model}${r.ip ? ` · ${r.ip}` : ""}`}
                            style={{
                              gridRow: `${rowStart} / span ${span}`, gridColumn: 1, zIndex: 1,
                              background: side === "front"
                                ? "linear-gradient(180deg,#2b303a 0%,#1d212a 55%,#171b23 100%)"
                                : "linear-gradient(180deg,#232830 0%,#191d25 55%,#14181f 100%)",
                              border: `1px solid ${active ? r.color : "#3a404b"}`,
                              borderLeft: `3px solid ${r.color}`,
                              borderRadius: 3, padding: "3px 8px",
                              display: "flex", alignItems: "center", gap: 8,
                              cursor: r.device ? "pointer" : "default",
                              boxShadow: active ? `0 0 0 1px ${r.color}, 0 0 14px ${r.color}55` : "inset 0 1px 0 rgba(255,255,255,.05)",
                              overflow: "hidden", transition: "box-shadow .15s, border-color .15s",
                            }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusColor(r.status), boxShadow: `0 0 6px ${statusColor(r.status)}`, flexShrink: 0 }} />
                            {side === "front" ? <FrontFace r={r} /> : <RearFace r={r} />}
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ display: "grid", gridTemplateRows: `repeat(${U_TOTAL}, ${U_H}px)`, rowGap: 2 }}>
                      {Array.from({ length: U_TOTAL }).map((_, i) => (
                        <span key={i} style={{ color: "#59606c", fontSize: 8, fontFamily: "var(--font-mono)", display: "grid", placeItems: "center" }}>{U_TOTAL - i}</span>
                      ))}
                    </div>
                  </div>

                  <div style={{ color: "#59606c", fontSize: 9, textAlign: "center", marginTop: 9, fontFamily: "var(--font-mono)" }}>argus-linkedeye · dc-blr-1 · {rack.id} · {rack.row.toLowerCase()}</div>
                </div>

                {/* Right: chips + asset callouts */}
                <div style={{ display: "grid", gridTemplateRows: `repeat(${U_TOTAL}, ${U_H + 2}px)`, alignItems: "center" }}>
                  {units.filter((r) => r.chip || r.ip).map((r) => {
                    const rowStart = U_TOTAL - r.uTop + 1;
                    const span = r.uTop - r.uBottom + 1;
                    return (
                      <div key={r.asset}
                        onMouseEnter={() => setHover(r.asset)} onMouseLeave={() => setHover(null)}
                        onClick={() => open(r)}
                        style={{ gridRow: `${rowStart} / span ${span}`, display: "flex", alignItems: "center", gap: 6, cursor: r.device ? "pointer" : "default" }}>
                        <span style={{ width: 10, height: 2, background: r.chip ? "#2563eb" : r.color, flexShrink: 0 }} />
                        {r.chip ? (
                          <span style={{ background: "#2563eb", color: "white", fontSize: 10, fontWeight: 800, letterSpacing: 0.3, borderRadius: 6, padding: "4px 9px", boxShadow: hover === r.asset ? "0 0 0 2px #93c5fd" : "0 1px 3px rgba(37,99,235,.4)", whiteSpace: "nowrap" }}>
                            <i className="fa-solid fa-server" style={{ marginRight: 5, fontSize: 9 }} />{r.chip}
                          </span>
                        ) : (
                          <span className="mono" style={{ fontSize: 9, color: "#5b6472", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.asset}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </FormSection>

          <FormSection id="inv" title="Rack Inventory" badge={`${units.length} devices`} collapsed={collapsed.inv} onToggle={toggle}>
            <table className="sn-list-table">
              <thead><tr><th style={{ width: 80 }}>U</th><th>Device</th><th>Model</th><th style={{ width: 150 }}>Asset ID</th><th style={{ width: 110 }}>IP</th><th style={{ width: 110 }}>Status</th></tr></thead>
              <tbody>
                {units.map((r) => (
                  <tr key={r.asset} onClick={() => (r.device ? open(r) : undefined)} style={{ cursor: r.device ? "pointer" : "default" }}>
                    <td className="mono"><b>{uLabel(r)}</b></td>
                    <td>
                      <div className="row row-8">
                        <span className="kind-mini" style={{ color: r.color, background: r.color + "18" }}><i className={`fa-solid ${r.icon}`} /></span>
                        <b>{r.label || r.chip || r.kind.toUpperCase()}</b>
                      </div>
                    </td>
                    <td className="mono text-mute" style={{ fontSize: 11.5 }}>{r.model}</td>
                    <td><a className="sn-link mono">{r.asset}</a></td>
                    <td className="mono">{r.ip || "—"}</td>
                    <td><span className={`sn-state-pill ${r.status === "ok" ? "svc-healthy" : r.status === "warn" ? "state-mitigating" : "state-active"}`}><i className="fa-solid fa-circle" /> {r.status === "ok" ? "healthy" : r.status === "warn" ? "warning" : "critical"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </FormSection>
        </div>

        <aside className="sn-form-side">
          <div className="sn-side-card">
            <div className="sn-side-head">Rack Identity</div>
            <div className="sn-side-body">
              <Field label="Rack ID" value={<span className="mono"><b>RACK-{rack.id}</b></span>} />
              <Field label="Site" value="Bangalore DC-1" />
              <Field label="Row · Position" value={`${rack.row} · Position ${rack.id.replace("R", "")}`} />
              <Field label="Role" value={rack.role} />
              <Field label="Total height" value="42U" />
              <Field label="Occupied" value={`${occupied}U / 42U`} />
              <Field label="Free U" value={`${42 - occupied}U available`} />
              <Field label="Owner" value="NetOps · Priya R." />
              <Field label="Last audit" value="3 days ago" />
            </div>
          </div>

          <div className="sn-side-card">
            <div className="sn-side-head">Power & Cooling</div>
            <div className="sn-side-body">
              <Field label="Power draw" value={<span className={rack.powerKw / rack.capacityKw > 0.8 ? "tone-warn" : "tone-ok"}><b>{rack.powerKw}</b> kW</span>} />
              <Field label="Capacity" value={`${rack.capacityKw} kW · ${Math.round(rack.powerKw / rack.capacityKw * 100)}%`} />
              <Field label="PDU A" value={<span className="tone-ok">{Math.round(rack.powerKw / 2)} kW · ok</span>} />
              <Field label="PDU B" value={<span className="tone-ok">{Math.round(rack.powerKw / 2)} kW · ok</span>} />
              <Field label="UPS runtime" value={<span className={rack.upsRuntime.startsWith("1") && rack.id === "R12" ? "tone-warn" : "tone-ok"}>{rack.upsRuntime}</span>} />
              <Field label="Inlet temp" value={`${rack.inletC}°C`} />
              <Field label="Exhaust temp" value={`${rack.exhaustC}°C`} />
              <Field label="Humidity" value={`${rack.humidity}%`} />
            </div>
          </div>

          <div className="sn-side-card">
            <div className="sn-side-head">Related Records <span className="sn-side-count">3</span></div>
            <div className="sn-side-body">
              <div className="sn-related-row">
                <div><div className="sn-related-title">Switch fan failure</div><div className="sn-related-meta">Incident · 8m ago</div></div>
                <a className="sn-link mono">INC-48298</a>
              </div>
              <div className="sn-related-row">
                <div><div className="sn-related-title">UPS battery runtime</div><div className="sn-related-meta">Problem · investigating</div></div>
                <a className="sn-link mono">PRB-3920</a>
              </div>
              <div className="sn-related-row">
                <div><div className="sn-related-title">Server 5 hot-swap</div><div className="sn-related-meta">Change · scheduled</div></div>
                <a className="sn-link mono">CHG-2225</a>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
