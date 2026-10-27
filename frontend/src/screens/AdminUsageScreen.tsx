// Usage & quotas — LinkedEye layout: client summary cards derived from the
// client list, then per-client quota meters and quota alerts. No usage
// metering endpoint exists yet, so the quota figures are sample data and are
// labelled as such.
import "@/styles/admin.css";
import { useNav } from "@/hooks/useNav";
import { useTenants } from "@/api/hooks";
import { colorFor } from "@/components/Shell";
import { Empty, Pill, StatCard, fmt } from "@/components/ld";

import { Icon } from "@/components/Icon";
import { BellIcon, ChevronRightIcon, FileOutputIcon } from "lucide-react";
// Sample quota utilisation by client position (no metering API yet).
const SAMPLE_EVENTS = [72, 84, 112, 48, 22, 66];
const SAMPLE_STORAGE = [38, 52, 78, 30, 12, 44];
const SAMPLE_API = [45, 62, 81, 34, 20, 55];
const SAMPLE_PAGES = [40, 28, 72, 22, 10, 48];
const SAMPLE_PAGES_SENT = [120, 84, 216, 66, 30, 144];

const SAMPLE_ALERTS: [string, string, "warn" | "crit"][] = [
  ["IndMoney", "Events ingested at 93% of cap", "warn"],
  ["IndMoney", "Storage at 78% · projected breach in 9d", "warn"],
  ["BetaFront", "API rate limit hit 12× in 24h", "crit"],
];

const meterColor = (pct: number) => (pct > 85 ? "#e5383b" : pct > 70 ? "#f5a524" : "var(--accent)");

function QuotaCell({ pct, label }: { pct: number; label: string }) {
  return (
    <div className="ld-admin-meter">
      <span className="ld-bar-track" role="img" aria-label={`${Math.min(pct, 100)}% used`}>
        <span className="ld-bar-fill" style={{ width: `${Math.min(pct, 100)}%`, background: meterColor(pct) }} />
      </span>
      <span>{label}</span>
    </div>
  );
}

export default function AdminUsageScreen() {
  const { setRoute } = useNav();
  const { data } = useTenants();
  const tenants = data ?? [];

  const users = tenants.reduce((s, t) => s + t.users, 0);
  const incidents = tenants.reduce((s, t) => s + t.incidents, 0);
  const sev1 = tenants.reduce((s, t) => s + t.sev1, 0);
  const enterprise = tenants.filter((t) => t.plan === "Enterprise").length;

  return (
    <div className="ld-dash">
      <nav className="ld-crumbs" aria-label="Breadcrumb">
        <button type="button" className="ld-link" onClick={() => setRoute("dashboard")}>Home</button>
        <Icon icon={ChevronRightIcon} />
        <span>Super-admin</span>
        <Icon icon={ChevronRightIcon} />
        <span>Usage &amp; Quotas</span>
      </nav>

      <div className="ld-head">
        <div>
          <h1>Usage &amp; Quotas</h1>
          <p>Event ingest, storage and API consumption by client · monthly window</p>
        </div>
        <div className="ld-head-actions">
          <button type="button" className="ld-btn"><Icon icon={BellIcon} /> Quota Alerts</button>
          <button type="button" className="ld-btn ld-btn-primary"><Icon icon={FileOutputIcon} /> Export</button>
        </div>
      </div>

      <div className="ld-grid ld-grid-stats">
        <StatCard icon="fa-building" tone="info" label="Clients" value={fmt(tenants.length)} note={`${enterprise} on Enterprise`} />
        <StatCard icon="fa-users" tone="purple" label="Client users" value={fmt(users)} note="across all clients" />
        <StatCard icon="fa-ticket" tone="warn" label="Open incidents" value={fmt(incidents)} note="across all clients" />
        <StatCard icon="fa-fire" tone="crit" label="Sev 1" value={fmt(sev1)} note="open Sev 1 incidents" />
      </div>

      <section className="ld-card ld-panel" aria-labelledby="usage-quota-h">
        <div className="ld-panel-head">
          <h2 id="usage-quota-h">Per-Client Quotas</h2>
          <span className="ld-admin-head-tags"><Pill tone="muted">Sample data</Pill><span className="ld-muted ld-small">monthly</span></span>
        </div>
        {tenants.length ? (
          <div className="ld-table-wrap">
            <table className="ld-table">
              <thead>
                <tr>
                  <th scope="col">Client</th>
                  <th scope="col">Events / mo</th>
                  <th scope="col">Storage</th>
                  <th scope="col">API / day</th>
                  <th scope="col">Pages / mo</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t, i) => {
                  const ev = SAMPLE_EVENTS[i] || 50;
                  const st = SAMPLE_STORAGE[i] || 30;
                  const api = SAMPLE_API[i] ?? 0;
                  const pg = SAMPLE_PAGES[i] ?? 0;
                  return (
                    <tr key={t.id}>
                      <td>
                        <div className="ld-admin-who">
                          <span className="ld-admin-code" style={{ background: colorFor(t.color) }} aria-hidden="true">{t.code}</span>
                          <span className="ld-strong">{t.name}</span>
                        </div>
                      </td>
                      <td><QuotaCell pct={ev} label={`${ev}M / ${ev < 80 ? 100 : 120}M`} /></td>
                      <td><QuotaCell pct={st} label={`${(st / 10).toFixed(1)} / ${st > 60 ? 2 : 1} TB`} /></td>
                      <td><QuotaCell pct={api} label={`${api}%`} /></td>
                      <td><QuotaCell pct={pg} label={`${SAMPLE_PAGES_SENT[i] ?? 0} / ${t.plan === "Enterprise" ? 500 : 300}`} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>No clients provisioned yet.</Empty>
        )}
      </section>

      <section className="ld-card ld-panel" aria-labelledby="usage-alerts-h">
        <div className="ld-panel-head">
          <h2 id="usage-alerts-h">Quota Alerts</h2>
          <Pill tone="muted">Sample data</Pill>
        </div>
        <div className="ld-table-wrap">
          <table className="ld-table">
            <thead>
              <tr><th scope="col">Client</th><th scope="col">Alert</th><th scope="col">Severity</th></tr>
            </thead>
            <tbody>
              {SAMPLE_ALERTS.map(([t, msg, kind], i) => (
                <tr key={i}>
                  <td className="ld-strong">{t}</td>
                  <td className="ld-wrap">{msg}</td>
                  <td><Pill tone={kind}><span className="ld-pill-dot" />{kind === "crit" ? "Critical" : "Warning"}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="ld-muted ld-small">Usage metering is not connected to the backend yet — quota figures and alerts are sample data.</p>
    </div>
  );
}
