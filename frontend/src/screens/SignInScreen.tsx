// Sign-in screen wired to Keycloak (src/auth/auth.ts). In dev (no Keycloak)
// any credentials sign you in as the dev identity; with Keycloak configured it
// performs a real OIDC password grant / SSO.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { useAuth, KEYCLOAK_ENABLED } from "@/auth/auth";

import { Icon } from "@/components/Icon";
import { ArrowRightIcon, FlaskConicalIcon, KeyRoundIcon, LoaderCircleIcon, TriangleAlertIcon } from "lucide-react";
const SUB = "text-sm text-fg-subtle mb-7";

export default function SignInScreen() {
  const { setRoute } = useNav();
  const login = useAuth((s) => s.login);
  const error = useAuth((s) => s.error);
  const [username, setUsername] = React.useState("priya");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setBusy(true);
    const ok = await login(username.trim(), password);
    setBusy(false);
    if (ok) setRoute("dashboard");
  };

  const field: React.CSSProperties = {
    width: "100%", height: 42, padding: "0 12px", borderRadius: 8,
    border: "1px solid var(--border)", background: "var(--bg-raised)",
    fontSize: 13.5, outline: "none", marginTop: 6,
  };
  const label: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "var(--fg-muted)" };

  return (
    <div className="min-h-screen grid grid-cols-[1fr_1.2fr] bg-bg">
      <div className="relative overflow-hidden flex flex-col p-12 text-white bg-[linear-gradient(135deg,#0a1433_0%,#17254d_60%,#1e2f5c_100%)] before:content-[''] before:absolute before:-inset-1/2 before:pointer-events-none before:bg-[radial-gradient(circle_at_30%_40%,rgba(59,130,246,0.3),transparent_50%),radial-gradient(circle_at_70%_70%,rgba(139,92,246,0.2),transparent_50%)]">
        <div className="flex items-center gap-2.5 text-md font-semibold relative z-[1]">
          <div className="w-8 h-8 rounded-[8px] bg-[linear-gradient(135deg,var(--blue-500),var(--purple-500))] grid place-items-center [box-shadow:0_4px_16px_rgba(59,130,246,0.4)] text-white">A</div>
          <div><b>Argus-LinkedEye</b><span>Monitoring</span></div>
        </div>
        <div className="mt-auto relative z-[1] max-w-[480px]">
          <h2 className="text-[36px] leading-[1.15] tracking-[-0.025em] font-bold mb-3.5">Multi-tenant <span className="bg-[linear-gradient(90deg,#5eead4,#6ee7b7)] bg-clip-text text-transparent">observability</span> &amp; ITSM for broker infrastructure.</h2>
          <p className="text-lg leading-[1.6] text-white/[.72] opacity-80 mb-7">Single sign-on via Keycloak, LDAP-backed identity, and policy-based access control (OPA) — scoped by tenant and by you.</p>
          <div className="flex gap-8 pt-6 border-t border-white/[.12] [&>div]:flex-1 [&_b]:block [&_b]:text-4xl [&_b]:font-semibold [&_b]:tracking-[-0.02em] [&_b]:mb-1 [&_span]:text-[11.5px] [&_span]:text-white/[.55] [&_span]:uppercase [&_span]:tracking-[0.05em]">
            <div><b>6</b><span>Broker tenants</span></div>
            <div><b>1,599</b><span>Assets monitored</span></div>
            <div><b>99.95%</b><span>Platform uptime</span></div>
          </div>
        </div>
      </div>

      <div className="py-12 px-16 flex flex-col justify-center items-stretch gap-3.5 mb-5">
        <form className="max-w-[400px] w-full mx-auto" onSubmit={submit}>
          <h1 className="text-4xl font-semibold tracking-[-0.02em] mb-1.5">Sign in</h1>
          <p className={SUB}>Access the Finspot Technology Solutions monitoring platform.</p>

          <button type="button" className="w-full h-[42px] p-[11px] border border-[#d2d6dc] rounded-[6px] bg-white flex items-center justify-center gap-2 text-sm font-medium mb-2.5 cursor-pointer [transition:all_.12s] hover:bg-bg-hover hover:border-[#016] [&_.ld-icon]:text-md [&_.ld-icon]:w-5 [&_.ld-icon]:text-center" onClick={() => submit()}>
            <Icon icon={KeyRoundIcon} /> Continue with Keycloak SSO
          </button>
          <div className="flex items-center gap-3 my-5 text-fg-subtle text-2xs uppercase tracking-[0.1em] before:content-[''] before:flex-1 before:h-px before:bg-line after:content-[''] after:flex-1 after:h-px after:bg-line">or with directory credentials</div>

          <label style={label}>Username
            <input style={field} value={username} onChange={(e) => setUsername(e.target.value)} autoFocus placeholder="you@finspot.in" />
          </label>
          <div style={{ height: 14 }} />
          <label style={label}>Password
            <input style={field} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={KEYCLOAK_ENABLED ? "••••••••" : "any value (dev)"} />
          </label>

          {error && (
            <div style={{ color: "var(--critical)", fontSize: 12.5, marginTop: 12 }}>
              <Icon icon={TriangleAlertIcon} /> {error}
            </div>
          )}

          <button type="submit" className="inline-flex items-center gap-[5px] py-[5px] px-3 [background:var(--brand-grad)] border border-transparent text-white text-xs font-medium rounded-[3px] cursor-pointer whitespace-nowrap [transition:all_.12s] hover:brightness-[1.07] disabled:opacity-50 disabled:cursor-not-allowed" style={{ width: "100%", height: 44, marginTop: 20, justifyContent: "center", fontSize: 14 }} disabled={busy}>
            {busy ? <><Icon icon={LoaderCircleIcon} spin /> Signing in…</> : <>Sign in <Icon icon={ArrowRightIcon} /></>}
          </button>

          {!KEYCLOAK_ENABLED && (
            <p className={SUB} style={{ marginTop: 16, fontSize: 11.5 }}>
              <Icon icon={FlaskConicalIcon} /> Dev mode — Keycloak not configured; any credentials sign you in as the demo identity.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
