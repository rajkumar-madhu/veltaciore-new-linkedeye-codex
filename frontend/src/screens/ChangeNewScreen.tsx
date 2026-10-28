// New Change form — the change-create flow, mirroring the incident/problem
// create forms. LinkedEye form layout.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { SERVICES, USERS } from "@/data/core";
import { Panel, Pill } from "@/components/ld";
import type { Tone } from "@/components/ld";
import { useCreateChange } from "@/api/hooks";

import { buttonClass, cx, toneText, ui } from "@/components/ui";
import { sd } from "@/components/RecordList";
import { Icon } from "@/components/Icon";
import { BotIcon, ChevronRightIcon, GaugeIcon, PaperclipIcon, PencilIcon, SaveIcon, TriangleAlertIcon, XIcon } from "lucide-react";
const CATEGORIES = ["Network", "Server", "Firewall", "Kubernetes", "Security", "Trading", "CDN", "Database"];
const CHANGE_TYPES = ["Normal", "Standard", "Emergency"];
const RISKS = ["Low", "Medium", "High"];
const STATES = ["New", "Scheduled", "CAB Review", "Approved", "Implement"];
const SEV_TONE: Record<number, Tone> = { 1: "crit", 2: "warn", 3: "info", 4: "ok" };
const RISK_TONE: Record<string, Tone> = { High: "crit", Medium: "warn", Low: "ok" };

function FormField({ id, label, required, wide, children }: { id?: string; label: string; required?: boolean; wide?: boolean; children: React.ReactNode }) {
  const text = <>{label}{required && <span className={sd.req} aria-hidden="true"> *</span>}</>;
  return (
    <div className={cx(ui.field, wide && sd.wide)}>
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
    <div className={ui.page}>
      <nav className={ui.crumbs} aria-label="Breadcrumb">
        <button type="button" className={ui.link} onClick={() => setRoute("dashboard")}>Home</button>
        <Icon icon={ChevronRightIcon} />
        <button type="button" className={ui.link} onClick={() => setRoute("changes")}>Change Management</button>
        <Icon icon={ChevronRightIcon} />
        <span>New Change</span>
      </nav>

      <div className={ui.head}>
        <div>
          <h1 className={ui.h1}>Create New Change</h1>
          <p className={ui.headSub}>Fields marked <span className={sd.req}>*</span> are required · routes to CAB when risk is High</p>
        </div>
        <div className={ui.headActions}>
          <Pill tone="muted"><Icon icon={PencilIcon} /> Draft</Pill>
          <Pill tone={RISK_TONE[risk] ?? "muted"}><Icon icon={GaugeIcon} /> {risk} risk</Pill>
          <button type="button" className={buttonClass()} onClick={() => setRoute("changes")}><Icon icon={XIcon} /> Cancel</button>
          <button type="button" className={buttonClass()}><Icon icon={SaveIcon} /> Save Draft</button>
          <button type="submit" form={formId} className={buttonClass("primary")} disabled={create.isPending}>
            <Icon className={`fa-solid ${create.isPending ? "fa-spinner fa-spin" : "fa-paper-plane"}`} /> {create.isPending ? "Saving…" : "Submit change"}
          </button>
        </div>
      </div>

      {error && (
        <div className={sd.alertCrit} role="alert">
          <Icon icon={TriangleAlertIcon} /> <span>{error}</span>
        </div>
      )}

      <div className={ui.split}>
        <form id={formId} className={sd.formRail} noValidate onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <Panel title="Change Details">
            <div className={sd.fields}>
              <FormField label="Number"><span className={sd.staticMono}>auto-generated on save</span></FormField>
              <FormField label="Requested by" required><span className={sd.static}>priya.r@finspot.in (you)</span></FormField>
              <FormField id={f("title")} label="Summary" required>
                <input id={f("title")} className={sd.input} aria-required="true" aria-invalid={!!error && !title.trim()} placeholder="e.g. Kubernetes control-plane upgrade prod-west" value={title} onChange={e => setTitle(e.target.value)} />
              </FormField>
              <FormField id={f("category")} label="Category" required>
                <select id={f("category")} className={sd.select} value={category} onChange={e => setCategory(e.target.value)}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
              </FormField>
              <FormField id={f("type")} label="Type" required>
                <select id={f("type")} className={sd.select} value={type} onChange={e => setType(e.target.value)}>{CHANGE_TYPES.map(t => <option key={t}>{t}</option>)}</select>
              </FormField>
              <FormField id={f("priority")} label="Priority">
                <select id={f("priority")} className={sd.select} value={priority} onChange={e => setPriority(e.target.value)}>
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
            <div className={sd.fields}>
              <FormField id={f("risk")} label="Risk" required>
                <select id={f("risk")} className={sd.select} value={risk} onChange={e => setRisk(e.target.value)}>{RISKS.map(r => <option key={r}>{r}</option>)}</select>
              </FormField>
              <FormField id={f("state")} label="Initial state">
                <select id={f("state")} className={sd.select} value={state} onChange={e => setState(e.target.value)}>{STATES.map(s => <option key={s}>{s}</option>)}</select>
              </FormField>
              <FormField id={f("window")} label="Change window">
                <input id={f("window")} className={sd.input} value={changeWindow} onChange={e => setChangeWindow(e.target.value)} />
              </FormField>
              <FormField id={f("service")} label="Affected service / CI">
                <select id={f("service")} className={sd.select} value={service} onChange={e => setService(e.target.value)}>{SERVICES.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}</select>
              </FormField>
              <FormField id={f("owner")} label="Assigned to" required>
                <select id={f("owner")} className={sd.select} value={owner} onChange={e => setOwner(e.target.value)}>{USERS.map(u => <option key={u.id} value={u.id}>{u.name} · {u.team}</option>)}</select>
              </FormField>
              <FormField label="Approval">
                <span className={sd.static}>
                  {risk === "High" ? <span className={toneText.warn}>CAB required · meets Fri 14:00 UTC</span> : <span className={toneText.ok}>Standard approval</span>}
                </span>
              </FormField>
            </div>
          </Panel>

          <Panel title="Implementation Plan">
            <FormField id={f("plan")} label="Plan">
              <textarea
                id={f("plan")}
                className={sd.textarea}
                value={plan}
                onChange={e => setPlan(e.target.value)}
                placeholder="Steps, rollback plan, validation checks, blast-radius notes…"
              />
            </FormField>
            <div className={sd.actions}>
              <button type="button" className={buttonClass("default", "sm")}><Icon icon={BotIcon} /> AI: Draft rollback plan</button>
              <button type="button" className={buttonClass("default", "sm")}><Icon icon={PaperclipIcon} /> Attach runbook</button>
            </div>
          </Panel>

          <div className={sd.actionsEnd}>
            <button type="button" className={buttonClass()} onClick={() => setRoute("changes")}>Cancel</button>
            <button type="submit" className={buttonClass("primary")} disabled={create.isPending}>
              <Icon className={`fa-solid ${create.isPending ? "fa-spinner fa-spin" : "fa-paper-plane"}`} /> {create.isPending ? "Saving…" : "Submit change"}
            </button>
          </div>
        </form>

        <aside className={ui.rail} aria-label="Preview">
          <Panel title="Change Preview">
            <dl className={ui.dl}>
              <dt>Summary</dt><dd><b>{title || "—"}</b></dd>
              <dt>Type / Risk</dt><dd>{type} · <span className={risk === "High" ? toneText.crit : undefined}>{risk}</span></dd>
              <dt>Window</dt><dd>{changeWindow}</dd>
              <dt>Owner</dt><dd>{USERS.find(u => u.id === owner)?.name ?? "—"}</dd>
            </dl>
          </Panel>
          <Panel title="CAB Guidance">
            <p className="text-fg-muted text-xs">
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
