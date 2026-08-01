// Market Calendar 2026 — exchange trading holidays and mock (test) sessions
// per segment, built from the real holiday_calendar_2026.csv and
// mock_calendar_2026.csv. Drives BOD planning: when markets are closed and
// when mock sessions run. Light-theme house style.
import React from "react";
import { Kpi, FormSection } from "@/components/primitives";
import { useMarketCalendar } from "@/api/hooks";

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

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const TODAY = "2026-07-23"; // session date

const fmt = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  const wd = d.toLocaleDateString("en-US", { weekday: "short" });
  return { day: d.getDate(), month: d.getMonth(), wd };
};

export default function MarketCalendarScreen() {
  const [seg, setSeg] = React.useState("NSE");
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const toggle = (id: string) => setCollapsed((c) => ({ ...c, [id]: !c[id] }));

  // Live /trading/calendar/ split by kind; falls back to the embedded CSV seed offline.
  const cal = useMarketCalendar().data;
  const HOLIDAYS: Holiday[] = cal ? cal.filter((d) => d.kind === "holiday").map((d) => ({ date: d.date, name: d.name, segments: d.segments })) : SEED_HOLIDAYS;
  const MOCKS: Mock[] = cal ? cal.filter((d) => d.kind === "mock").map((d) => ({ date: d.date, segments: d.segments })) : SEED_MOCKS;

  const holidays = HOLIDAYS.filter((h) => h.segments.includes(seg));
  const mocks = MOCKS.filter((m) => m.segments.includes(seg));
  const nextHoliday = holidays.find((h) => h.date >= TODAY);
  const nextMock = mocks.find((m) => m.date >= TODAY);

  // Build a real .ics for the selected segment and download it (all-day events).
  const exportICS = () => {
    const stamp = TODAY.replace(/-/g, "") + "T000000Z";
    const dt = (iso: string) => iso.replace(/-/g, "");
    const nextDay = (iso: string) => { const d = new Date(iso + "T00:00:00"); d.setDate(d.getDate() + 1); return dt(d.toISOString().slice(0, 10)); };
    const esc = (s: string) => s.replace(/([,;\\])/g, "\\$1");
    const ev = (uid: string, date: string, summary: string) =>
      ["BEGIN:VEVENT", `UID:${uid}@argus-linkedeye`, `DTSTAMP:${stamp}`,
       `DTSTART;VALUE=DATE:${dt(date)}`, `DTEND;VALUE=DATE:${nextDay(date)}`,
       `SUMMARY:${esc(summary)}`, "TRANSP:TRANSPARENT", "END:VEVENT"].join("\r\n");
    const lines = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Argus-LinkedEye//Market Calendar 2026//EN", "CALSCALE:GREGORIAN", `X-WR-CALNAME:${seg} Market Calendar 2026`,
      ...holidays.map((h) => ev(`hol-${h.date}-${seg}`, h.date, `${seg} Holiday — ${h.name}`)),
      ...mocks.map((m) => ev(`mock-${m.date}-${seg}`, m.date, `${seg} Mock session`)),
      "END:VCALENDAR",
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob([lines], { type: "text/calendar" }));
    const a = document.createElement("a");
    a.href = url; a.download = `market-calendar-2026-${seg}.ics`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  // Group by month for the year grid.
  const byMonth = (mo: number) => ({
    hol: holidays.filter((h) => fmt(h.date).month === mo),
    mock: mocks.filter((m) => fmt(m.date).month === mo),
  });

  return (
    <div className="page page-fade sn-dash">
      <div className="sn-breadcrumb">
        <a className="sn-link">Home</a><span className="sn-bc-sep">›</span>
        <a className="sn-link">Trading Ops</a><span className="sn-bc-sep">›</span>
        <span>Market Calendar 2026</span>
      </div>

      <div className="sn-form-header">
        <div className="sn-form-title-row">
          <span className="sn-rec-number">CALENDAR 2026</span>
          <span className="sn-pill prio-1"><i className="fa-solid fa-ban" /> {holidays.length} holidays</span>
          <span className="sn-pill state-neutral"><i className="fa-solid fa-flask" /> {mocks.length} mock sessions</span>
          <span className="sn-pill svc-healthy"><i className="fa-solid fa-layer-group" /> {seg}</span>
        </div>
        <div className="sn-form-title-meta">
          <div>
            <h1>Market Calendar · {seg}</h1>
            <div className="sn-form-sub">Exchange trading holidays &amp; mock sessions · drives BOD/EOD scheduling · source holiday_calendar_2026.csv</div>
          </div>
          <div className="sn-form-actions">
            <button className="sn-btn" onClick={exportICS}><i className="fa-solid fa-download" /> Export ICS</button>
          </div>
        </div>
      </div>

      {/* Segment filter */}
      <div style={{ padding: "14px 24px 0", display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 11.5, color: "#6b7785", fontWeight: 600, marginRight: 4 }}>Segment:</span>
        {SEGMENTS.map((s) => (
          <button key={s} onClick={() => setSeg(s)}
            style={{ fontSize: 11.5, fontWeight: 600, padding: "4px 10px", borderRadius: 14, cursor: "pointer",
              border: `1px solid ${seg === s ? "var(--accent)" : "#e5e8eb"}`,
              background: seg === s ? "var(--accent)" : "white", color: seg === s ? "white" : "#475467" }}>{s}</button>
        ))}
      </div>

      <div style={{ padding: "16px 24px 0" }}>
        <div className="sn-kpi-strip">
          <Kpi l="Trading holidays" v={holidays.length} s={`${seg} · full-day close`} tone="crit" />
          <Kpi l="Mock sessions" v={mocks.length} s="test-environment runs" tone="neutral" />
          <Kpi l="Next holiday" v={nextHoliday ? fmt(nextHoliday.date).wd + " " + nextHoliday.date.slice(5) : "—"} s={nextHoliday?.name ?? "none left"} tone="warn" />
          <Kpi l="Next mock" v={nextMock ? fmt(nextMock.date).wd + " " + nextMock.date.slice(5) : "—"} s="BOD dry-run" tone="ok" />
        </div>
      </div>

      {/* Year grid */}
      <div style={{ padding: "16px 24px 0" }}>
        <div className="card" style={{ background: "white", border: "1px solid #e5e8eb", borderRadius: 6, padding: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
            {MONTHS.map((mo, i) => {
              const { hol, mock } = byMonth(i);
              const isNow = i === 6; // July (session month)
              return (
                <div key={mo} style={{ border: `1px solid ${isNow ? "var(--accent)" : "#eef1f4"}`, borderRadius: 8, padding: 12, background: isNow ? "#f0fdf9" : "#fafbfc" }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "#0f1c3f", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
                    <span>{mo} 2026</span>{isNow && <span style={{ fontSize: 10, color: "var(--accent)", fontWeight: 700 }}>NOW</span>}
                  </div>
                  {hol.length === 0 && mock.length === 0 && <div style={{ fontSize: 11, color: "#c0c7d0" }}>Full trading month</div>}
                  {hol.map((h) => (
                    <div key={h.date} style={{ display: "flex", gap: 7, alignItems: "baseline", marginBottom: 4 }}>
                      <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", minWidth: 30 }}>{fmt(h.date).day} {fmt(h.date).wd}</span>
                      <span style={{ fontSize: 11.5, color: "#475467" }}>{h.name}</span>
                    </div>
                  ))}
                  {mock.map((m) => (
                    <div key={m.date} style={{ display: "flex", gap: 7, alignItems: "baseline", marginBottom: 4 }}>
                      <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: "#2563eb", minWidth: 30 }}>{fmt(m.date).day} {fmt(m.date).wd}</span>
                      <span style={{ fontSize: 11.5, color: "#2563eb" }}>Mock session</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 11, color: "#8a94a3" }}>
            <span><span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 2, background: "#dc2626", marginRight: 5 }} />Holiday (market closed)</span>
            <span><span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 2, background: "#2563eb", marginRight: 5 }} />Mock (test) session</span>
          </div>
        </div>
      </div>

      {/* Holiday table */}
      <div style={{ padding: "16px 24px 24px" }}>
        <FormSection id="tbl" title={`All ${seg} trading holidays`} badge={`${holidays.length} days`} collapsed={collapsed.tbl} onToggle={toggle}>
          <table className="sn-list-table" style={{ fontSize: 12.5 }}>
            <thead>
              <tr><th style={{ width: 120 }}>DATE</th><th style={{ width: 70 }}>DAY</th><th>HOLIDAY</th><th style={{ width: 90 }}>STATUS</th></tr>
            </thead>
            <tbody>
              {holidays.map((h) => {
                const past = h.date < TODAY;
                return (
                  <tr key={h.date} style={{ opacity: past ? 0.5 : 1, background: h.date === nextHoliday?.date ? "#fffbeb" : undefined }}>
                    <td className="mono" style={{ color: "#0f1c3f", fontWeight: 600 }}>{h.date.split("-").reverse().join("-")}</td>
                    <td className="mono" style={{ color: "#475467" }}>{fmt(h.date).wd}</td>
                    <td style={{ color: "#0f1c3f" }}>{h.name}</td>
                    <td>{past ? <span style={{ fontSize: 11, color: "#8a94a3" }}>passed</span> : h.date === nextHoliday?.date ? <span style={{ fontSize: 11, fontWeight: 700, color: "#b45309" }}>next</span> : <span style={{ fontSize: 11, color: "#059669" }}>upcoming</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </FormSection>
      </div>
    </div>
  );
}
