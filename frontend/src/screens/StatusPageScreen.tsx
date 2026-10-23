// Public status page editor + stakeholder communications
// PagerDuty / Statuspage.io concept: components, posted updates, subscribers, scheduled maintenance.
// Ported from screens/status-page.jsx; LinkedEye layout. No status-page
// provider is wired up yet, so everything here is labelled as sample data.
import "@/styles/servicedesk.css";
import React from "react";
import { useNav } from "@/hooks/useNav";
import { Panel, Pill, fmt } from "@/components/ld";
import type { Tone } from "@/components/ld";

const COMPONENTS = [
  { name: "API Gateway",        group: "Core", status: "degraded",  uptime: "99.94%" },
  { name: "Web Dashboard",      group: "Core", status: "operational", uptime: "99.99%" },
  { name: "Payments Service",   group: "Core", status: "partial",   uptime: "99.81%" },
  { name: "Webhooks & Events",  group: "Platform", status: "operational", uptime: "99.97%" },
  { name: "Mobile API",         group: "Platform", status: "operational", uptime: "99.98%" },
  { name: "Data Pipeline",      group: "Platform", status: "operational", uptime: "99.95%" },
];
const STATUS_META: Record<string, { tone: Tone; ic: string; label: string; rank: number }> = {
  operational: { tone: "ok", ic: "fa-circle-check", label: "Operational", rank: 0 },
  degraded:    { tone: "warn", ic: "fa-triangle-exclamation", label: "Degraded", rank: 1 },
  partial:     { tone: "warn", ic: "fa-circle-exclamation", label: "Partial outage", rank: 2 },
  major:       { tone: "crit", ic: "fa-circle-xmark", label: "Major outage", rank: 3 },
};

const UPDATES = [
  { phase: "identified", t: "14:38", ago: "6m ago", by: "Priya Raghunathan", title: "Root cause identified — Stripe connection pool exhaustion",
    body: "We've identified elevated error rates on the Payments Service caused by connection pool saturation. A fix is being rolled out now.", ch: ["email", "sms", "slack"] },
  { phase: "investigating", t: "14:21", ago: "23m ago", by: "Monitoring System", title: "Investigating elevated payment error rates",
    body: "We are investigating reports of failed payment attempts. Some customers may see errors at checkout. Updates to follow.", ch: ["email", "slack"] },
  { phase: "monitoring", t: "11:02", ago: "Today", by: "Marcus Okafor", title: "Mobile API latency resolved — monitoring",
    body: "Latency on the Mobile API has returned to normal. We are monitoring to confirm full recovery.", ch: ["email"] },
];
const PHASE_META: Record<string, { tone: Tone; label: string }> = {
  investigating: { tone: "warn", label: "Investigating" },
  identified:    { tone: "warn", label: "Identified" },
  monitoring:    { tone: "info", label: "Monitoring" },
  resolved:      { tone: "ok", label: "Resolved" },
};

const SUBSCRIBERS = [
  { channel: "Email", count: 1228, unit: "confirmed" },
  { channel: "SMS", count: 318, unit: "verified" },
  { channel: "Slack", count: 12, unit: "workspaces" },
  { channel: "Webhook", count: 8, unit: "endpoints" },
];
const MAINTENANCE = [
  { title: "Database failover drill", when: "Sun, Jun 7 · 02:00–04:00 UTC", affects: "Payments Service, Data Pipeline" },
];
const CHANNELS: [string, string, string][] = [["email", "fa-solid fa-envelope", "Email"], ["sms", "fa-solid fa-comment-sms", "SMS"], ["slack", "fa-brands fa-slack", "Slack"], ["webhook", "fa-solid fa-bolt", "Webhook"]];
const CHANNEL_ICON: Record<string, string> = Object.fromEntries(CHANNELS.map(([k, ic]) => [k, ic]));

function Summary({ icon, tone, label, value, note }: { icon: string; tone: Tone; label: string; value: React.ReactNode; note: string }) {
  return (
    <div className="ld-card ld-stat ld-sd-stat">
      <span className={`ld-tile ld-${tone}`} aria-hidden="true"><i className={`fa-solid ${icon}`} /></span>
      <span className="ld-stat-body">
        <span className="ld-stat-label">{label}</span>
        <span className="ld-stat-value">{value}</span>
        <span className="ld-stat-note">{note}</span>
      </span>
    </div>
  );
}

export default function StatusPageScreen() {
  const { setRoute } = useNav();
  const idp = React.useId();
  const [phase, setPhase] = React.useState("identified");
  const [channels, setChannels] = React.useState<Record<string, boolean>>({ email: true, sms: true, slack: true, webhook: false });
  const tgl = (k: string) => setChannels(c => ({ ...c, [k]: !c[k] }));

  const affected = COMPONENTS.filter((c) => c.status !== "operational");
  const worst = COMPONENTS.reduce((w, c) => (STATUS_META[c.status].rank > STATUS_META[w].rank ? c.status : w), "operational");
  const overall = worst === "operational" ? STATUS_META.operational : { ...STATUS_META[worst], label: worst === "major" ? "Major outage" : "Degraded" };
  const subscriberTotal = SUBSCRIBERS.reduce((s, x) => s + x.count, 0);
  const latest = UPDATES[0];

  return (
    <div className="ld-dash">
      <nav className="ld-crumbs" aria-label="Breadcrumb">
        <button type="button" className="ld-link" onClick={() => setRoute("dashboard")}>Home</button>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <button type="button" className="ld-link" onClick={() => setRoute("dashboard")}>Operate</button>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <span>Status page</span>
      </nav>

      <div className="ld-head">
        <div>
          <h1>Status Page &amp; Stakeholder Comms</h1>
          <p>status.linkedeye.in · publishes to email, SMS, Slack &amp; webhooks</p>
        </div>
        <div className="ld-head-actions">
          <button type="button" className="ld-btn"><i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" /> Preview public page</button>
          <button type="button" className="ld-btn"><i className="fa-solid fa-users" aria-hidden="true" /> Subscribers</button>
          <button type="button" className="ld-btn ld-btn-primary"><i className="fa-solid fa-bullhorn" aria-hidden="true" /> Post update</button>
        </div>
      </div>

      <div className="ld-card ld-metrics-off" role="status">
        <i className="fa-solid fa-flask" aria-hidden="true" />
        <div>
          <b>Sample data</b>
          <p className="ld-muted ld-small">No status-page provider is connected. Components, uptime, updates and subscriber counts below are example values.</p>
        </div>
      </div>

      <div className="ld-grid ld-grid-5">
        <Summary icon={overall.ic} tone={overall.tone} label="Overall status" value={overall.label} note={`${affected.length} of ${COMPONENTS.length} components affected`} />
        <Summary icon="fa-comment-dots" tone={PHASE_META[latest.phase].tone} label="Latest update" value={PHASE_META[latest.phase].label} note={`${latest.ago} · ${latest.by}`} />
        <Summary icon="fa-users" tone="info" label="Subscribers" value={fmt(subscriberTotal)} note={`across ${SUBSCRIBERS.length} channels`} />
        <Summary icon="fa-calendar" tone="purple" label="Maintenance" value={MAINTENANCE.length} note="scheduled" />
        <Summary icon="fa-list" tone="muted" label="Posted updates" value={UPDATES.length} note="in the history below" />
      </div>

      <div className="ld-split">
        <div className="ld-rail">
          <Panel title="Compose stakeholder update">
            <div className="ld-form">
              <div className="ld-form-field">
                <span id={`${idp}-phase`}>Phase</span>
                <div className="ld-sd-toggles" role="group" aria-labelledby={`${idp}-phase`}>
                  {Object.entries(PHASE_META).map(([k, m]) => (
                    <button key={k} type="button" className="ld-sd-toggle" aria-pressed={phase === k} onClick={() => setPhase(k)}>{m.label}</button>
                  ))}
                </div>
              </div>
              <div className="ld-form-field">
                <label htmlFor={`${idp}-msg`}>Message</label>
                <textarea id={`${idp}-msg`} className="ld-input ld-textarea" rows={3} placeholder="What should stakeholders know? Keep it clear and blameless…"
                  defaultValue="We've identified the root cause and are rolling out a fix. Next update in 30 minutes." />
              </div>
              <fieldset className="ld-form-field ld-sd-fieldset">
                <legend>Affected components</legend>
                <div className="ld-sd-actions">
                  {COMPONENTS.slice(0, 4).map((c) => (
                    <label key={c.name} className="ld-sd-check">
                      <input type="checkbox" defaultChecked={c.status !== "operational"} /> {c.name}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="ld-form-field">
                <span id={`${idp}-ch`}>Notify via</span>
                <div className="ld-sd-actions" role="group" aria-labelledby={`${idp}-ch`}>
                  {CHANNELS.map(([k, ic, lbl]) => (
                    <button key={k} type="button" className="ld-sd-toggle" aria-pressed={!!channels[k]} onClick={() => tgl(k)}>
                      <i className={ic} aria-hidden="true" /> {lbl}
                    </button>
                  ))}
                  <span className="ld-field-grow" />
                  <button type="button" className="ld-btn ld-btn-primary"><i className="fa-solid fa-paper-plane" aria-hidden="true" /> Publish update</button>
                </div>
              </div>
            </div>
          </Panel>

          <Panel title={`Public components (${COMPONENTS.length})`}>
            <div className="ld-table-wrap">
              <table className="ld-table">
                <thead>
                  <tr><th scope="col">Component</th><th scope="col">Group</th><th scope="col">Status</th><th scope="col">Uptime (90d)</th><th scope="col"><span className="sr-only">Actions</span></th></tr>
                </thead>
                <tbody>
                  {COMPONENTS.map(c => {
                    const m = STATUS_META[c.status];
                    return (
                      <tr key={c.name}>
                        <td className="ld-strong">{c.name}</td>
                        <td className="ld-muted">{c.group}</td>
                        <td><Pill tone={m.tone}><i className={`fa-solid ${m.ic}`} aria-hidden="true" /> {m.label}</Pill></td>
                        <td className="ld-mono ld-muted">{c.uptime}</td>
                        <td><button type="button" className="ld-btn ld-btn-sm" aria-label={`Set status for ${c.name}`}>Set status</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title={`Posted updates (${UPDATES.length})`}>
            <ul className="ld-activity ld-sd-feed">
              {UPDATES.map((u, i) => {
                const m = PHASE_META[u.phase];
                return (
                  <li key={i}>
                    <span className="ld-sd-time">{u.t}</span>
                    <div className="ld-sd-entry">
                      <div className="ld-sd-entry-meta">
                        <Pill tone={m.tone}>{m.label}</Pill>
                        <span>{u.ago} · {u.by}</span>
                      </div>
                      <div className="ld-sd-entry-text"><b>{u.title}</b></div>
                      <div className="ld-sd-entry-text">{u.body}</div>
                      <div className="ld-sd-entry-meta">
                        {u.ch.map(ch => <span key={ch}><i className={CHANNEL_ICON[ch]} aria-hidden="true" /> {ch} sent</span>)}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>

        <aside className="ld-rail" aria-label="Status page settings">
          <Panel title="Public page">
            <dl className="ld-dl">
              <dt>URL</dt><dd className="ld-mono">status.linkedeye.in</dd>
              <dt>Visibility</dt><dd><Pill tone="ok"><i className="fa-solid fa-globe" aria-hidden="true" /> Public</Pill></dd>
              <dt>Theme</dt><dd>Argus-LinkedEye · dark header</dd>
              <dt>Custom domain</dt><dd className="ld-text-ok">verified · SSL</dd>
            </dl>
          </Panel>

          <Panel title={`Subscribers (${fmt(subscriberTotal)})`}>
            <dl className="ld-dl">
              {SUBSCRIBERS.map((s) => (
                <React.Fragment key={s.channel}>
                  <dt>{s.channel}</dt><dd><b>{fmt(s.count)}</b> {s.unit}</dd>
                </React.Fragment>
              ))}
            </dl>
          </Panel>

          <Panel title="Scheduled maintenance">
            <ul className="ld-activity ld-sd-feed">
              {MAINTENANCE.map((mt) => (
                <li key={mt.title}>
                  <span className="ld-tile ld-tile-sm ld-purple" aria-hidden="true"><i className="fa-regular fa-calendar" /></span>
                  <div className="ld-sd-entry">
                    <div className="ld-sd-entry-text"><b>{mt.title}</b></div>
                    <div className="ld-sd-entry-meta"><span>{mt.when}</span></div>
                    <div className="ld-sd-entry-meta"><span>Affects: {mt.affects}</span></div>
                    <span><Pill tone="muted"><i className="fa-solid fa-clock" aria-hidden="true" /> Notice sent to {fmt(subscriberTotal)}</Pill></span>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
