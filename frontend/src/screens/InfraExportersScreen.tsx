// All Exporters — LinkedEye layout: fleet summary cards, category tiles, a
// searchable exporter table, and a health / top-installs rail with the agent
// install snippet. Exporters are a static catalog (reference data), so the
// local seed is used when the backend is unreachable.
import React from "react";
import { useExporters } from "@/api/hooks";
import { EXPORTERS } from "@/data/infra";
import { Donut, Empty, Legend, PALETTE, Panel, Pill, PillDot, StatCard, fmt } from "@/components/ld";
import type { Slice } from "@/components/ld";
import type { Exporter } from "@/lib/types";
import { Card, Page, PageHead, SearchBox, Select, Table, buttonClass, cx, ui } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { BookIcon, LayersIcon, SearchIcon, TriangleAlertIcon } from "lucide-react";
const chip = "inline-flex flex-col items-center justify-center gap-1 min-w-[104px] min-h-[76px] px-3 py-2.5 border rounded-lg cursor-pointer shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 [&_.ld-icon]:text-2xl";
const chipClass = (active: boolean) => cx(chip, active ? "bg-accent border-accent text-white [&_.ld-icon]:text-white" : "bg-bg-raised border-line text-fg hover:border-line-strong [&_.ld-icon]:text-accent");
const chipLabel = (active: boolean) => cx("text-sm", active ? "text-white" : "text-fg-muted");

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
    <Page>
      <PageHead
        title="All Exporters"
        subtitle="Prometheus-compatible exporters collecting metrics from your infrastructure, network, databases and services"
        actions={<a className={buttonClass()} href="#install-snippet"><Icon icon={BookIcon} /> Install docs</a>}
      />

      <div className={cx(ui.grid, ui.cols[6])}>
        <StatCard icon="fa-tower-broadcast" tone="purple" label="Exporter types" value={fmt(exporters.length)} note="in the catalog" onClick={() => { setCat("all"); setStatus(""); }} />
        <StatCard icon="fa-circle-check" tone="ok" label="Healthy" value={fmt(healthy)} note={exporters.length ? `${Math.round((healthy / exporters.length) * 100)}% reporting normally` : "—"} onClick={() => setStatus("ok")} />
        <StatCard icon="fa-triangle-exclamation" tone="warn" label="Degraded" value={fmt(degraded)} note={degraded ? "needs a check" : "all clear"} onClick={() => setStatus("degraded")} />
        <StatCard icon="fa-server" tone="info" label="Agent installs" value={fmt(installs)} note="hosts reporting" />
        <StatCard icon="fa-chart-line" tone="info" label="Scrape volume" value={rate(scrapeTotal)} note="across all exporters" />
        <StatCard icon="fa-clock" tone={avgLag > 5 ? "warn" : "ok"} label="Average lag" value={`${avgLag.toFixed(1)}s`} note="scrape to ingest" />
      </div>

      <div className="flex flex-wrap gap-2.5" role="group" aria-label="Filter by category">
        <button type="button" className={chipClass(cat === "all")} aria-pressed={cat === "all"} onClick={() => setCat("all")}>
          <Icon icon={LayersIcon} />
          <span className={chipLabel(cat === "all")}>All</span>
          <span className="text-md font-bold">{exporters.length}</span>
        </button>
        {usedCats.map((c) => (
          <button key={c.id} type="button" className={chipClass(cat === c.id)} aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>
            <Icon name={c.icon} />
            <span className={chipLabel(cat === c.id)}>{c.label}</span>
            <span className="text-md font-bold">{countIn(c.id)}</span>
          </button>
        ))}
      </div>

      <div className={ui.split}>
        <Card as="section" className={ui.panel} aria-labelledby="exp-h">
          <div className={ui.panelHead}>
            <h2 id="exp-h" className={ui.panelTitle}>Exporters ({fmt(visible.length)})</h2>
          </div>
          <div className={ui.toolbar}>
            <label htmlFor="exp-search" className="sr-only">Search exporters</label>
            <SearchBox className="flex-[1_1_240px]" icon={<Icon icon={SearchIcon} />} id="exp-search" type="search" placeholder="Search by name, protocol or site…" value={query} onChange={(e) => setQuery(e.target.value)} />
            <label htmlFor="exp-status" className="sr-only">Status</label>
            <Select id="exp-status" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              <option value="ok">Healthy</option>
              <option value="degraded">Degraded</option>
            </Select>
          </div>
          {visible.length ? (
            <Table>
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
                          <span className="font-medium font-mono text-[12.5px] text-accent">{e.name}</span>
                          <span className={ui.sub}>{c.label} · {e.port ? `:${e.port}/metrics` : "/metrics"}</span>
                          {e.note && (
                            <span className="block text-xs text-tone-warn max-w-[240px] overflow-hidden text-ellipsis whitespace-nowrap" title={e.note}><Icon icon={TriangleAlertIcon} /> {e.note}</span>
                          )}
                        </td>
                        <td>
                          {e.protocol ?? "—"}
                          <span className={ui.sub}>v{e.version}</span>
                        </td>
                        <td className="font-medium">{fmt(e.hosts)}</td>
                        <td className={ui.cellWrap}>
                          {e.sites.map((site, i) => (
                            <React.Fragment key={site}>
                              <span className="whitespace-nowrap">{site}</span>
                              {i < e.sites.length - 1 ? ", " : ""}
                            </React.Fragment>
                          ))}
                        </td>
                        <td>{e.scrapes}</td>
                        <td className={lagHigh ? "font-semibold dark:text-tone-warn" : undefined}>{e.lag}</td>
                        <td>
                          <Pill tone={e.status === "ok" ? "ok" : "warn"}>
                            <PillDot />
                            {e.status === "ok" ? "Healthy" : "Degraded"}
                          </Pill>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
          ) : (
            <Empty>No exporters match these filters.</Empty>
          )}
        </Card>

        <div className={ui.rail}>
          <Panel title="Exporter Health">
            <div className="flex flex-wrap items-center gap-4.5">
              <Donut slices={healthSlices} center={fmt(exporters.length)} sub="Exporters" label={`${healthy} healthy and ${degraded} degraded exporters`} />
              <Legend slices={healthSlices} />
            </div>
          </Panel>
          <Panel title="Top Exporters by Installs">
            <ul className={ui.bars}>
              {top.map((e, i) => (
                <li key={e.name} className={ui.barItem}>
                  <span className={ui.barLabel}>{e.name}</span>
                  <span className={ui.barTrack}>
                    <span className={ui.barFill} style={{ width: `${(e.hosts / topMax) * 100}%`, background: PALETTE[i % PALETTE.length] }} />
                  </span>
                  <span className={ui.barValue}>{fmt(e.hosts)}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      <Card as="section" id="install-snippet" className={ui.panel} aria-labelledby="install-h">
        <div className={ui.panelHead}>
          <h2 id="install-h" className={ui.panelTitle}>Install the agent · node-exporter on Linux</h2>
        </div>
        <pre className="m-0 px-4 py-3.5 rounded bg-[#0b1220] text-[#e2e8f0] font-mono text-[12.5px] leading-[1.7] overflow-x-auto whitespace-pre">
{`$ curl -sSL https://linkedeye.in/agent/install.sh \\
    | sudo TENANT=<tenant> ROLE=linux-host sh
  ✓ verified signature
  ✓ installed node-exporter to /opt/linkedeye
  ✓ registered with the LinkedEye collector
$ systemctl status linkedeye-agent
  ● active (running)`}
        </pre>
      </Card>
    </Page>
  );
}
