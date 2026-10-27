// Sign-in screen wired to Keycloak (src/auth/auth.ts). In dev (no Keycloak)
// any credentials sign you in as the dev identity; with Keycloak configured it
// performs a real OIDC password grant / SSO.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { useAuth, KEYCLOAK_ENABLED } from "@/auth/auth";

import { Icon } from "@/components/Icon";
import { ArrowRightIcon, FlaskConicalIcon, KeyRoundIcon, LoaderCircleIcon, TriangleAlertIcon } from "lucide-react";
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
    <div className="auth">
      <div className="auth-side">
        <div className="auth-logo">
          <div className="logo-mark">A</div>
          <div><b>Argus-LinkedEye</b><span>Monitoring</span></div>
        </div>
        <div className="auth-pitch">
          <h2>Multi-tenant <span className="highlight">observability</span> &amp; ITSM for broker infrastructure.</h2>
          <p>Single sign-on via Keycloak, LDAP-backed identity, and policy-based access control (OPA) — scoped by tenant and by you.</p>
          <div className="auth-stats">
            <div><b>6</b><span>Broker tenants</span></div>
            <div><b>1,599</b><span>Assets monitored</span></div>
            <div><b>99.95%</b><span>Platform uptime</span></div>
          </div>
        </div>
      </div>

      <div className="auth-form">
        <form className="auth-form-inner" onSubmit={submit}>
          <h1>Sign in</h1>
          <p className="sub">Access the Finspot Technology Solutions monitoring platform.</p>

          <button type="button" className="sso-btn" onClick={() => submit()}>
            <Icon icon={KeyRoundIcon} /> Continue with Keycloak SSO
          </button>
          <div className="auth-divider">or with directory credentials</div>

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

          <button type="submit" className="sn-btn primary" style={{ width: "100%", height: 44, marginTop: 20, justifyContent: "center", fontSize: 14 }} disabled={busy}>
            {busy ? <><Icon icon={LoaderCircleIcon} spin /> Signing in…</> : <>Sign in <Icon icon={ArrowRightIcon} /></>}
          </button>

          {!KEYCLOAK_ENABLED && (
            <p className="sub" style={{ marginTop: 16, fontSize: 11.5 }}>
              <Icon icon={FlaskConicalIcon} /> Dev mode — Keycloak not configured; any credentials sign you in as the demo identity.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
