// Production device monitoring: Overview / Availability / Performance / Interfaces / Hardware / Alerts / Logs
// Ported from screens/infra-device.jsx.
// Maps to: GET /api/infra/devices/{id}/{overview|availability|cpu|memory|disk|interfaces|hardware|alerts|logs}/
import React from "react";
import { useNav } from "@/hooks/useNav";
import { useUiStore } from "@/store/ui";
import { useDevice } from "@/api/hooks";
import { DEVICES, DEVICE_KINDS, SITES, VMS, NET_LINKS, INFRA_ALERTS } from "@/data/infra";
import { Kpi, FormSection, FormRow, Field } from "@/components/primitives";
import { STATUS_COLORS, getMetricColor, getErrorRateColor, getInterfaceColor, getStatusBadgeClass } from "@/lib/statusColors";
import type { Device, DeviceKind, Site } from "@/lib/types";

type SparkProps = { data: number[]; color?: string; h?: number; unit?: string };
type BarProps = { pct: number; warn?: number; crit?: number; width?: number };

type IfaceRow = [string, string, string, string, string, number, number, number, string, string, number, number, number, number, number, string, string];

export default function InfraDeviceScreen() {
  const { setRoute } = useNav();
  const deviceId = useUiStore((s) => s.params.deviceId as string | undefined);
  const { data: apiDevice } = useDevice(deviceId);
  const d: Device = apiDevice ?? DEVICES.find(x => x.id === deviceId) ?? DEVICES.find(x => x.id === "SW-BLR-TOR-13") ?? DEVICES[0];
  const k = DEVICE_KINDS.find(x => x.id === d.kind) || ({} as DeviceKind);
  const deviceAlerts = INFRA_ALERTS.filter(a => a.device === d.id);
  const [tab, setTab] = React.useState("overview");
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => { const t = setInterval(() => setTick(x => x + 1), 30000); return () => clearInterval(t); }, []);

  // Deterministic per-device pseudo-random series (stands in for API metric history)
  const seed = d.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const series = (base: number, spread: number, n = 32) => Array.from({ length: n }, (_, i) => {
    const v = base + Math.sin((seed + i) * 1.7) * spread * 0.5 + Math.sin((seed * 3 + i) * 0.6) * spread * 0.5;
    return Math.max(0, Math.min(100, Math.round(v)));
  });
  const vendor = (d.model || "").split(" ")[0];
  const serial = "SN-" + seed.toString(16).toUpperCase().padStart(6, "0");
  const isNet = ["firewall", "router", "switch", "loadbal"].includes(d.kind);
  const isDown = d.status === "down";
  const statusPill = d.status === "ok" ? "svc-healthy" : d.status === "warn" ? "state-mitigating" : "state-active";
  const statusLabel = d.status === "ok" ? "Up" : d.status === "warn" ? "Degraded" : d.status === "critical" ? "Critical" : "Down";
  const siteObj = SITES.find(s => s.id === d.site) || ({} as Site);

  const Spark = ({ data, color = "var(--success)", h = 56, unit = "%" }: SparkProps) => {
    const w = 100, max = 100;
    const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * (h - 6) - 3}`).join(" ");
    return (
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: "100%", height: h, display: "block" }}>
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.6" />
        <polygon points={`0,${h} ${pts} ${w},${h}`} fill={color} opacity="0.09" />
      </svg>
    );
  };
  const MetricCard = ({ label, value, sub, data, color }: { label: React.ReactNode; value: React.ReactNode; sub?: React.ReactNode; data?: number[]; color?: string }) => (
    <div style={{ background: "white", border: "1px solid var(--border, #e5e8eb)", borderRadius: 4, padding: "10px 12px" }}>
      <div style={{ fontSize: 10.5, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--fg-muted)", fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--fg-muted)", marginBottom: 6 }}>{sub}</div>
      {data && <Spark data={data} color={color} />}
    </div>
  );
  const Bar = ({ pct, warn = 70, crit = 85, width = 90 }: BarProps) => {
    const c = getMetricColor(pct, warn, crit);
    return <div className="sn-sla"><div className="sn-sla-bar" style={{ width }}><div className="sn-sla-fill" style={{ width: Math.min(100, pct) + "%", background: c.line }} /></div><span className="mono" style={{ fontSize: 11, color: c.fg, fontWeight: 600 }}>{pct}%</span></div>;
  };

  const isHost = ["hypervisor", "phys-srv"].includes(d.kind);
  const TABS: [string, string, string][] = [
    ["overview", "Overview", "fa-circle-info"],
    ["availability", "Availability", "fa-heart-pulse"],
    ["performance", "Performance", "fa-gauge-high"],
    ["interfaces", "Interfaces", "fa-ethernet"],
    ...(isNet ? [["ports", "Ports", "fa-plug"]] : []),
    ...(isHost ? [["vms", "Hosted VMs", "fa-cube"]] : []),
    ["hardware", "Hardware", "fa-microchip"],
    ["alerts", "Alerts", "fa-bell"],
    ["logs", "Logs", "fa-file-lines"],
  ] as [string, string, string][];

  // ---- mock rows derived from device ----
  const ifaceRows: IfaceRow[] = [
    ["Et1/1", "Uplink to SW-BLR-DIST-04 (LAG-1)", "a4:88:73:2f:10:01", "100G", "full", 9214, 71, 64, "412M", "398M", 0, 0, 0, 0, 0, "up", "187d"],
    ["Et1/2", "Uplink to SW-BLR-DIST-04 (LAG-1)", "a4:88:73:2f:10:02", "100G", "full", 9214, 69, 62, "404M", "391M", 0, 0, 0, 0, 0, "up", "187d"],
    ["Et1/13", "ESX-BLR-01 vmnic0", "a4:88:73:2f:10:0d", "25G", "full", 9214, 58, 41, "188M", "142M", 0, 0, 2, 1, 0, "up", "61d"],
    ["Et1/14", "ESX-BLR-01 vmnic1", "a4:88:73:2f:10:0e", "25G", "full", 9214, 56, 38, "182M", "136M", 0, 0, 0, 0, 0, "up", "61d"],
    ["Et1/22", "BARE-BLR-DB-01 nic0", "a4:88:73:2f:10:16", "25G", "full", 9214, 32, 88, "96M", "214M", 1, 0, 0, 2, 0, "up", "412d"],
    ["Et1/30", "rack-c34 ToR pair", "a4:88:73:2f:10:1e", "10G", "—", 1500, 0, 0, "0", "0", 142, 89, 44, 61, 12, "down", "44m"],
    ["Et1/31", "rack-c34 ToR pair", "a4:88:73:2f:10:1f", "10G", "—", 1500, 0, 0, "0", "0", 0, 0, 0, 0, 0, "down", "44m"],
  ];
  const [ifq, setIfq] = React.useState("");
  const [ifFilter, setIfFilter] = React.useState("all");
  const ifVisible = ifaceRows.filter(r =>
    (ifFilter === "all" || (ifFilter === "down" ? r[15] === "down" : r[10] + r[11] > 0)) &&
    (!ifq || r[0].toLowerCase().includes(ifq.toLowerCase()) || r[1].toLowerCase().includes(ifq.toLowerCase())));

  const hwSensors: [string, string, string, string][] = [
    ["PSU-1", "Power supply", "OK", "744 W · AC OK"], ["PSU-2", "Power supply", "OK", "738 W · AC OK"],
    ["FAN-1", "Fan tray", "OK", "8,400 RPM"], ["FAN-2", "Fan tray", "OK", "8,350 RPM"],
    ["FAN-3", "Fan tray", d.status === "critical" ? "FAIL" : "OK", d.status === "critical" ? "0 RPM · replace" : "8,390 RPM"],
    ["TEMP-INLET", "Temperature", d.status === "critical" ? "WARN" : "OK", d.status === "critical" ? "48°C · threshold 45°C" : "31°C"],
    ["TEMP-CPU", "Temperature", "OK", "58°C"], ["VOLT-12V", "Voltage", "OK", "12.04 V"],
    ["RAID-0", "RAID / disks", d.kind.includes("srv") || d.kind === "storage" ? "OK" : "N/A", d.kind.includes("srv") || d.kind === "storage" ? "RAID-10 optimal · 0 rebuilds" : "—"],
    ["CHASSIS", "Chassis", "OK", "Intrusion clear"],
  ];

  const logs: [string, string, string, string][] = [
    ["14:32:08", "syslog", "warn", `%LINEPROTO-5-UPDOWN: Line protocol on Interface Et1/30, changed state to down`],
    ["14:32:08", "syslog", "crit", `%LINK-3-UPDOWN: Interface Et1/30, changed state to down — CRC errors exceeded threshold`],
    ["14:31:44", "snmp", "info", `Polling OK · 412 OIDs in 840ms · agent ${d.agent}`],
    ["14:29:10", "auth", "info", `Accepted publickey for netops-svc from 10.10.0.40 port 51122`],
    ["14:18:02", "hardware", d.status === "critical" ? "crit" : "info", d.status === "critical" ? "FAN-3 speed dropped to 0 RPM — hardware alarm raised" : "All hardware sensors nominal"],
    ["13:58:31", "syslog", "info", `%SYS-5-CONFIG_I: Configured from console by netops on vty0 (10.10.0.40)`],
    ["13:44:12", "exporter", "info", `snmp-exporter scrape OK · 2,148 series · 610ms`],
    ["12:02:55", "auth", "warn", `Failed password for invalid user admin from 172.16.4.9 — blocked by ACL`],
  ];
  const sevTone = (s: string) => s === "crit" ? "var(--danger, #d32f2f)" : s === "warn" ? "var(--warning)" : "var(--fg-muted)";

  return (
    <div className="page page-fade sn-dash">
      <div className="sn-breadcrumb">
        <a className="sn-link">Home</a><span className="sn-bc-sep">›</span>
        <a className="sn-link" onClick={() => setRoute("infra")}>Infrastructure</a><span className="sn-bc-sep">›</span>
        <a className="sn-link" onClick={() => setRoute("infra-topology")}>Site Topology</a><span className="sn-bc-sep">›</span>
        <span>{d.id}</span>
      </div>

      <div className="sn-form-header">
        <div className="sn-form-title-row">
          <span className="sn-rec-number">{d.id}</span>
          <span className={`sn-pill ${statusPill}`}><i className="fa-solid fa-circle" /> {statusLabel}</span>
          <span className="sn-pill state-neutral"><i className={`${k.iconBrand ? "fa-brands" : "fa-solid"} ${k.icon}`} /> {k.label}</span>
          <span className="sn-pill state-neutral"><i className="fa-solid fa-building" /> {siteObj.name}</span>
        </div>
        <div className="sn-form-title-meta">
          <div>
            <h1>{d.model}</h1>
            <div className="sn-form-sub">{d.role} · <span className="mono">{d.ip}</span> · last polled {d.lastSeen} · auto-refresh 30s</div>
          </div>
          <div className="sn-form-actions">
            <button className="sn-btn"><i className="fa-solid fa-terminal" /> SSH</button>
            <button className="sn-btn"><i className="fa-solid fa-rotate" /> Re-poll</button>
            <button className="sn-btn"><i className="fa-solid fa-pause" /> Mute Alerts</button>
            <button className="sn-btn primary"><i className="fa-solid fa-fire" /> Open Incident</button>
          </div>
        </div>
      </div>

      <div className="sn-kpi-strip">
        <Kpi l="Availability" v={isDown ? "Down" : "Up"} s={isDown ? `unreachable ${d.lastSeen}` : `uptime ${d.uptime}`} tone={isDown ? "crit" : "ok"} />
        <Kpi l="CPU" v={d.cpu + "%"} s="15m avg" tone={d.cpu > 80 ? "crit" : d.cpu > 65 ? "warn" : "ok"} />
        <Kpi l="Memory" v={d.mem + "%"} s="of installed" tone={d.mem > 80 ? "crit" : d.mem > 65 ? "warn" : "ok"} />
        <Kpi l="Ping" v={isDown ? "—" : "0.8 ms"} s={isDown ? "100% loss" : "0% loss"} tone={isDown ? "crit" : "ok"} />
        <Kpi l="Interfaces" v={d.iface} s={ifaceRows.filter(r => r[15] === "down").length + " down"} tone={ifaceRows.some(r => r[15] === "down") ? "crit" : "ok"} />
        <Kpi l="Active alerts" v={deviceAlerts.length} s={deviceAlerts.filter(a => a.sev === "critical").length + " critical"} tone={deviceAlerts.length ? "crit" : "ok"} />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, borderBottom: "2px solid var(--border, #e5e8eb)", marginBottom: 14, overflowX: "auto" }}>
        {TABS.map(([id, label, icon]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ border: "none", background: "transparent", padding: "9px 14px", fontSize: 12.5, fontWeight: tab === id ? 700 : 500, cursor: "pointer", color: tab === id ? "var(--fg, #16212e)" : "var(--fg-muted)", borderBottom: tab === id ? "2px solid var(--accent, #24ebaf)" : "2px solid transparent", marginBottom: -2, whiteSpace: "nowrap", fontFamily: "inherit" }}>
            <i className={`fa-solid ${icon}`} style={{ marginRight: 6, fontSize: 11 }} />{label}
            {id === "alerts" && deviceAlerts.length > 0 && <span style={{ marginLeft: 6, background: "var(--danger, #d32f2f)", color: "white", borderRadius: 8, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>{deviceAlerts.length}</span>}
          </button>
        ))}
      </div>

      {/* ---------------- OVERVIEW ---------------- */}
      {tab === "overview" && (
        <div className="sn-form-layout">
          <div className="sn-form-main">
            <FormSection id="identity" title="Device Summary">
              <FormRow><Field label="Device name" value={<span className="mono"><b>{d.id}</b></span>} required /><Field label="Client / tenant" value="Fyers" /></FormRow>
              <FormRow><Field label="Site" value={`${siteObj.name} (${d.site})`} /><Field label="Location / rack" value="Hall B · rack-c34 / U22" /></FormRow>
              <FormRow><Field label="IP address" value={<span className="mono">{d.ip}</span>} /><Field label="Hostname" value={<span className="mono">{d.id.toLowerCase()}.mgmt.local</span>} /></FormRow>
              <FormRow><Field label="Vendor" value={vendor} /><Field label="Model" value={d.model} /></FormRow>
              <FormRow><Field label="Serial number" value={<span className="mono">{serial}</span>} /><Field label="Device type" value={k.label} /></FormRow>
              <FormRow><Field label="OS / firmware" value={d.os} /><Field label="Monitoring source" value={<span className="mono">{d.agent}</span>} /></FormRow>
              <FormRow><Field label="Health status" value={<span className={`sn-state-pill ${statusPill}`}><i className="fa-solid fa-circle" /> {statusLabel}</span>} /><Field label="Last seen" value={d.lastSeen} /></FormRow>
            </FormSection>
            <FormSection id="quick" title="Live Performance Snapshot">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, padding: 12, background: "#fafbfc" }}>
                <MetricCard label="CPU" value={d.cpu + "%"} sub={`load ${(d.cpu/25).toFixed(2)} · ${isNet ? "2 cores (mgmt)" : "16 cores"}`} data={series(d.cpu, 18)} color={d.cpu > 80 ? "var(--danger, #d32f2f)" : d.cpu > 65 ? "var(--warning)" : "var(--success)"} />
                <MetricCard label="Memory" value={d.mem + "%"} sub={isNet ? "of 32 GB system" : "used 18.4 / 32 GB"} data={series(d.mem, 10)} color={d.mem > 80 ? "var(--danger, #d32f2f)" : "var(--success)"} />
                <MetricCard label={isNet ? "Throughput" : "Disk"} value={isNet ? (d.throughput || "3.4 Gbps") : "62%"} sub={isNet ? "aggregate all ports" : "418 / 680 GB"} data={series(52, 22)} color="var(--info, #0ea5e9)" />
                <MetricCard label={isNet ? "Sessions" : "Disk I/O"} value={isNet ? (d.sessions || "—") : "184 MB/s"} sub={isNet ? "concurrent" : "read 122 · write 62"} data={series(44, 26)} color="#8b5cf6" />
              </div>
            </FormSection>
          </div>
          <aside className="sn-form-side">
            <div className="sn-side-card">
              <div className="sn-side-head">Active Alerts <span className="sn-side-count">{deviceAlerts.length}</span></div>
              <div className="sn-side-body">
                {deviceAlerts.length === 0 && <div style={{ padding: 18, textAlign: "center", color: "var(--fg-muted)", fontSize: 12 }}>No active alerts</div>}
                {deviceAlerts.map(a => (
                  <div key={a.id} className="sn-related-row">
                    <div><div className="sn-related-title">{a.title}</div><div className="sn-related-meta">{a.rule} · {a.since}</div></div>
                    <span className={`sn-state-pill ${a.sev === "critical" ? "state-active" : "state-mitigating"}`}><i className="fa-solid fa-circle" /> {a.sev}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="sn-side-card">
              <div className="sn-side-head">Linked CIs <span className="sn-side-count">4</span></div>
              <div className="sn-side-body">
                {[["ESX-BLR-01", "vSphere host"], ["ESX-BLR-02", "vSphere host"], ["BARE-BLR-DB-01", "Oracle primary"], ["SW-BLR-DIST-04", "Upstream"]].map(([id, role]) => (
                  <div key={id} className="sn-related-row">
                    <div><div className="sn-related-title mono">{id}</div><div className="sn-related-meta">{role}</div></div>
                    <i className="fa-solid fa-chevron-right text-mute" style={{ fontSize: 11 }} />
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* ---------------- AVAILABILITY ---------------- */}
      {tab === "availability" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10, marginBottom: 14 }}>
            <MetricCard label="Current status" value={statusLabel} sub={isDown ? "blackbox probe failing" : "blackbox probe OK · 200"} />
            <MetricCard label="Uptime" value={d.uptime} sub="since last reboot" />
            <MetricCard label="Ping latency" value={isDown ? "—" : "0.8 ms"} sub={isDown ? "timeout" : "p95 1.4 ms"} data={series(isDown ? 0 : 12, 8)} color="var(--info, #0ea5e9)" />
            <MetricCard label="Packet loss" value={isDown ? "100%" : "0.0%"} sub="last 24h" />
            <MetricCard label="SLA (30d)" value={isDown ? "99.42%" : "99.98%"} sub="target 99.9%" />
          </div>
          <FormSection id="avail-tl" title="Availability Timeline · 90 days">
            <div style={{ display: "flex", gap: 2, padding: 14, background: "#fafbfc" }}>
              {Array.from({ length: 90 }, (_, i) => {
                const bad = (seed + i) % 41 === 0 || (isDown && i > 87);
                const warn = (seed + i) % 29 === 0;
                return <div key={i} title={`Day ${90 - i}: ${bad ? "outage" : warn ? "degraded" : "100%"}`} style={{ flex: 1, height: 34, borderRadius: 1.5, background: bad ? "var(--danger, #d32f2f)" : warn ? "var(--warning)" : "var(--success)", opacity: bad || warn ? 1 : 0.75 }} />;
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0 14px 12px", fontSize: 11, color: "var(--fg-muted)" }}><span>90 days ago</span><span>Last reboot: {d.uptime} ago · reason: scheduled firmware upgrade</span><span>today</span></div>
          </FormSection>
        </div>
      )}

      {/* ---------------- PERFORMANCE ---------------- */}
      {tab === "performance" && (
        <div>
          <FormSection id="perf-cpu" title="CPU">
            <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 0, background: "#fafbfc" }}>
              <div style={{ padding: 14, borderRight: "1px solid var(--border, #e5e8eb)" }}>
                <Field label="Usage" value={<Bar pct={d.cpu} />} />
                <Field label="Load average" value={<span className="mono">{(d.cpu/25).toFixed(2)} / {(d.cpu/22).toFixed(2)} / {(d.cpu/20).toFixed(2)}</span>} />
                <Field label="Cores" value={isNet ? "2 (mgmt plane)" : "16 physical / 32 threads"} />
                <Field label="Temperature" value="58°C" />
              </div>
              <div style={{ padding: 14 }}><div style={{ fontSize: 11, color: "var(--fg-muted)", marginBottom: 6 }}>CPU % · last 4h</div><Spark data={series(d.cpu, 20)} h={110} color={d.cpu > 80 ? "var(--danger, #d32f2f)" : "var(--success)"} /></div>
            </div>
          </FormSection>
          <FormSection id="perf-mem" title="Memory">
            <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 0, background: "#fafbfc" }}>
              <div style={{ padding: 14, borderRight: "1px solid var(--border, #e5e8eb)" }}>
                <Field label="Usage" value={<Bar pct={d.mem} />} />
                <Field label="Total / used / free" value={<span className="mono">32 / {(32*d.mem/100).toFixed(1)} / {(32*(100-d.mem)/100).toFixed(1)} GB</span>} />
                <Field label="Swap" value={<span className="mono">0.4 / 8 GB (5%)</span>} />
              </div>
              <div style={{ padding: 14 }}><div style={{ fontSize: 11, color: "var(--fg-muted)", marginBottom: 6 }}>Memory % · last 4h</div><Spark data={series(d.mem, 8)} h={110} color={d.mem > 80 ? "var(--danger, #d32f2f)" : "var(--info, #0ea5e9)"} /></div>
            </div>
          </FormSection>
          <FormSection id="perf-net" title="Network Throughput">
            <div style={{ display: "grid", gridTemplateColumns: "220px 1fr 1fr", gap: 0, background: "#fafbfc" }}>
              <div style={{ padding: 14, borderRight: "1px solid var(--border, #e5e8eb)" }}>
                <Field label="RX / TX" value={<span className="mono">1.84 / 1.52 Gbps</span>} />
                <Field label="Packet rate" value={<span className="mono">412k / 388k pps</span>} />
                <Field label="Error rate" value={<span style={{ color: getErrorRateColor(d.status === "critical" ? 2.4 : 0).fg, fontWeight: 700 }}>{d.status === "critical" ? "2.4%" : "0.0%"}</span>} />
                <Field label="Drop rate" value={<span style={{ color: getErrorRateColor(d.status === "critical" ? 0.8 : 0).fg, fontWeight: 700 }}>{d.status === "critical" ? "0.8%" : "0.0%"}</span>} />
              </div>
              <div style={{ padding: 14, borderRight: "1px solid var(--border, #e5e8eb)" }}><div style={{ fontSize: 11, color: "var(--fg-muted)", marginBottom: 6 }}>RX Mbps · last 4h</div><Spark data={series(58, 24)} h={110} color={STATUS_COLORS.ok.line} /></div>
              <div style={{ padding: 14 }}><div style={{ fontSize: 11, color: "var(--fg-muted)", marginBottom: 6 }}>TX Mbps · last 4h</div><Spark data={series(46, 20)} h={110} color="#0ea5e9" /></div>
            </div>
          </FormSection>
          <FormSection id="perf-disk" title="Disk / Storage">
            <table className="sn-list-table">
              <thead><tr><th>Mount</th><th style={{width:100}}>Total</th><th style={{width:100}}>Used</th><th style={{width:100}}>Free</th><th style={{width:160}}>Usage</th><th style={{width:130}}>I/O R/W</th><th style={{width:90}}>Health</th></tr></thead>
              <tbody>
                {((isNet ? [["/flash", "8 GB", "3.1 GB", "4.9 GB", 39, "2 / 1 MB/s", "OK"], ["/logs", "4 GB", "2.8 GB", "1.2 GB", 70, "4 / 6 MB/s", "OK"]]
                  : [["/", "120 GB", "74 GB", "46 GB", 62, "88 / 41 MB/s", "OK"], ["/data", "560 GB", "515 GB", "45 GB", 92, "122 / 62 MB/s", "WARN"], ["/backup", "1 TB", "412 GB", "612 GB", 41, "12 / 44 MB/s", "OK"]]
                ) as [string, string, string, string, number, string, string][]).map((r, i) => (
                  <tr key={i}>
                    <td className="mono"><b>{r[0]}</b></td><td className="mono">{r[1]}</td><td className="mono">{r[2]}</td><td className="mono">{r[3]}</td>
                    <td><Bar pct={r[4]} width={110} /></td><td className="mono">{r[5]}</td>
                    <td><span className={`sn-state-pill ${r[6] === "OK" ? "svc-healthy" : "state-mitigating"}`}><i className="fa-solid fa-circle" /> {r[6]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </FormSection>
        </div>
      )}

      {/* ---------------- INTERFACES ---------------- */}
      {tab === "interfaces" && (
        <FormSection id="ifaces" title="Network Interfaces" badge={`${ifVisible.length} shown`}>
          <div style={{ display: "flex", gap: 8, padding: "10px 12px", borderBottom: "1px solid var(--border, #e5e8eb)", alignItems: "center" }}>
            <i className="fa-solid fa-magnifying-glass" style={{ color: "var(--fg-muted)", fontSize: 11 }} />
            <input value={ifq} onChange={e => setIfq(e.target.value)} placeholder="Filter by port or description…" style={{ flex: 1, border: "none", outline: "none", fontSize: 12, background: "transparent" }} />
            {[["all", "All"], ["down", "Down"], ["errors", "With errors"]].map(([id, l]) => (
              <button key={id} className={`sn-btn${ifFilter === id ? " primary" : ""}`} style={{ padding: "3px 10px", fontSize: 11 }} onClick={() => setIfFilter(id)}>{l}</button>
            ))}
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="sn-list-table" style={{ minWidth: 1150 }}>
              <thead><tr><th style={{width:70}}>Port</th><th>Description</th><th style={{width:130}}>MAC</th><th style={{width:60}}>Speed</th><th style={{width:60}}>MTU</th><th style={{width:110}}>Tx util</th><th style={{width:110}}>Rx util</th><th style={{width:80}}>Tx pkts/s</th><th style={{width:80}}>Rx pkts/s</th><th style={{width:60}}>Errs</th><th style={{width:60}}>Drops</th><th style={{width:60}}>CRC</th><th style={{width:80}}>Oper</th><th style={{width:70}}>Since</th></tr></thead>
              <tbody>
                {ifVisible.map((r, i) => {
                  const isBad = r[15] === "down" || r[10] > 0 || r[14] > 0;
                  return (
                    <tr key={i} style={isBad ? { background: "rgba(211,47,47,.05)" } : undefined}>
                      <td className="mono"><b>{r[0]}</b></td><td>{r[1]}</td><td className="mono" style={{ fontSize: 10.5 }}>{r[2]}</td><td className="mono">{r[3]}</td><td className="mono">{r[5]}</td>
                      <td>{r[6] > 0 ? <Bar pct={r[6]} width={60} /> : <span className="text-mute mono">—</span>}</td>
                      <td>{r[7] > 0 ? <Bar pct={r[7]} width={60} /> : <span className="text-mute mono">—</span>}</td>
                      <td className="mono">{r[8]}</td><td className="mono">{r[9]}</td>
                      <td className={`mono ${r[10] > 0 ? "tone-crit" : ""}`}><b>{r[10]}</b></td>
                      <td className={`mono ${r[12] + r[13] > 0 ? "tone-warn" : ""}`}>{r[12] + r[13]}</td>
                      <td className={`mono ${r[14] > 0 ? "tone-crit" : ""}`}><b>{r[14]}</b></td>
                      <td><span className={`sn-state-pill ${r[15] === "up" ? "svc-healthy" : "state-active"}`}><i className="fa-solid fa-circle" /> {r[15] === "up" ? "Up" : "Down"}</span></td>
                      <td className="mono" style={{ fontSize: 11 }}>{r[16]}</td>
                    </tr>
                  );
                })}
                {ifVisible.length === 0 && <tr><td colSpan={14} style={{ textAlign: "center", padding: 24, color: "var(--fg-muted)" }}>No interfaces match the filter</td></tr>}
              </tbody>
            </table>
          </div>
        </FormSection>
      )}

      {/* ---------------- PORTS (switch port view) ---------------- */}
      {tab === "ports" && <SwitchPortPanel d={d} Spark={Spark} Bar={Bar} />}

      {/* ---------------- HOSTED VMS ---------------- */}
      {tab === "vms" && (
        <FormSection id="vms" title="Hosted VMs & Connectivity" badge={VMS.filter(v => v.host === d.id).length + " VMs"}>
          <table className="sn-list-table">
            <thead><tr><th>VM</th><th style={{width:120}}>IP</th><th style={{width:130}}>vNIC → vSwitch</th><th style={{width:130}}>Physical NIC</th><th style={{width:90}}>CPU</th><th style={{width:90}}>Memory</th><th style={{width:80}}>State</th><th>Path to WAN</th></tr></thead>
            <tbody>
              {VMS.filter(v => v.host === d.id).map(v => (
                <tr key={v.id}>
                  <td className="mono"><b>{v.id}</b><div style={{ fontSize: 10.5, color: "var(--fg-muted)" }}>{v.os} · {v.cpu} · {v.mem}</div></td>
                  <td className="mono">{v.ip}</td>
                  <td className="mono" style={{ fontSize: 11 }}>vNIC-0 → vSwitch0</td>
                  <td className="mono" style={{ fontSize: 11 }}>vmnic0 · 25G</td>
                  <td>{v.state === "running" ? <Bar pct={v.cpuUse} width={50} /> : <span className="text-mute">—</span>}</td>
                  <td>{v.state === "running" ? <Bar pct={v.memUse} warn={75} crit={90} width={50} /> : <span className="text-mute">—</span>}</td>
                  <td><span className={`sn-state-pill ${v.state === "running" ? "svc-healthy" : "state-neutral"}`}><i className="fa-solid fa-circle" /> {v.state}</span></td>
                  <td className="mono" style={{ fontSize: 10.5, color: "var(--fg-muted)" }}>{v.id} → {d.id} → SW-BLR-TOR-12 → SW-BLR-DIST-04 → SW-BLR-CORE-01 → FW-BLR-CORE-01 → WAN</td>
                </tr>
              ))}
              {VMS.filter(v => v.host === d.id).length === 0 && <tr><td colSpan={8} style={{ textAlign: "center", padding: 24, color: "var(--fg-muted)" }}>No VMs hosted on this device</td></tr>}
            </tbody>
          </table>
        </FormSection>
      )}

      {/* ---------------- HARDWARE ---------------- */}
      {tab === "hardware" && (
        <FormSection id="hw" title="Hardware Health" badge={d.kind.includes("srv") ? "via iDRAC / IPMI" : "via SNMP entity MIB"}>
          <table className="sn-list-table">
            <thead><tr><th style={{width:140}}>Sensor</th><th style={{width:160}}>Type</th><th style={{width:100}}>Status</th><th>Reading</th></tr></thead>
            <tbody>
              {hwSensors.map((r, i) => (
                <tr key={i} style={r[2] === "FAIL" ? { background: "rgba(211,47,47,.06)" } : r[2] === "WARN" ? { background: "rgba(255,152,0,.06)" } : undefined}>
                  <td className="mono"><b>{r[0]}</b></td><td>{r[1]}</td>
                  <td><span className={`sn-state-pill ${r[2] === "OK" ? "svc-healthy" : r[2] === "WARN" ? "state-mitigating" : r[2] === "FAIL" ? "state-active" : "state-neutral"}`}><i className="fa-solid fa-circle" /> {r[2]}</span></td>
                  <td className="mono" style={{ fontSize: 12 }}>{r[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </FormSection>
      )}

      {/* ---------------- ALERTS ---------------- */}
      {tab === "alerts" && (
        <FormSection id="al" title="Alerts" badge={`${deviceAlerts.length} active`}>
          {deviceAlerts.length === 0 && <div style={{ padding: 32, textAlign: "center", color: "var(--fg-muted)", fontSize: 12.5 }}><i className="fa-solid fa-circle-check" style={{ fontSize: 26, color: "var(--success)" }} /><div style={{ marginTop: 8 }}>No active alerts on this device</div></div>}
          {deviceAlerts.length > 0 && (
            <table className="sn-list-table">
              <thead><tr><th style={{width:90}}>Severity</th><th>Alert</th><th style={{width:200}}>Rule source</th><th style={{width:90}}>Since</th><th style={{width:110}}>Ack</th></tr></thead>
              <tbody>
                {deviceAlerts.map(a => (
                  <tr key={a.id}>
                    <td><span className={`sn-state-pill ${a.sev === "critical" ? "state-active" : "state-mitigating"}`}><i className="fa-solid fa-circle" /> {a.sev}</span></td>
                    <td><b>{a.title}</b></td><td className="mono" style={{ fontSize: 11.5 }}>{a.rule}</td><td>{a.since}</td>
                    <td><button className="sn-btn" style={{ padding: "2px 10px", fontSize: 11 }}>Acknowledge</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </FormSection>
      )}

      {/* ---------------- LOGS ---------------- */}
      {tab === "logs" && (
        <FormSection id="lg" title="Device Logs" badge="syslog · auth · hardware · exporter">
          <div style={{ background: "#0e1620", padding: "12px 0", fontFamily: "var(--font-mono)", fontSize: 11.5, borderRadius: "0 0 4px 4px" }}>
            {logs.map((r, i) => (
              <div key={i} style={{ display: "flex", gap: 12, padding: "4px 16px", color: "#c8d2dc" }}>
                <span style={{ color: "#5b6b7c", flexShrink: 0 }}>{r[0]}</span>
                <span style={{ color: "#7c94ab", width: 66, flexShrink: 0 }}>{r[1]}</span>
                <span style={{ color: sevTone(r[2]), width: 40, flexShrink: 0, fontWeight: 600 }}>{r[2]}</span>
                <span style={{ wordBreak: "break-word" }}>{r[3]}</span>
              </div>
            ))}
          </div>
        </FormSection>
      )}
    </div>
  );
}

// Switch port panel — per-port table with VLAN, connected endpoint; click a port for live graph + path
export function SwitchPortPanel({ d, Spark, Bar }: { d: Device; Spark: (p: SparkProps) => JSX.Element; Bar: (p: BarProps) => JSX.Element }) {
  const [selPort, setSelPort] = React.useState<string | null>(null);
  const [pq, setPq] = React.useState("");
  const seed = d.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const neighbors = NET_LINKS.filter(([a, b]) => a === d.id || b === d.id).map(([a, b]) => (a === d.id ? b : a));
  const series = (base: number, spread: number, n = 32) => Array.from({ length: n }, (_, i) => Math.max(0, Math.min(100, Math.round(base + Math.sin((seed + i) * 1.3) * spread * 0.5 + Math.sin((seed * 2 + i) * 0.7) * spread * 0.5))));

  const ports = Array.from({ length: 12 }, (_, i) => {
    const h = (seed * 7 + i * 13) % 100;
    const peer = neighbors[i % Math.max(1, neighbors.length)] || "endpoint-" + (i + 1);
    const down = d.status === "critical" && (i === 9 || i === 10);
    const util = down ? 0 : 8 + (h % 72);
    const err = down ? 4.2 : h % 19 === 0 ? 1.2 : 0;
    return {
      name: `Gi1/0/${i + 1}`, desc: i < 2 ? `Uplink LAG-1 → ${peer}` : `${peer} · access`,
      peer, peerIp: (DEVICES.find(x => x.id === peer) || ({} as Partial<Device>)).ip || `10.10.60.${20 + i}`,
      vlan: i < 2 ? "trunk" : String(100 + (h % 4) * 10), admin: "up", oper: down ? "down" : "up",
      speed: i < 2 ? "10G" : "1G", duplex: down ? "—" : "full",
      rx: down ? 0 : Math.round(util * 9), tx: down ? 0 : Math.round(util * 7),
      rxe: down ? 142 : err > 0 ? 3 : 0, txe: 0, drops: down ? 61 : 0, crc: down ? 12 : 0,
      util, err, flap: down ? "44m ago" : "187d ago",
    };
  }).filter(p => !pq || p.name.toLowerCase().includes(pq.toLowerCase()) || p.desc.toLowerCase().includes(pq.toLowerCase()) || p.vlan.includes(pq));
  const sp = selPort != null ? ports.find(p => p.name === selPort) : null;

  return (
    <div>
      <FormSection id="ports" title="Switch Ports" badge={`${ports.length} ports · SNMP IF-MIB`}>
        <div style={{ display: "flex", gap: 8, padding: "10px 12px", borderBottom: "1px solid var(--border, #e5e8eb)", alignItems: "center" }}>
          <i className="fa-solid fa-magnifying-glass" style={{ color: "var(--fg-muted)", fontSize: 11 }} />
          <input value={pq} onChange={e => setPq(e.target.value)} placeholder="Filter by port, description, VLAN…" style={{ flex: 1, border: "none", outline: "none", fontSize: 12, background: "transparent" }} />
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="sn-list-table" style={{ minWidth: 1100 }}>
            <thead><tr><th style={{width:76}}>Port</th><th>Description</th><th style={{width:120}}>Connected</th><th style={{width:100}}>IP</th><th style={{width:56}}>VLAN</th><th style={{width:56}}>Speed</th><th style={{width:100}}>RX/TX Mbps</th><th style={{width:110}}>Util</th><th style={{width:56}}>Errs</th><th style={{width:56}}>CRC</th><th style={{width:70}}>Oper</th><th style={{width:80}}>Last flap</th></tr></thead>
            <tbody>
              {ports.map(p => {
                const c = getInterfaceColor(p.oper, p.util, p.err);
                const isSel = selPort === p.name;
                return (
                  <tr key={p.name} onClick={() => setSelPort(isSel ? null : p.name)} style={{ cursor: "pointer", background: isSel ? "#e0f2fe" : p.oper === "down" ? "rgba(239,68,68,.05)" : undefined }}>
                    <td className="mono"><b>{p.name}</b></td><td>{p.desc}</td>
                    <td className="mono" style={{ fontSize: 11 }}>{p.peer}</td>
                    <td className="mono" style={{ fontSize: 11 }}>{p.peerIp}</td>
                    <td className="mono">{p.vlan}</td><td className="mono">{p.speed}</td>
                    <td className="mono" style={{ fontSize: 11 }}>{p.rx} / {p.tx}</td>
                    <td>{p.oper === "up" ? <Bar pct={p.util} width={60} /> : <span className="text-mute mono">—</span>}</td>
                    <td className="mono" style={{ color: getErrorRateColor(p.err).fg, fontWeight: p.rxe > 0 ? 700 : 400 }}>{p.rxe}</td>
                    <td className="mono" style={{ color: p.crc > 0 ? STATUS_COLORS.crit.fg : undefined, fontWeight: p.crc > 0 ? 700 : 400 }}>{p.crc}</td>
                    <td><span className={`sn-state-pill ${getStatusBadgeClass(p.oper === "up" ? "ok" : "down")}`}><i className="fa-solid fa-circle" /> {p.oper === "up" ? "Up" : "Down"}</span></td>
                    <td className="mono" style={{ fontSize: 11 }}>{p.flap}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </FormSection>

      {sp && (
        <FormSection id="portdetail" title={`Port ${sp.name} — Live Detail`} badge={sp.oper === "up" ? "up · " + sp.speed : "down"}>
          <div style={{ display: "grid", gridTemplateColumns: "240px 1fr 1fr", gap: 0, background: "#fafbfc" }}>
            <div style={{ padding: 14, borderRight: "1px solid var(--border, #e5e8eb)" }}>
              <Field label="Connected endpoint" value={<span className="mono">{sp.peer}</span>} />
              <Field label="Endpoint IP" value={<span className="mono">{sp.peerIp}</span>} />
              <Field label="VLAN / duplex" value={`${sp.vlan} · ${sp.duplex}`} />
              <Field label="Errors / drops / CRC" value={<span className="mono" style={{ color: getErrorRateColor(sp.err).fg }}>{sp.rxe} / {sp.drops} / {sp.crc}</span>} />
              <Field label="Physical path" value={<span className="mono" style={{ fontSize: 10.5 }}>{sp.peer} → {d.id}:{sp.name} → SW-BLR-DIST-04 → CORE → FW → WAN</span>} />
            </div>
            <div style={{ padding: 14, borderRight: "1px solid var(--border, #e5e8eb)" }}>
              <div style={{ fontSize: 11, color: "var(--fg-muted)", marginBottom: 6 }}>Traffic Mbps · last 4h</div>
              <Spark data={series(sp.util, 22)} h={100} color={getInterfaceColor(sp.oper, sp.util, sp.err).line} />
            </div>
            <div style={{ padding: 14 }}>
              <div style={{ fontSize: 11, color: "var(--fg-muted)", marginBottom: 6 }}>Errors & drops trend · last 4h</div>
              <Spark data={series(sp.err > 0 || sp.oper === "down" ? 34 : 2, sp.err > 0 || sp.oper === "down" ? 30 : 3)} h={100} color={sp.err > 0 || sp.oper === "down" ? STATUS_COLORS.crit.line : STATUS_COLORS.ok.line} />
            </div>
          </div>
        </FormSection>
      )}
    </div>
  );
}
