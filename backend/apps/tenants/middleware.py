"""Resolve the acting tenant from the X-Tenant-ID header.

Stored on request.tenant_id; viewsets use TenantScopedQuerysetMixin to filter.
"""


class TenantMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.tenant_id = request.headers.get("X-Tenant-ID") or None
        return self.get_response(request)
