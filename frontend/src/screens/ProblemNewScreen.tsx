// New Problem form (ServiceNow style).
// Ported from screens/problem-new.jsx.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { INCIDENTS, SERVICES, USERS } from "@/data/core";
import { FormSection, FormRow, Field, Sev } from "@/components/primitives";
import { useCreateProblem } from "@/api/hooks";

export default function ProblemNewScreen() {
  const { setRoute } = useNav();
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const toggle = (id: string) => setCollapsed(c => ({ ...c, [id]: !c[id] }));
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

  return (
    <div className="page page-fade sn-dash">
      <div className="sn-breadcrumb">
        <a className="sn-link">Home</a><span className="sn-bc-sep">›</span>
        <a className="sn-link" onClick={() => setRoute("problems")}>Problem Management</a><span className="sn-bc-sep">›</span>
        <span>New Problem</span>
      </div>

      <div className="sn-form-header">
        <div className="sn-form-title-row">
          <span className="sn-rec-number">PRB-NEW</span>
          <span className="sn-pill state-progress"><i className="fa-solid fa-spinner fa-spin" /> Draft</span>
          <span className="sn-pill state-neutral"><i className="fa-solid fa-pen" /> not yet saved</span>
        </div>
        <div className="sn-form-title-meta">
          <div>
            <h1>Create New Problem</h1>
            <div className="sn-form-sub">Required fields marked with *  ·  Link recurring incidents to track root cause</div>
            {error && (
              <div className="sn-form-sub" style={{ color: "var(--critical)", marginTop: 4 }}>
                <i className="fa-solid fa-triangle-exclamation" /> {error}
              </div>
            )}
          </div>
          <div className="sn-form-actions">
            <button className="sn-btn" onClick={() => setRoute("problems")}><i className="fa-solid fa-xmark" /> Cancel</button>
            <button className="sn-btn"><i className="fa-solid fa-floppy-disk" /> Save Draft</button>
            <button className="sn-btn primary" onClick={submit} disabled={create.isPending}>
              <i className={`fa-solid ${create.isPending ? "fa-spinner fa-spin" : "fa-paper-plane"}`} /> {create.isPending ? "Saving…" : "Submit"}
            </button>
          </div>
        </div>
      </div>

      <div className="sn-form-layout">
        <div className="sn-form-main">
          <FormSection id="basic" title="Problem Identification" collapsed={collapsed.basic} onToggle={toggle}>
            <FormRow>
              <Field label="Number" value={<span className="mono text-mute">auto-generated on save</span>} />
              <Field label="Opened" value={<span className="mono">just now</span>} />
            </FormRow>
            <FormRow>
              <Field label="Short description" value={<input className="select" placeholder="e.g. Connection pool sizing regression" value={title} onChange={e => setTitle(e.target.value)} style={{ width: "100%" }} />} required />
              <Field label="Category" value={
                <select className="select" value={category} onChange={e => setCategory(e.target.value)}>
                  <option>Database · Capacity</option>
                  <option>Network · Routing</option>
                  <option>Application · Deploy</option>
                  <option>Hardware · Storage</option>
                  <option>External · Vendor</option>
                </select>
              } required />
            </FormRow>
            <FormRow>
              <Field label="Priority" value={
                <select className="select" value={priority} onChange={e => setPriority(e.target.value)}>
                  <option value="1">1 — Critical · org-wide impact</option>
                  <option value="2">2 — High · major service</option>
                  <option value="3">3 — Moderate · limited</option>
                  <option value="4">4 — Low · backlog</option>
                </select>
              } required />
              <Field label="Severity badge" value={<Sev n={parseInt(priority)} />} />
            </FormRow>
            <FormRow>
              <Field label="Service / CI" value={
                <select className="select" value={service} onChange={e => setService(e.target.value)}>
                  {SERVICES.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                </select>
              } required />
              <Field label="Configuration item" value={<a className="sn-link mono">CI-02 (auto-linked)</a>} />
            </FormRow>
          </FormSection>

          <FormSection id="assign" title="Assignment" collapsed={collapsed.assign} onToggle={toggle}>
            <FormRow>
              <Field label="Owner" value={
                <select className="select" value={owner} onChange={e => setOwner(e.target.value)}>
                  {USERS.map(u => <option key={u.id} value={u.id}>{u.name} · {u.team}</option>)}
                </select>
              } required />
              <Field label="Assignment group" value={<select className="select"><option>SRE Platform</option><option>Database</option><option>Networking</option><option>Architecture</option></select>} required />
            </FormRow>
            <FormRow>
              <Field label="Target RCA date" value={<input className="select" type="date" defaultValue="2026-06-15" style={{ width: "100%" }} />} />
              <Field label="Impact" value={<select className="select"><option>High · multi-tenant</option><option>Medium · single BU</option><option>Low · internal</option></select>} />
            </FormRow>
          </FormSection>

          <FormSection id="linked" title="Linked Incidents" badge={`${linkedInc.length} selected`} collapsed={collapsed.linked} onToggle={toggle}>
            <table className="sn-list-table">
              <thead><tr><th style={{width:30}}></th><th style={{width:110}}>Number</th><th>Short description</th><th style={{width:80}}>Sev</th><th style={{width:100}}>Age</th></tr></thead>
              <tbody>
                {INCIDENTS.slice(0, 6).map(inc => {
                  const checked = linkedInc.includes(inc.id);
                  return (
                    <tr key={inc.id} onClick={() => setLinkedInc(checked ? linkedInc.filter(x => x !== inc.id) : [...linkedInc, inc.id])} style={{ cursor: "pointer", background: checked ? "#eaf0f7" : undefined }}>
                      <td><input type="checkbox" checked={checked} onChange={() => {}} /></td>
                      <td><a className="sn-link mono">{inc.id}</a></td>
                      <td>{inc.title}</td>
                      <td><Sev n={inc.sev} /></td>
                      <td className="mono text-mute">{inc.age}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </FormSection>

          <FormSection id="hypothesis" title="Initial Hypothesis" collapsed={collapsed.hypothesis} onToggle={toggle}>
            <div style={{ padding: 14 }}>
              <textarea
                value={hypothesis}
                onChange={e => setHypothesis(e.target.value)}
                placeholder="What pattern do you observe across linked incidents? Common timing, deploys, traffic conditions…"
                style={{ width: "100%", minHeight: 100, padding: 10, fontSize: 12.5, fontFamily: "var(--font-sans)", border: "1px solid #d2d6dc", borderRadius: 3 }}
              />
              <div className="row row-8" style={{ marginTop: 8 }}>
                <button className="sn-btn"><i className="fa-solid fa-robot" /> AI: Suggest Hypothesis</button>
                <button className="sn-btn"><i className="fa-solid fa-paperclip" /> Attach Evidence</button>
              </div>
            </div>
          </FormSection>
        </div>

        <aside className="sn-form-side">
          <div className="sn-side-card">
            <div className="sn-side-head">AI Pattern Match</div>
            <div className="sn-side-body" style={{ padding: 14, fontSize: 12.5, lineHeight: 1.6, color: "#000" }}>
              {linkedInc.length > 1 ? (
                <>The {linkedInc.length} linked incidents share <b>{service}</b> and occur post-deploy. Likely <b>config regression</b>. <a className="sn-link">View timeline →</a></>
              ) : (
                <span className="text-mute">Link 2+ incidents to detect patterns.</span>
              )}
            </div>
          </div>
          <div className="sn-side-card">
            <div className="sn-side-head">Workflow</div>
            <div className="sn-side-body">
              <Field label="Stage" value={<span className="sn-state-pill state-mitigating"><i className="fa-solid fa-circle" /> Assessment</span>} />
              <Field label="Next" value="Root Cause Analysis" />
              <Field label="SLA" value="5 business days" />
              <Field label="Auto-promote" value={<label style={{ fontSize: 12 }}><input type="checkbox" defaultChecked /> If 3+ incidents</label>} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
