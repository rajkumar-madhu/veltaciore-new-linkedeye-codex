// CMDB — LinkedEye list layout: CI summary cards derived from the loaded CIs,
// the class taxonomy as filter chips (each opens an editable class dialog),
// the configuration-item table and a rail with the selected CI or class.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { USERS } from "@/data/core";
import { Empty, Pill, PillDot, StatCard, fmt } from "@/components/ld";
import { Button, Crumbs, Page, PageHead, Table, TextButton, cx, ui } from "@/components/ui";
import type { Tone } from "@/components/ld";
import { useConfigItems } from "@/api/hooks";
import { CIS } from "@/data/itsm";
import type { ConfigItem } from "@/lib/types";

import { Icon } from "@/components/Icon";
import { CheckIcon, FileInputIcon, FilterIcon, PencilIcon, PlusIcon, RefreshCwIcon, XIcon } from "lucide-react";
// Class chips, CI row link, form controls and the class dialog
// (were ld-chip / ld-link ld-mono / ld-admin-* / le-modal-* classes).
const chipClass = (active: boolean) =>
  cx(
    "inline-flex flex-col items-center justify-center gap-1 min-w-[104px] min-h-[76px] py-2.5 px-3 border rounded-lg cursor-pointer shadow-sm [&_.ld-icon]:text-2xl",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
    active ? "bg-accent border-accent text-white [&_.ld-icon]:text-white" : "bg-bg-raised border-line text-fg hover:border-line-strong [&_.ld-icon]:text-accent",
  );
const chipLabel = (active: boolean) => cx("text-sm", active ? "text-white" : "text-fg-muted");
const rowLink = cx(
  "border-0 bg-transparent p-0 font-mono text-xs font-medium text-accent text-left cursor-pointer hover:underline",
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
);
// mono table cell: the cell keeps its 13px size and colour
const monoCell = "font-mono font-semibold";
const formGrid = "grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-x-4 gap-y-3";
const field = cx(ui.field, "[&>label]:font-semibold");
const input = cx(ui.input, "[&[readonly]]:bg-bg-muted [&[readonly]]:text-fg-muted disabled:bg-bg-muted disabled:text-fg-muted");
// (ld-input's `font: inherit` came after ld-mono, so the weight stays normal)
const monoInput = "font-mono !text-[12.5px]";
const swatch = cx(
  "w-[26px] h-[26px] p-0 rounded-[6px] border-2 border-transparent cursor-pointer",
  "aria-pressed:border-fg aria-pressed:shadow-[inset_0_0_0_2px_var(--bg-raised)]",
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
);
const m = {
  backdrop: "fixed inset-0 bg-[rgba(10,20,51,0.5)] backdrop-blur-[3px] z-[1200] grid place-items-center py-10 px-5 overflow-y-auto",
  modal: "bg-bg-raised rounded-[12px] max-w-full shadow-pop border border-line overflow-hidden flex flex-col max-h-[calc(100vh-80px)] animate-[modalpop_0.16s_cubic-bezier(.2,.8,.3,1)]",
  head: "flex items-center gap-3 py-4 px-4.5 border-b border-line",
  icon: "w-[38px] h-[38px] rounded-[9px] grid place-items-center text-[17px] shrink-0",
  titles: "flex-1 min-w-0",
  title: "text-[15.5px] font-bold text-fg leading-[1.25] whitespace-nowrap overflow-hidden text-ellipsis",
  subtitle: "text-xs text-fg-subtle mt-0.5",
  close: "w-[30px] h-[30px] rounded-[7px] border border-line bg-bg-raised text-fg-subtle cursor-pointer grid place-items-center shrink-0 hover:bg-bg-muted hover:text-fg",
  body: "p-4.5 overflow-y-auto",
  foot: "flex items-center justify-end gap-2 py-[13px] px-4.5 border-t border-line bg-bg-muted flex-wrap",
};

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
    <Page>
      <Crumbs
        items={[
          { label: "Home", onClick: () => setRoute("dashboard") },
          { label: "Configuration" },
          { label: "CMDB · CIs", onClick: cls ? clearFilter : undefined },
          ...(cls ? [{ label: cls.label }] : []),
        ]}
      />

      <PageHead
        title="Configuration Management Database"
        subtitle="Discovered configuration items, their classes, owners and dependencies"
        actions={
          <>
            <Button><Icon icon={RefreshCwIcon} /> Re-sync</Button>
            <Button><Icon icon={FileInputIcon} /> Import</Button>
            <Button variant="primary"><Icon icon={PlusIcon} /> New CI</Button>
          </>
        }
      />

      <div className={cx(ui.grid, ui.cols[5])}>
        <StatCard icon="fa-sitemap" tone="info" label="Total CIs" value={fmt(cis.length)} note="all classes" onClick={clearFilter} />
        <StatCard icon="fa-circle-check" tone="ok" label="Healthy" value={fmt(healthy)} note="reporting OK" />
        <StatCard icon="fa-triangle-exclamation" tone="warn" label="Degraded" value={fmt(degraded)} note="needs attention" />
        <StatCard icon="fa-circle-xmark" tone="crit" label="Down" value={fmt(down)} note="urgent" />
        <StatCard icon="fa-layer-group" tone="purple" label="Classes" value={fmt(classes.length)} note="taxonomy" />
      </div>

      <section className={cx(ui.card, ui.panel)} aria-labelledby="cmdb-cls-h">
        <div className={ui.panelHead}>
          <h2 className={ui.panelTitle} id="cmdb-cls-h">CI Class Taxonomy</h2>
          <span className="text-fg-muted text-xs">Select a class to view, edit and filter its CIs</span>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {classes.map(c => (
            <button
              key={c.key}
              type="button"
              className={chipClass(activeClass === c.key)}
              onClick={() => openClass(c.key)}
              aria-pressed={activeClass === c.key}
            >
              <Icon className={`fa-solid ${c.icon}`} style={activeClass === c.key ? undefined : { color: c.color }} />
              <span className={chipLabel(activeClass === c.key)}>{c.label}</span>
              <span className="text-md font-bold">{fmt(countOf(c.key))}</span>
            </button>
          ))}
        </div>
      </section>

      <div className={ui.splitWide}>
        <section className={cx(ui.card, ui.panel)} aria-labelledby="cmdb-ci-h">
          <div className={ui.panelHead}>
            <h2 className={ui.panelTitle} id="cmdb-ci-h">Configuration Items</h2>
            <span className="text-fg-muted text-xs">{activeClass ? `${visibleCIs.length} in ${cls!.label}` : `${cis.length} shown`}</span>
          </div>
          {activeClass && (
            <div className={ui.toolbar}>
              <span className={ui.tag}>
                <Icon className={`fa-solid ${cls!.icon}`} style={{ color: cls!.color }} /> Class: <b>{cls!.label}</b>
              </span>
              <Button size="sm" onClick={clearFilter}><Icon icon={XIcon} /> Clear filter</Button>
              <span className="text-fg-muted text-xs">{visibleCIs.length} of {cis.length} CIs</span>
            </div>
          )}
          {visibleCIs.length ? (
            <Table>
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
                      <tr key={ci.id} className={isSel ? ui.rowSelected : undefined}>
                        <td>
                          <button type="button" className={rowLink} aria-pressed={isSel} onClick={() => selectCI(ci)}>{ci.name}</button>
                          <div className={cx(ui.sub, ui.mono)}>{ci.id}</div>
                        </td>
                        <td>{ci.cls}</td>
                        <td><Pill tone="muted">{ci.env}</Pill></td>
                        <td className={monoCell}>{ci.region}</td>
                        <td>{ownerName(ci.owner) ?? <span className="text-fg-muted">—</span>}</td>
                        <td><Pill tone={healthTone(ci.health)}><PillDot />{ci.health}</Pill></td>
                        <td className={monoCell}>{ci.deps}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
          ) : (
            <Empty>No CIs of this class in the current discovery scope.</Empty>
          )}
        </section>

        <div className={ui.rail}>
          {sideMode === "class" && cls ? (
            <section className={cx(ui.card, ui.panel)} aria-labelledby="cmdb-side-cls-h">
              <div className={ui.panelHead}>
                <h2 className={ui.panelTitle} id="cmdb-side-cls-h"><Icon className={`fa-solid ${cls.icon}`} style={{ color: cls.color }} /> CI Class</h2>
                {!editing
                  ? <Button size="sm" onClick={startEdit}><Icon icon={PencilIcon} /> Edit</Button>
                  : <span className="flex flex-wrap items-center gap-2">
                      <Button size="sm" onClick={cancelEdit}>Cancel</Button>
                      <Button variant="primary" size="sm" onClick={saveEdit}><Icon icon={CheckIcon} /> Save</Button>
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
            <section className={cx(ui.card, ui.panel)} aria-labelledby="cmdb-side-ci-h">
              <div className={ui.panelHead}><h2 className={ui.panelTitle} id="cmdb-side-ci-h">Selected CI</h2></div>
              {selected ? (
                <dl className={ui.dl}>
                  <dt>Name</dt><dd className="font-mono text-xs font-medium">{selected.name}</dd>
                  <dt>ID</dt><dd className={ui.mono}>{selected.id}</dd>
                  <dt>Class</dt><dd><TextButton onClick={() => openClass(selected.cls)}>{selected.cls}</TextButton></dd>
                  <dt>Environment</dt><dd>{selected.env}</dd>
                  <dt>Region</dt><dd className={ui.mono}>{selected.region}</dd>
                  <dt>Owner</dt><dd>{ownerName(selected.owner) ?? <span className="text-fg-muted">unassigned</span>}</dd>
                  <dt>Status</dt><dd><Pill tone={healthTone(selected.health)}><PillDot />{selected.health}</Pill></dd>
                  <dt>Dependencies</dt><dd>{selected.deps} CIs</dd>
                </dl>
              ) : (
                <Empty>Select a CI to see its details.</Empty>
              )}
            </section>
          )}

          <section className={cx(ui.card, ui.panel)} aria-labelledby="cmdb-chg-h">
            <div className={ui.panelHead}>
              <h2 className={ui.panelTitle} id="cmdb-chg-h">Recent Changes</h2>
              <Pill tone="muted">Sample data</Pill>
            </div>
            <ul className={ui.activity}>
              {SAMPLE_CHANGES.map(([t, when, ref]) => (
                <li key={ref} className={ui.activityItem}>
                  <span className={ui.activityText}>{t} <span className="text-fg-muted text-xs">· {when}</span></span>
                  <span className="font-mono text-[12.5px] text-accent">{ref}</span>
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
    </Page>
  );
}

function ClassDetails({ cls, count }: { cls: ClassDef; count: number }) {
  return (
    <dl className={ui.dl}>
      <dt>Class name</dt><dd className="font-medium">{cls.label}</dd>
      <dt>CI type key</dt><dd className={ui.mono}>{cls.cls}</dd>
      <dt>Description</dt><dd>{cls.desc}</dd>
      <dt>Parent class</dt><dd>{cls.parent}</dd>
      <dt>Owner team</dt><dd>{cls.ownerTeam}</dd>
      <dt>Tier</dt><dd>{cls.tier}</dd>
      <dt>CI count</dt><dd>{fmt(count)} loaded</dd>
      <dt>Attributes</dt>
      <dd>
        <ul className="list-none flex flex-wrap justify-start gap-1.5 m-0 p-0">
          {cls.attrs.map(a => <li key={a} className={cx(ui.tag, "font-mono")}>{a}</li>)}
        </ul>
      </dd>
    </dl>
  );
}

function ClassForm({ idPrefix, draft, setDraft }: { idPrefix: string; draft: ClassDef; setDraft: React.Dispatch<React.SetStateAction<ClassDef | null>> }) {
  const id = (k: string) => `${idPrefix}-${k}`;
  return (
    <div className={ui.form}>
      <div className={formGrid}>
        <div className={field}>
          <label htmlFor={id("label")}>Class name <span className={ui.req}>*</span></label>
          <input id={id("label")} className={input} value={draft.label} onChange={e => setDraft(d => ({ ...d!, label: e.target.value }))} />
        </div>
        <div className={field}>
          <label htmlFor={id("cls")}>CI type key</label>
          <input id={id("cls")} className={cx(input, monoInput)} value={draft.cls} disabled />
          <span className="text-xs text-fg-subtle">Immutable — used as the discovery join key.</span>
        </div>
        <div className={cx(field, "col-[1/-1]")}>
          <label htmlFor={id("desc")}>Description</label>
          <textarea id={id("desc")} className={ui.textarea} rows={3} value={draft.desc} onChange={e => setDraft(d => ({ ...d!, desc: e.target.value }))} />
        </div>
        <div className={field}>
          <label htmlFor={id("parent")}>Parent class</label>
          <select id={id("parent")} className={ui.select} value={draft.parent} onChange={e => setDraft(d => ({ ...d!, parent: e.target.value }))}>
            {PARENT_CLASSES.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div className={field}>
          <label htmlFor={id("tier")}>Tier</label>
          <select id={id("tier")} className={ui.select} value={draft.tier} onChange={e => setDraft(d => ({ ...d!, tier: e.target.value }))}>
            {CLASS_TIERS.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div className={cx(field, "col-[1/-1]")}>
          <label htmlFor={id("owner")}>Owner team</label>
          <input id={id("owner")} className={input} value={draft.ownerTeam} onChange={e => setDraft(d => ({ ...d!, ownerTeam: e.target.value }))} />
        </div>
        <fieldset className={cx(field, "col-[1/-1] border-0 p-0 m-0 min-w-0 [&>legend]:mb-1 [&>legend]:font-semibold")}>
          <legend>Class colour</legend>
          <div className="flex flex-wrap gap-1.5">
            {CLASS_COLORS.map(col => (
              <button key={col} type="button" className={swatch} style={{ background: col }} aria-pressed={draft.color === col} onClick={() => setDraft(d => ({ ...d!, color: col }))} aria-label={`Colour ${col}`} />
            ))}
          </div>
        </fieldset>
        <div className={cx(field, "col-[1/-1]")}>
          <label htmlFor={id("attrs")}>Attributes <span className={ui.req}>*</span></label>
          <input id={id("attrs")} className={cx(input, monoInput)} value={draft.attrs.join(", ")} onChange={e => setDraft(d => ({ ...d!, attrs: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }))} placeholder="comma-separated" />
          <span className="text-xs text-fg-subtle">Schema fields discovered and indexed for every CI of this class.</span>
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
    <div className={m.backdrop} onClick={onClose}>
      <div className={cx(m.modal, "w-[720px]")} role="dialog" aria-modal="true" aria-labelledby="cmdb-modal-h" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <div className={m.head}>
          <div className={m.icon} style={{ color: cls.color, background: cls.color + "18" }} aria-hidden="true"><Icon className={`fa-solid ${cls.icon}`} /></div>
          <div className={m.titles}>
            <h3 id="cmdb-modal-h" className={m.title}>{cls.label}</h3>
            <p className={m.subtitle}>CI Class · {cls.cls} · {fmt(visibleCount)} configuration items loaded</p>
          </div>
          <button type="button" className={m.close} onClick={onClose} aria-label="Close"><Icon icon={XIcon} /></button>
        </div>

        <div className={cx(m.body, "flex flex-col gap-3")}>
          {!editing ? <ClassDetails cls={cls} count={visibleCount} /> : <ClassForm idPrefix="cmdb-modal" draft={draft!} setDraft={setDraft} />}
        </div>

        <div className={m.foot}>
          {!editing ? (
            <>
              <Button onClick={onShowCIs}><Icon icon={FilterIcon} /> Show {visibleCount} CIs</Button>
              <Button onClick={onClose}>Close</Button>
              <Button variant="primary" onClick={onEdit}><Icon icon={PencilIcon} /> Edit class</Button>
            </>
          ) : (
            <>
              <Button onClick={onCancel}>Cancel</Button>
              <Button variant="primary" onClick={onSave}><Icon icon={CheckIcon} /> Save changes</Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
