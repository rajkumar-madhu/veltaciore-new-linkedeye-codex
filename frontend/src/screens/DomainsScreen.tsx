// Domains — LinkedEye layout: domain summary cards, a filterable domain list
// and a details panel (overview + associated services) for the selected
// domain. Sample data from data/monitoring (no backend endpoint yet).
import React from "react";
import { DOMAINS } from "@/data/monitoring";
import type { DomainRecord } from "@/data/monitoring";
import { Empty, Pill, StatCard, fmt } from "@/components/ld";
import type { Tone } from "@/components/ld";

const PAGE_SIZE = 10;

const TYPE_TONE: Record<string, Tone> = {
  Production: "info",
  Application: "purple",
  API: "info",
  Monitoring: "ok",
  Backup: "warn",
  VPN: "purple",
  Mail: "muted",
  Test: "muted",
};
const SSL_TONE: Record<DomainRecord["ssl"], Tone> = { Valid: "ok", Expiring: "warn", Expired: "crit" };

export default function DomainsScreen() {
  const [query, setQuery] = React.useState("");
  const [site, setSite] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [type, setType] = React.useState("");
  const [page, setPage] = React.useState(0);
  const [selected, setSelected] = React.useState(DOMAINS[0]?.name ?? "");
  const [detailTab, setDetailTab] = React.useState<"overview" | "services">("overview");

  const sites = [...new Set(DOMAINS.map((d) => d.site))].sort();
  const types = [...new Set(DOMAINS.map((d) => d.type))].sort();
  const q = query.trim().toLowerCase();
  const visible = DOMAINS.filter(
    (d) =>
      (!site || d.site === site) &&
      (!status || d.status === status) &&
      (!type || d.type === type) &&
      (!q || d.name.includes(q) || d.ip.includes(q) || d.description.toLowerCase().includes(q)),
  );
  React.useEffect(() => setPage(0), [query, site, status, type]);
  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const rows = visible.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const current = DOMAINS.find((d) => d.name === selected);

  const active = DOMAINS.filter((d) => d.status === "Active").length;
  const expiring = DOMAINS.filter((d) => d.ssl !== "Valid").length;
  const dnsIssues = DOMAINS.filter((d) => d.dns !== "Resolved").length;
  const mapped = new Set(DOMAINS.map((d) => d.site)).size;

  return (
    <div className="ld-dash">
      <div className="ld-head">
        <div>
          <h1>Domains</h1>
          <p>Manage domain names, DNS resolution, SSL certificates and site associations</p>
        </div>
      </div>

      <div className="ld-grid ld-grid-5">
        <StatCard icon="fa-globe" tone="info" label="Total Domains" value={fmt(DOMAINS.length)} note={`${active} active · ${DOMAINS.length - active} inactive`} onClick={() => setStatus("")} />
        <StatCard icon="fa-circle-check" tone="ok" label="Active Domains" value={fmt(active)} note="configured and resolving" onClick={() => setStatus("Active")} />
        <StatCard icon="fa-lock" tone="warn" label="SSL Attention" value={fmt(expiring)} note="certificates expiring or expired" />
        <StatCard icon="fa-sitemap" tone="crit" label="DNS Issues" value={fmt(dnsIssues)} note="domains failing resolution" />
        <StatCard icon="fa-location-dot" tone="purple" label="Sites" value={fmt(mapped)} note="mapped to client sites" />
      </div>

      <div className="ld-split ld-split-wide">
        <section className="ld-card ld-panel" aria-labelledby="dom-h">
          <div className="ld-panel-head">
            <h2 id="dom-h">Domain List</h2>
            <span className="ld-muted ld-small">{fmt(visible.length)} domains</span>
          </div>
          <div className="ld-toolbar">
            <label htmlFor="dom-search" className="sr-only">Search domains</label>
            <span className="ld-search">
              <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
              <input id="dom-search" type="search" placeholder="Search domains or IPs…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </span>
            <label htmlFor="dom-site" className="sr-only">Site</label>
            <select id="dom-site" className="ld-select" value={site} onChange={(e) => setSite(e.target.value)}>
              <option value="">All sites</option>
              {sites.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <label htmlFor="dom-status" className="sr-only">Status</label>
            <select id="dom-status" className="ld-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <label htmlFor="dom-type" className="sr-only">Type</label>
            <select id="dom-type" className="ld-select" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">All types</option>
              {types.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {rows.length ? (
            <div className="ld-table-wrap">
              <table className="ld-table">
                <thead>
                  <tr>
                    <th scope="col">Domain</th>
                    <th scope="col">Type</th>
                    <th scope="col">Site</th>
                    <th scope="col">IP Address</th>
                    <th scope="col">DNS</th>
                    <th scope="col">SSL</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((d) => (
                    <tr key={d.name} className={d.name === selected ? "ld-row-selected" : undefined}>
                      <td>
                        <button
                          type="button"
                          className="ld-link ld-domain"
                          aria-pressed={d.name === selected}
                          onClick={() => { setSelected(d.name); setDetailTab("overview"); }}
                        >
                          <i className="fa-solid fa-globe" aria-hidden="true" /> {d.name}
                        </button>
                      </td>
                      <td><Pill tone={TYPE_TONE[d.type] ?? "muted"}>{d.type}</Pill></td>
                      <td className="ld-muted">{d.site}</td>
                      <td className="ld-mono">{d.ip}</td>
                      <td><Pill tone={d.dns === "Resolved" ? "ok" : "crit"}><span className="ld-pill-dot" />{d.dns}</Pill></td>
                      <td><Pill tone={SSL_TONE[d.ssl]}><span className="ld-pill-dot" />{d.ssl}</Pill></td>
                      <td><Pill tone={d.status === "Active" ? "ok" : "crit"}>{d.status}</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>No domains match these filters.</Empty>
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

        <section className="ld-card ld-panel" aria-labelledby="dom-detail-h">
          <div className="ld-panel-head">
            <h2 id="dom-detail-h">Domain Details</h2>
          </div>
          {current ? (
            <>
              <div className="ld-detail-title">
                <span className="ld-tile ld-tile-md ld-info" aria-hidden="true"><i className="fa-solid fa-globe" /></span>
                <div>
                  <div className="ld-detail-name">
                    {current.name} <Pill tone={current.status === "Active" ? "ok" : "crit"}>{current.status}</Pill>
                  </div>
                  <div className="ld-muted ld-small">{current.type} domain</div>
                </div>
              </div>
              <div className="ld-tabs" role="tablist" aria-label="Domain detail views">
                <button type="button" role="tab" aria-selected={detailTab === "overview"} className={`ld-tab${detailTab === "overview" ? " active" : ""}`} onClick={() => setDetailTab("overview")}>Overview</button>
                <button type="button" role="tab" aria-selected={detailTab === "services"} className={`ld-tab${detailTab === "services" ? " active" : ""}`} onClick={() => setDetailTab("services")}>
                  Associated Services ({current.services.length})
                </button>
              </div>
              {detailTab === "overview" ? (
                <dl className="ld-dl">
                  <dt>Domain name</dt><dd>{current.name}</dd>
                  <dt>Domain type</dt><dd>{current.type}</dd>
                  <dt>Site mapping</dt><dd>{current.site}</dd>
                  <dt>IP address</dt><dd className="ld-mono">{current.ip}</dd>
                  <dt>DNS status</dt><dd><Pill tone={current.dns === "Resolved" ? "ok" : "crit"}><span className="ld-pill-dot" />{current.dns}</Pill></dd>
                  <dt>SSL status</dt><dd><Pill tone={SSL_TONE[current.ssl]}><span className="ld-pill-dot" />{current.ssl}</Pill></dd>
                  <dt>SSL expiry</dt><dd>{current.sslExpiry}</dd>
                  <dt>Created</dt><dd>{current.created}</dd>
                  <dt>Last modified</dt><dd>{current.modified}</dd>
                  <dt>Description</dt><dd>{current.description}</dd>
                </dl>
              ) : current.services.length ? (
                <div className="ld-table-wrap">
                  <table className="ld-table">
                    <thead>
                      <tr><th scope="col">Service</th><th scope="col">Type</th><th scope="col">Port</th><th scope="col">Status</th></tr>
                    </thead>
                    <tbody>
                      {current.services.map((s) => (
                        <tr key={s.name}>
                          <td className="ld-strong">{s.name}</td>
                          <td className="ld-muted">{s.type}</td>
                          <td className="ld-mono">{s.port}</td>
                          <td><Pill tone={s.up ? "ok" : "crit"}><span className="ld-pill-dot" />{s.up ? "Up" : "Down"}</Pill></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty>No services associated with this domain.</Empty>
              )}
            </>
          ) : (
            <Empty>Select a domain to see its details.</Empty>
          )}
        </section>
      </div>

      <p className="ld-muted ld-small">Sample domain inventory — domain management is not connected to the backend yet.</p>
    </div>
  );
}
