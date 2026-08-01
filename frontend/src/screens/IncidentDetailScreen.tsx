// Incident detail — war room
// Ported from screens/incident-detail.jsx.
import React from "react";
import { useUiStore } from "@/store/ui";
import { INCIDENTS, USERS, spark } from "@/data/core";
import { TIMELINE_EVENTS, CHAT, type ChatMessage } from "@/data/incidentContent";
import { Avatar, UserById, Sparkline, Pill, Sev } from "@/components/primitives";
import { useIncidents, useUpdateCoreIncident } from "@/api/hooks";
import { useCanWrite } from "@/auth/auth";
import ReadOnlyBadge from "@/components/ReadOnlyBadge";

export default function IncidentDetailScreen() {
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

  return (
    <div className="page page-fade wide">
      <div className="inc-hero">
        <div className="sev-block"><div><b>1</b><div style={{ textAlign: "center" }}><span>SEV</span></div></div></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="row row-8" style={{ marginBottom: 4 }}>
            <span className="c-id" style={{ fontSize: 13 }}>{inc.id}</span>
            {resolved ? (
              <Pill kind="success">Resolved</Pill>
            ) : status === "mitigating" ? (
              <Pill kind="warning">Acknowledged · Mitigating</Pill>
            ) : (
              <Pill kind="critical">Active</Pill>
            )}
            <span className="text-mute" style={{ fontSize: 12 }}>Declared 14m ago · Fyers · checkout-api · checkout-api-7f9c2</span>
          </div>
          <h1>{inc.title}</h1>
          <div className="inc-crumbs">
            <span><i className="fa-solid fa-user-shield" /> IC: <b>Priya Raghunathan</b></span>
            <span className="sep">·</span>
            <span><i className="fa-solid fa-users" /> 6 responders</span>
            <span className="sep">·</span>
            <span><i className="fa-solid fa-fire" /> SLO burn <b style={{ color: "var(--critical)" }}>8.4x</b></span>
            <span className="sep">·</span>
            <span><i className="fa-solid fa-user-group" /> 12,400 users impacted</span>
          </div>
        </div>
        <div className="row row-8">
          <button className="btn"><i className="fa-solid fa-slack fa-brands" /> #inc-48291</button>
          <button className="btn"><i className="fa-solid fa-video" /> Join bridge</button>
          {!canWrite && <ReadOnlyBadge />}
          {canWrite && !resolved && status !== "mitigating" && (
            <button className="btn" onClick={() => setStatus("mitigating")} disabled={update.isPending}>
              <i className="fa-solid fa-hand" /> Acknowledge
            </button>
          )}
          {canWrite && (
            <button className="btn danger" onClick={() => !resolved && setStatus("resolved")} disabled={resolved || update.isPending}>
              <i className={`fa-solid ${resolved ? "fa-circle-check" : "fa-check"}`} /> {resolved ? "Resolved" : "Mark resolved"}
            </button>
          )}
        </div>
      </div>

      <div className="inc-grid">
        <div className="stack stack-16" style={{ minWidth: 0 }}>
          {/* AI summary */}
          <div className="ai-card">
            <h4><span className="ai-glyph">✦</span> Argus AI — Root cause analysis <Pill kind="purple" noDot>87% confidence</Pill></h4>
            <p><b>Likely cause:</b> Connection pool on <code style={{ background: "var(--bg-raised)", padding: "1px 4px", borderRadius: 3 }}>payments-primary</code> was reduced from 200 → 120 in deploy <code style={{ background: "var(--bg-raised)", padding: "1px 4px", borderRadius: 3 }}>2f8a1c</code> at 12:47 UTC. Peak traffic load at 14:30 exhausted the pool, causing cascading Stripe timeouts on <code style={{ background: "var(--bg-raised)", padding: "1px 4px", borderRadius: 3 }}>checkout-api</code>.</p>
            <ul className="ai-bullets">
              <li><b>Blast radius:</b> 12,400 users · $8.2k / min revenue impact · Fyers only</li>
              <li><b>Correlation:</b> 3 signals · deploy event · memory pressure on DB · Stripe 429 rate</li>
              <li><b>Remediation:</b> Rollback deploy 2f8a1c (safe · no schema change) — <span className="link">run playbook →</span></li>
              <li><b>Similar past incident:</b> INC-47120 · resolved in 22 min via rollback</li>
            </ul>
            <div className="row row-8" style={{ marginTop: 14 }}>
              <button className="btn primary sm"><i className="fa-solid fa-play" /> Run suggested playbook</button>
              <button className="btn sm"><i className="fa-solid fa-thumbs-up" /> Helpful</button>
              <button className="btn sm ghost"><i className="fa-solid fa-thumbs-down" /> Off-base</button>
            </div>
          </div>

          {/* Signals grid */}
          <div className="grid-3">
            <div className="card"><div className="card-body"><div className="kpi-label"><i className="fa-solid fa-chart-line" /> Error rate</div><div className="kpi-value" style={{ color: "var(--critical)" }}>24.3<span className="unit">%</span></div><div className="kpi-delta down"><i className="fa-solid fa-arrow-trend-up" />+23.1% in 14m</div><div style={{ marginTop: 8 }}><Sparkline data={spark(7, 0.9)} color="var(--critical)" w={200} h={40} /></div></div></div>
            <div className="card"><div className="card-body"><div className="kpi-label"><i className="fa-solid fa-clock" /> p95 latency</div><div className="kpi-value" style={{ color: "var(--warning)" }}>8.4<span className="unit">s</span></div><div className="kpi-delta down"><i className="fa-solid fa-arrow-trend-up" />+7.9s</div><div style={{ marginTop: 8 }}><Sparkline data={spark(11, 0.7)} color="var(--warning)" w={200} h={40} /></div></div></div>
            <div className="card"><div className="card-body"><div className="kpi-label"><i className="fa-solid fa-coins" /> Revenue impact</div><div className="kpi-value">$114k</div><div className="kpi-delta down"><i className="fa-solid fa-arrow-trend-up" />$8.2k/min</div><div style={{ marginTop: 8 }}><Sparkline data={spark(13, 0.9)} color="var(--critical)" w={200} h={40} /></div></div></div>
          </div>

          {/* Timeline + war-room */}
          <div className="card">
            <div className="card-head">
              <div className="row row-8">
                <h3><i className="fa-solid fa-list-timeline" /> Timeline & war-room</h3>
                <div className="seg"><button className="active">All</button><button>AI</button><button>Chat</button><button>System</button></div>
              </div>
              <span className="meta">Auto-scroll <input type="checkbox" defaultChecked className="checkbox" /></span>
            </div>
            <div className="card-body" style={{ padding: "16px 20px" }}>
              <div className="timeline">
                {TIMELINE_EVENTS.map((ev, i) => (
                  <div key={i} className={`tl-item ${ev.type}`}>
                    <div className="tl-time">{ev.t}</div>
                    <div className="tl-body">{ev.body}</div>
                    {ev.meta && <div className="tl-meta">{ev.meta.map((m, j) => <span key={j}>{m}</span>)}</div>}
                  </div>
                ))}
              </div>

              <WarRoomActivity />
            </div>
          </div>
        </div>

        {/* Sidebar panel */}
        <div className="stack stack-12">
          <div className="card">
            <div className="card-head"><h3>Properties</h3></div>
            <div className="card-body stack stack-12">
              <div className="inc-scope">
                <div className="inc-scope-row">
                  <span className="inc-scope-key"><i className="fa-solid fa-building" /> Client</span>
                  <span className="inc-scope-val"><b>Fyers</b> <span className="inc-scope-tag">MF · Enterprise</span></span>
                </div>
                <div className="inc-scope-row">
                  <span className="inc-scope-key"><i className="fa-solid fa-cube" /> Application</span>
                  <span className="inc-scope-val"><span className="mono"><b>checkout-api</b></span> <span className="inc-scope-tag">v2.41 · prod</span></span>
                </div>
                <div className="inc-scope-row">
                  <span className="inc-scope-key"><i className="fa-solid fa-server" /> Hostname</span>
                  <span className="inc-scope-val"><span className="mono">checkout-api-7f9c2</span> <span className="inc-scope-tag">us-east-1b · 10.4.22.18</span></span>
                </div>
              </div>
              <Prop label="Severity"><Sev n={1} /> <span className="link" style={{ marginLeft: 8, fontSize: 11 }}>change</span></Prop>
              <Prop label="Status"><Pill kind="critical">Active</Pill></Prop>
              <Prop label="Commander"><UserById id="u1" /></Prop>
              <Prop label="Environment"><Pill kind="warning" noDot>production</Pill></Prop>
              <Prop label="Detected">14:32:08 UTC · auto</Prop>
              <Prop label="Duration"><b className="mono" style={{ color: "var(--critical)" }}>14m 22s</b></Prop>
              <Prop label="SLO burn"><b className="mono" style={{ color: "var(--critical)" }}>8.4x</b> (28-day budget)</Prop>
              <Prop label="Linked PR"><span className="link">#8241 · pool-size-tune</span></Prop>
              <Prop label="Status page"><Pill kind="info" noDot>investigating</Pill></Prop>
            </div>
          </div>

          <div className="card">
            <div className="card-head"><h3>Responders · 6</h3><button className="btn sm ghost"><i className="fa-solid fa-plus" /></button></div>
            <div className="card-body stack stack-8" style={{ padding: 10 }}>
              {USERS.slice(0, 5).map(u => (
                <div key={u.id} className="row row-8" style={{ padding: "4px 6px" }}>
                  <Avatar name={u.name} color={u.color} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 550 }}>{u.name}</div>
                    <div style={{ fontSize: 11, color: "var(--fg-subtle)" }}>{u.role === "Incident Commander" ? <b style={{ color: "var(--critical)" }}>IC</b> : u.role} · {u.team}</div>
                  </div>
                  <span className={`dot ${u.status === "online" ? "green" : u.status === "away" ? "amber" : "gray"}`} />
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-head"><h3>Related</h3></div>
            <div className="card-body stack stack-8" style={{ fontSize: 12 }}>
              <div>🔗 <span className="link">INC-47120</span> Connection pool — 3w ago</div>
              <div>🔗 <span className="link">INC-46088</span> Stripe timeouts — 2mo ago</div>
              <div>📋 Problem <span className="link">PRB-3912</span> (unresolved)</div>
              <div>📦 Change <span className="link">CHG-2219</span> · deploy 2f8a1c</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const Prop = ({ label, children }: { label: React.ReactNode; children?: React.ReactNode }) => (
  <div style={{ fontSize: 12 }}>
    <div className="text-mute" style={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{label}</div>
    <div>{children}</div>
  </div>
);

// ─── ServiceNow ITSM-style war-room activity stream ───
// Journal entries classified by channel: Work notes (internal, amber),
// Additional comments (customer-visible, blue), Argus AI (purple).
function warRoomKind(c: ChatMessage): "ai" | "comment" | "worknote" {
  if (c.ai) return "ai";
  if (c.role === "Manager") return "comment"; // stakeholder / customer-visible
  return "worknote";                          // IC + responder operational notes
}
const WARROOM_TYPES: Record<"worknote" | "comment" | "ai", { label: string; color: string; tint: string }> = {
  worknote: { label: "Work notes", color: "var(--warning)", tint: "var(--warning-bg)" },
  comment:  { label: "Additional comments", color: "var(--blue-600)", tint: "var(--blue-50)" },
  ai:       { label: "Argus AI", color: "var(--purple-500)", tint: "#f6f2fe" },
};

export function WarRoomActivity() {
  const [filter, setFilter] = React.useState("all");
  const [channel, setChannel] = React.useState("worknote"); // composer channel
  const [draft, setDraft] = React.useState("");
  const canWrite = useCanWrite();

  const items = CHAT.map((c, i) => ({ ...c, _i: i, kind: warRoomKind(c) }));
  const counts = {
    all: items.length,
    worknote: items.filter(x => x.kind === "worknote").length,
    comment: items.filter(x => x.kind === "comment").length,
    ai: items.filter(x => x.kind === "ai").length,
  };
  const shown = filter === "all" ? items : items.filter(x => x.kind === filter);

  const filters = [
    ["all", `All · ${counts.all}`],
    ["worknote", `Work notes · ${counts.worknote}`],
    ["comment", `Comments · ${counts.comment}`],
    ["ai", `AI · ${counts.ai}`],
  ];

  return (
    <div className="sn-act">
      <div className="sn-act-bar">
        <div className="sn-act-title">
          <i className="fa-solid fa-comments" /> Activity
          <span className="sn-act-sub">#inc-48291-war-room · 6 responders</span>
        </div>
        <div className="sn-act-filters">
          {filters.map(([k, lbl]) => (
            <button key={k} type="button" className={`sn-act-filter ${filter === k ? "on" : ""} ${k}`} onClick={() => setFilter(k)}>{lbl}</button>
          ))}
        </div>
      </div>

      <div className="sn-act-stream">
        {shown.map(c => {
          const t = WARROOM_TYPES[c.kind];
          const u = c.ai ? null : USERS.find(x => x.id === c.u);
          const name = c.ai ? "Argus AI" : (u ? u.name : "Unknown");
          const role = c.ai ? "copilot" : c.role;
          return (
            <div key={c._i} className={`sn-act-item kind-${c.kind}`}>
              <div className="sn-act-rail">
                {c.ai
                  ? <span className="sn-act-ai-av">✦</span>
                  : <Avatar name={name} color={(u && u.color) as string | undefined} />}
              </div>
              <div className="sn-act-main">
                <div className="sn-act-meta">
                  <b>{name}</b>
                  <span className="sn-act-role">{role}</span>
                  <span className="sn-act-type" style={{ color: t.color, background: t.tint, borderColor: t.color }}>
                    <i className={`fa-solid ${c.kind === "comment" ? "fa-globe" : c.kind === "ai" ? "fa-wand-magic-sparkles" : "fa-lock"}`} /> {t.label}
                  </span>
                  <time>{c.time} · Today</time>
                </div>
                <div className="sn-act-bubble" style={{ borderLeftColor: t.color, background: t.tint }}>{c.text}</div>
              </div>
            </div>
          );
        })}
      </div>

      {!canWrite ? (
        <div className="sn-journal" style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--fg-muted)", fontSize: 12.5 }}>
          <i className="fa-solid fa-eye" /> Read-only — you can follow the war room but not post work notes or comments.
        </div>
      ) : (
      <div className="sn-journal">
        <div className="sn-journal-tabs">
          <button type="button" className={`sn-journal-tab worknote ${channel === "worknote" ? "on" : ""}`} onClick={() => setChannel("worknote")}>
            <i className="fa-solid fa-lock" /> Work notes
          </button>
          <button type="button" className={`sn-journal-tab comment ${channel === "comment" ? "on" : ""}`} onClick={() => setChannel("comment")}>
            <i className="fa-solid fa-globe" /> Additional comments <span className="sn-journal-vis">customer-visible</span>
          </button>
        </div>
        <textarea
          className={`sn-journal-input ch-${channel}`}
          rows={3}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder={channel === "worknote"
            ? "Add an internal work note — @mention a responder, /runbook, /status…"
            : "Write a customer-visible update for Fyers stakeholders…"}
        />
        <div className="sn-journal-foot">
          <div className="sn-journal-tools">
            <button type="button" className="sn-journal-tool" title="Mention"><i className="fa-solid fa-at" /></button>
            <button type="button" className="sn-journal-tool" title="Attach"><i className="fa-solid fa-paperclip" /></button>
            <button type="button" className="sn-journal-tool" title="Runbook"><i className="fa-solid fa-book" /></button>
            <button type="button" className="sn-journal-tool" title="Status page"><i className="fa-solid fa-signal" /></button>
          </div>
          <button type="button" className={`sn-btn primary ch-${channel}`} disabled={!draft.trim()}>
            <i className="fa-solid fa-paper-plane" /> Post {channel === "worknote" ? "work note" : "comment"}
          </button>
        </div>
      </div>
      )}
    </div>
  );
}
