// Operations Dashboard — the product home / NOC overview.
// Ported faithfully from the design prototype (screens/dashboard.jsx): a
// ServiceNow-style operations record with a KPI status strip, active-incident
// and service-health tables, a work-notes activity stream, and a right rail of
// on-call / assignment / SLA / infrastructure cards.
//
// Follows the app convention: live hooks with a seed-data fallback so the page
// renders standalone when the backend is down.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { useUiStore } from "@/store/ui";
import { useIncidents, useServices, useSites, useInfraAlerts, useDevices, useChangeRecords, useBodChecks, useMarketCalendar } from "@/api/hooks";
import {
  Sparkline,
  Avatar,
  UserById,
  FormSection,
  FormRow,
  Field,
  Sev,
} from "@/components/primitives";
import { USERS } from "@/data/core";
import { HeatMap } from "@/components/HeatMap";
import { WorldMap } from "@/components/WorldMap";
import { DesktopLatency } from "@/components/DesktopLatency";
import { TIMELINE_EVENTS } from "@/data/incidentContent";
import { useCanWrite } from "@/auth/auth";
import ReadOnlyBadge from "@/components/ReadOnlyBadge";

export default function DashboardScreen() {
  const { setRoute } = useNav();
  const canWrite = useCanWrite();
  const tenant = useUiStore((s) => s.tenant);
  const [tab, setTab] = React.useState("work");
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const toggle = (id: string) => setCollapsed((c) => ({ ...c, [id]: !c[id] }));

  // Live data — no seed fallback (empty on a clean deployment).
  const incidents = useIncidents().data ?? [];
  const services = useServices().data ?? [];
  const sites = useSites().data ?? [];
  const alerts = useInfraAlerts().data ?? [];
  const devices = useDevices().data ?? [];
  const changes = useChangeRecords().data ?? [];

  // Live BOD readiness for the right-rail panel.
  const bodRows = useBodChecks().data ?? [];
  const bod = {
    ok: bodRows.filter((r) => r.status === 2).length,
    warn: bodRows.filter((r) => r.status === 1).length,
    down: bodRows.filter((r) => r.status === 0 || r.status === 3).length,
  };
  const bodReady = bodRows.length > 0 && bod.down === 0;
  const bodReasons = bodRows
    .filter((r) => r.status === 0 || r.status === 3)
    .map((r) => `${r.target.replace(/^https:\/\//, "").split(".")[0]} ${r.note || (r.status === 3 ? "timeout" : "down")}`)
    .slice(0, 2).join(" · ");
  const cal = useMarketCalendar().data ?? [];
  const TODAY = "2026-07-26";
  const nextHol = cal.filter((d) => d.kind === "holiday" && d.date >= TODAY).sort((a, b) => a.date.localeCompare(b.date))[0];
  const nextMock = cal.filter((d) => d.kind === "mock" && d.date >= TODAY).sort((a, b) => a.date.localeCompare(b.date))[0];
  const wd = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", day: "2-digit", month: "short" });

  const activeIncidents = incidents.filter((i) => i.status === "active");
  const sev1Active = incidents.filter((i) => i.sev === 1 && i.status === "active").length;
  const totalAssets = sites.reduce((a, s) => a + s.devices, 0) || devices.length;
  const critDevices = devices.filter((d) => d.status === "critical" || d.status === "down").length;
  const warnDevices = devices.filter((d) => d.status === "warn").length;
  const critAlerts = alerts.filter((a) => a.sev === "critical").length;
  // A clean deployment (no operational data yet) suppresses illustrative metrics.
  const empty = incidents.length === 0 && changes.length === 0 && services.length === 0;
  const dash = (v: React.ReactNode) => (empty ? "—" : v);

  const kpis = [
    { l: "Open Incidents", v: activeIncidents.length, sub: empty ? "no open incidents" : "live", tone: "crit", spark: [3, 4, 4, 6, 5, 7, 8, 8], sc: "#dc2626" },
    { l: "Active Sev-1", v: sev1Active, sub: empty ? "all clear" : "needs attention", tone: "crit", spark: [0, 1, 1, 0, 1, 2, 1, 1], sc: "#dc2626" },
    { l: "MTTA (p50)", v: dash("1.4m"), sub: "ack within target", tone: "ok", spark: [3, 2.6, 2.4, 2, 1.8, 1.6, 1.5, 1.4], sc: "#059669" },
    { l: "MTTR (p50)", v: dash(tenant.mttr + "m"), sub: "12% faster MoM", tone: "ok", spark: [38, 36, 34, 30, 28, 27, 26, 25], sc: "#059669" },
    { l: "SLA Compliance", v: dash("94.2%"), sub: `${critAlerts} at risk`, tone: "warn", spark: [97, 96, 95, 96, 95, 94, 94, 94.2], sc: "#ea580c" },
    { l: "Change Success", v: dash("96.4%"), sub: "+2.1% vs last", tone: "ok", spark: [92, 93, 94, 93, 95, 95, 96, 96.4], sc: "#059669" },
  ];

  return (
    <div className="page page-fade sn-dash">
      {/* Breadcrumb */}
      <div className="sn-breadcrumb">
        <a className="sn-link">Home</a>
        <span className="sn-bc-sep">›</span>
        <a className="sn-link">Operations</a>
        <span className="sn-bc-sep">›</span>
        <span>{tenant.name} Dashboard</span>
      </div>

      {/* Form header */}
      <div className="sn-form-header">
        <div className="sn-form-title-row">
          <span className="sn-rec-number">DASH-{String(tenant.name.length).padStart(4, "0")}</span>
          <span className="sn-pill prio-1">
            <i className="fa-solid fa-circle" /> 1 — Critical
          </span>
          <span className="sn-pill state-progress">
            <i className="fa-solid fa-spinner fa-spin" /> In Progress
          </span>
          <span className="sn-pill state-neutral">
            <i className="fa-solid fa-shield-halved" /> SLA Tracked
          </span>
        </div>
        <div className="sn-form-title-meta">
          <h1>{tenant.name} · Live Operations</h1>
          <div className="sn-form-sub">
            Auto-refresh every 30s · viewing {tenant.name} scope · last sync 2s ago
          </div>
        </div>
        <div className="sn-form-actions">
          <button className="sn-btn"><i className="fa-solid fa-share-nodes" /> Share</button>
          <button className="sn-btn"><i className="fa-solid fa-file-export" /> Export</button>
          <button className="sn-btn"><i className="fa-solid fa-print" /> Print</button>
          <ReadOnlyBadge />
          {canWrite && (
            <button className="sn-btn primary" onClick={() => setRoute("incident-new")}>
              <i className="fa-solid fa-triangle-exclamation" /> Declare Incident
            </button>
          )}
        </div>
      </div>

      {/* KPI status strip */}
      <div className="sn-kpi-strip">
        {kpis.map((k) => (
          <div key={k.l} className={`sn-kpi tone-${k.tone}`}>
            <div className="sn-kpi-l">{k.l}</div>
            <div className="sn-kpi-row">
              <div className="sn-kpi-v">{k.v}</div>
              <div className="sn-kpi-spark">
                <Sparkline data={k.spark as unknown as number[]} color={k.sc} w={68} h={28} />
              </div>
            </div>
            <div className="sn-kpi-s">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="sn-form-layout">
        {/* MAIN COLUMN */}
        <div className="sn-form-main">
          {/* Operational Snapshot */}
          <FormSection id="ops" title="Operational Snapshot" collapsed={collapsed.ops} onToggle={toggle}>
            <FormRow>
              <Field label="Environment" value="Production" required />
              <Field label="Site" value="dc-blr-1 · Bangalore DC-1" />
            </FormRow>
            <FormRow>
              <Field label="Active Incident Commander" value={empty ? <span className="text-mute">Unassigned</span> : <UserById id="u1" />} required />
              <Field label="On-call Rotation" value={empty ? <span className="text-mute">—</span> : <span><b>SRE-Tier-1</b> · 5 online</span>} />
            </FormRow>
            <FormRow>
              <Field label="Tenant" value={<span><b>{tenant.name}</b> ({tenant.plan})</span>} required />
              <Field label="Service Window" value="24×7 · Production" />
            </FormRow>
            <FormRow>
              <Field label="Last Major Incident" value={incidents[0] ? <a className="sn-link">{incidents[0].id} · {incidents[0].title}</a> : <span className="text-mute">—</span>} />
              <Field label="Last Change" value={changes[0] ? <a className="sn-link">{changes[0].id} · {changes[0].title}</a> : <span className="text-mute">—</span>} />
            </FormRow>
          </FormSection>

          {/* Active Incidents */}
          <FormSection id="incidents" title="Active Incidents" badge={`${activeIncidents.length} open`} collapsed={collapsed.incidents} onToggle={toggle}>
            <table className="sn-list-table">
              <thead>
                <tr>
                  <th style={{ width: 50 }}>Sev</th>
                  <th style={{ width: 110 }}>Number</th>
                  <th>Short description</th>
                  <th style={{ width: 130 }}>Service</th>
                  <th style={{ width: 110 }}>State</th>
                  <th style={{ width: 80 }}>Age</th>
                  <th style={{ width: 80 }}>SLA</th>
                </tr>
              </thead>
              <tbody>
                {incidents.slice(0, 6).map((inc) => (
                  <tr key={inc.id} onClick={() => setRoute("incident-detail")} style={{ cursor: "pointer" }}>
                    <td><Sev n={inc.sev} /></td>
                    <td><a className="sn-link mono">{inc.id}</a></td>
                    <td>{inc.title}</td>
                    <td className="mono">{inc.service}</td>
                    <td>
                      <span className={`sn-state-pill state-${inc.status}`}>
                        <i className={`fa-solid ${inc.status === "active" ? "fa-fire" : inc.status === "mitigating" ? "fa-wrench" : "fa-magnifying-glass"}`} /> {inc.status}
                      </span>
                    </td>
                    <td className="mono text-mute">{inc.age}</td>
                    <td>
                      <div className="sn-sla">
                        <div className="sn-sla-bar">
                          <div className="sn-sla-fill" style={{ width: inc.sla * 100 + "%", background: inc.sla < 0.4 ? "var(--critical)" : inc.sla < 0.7 ? "var(--warning)" : "var(--success)" }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </FormSection>

          {/* Global geo map + Heat-Map (LinkedEye-style) */}
          <div style={{ marginBottom: 12 }}>
            <WorldMap />
          </div>
          <div style={{ marginBottom: 12 }}>
            <HeatMap />
          </div>

          {/* Desktop / endpoint latency monitor */}
          <DesktopLatency />

          {/* Service Health */}
          <FormSection id="services" title="Service Health" badge={`${services.length} services`} collapsed={collapsed.services} onToggle={toggle}>
            <table className="sn-list-table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th style={{ width: 100 }}>State</th>
                  <th style={{ width: 110 }}>Uptime (30d)</th>
                  <th style={{ width: 110 }}>p95 latency</th>
                  <th style={{ width: 100 }}>Error %</th>
                  <th style={{ width: 130 }}>Dependencies</th>
                </tr>
              </thead>
              <tbody>
                {services.map((s) => (
                  <tr key={s.name}>
                    <td>
                      <div className="row row-8">
                        <span className={`sn-status-dot ${s.status}`} />
                        <span className="mono"><b>{s.name}</b></span>
                      </div>
                    </td>
                    <td>
                      <span className={`sn-state-pill svc-${s.status}`}>
                        <i className="fa-solid fa-circle" /> {s.status}
                      </span>
                    </td>
                    <td className="mono">{s.uptime}%</td>
                    <td className="mono">{s.p95}</td>
                    <td className={`mono ${s.err > 1 ? "tone-crit" : s.err > 0.1 ? "tone-warn" : ""}`}>{s.err}%</td>
                    <td className="mono text-mute">{s.deps} CIs</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </FormSection>

          {/* Recent Changes */}
          <FormSection id="changes" title="Recent Changes" badge="last 24h" collapsed={collapsed.changes} onToggle={toggle}>
            <FormRow>
              <Field label="Total Changes" value={changes.length} />
              <Field label="Awaiting Approval" value={
                (() => { const n = changes.filter((c) => c.state === "CAB Review" || c.state === "Approved").length;
                  return n ? <span className="tone-warn"><b>{n}</b> · CAB meets Fri</span> : "0"; })()
              } />
            </FormRow>
            <FormRow>
              <Field label="Implementing Now" value={changes.filter((c) => c.state === "Implement").length} />
              <Field label="Completed" value={changes.filter((c) => c.state === "Completed").length} />
            </FormRow>
            <FormRow>
              <Field label="Critical (P1)" value={changes.filter((c) => c.pri === 1).length} />
              <Field label="Lead Time (p50)" value={dash("1.8d")} />
            </FormRow>
          </FormSection>

          {/* Activity / Work Notes */}
          <div className="sn-activity-section">
            <div className="sn-activity-tabs">
              {([
                ["work", `Work Notes (${empty ? 0 : TIMELINE_EVENTS.length})`],
                ["comments", "Additional Comments"],
                ["activities", "Activities"],
                ["related", `Related Records (${empty ? 0 : 3})`],
              ] as const).map(([id, label]) => (
                <button key={id} className={`sn-act-tab${tab === id ? " active" : ""}`} onClick={() => setTab(id)}>{label}</button>
              ))}
            </div>

            <div className="sn-activity-content">
              {tab === "work" && (
                <>
                  {canWrite && (
                  <div className="sn-comment-box">
                    <textarea placeholder="Add a work note…" rows={2} />
                    <div className="sn-comment-actions">
                      <span className="text-mute" style={{ fontSize: 11 }}><i className="fa-solid fa-eye-slash" /> Internal · not visible to caller</span>
                      <div className="row row-8">
                        <button className="sn-btn"><i className="fa-solid fa-paperclip" /></button>
                        <button className="sn-btn primary">Post Work Note</button>
                      </div>
                    </div>
                  </div>
                  )}
                  <div className="sn-activity-stream">
                    {empty && (
                      <div className="sn-empty">
                        <i className="fa-solid fa-inbox" /><h4>No activity yet</h4>
                        <p>Work notes and system events for this tenant will appear here.</p>
                      </div>
                    )}
                    {!empty && TIMELINE_EVENTS.map((ev, i) => {
                      const user = i === 0 ? "Monitoring System" : i === 1 ? "Argus AI" : ["Priya Raghunathan", "Marcus Okafor", "Yuki Tanaka", "Devon Hassan", "System", "Argus AI"][i % 6];
                      const initials = user.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
                      const avatarColor =
                        ev.type === "ai" ? "linear-gradient(135deg,#8b5cf6,#6366f1)" :
                        ev.type === "critical" ? "linear-gradient(135deg,#ef4444,#dc2626)" :
                        ev.type === "success" ? "linear-gradient(135deg,#10b981,#059669)" :
                        ev.type === "warn" ? "linear-gradient(135deg,#f59e0b,#d97706)" :
                        "linear-gradient(135deg,#3b82f6,#2563eb)";
                      return (
                        <div key={i} className="sn-activity-item">
                          <div className="sn-activity-avatar" style={{ background: avatarColor }}>{initials}</div>
                          <div className="sn-activity-body">
                            <div className="sn-activity-head">
                              <b>{user}</b>
                              <span className="text-mute">{ev.type === "ai" ? "ran AI correlation" : ev.type === "critical" ? "triggered alert" : ev.type === "success" ? "marked progress" : "added a work note"}</span>
                              <span className="sn-activity-time">{ev.t}</span>
                            </div>
                            <div className="sn-activity-text">{ev.body}</div>
                            {ev.meta && <div className="sn-activity-meta">{ev.meta.map((m, j) => <span key={j} className="sn-tag">{m}</span>)}</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
              {tab === "comments" && (
                <div className="sn-empty">
                  <i className="fa-solid fa-comments" /><h4>No customer-facing comments</h4>
                  <p>Add a comment to communicate publicly with the caller.</p>
                </div>
              )}
              {tab === "activities" && (
                <div className="sn-empty">
                  <i className="fa-solid fa-clock-rotate-left" /><h4>System activity log</h4>
                  <p>Field changes, state transitions, and automation events appear here.</p>
                </div>
              )}
              {tab === "related" && (
                <div className="sn-empty">
                  <i className="fa-solid fa-link" /><h4>3 related records</h4>
                  <p>1 problem · 2 changes linked to this operational view.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SIDEBAR */}
        <aside className="sn-form-side">
          {/* BOD Readiness — go/no-go at a glance, links to the BOD screens */}
          <div className="sn-side-card">
            <div className="sn-side-head">
              <span>BOD readiness</span>
              <span className="sn-side-count">nextalpha · 06:15</span>
            </div>
            <div className="sn-side-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div
                onClick={() => setRoute("bod-checks")}
                style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, background: bodReady ? "#ecfdf5" : "#fef2f2", border: `1px solid ${bodReady ? "#a7f3d0" : "#fecaca"}` }}
              >
                <i className={`fa-solid ${bodReady ? "fa-circle-check" : "fa-circle-xmark"}`} style={{ color: bodReady ? "#059669" : "#dc2626", fontSize: 18 }} />
                <div>
                  <div style={{ fontWeight: 700, color: bodReady ? "#047857" : "#b91c1c", fontSize: 13 }}>{bodReady ? "Ready" : `Not ready · ${bod.down} down`}</div>
                  <div style={{ fontSize: 11, color: "#8a94a3" }}>{bodReady ? "all checks passing" : (bodReasons || "checks failing")}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {[[bod.ok, "OK", "#059669", "#ecfdf5"], [bod.warn, "Warn", "#b45309", "#fffbeb"], [bod.down, "Down", "#dc2626", "#fef2f2"]].map(([n, l, c, bg]) => (
                  <div key={l as string} onClick={() => setRoute("bod-checks")} style={{ cursor: "pointer", flex: 1, textAlign: "center", padding: "8px 4px", borderRadius: 6, background: bg as string }}>
                    <div style={{ fontSize: 17, fontWeight: 800, color: c as string }}>{n}</div>
                    <div style={{ fontSize: 10.5, color: "#8a94a3" }}>{l}</div>
                  </div>
                ))}
              </div>
              <div onClick={() => setRoute("market-calendar")} style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "#475467", paddingTop: 8, borderTop: "1px solid #eef1f4" }}>
                <span><i className="fa-solid fa-ban" style={{ color: "#dc2626", marginRight: 5 }} />Next holiday</span>
                <b style={{ color: "#0f1c3f" }}>{nextHol ? `${wd(nextHol.date)} · ${nextHol.name}` : "—"}</b>
              </div>
              <div onClick={() => setRoute("market-calendar")} style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "#475467" }}>
                <span><i className="fa-solid fa-flask" style={{ color: "#2563eb", marginRight: 5 }} />Next mock</span>
                <b style={{ color: "#0f1c3f" }}>{nextMock ? wd(nextMock.date) : "—"}</b>
              </div>
            </div>
          </div>

          {/* On-call Now */}
          <div className="sn-side-card">
            <div className="sn-side-head">
              <span className="sn-oncall-live"><span className="sn-oncall-dot" /> On-call now</span>
              <span className="sn-side-count">SRE-Tier-1</span>
            </div>
            <div className="sn-side-body sn-oncall-body">
              {[
                { id: "u1", tier: "L1 · Primary", eta: "ack avg 1.4m", on: true },
                { id: "u3", tier: "L2 · Secondary", eta: "if no ack in 5m", on: false },
                { id: "u5", tier: "L3 · Manager", eta: "if no ack in 15m", on: false },
              ].map((r, i) => {
                const u = USERS.find((x) => x.id === r.id);
                if (!u) return null;
                return (
                  <div key={r.id} className={`sn-oncall-row${r.on ? " active" : ""}`}>
                    <div className="sn-oncall-rail"><span className="sn-oncall-tier-n">{i + 1}</span></div>
                    <Avatar name={u.name} color={u.color} size="sm" />
                    <div className="sn-oncall-meta">
                      <div className="sn-oncall-name">{u.name}{r.on && <span className="sn-oncall-badge">ON CALL</span>}</div>
                      <div className="sn-oncall-tier">{r.tier} · <span className="text-mute">{r.eta}</span></div>
                    </div>
                    {r.on && <button className="sn-oncall-page"><i className="fa-solid fa-bell" /> Page</button>}
                  </div>
                );
              })}
              <div className="sn-oncall-foot">
                <span><i className="fa-regular fa-clock" /> Next handoff in <b>4h 12m</b></span>
                <a className="sn-link">View schedule</a>
              </div>
            </div>
          </div>

          {/* Assignment */}
          <div className="sn-side-card">
            <div className="sn-side-head">Assignment</div>
            <div className="sn-side-body">
              <Field label="Assigned to" value={<UserById id="u1" />} />
              <Field label="Group" value="SRE-Tier-1" />
              <Field label="Caller" value={<a className="sn-link">Monitoring System</a>} />
              <Field label="Opened by" value={<a className="sn-link">prometheus-alertmanager</a>} />
              <Field label="Updated" value="2 seconds ago" />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="sn-side-card">
            <div className="sn-side-head">Quick Actions</div>
            <div className="sn-side-body sn-actions-grid">
              {([
                ["fa-fire", "Declare Sev-1"],
                ["fa-user-plus", "Add Responder"],
                ["fa-slack fa-brands", "Open War Room"],
                ["fa-bell-slash", "Mute Alerts"],
                ["fa-play", "Run Runbook"],
                ["fa-arrow-up", "Escalate to Mgr"],
                ["fa-bullhorn", "Update Status Page"],
                ["fa-arrow-rotate-left", "Rollback Last Deploy"],
              ] as const).map(([ic, lbl]) => (
                <button key={lbl} className="sn-action">
                  <i className={`fa-solid ${ic}`} />
                  <span>{lbl}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Related Records */}
          <div className="sn-side-card">
            <div className="sn-side-head">Related Records <span className="sn-side-count">{empty ? 0 : 3}</span></div>
            <div className="sn-side-body">
              {empty ? (
                <div className="text-mute" style={{ padding: "6px 2px", fontSize: 12.5 }}>No linked records.</div>
              ) : (
                <>
                  <div className="sn-related-row">
                    <div>
                      <div className="sn-related-title">Connection pool sizing regression</div>
                      <div className="sn-related-meta">Problem · 4 incidents linked</div>
                    </div>
                    <a className="sn-link mono">PRB-3912</a>
                  </div>
                  <div className="sn-related-row">
                    <div>
                      <div className="sn-related-title">Pool config rollback</div>
                      <div className="sn-related-meta">Change · approved · implementing</div>
                    </div>
                    <a className="sn-link mono">CHG-2219</a>
                  </div>
                  <div className="sn-related-row">
                    <div>
                      <div className="sn-related-title">Stripe pool exhaustion runbook</div>
                      <div className="sn-related-meta">Knowledge · 1,283 views</div>
                    </div>
                    <a className="sn-link mono">KB-2114</a>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* SLA */}
          <div className="sn-side-card">
            <div className="sn-side-head">SLA</div>
            <div className="sn-side-body">
              <Field label="Response SLA" value={dash(<span className="tone-ok"><b>94.2%</b> compliance</span>)} />
              <Field label="Resolution SLA" value={dash(<span className="tone-warn"><b>88.6%</b> compliance</span>)} />
              <Field label="Breaching Now" value={<span className={empty ? "" : "tone-crit"}><b>{empty ? 0 : 2}</b> incidents</span>} />
              <Field label="Next Review" value="Fri, 16 May · 14:00 UTC" />
            </div>
          </div>

          {/* Infrastructure */}
          <div className="sn-side-card">
            <div className="sn-side-head">Infrastructure</div>
            <div className="sn-side-body">
              <Field label="Sites" value={`${sites.length} datacenters`} />
              <Field label="Assets" value={`${totalAssets.toLocaleString()} monitored`} />
              <Field label="Down/Critical" value={<span className="tone-crit"><b>{critDevices}</b> devices</span>} />
              <Field label="Warning" value={<span className="tone-warn"><b>{warnDevices}</b> devices</span>} />
              <Field label="Exporters" value="9 / 9 healthy" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
