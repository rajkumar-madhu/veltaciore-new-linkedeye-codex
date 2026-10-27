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
import { Donut, Empty, Legend, PALETTE, Panel, Pill, PillDot, StatCard, TrendChart, countBy, fmt, dailyTrend, openedAt } from "@/components/ld";
import type { Tone, Slice } from "@/components/ld";

import { Icon } from "@/components/Icon";
import { BellIcon, CalendarIcon } from "lucide-react";
import { Input, Page, PageHead, Select, Table, Tile, cx, toneText, ui } from "@/components/ui";

// donut + legend row (was ld-donut-row)
const donutRow = "flex flex-wrap items-center gap-4.5";
// ticket number link (was ld-link ld-mono: mono size / weight win)
const idLink = cx(
  "border-0 bg-transparent p-0 font-mono text-xs font-semibold text-accent cursor-pointer hover:underline",
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
);
// "Live" marker (was ld-live; its green had no dark-mode variant, unlike ui.live)
const live = "inline-flex items-center gap-1 ml-2 text-[#137a3f]";
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
    // Count calendar days touched by the window, so a rolling window (e.g. the
    // last 24 hours) includes its partial first day.
    const startOfDay = (ms: number) => new Date(ms).setHours(0, 0, 0, 0);
    const n = Math.min(90, Math.round((startOfDay(window_.to) - startOfDay(window_.from)) / DAY) + 1);
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
    <Page>
      <PageHead
        title="Dashboard"
        subtitle="Complete view of your IT infrastructure, services, and support operations"
        actions={
          <>
            <label className="text-sm text-fg-muted" htmlFor={`${id}-period`}><Icon icon={CalendarIcon} /> Period</label>
            <Select id={`${id}-period`} value={period} onChange={(e) => setPeriod(e.target.value as Period)}>
              {PERIODS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </Select>
            {period === "custom" && (
              <>
                <label className="sr-only" htmlFor={`${id}-from`}>From</label>
                <Input id={`${id}-from`} type="date" className="w-auto" value={fromDay} max={toDay} onChange={(e) => setFromDay(e.target.value)} />
                <span className="text-fg-muted" aria-hidden="true">–</span>
                <label className="sr-only" htmlFor={`${id}-to`}>To</label>
                <Input id={`${id}-to`} type="date" className="w-auto" value={toDay} min={fromDay} max={toDateInput(Date.now())} onChange={(e) => setToDay(e.target.value)} />
              </>
            )}
          </>
        }
      />
      {customInvalid && <p className={cx(toneText.crit, "text-xs")} role="alert">The start date must be on or before the end date. Showing all time.</p>}
      {period !== "all" && (
        <p className="text-fg-muted text-xs">
          Tickets and changes opened in <b>{periodLabel}</b>: {fmt(tickets.length)} of {fmt(allTickets.length)} tickets, {fmt(changes.length)} of {fmt(allChanges.length)} changes.
          Incidents, devices, alerts and services show the current state.
        </p>
      )}

      <div className={cx(ui.grid, ui.cols.stats)}>
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

      <div className={cx(ui.grid, ui.cols[3])}>
        <Panel title={`Ticket Trend · ${periodLabel}`}>
          <div className="flex gap-3.5 text-sm text-fg-muted -mt-1 [&>span]:inline-flex [&>span]:items-center [&>span]:gap-1.5">
            <span><span className={ui.dot} style={{ background: "#2f6bff" }} />Opened</span>
            <span><span className={ui.dot} style={{ background: "#16a34a" }} />Since resolved</span>
          </div>
          {tickets.length ? <TrendChart days={days} /> : <Empty>No tickets yet.</Empty>}
        </Panel>
        <Panel title="Tickets by Status" action={{ label: "View All", onClick: () => setRoute("incidents") }}>
          {tickets.length ? (
            <div className={donutRow}>
              <Donut slices={statusSlices} center={fmt(tickets.length)} sub="Total" label={`${tickets.length} tickets by status`} />
              <Legend slices={statusSlices} />
            </div>
          ) : (
            <Empty>No tickets yet.</Empty>
          )}
        </Panel>
        <Panel title="SLA Compliance" action={{ label: "SLAs", onClick: () => setRoute("slas") }}>
          {slaTotal ? (
            <div className={donutRow}>
              <div className="flex flex-col items-center gap-1">
                <Donut slices={slaSlices} center={slaPct} label={`${slaPct} of ticket SLAs met`} />
                <span className="text-base font-medium text-fg">SLA Met</span>
              </div>
              <Legend slices={slaSlices} />
            </div>
          ) : (
            <Empty>No SLA data yet.</Empty>
          )}
        </Panel>
      </div>

      <div className={cx(ui.grid, ui.cols.stats)}>
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

      <div className={cx(ui.grid, ui.cols.tables)}>
        <Panel title="Recent Tickets" action={{ label: "View All", onClick: () => setRoute("incidents") }}>
          {recentTickets.length ? (
            <Table>
                <thead>
                  <tr><th scope="col">#</th><th scope="col">Title</th><th scope="col">Priority</th><th scope="col">Status</th></tr>
                </thead>
                <tbody>
                  {recentTickets.map((t) => {
                    const p = PRIORITY[t.pri] ?? { label: `P${t.pri}`, tone: "muted" as Tone };
                    return (
                      <tr key={t.id}>
                        <td>
                          <button type="button" className={idLink} onClick={() => setRoute("incident-detail", { id: t.id })}>
                            {t.id}
                          </button>
                        </td>
                        <td className="max-w-[220px] overflow-hidden text-ellipsis" title={`${t.title} · opened ${t.opened}`}>{t.title}</td>
                        <td><Pill tone={p.tone}>{p.label}</Pill></td>
                        <td><Pill tone={STATE_TONE[t.state] ?? "muted"}>{t.state}</Pill></td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
          ) : (
            <Empty>No tickets yet.</Empty>
          )}
        </Panel>
        <Panel title="Infrastructure Health" action={{ label: "View All", onClick: () => setRoute("infra") }}>
          {infraHealth.length ? (
            <Table>
                <thead>
                  <tr><th scope="col">Component</th><th scope="col">Status</th><th scope="col">Details</th></tr>
                </thead>
                <tbody>
                  {infraHealth.map((h) => (
                    <tr key={h.kind}>
                      <td className="font-medium">{h.label}</td>
                      <td><Pill tone={h.tone}><PillDot />{h.status}</Pill></td>
                      <td className={ui.cellWrap}>{h.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
          ) : (
            <Empty>No devices onboarded yet.</Empty>
          )}
        </Panel>
        <Panel title="Busiest Devices" action={{ label: "View All", onClick: () => setRoute("infra-assets") }}>
          <p className="text-fg-muted text-xs -mt-1 mb-2">
            {load?.sample ? <><Pill tone="muted">Sample data</Pill> Generated CPU / memory; set PROMETHEUS_URL on the API for live values.</>
              : liveCount ? <><span className={live}><PillDot /> Live</span> from Prometheus for {liveCount} of {busiest.length}; others from the inventory.</>
              : load?.source === "prometheus" ? "No live samples for these devices yet; values from the inventory."
              : "Prometheus not connected; values from the inventory."}
          </p>
          {busiest.length ? (
            <Table>
                <thead>
                  <tr><th scope="col">Device</th><th scope="col">CPU</th><th scope="col">Memory</th></tr>
                </thead>
                <tbody>
                  {busiest.map(({ d, cpu, mem, live }) => (
                    <tr key={d.id}>
                      <td>
                        <span className="font-medium">{d.hostname || d.id}</span>
                        <span className={ui.sub}>{kindLabel(d.kind)}{live ? " · live" : ""}</span>
                      </td>
                      <td><Pill tone={loadTone(cpu)}>{Math.round(cpu)}%</Pill></td>
                      <td><Pill tone={loadTone(mem)}>{Math.round(mem)}%</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
          ) : (
            <Empty>No devices onboarded yet.</Empty>
          )}
        </Panel>
      </div>

      <div className={cx(ui.grid, ui.cols[3])}>
        <Panel title="Top 5 Ticket Categories">
          {categories.length ? (
            <ul className={ui.bars}>
              {categories.map(([label, value], i) => (
                <li key={label} className={ui.barItem}>
                  <span className={ui.barLabel}>{label}</span>
                  <span className={ui.barTrack}>
                    <span className={ui.barFill} style={{ width: `${(value / topCategory) * 100}%`, background: PALETTE[i % PALETTE.length] }} />
                  </span>
                  <span className={ui.barValue}>{value}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No tickets yet.</Empty>
          )}
        </Panel>
        <Panel title="Assets by Type" action={{ label: "View All", onClick: () => setRoute("infra-assets") }}>
          {assetSlices.length ? (
            <div className={donutRow}>
              <Donut slices={assetSlices} center={fmt(devices.length)} sub="Assets" label={`${devices.length} assets by type`} />
              <Legend slices={assetSlices} />
            </div>
          ) : (
            <Empty>No devices onboarded yet.</Empty>
          )}
        </Panel>
        <Panel title="Recent Alerts" action={{ label: "View All", onClick: () => setRoute("alerts") }}>
          {recentAlerts.length ? (
            <ul className={ui.activity}>
              {recentAlerts.map((a) => {
                const tone: Tone = a.sev === "critical" ? "crit" : a.sev === "warning" || a.sev === "warn" ? "warn" : "info";
                return (
                  <li key={a.id} className={ui.activityItem}>
                    <Tile tone={tone} size="sm">
                      <Icon icon={BellIcon} />
                    </Tile>
                    <span className={ui.activityText}>
                      {a.title} · <span className="text-fg-muted">{a.device}</span>
                    </span>
                    <span className="text-fg-muted whitespace-nowrap">{a.since}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty>No active alerts.</Empty>
          )}
        </Panel>
      </div>
    </Page>
  );
}
