"""Tenant isolation for viewsets.

Filtering now happens in the ORM (TenantScopedModel.objects, driven by the
request scope that TenantScopePermission resolves), so every query is scoped
— not only viewsets that remember to use this mixin. The mixin is kept so
existing viewsets keep their base classes; it adds no extra filtering.
"""


class TenantScopedQuerysetMixin:
    tenant_field = "tenant_id"
