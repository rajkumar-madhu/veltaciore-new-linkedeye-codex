// Post-incident review / retrospective (postmortem)
// PagerDuty / Datadog concept: blameless timeline, root cause, action items, review workflow.
// Ported from screens/retro.jsx.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { UserById, FormSection, FormRow, Field } from "@/components/primitives";

export default function RetroScreen() {
  const { setRoute } = useNav();
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const toggle = (id: string) => setCollapsed(c => ({ ...c, [id]: !c[id] }));

  const TIMELINE = [
    { t: "14:02", label: "Detected", who: "prometheus-alertmanager", text: "Error rate on payments-api crossed 5% threshold. Alert fired.", tone: "crit" },
    { t: "14:04", label: "Acknowledged", who: "Priya Raghunathan", text: "On-call ack'd within 2 minutes. Sev-1 declared, war room opened.", tone: "warn" },
    { t: "14:11", label: "Escalated", who: "Escalation policy L2", text: "Database SME paged to investigate connection pool metrics.", tone: "warn" },
    { t: "14:38", label: "Root cause found", who: "Elena Kowalski", text: "Stripe client connection pool exhausted after deploy CHG-2219 raised concurrency.", tone: "info" },
    { t: "14:46", label: "Mitigated", who: "Marcus Okafor", text: "Rolled back CHG-2219 and raised pool ceiling. Error rate recovering.", tone: "ok" },
    { t: "15:03", label: "Resolved", who: "Priya Raghunathan", text: "Payments fully recovered for 15 min. Incident resolved, status page cleared.", tone: "ok" },
  ];
  const toneColor: Record<string, string> = { crit: "#dc2626", warn: "#ea580c", info: "#7c3aed", ok: "#059669" };

  const ACTIONS = [
    { item: "Add connection-pool saturation alert at 70%", owner: "u3", due: "Jun 5", prio: "High", status: "open" },
    { item: "Require load test for concurrency changes in CAB", owner: "u5", due: "Jun 9", prio: "Medium", status: "open" },
    { item: "Add automatic rollback on error-rate spike", owner: "u2", due: "Jun 12", prio: "High", status: "progress" },
    { item: "Document Stripe pool tuning in runbook KB-2114", owner: "u4", due: "Jun 4", prio: "Low", status: "done" },
  ];
  const prioMeta: Record<string, string> = { High: "prio-1", Medium: "prio-2", Low: "state-neutral" };
  const actStatusMeta: Record<string, { cls: string; label: string }> = { open: { cls: "state-active", label: "Open" }, progress: { cls: "state-progress", label: "In progress" }, done: { cls: "svc-healthy", label: "Done" } };

  const WELL = ["On-call acknowledged in 2 min — well under target", "War room + status page spun up automatically", "Clean rollback path existed for the bad change"];
  const WRONG = ["No alert on connection-pool saturation — detected by symptom", "Concurrency change shipped without a load test", "Manual rollback added ~8 min to mitigation"];

  return (
    <div className="page page-fade sn-dash">
      <div className="sn-breadcrumb">
        <a className="sn-link">Home</a><span className="sn-bc-sep">›</span>
        <a className="sn-link" onClick={() => setRoute("incidents")}>Incidents</a><span className="sn-bc-sep">›</span>
        <a className="sn-link" onClick={() => setRoute("incident-detail")}>INC-48279</a><span className="sn-bc-sep">›</span>
        <span>Retrospective</span>
      </div>

      <div className="sn-form-header">
        <div className="sn-form-title-row">
          <span className="sn-rec-number">PIR-48279</span>
          <span className="sn-pill prio-1"><i className="fa-solid fa-circle" /> Sev-1</span>
          <span className="sn-pill svc-healthy"><i className="fa-solid fa-circle-check" /> Resolved</span>
          <span className="sn-pill state-progress"><i className="fa-solid fa-pen" /> Review: Draft</span>
        </div>
        <div className="sn-form-title-meta">
          <div>
            <h1>Post-Incident Review — Payments connection pool exhaustion</h1>
            <div className="sn-form-sub">INC-48279 · Jun 1, 2026 · 61 min duration · blameless retrospective · 4 contributors</div>
          </div>
          <div className="sn-form-actions">
            <button className="sn-btn"><i className="fa-solid fa-file-pdf" /> Export PDF</button>
            <button className="sn-btn"><i className="fa-solid fa-share-nodes" /> Share</button>
            <button className="sn-btn primary"><i className="fa-solid fa-circle-check" /> Publish review</button>
          </div>
        </div>
      </div>

      <div className="sn-kpi-strip">
        <div className="sn-kpi tone-ok"><div className="sn-kpi-l">Time to detect</div><div className="sn-kpi-v">2m</div><div className="sn-kpi-s">alert fired fast</div></div>
        <div className="sn-kpi tone-ok"><div className="sn-kpi-l">Time to ack</div><div className="sn-kpi-v">2m</div><div className="sn-kpi-s">within target</div></div>
        <div className="sn-kpi tone-warn"><div className="sn-kpi-l">Time to mitigate</div><div className="sn-kpi-v">44m</div><div className="sn-kpi-s">manual rollback</div></div>
        <div className="sn-kpi tone-warn"><div className="sn-kpi-l">Time to resolve</div><div className="sn-kpi-v">61m</div><div className="sn-kpi-s">end to end</div></div>
        <div className="sn-kpi tone-crit"><div className="sn-kpi-l">Customer impact</div><div className="sn-kpi-v">~3.2k</div><div className="sn-kpi-s">failed checkouts</div></div>
        <div className="sn-kpi tone-neutral"><div className="sn-kpi-l">Action items</div><div className="sn-kpi-v">4</div><div className="sn-kpi-s">3 open</div></div>
      </div>

      <div className="sn-form-layout">
        <div className="sn-form-main">
          <FormSection id="summary" title="Summary" collapsed={collapsed.summary} onToggle={toggle}>
            <FormRow>
              <Field label="Severity" value={<span className="sn-pill prio-1" style={{ display: "inline-flex" }}><i className="fa-solid fa-circle" /> Sev-1</span>} required />
              <Field label="Duration" value={<span><b>61 min</b> · 14:02–15:03 UTC</span>} />
            </FormRow>
            <FormRow>
              <Field label="Affected services" value={<span className="mono">payments-api, checkout-web</span>} required />
              <Field label="Incident commander" value={<UserById id="u1" />} />
            </FormRow>
            <FormRow>
              <Field label="Trigger" value={<a className="sn-link">CHG-2219 · concurrency increase</a>} />
              <Field label="Customers affected" value={<span className="tone-crit"><b>~3,200</b> failed checkouts</span>} />
            </FormRow>
            <div style={{ padding: "4px 14px 14px" }}>
              <div className="retro-narrative">
                A routine change (CHG-2219) increased request concurrency on the payments service. The Stripe client connection
                pool was sized for the old concurrency and became exhausted under production load, causing a cascade of failed
                payment requests. Detection was fast, but mitigation required a manual rollback that added avoidable minutes.
              </div>
            </div>
          </FormSection>

          <FormSection id="timeline" title="Incident timeline" badge={`${TIMELINE.length} events`} collapsed={collapsed.timeline} onToggle={toggle}>
            <div className="retro-tl">
              {TIMELINE.map((e, i) => (
                <div key={i} className="retro-tl-item">
                  <div className="retro-tl-time mono">{e.t}</div>
                  <div className="retro-tl-rail"><span className="retro-tl-dot" style={{ background: toneColor[e.tone] }} />{i < TIMELINE.length - 1 && <span className="retro-tl-line" />}</div>
                  <div className="retro-tl-body">
                    <div className="retro-tl-label" style={{ color: toneColor[e.tone] }}>{e.label}</div>
                    <div className="retro-tl-text">{e.text}</div>
                    <div className="retro-tl-who text-mute"><i className="fa-regular fa-user" /> {e.who}</div>
                  </div>
                </div>
              ))}
            </div>
          </FormSection>

          <FormSection id="rca" title="Root cause analysis" collapsed={collapsed.rca} onToggle={toggle}>
            <div style={{ padding: 14 }}>
              <div className="retro-5whys">
                {[
                  ["Why did checkouts fail?", "The payments service returned errors on most requests."],
                  ["Why did it error?", "Requests to Stripe timed out waiting for a connection."],
                  ["Why did they wait?", "The client connection pool was fully saturated."],
                  ["Why was it saturated?", "Concurrency was raised by CHG-2219 beyond the pool ceiling."],
                  ["Why wasn't it caught?", "No saturation alert existed and the change skipped load testing."],
                ].map(([q, a], i) => (
                  <div key={i} className="retro-why">
                    <span className="retro-why-n">{i + 1}</span>
                    <div><div className="retro-why-q">{q}</div><div className="retro-why-a text-mute">{a}</div></div>
                  </div>
                ))}
              </div>
            </div>
          </FormSection>

          <FormSection id="learn" title="What went well / what to improve" collapsed={collapsed.learn} onToggle={toggle}>
            <div className="retro-2col">
              <div className="retro-col">
                <div className="retro-col-head good"><i className="fa-solid fa-thumbs-up" /> What went well</div>
                {WELL.map((x, i) => <div key={i} className="retro-li"><i className="fa-solid fa-check" style={{ color: "#059669" }} /> {x}</div>)}
              </div>
              <div className="retro-col">
                <div className="retro-col-head bad"><i className="fa-solid fa-triangle-exclamation" /> What to improve</div>
                {WRONG.map((x, i) => <div key={i} className="retro-li"><i className="fa-solid fa-xmark" style={{ color: "#dc2626" }} /> {x}</div>)}
              </div>
            </div>
          </FormSection>

          <FormSection id="actions" title="Action items" badge={`${ACTIONS.filter(a => a.status !== "done").length} open`} collapsed={collapsed.actions} onToggle={toggle}>
            <table className="sn-list-table">
              <thead><tr><th>Action</th><th style={{ width: 150 }}>Owner</th><th style={{ width: 90 }}>Due</th><th style={{ width: 100 }}>Priority</th><th style={{ width: 120 }}>Status</th></tr></thead>
              <tbody>
                {ACTIONS.map((a, i) => {
                  const st = actStatusMeta[a.status];
                  return (
                    <tr key={i}>
                      <td><b>{a.item}</b></td>
                      <td><UserById id={a.owner} /></td>
                      <td className="mono text-mute">{a.due}</td>
                      <td><span className={`sn-pill ${prioMeta[a.prio]}`} style={{ display: "inline-flex" }}>{a.prio}</span></td>
                      <td><span className={`sn-state-pill ${st.cls}`}><i className="fa-solid fa-circle" /> {st.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </FormSection>
        </div>

        <aside className="sn-form-side">
          <div className="sn-side-card">
            <div className="sn-side-head">Review status</div>
            <div className="sn-side-body">
              <div className="retro-stages">
                {[["Draft", "done"], ["In review", "active"], ["Approved", "todo"], ["Published", "todo"]].map(([s, st], i) => (
                  <div key={s} className={`retro-stage ${st}`}>
                    <span className="retro-stage-dot"><i className={`fa-solid ${st === "done" ? "fa-check" : st === "active" ? "fa-pen" : "fa-circle"}`} /></span>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
              <Field label="Author" value={<UserById id="u1" />} />
              <Field label="Reviewers" value="Devon Hassan · Marcus Okafor" />
              <Field label="Due" value={<span className="tone-warn">Jun 4 (3 days)</span>} />
            </div>
          </div>

          <div className="sn-side-card">
            <div className="sn-side-head">Impact</div>
            <div className="sn-side-body">
              <Field label="Customers" value={<span className="tone-crit"><b>~3,200</b> affected</span>} />
              <Field label="Failed revenue" value={<span className="mono">~$84,000</span>} />
              <Field label="SLA" value={<span className="tone-crit">Breached · 99.9%</span>} />
              <Field label="Error budget" value={<span className="tone-warn">38% spent (mo)</span>} />
            </div>
          </div>

          <div className="sn-side-card">
            <div className="sn-side-head">Linked records</div>
            <div className="sn-side-body">
              <Field label="Incident" value={<a className="sn-link mono" onClick={() => setRoute("incident-detail")}>INC-48279</a>} />
              <Field label="Problem" value={<a className="sn-link mono" onClick={() => setRoute("problems")}>PRB-3912</a>} />
              <Field label="Change" value={<a className="sn-link mono" onClick={() => setRoute("changes")}>CHG-2219</a>} />
              <Field label="Runbook" value={<a className="sn-link mono" onClick={() => setRoute("runbooks")}>KB-2114</a>} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
