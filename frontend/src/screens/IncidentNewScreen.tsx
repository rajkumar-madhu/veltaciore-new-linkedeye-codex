// New Incident form (ServiceNow style)
// Ported from screens/incident-new.jsx.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { TENANTS, USERS, SERVICES } from "@/data/core";
import { Avatar, Sev, FormSection, FormRow, Field } from "@/components/primitives";
import { useCreateIncident } from "@/api/hooks";

export default function IncidentNewScreen() {
  const { setRoute } = useNav();
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const toggle = (id: string) => setCollapsed(c => ({ ...c, [id]: !c[id] }));
  const [sev, setSev] = React.useState("2");
  const [title, setTitle] = React.useState("");
  const [service, setService] = React.useState("checkout-api");
  const [assignee, setAssignee] = React.useState("u1");
  const [tenant, setTenant] = React.useState(TENANTS[0].id);
  const [desc, setDesc] = React.useState("");
  const [category, setCategory] = React.useState("Database");
  const [group, setGroup] = React.useState("SRE Platform");
  const [error, setError] = React.useState<string | null>(null);

  const create = useCreateIncident();

  const submit = async () => {
    if (!title.trim()) {
      setError("Short description is required.");
      return;
    }
    setError(null);
    try {
      const created = await create.mutateAsync({
        title: title.trim(),
        caller: "priya.r@finspot.in",
        pri: parseInt(sev, 10),
        category,
        group,
        assignee: USERS.find(u => u.id === assignee)?.name ?? null,
        state: "New",
      });
      // Land on the list, where the new record is now present.
      setRoute("incidents", { createdIncidentId: created.id });
    } catch (e) {
      setError(
        e instanceof Error
          ? `Could not save incident (${e.message}). It will still appear once the backend is reachable.`
          : "Could not save incident.",
      );
    }
  };

  return (
    <div className="page page-fade sn-dash">
      <div className="sn-breadcrumb">
        <a className="sn-link">Home</a><span className="sn-bc-sep">›</span>
        <a className="sn-link" onClick={() => setRoute("incidents")}>Incident Management</a><span className="sn-bc-sep">›</span>
        <span>New Incident</span>
      </div>

      <div className="sn-form-header">
        <div className="sn-form-title-row">
          <span className="sn-rec-number">INC-NEW</span>
          <span className="sn-pill state-progress"><i className="fa-solid fa-spinner fa-spin" /> Draft</span>
          <span className="sn-pill state-neutral"><i className="fa-solid fa-pen" /> not yet saved</span>
        </div>
        <div className="sn-form-title-meta">
          <div>
            <h1>Create New Incident</h1>
            <div className="sn-form-sub">Required fields marked with *  ·  Auto-routes to on-call when saved</div>
            {error && (
              <div className="sn-form-sub" style={{ color: "var(--critical)", marginTop: 4 }}>
                <i className="fa-solid fa-triangle-exclamation" /> {error}
              </div>
            )}
          </div>
          <div className="sn-form-actions">
            <button className="sn-btn" onClick={() => setRoute("incidents")}><i className="fa-solid fa-xmark" /> Cancel</button>
            <button className="sn-btn"><i className="fa-solid fa-floppy-disk" /> Save Draft</button>
            <button className="sn-btn primary" onClick={submit} disabled={create.isPending}>
              <i className={`fa-solid ${create.isPending ? "fa-spinner fa-spin" : "fa-paper-plane"}`} /> {create.isPending ? "Saving…" : "Submit"}
            </button>
          </div>
        </div>
      </div>

      <div className="sn-form-layout">
        <div className="sn-form-main">
          <FormSection id="basic" title="Incident Details" collapsed={collapsed.basic} onToggle={toggle}>
            <FormRow>
              <Field label="Number" value={<span className="mono text-mute">auto-generated on save</span>} />
              <Field label="Opened" value={<span className="mono">just now</span>} />
            </FormRow>
            <FormRow>
              <Field label="Caller" value={<span><a className="sn-link">priya.r@finspot.in</a> (you)</span>} required />
              <Field label="Category" value={<select className="select" value={category} onChange={e => setCategory(e.target.value)}><option>Database</option><option>Network</option><option>Hardware</option><option>Software</option><option>Security</option><option>External SaaS</option></select>} required />
            </FormRow>
            <FormRow>
              <Field label="Severity" value={
                <select className="select" value={sev} onChange={e => setSev(e.target.value)}>
                  <option value="1">1 — Critical · business stopping</option>
                  <option value="2">2 — High · major impact</option>
                  <option value="3">3 — Moderate · limited impact</option>
                  <option value="4">4 — Low · cosmetic</option>
                </select>
              } required />
              <Field label="Priority" value={<Sev n={parseInt(sev)} />} />
            </FormRow>
            <FormRow>
              <Field label="Business Unit" value={
                <select className="select" value={tenant} onChange={e => setTenant(e.target.value)}>
                  {TENANTS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              } required />
              <Field label="Environment" value={<select className="select"><option>production</option><option>staging</option><option>dev</option></select>} />
            </FormRow>
            <FormRow>
              <Field label="Short description" value={<input className="select" placeholder="e.g. Payment gateway timeouts" value={title} onChange={e => setTitle(e.target.value)} style={{ width: "100%" }} />} required />
              <Field label="Detection" value={<select className="select"><option>Manual</option><option>Alert rule</option><option>Synthetic</option><option>User report</option></select>} />
            </FormRow>
          </FormSection>

          <FormSection id="impact" title="Impact & Service" collapsed={collapsed.impact} onToggle={toggle}>
            <FormRow>
              <Field label="Service / CI" value={
                <select className="select" value={service} onChange={e => setService(e.target.value)}>
                  {SERVICES.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                </select>
              } required />
              <Field label="Impacted users" value={<input className="select" placeholder="e.g. 12,400" style={{ width: "100%" }} />} />
            </FormRow>
            <FormRow>
              <Field label="Region" value={<select className="select"><option>us-east-1</option><option>eu-west-1</option><option>ap-south-1</option></select>} />
              <Field label="Revenue impact" value={<input className="select" placeholder="$ / minute" style={{ width: "100%" }} />} />
            </FormRow>
          </FormSection>

          <FormSection id="assign" title="Assignment" collapsed={collapsed.assign} onToggle={toggle}>
            <FormRow>
              <Field label="Assigned to" value={
                <select className="select" value={assignee} onChange={e => setAssignee(e.target.value)}>
                  {USERS.map(u => <option key={u.id} value={u.id}>{u.name} · {u.team}</option>)}
                </select>
              } required />
              <Field label="Assignment group" value={<select className="select" value={group} onChange={e => setGroup(e.target.value)}><option>SRE Platform</option><option>Networking</option><option>Database</option><option>Security</option></select>} required />
            </FormRow>
            <FormRow>
              <Field label="Watch list" value={<input className="select" placeholder="@mentions, comma-separated" style={{ width: "100%" }} />} />
              <Field label="Auto-page" value={<label style={{ fontSize: 12.5 }}><input type="checkbox" defaultChecked /> Page on-call rotation if Sev 1/2</label>} />
            </FormRow>
          </FormSection>

          <FormSection id="desc" title="Description" collapsed={collapsed.desc} onToggle={toggle}>
            <div style={{ padding: 14 }}>
              <textarea
                value={desc}
                onChange={e => setDesc(e.target.value)}
                placeholder="What's happening, when did it start, what have you tried…"
                style={{ width: "100%", minHeight: 120, padding: 10, fontSize: 12.5, fontFamily: "var(--font-sans)", border: "1px solid #d2d6dc", borderRadius: 3 }}
              />
              <div className="row row-8" style={{ marginTop: 8 }}>
                <button className="sn-btn"><i className="fa-solid fa-paperclip" /> Attach</button>
                <button className="sn-btn"><i className="fa-solid fa-image" /> Screenshot</button>
                <button className="sn-btn"><i className="fa-solid fa-link" /> Link incident</button>
              </div>
            </div>
          </FormSection>
        </div>

        <aside className="sn-form-side">
          <div className="sn-side-card">
            <div className="sn-side-head">AI Suggestions</div>
            <div className="sn-side-body" style={{ padding: 14, fontSize: 12.5, lineHeight: 1.6, color: "#000" }}>
              Based on the title "<b>{title || "—"}</b>" and category <b>{category}</b>, Argus AI suggests:
              <ul style={{ marginTop: 8, paddingLeft: 18, color: "var(--fg-muted)" }}>
                <li>Severity: <b>Sev {sev}</b></li>
                <li>Likely service: <b>{service}</b></li>
                <li>Runbook: <a className="sn-link">KB-2114</a></li>
                <li>Similar past: <a className="sn-link">INC-47120</a></li>
              </ul>
            </div>
          </div>
          <div className="sn-side-card">
            <div className="sn-side-head">On-call Now</div>
            <div className="sn-side-body">
              {USERS.slice(0, 3).map(u => (
                <div key={u.id} className="sn-related-row">
                  <div className="row row-8" style={{ flex: 1 }}>
                    <Avatar name={u.name} color={u.color} />
                    <div><div className="sn-related-title">{u.name}</div><div className="sn-related-meta">{u.team}</div></div>
                  </div>
                  <span className="sn-state-pill svc-healthy"><i className="fa-solid fa-circle" /> {u.status}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
