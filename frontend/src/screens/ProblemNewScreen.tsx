// New Problem form.
// Ported from screens/problem-new.jsx; LinkedEye form layout.
import "@/styles/servicedesk.css";
import React from "react";
import { useNav } from "@/hooks/useNav";
import { INCIDENTS, SERVICES, USERS } from "@/data/core";
import { Panel, Pill } from "@/components/ld";
import type { Tone } from "@/components/ld";
import { useCreateProblem } from "@/api/hooks";

import { Icon } from "@/components/Icon";
import { BotIcon, ChevronRightIcon, PaperclipIcon, PencilIcon, SaveIcon, TriangleAlertIcon, XIcon } from "lucide-react";
const SEV_TONE: Record<number, Tone> = { 1: "crit", 2: "warn", 3: "info", 4: "ok" };

function FormField({ id, label, required, wide, children }: { id?: string; label: string; required?: boolean; wide?: boolean; children: React.ReactNode }) {
  const text = <>{label}{required && <span className="ld-req" aria-hidden="true"> *</span>}</>;
  return (
    <div className={`ld-form-field${wide ? " ld-sd-wide" : ""}`}>
      {id ? <label htmlFor={id}>{text}</label> : <span>{text}</span>}
      {children}
    </div>
  );
}

export default function ProblemNewScreen() {
  const { setRoute } = useNav();
  const idp = React.useId();
  const formId = `${idp}-form`;
  const [priority, setPriority] = React.useState("2");
  const [title, setTitle] = React.useState("");
  const [service, setService] = React.useState("payments-primary");
  const [owner, setOwner] = React.useState("u2");
  const [category, setCategory] = React.useState("Database · Capacity");
  const [hypothesis, setHypothesis] = React.useState("");
  const [linkedInc, setLinkedInc] = React.useState<string[]>([INCIDENTS[0].id]);
  const [error, setError] = React.useState<string | null>(null);

  const create = useCreateProblem();

  const submit = async () => {
    if (!title.trim()) {
      setError("Problem statement is required.");
      return;
    }
    setError(null);
    try {
      const created = await create.mutateAsync({
        title: title.trim(),
        caller: USERS.find(u => u.id === owner)?.name ?? "Problem Manager",
        pri: parseInt(priority, 10),
        category,
        assignee: USERS.find(u => u.id === owner)?.name ?? null,
        state: "New",
      });
      setRoute("problems", { createdProblemId: created.id });
    } catch (e) {
      setError(
        e instanceof Error
          ? `Could not save problem (${e.message}). It will appear once the backend is reachable.`
          : "Could not save problem.",
      );
    }
  };

  const f = (name: string) => `${idp}-${name}`;
  const priN = parseInt(priority, 10);

  return (
    <div className="ld-dash">
      <nav className="ld-crumbs" aria-label="Breadcrumb">
        <button type="button" className="ld-link" onClick={() => setRoute("dashboard")}>Home</button>
        <Icon icon={ChevronRightIcon} />
        <button type="button" className="ld-link" onClick={() => setRoute("problems")}>Problem Management</button>
        <Icon icon={ChevronRightIcon} />
        <span>New Problem</span>
      </nav>

      <div className="ld-head">
        <div>
          <h1>Create New Problem</h1>
          <p>Fields marked <span className="ld-req">*</span> are required · link recurring incidents to track root cause</p>
        </div>
        <div className="ld-head-actions">
          <Pill tone="muted"><Icon icon={PencilIcon} /> Draft · not yet saved</Pill>
          <button type="button" className="ld-btn" onClick={() => setRoute("problems")}><Icon icon={XIcon} /> Cancel</button>
          <button type="button" className="ld-btn"><Icon icon={SaveIcon} /> Save Draft</button>
          <button type="submit" form={formId} className="ld-btn ld-btn-primary" disabled={create.isPending}>
            <Icon className={`fa-solid ${create.isPending ? "fa-spinner fa-spin" : "fa-paper-plane"}`} /> {create.isPending ? "Saving…" : "Submit problem"}
          </button>
        </div>
      </div>

      {error && (
        <div className="ld-card ld-sd-alert ld-sd-alert-crit" role="alert">
          <Icon icon={TriangleAlertIcon} /> <span>{error}</span>
        </div>
      )}

      <div className="ld-split">
        <form id={formId} className="ld-form ld-rail" noValidate onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <Panel title="Problem Identification">
            <div className="ld-sd-fields">
              <FormField label="Number"><span className="ld-sd-static ld-mono ld-muted">auto-generated on save</span></FormField>
              <FormField label="Opened"><span className="ld-sd-static ld-mono">just now</span></FormField>
              <FormField id={f("title")} label="Short description" required>
                <input id={f("title")} className="ld-input" aria-required="true" aria-invalid={!!error && !title.trim()} placeholder="e.g. Connection pool sizing regression" value={title} onChange={e => setTitle(e.target.value)} />
              </FormField>
              <FormField id={f("category")} label="Category" required>
                <select id={f("category")} className="ld-select" value={category} onChange={e => setCategory(e.target.value)}>
                  <option>Database · Capacity</option>
                  <option>Network · Routing</option>
                  <option>Application · Deploy</option>
                  <option>Hardware · Storage</option>
                  <option>External · Vendor</option>
                </select>
              </FormField>
              <FormField id={f("priority")} label="Priority" required>
                <select id={f("priority")} className="ld-select" value={priority} onChange={e => setPriority(e.target.value)}>
                  <option value="1">1 — Critical · org-wide impact</option>
                  <option value="2">2 — High · major service</option>
                  <option value="3">3 — Moderate · limited</option>
                  <option value="4">4 — Low · backlog</option>
                </select>
              </FormField>
              <FormField label="Severity badge"><span className="ld-sd-static"><Pill tone={SEV_TONE[priN] ?? "muted"}>Sev {priN}</Pill></span></FormField>
              <FormField id={f("service")} label="Service / CI" required>
                <select id={f("service")} className="ld-select" value={service} onChange={e => setService(e.target.value)}>
                  {SERVICES.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                </select>
              </FormField>
              <FormField label="Configuration item"><span className="ld-sd-static ld-mono">CI-02 (auto-linked)</span></FormField>
            </div>
          </Panel>

          <Panel title="Assignment">
            <div className="ld-sd-fields">
              <FormField id={f("owner")} label="Owner" required>
                <select id={f("owner")} className="ld-select" value={owner} onChange={e => setOwner(e.target.value)}>
                  {USERS.map(u => <option key={u.id} value={u.id}>{u.name} · {u.team}</option>)}
                </select>
              </FormField>
              <FormField id={f("group")} label="Assignment group" required>
                <select id={f("group")} className="ld-select"><option>SRE Platform</option><option>Database</option><option>Networking</option><option>Architecture</option></select>
              </FormField>
              <FormField id={f("rca")} label="Target RCA date">
                <input id={f("rca")} className="ld-input" type="date" defaultValue="2026-06-15" />
              </FormField>
              <FormField id={f("impact")} label="Impact">
                <select id={f("impact")} className="ld-select"><option>High · multi-tenant</option><option>Medium · single BU</option><option>Low · internal</option></select>
              </FormField>
            </div>
          </Panel>

          <Panel title={`Linked Incidents (${linkedInc.length} selected)`}>
            <div className="ld-table-wrap">
              <table className="ld-table">
                <thead>
                  <tr><th scope="col"><span className="sr-only">Link</span></th><th scope="col">Number</th><th scope="col">Short description</th><th scope="col">Sev</th><th scope="col">Age</th></tr>
                </thead>
                <tbody>
                  {INCIDENTS.slice(0, 6).map(inc => {
                    const checked = linkedInc.includes(inc.id);
                    return (
                      <tr key={inc.id} className={checked ? "ld-row-selected" : undefined}>
                        <td>
                          <input
                            type="checkbox"
                            aria-label={`Link ${inc.id}`}
                            checked={checked}
                            onChange={() => setLinkedInc(checked ? linkedInc.filter(x => x !== inc.id) : [...linkedInc, inc.id])}
                          />
                        </td>
                        <td className="ld-mono">{inc.id}</td>
                        <td className="ld-wrap">{inc.title}</td>
                        <td><Pill tone={SEV_TONE[inc.sev] ?? "muted"}>Sev {inc.sev}</Pill></td>
                        <td className="ld-mono ld-muted">{inc.age}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Initial Hypothesis">
            <FormField id={f("hypothesis")} label="Hypothesis">
              <textarea
                id={f("hypothesis")}
                className="ld-input ld-textarea ld-sd-textarea"
                value={hypothesis}
                onChange={e => setHypothesis(e.target.value)}
                placeholder="What pattern do you observe across linked incidents? Common timing, deploys, traffic conditions…"
              />
            </FormField>
            <div className="ld-sd-actions">
              <button type="button" className="ld-btn ld-btn-sm"><Icon icon={BotIcon} /> AI: Suggest Hypothesis</button>
              <button type="button" className="ld-btn ld-btn-sm"><Icon icon={PaperclipIcon} /> Attach Evidence</button>
            </div>
          </Panel>

          <div className="ld-sd-actions ld-sd-actions-end">
            <button type="button" className="ld-btn" onClick={() => setRoute("problems")}>Cancel</button>
            <button type="submit" className="ld-btn ld-btn-primary" disabled={create.isPending}>
              <Icon className={`fa-solid ${create.isPending ? "fa-spinner fa-spin" : "fa-paper-plane"}`} /> {create.isPending ? "Saving…" : "Submit problem"}
            </button>
          </div>
        </form>

        <aside className="ld-rail" aria-label="Guidance">
          <Panel title="AI Pattern Match">
            {linkedInc.length > 1 ? (
              <p className="ld-sd-entry-text">The {linkedInc.length} linked incidents share <b>{service}</b> and occur post-deploy. Likely <b>config regression</b>.</p>
            ) : (
              <p className="ld-muted ld-small">Link 2+ incidents to detect patterns.</p>
            )}
          </Panel>
          <Panel title="Workflow">
            <dl className="ld-dl">
              <dt>Stage</dt><dd><Pill tone="warn"><span className="ld-pill-dot" />Assessment</Pill></dd>
              <dt>Next</dt><dd>Root Cause Analysis</dd>
              <dt>SLA</dt><dd>5 business days</dd>
              <dt>Auto-promote</dt><dd><label className="ld-sd-check"><input type="checkbox" defaultChecked /> If 3+ incidents</label></dd>
            </dl>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
