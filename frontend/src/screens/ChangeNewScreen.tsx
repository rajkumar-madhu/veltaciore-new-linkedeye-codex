// New Change form (ServiceNow style) — net-new screen for the change-create
// flow, mirroring the incident/problem create forms.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { SERVICES, USERS } from "@/data/core";
import { FormSection, FormRow, Field, Sev } from "@/components/primitives";
import { useCreateChange } from "@/api/hooks";

const CATEGORIES = ["Network", "Server", "Firewall", "Kubernetes", "Security", "Trading", "CDN", "Database"];
const CHANGE_TYPES = ["Normal", "Standard", "Emergency"];
const RISKS = ["Low", "Medium", "High"];
const STATES = ["New", "Scheduled", "CAB Review", "Approved", "Implement"];

export default function ChangeNewScreen() {
  const { setRoute } = useNav();
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const toggle = (id: string) => setCollapsed(c => ({ ...c, [id]: !c[id] }));
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

  return (
    <div className="page page-fade sn-dash">
      <div className="sn-breadcrumb">
        <a className="sn-link">Home</a><span className="sn-bc-sep">›</span>
        <a className="sn-link" onClick={() => setRoute("changes")}>Change Management</a><span className="sn-bc-sep">›</span>
        <span>New Change</span>
      </div>

      <div className="sn-form-header">
        <div className="sn-form-title-row">
          <span className="sn-rec-number">CHG-NEW</span>
          <span className="sn-pill state-progress"><i className="fa-solid fa-spinner fa-spin" /> Draft</span>
          <span className={`sn-pill ${risk === "High" ? "prio-1" : "state-neutral"}`}><i className="fa-solid fa-gauge-high" /> {risk} risk</span>
        </div>
        <div className="sn-form-title-meta">
          <div>
            <h1>Create New Change</h1>
            <div className="sn-form-sub">Required fields marked with *  ·  Routes to CAB when risk is High</div>
            {error && (
              <div className="sn-form-sub" style={{ color: "var(--critical)", marginTop: 4 }}>
                <i className="fa-solid fa-triangle-exclamation" /> {error}
              </div>
            )}
          </div>
          <div className="sn-form-actions">
            <button className="sn-btn" onClick={() => setRoute("changes")}><i className="fa-solid fa-xmark" /> Cancel</button>
            <button className="sn-btn"><i className="fa-solid fa-floppy-disk" /> Save Draft</button>
            <button className="sn-btn primary" onClick={submit} disabled={create.isPending}>
              <i className={`fa-solid ${create.isPending ? "fa-spinner fa-spin" : "fa-paper-plane"}`} /> {create.isPending ? "Saving…" : "Submit"}
            </button>
          </div>
        </div>
      </div>

      <div className="sn-form-layout">
        <div className="sn-form-main">
          <FormSection id="basic" title="Change Details" collapsed={collapsed.basic} onToggle={toggle}>
            <FormRow>
              <Field label="Number" value={<span className="mono text-mute">auto-generated on save</span>} />
              <Field label="Requested by" value={<span><a className="sn-link">priya.r@finspot.in</a> (you)</span>} required />
            </FormRow>
            <FormRow>
              <Field label="Summary" value={<input className="select" placeholder="e.g. Kubernetes control-plane upgrade prod-west" value={title} onChange={e => setTitle(e.target.value)} style={{ width: "100%" }} />} required />
              <Field label="Category" value={<select className="select" value={category} onChange={e => setCategory(e.target.value)}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>} required />
            </FormRow>
            <FormRow>
              <Field label="Type" value={<select className="select" value={type} onChange={e => setType(e.target.value)}>{CHANGE_TYPES.map(t => <option key={t}>{t}</option>)}</select>} required />
              <Field label="Priority" value={
                <span className="row row-8">
                  <select className="select" value={priority} onChange={e => setPriority(e.target.value)}>
                    <option value="1">1 — Critical</option>
                    <option value="2">2 — High</option>
                    <option value="3">3 — Moderate</option>
                    <option value="4">4 — Low</option>
                  </select>
                  <Sev n={parseInt(priority, 10)} />
                </span>
              } />
            </FormRow>
          </FormSection>

          <FormSection id="risk" title="Risk & Scheduling" collapsed={collapsed.risk} onToggle={toggle}>
            <FormRow>
              <Field label="Risk" value={<select className="select" value={risk} onChange={e => setRisk(e.target.value)}>{RISKS.map(r => <option key={r}>{r}</option>)}</select>} required />
              <Field label="Initial state" value={<select className="select" value={state} onChange={e => setState(e.target.value)}>{STATES.map(s => <option key={s}>{s}</option>)}</select>} />
            </FormRow>
            <FormRow>
              <Field label="Change window" value={<input className="select" value={changeWindow} onChange={e => setChangeWindow(e.target.value)} style={{ width: "100%" }} />} />
              <Field label="Affected service / CI" value={<select className="select" value={service} onChange={e => setService(e.target.value)}>{SERVICES.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}</select>} />
            </FormRow>
            <FormRow>
              <Field label="Assigned to" value={<select className="select" value={owner} onChange={e => setOwner(e.target.value)}>{USERS.map(u => <option key={u.id} value={u.id}>{u.name} · {u.team}</option>)}</select>} required />
              <Field label="Approval" value={risk === "High" ? <span className="tone-warn"><b>CAB required</b> · meets Fri 14:00 UTC</span> : <span className="tone-ok">Standard approval</span>} />
            </FormRow>
          </FormSection>

          <FormSection id="plan" title="Implementation Plan" collapsed={collapsed.plan} onToggle={toggle}>
            <div style={{ padding: 14 }}>
              <textarea
                value={plan}
                onChange={e => setPlan(e.target.value)}
                placeholder="Steps, rollback plan, validation checks, blast-radius notes…"
                style={{ width: "100%", minHeight: 120, padding: 10, fontSize: 12.5, fontFamily: "var(--font-sans)", border: "1px solid #d2d6dc", borderRadius: 3 }}
              />
              <div className="row row-8" style={{ marginTop: 8 }}>
                <button className="sn-btn"><i className="fa-solid fa-robot" /> AI: Draft rollback plan</button>
                <button className="sn-btn"><i className="fa-solid fa-paperclip" /> Attach runbook</button>
              </div>
            </div>
          </FormSection>
        </div>

        <aside className="sn-form-side">
          <div className="sn-side-card">
            <div className="sn-side-head">Change Preview</div>
            <div className="sn-side-body">
              <Field label="Summary" value={<b>{title || "—"}</b>} />
              <Field label="Type / Risk" value={<span>{type} · <b className={risk === "High" ? "tone-crit" : ""}>{risk}</b></span>} />
              <Field label="Window" value={changeWindow} />
              <Field label="Owner" value={USERS.find(u => u.id === owner)?.name ?? "—"} />
            </div>
          </div>
          <div className="sn-side-card">
            <div className="sn-side-head">CAB Guidance</div>
            <div className="sn-side-body" style={{ padding: 14, fontSize: 12.5, lineHeight: 1.6, color: "var(--fg-muted)" }}>
              {risk === "High"
                ? "High-risk changes require CAB review and a tested rollback plan before implementation."
                : "Standard/low-risk changes can proceed on the pre-approved schedule."}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
