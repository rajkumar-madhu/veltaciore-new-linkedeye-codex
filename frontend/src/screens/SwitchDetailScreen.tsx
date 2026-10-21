// Switch device monitoring — LinkedEye-style detail page for switches:
// 48-port front panel with interactive ports, VLANs, PoE budget, stack,
// performance charts, and port status table.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { useUiStore } from "@/store/ui";
import { useDevice, useInfraAlerts } from "@/api/hooks";
import { Panel, Pill } from "@/components/ld";
import { DeviceMetrics } from "@/components/MetricCharts";
import { DEVICES } from "@/data/infra";
import type { Device } from "@/lib/types";
import {
  Card, DetailHeader, Donut, FooterStrip, HBar, KpiTile, LineChart,
  LiveBadge, PanelLegend, StatusPill, portColor, type PortHealth,
} from "@/components/deviceDetail";

interface SwPort {
  n: number;
  name: string;
  vlan: number;
  mode: "access" | "trunk";
  status: PortHealth;
  speed: string;
  poeW: number;
  inBps: string;
  outBps: string;
  util: number;
  err: number;
  peer?: string;
}

// deterministic port map: a busy 48-port ToR
const SW_PORTS: SwPort[] = Array.from({ length: 48 }, (_, i) => {
  const n = i + 1;
  const down = [13, 27].includes(n);
  const warn = n === 5;
  const trunk = n > 44;
  const used = n <= 40 || trunk;
  const util = down ? 0 : warn ? 78 : used ? ((n * 7) % 55) + 5 : 0;
  return {
    n,
    name: `Gi1/0/${n}`,
    vlan: trunk ? 0 : 100 + (n % 4),
    mode: trunk ? "trunk" : "access",
    status: down ? "down" : warn ? "warn" : used ? "up" : "disabled",
    speed: used && !down ? "1 Gbps" : "—",
    poeW: n <= 24 && used && !down ? +(4 + (n % 9) * 1.7).toFixed(1) : 0,
    inBps: used && !down ? `${((n * 13) % 380) + 12}.${n % 10} Mbps` : "0",
    outBps: used && !down ? `${((n * 11) % 320) + 8}.${(n * 3) % 10} Mbps` : "0",
    util,
    err: down ? 0 : n === 5 ? 3 : 0,
    peer: down ? undefined : n <= 8 ? `ESX-BLR-0${(n % 4) + 1}` : trunk ? "SW-BLR-CORE-01" : undefined,
  };
});

const VLANS = [
  { id: 100, name: "prod-web", ports: 12, color: "#2563eb" },
  { id: 101, name: "prod-db", ports: 10, color: "#16a34a" },
  { id: 102, name: "voice", ports: 9, color: "#7c3aed" },
  { id: 103, name: "mgmt", ports: 9, color: "#f59e0b" },
  { id: 0, name: "trunks", ports: 4, color: "#64748b" },
];

const CPU = [22, 26, 24, 31, 28, 25, 27, 30, 26, 24, 28, 26];
const MEM = [38, 39, 41, 40, 39, 40, 42, 41, 40, 41, 42, 41];
const THR_IN = [6.2, 7.1, 6.8, 7.9, 8.4, 7.6, 8.1, 8.8, 7.9, 8.3, 8.6, 8.8];
const THR_OUT = [5.1, 5.9, 5.6, 6.4, 6.9, 6.2, 6.7, 7.2, 6.5, 6.8, 7.1, 7.2];
const BCAST = [0.4, 0.6, 0.5, 0.8, 1.9, 0.7, 0.6, 0.9, 0.7, 0.6, 0.8, 0.7];

const TOP_TALKERS = [
  { name: "ESX-BLR-01", pct: 28, color: "#2563eb" },
  { name: "ESX-BLR-02", pct: 22, color: "#16a34a" },
  { name: "BARE-BLR-DB-01", pct: 17, color: "#7c3aed" },
  { name: "NAS-BLR-01", pct: 12, color: "#f59e0b" },
  { name: "Others", pct: 21, color: "#94a3b8" },
];

const TABS = ["Overview", "Ports", "VLANs", "PoE", "Performance", "Stack", "Logs", "Alerts", "Topology", "Settings"];

export default function SwitchDetailScreen() {
  const { setRoute } = useNav();
  const paramId = useUiStore(s => s.params.deviceId as string | undefined);
  const seed = DEVICES.find(d => d.id === paramId && d.kind === "switch")
    ?? DEVICES.find(d => d.kind === "switch") ?? DEVICES[0];
  const { data: live } = useDevice(seed.id);
  const d: Device = live ?? seed;

  const [tab, setTab] = React.useState("Overview");
  const [pop, setPop] = React.useState<{ x: number; y: number; p: SwPort } | null>(null);
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 10_000);
    return () => clearInterval(t);
  }, []);
  const jitter = (v: number, amp: number) => Math.max(0, Math.round(v + Math.sin(tick * 1.9) * amp));

  const showPop = (e: React.MouseEvent, p: SwPort) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPop({ x: Math.min(r.left, window.innerWidth - 260), y: r.bottom + 8, p });
  };

  const vendor = (d.model || "").split(" ")[0].toUpperCase();
  const deviceAlerts = (useInfraAlerts().data ?? []).filter(a => a.device === d.id).slice(0, 5);
  const neighbors = SW_PORTS.filter(p => p.peer).slice(0, 8);
  const errorPorts = [...SW_PORTS].filter(p => p.err > 0 || p.status === "down").sort((a, b) => b.err - a.err).slice(0, 5);

  const infoPanel = (
    <Panel title="Device Information">
      <dl className="ld-dl">
        <dt>Hostname</dt><dd>{d.hostname || d.id}</dd>
        <dt>IP address</dt><dd className="ld-mono">{d.ip}</dd>
        <dt>Model</dt><dd>{d.model}</dd>
        <dt>Vendor</dt><dd>{d.vendor || vendor}</dd>
        <dt>Serial number</dt><dd className="ld-mono">{d.serial_number || "—"}</dd>
        <dt>OS version</dt><dd>{d.os || "—"}</dd>
        <dt>Site / location</dt><dd>{d.site}{d.location ? ` · ${d.location}` : ""}</dd>
        <dt>Role</dt><dd>{d.role || "—"}</dd>
        <dt>Monitoring</dt><dd>{d.agent || "—"}</dd>
        <dt>Last seen</dt><dd>{d.lastSeen || "—"}</dd>
      </dl>
    </Panel>
  );

  const errorsPanel = (
    <Panel title="Interface Errors (Top 5)">
      <div className="ld-table-wrap">
        <table className="ld-table">
          <thead><tr><th scope="col">Interface</th><th scope="col">Status</th><th scope="col">CRC errors</th><th scope="col">Utilization</th></tr></thead>
          <tbody>
            {errorPorts.map(p => (
              <tr key={p.n}>
                <td className="ld-mono">{p.name}</td>
                <td><Pill tone={p.status === "down" ? "crit" : p.status === "warn" ? "warn" : "ok"}><span className="ld-pill-dot" />{p.status === "down" ? "Down" : p.status === "warn" ? "Warning" : "Up"}</Pill></td>
                <td className={p.err > 0 ? "ld-text-crit" : "ld-muted"}>{p.err}</td>
                <td>{p.util}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );

  const neighborsPanel = (
    <Panel title="Neighbors (CDP/LLDP)">
      <div className="ld-table-wrap">
        <table className="ld-table">
          <thead><tr><th scope="col">Neighbor device</th><th scope="col">Local port</th><th scope="col">Mode</th></tr></thead>
          <tbody>
            {neighbors.map(p => (
              <tr key={p.n}>
                <td>
                  <button type="button" className="ld-link" onClick={() => setRoute("infra-device", { deviceId: p.peer })}>{p.peer}</button>
                </td>
                <td className="ld-mono">{p.name}</td>
                <td className="ld-muted">{p.mode}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );

  const alertsPanel = (
    <Panel title="Recent Alerts" action={{ label: "View All", onClick: () => setRoute("alerts") }}>
      {deviceAlerts.length ? (
        <ul className="ld-activity">
          {deviceAlerts.map(a => (
            <li key={a.id}>
              <span className={`ld-tile ld-tile-sm ld-${a.sev === "critical" ? "crit" : a.sev === "warning" || a.sev === "warn" ? "warn" : "info"}`} aria-hidden="true"><i className="fa-solid fa-bell" /></span>
              <span className="ld-activity-text">{a.title} · <span className="ld-muted">{a.detail}</span></span>
              <span className="ld-muted ld-nowrap">{a.since}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="ld-empty">No active alerts on {d.id}.</div>
      )}
    </Panel>
  );

  const upCount = SW_PORTS.filter(p => p.status === "up" || p.status === "warn").length;
  const poeUsed = SW_PORTS.reduce((s, p) => s + p.poeW, 0);
  const poeBudget = 740;


  const frontPanel = (
    <Card
      title={<span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>Device Front Panel <LiveBadge /></span>}
      right={<PanelLegend />}
    >
      <div style={{ background: "linear-gradient(180deg,#eef0f2 0%,#dcdfe3 70%,#cdd1d6 100%)", border: "1px solid #b7bcc3", borderRadius: 8, padding: "14px 18px", display: "flex", alignItems: "center", gap: 16, boxShadow: "inset 0 1px 0 rgba(255,255,255,.7), 0 3px 10px rgba(15,25,35,.12)" }}>
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontWeight: 900, fontSize: 13, color: "#3d4550", letterSpacing: 0.8 }}>{vendor}</div>
          <div style={{ fontSize: 9, color: "#5b6472", marginBottom: 6 }}>{d.model.split(" ").slice(1).join(" ")}</div>
          {["PWR", "SYS", "STK", "SPD"].map((l, i) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: i < 2 ? "#22c55e" : i === 2 ? "#2563eb" : "#22c55e", boxShadow: "0 0 4px currentColor" }} />
              <span style={{ fontSize: 7, fontFamily: "var(--font-mono)", color: "#5b6472" }}>{l}</span>
            </div>
          ))}
        </div>
        {/* 48 ports in 2 rows of 24, grouped in blocks of 12 */}
        <div style={{ display: "flex", gap: 14, flex: 1, justifyContent: "center" }}>
          {[0, 1].map(block => (
            <div key={block} style={{ display: "grid", gridTemplateColumns: "repeat(12, auto)", gap: "3px 4px" }}>
              {Array.from({ length: 24 }, (_, i) => {
                const idx = block * 24 + (i % 12) + Math.floor(i / 12) * 12;
                const p = SW_PORTS[block * 24 + i];
                void idx;
                return (
                  <div key={p.n} onMouseEnter={e => showPop(e, p)} onMouseLeave={() => setPop(null)} onClick={e => { e.stopPropagation(); showPop(e, p); }}
                    style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, cursor: "pointer" }}>
                    <span style={{ fontSize: 6, color: "#6b7785", fontFamily: "var(--font-mono)" }}>{p.n}</span>
                    <div style={{ width: 18, height: 16, background: "#20242a", borderRadius: 1.5, border: "1px solid #40464e", position: "relative", display: "grid", placeItems: "center" }}>
                      <span style={{ width: 10, height: 7, background: p.status === "up" || p.status === "warn" ? portColor(p.status) : "#0c0f13", clipPath: "polygon(0 0,100% 0,100% 55%,75% 55%,75% 100%,25% 100%,25% 55%,0 55%)", boxShadow: p.status === "up" ? "0 0 3px #22c55e" : "none" }} />
                      <span style={{ position: "absolute", left: 1, bottom: 1, width: 3, height: 3, borderRadius: "50%", background: portColor(p.status) }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        {/* SFP+ uplinks */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, auto)", gap: 4, flexShrink: 0 }}>
          {["49", "50", "51", "52"].map((n, i) => (
            <div key={n} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
              <span style={{ fontSize: 6, color: "#6b7785", fontFamily: "var(--font-mono)" }}>{n}</span>
              <div style={{ width: 24, height: 14, background: "#20242a", borderRadius: 1.5, border: "1px solid #40464e", display: "grid", placeItems: "center" }}>
                <span style={{ width: 16, height: 6, background: i < 2 ? "#22c55e" : "#0c0f13", borderRadius: 1, boxShadow: i < 2 ? "0 0 3px #22c55e" : "none" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );

  const portTable = (rows: SwPort[]) => (
    <Card pad={0}>
      <div style={{ padding: "12px 16px 0", fontWeight: 700, fontSize: 13 }}>Port Status</div>
      <table className="sn-list-table" style={{ fontSize: 12 }}>
        <thead><tr><th style={{ width: 90 }}>Port</th><th style={{ width: 90 }}>Status</th><th style={{ width: 90 }}>VLAN</th><th style={{ width: 70 }}>Mode</th><th style={{ width: 80 }}>Speed</th><th style={{ width: 76 }}>PoE (W)</th><th style={{ width: 100 }}>In (bps)</th><th style={{ width: 100 }}>Out (bps)</th><th style={{ width: 130 }}>Utilization</th><th style={{ width: 60 }}>Errors</th><th>Connected To</th></tr></thead>
      <tbody>
          {rows.map(p => (
            <tr key={p.n}>
              <td className="mono" style={{ fontWeight: 600 }}>{p.name}</td>
              <td><StatusPill s={p.status} /></td>
              <td className="mono">{p.mode === "trunk" ? "trunk (all)" : p.vlan}</td>
              <td>{p.mode}</td>
              <td className="mono">{p.speed}</td>
              <td className="mono">{p.poeW ? p.poeW.toFixed(1) : "—"}</td>
              <td className="mono">{p.inBps}</td>
              <td className="mono">{p.outBps}</td>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <HBar pct={p.util} color={p.util > 70 ? "#f59e0b" : p.status === "down" ? "#e5e8eb" : "#16a34a"} />
                  <span className="mono" style={{ fontSize: 11, width: 30 }}>{p.status === "disabled" ? "—" : `${p.util}%`}</span>
                </div>
              </td>
              <td className="mono" style={{ color: p.err > 0 ? "#dc2626" : "#16a34a", fontWeight: p.err > 0 ? 700 : 400 }}>{p.err}</td>
              <td className="mono" style={{ fontSize: 11 }}>{p.peer ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );

  const vlanPanel = (
    <Card title="VLANs">
      {VLANS.map(v => (
        <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: "1px solid #f3f5f7", fontSize: 12 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: v.color }} />
          <span className="mono" style={{ width: 44, fontWeight: 700 }}>{v.id || "—"}</span>
          <span style={{ flex: 1, color: "#3d4a5c" }}>{v.name}</span>
          <span className="mono" style={{ color: "#6b7785" }}>{v.ports} ports</span>
        </div>
      ))}
      <div style={{ marginTop: 10, fontSize: 11.5, color: "#6b7785" }}>STP root: <b className="mono" style={{ color: "#16212e" }}>SW-BLR-CORE-01</b> · 0 topology changes (24h)</div>
    </Card>
  );

  const poePanel = (
    <Card title="PoE Budget">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, fontSize: 12 }}>
        <HBar pct={(poeUsed / poeBudget) * 100} color={poeUsed / poeBudget > 0.8 ? "#f59e0b" : "#16a34a"} />
        <b className="mono">{poeUsed.toFixed(0)} / {poeBudget} W</b>
      </div>
      <div style={{ fontSize: 11.5, color: "#6b7785" }}>{SW_PORTS.filter(p => p.poeW > 0).length} powered devices · class 3/4 · no faults</div>
    </Card>
  );

  const stackPanel = (
    <Card title="Stack">
      {([["Member 1 (this)", "Master", "ok"], ["Member 2", "Backup", "ok"]] as [string, string, string][]).map(([m, role, st]) => (
        <div key={m} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f3f5f7", fontSize: 12 }}>
          <span style={{ color: "#3d4a5c" }}>{m}</span>
          <span style={{ fontWeight: 600 }}>{role} <span style={{ color: st === "ok" ? "#16a34a" : "#dc2626" }}>●</span></span>
        </div>
      ))}
      <div style={{ marginTop: 8, fontSize: 11.5, color: "#6b7785" }}>Stack ring: <b style={{ color: "#16a34a" }}>Full</b> · bandwidth 480 Gbps</div>
    </Card>
  );

  return (
    <div className="page page-fade sn-dash" onClick={() => setPop(null)}>
      <div className="sn-breadcrumb">
        <a className="sn-link" onClick={() => setRoute("infra")}>Infra</a><span className="sn-bc-sep">›</span>
        <a className="sn-link" onClick={() => setRoute("infra-assets")}>Devices</a><span className="sn-bc-sep">›</span>
        <a className="sn-link">Switches</a><span className="sn-bc-sep">›</span>
        <span>{d.id}</span>
      </div>

      <DetailHeader d={d} tabs={TABS} tab={tab} setTab={setTab} category="switch" />

      <div style={{ padding: "16px 24px", display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          {(tab === "Overview" || tab === "Ports" || tab === "Topology") && frontPanel}

          {(tab === "Overview") && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              <KpiTile label="Ports Up" value={`${upCount} / 48`} delta="2 down" up={false} good={false} sub="Gi1/0/13 · 27" />
              <KpiTile label="Throughput" value="8.8 Gbps" delta="6.2%" up good />
              <KpiTile label="PoE Used" value={`${poeUsed.toFixed(0)} W`} delta={`${Math.round((poeUsed / poeBudget) * 100)}%`} up good sub="of 740 W budget" />
              <KpiTile label="CRC Errors (15m)" value="3" delta="port Gi1/0/5" up={false} good={false} sub="" />
            </div>
          )}

          {(tab === "Overview" || tab === "Performance") && <DeviceMetrics deviceId={d.id} title="Performance" />}

          {tab === "Overview" && (
            <div className="ld-grid ld-grid-2">
              {infoPanel}
              {errorsPanel}
            </div>
          )}

          {(tab === "Overview") && portTable(SW_PORTS.filter(p => p.status !== "disabled").slice(0, 8))}

          {(tab === "Overview" || tab === "Topology") && (
            <div className="ld-grid ld-grid-2">
              {neighborsPanel}
              {alertsPanel}
            </div>
          )}
          {(tab === "Ports" || tab === "Network") && portTable(SW_PORTS)}
          {tab === "VLANs" && vlanPanel}
          {tab === "PoE" && poePanel}
          {tab === "Stack" && stackPanel}

          {tab === "Alerts" && alertsPanel}
          {(tab === "Logs" || tab === "Settings") && (
            <Card>
              <div style={{ textAlign: "center", color: "#6b7785", fontSize: 13, padding: 8 }}>
                <i className="fa-solid fa-arrow-up-right-from-square" style={{ marginRight: 8 }} />
                Full {tab.toLowerCase()} for {d.id} live in the device monitoring workspace —
                <a className="sn-link" style={{ marginLeft: 6 }} onClick={() => setRoute("infra-device", { deviceId: d.id })}>open device monitoring</a>
              </div>
            </Card>
          )}
        </div>

        {/* right rail */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card title="Device Health">
            {([["CPU Utilization", jitter(26, 3)], ["Memory Utilization", jitter(41, 2)]] as [string, number][]).map(([l, v]) => (
              <div key={l} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: "#6b7785" }}>{l}</span><b className="mono">{v}%</b>
                </div>
                <HBar pct={v} />
              </div>
            ))}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 14px", marginTop: 12, fontSize: 12 }}>
              <div><div style={{ color: "#6b7785", fontSize: 11 }}>MAC Table</div><b className="mono" style={{ fontSize: 15 }}>{jitter(4218, 40).toLocaleString()}</b></div>
              <div><div style={{ color: "#6b7785", fontSize: 11 }}>ARP Entries</div><b className="mono" style={{ fontSize: 15 }}>1,904</b></div>
              <div><div style={{ color: "#6b7785", fontSize: 11 }}>Uplinks</div><b className="mono" style={{ fontSize: 15 }}>2 <span style={{ color: "#16a34a", fontSize: 11 }}>Up</span></b></div>
              <div><div style={{ color: "#6b7785", fontSize: 11 }}>Stack</div><b style={{ fontSize: 12 }}>2 members <span style={{ color: "#16a34a" }}>Full</span></b></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 14, paddingTop: 12, borderTop: "1px solid #f0f2f5" }}>
              {([["fa-temperature-half", "Temperature", "38 °C"], ["fa-fan", "Fan Speed", "3100 RPM"], ["fa-plug", "PSU Status", "2 / 2"]] as [string, string, string][]).map(([ic, l, v]) => (
                <div key={l} style={{ textAlign: "center" }}>
                  <i className={`fa-solid ${ic}`} style={{ color: "#2563eb", fontSize: 13 }} />
                  <div style={{ fontSize: 9.5, color: "#8a94a3", margin: "3px 0 1px" }}>{l}</div>
                  <b className="mono" style={{ fontSize: 12 }}>{v}</b>
                </div>
              ))}
            </div>
          </Card>

          {vlanPanel}
          {poePanel}

          <Card title="Top Talkers">
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Donut parts={TOP_TALKERS} />
              <div style={{ flex: 1, fontSize: 11.5 }}>
                {TOP_TALKERS.map(a => (
                  <div key={a.name} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                    <span style={{ color: "#3d4a5c" }}><span style={{ color: a.color }}>●</span> {a.name}</span>
                    <span className="mono" style={{ color: "#6b7785" }}>{a.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {stackPanel}
        </div>
      </div>

      <FooterStrip />

      {pop && (
        <div style={{ position: "fixed", left: pop.x, top: pop.y, zIndex: 70, background: "#16212e", color: "white", borderRadius: 8, padding: "12px 14px", fontSize: 12, minWidth: 210, boxShadow: "0 12px 28px rgba(0,0,0,.35)" }} onClick={e => e.stopPropagation()}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>{pop.p.name}{pop.p.peer ? ` → ${pop.p.peer}` : ""}</div>
          <div style={{ display: "grid", gridTemplateColumns: "auto auto", gap: "3px 18px", color: "#c4cdd6" }}>
            <span>VLAN</span><span className="mono" style={{ color: "white", textAlign: "right" }}>{pop.p.mode === "trunk" ? "trunk (all)" : pop.p.vlan}</span>
            <span>Mode</span><span className="mono" style={{ color: "white", textAlign: "right" }}>{pop.p.mode}</span>
            <span>Speed</span><span className="mono" style={{ color: "white", textAlign: "right" }}>{pop.p.speed}</span>
            <span>PoE</span><span className="mono" style={{ color: "white", textAlign: "right" }}>{pop.p.poeW ? `${pop.p.poeW} W` : "—"}</span>
            <span>Status</span><span className="mono" style={{ color: portColor(pop.p.status), textAlign: "right", fontWeight: 700 }}>{pop.p.status === "up" ? "Up" : pop.p.status === "warn" ? "Warning" : pop.p.status === "down" ? "Down" : "Disabled"}</span>
            <span>RX / TX</span><span className="mono" style={{ color: "white", textAlign: "right" }}>{pop.p.inBps} / {pop.p.outBps}</span>
            <span>Utilization</span><span className="mono" style={{ color: "white", textAlign: "right" }}>{pop.p.util}%</span>
            <span>CRC Errors</span><span className="mono" style={{ color: pop.p.err > 0 ? "#f87171" : "white", textAlign: "right" }}>{pop.p.err}</span>
          </div>
        </div>
      )}
    </div>
  );
}
