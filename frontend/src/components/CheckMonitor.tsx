// Shared LinkedEye layout for endpoint check screens (URL Checker, Telnet
// Monitoring): summary cards, status donut + slowest-checks bars, a filterable
// checks table, an "add check" form and recent check events.
// Checks are tenant-scoped: the view opens on the client picked in the sidebar,
// with an "All clients" option. Checks added through the form live in
// component state for this session only.
import React from "react";
import { useUiStore } from "@/store/ui";
import { useTenants } from "@/api/hooks";
import { TENANTS } from "@/data/core";
import { Donut, Empty, Legend, Panel, Pill, PillDot, StatCard, fmt } from "@/components/ld";
import { Button, Card, Input, Page, PageHead, SearchBox, Select, Table, Textarea, Tile, buttonClass, cx, ui } from "@/components/ui";
import type { Slice, Tone } from "@/components/ld";

import { Icon } from "@/components/Icon";
import { PlusIcon, SearchIcon } from "lucide-react";
/** The global input:focus outline colour beats SearchBox's outline-none; keep the inner input unringed (the box shows the ring). */
const searchInputFix = "focus:outline-none";
export type CheckStatus = "up" | "down" | "warn" | "pending";

export interface CheckRow {
  id: string;
  /** Owning client (tenant id). */
  client: string;
  name: string;
  description?: string;
  target: string;
  kind: string;
  site: string;
  status: CheckStatus;
  responseMs: number | null;
  lastCheck: string;
  uptime: number | null;
}

export interface CheckField {
  id: string;
  label: string;
  type: "text" | "number" | "select" | "textarea";
  options?: string[];
  placeholder?: string;
  /** Regex the value must match (HTML pattern attribute), with a hint shown on mismatch. */
  pattern?: string;
  patternHint?: string;
  required?: boolean;
  defaultValue?: string;
}

export interface CheckMonitorConfig {
  title: string;
  subtitle: string;
  icon: string;
  noun: { one: string; many: string };
  statusLabel: Record<CheckStatus, string>;
  /** Event message per status, for the recent events list. */
  eventMessage: Record<CheckStatus, string>;
  columns: { target: string; kind: string };
  rows: CheckRow[];
  formFields: CheckField[];
  /** Build a row from submitted form values; values.client is the chosen tenant id. */
  toRow: (values: Record<string, string>) => CheckRow;
}

const STATUS_TONE: Record<CheckStatus, Tone> = { up: "ok", down: "crit", warn: "warn", pending: "muted" };
const STATUS_COLOR: Record<CheckStatus, string> = { up: "#16a34a", down: "#e5383b", warn: "#f5a524", pending: "#98a2b3" };
const PAGE_SIZE = 10;
/** Monospace table cell: keeps the cell's 13px size (the old mono class lost to the table cell rule). */
const tdMono = "font-mono font-semibold";

/** Lower-case a noun unless it is an acronym ("URL", "URLs"). */
const lc = (s: string) => (/^[A-Z]{2}/.test(s) ? s : s.toLowerCase());

// Uptime cells were meant to be tinted, but the table cell colour always won;
// only the bold weight showed, so that is what is kept.
const uptimeTone = (u: number | null): string | undefined => (u == null ? undefined : "font-semibold");

export function CheckMonitorScreen(cfg: CheckMonitorConfig) {
  const tenant = useUiStore((s) => s.tenant);
  const clients = useTenants().data ?? TENANTS;
  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? id;
  const [client, setClient] = React.useState(tenant.id);
  // Follow the sidebar's client switcher.
  React.useEffect(() => setClient(tenant.id), [tenant.id]);
  const [added, setAdded] = React.useState<CheckRow[]>([]);
  const [query, setQuery] = React.useState("");
  const [site, setSite] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [kind, setKind] = React.useState("");
  const [page, setPage] = React.useState(0);
  const idp = React.useId();

  const initialValues = () => ({ client: tenant.id, ...Object.fromEntries(cfg.formFields.map((f) => [f.id, f.defaultValue ?? ""])) });
  const [values, setValues] = React.useState<Record<string, string>>(initialValues);
  const [saved, setSaved] = React.useState<string | null>(null);

  const all = React.useMemo(() => [...added, ...cfg.rows], [added, cfg.rows]);
  // Everything below (cards, charts, events, table) is scoped to the chosen client.
  const scoped = client ? all.filter((r) => r.client === client) : all;
  const sites = [...new Set(scoped.map((r) => r.site))].sort();
  const kinds = [...new Set(scoped.map((r) => r.kind))].sort();
  const q = query.trim().toLowerCase();
  const visible = scoped.filter(
    (r) =>
      (!site || r.site === site) &&
      (!status || r.status === status) &&
      (!kind || r.kind === kind) &&
      (!q || [r.name, r.target, r.description ?? ""].some((v) => v.toLowerCase().includes(q))),
  );
  React.useEffect(() => setPage(0), [query, site, status, kind, client]);
  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const pageRows = visible.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const count = (s: CheckStatus) => scoped.filter((r) => r.status === s).length;
  const timed = scoped.filter((r) => r.responseMs != null) as (CheckRow & { responseMs: number })[];
  const avgMs = timed.length ? timed.reduce((a, r) => a + r.responseMs, 0) / timed.length : 0;
  const pct = (n: number) => (scoped.length ? `${((n / scoped.length) * 100).toFixed(1)}%` : "—");

  const statusSlices: Slice[] = (["up", "down", "warn", "pending"] as CheckStatus[])
    .map((s) => ({ label: cfg.statusLabel[s], value: count(s), color: STATUS_COLOR[s] }))
    .filter((s) => s.value > 0);
  const slowest = [...timed].sort((a, b) => b.responseMs - a.responseMs).slice(0, 6);
  const slowMax = slowest[0]?.responseMs || 1;

  // Failures first, then the most recent checks.
  const severity: Record<CheckStatus, number> = { down: 0, warn: 1, up: 2, pending: 3 };
  const events = [...scoped]
    .filter((r) => r.status !== "pending")
    .sort((a, b) => severity[a.status] - severity[b.status] || b.lastCheck.localeCompare(a.lastCheck))
    .slice(0, 6);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const row = cfg.toRow(values);
    setAdded((rows) => [row, ...rows]);
    setSaved(`${row.name} (${clientName(row.client)})`);
    // Show the new check even if the list was scoped to another client.
    if (client && row.client !== client) setClient(row.client);
    setValues(initialValues());
  };

  return (
    <Page>
      <PageHead
        title={cfg.title}
        subtitle={<>{cfg.subtitle} · {client ? clientName(client) : "all clients"}</>}
        actions={<>
          <label htmlFor={`${idp}-client`} className="text-sm text-fg-muted">Client</label>
          <Select id={`${idp}-client`} value={client} onChange={(e) => setClient(e.target.value)}>
            <option value="">All clients</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <a className={buttonClass("primary")} href={`#${idp}-form`}>
            <Icon icon={PlusIcon} /> Add {lc(cfg.noun.one)}
          </a>
        </>}
      />

      <div className={cx(ui.grid, ui.cols[5])}>
        <StatCard icon={cfg.icon} tone="info" label={`Total ${cfg.noun.many}`} value={fmt(scoped.length)} note={`configured ${lc(cfg.noun.many)}`} onClick={() => setStatus("")} />
        <StatCard icon="fa-circle-check" tone="ok" label={cfg.statusLabel.up} value={fmt(count("up"))} note={pct(count("up"))} onClick={() => setStatus("up")} />
        <StatCard icon="fa-circle-xmark" tone="crit" label={cfg.statusLabel.down} value={fmt(count("down"))} note={pct(count("down"))} onClick={() => setStatus("down")} />
        <StatCard icon="fa-clock" tone="warn" label={cfg.statusLabel.warn} value={fmt(count("warn"))} note={pct(count("warn"))} onClick={() => setStatus("warn")} />
        <StatCard icon="fa-gauge-high" tone="purple" label="Avg Response Time" value={timed.length ? `${Math.round(avgMs)} ms` : "—"} note={`across ${timed.length} responding`} />
      </div>

      <div className={cx(ui.grid, ui.cols[2])}>
        <Panel title={`${cfg.noun.one} Status Overview`}>
          {statusSlices.length ? (
            <div className="flex flex-wrap items-center gap-4.5">
              <Donut slices={statusSlices} center={fmt(scoped.length)} sub={`Total ${cfg.noun.many}`} label={`${scoped.length} ${lc(cfg.noun.many)} by status`} />
              <Legend slices={statusSlices} />
            </div>
          ) : (
            <Empty>No {lc(cfg.noun.many)} yet.</Empty>
          )}
        </Panel>
        <Panel title="Slowest Responses">
          {slowest.length ? (
            <ul className={ui.bars}>
              {slowest.map((r) => (
                <li key={r.id} className={ui.barItemWide}>
                  <span className={ui.barLabel}>{r.name}</span>
                  <span className={ui.barTrack}>
                    <span className={ui.barFill} style={{ width: `${(r.responseMs / slowMax) * 100}%`, background: r.status === "warn" ? "#f5a524" : "#2f6bff" }} />
                  </span>
                  <span className={cx(ui.barValue, "min-w-[64px]")}>{fmt(r.responseMs)} ms</span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No response times yet.</Empty>
          )}
        </Panel>
      </div>

      <div className={ui.split}>
        <Card as="section" className={ui.panel} aria-labelledby={`${idp}-list`}>
          <div className={ui.panelHead}>
            <h2 id={`${idp}-list`} className={ui.panelTitle}>Monitored {cfg.noun.many}</h2>
            <span className="text-fg-muted text-xs">{fmt(visible.length)} shown</span>
          </div>
          <div className={ui.toolbar}>
            <label htmlFor={`${idp}-q`} className="sr-only">Search</label>
            <SearchBox inputClassName={searchInputFix} className="flex-[1_1_240px]" icon={<Icon icon={SearchIcon} />} id={`${idp}-q`} type="search" placeholder={`Search ${lc(cfg.noun.many)}…`} value={query} onChange={(e) => setQuery(e.target.value)} />
            <label htmlFor={`${idp}-site`} className="sr-only">Site</label>
            <Select id={`${idp}-site`} value={site} onChange={(e) => setSite(e.target.value)}>
              <option value="">All sites</option>
              {sites.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
            <label htmlFor={`${idp}-status`} className="sr-only">Status</label>
            <Select id={`${idp}-status`} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              {(["up", "down", "warn", "pending"] as CheckStatus[]).map((s) => <option key={s} value={s}>{cfg.statusLabel[s]}</option>)}
            </Select>
            <label htmlFor={`${idp}-kind`} className="sr-only">{cfg.columns.kind}</label>
            <Select id={`${idp}-kind`} value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="">All {cfg.columns.kind.toLowerCase()}s</option>
              {kinds.map((k) => <option key={k} value={k}>{k}</option>)}
            </Select>
          </div>
          {pageRows.length ? (
            <Table>
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">{cfg.columns.target}</th>
                    <th scope="col">{cfg.columns.kind}</th>
                    <th scope="col">Client · site</th>
                    <th scope="col">Status</th>
                    <th scope="col">Response · last check</th>
                    <th scope="col">Uptime (24h)</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <span className="font-medium">{r.name}</span>
                        {r.description && <span className={cx(ui.sub, "max-w-[220px] overflow-hidden text-ellipsis whitespace-nowrap")} title={r.description}>{r.description}</span>}
                      </td>
                      <td className={cx(tdMono, "max-w-[180px] overflow-hidden text-ellipsis")} title={r.target}>{r.target}</td>
                      <td>{r.kind}</td>
                      <td>
                        {clientName(r.client)}
                        <span className={ui.sub}>{r.site}</span>
                      </td>
                      <td><Pill tone={STATUS_TONE[r.status]}><PillDot />{cfg.statusLabel[r.status]}</Pill></td>
                      <td>
                        {r.responseMs != null ? `${fmt(r.responseMs)} ms` : <span className="text-fg-muted">—</span>}
                        <span className={ui.sub}>{r.lastCheck}</span>
                      </td>
                      <td className={uptimeTone(r.uptime)}>{r.uptime != null ? `${r.uptime.toFixed(2)}%` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
            </Table>
          ) : (
            <Empty>No {lc(cfg.noun.many)} match these filters.</Empty>
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

        <div className={ui.rail}>
          <Card as="section" id={`${idp}-form`} className={ui.panel} aria-labelledby={`${idp}-form-h`}>
            <div className={ui.panelHead}>
              <h2 id={`${idp}-form-h`} className={ui.panelTitle}>Add {cfg.noun.one}</h2>
            </div>
            <form className={ui.form} onSubmit={submit}>
              <div className={ui.field}>
                <label htmlFor={`${idp}-f-client`}>Client<span className={ui.req} aria-hidden="true"> *</span></label>
                <Select id={`${idp}-f-client`} required value={values.client} onChange={(e) => setValues({ ...values, client: e.target.value })}>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </div>
              {cfg.formFields.map((f) => (
                <div key={f.id} className={ui.field}>
                  <label htmlFor={`${idp}-f-${f.id}`}>
                    {f.label}
                    {f.required && <span className={ui.req} aria-hidden="true"> *</span>}
                  </label>
                  {f.type === "select" ? (
                    <Select id={`${idp}-f-${f.id}`} required={f.required} value={values[f.id]} onChange={(e) => setValues({ ...values, [f.id]: e.target.value })}>
                      {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                    </Select>
                  ) : f.type === "textarea" ? (
                    <Textarea
                      id={`${idp}-f-${f.id}`}
                      rows={3}
                      placeholder={f.placeholder}
                      required={f.required}
                      value={values[f.id]}
                      onChange={(e) => setValues({ ...values, [f.id]: e.target.value })}
                    />
                  ) : (
                    <Input
                      id={`${idp}-f-${f.id}`}
                      type={f.type}
                      pattern={f.pattern}
                      title={f.patternHint}
                      min={f.type === "number" ? 1 : undefined}
                      placeholder={f.placeholder}
                      required={f.required}
                      value={values[f.id]}
                      onChange={(e) => setValues({ ...values, [f.id]: e.target.value })}
                    />
                  )}
                </div>
              ))}
              <Button type="submit" variant="primary">Save {lc(cfg.noun.one)}</Button>
              <p className="text-fg-muted text-xs" role="status">
                {saved ? `Added “${saved}” — it shows as Pending in the list. ` : ""}
                New {lc(cfg.noun.many)} are kept for this session only until the backend is connected.
              </p>
            </form>
          </Card>

          <Panel title={`Recent ${cfg.noun.one} Events`}>
            {events.length ? (
              <ul className={ui.activity}>
                {events.map((r) => (
                  <li key={r.id} className={ui.activityItem}>
                    <Tile tone={STATUS_TONE[r.status]} size="sm">
                      <Icon className={`fa-solid ${r.status === "up" ? "fa-check" : r.status === "down" ? "fa-xmark" : "fa-clock"}`} />
                    </Tile>
                    <span className={ui.activityText}>
                      {r.name} · <span className="text-fg-muted">{cfg.eventMessage[r.status]}</span>
                    </span>
                    <span className="text-fg-muted whitespace-nowrap">{r.lastCheck.split(" ").pop()}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No events yet.</Empty>
            )}
          </Panel>
        </div>
      </div>

      <p className="text-fg-muted text-xs">Sample check data — {lc(cfg.noun.many)} are not connected to the backend yet.</p>
    </Page>
  );
}
