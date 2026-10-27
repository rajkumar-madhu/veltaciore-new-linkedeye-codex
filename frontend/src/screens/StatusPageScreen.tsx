// Public status page editor + stakeholder communications
// PagerDuty / Statuspage.io concept: components, posted updates, subscribers, scheduled maintenance.
// Ported from screens/status-page.jsx; LinkedEye layout. No status-page
// provider is wired up yet, so everything here is labelled as sample data.
import "@/styles/servicedesk.css";
import React from "react";
import { useNav } from "@/hooks/useNav";
import { Panel, Pill, fmt } from "@/components/ld";
import type { Tone } from "@/components/ld";

import { Tile, buttonClass, cx, ui } from "@/components/ui";
import { ddTone, sd } from "@/components/RecordList";
import { Icon } from "@/components/Icon";
import { CalendarIcon, ChevronRightIcon, ClockIcon, ExternalLinkIcon, FlaskConicalIcon, GlobeIcon, MegaphoneIcon, SendIcon, UsersIcon } from "lucide-react";
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
    <div className={cx(ui.card, "flex items-center gap-4 px-4.5 py-4 text-left cursor-default")}>
      <Tile tone={tone}><Icon name={icon} /></Tile>
      <span className="flex flex-col gap-0.5 min-w-0">
        <span className="text-sm text-fg-muted">{label}</span>
        <span className="text-5xl font-bold tracking-[-0.02em] text-fg leading-[1.2]">{value}</span>
        <span className="text-sm text-fg-muted">{note}</span>
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
    <div className={ui.page}>
      <nav className={ui.crumbs} aria-label="Breadcrumb">
        <button type="button" className={ui.link} onClick={() => setRoute("dashboard")}>Home</button>
        <Icon icon={ChevronRightIcon} />
        <button type="button" className={ui.link} onClick={() => setRoute("dashboard")}>Operate</button>
        <Icon icon={ChevronRightIcon} />
        <span>Status page</span>
      </nav>

      <div className={ui.head}>
        <div>
          <h1 className={ui.h1}>Status Page &amp; Stakeholder Comms</h1>
          <p className={ui.headSub}>status.linkedeye.in · publishes to email, SMS, Slack &amp; webhooks</p>
        </div>
        <div className={ui.headActions}>
          <button type="button" className={buttonClass()}><Icon icon={ExternalLinkIcon} /> Preview public page</button>
          <button type="button" className={buttonClass()}><Icon icon={UsersIcon} /> Subscribers</button>
          <button type="button" className={buttonClass("primary")}><Icon icon={MegaphoneIcon} /> Post update</button>
        </div>
      </div>

      <div className={cx(ui.card, ui.notice)} role="status">
        <Icon icon={FlaskConicalIcon} />
        <div>
          <b>Sample data</b>
          <p className="text-fg-muted text-xs">No status-page provider is connected. Components, uptime, updates and subscriber counts below are example values.</p>
        </div>
      </div>

      <div className={cx(ui.grid, ui.cols[5])}>
        <Summary icon={overall.ic} tone={overall.tone} label="Overall status" value={overall.label} note={`${affected.length} of ${COMPONENTS.length} components affected`} />
        <Summary icon="fa-comment-dots" tone={PHASE_META[latest.phase].tone} label="Latest update" value={PHASE_META[latest.phase].label} note={`${latest.ago} · ${latest.by}`} />
        <Summary icon="fa-users" tone="info" label="Subscribers" value={fmt(subscriberTotal)} note={`across ${SUBSCRIBERS.length} channels`} />
        <Summary icon="fa-calendar" tone="purple" label="Maintenance" value={MAINTENANCE.length} note="scheduled" />
        <Summary icon="fa-list" tone="muted" label="Posted updates" value={UPDATES.length} note="in the history below" />
      </div>

      <div className={ui.split}>
        <div className={ui.rail}>
          <Panel title="Compose stakeholder update">
            <div className={ui.form}>
              <div className={ui.field}>
                <span id={`${idp}-phase`}>Phase</span>
                <div className={sd.toggles} role="group" aria-labelledby={`${idp}-phase`}>
                  {Object.entries(PHASE_META).map(([k, m]) => (
                    <button key={k} type="button" className={sd.toggle} aria-pressed={phase === k} onClick={() => setPhase(k)}>{m.label}</button>
                  ))}
                </div>
              </div>
              <div className={ui.field}>
                <label htmlFor={`${idp}-msg`}>Message</label>
                <textarea id={`${idp}-msg`} className={ui.textarea} rows={3} placeholder="What should stakeholders know? Keep it clear and blameless…"
                  defaultValue="We've identified the root cause and are rolling out a fix. Next update in 30 minutes." />
              </div>
              <fieldset className={cx(ui.field, sd.fieldset)}>
                <legend>Affected components</legend>
                <div className={sd.actions}>
                  {COMPONENTS.slice(0, 4).map((c) => (
                    <label key={c.name} className={sd.check}>
                      <input type="checkbox" defaultChecked={c.status !== "operational"} /> {c.name}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className={ui.field}>
                <span id={`${idp}-ch`}>Notify via</span>
                <div className={sd.actions} role="group" aria-labelledby={`${idp}-ch`}>
                  {CHANNELS.map(([k, ic, lbl]) => (
                    <button key={k} type="button" className={sd.toggle} aria-pressed={!!channels[k]} onClick={() => tgl(k)}>
                      <Icon className={ic} /> {lbl}
                    </button>
                  ))}
                  <span className={ui.fieldGrow} />
                  <button type="button" className={buttonClass("primary")}><Icon icon={SendIcon} /> Publish update</button>
                </div>
              </div>
            </div>
          </Panel>

          <Panel title={`Public components (${COMPONENTS.length})`}>
            <div className={ui.tableWrap}>
              <table className={ui.table}>
                <thead>
                  <tr><th scope="col">Component</th><th scope="col">Group</th><th scope="col">Status</th><th scope="col">Uptime (90d)</th><th scope="col"><span className="sr-only">Actions</span></th></tr>
                </thead>
                <tbody>
                  {COMPONENTS.map(c => {
                    const m = STATUS_META[c.status];
                    return (
                      <tr key={c.name}>
                        <td className="font-medium">{c.name}</td>
                        <td>{c.group}</td>
                        <td><Pill tone={m.tone}><Icon name={m.ic} /> {m.label}</Pill></td>
                        <td className={sd.cellMono}>{c.uptime}</td>
                        <td><button type="button" className={buttonClass("default", "sm")} aria-label={`Set status for ${c.name}`}>Set status</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title={`Posted updates (${UPDATES.length})`}>
            <ul className={ui.activity}>
              {UPDATES.map((u, i) => {
                const m = PHASE_META[u.phase];
                return (
                  <li key={i} className={sd.feedItem}>
                    <span className={sd.time}>{u.t}</span>
                    <div className={sd.entry}>
                      <div className={sd.entryMeta}>
                        <Pill tone={m.tone}>{m.label}</Pill>
                        <span>{u.ago} · {u.by}</span>
                      </div>
                      <div className={sd.entryText}><b>{u.title}</b></div>
                      <div className={sd.entryText}>{u.body}</div>
                      <div className={sd.entryMeta}>
                        {u.ch.map(ch => <span key={ch}><Icon className={CHANNEL_ICON[ch]} /> {ch} sent</span>)}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>

        <aside className={ui.rail} aria-label="Status page settings">
          <Panel title="Public page">
            <dl className={ui.dl}>
              <dt>URL</dt><dd className={ui.mono}>status.linkedeye.in</dd>
              <dt>Visibility</dt><dd><Pill tone="ok"><Icon icon={GlobeIcon} /> Public</Pill></dd>
              <dt>Theme</dt><dd>Argus-LinkedEye · dark header</dd>
              <dt>Custom domain</dt><dd className={ddTone.ok}>verified · SSL</dd>
            </dl>
          </Panel>

          <Panel title={`Subscribers (${fmt(subscriberTotal)})`}>
            <dl className={ui.dl}>
              {SUBSCRIBERS.map((s) => (
                <React.Fragment key={s.channel}>
                  <dt>{s.channel}</dt><dd><b>{fmt(s.count)}</b> {s.unit}</dd>
                </React.Fragment>
              ))}
            </dl>
          </Panel>

          <Panel title="Scheduled maintenance">
            <ul className={ui.activity}>
              {MAINTENANCE.map((mt) => (
                <li key={mt.title} className={sd.feedItem}>
                  <Tile tone="purple" size="sm"><Icon icon={CalendarIcon} /></Tile>
                  <div className={sd.entry}>
                    <div className={sd.entryText}><b>{mt.title}</b></div>
                    <div className={sd.entryMeta}><span>{mt.when}</span></div>
                    <div className={sd.entryMeta}><span>Affects: {mt.affects}</span></div>
                    <span><Pill tone="muted"><Icon icon={ClockIcon} /> Notice sent to {fmt(subscriberTotal)}</Pill></span>
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
