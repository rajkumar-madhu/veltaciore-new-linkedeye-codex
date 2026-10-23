// New Change form — the change-create flow, mirroring the incident/problem
// create forms. LinkedEye form layout.
import "@/styles/servicedesk.css";
import React from "react";
import { useNav } from "@/hooks/useNav";
import { SERVICES, USERS } from "@/data/core";
import { Panel, Pill } from "@/components/ld";
import type { Tone } from "@/components/ld";
import { useCreateChange } from "@/api/hooks";

const CATEGORIES = ["Network", "Server", "Firewall", "Kubernetes", "Security", "Trading", "CDN", "Database"];
const CHANGE_TYPES = ["Normal", "Standard", "Emergency"];
const RISKS = ["Low", "Medium", "High"];
const STATES = ["New", "Scheduled", "CAB Review", "Approved", "Implement"];
const SEV_TONE: Record<number, Tone> = { 1: "crit", 2: "warn", 3: "info", 4: "ok" };
const RISK_TONE: Record<string, Tone> = { High: "crit", Medium: "warn", Low: "ok" };

function FormField({ id, label, required, wide, children }: { id?: string; label: string; required?: boolean; wide?: boolean; children: React.ReactNode }) {
  const text = <>{label}{required && <span className="ld-req" aria-hidden="true"> *</span>}</>;
  return (
    <div className={`ld-form-field${wide ? " ld-sd-wide" : ""}`}>
      {id ? <label htmlFor={id}>{text}</label> : <span>{text}</span>}
      {children}
    </div>
  );
}

export default function ChangeNewScreen() {
  const { setRoute } = useNav();
  const idp = React.useId();
  const formId = `${idp}-form`;
  const [priority, setPriority] = React.useState("2");
  const [title, setTitle] = React.useState("");
  const [service, setService] = React.useState("payments-primary");
  const [owner, setOwner] = React.useState("u1");
  const [category, setCategory] = React.useState("Network");
  const [type, setType] = React.useState("Normal");
  const [risk, setRisk] = React.useState("Medium");
  const [state, setState] = React.useState("New");
  const [changeWindow, setChangeWindow] = React.useState("Fri 02:00–04:00 UTC");
  const [plan, setPlan] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const create = useCreateChange();

  const submit = async () => {
    if (!title.trim()) {
      setError("Change summary is required.");
      return;
    }
    setError(null);
    try {
      const created = await create.mutateAsync({
        title: title.trim(),
        caller: USERS.find(u => u.id === owner)?.name ?? "Change Manager",
        pri: parseInt(priority, 10),
        category,
        risk,
        state,
        assignee: USERS.find(u => u.id === owner)?.name ?? null,
      });
      setRoute("changes", { createdChangeId: created.id });
    } catch (e) {
      setError(
        e instanceof Error
          ? `Could not save change (${e.message}). It will appear once the backend is reachable.`
          : "Could not save change.",
      );
    }
  };

  const f = (name: string) => `${idp}-${name}`;
  const priN = parseInt(priority, 10);

  return (
    <div className="ld-dash">
      <nav className="ld-crumbs" aria-label="Breadcrumb">
        <button type="button" className="ld-link" onClick={() => setRoute("dashboard")}>Home</button>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <button type="button" className="ld-link" onClick={() => setRoute("changes")}>Change Management</button>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <span>New Change</span>
      </nav>

      <div className="ld-head">
        <div>
          <h1>Create New Change</h1>
          <p>Fields marked <span className="ld-req">*</span> are required · routes to CAB when risk is High</p>
        </div>
        <div className="ld-head-actions">
          <Pill tone="muted"><i className="fa-solid fa-pen" aria-hidden="true" /> Draft</Pill>
          <Pill tone={RISK_TONE[risk] ?? "muted"}><i className="fa-solid fa-gauge-high" aria-hidden="true" /> {risk} risk</Pill>
          <button type="button" className="ld-btn" onClick={() => setRoute("changes")}><i className="fa-solid fa-xmark" aria-hidden="true" /> Cancel</button>
          <button type="button" className="ld-btn"><i className="fa-solid fa-floppy-disk" aria-hidden="true" /> Save Draft</button>
          <button type="submit" form={formId} className="ld-btn ld-btn-primary" disabled={create.isPending}>
            <i className={`fa-solid ${create.isPending ? "fa-spinner fa-spin" : "fa-paper-plane"}`} aria-hidden="true" /> {create.isPending ? "Saving…" : "Submit change"}
          </button>
        </div>
      </div>

      {error && (
        <div className="ld-card ld-sd-alert ld-sd-alert-crit" role="alert">
          <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> <span>{error}</span>
        </div>
      )}

      <div className="ld-split">
        <form id={formId} className="ld-form ld-rail" noValidate onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <Panel title="Change Details">
            <div className="ld-sd-fields">
              <FormField label="Number"><span className="ld-sd-static ld-mono ld-muted">auto-generated on save</span></FormField>
              <FormField label="Requested by" required><span className="ld-sd-static">priya.r@finspot.in (you)</span></FormField>
              <FormField id={f("title")} label="Summary" required>
                <input id={f("title")} className="ld-input" aria-required="true" aria-invalid={!!error && !title.trim()} placeholder="e.g. Kubernetes control-plane upgrade prod-west" value={title} onChange={e => setTitle(e.target.value)} />
              </FormField>
              <FormField id={f("category")} label="Category" required>
                <select id={f("category")} className="ld-select" value={category} onChange={e => setCategory(e.target.value)}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
              </FormField>
              <FormField id={f("type")} label="Type" required>
                <select id={f("type")} className="ld-select" value={type} onChange={e => setType(e.target.value)}>{CHANGE_TYPES.map(t => <option key={t}>{t}</option>)}</select>
              </FormField>
              <FormField id={f("priority")} label="Priority">
                <select id={f("priority")} className="ld-select" value={priority} onChange={e => setPriority(e.target.value)}>
                  <option value="1">1 — Critical</option>
                  <option value="2">2 — High</option>
                  <option value="3">3 — Moderate</option>
                  <option value="4">4 — Low</option>
                </select>
                <span><Pill tone={SEV_TONE[priN] ?? "muted"}>Sev {priN}</Pill></span>
              </FormField>
            </div>
          </Panel>

          <Panel title="Risk & Scheduling">
            <div className="ld-sd-fields">
              <FormField id={f("risk")} label="Risk" required>
                <select id={f("risk")} className="ld-select" value={risk} onChange={e => setRisk(e.target.value)}>{RISKS.map(r => <option key={r}>{r}</option>)}</select>
              </FormField>
              <FormField id={f("state")} label="Initial state">
                <select id={f("state")} className="ld-select" value={state} onChange={e => setState(e.target.value)}>{STATES.map(s => <option key={s}>{s}</option>)}</select>
              </FormField>
              <FormField id={f("window")} label="Change window">
                <input id={f("window")} className="ld-input" value={changeWindow} onChange={e => setChangeWindow(e.target.value)} />
              </FormField>
              <FormField id={f("service")} label="Affected service / CI">
                <select id={f("service")} className="ld-select" value={service} onChange={e => setService(e.target.value)}>{SERVICES.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}</select>
              </FormField>
              <FormField id={f("owner")} label="Assigned to" required>
                <select id={f("owner")} className="ld-select" value={owner} onChange={e => setOwner(e.target.value)}>{USERS.map(u => <option key={u.id} value={u.id}>{u.name} · {u.team}</option>)}</select>
              </FormField>
              <FormField label="Approval">
                <span className="ld-sd-static">
                  {risk === "High" ? <span className="ld-text-warn">CAB required · meets Fri 14:00 UTC</span> : <span className="ld-text-ok">Standard approval</span>}
                </span>
              </FormField>
            </div>
          </Panel>

          <Panel title="Implementation Plan">
            <FormField id={f("plan")} label="Plan">
              <textarea
                id={f("plan")}
                className="ld-input ld-textarea ld-sd-textarea"
                value={plan}
                onChange={e => setPlan(e.target.value)}
                placeholder="Steps, rollback plan, validation checks, blast-radius notes…"
              />
            </FormField>
            <div className="ld-sd-actions">
              <button type="button" className="ld-btn ld-btn-sm"><i className="fa-solid fa-robot" aria-hidden="true" /> AI: Draft rollback plan</button>
              <button type="button" className="ld-btn ld-btn-sm"><i className="fa-solid fa-paperclip" aria-hidden="true" /> Attach runbook</button>
            </div>
          </Panel>

          <div className="ld-sd-actions ld-sd-actions-end">
            <button type="button" className="ld-btn" onClick={() => setRoute("changes")}>Cancel</button>
            <button type="submit" className="ld-btn ld-btn-primary" disabled={create.isPending}>
              <i className={`fa-solid ${create.isPending ? "fa-spinner fa-spin" : "fa-paper-plane"}`} aria-hidden="true" /> {create.isPending ? "Saving…" : "Submit change"}
            </button>
          </div>
        </form>

        <aside className="ld-rail" aria-label="Preview">
          <Panel title="Change Preview">
            <dl className="ld-dl">
              <dt>Summary</dt><dd><b>{title || "—"}</b></dd>
              <dt>Type / Risk</dt><dd>{type} · <span className={risk === "High" ? "ld-text-crit" : undefined}>{risk}</span></dd>
              <dt>Window</dt><dd>{changeWindow}</dd>
              <dt>Owner</dt><dd>{USERS.find(u => u.id === owner)?.name ?? "—"}</dd>
            </dl>
          </Panel>
          <Panel title="CAB Guidance">
            <p className="ld-muted ld-small">
              {risk === "High"
                ? "High-risk changes require CAB review and a tested rollback plan before implementation."
                : "Standard/low-risk changes can proceed on the pre-approved schedule."}
            </p>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
