// Super-admin Clients ("tenants" in code) — LinkedEye layout: client summary
// cards, the client inventory table and an organisation rail. Selecting a
// client switches the acting client and opens its dashboard.
import "@/styles/admin.css";
import { useNav } from "@/hooks/useNav";
import { useUiStore } from "@/store/ui";
import { useTenants } from "@/api/hooks";
import { ORG } from "@/data/core";
import { colorFor } from "@/components/Shell";
import { Empty, Panel, Pill, StatCard, fmt } from "@/components/ld";
import type { Tone } from "@/components/ld";
import type { Tenant } from "@/lib/types";

import { Icon } from "@/components/Icon";
import { ArrowRightIcon, ChevronRightIcon, FileOutputIcon, PlusIcon } from "lucide-react";
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
    <div className="ld-dash">
      <nav className="ld-crumbs" aria-label="Breadcrumb">
        <button type="button" className="ld-link" onClick={() => setRoute("dashboard")}>Home</button>
        <Icon icon={ChevronRightIcon} />
        <span>Super-admin</span>
        <Icon icon={ChevronRightIcon} />
        <span>Clients</span>
      </nav>

      <div className="ld-head">
        <div>
          <h1>Client Management</h1>
          <p>All clients under {ORG.name} · {fmt(ORG.seatsUsed)} of {fmt(ORG.seatsTotal)} seats used</p>
        </div>
        <div className="ld-head-actions">
          <button type="button" className="ld-btn"><Icon icon={FileOutputIcon} /> Export CSV</button>
          <button type="button" className="ld-btn ld-btn-primary" onClick={() => setRoute("onboarding")}><Icon icon={PlusIcon} /> Provision Client</button>
        </div>
      </div>

      <div className="ld-grid ld-grid-6">
        <StatCard icon="fa-building" tone="info" label="Total clients" value={fmt(tenants.length)} note="provisioned" />
        <StatCard icon="fa-users" tone="purple" label="Seats used" value={fmt(ORG.seatsUsed)} note={`${seatPct}% of ${fmt(ORG.seatsTotal)}`} />
        <StatCard icon="fa-heart-pulse" tone="ok" label="Healthy" value={fmt(healthy)} note="health above 95%" />
        <StatCard icon="fa-triangle-exclamation" tone="warn" label="At risk" value={fmt(atRisk)} note="health 90% or below" />
        <StatCard icon="fa-gem" tone="muted" label="Enterprise" value={fmt(enterprise)} note="plan tier" />
        <StatCard icon="fa-wallet" tone="info" label="Total spend" value={`$${(spend / 1000).toFixed(0)}k`} note="per month, all clients" />
      </div>

      <div className="ld-split">
        <section className="ld-card ld-panel" aria-labelledby="clients-h">
          <div className="ld-panel-head">
            <h2 id="clients-h">Client Inventory</h2>
            <span className="ld-muted ld-small">{fmt(tenants.length)} clients</span>
          </div>
          {tenants.length ? (
            <div className="ld-table-wrap">
              <table className="ld-table">
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
                        <div className="ld-admin-who">
                          <span className="ld-admin-code" style={{ background: colorFor(t.color) }} aria-hidden="true">{t.code}</span>
                          <span className="ld-admin-who-body">
                            <button type="button" className="ld-link ld-strong" onClick={() => open(t)}>{t.name}</button>
                            <span className="ld-sub ld-mono">{t.id}.linkedeye.in</span>
                          </span>
                        </div>
                      </td>
                      <td><Pill tone="muted">{t.plan}</Pill></td>
                      <td className="ld-mono">{fmt(t.users)}</td>
                      <td><Pill tone={healthTone(t.health)}><span className="ld-pill-dot" />{t.health}%</Pill></td>
                      <td className="ld-mono">
                        {t.incidents} {t.sev1 > 0 && <Pill tone="crit">{t.sev1} S1</Pill>}
                      </td>
                      <td>
                        <button type="button" className="ld-btn ld-btn-sm" onClick={() => open(t)} aria-label={`Open ${t.name} dashboard`}>
                          Open <Icon icon={ArrowRightIcon} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>No clients provisioned yet. Use Provision Client to add the first one.</Empty>
          )}
        </section>

        <div className="ld-rail">
          <Panel title="Organisation">
            <dl className="ld-dl">
              <dt>Parent</dt><dd className="ld-strong">{ORG.name}</dd>
              <dt>Plan</dt><dd>{ORG.plan}</dd>
              <dt>Clients</dt><dd>{fmt(tenants.length)}</dd>
              <dt>Client users</dt><dd>{fmt(tenants.reduce((s, t) => s + t.users, 0))}</dd>
              <dt>Seats used</dt><dd>{fmt(ORG.seatsUsed)} / {fmt(ORG.seatsTotal)}</dd>
            </dl>
          </Panel>
        </div>
      </div>
    </div>
  );
}
