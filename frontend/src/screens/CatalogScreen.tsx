// Service catalog (browse + request form).
// Ported from screens/catalog.jsx (CatalogScreen + CatalogRequestScreen); LinkedEye layout.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { CATALOG_CATEGORIES, CATALOG_ITEMS } from "@/data/itsm";
import { USERS } from "@/data/core";
import { Empty, Panel, Pill, PillDot, fmt } from "@/components/ld";
import type { Tone } from "@/components/ld";
import { useCreateIncident } from "@/api/hooks";
import { useCanWrite } from "@/auth/auth";
import ReadOnlyBadge from "@/components/ReadOnlyBadge";

import { Tile, buttonClass, cx, ui } from "@/components/ui";
import { chipClass, chipLabel, entityTile, sd } from "@/components/RecordList";
import { Icon } from "@/components/Icon";
import { ArrowLeftIcon, BoxIcon, CheckIcon, ChevronRightIcon, CircleCheckIcon, ClipboardListIcon, ExternalLinkIcon, FlameIcon, Grid3x3Icon, PencilIcon, PlusIcon, SaveIcon, TriangleAlertIcon } from "lucide-react";
const BADGE_TONE: Record<string, Tone> = { Urgent: "crit", Auto: "ok", Bundle: "purple" };

function Summary({ icon, tone, label, value, note }: { icon: string; tone: Tone; label: string; value: React.ReactNode; note: string }) {
  return (
    <div className={cx(ui.card, "flex items-center gap-4 px-4.5 py-4 text-left cursor-default")}>
      <Tile tone={tone}><Icon name={icon} /></Tile>
      <span className="flex flex-col gap-0.5 min-w-0">
        <span className="text-sm text-fg-muted">{label}</span>
        <span className="text-5xl font-bold tracking-[-0.02em] text-fg leading-[1.2]">{value}</span>
        <span className="text-sm text-fg-muted">{note}</span>
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
    <div className={ui.page}>
      <nav className={ui.crumbs} aria-label="Breadcrumb">
        <button type="button" className={ui.link} onClick={() => setRoute("dashboard")}>Home</button>
        <Icon icon={ChevronRightIcon} />
        <span>Service Catalog</span>
      </nav>

      <div className={ui.head}>
        <div>
          <h1 className={ui.h1}>Service Catalog</h1>
          <p className={ui.headSub}>Request anything across Finspot — access, hardware, software, infra</p>
        </div>
        <div className={ui.headActions}>
          <button type="button" className={buttonClass()}><Icon icon={ClipboardListIcon} /> My Requests</button>
          <button type="button" className={buttonClass("primary")}><Icon icon={PlusIcon} /> Build New Item</button>
        </div>
      </div>

      <div className={cx(ui.grid, ui.cols.stats)}>
        <Summary icon="fa-bag-shopping" tone="info" label="Catalog items" value={fmt(CATALOG_ITEMS.length)} note="all categories" />
        <Summary icon="fa-layer-group" tone="purple" label="Categories" value={fmt(CATALOG_CATEGORIES.length)} note="active" />
        <Summary icon="fa-bolt" tone="ok" label="Auto-fulfilled" value={fmt(CATALOG_ITEMS.filter(i => i.badge === "Auto").length)} note="zero-touch" />
        <Summary icon="fa-box" tone="warn" label="Bundles" value={fmt(CATALOG_ITEMS.filter(i => i.badge === "Bundle").length)} note="multi-item" />
      </div>

      <div className="flex flex-wrap gap-2.5" role="group" aria-label="Filter by category">
        <button type="button" className={chipClass(cat === null)} aria-pressed={cat === null} onClick={() => setCat(null)}>
          <Icon icon={Grid3x3Icon} />
          <span className={chipLabel(cat === null)}>All</span>
          <span className="text-md font-bold">{CATALOG_ITEMS.length}</span>
        </button>
        {CATALOG_CATEGORIES.map(c => (
          <button key={c.id} type="button" className={chipClass(cat === c.id)} aria-pressed={cat === c.id} onClick={() => setCat(cat === c.id ? null : c.id)}>
            <Icon name={c.icon} />
            <span className={chipLabel(cat === c.id)}>{c.label}</span>
            <span className="text-md font-bold">{countIn(c.id)}</span>
          </button>
        ))}
      </div>

      <div className={ui.split}>
        <Panel title={`${current ? current.label : "All Items"} (${items.length})`}>
          {items.length ? (
            <div className={ui.tableWrap}>
              <table className={ui.table}>
                <thead>
                  <tr><th scope="col">Item</th><th scope="col">Category</th><th scope="col">SLA</th><th scope="col">Delivery</th><th scope="col">Badge</th></tr>
                </thead>
                <tbody>
                  {items.map(i => {
                    const c = CATALOG_CATEGORIES.find(x => x.id === i.cat);
                    return (
                      <tr key={i.id}>
                        <td className={ui.cellWrap}>
                          <button type="button" className={cx(ui.link, "text-left")} onClick={() => setRoute("catalog-request")}>{i.title}</button>
                          <span className={ui.sub}>{i.desc}</span>
                        </td>
                        <td><Pill tone="muted">{c ? <><Icon name={c.icon} /> {c.label}</> : i.cat}</Pill></td>
                        <td className={sd.cellMono}>{i.sla}</td>
                        <td>{i.eta}</td>
                        <td>{i.badge ? <Pill tone={BADGE_TONE[i.badge] ?? "muted"}>{i.badge}</Pill> : <span className="text-fg-muted">—</span>}</td>
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

        <aside className={ui.rail} aria-label="Requests">
          <Panel title="My Requests (sample)">
            <ul className={ui.activity}>
              {MY_REQUESTS.map((r) => (
                <li key={r.id} className={ui.activityItem}>
                  <Tile tone={r.tone} size="sm"><Icon icon={ClipboardListIcon} /></Tile>
                  <span className={ui.activityText}>{r.title} · <span className={cx("text-fg-muted", ui.mono)}>{r.id}</span></span>
                  <Pill tone={r.tone}><PillDot />{r.state}</Pill>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Popular items">
            <ul className={ui.activity}>
              {CATALOG_ITEMS.filter(i => i.popular).slice(0, 4).map(i => (
                <li key={i.id} className={ui.activityItem}>
                  <Tile tone="warn" size="sm"><Icon icon={FlameIcon} /></Tile>
                  <span className={ui.activityText}>{i.title}</span>
                  <span className="text-fg-muted whitespace-nowrap">{i.eta}</span>
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
    <div className={ui.page}>
      <nav className={ui.crumbs} aria-label="Breadcrumb">
        <button type="button" className={ui.link} onClick={() => setRoute("dashboard")}>Home</button>
        <Icon icon={ChevronRightIcon} />
        <button type="button" className={ui.link} onClick={() => setRoute("catalog")}>Service Catalog</button>
        <Icon icon={ChevronRightIcon} />
        <span>New Employee Onboarding</span>
      </nav>

      <div className={sd.entityHead}>
        <div className={sd.entity}>
          <span className={entityTile("purple")} aria-hidden="true"><Icon icon={BoxIcon} /></span>
          <div>
            <span className={sd.number}>{submittedId ?? "REQ-4221"}</span>
            <h1 className={sd.entityTitle}>
              New Employee Onboarding
              {submittedId ? (
                <Pill tone="ok"><Icon icon={CheckIcon} /> Submitted</Pill>
              ) : (
                <Pill tone="muted"><Icon icon={PencilIcon} /> Draft</Pill>
              )}
              <Pill tone="purple">Bundle · {BUNDLE.length} items</Pill>
            </h1>
            <p className={sd.entityMeta}>
              <span>Auto-provisioned on day 1</span>
              <span>2 day SLA</span>
            </p>
          </div>
        </div>
        <div className={ui.headSide}>
          <div className={ui.headActions}>
            {submittedId ? (
              <>
                <button type="button" className={buttonClass()} onClick={() => setRoute("catalog")}><Icon icon={ArrowLeftIcon} /> Back to catalog</button>
                <button type="button" className={buttonClass("primary")} onClick={() => setRoute("incidents", { createdIncidentId: submittedId })}>
                  <Icon icon={ExternalLinkIcon} /> View in queue
                </button>
              </>
            ) : canWrite ? (
              <>
                <button type="button" className={buttonClass()}><Icon icon={SaveIcon} /> Save Draft</button>
                <button type="button" className={buttonClass("primary")} onClick={submit} disabled={create.isPending}>
                  <Icon className={`fa-solid ${create.isPending ? "fa-spinner fa-spin" : "fa-paper-plane"}`} /> {create.isPending ? "Submitting…" : "Submit Request"}
                </button>
              </>
            ) : (
              <>
                <ReadOnlyBadge />
                <button type="button" className={buttonClass()} onClick={() => setRoute("catalog")}><Icon icon={ArrowLeftIcon} /> Back to catalog</button>
              </>
            )}
          </div>
        </div>
      </div>

      {submittedId && (
        <div className={sd.alertOk} role="status">
          <Icon icon={CircleCheckIcon} />
          <span>Request submitted as <b>{submittedId}</b> · routed to Service Desk · 2 day SLA</span>
        </div>
      )}
      {error && (
        <div className={sd.alertCrit} role="alert">
          <Icon icon={TriangleAlertIcon} /> <span>{error}</span>
        </div>
      )}

      <div className={ui.split}>
        <div className={ui.rail}>
          <Panel title="Requested For">
            <dl className={ui.dl}>
              <dt>Name <span className={sd.req} aria-hidden="true">*</span></dt><dd><b>Alex Chen</b></dd>
              <dt>Email <span className={sd.req} aria-hidden="true">*</span></dt><dd className={ui.mono}>alex.chen@finspot.in</dd>
              <dt>Department <span className={sd.req} aria-hidden="true">*</span></dt><dd>Engineering</dd>
              <dt>Manager <span className={sd.req} aria-hidden="true">*</span></dt><dd>{manager}</dd>
              <dt>Role</dt><dd>Senior Software Engineer</dd>
              <dt>Start date <span className={sd.req} aria-hidden="true">*</span></dt><dd>May 1, 2026</dd>
              <dt>Office</dt><dd>San Francisco</dd>
              <dt>Cost center</dt><dd className={ui.mono}>CC-3041</dd>
            </dl>
          </Panel>

          <Panel title={`Bundle Contents (${BUNDLE.length} items)`}>
            <div className={ui.tableWrap}>
              <table className={ui.table}>
                <thead>
                  <tr><th scope="col"><span className="sr-only">Include</span></th><th scope="col">Item</th><th scope="col">Type</th></tr>
                </thead>
                <tbody>
                  {BUNDLE.map(([n, d, c, on], i) => (
                    <tr key={i}>
                      <td><input type="checkbox" defaultChecked={on} aria-label={`Include ${n}`} /></td>
                      <td className={ui.cellWrap}><span className="font-medium">{n}</span><span className={ui.sub}>{d}</span></td>
                      <td><Pill tone="muted">{c}</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Notes">
            <div className={ui.field}>
              <label htmlFor={`${idp}-notes`}>Special requirements</label>
              <textarea id={`${idp}-notes`} className={ui.textarea} placeholder="Any special requirements…" />
            </div>
          </Panel>
        </div>

        <aside className={ui.rail} aria-label="Request summary">
          <Panel title="Summary">
            <dl className={ui.dl}>
              <dt>Items</dt><dd>{BUNDLE.length}</dd>
              <dt>Approvals</dt><dd>{APPROVAL_CHAIN.filter(([, st]) => st !== "ready").length} required</dd>
              <dt>SLA</dt><dd>2 days</dd>
              <dt>Delivery</dt><dd>Apr 30 · by 5pm</dd>
            </dl>
          </Panel>
          <Panel title="Approval Chain">
            <ol className={ui.activity}>
              {APPROVAL_CHAIN.map(([w, st], i) => (
                <li key={i} className={ui.activityItem}>
                  <Tile tone={st === "ready" ? "ok" : "warn"} size="sm">{i + 1}</Tile>
                  <span className={ui.activityText}>{w}</span>
                  <Pill tone={st === "ready" ? "ok" : "warn"}><PillDot />{st}</Pill>
                </li>
              ))}
            </ol>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
