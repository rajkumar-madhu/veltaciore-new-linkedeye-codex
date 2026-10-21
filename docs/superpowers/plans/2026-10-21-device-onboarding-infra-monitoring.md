# Device Onboarding + Infra/Application Monitoring — implementation plan

Source: `LinkedEye_DeviceOnboarding_InfraMonitoring_ClaudeCode_Prompt.md` (R. Madhu).
Status: **approved — decisions recorded below; Phases 1–3 done.**

## What already exists (verified in the repo)

| Area | Where | State |
|---|---|---|
| Tenancy | `apps/tenants` — `Tenant`, `TenantScopedModel` (nullable FK), `TenantMiddleware` reads `X-Tenant-ID`, `TenantScopedQuerysetMixin` | Shared-DB multi-tenant. Filtering is **view-level only**, and when the header is missing **no filter is applied** (all tenants returned). |
| Devices | `apps/infra/models.py` — `InfraDevice`, `DeviceInterface`, `DeviceMetric`, `DeviceAlert`, `VirtualMachine`, `Exporter`, `BodCheck`, `TopologyConnection`; sites/racks in `apps/sites` | No lifecycle state, criticality tier or owning team. `Exporter` is a global catalog, not per-device registration. |
| Authorization | `apps/policy/permissions.py` (`OpaPermission`, posts path/method/user/groups/tenant/resource to OPA); Rego in `policy/veltacore/authz.rego` + tests | Works per request; no per-action / per-transition policies yet. Fails open when OPA is unreachable (`OPA_FAIL_OPEN`). |
| Audit | `apps/audit.AuditLog` | Request metadata only (user, method, path, status, ip). No entity before/after state; not append-only enforced. |
| Background jobs | `config/celery.py`, `apps/monitoring/tasks.py` (SNMP poll, node-exporter poll, blackbox probes) | No discovery sweep, no import processing. |
| API conventions | DRF, `django-filter`, `PageNumberPagination` page size 50 | Good base for server-side filtering. |
| Frontend | React + TS + Vite, TanStack Query (`src/api/hooks.ts`), Zustand (`src/store/ui.ts`), React Router, plain CSS (`styles.css`, `ld-*` LinkedEye block) + Font Awesome | Onboarding wizard simulates test-connection / discovery and pushes into seed data. **No Tailwind, no Lucide.** |

## Phases (models → API → Celery → frontend, one PR-sized commit each)

1. **Tenant isolation at the ORM layer** — a `TenantScopedManager`/queryset that refuses to run unscoped (raises unless a tenant or an explicit `.all_tenants()` is given), wired from the request via a context var set in `TenantMiddleware`. Missing `X-Tenant-ID` on a tenant-scoped endpoint → 400, not "all rows". Tests for cross-tenant leakage.
2. **Immutable entity audit** — `AuditEvent` (tenant, actor, action, entity type/id, before JSON, after JSON, ts, request id). Append-only: `save()` refuses updates, `delete()` raises, and a migration adds a Postgres trigger rejecting UPDATE/DELETE. Emitted as structured JSON logs so Filebeat → Loki picks them up (per spec: Loki, not ELK).
3. **Inventory model changes** — `InfraDevice.lifecycle_state` (`discovered → pending_review → active → decommissioned`), `criticality_tier`, `owning_team`, CIDR support for onboarding input. Transitions only through a service function that calls OPA (`resource={action:"device.transition", from, to}`) and writes an `AuditEvent`; the field is read-only in serializers.
4. **Onboarding APIs** — manual create (validated serializer), `test-connection`, bulk import: `ImportBatch` + `ImportRow` with a row-level validation report (`POST /imports/` → validate → `GET` report → `POST /imports/{id}/commit/`). Nothing commits until the user confirms.
5. **Auto-discovery** — `DiscoveryRun` + `DiscoveryCandidate`; Celery task sweeps a CIDR (ICMP + SNMP sysObjectID) and/or ingests agent-reported devices, creating **candidates only**. Approve / reject endpoints move a candidate into inventory as `pending_review` / `active` via the OPA-checked transition. Never auto-commits.
6. **Exporter registration + health** — `ExporterTarget` (tenant, device, exporter, enabled, last_scrape, scrape_errors, last_error). Enable/disable through OPA. Health pulled from the existing Prometheus `/api/v1/targets` by a Celery task — no new TSDB.
7. **Checks backends** for the new screens — `UrlCheck`, `TelnetCheck`, `DomainRecord` (tenant-scoped), executed by Celery (HTTP via `requests`, TCP connect for Telnet, DNS + TLS expiry for domains); results history so the screens can show real trends.
8. **OPA policies** — Rego rules + `opa test` cases for: `device.create`, `device.import.commit`, `device.transition`, `discovery.approve`, `exporter.toggle`, `check.write`; decisions keyed off Keycloak groups/claims and tenant.
9. **Frontend** — TanStack Query hooks per resource; the wizard calls the real test-connection / create endpoints; new screens for bulk import (upload → row report → commit) and the discovery review queue; device lifecycle actions; exporter enable/disable; URL / Telnet / Domains screens switch from `data/monitoring.ts` to their hooks. Device lists use server-side pagination + filters.

Each phase ships with Django tests (and `opa test` for policy) before the next starts.

## Conflicts between the spec and the repo / recent work

- **Visual direction.** The spec asks for the dark command-center theme (`#0a0e17`, green `#10b981`, DM Sans + JetBrains Mono). The screens just rebuilt on this branch follow the light, blue LinkedEye references (navy sidebar, white cards). One has to be chosen.
- **Tailwind + Lucide.** The spec makes these hard constraints; the frontend uses plain CSS + Font Awesome everywhere. Adopting them is a migration of every screen, not part of this module.
- **Logs.** The spec says query the existing Loki pipeline; `LogsScreen` currently has no Loki integration visible in the repo — the interface needs to be proposed, not assumed.
- **OPA fail-open.** Dev default fails open when OPA is down; for a SEBI CSCRF control the production setting should fail closed.

## Open decisions (from the spec's [FILL] list, plus the above)

1. Visual direction: keep the light LinkedEye look, or switch to the dark command-center theme?
2. Tailwind + Lucide: migrate, or keep the current CSS + Font Awesome?
3. Are Prometheus/Grafana and Loki already provisioned for this environment (URLs to target), or part of this task?
4. Existing SNMP/agent discovery mechanism in the fleet, if any, to reuse.
5. Client data from the trackers: seed client/site names into fixtures? (Credentials and passwords in the trackers are never copied into the repo.)
6. Confirm "auto-discovery never auto-commits" (human approval required).

## Decisions (2026-10-21)

1. Visual direction: keep the light LinkedEye style shown in the latest references (not the dark command-center theme).
2. Keep plain CSS (`ld-*`) + Font Awesome; no Tailwind / Lucide migration.
3. Trackers: client and site **names only** go into seed data — no IPs, URLs or credentials.
4. Prometheus / Grafana / Loki are provisioned (fs-le-dev-* endpoints, configured via settings); discovered devices always need human approval.
5. Order: backend phases 1–3, then the VM Details and switch device-detail screens, then onboarding / import / discovery.

## Progress

- **Phase 1 — done.** Tenant scope (`apps/tenants/context.py`) set per request by `TenantScopePermission`; `TenantScopedModel.objects` applies it when a query executes (fetch, count, exists, aggregate, update, delete, subquery) and raises with no scope. Unknown tenant → 400; no header → all-tenants scope that OPA restricts to admins (fails closed without OPA in production). Celery tasks and seed commands run under `system_task` / `all_tenants()`.
  - Fixed: the Rego cross-tenant guard used `not input.tenant`, which is false for JSON `null` — the value the API sends — so it never fired. Reads without a tenant now also require admin.
  - Open: `test_viewer_cannot_write` contradicts the "any authenticated user may create work items" rule; failing before this change, left for a product decision.
- **Phase 2 — done.** `AuditEvent` (append-only in the model, queryset and a DB trigger), `apps.audit.events.record()` / `snapshot()` (secret fields redacted) emitting JSON lines on `linkedeye.audit` for Filebeat → Loki, and read-only `GET /api/audit/events/`.
- **Phase 3 — done.** `InfraDevice.lifecycle_state` / `criticality_tier` / `owning_team`; `apps.infra.lifecycle.transition_device()` enforces the allowed edges, requires a reason to decommission or re-review, asks OPA (`resource.action = "device.transition"`) and saves state + audit event in one transaction. `POST /api/infra/devices/{id}/transition/`. Rego: infra-admin/admin may make any move; noc-engineer only to `pending_review`.
  - Assumption: existing devices migrate as `active`, `tier3`, no owning team.
  - Assumption: there is no per-user tenant-membership claim in the Keycloak token visible in the repo, so a valid `X-Tenant-ID` is trusted once OPA allows the request. Proposed: a `tenants` claim checked in Rego (`input.tenant in input.tenants`).
