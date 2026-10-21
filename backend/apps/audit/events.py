"""Write immutable audit events for inventory changes.

Usage::

    before = snapshot(device)
    device.lifecycle_state = "active"; device.save()
    record("device.transition", device, before=before, after=snapshot(device), request=request)

Each event is stored as an AuditEvent row (append-only) and emitted as one
JSON line on the ``linkedeye.audit`` logger, which settings.LOGGING sends to
stdout for Filebeat to ship to Loki (the FinSpot/Santhira audit pipeline).
Unlike AuditMiddleware's best-effort request log, a failed write here raises:
a change without its audit record must not be committed. Call it inside the
same transaction as the change.
"""
from __future__ import annotations

import json
import logging
import uuid
from typing import Any

from django.core.serializers.json import DjangoJSONEncoder
from django.db import models

from .models import AuditEvent

log = logging.getLogger("linkedeye.audit")

# Never copy these into an audit trail, whatever model they appear on.
_SECRET_FIELDS = {"password", "secret", "token", "community", "snmp_community", "api_key", "credential"}


def snapshot(instance: models.Model) -> dict[str, Any]:
    """JSON-safe dict of a model's concrete fields (secrets redacted)."""
    data: dict[str, Any] = {}
    for field in instance._meta.concrete_fields:
        name = field.attname
        if any(s in name.lower() for s in _SECRET_FIELDS):
            data[name] = "[redacted]"
            continue
        data[name] = getattr(instance, name)
    return json.loads(json.dumps(data, cls=DjangoJSONEncoder))


def entity_type_of(instance: models.Model) -> str:
    return f"{instance._meta.app_label}.{instance._meta.model_name}"


def record(
    action: str,
    instance: models.Model,
    *,
    before: dict | None = None,
    after: dict | None = None,
    request=None,
    actor: str | None = None,
    reason: str = "",
) -> AuditEvent:
    user = getattr(request, "user", None) if request is not None else None
    event = AuditEvent.objects.create(
        tenant_id=getattr(instance, "tenant_id", None),
        actor=actor if actor is not None else (getattr(user, "username", "") or "system"),
        actor_groups=list(getattr(user, "groups_list", []) or []),
        action=action,
        entity_type=entity_type_of(instance),
        entity_id=str(instance.pk),
        before=before,
        after=after,
        reason=reason,
        request_id=(request.headers.get("X-Request-ID", "") if request is not None else "") or uuid.uuid4().hex,
        ip=request.META.get("REMOTE_ADDR") if request is not None else None,
    )
    log.info(
        json.dumps(
            {
                "event": "audit",
                "id": event.pk,
                "ts": event.ts,
                "tenant": event.tenant_id,
                "actor": event.actor,
                "action": event.action,
                "entity_type": event.entity_type,
                "entity_id": event.entity_id,
                "before": event.before,
                "after": event.after,
                "reason": event.reason,
                "request_id": event.request_id,
            },
            cls=DjangoJSONEncoder,
        )
    )
    return event
