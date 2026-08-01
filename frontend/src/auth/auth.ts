// Keycloak identity for the SPA.
//
// When VITE_KEYCLOAK_URL is set, `login` performs an OIDC password grant
// against the realm token endpoint, stores the access/refresh tokens, and
// schedules a silent refresh. The access token is attached as a Bearer header
// by the API client. When Keycloak is not configured (local dev) a fixed dev
// identity is used so the app stays exercisable and role-aware.
import { create } from "zustand";

const URL = import.meta.env.VITE_KEYCLOAK_URL ?? "";
const REALM = import.meta.env.VITE_KEYCLOAK_REALM ?? "veltacore";
const CLIENT = import.meta.env.VITE_KEYCLOAK_CLIENT ?? "veltacore-api";
export const KEYCLOAK_ENABLED = !!URL;

export interface Identity {
  username: string;
  name: string;
  email: string;
  roles: string[];
}

// Roles that may write (mirrors the OPA rego RBAC grants). A viewer is
// read-only; the personal/ownership grant is enforced server-side.
export const WRITER_ROLES = ["admin", "infra-admin", "noc-engineer", "service-desk-agent"];
export const canWriteRoles = (roles: string[]) => roles.some((r) => WRITER_ROLES.includes(r));

// Dev identities — signing in with one of these usernames (any password)
// exercises the different PBAC roles locally without Keycloak. Mirrors the
// realm users/groups in deploy/keycloak/veltacore-realm.json.
const DEV_USERS: Record<string, Identity> = {
  priya:    { username: "priya",    name: "Priya Raghunathan", email: "priya.r@finspot.in",   roles: ["service-desk-agent", "noc-engineer"] },
  admin:    { username: "admin",    name: "Platform Admin",    email: "admin@finspot.in",      roles: ["admin"] },
  siva:     { username: "siva",     name: "Siva Kumar",        email: "siva.k@finspot.in",     roles: ["noc-engineer"] },
  rajkumar: { username: "rajkumar", name: "Rajkumar M",        email: "rajkumar.m@finspot.in", roles: ["infra-admin"] },
  vic:      { username: "vic",      name: "Vikram Rao",        email: "vikram.r@finspot.in",   roles: ["viewer"] },
};

// Default dev identity (no Keycloak): a service-desk agent who is also NOC on-call.
const DEV_IDENTITY: Identity = DEV_USERS.priya;

interface JwtClaims {
  preferred_username?: string;
  name?: string;
  email?: string;
  groups?: string[];
  realm_access?: { roles?: string[] };
  exp?: number;
}

function decodeJwt(token: string): JwtClaims | null {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as JwtClaims;
  } catch {
    return null;
  }
}

function identityFrom(claims: JwtClaims): Identity {
  return {
    username: claims.preferred_username ?? "",
    name: claims.name ?? claims.preferred_username ?? "",
    email: claims.email ?? "",
    roles: claims.groups ?? claims.realm_access?.roles ?? [],
  };
}

interface AuthState {
  token: string | null;
  identity: Identity;
  authenticated: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  hasRole: (role: string) => boolean;
}

let refreshToken: string | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

export const useAuth = create<AuthState>((set, get) => ({
  // Without Keycloak we present the dev identity so the UI is role-aware.
  token: null,
  identity: DEV_IDENTITY,
  authenticated: !KEYCLOAK_ENABLED,
  error: null,

  login: async (username, password) => {
    if (!KEYCLOAK_ENABLED) {
      const identity = DEV_USERS[username] ?? { ...DEV_IDENTITY, username, roles: ["viewer"] };
      set({ authenticated: true, identity });
      return true;
    }
    try {
      const body = new URLSearchParams({
        grant_type: "password",
        client_id: CLIENT,
        username,
        password,
      });
      const res = await fetch(`${URL.replace(/\/$/, "")}/realms/${REALM}/protocol/openid-connect/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      if (!res.ok) {
        set({ error: `Sign-in failed (${res.status})` });
        return false;
      }
      const data = (await res.json()) as { access_token: string; refresh_token?: string; expires_in?: number };
      const claims = decodeJwt(data.access_token);
      if (!claims) {
        set({ error: "Malformed token" });
        return false;
      }
      refreshToken = data.refresh_token ?? null;
      if (refreshTimer) clearTimeout(refreshTimer);
      if (data.expires_in) {
        refreshTimer = setTimeout(() => void silentRefresh(set), Math.max(5, data.expires_in - 30) * 1000);
      }
      set({ token: data.access_token, identity: identityFrom(claims), authenticated: true, error: null });
      return true;
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Sign-in error" });
      return false;
    }
  },

  logout: () => {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshToken = null;
    set({ token: null, authenticated: !KEYCLOAK_ENABLED, identity: DEV_IDENTITY });
  },

  hasRole: (role) => get().identity.roles.includes(role),
}));

async function silentRefresh(set: (partial: Partial<AuthState>) => void) {
  if (!refreshToken) return;
  try {
    const body = new URLSearchParams({ grant_type: "refresh_token", client_id: CLIENT, refresh_token: refreshToken });
    const res = await fetch(`${URL.replace(/\/$/, "")}/realms/${REALM}/protocol/openid-connect/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) return;
    const data = (await res.json()) as { access_token: string; refresh_token?: string; expires_in?: number };
    const claims = decodeJwt(data.access_token);
    refreshToken = data.refresh_token ?? refreshToken;
    if (refreshTimer) clearTimeout(refreshTimer);
    if (data.expires_in) refreshTimer = setTimeout(() => void silentRefresh(set), Math.max(5, data.expires_in - 30) * 1000);
    set({ token: data.access_token, ...(claims ? { identity: identityFrom(claims) } : {}) });
  } catch {
    /* keep existing token until it expires */
  }
}

/** Current access token for the API client (null in dev / when signed out). */
export const getAccessToken = () => useAuth.getState().token;

/**
 * Client-side PBAC selector: true when the signed-in identity holds a writer
 * role. The UI uses this to hide/disable write actions (New Incident, state
 * advance, resolve). This is a UX affordance only — the authoritative check is
 * server-side in the OPA rego (RBAC + tenant + personal/ownership ABAC).
 */
export const useCanWrite = () => useAuth((s) => canWriteRoles(s.identity.roles));
