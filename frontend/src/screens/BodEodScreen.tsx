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
import { Button, Crumbs, Page, PageHead, cx, ui } from "@/components/ui";

import { Icon } from "@/components/Icon";
import { CircleCheckIcon, CircleHelpIcon, HistoryIcon, PlayIcon, RefreshCwIcon, TriangleAlertIcon } from "lucide-react";
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

// Timeline marker ring per tone. In dark mode the old tone class also
// tinted the marker background, so that is kept here.
const MARKER: Partial<Record<Tone, string>> = {
  ok: "text-success dark:bg-tone-ok-soft",
  info: "text-info dark:bg-tone-info-soft",
  crit: "text-critical dark:bg-tone-crit-soft",
  muted: "text-fg-faint",
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
    <Page>
      <Crumbs items={[{ label: "Home", onClick: () => setRoute("dashboard") }, { label: "BOD / EOD" }, { label: "BOD/EOD Status" }]} />

      <PageHead
        title="Trading-Day Lifecycle"
        subtitle={`Trading day ${now.date} · BOD → open → intraday → EOD → ADP · site nextalpha`}
        actions={
          <>
            {bod.length === 0
              ? <Pill tone="muted"><Icon icon={CircleHelpIcon} /> BOD no results</Pill>
              : bodDown > 0
                ? <Pill tone="crit"><Icon icon={TriangleAlertIcon} /> BOD {bodDown} open</Pill>
                : <Pill tone="ok"><Icon icon={CircleCheckIcon} /> BOD cleared</Pill>}
            {current && <Pill tone="info"><Icon icon={PlayIcon} /> {short(current)}</Pill>}
            <Button disabled title="Stage history is not connected yet"><Icon icon={HistoryIcon} /> History</Button>
            <Button disabled title="Stage status feed is not connected yet"><Icon icon={RefreshCwIcon} /> Refresh</Button>
          </>
        }
      />

      <div className={cx(ui.grid, ui.cols.stats)}>
        <StatCard icon="fa-list-ol" tone="info" label="Stages passed" value={`${passed}/${STAGES.length}`} note="by schedule (BOD from live checks)" />
        <StatCard icon="fa-play" tone="purple" label="Current stage" value={short(current)} note={current ? windowLabel(current) : "outside trading hours"} />
        <StatCard icon={bodDown > 0 ? "fa-circle-xmark" : "fa-clipboard-check"} tone={bod.length === 0 ? "muted" : bodDown > 0 ? "crit" : "ok"}
          label="BOD readiness" value={bod.length === 0 ? "—" : bodDown > 0 ? `${bodDown} down` : "Ready"}
          note={bod.length ? `${bodOk} of ${bod.length} checks ok` : "no results from /bod-checks"} onClick={() => setRoute("bod-checks")} />
        <StatCard icon="fa-flag-checkered" tone="warn" label="Next milestone" value={short(next)} note={next ? windowLabel(next) : "next trading day"} />
      </div>

      <Panel title="Stages">
        <p className="text-[12.5px] text-fg-muted -mt-1.5">
          Only BOD reports live results. Later stages follow the IST schedule; their steps list what the stage covers — step results are not connected yet.
        </p>
        <ol className="list-none relative flex flex-col gap-5.5 before:content-[''] before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-0.5 before:bg-line">
          {STAGES.map((s) => {
            const m = stateMeta[s.state];
            return (
              <li key={s.id} className="relative flex gap-4">
                <span className={cx("flex-none w-8 h-8 rounded-full grid place-items-center text-sm z-[1] border-2 border-current bg-bg-raised", MARKER[m.tone])} aria-hidden="true"><Icon name={m.icon} /></span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
                    <h3 className="text-base font-semibold text-fg">{s.title}</h3>
                    <span className={cx(ui.mono, "text-fg-muted")}>{windowLabel(s)}</span>
                    <Pill tone={m.tone}>{m.label}</Pill>
                    {!s.live && <Pill tone="muted">Schedule only</Pill>}
                  </div>
                  <p className="text-sm text-fg-muted mt-1 mb-2.5">{s.desc}</p>
                  <ul className="list-none grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-x-3.5 gap-y-1.5">
                    {s.steps.map((st) => (
                      <li key={st.label} className={cx("flex items-center gap-2 text-[12.5px]", st.ok === null ? "text-fg-muted" : "text-fg")}>
                        {st.ok === null
                          ? <Icon name="fa-circle-dot" className="text-fg-faint" />
                          : st.ok ? <Icon name="fa-circle-check" className="text-success" /> : <Icon name="fa-circle-xmark" className="text-critical" />}
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
    </Page>
  );
}
