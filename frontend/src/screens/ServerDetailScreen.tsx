// Server device monitoring — LinkedEye-style detail page for physical
// servers / hypervisors: chassis front panel with drive bays, performance,
// storage, NICs, hardware sensors (iDRAC), and top processes.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { useUiStore } from "@/store/ui";
import { useDevice } from "@/api/hooks";
import { DEVICES, VMS } from "@/data/infra";
import type { Device } from "@/lib/types";
import {
  Card, DetailHeader, Donut, FooterStrip, HBar, KpiTile, LineChart,
  LiveBadge, PanelLegend, StatusPill, type PortHealth,
} from "@/components/deviceDetail";

interface Bay { n: number; status: "ok" | "rebuild" | "failed" | "empty"; size: string; type: string }

const BAYS: Bay[] = [
  { n: 0, status: "ok", size: "1.92 TB", type: "SSD" }, { n: 1, status: "ok", size: "1.92 TB", type: "SSD" },
  { n: 2, status: "ok", size: "1.92 TB", type: "SSD" }, { n: 3, status: "rebuild", size: "1.92 TB", type: "SSD" },
  { n: 4, status: "ok", size: "3.84 TB", type: "NVMe" }, { n: 5, status: "ok", size: "3.84 TB", type: "NVMe" },
  { n: 6, status: "ok", size: "3.84 TB", type: "NVMe" }, { n: 7, status: "empty", size: "—", type: "—" },
];

const MOUNTS = [
  { fs: "/", size: "120 GB", used: 62, io: "84 MB/s" },
  { fs: "/var", size: "240 GB", used: 48, io: "31 MB/s" },
  { fs: "/data", size: "3.8 TB", used: 78, io: "412 MB/s" },
  { fs: "/backup", size: "7.6 TB", used: 55, io: "96 MB/s" },
];

const NICS: { name: string; status: PortHealth; speed: string; rx: string; tx: string; drops: number }[] = [
  { name: "eno1 (mgmt)", status: "up", speed: "1 Gbps", rx: "12.4 Mbps", tx: "8.1 Mbps", drops: 0 },
  { name: "ens2f0 (vmnic0)", status: "up", speed: "25 Gbps", rx: "4.21 Gbps", tx: "3.86 Gbps", drops: 0 },
  { name: "ens2f1 (vmnic1)", status: "up", speed: "25 Gbps", rx: "3.94 Gbps", tx: "3.52 Gbps", drops: 0 },
  { name: "idrac", status: "up", speed: "1 Gbps", rx: "0.2 Mbps", tx: "0.1 Mbps", drops: 0 },
];

const SENSORS: { group: string; items: [string, string, "ok" | "warn" | "crit"][] }[] = [
  { group: "Power", items: [["PSU 1", "412 W · OK", "ok"], ["PSU 2", "398 W · OK", "ok"], ["Voltage 12V", "12.08 V", "ok"]] },
  { group: "Cooling", items: [["Fan 1A", "5 040 RPM", "ok"], ["Fan 2A", "5 160 RPM", "ok"], ["Fan 3A", "0 RPM", "crit"], ["Inlet Temp", "24 °C", "ok"], ["CPU1 Temp", "58 °C", "ok"], ["CPU2 Temp", "61 °C", "warn"]] },
  { group: "Storage", items: [["RAID Controller", "PERC H755 · OK", "ok"], ["Virtual Disk 0", "RAID-10 · Rebuilding 62%", "warn"], ["Battery", "Charged", "ok"]] },
];

const PROCS = [
  { name: "vmx (prod-web-01)", cpu: 18.4, mem: 12.2 },
  { name: "vmx (prod-db-01)", cpu: 14.1, mem: 18.6 },
  { name: "vsanmgmtd", cpu: 6.2, mem: 3.1 },
  { name: "hostd", cpu: 4.8, mem: 2.4 },
  { name: "vpxa", cpu: 2.1, mem: 1.2 },
];

const CPU = [38, 44, 41, 52, 47, 43, 49, 55, 46, 44, 50, 47];
const MEM = [61, 62, 64, 63, 62, 64, 66, 65, 63, 64, 65, 64];
const IO_R = [220, 310, 260, 380, 412, 340, 365, 405, 330, 372, 398, 412];
const IO_W = [140, 190, 165, 240, 262, 210, 228, 255, 205, 236, 250, 262];
const NET_RX = [3.1, 3.6, 3.4, 4.0, 4.2, 3.8, 4.0, 4.3, 3.9, 4.1, 4.2, 4.21];
const NET_TX = [2.7, 3.2, 3.0, 3.5, 3.9, 3.4, 3.6, 3.9, 3.5, 3.7, 3.8, 3.86];

const MEM_BREAKDOWN = [
  { name: "VMs", pct: 52, color: "#2563eb" },
  { name: "vSAN cache", pct: 8, color: "#7c3aed" },
  { name: "Hypervisor", pct: 4, color: "#f59e0b" },
  { name: "Free", pct: 36, color: "#d1d9e0" },
];

const TABS = ["Overview", "Performance", "Storage", "Network", "Hardware", "Processes", "Logs", "Alerts", "Topology", "Settings"];

const bayColor = (s: Bay["status"]) => (s === "ok" ? "#22c55e" : s === "rebuild" ? "#f59e0b" : s === "failed" ? "#ef4444" : "#3a4048");

export default function ServerDetailScreen() {
  const { setRoute } = useNav();
  const paramId = useUiStore(s => s.params.deviceId as string | undefined);
  const serverKinds = ["hypervisor", "phys-srv", "linux-srv", "win-srv"];
  const seed = DEVICES.find(d => d.id === paramId && serverKinds.includes(d.kind))
    ?? DEVICES.find(d => d.kind === "hypervisor") ?? DEVICES[0];
  const { data: live } = useDevice(seed.id);
  const d: Device = live ?? seed;
  const hostedVms = VMS.filter(v => v.host === d.id);

  const [tab, setTab] = React.useState("Overview");
  const [pop, setPop] = React.useState<{ x: number; y: number; b: Bay } | null>(null);
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 10_000);
    return () => clearInterval(t);
  }, []);
  const jitter = (v: number, amp: number) => Math.max(0, Math.round(v + Math.sin(tick * 2.1) * amp));

  const showPop = (e: React.MouseEvent, b: Bay) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPop({ x: Math.min(r.left, window.innerWidth - 240), y: r.bottom + 8, b });
  };

  const vendor = (d.model || "").split(" ")[0].toUpperCase();

  const frontPanel = (
    <Card
      title={<span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>Device Front Panel <LiveBadge /></span>}
      right={<PanelLegend />}
    >
      <div style={{ background: "linear-gradient(180deg,#2c313a 0%,#20242c 60%,#181c23 100%)", border: "1px solid #3a4048", borderRadius: 8, padding: "16px 18px", display: "flex", alignItems: "center", gap: 16, boxShadow: "inset 0 1px 0 rgba(255,255,255,.06), 0 3px 10px rgba(15,25,35,.25)" }}>
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontWeight: 900, fontSize: 12, color: "#c9d1da", letterSpacing: 0.8 }}>{vendor}</div>
          <div style={{ fontSize: 9, color: "#8b95a3", marginBottom: 8 }}>{d.model.split(" ").slice(1).join(" ")}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span title="power" style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid #3b82f6", boxShadow: "0 0 6px #3b82f6" }} />
            <span title="system health" style={{ width: 8, height: 8, borderRadius: "50%", background: d.status === "ok" ? "#22c55e" : "#f59e0b", boxShadow: "0 0 5px currentColor" }} />
            <span title="identify" style={{ width: 8, height: 8, borderRadius: "50%", background: "#1f6feb" }} />
          </div>
        </div>
        {/* vent grille */}
        <div style={{ width: 60, alignSelf: "stretch", borderRadius: 3, backgroundImage: "radial-gradient(circle, #3a404a 1.4px, transparent 1.5px)", backgroundSize: "6px 6px", border: "1px solid #333945", flexShrink: 0 }} />
        {/* drive bays */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, flex: 1 }}>
          {BAYS.map(b => (
            <div key={b.n} onMouseEnter={e => showPop(e, b)} onMouseLeave={() => setPop(null)} onClick={e => { e.stopPropagation(); showPop(e, b); }}
              style={{ height: 40, background: b.status === "empty" ? "#171b22" : "linear-gradient(180deg,#333945,#242932)", border: "1px solid #40464e", borderRadius: 3, cursor: "pointer", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "4px 8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 8, color: "#8b95a3", fontFamily: "var(--font-mono)" }}>BAY {b.n}</span>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: bayColor(b.status), boxShadow: b.status !== "empty" ? `0 0 4px ${bayColor(b.status)}` : "none" }} />
              </div>
              <div style={{ height: 8, borderRadius: 2, background: "repeating-linear-gradient(90deg,#1c2129 0 5px,#242a33 5px 10px)" }} />
            </div>
          ))}
        </div>
        {/* iDRAC + NICs */}
        <div style={{ flexShrink: 0, textAlign: "center" }}>
          <span style={{ fontSize: 8, color: "#8b95a3", fontFamily: "var(--font-mono)" }}>iDRAC</span>
          <div style={{ width: 26, height: 22, background: "#0c0f13", borderRadius: 2, border: "1px solid #40464e", display: "grid", placeItems: "center", margin: "2px auto 6px" }}>
            <span style={{ width: 12, height: 8, background: "#22c55e", clipPath: "polygon(0 0,100% 0,100% 55%,75% 55%,75% 100%,25% 100%,25% 55%,0 55%)", boxShadow: "0 0 4px #22c55e" }} />
          </div>
          <span style={{ fontSize: 8, color: "#8b95a3", fontFamily: "var(--font-mono)" }}>25G ×2</span>
          <div style={{ display: "flex", gap: 3, justifyContent: "center", marginTop: 2 }}>
            {[0, 1].map(i => <span key={i} style={{ width: 16, height: 9, background: "#22c55e", borderRadius: 1, border: "1px solid #40464e", boxShadow: "0 0 4px #22c55e" }} />)}
          </div>
        </div>
      </div>
    </Card>
  );

  const mountTable = (
    <Card pad={0}>
      <div style={{ padding: "12px 16px 0", fontWeight: 700, fontSize: 13 }}>Storage / Mounts</div>
      <table className="sn-list-table" style={{ fontSize: 12 }}>
        <thead><tr><th>Mount</th><th style={{ width: 90 }}>Size</th><th style={{ width: 180 }}>Used</th><th style={{ width: 100 }}>Disk I/O</th><th style={{ width: 110 }}>Health</th></tr></thead>
        <tbody>
          {MOUNTS.map(m => (
            <tr key={m.fs}>
              <td className="mono" style={{ fontWeight: 600 }}>{m.fs}</td>
              <td className="mono">{m.size}</td>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <HBar pct={m.used} color={m.used > 75 ? "#f59e0b" : "#16a34a"} />
                  <span className="mono" style={{ fontSize: 11, width: 30 }}>{m.used}%</span>
                </div>
              </td>
              <td className="mono">{m.io}</td>
              <td><StatusPill s={m.used > 90 ? "down" : m.used > 75 ? "warn" : "up"} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );

  const nicTable = (
    <Card pad={0}>
      <div style={{ padding: "12px 16px 0", fontWeight: 700, fontSize: 13 }}>Network Interfaces</div>
      <table className="sn-list-table" style={{ fontSize: 12 }}>
        <thead><tr><th>NIC</th><th style={{ width: 90 }}>Status</th><th style={{ width: 90 }}>Speed</th><th style={{ width: 110 }}>RX</th><th style={{ width: 110 }}>TX</th><th style={{ width: 70 }}>Drops</th></tr></thead>
        <tbody>
          {NICS.map(n => (
            <tr key={n.name}>
              <td className="mono" style={{ fontWeight: 600 }}>{n.name}</td>
              <td><StatusPill s={n.status} /></td>
              <td className="mono">{n.speed}</td>
              <td className="mono">{n.rx}</td>
              <td className="mono">{n.tx}</td>
              <td className="mono" style={{ color: n.drops > 0 ? "#dc2626" : "#16a34a" }}>{n.drops}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );

  const hardwarePanel = (
    <Card title="Hardware Sensors (iDRAC)">
      {SENSORS.map(g => (
        <div key={g.group} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, color: "#8a94a3", textTransform: "uppercase", letterSpacing: 0.5, margin: "6px 0 2px" }}>{g.group}</div>
          {g.items.map(([l, v, s]) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #f3f5f7", fontSize: 12 }}>
              <span style={{ color: "#3d4a5c" }}>{l}</span>
              <span style={{ fontWeight: 600, color: s === "ok" ? "#16212e" : s === "warn" ? "#b45309" : "#b91c1c", display: "inline-flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: s === "ok" ? "#16a34a" : s === "warn" ? "#f59e0b" : "#ef4444" }} />{v}
              </span>
            </div>
          ))}
        </div>
      ))}
    </Card>
  );

  const procPanel = (
    <Card title="Top Processes / VMs">
      {PROCS.map(p => (
        <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0", borderBottom: "1px solid #f3f5f7", fontSize: 12 }}>
          <span className="mono" style={{ flex: 1, color: "#3d4a5c" }}>{p.name}</span>
          <span className="mono" style={{ width: 74, textAlign: "right", color: p.cpu > 15 ? "#b45309" : "#6b7785" }}>cpu {p.cpu}%</span>
          <span className="mono" style={{ width: 74, textAlign: "right", color: "#6b7785" }}>mem {p.mem}%</span>
        </div>
      ))}
      {hostedVms.length > 0 && (
        <div style={{ marginTop: 8, fontSize: 11.5, color: "#6b7785" }}>
          {hostedVms.length} VMs on this host — <a className="sn-link" onClick={() => setRoute("infra-vms")}>open virtual machines</a>
        </div>
      )}
    </Card>
  );

  return (
    <div className="page page-fade sn-dash" onClick={() => setPop(null)}>
      <div className="sn-breadcrumb">
        <a className="sn-link" onClick={() => setRoute("infra")}>Infra</a><span className="sn-bc-sep">›</span>
        <a className="sn-link" onClick={() => setRoute("infra-assets")}>Devices</a><span className="sn-bc-sep">›</span>
        <a className="sn-link">Servers</a><span className="sn-bc-sep">›</span>
        <span>{d.id}</span>
      </div>

      <DetailHeader d={d} tabs={TABS} tab={tab} setTab={setTab} category="server" />

      <div style={{ padding: "16px 24px", display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          {(tab === "Overview" || tab === "Hardware" || tab === "Topology") && frontPanel}

          {tab === "Overview" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              <KpiTile label="Running VMs" value={String(hostedVms.length || 14)} delta="all healthy" up good sub="" />
              <KpiTile label="Disk IOPS" value="24.6K" delta="8.4%" up good />
              <KpiTile label="Network" value="4.21 Gbps" delta="5.1%" up good />
              <KpiTile label="RAID" value="Rebuild 62%" delta="bay 3" up={false} good={false} sub="ETA 42m" />
            </div>
          )}

          {(tab === "Overview" || tab === "Performance") && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              <Card title="CPU & Memory" right={<span style={{ fontSize: 10.5, color: "#6b7785" }}><span style={{ color: "#2563eb" }}>●</span> CPU <span style={{ color: "#16a34a" }}>●</span> Memory</span>} pad={14}>
                <LineChart series={[MEM, CPU]} colors={["#16a34a", "#2563eb"]} yTicks={["100%", "75%", "50%", "25%", "0%"]} />
              </Card>
              <Card title="Disk I/O (MB/s)" right={<span style={{ fontSize: 10.5 }}><b className="mono" style={{ color: "#16a34a" }}>R 412</b> <b className="mono" style={{ color: "#7c3aed" }}>W 262</b></span>} pad={14}>
                <LineChart series={[IO_R, IO_W]} colors={["#16a34a", "#7c3aed"]} yTicks={["500", "375", "250", "125", "0"]} />
              </Card>
              <Card title="Network (Gbps)" right={<span style={{ fontSize: 10.5 }}><b className="mono" style={{ color: "#16a34a" }}>RX 4.21</b> <b className="mono" style={{ color: "#2563eb" }}>TX 3.86</b></span>} pad={14}>
                <LineChart series={[NET_RX, NET_TX]} colors={["#16a34a", "#2563eb"]} yTicks={["5G", "3.75G", "2.5G", "1.25G", "0"]} />
              </Card>
            </div>
          )}

          {(tab === "Overview" || tab === "Storage") && mountTable}
          {(tab === "Overview" || tab === "Network") && nicTable}
          {tab === "Hardware" && hardwarePanel}
          {tab === "Processes" && procPanel}

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

        {/* right rail */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card title="Device Health">
            {([["CPU Utilization", jitter(47, 4)], ["Memory Utilization", jitter(64, 2)], ["Disk /data", 78]] as [string, number][]).map(([l, v]) => (
              <div key={l} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: "#6b7785" }}>{l}</span><b className="mono">{v}%</b>
                </div>
                <HBar pct={v} color={v > 75 ? "#f59e0b" : "#16a34a"} />
              </div>
            ))}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 14px", marginTop: 12, fontSize: 12 }}>
              <div><div style={{ color: "#6b7785", fontSize: 11 }}>Load Average</div><b className="mono" style={{ fontSize: 15 }}>6.4</b></div>
              <div><div style={{ color: "#6b7785", fontSize: 11 }}>Cores / RAM</div><b className="mono" style={{ fontSize: 15 }}>64 / 512G</b></div>
              <div><div style={{ color: "#6b7785", fontSize: 11 }}>iDRAC</div><b style={{ fontSize: 12, color: "#16a34a" }}>Reachable</b></div>
              <div><div style={{ color: "#6b7785", fontSize: 11 }}>Last Reboot</div><b className="mono" style={{ fontSize: 12 }}>187d ago</b></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 14, paddingTop: 12, borderTop: "1px solid #f0f2f5" }}>
              {([["fa-temperature-half", "Inlet Temp", "24 °C"], ["fa-fan", "Fans", "5/6 OK"], ["fa-plug", "PSU Status", "2 / 2"]] as [string, string, string][]).map(([ic, l, v]) => (
                <div key={l} style={{ textAlign: "center" }}>
                  <i className={`fa-solid ${ic}`} style={{ color: v.includes("5/6") ? "#dc2626" : "#2563eb", fontSize: 13 }} />
                  <div style={{ fontSize: 9.5, color: "#8a94a3", margin: "3px 0 1px" }}>{l}</div>
                  <b className="mono" style={{ fontSize: 12 }}>{v}</b>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Memory Breakdown">
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Donut parts={MEM_BREAKDOWN} />
              <div style={{ flex: 1, fontSize: 11.5 }}>
                {MEM_BREAKDOWN.map(a => (
                  <div key={a.name} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                    <span style={{ color: "#3d4a5c" }}><span style={{ color: a.color }}>●</span> {a.name}</span>
                    <span className="mono" style={{ color: "#6b7785" }}>{a.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {hardwarePanel}
          {procPanel}
        </div>
      </div>

      <FooterStrip />

      {pop && (
        <div style={{ position: "fixed", left: pop.x, top: pop.y, zIndex: 70, background: "#16212e", color: "white", borderRadius: 8, padding: "12px 14px", fontSize: 12, minWidth: 200, boxShadow: "0 12px 28px rgba(0,0,0,.35)" }} onClick={e => e.stopPropagation()}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Drive Bay {pop.b.n}</div>
          <div style={{ display: "grid", gridTemplateColumns: "auto auto", gap: "3px 18px", color: "#c4cdd6" }}>
            <span>Status</span><span className="mono" style={{ color: bayColor(pop.b.status), textAlign: "right", fontWeight: 700 }}>{pop.b.status === "ok" ? "Online" : pop.b.status === "rebuild" ? "Rebuilding" : pop.b.status === "failed" ? "Failed" : "Empty"}</span>
            <span>Capacity</span><span className="mono" style={{ color: "white", textAlign: "right" }}>{pop.b.size}</span>
            <span>Media</span><span className="mono" style={{ color: "white", textAlign: "right" }}>{pop.b.type}</span>
            {pop.b.status === "rebuild" && (<><span>Rebuild</span><span className="mono" style={{ color: "#fbbf24", textAlign: "right" }}>62% · ETA 42m</span></>)}
          </div>
        </div>
      )}
    </div>
  );
}
