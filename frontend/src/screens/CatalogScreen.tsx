// Service catalog in ServiceNow form-style.
// Ported from screens/catalog.jsx (CatalogScreen + CatalogRequestScreen).
import React from "react";
import { useNav } from "@/hooks/useNav";
import { CATALOG_CATEGORIES, CATALOG_ITEMS } from "@/data/itsm";
import { FormSection, FormRow, Field, Kpi, UserById } from "@/components/primitives";
import { useCreateIncident } from "@/api/hooks";
import { useCanWrite } from "@/auth/auth";
import ReadOnlyBadge from "@/components/ReadOnlyBadge";

export default function CatalogScreen() {
  const { setRoute } = useNav();
  const [cat, setCat] = React.useState<string | null>(null);
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const toggle = (id: string) => setCollapsed(c => ({ ...c, [id]: !c[id] }));
  const items = cat ? CATALOG_ITEMS.filter(i => i.cat === cat) : CATALOG_ITEMS;

  return (
    <div className="page page-fade sn-dash">
      <div className="sn-breadcrumb">
        <a className="sn-link">Home</a><span className="sn-bc-sep">›</span>
        <a className="sn-link">Service Catalog</a><span className="sn-bc-sep">›</span>
        <span>Browse</span>
      </div>

      <div className="sn-form-header">
        <div className="sn-form-title-row">
          <span className="sn-rec-number">CATALOG</span>
          <span className="sn-pill state-progress"><i className="fa-solid fa-spinner fa-spin" /> {CATALOG_ITEMS.length} items</span>
          <span className="sn-pill state-neutral"><i className="fa-solid fa-bag-shopping" /> {CATALOG_CATEGORIES.length} categories</span>
        </div>
        <div className="sn-form-title-meta">
          <div>
            <h1>Service Catalog</h1>
            <div className="sn-form-sub">Request anything across Finspot — access, hardware, software, infra</div>
          </div>
          <div className="sn-form-actions">
            <button className="sn-btn"><i className="fa-solid fa-clipboard-list" /> My Requests</button>
            <button className="sn-btn primary"><i className="fa-solid fa-plus" /> Build New Item</button>
          </div>
        </div>
      </div>

      <div className="sn-kpi-strip">
        <Kpi l="Catalog items" v={CATALOG_ITEMS.length} s="all categories" tone="neutral" />
        <Kpi l="Categories" v={CATALOG_CATEGORIES.length} s="active" tone="neutral" />
        <Kpi l="Auto-fulfilled" v={CATALOG_ITEMS.filter(i => i.badge === "Auto").length} s="zero-touch" tone="ok" />
        <Kpi l="Bundles" v={CATALOG_ITEMS.filter(i => i.badge === "Bundle").length} s="multi-item" tone="neutral" />
        <Kpi l="Avg SLA" v="1.2d" s="fulfillment time" tone="ok" />
        <Kpi l="My open requests" v="3" s="in progress" tone="warn" />
      </div>

      <div className="sn-form-layout">
        <div className="sn-form-main">
          <FormSection id="cats" title="Categories" badge={`${CATALOG_CATEGORIES.length} domains`} collapsed={collapsed.cats} onToggle={toggle}>
            <div className="sn-kind-grid">
              {CATALOG_CATEGORIES.map(c => (
                <div key={c.id} className="sn-kind-card" onClick={() => setCat(cat === c.id ? null : c.id)} style={{ borderLeft: cat === c.id ? `3px solid ${c.color}` : "" }}>
                  <div className="sn-kind-icon" style={{ color: c.color, background: c.color + "14" }}><i className={`fa-solid ${c.icon}`} /></div>
                  <div className="sn-kind-body">
                    <div className="sn-kind-count">{c.count}</div>
                    <div className="sn-kind-label">{c.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </FormSection>

          <FormSection id="items" title={cat ? CATALOG_CATEGORIES.find(c => c.id === cat)!.label : "All Items"} badge={`${items.length} items`} collapsed={collapsed.items} onToggle={toggle}>
            <table className="sn-list-table">
              <thead>
                <tr>
                  <th>Item</th><th style={{width:130}}>Category</th><th style={{width:90}}>SLA</th>
                  <th style={{width:140}}>Delivery</th><th style={{width:120}}>Badge</th>
                </tr>
              </thead>
              <tbody>
                {items.map(i => {
                  const c = CATALOG_CATEGORIES.find(x => x.id === i.cat)!;
                  return (
                    <tr key={i.id} onClick={() => setRoute("catalog-request")} style={{ cursor: "pointer" }}>
                      <td>
                        <div className="row row-8">
                          <span className="kind-mini" style={{ color: c.color, background: c.color + "18" }}><i className={`fa-solid ${c.icon}`} /></span>
                          <div>
                            <a className="sn-link"><b>{i.title}</b></a>
                            <div className="text-mute" style={{ fontSize: 11, marginTop: 2 }}>{i.desc}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className="sn-state-pill state-neutral"><i className="fa-solid fa-circle" /> {c.label}</span></td>
                      <td className="mono">{i.sla}</td>
                      <td className="text-mute" style={{ fontSize: 11.5 }}>{i.eta}</td>
                      <td>{i.badge && <span className={`sn-state-pill ${i.badge === "Urgent" ? "state-active" : i.badge === "Auto" ? "svc-healthy" : i.badge === "Bundle" ? "state-investigating" : "state-neutral"}`}><i className="fa-solid fa-circle" /> {i.badge}</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </FormSection>
        </div>

        <aside className="sn-form-side">
          <div className="sn-side-card">
            <div className="sn-side-head">My Requests <span className="sn-side-count">3</span></div>
            <div className="sn-side-body">
              <div className="sn-related-row">
                <div><div className="sn-related-title">MacBook Pro 16"</div><div className="sn-related-meta">REQ-4218 · approved</div></div>
                <span className="sn-state-pill svc-healthy"><i className="fa-solid fa-circle" /> approved</span>
              </div>
              <div className="sn-related-row">
                <div><div className="sn-related-title">Production access</div><div className="sn-related-meta">REQ-4214 · pending</div></div>
                <span className="sn-state-pill state-mitigating"><i className="fa-solid fa-circle" /> pending</span>
              </div>
              <div className="sn-related-row">
                <div><div className="sn-related-title">AWS sandbox</div><div className="sn-related-meta">REQ-4210 · fulfilled</div></div>
                <span className="sn-state-pill svc-healthy"><i className="fa-solid fa-circle" /> fulfilled</span>
              </div>
            </div>
          </div>
          <div className="sn-side-card">
            <div className="sn-side-head">Popular This Week</div>
            <div className="sn-side-body">
              {CATALOG_ITEMS.filter(i => i.popular).slice(0, 4).map(i => (
                <div key={i.id} className="sn-related-row">
                  <div><div className="sn-related-title">{i.title}</div><div className="sn-related-meta">{i.eta}</div></div>
                  <i className="fa-solid fa-fire tone-warn" style={{ fontSize: 12 }} />
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export function CatalogRequestScreen() {
  const { setRoute } = useNav();
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const toggle = (id: string) => setCollapsed(c => ({ ...c, [id]: !c[id] }));
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

  return (
    <div className="page page-fade sn-dash">
      <div className="sn-breadcrumb">
        <a className="sn-link" onClick={() => setRoute("catalog")}>Service Catalog</a><span className="sn-bc-sep">›</span>
        <span>New Employee Onboarding</span>
      </div>
      <div className="sn-form-header">
        <div className="sn-form-title-row">
          <span className="sn-rec-number">{submittedId ?? "REQ-4221"}</span>
          {submittedId ? (
            <span className="sn-pill svc-healthy"><i className="fa-solid fa-check" /> Submitted</span>
          ) : (
            <span className="sn-pill state-progress"><i className="fa-solid fa-spinner fa-spin" /> Draft</span>
          )}
          <span className="sn-pill state-neutral"><i className="fa-solid fa-box" /> Bundle · 6 items</span>
        </div>
        <div className="sn-form-title-meta">
          <div>
            <h1>New Employee Onboarding</h1>
            {submittedId ? (
              <div className="sn-form-sub" style={{ color: "var(--success)" }}>
                <i className="fa-solid fa-circle-check" /> Request submitted as <b>{submittedId}</b> · routed to Service Desk · 2 day SLA
              </div>
            ) : (
              <div className="sn-form-sub">Auto-provisioned on day 1 · 2 day SLA</div>
            )}
            {error && (
              <div className="sn-form-sub" style={{ color: "var(--critical)", marginTop: 4 }}>
                <i className="fa-solid fa-triangle-exclamation" /> {error}
              </div>
            )}
          </div>
          <div className="sn-form-actions">
            {submittedId ? (
              <>
                <button className="sn-btn" onClick={() => setRoute("catalog")}><i className="fa-solid fa-arrow-left" /> Back to catalog</button>
                <button className="sn-btn primary" onClick={() => setRoute("incidents", { createdIncidentId: submittedId })}>
                  <i className="fa-solid fa-arrow-up-right-from-square" /> View in queue
                </button>
              </>
            ) : canWrite ? (
              <>
                <button className="sn-btn"><i className="fa-solid fa-floppy-disk" /> Save Draft</button>
                <button className="sn-btn primary" onClick={submit} disabled={create.isPending}>
                  <i className={`fa-solid ${create.isPending ? "fa-spinner fa-spin" : "fa-paper-plane"}`} /> {create.isPending ? "Submitting…" : "Submit Request"}
                </button>
              </>
            ) : (
              <>
                <ReadOnlyBadge />
                <button className="sn-btn" onClick={() => setRoute("catalog")}><i className="fa-solid fa-arrow-left" /> Back to catalog</button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="sn-form-layout">
        <div className="sn-form-main">
          <FormSection id="requested" title="Requested For" collapsed={collapsed.requested} onToggle={toggle}>
            <FormRow>
              <Field label="Name" value={<b>Alex Chen</b>} required />
              <Field label="Email" value={<span className="mono">alex.chen@finspot.in</span>} required />
            </FormRow>
            <FormRow>
              <Field label="Department" value="Engineering" required />
              <Field label="Manager" value={<UserById id="u5" />} required />
            </FormRow>
            <FormRow>
              <Field label="Role" value="Senior Software Engineer" />
              <Field label="Start date" value="May 1, 2026" required />
            </FormRow>
            <FormRow>
              <Field label="Office" value="San Francisco" />
              <Field label="Cost center" value={<span className="mono">CC-3041</span>} />
            </FormRow>
          </FormSection>

          <FormSection id="bundle" title="Bundle Contents" badge="6 items" collapsed={collapsed.bundle} onToggle={toggle}>
            <table className="sn-list-table">
              <tbody>
                {([
                  ["MacBook Pro 16\"","M3 Max · 64GB · 1TB","Hardware",true],
                  ["Okta account + SSO","Email, Slack, Zoom, GitHub, Figma","Access",true],
                  ["GitHub org access","Standard engineer scope","Dev",true],
                  ["AWS sandbox","$300/mo budget, personal","Dev",true],
                  ["Buddy assignment","Auto-paired from eng pool","HR",true],
                  ["Day-1 training","Incident response · security","HR",true],
                ] as [string, string, string, boolean][]).map(([n, d, c, on], i) => (
                  <tr key={i}>
                    <td style={{ width: 30 }}><input type="checkbox" defaultChecked={on} /></td>
                    <td><b>{n}</b><div className="text-mute" style={{ fontSize: 11, marginTop: 2 }}>{d}</div></td>
                    <td style={{ width: 100 }}><span className="sn-state-pill state-neutral"><i className="fa-solid fa-circle" /> {c}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </FormSection>

          <FormSection id="notes" title="Notes" collapsed={collapsed.notes} onToggle={toggle}>
            <div style={{ padding: 14 }}>
              <textarea placeholder="Any special requirements…" style={{ width: "100%", minHeight: 80, padding: 10, fontSize: 12.5, fontFamily: "var(--font-sans)", border: "1px solid #d2d6dc", borderRadius: 3 }} />
            </div>
          </FormSection>
        </div>

        <aside className="sn-form-side">
          <div className="sn-side-card">
            <div className="sn-side-head">Summary</div>
            <div className="sn-side-body">
              <Field label="Items" value="6" />
              <Field label="Estimated cost" value={<span className="mono"><b>$4,280</b></span>} />
              <Field label="Approvals" value="2 required" />
              <Field label="SLA" value="2 days" />
              <Field label="Delivery" value="Apr 30 · by 5pm" />
            </div>
          </div>
          <div className="sn-side-card">
            <div className="sn-side-head">Approval Chain</div>
            <div className="sn-side-body">
              {[["Manager · Devon Hassan","pending"],["Finance · Sasha Volkov","pending"],["IT · auto-fulfilled","ready"]].map(([w, st], i) => (
                <div key={i} className="sn-related-row">
                  <div><div className="sn-related-title">{w}</div><div className="sn-related-meta">step {i+1}</div></div>
                  <span className={`sn-state-pill ${st === "ready" ? "svc-healthy" : "state-mitigating"}`}><i className="fa-solid fa-circle" /> {st}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
