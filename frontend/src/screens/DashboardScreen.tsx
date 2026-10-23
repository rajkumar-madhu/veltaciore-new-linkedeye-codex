// Operations Dashboard — the product home / NOC overview.
// LinkedEye layout: summary cards, ticket trend + status/SLA donuts, an
// infrastructure strip, recent tickets / infra health / busiest devices, and
// category, asset-mix and alert-activity panels.
//
// Live data only — no seed fallback. Every panel has an empty state so a clean
// deployment renders honestly instead of showing illustrative numbers.
import React from "react";
import { useNav } from "@/hooks/useNav";
import {
  useDeviceLoad,
  useIncidents,
  useIncidentRecords,
  useChangeRecords,
  useDevices,
  useServices,
  useInfraAlerts,
} from "@/api/hooks";
import { DEVICE_KINDS } from "@/data/infra";
import { Donut, Empty, Legend, PALETTE, Panel, Pill, StatCard, TrendChart, countBy, fmt, dailyTrend, openedAt } from "@/components/ld";
import type { Tone, Slice } from "@/components/ld";

const RESOLVED_STATES = new Set(["Resolved", "Closed", "Cancelled", "Canceled"]);

const CHANGE_DONE_STATES = new Set(["Completed", "Closed", "Cancelled", "Canceled"]);

const DEVICE_DOWN = new Set(["down", "critical", "offline"]);

const PRIORITY: Record<number, { label: string; tone: Tone }> = {
  1: { label: "Critical", tone: "crit" },
  2: { label: "High", tone: "warn" },
  3: { label: "Medium", tone: "info" },
  4: { label: "Low", tone: "ok" },
};

const STATE_TONE: Record<string, Tone> = {
  New: "crit",
  Assigned: "warn",
  "In Progress": "warn",
  "On Hold": "info",
  Resolved: "ok",
  Closed: "muted",
};

const STATE_COLOR: Record<string, string> = {
  New: "#e5383b",
  Assigned: "#f5a524",
  "In Progress": "#2f6bff",
  "On Hold": "#7c4dff",
  Resolved: "#16a34a",
  Closed: "#98a2b3",
};

// Period for ticket and change figures. "all" keeps every record and draws
// the trend for the 14 days ending at the newest ticket.
type Period = "all" | "24h" | "7d" | "30d" | "90d" | "custom";
const PERIODS: { id: Period; label: string; days?: number }[] = [
  { id: "all", label: "All time" },
  { id: "24h", label: "Last 24 hours", days: 1 },
  { id: "7d", label: "Last 7 days", days: 7 },
  { id: "30d", label: "Last 30 days", days: 30 },
  { id: "90d", label: "Last 90 days", days: 90 },
  { id: "custom", label: "Custom range" },
];
const DAY = 86_400_000;
const toDateInput = (ms: number) => new Date(ms - new Date(ms).getTimezoneOffset() * 60_000).toISOString().slice(0, 10);

export default function DashboardScreen() {
  const { setRoute } = useNav();
  const id = React.useId();

  const [period, setPeriod] = React.useState<Period>("all");
  const [fromDay, setFromDay] = React.useState(toDateInput(Date.now() - 30 * DAY));
  const [toDay, setToDay] = React.useState(toDateInput(Date.now()));
  const window_ = React.useMemo(() => {
    if (period === "all") return null;
    if (period === "custom") {
      const from = new Date(`${fromDay}T00:00`).getTime(), to = new Date(`${toDay}T23:59:59`).getTime();
      return Number.isNaN(from) || Number.isNaN(to) || from > to ? null : { from, to };
    }
    const days = PERIODS.find((p) => p.id === period)?.days ?? 30;
    return { from: Date.now() - days * DAY, to: Date.now() };
  }, [period, fromDay, toDay]);
  const inWindow = React.useCallback(
    (opened: string) => { if (!window_) return true; const t = openedAt(opened); return t >= window_.from && t <= window_.to; },
    [window_],
  );
  const customInvalid = period === "custom" && !window_;

  const allTickets = useIncidentRecords().data ?? [];
  const allChanges = useChangeRecords().data ?? [];
  const tickets = React.useMemo(() => allTickets.filter((t) => inWindow(t.opened)), [allTickets, inWindow]);
  const changes = React.useMemo(() => allChanges.filter((c) => inWindow(c.opened)), [allChanges, inWindow]);
  const incidents = useIncidents().data ?? [];
  const load = useDeviceLoad().data;
  const devices = useDevices().data ?? [];
  const services = useServices().data ?? [];
  const alerts = useInfraAlerts().data ?? [];

  // ── Summary cards ──────────────────────────────────────────────────────
  const openTickets = tickets.filter((t) => !RESOLVED_STATES.has(t.state));
  const activeIncidents = incidents.filter((i) => i.status !== "resolved" && i.status !== "closed");
  const sev1 = activeIncidents.filter((i) => i.sev === 1).length;
  const sev2 = activeIncidents.filter((i) => i.sev === 2).length;
  const openChanges = changes.filter((c) => !CHANGE_DONE_STATES.has(c.state));
  const devicesOnline = devices.filter((d) => !DEVICE_DOWN.has(d.status)).length;
  const devicesDown = devices.length - devicesOnline;
  const critAlerts = alerts.filter((a) => a.sev === "critical").length;
  const healthyServices = services.filter((s) => s.status === "ok" || s.status === "healthy").length;
  const avgUptime = services.length ? services.reduce((s, x) => s + x.uptime, 0) / services.length : 0;

  // ── Ticket trend: one point per day of the period (all time → the 14 days
  // ending at the newest ticket; a period longer than 90 days shows its last 90).
  const days = React.useMemo(() => {
    if (!window_) return dailyTrend(tickets, RESOLVED_STATES);
    const startDay = new Date(window_.from); startDay.setHours(0, 0, 0, 0);
    const endDay = new Date(window_.to); endDay.setHours(0, 0, 0, 0);
    const n = Math.min(90, Math.max(1, Math.round((endDay.getTime() - startDay.getTime()) / DAY) + 1));
    return dailyTrend(tickets, RESOLVED_STATES, n, window_.to);
  }, [tickets, window_]);
  const periodLabel = period === "custom" ? (window_ ? `${fromDay} – ${toDay}` : "Custom range") : PERIODS.find((p) => p.id === period)!.label;

  const statusSlices: Slice[] = countBy(tickets, (t) => t.state).map(([label, value], i) => ({
    label,
    value,
    color: STATE_COLOR[label] ?? PALETTE[i % PALETTE.length],
  }));

  const slaMet = tickets.filter((t) => t.sla === "met" || t.sla === "ok").length;
  const slaBreached = tickets.filter((t) => t.sla === "breach").length;
  const slaAtRisk = tickets.filter((t) => t.sla === "warn").length;
  const slaTotal = slaMet + slaBreached + slaAtRisk;
  const slaSlices: Slice[] = [
    { label: "Met", value: slaMet, color: "#16a34a" },
    { label: "Breached", value: slaBreached, color: "#e5383b" },
    { label: "At Risk", value: slaAtRisk, color: "#f5a524" },
  ];
  const slaPct = slaTotal ? `${Math.round((slaMet / slaTotal) * 100)}%` : "—";

  // ── Tables ─────────────────────────────────────────────────────────────
  const recentTickets = [...tickets].sort((a, b) => b.opened.localeCompare(a.opened)).slice(0, 6);

  const kindLabel = (id: string) => DEVICE_KINDS.find((k) => k.id === id)?.label ?? id;
  const kindColor = (id: string, i: number) => DEVICE_KINDS.find((k) => k.id === id)?.color ?? PALETTE[i % PALETTE.length];
  const byKind = countBy(devices, (d) => d.kind);
  const infraHealth = byKind.map(([kind, total]) => {
    const rows = devices.filter((d) => d.kind === kind);
    const down = rows.filter((d) => DEVICE_DOWN.has(d.status)).length;
    const warn = rows.filter((d) => d.status === "warn" || d.status === "degraded").length;
    const tone: Tone = down ? "crit" : warn ? "warn" : "ok";
    return {
      kind,
      label: kindLabel(kind),
      tone,
      status: down ? "Critical" : warn ? "Warning" : "Healthy",
      detail: `${total - down}/${total} online${warn ? ` · ${warn} degraded` : ""}`,
      rank: down ? 0 : warn ? 1 : 2,
    };
  })
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 7);

  // Live CPU / memory from Prometheus where the exporter reports it; the
  // inventory's last known values otherwise (the panel says which).
  const liveLoad = new Map((load?.source === "prometheus" ? load.devices : []).map((l) => [l.id, l]));
  const loadOf = (d: (typeof devices)[number]) => {
    const l = liveLoad.get(d.id);
    return { cpu: l?.cpu ?? d.cpu, mem: l?.mem ?? d.mem, live: !!l };
  };
  const busiest = [...devices]
    .map((d) => ({ d, ...loadOf(d) }))
    .sort((a, b) => Math.max(b.cpu, b.mem) - Math.max(a.cpu, a.mem))
    .slice(0, 6);
  const liveCount = busiest.filter((b) => b.live).length;
  const loadTone = (v: number): Tone => (v >= 85 ? "crit" : v >= 70 ? "warn" : "ok");

  const categories = countBy(tickets, (t) => t.category || "Uncategorised").slice(0, 5);
  const topCategory = categories[0]?.[1] ?? 1;

  const assetSlices: Slice[] = byKind.slice(0, 6).map(([kind, value], i) => ({ label: kindLabel(kind), value, color: kindColor(kind, i) }));
  const otherAssets = byKind.slice(6).reduce((s, [, v]) => s + v, 0);
  if (otherAssets) assetSlices.push({ label: "Others", value: otherAssets, color: "#98a2b3" });

  const recentAlerts = alerts.slice(0, 6);

  return (
    <div className="ld-dash">
      <div className="ld-head">
        <div>
          <h1>Dashboard</h1>
          <p>Complete view of your IT infrastructure, services, and support operations</p>
        </div>
        <div className="ld-head-actions ld-period">
          <label className="ld-inline-label" htmlFor={`${id}-period`}><i className="fa-regular fa-calendar" aria-hidden="true" /> Period</label>
          <select id={`${id}-period`} className="ld-select" value={period} onChange={(e) => setPeriod(e.target.value as Period)}>
            {PERIODS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          {period === "custom" && (
            <>
              <label className="sr-only" htmlFor={`${id}-from`}>From</label>
              <input id={`${id}-from`} type="date" className="ld-input" value={fromDay} max={toDay} onChange={(e) => setFromDay(e.target.value)} />
              <span className="ld-muted" aria-hidden="true">–</span>
              <label className="sr-only" htmlFor={`${id}-to`}>To</label>
              <input id={`${id}-to`} type="date" className="ld-input" value={toDay} min={fromDay} max={toDateInput(Date.now())} onChange={(e) => setToDay(e.target.value)} />
            </>
          )}
        </div>
      </div>
      {customInvalid && <p className="ld-text-crit ld-small" role="alert">The start date must be on or before the end date. Showing all time.</p>}
      {period !== "all" && (
        <p className="ld-muted ld-small">
          Tickets and changes opened in <b>{periodLabel}</b>: {fmt(tickets.length)} of {fmt(allTickets.length)} tickets, {fmt(changes.length)} of {fmt(allChanges.length)} changes.
          Incidents, devices, alerts and services show the current state.
        </p>
      )}

      <div className="ld-grid ld-grid-stats">
        <StatCard
          icon="fa-ticket"
          tone="info"
          label="Total Tickets"
          value={fmt(tickets.length)}
          note={`${fmt(openTickets.length)} open, ${fmt(tickets.length - openTickets.length)} resolved`}
          onClick={() => setRoute("incidents")}
        />
        <StatCard
          icon="fa-triangle-exclamation"
          tone="crit"
          label="Open Incidents"
          value={fmt(activeIncidents.length)}
          note={activeIncidents.length ? `${sev1} critical, ${sev2} high` : "all clear"}
          onClick={() => setRoute("incidents")}
        />
        <StatCard
          icon="fa-code-branch"
          tone="warn"
          label="Open Changes"
          value={fmt(openChanges.length)}
          note={`${fmt(changes.length)} total change records`}
          onClick={() => setRoute("changes")}
        />
        <StatCard
          icon="fa-server"
          tone="info"
          label="Assets"
          value={fmt(devices.length)}
          note={`${fmt(devicesOnline)} devices online`}
          onClick={() => setRoute("infra-assets")}
        />
      </div>

      <div className="ld-grid ld-grid-3">
        <Panel title={`Ticket Trend · ${periodLabel}`}>
          <div className="ld-chart-legend">
            <span><span className="ld-dot" style={{ background: "#2f6bff" }} />Opened</span>
            <span><span className="ld-dot" style={{ background: "#16a34a" }} />Since resolved</span>
          </div>
          {tickets.length ? <TrendChart days={days} /> : <Empty>No tickets yet.</Empty>}
        </Panel>
        <Panel title="Tickets by Status" action={{ label: "View All", onClick: () => setRoute("incidents") }}>
          {tickets.length ? (
            <div className="ld-donut-row">
              <Donut slices={statusSlices} center={fmt(tickets.length)} sub="Total" label={`${tickets.length} tickets by status`} />
              <Legend slices={statusSlices} />
            </div>
          ) : (
            <Empty>No tickets yet.</Empty>
          )}
        </Panel>
        <Panel title="SLA Compliance" action={{ label: "SLAs", onClick: () => setRoute("slas") }}>
          {slaTotal ? (
            <div className="ld-donut-row">
              <div className="ld-donut-col">
                <Donut slices={slaSlices} center={slaPct} label={`${slaPct} of ticket SLAs met`} />
                <span className="ld-donut-caption">SLA Met</span>
              </div>
              <Legend slices={slaSlices} />
            </div>
          ) : (
            <Empty>No SLA data yet.</Empty>
          )}
        </Panel>
      </div>

      <div className="ld-grid ld-grid-stats">
        <StatCard
          icon="fa-bell"
          tone="crit"
          label="Critical Alerts"
          value={fmt(critAlerts)}
          note={`${fmt(devicesDown)} devices down`}
          onClick={() => setRoute("alerts")}
        />
        <StatCard
          icon="fa-heart-pulse"
          tone="ok"
          label="Monitoring"
          value={devices.length ? `${fmt(devicesOnline)} / ${fmt(devices.length)}` : "—"}
          note="Devices online"
          onClick={() => setRoute("infra")}
        />
        <StatCard
          icon="fa-globe"
          tone="purple"
          label="Services"
          value={services.length ? `${avgUptime.toFixed(2)}%` : "—"}
          note={`${healthyServices}/${services.length} healthy · avg uptime`}
          onClick={() => setRoute("apm-catalog")}
        />
        <StatCard
          icon="fa-rotate"
          tone="warn"
          label="Changes in flight"
          value={fmt(openChanges.filter((c) => c.state === "Implement").length)}
          note="Implementing now"
          onClick={() => setRoute("changes")}
        />
      </div>

      <div className="ld-grid ld-grid-tables">
        <Panel title="Recent Tickets" action={{ label: "View All", onClick: () => setRoute("incidents") }}>
          {recentTickets.length ? (
            <div className="ld-table-wrap">
              <table className="ld-table">
                <thead>
                  <tr><th scope="col">#</th><th scope="col">Title</th><th scope="col">Priority</th><th scope="col">Status</th></tr>
                </thead>
                <tbody>
                  {recentTickets.map((t) => {
                    const p = PRIORITY[t.pri] ?? { label: `P${t.pri}`, tone: "muted" as Tone };
                    return (
                      <tr key={t.id}>
                        <td>
                          <button type="button" className="ld-link ld-mono" onClick={() => setRoute("incident-detail", { id: t.id })}>
                            {t.id}
                          </button>
                        </td>
                        <td className="ld-ellipsis" title={`${t.title} · opened ${t.opened}`}>{t.title}</td>
                        <td><Pill tone={p.tone}>{p.label}</Pill></td>
                        <td><Pill tone={STATE_TONE[t.state] ?? "muted"}>{t.state}</Pill></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>No tickets yet.</Empty>
          )}
        </Panel>
        <Panel title="Infrastructure Health" action={{ label: "View All", onClick: () => setRoute("infra") }}>
          {infraHealth.length ? (
            <div className="ld-table-wrap">
              <table className="ld-table">
                <thead>
                  <tr><th scope="col">Component</th><th scope="col">Status</th><th scope="col">Details</th></tr>
                </thead>
                <tbody>
                  {infraHealth.map((h) => (
                    <tr key={h.kind}>
                      <td className="ld-strong">{h.label}</td>
                      <td><Pill tone={h.tone}><span className="ld-pill-dot" />{h.status}</Pill></td>
                      <td className="ld-muted ld-wrap">{h.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>No devices onboarded yet.</Empty>
          )}
        </Panel>
        <Panel title="Busiest Devices" action={{ label: "View All", onClick: () => setRoute("infra-assets") }}>
          <p className="ld-muted ld-small ld-load-src">
            {liveCount ? <><span className="ld-live"><span className="ld-pill-dot" /> Live</span> from Prometheus for {liveCount} of {busiest.length}; others from the inventory.</>
              : load?.source === "prometheus" ? "No live samples for these devices yet; values from the inventory."
              : "Prometheus not connected; values from the inventory."}
          </p>
          {busiest.length ? (
            <div className="ld-table-wrap">
              <table className="ld-table">
                <thead>
                  <tr><th scope="col">Device</th><th scope="col">CPU</th><th scope="col">Memory</th></tr>
                </thead>
                <tbody>
                  {busiest.map(({ d, cpu, mem, live }) => (
                    <tr key={d.id}>
                      <td>
                        <span className="ld-strong">{d.hostname || d.id}</span>
                        <span className="ld-sub">{kindLabel(d.kind)}{live ? " · live" : ""}</span>
                      </td>
                      <td><Pill tone={loadTone(cpu)}>{Math.round(cpu)}%</Pill></td>
                      <td><Pill tone={loadTone(mem)}>{Math.round(mem)}%</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>No devices onboarded yet.</Empty>
          )}
        </Panel>
      </div>

      <div className="ld-grid ld-grid-3">
        <Panel title="Top 5 Ticket Categories">
          {categories.length ? (
            <ul className="ld-bars">
              {categories.map(([label, value], i) => (
                <li key={label}>
                  <span className="ld-bar-label">{label}</span>
                  <span className="ld-bar-track">
                    <span className="ld-bar-fill" style={{ width: `${(value / topCategory) * 100}%`, background: PALETTE[i % PALETTE.length] }} />
                  </span>
                  <span className="ld-bar-value">{value}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No tickets yet.</Empty>
          )}
        </Panel>
        <Panel title="Assets by Type" action={{ label: "View All", onClick: () => setRoute("infra-assets") }}>
          {assetSlices.length ? (
            <div className="ld-donut-row">
              <Donut slices={assetSlices} center={fmt(devices.length)} sub="Assets" label={`${devices.length} assets by type`} />
              <Legend slices={assetSlices} />
            </div>
          ) : (
            <Empty>No devices onboarded yet.</Empty>
          )}
        </Panel>
        <Panel title="Recent Alerts" action={{ label: "View All", onClick: () => setRoute("alerts") }}>
          {recentAlerts.length ? (
            <ul className="ld-activity">
              {recentAlerts.map((a) => {
                const tone: Tone = a.sev === "critical" ? "crit" : a.sev === "warning" || a.sev === "warn" ? "warn" : "info";
                return (
                  <li key={a.id}>
                    <span className={`ld-tile ld-tile-sm ld-${tone}`} aria-hidden="true">
                      <i className="fa-solid fa-bell" />
                    </span>
                    <span className="ld-activity-text">
                      {a.title} · <span className="ld-muted">{a.device}</span>
                    </span>
                    <span className="ld-muted ld-nowrap">{a.since}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty>No active alerts.</Empty>
          )}
        </Panel>
      </div>
    </div>
  );
}
