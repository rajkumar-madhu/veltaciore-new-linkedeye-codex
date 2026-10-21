from django.conf import settings
from django.db import models
from django.db.models import Q

from .context import TenantScopeRequired, current_scope


class Tenant(models.Model):
    """A business unit under the parent organization."""

    id = models.SlugField(primary_key=True, max_length=64)
    name = models.CharField(max_length=200)
    parent = models.CharField(max_length=64, blank=True, default="")
    code = models.CharField(max_length=8)
    color = models.CharField(max_length=16, default="slate")
    users = models.PositiveIntegerField(default=0)
    incidents = models.PositiveIntegerField(default=0)
    sev1 = models.PositiveIntegerField(default=0)
    health = models.PositiveIntegerField(default=100)
    mttr = models.PositiveIntegerField(default=0)
    spend = models.PositiveIntegerField(default=0)
    plan = models.CharField(max_length=32, default="Business")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class TenantScopedQuerySet(models.QuerySet):
    """QuerySet that applies the tenant scope at execution time.

    The scope is read when the query actually runs (fetch, count, exists,
    aggregate, update, delete, iterator, or use as a subquery), not when it is
    built. Class-level querysets such as a viewset's ``queryset = M.objects.all()``
    are created at import time, before any request exists, so building them
    must not capture a scope. ``create()`` never reads rows and is unaffected.
    With no scope and TENANT_STRICT on, executing raises TenantScopeRequired.
    """

    _tenant_scope_applied = False

    def _clone(self):
        clone = super()._clone()
        clone._tenant_scope_applied = self._tenant_scope_applied
        return clone

    def _apply_tenant_scope(self) -> None:
        if self._tenant_scope_applied:
            return
        scope = current_scope()
        if scope is None:
            if getattr(settings, "TENANT_STRICT", True):
                raise TenantScopeRequired(
                    f"{self.model.__name__} queried without a tenant scope. Run it inside "
                    "tenant_scope(<id>) or all_tenants() (apps.tenants.context), or use "
                    "Model.unscoped for deliberate unfiltered access."
                )
        elif not scope.all_tenants:
            # add_q directly so a sliced query (qs[:10]) can still be scoped.
            self.query.add_q(Q(tenant_id=scope.tenant_id) | Q(tenant__isnull=True))
        self._tenant_scope_applied = True

    def _fetch_all(self):
        if self._result_cache is None:
            self._apply_tenant_scope()
        super()._fetch_all()

    def iterator(self, *args, **kwargs):
        self._apply_tenant_scope()
        return super().iterator(*args, **kwargs)

    def count(self):
        if self._result_cache is None:
            self._apply_tenant_scope()
        return super().count()

    def exists(self):
        if self._result_cache is None:
            self._apply_tenant_scope()
        return super().exists()

    def aggregate(self, *args, **kwargs):
        self._apply_tenant_scope()
        return super().aggregate(*args, **kwargs)

    def update(self, **kwargs):
        self._apply_tenant_scope()
        return super().update(**kwargs)

    def delete(self):
        self._apply_tenant_scope()
        return super().delete()

    def resolve_expression(self, *args, **kwargs):
        # Used as a subquery (Exists(...), pk__in=qs): scope it too.
        self._apply_tenant_scope()
        return super().resolve_expression(*args, **kwargs)


class TenantScopedManager(models.Manager.from_queryset(TenantScopedQuerySet)):
    """Default manager for tenant-scoped models (scope applied at execution)."""


class TenantScopedModel(models.Model):
    """Base for anything that belongs to a tenant. Null tenant = shared/global.

    ``objects`` is tenant-filtered from the request scope (see
    apps.tenants.context). ``unscoped`` bypasses the filter and is reserved for
    deliberate system access (migrations, admin tooling).
    """

    tenant = models.ForeignKey(
        Tenant, null=True, blank=True, on_delete=models.CASCADE, related_name="+"
    )

    objects = TenantScopedManager()
    unscoped = models.Manager()

    class Meta:
        abstract = True
