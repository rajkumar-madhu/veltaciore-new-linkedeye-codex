// Incident detail — war room
// Ported from screens/incident-detail.jsx; LinkedEye entity-detail layout.
import "@/styles/servicedesk.css";
import React from "react";
import { useUiStore } from "@/store/ui";
import { useNav } from "@/hooks/useNav";
import { INCIDENTS, TENANTS, USERS } from "@/data/core";
import { TIMELINE_EVENTS, CHAT, type ChatMessage } from "@/data/incidentContent";
import { Panel, Pill } from "@/components/ld";
import type { Tone } from "@/components/ld";
import { useIncidents, useUpdateCoreIncident } from "@/api/hooks";
import { useCanWrite } from "@/auth/auth";
import ReadOnlyBadge from "@/components/ReadOnlyBadge";

import { Icon } from "@/components/Icon";
import { AtSignIcon, BookIcon, ChevronRightIcon, EyeIcon, FlameIcon, FlaskConicalIcon, GlobeIcon, HandIcon, LockIcon, PaperclipIcon, PlayIcon, SendIcon, SignalIcon, SlackIcon, ThumbsDownIcon, ThumbsUpIcon, UserIcon, VideoIcon } from "lucide-react";
const SEV_TONE: Record<number, Tone> = { 1: "crit", 2: "warn", 3: "info", 4: "ok" };
const EVENT_TONE: Record<string, { tone: Tone; icon: string }> = {
  critical: { tone: "crit", icon: "fa-bell" },
  ai: { tone: "purple", icon: "fa-wand-magic-sparkles" },
  info: { tone: "info", icon: "fa-circle-info" },
  warn: { tone: "warn", icon: "fa-gears" },
  success: { tone: "ok", icon: "fa-circle-check" },
};
const userName = (id: string | null | undefined) => USERS.find((u) => u.id === id)?.name ?? "Unassigned";

export default function IncidentDetailScreen() {
  const { setRoute } = useNav();
  const layout = useUiStore((s) => s.tweaks.incidentLayout);
  void layout;
  const inc = INCIDENTS[0]; // INC-48291

  // Live status of this incident, with an optimistic local override so the
  // Acknowledge/Resolve buttons feel immediate.
  const liveStatus = useIncidents().data?.find((i) => i.id === inc.id)?.status;
  const [override, setOverride] = React.useState<string | null>(null);
  const status = override ?? liveStatus ?? inc.status;
  const update = useUpdateCoreIncident();
  const canWrite = useCanWrite();

  const setStatus = (next: string) => {
    if (!canWrite) return;
    setOverride(next);
    update.mutate({ id: inc.id, patch: { status: next } });
  };
  const resolved = status === "resolved";
  const statusPill = resolved ? (
    <Pill tone="ok"><span className="ld-pill-dot" />Resolved</Pill>
  ) : status === "mitigating" ? (
    <Pill tone="warn"><span className="ld-pill-dot" />Acknowledged · Mitigating</Pill>
  ) : (
    <Pill tone="crit"><span className="ld-pill-dot" />Active</Pill>
  );
  const sevPill = <Pill tone={SEV_TONE[inc.sev] ?? "muted"}>Sev {inc.sev}</Pill>;
  const tenantName = TENANTS.find((t) => t.id === inc.tenant)?.name ?? inc.tenant ?? "—";
  const responders = USERS.slice(0, 5);

  return (
    <div className="ld-dash">
      <nav className="ld-crumbs" aria-label="Breadcrumb">
        <button type="button" className="ld-link" onClick={() => setRoute("dashboard")}>Home</button>
        <Icon icon={ChevronRightIcon} />
        <button type="button" className="ld-link" onClick={() => setRoute("incidents")}>Incidents</button>
        <Icon icon={ChevronRightIcon} />
        <span>{inc.id}</span>
      </nav>

      <div className="ld-head ld-entity-head">
        <div className="ld-entity">
          <span className={`ld-tile ld-${SEV_TONE[inc.sev] ?? "muted"}`} aria-hidden="true"><Icon icon={FlameIcon} /></span>
          <div>
            <span className="ld-sd-number">{inc.id}</span>
            <h1 className="ld-entity-title">{inc.title} {sevPill} {statusPill}</h1>
            <p className="ld-entity-meta">
              <span>Declared {inc.age} ago</span>
              <span>{tenantName}</span>
              <span className="ld-mono">{inc.service}</span>
            </p>
            <p className="ld-entity-meta">
              <span>IC: <b>{userName(inc.assignee)}</b></span>
              <span>{responders.length} responders</span>
              <span>SLO burn <b>{inc.sloBurn}x</b></span>
              <span>Impact: {inc.impacted}</span>
            </p>
          </div>
        </div>
        <div className="ld-head-side">
          <div className="ld-head-actions">
            <button type="button" className="ld-btn"><Icon icon={SlackIcon} /> #{inc.id.toLowerCase()}</button>
            <button type="button" className="ld-btn"><Icon icon={VideoIcon} /> Join bridge</button>
            {!canWrite && <ReadOnlyBadge />}
            {canWrite && !resolved && status !== "mitigating" && (
              <button type="button" className="ld-btn" onClick={() => setStatus("mitigating")} disabled={update.isPending}>
                <Icon icon={HandIcon} /> Acknowledge
              </button>
            )}
            {canWrite && (
              <button type="button" className="ld-btn ld-btn-primary" onClick={() => !resolved && setStatus("resolved")} disabled={resolved || update.isPending}>
                <Icon className={`fa-solid ${resolved ? "fa-circle-check" : "fa-check"}`} /> {resolved ? "Resolved" : "Mark resolved"}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="ld-card ld-metrics-off" role="status">
        <Icon icon={FlaskConicalIcon} />
        <div>
          <b>Sample war-room content</b>
          <p className="ld-muted ld-small">Only the incident status is read from the incident API. The AI analysis, timeline and activity below are example content.</p>
        </div>
      </div>

      <div className="ld-split">
        <div className="ld-rail">
          <Panel title="Argus AI — Root cause analysis (sample)">
            <p className="ld-sd-entry-text">
              <b>Likely cause:</b> Connection pool on <code>payments-primary</code> was reduced from 200 → 120 in deploy <code>2f8a1c</code> at 12:47 UTC. Peak traffic load at 14:30 exhausted the pool, causing cascading Stripe timeouts on <code>checkout-api</code>.
            </p>
            <ul className="ld-sd-list">
              <li><b>Blast radius:</b> {inc.impacted} · {tenantName} only</li>
              <li><b>Correlation:</b> deploy event · memory pressure on DB · Stripe 429 rate</li>
              <li><b>Remediation:</b> Roll back deploy 2f8a1c (safe · no schema change)</li>
              <li><b>Similar past incident:</b> INC-47120 · resolved via rollback</li>
            </ul>
            <div className="ld-sd-actions">
              <button type="button" className="ld-btn ld-btn-primary ld-btn-sm"><Icon icon={PlayIcon} /> Run suggested playbook</button>
              <button type="button" className="ld-btn ld-btn-sm"><Icon icon={ThumbsUpIcon} /> Helpful</button>
              <button type="button" className="ld-btn ld-btn-sm"><Icon icon={ThumbsDownIcon} /> Off-base</button>
            </div>
          </Panel>

          <Panel title="Timeline">
            <ul className="ld-activity ld-sd-feed">
              {TIMELINE_EVENTS.map((ev, i) => {
                const t = EVENT_TONE[ev.type] ?? EVENT_TONE.info;
                return (
                  <li key={i}>
                    <span className="ld-sd-time">{ev.t}</span>
                    <span className={`ld-tile ld-tile-sm ld-${t.tone}`} aria-hidden="true"><Icon className={`fa-solid ${t.icon}`} /></span>
                    <div className="ld-sd-entry">
                      <div className="ld-sd-entry-text">{ev.body}</div>
                      {ev.meta && <div className="ld-sd-entry-meta">{ev.meta.map((m, j) => <span key={j}>{m}</span>)}</div>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Panel>

          <WarRoomActivity />
        </div>

        <div className="ld-rail">
          <Panel title="Details">
            <dl className="ld-dl">
              <dt>Number</dt><dd className="ld-mono">{inc.id}</dd>
              <dt>Client</dt><dd>{tenantName}</dd>
              <dt>Application</dt><dd className="ld-mono">{inc.service}</dd>
              <dt>Hostname</dt><dd className="ld-mono">checkout-api-7f9c2</dd>
              <dt>Severity</dt><dd>{sevPill}</dd>
              <dt>Status</dt><dd>{statusPill}</dd>
              <dt>Commander</dt><dd>{userName(inc.assignee)}</dd>
              <dt>Environment</dt><dd><Pill tone="warn">production</Pill></dd>
              <dt>Detected</dt><dd>14:32:08 UTC · auto</dd>
              <dt>Open for</dt><dd>{inc.age}</dd>
              <dt>SLO burn</dt><dd><b>{inc.sloBurn}x</b> (28-day budget)</dd>
              <dt>Linked PR</dt><dd>#8241 · pool-size-tune</dd>
              <dt>Status page</dt><dd><Pill tone="info">investigating</Pill></dd>
            </dl>
          </Panel>

          <Panel title={`Responders · ${responders.length}`}>
            <ul className="ld-activity">
              {responders.map((u) => (
                <li key={u.id}>
                  <span className={`ld-tile ld-tile-sm ld-${u.role === "Incident Commander" ? "crit" : "info"}`} aria-hidden="true"><Icon icon={UserIcon} /></span>
                  <span className="ld-activity-text">
                    {u.name} · <span className="ld-muted">{u.role === "Incident Commander" ? "IC" : u.role} · {u.team}</span>
                  </span>
                  <Pill tone={u.status === "online" ? "ok" : u.status === "away" ? "warn" : "muted"}><span className="ld-pill-dot" />{u.status}</Pill>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Related records">
            <div className="ld-table-wrap">
              <table className="ld-table">
                <thead><tr><th scope="col">Record</th><th scope="col">Summary</th></tr></thead>
                <tbody>
                  <tr><td className="ld-mono">INC-47120</td><td className="ld-wrap">Connection pool — 3w ago</td></tr>
                  <tr><td className="ld-mono">INC-46088</td><td className="ld-wrap">Stripe timeouts — 2mo ago</td></tr>
                  <tr><td className="ld-mono">PRB-3912</td><td className="ld-wrap">Problem (unresolved)</td></tr>
                  <tr><td className="ld-mono">CHG-2219</td><td className="ld-wrap">Change · deploy 2f8a1c</td></tr>
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

// ─── War-room activity stream ───
// Journal entries classified by channel: Work notes (internal),
// Additional comments (customer-visible), Argus AI.
function warRoomKind(c: ChatMessage): "ai" | "comment" | "worknote" {
  if (c.ai) return "ai";
  if (c.role === "Manager") return "comment"; // stakeholder / customer-visible
  return "worknote";                          // IC + responder operational notes
}
const WARROOM_TYPES: Record<"worknote" | "comment" | "ai", { label: string; tone: Tone; icon: string }> = {
  worknote: { label: "Work notes", tone: "warn", icon: "fa-lock" },
  comment: { label: "Additional comments", tone: "info", icon: "fa-globe" },
  ai: { label: "Argus AI", tone: "purple", icon: "fa-wand-magic-sparkles" },
};

export function WarRoomActivity() {
  const [filter, setFilter] = React.useState("all");
  const [channel, setChannel] = React.useState("worknote"); // composer channel
  const [draft, setDraft] = React.useState("");
  const canWrite = useCanWrite();
  const idp = React.useId();

  const items = CHAT.map((c, i) => ({ ...c, _i: i, kind: warRoomKind(c) }));
  const counts = {
    all: items.length,
    worknote: items.filter((x) => x.kind === "worknote").length,
    comment: items.filter((x) => x.kind === "comment").length,
    ai: items.filter((x) => x.kind === "ai").length,
  };
  const shown = filter === "all" ? items : items.filter((x) => x.kind === filter);

  const filters = [
    ["all", `All · ${counts.all}`],
    ["worknote", `Work notes · ${counts.worknote}`],
    ["comment", `Comments · ${counts.comment}`],
    ["ai", `AI · ${counts.ai}`],
  ];

  return (
    <Panel title="Activity">
      <div className="ld-tabs" role="tablist" aria-label="Filter activity">
        {filters.map(([k, lbl]) => (
          <button key={k} type="button" role="tab" aria-selected={filter === k} className={`ld-tab${filter === k ? " active" : ""}`} onClick={() => setFilter(k)}>{lbl}</button>
        ))}
      </div>

      <ul className="ld-activity ld-sd-feed">
        {shown.map((c) => {
          const t = WARROOM_TYPES[c.kind];
          const u = c.ai ? null : USERS.find((x) => x.id === c.u);
          const name = c.ai ? "Argus AI" : (u ? u.name : "Unknown");
          const role = c.ai ? "copilot" : c.role;
          return (
            <li key={c._i}>
              <span className={`ld-tile ld-tile-sm ld-${t.tone}`} aria-hidden="true">
                <Icon className={`fa-solid ${c.ai ? "fa-wand-magic-sparkles" : "fa-user"}`} />
              </span>
              <div className="ld-sd-entry">
                <div className="ld-sd-entry-meta">
                  <b>{name}</b>
                  <span>{role}</span>
                  <Pill tone={t.tone}><Icon className={`fa-solid ${t.icon}`} /> {t.label}</Pill>
                  <time>{c.time} · Today</time>
                </div>
                <div className="ld-sd-entry-text">{c.text}</div>
              </div>
            </li>
          );
        })}
      </ul>

      {!canWrite ? (
        <p className="ld-muted ld-small">
          <Icon icon={EyeIcon} /> Read-only — you can follow the war room but not post work notes or comments.
        </p>
      ) : (
        <div className="ld-form">
          <div className="ld-tabs" role="tablist" aria-label="Journal channel">
            <button type="button" role="tab" aria-selected={channel === "worknote"} className={`ld-tab${channel === "worknote" ? " active" : ""}`} onClick={() => setChannel("worknote")}>
              <Icon icon={LockIcon} /> Work notes
            </button>
            <button type="button" role="tab" aria-selected={channel === "comment"} className={`ld-tab${channel === "comment" ? " active" : ""}`} onClick={() => setChannel("comment")}>
              <Icon icon={GlobeIcon} /> Additional comments <span className="ld-muted ld-small">customer-visible</span>
            </button>
          </div>
          <div className="ld-form-field">
            <label htmlFor={`${idp}-draft`} className="sr-only">{channel === "worknote" ? "Work note" : "Additional comment"}</label>
            <textarea
              id={`${idp}-draft`}
              className="ld-input ld-textarea ld-sd-textarea"
              rows={3}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={channel === "worknote"
                ? "Add an internal work note — @mention a responder, /runbook, /status…"
                : "Write a customer-visible update for stakeholders…"}
            />
          </div>
          <div className="ld-sd-actions">
            <button type="button" className="ld-btn ld-btn-sm" aria-label="Mention" title="Mention"><Icon icon={AtSignIcon} /></button>
            <button type="button" className="ld-btn ld-btn-sm" aria-label="Attach" title="Attach"><Icon icon={PaperclipIcon} /></button>
            <button type="button" className="ld-btn ld-btn-sm" aria-label="Runbook" title="Runbook"><Icon icon={BookIcon} /></button>
            <button type="button" className="ld-btn ld-btn-sm" aria-label="Status page" title="Status page"><Icon icon={SignalIcon} /></button>
            <span className="ld-field-grow" />
            <button type="button" className="ld-btn ld-btn-primary" disabled={!draft.trim()}>
              <Icon icon={SendIcon} /> Post {channel === "worknote" ? "work note" : "comment"}
            </button>
          </div>
        </div>
      )}
    </Panel>
  );
}
