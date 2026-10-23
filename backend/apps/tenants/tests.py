"""API contract + tenant-isolation tests. Run: python manage.py test apps"""
from django.core.management import call_command
from django.test import TestCase, override_settings
from rest_framework.test import APIClient


class SeededApiTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_demo")

    def setUp(self):
        self.client = APIClient()

    def test_tenants_list(self):
        res = self.client.get("/api/tenants/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["count"], 6)

    def test_devices_have_frontend_field_names(self):
        res = self.client.get("/api/infra/devices/")
        self.assertEqual(res.status_code, 200)
        row = res.json()["results"][0]
        for key in ("id", "kind", "model", "site", "ip", "os", "uptime", "cpu",
                    "mem", "status", "role", "iface", "throughput", "sessions",
                    "lastSeen", "agent"):
            self.assertIn(key, row)

    def test_device_search(self):
        res = self.client.get("/api/infra/devices/", {"search": "SW-BLR-TOR-13"})
        ids = [d["id"] for d in res.json()["results"]]
        self.assertEqual(ids, ["SW-BLR-TOR-13"])

    def test_device_detail_actions(self):
        for action in ("overview", "interfaces", "alerts", "availability", "metrics"):
            res = self.client.get(f"/api/infra/devices/SW-BLR-TOR-13/{action}/")
            self.assertEqual(res.status_code, 200, action)
        ifaces = self.client.get("/api/infra/devices/SW-BLR-TOR-13/interfaces/").json()
        self.assertEqual(len(ifaces), 48)
        self.assertEqual(sum(1 for i in ifaces if i["oper_status"] == "down"), 2)

    def test_racks(self):
        res = self.client.get("/api/infra/racks/")
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body["count"], 3)
        r = body["results"][0]
        self.assertEqual(r["id"], "R12")
        self.assertEqual(r["role"], "Mixed compute")
        self.assertEqual(r["powerKw"], 142)
        self.assertEqual(len(r["units"]), 14)
        u = r["units"][0]
        for key in ("uTop", "uBottom", "kind", "label", "desc", "model",
                    "color", "icon", "status", "asset", "ip", "device", "chip"):
            self.assertIn(key, u)
        # a unit that maps to an inventory device carries its id
        sw = next(x for x in r["units"] if x["asset"] == "SW-BLR-CORE-01")
        self.assertEqual(sw["device"], "SW-BLR-CORE-01")

    def test_create_incident_record(self):
        # A P1 create auto-allocates the next INC id, marks it critical, and
        # binds it to the acting tenant so other tenants don't see it.
        before = self.client.get("/api/incidents/records/", HTTP_X_TENANT_ID="fyers").json()["count"]
        res = self.client.post(
            "/api/incidents/records/",
            {"title": "Test create", "caller": "priya.r@finspot.in", "pri": 1,
             "category": "Database", "group": "SRE Platform", "assignee": "Rajkumar M"},
            format="json",
            HTTP_X_TENANT_ID="fyers",
        )
        self.assertEqual(res.status_code, 201, res.content)
        body = res.json()
        self.assertTrue(body["id"].startswith("INC-"))
        self.assertTrue(body["critical"])
        self.assertEqual(body["state"], "New")
        fyers = self.client.get("/api/incidents/records/", HTTP_X_TENANT_ID="fyers").json()["count"]
        other = self.client.get("/api/incidents/records/", HTTP_X_TENANT_ID="indmoney").json()["count"]
        self.assertEqual(fyers, before + 1)
        self.assertEqual(other, before)  # not visible to a different tenant

    def test_create_problem_record(self):
        before = self.client.get("/api/problems/records/", HTTP_X_TENANT_ID="fyers").json()["count"]
        res = self.client.post(
            "/api/problems/records/",
            {"title": "Recurring NIC resets", "caller": "Rajkumar M", "pri": 1, "category": "Network"},
            format="json", HTTP_X_TENANT_ID="fyers",
        )
        self.assertEqual(res.status_code, 201, res.content)
        body = res.json()
        self.assertTrue(body["id"].startswith("PRB-"))
        self.assertTrue(body["critical"])
        after = self.client.get("/api/problems/records/", HTTP_X_TENANT_ID="fyers").json()["count"]
        other = self.client.get("/api/problems/records/", HTTP_X_TENANT_ID="indmoney").json()["count"]
        self.assertEqual(after, before + 1)
        self.assertEqual(other, before)

    def test_problem_records_seeded(self):
        res = self.client.get("/api/problems/records/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["count"], 6)

    def test_create_change_record(self):
        before = self.client.get("/api/changes/records/", HTTP_X_TENANT_ID="fyers").json()["count"]
        res = self.client.post(
            "/api/changes/records/",
            {"title": "Core router IOS upgrade", "caller": "Siva K", "pri": 1, "category": "Network", "risk": "High"},
            format="json", HTTP_X_TENANT_ID="fyers",
        )
        self.assertEqual(res.status_code, 201, res.content)
        body = res.json()
        self.assertTrue(body["id"].startswith("CHG-"))
        self.assertTrue(body["critical"])
        self.assertEqual(body["risk"], "High")
        after = self.client.get("/api/changes/records/", HTTP_X_TENANT_ID="fyers").json()["count"]
        other = self.client.get("/api/changes/records/", HTTP_X_TENANT_ID="indmoney").json()["count"]
        self.assertEqual(after, before + 1)
        self.assertEqual(other, before)

    def test_change_records_seeded(self):
        res = self.client.get("/api/changes/records/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["count"], 7)

    def test_resolve_core_incident(self):
        res = self.client.patch(
            "/api/incidents/INC-48291/", {"status": "resolved"},
            format="json", HTTP_X_TENANT_ID="fyers",
        )
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res.json()["status"], "resolved")

    def test_update_incident_state(self):
        res = self.client.patch(
            "/api/incidents/records/INC-000001/",
            {"state": "Assigned"}, format="json", HTTP_X_TENANT_ID="fyers",
        )
        self.assertEqual(res.status_code, 200, res.content)
        body = res.json()
        self.assertEqual(body["state"], "Assigned")
        self.assertEqual(body["updated"], "just now")

    def test_incident_record_search(self):
        res = self.client.get("/api/incidents/records/", {"search": "FortiGate"})
        ids = [r["id"] for r in res.json()["results"]]
        self.assertEqual(ids, ["INC-000003"])

    def test_site_topology(self):
        res = self.client.get("/api/infra/sites/dc-blr-1/topology/")
        body = res.json()
        self.assertGreater(len(body["devices"]), 0)
        self.assertGreater(len(body["links"]), 0)

    def test_incident_tenant_isolation(self):
        all_rows = self.client.get("/api/incidents/").json()["count"]
        scoped = self.client.get("/api/incidents/", HTTP_X_TENANT_ID="fyers").json()
        self.assertEqual(all_rows, 8)
        self.assertEqual(scoped["count"], 2)
        for row in scoped["results"]:
            self.assertIn(row["id"], ("INC-48291", "INC-48289"))

    def test_itsm_lists(self):
        for path, count in (
            ("/api/problems/", 6),
            ("/api/changes/", 7),
            ("/api/cmdb/config-items/", 12),
            ("/api/knowledge/articles/", 8),
            ("/api/slas/", 8),
            ("/api/services/", 8),
            ("/api/incidents/records/", 8),
        ):
            res = self.client.get(path)
            self.assertEqual(res.status_code, 200, path)
            self.assertEqual(res.json()["count"], count, path)

    def test_trading_endpoints(self):
        hourly = self.client.get("/api/trading/latency/hourly/").json()
        self.assertEqual(len(hourly), 13)
        self.assertEqual(hourly[0]["label"], "09:00")
        segs = self.client.get("/api/trading/latency/segments/").json()
        self.assertEqual([s["seg"] for s in segs], ["NFO", "BFO", "NSE", "BSE"])
        orders = self.client.get("/api/trading/latency/orders/").json()
        self.assertEqual(len(orders), 15)
        # Unconfirmed rows serialize blank exch status like the CSV
        blank = [o for o in orders if o["exch"] == ""]
        self.assertGreater(len(blank), 0)
        lines = self.client.get("/api/trading/ctcl/lines/").json()
        self.assertEqual(lines[0]["id"], "NSE-5864")
        brokers = self.client.get("/api/trading/ctcl/brokers/").json()
        self.assertEqual(len(brokers), 18)
        self.assertEqual(brokers[0]["n"], "BetaFront")


class OrderLatencyCsvTests(TestCase):
    def test_csv_generation(self):
        import csv
        import os
        import tempfile

        call_command("seed_demo")
        with tempfile.TemporaryDirectory() as tmp:
            os.environ["TRADING_REPORTS_DIR"] = tmp
            from apps.trading.tasks import generate_order_latency_csv

            path = generate_order_latency_csv.apply().get()
            name = os.path.basename(path)
            self.assertTrue(name.startswith("L_ORDERLATENCY"))
            self.assertTrue(name.endswith(".csv"))
            with open(path) as fh:
                rows = list(csv.reader(fh))
            self.assertEqual(rows[0], [
                "NOREN_ORD_NUM", "EXCH_SEG", "EXT_RMKS", "OMS_STATUS",
                "OMS_LATENCY", "EXCH_STATUS", "OMS_EXCH_CONFIRMATION",
                "OMSUPDATETIME", "EXCHUPDATETIME",
            ])
            self.assertEqual(len(rows), 16)  # header + 15 orders


@override_settings(OPA_URL="", OPA_FAIL_OPEN=True)
class CrossTenantSummaryTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_demo")

    def setUp(self):
        self.client = APIClient()

    def test_summary_counts_match_the_database(self):
        from apps.incidents.models import SnIncidentRecord
        from apps.infra.models import InfraDevice
        from apps.tenants.context import all_tenants

        res = self.client.get("/api/tenants-summary/")
        self.assertEqual(res.status_code, 200, res.content)
        body = res.json()
        with all_tenants():
            self.assertEqual(body["totals"]["tickets_total"], SnIncidentRecord.objects.count())
            self.assertEqual(body["totals"]["devices_total"],
                             InfraDevice.objects.exclude(lifecycle_state="decommissioned").count())
        self.assertTrue({"id", "name", "sev1", "devices_online_pct", "sla_met_pct"} <= set(body["clients"][0]))

    def test_client_scoped_request_is_refused(self):
        res = self.client.get("/api/tenants-summary/", HTTP_X_TENANT_ID="fyers")
        self.assertEqual(res.status_code, 403)

    @override_settings(OPA_FAIL_OPEN=False)
    def test_without_policy_production_fails_closed(self):
        res = self.client.get("/api/tenants-summary/")
        self.assertIn(res.status_code, (401, 403))
