// Market Calendar — exchange trading holidays and mock (test) sessions per
// segment, from /trading/calendar/ (falls back to the embedded
// holiday_calendar_2026.csv / mock_calendar_2026.csv seed when offline).
// Drives BOD planning: when markets are closed and when mock sessions run.
import React from "react";
import { useMarketCalendar } from "@/api/hooks";
import { useNav } from "@/hooks/useNav";
import { Empty, Pill, StatCard, fmt as fmtNum } from "@/components/ld";
import "@/styles/trading.css";

import { Icon } from "@/components/Icon";
import { BanIcon, ChevronDownIcon, ChevronRightIcon, DownloadIcon, FlaskConicalIcon } from "lucide-react";
// Exchange segments present in the calendars.
const SEGMENTS = ["NSE", "NFO", "CDS", "NSLB", "NCOM", "NMF", "BSE", "BFO", "BCD", "BSLB", "BCOM", "NCDEX", "MCX", "NIE", "BIX"];

interface Holiday { date: string; name: string; segments: string[]; }
interface Mock { date: string; segments: string[]; }

// From holiday_calendar_2026.csv. NMF observes only a subset; MCX included where listed.
const ALL_BUT_NMF = SEGMENTS.filter((s) => !["NMF", "NCDEX", "NIE", "BIX"].includes(s));
const WITH_NMF = SEGMENTS.filter((s) => !["NCDEX", "NIE", "BIX"].includes(s));
const SEED_HOLIDAYS: Holiday[] = [
  { date: "2026-01-26", name: "Republic Day", segments: ALL_BUT_NMF },
  { date: "2026-03-03", name: "Holi", segments: ALL_BUT_NMF },
  { date: "2026-03-26", name: "Shri Ram Navami", segments: WITH_NMF },
  { date: "2026-03-31", name: "Mahavir Jayanti", segments: ALL_BUT_NMF },
  { date: "2026-04-03", name: "Good Friday", segments: ALL_BUT_NMF },
  { date: "2026-04-14", name: "Baba Saheb Ambedkar Jayanti", segments: ALL_BUT_NMF },
  { date: "2026-05-01", name: "Maharashtra Day", segments: ALL_BUT_NMF },
  { date: "2026-05-28", name: "Bakri Id", segments: ALL_BUT_NMF },
  { date: "2026-06-26", name: "Muharram", segments: ALL_BUT_NMF },
  { date: "2026-09-14", name: "Ganesh Chaturthi", segments: ALL_BUT_NMF },
  { date: "2026-10-02", name: "Mahatma Gandhi Jayanti", segments: WITH_NMF },
  { date: "2026-10-20", name: "Dussehra", segments: ALL_BUT_NMF },
  { date: "2026-11-10", name: "Diwali-Balipratipada", segments: ALL_BUT_NMF },
  { date: "2026-11-24", name: "Prakash Gurpurb Sri Guru Nanak Dev", segments: WITH_NMF },
  { date: "2026-12-25", name: "Christmas", segments: ALL_BUT_NMF },
];

// From mock_calendar_2026.csv — first-Saturday mock sessions.
const MOCK_CORE = ["NSE", "NFO", "CDS", "NSLB", "NCOM", "NMF", "BSE", "BFO", "BCD", "BSLB", "BCOM"];
const SEED_MOCKS: Mock[] = [
  { date: "2026-01-03", segments: MOCK_CORE },
  { date: "2026-02-07", segments: MOCK_CORE },
  { date: "2026-03-07", segments: MOCK_CORE },
  { date: "2026-04-04", segments: MOCK_CORE },
  { date: "2026-05-02", segments: MOCK_CORE },
  { date: "2026-06-06", segments: [...MOCK_CORE, "NIE", "BIX"] },
  { date: "2026-07-04", segments: MOCK_CORE },
  { date: "2026-08-01", segments: MOCK_CORE },
  { date: "2026-09-05", segments: MOCK_CORE },
  { date: "2026-10-03", segments: MOCK_CORE },
  { date: "2026-11-07", segments: MOCK_CORE },
  { date: "2026-12-05", segments: MOCK_CORE },
];

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const pad = (n: number) => String(n).padStart(2, "0");
const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const TODAY = isoOf(new Date());

const fmt = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  const wd = d.toLocaleDateString("en-US", { weekday: "short" });
  return { day: d.getDate(), month: d.getMonth(), wd };
};
const longDate = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

type Kind = "all" | "holiday" | "mock";
interface Row { date: string; kind: "holiday" | "mock"; name: string; }

/** One month as a Mon–Sun table with holidays and mock sessions marked. */
function MonthTable({ year, month, hol, mock }: { year: number; month: number; hol: Map<string, string>; mock: Set<string> }) {
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7; // Monday-first
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
  const isNow = TODAY.startsWith(`${year}-${pad(month + 1)}`);
  return (
    <div className={`ld-trading-month${isNow ? " now" : ""}`}>
      <table>
        <caption>{MONTHS[month]} {year}{isNow && <> · <span className="ld-text-info">this month</span></>}</caption>
        <thead>
          <tr>{WEEKDAYS.map((w) => <th key={w} scope="col" abbr={w}>{w.slice(0, 2)}</th>)}</tr>
        </thead>
        <tbody>
          {weeks.map((wk, wi) => (
            <tr key={wi}>
              {wk.map((d, di) => {
                if (d == null) return <td key={di} />;
                const iso = `${year}-${pad(month + 1)}-${pad(d)}`;
                const h = hol.get(iso);
                const m = mock.has(iso);
                const cls = ["ld-trading-day", di >= 5 ? "wkend" : "", h ? "hol" : m ? "mock" : "", iso === TODAY ? "today" : ""].filter(Boolean).join(" ");
                const label = h ? `${h} — market closed` : m ? "Mock session" : undefined;
                return (
                  <td key={di}>
                    <span className={cls} title={label}>
                      {d}
                      {label && <span className="sr-only">, {label}</span>}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MarketCalendarScreen() {
  const { setRoute } = useNav();
  const [seg, setSeg] = React.useState("NSE");
  const [kind, setKind] = React.useState<Kind>("all");
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const toggle = (id: string) => setCollapsed((c) => ({ ...c, [id]: !c[id] }));

  // Live /trading/calendar/ split by kind; falls back to the embedded CSV seed offline.
  const cal = useMarketCalendar().data;
  const HOLIDAYS: Holiday[] = cal ? cal.filter((d) => d.kind === "holiday").map((d) => ({ date: d.date, name: d.name, segments: d.segments })) : SEED_HOLIDAYS;
  const MOCKS: Mock[] = cal ? cal.filter((d) => d.kind === "mock").map((d) => ({ date: d.date, segments: d.segments })) : SEED_MOCKS;

  const holidays = HOLIDAYS.filter((h) => h.segments.includes(seg)).sort((a, b) => a.date.localeCompare(b.date));
  const mocks = MOCKS.filter((m) => m.segments.includes(seg)).sort((a, b) => a.date.localeCompare(b.date));
  const nextHoliday = holidays.find((h) => h.date >= TODAY);
  const nextMock = mocks.find((m) => m.date >= TODAY);
  const year = Number((holidays[0]?.date ?? mocks[0]?.date ?? TODAY).slice(0, 4));

  // Build a real .ics for the selected segment and download it (all-day events).
  const exportICS = () => {
    const stamp = TODAY.replace(/-/g, "") + "T000000Z";
    const dt = (iso: string) => iso.replace(/-/g, "");
    const nextDay = (iso: string) => { const d = new Date(iso + "T00:00:00"); d.setDate(d.getDate() + 1); return dt(isoOf(d)); };
    const esc = (s: string) => s.replace(/([,;\\])/g, "\\$1");
    const ev = (uid: string, date: string, summary: string) =>
      ["BEGIN:VEVENT", `UID:${uid}@argus-linkedeye`, `DTSTAMP:${stamp}`,
       `DTSTART;VALUE=DATE:${dt(date)}`, `DTEND;VALUE=DATE:${nextDay(date)}`,
       `SUMMARY:${esc(summary)}`, "TRANSP:TRANSPARENT", "END:VEVENT"].join("\r\n");
    const lines = [
      "BEGIN:VCALENDAR", "VERSION:2.0", `PRODID:-//Argus-LinkedEye//Market Calendar ${year}//EN`, "CALSCALE:GREGORIAN", `X-WR-CALNAME:${seg} Market Calendar ${year}`,
      ...holidays.map((h) => ev(`hol-${h.date}-${seg}`, h.date, `${seg} Holiday — ${h.name}`)),
      ...mocks.map((m) => ev(`mock-${m.date}-${seg}`, m.date, `${seg} Mock session`)),
      "END:VCALENDAR",
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob([lines], { type: "text/calendar" }));
    const a = document.createElement("a");
    a.href = url; a.download = `market-calendar-${year}-${seg}.ics`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  const holMap = new Map(holidays.map((h) => [h.date, h.name]));
  const mockSet = new Set(mocks.map((m) => m.date));
  const rows: Row[] = [
    ...holidays.map((h) => ({ date: h.date, kind: "holiday" as const, name: h.name })),
    ...mocks.map((m) => ({ date: m.date, kind: "mock" as const, name: "Mock (test) session" })),
  ].filter((r) => kind === "all" || r.kind === kind).sort((a, b) => a.date.localeCompare(b.date));
  const nextRow = rows.find((r) => r.date >= TODAY);
  const short = (iso?: string) => (iso ? `${fmt(iso).wd} ${longDate(iso).slice(0, 6)}` : "—");

  return (
    <div className="ld-dash">
      <nav className="ld-crumbs" aria-label="Breadcrumb">
        <button type="button" className="ld-link" onClick={() => setRoute("dashboard")}>Home</button>
        <Icon icon={ChevronRightIcon} />
        <span>BOD / EOD</span>
        <Icon icon={ChevronRightIcon} />
        <span>Market Calendar</span>
      </nav>

      <div className="ld-head">
        <div>
          <h1>Market Calendar {year} · {seg}</h1>
          <p>Exchange trading holidays and mock sessions per segment · drives BOD/EOD scheduling</p>
        </div>
        <div className="ld-head-actions">
          {cal ? <Pill tone="ok">Live calendar</Pill> : <Pill tone="muted">Seed · holiday_calendar_2026.csv</Pill>}
          <button type="button" className="ld-btn" onClick={exportICS}><Icon icon={DownloadIcon} /> Export ICS</button>
        </div>
      </div>

      <div className="ld-trading-segs" role="group" aria-label="Exchange segment">
        <span className="ld-inline-label">Segment</span>
        {SEGMENTS.map((s) => (
          <button key={s} type="button" className="ld-trading-seg" aria-pressed={seg === s} onClick={() => setSeg(s)}>{s}</button>
        ))}
      </div>

      <div className="ld-grid ld-grid-stats">
        <StatCard icon="fa-ban" tone="crit" label="Trading holidays" value={fmtNum(holidays.length)} note={`${seg} · full-day close`} onClick={() => setKind("holiday")} />
        <StatCard icon="fa-flask" tone="info" label="Mock sessions" value={fmtNum(mocks.length)} note="test-environment runs" onClick={() => setKind("mock")} />
        <StatCard icon="fa-calendar-xmark" tone="warn" label="Next holiday" value={short(nextHoliday?.date)} note={nextHoliday?.name ?? "none left this year"} />
        <StatCard icon="fa-calendar-check" tone="ok" label="Next mock" value={short(nextMock?.date)} note={nextMock ? "BOD dry-run" : "none left this year"} />
      </div>

      <section className="ld-card ld-panel" aria-labelledby="cal-year-h">
        <div className="ld-panel-head">
          <h2 id="cal-year-h">{year} at a glance</h2>
          <div className="ld-trading-cal-legend">
            <span><span className="ld-trading-key hol" aria-hidden="true" /> Holiday (market closed)</span>
            <span><span className="ld-trading-key mock" aria-hidden="true" /> Mock (test) session</span>
            <span><span className="ld-trading-key today" aria-hidden="true" /> Today</span>
          </div>
        </div>
        <div className="ld-trading-year">
          {MONTHS.map((_, i) => <MonthTable key={i} year={year} month={i} hol={holMap} mock={mockSet} />)}
        </div>
      </section>

      <section className="ld-card ld-panel" aria-labelledby="cal-tbl-h">
        <div className="ld-panel-head">
          <h2 id="cal-tbl-h">
            <button type="button" className="ld-trading-toggle" aria-expanded={!collapsed.tbl} aria-controls="cal-tbl" onClick={() => toggle("tbl")}>
              <Icon icon={ChevronDownIcon} /> {seg} sessions &amp; holidays
            </button>
          </h2>
          <div className="ld-trading-panel-tools">
            <label htmlFor="cal-kind" className="sr-only">Show</label>
            <select id="cal-kind" className="ld-select" value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
              <option value="all">Holidays and mock sessions</option>
              <option value="holiday">Holidays only</option>
              <option value="mock">Mock sessions only</option>
            </select>
          </div>
        </div>
        <div id="cal-tbl" hidden={collapsed.tbl}>
          {rows.length ? (
            <div className="ld-table-wrap">
              <table className="ld-table">
                <thead>
                  <tr><th scope="col">Date</th><th scope="col">Day</th><th scope="col">Type</th><th scope="col">Name</th><th scope="col">Status</th></tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const past = r.date < TODAY;
                    const isNext = r === nextRow;
                    return (
                      <tr key={`${r.kind}-${r.date}`} className={past ? "ld-trading-row-past" : isNext ? "ld-trading-row-next" : undefined}>
                        <td className="ld-mono">{longDate(r.date)}</td>
                        <td className="ld-muted">{fmt(r.date).wd}</td>
                        <td>{r.kind === "holiday" ? <Pill tone="crit"><Icon icon={BanIcon} /> Holiday</Pill> : <Pill tone="info"><Icon icon={FlaskConicalIcon} /> Mock</Pill>}</td>
                        <td className="ld-wrap">{r.name}</td>
                        <td>{past ? <Pill tone="muted">Passed</Pill> : isNext ? <Pill tone="warn">Next</Pill> : <Pill tone="ok">Upcoming</Pill>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>No {kind === "mock" ? "mock sessions" : kind === "holiday" ? "holidays" : "calendar entries"} for {seg}.</Empty>
          )}
        </div>
      </section>
    </div>
  );
}
