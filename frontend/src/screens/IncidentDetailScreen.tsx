// Incident detail — war room
// Ported from screens/incident-detail.jsx; LinkedEye entity-detail layout.
import React from "react";
import { useUiStore } from "@/store/ui";
import { useNav } from "@/hooks/useNav";
import { INCIDENTS, TENANTS, USERS } from "@/data/core";
import { TIMELINE_EVENTS, CHAT, type ChatMessage } from "@/data/incidentContent";
import { Panel, Pill, PillDot } from "@/components/ld";
import type { Tone } from "@/components/ld";
import { useIncidents, useUpdateCoreIncident } from "@/api/hooks";
import { useCanWrite } from "@/auth/auth";
import ReadOnlyBadge from "@/components/ReadOnlyBadge";
import { entityTile, sd } from "@/components/RecordList";
import { Button, Card, Crumbs, Page, Tab, Table, Tabs, Tile, ui } from "@/components/ui";

import { Icon } from "@/components/Icon";
import { AtSignIcon, BookIcon, EyeIcon, FlameIcon, FlaskConicalIcon, GlobeIcon, HandIcon, LockIcon, PaperclipIcon, PlayIcon, SendIcon, SignalIcon, SlackIcon, ThumbsDownIcon, ThumbsUpIcon, UserIcon, VideoIcon } from "lucide-react";
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
    <Pill tone="ok"><PillDot />Resolved</Pill>
  ) : status === "mitigating" ? (
    <Pill tone="warn"><PillDot />Acknowledged · Mitigating</Pill>
  ) : (
    <Pill tone="crit"><PillDot />Active</Pill>
  );
  const sevPill = <Pill tone={SEV_TONE[inc.sev] ?? "muted"}>Sev {inc.sev}</Pill>;
  const tenantName = TENANTS.find((t) => t.id === inc.tenant)?.name ?? inc.tenant ?? "—";
  const responders = USERS.slice(0, 5);

  return (
    <Page>
      <Crumbs items={[{ label: "Home", onClick: () => setRoute("dashboard") }, { label: "Incidents", onClick: () => setRoute("incidents") }, { label: inc.id }]} />

      <div className={sd.entityHead}>
        <div className={sd.entity}>
          <span className={entityTile(SEV_TONE[inc.sev] ?? "muted")} aria-hidden="true"><Icon icon={FlameIcon} /></span>
          <div>
            <span className={sd.number}>{inc.id}</span>
            <h1 className={sd.entityTitle}>{inc.title} {sevPill} {statusPill}</h1>
            <p className={sd.entityMeta}>
              <span>Declared {inc.age} ago</span>
              <span>{tenantName}</span>
              <span className={ui.mono}>{inc.service}</span>
            </p>
            <p className={sd.entityMeta}>
              <span>IC: <b>{userName(inc.assignee)}</b></span>
              <span>{responders.length} responders</span>
              <span>SLO burn <b>{inc.sloBurn}x</b></span>
              <span>Impact: {inc.impacted}</span>
            </p>
          </div>
        </div>
        <div className={ui.headSide}>
          <div className={ui.headActions}>
            <Button><Icon icon={SlackIcon} /> #{inc.id.toLowerCase()}</Button>
            <Button><Icon icon={VideoIcon} /> Join bridge</Button>
            {!canWrite && <ReadOnlyBadge />}
            {canWrite && !resolved && status !== "mitigating" && (
              <Button onClick={() => setStatus("mitigating")} disabled={update.isPending}>
                <Icon icon={HandIcon} /> Acknowledge
              </Button>
            )}
            {canWrite && (
              <Button variant="primary" onClick={() => !resolved && setStatus("resolved")} disabled={resolved || update.isPending}>
                <Icon name={resolved ? "fa-circle-check" : "fa-check"} /> {resolved ? "Resolved" : "Mark resolved"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <Card className={ui.notice} role="status">
        <Icon icon={FlaskConicalIcon} />
        <div>
          <b>Sample war-room content</b>
          <p className="text-fg-muted text-xs">Only the incident status is read from the incident API. The AI analysis, timeline and activity below are example content.</p>
        </div>
      </Card>

      <div className={ui.split}>
        <div className={ui.rail}>
          <Panel title="Argus AI — Root cause analysis (sample)">
            <p className={sd.entryText}>
              <b>Likely cause:</b> Connection pool on <code>payments-primary</code> was reduced from 200 → 120 in deploy <code>2f8a1c</code> at 12:47 UTC. Peak traffic load at 14:30 exhausted the pool, causing cascading Stripe timeouts on <code>checkout-api</code>.
            </p>
            <ul className={sd.list}>
              <li><b>Blast radius:</b> {inc.impacted} · {tenantName} only</li>
              <li><b>Correlation:</b> deploy event · memory pressure on DB · Stripe 429 rate</li>
              <li><b>Remediation:</b> Roll back deploy 2f8a1c (safe · no schema change)</li>
              <li><b>Similar past incident:</b> INC-47120 · resolved via rollback</li>
            </ul>
            <div className={sd.actions}>
              <Button variant="primary" size="sm"><Icon icon={PlayIcon} /> Run suggested playbook</Button>
              <Button size="sm"><Icon icon={ThumbsUpIcon} /> Helpful</Button>
              <Button size="sm"><Icon icon={ThumbsDownIcon} /> Off-base</Button>
            </div>
          </Panel>

          <Panel title="Timeline">
            <ul className={ui.activity}>
              {TIMELINE_EVENTS.map((ev, i) => {
                const t = EVENT_TONE[ev.type] ?? EVENT_TONE.info;
                return (
                  <li key={i} className={sd.feedItem}>
                    <span className={sd.time}>{ev.t}</span>
                    <Tile tone={t.tone} size="sm"><Icon name={t.icon} /></Tile>
                    <div className={sd.entry}>
                      <div className={sd.entryText}>{ev.body}</div>
                      {ev.meta && <div className={sd.entryMeta}>{ev.meta.map((m, j) => <span key={j}>{m}</span>)}</div>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Panel>

          <WarRoomActivity />
        </div>

        <div className={ui.rail}>
          <Panel title="Details">
            <dl className={ui.dl}>
              <dt>Number</dt><dd className={ui.mono}>{inc.id}</dd>
              <dt>Client</dt><dd>{tenantName}</dd>
              <dt>Application</dt><dd className={ui.mono}>{inc.service}</dd>
              <dt>Hostname</dt><dd className={ui.mono}>checkout-api-7f9c2</dd>
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
            <ul className={ui.activity}>
              {responders.map((u) => (
                <li key={u.id} className={ui.activityItem}>
                  <Tile tone={u.role === "Incident Commander" ? "crit" : "info"} size="sm"><Icon icon={UserIcon} /></Tile>
                  <span className={ui.activityText}>
                    {u.name} · <span className="text-fg-muted">{u.role === "Incident Commander" ? "IC" : u.role} · {u.team}</span>
                  </span>
                  <Pill tone={u.status === "online" ? "ok" : u.status === "away" ? "warn" : "muted"}><PillDot />{u.status}</Pill>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Related records">
            <Table>
              <thead><tr><th scope="col">Record</th><th scope="col">Summary</th></tr></thead>
              <tbody>
                <tr><td className={sd.cellMono}>INC-47120</td><td className={ui.cellWrap}>Connection pool — 3w ago</td></tr>
                <tr><td className={sd.cellMono}>INC-46088</td><td className={ui.cellWrap}>Stripe timeouts — 2mo ago</td></tr>
                <tr><td className={sd.cellMono}>PRB-3912</td><td className={ui.cellWrap}>Problem (unresolved)</td></tr>
                <tr><td className={sd.cellMono}>CHG-2219</td><td className={ui.cellWrap}>Change · deploy 2f8a1c</td></tr>
              </tbody>
            </Table>
          </Panel>
        </div>
      </div>
    </Page>
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
      <Tabs aria-label="Filter activity">
        {filters.map(([k, lbl]) => (
          <Tab key={k} active={filter === k} onClick={() => setFilter(k)}>{lbl}</Tab>
        ))}
      </Tabs>

      <ul className={ui.activity}>
        {shown.map((c) => {
          const t = WARROOM_TYPES[c.kind];
          const u = c.ai ? null : USERS.find((x) => x.id === c.u);
          const name = c.ai ? "Argus AI" : (u ? u.name : "Unknown");
          const role = c.ai ? "copilot" : c.role;
          return (
            <li key={c._i} className={sd.feedItem}>
              <Tile tone={t.tone} size="sm">
                <Icon name={c.ai ? "fa-wand-magic-sparkles" : "fa-user"} />
              </Tile>
              <div className={sd.entry}>
                <div className={sd.entryMeta}>
                  <b>{name}</b>
                  <span>{role}</span>
                  <Pill tone={t.tone}><Icon name={t.icon} /> {t.label}</Pill>
                  <time>{c.time} · Today</time>
                </div>
                <div className={sd.entryText}>{c.text}</div>
              </div>
            </li>
          );
        })}
      </ul>

      {!canWrite ? (
        <p className="text-fg-muted text-xs">
          <Icon icon={EyeIcon} /> Read-only — you can follow the war room but not post work notes or comments.
        </p>
      ) : (
        <div className={ui.form}>
          <Tabs aria-label="Journal channel">
            <Tab active={channel === "worknote"} onClick={() => setChannel("worknote")}>
              <Icon icon={LockIcon} /> Work notes
            </Tab>
            <Tab active={channel === "comment"} onClick={() => setChannel("comment")}>
              <Icon icon={GlobeIcon} /> Additional comments <span className="text-fg-muted text-xs">customer-visible</span>
            </Tab>
          </Tabs>
          <div className={ui.field}>
            <label htmlFor={`${idp}-draft`} className="sr-only">{channel === "worknote" ? "Work note" : "Additional comment"}</label>
            <textarea
              id={`${idp}-draft`}
              className={sd.textarea}
              rows={3}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={channel === "worknote"
                ? "Add an internal work note — @mention a responder, /runbook, /status…"
                : "Write a customer-visible update for stakeholders…"}
            />
          </div>
          <div className={sd.actions}>
            <Button size="sm" aria-label="Mention" title="Mention"><Icon icon={AtSignIcon} /></Button>
            <Button size="sm" aria-label="Attach" title="Attach"><Icon icon={PaperclipIcon} /></Button>
            <Button size="sm" aria-label="Runbook" title="Runbook"><Icon icon={BookIcon} /></Button>
            <Button size="sm" aria-label="Status page" title="Status page"><Icon icon={SignalIcon} /></Button>
            <span className={ui.fieldGrow} />
            <Button variant="primary" disabled={!draft.trim()}>
              <Icon icon={SendIcon} /> Post {channel === "worknote" ? "work note" : "comment"}
            </Button>
          </div>
        </div>
      )}
    </Panel>
  );
}
