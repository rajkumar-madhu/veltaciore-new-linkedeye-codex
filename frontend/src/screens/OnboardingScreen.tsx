// Tenant onboarding wizard
// Ported from screens/onboarding.jsx. Rendered without app chrome.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { ORG, USERS, INTEGRATIONS } from "@/data/core";
import { Avatar, Pill } from "@/components/primitives";

export default function OnboardingScreen() {
  const { setRoute } = useNav();
  const [step, setStep] = React.useState(1);
  const steps = ["Workspace", "Identity", "Services", "Team", "Review"];
  return (
    <div className="page page-fade">
      <div className="wizard">
        <div className="wizard-stepper">
          {steps.map((s, i) => {
            const n = i + 1;
            const state = n < step ? "done" : n === step ? "active" : "";
            return (
              <div key={i} className={`step ${state}`}>
                <div className="n"><i>{n}</i></div>
                <div className="label">{s}</div>
              </div>
            );
          })}
        </div>
        <div className="wizard-body">
          {step === 1 && (
            <>
              <h2>Name your workspace</h2>
              <p className="intro">A workspace is a sub-tenant under <b>{ORG.name}</b>. You can move teams and users between workspaces anytime.</p>
              <div className="field"><label>Workspace name</label><input className="input" defaultValue="Finspot Ventures" /></div>
              <div className="grid-2">
                <div className="field"><label>URL slug</label>
                  <div className="row row-8" style={{ border: "1px solid var(--border)", borderRadius: 6, padding: "0 10px", background: "var(--bg-raised)" }}>
                    <input defaultValue="finspot-ventures" style={{ border: "none", outline: "none", padding: "8px 0", background: "transparent", flex: 1 }} />
                    <span className="text-mute" style={{ fontSize: 12 }}>.linkedeye.in</span>
                  </div>
                </div>
                <div className="field"><label>Region</label>
                  <select className="select" defaultValue="us-east-1"><option>us-east-1 (N. Virginia)</option><option>us-west-2 (Oregon)</option><option>eu-west-1 (Ireland)</option><option>ap-southeast-1 (Singapore)</option></select>
                </div>
              </div>
              <div className="field"><label>Parent organization</label>
                <div className="row row-12" style={{ padding: "10px 12px", background: "var(--bg-muted)", borderRadius: 8 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 7, background: "linear-gradient(135deg,#0f1c3f,#2563eb)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 12 }}>M</div>
                  <div style={{ flex: 1 }}><b>{ORG.name}</b><div className="text-mute" style={{ fontSize: 11.5 }}>Enterprise Plus · 6 business units</div></div>
                  <Pill kind="success">Inherited SSO, billing</Pill>
                </div>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <h2>Connect identity</h2>
              <p className="intro">Argus-LinkedEye inherits SSO from {ORG.name}. You can override per-workspace.</p>
              <div className="stack stack-12">
                <div className="row row-12" style={{ padding: 14, border: "1px solid var(--accent)", background: "var(--blue-50)", borderRadius: 10 }}>
                  <i className="fa-solid fa-shield-halved" style={{ fontSize: 22, color: "var(--accent)" }} />
                  <div style={{ flex: 1 }}><b>Use parent SSO (Okta)</b><div className="text-mute" style={{ fontSize: 11.5 }}>Users from finspot.okta.com → this workspace</div></div>
                  <input type="radio" defaultChecked className="checkbox" />
                </div>
                <div className="row row-12" style={{ padding: 14, border: "1px solid var(--border)", borderRadius: 10 }}>
                  <i className="fa-brands fa-microsoft" style={{ fontSize: 22, color: "#00a4ef" }} />
                  <div style={{ flex: 1 }}><b>Entra ID / Azure AD</b><div className="text-mute" style={{ fontSize: 11.5 }}>Configure separately</div></div>
                  <input type="radio" className="checkbox" />
                </div>
                <div className="row row-12" style={{ padding: 14, border: "1px solid var(--border)", borderRadius: 10 }}>
                  <i className="fa-solid fa-key" style={{ fontSize: 22, color: "var(--fg-muted)" }} />
                  <div style={{ flex: 1 }}><b>Custom SAML</b><div className="text-mute" style={{ fontSize: 11.5 }}>Upload metadata XML</div></div>
                  <input type="radio" className="checkbox" />
                </div>
              </div>
              <div className="field" style={{ marginTop: 16 }}>
                <label>Allowed email domains</label>
                <input className="input" defaultValue="finspot.io, finspot-ventures.com" />
                <span className="hint">Users with these domains are auto-provisioned</span>
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <h2>Connect signal sources</h2>
              <p className="intro">Pick what to watch. You can add more later.</p>
              <div className="grid-3">
                {INTEGRATIONS.map(g => (
                  <div key={g.name} className="row row-12" style={{ padding: 14, border: "1px solid var(--border)", borderRadius: 10, cursor: "pointer" }}>
                    <i className={g.icon} style={{ fontSize: 20, width: 24, textAlign: "center", color: "var(--fg-muted)" }} />
                    <div style={{ flex: 1 }}><b style={{ fontSize: 12.5 }}>{g.name}</b></div>
                    <input type="checkbox" defaultChecked={g.connected} className="checkbox" />
                  </div>
                ))}
              </div>
            </>
          )}
          {step === 4 && (
            <>
              <h2>Invite your team</h2>
              <p className="intro">Assign initial roles — you can configure on-call schedules after.</p>
              <div className="stack stack-12">
                {USERS.slice(0, 4).map(u => (
                  <div key={u.id} className="row row-12" style={{ padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8 }}>
                    <Avatar name={u.name} color={u.color} />
                    <div style={{ flex: 1, minWidth: 0 }}><b style={{ fontSize: 13 }}>{u.name}</b><div style={{ fontSize: 11.5, color: "var(--fg-subtle)" }}>{u.email}</div></div>
                    <select className="select" style={{ width: 180 }} defaultValue={u.role}>
                      <option>Admin</option><option>Incident Commander</option><option>Responder</option><option>Manager</option><option>Viewer</option>
                    </select>
                  </div>
                ))}
                <button className="btn"><i className="fa-solid fa-plus" /> Invite by email</button>
              </div>
            </>
          )}
          {step === 5 && (
            <>
              <h2>Ready to provision</h2>
              <p className="intro">We'll spin up your workspace and apply inherited policies. This usually takes under 30 seconds.</p>
              <div className="stack stack-8">
                {[
                  ["Workspace", "Finspot Ventures · finspot-ventures.linkedeye.in · us-east-1"],
                  ["Identity", "Inherited from Finspot Holdings (Okta SSO)"],
                  ["Sources", "8 integrations to connect"],
                  ["Team", "4 users invited · 1 admin, 1 IC, 2 responders"],
                  ["Plan", "Business · $12/seat · inherited billing"],
                ].map(([k, v], i) => (
                  <div key={i} className="row row-12" style={{ padding: "10px 14px", border: "1px solid var(--border-subtle)", borderRadius: 6 }}>
                    <i className="fa-solid fa-check" style={{ color: "var(--success)" }} />
                    <div style={{ flex: 1 }}><b style={{ fontSize: 12 }}>{k}</b><div className="text-mute" style={{ fontSize: 11.5 }}>{v}</div></div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="wizard-foot">
          <button className="btn ghost" onClick={() => setRoute("admin-tenants")}>Cancel</button>
          <div className="row row-8">
            {step > 1 && <button className="btn" onClick={() => setStep(step - 1)}><i className="fa-solid fa-arrow-left" /> Back</button>}
            {step < 5 ? (
              <button className="btn primary" onClick={() => setStep(step + 1)}>Continue <i className="fa-solid fa-arrow-right" /></button>
            ) : (
              <button className="btn primary" onClick={() => setRoute("admin-tenants")}><i className="fa-solid fa-check" /> Provision workspace</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
