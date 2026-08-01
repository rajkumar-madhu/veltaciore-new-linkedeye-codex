// Workspace settings in ServiceNow form-style
// Ported from screens/settings.jsx.
import React from "react";
import { useUiStore } from "@/store/ui";
import { ORG } from "@/data/core";
import { FormSection, FormRow, Field } from "@/components/primitives";

export default function SettingsScreen() {
  const tenant = useUiStore((s) => s.tenant);
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const toggle = (id: string) => setCollapsed(c => ({ ...c, [id]: !c[id] }));
  return (
    <div className="page page-fade sn-dash">
      <div className="sn-breadcrumb">
        <a className="sn-link">Home</a><span className="sn-bc-sep">›</span>
        <a className="sn-link">{tenant.name}</a><span className="sn-bc-sep">›</span>
        <span>Settings</span>
      </div>
      <div className="sn-form-header">
        <div className="sn-form-title-row">
          <span className="sn-rec-number">{tenant.id.toUpperCase()}</span>
          <span className="sn-pill svc-healthy"><i className="fa-solid fa-circle" /> Active</span>
          <span className="sn-pill state-neutral"><i className="fa-solid fa-globe" /> {tenant.id}.linkedeye.in</span>
        </div>
        <div className="sn-form-title-meta">
          <div>
            <h1>Workspace Settings · {tenant.name}</h1>
            <div className="sn-form-sub">{tenant.users} users · {tenant.plan} plan · inherited SSO from {ORG.name}</div>
          </div>
          <div className="sn-form-actions">
            <button className="sn-btn"><i className="fa-solid fa-file-export" /> Export Config</button>
            <button className="sn-btn primary"><i className="fa-solid fa-floppy-disk" /> Save Changes</button>
          </div>
        </div>
      </div>
      <div className="sn-form-layout">
        <div className="sn-form-main">
          <FormSection id="general" title="General" collapsed={collapsed.general} onToggle={toggle}>
            <FormRow>
              <Field label="Workspace name" value={<b>{tenant.name}</b>} required />
              <Field label="URL" value={<span className="mono">{tenant.id}.linkedeye.in</span>} required />
            </FormRow>
            <FormRow>
              <Field label="Time zone" value="UTC" />
              <Field label="Region" value="us-east-1 (N. Virginia)" />
            </FormRow>
            <FormRow>
              <Field label="Plan" value={<span className="sn-state-pill state-neutral"><i className="fa-solid fa-circle" /> {tenant.plan}</span>} />
              <Field label="Parent org" value={ORG.name} />
            </FormRow>
          </FormSection>

          <FormSection id="branding" title="Branding" badge="Enterprise" collapsed={collapsed.branding} onToggle={toggle}>
            <FormRow>
              <Field label="Logo" value="48px · SVG / PNG · sidebar + email" />
              <Field label="Primary color" value={<span className="row row-8"><div style={{ width: 24, height: 24, borderRadius: 3, background: "#2563eb" }} /><span className="mono">#2563eb</span></span>} />
            </FormRow>
            <FormRow>
              <Field label="Email sender" value={<span className="mono">noreply@{tenant.id}.linkedeye.in</span>} />
              <Field label="Login banner" value="Custom message · 144 chars" />
            </FormRow>
          </FormSection>

          <FormSection id="sso" title="Single Sign-On" badge="Enforced" collapsed={collapsed.sso} onToggle={toggle}>
            <FormRow>
              <Field label="Provider" value={<span className="mono"><b>Okta SAML 2.0</b></span>} required />
              <Field label="Status" value={<span className="sn-state-pill svc-healthy"><i className="fa-solid fa-circle" /> Active</span>} />
            </FormRow>
            <FormRow>
              <Field label="Domain" value={<span className="mono">finspot.okta.com</span>} />
              <Field label="SCIM provisioning" value={<span className="tone-ok">Enabled · last sync 2m ago</span>} />
            </FormRow>
          </FormSection>

          <FormSection id="domains" title="Verified Domains" badge="3 domains" collapsed={collapsed.domains} onToggle={toggle}>
            <table className="sn-list-table">
              <tbody>
                {([["finspot.in",true],["finspot-ventures.com",true],["finspotlabs.dev",false]] as [string, boolean][]).map(([d, v], i) => (
                  <tr key={i}>
                    <td><span className="mono"><b>{d}</b></span></td>
                    <td style={{ width: 130 }}>{v ? <span className="sn-state-pill svc-healthy"><i className="fa-solid fa-circle" /> Verified</span> : <span className="sn-state-pill state-mitigating"><i className="fa-solid fa-circle" /> Pending</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </FormSection>
        </div>
        <aside className="sn-form-side">
          <div className="sn-side-card">
            <div className="sn-side-head">Quick Sections</div>
            <div className="sn-side-body">
              {["General","Branding","SSO &amp; Domains","Security","Data Residency","Audit Log","API Tokens","Danger Zone"].map((s, i) => (
                <div key={i} className="sn-related-row">
                  <div><div className="sn-related-title" dangerouslySetInnerHTML={{ __html: s }} /></div>
                  <i className="fa-solid fa-chevron-right text-mute" style={{ fontSize: 11 }} />
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
