"""Request-scoped tenant context for ORM-level isolation.

Every query on a ``TenantScopedModel`` is filtered by the scope held here:

* ``tenant_scope("fyers")`` — rows of that tenant plus shared (null-tenant) rows.
* ``all_tenants()``         — no tenant filter; for authorized cross-tenant
  reads and system work (Celery tasks, management commands).
* no scope                  — querying raises ``TenantScopeRequired`` when
  ``settings.TENANT_STRICT`` is on, so a missing filter fails loudly instead
  of leaking another tenant's rows.

The scope lives in a ``ContextVar``, so it is per-request under both WSGI
threads and ASGI tasks. ``TenantMiddleware`` resets it around every request.
"""
from __future__ import annotations

from contextlib import contextmanager
from contextvars import ContextVar
from dataclasses import dataclass
from typing import Iterator


class TenantScopeRequired(RuntimeError):
    """A tenant-scoped model was queried with no tenant scope set."""


@dataclass(frozen=True)
class Scope:
    tenant_id: str | None  # None together with all_tenants=True means "every tenant"
    all_tenants: bool = False


ALL = Scope(tenant_id=None, all_tenants=True)

_scope: ContextVar[Scope | None] = ContextVar("tenant_scope", default=None)


def current_scope() -> Scope | None:
    return _scope.get()


def set_scope(scope: Scope | None):
    """Set the scope for the rest of the current context; returns a reset token."""
    return _scope.set(scope)


def reset_scope(token) -> None:
    _scope.reset(token)


@contextmanager
def tenant_scope(tenant_id: str) -> Iterator[None]:
    token = _scope.set(Scope(tenant_id=tenant_id))
    try:
        yield
    finally:
        _scope.reset(token)


@contextmanager
def all_tenants() -> Iterator[None]:
    token = _scope.set(ALL)
    try:
        yield
    finally:
        _scope.reset(token)


def system_task(fn):
    """Run a background job (Celery task, command) across all tenants."""
    import functools

    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        with all_tenants():
            return fn(*args, **kwargs)

    return wrapper
