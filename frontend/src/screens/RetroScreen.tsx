// Post-incident review / retrospective (postmortem)
// PagerDuty / Datadog concept: blameless timeline, root cause, action items, review workflow.
// Ported from screens/retro.jsx; LinkedEye entity-detail layout.
import "@/styles/servicedesk.css";
import { useNav } from "@/hooks/useNav";
import { USERS } from "@/data/core";
import { Panel, Pill } from "@/components/ld";
import type { Tone } from "@/components/ld";

import { Icon } from "@/components/Icon";
import { CheckIcon, ChevronRightIcon, CircleCheckIcon, CircleIcon, ClipboardCheckIcon, FileTextIcon, PencilIcon, Share2Icon, UserIcon, XIcon } from "lucide-react";
const TIMELINE: { t: string; label: string; who: string; text: string; tone: Tone }[] = [
  { t: "14:02", label: "Detected", who: "prometheus-alertmanager", text: "Error rate on payments-api crossed 5% threshold. Alert fired.", tone: "crit" },
  { t: "14:04", label: "Acknowledged", who: "Priya Raghunathan", text: "On-call ack'd within 2 minutes. Sev-1 declared, war room opened.", tone: "warn" },
  { t: "14:11", label: "Escalated", who: "Escalation policy L2", text: "Database SME paged to investigate connection pool metrics.", tone: "warn" },
  { t: "14:38", label: "Root cause found", who: "Elena Kowalski", text: "Stripe client connection pool exhausted after deploy CHG-2219 raised concurrency.", tone: "purple" },
  { t: "14:46", label: "Mitigated", who: "Marcus Okafor", text: "Rolled back CHG-2219 and raised pool ceiling. Error rate recovering.", tone: "ok" },
  { t: "15:03", label: "Resolved", who: "Priya Raghunathan", text: "Payments fully recovered for 15 min. Incident resolved, status page cleared.", tone: "ok" },
];

const ACTIONS = [
  { item: "Add connection-pool saturation alert at 70%", owner: "u3", due: "Jun 5", prio: "High", status: "open" },
  { item: "Require load test for concurrency changes in CAB", owner: "u5", due: "Jun 9", prio: "Medium", status: "open" },
  { item: "Add automatic rollback on error-rate spike", owner: "u2", due: "Jun 12", prio: "High", status: "progress" },
  { item: "Document Stripe pool tuning in runbook KB-2114", owner: "u4", due: "Jun 4", prio: "Low", status: "done" },
];
const PRIO_TONE: Record<string, Tone> = { High: "crit", Medium: "warn", Low: "muted" };
const ACT_STATUS: Record<string, { tone: Tone; label: string }> = { open: { tone: "crit", label: "Open" }, progress: { tone: "info", label: "In progress" }, done: { tone: "ok", label: "Done" } };

const WELL = ["On-call acknowledged in 2 min — well under target", "War room + status page spun up automatically", "Clean rollback path existed for the bad change"];
const WRONG = ["No alert on connection-pool saturation — detected by symptom", "Concurrency change shipped without a load test", "Manual rollback added ~8 min to mitigation"];
const WHYS: [string, string][] = [
  ["Why did checkouts fail?", "The payments service returned errors on most requests."],
  ["Why did it error?", "Requests to Stripe timed out waiting for a connection."],
  ["Why did they wait?", "The client connection pool was fully saturated."],
  ["Why was it saturated?", "Concurrency was raised by CHG-2219 beyond the pool ceiling."],
  ["Why wasn't it caught?", "No saturation alert existed and the change skipped load testing."],
];
const STAGES: [string, "done" | "active" | "todo"][] = [["Draft", "done"], ["In review", "active"], ["Approved", "todo"], ["Published", "todo"]];

const userName = (id: string) => USERS.find((u) => u.id === id)?.name ?? id;
const minutes = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };

export default function RetroScreen() {
  const { setRoute } = useNav();

  // Response times come from the timeline above, measured from detection.
  const at = (label: string) => TIMELINE.find((e) => e.label === label)?.t;
  const since = (label: string) => {
    const t = at(label);
    const start = at("Detected");
    return t && start ? `${minutes(t) - minutes(start)}m` : "—";
  };
  const openActions = ACTIONS.filter((a) => a.status !== "done").length;
  const timings: { label: string; value: string; note: string; tone: Tone; icon: string }[] = [
    { label: "Time to acknowledge", value: since("Acknowledged"), note: `detected ${at("Detected")} → ack ${at("Acknowledged")}`, tone: "ok", icon: "fa-hand" },
    { label: "Time to root cause", value: since("Root cause found"), note: "from detection", tone: "info", icon: "fa-magnifying-glass" },
    { label: "Time to mitigate", value: since("Mitigated"), note: "manual rollback", tone: "warn", icon: "fa-shield-halved" },
    { label: "Time to resolve", value: since("Resolved"), note: "end to end", tone: "warn", icon: "fa-circle-check" },
    { label: "Action items", value: String(ACTIONS.length), note: `${openActions} open`, tone: "purple", icon: "fa-list-check" },
  ];

  return (
    <div className="ld-dash">
      <nav className="ld-crumbs" aria-label="Breadcrumb">
        <button type="button" className="ld-link" onClick={() => setRoute("dashboard")}>Home</button>
        <Icon icon={ChevronRightIcon} />
        <button type="button" className="ld-link" onClick={() => setRoute("incidents")}>Incidents</button>
        <Icon icon={ChevronRightIcon} />
        <button type="button" className="ld-link" onClick={() => setRoute("incident-detail")}>INC-48279</button>
        <Icon icon={ChevronRightIcon} />
        <span>Retrospective</span>
      </nav>

      <div className="ld-head ld-entity-head">
        <div className="ld-entity">
          <span className="ld-tile ld-purple" aria-hidden="true"><Icon icon={ClipboardCheckIcon} /></span>
          <div>
            <span className="ld-sd-number">PIR-48279</span>
            <h1 className="ld-entity-title">
              Post-Incident Review — Payments connection pool exhaustion
              <Pill tone="crit">Sev-1</Pill>
              <Pill tone="ok"><span className="ld-pill-dot" />Resolved</Pill>
              <Pill tone="info"><Icon icon={PencilIcon} /> Review: Draft</Pill>
            </h1>
            <p className="ld-entity-meta">
              <span>INC-48279</span>
              <span>Jun 1, 2026</span>
              <span>{since("Resolved")} duration ({at("Detected")}–{at("Resolved")} UTC)</span>
              <span>Blameless retrospective</span>
            </p>
          </div>
        </div>
        <div className="ld-head-side">
          <div className="ld-head-actions">
            <button type="button" className="ld-btn"><Icon icon={FileTextIcon} /> Export PDF</button>
            <button type="button" className="ld-btn"><Icon icon={Share2Icon} /> Share</button>
            <button type="button" className="ld-btn ld-btn-primary"><Icon icon={CircleCheckIcon} /> Publish review</button>
          </div>
        </div>
      </div>

      <div className="ld-grid ld-grid-5">
        {timings.map((k) => (
          <div key={k.label} className="ld-card ld-stat ld-sd-stat">
            <span className={`ld-tile ld-${k.tone}`} aria-hidden="true"><Icon className={`fa-solid ${k.icon}`} /></span>
            <span className="ld-stat-body">
              <span className="ld-stat-label">{k.label}</span>
              <span className="ld-stat-value">{k.value}</span>
              <span className="ld-stat-note">{k.note}</span>
            </span>
          </div>
        ))}
      </div>

      <div className="ld-split">
        <div className="ld-rail">
          <Panel title="Summary">
            <dl className="ld-dl">
              <dt>Severity</dt><dd><Pill tone="crit">Sev-1</Pill></dd>
              <dt>Duration</dt><dd><b>{since("Resolved")}</b> · {at("Detected")}–{at("Resolved")} UTC</dd>
              <dt>Affected services</dt><dd className="ld-mono">payments-api, checkout-web</dd>
              <dt>Incident commander</dt><dd>{userName("u1")}</dd>
              <dt>Trigger</dt><dd>CHG-2219 · concurrency increase</dd>
            </dl>
            <p className="ld-sd-entry-text">
              A routine change (CHG-2219) increased request concurrency on the payments service. The Stripe client connection
              pool was sized for the old concurrency and became exhausted under production load, causing a cascade of failed
              payment requests. Detection was fast, but mitigation required a manual rollback that added avoidable minutes.
            </p>
          </Panel>

          <Panel title={`Incident timeline (${TIMELINE.length} events)`}>
            <ul className="ld-activity ld-sd-feed">
              {TIMELINE.map((e, i) => (
                <li key={i}>
                  <span className="ld-sd-time">{e.t}</span>
                  <span className={`ld-tile ld-tile-sm ld-${e.tone}`} aria-hidden="true"><Icon icon={CircleIcon} /></span>
                  <div className="ld-sd-entry">
                    <div className="ld-sd-entry-meta"><b>{e.label}</b><span><Icon icon={UserIcon} /> {e.who}</span></div>
                    <div className="ld-sd-entry-text">{e.text}</div>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Root cause analysis — five whys">
            <ol className="ld-sd-steps">
              {WHYS.map(([q, a], i) => (
                <li key={i}>
                  <span className="ld-sd-step-n" aria-hidden="true">{i + 1}</span>
                  <div className="ld-sd-entry">
                    <div className="ld-sd-entry-text"><b>{q}</b></div>
                    <div className="ld-sd-entry-text ld-muted">{a}</div>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>

          <div className="ld-grid ld-grid-2">
            <Panel title="What went well">
              <ul className="ld-sd-list ld-sd-list-plain">
                {WELL.map((x, i) => <li key={i}><Icon icon={CheckIcon} className="ld-text-ok" /> <span>{x}</span></li>)}
              </ul>
            </Panel>
            <Panel title="What to improve">
              <ul className="ld-sd-list ld-sd-list-plain">
                {WRONG.map((x, i) => <li key={i}><Icon icon={XIcon} className="ld-text-crit" /> <span>{x}</span></li>)}
              </ul>
            </Panel>
          </div>

          <Panel title={`Action items (${openActions} open)`}>
            <div className="ld-table-wrap">
              <table className="ld-table">
                <thead>
                  <tr><th scope="col">Action</th><th scope="col">Owner</th><th scope="col">Due</th><th scope="col">Priority</th><th scope="col">Status</th></tr>
                </thead>
                <tbody>
                  {ACTIONS.map((a, i) => {
                    const st = ACT_STATUS[a.status];
                    return (
                      <tr key={i}>
                        <td className="ld-wrap ld-strong">{a.item}</td>
                        <td>{userName(a.owner)}</td>
                        <td className="ld-mono ld-muted">{a.due}</td>
                        <td><Pill tone={PRIO_TONE[a.prio]}>{a.prio}</Pill></td>
                        <td><Pill tone={st.tone}><span className="ld-pill-dot" />{st.label}</Pill></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        <aside className="ld-rail" aria-label="Review details">
          <Panel title="Review status">
            <ol className="ld-sd-stages" aria-label="Review stages">
              {STAGES.map(([s, st]) => (
                <li key={s} aria-current={st === "active" ? "step" : undefined}>
                  <Pill tone={st === "done" ? "ok" : st === "active" ? "info" : "muted"}>
                    <Icon className={`fa-solid ${st === "done" ? "fa-check" : st === "active" ? "fa-pen" : "fa-circle"}`} /> {s}
                  </Pill>
                </li>
              ))}
            </ol>
            <dl className="ld-dl">
              <dt>Author</dt><dd>{userName("u1")}</dd>
              <dt>Reviewers</dt><dd>Devon Hassan · Marcus Okafor</dd>
              <dt>Due</dt><dd className="ld-text-warn">Jun 4</dd>
            </dl>
          </Panel>

          <Panel title="Impact (sample data)">
            <dl className="ld-dl">
              <dt>Customers</dt><dd><span className="ld-text-crit">~3,200</span> failed checkouts</dd>
              <dt>Failed revenue</dt><dd className="ld-mono">~$84,000</dd>
              <dt>SLA</dt><dd className="ld-text-crit">Breached · 99.9%</dd>
              <dt>Error budget</dt><dd className="ld-text-warn">38% spent (mo)</dd>
            </dl>
          </Panel>

          <Panel title="Linked records">
            <div className="ld-table-wrap">
              <table className="ld-table">
                <thead><tr><th scope="col">Type</th><th scope="col">Record</th></tr></thead>
                <tbody>
                  <tr><td>Incident</td><td><button type="button" className="ld-link ld-mono" onClick={() => setRoute("incident-detail")}>INC-48279</button></td></tr>
                  <tr><td>Problem</td><td><button type="button" className="ld-link ld-mono" onClick={() => setRoute("problems")}>PRB-3912</button></td></tr>
                  <tr><td>Change</td><td><button type="button" className="ld-link ld-mono" onClick={() => setRoute("changes")}>CHG-2219</button></td></tr>
                  <tr><td>Runbook</td><td><button type="button" className="ld-link ld-mono" onClick={() => setRoute("runbooks")}>KB-2114</button></td></tr>
                </tbody>
              </table>
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
