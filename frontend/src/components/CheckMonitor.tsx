// Shared LinkedEye layout for endpoint check screens (URL Checker, Telnet
// Monitoring): summary cards, status donut + slowest-checks bars, a filterable
// checks table, an "add check" form and recent check events.
// Checks added through the form live in component state for this session only.
import React from "react";
import { Donut, Empty, Legend, Panel, Pill, StatCard, fmt } from "@/components/ld";
import type { Slice, Tone } from "@/components/ld";

export type CheckStatus = "up" | "down" | "warn" | "pending";

export interface CheckRow {
  id: string;
  name: string;
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
  type: "text" | "number" | "select";
  options?: string[];
  placeholder?: string;
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
  /** Build a row from submitted form values. */
  toRow: (values: Record<string, string>) => CheckRow;
}

const STATUS_TONE: Record<CheckStatus, Tone> = { up: "ok", down: "crit", warn: "warn", pending: "muted" };
const STATUS_COLOR: Record<CheckStatus, string> = { up: "#16a34a", down: "#e5383b", warn: "#f5a524", pending: "#98a2b3" };
const PAGE_SIZE = 10;

/** Lower-case a noun unless it is an acronym ("URL", "URLs"). */
const lc = (s: string) => (/^[A-Z]{2}/.test(s) ? s : s.toLowerCase());

const uptimeTone = (u: number | null): string => (u == null ? "" : u >= 99.5 ? "ld-text-ok" : u >= 95 ? "ld-text-warn" : "ld-text-crit");

export function CheckMonitorScreen(cfg: CheckMonitorConfig) {
  const [added, setAdded] = React.useState<CheckRow[]>([]);
  const [query, setQuery] = React.useState("");
  const [site, setSite] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [kind, setKind] = React.useState("");
  const [page, setPage] = React.useState(0);
  const idp = React.useId();

  const initialValues = () => Object.fromEntries(cfg.formFields.map((f) => [f.id, f.defaultValue ?? ""]));
  const [values, setValues] = React.useState<Record<string, string>>(initialValues);
  const [saved, setSaved] = React.useState<string | null>(null);

  const all = React.useMemo(() => [...added, ...cfg.rows], [added, cfg.rows]);
  const sites = [...new Set(all.map((r) => r.site))].sort();
  const kinds = [...new Set(all.map((r) => r.kind))].sort();
  const q = query.trim().toLowerCase();
  const visible = all.filter(
    (r) =>
      (!site || r.site === site) &&
      (!status || r.status === status) &&
      (!kind || r.kind === kind) &&
      (!q || r.name.toLowerCase().includes(q) || r.target.toLowerCase().includes(q)),
  );
  React.useEffect(() => setPage(0), [query, site, status, kind]);
  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const pageRows = visible.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const count = (s: CheckStatus) => all.filter((r) => r.status === s).length;
  const timed = all.filter((r) => r.responseMs != null) as (CheckRow & { responseMs: number })[];
  const avgMs = timed.length ? timed.reduce((a, r) => a + r.responseMs, 0) / timed.length : 0;
  const pct = (n: number) => (all.length ? `${((n / all.length) * 100).toFixed(1)}%` : "—");

  const statusSlices: Slice[] = (["up", "down", "warn", "pending"] as CheckStatus[])
    .map((s) => ({ label: cfg.statusLabel[s], value: count(s), color: STATUS_COLOR[s] }))
    .filter((s) => s.value > 0);
  const slowest = [...timed].sort((a, b) => b.responseMs - a.responseMs).slice(0, 6);
  const slowMax = slowest[0]?.responseMs || 1;

  // Failures first, then the most recent checks.
  const severity: Record<CheckStatus, number> = { down: 0, warn: 1, up: 2, pending: 3 };
  const events = [...all]
    .filter((r) => r.status !== "pending")
    .sort((a, b) => severity[a.status] - severity[b.status] || b.lastCheck.localeCompare(a.lastCheck))
    .slice(0, 6);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const row = cfg.toRow(values);
    setAdded((rows) => [row, ...rows]);
    setSaved(row.name);
    setValues(initialValues());
  };

  return (
    <div className="ld-dash">
      <div className="ld-head">
        <div>
          <h1>{cfg.title}</h1>
          <p>{cfg.subtitle}</p>
        </div>
        <div className="ld-head-actions">
          <a className="ld-btn ld-btn-primary" href={`#${idp}-form`}>
            <i className="fa-solid fa-plus" aria-hidden="true" /> Add {lc(cfg.noun.one)}
          </a>
        </div>
      </div>

      <div className="ld-grid ld-grid-5">
        <StatCard icon={cfg.icon} tone="info" label={`Total ${cfg.noun.many}`} value={fmt(all.length)} note={`configured ${lc(cfg.noun.many)}`} onClick={() => setStatus("")} />
        <StatCard icon="fa-circle-check" tone="ok" label={cfg.statusLabel.up} value={fmt(count("up"))} note={pct(count("up"))} onClick={() => setStatus("up")} />
        <StatCard icon="fa-circle-xmark" tone="crit" label={cfg.statusLabel.down} value={fmt(count("down"))} note={pct(count("down"))} onClick={() => setStatus("down")} />
        <StatCard icon="fa-clock" tone="warn" label={cfg.statusLabel.warn} value={fmt(count("warn"))} note={pct(count("warn"))} onClick={() => setStatus("warn")} />
        <StatCard icon="fa-gauge-high" tone="purple" label="Avg Response Time" value={timed.length ? `${Math.round(avgMs)} ms` : "—"} note={`across ${timed.length} responding`} />
      </div>

      <div className="ld-grid ld-grid-2">
        <Panel title={`${cfg.noun.one} Status Overview`}>
          {statusSlices.length ? (
            <div className="ld-donut-row">
              <Donut slices={statusSlices} center={fmt(all.length)} sub={`Total ${cfg.noun.many}`} label={`${all.length} ${lc(cfg.noun.many)} by status`} />
              <Legend slices={statusSlices} />
            </div>
          ) : (
            <Empty>No {lc(cfg.noun.many)} yet.</Empty>
          )}
        </Panel>
        <Panel title="Slowest Responses">
          {slowest.length ? (
            <ul className="ld-bars">
              {slowest.map((r) => (
                <li key={r.id}>
                  <span className="ld-bar-label">{r.name}</span>
                  <span className="ld-bar-track">
                    <span className="ld-bar-fill" style={{ width: `${(r.responseMs / slowMax) * 100}%`, background: r.status === "warn" ? "#f5a524" : "#2f6bff" }} />
                  </span>
                  <span className="ld-bar-value ld-bar-value-wide">{fmt(r.responseMs)} ms</span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No response times yet.</Empty>
          )}
        </Panel>
      </div>

      <div className="ld-split">
        <section className="ld-card ld-panel" aria-labelledby={`${idp}-list`}>
          <div className="ld-panel-head">
            <h2 id={`${idp}-list`}>Monitored {cfg.noun.many}</h2>
            <span className="ld-muted ld-small">{fmt(visible.length)} shown</span>
          </div>
          <div className="ld-toolbar">
            <label htmlFor={`${idp}-q`} className="sr-only">Search</label>
            <span className="ld-search">
              <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
              <input id={`${idp}-q`} type="search" placeholder={`Search ${lc(cfg.noun.many)}…`} value={query} onChange={(e) => setQuery(e.target.value)} />
            </span>
            <label htmlFor={`${idp}-site`} className="sr-only">Site</label>
            <select id={`${idp}-site`} className="ld-select" value={site} onChange={(e) => setSite(e.target.value)}>
              <option value="">All sites</option>
              {sites.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <label htmlFor={`${idp}-status`} className="sr-only">Status</label>
            <select id={`${idp}-status`} className="ld-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              {(["up", "down", "warn", "pending"] as CheckStatus[]).map((s) => <option key={s} value={s}>{cfg.statusLabel[s]}</option>)}
            </select>
            <label htmlFor={`${idp}-kind`} className="sr-only">{cfg.columns.kind}</label>
            <select id={`${idp}-kind`} className="ld-select" value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="">All {cfg.columns.kind.toLowerCase()}s</option>
              {kinds.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          {pageRows.length ? (
            <div className="ld-table-wrap">
              <table className="ld-table">
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">{cfg.columns.target}</th>
                    <th scope="col">{cfg.columns.kind}</th>
                    <th scope="col">Site</th>
                    <th scope="col">Status</th>
                    <th scope="col">Response</th>
                    <th scope="col">Last check</th>
                    <th scope="col">Uptime (24h)</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((r) => (
                    <tr key={r.id}>
                      <td className="ld-strong">{r.name}</td>
                      <td className="ld-mono ld-ellipsis ld-ellipsis-sm" title={r.target}>{r.target}</td>
                      <td className="ld-muted">{r.kind}</td>
                      <td className="ld-muted">{r.site}</td>
                      <td><Pill tone={STATUS_TONE[r.status]}><span className="ld-pill-dot" />{cfg.statusLabel[r.status]}</Pill></td>
                      <td>{r.responseMs != null ? `${fmt(r.responseMs)} ms` : <span className="ld-muted">—</span>}</td>
                      <td className="ld-muted">{r.lastCheck}</td>
                      <td className={uptimeTone(r.uptime)}>{r.uptime != null ? `${r.uptime.toFixed(2)}%` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>No {lc(cfg.noun.many)} match these filters.</Empty>
          )}
          {visible.length > PAGE_SIZE && (
            <nav className="ld-pager" aria-label="Pagination">
              <span className="ld-muted ld-small">Showing {page * PAGE_SIZE + 1}–{Math.min(visible.length, (page + 1) * PAGE_SIZE)} of {visible.length}</span>
              <div className="ld-pager-btns">
                {Array.from({ length: pages }, (_, i) => (
                  <button key={i} type="button" className={`ld-btn ld-btn-sm${i === page ? " ld-btn-primary" : ""}`} aria-current={i === page ? "page" : undefined} onClick={() => setPage(i)}>
                    {i + 1}
                  </button>
                ))}
              </div>
            </nav>
          )}
        </section>

        <div className="ld-rail">
          <section id={`${idp}-form`} className="ld-card ld-panel" aria-labelledby={`${idp}-form-h`}>
            <div className="ld-panel-head">
              <h2 id={`${idp}-form-h`}>Add {cfg.noun.one}</h2>
            </div>
            <form className="ld-form" onSubmit={submit}>
              {cfg.formFields.map((f) => (
                <div key={f.id} className="ld-form-field">
                  <label htmlFor={`${idp}-f-${f.id}`}>
                    {f.label}
                    {f.required && <span className="ld-req" aria-hidden="true"> *</span>}
                  </label>
                  {f.type === "select" ? (
                    <select id={`${idp}-f-${f.id}`} className="ld-select" required={f.required} value={values[f.id]} onChange={(e) => setValues({ ...values, [f.id]: e.target.value })}>
                      {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input
                      id={`${idp}-f-${f.id}`}
                      className="ld-input"
                      type={f.type}
                      min={f.type === "number" ? 1 : undefined}
                      placeholder={f.placeholder}
                      required={f.required}
                      value={values[f.id]}
                      onChange={(e) => setValues({ ...values, [f.id]: e.target.value })}
                    />
                  )}
                </div>
              ))}
              <button type="submit" className="ld-btn ld-btn-primary">Save {lc(cfg.noun.one)}</button>
              <p className="ld-muted ld-small" role="status">
                {saved ? `Added “${saved}” — it shows as Pending in the list. ` : ""}
                New {lc(cfg.noun.many)} are kept for this session only until the backend is connected.
              </p>
            </form>
          </section>

          <Panel title={`Recent ${cfg.noun.one} Events`}>
            {events.length ? (
              <ul className="ld-activity">
                {events.map((r) => (
                  <li key={r.id}>
                    <span className={`ld-tile ld-tile-sm ld-${STATUS_TONE[r.status]}`} aria-hidden="true">
                      <i className={`fa-solid ${r.status === "up" ? "fa-check" : r.status === "down" ? "fa-xmark" : "fa-clock"}`} />
                    </span>
                    <span className="ld-activity-text">
                      {r.name} · <span className="ld-muted">{cfg.eventMessage[r.status]}</span>
                    </span>
                    <span className="ld-muted ld-nowrap">{r.lastCheck.split(" ").pop()}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No events yet.</Empty>
            )}
          </Panel>
        </div>
      </div>

      <p className="ld-muted ld-small">Sample check data — {lc(cfg.noun.many)} are not connected to the backend yet.</p>
    </div>
  );
}
