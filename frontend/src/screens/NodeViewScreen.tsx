// Single-Node view — Netdata-style per-host deep dive: system charts (CPU
// user/system/iowait, memory, disk I/O, network, load), top processes, and
// per-node alarms. High-granularity feel; light-theme house style.
import React from "react";
import { Kpi, FormSection } from "@/components/primitives";
import { LineChart } from "@/components/deviceDetail";
import { wave as sharedWave } from "@/lib/series";

const wave = (seed: number, base: number, amp: number, n?: number) => sharedWave(seed, base, amp, { n, f1: 0.7, f2: 1.6, floor: true });

const NODE = {
  host: "trading-blr07",
  ip: "10.10.10.15",
  role: "OMS core · NSE adapter",
  os: "Ubuntu 22.04 LTS · kernel 6.5.0",
  uptime: "48d 6h",
  cores: 32,
  ramGb: 128,
};

interface Proc { pid: number; cmd: string; cpu: number; mem: number; rss: string; }
const PROCS: Proc[] = [
  { pid: 2841, cmd: "oms-core --nse", cpu: 214.6, mem: 18.2, rss: "23.3 GB" },
  { pid: 3120, cmd: "feed-handler nse", cpu: 96.4, mem: 6.1, rss: "7.8 GB" },
  { pid: 1044, cmd: "node_exporter", cpu: 2.1, mem: 0.3, rss: "384 MB" },
  { pid: 5561, cmd: "rabbitmq-server", cpu: 41.8, mem: 4.4, rss: "5.6 GB" },
  { pid: 7788, cmd: "postgres: writer", cpu: 12.3, mem: 3.2, rss: "4.1 GB" },
  { pid: 9011, cmd: "redis-server", cpu: 8.7, mem: 1.1, rss: "1.4 GB" },
];

export default function NodeViewScreen() {
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const toggle = (id: string) => setCollapsed((c) => ({ ...c, [id]: !c[id] }));

  const cpuUser = wave(1, 42, 16);
  const cpuSys = wave(2, 14, 6);
  const cpuWait = wave(3, 6, 4);
  const cpuNow = Math.round(cpuUser[cpuUser.length - 1] + cpuSys[cpuSys.length - 1] + cpuWait[cpuWait.length - 1]);
  const mem = wave(4, 68, 8);
  const diskR = wave(5, 120, 60);
  const diskW = wave(6, 80, 40);
  const netIn = wave(7, 340, 120);
  const netOut = wave(8, 210, 90);
  const load = wave(9, 12, 5);

  return (
    <div className="page page-fade sn-dash">
      <div className="sn-breadcrumb">
        <a className="sn-link">Home</a><span className="sn-bc-sep">›</span>
        <a className="sn-link">Infrastructure</a><span className="sn-bc-sep">›</span>
        <span>Node · {NODE.host}</span>
      </div>

      <div className="sn-form-header">
        <div className="sn-form-title-row">
          <span className="sn-rec-number">NODE</span>
          <span className="sn-pill prio-1"><i className="fa-solid fa-fire" /> CPU {cpuNow}%</span>
          <span className="sn-pill state-neutral"><i className="fa-solid fa-microchip" /> {NODE.cores} cores</span>
          <span className="sn-pill svc-healthy"><i className="fa-solid fa-clock" /> up {NODE.uptime}</span>
        </div>
        <div className="sn-form-title-meta">
          <div>
            <h1>{NODE.host}</h1>
            <div className="sn-form-sub mono">{NODE.ip} · {NODE.role} · {NODE.os}</div>
          </div>
          <div className="sn-form-actions">
            <button className="sn-btn"><i className="fa-solid fa-terminal" /> SSH</button>
            <button className="sn-btn"><i className="fa-solid fa-arrows-rotate" /> 1s refresh</button>
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 24px 0" }}>
        <div className="sn-kpi-strip">
          <Kpi l="CPU" v={<>{cpuNow}<span style={{ fontSize: 13, color: "#8a94a3" }}>%</span></>} s={`${NODE.cores} cores · load ${load[load.length - 1]}`} tone={cpuNow > 80 ? "crit" : "warn"} />
          <Kpi l="Memory" v={<>{mem[mem.length - 1]}<span style={{ fontSize: 13, color: "#8a94a3" }}>%</span></>} s={`of ${NODE.ramGb} GB`} tone="warn" />
          <Kpi l="Disk I/O" v={<>{Math.round(diskR[diskR.length - 1] + diskW[diskW.length - 1])}<span style={{ fontSize: 13, color: "#8a94a3" }}> MB/s</span></>} s="read + write" tone="neutral" />
          <Kpi l="Network" v={<>{netIn[netIn.length - 1]}<span style={{ fontSize: 13, color: "#8a94a3" }}> MB/s</span></>} s={`in · ${netOut[netOut.length - 1]} out`} tone="ok" />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, padding: "16px 24px 24px" }}>
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <NodeChart title="CPU utilization" sub="user · system · iowait" legend={[["user", "#2563eb"], ["system", "#f59e0b"], ["iowait", "#ef4444"]]}
              series={[cpuUser, cpuSys, cpuWait]} colors={["#2563eb", "#f59e0b", "#ef4444"]} yTicks={["100%", "50%", "0"]} />
            <NodeChart title="Memory" sub={`${NODE.ramGb} GB total`} legend={[["used %", "#8b5cf6"]]}
              series={[mem]} colors={["#8b5cf6"]} yTicks={["100%", "50%", "0"]} />
            <NodeChart title="Disk I/O" sub="MB/s" legend={[["read", "#10b981"], ["write", "#f97316"]]}
              series={[diskR, diskW]} colors={["#10b981", "#f97316"]} yTicks={["200", "100", "0"]} />
            <NodeChart title="Network" sub="MB/s" legend={[["in", "#2563eb"], ["out", "#06b6d4"]]}
              series={[netIn, netOut]} colors={["#2563eb", "#06b6d4"]} yTicks={["500", "250", "0"]} />
          </div>

          <FormSection id="proc" title="Top processes" badge="by CPU" collapsed={collapsed.proc} onToggle={toggle}>
            <table className="sn-list-table" style={{ fontSize: 12.5 }}>
              <thead>
                <tr><th style={{ width: 70 }}>PID</th><th>COMMAND</th><th style={{ width: 90 }}>CPU %</th><th style={{ width: 90 }}>MEM %</th><th style={{ width: 90 }}>RSS</th></tr>
              </thead>
              <tbody>
                {PROCS.map((p) => (
                  <tr key={p.pid}>
                    <td className="mono" style={{ color: "#475467" }}>{p.pid}</td>
                    <td className="mono" style={{ color: "#0f1c3f", fontWeight: 600 }}>{p.cmd}</td>
                    <td className="mono" style={{ fontWeight: 700, color: p.cpu > 100 ? "#dc2626" : "#475467" }}>{p.cpu}</td>
                    <td className="mono" style={{ color: "#475467" }}>{p.mem}</td>
                    <td className="mono" style={{ color: "#475467" }}>{p.rss}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </FormSection>
        </div>

        {/* Alarms + facts rail */}
        <aside style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="card" style={{ background: "white", border: "1px solid #e5e8eb", borderRadius: 6, padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 10 }}><i className="fa-solid fa-bell" style={{ color: "var(--accent)", marginRight: 6 }} /> Node alarms</div>
            {[
              ["10m_cpu", "CPU > 80% for 10m", "crit"],
              ["ram_in_use", "RAM in use 76%", "warn"],
              ["disk_space", "/ 48% used", "ok"],
              ["net_drops", "0 packet drops", "ok"],
            ].map(([id, label, sev]) => {
              const c = sev === "crit" ? "#dc2626" : sev === "warn" ? "#b45309" : "#059669";
              const bg = sev === "crit" ? "#fef2f2" : sev === "warn" ? "#fffbeb" : "#ecfdf5";
              return (
                <div key={id as string} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: 6, background: bg, marginBottom: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />
                  <span style={{ fontSize: 12, color: "#334155" }}>{label}</span>
                  <span className="mono" style={{ marginLeft: "auto", fontSize: 10.5, color: "#8a94a3" }}>{id}</span>
                </div>
              );
            })}
          </div>

          <div className="card" style={{ background: "white", border: "1px solid #e5e8eb", borderRadius: 6, padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 10 }}><i className="fa-solid fa-circle-info" style={{ color: "var(--accent)", marginRight: 6 }} /> System</div>
            {([["Hostname", NODE.host], ["IP", NODE.ip], ["Cores", `${NODE.cores} vCPU`], ["Memory", `${NODE.ramGb} GB`], ["OS", NODE.os], ["Uptime", NODE.uptime], ["Exporter", "node-exporter :9100"]] as const).map(([l, v]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 12, borderBottom: "1px solid #f4f6f8" }}>
                <span style={{ color: "#8a94a3" }}>{l}</span><span className="mono" style={{ color: "#0f1c3f", textAlign: "right", maxWidth: 190 }}>{v}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function NodeChart({ title, sub, legend, series, colors, yTicks }: {
  title: string; sub: string; legend: [string, string][]; series: number[][]; colors: string[]; yTicks: string[];
}) {
  return (
    <div className="card" style={{ background: "white", border: "1px solid #e5e8eb", borderRadius: 6, padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <div><b style={{ fontSize: 12.5 }}>{title}</b> <span style={{ fontSize: 11, color: "#8a94a3" }}>{sub}</span></div>
        <div style={{ display: "flex", gap: 10, fontSize: 10.5 }}>
          {legend.map(([l, c]) => <span key={l} style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#475467" }}><span style={{ width: 8, height: 3, borderRadius: 2, background: c }} /> {l}</span>)}
        </div>
      </div>
      <LineChart series={series} colors={colors} h={120} yTicks={yTicks} />
    </div>
  );
}
