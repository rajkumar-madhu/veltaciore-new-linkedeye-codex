// Domains — LinkedEye layout: domain summary cards, a filterable domain list
// and a details panel for the selected domain. Reads and writes
// /api/infra/domains/: the API resolves each name, checks its TLS certificate
// and probes the associated service ports every 15 minutes, or on "Check now".
import React from "react";
import { useCheckDomain, useDeleteDomain, useDomains, useSaveDomain } from "@/api/hooks";
import type { DomainInput, MonitoredDomain } from "@/api/hooks";
import { apiErrorText } from "@/api/client";
import { NO_TENANT, useUiStore } from "@/store/ui";
import { Empty, Pill, PillDot, StatCard, fmt } from "@/components/ld";
import type { Tone } from "@/components/ld";

import { Button, Card, Input, Page, PageHead, SearchBox, Select, Tab, Table, Tabs, TextButton, Tile, cx, ui } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { GlobeIcon, PencilIcon, PlusIcon, SearchIcon, Trash2Icon, XIcon } from "lucide-react";
/** The global input:focus outline colour beats SearchBox's outline-none; keep the inner input unringed (the box shows the ring). */
const searchInputFix = "focus:outline-none";
const PAGE_SIZE = 10;
/** Monospace table cell: keeps the cell's 13px size (the old mono class lost to the table cell rule). */
const tdMono = "font-mono font-semibold";
const TYPES = ["Production", "Application", "API", "Monitoring", "Backup", "VPN", "Mail", "Test", "Other"];

const TYPE_TONE: Record<string, Tone> = {
  Production: "info", Application: "purple", API: "info", Monitoring: "ok",
  Backup: "warn", VPN: "purple", Mail: "muted", Test: "muted",
};
const DNS_TONE: Record<MonitoredDomain["dns_status"], Tone> = { Resolved: "ok", Error: "crit", Unknown: "muted" };
const SSL_TONE: Record<MonitoredDomain["ssl_status"], Tone> = { Valid: "ok", Expiring: "warn", Expired: "crit", Error: "crit", Unknown: "muted", Off: "muted" };
const SSL_LABEL: Partial<Record<MonitoredDomain["ssl_status"], string>> = { Unknown: "Not checked", Off: "Not checked (off)" };

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—");
const daysLeft = (iso: string | null) => (iso ? Math.floor((Date.parse(iso) - Date.now()) / 86_400_000) : null);

/** Error line and action row of the detail panel and form. */
const formError = "m-0 px-3 py-2 rounded bg-critical-bg text-critical text-sm";
const formActions = "flex flex-wrap gap-2 items-center";
/** A row of form fields that wrap; each field grows from 160px. */
const formRow = "flex flex-wrap gap-3 items-end";
const rowField = cx(ui.field, "flex-[1_1_160px]");
const checkLabel = "flex items-center gap-1.5 text-sm text-fg min-h-[38px]";

const EMPTY: DomainInput = { name: "", type: "Production", site: "", description: "", active: true, check_ssl: true, ssl_port: 443, services: [] };

export default function DomainsScreen() {
  const q = useDomains();
  const domains = q.data ?? [];
  const allClients = useUiStore((s) => s.tenant.id === NO_TENANT.id);
  const [query, setQuery] = React.useState("");
  const [site, setSite] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [type, setType] = React.useState("");
  const [page, setPage] = React.useState(0);
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [detailTab, setDetailTab] = React.useState<"overview" | "services">("overview");
  const [editing, setEditing] = React.useState<{ id?: number; form: DomainInput } | null>(null);

  const sites = [...new Set(domains.map((d) => d.site).filter(Boolean))].sort();
  const types = [...new Set(domains.map((d) => d.type))].sort();
  const text = query.trim().toLowerCase();
  const visible = domains.filter(
    (d) =>
      (!site || d.site === site) &&
      (!type || d.type === type) &&
      (!status || (status === "active" ? d.active : status === "inactive" ? !d.active : status === "dns" ? d.dns_status === "Error" : status === "ssl" ? ["Expiring", "Expired", "Error"].includes(d.ssl_status) : d.last_checked == null)) &&
      (!text || d.name.includes(text) || d.resolved_ips.some((ip) => ip.includes(text)) || d.description.toLowerCase().includes(text)),
  );
  React.useEffect(() => setPage(0), [query, site, status, type]);
  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const rows = visible.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const current = domains.find((d) => d.id === selectedId) ?? visible[0];

  const active = domains.filter((d) => d.active).length;
  const sslAttention = domains.filter((d) => ["Expiring", "Expired", "Error"].includes(d.ssl_status)).length;
  const dnsIssues = domains.filter((d) => d.dns_status === "Error").length;
  const unchecked = domains.filter((d) => d.last_checked == null).length;

  return (
    <Page>
      <PageHead
        title="Domains"
        subtitle="Domain names, DNS resolution, SSL certificates and the service ports behind them"
        actions={
          <Button variant="primary" onClick={() => setEditing({ form: { ...EMPTY } })}>
            <Icon icon={PlusIcon} /> Add Domain
          </Button>
        }
      />

      <div className={cx(ui.grid, ui.cols[5])}>
        <StatCard icon="fa-globe" tone="info" label="Total Domains" value={fmt(domains.length)} note={`${active} active · ${domains.length - active} inactive`} onClick={() => setStatus("")} />
        <StatCard icon="fa-circle-check" tone="ok" label="Resolving" value={fmt(domains.filter((d) => d.dns_status === "Resolved").length)} note="resolved on the last check" />
        <StatCard icon="fa-lock" tone="warn" label="SSL Attention" value={fmt(sslAttention)} note="expiring, expired or failing" onClick={() => setStatus("ssl")} />
        <StatCard icon="fa-sitemap" tone="crit" label="DNS Issues" value={fmt(dnsIssues)} note="failing resolution" onClick={() => setStatus("dns")} />
        <StatCard icon="fa-clock" tone="muted" label="Not Checked Yet" value={fmt(unchecked)} note="checks run every 15 minutes" onClick={() => setStatus("unchecked")} />
      </div>

      <div className={ui.splitWide}>
        <Card as="section" className={ui.panel} aria-labelledby="dom-h">
          <div className={ui.panelHead}>
            <h2 id="dom-h" className={ui.panelTitle}>Domain List</h2>
            <span className="text-fg-muted text-xs">{fmt(visible.length)} domains</span>
          </div>
          <div className={ui.toolbar}>
            <label htmlFor="dom-search" className="sr-only">Search domains</label>
            <SearchBox inputClassName={searchInputFix} className="flex-[1_1_240px]" icon={<Icon icon={SearchIcon} />} id="dom-search" type="search" placeholder="Search domains or IPs…" value={query} onChange={(e) => setQuery(e.target.value)} />
            <label htmlFor="dom-site" className="sr-only">Site</label>
            <Select id="dom-site" value={site} onChange={(e) => setSite(e.target.value)}>
              <option value="">All sites</option>
              {sites.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
            <label htmlFor="dom-status" className="sr-only">Status</label>
            <Select id="dom-status" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="dns">DNS issues</option>
              <option value="ssl">SSL attention</option>
              <option value="unchecked">Not checked yet</option>
            </Select>
            <label htmlFor="dom-type" className="sr-only">Type</label>
            <Select id="dom-type" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">All types</option>
              {types.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </div>
          {q.isLoading ? <Empty>Loading domains…</Empty> : q.isError ? <Empty>The API is not reachable from this browser.</Empty> : rows.length ? (
            <Table>
                <thead>
                  <tr>
                    <th scope="col">Domain</th>
                    <th scope="col">Type</th>
                    <th scope="col">Site</th>
                    <th scope="col">Resolves to</th>
                    <th scope="col">DNS</th>
                    <th scope="col">SSL</th>
                    <th scope="col">Last checked</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((d) => (
                    <tr key={d.id} className={d.id === current?.id ? ui.rowSelected : undefined}>
                      <td>
                        <TextButton className="inline-flex items-center gap-1.5" aria-pressed={d.id === current?.id}
                          onClick={() => { setSelectedId(d.id); setDetailTab("overview"); setEditing(null); }}>
                          <Icon icon={GlobeIcon} /> {d.name}
                        </TextButton>
                        {!d.active && <span className={ui.sub}>inactive</span>}
                      </td>
                      <td><Pill tone={TYPE_TONE[d.type] ?? "muted"}>{d.type}</Pill></td>
                      <td>{d.site || "—"}</td>
                      <td className={tdMono}>{d.resolved_ips[0] ?? "—"}{d.resolved_ips.length > 1 && <span className={ui.sub}>+{d.resolved_ips.length - 1} more</span>}</td>
                      <td><Pill tone={DNS_TONE[d.dns_status]}><PillDot />{d.dns_status === "Unknown" ? "Not checked" : d.dns_status}</Pill></td>
                      <td><Pill tone={SSL_TONE[d.ssl_status]}><PillDot />{SSL_LABEL[d.ssl_status] ?? d.ssl_status}</Pill></td>
                      <td>{when(d.last_checked)}</td>
                    </tr>
                  ))}
                </tbody>
            </Table>
          ) : (
            <Empty>{domains.length ? "No domains match these filters." : "No domains yet. Add one to start checking DNS and SSL."}</Empty>
          )}
          {visible.length > PAGE_SIZE && (
            <nav className={ui.pager} aria-label="Pagination">
              <span className="text-fg-muted text-xs">Showing {page * PAGE_SIZE + 1}–{Math.min(visible.length, (page + 1) * PAGE_SIZE)} of {visible.length}</span>
              <div className={ui.pagerBtns}>
                {Array.from({ length: pages }, (_, i) => (
                  <Button key={i} size="sm" variant={i === page ? "primary" : "default"} aria-current={i === page ? "page" : undefined} onClick={() => setPage(i)}>
                    {i + 1}
                  </Button>
                ))}
              </div>
            </nav>
          )}
        </Card>

        {editing ? (
          <DomainForm
            key={editing.id ?? "new"}
            id={editing.id}
            initial={editing.form}
            onDone={(saved) => { setEditing(null); if (saved) setSelectedId(saved.id); }}
          />
        ) : (
          <DomainDetails
            domain={current}
            readOnly={!!current?.shared && !allClients}
            tab={detailTab}
            setTab={setDetailTab}
            onEdit={(d) => setEditing({ id: d.id, form: { name: d.name, type: d.type, site: d.site, description: d.description, active: d.active, check_ssl: d.check_ssl, ssl_port: d.ssl_port, services: d.services.map(({ name, type, port }) => ({ name, type, port })) } })}
            onDeleted={() => setSelectedId(null)}
          />
        )}
      </div>
    </Page>
  );
}

function DomainDetails({ domain, readOnly, tab, setTab, onEdit, onDeleted }: {
  domain?: MonitoredDomain; readOnly: boolean; tab: "overview" | "services"; setTab: (t: "overview" | "services") => void;
  onEdit: (d: MonitoredDomain) => void; onDeleted: () => void;
}) {
  const check = useCheckDomain();
  const del = useDeleteDomain();
  if (!domain) {
    return <Card as="section" className={ui.panel}><Empty>Select a domain to see its details.</Empty></Card>;
  }
  const days = daysLeft(domain.ssl_expiry);
  const error = check.error ?? del.error;
  return (
    <Card as="section" className={ui.panel} aria-labelledby="dom-detail-h">
      <div className={ui.panelHead}>
        <h2 id="dom-detail-h" className={ui.panelTitle}>Domain Details</h2>
        <div className={formActions}>
          <Button size="sm" disabled={check.isPending} onClick={() => check.mutate(domain.id)}>
            <Icon className={`fa-solid ${check.isPending ? "fa-spinner fa-spin" : "fa-rotate"}`} /> {check.isPending ? "Checking…" : "Check now"}
          </Button>
          {!readOnly && <>
            <Button size="sm" onClick={() => onEdit(domain)}><Icon icon={PencilIcon} /> Edit</Button>
            <Button size="sm" disabled={del.isPending}
              onClick={() => { if (window.confirm(`Stop monitoring ${domain.name}?`)) del.mutate(domain.id, { onSuccess: onDeleted }); }}>
              <Icon icon={Trash2Icon} /> Delete
            </Button>
          </>}
        </div>
      </div>
      {error && <p className={formError} role="alert">{apiErrorText(error)}</p>}
      {readOnly && <p className="text-fg-muted text-xs">Shared domain: visible to every client, editable from the all-clients view.</p>}
      <div className="flex items-center gap-3">
        <Tile tone="info" size="md"><Icon icon={GlobeIcon} /></Tile>
        <div>
          <div className="flex items-center gap-2 flex-wrap text-xl font-bold text-fg">
            {domain.name} <Pill tone={domain.active ? "ok" : "muted"}>{domain.active ? "Active" : "Inactive"}</Pill>
          </div>
          <div className="text-fg-muted text-xs">{domain.type} domain · last checked {when(domain.last_checked)}</div>
        </div>
      </div>
      <Tabs aria-label="Domain detail views">
        <Tab active={tab === "overview"} onClick={() => setTab("overview")}>Overview</Tab>
        <Tab active={tab === "services"} onClick={() => setTab("services")}>
          Associated Services ({domain.services.length})
        </Tab>
      </Tabs>
      {tab === "overview" ? (
        <dl className={ui.dl}>
          <dt>Domain name</dt><dd>{domain.name}</dd>
          <dt>Domain type</dt><dd>{domain.type}</dd>
          <dt>Site mapping</dt><dd>{domain.site || "—"}</dd>
          <dt>Resolves to</dt><dd className={ui.mono}>{domain.resolved_ips.length ? domain.resolved_ips.join(", ") : "—"}</dd>
          <dt>DNS status</dt><dd><Pill tone={DNS_TONE[domain.dns_status]}><PillDot />{domain.dns_status === "Unknown" ? "Not checked" : domain.dns_status}</Pill></dd>
          <dt>SSL status</dt><dd><Pill tone={SSL_TONE[domain.ssl_status]}><PillDot />{SSL_LABEL[domain.ssl_status] ?? domain.ssl_status}</Pill> <span className="text-fg-muted text-xs">port {domain.ssl_port}</span></dd>
          <dt>SSL expiry</dt><dd>{domain.ssl_expiry ? <>{when(domain.ssl_expiry)} <span className="text-fg-muted text-xs">({days! < 0 ? `${-days!} days ago` : `${days} days left`})</span></> : "—"}</dd>
          <dt>Issuer</dt><dd>{domain.ssl_issuer || "—"}</dd>
          {domain.check_error && <><dt>Last error</dt><dd>{domain.check_error}</dd></>}
          <dt>Created</dt><dd>{when(domain.created_at)}</dd>
          <dt>Last modified</dt><dd>{when(domain.updated_at)}</dd>
          <dt>Description</dt><dd>{domain.description || "—"}</dd>
        </dl>
      ) : domain.services.length ? (
        <Table>
            <thead>
              <tr><th scope="col">Service</th><th scope="col">Type</th><th scope="col">Port</th><th scope="col">Status</th><th scope="col">Connect</th></tr>
            </thead>
            <tbody>
              {domain.services.map((s) => (
                <tr key={s.id ?? s.port}>
                  <td className="font-medium">{s.name}</td>
                  <td>{s.type || "—"}</td>
                  <td className={tdMono}>{s.port}</td>
                  <td>{s.up == null ? <Pill tone="muted">Not checked</Pill> : <Pill tone={s.up ? "ok" : "crit"}><PillDot />{s.up ? "Up" : "Down"}</Pill>}</td>
                  <td>{s.response_ms != null ? `${s.response_ms} ms` : "—"}</td>
                </tr>
              ))}
            </tbody>
        </Table>
      ) : (
        <Empty>No service ports associated with this domain.</Empty>
      )}
    </Card>
  );
}

function DomainForm({ id, initial, onDone }: { id?: number; initial: DomainInput; onDone: (saved?: MonitoredDomain) => void }) {
  const save = useSaveDomain();
  const [f, setF] = React.useState<DomainInput>(initial);
  const set = <K extends keyof DomainInput>(k: K, v: DomainInput[K]) => setF((x) => ({ ...x, [k]: v }));
  const setSvc = (i: number, patch: Partial<DomainInput["services"][number]>) =>
    set("services", f.services.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const uid = React.useId();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    save.mutate({ id, body: f }, { onSuccess: (d) => onDone(d as MonitoredDomain) });
  };

  return (
    <Card as="section" className={ui.panel} aria-labelledby={`${uid}-h`}>
      <div className={ui.panelHead}><h2 id={`${uid}-h`} className={ui.panelTitle}>{id ? "Edit Domain" : "Add Domain"}</h2></div>
      <form className={ui.form} onSubmit={submit}>
        <label className={ui.field} htmlFor={`${uid}-name`}>
          Domain name *
          <Input id={`${uid}-name`} required value={f.name} placeholder="app.example.com" onChange={(e) => set("name", e.target.value)} />
        </label>
        <div className={formRow}>
          <label className={rowField} htmlFor={`${uid}-type`}>
            Type
            <Select id={`${uid}-type`} value={f.type} onChange={(e) => set("type", e.target.value)}>
              {TYPES.map((t) => <option key={t}>{t}</option>)}
            </Select>
          </label>
          <label className={rowField} htmlFor={`${uid}-site`}>
            Site
            <Input id={`${uid}-site`} value={f.site} placeholder="Mumbai (NSE)" onChange={(e) => set("site", e.target.value)} />
          </label>
        </div>
        <label className={ui.field} htmlFor={`${uid}-desc`}>
          Description
          <Input id={`${uid}-desc`} value={f.description} onChange={(e) => set("description", e.target.value)} />
        </label>
        <div className={formRow}>
          <label className={checkLabel}><input type="checkbox" checked={f.active} onChange={(e) => set("active", e.target.checked)} /> Active (checked every 15 minutes)</label>
          <label className={checkLabel}><input type="checkbox" checked={f.check_ssl} onChange={(e) => set("check_ssl", e.target.checked)} /> Check SSL certificate</label>
          <label className={rowField} htmlFor={`${uid}-port`}>
            SSL port
            <Input id={`${uid}-port`} type="number" min={1} max={65535} value={f.ssl_port} disabled={!f.check_ssl} onChange={(e) => set("ssl_port", Number(e.target.value))} />
          </label>
        </div>
        <fieldset className="border border-line rounded px-3 py-2.5 flex flex-col gap-2 m-0">
          <legend className="text-xs text-fg-muted px-1">Service ports</legend>
          {f.services.map((s, i) => (
            <div key={i} className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_90px_auto] gap-1.5 [@media(max-width:560px)]:grid-cols-[1fr_1fr]">
              <label className="sr-only" htmlFor={`${uid}-sn-${i}`}>Service name</label>
              <Input id={`${uid}-sn-${i}`} required placeholder="Name" value={s.name} onChange={(e) => setSvc(i, { name: e.target.value })} />
              <label className="sr-only" htmlFor={`${uid}-st-${i}`}>Type</label>
              <Input id={`${uid}-st-${i}`} placeholder="Type (HTTPS…)" value={s.type} onChange={(e) => setSvc(i, { type: e.target.value })} />
              <label className="sr-only" htmlFor={`${uid}-sp-${i}`}>Port</label>
              <Input id={`${uid}-sp-${i}`} type="number" required min={1} max={65535} placeholder="Port" value={s.port || ""} onChange={(e) => setSvc(i, { port: Number(e.target.value) })} />
              <Button size="sm" aria-label={`Remove ${s.name || "service"}`} onClick={() => set("services", f.services.filter((_, j) => j !== i))}>
                <Icon icon={XIcon} />
              </Button>
            </div>
          ))}
          <Button size="sm" className="self-start" onClick={() => set("services", [...f.services, { name: "", type: "", port: 0 }])}>
            <Icon icon={PlusIcon} /> Add port
          </Button>
        </fieldset>
        {save.error && <p className={formError} role="alert">{apiErrorText(save.error)}</p>}
        <div className={formActions}>
          <Button type="submit" variant="primary" disabled={save.isPending}>{save.isPending ? "Saving…" : id ? "Save changes" : "Add domain"}</Button>
          <Button onClick={() => onDone()}>Cancel</Button>
        </div>
        <p className="text-fg-muted text-xs">The first check runs within 15 minutes, or use "Check now" on the domain.</p>
      </form>
    </Card>
  );
}
