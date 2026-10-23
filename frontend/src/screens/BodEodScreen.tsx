// BOD/EOD Status — the LinkedEye trading-day lifecycle (bodeodstatus): the
// ordered stages of a trading day with per-stage status, timing and sub-steps.
//
// BOD readiness (from /bod-checks) is live and drives the first stage. The
// other stages have no status feed yet, so their position (upcoming / in
// window / window closed) comes from the IST clock and their sub-steps are a
// checklist of what the stage covers, not reported results.
import React from "react";
import { useBodChecks } from "@/api/hooks";
import { useNav } from "@/hooks/useNav";
import { Panel, Pill, StatCard } from "@/components/ld";
import type { Tone } from "@/components/ld";
import "@/styles/trading.css";

type StageState = "done" | "failed" | "active" | "pending" | "closed" | "nodata";

interface Step { label: string; ok: boolean | null; }  // null = not reported
interface Stage {
  id: string;
  title: string;
  /** IST window, minutes from midnight */
  start: number;
  end: number;
  state: StageState;
  desc: string;
  steps: Step[];
  live: boolean;
}

const stateMeta: Record<StageState, { tone: Tone; icon: string; label: string }> = {
  done:    { tone: "ok",    icon: "fa-circle-check",  label: "Complete" },
  failed:  { tone: "crit",  icon: "fa-circle-xmark",  label: "Attention" },
  active:  { tone: "info",  icon: "fa-play",          label: "In window" },
  pending: { tone: "muted", icon: "fa-clock",         label: "Upcoming" },
  closed:  { tone: "muted", icon: "fa-check",         label: "Window closed" },
  nodata:  { tone: "muted", icon: "fa-circle-question", label: "No results" },
};

const hm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
const windowLabel = (s: { start: number; end: number }) => (s.start === s.end ? `${hm(s.start)} IST` : `${hm(s.start)} – ${hm(s.end)} IST`);

/** Current IST time as { date: "YYYY-MM-DD", minutes since midnight }. */
function istNow() {
  const ist = new Date(Date.now() + 5.5 * 3600 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${ist.getUTCFullYear()}-${pad(ist.getUTCMonth() + 1)}-${pad(ist.getUTCDate())}`,
    minutes: ist.getUTCHours() * 60 + ist.getUTCMinutes(),
  };
}

function clockState(start: number, end: number, now: number): StageState {
  if (now < start) return "pending";
  if (now <= Math.max(end, start + 1)) return "active";
  return "closed";
}

export default function BodEodScreen() {
  const { setRoute } = useNav();
  const bod = useBodChecks().data ?? [];
  const bodDown = bod.filter((r) => r.status === 0 || r.status === 3).length;
  const bodOk = bod.filter((r) => r.status === 2).length;
  // BOD stage reflects live readiness: complete if nothing down, else attention.
  const bodState: StageState = bod.length === 0 ? "nodata" : bodDown > 0 ? "failed" : "done";

  // The clock only moves stages along the schedule; refresh it once a minute.
  const [now, setNow] = React.useState(istNow);
  React.useEffect(() => {
    const t = window.setInterval(() => setNow(istNow()), 60_000);
    return () => window.clearInterval(t);
  }, []);
  const at = (start: number, end: number) => clockState(start, end, now.minutes);

  const STAGES: Stage[] = [
    {
      id: "bod", title: "BOD · Beginning of Day", start: 360, end: 540, state: bodState, live: true,
      desc: "Pre-market readiness — connectivity, certs and adapter startup before the exchanges open.",
      steps: [
        { label: bod.length ? `URL / telnet / k8s checks (${bodOk}/${bod.length} ok)` : "URL / telnet / k8s checks (no results)", ok: bod.length ? bodDown === 0 : null },
        { label: bodDown > 0 ? "SSL / reachability issues open" : "All endpoints reachable", ok: bod.length ? bodDown === 0 : null },
        { label: "NSE / BSE adapters started", ok: null },
        { label: "Vault unseal · secrets loaded", ok: null },
      ],
    },
    {
      id: "open", title: "Market Open", start: 555, end: 555, state: at(555, 560), live: false,
      desc: "Exchanges open; adapters connected and streaming.",
      steps: [
        { label: "NSE CM/FO session established", ok: null },
        { label: "BSE session established", ok: null },
        { label: "Market-data feed subscribed", ok: null },
      ],
    },
    {
      id: "intraday", title: "Intraday · Live Trading", start: 555, end: 930, state: at(555, 930), live: false,
      desc: "Order flow live. OMS latency, queue depth and feed freshness monitored continuously.",
      steps: [
        { label: "Order round-trip p99 within SLO", ok: null },
        { label: "NSE queue depth draining", ok: null },
        { label: "Feed freshness within limit", ok: null },
        { label: "EOD reconciliation", ok: null },
      ],
    },
    {
      id: "close", title: "Market Close", start: 930, end: 930, state: at(930, 935), live: false,
      desc: "Sessions close; final order book snapshot captured.",
      steps: [
        { label: "Close all exchange sessions", ok: null },
        { label: "Snapshot order book & positions", ok: null },
      ],
    },
    {
      id: "eod", title: "EOD · End of Day", start: 930, end: 1020, state: at(930, 1020), live: false,
      desc: "Reconciliation, obligation files and regulatory reports.",
      steps: [
        { label: "Trade / order reconciliation", ok: null },
        { label: "Obligation & margin files generated", ok: null },
        { label: "Regulatory reports (NSE/BSE) filed", ok: null },
      ],
    },
    {
      id: "adp", title: "ADP · After-Day Processing", start: 1020, end: 1200, state: at(1020, 1200), live: false,
      desc: "Batch processing, database backups and next-day preparation.",
      steps: [
        { label: "Nightly batch & archival", ok: null },
        { label: "Database backups (MySQL / Postgres / Mongo)", ok: null },
        { label: "Next-day masters & calendar loaded", ok: null },
      ],
    },
  ];

  const passed = STAGES.filter((s) => s.state === "done" || s.state === "closed").length;
  const current = STAGES.find((s) => s.state === "failed") ?? [...STAGES].reverse().find((s) => s.state === "active");
  const next = STAGES.find((s) => s.start > now.minutes);
  const short = (s?: Stage) => s?.title.split(" · ")[0] ?? "—";

  return (
    <div className="ld-dash">
      <nav className="ld-crumbs" aria-label="Breadcrumb">
        <button type="button" className="ld-link" onClick={() => setRoute("dashboard")}>Home</button>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <span>BOD / EOD</span>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <span>BOD/EOD Status</span>
      </nav>

      <div className="ld-head">
        <div>
          <h1>Trading-Day Lifecycle</h1>
          <p>Trading day {now.date} · BOD → open → intraday → EOD → ADP · site nextalpha</p>
        </div>
        <div className="ld-head-actions">
          {bod.length === 0
            ? <Pill tone="muted"><i className="fa-solid fa-circle-question" aria-hidden="true" /> BOD no results</Pill>
            : bodDown > 0
              ? <Pill tone="crit"><i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> BOD {bodDown} open</Pill>
              : <Pill tone="ok"><i className="fa-solid fa-circle-check" aria-hidden="true" /> BOD cleared</Pill>}
          {current && <Pill tone="info"><i className="fa-solid fa-play" aria-hidden="true" /> {short(current)}</Pill>}
          <button type="button" className="ld-btn" disabled title="Stage history is not connected yet"><i className="fa-solid fa-clock-rotate-left" aria-hidden="true" /> History</button>
          <button type="button" className="ld-btn" disabled title="Stage status feed is not connected yet"><i className="fa-solid fa-rotate" aria-hidden="true" /> Refresh</button>
        </div>
      </div>

      <div className="ld-grid ld-grid-stats">
        <StatCard icon="fa-list-ol" tone="info" label="Stages passed" value={`${passed}/${STAGES.length}`} note="by schedule (BOD from live checks)" />
        <StatCard icon="fa-play" tone="purple" label="Current stage" value={short(current)} note={current ? windowLabel(current) : "outside trading hours"} />
        <StatCard icon={bodDown > 0 ? "fa-circle-xmark" : "fa-clipboard-check"} tone={bod.length === 0 ? "muted" : bodDown > 0 ? "crit" : "ok"}
          label="BOD readiness" value={bod.length === 0 ? "—" : bodDown > 0 ? `${bodDown} down` : "Ready"}
          note={bod.length ? `${bodOk} of ${bod.length} checks ok` : "no results from /bod-checks"} onClick={() => setRoute("bod-checks")} />
        <StatCard icon="fa-flag-checkered" tone="warn" label="Next milestone" value={short(next)} note={next ? windowLabel(next) : "next trading day"} />
      </div>

      <Panel title="Stages">
        <p className="ld-trading-sub">
          Only BOD reports live results. Later stages follow the IST schedule; their steps list what the stage covers — step results are not connected yet.
        </p>
        <ol className="ld-trading-timeline">
          {STAGES.map((s) => {
            const m = stateMeta[s.state];
            return (
              <li key={s.id} className="ld-trading-stage">
                <span className={`ld-trading-marker ld-${m.tone}`} aria-hidden="true"><i className={`fa-solid ${m.icon}`} /></span>
                <div className="ld-trading-stage-body">
                  <div className="ld-trading-stage-head">
                    <h3>{s.title}</h3>
                    <span className="ld-mono ld-muted">{windowLabel(s)}</span>
                    <Pill tone={m.tone}>{m.label}</Pill>
                    {!s.live && <Pill tone="muted">Schedule only</Pill>}
                  </div>
                  <p>{s.desc}</p>
                  <ul className="ld-trading-steps">
                    {s.steps.map((st) => (
                      <li key={st.label} className={st.ok === null ? "pending" : undefined}>
                        <i className={`fa-solid ${st.ok === null ? "fa-circle-dot none" : st.ok ? "fa-circle-check ok" : "fa-circle-xmark fail"}`} aria-hidden="true" />
                        <span>{st.label}</span>
                        <span className="sr-only">{st.ok === null ? "(not reported)" : st.ok ? "(ok)" : "(failed)"}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            );
          })}
        </ol>
      </Panel>
    </div>
  );
}
