"""Device lifecycle: discovered → pending_review → active → decommissioned.

State changes go through transition_device() only. It checks the move is an
allowed edge, asks OPA (resource.action = "device.transition"), and saves the
new state together with its AuditEvent in one transaction, so a transition is
never committed without its audit record.
"""
from __future__ import annotations

from django.db import transaction
from rest_framework import exceptions

from apps.audit.events import record, snapshot
from apps.policy.permissions import opa_allows

from .models import InfraDevice

# from-state → states it may move to
TRANSITIONS: dict[str, set[str]] = {
    "discovered": {"pending_review", "decommissioned"},
    "pending_review": {"active", "decommissioned"},
    "active": {"decommissioned"},
    "decommissioned": {"pending_review"},  # re-onboarding goes back through review
}

# Moves that must say why (they take a device out of service or bring one back).
REASON_REQUIRED = {"decommissioned", "pending_review"}


def transition_device(device: InfraDevice, to_state: str, *, request, reason: str = "") -> InfraDevice:
    from_state = device.lifecycle_state
    valid = {s for s, _ in InfraDevice.LIFECYCLE}
    if to_state not in valid:
        raise exceptions.ValidationError({"to": f"Unknown lifecycle state '{to_state}'."})
    if to_state not in TRANSITIONS.get(from_state, set()):
        raise exceptions.ValidationError(
            {"to": f"Cannot move a device from {from_state} to {to_state}."}
        )
    if to_state in REASON_REQUIRED and from_state != "discovered" and not reason.strip():
        raise exceptions.ValidationError({"reason": "A reason is required for this transition."})
    resource = {
        "action": "device.transition",
        "from": from_state,
        "to": to_state,
        "tenant": device.tenant_id,
        "device": device.pk,
    }
    if not opa_allows(request, resource):
        raise exceptions.PermissionDenied("Lifecycle transition denied by policy.")
    with transaction.atomic():
        before = snapshot(device)
        device.lifecycle_state = to_state
        device.save(update_fields=["lifecycle_state", "updated_at"])
        record("device.transition", device, before=before, after=snapshot(device),
               request=request, reason=reason.strip())
    return device
