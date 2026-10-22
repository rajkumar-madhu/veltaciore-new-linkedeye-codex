# Veltacore PBAC policy.
# Input: { path, method, user, groups, tenant, resource: { assignee, owner, tenant } }
# Decision: data.veltacore.authz.allow (boolean)
#
# Authorization is evaluated at three levels, most specific last:
#   1. Group / role capability  (RBAC)   — what a role may do
#   2. Tenant guard              (isolation) — cross-tenant writes need admin
#   3. Personal / ownership      (ABAC)   — a user may always act on their own work
package veltacore.authz

import rego.v1

default allow := false

read_methods := {"GET", "HEAD", "OPTIONS"}
write_methods := {"POST", "PATCH", "PUT", "DELETE"}

allow if {
    grant
    not deny_cross_tenant
    not deny_lifecycle
}

# ── Group capabilities ───────────────────────────────────────────────────────
# admin: everything
grant if {
    "admin" in input.groups
}

# infra-admin: full infra + monitoring, read everything else
grant if {
    "infra-admin" in input.groups
    startswith(input.path, "/api/infra/")
}

grant if {
    "infra-admin" in input.groups
    input.method in read_methods
}

# noc-engineer: read all; ack/update alerts and incidents
grant if {
    "noc-engineer" in input.groups
    input.method in read_methods
}

grant if {
    "noc-engineer" in input.groups
    input.method in {"POST", "PATCH"}
    regex.match(`^/api/(infra/alerts|incidents)/`, input.path)
}

# noc-engineer may call the device lifecycle endpoint; which moves are allowed
# is decided by the action-level rule below (deny_lifecycle).
grant if {
    "noc-engineer" in input.groups
    input.method == "POST"
    regex.match(`^/api/infra/devices/[^/]+/transition/$`, input.path)
}

# service-desk-agent: read all; create/update ITSM records
grant if {
    "service-desk-agent" in input.groups
    input.method in read_methods
}

grant if {
    "service-desk-agent" in input.groups
    input.method in {"POST", "PATCH", "PUT"}
    regex.match(`^/api/(incidents|problems|changes|cmdb|knowledge)/`, input.path)
}

# viewer: read-only
grant if {
    "viewer" in input.groups
    input.method in read_methods
}

# ── Personal / ownership level (ABAC) ────────────────────────────────────────
# Any authenticated user may act on a record they personally own or are
# assigned to — the "personal level" scope — even without a broad role grant.
grant if {
    input.user != ""
    input.method in write_methods
    input.resource.assignee == input.user
}

grant if {
    input.user != ""
    input.method in write_methods
    input.resource.owner == input.user
}

# Every authenticated user may create and read their own work items.
grant if {
    input.user != ""
    input.method == "POST"
    regex.match(`^/api/(incidents|problems|changes)/records/`, input.path)
}

# Convenience: expose the effective level in the decision document for debugging.
level := "role" if grant_by_role
level := "personal" if {
    not grant_by_role
    grant
}

grant_by_role if {
    some g in {"admin", "infra-admin", "noc-engineer", "service-desk-agent", "viewer"}
    g in input.groups
}

# ── Tenant guard ─────────────────────────────────────────────────────────────
# A request without X-Tenant-ID spans every tenant (the API scopes it to all
# tenants), so both reads and writes across tenants require admin. Requests
# with a tenant are scoped to that tenant by the ORM (apps/tenants/context.py).
deny_cross_tenant if {
    no_tenant
    not "admin" in input.groups
}

# The API sends a missing tenant as JSON null; `not input.tenant` alone is
# false for null, so check absent, null and empty explicitly.
no_tenant if not input.tenant
no_tenant if input.tenant == null
no_tenant if input.tenant == ""

# ── Device lifecycle (action-level, from apps.infra.lifecycle) ───────────────
# input.resource = {action: "device.transition", from, to, tenant, device}
# Promoting a device to active or decommissioning it needs infra-admin/admin;
# a NOC engineer may only send a device for review.
deny_lifecycle if {
    input.resource.action == "device.transition"
    not lifecycle_allowed
}

lifecycle_allowed if "admin" in input.groups

lifecycle_allowed if "infra-admin" in input.groups

lifecycle_allowed if {
    "noc-engineer" in input.groups
    input.resource.to == "pending_review"
}
