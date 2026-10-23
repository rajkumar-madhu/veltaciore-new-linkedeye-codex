from rest_framework import exceptions, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Tenant
from .serializers import TenantSerializer


class TenantViewSet(viewsets.ReadOnlyModelViewSet):
    # The tenant list is how the UI discovers which tenants exist, so it must
    # not require a valid X-Tenant-ID (a fresh deployment's default tenant id
    # may not exist yet). Tenant rows are not tenant-scoped data.
    tenant_scope_exempt = True
    queryset = Tenant.objects.all()
    serializer_class = TenantSerializer
    search_fields = ["name", "code", "plan"]
    ordering_fields = ["name", "users", "incidents", "health", "spend"]


class CrossTenantSummaryView(APIView):
    """GET /api/tenants-summary/ — live per-client rollup for the cross-client view.

    Must be called without X-Tenant-ID: TenantScopePermission then sets the
    all-tenants scope and the policy limits that to admins (and fails closed
    without OPA in production). A request scoped to one client is refused, so
    the page can never show other clients' numbers through a client header.
    Rows without a client (shared records) are reported under "shared".
    """

    def get(self, request):
        from django.db.models import Count, Q

        from apps.changes.models import SnChangeRecord
        from apps.incidents.models import Incident, SnIncidentRecord
        from apps.infra.models import DeviceAlert, InfraDevice

        if getattr(request, "tenant_id", None):
            raise exceptions.PermissionDenied("The cross-client summary is read without X-Tenant-ID (admins only).")

        def by_tenant(qs, **aggs):
            return {r["tenant_id"] or "shared": r for r in qs.values("tenant_id").annotate(**aggs)}

        closed = ["Resolved", "Closed", "Cancelled", "Canceled"]
        tickets = by_tenant(
            SnIncidentRecord.objects.all(),
            total=Count("id"),
            open=Count("id", filter=~Q(state__in=closed)),
            sla_met=Count("id", filter=Q(sla__in=["met", "ok"])),
            sla_breached=Count("id", filter=Q(sla="breach")),
            sla_risk=Count("id", filter=Q(sla="warn")),
        )
        incidents = by_tenant(
            Incident.objects.exclude(status__in=["resolved", "closed"]),
            active=Count("id"), sev1=Count("id", filter=Q(sev=1)), sev2=Count("id", filter=Q(sev=2)),
        )
        changes = by_tenant(
            SnChangeRecord.objects.all(),
            open=Count("id", filter=~Q(state__in=["Completed", "Closed", "Cancelled", "Canceled"])),
            implementing=Count("id", filter=Q(state="Implement")),
        )
        devices = by_tenant(
            InfraDevice.objects.exclude(lifecycle_state="decommissioned"),
            total=Count("id"), down=Count("id", filter=Q(status__in=["down", "critical"])),
            warn=Count("id", filter=Q(status="warn")),
        )
        alerts = by_tenant(
            DeviceAlert.objects.filter(resolved=False),
            open=Count("id"), critical=Count("id", filter=Q(sev="critical")),
        )

        def row(key, name, code, color, plan):
            t, i, c, d, a = (src.get(key, {}) for src in (tickets, incidents, changes, devices, alerts))
            sla_total = t.get("sla_met", 0) + t.get("sla_breached", 0) + t.get("sla_risk", 0)
            dev_total = d.get("total", 0)
            return {
                "id": key, "name": name, "code": code, "color": color, "plan": plan,
                "tickets_total": t.get("total", 0), "tickets_open": t.get("open", 0),
                "sla_met_pct": round(100 * t.get("sla_met", 0) / sla_total, 1) if sla_total else None,
                "sla_breached": t.get("sla_breached", 0),
                "incidents_active": i.get("active", 0), "sev1": i.get("sev1", 0), "sev2": i.get("sev2", 0),
                "changes_open": c.get("open", 0), "changes_implementing": c.get("implementing", 0),
                "devices_total": dev_total, "devices_down": d.get("down", 0), "devices_warn": d.get("warn", 0),
                "devices_online_pct": round(100 * (dev_total - d.get("down", 0)) / dev_total, 1) if dev_total else None,
                "alerts_open": a.get("open", 0), "alerts_critical": a.get("critical", 0),
            }

        rows = [row(t.id, t.name, t.code, t.color, t.plan) for t in Tenant.objects.all()]
        if any("shared" in src for src in (tickets, incidents, changes, devices, alerts)):
            rows.append(row("shared", "Shared (no client)", "—", "slate", ""))
        keys = ["tickets_total", "tickets_open", "sla_breached", "incidents_active", "sev1", "sev2",
                "changes_open", "changes_implementing", "devices_total", "devices_down", "devices_warn",
                "alerts_open", "alerts_critical"]
        totals = {k: sum(r[k] for r in rows) for k in keys}
        totals["devices_online_pct"] = (
            round(100 * (totals["devices_total"] - totals["devices_down"]) / totals["devices_total"], 1)
            if totals["devices_total"] else None
        )
        return Response({"clients": rows, "totals": totals})
