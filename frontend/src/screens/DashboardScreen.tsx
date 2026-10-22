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
  useIncidents,
  useIncidentRecords,
  useChangeRecords,
  useDevices,
  useServices,
  useInfraAlerts,
} from "@/api/hooks";
import { DEVICE_KINDS } from "@/data/infra";
import { Donut, Empty, Legend, PALETTE, Panel, Pill, StatCard, TrendChart, countBy, fmt, dailyTrend } from "@/components/ld";
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

export default function DashboardScreen() {
  const { setRoute } = useNav();

  const tickets = useIncidentRecords().data ?? [];
  const incidents = useIncidents().data ?? [];
  const changes = useChangeRecords().data ?? [];
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

  // ── Ticket trend: opened per day over the 14 days ending at the newest ticket
  const days = React.useMemo(() => dailyTrend(tickets, RESOLVED_STATES), [tickets]);

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

  const busiest = [...devices].sort((a, b) => Math.max(b.cpu, b.mem) - Math.max(a.cpu, a.mem)).slice(0, 6);
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
      </div>

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
        <Panel title="Ticket Trend">
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
          {busiest.length ? (
            <div className="ld-table-wrap">
              <table className="ld-table">
                <thead>
                  <tr><th scope="col">Device</th><th scope="col">CPU</th><th scope="col">Memory</th></tr>
                </thead>
                <tbody>
                  {busiest.map((d) => (
                    <tr key={d.id}>
                      <td>
                        <span className="ld-strong">{d.hostname || d.id}</span>
                        <span className="ld-sub">{kindLabel(d.kind)}</span>
                      </td>
                      <td><Pill tone={loadTone(d.cpu)}>{Math.round(d.cpu)}%</Pill></td>
                      <td><Pill tone={loadTone(d.mem)}>{Math.round(d.mem)}%</Pill></td>
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
