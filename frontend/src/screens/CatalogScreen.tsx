// Service catalog (browse + request form).
// Ported from screens/catalog.jsx (CatalogScreen + CatalogRequestScreen); LinkedEye layout.
import "@/styles/servicedesk.css";
import React from "react";
import { useNav } from "@/hooks/useNav";
import { CATALOG_CATEGORIES, CATALOG_ITEMS } from "@/data/itsm";
import { USERS } from "@/data/core";
import { Empty, Panel, Pill, fmt } from "@/components/ld";
import type { Tone } from "@/components/ld";
import { useCreateIncident } from "@/api/hooks";
import { useCanWrite } from "@/auth/auth";
import ReadOnlyBadge from "@/components/ReadOnlyBadge";

const BADGE_TONE: Record<string, Tone> = { Urgent: "crit", Auto: "ok", Bundle: "purple" };

function Summary({ icon, tone, label, value, note }: { icon: string; tone: Tone; label: string; value: React.ReactNode; note: string }) {
  return (
    <div className="ld-card ld-stat ld-sd-stat">
      <span className={`ld-tile ld-${tone}`} aria-hidden="true"><i className={`fa-solid ${icon}`} /></span>
      <span className="ld-stat-body">
        <span className="ld-stat-label">{label}</span>
        <span className="ld-stat-value">{value}</span>
        <span className="ld-stat-note">{note}</span>
      </span>
    </div>
  );
}

// Example requests for the signed-in user; there is no request API yet.
const MY_REQUESTS: { title: string; id: string; state: string; tone: Tone }[] = [
  { title: "MacBook Pro 16\"", id: "REQ-4218", state: "approved", tone: "ok" },
  { title: "Production access", id: "REQ-4214", state: "pending", tone: "warn" },
  { title: "AWS sandbox", id: "REQ-4210", state: "fulfilled", tone: "ok" },
];

export default function CatalogScreen() {
  const { setRoute } = useNav();
  const [cat, setCat] = React.useState<string | null>(null);
  const items = cat ? CATALOG_ITEMS.filter(i => i.cat === cat) : CATALOG_ITEMS;
  const countIn = (id: string) => CATALOG_ITEMS.filter((i) => i.cat === id).length;
  const current = cat ? CATALOG_CATEGORIES.find(c => c.id === cat) : undefined;

  return (
    <div className="ld-dash">
      <nav className="ld-crumbs" aria-label="Breadcrumb">
        <button type="button" className="ld-link" onClick={() => setRoute("dashboard")}>Home</button>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <span>Service Catalog</span>
      </nav>

      <div className="ld-head">
        <div>
          <h1>Service Catalog</h1>
          <p>Request anything across Finspot — access, hardware, software, infra</p>
        </div>
        <div className="ld-head-actions">
          <button type="button" className="ld-btn"><i className="fa-solid fa-clipboard-list" aria-hidden="true" /> My Requests</button>
          <button type="button" className="ld-btn ld-btn-primary"><i className="fa-solid fa-plus" aria-hidden="true" /> Build New Item</button>
        </div>
      </div>

      <div className="ld-grid ld-grid-stats">
        <Summary icon="fa-bag-shopping" tone="info" label="Catalog items" value={fmt(CATALOG_ITEMS.length)} note="all categories" />
        <Summary icon="fa-layer-group" tone="purple" label="Categories" value={fmt(CATALOG_CATEGORIES.length)} note="active" />
        <Summary icon="fa-bolt" tone="ok" label="Auto-fulfilled" value={fmt(CATALOG_ITEMS.filter(i => i.badge === "Auto").length)} note="zero-touch" />
        <Summary icon="fa-box" tone="warn" label="Bundles" value={fmt(CATALOG_ITEMS.filter(i => i.badge === "Bundle").length)} note="multi-item" />
      </div>

      <div className="ld-chips" role="group" aria-label="Filter by category">
        <button type="button" className={`ld-chip${cat === null ? " active" : ""}`} aria-pressed={cat === null} onClick={() => setCat(null)}>
          <i className="fa-solid fa-border-all" aria-hidden="true" />
          <span className="ld-chip-label">All</span>
          <span className="ld-chip-count">{CATALOG_ITEMS.length}</span>
        </button>
        {CATALOG_CATEGORIES.map(c => (
          <button key={c.id} type="button" className={`ld-chip${cat === c.id ? " active" : ""}`} aria-pressed={cat === c.id} onClick={() => setCat(cat === c.id ? null : c.id)}>
            <i className={`fa-solid ${c.icon}`} aria-hidden="true" />
            <span className="ld-chip-label">{c.label}</span>
            <span className="ld-chip-count">{countIn(c.id)}</span>
          </button>
        ))}
      </div>

      <div className="ld-split">
        <Panel title={`${current ? current.label : "All Items"} (${items.length})`}>
          {items.length ? (
            <div className="ld-table-wrap">
              <table className="ld-table">
                <thead>
                  <tr><th scope="col">Item</th><th scope="col">Category</th><th scope="col">SLA</th><th scope="col">Delivery</th><th scope="col">Badge</th></tr>
                </thead>
                <tbody>
                  {items.map(i => {
                    const c = CATALOG_CATEGORIES.find(x => x.id === i.cat);
                    return (
                      <tr key={i.id}>
                        <td className="ld-wrap">
                          <button type="button" className="ld-link ld-sd-rowlink ld-strong" onClick={() => setRoute("catalog-request")}>{i.title}</button>
                          <span className="ld-sub">{i.desc}</span>
                        </td>
                        <td><Pill tone="muted">{c ? <><i className={`fa-solid ${c.icon}`} aria-hidden="true" /> {c.label}</> : i.cat}</Pill></td>
                        <td className="ld-mono">{i.sla}</td>
                        <td className="ld-muted">{i.eta}</td>
                        <td>{i.badge ? <Pill tone={BADGE_TONE[i.badge] ?? "muted"}>{i.badge}</Pill> : <span className="ld-muted">—</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>No items in this category.</Empty>
          )}
        </Panel>

        <aside className="ld-rail" aria-label="Requests">
          <Panel title="My Requests (sample)">
            <ul className="ld-activity">
              {MY_REQUESTS.map((r) => (
                <li key={r.id}>
                  <span className={`ld-tile ld-tile-sm ld-${r.tone}`} aria-hidden="true"><i className="fa-solid fa-clipboard-list" /></span>
                  <span className="ld-activity-text">{r.title} · <span className="ld-muted ld-mono">{r.id}</span></span>
                  <Pill tone={r.tone}><span className="ld-pill-dot" />{r.state}</Pill>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Popular items">
            <ul className="ld-activity">
              {CATALOG_ITEMS.filter(i => i.popular).slice(0, 4).map(i => (
                <li key={i.id}>
                  <span className="ld-tile ld-tile-sm ld-warn" aria-hidden="true"><i className="fa-solid fa-fire" /></span>
                  <span className="ld-activity-text">{i.title}</span>
                  <span className="ld-muted ld-nowrap">{i.eta}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </aside>
      </div>
    </div>
  );
}

const BUNDLE: [string, string, string, boolean][] = [
  ["MacBook Pro 16\"", "M3 Max · 64GB · 1TB", "Hardware", true],
  ["Okta account + SSO", "Email, Slack, Zoom, GitHub, Figma", "Access", true],
  ["GitHub org access", "Standard engineer scope", "Dev", true],
  ["AWS sandbox", "$300/mo budget, personal", "Dev", true],
  ["Buddy assignment", "Auto-paired from eng pool", "HR", true],
  ["Day-1 training", "Incident response · security", "HR", true],
];
const APPROVAL_CHAIN: [string, string][] = [["Manager · Devon Hassan", "pending"], ["Finance · Sasha Volkov", "pending"], ["IT · auto-fulfilled", "ready"]];

export function CatalogRequestScreen() {
  const { setRoute } = useNav();
  const idp = React.useId();
  const [submittedId, setSubmittedId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const create = useCreateIncident();
  const canWrite = useCanWrite();

  const submit = async () => {
    setError(null);
    try {
      const created = await create.mutateAsync({
        title: "Service request — New Employee Onboarding (Alex Chen)",
        caller: "alex.chen@finspot.in",
        pri: 3,
        category: "Service Request",
        group: "Service Desk",
        state: "New",
      });
      setSubmittedId(created.id);
    } catch (e) {
      setError(e instanceof Error ? `Could not submit request (${e.message}).` : "Could not submit request.");
    }
  };

  const manager = USERS.find((u) => u.id === "u5")?.name ?? "—";

  return (
    <div className="ld-dash">
      <nav className="ld-crumbs" aria-label="Breadcrumb">
        <button type="button" className="ld-link" onClick={() => setRoute("dashboard")}>Home</button>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <button type="button" className="ld-link" onClick={() => setRoute("catalog")}>Service Catalog</button>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <span>New Employee Onboarding</span>
      </nav>

      <div className="ld-head ld-entity-head">
        <div className="ld-entity">
          <span className="ld-tile ld-purple" aria-hidden="true"><i className="fa-solid fa-box" /></span>
          <div>
            <span className="ld-sd-number">{submittedId ?? "REQ-4221"}</span>
            <h1 className="ld-entity-title">
              New Employee Onboarding
              {submittedId ? (
                <Pill tone="ok"><i className="fa-solid fa-check" aria-hidden="true" /> Submitted</Pill>
              ) : (
                <Pill tone="muted"><i className="fa-solid fa-pen" aria-hidden="true" /> Draft</Pill>
              )}
              <Pill tone="purple">Bundle · {BUNDLE.length} items</Pill>
            </h1>
            <p className="ld-entity-meta">
              <span>Auto-provisioned on day 1</span>
              <span>2 day SLA</span>
            </p>
          </div>
        </div>
        <div className="ld-head-side">
          <div className="ld-head-actions">
            {submittedId ? (
              <>
                <button type="button" className="ld-btn" onClick={() => setRoute("catalog")}><i className="fa-solid fa-arrow-left" aria-hidden="true" /> Back to catalog</button>
                <button type="button" className="ld-btn ld-btn-primary" onClick={() => setRoute("incidents", { createdIncidentId: submittedId })}>
                  <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" /> View in queue
                </button>
              </>
            ) : canWrite ? (
              <>
                <button type="button" className="ld-btn"><i className="fa-solid fa-floppy-disk" aria-hidden="true" /> Save Draft</button>
                <button type="button" className="ld-btn ld-btn-primary" onClick={submit} disabled={create.isPending}>
                  <i className={`fa-solid ${create.isPending ? "fa-spinner fa-spin" : "fa-paper-plane"}`} aria-hidden="true" /> {create.isPending ? "Submitting…" : "Submit Request"}
                </button>
              </>
            ) : (
              <>
                <ReadOnlyBadge />
                <button type="button" className="ld-btn" onClick={() => setRoute("catalog")}><i className="fa-solid fa-arrow-left" aria-hidden="true" /> Back to catalog</button>
              </>
            )}
          </div>
        </div>
      </div>

      {submittedId && (
        <div className="ld-card ld-sd-alert ld-sd-alert-ok" role="status">
          <i className="fa-solid fa-circle-check" aria-hidden="true" />
          <span>Request submitted as <b>{submittedId}</b> · routed to Service Desk · 2 day SLA</span>
        </div>
      )}
      {error && (
        <div className="ld-card ld-sd-alert ld-sd-alert-crit" role="alert">
          <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> <span>{error}</span>
        </div>
      )}

      <div className="ld-split">
        <div className="ld-rail">
          <Panel title="Requested For">
            <dl className="ld-dl">
              <dt>Name <span className="ld-req" aria-hidden="true">*</span></dt><dd><b>Alex Chen</b></dd>
              <dt>Email <span className="ld-req" aria-hidden="true">*</span></dt><dd className="ld-mono">alex.chen@finspot.in</dd>
              <dt>Department <span className="ld-req" aria-hidden="true">*</span></dt><dd>Engineering</dd>
              <dt>Manager <span className="ld-req" aria-hidden="true">*</span></dt><dd>{manager}</dd>
              <dt>Role</dt><dd>Senior Software Engineer</dd>
              <dt>Start date <span className="ld-req" aria-hidden="true">*</span></dt><dd>May 1, 2026</dd>
              <dt>Office</dt><dd>San Francisco</dd>
              <dt>Cost center</dt><dd className="ld-mono">CC-3041</dd>
            </dl>
          </Panel>

          <Panel title={`Bundle Contents (${BUNDLE.length} items)`}>
            <div className="ld-table-wrap">
              <table className="ld-table">
                <thead>
                  <tr><th scope="col"><span className="sr-only">Include</span></th><th scope="col">Item</th><th scope="col">Type</th></tr>
                </thead>
                <tbody>
                  {BUNDLE.map(([n, d, c, on], i) => (
                    <tr key={i}>
                      <td><input type="checkbox" defaultChecked={on} aria-label={`Include ${n}`} /></td>
                      <td className="ld-wrap"><span className="ld-strong">{n}</span><span className="ld-sub">{d}</span></td>
                      <td><Pill tone="muted">{c}</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Notes">
            <div className="ld-form-field">
              <label htmlFor={`${idp}-notes`}>Special requirements</label>
              <textarea id={`${idp}-notes`} className="ld-input ld-textarea" placeholder="Any special requirements…" />
            </div>
          </Panel>
        </div>

        <aside className="ld-rail" aria-label="Request summary">
          <Panel title="Summary">
            <dl className="ld-dl">
              <dt>Items</dt><dd>{BUNDLE.length}</dd>
              <dt>Approvals</dt><dd>{APPROVAL_CHAIN.filter(([, st]) => st !== "ready").length} required</dd>
              <dt>SLA</dt><dd>2 days</dd>
              <dt>Delivery</dt><dd>Apr 30 · by 5pm</dd>
            </dl>
          </Panel>
          <Panel title="Approval Chain">
            <ol className="ld-activity">
              {APPROVAL_CHAIN.map(([w, st], i) => (
                <li key={i}>
                  <span className={`ld-tile ld-tile-sm ld-${st === "ready" ? "ok" : "warn"}`} aria-hidden="true">{i + 1}</span>
                  <span className="ld-activity-text">{w}</span>
                  <Pill tone={st === "ready" ? "ok" : "warn"}><span className="ld-pill-dot" />{st}</Pill>
                </li>
              ))}
            </ol>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
