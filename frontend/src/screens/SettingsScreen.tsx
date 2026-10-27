// Workspace settings — LinkedEye layout: one form with General, Branding and
// Single Sign-On sections, a verified-domains table and an in-page section
// nav. There is no settings endpoint yet, so Save keeps the values on this
// page only and says so.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { useUiStore } from "@/store/ui";
import { ORG } from "@/data/core";
import { Pill, PillDot } from "@/components/ld";
import { Button, Crumbs, Page, PageHead, Table, cx, toneText, ui } from "@/components/ui";

import { Icon } from "@/components/Icon";
import { ChevronRightIcon, CircleCheckIcon, FileOutputIcon, SaveIcon } from "lucide-react";
// Form grid, fields and controls (were ld-admin-* / ld-form-field / ld-input)
const formGrid = "grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-x-4 gap-y-3";
const field = cx(ui.field, "[&>label]:font-semibold");
const input = cx(ui.input, "[&[readonly]]:bg-bg-muted [&[readonly]]:text-fg-muted disabled:bg-bg-muted disabled:text-fg-muted");
// (ld-input's `font: inherit` came after ld-mono, so the weight stays normal)
const monoInput = "font-mono !text-[12.5px]";
const colorInput = "w-[38px] h-[38px] p-0.5 border border-line-strong rounded bg-bg-raised cursor-pointer";
const switchRow = "flex items-center gap-2.5 min-h-[38px] text-sm text-fg";
const switchBtn = cx(
  "relative flex-none w-10 h-[22px] p-0 border border-line-strong rounded-full bg-bg-muted cursor-pointer",
  "after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:rounded-full after:bg-bg-raised after:shadow-sm after:[transition:transform_0.15s]",
  "aria-checked:bg-accent aria-checked:border-accent aria-checked:after:translate-x-[18px] aria-checked:after:bg-white",
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
);
const sectionNav = cx(
  "list-none flex flex-col gap-0.5 m-0 p-0",
  "[&_a]:flex [&_a]:items-center [&_a]:justify-between [&_a]:gap-2 [&_a]:py-2 [&_a]:px-2.5 [&_a]:rounded [&_a]:text-sm [&_a]:text-fg [&_a]:no-underline",
  "[&_a:hover]:bg-bg-hover [&_a:focus-visible]:outline [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-accent [&_a:focus-visible]:outline-offset-1",
  "[&_.ld-icon]:text-[10px] [&_.ld-icon]:text-fg-subtle",
);

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
    <div className={switchRow}>
      <button type="button" id={id} role="switch" aria-checked={checked} className={switchBtn} onClick={() => onChange(!checked)} />
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
    <Page>
      <Crumbs items={[{ label: "Home", onClick: () => setRoute("dashboard") }, { label: tenant.name }, { label: "Settings" }]} />

      <PageHead
        title={<>Workspace Settings · {tenant.name}</>}
        subtitle={<>{tenant.users} users · {tenant.plan} plan · part of {ORG.name}</>}
        actions={
          <>
            <Pill tone="ok"><PillDot />Active</Pill>
            <Button><Icon icon={FileOutputIcon} /> Export Config</Button>
            <Button type="submit" form="settings-form" variant="primary"><Icon icon={SaveIcon} /> Save Changes</Button>
          </>
        }
      />

      <div className={ui.split}>
        <form id="settings-form" className={ui.form} onSubmit={onSubmit} onChange={() => setSaved(false)}>
          <section id="set-general" className={cx(ui.card, ui.panel)} aria-labelledby="set-general-h">
            <div className={ui.panelHead}><h2 className={ui.panelTitle} id="set-general-h">General</h2></div>
            <div className={formGrid}>
              <div className={field}>
                <label htmlFor="set-name">Workspace name <span className={ui.req}>*</span></label>
                <input id="set-name" className={input} defaultValue={tenant.name} required />
              </div>
              <div className={field}>
                <label htmlFor="set-url">URL</label>
                <input id="set-url" className={cx(input, monoInput)} value={`${tenant.id}.linkedeye.in`} readOnly />
              </div>
              <div className={field}>
                <label htmlFor="set-tz">Time zone</label>
                <select id="set-tz" className={ui.select} defaultValue="UTC">
                  <option>UTC</option>
                  <option>Asia/Kolkata</option>
                  <option>Europe/London</option>
                  <option>America/New_York</option>
                </select>
              </div>
              <div className={field}>
                <label htmlFor="set-region">Region</label>
                <select id="set-region" className={ui.select} defaultValue="us-east-1">
                  <option value="us-east-1">us-east-1 (N. Virginia)</option>
                  <option value="eu-west-1">eu-west-1 (Ireland)</option>
                  <option value="ap-south-1">ap-south-1 (Mumbai)</option>
                </select>
              </div>
              <div className={field}>
                <label htmlFor="set-plan">Plan</label>
                <input id="set-plan" className={input} value={tenant.plan} readOnly />
              </div>
              <div className={field}>
                <label htmlFor="set-parent">Parent organisation</label>
                <input id="set-parent" className={input} value={ORG.name} readOnly />
              </div>
            </div>
          </section>

          <section id="set-branding" className={cx(ui.card, ui.panel)} aria-labelledby="set-branding-h">
            <div className={ui.panelHead}>
              <h2 className={ui.panelTitle} id="set-branding-h">Branding</h2>
              <Pill tone="purple">Enterprise</Pill>
            </div>
            <div className={formGrid}>
              <div className={field}>
                <label htmlFor="set-logo">Logo</label>
                <input id="set-logo" className={input} type="file" accept="image/svg+xml,image/png" />
                <span className="text-xs text-fg-subtle">48px · SVG or PNG · used in the sidebar and email</span>
              </div>
              <div className={field}>
                <label htmlFor="set-color">Primary colour</label>
                <span className="flex items-center gap-2">
                  <input id="set-color" type="color" className={colorInput} value={color} onChange={(e) => setColor(e.target.value)} />
                  <span className={ui.mono}>{color}</span>
                </span>
              </div>
              <div className={field}>
                <label htmlFor="set-sender">Email sender</label>
                <input id="set-sender" className={cx(input, monoInput)} value={`noreply@${tenant.id}.linkedeye.in`} readOnly />
              </div>
              <div className={cx(field, "col-[1/-1]")}>
                <label htmlFor="set-banner">Login banner</label>
                <textarea id="set-banner" className={ui.textarea} maxLength={144} placeholder="Message shown on the sign-in page (up to 144 characters)" />
              </div>
            </div>
          </section>

          <section id="set-sso" className={cx(ui.card, ui.panel)} aria-labelledby="set-sso-h">
            <div className={ui.panelHead}>
              <h2 className={ui.panelTitle} id="set-sso-h">Single Sign-On</h2>
              <Pill tone={ssoEnforced ? "ok" : "muted"}>{ssoEnforced ? "Enforced" : "Optional"}</Pill>
            </div>
            <div className={formGrid}>
              <div className={field}>
                <label htmlFor="set-idp">Provider <span className={ui.req}>*</span></label>
                <select id="set-idp" className={ui.select} defaultValue="okta">
                  <option value="okta">Okta SAML 2.0</option>
                  <option value="azure">Microsoft Entra ID</option>
                  <option value="google">Google Workspace</option>
                </select>
              </div>
              <div className={field}>
                <label htmlFor="set-idp-domain">IdP domain</label>
                <input id="set-idp-domain" className={cx(input, monoInput)} defaultValue="finspot.okta.com" />
              </div>
              <Switch id="set-sso-enforce" checked={ssoEnforced} onChange={(v) => { setSsoEnforced(v); setSaved(false); }} label="Require SSO for every user" />
              <Switch id="set-scim" checked={scim} onChange={(v) => { setScim(v); setSaved(false); }} label="SCIM user provisioning" />
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-sm text-fg-muted mr-auto" role="status">
              {saved && <><Icon icon={CircleCheckIcon} className={toneText.ok} /> Saved on this page — the settings API is not connected yet.</>}
            </span>
            <Button type="reset" onClick={() => setSaved(false)}>Reset</Button>
            <Button type="submit" variant="primary"><Icon icon={SaveIcon} /> Save Changes</Button>
          </div>

          <section id="set-domains" className={cx(ui.card, ui.panel)} aria-labelledby="set-domains-h">
            <div className={ui.panelHead}>
              <h2 className={ui.panelTitle} id="set-domains-h">Verified Domains</h2>
              <Pill tone="muted">Sample data</Pill>
            </div>
            <Table>
                <thead>
                  <tr><th scope="col">Domain</th><th scope="col">Status</th></tr>
                </thead>
                <tbody>
                  {SAMPLE_DOMAINS.map(([d, v]) => (
                    <tr key={d}>
                      <td className="font-mono font-medium">{d}</td>
                      <td>{v ? <Pill tone="ok"><PillDot />Verified</Pill> : <Pill tone="warn"><PillDot />Pending</Pill>}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
          </section>
        </form>

        <div className={ui.rail}>
          <section className={cx(ui.card, ui.panel)} aria-labelledby="set-nav-h">
            <div className={ui.panelHead}><h2 className={ui.panelTitle} id="set-nav-h">Sections</h2></div>
            <ul className={sectionNav}>
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`}>{s.label} <Icon icon={ChevronRightIcon} /></a>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </Page>
  );
}
