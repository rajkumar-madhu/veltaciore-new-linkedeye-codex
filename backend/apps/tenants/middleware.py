"""Resolve the acting tenant from the X-Tenant-ID header.

Stored on request.tenant_id. The tenant *scope* that filters queries
(apps.tenants.context) is reset to "none" around every request and resolved
after authentication by TenantScopePermission, so no scope leaks between
requests and nothing is readable until the request has been authorized.
"""
from .context import ALL, reset_scope, set_scope


class TenantMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.tenant_id = request.headers.get("X-Tenant-ID") or None
        # Django admin is staff-only and works across tenants; API requests
        # start unscoped until TenantScopePermission resolves them.
        user = getattr(request, "user", None)
        start = ALL if request.path.startswith("/admin/") and getattr(user, "is_staff", False) else None
        token = set_scope(start)
        try:
            return self.get_response(request)
        finally:
            reset_scope(token)
