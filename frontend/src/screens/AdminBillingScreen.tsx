// Super-admin Billing in ServiceNow form-style
// Ported from screens/admin-billing.jsx.
import React from "react";
import { useTenants } from "@/api/hooks";
import { ORG, TENANTS } from "@/data/core";
import { Kpi, FormSection, FormRow, Field, UserById } from "@/components/primitives";
import { colorFor } from "@/components/Shell";

export default function AdminBillingScreen() {
  const { data } = useTenants();
  const tenants = data ?? [];
  const totalSpend = tenants.reduce((s,t) => s + t.spend, 0);
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const toggle = (id: string) => setCollapsed(c => ({ ...c, [id]: !c[id] }));
  return (
    <div className="page page-fade sn-dash">
      <div className="sn-breadcrumb">
        <a className="sn-link">Home</a><span className="sn-bc-sep">›</span>
        <a className="sn-link">Super-admin</a><span className="sn-bc-sep">›</span>
        <span>Billing &amp; Plans</span>
      </div>
      <div className="sn-form-header">
        <div className="sn-form-title-row">
          <span className="sn-rec-number">BILLING</span>
          <span className="sn-pill svc-healthy"><i className="fa-solid fa-circle" /> Enterprise Plus</span>
          <span className="sn-pill state-neutral"><i className="fa-solid fa-calendar" /> Renews Mar 12, 2026</span>
        </div>
        <div className="sn-form-title-meta">
          <div>
            <h1>Billing &amp; Plans</h1>
            <div className="sn-form-sub">Enterprise agreement · annual · auto-renew · {tenants.length} business units</div>
          </div>
          <div className="sn-form-actions">
            <button className="sn-btn"><i className="fa-solid fa-file-invoice" /> Invoices</button>
            <button className="sn-btn"><i className="fa-solid fa-file-export" /> Export</button>
            <a className="sn-btn pay-btn" href="https://razorpay.me/@madhurajkumar" target="_blank" rel="noopener noreferrer"><i className="fa-solid fa-bolt" /> Pay invoice</a>
            <button className="sn-btn primary"><i className="fa-solid fa-arrow-up-right-from-square" /> Contract</button>
          </div>
        </div>
      </div>
      <div className="sn-kpi-strip">
        <Kpi l="MRR" v={`$${(totalSpend/1000).toFixed(0)}k`} s="+14% QoQ" tone="ok" />
        <Kpi l="Seats used" v={ORG.seatsUsed.toLocaleString()} s={`/${ORG.seatsTotal.toLocaleString()}`} tone="neutral" />
        <Kpi l="Next invoice" v="May 1" s={`$${totalSpend.toLocaleString()} est`} tone="neutral" />
        <Kpi l="Events 87M" v="87%" s="of 100M commit" tone="warn" />
        <Kpi l="Overage" v="$0" s="this period" tone="ok" />
        <Kpi l="Add-ons" v="3" s="active" tone="neutral" />
      </div>
      <div className="sn-form-layout">
        <div className="sn-form-main">
          <FormSection id="plan" title="Current Plan" badge="Enterprise Plus" collapsed={collapsed.plan} onToggle={toggle}>
            <FormRow>
              <Field label="Base" value={<span className="mono"><b>$18,000</b> / mo committed</span>} />
              <Field label="Seats" value={<span className="mono">$12 × {ORG.seatsUsed.toLocaleString()} = $14,964</span>} />
            </FormRow>
            <FormRow>
              <Field label="Events ingested" value={<span><b>87M</b> / 100M commit</span>} />
              <Field label="Overage" value={<span className="tone-ok"><b>$0</b> this period</span>} />
            </FormRow>
            <FormRow>
              <Field label="Contract term" value="Annual · auto-renew" />
              <Field label="Renewal date" value="Mar 12, 2026" />
            </FormRow>
          </FormSection>

          <FormSection id="spend" title="Spend by Business Unit" collapsed={collapsed.spend} onToggle={toggle}>
            <table className="sn-list-table">
              <thead><tr><th>Business Unit</th><th style={{width:130}}>Plan</th><th style={{width:120}}>Spend / mo</th><th style={{width:180}}>Share of total</th></tr></thead>
              <tbody>
                {tenants.map(t => (
                  <tr key={t.id}>
                    <td>
                      <div className="row row-8">
                        <div style={{ width: 24, height: 24, borderRadius: 3, background: colorFor(t.color), color: "#fff", fontWeight: 700, fontSize: 10, display: "grid", placeItems: "center" }}>{t.code}</div>
                        <b>{t.name}</b>
                      </div>
                    </td>
                    <td><span className="sn-state-pill state-neutral"><i className="fa-solid fa-circle" /> {t.plan}</span></td>
                    <td className="mono"><b>${(t.spend/1000).toFixed(1)}k</b></td>
                    <td>
                      <div className="row row-8">
                        <div className="bar-track" style={{ flex: 1 }}><div className="bar-fill" style={{ width: (t.spend/totalSpend*100) + "%", background: colorFor(t.color) }} /></div>
                        <span className="mono" style={{ fontSize: 11 }}>{(t.spend/totalSpend*100).toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </FormSection>

          <FormSection id="addons" title="Add-ons" collapsed={collapsed.addons} onToggle={toggle}>
            <table className="sn-list-table">
              <tbody>
                {([
                  ["AI Copilot Pro","Auto-RCA · playbook gen · chatops","$2,500/mo",true],
                  ["Status Page","Public + private status pages","$400/mo",true],
                  ["Long-term storage","3-year retention for events/logs","$1,200/mo",false],
                  ["On-prem collector","Self-hosted data plane","Included",true],
                  ["FedRAMP Moderate","Government-compliant region","Contact sales",false],
                ] as [string, string, string, boolean][]).map(([n, d, p, on], i) => (
                  <tr key={i}>
                    <td><b>{n}</b><div className="text-mute" style={{ fontSize: 11, marginTop: 2 }}>{d}</div></td>
                    <td className="mono" style={{ width: 140 }}>{p}</td>
                    <td style={{ width: 110 }}>{on ? <span className="sn-state-pill svc-healthy"><i className="fa-solid fa-circle" /> Active</span> : <button className="sn-btn">Enable</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </FormSection>
        </div>
        <aside className="sn-form-side">
          <div className="sn-side-card pay-card">
            <div className="sn-side-head">
              <span><i className="fa-solid fa-bolt" /> Pay your invoice</span>
              <span className="pay-rzp">Razorpay</span>
            </div>
            <div className="sn-side-body">
              <div className="pay-amount-row">
                <div>
                  <div className="pay-amount-lbl">Amount due</div>
                  <div className="pay-amount">${totalSpend.toLocaleString()}</div>
                </div>
                <span className="sn-state-pill state-progress"><i className="fa-solid fa-clock" /> Due May 1</span>
              </div>
              <Field label="Invoice" value={<span className="mono">INV-2026-05</span>} />
              <Field label="Pay to" value="@madhurajkumar" />
              <a className="pay-cta" href="https://razorpay.me/@madhurajkumar" target="_blank" rel="noopener noreferrer">
                <i className="fa-solid fa-lock" /> Pay securely via Razorpay
              </a>
              <div className="pay-methods">
                <span><i className="fa-solid fa-mobile-screen" /> UPI</span>
                <span><i className="fa-solid fa-credit-card" /> Cards</span>
                <span><i className="fa-solid fa-building-columns" /> Netbanking</span>
                <span><i className="fa-solid fa-wallet" /> Wallets</span>
              </div>
            </div>
          </div>

          <div className="sn-side-card">
            <div className="sn-side-head">Billing Contact</div>
            <div className="sn-side-body">
              <Field label="Owner" value={<UserById id="u2" />} />
              <Field label="AP Email" value={<span className="mono">ap@finspot.in</span>} />
              <Field label="Payment" value="Net-30 · ACH" />
              <Field label="Account exec" value="Sarah Chen · Argus-LinkedEye" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
