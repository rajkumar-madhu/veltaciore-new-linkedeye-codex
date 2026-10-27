// Super-admin Billing & Plans — LinkedEye layout: spend summary derived from
// the client list, spend by client, plan / add-on reference and the Razorpay
// pay card. Contract and add-on details have no billing endpoint yet and are
// labelled as sample data.
import { useNav } from "@/hooks/useNav";
import { useTenants } from "@/api/hooks";
import { ORG, USERS } from "@/data/core";
import { colorFor } from "@/components/Shell";
import { Empty, Pill, PillDot, StatCard, fmt } from "@/components/ld";
import { Button, Crumbs, Page, PageHead, Table, buttonClass, cx, ui } from "@/components/ui";

import { Icon } from "@/components/Icon";
import { CreditCardIcon, ExternalLinkIcon, FileOutputIcon, FileTextIcon, LandmarkIcon, LockIcon, SmartphoneIcon, WalletIcon, ZapIcon } from "lucide-react";
// identity cell, quota meter and payment summary (were ld-admin-* classes)
const who = "flex items-center gap-2.5 min-w-0";
const codeTile = "flex-none w-7 h-7 rounded grid place-items-center text-[10.5px] font-bold text-white bg-fg-subtle";
const meter = "flex items-center gap-2 min-w-[150px]";
const meterTrack = "flex-[1_1_60px] h-2 rounded-[5px] bg-bg-muted overflow-hidden";
const meterFill = "block h-2 rounded-[5px]";
const meterValue = "font-mono text-xs text-fg whitespace-nowrap";
const headTags = "inline-flex items-center gap-1.5 flex-wrap";
const amount = "flex items-end justify-between gap-2.5 flex-wrap [&_b]:block [&_b]:text-5xl [&_b]:font-bold [&_b]:tracking-[-0.02em] [&_b]:text-fg";
// mono table cell: the cell keeps its 13px size
const monoCell = "font-mono font-semibold";

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
    <Page>
      <Crumbs items={[{ label: "Home", onClick: () => setRoute("dashboard") }, { label: "Super-admin" }, { label: "Billing & Plans" }]} />

      <PageHead
        title="Billing & Plans"
        subtitle={<>{ORG.plan} agreement · {tenants.length} clients</>}
        actions={
          <>
            <Button><Icon icon={FileTextIcon} /> Invoices</Button>
            <Button><Icon icon={FileOutputIcon} /> Export</Button>
            <a className={buttonClass()} href={PAY_URL} target="_blank" rel="noopener noreferrer"><Icon icon={ZapIcon} /> Pay invoice</a>
            <Button variant="primary"><Icon icon={ExternalLinkIcon} /> Contract</Button>
          </>
        }
      />

      <div className={cx(ui.grid, ui.cols.stats)}>
        <StatCard icon="fa-wallet" tone="info" label="Monthly spend" value={`$${(totalSpend / 1000).toFixed(0)}k`} note="sum of client spend" />
        <StatCard icon="fa-users" tone="purple" label="Seats used" value={fmt(ORG.seatsUsed)} note={`of ${fmt(ORG.seatsTotal)} licensed`} />
        <StatCard icon="fa-building" tone="ok" label="Clients" value={fmt(tenants.length)} note={`${enterprise} on Enterprise`} />
        <StatCard icon="fa-receipt" tone="muted" label="Seat charges" value={`$${fmt(seatCost)}`} note={`$${SEAT_PRICE} × ${fmt(ORG.seatsUsed)} seats`} />
      </div>

      <div className={ui.split}>
        <div className={ui.rail}>
          <section className={cx(ui.card, ui.panel)} aria-labelledby="bill-spend-h">
            <div className={ui.panelHead}>
              <h2 className={ui.panelTitle} id="bill-spend-h">Spend by Client</h2>
              <span className="text-fg-muted text-xs">${fmt(totalSpend)} / mo</span>
            </div>
            {tenants.length ? (
              <Table>
                  <thead>
                    <tr><th scope="col">Client</th><th scope="col">Plan</th><th scope="col">Spend / mo</th><th scope="col">Share of total</th></tr>
                  </thead>
                  <tbody>
                    {tenants.map((t) => {
                      const share = totalSpend ? (t.spend / totalSpend) * 100 : 0;
                      return (
                        <tr key={t.id}>
                          <td>
                            <div className={who}>
                              <span className={codeTile} style={{ background: colorFor(t.color) }} aria-hidden="true">{t.code}</span>
                              <span className="font-medium">{t.name}</span>
                            </div>
                          </td>
                          <td><Pill tone="muted">{t.plan}</Pill></td>
                          <td className="font-mono font-medium">${(t.spend / 1000).toFixed(1)}k</td>
                          <td>
                            <div className={meter}>
                              <span className={meterTrack}><span className={meterFill} style={{ width: `${share}%`, background: colorFor(t.color) }} /></span>
                              <span className={meterValue}>{share.toFixed(1)}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
            ) : (
              <Empty>No clients provisioned yet.</Empty>
            )}
          </section>

          <section className={cx(ui.card, ui.panel)} aria-labelledby="bill-plan-h">
            <div className={ui.panelHead}>
              <h2 className={ui.panelTitle} id="bill-plan-h">Current Plan</h2>
              <span className={headTags}><Pill tone="ok">{ORG.plan}</Pill><SampleTag /></span>
            </div>
            <dl className={ui.dl}>
              <dt>Base</dt><dd className={ui.mono}><b>$18,000</b> / mo committed</dd>
              <dt>Seats</dt><dd className={ui.mono}>${SEAT_PRICE} × {fmt(ORG.seatsUsed)} = ${fmt(seatCost)}</dd>
              <dt>Contract term</dt><dd>Annual · auto-renew</dd>
              <dt>Renewal date</dt><dd>Mar 12, 2026</dd>
            </dl>
          </section>

          <section className={cx(ui.card, ui.panel)} aria-labelledby="bill-addons-h">
            <div className={ui.panelHead}>
              <h2 className={ui.panelTitle} id="bill-addons-h">Add-ons</h2>
              <SampleTag />
            </div>
            <Table>
                <thead>
                  <tr><th scope="col">Add-on</th><th scope="col">Price</th><th scope="col">Status</th></tr>
                </thead>
                <tbody>
                  {SAMPLE_ADDONS.map(([n, d, p, on]) => (
                    <tr key={n}>
                      <td className={ui.cellWrap}><span className="font-medium">{n}</span><div className={ui.sub}>{d}</div></td>
                      <td className={monoCell}>{p}</td>
                      <td>{on ? <Pill tone="ok"><PillDot />Active</Pill> : <Button size="sm">Enable</Button>}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
          </section>
        </div>

        <div className={ui.rail}>
          <section className={cx(ui.card, ui.panel)} aria-labelledby="bill-pay-h">
            <div className={ui.panelHead}>
              <h2 className={ui.panelTitle} id="bill-pay-h"><Icon icon={ZapIcon} /> Pay your invoice</h2>
              <span className="text-fg-muted text-xs">Razorpay</span>
            </div>
            <div className={amount}>
              <div>
                <span className="text-fg-muted text-xs">Estimated amount (client spend)</span>
                <b>${fmt(totalSpend)}</b>
              </div>
            </div>
            <dl className={ui.dl}>
              <dt>Pay to</dt><dd>@madhurajkumar</dd>
            </dl>
            <a className={buttonClass("primary")} href={PAY_URL} target="_blank" rel="noopener noreferrer">
              <Icon icon={LockIcon} /> Pay securely via Razorpay
            </a>
            <ul className={ui.tags} aria-label="Accepted payment methods">
              <li className={ui.tag}><Icon icon={SmartphoneIcon} /> UPI</li>
              <li className={ui.tag}><Icon icon={CreditCardIcon} /> Cards</li>
              <li className={ui.tag}><Icon icon={LandmarkIcon} /> Netbanking</li>
              <li className={ui.tag}><Icon icon={WalletIcon} /> Wallets</li>
            </ul>
          </section>

          <section className={cx(ui.card, ui.panel)} aria-labelledby="bill-contact-h">
            <div className={ui.panelHead}>
              <h2 className={ui.panelTitle} id="bill-contact-h">Billing Contact</h2>
              <SampleTag />
            </div>
            <dl className={ui.dl}>
              <dt>Owner</dt><dd>{owner?.name ?? "—"}</dd>
              <dt>AP email</dt><dd className={ui.mono}>ap@finspot.in</dd>
              <dt>Payment</dt><dd>Net-30 · ACH</dd>
              <dt>Account exec</dt><dd>Sarah Chen · Argus-LinkedEye</dd>
            </dl>
          </section>
        </div>
      </div>
    </Page>
  );
}
