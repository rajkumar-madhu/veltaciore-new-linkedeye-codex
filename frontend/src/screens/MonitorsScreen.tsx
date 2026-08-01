// Monitors — alert-rule list + builder (the Datadog Monitors equivalent).
// The Alerts screen only *lists* firing conditions; this lets you author a
// monitor: pick type, write the query, set warning/critical thresholds and an
// evaluation window, and see a live preview of the metric against the threshold
// bands before saving. Light-theme house style; illustrative but consistent.
import React from "react";
import { Kpi, FormSection } from "@/components/primitives";
import { LineChart } from "@/components/deviceDetail";
import { wave as sharedWave } from "@/lib/series";
import { useCanWrite } from "@/auth/auth";
import ReadOnlyBadge from "@/components/ReadOnlyBadge";
import { StatusPill, type PillTone } from "@/components/StatusPill";

type MonType = "Metric" | "Anomaly" | "Composite" | "Log" | "Synthetic";
type MonState = "ok" | "warn" | "alert" | "nodata";

interface Monitor {
  id: string;
  name: string;
  type: MonType;
  query: string;
  state: MonState;
  warn: number;
  crit: number;
  window: string;
  scope: string;
  since: string;
}

const MONITORS: Monitor[] = [
  { id: "MON-01", name: "Order round-trip p99 > 250µs", type: "Metric", query: "p99:oms.order.latency{tenant:fyers}", state: "alert", warn: 200, crit: 250, window: "5m", scope: "oms-core", since: "12m" },
  { id: "MON-02", name: "NSE queue depth > 700", type: "Metric", query: "max:mq.queue.depth{adapter:nse}", state: "warn", warn: 500, crit: 700, window: "2m", scope: "feed-handler", since: "4m" },
  { id: "MON-03", name: "Checkout error rate anomaly", type: "Anomaly", query: "anomalies(sum:payments.errors{*}, 'basic', 2)", state: "alert", warn: 1, crit: 2, window: "10m", scope: "payments", since: "10m" },
  { id: "MON-04", name: "Feed freshness > 50ms", type: "Metric", query: "avg:feed.nse.gap{*}", state: "ok", warn: 40, crit: 50, window: "1m", scope: "feed-handler", since: "—" },
  { id: "MON-05", name: "iLO exporter down", type: "Synthetic", query: "up{job='ilo-exporter'} == 0", state: "warn", warn: 1, crit: 1, window: "1m", scope: "hardware", since: "1h" },
  { id: "MON-06", name: "OMS latency AND queue high", type: "Composite", query: "MON-01 && MON-02", state: "ok", warn: 1, crit: 1, window: "5m", scope: "trading", since: "—" },
  { id: "MON-07", name: "Timeout log surge > 100/min", type: "Log", query: "logs('service:oms status:error \"timeout\"').index('*').rollup('count')", state: "ok", warn: 60, crit: 100, window: "5m", scope: "oms-gateway", since: "—" },
];

const wave = (seed: number, base: number, amp: number) => sharedWave(seed, base, amp, { f1: 0.8, f2: 1.9, cosAmp: 0.3 });

const statePill = (s: MonState) => {
  const map: Record<MonState, { tone: PillTone; label: string; icon: string }> = {
    ok: { tone: "ok", label: "OK", icon: "fa-circle-check" },
    warn: { tone: "warn", label: "Warn", icon: "fa-triangle-exclamation" },
    alert: { tone: "crit", label: "Alert", icon: "fa-fire" },
    nodata: { tone: "muted", label: "No Data", icon: "fa-circle-question" },
  };
  return <StatusPill {...map[s]} />;
};

export default function MonitorsScreen() {
  const canWrite = useCanWrite();
  const [sel, setSel] = React.useState(MONITORS[0]);
  // Builder state, seeded from the selected monitor.
  const [warn, setWarn] = React.useState(sel.warn);
  const [crit, setCrit] = React.useState(sel.crit);
  const [win, setWin] = React.useState(sel.window);
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const toggle = (id: string) => setCollapsed((c) => ({ ...c, [id]: !c[id] }));

  React.useEffect(() => { setWarn(sel.warn); setCrit(sel.crit); setWin(sel.window); }, [sel]);

  const series = wave(sel.id.length, crit * 0.8, crit * 0.35);
  const peak = Math.max(...series, crit) * 1.1;
  const breaches = series.filter((v) => v >= crit).length;

  const alerting = MONITORS.filter((m) => m.state === "alert").length;
  const warning = MONITORS.filter((m) => m.state === "warn").length;

  return (
    <div className="page page-fade sn-dash">
      <div className="sn-breadcrumb">
        <a className="sn-link">Home</a><span className="sn-bc-sep">›</span>
        <a className="sn-link">Observe</a><span className="sn-bc-sep">›</span>
        <span>Monitors</span>
      </div>

      <div className="sn-form-header">
        <div className="sn-form-title-row">
          <span className="sn-rec-number">MONITORS</span>
          {alerting > 0 && <span className="sn-pill prio-1"><i className="fa-solid fa-fire" /> {alerting} alerting</span>}
          <span className="sn-pill state-progress"><i className="fa-solid fa-triangle-exclamation" /> {warning} warning</span>
          <span className="sn-pill svc-healthy"><i className="fa-solid fa-circle-check" /> {MONITORS.length - alerting - warning} ok</span>
        </div>
        <div className="sn-form-title-meta">
          <div>
            <h1>Monitors</h1>
            <div className="sn-form-sub">Metric · anomaly · composite · log · synthetic alert rules · evaluated every {sel.window}</div>
          </div>
          <div className="sn-form-actions">
            <ReadOnlyBadge />
            <button className="sn-btn"><i className="fa-solid fa-download" /> Export</button>
            {canWrite && <button className="sn-btn primary"><i className="fa-solid fa-plus" /> New Monitor</button>}
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 24px 0" }}>
        <div className="sn-kpi-strip">
          <Kpi l="Monitors" v={MONITORS.length} s="configured" tone="neutral" />
          <Kpi l="Alerting" v={alerting} s="critical threshold" tone="crit" />
          <Kpi l="Warning" v={warning} s="warn threshold" tone="warn" />
          <Kpi l="Muted" v={0} s="downtime scheduled" tone="ok" />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 16, padding: "16px 24px 24px" }}>
        {/* Monitor list */}
        <div className="card" style={{ background: "white", border: "1px solid #e5e8eb", borderRadius: 6, overflow: "hidden", alignSelf: "start" }}>
          <table className="sn-list-table" style={{ fontSize: 12.5 }}>
            <thead>
              <tr>
                <th>MONITOR</th>
                <th style={{ width: 96 }}>TYPE</th>
                <th style={{ width: 110 }}>STATE</th>
                <th style={{ width: 66 }}>EVERY</th>
                <th style={{ width: 70 }}>SINCE</th>
              </tr>
            </thead>
            <tbody>
              {MONITORS.map((m) => (
                <tr key={m.id} onClick={() => setSel(m)} style={{ cursor: "pointer", background: sel.id === m.id ? "#eff6ff" : m.state === "alert" ? "#fef2f2" : undefined }}>
                  <td>
                    <div style={{ fontWeight: 600, color: "#0f1c3f" }}>{m.name}</div>
                    <div className="mono" style={{ fontSize: 10.5, color: "#8a94a3", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 360 }}>{m.query}</div>
                  </td>
                  <td><span style={{ fontSize: 11, fontWeight: 600, color: "#475467", background: "#f3f4f6", padding: "2px 7px", borderRadius: 4 }}>{m.type}</span></td>
                  <td>{statePill(m.state)}</td>
                  <td className="mono" style={{ color: "#475467" }}>{m.window}</td>
                  <td className="text-mute" style={{ fontSize: 11 }}>{m.since}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Builder / evaluation preview */}
        <aside style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="card" style={{ background: "white", border: "1px solid #e5e8eb", borderRadius: 6, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <b style={{ fontSize: 13 }}>{canWrite ? "Edit monitor" : "Monitor"}</b>
              <span style={{ fontSize: 11, color: "#8a94a3" }}>{sel.type} · {sel.scope}</span>
            </div>

            <label className="mon-l">Query</label>
            <div className="mono" style={{ fontSize: 11.5, background: "#f8fafc", border: "1px solid #eef1f4", borderRadius: 6, padding: "8px 10px", color: "#334155", marginBottom: 12, wordBreak: "break-all" }}>{sel.query}</div>

            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label className="mon-l" style={{ color: "#b45309" }}>Warning ≥</label>
                <input type="number" className="mx-input" style={{ width: "100%" }} value={warn} disabled={!canWrite} onChange={(e) => setWarn(+e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="mon-l" style={{ color: "#dc2626" }}>Critical ≥</label>
                <input type="number" className="mx-input" style={{ width: "100%" }} value={crit} disabled={!canWrite} onChange={(e) => setCrit(+e.target.value)} />
              </div>
              <div style={{ width: 96 }}>
                <label className="mon-l">Window</label>
                <select className="mx-input" style={{ width: "100%" }} value={win} disabled={!canWrite} onChange={(e) => setWin(e.target.value)}>
                  {["1m", "2m", "5m", "10m", "1h"].map((w) => <option key={w}>{w}</option>)}
                </select>
              </div>
            </div>

            <label className="mon-l">Evaluation preview · last {win}</label>
            <div style={{ position: "relative", marginTop: 4 }}>
              <LineChart series={[series]} colors={[breaches ? "#dc2626" : "#2563eb"]} h={140} yTicks={[`${Math.round(peak)}`, `${Math.round(peak / 2)}`, "0"]} />
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 11, color: "#475467", flexWrap: "wrap" }}>
              <span><span style={{ display: "inline-block", width: 16, height: 2, background: "#dc2626", verticalAlign: "middle", marginRight: 4 }} /> critical {crit}</span>
              <span><span style={{ display: "inline-block", width: 16, height: 2, background: "#f59e0b", verticalAlign: "middle", marginRight: 4 }} /> warning {warn}</span>
              <span style={{ marginLeft: "auto", fontWeight: 600, color: breaches ? "#dc2626" : "#059669" }}>
                {breaches ? `${breaches}/${series.length} points breach critical` : "no breach in window"}
              </span>
            </div>

            {canWrite && (
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button className="sn-btn primary" style={{ flex: 1, justifyContent: "center" }}><i className="fa-solid fa-floppy-disk" /> Save monitor</button>
                <button className="sn-btn"><i className="fa-solid fa-volume-xmark" /> Mute</button>
              </div>
            )}
          </div>

          <FormSection id="notify" title="Notifications" collapsed={collapsed.notify} onToggle={toggle}>
            <div style={{ padding: 14, fontSize: 12 }}>
              {[
                ["fa-slack fa-brands", "#trading-critical", "on Alert"],
                ["fa-envelope", "on-call@finspot.in", "on Alert / Warn"],
                ["fa-phone", "PagerDuty · Trading", "on Alert"],
              ].map(([ic, who, when]) => (
                <div key={who as string} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
                  <i className={`fa-solid ${ic}`} style={{ color: "var(--accent)", width: 16 }} />
                  <b style={{ color: "#0f1c3f" }}>{who}</b>
                  <span style={{ marginLeft: "auto", color: "#8a94a3", fontSize: 11 }}>{when}</span>
                </div>
              ))}
            </div>
          </FormSection>
        </aside>
      </div>
    </div>
  );
}
