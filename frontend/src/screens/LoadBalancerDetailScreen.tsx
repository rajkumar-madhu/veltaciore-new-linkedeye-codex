// Load balancer monitoring — LinkedEye-style detail page for LBs (F5-style):
// dark chassis front panel, virtual servers, pools, SSL, connections charts.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { useUiStore } from "@/store/ui";
import { useDevice } from "@/api/hooks";
import { DEVICES } from "@/data/infra";
import type { Device } from "@/lib/types";
import {
  Card, DetailHeader, Donut, FooterStrip, HBar, KpiTile, LineChart,
  LiveBadge, PanelLegend, StatusPill, type PortHealth,
} from "@/components/deviceDetail";

interface Vip {
  name: string;
  vip: string;
  port: number;
  pool: string;
  members: string; // "3/3"
  conns: string;
  cps: string;
  status: PortHealth;
}

const VIPS: Vip[] = [
  { name: "vs-checkout-https", vip: "10.10.5.20", port: 443, pool: "pool-checkout", members: "4/4", conns: "184K", cps: "2.4K", status: "up" },
  { name: "vs-api-https", vip: "10.10.5.21", port: 443, pool: "pool-api", members: "6/6", conns: "312K", cps: "5.1K", status: "up" },
  { name: "vs-web-http", vip: "10.10.5.22", port: 80, pool: "pool-web", members: "3/4", conns: "96K", cps: "1.2K", status: "warn" },
  { name: "vs-auth-https", vip: "10.10.5.23", port: 443, pool: "pool-auth", members: "2/2", conns: "44K", cps: "820", status: "up" },
  { name: "vs-legacy-soap", vip: "10.10.5.24", port: 8443, pool: "pool-legacy", members: "0/2", conns: "0", cps: "0", status: "down" },
];

const POOLS = [
  { name: "pool-api", members: 6, up: 6, lb: "least-conn", color: "#2563eb" },
  { name: "pool-checkout", members: 4, up: 4, lb: "round-robin", color: "#16a34a" },
  { name: "pool-web", members: 4, up: 3, lb: "round-robin", color: "#f59e0b" },
  { name: "pool-auth", members: 2, up: 2, lb: "least-conn", color: "#7c3aed" },
  { name: "pool-legacy", members: 2, up: 0, lb: "round-robin", color: "#ef4444" },
];

const CONNS = [520, 560, 545, 610, 640, 598, 622, 655, 618, 636, 648, 655];
const CPS = [7.8, 8.6, 8.2, 9.4, 9.9, 9.1, 9.5, 10.1, 9.4, 9.7, 9.9, 10.1];
const SSL_TPS = [3.1, 3.5, 3.3, 3.9, 4.1, 3.7, 3.9, 4.2, 3.8, 4.0, 4.1, 4.2];
const THR = [8.2, 9.1, 8.8, 9.9, 10.4, 9.6, 10.1, 10.8, 9.9, 10.3, 10.6, 10.8];

const TOP_VIPS = [
  { name: "vs-api-https", pct: 42, color: "#2563eb" },
  { name: "vs-checkout-https", pct: 26, color: "#16a34a" },
  { name: "vs-web-http", pct: 15, color: "#f59e0b" },
  { name: "vs-auth-https", pct: 9, color: "#7c3aed" },
  { name: "Others", pct: 8, color: "#94a3b8" },
];

const CERTS: [string, string, "ok" | "warn" | "crit"][] = [
  ["*.finspot.in", "Expires in 214d", "ok"],
  ["checkout.finspot.in", "Expires in 62d", "ok"],
  ["legacy.finspot.in", "Expires in 9d", "warn"],
  ["api-old.finspot.in", "Expired 3d ago", "crit"],
];

const TABS = ["Overview", "Virtual Servers", "Pools", "Nodes", "SSL", "Performance", "HA", "Logs", "Alerts", "Settings"];

export default function LoadBalancerDetailScreen() {
  const { setRoute } = useNav();
  const paramId = useUiStore(s => s.params.deviceId as string | undefined);
  const seed = DEVICES.find(d => d.id === paramId && d.kind === "loadbal")
    ?? DEVICES.find(d => d.kind === "loadbal") ?? DEVICES[0];
  const { data: live } = useDevice(seed.id);
  const d: Device = live ?? seed;

  const [tab, setTab] = React.useState("Overview");
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 10_000);
    return () => clearInterval(t);
  }, []);
  const jitter = (v: number, amp: number) => Math.max(0, Math.round(v + Math.sin(tick * 1.8) * amp));

  const vendor = (d.model || "").split(" ")[0].toUpperCase();

  const frontPanel = (
    <Card title={<span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>Device Front Panel <LiveBadge /></span>} right={<PanelLegend />}>
      <div style={{ background: "linear-gradient(180deg,#23272e 0%,#181c22 60%,#12151b 100%)", border: "1px solid #3a4048", borderRadius: 8, padding: "16px 18px", display: "flex", alignItems: "center", gap: 18, boxShadow: "inset 0 1px 0 rgba(255,255,255,.06), 0 3px 10px rgba(15,25,35,.25)" }}>
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontWeight: 900, fontSize: 13, color: "#e11d48", letterSpacing: 0.8 }}>{vendor}</div>
          <div style={{ fontSize: 9, color: "#8b95a3", marginBottom: 8 }}>{d.model.split(" ").slice(1).join(" ")}</div>
          {["PWR", "SYS", "HA"].map(l => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 4px #22c55e" }} />
              <span style={{ fontSize: 7, fontFamily: "var(--font-mono)", color: "#8b95a3" }}>{l}</span>
            </div>
          ))}
        </div>
        <div style={{ background: "#082f49", border: "1px solid #0c4a6e", borderRadius: 3, padding: "8px 16px", color: "#86efac", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, letterSpacing: 0.6, boxShadow: "inset 0 0 10px rgba(134,239,172,.2)", flexShrink: 0 }}>
          LOAD BALANCER<br /><span style={{ fontSize: 9, color: "#38bdf8" }}>ACTIVE · {jitter(655, 8)}K conns</span>
        </div>
        <div style={{ flex: 1 }} />
        {/* data ports */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(8, auto)", gap: 5, flexShrink: 0 }}>
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
              <span style={{ fontSize: 6.5, color: "#8b95a3", fontFamily: "var(--font-mono)" }}>{i + 1}.0</span>
              <div style={{ width: 22, height: 18, background: "#0c0f13", borderRadius: 2, border: "1px solid #40464e", display: "grid", placeItems: "center" }}>
                <span style={{ width: 12, height: 8, background: i < 6 ? "#22c55e" : "#0c0f13", clipPath: "polygon(0 0,100% 0,100% 55%,75% 55%,75% 100%,25% 100%,25% 55%,0 55%)", boxShadow: i < 6 ? "0 0 4px #22c55e" : "none" }} />
              </div>
            </div>
          ))}
        </div>
        {/* QSFP */}
        <div style={{ display: "flex", flexDirection: "column", gap: 3, flexShrink: 0 }}>
          {[0, 1].map(i => <span key={i} style={{ width: 30, height: 10, background: "#22c55e", borderRadius: 1, border: "1px solid #40464e", boxShadow: "0 0 4px #22c55e" }} title={`40G uplink ${i + 1}`} />)}
        </div>
      </div>
    </Card>
  );

  const vipTable = (
    <Card pad={0}>
      <div style={{ padding: "12px 16px 0", fontWeight: 700, fontSize: 13 }}>Virtual Servers</div>
      <table className="sn-list-table" style={{ fontSize: 12 }}>
        <thead><tr><th>Name</th><th style={{ width: 120 }}>VIP</th><th style={{ width: 60 }}>Port</th><th style={{ width: 120 }}>Pool</th><th style={{ width: 90 }}>Members</th><th style={{ width: 90 }}>Conns</th><th style={{ width: 80 }}>CPS</th><th style={{ width: 110 }}>Status</th></tr></thead>
        <tbody>
          {VIPS.map(v => (
            <tr key={v.name}>
              <td className="mono" style={{ fontWeight: 600 }}>{v.name}</td>
              <td className="mono">{v.vip}</td>
              <td className="mono">{v.port}</td>
              <td className="mono">{v.pool}</td>
              <td className="mono" style={{ color: v.members.startsWith("0") ? "#dc2626" : v.members.split("/")[0] !== v.members.split("/")[1] ? "#b45309" : "#16a34a", fontWeight: 700 }}>{v.members}</td>
              <td className="mono">{v.conns}</td>
              <td className="mono">{v.cps}</td>
              <td><StatusPill s={v.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );

  const poolsPanel = (
    <Card title="Pools">
      {POOLS.map(p => (
        <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: "1px solid #f3f5f7", fontSize: 12 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color }} />
          <span className="mono" style={{ flex: 1, fontWeight: 600 }}>{p.name}</span>
          <span style={{ color: "#6b7785", fontSize: 11 }}>{p.lb}</span>
          <span className="mono" style={{ fontWeight: 700, color: p.up === 0 ? "#dc2626" : p.up < p.members ? "#b45309" : "#16a34a" }}>{p.up}/{p.members} up</span>
        </div>
      ))}
    </Card>
  );

  const sslPanel = (
    <Card title="SSL Certificates">
      {CERTS.map(([cn, v, s]) => (
        <div key={cn} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #f3f5f7", fontSize: 12 }}>
          <span className="mono" style={{ color: "#3d4a5c" }}>{cn}</span>
          <span style={{ fontWeight: 600, color: s === "ok" ? "#16a34a" : s === "warn" ? "#b45309" : "#b91c1c", display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: s === "ok" ? "#16a34a" : s === "warn" ? "#f59e0b" : "#ef4444" }} />{v}
          </span>
        </div>
      ))}
      <div style={{ marginTop: 8, fontSize: 11.5, color: "#6b7785" }}>SSL offload: <b className="mono" style={{ color: "#16212e" }}>4.2K TPS</b> · TLS 1.3 preferred</div>
    </Card>
  );

  const haPanel = (
    <Card title="HA Overview">
      {([["Mode", "Active-Standby", ""], ["This Device", "Active", "#16a34a"], ["Peer", "LB-BLR-PROD-02 · Standby", "#16a34a"], ["Config Sync", "In Sync", "#16a34a"], ["Failover Count", "1", ""], ["Last Failover", "89d ago", ""]] as [string, string, string][]).map(([l, v, tone]) => (
        <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #f3f5f7", fontSize: 12 }}>
          <span style={{ color: "#6b7785" }}>{l}</span>
          <span style={{ fontWeight: 600, color: tone || "#16212e", display: "inline-flex", alignItems: "center", gap: 5 }}>{tone && <span style={{ width: 6, height: 6, borderRadius: "50%", background: tone }} />}{v}</span>
        </div>
      ))}
    </Card>
  );

  return (
    <div className="page page-fade sn-dash">
      <div className="sn-breadcrumb">
        <a className="sn-link" onClick={() => setRoute("infra")}>Infra</a><span className="sn-bc-sep">›</span>
        <a className="sn-link" onClick={() => setRoute("infra-assets")}>Devices</a><span className="sn-bc-sep">›</span>
        <a className="sn-link">Load Balancers</a><span className="sn-bc-sep">›</span>
        <span>{d.id}</span>
      </div>

      <DetailHeader d={d} tabs={TABS} tab={tab} setTab={setTab} category="loadbal" />

      <div style={{ padding: "16px 24px", display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          {(tab === "Overview" || tab === "Nodes") && frontPanel}

          {tab === "Overview" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              <KpiTile label="Active Connections" value={`${jitter(655, 8)}K`} delta="5.4%" up good />
              <KpiTile label="Connections / sec" value="10.1K" delta="7.1%" up good />
              <KpiTile label="SSL TPS" value="4.2K" delta="3.9%" up good />
              <KpiTile label="Pool Members Down" value="3" delta="pool-web · pool-legacy" up={false} good={false} sub="" />
            </div>
          )}

          {(tab === "Overview" || tab === "Performance") && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              <Card title="Connections (K)" right={<b className="mono" style={{ fontSize: 12.5, color: "#2563eb" }}>{jitter(655, 8)}K</b>} pad={14}>
                <LineChart series={[CONNS]} colors={["#2563eb"]} yTicks={["800", "600", "400", "200", "0"]} />
              </Card>
              <Card title="Throughput (Gbps)" right={<b className="mono" style={{ fontSize: 12.5, color: "#16a34a" }}>10.8</b>} pad={14}>
                <LineChart series={[THR]} colors={["#16a34a"]} yTicks={["12", "9", "6", "3", "0"]} />
              </Card>
              <Card title="CPS / SSL TPS (K)" right={<span style={{ fontSize: 10.5 }}><b className="mono" style={{ color: "#2563eb" }}>CPS 10.1</b> <b className="mono" style={{ color: "#7c3aed" }}>SSL 4.2</b></span>} pad={14}>
                <LineChart series={[CPS, SSL_TPS]} colors={["#2563eb", "#7c3aed"]} yTicks={["12", "9", "6", "3", "0"]} />
              </Card>
            </div>
          )}

          {(tab === "Overview" || tab === "Virtual Servers") && vipTable}
          {tab === "Pools" && poolsPanel}
          {tab === "SSL" && sslPanel}
          {tab === "HA" && haPanel}

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
            {([["CPU Utilization", jitter(31, 3)], ["Memory Utilization", jitter(52, 2)]] as [string, number][]).map(([l, v]) => (
              <div key={l} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: "#6b7785" }}>{l}</span><b className="mono">{v}%</b>
                </div>
                <HBar pct={v} />
              </div>
            ))}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 14px", marginTop: 12, fontSize: 12 }}>
              <div><div style={{ color: "#6b7785", fontSize: 11 }}>Virtual Servers</div><b className="mono" style={{ fontSize: 15 }}>{VIPS.length} <span style={{ color: "#dc2626", fontSize: 11 }}>1 down</span></b></div>
              <div><div style={{ color: "#6b7785", fontSize: 11 }}>Pool Members</div><b className="mono" style={{ fontSize: 15 }}>15/18 up</b></div>
              <div><div style={{ color: "#6b7785", fontSize: 11 }}>Persistence</div><b style={{ fontSize: 12 }}>cookie · src-ip</b></div>
              <div><div style={{ color: "#6b7785", fontSize: 11 }}>HA</div><b style={{ fontSize: 12 }}>Active <span style={{ color: "#16a34a" }}>Synced</span></b></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 14, paddingTop: 12, borderTop: "1px solid #f0f2f5" }}>
              {([["fa-temperature-half", "Temperature", "44 °C"], ["fa-fan", "Fan Speed", "2900 RPM"], ["fa-plug", "PSU Status", "2 / 2"]] as [string, string, string][]).map(([ic, l, v]) => (
                <div key={l} style={{ textAlign: "center" }}>
                  <i className={`fa-solid ${ic}`} style={{ color: "#2563eb", fontSize: 13 }} />
                  <div style={{ fontSize: 9.5, color: "#8a94a3", margin: "3px 0 1px" }}>{l}</div>
                  <b className="mono" style={{ fontSize: 12 }}>{v}</b>
                </div>
              ))}
            </div>
          </Card>

          {poolsPanel}

          <Card title="Top Virtual Servers">
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Donut parts={TOP_VIPS} />
              <div style={{ flex: 1, fontSize: 11.5 }}>
                {TOP_VIPS.map(a => (
                  <div key={a.name} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                    <span style={{ color: "#3d4a5c" }}><span style={{ color: a.color }}>●</span> {a.name}</span>
                    <span className="mono" style={{ color: "#6b7785" }}>{a.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {sslPanel}
          {haPanel}
        </div>
      </div>

      <FooterStrip />
    </div>
  );
}
