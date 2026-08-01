// CMDB in ServiceNow form-style.
// Ported from screens/cmdb.jsx.
import React from "react";
import { Kpi, FormSection, Field, UserById } from "@/components/primitives";
import { useConfigItems } from "@/api/hooks";
import { CIS } from "@/data/itsm";
import type { ConfigItem } from "@/lib/types";

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

export default function CMDBScreen() {
  const { data } = useConfigItems();
  const cis = data ?? [];
  const [classes, setClasses] = React.useState<ClassDef[]>(CLASS_DEFS);
  const [selected, setSelected] = React.useState<ConfigItem>(CIS[0]);
  const [sideMode, setSideMode] = React.useState<"ci" | "class">("ci"); // 'ci' | 'class'
  const [activeClass, setActiveClass] = React.useState<string | null>(null); // class key used for filtering / detail
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState<ClassDef | null>(null);
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const [modalOpen, setModalOpen] = React.useState(false);
  const toggle = (id: string) => setCollapsed(c => ({ ...c, [id]: !c[id] }));

  const cls = activeClass ? classes.find(c => c.key === activeClass) : null;
  const visibleCIs = activeClass ? cis.filter(c => c.cls === activeClass) : cis;

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

  return (
    <div className="page page-fade sn-dash">
      <div className="sn-breadcrumb">
        <a className="sn-link">Home</a><span className="sn-bc-sep">›</span>
        <a className="sn-link">Configuration</a><span className="sn-bc-sep">›</span>
        <span>CMDB · CIs</span>
        {cls && <><span className="sn-bc-sep">›</span><span>{cls.label}</span></>}
      </div>

      <div className="sn-form-header">
        <div className="sn-form-title-row">
          <span className="sn-rec-number">CMDB</span>
          <span className="sn-pill state-progress"><i className="fa-solid fa-spinner fa-spin" /> 2,156 CIs</span>
          <span className="sn-pill state-neutral"><i className="fa-solid fa-sitemap" /> {classes.length} classes</span>
        </div>
        <div className="sn-form-title-meta">
          <div>
            <h1>Configuration Management Database</h1>
            <div className="sn-form-sub">Auto-discovered CIs · last sync 4m ago · dependency graph live</div>
          </div>
          <div className="sn-form-actions">
            <button className="sn-btn"><i className="fa-solid fa-rotate" /> Re-sync</button>
            <button className="sn-btn"><i className="fa-solid fa-file-import" /> Import</button>
            <button className="sn-btn primary"><i className="fa-solid fa-plus" /> New CI</button>
          </div>
        </div>
      </div>

      <div className="sn-kpi-strip">
        <Kpi l="Total CIs" v="2,156" s="all classes" tone="neutral" />
        <Kpi l="Healthy" v={cis.filter(c => c.health === "healthy").length} s="reporting OK" tone="ok" />
        <Kpi l="Degraded" v={cis.filter(c => c.health === "degraded").length} s="needs attention" tone="warn" />
        <Kpi l="Down" v={cis.filter(c => c.health === "down").length} s="urgent" tone="crit" />
        <Kpi l="Classes" v={classes.length} s="taxonomy" tone="neutral" />
        <Kpi l="Last sync" v="4m" s="ago" tone="neutral" />
      </div>

      <div className="sn-form-layout">
        <div className="sn-form-main">
          <FormSection id="classes" title="CI Class Taxonomy" badge={`${classes.length} classes`} collapsed={collapsed.classes} onToggle={toggle}>
            <div className="sn-kind-hint"><i className="fa-solid fa-arrow-pointer" /> Click any class to open its full record — view details, edit attributes, and filter its CIs</div>
            <div className="sn-kind-grid">
              {classes.map(c => (
                <button
                  key={c.key}
                  type="button"
                  className={`sn-kind-card ${activeClass === c.key ? "is-active" : ""}`}
                  onClick={() => openClass(c.key)}
                  aria-pressed={activeClass === c.key}
                >
                  <div className="sn-kind-icon" style={{ color: c.color, background: c.color + "14" }}><i className={`fa-solid ${c.icon}`} /></div>
                  <div className="sn-kind-body">
                    <div className="sn-kind-count">{c.count.toLocaleString()}</div>
                    <div className="sn-kind-label">{c.label}</div>
                  </div>
                  <i className="fa-solid fa-chevron-right sn-kind-go" />
                </button>
              ))}
            </div>
          </FormSection>

          <FormSection
            id="cis"
            title="Configuration Items"
            badge={activeClass ? `${visibleCIs.length} in ${cls!.label}` : `${cis.length} shown`}
            collapsed={collapsed.cis}
            onToggle={toggle}
          >
            {activeClass && (
              <div className="sn-filter-bar">
                <span className="sn-filter-chip">
                  <i className={`fa-solid ${cls!.icon}`} style={{ color: cls!.color }} /> Class: <b>{cls!.label}</b>
                  <button type="button" className="sn-filter-x" onClick={clearFilter} aria-label="Clear filter"><i className="fa-solid fa-xmark" /></button>
                </span>
                <span className="text-mute" style={{ fontSize: 12 }}>{visibleCIs.length} of {cis.length} CIs</span>
              </div>
            )}
            <table className="sn-list-table">
              <thead><tr><th>CI</th><th style={{width:130}}>Class</th><th style={{width:90}}>Env</th><th style={{width:110}}>Region</th><th style={{width:130}}>Owner</th><th style={{width:110}}>Status</th><th style={{width:80}}>Deps</th></tr></thead>
              <tbody>
                {visibleCIs.map(ci => (
                  <tr key={ci.id} onClick={() => selectCI(ci)} style={{ cursor: "pointer", background: sideMode === "ci" && selected.id === ci.id ? "#eaf0f7" : undefined }}>
                    <td><a className="sn-link mono"><b>{ci.name}</b></a><div className="text-mute mono" style={{ fontSize: 11, marginTop: 2 }}>{ci.id}</div></td>
                    <td>{ci.cls}</td>
                    <td><span className="sn-state-pill state-neutral"><i className="fa-solid fa-circle" /> {ci.env}</span></td>
                    <td className="mono text-mute">{ci.region}</td>
                    <td>{ci.owner ? <UserById id={ci.owner} /> : <span className="text-mute">—</span>}</td>
                    <td><span className={`sn-state-pill ${ci.health === "healthy" ? "svc-healthy" : ci.health === "degraded" ? "state-mitigating" : "state-active"}`}><i className="fa-solid fa-circle" /> {ci.health}</span></td>
                    <td className="mono">{ci.deps}</td>
                  </tr>
                ))}
                {visibleCIs.length === 0 && (
                  <tr><td colSpan={7} className="text-mute" style={{ textAlign: "center", padding: "22px 0" }}>No CIs of this class in the current discovery scope.</td></tr>
                )}
              </tbody>
            </table>
          </FormSection>
        </div>

        <aside className="sn-form-side">
          {sideMode === "class" && cls ? (
            <div className="sn-side-card">
              <div className="sn-side-head">
                <span><i className={`fa-solid ${cls.icon}`} style={{ color: cls.color, marginRight: 7 }} />CI Class</span>
                {!editing
                  ? <button type="button" className="sn-btn sm" onClick={startEdit}><i className="fa-solid fa-pen" /> Edit</button>
                  : <span className="row row-6">
                      <button type="button" className="sn-btn sm" onClick={cancelEdit}>Cancel</button>
                      <button type="button" className="sn-btn sm primary" onClick={saveEdit}><i className="fa-solid fa-check" /> Save</button>
                    </span>
                }
              </div>
              <div className="sn-side-body">
                {!editing ? (
                  <>
                    <Field label="Class name" value={<b>{cls.label}</b>} />
                    <Field label="CI type key" value={<span className="mono">{cls.cls}</span>} />
                    <Field label="Description" value={cls.desc} />
                    <Field label="Parent class" value={cls.parent} />
                    <Field label="Owner team" value={cls.ownerTeam} />
                    <Field label="Tier" value={cls.tier} />
                    <Field label="CI count" value={`${cls.count.toLocaleString()} discovered`} />
                    <Field label="Attributes" value={
                      <div className="sn-attr-tags">{cls.attrs.map(a => <span key={a} className="sn-attr-tag mono">{a}</span>)}</div>
                    } />
                  </>
                ) : (
                  <>
                    <Field label="Class name" value={
                      <input className="select" style={{ width: "100%" }} value={draft!.label} onChange={e => setDraft(d => ({ ...d!, label: e.target.value }))} />
                    } />
                    <Field label="CI type key" value={<span className="mono text-mute">{draft!.cls} <span style={{ fontSize: 10 }}>(immutable)</span></span>} />
                    <Field label="Description" value={
                      <textarea className="select" rows={3} style={{ width: "100%", resize: "vertical", fontFamily: "inherit" }} value={draft!.desc} onChange={e => setDraft(d => ({ ...d!, desc: e.target.value }))} />
                    } />
                    <Field label="Parent class" value={
                      <select className="select" style={{ width: "100%" }} value={draft!.parent} onChange={e => setDraft(d => ({ ...d!, parent: e.target.value }))}>
                        {["Business Service", "Application", "Platform", "Network", "Infrastructure"].map(o => <option key={o}>{o}</option>)}
                      </select>
                    } />
                    <Field label="Owner team" value={
                      <input className="select" style={{ width: "100%" }} value={draft!.ownerTeam} onChange={e => setDraft(d => ({ ...d!, ownerTeam: e.target.value }))} />
                    } />
                    <Field label="Tier" value={
                      <select className="select" style={{ width: "100%" }} value={draft!.tier} onChange={e => setDraft(d => ({ ...d!, tier: e.target.value }))}>
                        {CLASS_TIERS.map(o => <option key={o}>{o}</option>)}
                      </select>
                    } />
                    <Field label="Color" value={
                      <div className="sn-swatch-row">
                        {CLASS_COLORS.map(col => (
                          <button key={col} type="button" className={`sn-swatch ${draft!.color === col ? "on" : ""}`} style={{ background: col }} onClick={() => setDraft(d => ({ ...d!, color: col }))} aria-label={col} />
                        ))}
                      </div>
                    } />
                    <Field label="Attributes" value={
                      <input className="select mono" style={{ width: "100%", fontSize: 12 }} value={draft!.attrs.join(", ")} onChange={e => setDraft(d => ({ ...d!, attrs: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }))} placeholder="comma-separated" />
                    } />
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="sn-side-card">
              <div className="sn-side-head">Selected CI</div>
              <div className="sn-side-body">
                <Field label="Name" value={<span className="mono"><b>{selected.name}</b></span>} />
                <Field label="ID" value={<span className="mono">{selected.id}</span>} />
                <Field label="Class" value={<a className="sn-link" onClick={() => openClass(selected.cls)} style={{ cursor: "pointer" }}>{selected.cls}</a>} />
                <Field label="Environment" value={selected.env} />
                <Field label="Region" value={<span className="mono">{selected.region}</span>} />
                <Field label="Owner" value={selected.owner ? <UserById id={selected.owner} /> : <span className="text-mute">unassigned</span>} />
                <Field label="Status" value={<span className={`sn-state-pill ${selected.health === "healthy" ? "svc-healthy" : selected.health === "degraded" ? "state-mitigating" : "state-active"}`}><i className="fa-solid fa-circle" /> {selected.health}</span>} />
                <Field label="Dependencies" value={`${selected.deps} CIs`} />
                <Field label="Tag" value="mission-critical · pci-scope" />
                <Field label="Discovered" value="4 min ago · Datadog agent" />
              </div>
            </div>
          )}

          <div className="sn-side-card">
            <div className="sn-side-head">Recent Changes <span className="sn-side-count">3</span></div>
            <div className="sn-side-body">
              <div className="sn-related-row">
                <div><div className="sn-related-title">Rollback pool config</div><div className="sn-related-meta">2h ago</div></div>
                <a className="sn-link mono">CHG-2219</a>
              </div>
              <div className="sn-related-row">
                <div><div className="sn-related-title">Feature flag v2.4</div><div className="sn-related-meta">1d ago</div></div>
                <a className="sn-link mono">CHG-2216</a>
              </div>
              <div className="sn-related-row">
                <div><div className="sn-related-title">Stripe timeouts</div><div className="sn-related-meta">Incident · active</div></div>
                <a className="sn-link mono">INC-48291</a>
              </div>
            </div>
          </div>
        </aside>
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
      <div className="le-modal" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <div className="le-modal-head">
          <div className="le-modal-icon" style={{ color: cls.color, background: cls.color + "18" }}><i className={`fa-solid ${cls.icon}`} /></div>
          <div className="le-modal-titles">
            <h3>{cls.label}</h3>
            <p>CI Class · {cls.cls} · {cls.count.toLocaleString()} configuration items</p>
          </div>
          <button className="le-modal-x" onClick={onClose} aria-label="Close"><i className="fa-solid fa-xmark" /></button>
        </div>

        <div className="le-modal-body">
          {!editing ? (
            <dl className="le-dl">
              <dt><i className="fa-solid fa-tag" /> Class name</dt>
              <dd><b>{cls.label}</b></dd>
              <dt><i className="fa-solid fa-fingerprint" /> CI type key</dt>
              <dd><span className="mono">{cls.cls}</span></dd>
              <dt><i className="fa-solid fa-align-left" /> Description</dt>
              <dd>{cls.desc}</dd>
              <dt><i className="fa-solid fa-sitemap" /> Parent class</dt>
              <dd>{cls.parent}</dd>
              <dt><i className="fa-solid fa-users-gear" /> Owner team</dt>
              <dd>{cls.ownerTeam}</dd>
              <dt><i className="fa-solid fa-layer-group" /> Tier</dt>
              <dd>{cls.tier}</dd>
              <dt><i className="fa-solid fa-database" /> CI count</dt>
              <dd>{cls.count.toLocaleString()} discovered</dd>
              <dt><i className="fa-solid fa-list" /> Attributes</dt>
              <dd><div className="sn-attr-tags">{cls.attrs.map(a => <span key={a} className="sn-attr-tag mono">{a}</span>)}</div></dd>
            </dl>
          ) : (
            <>
              <div className="le-grid-2">
                <div className="le-field">
                  <label>Class name <span className="req">*</span></label>
                  <input className="le-input" value={draft!.label} onChange={e => setDraft(d => ({ ...d!, label: e.target.value }))} />
                </div>
                <div className="le-field">
                  <label>CI type key</label>
                  <input className="le-input mono" value={draft!.cls} disabled />
                  <div className="hint">Immutable — used as the discovery join key.</div>
                </div>
              </div>
              <div className="le-field">
                <label>Description</label>
                <textarea className="le-input" rows={3} style={{ resize: "vertical", fontFamily: "inherit" }} value={draft!.desc} onChange={e => setDraft(d => ({ ...d!, desc: e.target.value }))} />
              </div>
              <div className="le-grid-2">
                <div className="le-field">
                  <label>Parent class</label>
                  <select className="le-input" value={draft!.parent} onChange={e => setDraft(d => ({ ...d!, parent: e.target.value }))}>
                    {["Business Service", "Application", "Platform", "Network", "Infrastructure"].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div className="le-field">
                  <label>Tier</label>
                  <select className="le-input" value={draft!.tier} onChange={e => setDraft(d => ({ ...d!, tier: e.target.value }))}>
                    {CLASS_TIERS.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div className="le-field">
                <label>Owner team</label>
                <input className="le-input" value={draft!.ownerTeam} onChange={e => setDraft(d => ({ ...d!, ownerTeam: e.target.value }))} />
              </div>
              <div className="le-field">
                <label>Class color</label>
                <div className="sn-swatch-row">
                  {CLASS_COLORS.map(col => (
                    <button key={col} type="button" className={`sn-swatch ${draft!.color === col ? "on" : ""}`} style={{ background: col }} onClick={() => setDraft(d => ({ ...d!, color: col }))} aria-label={col} />
                  ))}
                </div>
              </div>
              <div className="le-field">
                <label>Attributes <span className="req">*</span></label>
                <input className="le-input mono" value={draft!.attrs.join(", ")} onChange={e => setDraft(d => ({ ...d!, attrs: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }))} placeholder="comma-separated" />
                <div className="hint">Schema fields discovered and indexed for every CI of this class.</div>
              </div>
            </>
          )}
        </div>

        <div className="le-modal-foot">
          {!editing ? (
            <>
              <button className="sn-btn" onClick={onShowCIs}><i className="fa-solid fa-filter" /> Show {visibleCount} CIs</button>
              <button className="sn-btn" onClick={onClose}>Close</button>
              <button className="sn-btn primary" onClick={onEdit}><i className="fa-solid fa-pen" /> Edit class</button>
            </>
          ) : (
            <>
              <button className="sn-btn" onClick={onCancel}>Cancel</button>
              <button className="sn-btn primary" onClick={onSave}><i className="fa-solid fa-check" /> Save changes</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
