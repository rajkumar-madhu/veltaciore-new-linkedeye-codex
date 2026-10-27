// Post-incident review / retrospective (postmortem)
// PagerDuty / Datadog concept: blameless timeline, root cause, action items, review workflow.
// Ported from screens/retro.jsx; LinkedEye entity-detail layout.
import { useNav } from "@/hooks/useNav";
import { USERS } from "@/data/core";
import { Panel, Pill, PillDot } from "@/components/ld";
import type { Tone } from "@/components/ld";

import { Tile, buttonClass, cx, toneText, ui } from "@/components/ui";
import { ddTone, entityTile, monoLink, sd } from "@/components/RecordList";
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
    <div className={ui.page}>
      <nav className={ui.crumbs} aria-label="Breadcrumb">
        <button type="button" className={ui.link} onClick={() => setRoute("dashboard")}>Home</button>
        <Icon icon={ChevronRightIcon} />
        <button type="button" className={ui.link} onClick={() => setRoute("incidents")}>Incidents</button>
        <Icon icon={ChevronRightIcon} />
        <button type="button" className={ui.link} onClick={() => setRoute("incident-detail")}>INC-48279</button>
        <Icon icon={ChevronRightIcon} />
        <span>Retrospective</span>
      </nav>

      <div className={sd.entityHead}>
        <div className={sd.entity}>
          <span className={entityTile("purple")} aria-hidden="true"><Icon icon={ClipboardCheckIcon} /></span>
          <div>
            <span className={sd.number}>PIR-48279</span>
            <h1 className={sd.entityTitle}>
              Post-Incident Review — Payments connection pool exhaustion
              <Pill tone="crit">Sev-1</Pill>
              <Pill tone="ok"><PillDot />Resolved</Pill>
              <Pill tone="info"><Icon icon={PencilIcon} /> Review: Draft</Pill>
            </h1>
            <p className={sd.entityMeta}>
              <span>INC-48279</span>
              <span>Jun 1, 2026</span>
              <span>{since("Resolved")} duration ({at("Detected")}–{at("Resolved")} UTC)</span>
              <span>Blameless retrospective</span>
            </p>
          </div>
        </div>
        <div className={ui.headSide}>
          <div className={ui.headActions}>
            <button type="button" className={buttonClass()}><Icon icon={FileTextIcon} /> Export PDF</button>
            <button type="button" className={buttonClass()}><Icon icon={Share2Icon} /> Share</button>
            <button type="button" className={buttonClass("primary")}><Icon icon={CircleCheckIcon} /> Publish review</button>
          </div>
        </div>
      </div>

      <div className={cx(ui.grid, ui.cols[5])}>
        {timings.map((k) => (
          <div key={k.label} className={cx(ui.card, "flex items-center gap-4 px-4.5 py-4 text-left cursor-default")}>
            <Tile tone={k.tone}><Icon name={k.icon} /></Tile>
            <span className="flex flex-col gap-0.5 min-w-0">
              <span className="text-sm text-fg-muted">{k.label}</span>
              <span className="text-5xl font-bold tracking-[-0.02em] text-fg leading-[1.2]">{k.value}</span>
              <span className="text-sm text-fg-muted">{k.note}</span>
            </span>
          </div>
        ))}
      </div>

      <div className={ui.split}>
        <div className={ui.rail}>
          <Panel title="Summary">
            <dl className={ui.dl}>
              <dt>Severity</dt><dd><Pill tone="crit">Sev-1</Pill></dd>
              <dt>Duration</dt><dd><b>{since("Resolved")}</b> · {at("Detected")}–{at("Resolved")} UTC</dd>
              <dt>Affected services</dt><dd className={ui.mono}>payments-api, checkout-web</dd>
              <dt>Incident commander</dt><dd>{userName("u1")}</dd>
              <dt>Trigger</dt><dd>CHG-2219 · concurrency increase</dd>
            </dl>
            <p className={sd.entryText}>
              A routine change (CHG-2219) increased request concurrency on the payments service. The Stripe client connection
              pool was sized for the old concurrency and became exhausted under production load, causing a cascade of failed
              payment requests. Detection was fast, but mitigation required a manual rollback that added avoidable minutes.
            </p>
          </Panel>

          <Panel title={`Incident timeline (${TIMELINE.length} events)`}>
            <ul className={ui.activity}>
              {TIMELINE.map((e, i) => (
                <li key={i} className={sd.feedItem}>
                  <span className={sd.time}>{e.t}</span>
                  <Tile tone={e.tone} size="sm"><Icon icon={CircleIcon} /></Tile>
                  <div className={sd.entry}>
                    <div className={sd.entryMeta}><b>{e.label}</b><span><Icon icon={UserIcon} /> {e.who}</span></div>
                    <div className={sd.entryText}>{e.text}</div>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Root cause analysis — five whys">
            <ol className={sd.steps}>
              {WHYS.map(([q, a], i) => (
                <li key={i} className={sd.step}>
                  <span className={sd.stepN} aria-hidden="true">{i + 1}</span>
                  <div className={sd.entry}>
                    <div className={sd.entryText}><b>{q}</b></div>
                    <div className={sd.entryText}>{a}</div>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>

          <div className={cx(ui.grid, ui.cols[2])}>
            <Panel title="What went well">
              <ul className={sd.listPlain}>
                {WELL.map((x, i) => <li key={i}><Icon icon={CheckIcon} className={toneText.ok} /> <span>{x}</span></li>)}
              </ul>
            </Panel>
            <Panel title="What to improve">
              <ul className={sd.listPlain}>
                {WRONG.map((x, i) => <li key={i}><Icon icon={XIcon} className={toneText.crit} /> <span>{x}</span></li>)}
              </ul>
            </Panel>
          </div>

          <Panel title={`Action items (${openActions} open)`}>
            <div className={ui.tableWrap}>
              <table className={ui.table}>
                <thead>
                  <tr><th scope="col">Action</th><th scope="col">Owner</th><th scope="col">Due</th><th scope="col">Priority</th><th scope="col">Status</th></tr>
                </thead>
                <tbody>
                  {ACTIONS.map((a, i) => {
                    const st = ACT_STATUS[a.status];
                    return (
                      <tr key={i}>
                        <td className={cx(ui.cellWrap, "font-medium")}>{a.item}</td>
                        <td>{userName(a.owner)}</td>
                        <td className={sd.cellMono}>{a.due}</td>
                        <td><Pill tone={PRIO_TONE[a.prio]}>{a.prio}</Pill></td>
                        <td><Pill tone={st.tone}><PillDot />{st.label}</Pill></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        <aside className={ui.rail} aria-label="Review details">
          <Panel title="Review status">
            <ol className={sd.stages} aria-label="Review stages">
              {STAGES.map(([s, st]) => (
                <li key={s} aria-current={st === "active" ? "step" : undefined}>
                  <Pill tone={st === "done" ? "ok" : st === "active" ? "info" : "muted"}>
                    <Icon name={st === "done" ? "fa-check" : st === "active" ? "fa-pen" : "fa-circle"} /> {s}
                  </Pill>
                </li>
              ))}
            </ol>
            <dl className={ui.dl}>
              <dt>Author</dt><dd>{userName("u1")}</dd>
              <dt>Reviewers</dt><dd>Devon Hassan · Marcus Okafor</dd>
              <dt>Due</dt><dd className={ddTone.warn}>Jun 4</dd>
            </dl>
          </Panel>

          <Panel title="Impact (sample data)">
            <dl className={ui.dl}>
              <dt>Customers</dt><dd><span className={toneText.crit}>~3,200</span> failed checkouts</dd>
              <dt>Failed revenue</dt><dd className={ui.mono}>~$84,000</dd>
              <dt>SLA</dt><dd className={ddTone.crit}>Breached · 99.9%</dd>
              <dt>Error budget</dt><dd className={ddTone.warn}>38% spent (mo)</dd>
            </dl>
          </Panel>

          <Panel title="Linked records">
            <div className={ui.tableWrap}>
              <table className={ui.table}>
                <thead><tr><th scope="col">Type</th><th scope="col">Record</th></tr></thead>
                <tbody>
                  <tr><td>Incident</td><td><button type="button" className={monoLink} onClick={() => setRoute("incident-detail")}>INC-48279</button></td></tr>
                  <tr><td>Problem</td><td><button type="button" className={monoLink} onClick={() => setRoute("problems")}>PRB-3912</button></td></tr>
                  <tr><td>Change</td><td><button type="button" className={monoLink} onClick={() => setRoute("changes")}>CHG-2219</button></td></tr>
                  <tr><td>Runbook</td><td><button type="button" className={monoLink} onClick={() => setRoute("runbooks")}>KB-2114</button></td></tr>
                </tbody>
              </table>
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
