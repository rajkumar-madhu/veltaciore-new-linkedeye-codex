// Super-admin Billing & Plans — LinkedEye layout: spend summary derived from
// the client list, spend by client, plan / add-on reference and the Razorpay
// pay card. Contract and add-on details have no billing endpoint yet and are
// labelled as sample data.
import "@/styles/admin.css";
import { useNav } from "@/hooks/useNav";
import { useTenants } from "@/api/hooks";
import { ORG, USERS } from "@/data/core";
import { colorFor } from "@/components/Shell";
import { Empty, Panel, Pill, StatCard, fmt } from "@/components/ld";

import { Icon } from "@/components/Icon";
import { ChevronRightIcon, CreditCardIcon, ExternalLinkIcon, FileOutputIcon, FileTextIcon, LandmarkIcon, LockIcon, SmartphoneIcon, WalletIcon, ZapIcon } from "lucide-react";
const PAY_URL = "https://razorpay.me/@madhurajkumar";
const SEAT_PRICE = 12;

const SAMPLE_ADDONS: [string, string, string, boolean][] = [
  ["AI Copilot Pro", "Auto-RCA · playbook gen · chatops", "$2,500/mo", true],
  ["Status Page", "Public + private status pages", "$400/mo", true],
  ["Long-term storage", "3-year retention for events/logs", "$1,200/mo", false],
  ["On-prem collector", "Self-hosted data plane", "Included", true],
  ["FedRAMP Moderate", "Government-compliant region", "Contact sales", false],
];

function SampleTag() {
  return <Pill tone="muted">Sample data</Pill>;
}

export default function AdminBillingScreen() {
  const { setRoute } = useNav();
  const { data } = useTenants();
  const tenants = data ?? [];
  const totalSpend = tenants.reduce((s, t) => s + t.spend, 0);
  const enterprise = tenants.filter((t) => t.plan === "Enterprise").length;
  const seatCost = SEAT_PRICE * ORG.seatsUsed;
  const owner = USERS.find((u) => u.id === "u2");

  return (
    <div className="ld-dash">
      <nav className="ld-crumbs" aria-label="Breadcrumb">
        <button type="button" className="ld-link" onClick={() => setRoute("dashboard")}>Home</button>
        <Icon icon={ChevronRightIcon} />
        <span>Super-admin</span>
        <Icon icon={ChevronRightIcon} />
        <span>Billing &amp; Plans</span>
      </nav>

      <div className="ld-head">
        <div>
          <h1>Billing &amp; Plans</h1>
          <p>{ORG.plan} agreement · {tenants.length} clients</p>
        </div>
        <div className="ld-head-actions">
          <button type="button" className="ld-btn"><Icon icon={FileTextIcon} /> Invoices</button>
          <button type="button" className="ld-btn"><Icon icon={FileOutputIcon} /> Export</button>
          <a className="ld-btn" href={PAY_URL} target="_blank" rel="noopener noreferrer"><Icon icon={ZapIcon} /> Pay invoice</a>
          <button type="button" className="ld-btn ld-btn-primary"><Icon icon={ExternalLinkIcon} /> Contract</button>
        </div>
      </div>

      <div className="ld-grid ld-grid-stats">
        <StatCard icon="fa-wallet" tone="info" label="Monthly spend" value={`$${(totalSpend / 1000).toFixed(0)}k`} note="sum of client spend" />
        <StatCard icon="fa-users" tone="purple" label="Seats used" value={fmt(ORG.seatsUsed)} note={`of ${fmt(ORG.seatsTotal)} licensed`} />
        <StatCard icon="fa-building" tone="ok" label="Clients" value={fmt(tenants.length)} note={`${enterprise} on Enterprise`} />
        <StatCard icon="fa-receipt" tone="muted" label="Seat charges" value={`$${fmt(seatCost)}`} note={`$${SEAT_PRICE} × ${fmt(ORG.seatsUsed)} seats`} />
      </div>

      <div className="ld-split">
        <div className="ld-rail">
          <section className="ld-card ld-panel" aria-labelledby="bill-spend-h">
            <div className="ld-panel-head">
              <h2 id="bill-spend-h">Spend by Client</h2>
              <span className="ld-muted ld-small">${fmt(totalSpend)} / mo</span>
            </div>
            {tenants.length ? (
              <div className="ld-table-wrap">
                <table className="ld-table">
                  <thead>
                    <tr><th scope="col">Client</th><th scope="col">Plan</th><th scope="col">Spend / mo</th><th scope="col">Share of total</th></tr>
                  </thead>
                  <tbody>
                    {tenants.map((t) => {
                      const share = totalSpend ? (t.spend / totalSpend) * 100 : 0;
                      return (
                        <tr key={t.id}>
                          <td>
                            <div className="ld-admin-who">
                              <span className="ld-admin-code" style={{ background: colorFor(t.color) }} aria-hidden="true">{t.code}</span>
                              <span className="ld-strong">{t.name}</span>
                            </div>
                          </td>
                          <td><Pill tone="muted">{t.plan}</Pill></td>
                          <td className="ld-mono ld-strong">${(t.spend / 1000).toFixed(1)}k</td>
                          <td>
                            <div className="ld-admin-meter">
                              <span className="ld-bar-track"><span className="ld-bar-fill" style={{ width: `${share}%`, background: colorFor(t.color) }} /></span>
                              <span>{share.toFixed(1)}%</span>
                            </div>
                          </td>
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

          <section className="ld-card ld-panel" aria-labelledby="bill-plan-h">
            <div className="ld-panel-head">
              <h2 id="bill-plan-h">Current Plan</h2>
              <span className="ld-admin-head-tags"><Pill tone="ok">{ORG.plan}</Pill><SampleTag /></span>
            </div>
            <dl className="ld-dl">
              <dt>Base</dt><dd className="ld-mono"><b>$18,000</b> / mo committed</dd>
              <dt>Seats</dt><dd className="ld-mono">${SEAT_PRICE} × {fmt(ORG.seatsUsed)} = ${fmt(seatCost)}</dd>
              <dt>Contract term</dt><dd>Annual · auto-renew</dd>
              <dt>Renewal date</dt><dd>Mar 12, 2026</dd>
            </dl>
          </section>

          <section className="ld-card ld-panel" aria-labelledby="bill-addons-h">
            <div className="ld-panel-head">
              <h2 id="bill-addons-h">Add-ons</h2>
              <SampleTag />
            </div>
            <div className="ld-table-wrap">
              <table className="ld-table">
                <thead>
                  <tr><th scope="col">Add-on</th><th scope="col">Price</th><th scope="col">Status</th></tr>
                </thead>
                <tbody>
                  {SAMPLE_ADDONS.map(([n, d, p, on]) => (
                    <tr key={n}>
                      <td className="ld-wrap"><span className="ld-strong">{n}</span><div className="ld-sub">{d}</div></td>
                      <td className="ld-mono">{p}</td>
                      <td>{on ? <Pill tone="ok"><span className="ld-pill-dot" />Active</Pill> : <button type="button" className="ld-btn ld-btn-sm">Enable</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="ld-rail">
          <section className="ld-card ld-panel" aria-labelledby="bill-pay-h">
            <div className="ld-panel-head">
              <h2 id="bill-pay-h"><Icon icon={ZapIcon} /> Pay your invoice</h2>
              <span className="ld-muted ld-small">Razorpay</span>
            </div>
            <div className="ld-admin-amount">
              <div>
                <span className="ld-muted ld-small">Estimated amount (client spend)</span>
                <b>${fmt(totalSpend)}</b>
              </div>
            </div>
            <dl className="ld-dl">
              <dt>Pay to</dt><dd>@madhurajkumar</dd>
            </dl>
            <a className="ld-btn ld-btn-primary" href={PAY_URL} target="_blank" rel="noopener noreferrer">
              <Icon icon={LockIcon} /> Pay securely via Razorpay
            </a>
            <ul className="ld-tags ld-admin-methods" aria-label="Accepted payment methods">
              <li className="ld-tag"><Icon icon={SmartphoneIcon} /> UPI</li>
              <li className="ld-tag"><Icon icon={CreditCardIcon} /> Cards</li>
              <li className="ld-tag"><Icon icon={LandmarkIcon} /> Netbanking</li>
              <li className="ld-tag"><Icon icon={WalletIcon} /> Wallets</li>
            </ul>
          </section>

          <section className="ld-card ld-panel" aria-labelledby="bill-contact-h">
            <div className="ld-panel-head">
              <h2 id="bill-contact-h">Billing Contact</h2>
              <SampleTag />
            </div>
            <dl className="ld-dl">
              <dt>Owner</dt><dd>{owner?.name ?? "—"}</dd>
              <dt>AP email</dt><dd className="ld-mono">ap@finspot.in</dd>
              <dt>Payment</dt><dd>Net-30 · ACH</dd>
              <dt>Account exec</dt><dd>Sarah Chen · Argus-LinkedEye</dd>
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}
