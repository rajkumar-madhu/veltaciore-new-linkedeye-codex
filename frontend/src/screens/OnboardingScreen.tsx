// Tenant onboarding wizard
// Ported from screens/onboarding.jsx. Rendered without app chrome.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { ORG, USERS, INTEGRATIONS } from "@/data/core";
import { Avatar, Pill } from "@/components/primitives";

import { Icon } from "@/components/Icon";
import { cx } from "@/components/ui";
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, KeyRoundIcon, LayoutGridIcon, PlusIcon, ShieldIcon } from "lucide-react";
// Shared pieces of the prototype wizard styling.
const FIELD = "flex flex-col gap-[5px] mb-3.5 [&>label]:text-xs [&>label]:font-[550] [&>label]:text-fg";
const CONTROL = "w-full py-2 px-3 border border-line rounded-[6px] bg-bg-raised text-sm text-fg [transition:all_.12s] focus:[outline:none] focus:border-accent focus:[box-shadow:0_0_0_3px_rgba(37,99,235,0.12)]";
// chevron drawn in the background (was the prototype .select)
const SELECT = "w-full h-8 pr-7 pl-2.5 py-0 border border-line rounded-[5px] [background:var(--bg-card)_url(data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2210%22%20height=%2210%22%20viewBox=%220%200%2010%2010%22%3E%3Cpath%20d=%22M2%204l3%203%203-3%22%20stroke=%22%23999%22%20fill=%22none%22%20stroke-width=%221.4%22/%3E%3C/svg%3E)_no-repeat_right_8px_center] text-[12.5px] text-fg appearance-none [transition:all_.12s] focus:[outline:none] focus:border-accent focus:[box-shadow:0_0_0_3px_rgba(37,99,235,0.12)] focus:[outline-color:var(--heal-emerald)]";
const CHECK = "w-3.5 h-3.5 [accent-color:var(--accent)] cursor-pointer align-middle";
const MUTE = "text-fg-subtle";
const BTN = "inline-flex items-center gap-1.5 h-8 py-1.5 px-3 text-[12.5px] font-medium tracking-[-0.005em] rounded-[5px] border whitespace-nowrap cursor-pointer [transition:all_.12s]";
const BTN_DEFAULT = cx(BTN, "border-line-strong bg-bg-raised text-fg hover:bg-bg-muted hover:border-fg-faint");
const BTN_GHOST = cx(BTN, "bg-transparent border-transparent text-fg-muted hover:bg-bg-muted hover:text-fg");
const BTN_PRIMARY = cx(BTN, "!border-transparent !text-white ![background:var(--brand-grad)] [box-shadow:0_1px_2px_rgba(37,99,235,0.3)] hover:brightness-105");
const INTRO = "text-fg-subtle mb-6 text-[13.5px]";
const ROW = "flex items-center gap-3";

export default function OnboardingScreen() {
  const { setRoute } = useNav();
  const [step, setStep] = React.useState(1);
  const steps = ["Workspace", "Identity", "Services", "Team", "Review"];
  return (
    <div className="!pt-6 !px-7 !pb-10 max-w-[1600px] !opacity-100">
      <div className="max-w-[720px] my-10 mx-auto bg-bg-raised border border-line rounded-[14px] overflow-hidden [box-shadow:var(--shadow-md)]">
        <div className="grid grid-cols-[repeat(5,1fr)] pt-4.5 px-6 pb-3.5 border-b border-line gap-1 bg-bg-muted">
          {steps.map((s, i) => {
            const n = i + 1;
            const done = n < step, active = n === step;
            return (
              <div key={i} className="flex items-center gap-2.5 relative">
                <div className={cx(
                  "w-[22px] h-[22px] rounded-[50%] border-[1.5px] text-2xs font-semibold grid place-items-center shrink-0",
                  done ? "bg-success border-success text-white"
                    : active ? "bg-accent border-accent text-white [box-shadow:0_0_0_4px_rgba(37,99,235,0.15)]"
                    : "bg-bg-raised border-line-strong text-fg-subtle",
                )}>{done ? <Icon icon={CheckIcon} strokeWidth={3} /> : <i>{n}</i>}</div>
                <div className={cx("text-[11.5px]", active ? "text-fg font-semibold" : done ? "text-fg font-medium" : "text-fg-subtle font-medium")}>{s}</div>
              </div>
            );
          })}
        </div>
        <div className="p-8 min-h-[360px] [&>h2]:text-3xl [&>h2]:font-semibold [&>h2]:tracking-[-0.02em] [&>h2]:mb-1">
          {step === 1 && (
            <>
              <h2>Name your workspace</h2>
              <p className={INTRO}>A workspace is a sub-tenant under <b>{ORG.name}</b>. You can move teams and users between workspaces anytime.</p>
              <div className={FIELD}><label>Workspace name</label><input className={CONTROL} defaultValue="Finspot Ventures" /></div>
              <div className="grid grid-cols-[1fr_1fr] gap-4">
                <div className={FIELD}><label>URL slug</label>
                  <div className="flex items-center gap-2" style={{ border: "1px solid var(--border)", borderRadius: 6, padding: "0 10px", background: "var(--bg-raised)" }}>
                    <input defaultValue="finspot-ventures" style={{ border: "none", outline: "none", padding: "8px 0", background: "transparent", flex: 1 }} />
                    <span className={MUTE} style={{ fontSize: 12 }}>.linkedeye.in</span>
                  </div>
                </div>
                <div className={FIELD}><label>Region</label>
                  <select className={SELECT} defaultValue="us-east-1"><option>us-east-1 (N. Virginia)</option><option>us-west-2 (Oregon)</option><option>eu-west-1 (Ireland)</option><option>ap-southeast-1 (Singapore)</option></select>
                </div>
              </div>
              <div className={FIELD}><label>Parent organization</label>
                <div className={ROW} style={{ padding: "10px 12px", background: "var(--bg-muted)", borderRadius: 8 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 7, background: "linear-gradient(135deg,#0f1c3f,#2563eb)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 12 }}>M</div>
                  <div style={{ flex: 1 }}><b>{ORG.name}</b><div className={MUTE} style={{ fontSize: 11.5 }}>Enterprise Plus · 6 business units</div></div>
                  <Pill kind="success">Inherited SSO, billing</Pill>
                </div>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <h2>Connect identity</h2>
              <p className={INTRO}>Argus-LinkedEye inherits SSO from {ORG.name}. You can override per-workspace.</p>
              <div className="flex flex-col gap-3">
                <div className={ROW} style={{ padding: 14, border: "1px solid var(--accent)", background: "var(--blue-50)", borderRadius: 10 }}>
                  <Icon icon={ShieldIcon} style={{ fontSize: 22, color: "var(--accent)" }} />
                  <div style={{ flex: 1 }}><b>Use parent SSO (Okta)</b><div className={MUTE} style={{ fontSize: 11.5 }}>Users from finspot.okta.com → this workspace</div></div>
                  <input type="radio" defaultChecked className={CHECK} />
                </div>
                <div className={ROW} style={{ padding: 14, border: "1px solid var(--border)", borderRadius: 10 }}>
                  <Icon icon={LayoutGridIcon} style={{ fontSize: 22, color: "#00a4ef" }} />
                  <div style={{ flex: 1 }}><b>Entra ID / Azure AD</b><div className={MUTE} style={{ fontSize: 11.5 }}>Configure separately</div></div>
                  <input type="radio" className={CHECK} />
                </div>
                <div className={ROW} style={{ padding: 14, border: "1px solid var(--border)", borderRadius: 10 }}>
                  <Icon icon={KeyRoundIcon} style={{ fontSize: 22, color: "var(--fg-muted)" }} />
                  <div style={{ flex: 1 }}><b>Custom SAML</b><div className={MUTE} style={{ fontSize: 11.5 }}>Upload metadata XML</div></div>
                  <input type="radio" className={CHECK} />
                </div>
              </div>
              <div className={FIELD} style={{ marginTop: 16 }}>
                <label>Allowed email domains</label>
                <input className={CONTROL} defaultValue="finspot.io, finspot-ventures.com" />
                <span className="text-[11.5px] text-fg-subtle">Users with these domains are auto-provisioned</span>
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <h2>Connect signal sources</h2>
              <p className={INTRO}>Pick what to watch. You can add more later.</p>
              <div className="grid grid-cols-[repeat(3,1fr)] gap-4">
                {INTEGRATIONS.map(g => (
                  <div key={g.name} className={ROW} style={{ padding: 14, border: "1px solid var(--border)", borderRadius: 10, cursor: "pointer" }}>
                    <Icon className={g.icon} style={{ fontSize: 20, width: 24, textAlign: "center", color: "var(--fg-muted)" }} />
                    <div style={{ flex: 1 }}><b style={{ fontSize: 12.5 }}>{g.name}</b></div>
                    <input type="checkbox" defaultChecked={g.connected} className={CHECK} />
                  </div>
                ))}
              </div>
            </>
          )}
          {step === 4 && (
            <>
              <h2>Invite your team</h2>
              <p className={INTRO}>Assign initial roles — you can configure on-call schedules after.</p>
              <div className="flex flex-col gap-3">
                {USERS.slice(0, 4).map(u => (
                  <div key={u.id} className={ROW} style={{ padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8 }}>
                    <Avatar name={u.name} color={u.color} />
                    <div style={{ flex: 1, minWidth: 0 }}><b style={{ fontSize: 13 }}>{u.name}</b><div style={{ fontSize: 11.5, color: "var(--fg-subtle)" }}>{u.email}</div></div>
                    <select className={SELECT} style={{ width: 180 }} defaultValue={u.role}>
                      <option>Admin</option><option>Incident Commander</option><option>Responder</option><option>Manager</option><option>Viewer</option>
                    </select>
                  </div>
                ))}
                <button className={BTN_DEFAULT}><Icon icon={PlusIcon} /> Invite by email</button>
              </div>
            </>
          )}
          {step === 5 && (
            <>
              <h2>Ready to provision</h2>
              <p className={INTRO}>We'll spin up your workspace and apply inherited policies. This usually takes under 30 seconds.</p>
              <div className="flex flex-col gap-2">
                {[
                  ["Workspace", "Finspot Ventures · finspot-ventures.linkedeye.in · us-east-1"],
                  ["Identity", "Inherited from Finspot Holdings (Okta SSO)"],
                  ["Sources", "8 integrations to connect"],
                  ["Team", "4 users invited · 1 admin, 1 IC, 2 responders"],
                  ["Plan", "Business · $12/seat · inherited billing"],
                ].map(([k, v], i) => (
                  <div key={i} className={ROW} style={{ padding: "10px 14px", border: "1px solid var(--border-subtle)", borderRadius: 6 }}>
                    <Icon icon={CheckIcon} style={{ color: "var(--success)" }} />
                    <div style={{ flex: 1 }}><b style={{ fontSize: 12 }}>{k}</b><div className={MUTE} style={{ fontSize: 11.5 }}>{v}</div></div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="py-4 px-6 border-t border-line flex justify-between items-center bg-bg-muted">
          <button className={BTN_GHOST} onClick={() => setRoute("admin-tenants")}>Cancel</button>
          <div className="flex items-center gap-2">
            {step > 1 && <button className={BTN_DEFAULT} onClick={() => setStep(step - 1)}><Icon icon={ArrowLeftIcon} /> Back</button>}
            {step < 5 ? (
              <button className={BTN_PRIMARY} onClick={() => setStep(step + 1)}>Continue <Icon icon={ArrowRightIcon} /></button>
            ) : (
              <button className={BTN_PRIMARY} onClick={() => setRoute("admin-tenants")}><Icon icon={CheckIcon} /> Provision workspace</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
