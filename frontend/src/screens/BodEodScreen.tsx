// BOD/EOD Status — the LinkedEye trading-day lifecycle (bodeodstatus): the
// ordered stages of a trading day with per-stage status, timing and sub-steps.
// BOD readiness (from /bod-checks) feeds the first stage. Light-theme.
import React from "react";
import { Kpi } from "@/components/primitives";
import { useBodChecks } from "@/api/hooks";

type StageState = "done" | "active" | "pending" | "failed";

interface Step { label: string; ok: boolean | null; }  // null = pending
interface Stage {
  id: string;
  title: string;
  window: string;
  state: StageState;
  desc: string;
  steps: Step[];
}

const stateMeta: Record<StageState, { c: string; bg: string; ring: string; i: string; t: string }> = {
  done:    { c: "#059669", bg: "#ecfdf5", ring: "#10b981", i: "fa-circle-check", t: "Complete" },
  active:  { c: "#2563eb", bg: "#eff6ff", ring: "#2563eb", i: "fa-spinner fa-spin", t: "In progress" },
  pending: { c: "#8a94a3", bg: "#f3f4f6", ring: "#cbd2da", i: "fa-clock", t: "Pending" },
  failed:  { c: "#dc2626", bg: "#fef2f2", ring: "#ef4444", i: "fa-circle-xmark", t: "Attention" },
};

export default function BodEodScreen() {
  const bod = useBodChecks().data ?? [];
  const bodDown = bod.filter((r) => r.status === 0 || r.status === 3).length;
  const bodOk = bod.filter((r) => r.status === 2).length;
  // BOD stage reflects live readiness: complete if nothing down, else attention.
  const bodState: StageState = bod.length === 0 ? "done" : bodDown > 0 ? "failed" : "done";

  const STAGES: Stage[] = [
    {
      id: "bod", title: "BOD · Beginning of Day", window: "06:00 – 09:00 IST", state: bodState,
      desc: "Pre-market readiness — connectivity, certs and adapter startup before the exchanges open.",
      steps: [
        { label: `URL / telnet / k8s checks (${bodOk}/${bod.length || 23} ok)`, ok: bodDown === 0 },
        { label: "NSE / BSE adapters started", ok: true },
        { label: "Vault unseal · secrets loaded", ok: true },
        { label: bodDown > 0 ? "SSL / reachability issues open" : "All endpoints reachable", ok: bodDown === 0 },
      ],
    },
    {
      id: "open", title: "Market Open", window: "09:15 IST", state: "done",
      desc: "Exchanges open; adapters connected and streaming.",
      steps: [
        { label: "NSE CM/FO session established", ok: true },
        { label: "BSE session established", ok: true },
        { label: "Market-data feed subscribed", ok: true },
      ],
    },
    {
      id: "intraday", title: "Intraday · Live Trading", window: "09:15 – 15:30 IST", state: "active",
      desc: "Order flow live. OMS latency, queue depth and feed freshness monitored continuously.",
      steps: [
        { label: "Order round-trip p99 within SLO", ok: true },
        { label: "NSE queue depth — peak 798, draining", ok: true },
        { label: "Feed freshness < 50ms", ok: true },
        { label: "EOD reconciliation", ok: null },
      ],
    },
    {
      id: "close", title: "Market Close", window: "15:30 IST", state: "pending",
      desc: "Sessions close; final order book snapshot captured.",
      steps: [
        { label: "Close all exchange sessions", ok: null },
        { label: "Snapshot order book & positions", ok: null },
      ],
    },
    {
      id: "eod", title: "EOD · End of Day", window: "15:30 – 17:00 IST", state: "pending",
      desc: "Reconciliation, obligation files and regulatory reports.",
      steps: [
        { label: "Trade / order reconciliation", ok: null },
        { label: "Obligation & margin files generated", ok: null },
        { label: "Regulatory reports (NSE/BSE) filed", ok: null },
      ],
    },
    {
      id: "adp", title: "ADP · After-Day Processing", window: "17:00 – 20:00 IST", state: "pending",
      desc: "Batch processing, database backups and next-day preparation.",
      steps: [
        { label: "Nightly batch & archival", ok: null },
        { label: "Database backups (MySQL / Postgres / Mongo)", ok: null },
        { label: "Next-day masters & calendar loaded", ok: null },
      ],
    },
  ];

  const done = STAGES.filter((s) => s.state === "done").length;
  const current = STAGES.find((s) => s.state === "active" || s.state === "failed");

  return (
    <div className="page page-fade sn-dash">
      <div className="sn-breadcrumb">
        <a className="sn-link">Home</a><span className="sn-bc-sep">›</span>
        <a className="sn-link">Trading Ops</a><span className="sn-bc-sep">›</span>
        <span>BOD/EOD Status</span>
      </div>

      <div className="sn-form-header">
        <div className="sn-form-title-row">
          <span className="sn-rec-number">TRADING DAY · 2026-07-27</span>
          {bodDown > 0
            ? <span className="sn-pill prio-1"><i className="fa-solid fa-triangle-exclamation" /> BOD {bodDown} open</span>
            : <span className="sn-pill svc-healthy"><i className="fa-solid fa-circle-check" /> BOD cleared</span>}
          <span className="sn-pill state-progress"><i className="fa-solid fa-spinner fa-spin" /> {current?.title.split(" · ")[0] ?? "Intraday"}</span>
        </div>
        <div className="sn-form-title-meta">
          <div>
            <h1>Trading-Day Lifecycle</h1>
            <div className="sn-form-sub">BOD → open → intraday → EOD → ADP · status via Redis, refreshed on bod_update · site nextalpha</div>
          </div>
          <div className="sn-form-actions">
            <button className="sn-btn"><i className="fa-solid fa-clock-rotate-left" /> History</button>
            <button className="sn-btn"><i className="fa-solid fa-rotate" /> Refresh</button>
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 24px 0" }}>
        <div className="sn-kpi-strip">
          <Kpi l="Stages complete" v={`${done}/${STAGES.length}`} s="through the day" tone="neutral" />
          <Kpi l="Current stage" v={current?.title.split(" · ")[0] ?? "—"} s={current?.window ?? ""} tone="ok" />
          <Kpi l="BOD readiness" v={bodDown > 0 ? `${bodDown} down` : "Ready"} s={`${bodOk} checks ok`} tone={bodDown > 0 ? "crit" : "ok"} />
          <Kpi l="Next milestone" v="Market Close" s="15:30 IST" tone="warn" />
        </div>
      </div>

      {/* Timeline */}
      <div style={{ padding: "20px 24px 28px" }}>
        <div className="card" style={{ background: "white", border: "1px solid #e5e8eb", borderRadius: 6, padding: "22px 24px" }}>
          <div style={{ position: "relative" }}>
            {/* vertical rail */}
            <div style={{ position: "absolute", left: 15, top: 8, bottom: 8, width: 2, background: "#eef1f4" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              {STAGES.map((s) => {
                const m = stateMeta[s.state];
                return (
                  <div key={s.id} style={{ display: "flex", gap: 16, position: "relative" }}>
                    <div style={{ flexShrink: 0, width: 32, height: 32, borderRadius: "50%", background: m.bg, border: `2px solid ${m.ring}`, display: "grid", placeItems: "center", zIndex: 1, color: m.c }}>
                      <i className={`fa-solid ${m.i}`} style={{ fontSize: 13 }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0, paddingBottom: 4 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                        <b style={{ fontSize: 14, color: "#0f1c3f" }}>{s.title}</b>
                        <span className="mono" style={{ fontSize: 11.5, color: "#8a94a3" }}>{s.window}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: m.c, background: m.bg, padding: "2px 9px", borderRadius: 12 }}>{m.t}</span>
                      </div>
                      <div style={{ fontSize: 12.5, color: "#64748b", margin: "4px 0 10px" }}>{s.desc}</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 6 }}>
                        {s.steps.map((st) => (
                          <div key={st.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                            <i className={`fa-solid ${st.ok === null ? "fa-circle-dashed" : st.ok ? "fa-circle-check" : "fa-circle-xmark"}`}
                               style={{ color: st.ok === null ? "#c0c7d0" : st.ok ? "#059669" : "#dc2626", fontSize: 12 }} />
                            <span style={{ color: st.ok === null ? "#8a94a3" : "#475467" }}>{st.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
