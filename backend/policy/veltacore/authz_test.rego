# Unit tests for the Veltacore PBAC policy. Run with: opa test backend/policy
package veltacore.authz_test

import data.veltacore.authz
import rego.v1

# ── RBAC ─────────────────────────────────────────────────────────────────────
test_admin_can_write_anything if {
    authz.allow with input as {"path": "/api/incidents/records/", "method": "POST", "user": "admin", "groups": ["admin"], "tenant": "fyers"}
}

test_viewer_cannot_write if {
    not authz.allow with input as {"path": "/api/incidents/records/", "method": "POST", "user": "vic", "groups": ["viewer"], "tenant": "fyers"}
}

test_viewer_can_read if {
    authz.allow with input as {"path": "/api/incidents/records/", "method": "GET", "user": "vic", "groups": ["viewer"], "tenant": "fyers"}
}

test_noc_can_patch_alerts if {
    authz.allow with input as {"path": "/api/infra/alerts/1/", "method": "PATCH", "user": "noc", "groups": ["noc-engineer"], "tenant": "fyers"}
}

test_noc_cannot_patch_changes if {
    not authz.allow with input as {"path": "/api/changes/records/1/", "method": "PATCH", "user": "noc", "groups": ["noc-engineer"], "tenant": "fyers"}
}

test_service_desk_can_create_problem if {
    authz.allow with input as {"path": "/api/problems/records/", "method": "POST", "user": "sd", "groups": ["service-desk-agent"], "tenant": "fyers"}
}

# ── Tenant guard ─────────────────────────────────────────────────────────────
test_cross_tenant_write_denied_for_non_admin if {
    not authz.allow with input as {"path": "/api/incidents/records/1/", "method": "PATCH", "user": "sd", "groups": ["service-desk-agent"], "tenant": null}
}

test_cross_tenant_write_allowed_for_admin if {
    authz.allow with input as {"path": "/api/incidents/records/1/", "method": "PATCH", "user": "admin", "groups": ["admin"], "tenant": null}
}

# ── Personal / ownership (ABAC) ──────────────────────────────────────────────
test_owner_can_update_own_record_without_role if {
    authz.allow with input as {
        "path": "/api/incidents/records/INC-1/", "method": "PATCH",
        "user": "priya", "groups": [], "tenant": "fyers",
        "resource": {"assignee": "priya"},
    }
}

test_non_owner_without_role_cannot_update if {
    not authz.allow with input as {
        "path": "/api/incidents/records/INC-1/", "method": "PATCH",
        "user": "marcus", "groups": [], "tenant": "fyers",
        "resource": {"assignee": "priya"},
    }
}

test_level_is_personal_for_owner_only if {
    authz.level == "personal" with input as {
        "path": "/api/incidents/records/INC-1/", "method": "PATCH",
        "user": "priya", "groups": [], "tenant": "fyers",
        "resource": {"assignee": "priya"},
    }
}

test_cross_tenant_read_denied_for_non_admin if {
    not authz.allow with input as {"path": "/api/incidents/records/", "method": "GET", "user": "v", "groups": ["viewer"], "tenant": null, "resource": {}}
}

test_cross_tenant_read_allowed_for_admin if {
    authz.allow with input as {"path": "/api/incidents/records/", "method": "GET", "user": "a", "groups": ["admin"], "tenant": null, "resource": {}}
}

test_tenant_scoped_read_allowed_for_viewer if {
    authz.allow with input as {"path": "/api/incidents/records/", "method": "GET", "user": "v", "groups": ["viewer"], "tenant": "fyers", "resource": {}}
}
