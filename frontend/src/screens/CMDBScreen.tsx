// CMDB — LinkedEye list layout: CI summary cards derived from the loaded CIs,
// the class taxonomy as filter chips (each opens an editable class dialog),
// the configuration-item table and a rail with the selected CI or class.
import React from "react";
import "@/styles/admin.css";
import { useNav } from "@/hooks/useNav";
import { USERS } from "@/data/core";
import { Empty, Pill, StatCard, fmt } from "@/components/ld";
import type { Tone } from "@/components/ld";
import { useConfigItems } from "@/api/hooks";
import { CIS } from "@/data/itsm";
import type { ConfigItem } from "@/lib/types";

import { Icon } from "@/components/Icon";
import { CheckIcon, ChevronRightIcon, FileInputIcon, FilterIcon, PencilIcon, PlusIcon, RefreshCwIcon, XIcon } from "lucide-react";
// Editable CI class taxonomy. `cls` matches the value on CI rows so the table can filter.
interface ClassDef {
  key: string;
  label: string;
  cls: string;
  count: number;
  icon: string;
  color: string;
  desc: string;
  parent: string;
  ownerTeam: string;
  tier: string;
  attrs: string[];
}

const CLASS_DEFS: ClassDef[] = [
  { key: "Application",   label: "Applications",    cls: "Application",   count: 48,   icon: "fa-cube",            color: "#2563eb", desc: "Deployable software services, APIs and microservices.", parent: "Business Service", ownerTeam: "Platform Eng", tier: "Tier 1 · critical", attrs: ["name", "version", "language", "repo", "runbook"] },
  { key: "Database",      label: "Databases",       cls: "Database",      count: 12,   icon: "fa-database",        color: "#8b5cf6", desc: "Relational and document data stores holding system-of-record data.", parent: "Application", ownerTeam: "Data Platform", tier: "Tier 1 · critical", attrs: ["engine", "version", "replica_role", "backup_policy", "pool_size"] },
  { key: "Data store",    label: "Data stores",     cls: "Data store",    count: 7,    icon: "fa-hard-drive",      color: "#0891b2", desc: "Warehouses, lakes and object stores for analytics and archival.", parent: "Application", ownerTeam: "Data Platform", tier: "Tier 2 · standard", attrs: ["kind", "capacity", "retention", "encryption"] },
  { key: "Cache",         label: "Caches",          cls: "Cache",         count: 9,    icon: "fa-bolt",            color: "#f59e0b", desc: "In-memory caching layers fronting databases and APIs.", parent: "Application", ownerTeam: "Platform Eng", tier: "Tier 2 · standard", attrs: ["engine", "eviction_policy", "max_memory", "ttl"] },
  { key: "Load balancer", label: "Load balancers",  cls: "Load balancer", count: 6,    icon: "fa-scale-balanced", color: "#0ea5e9", desc: "L4/L7 traffic distribution and TLS termination.", parent: "Network", ownerTeam: "Network Ops", tier: "Tier 1 · critical", attrs: ["algorithm", "listeners", "tls_policy", "health_check"] },
  { key: "Message queue", label: "Message queues",  cls: "Message queue", count: 8,    icon: "fa-list-check",      color: "#10b981", desc: "Async messaging brokers and event streams.", parent: "Application", ownerTeam: "Platform Eng", tier: "Tier 2 · standard", attrs: ["protocol", "partitions", "retention", "throughput"] },
  { key: "Platform",      label: "Platforms",       cls: "Platform",      count: 4,    icon: "fa-layer-group",     color: "#6366f1", desc: "Orchestration and control planes (Kubernetes, mesh).", parent: "Infrastructure", ownerTeam: "SRE Platform", tier: "Tier 1 · critical", attrs: ["provider", "version", "nodes", "region"] },
  { key: "External SaaS", label: "External SaaS",   cls: "External SaaS", count: 23,   icon: "fa-cloud",           color: "#ec4899", desc: "Third-party vendor dependencies reached over the public internet.", parent: "Business Service", ownerTeam: "Vendor Mgmt", tier: "Tier 1 · critical", attrs: ["vendor", "sla", "contract", "api_version"] },
  { key: "Network",       label: "Networks",        cls: "Network",       count: 18,   icon: "fa-network-wired",   color: "#7c3aed", desc: "VPCs, subnets, peering and transit links.", parent: "Infrastructure", ownerTeam: "Network Ops", tier: "Tier 2 · standard", attrs: ["cidr", "region", "peering", "acl"] },
  { key: "Server / VM",   label: "Servers / VMs",   cls: "Server / VM",   count: 212,  icon: "fa-server",          color: "#475569", desc: "Virtual machines and bare-metal compute hosts.", parent: "Infrastructure", ownerTeam: "SRE Platform", tier: "Tier 2 · standard", attrs: ["os", "cpu", "memory", "region", "hypervisor"] },
  { key: "Container",     label: "Containers",      cls: "Container",     count: 1847, icon: "fa-cubes",           color: "#14b8a6", desc: "Running container workloads scheduled by the platform.", parent: "Platform", ownerTeam: "Platform Eng", tier: "Tier 3 · ephemeral", attrs: ["image", "replicas", "cpu_limit", "namespace"] },
];

const CLASS_COLORS = ["#2563eb", "#8b5cf6", "#0891b2", "#f59e0b", "#0ea5e9", "#10b981", "#6366f1", "#ec4899", "#7c3aed", "#475569", "#14b8a6"];
const CLASS_TIERS = ["Tier 1 · critical", "Tier 2 · standard", "Tier 3 · ephemeral"];

const PARENT_CLASSES = ["Business Service", "Application", "Platform", "Network", "Infrastructure"];
const healthTone = (h: string): Tone => (h === "healthy" ? "ok" : h === "degraded" ? "warn" : "crit");
const ownerName = (id: string | null | undefined) => (id ? USERS.find((u) => u.id === id)?.name ?? id : null);

const SAMPLE_CHANGES: [string, string, string][] = [
  ["Rollback pool config", "2h ago", "CHG-2219"],
  ["Feature flag v2.4", "1d ago", "CHG-2216"],
  ["Stripe timeouts", "Incident · active", "INC-48291"],
];

export default function CMDBScreen() {
  const { setRoute } = useNav();
  const { data } = useConfigItems();
  const cis = data ?? [];
  const [classes, setClasses] = React.useState<ClassDef[]>(CLASS_DEFS);
  const [selected, setSelected] = React.useState<ConfigItem>(CIS[0]);
  const [sideMode, setSideMode] = React.useState<"ci" | "class">("ci"); // 'ci' | 'class'
  const [activeClass, setActiveClass] = React.useState<string | null>(null); // class key used for filtering / detail
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState<ClassDef | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);

  const cls = activeClass ? classes.find(c => c.key === activeClass) : null;
  const visibleCIs = activeClass ? cis.filter(c => c.cls === activeClass) : cis;
  const countOf = (key: string) => cis.filter(c => c.cls === key).length;

  function openClass(key: string) {
    setActiveClass(key);
    setSideMode("class");
    setEditing(false);
    setDraft(null);
    setModalOpen(true);
  }
  function startEdit() {
    const c = classes.find(x => x.key === activeClass)!;
    setDraft({ ...c, attrs: [...c.attrs] });
    setEditing(true);
  }
  function saveEdit() {
    setClasses(cs => cs.map(c => c.key === draft!.key ? { ...draft! } : c));
    setActiveClass(draft!.key);
    setEditing(false);
    setDraft(null);
  }
  function cancelEdit() { setEditing(false); setDraft(null); }
  function closeModal() { setModalOpen(false); setEditing(false); setDraft(null); }
  function showCIs() { setModalOpen(false); setEditing(false); setDraft(null); }
  function clearFilter() { setActiveClass(null); setSideMode("ci"); setEditing(false); setDraft(null); }
  function selectCI(ci: ConfigItem) { setSelected(ci); setSideMode("ci"); }

  const healthy = cis.filter(c => c.health === "healthy").length;
  const degraded = cis.filter(c => c.health === "degraded").length;
  const down = cis.filter(c => c.health === "down").length;

  return (
    <div className="ld-dash">
      <nav className="ld-crumbs" aria-label="Breadcrumb">
        <button type="button" className="ld-link" onClick={() => setRoute("dashboard")}>Home</button>
        <Icon icon={ChevronRightIcon} />
        <span>Configuration</span>
        <Icon icon={ChevronRightIcon} />
        {cls ? <button type="button" className="ld-link" onClick={clearFilter}>CMDB · CIs</button> : <span>CMDB · CIs</span>}
        {cls && <><Icon icon={ChevronRightIcon} /><span>{cls.label}</span></>}
      </nav>

      <div className="ld-head">
        <div>
          <h1>Configuration Management Database</h1>
          <p>Discovered configuration items, their classes, owners and dependencies</p>
        </div>
        <div className="ld-head-actions">
          <button type="button" className="ld-btn"><Icon icon={RefreshCwIcon} /> Re-sync</button>
          <button type="button" className="ld-btn"><Icon icon={FileInputIcon} /> Import</button>
          <button type="button" className="ld-btn ld-btn-primary"><Icon icon={PlusIcon} /> New CI</button>
        </div>
      </div>

      <div className="ld-grid ld-grid-5">
        <StatCard icon="fa-sitemap" tone="info" label="Total CIs" value={fmt(cis.length)} note="all classes" onClick={clearFilter} />
        <StatCard icon="fa-circle-check" tone="ok" label="Healthy" value={fmt(healthy)} note="reporting OK" />
        <StatCard icon="fa-triangle-exclamation" tone="warn" label="Degraded" value={fmt(degraded)} note="needs attention" />
        <StatCard icon="fa-circle-xmark" tone="crit" label="Down" value={fmt(down)} note="urgent" />
        <StatCard icon="fa-layer-group" tone="purple" label="Classes" value={fmt(classes.length)} note="taxonomy" />
      </div>

      <section className="ld-card ld-panel" aria-labelledby="cmdb-cls-h">
        <div className="ld-panel-head">
          <h2 id="cmdb-cls-h">CI Class Taxonomy</h2>
          <span className="ld-muted ld-small">Select a class to view, edit and filter its CIs</span>
        </div>
        <div className="ld-chips">
          {classes.map(c => (
            <button
              key={c.key}
              type="button"
              className={`ld-chip${activeClass === c.key ? " active" : ""}`}
              onClick={() => openClass(c.key)}
              aria-pressed={activeClass === c.key}
            >
              <Icon className={`fa-solid ${c.icon}`} style={activeClass === c.key ? undefined : { color: c.color }} />
              <span className="ld-chip-label">{c.label}</span>
              <span className="ld-chip-count">{fmt(countOf(c.key))}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="ld-split ld-split-wide">
        <section className="ld-card ld-panel" aria-labelledby="cmdb-ci-h">
          <div className="ld-panel-head">
            <h2 id="cmdb-ci-h">Configuration Items</h2>
            <span className="ld-muted ld-small">{activeClass ? `${visibleCIs.length} in ${cls!.label}` : `${cis.length} shown`}</span>
          </div>
          {activeClass && (
            <div className="ld-toolbar">
              <span className="ld-tag">
                <Icon className={`fa-solid ${cls!.icon}`} style={{ color: cls!.color }} /> Class: <b>{cls!.label}</b>
              </span>
              <button type="button" className="ld-btn ld-btn-sm" onClick={clearFilter}><Icon icon={XIcon} /> Clear filter</button>
              <span className="ld-muted ld-small">{visibleCIs.length} of {cis.length} CIs</span>
            </div>
          )}
          {visibleCIs.length ? (
            <div className="ld-table-wrap">
              <table className="ld-table">
                <thead>
                  <tr>
                    <th scope="col">CI</th>
                    <th scope="col">Class</th>
                    <th scope="col">Env</th>
                    <th scope="col">Region</th>
                    <th scope="col">Owner</th>
                    <th scope="col">Status</th>
                    <th scope="col">Deps</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleCIs.map(ci => {
                    const isSel = sideMode === "ci" && selected.id === ci.id;
                    return (
                      <tr key={ci.id} className={isSel ? "ld-row-selected" : undefined}>
                        <td>
                          <button type="button" className="ld-link ld-mono ld-strong ld-admin-row-btn" aria-pressed={isSel} onClick={() => selectCI(ci)}>{ci.name}</button>
                          <div className="ld-sub ld-mono">{ci.id}</div>
                        </td>
                        <td>{ci.cls}</td>
                        <td><Pill tone="muted">{ci.env}</Pill></td>
                        <td className="ld-mono ld-muted">{ci.region}</td>
                        <td>{ownerName(ci.owner) ?? <span className="ld-muted">—</span>}</td>
                        <td><Pill tone={healthTone(ci.health)}><span className="ld-pill-dot" />{ci.health}</Pill></td>
                        <td className="ld-mono">{ci.deps}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>No CIs of this class in the current discovery scope.</Empty>
          )}
        </section>

        <div className="ld-rail">
          {sideMode === "class" && cls ? (
            <section className="ld-card ld-panel" aria-labelledby="cmdb-side-cls-h">
              <div className="ld-panel-head">
                <h2 id="cmdb-side-cls-h"><Icon className={`fa-solid ${cls.icon}`} style={{ color: cls.color }} /> CI Class</h2>
                {!editing
                  ? <button type="button" className="ld-btn ld-btn-sm" onClick={startEdit}><Icon icon={PencilIcon} /> Edit</button>
                  : <span className="ld-admin-actions">
                      <button type="button" className="ld-btn ld-btn-sm" onClick={cancelEdit}>Cancel</button>
                      <button type="button" className="ld-btn ld-btn-sm ld-btn-primary" onClick={saveEdit}><Icon icon={CheckIcon} /> Save</button>
                    </span>
                }
              </div>
              {!editing ? (
                <ClassDetails cls={cls} count={countOf(cls.key)} />
              ) : (
                <ClassForm idPrefix="cmdb-side" draft={draft!} setDraft={setDraft} />
              )}
            </section>
          ) : (
            <section className="ld-card ld-panel" aria-labelledby="cmdb-side-ci-h">
              <div className="ld-panel-head"><h2 id="cmdb-side-ci-h">Selected CI</h2></div>
              {selected ? (
                <dl className="ld-dl">
                  <dt>Name</dt><dd className="ld-mono ld-strong">{selected.name}</dd>
                  <dt>ID</dt><dd className="ld-mono">{selected.id}</dd>
                  <dt>Class</dt><dd><button type="button" className="ld-link" onClick={() => openClass(selected.cls)}>{selected.cls}</button></dd>
                  <dt>Environment</dt><dd>{selected.env}</dd>
                  <dt>Region</dt><dd className="ld-mono">{selected.region}</dd>
                  <dt>Owner</dt><dd>{ownerName(selected.owner) ?? <span className="ld-muted">unassigned</span>}</dd>
                  <dt>Status</dt><dd><Pill tone={healthTone(selected.health)}><span className="ld-pill-dot" />{selected.health}</Pill></dd>
                  <dt>Dependencies</dt><dd>{selected.deps} CIs</dd>
                </dl>
              ) : (
                <Empty>Select a CI to see its details.</Empty>
              )}
            </section>
          )}

          <section className="ld-card ld-panel" aria-labelledby="cmdb-chg-h">
            <div className="ld-panel-head">
              <h2 id="cmdb-chg-h">Recent Changes</h2>
              <Pill tone="muted">Sample data</Pill>
            </div>
            <ul className="ld-activity">
              {SAMPLE_CHANGES.map(([t, when, ref]) => (
                <li key={ref}>
                  <span className="ld-activity-text">{t} <span className="ld-muted ld-small">· {when}</span></span>
                  <span className="ld-mono-name">{ref}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      {modalOpen && cls && (
        <ClassModal
          cls={cls}
          editing={editing}
          draft={draft}
          setDraft={setDraft}
          onClose={closeModal}
          onEdit={startEdit}
          onCancel={cancelEdit}
          onSave={saveEdit}
          onShowCIs={showCIs}
          visibleCount={visibleCIs.length}
        />
      )}
    </div>
  );
}

function ClassDetails({ cls, count }: { cls: ClassDef; count: number }) {
  return (
    <dl className="ld-dl">
      <dt>Class name</dt><dd className="ld-strong">{cls.label}</dd>
      <dt>CI type key</dt><dd className="ld-mono">{cls.cls}</dd>
      <dt>Description</dt><dd>{cls.desc}</dd>
      <dt>Parent class</dt><dd>{cls.parent}</dd>
      <dt>Owner team</dt><dd>{cls.ownerTeam}</dd>
      <dt>Tier</dt><dd>{cls.tier}</dd>
      <dt>CI count</dt><dd>{fmt(count)} loaded</dd>
      <dt>Attributes</dt>
      <dd>
        <ul className="ld-tags">
          {cls.attrs.map(a => <li key={a} className="ld-tag ld-mono">{a}</li>)}
        </ul>
      </dd>
    </dl>
  );
}

function ClassForm({ idPrefix, draft, setDraft }: { idPrefix: string; draft: ClassDef; setDraft: React.Dispatch<React.SetStateAction<ClassDef | null>> }) {
  const id = (k: string) => `${idPrefix}-${k}`;
  return (
    <div className="ld-form">
      <div className="ld-admin-form-grid">
        <div className="ld-form-field">
          <label htmlFor={id("label")}>Class name <span className="ld-req">*</span></label>
          <input id={id("label")} className="ld-input" value={draft.label} onChange={e => setDraft(d => ({ ...d!, label: e.target.value }))} />
        </div>
        <div className="ld-form-field">
          <label htmlFor={id("cls")}>CI type key</label>
          <input id={id("cls")} className="ld-input ld-mono" value={draft.cls} disabled />
          <span className="ld-admin-hint">Immutable — used as the discovery join key.</span>
        </div>
        <div className="ld-form-field ld-admin-span">
          <label htmlFor={id("desc")}>Description</label>
          <textarea id={id("desc")} className="ld-input ld-textarea" rows={3} value={draft.desc} onChange={e => setDraft(d => ({ ...d!, desc: e.target.value }))} />
        </div>
        <div className="ld-form-field">
          <label htmlFor={id("parent")}>Parent class</label>
          <select id={id("parent")} className="ld-select" value={draft.parent} onChange={e => setDraft(d => ({ ...d!, parent: e.target.value }))}>
            {PARENT_CLASSES.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div className="ld-form-field">
          <label htmlFor={id("tier")}>Tier</label>
          <select id={id("tier")} className="ld-select" value={draft.tier} onChange={e => setDraft(d => ({ ...d!, tier: e.target.value }))}>
            {CLASS_TIERS.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div className="ld-form-field ld-admin-span">
          <label htmlFor={id("owner")}>Owner team</label>
          <input id={id("owner")} className="ld-input" value={draft.ownerTeam} onChange={e => setDraft(d => ({ ...d!, ownerTeam: e.target.value }))} />
        </div>
        <fieldset className="ld-form-field ld-admin-span ld-admin-fieldset">
          <legend>Class colour</legend>
          <div className="ld-admin-swatches">
            {CLASS_COLORS.map(col => (
              <button key={col} type="button" className="ld-admin-swatch" style={{ background: col }} aria-pressed={draft.color === col} onClick={() => setDraft(d => ({ ...d!, color: col }))} aria-label={`Colour ${col}`} />
            ))}
          </div>
        </fieldset>
        <div className="ld-form-field ld-admin-span">
          <label htmlFor={id("attrs")}>Attributes <span className="ld-req">*</span></label>
          <input id={id("attrs")} className="ld-input ld-mono" value={draft.attrs.join(", ")} onChange={e => setDraft(d => ({ ...d!, attrs: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }))} placeholder="comma-separated" />
          <span className="ld-admin-hint">Schema fields discovered and indexed for every CI of this class.</span>
        </div>
      </div>
    </div>
  );
}

export function ClassModal({
  cls,
  editing,
  draft,
  setDraft,
  onClose,
  onEdit,
  onCancel,
  onSave,
  onShowCIs,
  visibleCount,
}: {
  cls: ClassDef;
  editing: boolean;
  draft: ClassDef | null;
  setDraft: React.Dispatch<React.SetStateAction<ClassDef | null>>;
  onClose: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onShowCIs: () => void;
  visibleCount: number;
}) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="le-modal-backdrop" onClick={onClose}>
      <div className="le-modal ld-admin-modal" role="dialog" aria-modal="true" aria-labelledby="cmdb-modal-h" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <div className="le-modal-head">
          <div className="le-modal-icon" style={{ color: cls.color, background: cls.color + "18" }} aria-hidden="true"><Icon className={`fa-solid ${cls.icon}`} /></div>
          <div className="le-modal-titles">
            <h3 id="cmdb-modal-h">{cls.label}</h3>
            <p>CI Class · {cls.cls} · {fmt(visibleCount)} configuration items loaded</p>
          </div>
          <button type="button" className="le-modal-x" onClick={onClose} aria-label="Close"><Icon icon={XIcon} /></button>
        </div>

        <div className="le-modal-body">
          {!editing ? <ClassDetails cls={cls} count={visibleCount} /> : <ClassForm idPrefix="cmdb-modal" draft={draft!} setDraft={setDraft} />}
        </div>

        <div className="le-modal-foot">
          {!editing ? (
            <>
              <button type="button" className="ld-btn" onClick={onShowCIs}><Icon icon={FilterIcon} /> Show {visibleCount} CIs</button>
              <button type="button" className="ld-btn" onClick={onClose}>Close</button>
              <button type="button" className="ld-btn ld-btn-primary" onClick={onEdit}><Icon icon={PencilIcon} /> Edit class</button>
            </>
          ) : (
            <>
              <button type="button" className="ld-btn" onClick={onCancel}>Cancel</button>
              <button type="button" className="ld-btn ld-btn-primary" onClick={onSave}><Icon icon={CheckIcon} /> Save changes</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
