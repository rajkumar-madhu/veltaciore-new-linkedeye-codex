# Security — Identity & Authorization

The platform separates **who you are** (authentication / identity) from **what
you may do** (authorization), and enforces authorization at three levels.

## Identity — Keycloak SSO, LDAP-backed

- **Keycloak** (realm `veltacore`) issues OIDC/JWT access tokens (RS256).
- User accounts live in **OpenLDAP** (`dc=finspot,dc=in`); Keycloak federates
  them via an **LDAP user-storage provider** (read-only, import-on-demand). See
  `deploy/keycloak/veltacore-realm.json` and the `ldap` service in
  `docker-compose.yml`.
- The API verifies tokens against the realm JWKS
  (`apps/accounts/authentication.py`). `KeycloakUser` carries the token claims:
  `preferred_username`, `email`, and `groups` (from the `groups` claim, falling
  back to `realm_access.roles`).
- **Dev mode**: with `KEYCLOAK_SERVER_URL` unset, bearer tokens are ignored and
  requests run as `AnonymousUser` so the API stays exercisable locally.

Realm roles / groups: `admin`, `infra-admin`, `noc-engineer`,
`service-desk-agent`, `viewer`.

## Authorization — OPA PBAC (three levels)

Every request is authorized by **Open Policy Agent** against
`backend/policy/veltacore/authz.rego`. `OpaPermission`
(`apps/policy/permissions.py`) POSTs the decision input to
`OPA_URL`; the policy returns `allow`.

Input:
```json
{ "path": "/api/incidents/records/INC-1/", "method": "PATCH",
  "user": "priya", "groups": ["service-desk-agent"], "tenant": "fyers",
  "resource": { "assignee": "priya", "owner": "priya", "tenant": "fyers" } }
```

1. **Role capability (RBAC)** — what a role may do. e.g. `noc-engineer` may
   PATCH `/api/infra/alerts/` and `/api/incidents/`; `viewer` is read-only;
   `admin` may do anything.
2. **Tenant isolation** — cross-tenant writes (no `X-Tenant-ID`) require
   `admin` (`deny_cross_tenant`). Read scoping is also enforced in the ORM via
   `TenantScopedQuerysetMixin`.
3. **Personal / ownership (ABAC)** — the *personal level*: any authenticated
   user may write a record they **own or are assigned to**
   (`input.resource.assignee == input.user`), and may create their own work
   items — regardless of role. Resolved in `has_object_permission`, which
   surfaces the record's `assignee`/`owner`/`tenant` to the policy.

`data.veltacore.authz.level` reports whether a grant came from `"role"` or
`"personal"`, for debugging.

- **Dev mode**: with `OPA_URL` unset, `OPA_FAIL_OPEN=1` (default when
  `DJANGO_DEBUG`) allows all so the API is usable without OPA running.

### Testing the policy
```bash
opa test backend/policy            # unit tests in authz_test.rego
opa eval -d backend/policy -i input.json 'data.veltacore.authz.allow'
```

## Bringing the full stack up
```bash
docker compose up            # postgres, redis, ldap, keycloak(+realm import), opa, api
```
The API container is configured with `KEYCLOAK_SERVER_URL=http://keycloak:8080`
and `OPA_URL=http://opa:8181/v1/data/veltacore/authz/allow`, so both
authentication and authorization are enforced end-to-end.
