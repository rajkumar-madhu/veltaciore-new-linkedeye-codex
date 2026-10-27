// Super-admin Clients ("tenants" in code) — LinkedEye layout: client summary
// cards, the client inventory table and an organisation rail. Selecting a
// client switches the acting client and opens its dashboard.
import { useNav } from "@/hooks/useNav";
import { useUiStore } from "@/store/ui";
import { useTenants } from "@/api/hooks";
import { ORG } from "@/data/core";
import { colorFor } from "@/components/Shell";
import { Empty, Panel, Pill, PillDot, StatCard, fmt } from "@/components/ld";
import { Button, Crumbs, Page, PageHead, Table, TextButton, cx, ui } from "@/components/ui";
import type { Tone } from "@/components/ld";
import type { Tenant } from "@/lib/types";

import { Icon } from "@/components/Icon";
import { ArrowRightIcon, FileOutputIcon, PlusIcon } from "lucide-react";
// identity cell (code tile + name / sub line)
const who = "flex items-center gap-2.5 min-w-0";
const whoBody = "flex flex-col items-start gap-px min-w-0";
const codeTile = "flex-none w-7 h-7 rounded grid place-items-center text-[10.5px] font-bold text-white bg-fg-subtle";
// mono table cell: the cell keeps its 13px size
const monoCell = "font-mono font-semibold";

const healthTone = (h: number): Tone => (h > 95 ? "ok" : h > 85 ? "warn" : "crit");

export default function AdminTenantsScreen() {
  const { setRoute } = useNav();
  const setTenant = useUiStore((s) => s.setTenant);
  const { data } = useTenants();
  const tenants = data ?? [];

  const open = (t: Tenant) => { setTenant(t); setRoute("dashboard"); };

  const healthy = tenants.filter((t) => t.health > 95).length;
  const atRisk = tenants.filter((t) => t.health <= 90).length;
  const enterprise = tenants.filter((t) => t.plan === "Enterprise").length;
  const spend = tenants.reduce((s, t) => s + t.spend, 0);
  const seatPct = ORG.seatsTotal ? Math.round((ORG.seatsUsed / ORG.seatsTotal) * 100) : 0;

  return (
    <Page>
      <Crumbs items={[{ label: "Home", onClick: () => setRoute("dashboard") }, { label: "Super-admin" }, { label: "Clients" }]} />

      <PageHead
        title="Client Management"
        subtitle={<>All clients under {ORG.name} · {fmt(ORG.seatsUsed)} of {fmt(ORG.seatsTotal)} seats used</>}
        actions={
          <>
            <Button><Icon icon={FileOutputIcon} /> Export CSV</Button>
            <Button variant="primary" onClick={() => setRoute("onboarding")}><Icon icon={PlusIcon} /> Provision Client</Button>
          </>
        }
      />

      {/* six-up row; the stat cards keep their full size, as in the reference */}
      <div className={cx(ui.grid, "grid-cols-[repeat(auto-fit,minmax(180px,1fr))]")}>
        <StatCard icon="fa-building" tone="info" label="Total clients" value={fmt(tenants.length)} note="provisioned" />
        <StatCard icon="fa-users" tone="purple" label="Seats used" value={fmt(ORG.seatsUsed)} note={`${seatPct}% of ${fmt(ORG.seatsTotal)}`} />
        <StatCard icon="fa-heart-pulse" tone="ok" label="Healthy" value={fmt(healthy)} note="health above 95%" />
        <StatCard icon="fa-triangle-exclamation" tone="warn" label="At risk" value={fmt(atRisk)} note="health 90% or below" />
        <StatCard icon="fa-gem" tone="muted" label="Enterprise" value={fmt(enterprise)} note="plan tier" />
        <StatCard icon="fa-wallet" tone="info" label="Total spend" value={`$${(spend / 1000).toFixed(0)}k`} note="per month, all clients" />
      </div>

      <div className={ui.split}>
        <section className={cx(ui.card, ui.panel)} aria-labelledby="clients-h">
          <div className={ui.panelHead}>
            <h2 id="clients-h" className={ui.panelTitle}>Client Inventory</h2>
            <span className="text-fg-muted text-xs">{fmt(tenants.length)} clients</span>
          </div>
          {tenants.length ? (
            <Table>
              <thead>
                <tr>
                  <th scope="col">Client</th>
                  <th scope="col">Plan</th>
                  <th scope="col">Users</th>
                  <th scope="col">Health</th>
                  <th scope="col">Incidents</th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <div className={who}>
                        <span className={codeTile} style={{ background: colorFor(t.color) }} aria-hidden="true">{t.code}</span>
                        <span className={whoBody}>
                          <TextButton className="font-medium" onClick={() => open(t)}>{t.name}</TextButton>
                          <span className={cx(ui.sub, ui.mono)}>{t.id}.linkedeye.in</span>
                        </span>
                      </div>
                    </td>
                    <td><Pill tone="muted">{t.plan}</Pill></td>
                    <td className={monoCell}>{fmt(t.users)}</td>
                    <td><Pill tone={healthTone(t.health)}><PillDot />{t.health}%</Pill></td>
                    <td className={monoCell}>
                      {t.incidents} {t.sev1 > 0 && <Pill tone="crit">{t.sev1} S1</Pill>}
                    </td>
                    <td>
                      <Button size="sm" onClick={() => open(t)} aria-label={`Open ${t.name} dashboard`}>
                        Open <Icon icon={ArrowRightIcon} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <Empty>No clients provisioned yet. Use Provision Client to add the first one.</Empty>
          )}
        </section>

        <div className={ui.rail}>
          <Panel title="Organisation">
            <dl className={ui.dl}>
              <dt>Parent</dt><dd className="font-medium">{ORG.name}</dd>
              <dt>Plan</dt><dd>{ORG.plan}</dd>
              <dt>Clients</dt><dd>{fmt(tenants.length)}</dd>
              <dt>Client users</dt><dd>{fmt(tenants.reduce((s, t) => s + t.users, 0))}</dd>
              <dt>Seats used</dt><dd>{fmt(ORG.seatsUsed)} / {fmt(ORG.seatsTotal)}</dd>
            </dl>
          </Panel>
        </div>
      </div>
    </Page>
  );
}
