"""OPA policy-based access control for DRF.

POSTs {input: {path, method, user, groups, tenant}} to OPA_URL and allows the
request when the policy returns true. When OPA is not configured, dev mode
fails open (configurable via OPA_FAIL_OPEN).
"""
from __future__ import annotations

import logging

import requests
from django.conf import settings
from rest_framework.permissions import BasePermission

log = logging.getLogger(__name__)


class OpaPermission(BasePermission):
    message = "Denied by policy."

    def _input(self, request, resource=None) -> dict:
        return {
            "path": request.path,
            "method": request.method,
            "user": getattr(request.user, "username", "") or "",
            "groups": list(getattr(request.user, "groups_list", []) or []),
            "tenant": getattr(request, "tenant_id", None),
            "resource": resource or {},
        }

    def _decide(self, payload_input: dict, request) -> bool:
        try:
            res = requests.post(settings.OPA_URL, json={"input": payload_input}, timeout=2)
            res.raise_for_status()
            return bool(res.json().get("result", False))
        except requests.RequestException as exc:
            log.warning("OPA unreachable: %s", exc)
            return settings.OPA_FAIL_OPEN

    def has_permission(self, request, view) -> bool:
        if not settings.OPA_URL:
            return True if settings.OPA_FAIL_OPEN else request.user.is_authenticated
        # Collection-level check; object-level ownership is resolved in
        # has_object_permission once the record is loaded.
        return self._decide(self._input(request), request)

    def has_object_permission(self, request, view, obj) -> bool:
        if not settings.OPA_URL:
            return True if settings.OPA_FAIL_OPEN else request.user.is_authenticated
        # Surface ownership attributes so the policy's personal/ABAC level can
        # grant a user access to records they own or are assigned to.
        resource = {
            "assignee": getattr(obj, "assignee", None),
            "owner": getattr(obj, "owner", None) or getattr(obj, "caller", None),
            "tenant": getattr(getattr(obj, "tenant", None), "id", None),
        }
        return self._decide(self._input(request, resource), request)


def opa_allows(request, resource: dict) -> bool:
    """Action-level OPA decision for service code (e.g. a lifecycle transition).

    Sends the same input document as OpaPermission, with ``resource`` naming
    the action (``{"action": "device.transition", "from": ..., "to": ...}``).
    With OPA unconfigured: allowed only when OPA_FAIL_OPEN (dev).
    """
    perm = OpaPermission()
    if not settings.OPA_URL:
        return bool(settings.OPA_FAIL_OPEN)
    return perm._decide(perm._input(request, resource), request)
