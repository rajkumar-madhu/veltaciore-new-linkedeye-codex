// Alert console — opened from the header bell. Every active alert raised by
// device monitoring: severity summary cards, a severity / site / search filter
// bar, the alert table (device opens its detail page) and by-rule / by-site
// breakdowns. Live data only (/infra/alerts/, /infra/devices/); the API has no
// acknowledge / resolve endpoint yet, so the console is read-only.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { deviceRoute } from "@/lib/deviceRoute";
import { useDevices, useInfraAlerts } from "@/api/hooks";
import type { InfraAlert } from "@/lib/types";
import { Empty, PALETTE, Panel, Pill, StatCard, countBy, fmt } from "@/components/ld";
import { Button, Card, Crumbs, Page, PageHead, SearchBox, Select, Table, TextButton, cx, ui } from "@/components/ui";
import type { Tone } from "@/components/ld";


import { Icon } from "@/components/Icon";
import { FilterIcon, LayersIcon, SearchIcon, SlidersHorizontalIcon } from "lucide-react";
type Sev = "critical" | "warning" | "info";
const sevOf = (s: string): Sev => (s === "critical" ? "critical" : s === "warning" || s === "warn" ? "warning" : "info");
const SEV: Record<Sev, { label: string; tone: Tone; icon: string; rank: number }> = {
  critical: { label: "Critical", tone: "crit", icon: "fa-circle-xmark", rank: 0 },
  warning: { label: "Warning", tone: "warn", icon: "fa-triangle-exclamation", rank: 1 },
  info: { label: "Info", tone: "info", icon: "fa-circle-info", rank: 2 },
};

const ANY = "";
const filterIcon = "w-[38px] h-[38px] rounded bg-bg-muted grid place-items-center text-fg-muted";
const linkMono = "font-mono !text-xs font-semibold";

export default function AlertsScreen() {
  const { setRoute } = useNav();
  const alertsQ = useInfraAlerts();
  const alerts = alertsQ.data ?? [];
  const devices = useDevices().data ?? [];
  const idp = React.useId();

  const [sev, setSev] = React.useState(ANY);
  const [site, setSite] = React.useState(ANY);
  const [query, setQuery] = React.useState("");

  const kindOf = React.useMemo(() => new Map(devices.map((d) => [d.id, d.kind])), [devices]);
  const openDevice = (a: InfraAlert) => {
    setRoute(deviceRoute(a.deviceKind ?? kindOf.get(a.device)), { deviceId: a.device });
  };

  const bySev = (s: Sev) => alerts.filter((a) => sevOf(a.sev) === s).length;
  const sites = countBy(alerts, (a) => a.site || "—").map(([s]) => s).sort();

  const q = query.trim().toLowerCase();
  const visible = alerts
    .filter((a) => {
      if (sev && sevOf(a.sev) !== sev) return false;
      if (site && (a.site || "—") !== site) return false;
      if (q && ![a.title, a.detail, a.device, a.rule, a.id].some((v) => (v ?? "").toLowerCase().includes(q))) return false;
      return true;
    })
    .sort((a, b) => SEV[sevOf(a.sev)].rank - SEV[sevOf(b.sev)].rank);

  const reset = () => { setSev(ANY); setSite(ANY); setQuery(""); };

  const byRule = countBy(alerts, (a) => a.rule || "—").slice(0, 8);
  const ruleMax = byRule[0]?.[1] ?? 1;
  const bySite = countBy(alerts, (a) => a.site || "—").slice(0, 8);
  const siteMax = bySite[0]?.[1] ?? 1;
  const affected = new Set(alerts.map((a) => a.device)).size;

  return (
    <Page>
      <Crumbs items={[{ label: "Home", onClick: () => setRoute("dashboard") }, { label: "Monitoring", onClick: () => setRoute("infra") }, { label: "Alerts" }]} />

      <PageHead
        title="Alert Console"
        subtitle="Active alerts raised by device monitoring across every site · refreshes every 30s"
        actions={<>
          <Button onClick={() => setRoute("alert-grouping")}>
            <Icon icon={LayersIcon} /> Alert grouping
          </Button>
          <Button onClick={() => setRoute("monitors")}>
            <Icon icon={SlidersHorizontalIcon} /> Monitors
          </Button>
        </>}
      />

      <div className={cx(ui.grid, ui.cols.stats)}>
        <StatCard icon="fa-bell" tone="info" label="Active alerts" value={fmt(alerts.length)} note={`${fmt(affected)} devices affected`} onClick={reset} />
        <StatCard icon={SEV.critical.icon} tone="crit" label="Critical" value={fmt(bySev("critical"))} note="needs response now" onClick={() => setSev("critical")} />
        <StatCard icon={SEV.warning.icon} tone="warn" label="Warning" value={fmt(bySev("warning"))} note="at risk" onClick={() => setSev("warning")} />
        <StatCard icon={SEV.info.icon} tone="ok" label="Info" value={fmt(bySev("info"))} note="informational" onClick={() => setSev("info")} />
      </div>

      <form
        className={cx(ui.card, ui.filters)}
        onSubmit={(e) => e.preventDefault()}
        onReset={(e) => { e.preventDefault(); reset(); }}
      >
        <span className={filterIcon} aria-hidden="true"><Icon icon={FilterIcon} /></span>
        <div className={ui.filterField}>
          <label htmlFor={`${idp}-sev`}>Severity</label>
          <Select id={`${idp}-sev`} value={sev} onChange={(e) => setSev(e.target.value)}>
            <option value={ANY}>All severities</option>
            {(Object.keys(SEV) as Sev[]).map((s) => <option key={s} value={s}>{SEV[s].label}</option>)}
          </Select>
        </div>
        <div className={ui.filterField}>
          <label htmlFor={`${idp}-site`}>Site</label>
          <Select id={`${idp}-site`} value={site} onChange={(e) => setSite(e.target.value)}>
            <option value={ANY}>All sites</option>
            {sites.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
        <div className={cx(ui.filterField, ui.fieldGrow)}>
          <label htmlFor={`${idp}-q`} className="sr-only">Search alerts</label>
          <SearchBox icon={<Icon icon={SearchIcon} />} id={`${idp}-q`} type="search" placeholder="Search by alert, device, rule or ID…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <Button type="reset">Reset</Button>
      </form>

      <div className={ui.split}>
        <section className={cx(ui.card, ui.panel)} aria-labelledby={`${idp}-list-h`}>
          <div className={ui.panelHead}>
            <h2 id={`${idp}-list-h`} className={ui.panelTitle}>Alerts ({fmt(visible.length)})</h2>
            <span className="text-fg-muted text-xs">Read-only · acknowledge and resolve from the source monitor</span>
          </div>
          {alertsQ.isLoading ? (
            <Empty>Loading alerts…</Empty>
          ) : visible.length ? (
            <Table>
                <thead>
                  <tr>
                    <th scope="col">Severity</th>
                    <th scope="col">Alert</th>
                    <th scope="col">Device</th>
                    <th scope="col">Site</th>
                    <th scope="col">Rule</th>
                    <th scope="col">Since</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((a) => {
                    const s = SEV[sevOf(a.sev)];
                    return (
                      <tr key={a.id}>
                        <td><Pill tone={s.tone}><Icon className={`fa-solid ${s.icon}`} /> {s.label}</Pill></td>
                        <td className={ui.cellWrap}>
                          <span className="font-medium">{a.title}</span>
                          {a.detail && <span className={ui.sub}>{a.detail}</span>}
                        </td>
                        <td>
                          <TextButton className={linkMono} onClick={() => openDevice(a)} title={`Open ${a.device}`}>
                            {a.device}
                          </TextButton>
                        </td>
                        <td>{a.site || "—"}</td>
                        <td><span className="font-mono text-[12.5px] text-accent">{a.rule || "—"}</span></td>
                        <td className="whitespace-nowrap">{a.since}</td>
                      </tr>
                    );
                  })}
                </tbody>
            </Table>
          ) : (
            <Empty>{alerts.length ? "No alerts match these filters." : alertsQ.isError ? "The alerts API is not reachable from this browser." : "No active alerts. All clear."}</Empty>
          )}
        </section>

        <div className={ui.rail}>
          <Panel title="Alerts by rule">
            {byRule.length ? (
              <ul className={ui.bars}>
                {byRule.map(([label, value], i) => (
                  <li key={label} className={ui.barItem}>
                    <span className={cx(ui.barLabel, ui.mono)} title={label}>{label}</span>
                    <span className={ui.barTrack}>
                      <span className={ui.barFill} style={{ width: `${(value / ruleMax) * 100}%`, background: PALETTE[i % PALETTE.length] }} />
                    </span>
                    <span className={ui.barValue}>{value}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No active alerts.</Empty>
            )}
          </Panel>
          <Panel title="Alerts by site">
            {bySite.length ? (
              <ul className={ui.bars}>
                {bySite.map(([label, value], i) => (
                  <li key={label} className={ui.barItem}>
                    <span className={ui.barLabel}>
                      <TextButton onClick={() => setSite(label)}>{label}</TextButton>
                    </span>
                    <span className={ui.barTrack}>
                      <span className={ui.barFill} style={{ width: `${(value / siteMax) * 100}%`, background: PALETTE[(i + 2) % PALETTE.length] }} />
                    </span>
                    <span className={ui.barValue}>{value}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No active alerts.</Empty>
            )}
          </Panel>
        </div>
      </div>
    </Page>
  );
}
