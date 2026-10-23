// Thin API client for the Django/DRF backend.
// All endpoints are tenant-scoped via the X-Tenant-ID header, and carry the
// Keycloak access token (Bearer) when the user is signed in.
import { useUiStore } from "@/store/ui";
import { getAccessToken } from "@/auth/auth";

const BASE = import.meta.env.VITE_API_BASE ?? "/api";

/** Common headers: tenant scope + optional Keycloak bearer token. */
function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const tenant = useUiStore.getState().tenant;
  const token = getAccessToken();
  return {
    Accept: "application/json",
    "X-Tenant-ID": tenant.id,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export async function apiGet<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(BASE + path, window.location.origin);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url.toString(), { headers: authHeaders() });
  if (!res.ok) throw new ApiError(res.status, `${res.status} ${res.statusText} for ${path}`);
  return res.json() as Promise<T>;
}

/**
 * GET every page of a DRF list (page / page_size), up to `maxPages` pages (4,000 rows at the default 50), so
 * screens that summarise a collection (alert console, header bell) see all of
 * it rather than the first page. Plain-array responses are returned as is.
 */
export async function apiGetAllPages<T>(path: string, params: Record<string, string> = {}, pageSize = 200, maxPages = 80): Promise<T[]> {
  const out: T[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const data = await apiGet<Paginated<T> | T[]>(path, { ...params, page: String(page), page_size: String(pageSize) });
    if (Array.isArray(data)) return data;
    out.push(...data.results);
    if (!data.next) break;
  }
  return out;
}

/**
 * GET across all clients: sends no X-Tenant-ID, so the API applies the
 * all-tenants scope and the policy allows it for admins only.
 */
export async function apiGetAllClients<T>(path: string): Promise<T> {
  const headers = authHeaders();
  delete headers["X-Tenant-ID"];
  const res = await fetch(new URL(BASE + path, window.location.origin).toString(), { headers });
  if (!res.ok) throw new ApiError(res.status, `${res.status} ${res.statusText} for ${path}`);
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new ApiError(res.status, `${res.status} ${res.statusText} for ${path}`);
  return res.json() as Promise<T>;
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(BASE + path, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new ApiError(res.status, `${res.status} ${res.statusText} for ${path}`);
  return res.json() as Promise<T>;
}

/** Unwrap DRF pagination when present; tolerate plain arrays. */
export function unwrap<T>(data: Paginated<T> | T[]): T[] {
  return Array.isArray(data) ? data : data.results;
}
