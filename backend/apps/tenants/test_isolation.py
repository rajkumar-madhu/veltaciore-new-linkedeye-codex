"""ORM-level tenant isolation (apps/tenants/context.py + TenantScopedQuerySet)."""
from django.core.management import call_command
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.incidents.models import SnIncidentRecord
from apps.tenants.context import TenantScopeRequired, all_tenants, current_scope, tenant_scope


class OrmScopeTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_demo")
        with all_tenants():
            # One private row per tenant plus the shared (null-tenant) seed rows.
            SnIncidentRecord.objects.create(id="INC-T-FYERS", tenant_id="fyers", title="fyers only", pri=3, state="New")
            SnIncidentRecord.objects.create(id="INC-T-INDMONEY", tenant_id="indmoney", title="indmoney only", pri=3, state="New")

    def test_unscoped_query_raises(self):
        self.assertIsNone(current_scope())
        with self.assertRaises(TenantScopeRequired):
            list(SnIncidentRecord.objects.all())
        with self.assertRaises(TenantScopeRequired):
            SnIncidentRecord.objects.count()
        with self.assertRaises(TenantScopeRequired):
            SnIncidentRecord.objects.filter(pri=1).exists()

    def test_tenant_scope_sees_own_and_shared_rows_only(self):
        with tenant_scope("fyers"):
            ids = set(SnIncidentRecord.objects.values_list("id", flat=True))
        self.assertIn("INC-T-FYERS", ids)
        self.assertNotIn("INC-T-INDMONEY", ids)
        self.assertIn("INC-000001", ids)  # shared seed row

    def test_scope_is_applied_when_the_query_runs_not_when_built(self):
        qs = SnIncidentRecord.objects.all()  # built outside any scope, like a viewset attribute
        with tenant_scope("indmoney"):
            ids = set(qs.all().values_list("id", flat=True))
        self.assertIn("INC-T-INDMONEY", ids)
        self.assertNotIn("INC-T-FYERS", ids)

    def test_subquery_and_slice_are_scoped(self):
        with tenant_scope("fyers"):
            sub = SnIncidentRecord.objects.filter(id__startswith="INC-T-").values("id")
            ids = set(SnIncidentRecord.unscoped.filter(id__in=sub).values_list("id", flat=True))
            first = list(SnIncidentRecord.objects.filter(id__startswith="INC-T-")[:5])
        self.assertEqual(ids, {"INC-T-FYERS"})
        self.assertEqual([r.id for r in first], ["INC-T-FYERS"])

    def test_bulk_write_is_scoped(self):
        with tenant_scope("fyers"):
            n = SnIncidentRecord.objects.filter(id__startswith="INC-T-").update(title="touched")
        self.assertEqual(n, 1)
        self.assertEqual(SnIncidentRecord.unscoped.get(id="INC-T-INDMONEY").title, "indmoney only")

    def test_all_tenants_sees_everything(self):
        with all_tenants():
            ids = set(SnIncidentRecord.objects.filter(id__startswith="INC-T-").values_list("id", flat=True))
        self.assertEqual(ids, {"INC-T-FYERS", "INC-T-INDMONEY"})


class ApiScopeTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_demo")
        with all_tenants():
            SnIncidentRecord.objects.create(id="INC-T-INDMONEY", tenant_id="indmoney", title="indmoney only", pri=3, state="New")

    def setUp(self):
        self.client = APIClient()

    def test_other_tenant_rows_are_not_listed_or_reachable(self):
        res = self.client.get("/api/incidents/records/", {"page_size": 500}, HTTP_X_TENANT_ID="fyers")
        self.assertEqual(res.status_code, 200)
        self.assertNotIn("INC-T-INDMONEY", [r["id"] for r in res.json()["results"]])
        detail = self.client.get("/api/incidents/records/INC-T-INDMONEY/", HTTP_X_TENANT_ID="fyers")
        self.assertEqual(detail.status_code, 404)
        patch = self.client.patch("/api/incidents/records/INC-T-INDMONEY/", {"state": "Closed"},
                                  format="json", HTTP_X_TENANT_ID="fyers")
        self.assertEqual(patch.status_code, 404)

    def test_unknown_tenant_is_rejected(self):
        res = self.client.get("/api/incidents/records/", HTTP_X_TENANT_ID="no-such-tenant")
        self.assertEqual(res.status_code, 400)

    @override_settings(OPA_URL="", OPA_FAIL_OPEN=False)
    def test_missing_tenant_header_fails_closed_without_opa(self):
        res = self.client.get("/api/incidents/records/")
        self.assertIn(res.status_code, (401, 403))

    def test_scope_does_not_leak_after_request(self):
        self.client.get("/api/incidents/records/", HTTP_X_TENANT_ID="fyers")
        self.assertIsNone(current_scope())
