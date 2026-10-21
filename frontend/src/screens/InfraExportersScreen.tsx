// All Exporters — LinkedEye layout: fleet summary cards, category tiles, a
// searchable exporter table, and a health / top-installs rail with the agent
// install snippet. Exporters are a static catalog (reference data), so the
// local seed is used when the backend is unreachable.
import React from "react";
import { useExporters } from "@/api/hooks";
import { EXPORTERS } from "@/data/infra";
import { Donut, Empty, Legend, PALETTE, Panel, Pill, StatCard, fmt } from "@/components/ld";
import type { Slice } from "@/components/ld";
import type { Exporter } from "@/lib/types";

interface Category {
  id: string;
  label: string;
  icon: string;
  match: (name: string) => boolean;
}

const CATEGORIES: Category[] = [
  { id: "servers", label: "Servers", icon: "fa-server", match: (n) => /^(node|windows)-/.test(n) },
  { id: "network", label: "Network", icon: "fa-network-wired", match: (n) => /^snmp-/.test(n) },
  { id: "hardware", label: "Hardware", icon: "fa-microchip", match: (n) => /^(idrac|ilo|ipmi|redfish)-/.test(n) },
  { id: "databases", label: "Databases", icon: "fa-database", match: (n) => /^(mysqld|postgres|mongodb|redis|mssql|oracle)-/.test(n) },
  { id: "virtualization", label: "Virtualization", icon: "fa-cube", match: (n) => /^(vmware|proxmox|hyperv|libvirt)-/.test(n) },
  { id: "probes", label: "URLs & Probes", icon: "fa-globe", match: (n) => /^blackbox-/.test(n) },
];
const OTHER: Category = { id: "other", label: "Other", icon: "fa-puzzle-piece", match: () => true };

const categoryOf = (e: Exporter) => CATEGORIES.find((c) => c.match(e.name)) ?? OTHER;

/** "12.4k/s" → 12400; unparseable → 0. */
function scrapesPerSec(v: string) {
  const m = /([\d.]+)\s*([kKmM]?)/.exec(v);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  return m[2].toLowerCase() === "k" ? n * 1e3 : m[2].toLowerCase() === "m" ? n * 1e6 : n;
}

const rate = (n: number) => (n >= 1e3 ? `${(n / 1e3).toFixed(1)}k/s` : `${Math.round(n)}/s`);

export default function InfraExportersScreen() {
  const { data } = useExporters();
  const exporters = data ?? EXPORTERS;

  const [cat, setCat] = React.useState("all");
  const [status, setStatus] = React.useState("");
  const [query, setQuery] = React.useState("");

  const healthy = exporters.filter((e) => e.status === "ok").length;
  const degraded = exporters.length - healthy;
  const installs = exporters.reduce((a, e) => a + e.hosts, 0);
  const scrapeTotal = exporters.reduce((a, e) => a + scrapesPerSec(e.scrapes), 0);
  const lags = exporters.map((e) => parseFloat(e.lag)).filter((n) => !Number.isNaN(n));
  const avgLag = lags.length ? lags.reduce((a, b) => a + b, 0) / lags.length : 0;

  const usedCats = [...CATEGORIES, OTHER].filter((c) => exporters.some((e) => categoryOf(e).id === c.id));
  const countIn = (id: string) => exporters.filter((e) => categoryOf(e).id === id).length;

  const q = query.trim().toLowerCase();
  const visible = exporters.filter((e) => {
    if (cat !== "all" && categoryOf(e).id !== cat) return false;
    if (status === "ok" && e.status !== "ok") return false;
    if (status === "degraded" && e.status === "ok") return false;
    if (q && ![e.name, e.protocol ?? "", ...e.sites].some((s) => s.toLowerCase().includes(q))) return false;
    return true;
  });

  const healthSlices: Slice[] = [
    { label: "Healthy", value: healthy, color: "#16a34a" },
    { label: "Degraded", value: degraded, color: "#f5a524" },
  ];
  const top = [...exporters].sort((a, b) => b.hosts - a.hosts).slice(0, 8);
  const topMax = top[0]?.hosts || 1;

  return (
    <div className="ld-dash">
      <div className="ld-head">
        <div>
          <h1>All Exporters</h1>
          <p>Prometheus-compatible exporters collecting metrics from your infrastructure, network, databases and services</p>
        </div>
        <div className="ld-head-actions">
          <a className="ld-btn" href="#install-snippet"><i className="fa-solid fa-book" aria-hidden="true" /> Install docs</a>
        </div>
      </div>

      <div className="ld-grid ld-grid-stats ld-grid-6">
        <StatCard icon="fa-tower-broadcast" tone="purple" label="Exporter types" value={fmt(exporters.length)} note="in the catalog" onClick={() => { setCat("all"); setStatus(""); }} />
        <StatCard icon="fa-circle-check" tone="ok" label="Healthy" value={fmt(healthy)} note={exporters.length ? `${Math.round((healthy / exporters.length) * 100)}% reporting normally` : "—"} onClick={() => setStatus("ok")} />
        <StatCard icon="fa-triangle-exclamation" tone="warn" label="Degraded" value={fmt(degraded)} note={degraded ? "needs a check" : "all clear"} onClick={() => setStatus("degraded")} />
        <StatCard icon="fa-server" tone="info" label="Agent installs" value={fmt(installs)} note="hosts reporting" />
        <StatCard icon="fa-chart-line" tone="info" label="Scrape volume" value={rate(scrapeTotal)} note="across all exporters" />
        <StatCard icon="fa-clock" tone={avgLag > 5 ? "warn" : "ok"} label="Average lag" value={`${avgLag.toFixed(1)}s`} note="scrape to ingest" />
      </div>

      <div className="ld-chips" role="group" aria-label="Filter by category">
        <button type="button" className={`ld-chip${cat === "all" ? " active" : ""}`} aria-pressed={cat === "all"} onClick={() => setCat("all")}>
          <i className="fa-solid fa-layer-group" aria-hidden="true" />
          <span className="ld-chip-label">All</span>
          <span className="ld-chip-count">{exporters.length}</span>
        </button>
        {usedCats.map((c) => (
          <button key={c.id} type="button" className={`ld-chip${cat === c.id ? " active" : ""}`} aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>
            <i className={`fa-solid ${c.icon}`} aria-hidden="true" />
            <span className="ld-chip-label">{c.label}</span>
            <span className="ld-chip-count">{countIn(c.id)}</span>
          </button>
        ))}
      </div>

      <div className="ld-split">
        <section className="ld-card ld-panel" aria-labelledby="exp-h">
          <div className="ld-panel-head">
            <h2 id="exp-h">Exporters ({fmt(visible.length)})</h2>
          </div>
          <div className="ld-toolbar">
            <label htmlFor="exp-search" className="sr-only">Search exporters</label>
            <span className="ld-search ld-field-grow">
              <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
              <input id="exp-search" type="search" placeholder="Search by name, protocol or site…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </span>
            <label htmlFor="exp-status" className="sr-only">Status</label>
            <select id="exp-status" className="ld-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              <option value="ok">Healthy</option>
              <option value="degraded">Degraded</option>
            </select>
          </div>
          {visible.length ? (
            <div className="ld-table-wrap">
              <table className="ld-table">
                <thead>
                  <tr>
                    <th scope="col">Exporter</th>
                    <th scope="col">Protocol · version</th>
                    <th scope="col">Hosts</th>
                    <th scope="col">Sites</th>
                    <th scope="col">Scrapes</th>
                    <th scope="col">Lag</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((e) => {
                    const c = categoryOf(e);
                    const lagHigh = parseFloat(e.lag) > 5;
                    return (
                      <tr key={e.name}>
                        <td>
                          <span className="ld-strong ld-mono-name">{e.name}</span>
                          <span className="ld-sub">{c.label} · {e.port ? `:${e.port}/metrics` : "/metrics"}</span>
                          {e.note && (
                            <span className="ld-sub ld-note" title={e.note}><i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> {e.note}</span>
                          )}
                        </td>
                        <td className="ld-muted">
                          {e.protocol ?? "—"}
                          <span className="ld-sub">v{e.version}</span>
                        </td>
                        <td className="ld-strong">{fmt(e.hosts)}</td>
                        <td className="ld-muted ld-wrap">
                          {e.sites.map((site, i) => (
                            <React.Fragment key={site}>
                              <span className="ld-nowrap">{site}</span>
                              {i < e.sites.length - 1 ? ", " : ""}
                            </React.Fragment>
                          ))}
                        </td>
                        <td>{e.scrapes}</td>
                        <td className={lagHigh ? "ld-text-warn" : undefined}>{e.lag}</td>
                        <td>
                          <Pill tone={e.status === "ok" ? "ok" : "warn"}>
                            <span className="ld-pill-dot" />
                            {e.status === "ok" ? "Healthy" : "Degraded"}
                          </Pill>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>No exporters match these filters.</Empty>
          )}
        </section>

        <div className="ld-rail">
          <Panel title="Exporter Health">
            <div className="ld-donut-row">
              <Donut slices={healthSlices} center={fmt(exporters.length)} sub="Exporters" label={`${healthy} healthy and ${degraded} degraded exporters`} />
              <Legend slices={healthSlices} />
            </div>
          </Panel>
          <Panel title="Top Exporters by Installs">
            <ul className="ld-bars">
              {top.map((e, i) => (
                <li key={e.name}>
                  <span className="ld-bar-label">{e.name}</span>
                  <span className="ld-bar-track">
                    <span className="ld-bar-fill" style={{ width: `${(e.hosts / topMax) * 100}%`, background: PALETTE[i % PALETTE.length] }} />
                  </span>
                  <span className="ld-bar-value">{fmt(e.hosts)}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      <section id="install-snippet" className="ld-card ld-panel" aria-labelledby="install-h">
        <div className="ld-panel-head">
          <h2 id="install-h">Install the agent · node-exporter on Linux</h2>
        </div>
        <pre className="ld-code">
{`$ curl -sSL https://linkedeye.in/agent/install.sh \\
    | sudo TENANT=<tenant> ROLE=linux-host sh
  ✓ verified signature
  ✓ installed node-exporter to /opt/linkedeye
  ✓ registered with the LinkedEye collector
$ systemctl status linkedeye-agent
  ● active (running)`}
        </pre>
      </section>
    </div>
  );
}
