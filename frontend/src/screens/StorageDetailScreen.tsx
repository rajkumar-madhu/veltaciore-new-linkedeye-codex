// Storage array monitoring — LinkedEye-style detail page for SAN/NAS arrays:
// drive-shelf front panel, capacity, volumes, IOPS/latency charts,
// controllers, and replication.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { useUiStore } from "@/store/ui";
import { useDevice } from "@/api/hooks";
import { DEVICES } from "@/data/infra";
import type { Device } from "@/lib/types";
import {
  Card, DetailHeader, Donut, FooterStrip, HBar, KpiTile, LineChart,
  LiveBadge, PanelLegend, StatusPill,
} from "@/components/deviceDetail";

interface Sled { n: number; status: "ok" | "rebuild" | "failed" | "empty"; size: string }

const SLEDS: Sled[] = Array.from({ length: 24 }, (_, i) => ({
  n: i,
  status: i === 17 ? "failed" : i === 18 ? "rebuild" : i >= 22 ? "empty" : "ok",
  size: i >= 22 ? "—" : i < 12 ? "7.68 TB" : "3.84 TB",
}));

const VOLUMES = [
  { name: "vol-prod-vmfs-01", pool: "flash-pool-a", size: "40 TB", used: 71, iops: "12.4K", lat: "0.42 ms", health: "up" as const },
  { name: "vol-prod-vmfs-02", pool: "flash-pool-a", size: "40 TB", used: 64, iops: "9.8K", lat: "0.38 ms", health: "up" as const },
  { name: "vol-oracle-asm", pool: "flash-pool-b", size: "24 TB", used: 82, iops: "18.2K", lat: "0.51 ms", health: "warn" as const },
  { name: "vol-fileshare", pool: "hybrid-pool", size: "60 TB", used: 55, iops: "2.1K", lat: "1.9 ms", health: "up" as const },
  { name: "vol-backup-target", pool: "hybrid-pool", size: "120 TB", used: 61, iops: "1.4K", lat: "3.2 ms", health: "up" as const },
];

const IOPS_R = [38, 44, 41, 52, 47, 43, 49, 55, 46, 44, 50, 47];
const IOPS_W = [21, 26, 24, 30, 28, 25, 27, 31, 26, 24, 28, 26];
const THR_R = [3.1, 3.6, 3.4, 4.0, 4.2, 3.8, 4.0, 4.3, 3.9, 4.1, 4.2, 4.2];
const THR_W = [1.7, 2.0, 1.9, 2.3, 2.4, 2.1, 2.2, 2.5, 2.2, 2.3, 2.4, 2.4];
const LAT = [0.41, 0.44, 0.42, 0.48, 0.52, 0.45, 0.47, 0.51, 0.46, 0.44, 0.49, 0.46];

const CAPACITY = [
  { name: "Used", pct: 68, color: "#2563eb" },
  { name: "Snapshots", pct: 9, color: "#7c3aed" },
  { name: "System", pct: 3, color: "#f59e0b" },
  { name: "Free", pct: 20, color: "#d1d9e0" },
];

const SENSORS: [string, string, "ok" | "warn" | "crit"][] = [
  ["Controller A", "Primary · OK", "ok"],
  ["Controller B", "Secondary · OK", "ok"],
  ["NVRAM Battery", "Charged", "ok"],
  ["Drive slot 17", "Failed · spare active", "crit"],
  ["Drive slot 18", "Rebuilding 44%", "warn"],
  ["PSU 1 / PSU 2", "OK / OK", "ok"],
  ["Enclosure Temp", "27 °C", "ok"],
];

const TABS = ["Overview", "Volumes", "Pools", "Drives", "Performance", "Controllers", "Replication", "Logs", "Alerts", "Settings"];

const sledColor = (s: Sled["status"]) => (s === "ok" ? "#22c55e" : s === "rebuild" ? "#f59e0b" : s === "failed" ? "#ef4444" : "#3a4048");

export default function StorageDetailScreen() {
  const { setRoute } = useNav();
  const paramId = useUiStore(s => s.params.deviceId as string | undefined);
  const kinds = ["storage", "nas"];
  const seed = DEVICES.find(d => d.id === paramId && kinds.includes(d.kind))
    ?? DEVICES.find(d => d.kind === "storage") ?? DEVICES[0];
  const { data: live } = useDevice(seed.id);
  const d: Device = live ?? seed;

  const [tab, setTab] = React.useState("Overview");
  const [pop, setPop] = React.useState<{ x: number; y: number; s: Sled } | null>(null);
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 10_000);
    return () => clearInterval(t);
  }, []);
  const jitter = (v: number, amp: number) => Math.max(0, Math.round(v + Math.sin(tick * 2.3) * amp));

  const showPop = (e: React.MouseEvent, s: Sled) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPop({ x: Math.min(r.left, window.innerWidth - 230), y: r.bottom + 8, s });
  };

  const vendor = (d.model || "").split(" ")[0].toUpperCase();

  const frontPanel = (
    <Card title={<span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>Device Front Panel <LiveBadge /></span>} right={<PanelLegend />}>
      <div style={{ background: "linear-gradient(180deg,#2c313a 0%,#20242c 60%,#181c23 100%)", border: "1px solid #3a4048", borderRadius: 8, padding: "14px 18px", display: "flex", alignItems: "center", gap: 16, boxShadow: "inset 0 1px 0 rgba(255,255,255,.06), 0 3px 10px rgba(15,25,35,.25)" }}>
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontWeight: 900, fontSize: 12, color: "#f97316", letterSpacing: 0.8 }}>{vendor}</div>
          <div style={{ fontSize: 9, color: "#8b95a3", marginBottom: 8 }}>{d.model.split(" ").slice(1).join(" ")}</div>
          {["PWR", "CT-A", "CT-B"].map((l, i) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 4px #22c55e" }} />
              <span style={{ fontSize: 7, fontFamily: "var(--font-mono)", color: "#8b95a3" }}>{l}</span>
            </div>
          ))}
        </div>
        {/* 24 vertical drive sleds */}
        <div style={{ display: "flex", gap: 4, flex: 1, justifyContent: "center" }}>
          {SLEDS.map(s => (
            <div key={s.n} onMouseEnter={e => showPop(e, s)} onMouseLeave={() => setPop(null)} onClick={e => { e.stopPropagation(); showPop(e, s); }}
              title={`slot ${s.n}`}
              style={{ width: 16, height: 56, background: s.status === "empty" ? "#171b22" : "linear-gradient(180deg,#333945,#242932)", border: "1px solid #40464e", borderRadius: 2, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", paddingBottom: 4, gap: 3 }}>
              <span style={{ width: 8, height: 22, borderRadius: 1, background: s.status === "empty" ? "transparent" : "repeating-linear-gradient(0deg,#1c2129 0 4px,#242a33 4px 8px)" }} />
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: sledColor(s.status), boxShadow: s.status !== "empty" ? `0 0 4px ${sledColor(s.status)}` : "none" }} />
            </div>
          ))}
        </div>
        <div style={{ flexShrink: 0, textAlign: "center" }}>
          <span style={{ fontSize: 8, color: "#8b95a3", fontFamily: "var(--font-mono)" }}>FC 32G ×4</span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, auto)", gap: 3, marginTop: 3 }}>
            {[0, 1, 2, 3].map(i => <span key={i} style={{ width: 18, height: 9, background: "#22c55e", borderRadius: 1, border: "1px solid #40464e", boxShadow: "0 0 4px #22c55e" }} />)}
          </div>
        </div>
      </div>
    </Card>
  );

  const volumeTable = (
    <Card pad={0}>
      <div style={{ padding: "12px 16px 0", fontWeight: 700, fontSize: 13 }}>Volumes</div>
      <table className="sn-list-table" style={{ fontSize: 12 }}>
        <thead><tr><th>Volume</th><th style={{ width: 120 }}>Pool</th><th style={{ width: 80 }}>Size</th><th style={{ width: 170 }}>Used</th><th style={{ width: 80 }}>IOPS</th><th style={{ width: 90 }}>Latency</th><th style={{ width: 110 }}>Health</th></tr></thead>
        <tbody>
          {VOLUMES.map(v => (
            <tr key={v.name}>
              <td className="mono" style={{ fontWeight: 600 }}>{v.name}</td>
              <td className="mono">{v.pool}</td>
              <td className="mono">{v.size}</td>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <HBar pct={v.used} color={v.used > 80 ? "#f59e0b" : "#16a34a"} />
                  <span className="mono" style={{ fontSize: 11, width: 30 }}>{v.used}%</span>
                </div>
              </td>
              <td className="mono">{v.iops}</td>
              <td className="mono">{v.lat}</td>
              <td><StatusPill s={v.health} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );

  const sensorsPanel = (
    <Card title="Hardware Sensors">
      {SENSORS.map(([l, v, s]) => (
        <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #f3f5f7", fontSize: 12 }}>
          <span style={{ color: "#3d4a5c" }}>{l}</span>
          <span style={{ fontWeight: 600, color: s === "ok" ? "#16212e" : s === "warn" ? "#b45309" : "#b91c1c", display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: s === "ok" ? "#16a34a" : s === "warn" ? "#f59e0b" : "#ef4444" }} />{v}
          </span>
        </div>
      ))}
    </Card>
  );

  const replicationPanel = (
    <Card title="Replication">
      {([["Peer array", "SAN-FRA-DR-01", ""], ["Mode", "Async · 15 min RPO", ""], ["Link status", "Healthy", "#16a34a"], ["Lag", "4m 12s", ""], ["Last snapshot", "10:26 IST", ""]] as [string, string, string][]).map(([l, v, tone]) => (
        <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #f3f5f7", fontSize: 12 }}>
          <span style={{ color: "#6b7785" }}>{l}</span>
          <span style={{ fontWeight: 600, color: tone || "#16212e", display: "inline-flex", alignItems: "center", gap: 5 }}>{tone && <span style={{ width: 6, height: 6, borderRadius: "50%", background: tone }} />}{v}</span>
        </div>
      ))}
    </Card>
  );

  return (
    <div className="page page-fade sn-dash" onClick={() => setPop(null)}>
      <div className="sn-breadcrumb">
        <a className="sn-link" onClick={() => setRoute("infra")}>Infra</a><span className="sn-bc-sep">›</span>
        <a className="sn-link" onClick={() => setRoute("infra-assets")}>Devices</a><span className="sn-bc-sep">›</span>
        <a className="sn-link">Storage</a><span className="sn-bc-sep">›</span>
        <span>{d.id}</span>
      </div>

      <DetailHeader d={d} tabs={TABS} tab={tab} setTab={setTab} category="storage" />

      <div style={{ padding: "16px 24px", display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          {(tab === "Overview" || tab === "Drives") && frontPanel}

          {tab === "Overview" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              <KpiTile label="Capacity Used" value="68%" delta="185 / 272 TB" up good sub="" />
              <KpiTile label="IOPS" value={`${jitter(47, 4)}K`} delta="6.8%" up good />
              <KpiTile label="Avg Latency" value="0.46 ms" delta="0.05 ms" up={false} good />
              <KpiTile label="Data Reduction" value="3.8 : 1" delta="dedup + compress" up good sub="" />
            </div>
          )}

          {(tab === "Overview" || tab === "Performance") && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              <Card title="IOPS (K)" right={<span style={{ fontSize: 10.5 }}><b className="mono" style={{ color: "#16a34a" }}>R 47K</b> <b className="mono" style={{ color: "#7c3aed" }}>W 26K</b></span>} pad={14}>
                <LineChart series={[IOPS_R, IOPS_W]} colors={["#16a34a", "#7c3aed"]} yTicks={["60K", "45K", "30K", "15K", "0"]} />
              </Card>
              <Card title="Throughput (GB/s)" right={<span style={{ fontSize: 10.5 }}><b className="mono" style={{ color: "#16a34a" }}>R 4.2</b> <b className="mono" style={{ color: "#2563eb" }}>W 2.4</b></span>} pad={14}>
                <LineChart series={[THR_R, THR_W]} colors={["#16a34a", "#2563eb"]} yTicks={["5", "3.75", "2.5", "1.25", "0"]} />
              </Card>
              <Card title="Latency (ms)" right={<b className="mono" style={{ fontSize: 12.5, color: "#16a34a" }}>0.46 ms</b>} pad={14}>
                <LineChart series={[LAT]} colors={["#f59e0b"]} yTicks={["1.0", "0.75", "0.5", "0.25", "0"]} />
              </Card>
            </div>
          )}

          {(tab === "Overview" || tab === "Volumes" || tab === "Pools") && volumeTable}
          {tab === "Controllers" && sensorsPanel}
          {tab === "Replication" && replicationPanel}

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
            {([["Capacity", 68], ["Flash wear (worst)", 22], ["Cache hit rate", 94]] as [string, number][]).map(([l, v]) => (
              <div key={l} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: "#6b7785" }}>{l}</span><b className="mono">{v}%</b>
                </div>
                <HBar pct={v} color={l === "Capacity" && v > 80 ? "#f59e0b" : "#16a34a"} />
              </div>
            ))}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 14px", marginTop: 12, fontSize: 12 }}>
              <div><div style={{ color: "#6b7785", fontSize: 11 }}>Drives</div><b className="mono" style={{ fontSize: 15 }}>21/24 <span style={{ color: "#dc2626", fontSize: 11 }}>1 failed</span></b></div>
              <div><div style={{ color: "#6b7785", fontSize: 11 }}>Spares</div><b className="mono" style={{ fontSize: 15 }}>1 active</b></div>
              <div><div style={{ color: "#6b7785", fontSize: 11 }}>FC Fabric</div><b style={{ fontSize: 12, color: "#16a34a" }}>4 paths Up</b></div>
              <div><div style={{ color: "#6b7785", fontSize: 11 }}>Rebuild ETA</div><b className="mono" style={{ fontSize: 12 }}>1h 08m</b></div>
            </div>
          </Card>

          <Card title="Capacity Breakdown">
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Donut parts={CAPACITY} />
              <div style={{ flex: 1, fontSize: 11.5 }}>
                {CAPACITY.map(a => (
                  <div key={a.name} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                    <span style={{ color: "#3d4a5c" }}><span style={{ color: a.color }}>●</span> {a.name}</span>
                    <span className="mono" style={{ color: "#6b7785" }}>{a.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {sensorsPanel}
          {replicationPanel}
        </div>
      </div>

      <FooterStrip />

      {pop && (
        <div style={{ position: "fixed", left: pop.x, top: pop.y, zIndex: 70, background: "#16212e", color: "white", borderRadius: 8, padding: "12px 14px", fontSize: 12, minWidth: 190, boxShadow: "0 12px 28px rgba(0,0,0,.35)" }} onClick={e => e.stopPropagation()}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Drive Slot {pop.s.n}</div>
          <div style={{ display: "grid", gridTemplateColumns: "auto auto", gap: "3px 18px", color: "#c4cdd6" }}>
            <span>Status</span><span className="mono" style={{ color: sledColor(pop.s.status), textAlign: "right", fontWeight: 700 }}>{pop.s.status === "ok" ? "Online" : pop.s.status === "rebuild" ? "Rebuilding 44%" : pop.s.status === "failed" ? "Failed" : "Empty"}</span>
            <span>Capacity</span><span className="mono" style={{ color: "white", textAlign: "right" }}>{pop.s.size}</span>
            <span>Media</span><span className="mono" style={{ color: "white", textAlign: "right" }}>{pop.s.status === "empty" ? "—" : "NVMe flash"}</span>
          </div>
        </div>
      )}
    </div>
  );
}
