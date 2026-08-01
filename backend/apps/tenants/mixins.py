"""Tenant isolation for viewsets.

Rows bound to a tenant are only visible to that tenant; rows with a null
tenant are shared (org-wide/demo data). Cross-tenant (super-admin) access is
granted by omitting the header.
"""


class TenantScopedQuerysetMixin:
    tenant_field = "tenant_id"

    def get_queryset(self):
        qs = super().get_queryset()
        tenant_id = getattr(self.request, "tenant_id", None)
        if tenant_id and any(f.name == "tenant" for f in qs.model._meta.fields):
            from django.db.models import Q

            qs = qs.filter(Q(**{self.tenant_field: tenant_id}) | Q(**{f"{self.tenant_field}__isnull": True}))
        return qs
