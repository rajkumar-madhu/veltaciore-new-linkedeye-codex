"""Resolve the request's tenant scope after authentication (DRF permission).

Runs first in DEFAULT_PERMISSION_CLASSES, before OpaPermission:

* ``X-Tenant-ID: <id>`` → queries see that tenant's rows plus shared rows.
  An unknown tenant id is a 400, never an empty-but-successful response.
* no header → a cross-tenant request. The scope is set to all tenants and the
  decision is left to OPA (policy denies cross-tenant access to non-admins).
  With OPA unconfigured, it is allowed only when OPA_FAIL_OPEN is on (dev);
  otherwise the request is refused, so production fails closed.
"""
from django.conf import settings
from rest_framework import exceptions
from rest_framework.permissions import BasePermission

from .context import ALL, Scope, set_scope
from .models import Tenant


class TenantScopePermission(BasePermission):
    message = "X-Tenant-ID header required."

    def has_permission(self, request, view) -> bool:
        if getattr(view, "tenant_scope_exempt", False):
            # View reads no tenant-scoped data; leave the scope unset so any
            # accidental scoped query still raises.
            return True
        tenant_id = getattr(request, "tenant_id", None)
        if tenant_id:
            if not Tenant.objects.filter(pk=tenant_id).exists():
                raise exceptions.ValidationError({"detail": f"Unknown tenant '{tenant_id}'."})
            set_scope(Scope(tenant_id=tenant_id))
            return True
        if not settings.OPA_URL and not settings.OPA_FAIL_OPEN:
            return False
        set_scope(ALL)
        return True
