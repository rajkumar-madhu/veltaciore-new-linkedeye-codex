// Workspace settings — LinkedEye layout: one form with General, Branding and
// Single Sign-On sections, a verified-domains table and an in-page section
// nav. There is no settings endpoint yet, so Save keeps the values on this
// page only and says so.
import React from "react";
import "@/styles/admin.css";
import { useNav } from "@/hooks/useNav";
import { useUiStore } from "@/store/ui";
import { ORG } from "@/data/core";
import { Pill } from "@/components/ld";

const SAMPLE_DOMAINS: [string, boolean][] = [
  ["finspot.in", true],
  ["finspot-ventures.com", true],
  ["finspotlabs.dev", false],
];

const SECTIONS = [
  { id: "set-general", label: "General" },
  { id: "set-branding", label: "Branding" },
  { id: "set-sso", label: "Single Sign-On" },
  { id: "set-domains", label: "Verified Domains" },
];

function Switch({ id, checked, onChange, label }: { id: string; checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="ld-admin-switch-row">
      <button type="button" id={id} role="switch" aria-checked={checked} className="ld-admin-switch" onClick={() => onChange(!checked)} />
      <label htmlFor={id}>{label}</label>
    </div>
  );
}

export default function SettingsScreen() {
  const { setRoute } = useNav();
  const tenant = useUiStore((s) => s.tenant);
  const [color, setColor] = React.useState("#2563eb");
  const [ssoEnforced, setSsoEnforced] = React.useState(true);
  const [scim, setScim] = React.useState(true);
  const [saved, setSaved] = React.useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
  };

  return (
    <div className="ld-dash">
      <nav className="ld-crumbs" aria-label="Breadcrumb">
        <button type="button" className="ld-link" onClick={() => setRoute("dashboard")}>Home</button>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <span>{tenant.name}</span>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <span>Settings</span>
      </nav>

      <div className="ld-head">
        <div>
          <h1>Workspace Settings · {tenant.name}</h1>
          <p>{tenant.users} users · {tenant.plan} plan · part of {ORG.name}</p>
        </div>
        <div className="ld-head-actions">
          <Pill tone="ok"><span className="ld-pill-dot" />Active</Pill>
          <button type="button" className="ld-btn"><i className="fa-solid fa-file-export" aria-hidden="true" /> Export Config</button>
          <button type="submit" form="settings-form" className="ld-btn ld-btn-primary"><i className="fa-solid fa-floppy-disk" aria-hidden="true" /> Save Changes</button>
        </div>
      </div>

      <div className="ld-split">
        <form id="settings-form" className="ld-form" onSubmit={onSubmit} onChange={() => setSaved(false)}>
          <section id="set-general" className="ld-card ld-panel" aria-labelledby="set-general-h">
            <div className="ld-panel-head"><h2 id="set-general-h">General</h2></div>
            <div className="ld-admin-form-grid">
              <div className="ld-form-field">
                <label htmlFor="set-name">Workspace name <span className="ld-req">*</span></label>
                <input id="set-name" className="ld-input" defaultValue={tenant.name} required />
              </div>
              <div className="ld-form-field">
                <label htmlFor="set-url">URL</label>
                <input id="set-url" className="ld-input ld-mono" value={`${tenant.id}.linkedeye.in`} readOnly />
              </div>
              <div className="ld-form-field">
                <label htmlFor="set-tz">Time zone</label>
                <select id="set-tz" className="ld-select" defaultValue="UTC">
                  <option>UTC</option>
                  <option>Asia/Kolkata</option>
                  <option>Europe/London</option>
                  <option>America/New_York</option>
                </select>
              </div>
              <div className="ld-form-field">
                <label htmlFor="set-region">Region</label>
                <select id="set-region" className="ld-select" defaultValue="us-east-1">
                  <option value="us-east-1">us-east-1 (N. Virginia)</option>
                  <option value="eu-west-1">eu-west-1 (Ireland)</option>
                  <option value="ap-south-1">ap-south-1 (Mumbai)</option>
                </select>
              </div>
              <div className="ld-form-field">
                <label htmlFor="set-plan">Plan</label>
                <input id="set-plan" className="ld-input" value={tenant.plan} readOnly />
              </div>
              <div className="ld-form-field">
                <label htmlFor="set-parent">Parent organisation</label>
                <input id="set-parent" className="ld-input" value={ORG.name} readOnly />
              </div>
            </div>
          </section>

          <section id="set-branding" className="ld-card ld-panel" aria-labelledby="set-branding-h">
            <div className="ld-panel-head">
              <h2 id="set-branding-h">Branding</h2>
              <Pill tone="purple">Enterprise</Pill>
            </div>
            <div className="ld-admin-form-grid">
              <div className="ld-form-field">
                <label htmlFor="set-logo">Logo</label>
                <input id="set-logo" className="ld-input" type="file" accept="image/svg+xml,image/png" />
                <span className="ld-admin-hint">48px · SVG or PNG · used in the sidebar and email</span>
              </div>
              <div className="ld-form-field">
                <label htmlFor="set-color">Primary colour</label>
                <span className="ld-admin-color">
                  <input id="set-color" type="color" value={color} onChange={(e) => setColor(e.target.value)} />
                  <span className="ld-mono">{color}</span>
                </span>
              </div>
              <div className="ld-form-field">
                <label htmlFor="set-sender">Email sender</label>
                <input id="set-sender" className="ld-input ld-mono" value={`noreply@${tenant.id}.linkedeye.in`} readOnly />
              </div>
              <div className="ld-form-field ld-admin-span">
                <label htmlFor="set-banner">Login banner</label>
                <textarea id="set-banner" className="ld-input ld-textarea" maxLength={144} placeholder="Message shown on the sign-in page (up to 144 characters)" />
              </div>
            </div>
          </section>

          <section id="set-sso" className="ld-card ld-panel" aria-labelledby="set-sso-h">
            <div className="ld-panel-head">
              <h2 id="set-sso-h">Single Sign-On</h2>
              <Pill tone={ssoEnforced ? "ok" : "muted"}>{ssoEnforced ? "Enforced" : "Optional"}</Pill>
            </div>
            <div className="ld-admin-form-grid">
              <div className="ld-form-field">
                <label htmlFor="set-idp">Provider <span className="ld-req">*</span></label>
                <select id="set-idp" className="ld-select" defaultValue="okta">
                  <option value="okta">Okta SAML 2.0</option>
                  <option value="azure">Microsoft Entra ID</option>
                  <option value="google">Google Workspace</option>
                </select>
              </div>
              <div className="ld-form-field">
                <label htmlFor="set-idp-domain">IdP domain</label>
                <input id="set-idp-domain" className="ld-input ld-mono" defaultValue="finspot.okta.com" />
              </div>
              <Switch id="set-sso-enforce" checked={ssoEnforced} onChange={(v) => { setSsoEnforced(v); setSaved(false); }} label="Require SSO for every user" />
              <Switch id="set-scim" checked={scim} onChange={(v) => { setScim(v); setSaved(false); }} label="SCIM user provisioning" />
            </div>
          </section>

          <div className="ld-admin-actions">
            <span className="ld-admin-status" role="status">
              {saved && <><i className="fa-solid fa-circle-check ld-text-ok" aria-hidden="true" /> Saved on this page — the settings API is not connected yet.</>}
            </span>
            <button type="reset" className="ld-btn" onClick={() => setSaved(false)}>Reset</button>
            <button type="submit" className="ld-btn ld-btn-primary"><i className="fa-solid fa-floppy-disk" aria-hidden="true" /> Save Changes</button>
          </div>

          <section id="set-domains" className="ld-card ld-panel" aria-labelledby="set-domains-h">
            <div className="ld-panel-head">
              <h2 id="set-domains-h">Verified Domains</h2>
              <Pill tone="muted">Sample data</Pill>
            </div>
            <div className="ld-table-wrap">
              <table className="ld-table">
                <thead>
                  <tr><th scope="col">Domain</th><th scope="col">Status</th></tr>
                </thead>
                <tbody>
                  {SAMPLE_DOMAINS.map(([d, v]) => (
                    <tr key={d}>
                      <td className="ld-mono ld-strong">{d}</td>
                      <td>{v ? <Pill tone="ok"><span className="ld-pill-dot" />Verified</Pill> : <Pill tone="warn"><span className="ld-pill-dot" />Pending</Pill>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </form>

        <div className="ld-rail">
          <section className="ld-card ld-panel" aria-labelledby="set-nav-h">
            <div className="ld-panel-head"><h2 id="set-nav-h">Sections</h2></div>
            <ul className="ld-admin-nav">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`}>{s.label} <i className="fa-solid fa-chevron-right" aria-hidden="true" /></a>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
