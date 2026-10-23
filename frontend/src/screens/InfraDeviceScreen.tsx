// Production device monitoring: Overview / Availability / Performance / Interfaces / Hardware / Alerts / Logs
// Maps to: GET /api/infra/devices/{id}/{overview|availability|cpu|memory|disk|interfaces|hardware|alerts|logs}/
//
// Only the device record (useDevice, seed fallback), its alerts, hosted VMs and
// topology links are real. The per-tab metric history, interface, sensor and
// log rows are generated placeholders until those endpoints are wired, so every
// panel that shows them is labelled "Sample data".
import React from "react";
import { deviceRoute } from "@/lib/deviceRoute";
import "@/styles/infra.css";
import { useNav } from "@/hooks/useNav";
import { useUiStore } from "@/store/ui";
import { useDevice } from "@/api/hooks";
import { DEVICES, DEVICE_KINDS, SITES, VMS, NET_LINKS, INFRA_ALERTS } from "@/data/infra";
import { Empty, Panel, Pill, StatCard } from "@/components/ld";
import type { Tone } from "@/components/ld";
import type { Device, DeviceKind, Site } from "@/lib/types";

type SparkProps = { data: number[]; color?: string; h?: number; unit?: string };
type BarProps = { pct: number; warn?: number; crit?: number; width?: number };

type IfaceRow = [string, string, string, string, string, number, number, number, string, string, number, number, number, number, number, string, string];



const C = { ok: "#16a34a", warn: "#f5a524", crit: "#e5383b", info: "#2f6bff", purple: "#7c4dff", cyan: "#0ea5e9" };
const toneOf = (pct: number, warn = 70, crit = 85): Tone => (pct >= crit ? "crit" : pct >= warn ? "warn" : "ok");
const fillOf = (t: Tone) => (t === "crit" ? C.crit : t === "warn" ? C.warn : C.ok);
const sevTone = (s: string): Tone => (s === "critical" || s === "crit" ? "crit" : s === "warn" || s === "warning" ? "warn" : "info");

function Spark({ data, color = C.ok, h = 56 }: SparkProps) {
  const w = 100, max = 100;
  const pts = data.map((v, i) => `${(i / Math.max(1, data.length - 1)) * w},${h - (v / max) * (h - 6) - 3}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="ld-infra-spark" style={{ height: h }} aria-hidden="true">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill={color} opacity="0.1" />
    </svg>
  );
}

function Bar({ pct, warn = 70, crit = 85 }: BarProps) {
  const t = toneOf(pct, warn, crit);
  return (
    <span className="ld-infra-usage">
      <span className="ld-bar-track ld-bar-inline" role="img" aria-label={`${pct}%`}>
        <span className="ld-bar-fill" style={{ width: `${Math.min(100, pct)}%`, background: fillOf(t) }} />
      </span>
      <b className={t === "ok" ? undefined : `ld-text-${t}`}>{pct}%</b>
    </span>
  );
}

function Metric({ label, value, sub, data, color }: { label: React.ReactNode; value: React.ReactNode; sub?: React.ReactNode; data?: number[]; color?: string }) {
  return (
    <div className="ld-infra-metric">
      <span className="ld-infra-metric-label">{label}</span>
      <span className="ld-infra-metric-value">{value}</span>
      {sub && <span className="ld-sub">{sub}</span>}
      {data && <Spark data={data} color={color} />}
    </div>
  );
}

/** Panel with a "Sample data" badge for generated content. */
function SamplePanel({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  const id = React.useId();
  return (
    <section className="ld-card ld-panel" aria-labelledby={id}>
      <div className="ld-panel-head">
        <h2 id={id}>{title}{badge && <span className="ld-muted ld-small"> · {badge}</span>}</h2>
        <Pill tone="muted">Sample data</Pill>
      </div>
      {children}
    </section>
  );
}

function SampleNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="ld-card ld-infra-sample" role="note">
      <i className="fa-solid fa-flask" aria-hidden="true" />
      <div><b>Sample data</b><p className="ld-muted ld-small">{children}</p></div>
    </div>
  );
}

export default function InfraDeviceScreen() {
  const { setRoute } = useNav();
  const deviceId = useUiStore((s) => s.params.deviceId as string | undefined);
  const { data: apiDevice } = useDevice(deviceId);
  const d: Device = apiDevice ?? DEVICES.find(x => x.id === deviceId) ?? DEVICES.find(x => x.id === "SW-BLR-TOR-13") ?? DEVICES[0];
  const k = DEVICE_KINDS.find(x => x.id === d.kind) || ({} as DeviceKind);
  const deviceAlerts = INFRA_ALERTS.filter(a => a.device === d.id);
  const [tab, setTab] = React.useState("overview");
  const [, setTick] = React.useState(0);

  React.useEffect(() => { const t = setInterval(() => setTick(x => x + 1), 30000); return () => clearInterval(t); }, []);

  // Deterministic per-device pseudo-random series (stands in for API metric history)
  const seed = d.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const series = (base: number, spread: number, n = 32) => Array.from({ length: n }, (_, i) => {
    const v = base + Math.sin((seed + i) * 1.7) * spread * 0.5 + Math.sin((seed * 3 + i) * 0.6) * spread * 0.5;
    return Math.max(0, Math.min(100, Math.round(v)));
  });
  const vendor = d.vendor || (d.model || "").split(" ")[0];
  const isNet = ["firewall", "router", "switch", "loadbal"].includes(d.kind);
  const isDown = d.status === "down";
  const statusTone: Tone = d.status === "ok" ? "ok" : d.status === "warn" ? "warn" : "crit";
  const statusLabel = d.status === "ok" ? "Up" : d.status === "warn" ? "Degraded" : d.status === "critical" ? "Critical" : "Down";
  const siteObj = SITES.find(s => s.id === d.site) || ({} as Site);
  const kindIcon = `${k.iconBrand ? "fa-brands" : "fa-solid"} ${k.icon ?? "fa-cube"}`;
  const neighbors = [...new Set(NET_LINKS.filter(([a, b]) => a === d.id || b === d.id).map(([a, b]) => (a === d.id ? b : a)))];
  const hostedVms = VMS.filter(v => v.host === d.id);
  const openDevice = (id: string) => setRoute(deviceRoute(DEVICES.find(x => x.id === id)?.kind), { deviceId: id });

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

  // ---- placeholder rows (sample data) ----
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
  const sensorTone = (s: string): Tone => (s === "OK" ? "ok" : s === "WARN" ? "warn" : s === "FAIL" ? "crit" : "muted");

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

  const disks = (isNet
    ? [["/flash", "8 GB", "3.1 GB", "4.9 GB", 39, "2 / 1 MB/s", "OK"], ["/logs", "4 GB", "2.8 GB", "1.2 GB", 70, "4 / 6 MB/s", "OK"]]
    : [["/", "120 GB", "74 GB", "46 GB", 62, "88 / 41 MB/s", "OK"], ["/data", "560 GB", "515 GB", "45 GB", 92, "122 / 62 MB/s", "WARN"], ["/backup", "1 TB", "412 GB", "612 GB", 41, "12 / 44 MB/s", "OK"]]
  ) as [string, string, string, string, number, string, string][];

  return (
    <div className="ld-dash">
      <nav className="ld-crumbs" aria-label="Breadcrumb">
        <button type="button" className="ld-link" onClick={() => setRoute("dashboard")}>Home</button>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <button type="button" className="ld-link" onClick={() => setRoute("infra")}>Monitoring</button>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <button type="button" className="ld-link" onClick={() => setRoute("infra-topology")}>Site Topology</button>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <span>{d.id}</span>
      </nav>

      <div className="ld-head ld-entity-head">
        <div className="ld-entity">
          <span className="ld-tile ld-info" aria-hidden="true"><i className={kindIcon} /></span>
          <div>
            <h1 className="ld-entity-title">
              {d.hostname || d.id}
              <Pill tone={statusTone}><span className="ld-pill-dot" />{statusLabel}</Pill>
            </h1>
            <p className="ld-entity-meta">
              <span>{d.model}</span>
              <span>{d.role}</span>
              <span className="ld-mono">{d.ip}</span>
            </p>
            <p className="ld-entity-meta">
              <span>Last polled {d.lastSeen}</span>
              <span>Auto-refresh 30s</span>
            </p>
          </div>
        </div>
        <div className="ld-head-side">
          <div className="ld-head-actions">
            <button type="button" className="ld-btn"><i className="fa-solid fa-terminal" aria-hidden="true" /> SSH</button>
            <button type="button" className="ld-btn"><i className="fa-solid fa-rotate" aria-hidden="true" /> Re-poll</button>
            <button type="button" className="ld-btn"><i className="fa-solid fa-pause" aria-hidden="true" /> Mute Alerts</button>
            <button type="button" className="ld-btn ld-btn-primary"><i className="fa-solid fa-fire" aria-hidden="true" /> Open Incident</button>
          </div>
          <ul className="ld-tags" aria-label="Tags">
            {k.label && <li className="ld-tag"><i className={kindIcon} aria-hidden="true" /> {k.label}</li>}
            {siteObj.name && <li className="ld-tag"><i className="fa-solid fa-building" aria-hidden="true" /> {siteObj.name}</li>}
            {d.agent && <li className="ld-tag"><i className="fa-solid fa-tower-broadcast" aria-hidden="true" /> {d.agent}</li>}
          </ul>
        </div>
      </div>

      <div className="ld-grid ld-grid-stats ld-grid-5">
        <StatCard icon="fa-heart-pulse" tone={isDown ? "crit" : "ok"} label="Availability" value={isDown ? "Down" : "Up"} note={isDown ? `unreachable ${d.lastSeen}` : `uptime ${d.uptime}`} onClick={() => setTab("availability")} />
        <StatCard icon="fa-microchip" tone={toneOf(d.cpu, 65, 80)} label="CPU" value={`${d.cpu}%`} note="last poll" onClick={() => setTab("performance")} />
        <StatCard icon="fa-memory" tone={toneOf(d.mem, 65, 80)} label="Memory" value={`${d.mem}%`} note="of installed" onClick={() => setTab("performance")} />
        <StatCard icon="fa-ethernet" tone="info" label="Interfaces" value={d.iface || "—"} note="see Interfaces tab" onClick={() => setTab("interfaces")} />
        <StatCard icon="fa-bell" tone={deviceAlerts.length ? "crit" : "ok"} label="Active alerts" value={deviceAlerts.length} note={`${deviceAlerts.filter(a => a.sev === "critical").length} critical`} onClick={() => setTab("alerts")} />
      </div>

      <div className="ld-tabs" role="tablist" aria-label={`${d.id} sections`}>
        {TABS.map(([id, label, icon]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={`ld-tab${tab === id ? " active" : ""}`} onClick={() => setTab(id)}>
            <i className={`fa-solid ${icon}`} aria-hidden="true" /> {label}
            {id === "alerts" && deviceAlerts.length > 0 && <> <Pill tone="crit">{deviceAlerts.length}</Pill></>}
          </button>
        ))}
      </div>

      {/* ---------------- OVERVIEW ---------------- */}
      {tab === "overview" && (
        <div className="ld-split">
          <div className="ld-rail">
            <Panel title="Device Summary">
              <dl className="ld-dl">
                <dt>Device name</dt><dd className="ld-mono">{d.id}</dd>
                <dt>Hostname</dt><dd className="ld-mono">{d.hostname || "—"}</dd>
                <dt>IP address</dt><dd className="ld-mono">{d.ip || "—"}</dd>
                <dt>Site</dt><dd>{siteObj.name ? `${siteObj.name} (${d.site})` : d.site}</dd>
                <dt>Location / rack</dt><dd>{d.location || "—"}</dd>
                <dt>Vendor</dt><dd>{vendor || "—"}</dd>
                <dt>Model</dt><dd>{d.model || "—"}</dd>
                <dt>Serial number</dt><dd className="ld-mono">{d.serial_number || "—"}</dd>
                <dt>Device type</dt><dd>{k.label || d.kind}</dd>
                <dt>OS / firmware</dt><dd>{d.os || "—"}</dd>
                <dt>Monitoring source</dt><dd className="ld-mono">{d.agent || "—"}</dd>
                <dt>Health status</dt><dd><Pill tone={statusTone}><span className="ld-pill-dot" />{statusLabel}</Pill></dd>
                <dt>Last seen</dt><dd>{d.lastSeen || "—"}</dd>
              </dl>
            </Panel>
            <Panel title="Current Performance">
              <div className="ld-grid ld-grid-5">
                <Metric label="CPU" value={`${d.cpu}%`} sub={<Bar pct={d.cpu} />} />
                <Metric label="Memory" value={`${d.mem}%`} sub={<Bar pct={d.mem} />} />
                {isNet && <Metric label="Throughput" value={d.throughput || "—"} sub="aggregate all ports" />}
                {isNet && <Metric label="Sessions" value={d.sessions || "—"} sub="concurrent" />}
                <Metric label="Uptime" value={d.uptime || "—"} sub="since last reboot" />
              </div>
            </Panel>
          </div>
          <div className="ld-rail">
            <Panel title={`Active Alerts (${deviceAlerts.length})`} action={deviceAlerts.length ? { label: "View all", onClick: () => setTab("alerts") } : undefined}>
              {deviceAlerts.length ? (
                <ul className="ld-activity">
                  {deviceAlerts.map(a => (
                    <li key={a.id}>
                      <Pill tone={sevTone(a.sev)}>{a.sev}</Pill>
                      <span className="ld-activity-text" title={a.title}>{a.title}<span className="ld-sub">{a.rule} · {a.since}</span></span>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty>No active alerts</Empty>
              )}
            </Panel>
            <Panel title={`Linked CIs (${neighbors.length})`}>
              {neighbors.length ? (
                <ul className="ld-activity">
                  {neighbors.map(id => {
                    const n = DEVICES.find(x => x.id === id);
                    return (
                      <li key={id}>
                        <i className="fa-solid fa-link ld-muted" aria-hidden="true" />
                        <span className="ld-activity-text">
                          <button type="button" className="ld-link ld-mono" onClick={() => openDevice(id)}>{id}</button>
                          {n?.role && <span className="ld-sub">{n.role}</span>}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <Empty>No topology links recorded for {d.id}.</Empty>
              )}
            </Panel>
          </div>
        </div>
      )}

      {/* ---------------- AVAILABILITY ---------------- */}
      {tab === "availability" && (
        <>
          <div className="ld-grid ld-grid-stats">
            <StatCard icon="fa-heart-pulse" tone={statusTone} label="Current status" value={statusLabel} note={`last polled ${d.lastSeen}`} />
            <StatCard icon="fa-clock" tone="info" label="Uptime" value={d.uptime || "—"} note="since last reboot" />
          </div>
          <SamplePanel title="Reachability" badge="blackbox probe">
            <div className="ld-grid ld-grid-5">
              <Metric label="Ping latency" value={isDown ? "—" : "0.8 ms"} sub={isDown ? "timeout" : "p95 1.4 ms"} data={series(isDown ? 0 : 12, 8)} color={C.cyan} />
              <Metric label="Packet loss" value={isDown ? "100%" : "0.0%"} sub="last 24h" />
              <Metric label="SLA (30d)" value={isDown ? "99.42%" : "99.98%"} sub="target 99.9%" />
            </div>
          </SamplePanel>
          <SamplePanel title="Availability Timeline" badge="90 days">
            <div className="ld-infra-timeline">
              {Array.from({ length: 90 }, (_, i) => {
                const bad = (seed + i) % 41 === 0 || (isDown && i > 87);
                const warn = (seed + i) % 29 === 0;
                return <span key={i} title={`Day ${90 - i}: ${bad ? "outage" : warn ? "degraded" : "100%"}`} style={{ background: bad ? C.crit : warn ? C.warn : C.ok, opacity: bad || warn ? 1 : 0.75 }} />;
              })}
            </div>
            <div className="ld-infra-timeline-axis"><span>90 days ago</span><span>today</span></div>
          </SamplePanel>
        </>
      )}

      {/* ---------------- PERFORMANCE ---------------- */}
      {tab === "performance" && (
        <>
          <SampleNote>Current CPU and memory come from the device record; the history charts, load, network and disk figures below are placeholders until the metrics endpoints are wired.</SampleNote>
          <SamplePanel title="CPU">
            <div className="ld-infra-chartrow">
              <dl className="ld-dl">
                <dt>Usage</dt><dd><Bar pct={d.cpu} /></dd>
                <dt>Load average</dt><dd className="ld-mono">{(d.cpu / 25).toFixed(2)} / {(d.cpu / 22).toFixed(2)} / {(d.cpu / 20).toFixed(2)}</dd>
                <dt>Cores</dt><dd>{isNet ? "2 (mgmt plane)" : "16 physical / 32 threads"}</dd>
                <dt>Temperature</dt><dd>58°C</dd>
              </dl>
              <div><div className="ld-infra-chart-label">CPU % · last 4h</div><Spark data={series(d.cpu, 20)} h={110} color={d.cpu > 80 ? C.crit : C.ok} /></div>
            </div>
          </SamplePanel>
          <SamplePanel title="Memory">
            <div className="ld-infra-chartrow">
              <dl className="ld-dl">
                <dt>Usage</dt><dd><Bar pct={d.mem} /></dd>
                <dt>Total / used / free</dt><dd className="ld-mono">32 / {(32 * d.mem / 100).toFixed(1)} / {(32 * (100 - d.mem) / 100).toFixed(1)} GB</dd>
                <dt>Swap</dt><dd className="ld-mono">0.4 / 8 GB (5%)</dd>
              </dl>
              <div><div className="ld-infra-chart-label">Memory % · last 4h</div><Spark data={series(d.mem, 8)} h={110} color={d.mem > 80 ? C.crit : C.cyan} /></div>
            </div>
          </SamplePanel>
          <SamplePanel title="Network Throughput">
            <div className="ld-infra-chartrow ld-infra-chartrow-3">
              <dl className="ld-dl">
                <dt>RX / TX</dt><dd className="ld-mono">1.84 / 1.52 Gbps</dd>
                <dt>Packet rate</dt><dd className="ld-mono">412k / 388k pps</dd>
                <dt>Error rate</dt><dd className={d.status === "critical" ? "ld-text-crit" : "ld-text-ok"}>{d.status === "critical" ? "2.4%" : "0.0%"}</dd>
                <dt>Drop rate</dt><dd className={d.status === "critical" ? "ld-text-crit" : "ld-text-ok"}>{d.status === "critical" ? "0.8%" : "0.0%"}</dd>
              </dl>
              <div><div className="ld-infra-chart-label">RX Mbps · last 4h</div><Spark data={series(58, 24)} h={110} color={C.ok} /></div>
              <div><div className="ld-infra-chart-label">TX Mbps · last 4h</div><Spark data={series(46, 20)} h={110} color={C.cyan} /></div>
            </div>
          </SamplePanel>
          <SamplePanel title="Disk / Storage">
            <div className="ld-table-wrap">
              <table className="ld-table">
                <thead><tr><th scope="col">Mount</th><th scope="col">Total</th><th scope="col">Used</th><th scope="col">Free</th><th scope="col">Usage</th><th scope="col">I/O R/W</th><th scope="col">Health</th></tr></thead>
                <tbody>
                  {disks.map((r) => (
                    <tr key={r[0]}>
                      <td className="ld-mono">{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td><td>{r[3]}</td>
                      <td><Bar pct={r[4]} /></td><td className="ld-mono">{r[5]}</td>
                      <td><Pill tone={r[6] === "OK" ? "ok" : "warn"}>{r[6]}</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SamplePanel>
        </>
      )}

      {/* ---------------- INTERFACES ---------------- */}
      {tab === "interfaces" && (
        <SamplePanel title="Network Interfaces" badge={`${ifVisible.length} shown`}>
          <div className="ld-toolbar">
            <label htmlFor="if-search" className="sr-only">Filter interfaces</label>
            <span className="ld-search ld-field-grow">
              <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
              <input id="if-search" type="search" value={ifq} onChange={e => setIfq(e.target.value)} placeholder="Filter by port or description…" />
            </span>
            <div className="ld-infra-seg" role="group" aria-label="Interface state">
              {[["all", "All"], ["down", "Down"], ["errors", "With errors"]].map(([id, l]) => (
                <button key={id} type="button" aria-pressed={ifFilter === id} onClick={() => setIfFilter(id)}>{l}</button>
              ))}
            </div>
          </div>
          {ifVisible.length ? (
            <div className="ld-table-wrap">
              <table className="ld-table">
                <thead><tr><th scope="col">Port</th><th scope="col">Description</th><th scope="col">MAC</th><th scope="col">Speed</th><th scope="col">MTU</th><th scope="col">Tx util</th><th scope="col">Rx util</th><th scope="col">Tx pkts/s</th><th scope="col">Rx pkts/s</th><th scope="col">Errs</th><th scope="col">Drops</th><th scope="col">CRC</th><th scope="col">Oper</th><th scope="col">Since</th></tr></thead>
                <tbody>
                  {ifVisible.map((r) => (
                    <tr key={r[0]}>
                      <td className="ld-mono">{r[0]}</td><td className="ld-wrap">{r[1]}</td><td className="ld-mono ld-muted">{r[2]}</td><td>{r[3]}</td><td>{r[5]}</td>
                      <td>{r[6] > 0 ? <Bar pct={r[6]} /> : <span className="ld-muted">—</span>}</td>
                      <td>{r[7] > 0 ? <Bar pct={r[7]} /> : <span className="ld-muted">—</span>}</td>
                      <td className="ld-mono">{r[8]}</td><td className="ld-mono">{r[9]}</td>
                      <td className={r[10] > 0 ? "ld-text-crit" : undefined}>{r[10]}</td>
                      <td className={r[12] + r[13] > 0 ? "ld-text-warn" : undefined}>{r[12] + r[13]}</td>
                      <td className={r[14] > 0 ? "ld-text-crit" : undefined}>{r[14]}</td>
                      <td><Pill tone={r[15] === "up" ? "ok" : "crit"}><span className="ld-pill-dot" />{r[15] === "up" ? "Up" : "Down"}</Pill></td>
                      <td className="ld-muted">{r[16]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>No interfaces match the filter</Empty>
          )}
        </SamplePanel>
      )}

      {/* ---------------- PORTS (switch port view) ---------------- */}
      {tab === "ports" && <SwitchPortPanel d={d} Spark={Spark} Bar={Bar} />}

      {/* ---------------- HOSTED VMS ---------------- */}
      {tab === "vms" && (
        <Panel title={`Hosted VMs (${hostedVms.length})`}>
          {hostedVms.length ? (
            <div className="ld-table-wrap">
              <table className="ld-table">
                <thead><tr><th scope="col">VM</th><th scope="col">IP</th><th scope="col">vCPU / RAM</th><th scope="col">CPU</th><th scope="col">Memory</th><th scope="col">State</th></tr></thead>
                <tbody>
                  {hostedVms.map(v => (
                    <tr key={v.id}>
                      <td><button type="button" className="ld-link ld-mono" onClick={() => setRoute("vm-detail", { vmId: v.id })}>{v.id}</button><span className="ld-sub">{v.os}</span></td>
                      <td className="ld-mono">{v.ip}</td>
                      <td className="ld-mono">{v.cpu} / {v.mem}</td>
                      <td>{v.state === "running" ? <Bar pct={v.cpuUse} /> : <span className="ld-muted">—</span>}</td>
                      <td>{v.state === "running" ? <Bar pct={v.memUse} warn={75} crit={90} /> : <span className="ld-muted">—</span>}</td>
                      <td><Pill tone={v.state === "running" ? "ok" : "muted"}><span className="ld-pill-dot" />{v.state}</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>No VMs hosted on this device</Empty>
          )}
        </Panel>
      )}

      {/* ---------------- HARDWARE ---------------- */}
      {tab === "hardware" && (
        <SamplePanel title="Hardware Health" badge={d.kind.includes("srv") ? "via iDRAC / IPMI" : "via SNMP entity MIB"}>
          <div className="ld-table-wrap">
            <table className="ld-table">
              <thead><tr><th scope="col">Sensor</th><th scope="col">Type</th><th scope="col">Status</th><th scope="col">Reading</th></tr></thead>
              <tbody>
                {hwSensors.map((r) => (
                  <tr key={r[0]}>
                    <td className="ld-mono">{r[0]}</td><td>{r[1]}</td>
                    <td><Pill tone={sensorTone(r[2])}><span className="ld-pill-dot" />{r[2]}</Pill></td>
                    <td className="ld-mono">{r[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SamplePanel>
      )}

      {/* ---------------- ALERTS ---------------- */}
      {tab === "alerts" && (
        <Panel title={`Alerts (${deviceAlerts.length} active)`}>
          {deviceAlerts.length ? (
            <div className="ld-table-wrap">
              <table className="ld-table">
                <thead><tr><th scope="col">Severity</th><th scope="col">Alert</th><th scope="col">Rule source</th><th scope="col">Since</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>
                  {deviceAlerts.map(a => (
                    <tr key={a.id}>
                      <td><Pill tone={sevTone(a.sev)}><span className="ld-pill-dot" />{a.sev}</Pill></td>
                      <td className="ld-strong ld-wrap">{a.title}</td><td className="ld-mono ld-muted">{a.rule}</td><td className="ld-muted">{a.since}</td>
                      <td><button type="button" className="ld-btn ld-btn-sm">Acknowledge</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty><i className="fa-solid fa-circle-check ld-text-ok" aria-hidden="true" /> No active alerts on this device</Empty>
          )}
        </Panel>
      )}

      {/* ---------------- LOGS ---------------- */}
      {tab === "logs" && (
        <SamplePanel title="Device Logs" badge="syslog · auth · hardware · exporter">
          <div className="ld-table-wrap">
            <table className="ld-table ld-infra-log">
              <thead><tr><th scope="col">Time</th><th scope="col">Source</th><th scope="col">Level</th><th scope="col">Message</th></tr></thead>
              <tbody>
                {logs.map((r, i) => (
                  <tr key={i}>
                    <td className="ld-mono ld-muted">{r[0]}</td>
                    <td className="ld-muted">{r[1]}</td>
                    <td><Pill tone={r[2] === "crit" ? "crit" : r[2] === "warn" ? "warn" : "muted"}>{r[2]}</Pill></td>
                    <td className="ld-wrap">{r[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SamplePanel>
      )}
    </div>
  );
}

// Switch port panel — per-port table with VLAN, connected endpoint; select a port for its graph + path
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
  const bad = (p: { err: number; oper: string }) => p.err > 0 || p.oper === "down";

  return (
    <>
      <section className="ld-card ld-panel" aria-labelledby="ports-h">
        <div className="ld-panel-head">
          <h2 id="ports-h">Switch Ports <span className="ld-muted ld-small">· {ports.length} ports · SNMP IF-MIB</span></h2>
          <Pill tone="muted">Sample data</Pill>
        </div>
        <div className="ld-toolbar">
          <label htmlFor="port-search" className="sr-only">Filter ports</label>
          <span className="ld-search ld-field-grow">
            <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
            <input id="port-search" type="search" value={pq} onChange={e => setPq(e.target.value)} placeholder="Filter by port, description, VLAN…" />
          </span>
        </div>
        <div className="ld-table-wrap">
          <table className="ld-table">
            <thead><tr><th scope="col">Port</th><th scope="col">Description</th><th scope="col">Connected</th><th scope="col">IP</th><th scope="col">VLAN</th><th scope="col">Speed</th><th scope="col">RX/TX Mbps</th><th scope="col">Util</th><th scope="col">Errs</th><th scope="col">CRC</th><th scope="col">Oper</th><th scope="col">Last flap</th></tr></thead>
            <tbody>
              {ports.map(p => {
                const isSel = selPort === p.name;
                return (
                  <tr key={p.name} className={isSel ? "ld-row-selected" : undefined}>
                    <td><button type="button" className="ld-link ld-mono" aria-pressed={isSel} onClick={() => setSelPort(isSel ? null : p.name)}>{p.name}</button></td>
                    <td className="ld-wrap">{p.desc}</td>
                    <td className="ld-mono">{p.peer}</td>
                    <td className="ld-mono ld-muted">{p.peerIp}</td>
                    <td>{p.vlan}</td><td>{p.speed}</td>
                    <td className="ld-mono">{p.rx} / {p.tx}</td>
                    <td>{p.oper === "up" ? <Bar pct={p.util} /> : <span className="ld-muted">—</span>}</td>
                    <td className={p.rxe > 0 ? (p.err > 1 ? "ld-text-crit" : "ld-text-warn") : undefined}>{p.rxe}</td>
                    <td className={p.crc > 0 ? "ld-text-crit" : undefined}>{p.crc}</td>
                    <td><Pill tone={p.oper === "up" ? "ok" : "crit"}><span className="ld-pill-dot" />{p.oper === "up" ? "Up" : "Down"}</Pill></td>
                    <td className="ld-muted">{p.flap}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {sp && (
        <section className="ld-card ld-panel" aria-labelledby="portdetail-h">
          <div className="ld-panel-head">
            <h2 id="portdetail-h">Port {sp.name} <span className="ld-muted ld-small">· {sp.oper === "up" ? "up · " + sp.speed : "down"}</span></h2>
            <Pill tone="muted">Sample data</Pill>
          </div>
          <div className="ld-infra-chartrow ld-infra-chartrow-3">
            <dl className="ld-dl">
              <dt>Connected endpoint</dt><dd className="ld-mono">{sp.peer}</dd>
              <dt>Endpoint IP</dt><dd className="ld-mono">{sp.peerIp}</dd>
              <dt>VLAN / duplex</dt><dd>{sp.vlan} · {sp.duplex}</dd>
              <dt>Errors / drops / CRC</dt><dd className={bad(sp) ? "ld-text-crit" : undefined}>{sp.rxe} / {sp.drops} / {sp.crc}</dd>
              <dt>Physical path</dt><dd className="ld-mono">{sp.peer} → {d.id}:{sp.name} → SW-BLR-DIST-04 → CORE → FW → WAN</dd>
            </dl>
            <div>
              <div className="ld-infra-chart-label">Traffic Mbps · last 4h</div>
              <Spark data={series(sp.util, 22)} h={100} color={sp.oper === "down" ? C.crit : sp.util > 85 ? C.warn : C.ok} />
            </div>
            <div>
              <div className="ld-infra-chart-label">Errors &amp; drops trend · last 4h</div>
              <Spark data={series(bad(sp) ? 34 : 2, bad(sp) ? 30 : 3)} h={100} color={bad(sp) ? C.crit : C.ok} />
            </div>
          </div>
        </section>
      )}
    </>
  );
}
