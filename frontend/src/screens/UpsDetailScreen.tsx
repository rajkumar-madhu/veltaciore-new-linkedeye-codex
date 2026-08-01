// UPS monitoring — LinkedEye-style detail page for UPS units (APC-style):
// front panel with 230V LCD + battery bank, load/runtime, battery health,
// input/output power, outlet groups, and event history.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { useUiStore } from "@/store/ui";
import { useDevice } from "@/api/hooks";
import { DEVICES } from "@/data/infra";
import type { Device } from "@/lib/types";
import {
  Card, DetailHeader, Donut, FooterStrip, HBar, KpiTile, LineChart,
  LiveBadge, StatusPill,
} from "@/components/deviceDetail";

const LOAD = [82, 84, 83, 86, 88, 85, 86, 87, 85, 86, 87, 86];
const BATT = [100, 100, 100, 100, 98, 97, 97, 98, 99, 100, 100, 100];
const V_IN = [229, 231, 230, 228, 226, 230, 231, 229, 230, 231, 230, 230];
const V_OUT = [230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230];

const OUTLETS = [
  { name: "Group 1 — Network core", load: 24, state: "up" as const, devices: "FW/RTR/SW" },
  { name: "Group 2 — Compute A", load: 31, state: "up" as const, devices: "ESX-BLR-01/02" },
  { name: "Group 3 — Compute B", load: 22, state: "up" as const, devices: "DB servers" },
  { name: "Group 4 — Storage", load: 9, state: "warn" as const, devices: "SAN + NAS" },
];

const EVENTS: [string, string, "ok" | "warn" | "crit"][] = [
  ["10:22 IST", "Self-test passed (runtime calibrated)", "ok"],
  ["09:41 IST", "Battery runtime below 12 min at current load", "warn"],
  ["Jun 12", "Input power restored · on utility", "ok"],
  ["Jun 12", "On battery · utility failure 14 s", "crit"],
  ["Jun 02", "Battery pack 2 replaced", "ok"],
];

const BATT_CELLS = [
  { name: "Pack 1", pct: 100, color: "#16a34a" },
  { name: "Pack 2", pct: 100, color: "#22c55e" },
  { name: "Pack 3", pct: 96, color: "#84cc16" },
  { name: "Pack 4", pct: 91, color: "#f59e0b" },
];

const TABS = ["Overview", "Battery", "Power", "Outlets", "Environment", "Events", "Logs", "Alerts", "Settings"];

export default function UpsDetailScreen() {
  const { setRoute } = useNav();
  const paramId = useUiStore(s => s.params.deviceId as string | undefined);
  const seed = DEVICES.find(d => d.id === paramId && d.kind === "ups")
    ?? DEVICES.find(d => d.kind === "ups") ?? DEVICES[0];
  const { data: live } = useDevice(seed.id);
  const d: Device = live ?? seed;

  const [tab, setTab] = React.useState("Overview");
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 10_000);
    return () => clearInterval(t);
  }, []);
  const jitter = (v: number, amp: number) => Math.max(0, Math.round(v + Math.sin(tick * 1.6) * amp));

  const vendor = (d.model || "").split(" ")[0].toUpperCase();
  const loadPct = jitter(86, 2);

  const frontPanel = (
    <Card title={<span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>Device Front Panel <LiveBadge /></span>}
      right={<span style={{ fontSize: 11, color: "#6b7785" }}>runtime at current load: <b style={{ color: "#b45309" }}>11m 42s</b></span>}>
      <div style={{ background: "linear-gradient(180deg,#23272e 0%,#181c22 60%,#12151b 100%)", border: "1px solid #3a4048", borderRadius: 8, padding: "18px 20px", display: "flex", alignItems: "center", gap: 20, boxShadow: "inset 0 1px 0 rgba(255,255,255,.06), 0 3px 10px rgba(15,25,35,.25)" }}>
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontWeight: 900, fontSize: 13, color: "#c9d1da", letterSpacing: 0.8 }}>{vendor}</div>
          <div style={{ fontSize: 9, color: "#8b95a3", marginBottom: 8 }}>{d.model.split(" ").slice(1).join(" ")}</div>
          {(["ONLINE", "ON BATT", "FAULT"] as const).map((l, i) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: i === 0 ? "#22c55e" : "#3a4048", boxShadow: i === 0 ? "0 0 4px #22c55e" : "none" }} />
              <span style={{ fontSize: 7, fontFamily: "var(--font-mono)", color: "#8b95a3" }}>{l}</span>
            </div>
          ))}
        </div>
        {/* vents */}
        <div style={{ width: 80, alignSelf: "stretch", borderRadius: 3, backgroundImage: "radial-gradient(circle, #3a404a 1.4px, transparent 1.5px)", backgroundSize: "6px 6px", border: "1px solid #333945", flexShrink: 0 }} />
        <div style={{ flex: 1 }} />
        {/* 230V LCD */}
        <div style={{ background: "#082f49", border: "1px solid #0c4a6e", borderRadius: 4, padding: "12px 26px", color: "#67e8f9", fontFamily: "var(--font-mono)", textAlign: "center", boxShadow: "inset 0 0 14px rgba(103,232,249,.3)", flexShrink: 0 }}>
          <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}>230<span style={{ fontSize: 12 }}>V</span></div>
          <div style={{ fontSize: 10, color: "#38bdf8", marginTop: 3 }}>Online · {loadPct}% load</div>
          <div style={{ display: "flex", gap: 3, justifyContent: "center", marginTop: 6 }}>
            {Array.from({ length: 10 }, (_, i) => (
              <span key={i} style={{ width: 8, height: 12, borderRadius: 1, background: i < Math.round(loadPct / 10) ? (loadPct > 85 ? "#f59e0b" : "#22c55e") : "#0c2436" }} />
            ))}
          </div>
        </div>
        <div style={{ flex: 1 }} />
        {/* battery bank */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, auto)", gap: 6, flexShrink: 0 }}>
          {BATT_CELLS.map(b => (
            <div key={b.name} style={{ textAlign: "center" }} title={`${b.name} · ${b.pct}%`}>
              <div style={{ width: 20, height: 34, border: "1.5px solid #4a5158", borderRadius: 3, position: "relative", overflow: "hidden", background: "#12151b" }}>
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: `${b.pct}%`, background: b.color, opacity: 0.85 }} />
              </div>
              <span style={{ fontSize: 6.5, color: "#8b95a3", fontFamily: "var(--font-mono)" }}>{b.name.split(" ")[1]}</span>
            </div>
          ))}
        </div>
        {/* breakers */}
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          {Array.from({ length: 4 }, (_, i) => (
            <span key={i} style={{ width: 12, height: 24, background: "#101418", border: "1px solid #2c313a", borderRadius: 2, boxShadow: "inset 0 -11px 0 #16a34a" }} title={`breaker ${i + 1} · on`} />
          ))}
        </div>
      </div>
    </Card>
  );

  const outletTable = (
    <Card pad={0}>
      <div style={{ padding: "12px 16px 0", fontWeight: 700, fontSize: 13 }}>Outlet Groups</div>
      <table className="sn-list-table" style={{ fontSize: 12 }}>
        <thead><tr><th>Group</th><th style={{ width: 160 }}>Feeds</th><th style={{ width: 190 }}>Load</th><th style={{ width: 110 }}>State</th></tr></thead>
        <tbody>
          {OUTLETS.map(o => (
            <tr key={o.name}>
              <td style={{ fontWeight: 600 }}>{o.name}</td>
              <td className="mono" style={{ fontSize: 11 }}>{o.devices}</td>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <HBar pct={o.load} color="#16a34a" />
                  <span className="mono" style={{ fontSize: 11, width: 30 }}>{o.load}%</span>
                </div>
              </td>
              <td><StatusPill s={o.state} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );

  const eventsPanel = (
    <Card title="Recent Events">
      {EVENTS.map(([t, v, s], i) => (
        <div key={i} style={{ display: "flex", gap: 10, padding: "6px 0", borderBottom: "1px solid #f3f5f7", fontSize: 12, alignItems: "center" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: s === "ok" ? "#16a34a" : s === "warn" ? "#f59e0b" : "#ef4444", flexShrink: 0 }} />
          <span className="mono" style={{ width: 62, color: "#8a94a3", fontSize: 11 }}>{t}</span>
          <span style={{ color: "#3d4a5c" }}>{v}</span>
        </div>
      ))}
    </Card>
  );

  const batteryPanel = (
    <Card title="Battery">
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
          <span style={{ color: "#6b7785" }}>Charge</span><b className="mono">100%</b>
        </div>
        <HBar pct={100} />
      </div>
      {([["Runtime @ load", "11m 42s", "#b45309"], ["Last self-test", "Passed · 10:22 IST", "#16a34a"], ["Battery temp", "26 °C", ""], ["Replacement due", "Pack 4 · 2027-01", "#b45309"], ["Cycles", "14", ""]] as [string, string, string][]).map(([l, v, tone]) => (
        <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #f3f5f7", fontSize: 12 }}>
          <span style={{ color: "#6b7785" }}>{l}</span>
          <span style={{ fontWeight: 600, color: tone || "#16212e" }}>{v}</span>
        </div>
      ))}
    </Card>
  );

  return (
    <div className="page page-fade sn-dash">
      <div className="sn-breadcrumb">
        <a className="sn-link" onClick={() => setRoute("infra")}>Infra</a><span className="sn-bc-sep">›</span>
        <a className="sn-link" onClick={() => setRoute("infra-assets")}>Devices</a><span className="sn-bc-sep">›</span>
        <a className="sn-link">Power</a><span className="sn-bc-sep">›</span>
        <span>{d.id}</span>
      </div>

      <DetailHeader d={d} tabs={TABS} tab={tab} setTab={setTab} category="ups" />

      <div style={{ padding: "16px 24px", display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          {(tab === "Overview" || tab === "Battery" || tab === "Power") && frontPanel}

          {tab === "Overview" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              <KpiTile label="Output Load" value={`${loadPct}%`} delta="137 kW of 160" up={false} good={loadPct < 85} sub="" />
              <KpiTile label="Runtime" value="11m 42s" delta="below 12m threshold" up={false} good={false} sub="" />
              <KpiTile label="Battery Charge" value="100%" delta="4 packs" up good sub="" />
              <KpiTile label="Input Power" value="230 V" delta="utility OK · 50 Hz" up good sub="" />
            </div>
          )}

          {(tab === "Overview" || tab === "Power" || tab === "Battery") && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              <Card title="Output Load (%)" right={<b className="mono" style={{ fontSize: 12.5, color: loadPct > 85 ? "#f59e0b" : "#16a34a" }}>{loadPct}%</b>} pad={14}>
                <LineChart series={[LOAD]} colors={["#f59e0b"]} yTicks={["100%", "75%", "50%", "25%", "0%"]} />
              </Card>
              <Card title="Battery Charge (%)" right={<b className="mono" style={{ fontSize: 12.5, color: "#16a34a" }}>100%</b>} pad={14}>
                <LineChart series={[BATT]} colors={["#16a34a"]} yTicks={["100%", "75%", "50%", "25%", "0%"]} />
              </Card>
              <Card title="Input / Output Voltage" right={<span style={{ fontSize: 10.5 }}><b className="mono" style={{ color: "#2563eb" }}>In 230V</b> <b className="mono" style={{ color: "#16a34a" }}>Out 230V</b></span>} pad={14}>
                <LineChart series={[V_IN, V_OUT]} colors={["#2563eb", "#16a34a"]} yTicks={["240", "235", "230", "225", "220"]} />
              </Card>
            </div>
          )}

          {(tab === "Overview" || tab === "Outlets") && outletTable}
          {(tab === "Events" || tab === "Environment") && eventsPanel}

          {(tab === "Logs" || tab === "Alerts" || tab === "Settings") && (
            <Card>
              <div style={{ textAlign: "center", color: "#6b7785", fontSize: 13, padding: 8 }}>
                <i className="fa-solid fa-arrow-up-right-from-square" style={{ marginRight: 8 }} />
                Full {tab.toLowerCase()} for {d.id} live in the device monitoring workspace —
                <a className="sn-link" style={{ marginLeft: 6 }} onClick={() => setRoute("infra-device", { deviceId: d.id })}>open device monitoring</a>
              </div>
            </Card>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card title="Device Health">
            {([["Output load", loadPct], ["Battery charge", 100]] as [string, number][]).map(([l, v]) => (
              <div key={l} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: "#6b7785" }}>{l}</span><b className="mono">{v}%</b>
                </div>
                <HBar pct={v} color={l === "Output load" && v > 85 ? "#f59e0b" : "#16a34a"} />
              </div>
            ))}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 14px", marginTop: 12, fontSize: 12 }}>
              <div><div style={{ color: "#6b7785", fontSize: 11 }}>Mode</div><b style={{ fontSize: 12, color: "#16a34a" }}>Online (double-conv.)</b></div>
              <div><div style={{ color: "#6b7785", fontSize: 11 }}>Frequency</div><b className="mono" style={{ fontSize: 15 }}>50 Hz</b></div>
              <div><div style={{ color: "#6b7785", fontSize: 11 }}>Bypass</div><b style={{ fontSize: 12 }}>Available</b></div>
              <div><div style={{ color: "#6b7785", fontSize: 11 }}>On battery (30d)</div><b className="mono" style={{ fontSize: 12 }}>1× · 14 s</b></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 14, paddingTop: 12, borderTop: "1px solid #f0f2f5" }}>
              {([["fa-temperature-half", "Ambient", "23 °C"], ["fa-droplet", "Humidity", "47%"], ["fa-plug", "Breakers", "4 / 4"]] as [string, string, string][]).map(([ic, l, v]) => (
                <div key={l} style={{ textAlign: "center" }}>
                  <i className={`fa-solid ${ic}`} style={{ color: "#2563eb", fontSize: 13 }} />
                  <div style={{ fontSize: 9.5, color: "#8a94a3", margin: "3px 0 1px" }}>{l}</div>
                  <b className="mono" style={{ fontSize: 12 }}>{v}</b>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Battery Packs">
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Donut parts={BATT_CELLS.map(b => ({ pct: 25, color: b.color }))} />
              <div style={{ flex: 1, fontSize: 11.5 }}>
                {BATT_CELLS.map(b => (
                  <div key={b.name} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                    <span style={{ color: "#3d4a5c" }}><span style={{ color: b.color }}>●</span> {b.name}</span>
                    <span className="mono" style={{ color: b.pct < 95 ? "#b45309" : "#6b7785" }}>{b.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {batteryPanel}
          {eventsPanel}
        </div>
      </div>

      <FooterStrip />
    </div>
  );
}
