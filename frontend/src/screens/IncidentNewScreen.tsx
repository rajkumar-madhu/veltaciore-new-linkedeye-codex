// New Incident form
// Ported from screens/incident-new.jsx; LinkedEye form layout.
import "@/styles/servicedesk.css";
import React from "react";
import { useNav } from "@/hooks/useNav";
import { TENANTS, USERS, SERVICES } from "@/data/core";
import { Panel, Pill } from "@/components/ld";
import type { Tone } from "@/components/ld";
import { useCreateIncident } from "@/api/hooks";

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

export default function IncidentNewScreen() {
  const { setRoute } = useNav();
  const idp = React.useId();
  const formId = `${idp}-form`;
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

  const f = (name: string) => `${idp}-${name}`;
  const sevN = parseInt(sev, 10);

  return (
    <div className="ld-dash">
      <nav className="ld-crumbs" aria-label="Breadcrumb">
        <button type="button" className="ld-link" onClick={() => setRoute("dashboard")}>Home</button>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <button type="button" className="ld-link" onClick={() => setRoute("incidents")}>Incident Management</button>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <span>New Incident</span>
      </nav>

      <div className="ld-head">
        <div>
          <h1>Create New Incident</h1>
          <p>Fields marked <span className="ld-req">*</span> are required · auto-routes to on-call when saved</p>
        </div>
        <div className="ld-head-actions">
          <Pill tone="muted"><i className="fa-solid fa-pen" aria-hidden="true" /> Draft · not yet saved</Pill>
          <button type="button" className="ld-btn" onClick={() => setRoute("incidents")}><i className="fa-solid fa-xmark" aria-hidden="true" /> Cancel</button>
          <button type="button" className="ld-btn"><i className="fa-solid fa-floppy-disk" aria-hidden="true" /> Save Draft</button>
          <button type="submit" form={formId} className="ld-btn ld-btn-primary" disabled={create.isPending}>
            <i className={`fa-solid ${create.isPending ? "fa-spinner fa-spin" : "fa-paper-plane"}`} aria-hidden="true" /> {create.isPending ? "Saving…" : "Submit incident"}
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
          <Panel title="Incident Details">
            <div className="ld-sd-fields">
              <FormField label="Number"><span className="ld-sd-static ld-mono ld-muted">auto-generated on save</span></FormField>
              <FormField label="Opened"><span className="ld-sd-static ld-mono">just now</span></FormField>
              <FormField label="Caller" required><span className="ld-sd-static">priya.r@finspot.in (you)</span></FormField>
              <FormField id={f("category")} label="Category" required>
                <select id={f("category")} className="ld-select" value={category} onChange={e => setCategory(e.target.value)}>
                  <option>Database</option><option>Network</option><option>Hardware</option><option>Software</option><option>Security</option><option>External SaaS</option>
                </select>
              </FormField>
              <FormField id={f("sev")} label="Severity" required>
                <select id={f("sev")} className="ld-select" value={sev} onChange={e => setSev(e.target.value)}>
                  <option value="1">1 — Critical · business stopping</option>
                  <option value="2">2 — High · major impact</option>
                  <option value="3">3 — Moderate · limited impact</option>
                  <option value="4">4 — Low · cosmetic</option>
                </select>
              </FormField>
              <FormField label="Priority"><span className="ld-sd-static"><Pill tone={SEV_TONE[sevN] ?? "muted"}>Sev {sevN}</Pill></span></FormField>
              <FormField id={f("tenant")} label="Business Unit" required>
                <select id={f("tenant")} className="ld-select" value={tenant} onChange={e => setTenant(e.target.value)}>
                  {TENANTS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </FormField>
              <FormField id={f("env")} label="Environment">
                <select id={f("env")} className="ld-select"><option>production</option><option>staging</option><option>dev</option></select>
              </FormField>
              <FormField id={f("title")} label="Short description" required>
                <input id={f("title")} className="ld-input" aria-required="true" aria-invalid={!!error && !title.trim()} placeholder="e.g. Payment gateway timeouts" value={title} onChange={e => setTitle(e.target.value)} />
              </FormField>
              <FormField id={f("detect")} label="Detection">
                <select id={f("detect")} className="ld-select"><option>Manual</option><option>Alert rule</option><option>Synthetic</option><option>User report</option></select>
              </FormField>
            </div>
          </Panel>

          <Panel title="Impact & Service">
            <div className="ld-sd-fields">
              <FormField id={f("service")} label="Service / CI" required>
                <select id={f("service")} className="ld-select" value={service} onChange={e => setService(e.target.value)}>
                  {SERVICES.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                </select>
              </FormField>
              <FormField id={f("impacted")} label="Impacted users">
                <input id={f("impacted")} className="ld-input" placeholder="e.g. 12,400" />
              </FormField>
              <FormField id={f("region")} label="Region">
                <select id={f("region")} className="ld-select"><option>us-east-1</option><option>eu-west-1</option><option>ap-south-1</option></select>
              </FormField>
              <FormField id={f("revenue")} label="Revenue impact">
                <input id={f("revenue")} className="ld-input" placeholder="$ / minute" />
              </FormField>
            </div>
          </Panel>

          <Panel title="Assignment">
            <div className="ld-sd-fields">
              <FormField id={f("assignee")} label="Assigned to" required>
                <select id={f("assignee")} className="ld-select" value={assignee} onChange={e => setAssignee(e.target.value)}>
                  {USERS.map(u => <option key={u.id} value={u.id}>{u.name} · {u.team}</option>)}
                </select>
              </FormField>
              <FormField id={f("group")} label="Assignment group" required>
                <select id={f("group")} className="ld-select" value={group} onChange={e => setGroup(e.target.value)}>
                  <option>SRE Platform</option><option>Networking</option><option>Database</option><option>Security</option>
                </select>
              </FormField>
              <FormField id={f("watch")} label="Watch list">
                <input id={f("watch")} className="ld-input" placeholder="@mentions, comma-separated" />
              </FormField>
              <FormField label="Auto-page">
                <label className="ld-sd-check"><input type="checkbox" defaultChecked /> Page on-call rotation if Sev 1/2</label>
              </FormField>
            </div>
          </Panel>

          <Panel title="Description">
            <FormField id={f("desc")} label="Description">
              <textarea
                id={f("desc")}
                className="ld-input ld-textarea ld-sd-textarea"
                value={desc}
                onChange={e => setDesc(e.target.value)}
                placeholder="What's happening, when did it start, what have you tried…"
              />
            </FormField>
            <div className="ld-sd-actions">
              <button type="button" className="ld-btn ld-btn-sm"><i className="fa-solid fa-paperclip" aria-hidden="true" /> Attach</button>
              <button type="button" className="ld-btn ld-btn-sm"><i className="fa-solid fa-image" aria-hidden="true" /> Screenshot</button>
              <button type="button" className="ld-btn ld-btn-sm"><i className="fa-solid fa-link" aria-hidden="true" /> Link incident</button>
            </div>
          </Panel>

          <div className="ld-sd-actions ld-sd-actions-end">
            <button type="button" className="ld-btn" onClick={() => setRoute("incidents")}>Cancel</button>
            <button type="submit" className="ld-btn ld-btn-primary" disabled={create.isPending}>
              <i className={`fa-solid ${create.isPending ? "fa-spinner fa-spin" : "fa-paper-plane"}`} aria-hidden="true" /> {create.isPending ? "Saving…" : "Submit incident"}
            </button>
          </div>
        </form>

        <aside className="ld-rail" aria-label="Suggestions">
          <Panel title="AI Suggestions">
            <p className="ld-sd-entry-text">
              Based on the title "<b>{title || "—"}</b>" and category <b>{category}</b>, Argus AI suggests:
            </p>
            <ul className="ld-sd-list">
              <li>Severity: <b>Sev {sev}</b></li>
              <li>Likely service: <b>{service}</b></li>
              <li>Runbook: KB-2114</li>
              <li>Similar past: INC-47120</li>
            </ul>
          </Panel>
          <Panel title="On-call Now">
            <ul className="ld-activity">
              {USERS.slice(0, 3).map(u => (
                <li key={u.id}>
                  <span className="ld-tile ld-tile-sm ld-info" aria-hidden="true"><i className="fa-solid fa-user" /></span>
                  <span className="ld-activity-text">{u.name} · <span className="ld-muted">{u.team}</span></span>
                  <Pill tone={u.status === "online" ? "ok" : u.status === "away" ? "warn" : "muted"}><span className="ld-pill-dot" />{u.status}</Pill>
                </li>
              ))}
            </ul>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
