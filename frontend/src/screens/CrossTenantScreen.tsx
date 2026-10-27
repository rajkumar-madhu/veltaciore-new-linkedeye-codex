// Cross-client view (admins): one row per client with live counts from
// GET /api/tenants-summary/ — open tickets, SLA, active incidents, open
// changes, device health and alerts. Read without a client header, so the
// policy limits it to admins. Clicking a client switches to it and opens its
// dashboard.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { NO_TENANT, useUiStore } from "@/store/ui";
import type { Tenant } from "@/lib/types";
import { useCrossClientSummary, useTenants, type ClientSummary } from "@/api/hooks";
import { ApiError } from "@/api/client";
import { Empty, Panel, Pill, StatCard, fmt } from "@/components/ld";
import type { Tone } from "@/components/ld";
import { Button, Card, Crumbs, Page, PageHead, SearchBox, Select, Table, TextButton, cx, ui } from "@/components/ui";
import { colorFor } from "@/components/Shell";
import { Icon } from "@/components/Icon";
import { Building2Icon, LockIcon, SearchIcon } from "lucide-react";

type SortKey = "name" | "sev1" | "incidents_active" | "tickets_open" | "devices_online_pct" | "alerts_critical";

const healthTone = (pct: number | null): Tone => (pct == null ? "muted" : pct >= 98 ? "ok" : pct >= 90 ? "warn" : "crit");
const slaTone = (pct: number | null): Tone => (pct == null ? "muted" : pct >= 95 ? "ok" : pct >= 85 ? "warn" : "crit");

export default function CrossTenantScreen() {
  const { setRoute } = useNav();
  const setTenant = useUiStore((s) => s.setTenant);
  const tenants = useTenants().data ?? [];
  const q = useCrossClientSummary();
  const [sort, setSort] = React.useState<SortKey>("sev1");
  const [search, setSearch] = React.useState("");

  // Prefer the full tenant record; the summary row is enough to switch when
  // the tenant list is still loading or the client is past its first page.
  const open = (c: ClientSummary) => {
    const t: Tenant = tenants.find((x) => x.id === c.id) ?? {
      ...NO_TENANT, id: c.id, name: c.name, code: c.code, color: c.color, plan: c.plan,
      incidents: c.incidents_active, sev1: c.sev1,
    };
    setTenant(t);
    setRoute("dashboard");
  };

  const forbidden = q.error instanceof ApiError && (q.error.status === 401 || q.error.status === 403);
  const rows = (q.data?.clients ?? [])
    .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      const av = a[sort] ?? -1, bv = b[sort] ?? -1;
      // Health sorts worst first; counts sort highest first.
      return sort === "devices_online_pct" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  const t = q.data?.totals;
  const id = React.useId();

  return (
    <Page>
      <Crumbs items={[{ label: "Home", onClick: () => setRoute("dashboard") }, { label: "Analytics" }, { label: "Cross-client view" }]} />

      <PageHead
        title="Cross-client view"
        subtitle="Live operations rollup across every client. Admins only."
        actions={
          <Button onClick={() => setRoute("admin-tenants")}>
            <Icon icon={Building2Icon} /> Manage clients
          </Button>
        }
      />

      {forbidden ? (
        <Card className={ui.notice} role="status">
          <Icon icon={LockIcon} />
          <div>
            <b>Admins only</b>
            <p className="text-fg-muted text-xs">Your role can see one client at a time. Ask an administrator for cross-client access.</p>
          </div>
        </Card>
      ) : q.isLoading ? (
        <Card><Empty>Loading…</Empty></Card>
      ) : !q.data || !t ? (
        <Card><Empty>The API is not reachable from this browser.</Empty></Card>
      ) : (
        <>
          <div className={cx(ui.grid, ui.cols.stats)}>
            <StatCard icon="fa-building" tone="info" label="Clients" value={fmt(q.data.clients.filter((c) => c.id !== "shared").length)} note={`${fmt(t.tickets_open)} open tickets`} />
            <StatCard icon="fa-triangle-exclamation" tone="crit" label="Active incidents" value={fmt(t.incidents_active)} note={`${t.sev1} Sev 1 · ${t.sev2} Sev 2`} />
            <StatCard icon="fa-server" tone={healthTone(t.devices_online_pct)} label="Devices online" value={t.devices_online_pct == null ? "—" : `${t.devices_online_pct}%`} note={`${fmt(t.devices_down)} down of ${fmt(t.devices_total)}`} />
            <StatCard icon="fa-bell" tone="warn" label="Open alerts" value={fmt(t.alerts_open)} note={`${t.alerts_critical} critical`} />
          </div>

          <Panel title={`Clients (${rows.length})`}>
            <div className={ui.filters}>
              <label className={cx(ui.filterField, ui.fieldGrow)} htmlFor={`${id}-q`}>
                Search
                <SearchBox id={`${id}-q`} icon={<Icon icon={SearchIcon} />} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Client name…" />
              </label>
              <label className={ui.filterField} htmlFor={`${id}-sort`}>
                Sort by
                <Select id={`${id}-sort`} value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                  <option value="sev1">Sev 1 incidents</option>
                  <option value="incidents_active">Active incidents</option>
                  <option value="tickets_open">Open tickets</option>
                  <option value="alerts_critical">Critical alerts</option>
                  <option value="devices_online_pct">Device health (worst first)</option>
                  <option value="name">Name</option>
                </Select>
              </label>
            </div>
            {rows.length ? (
              <Table>
                <thead>
                  <tr>
                    <th scope="col">Client</th><th scope="col">Devices online</th><th scope="col">Incidents</th>
                    <th scope="col">Open tickets</th><th scope="col">SLA met</th><th scope="col">Open changes</th>
                    <th scope="col">Alerts</th><th scope="col">Plan</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <span className="inline-flex items-center gap-2.5">
                          <span className="flex-none w-7 h-7 rounded-[7px] grid place-items-center text-white text-[10px] font-bold" style={{ background: colorFor(c.color) }} aria-hidden="true">{c.code}</span>
                          {c.id === "shared" ? <b>{c.name}</b> : (
                            <TextButton className="font-medium" onClick={() => open(c)} title={`Switch to ${c.name}`}>{c.name}</TextButton>
                          )}
                        </span>
                      </td>
                      <td>
                        <Pill tone={healthTone(c.devices_online_pct)}>{c.devices_online_pct == null ? "No devices" : `${c.devices_online_pct}%`}</Pill>
                        <span className={ui.sub}>{c.devices_down} down · {c.devices_warn} warning of {c.devices_total}</span>
                      </td>
                      <td>
                        {c.sev1 > 0 ? <Pill tone="crit">{c.sev1} Sev 1</Pill> : <span className="text-fg-muted">No Sev 1</span>}
                        <span className={ui.sub}>{c.incidents_active} active</span>
                      </td>
                      <td>{fmt(c.tickets_open)}<span className={ui.sub}>of {fmt(c.tickets_total)}</span></td>
                      <td><Pill tone={slaTone(c.sla_met_pct)}>{c.sla_met_pct == null ? "—" : `${c.sla_met_pct}%`}</Pill>{c.sla_breached > 0 && <span className={ui.sub}>{c.sla_breached} breached</span>}</td>
                      <td>{fmt(c.changes_open)}{c.changes_implementing > 0 && <span className={ui.sub}>{c.changes_implementing} implementing</span>}</td>
                      <td>{c.alerts_critical > 0 ? <Pill tone="crit">{c.alerts_critical} critical</Pill> : <span className="text-fg-muted">{c.alerts_open} open</span>}</td>
                      <td className="text-fg-muted">{c.plan || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <Empty>No clients match.</Empty>
            )}
          </Panel>
        </>
      )}
    </Page>
  );
}
