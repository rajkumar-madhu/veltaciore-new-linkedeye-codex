"""Domains API: CRUD, client isolation, shared rows, and the checks (probes mocked)."""
import ssl
from datetime import datetime, timedelta, timezone
from unittest import mock

from django.core.management import call_command
from django.test import TestCase
from rest_framework.test import APIClient

from apps.infra.models import InfraDevice
from apps.tenants.context import all_tenants

from .models import MonitoredDomain, ServiceDomain
from .tasks import check_domains

FY = {"HTTP_X_TENANT_ID": "fyers"}
IND = {"HTTP_X_TENANT_ID": "indmoney"}


class DomainApiTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_demo")

    def setUp(self):
        self.client = APIClient()

    def create(self, headers=FY, **body):
        payload = {"name": "Portal.Example.com.", "type": "Application", "site": "Mumbai",
                   "services": [{"name": "Web", "type": "HTTPS", "port": 443}], **body}
        return self.client.post("/api/infra/domains/", payload, format="json", **headers)

    def test_seeded_domains_start_unchecked(self):
        rows = self.client.get("/api/infra/domains/").json()["results"]
        self.assertEqual(len(rows), 12)
        self.assertTrue(all(r["dns_status"] == "Unknown" and r["last_checked"] is None for r in rows))

    def test_create_binds_client_and_normalises_name(self):
        res = self.create()
        self.assertEqual(res.status_code, 201, res.content)
        body = res.json()
        self.assertEqual(body["name"], "portal.example.com")
        self.assertEqual(body["services"][0]["port"], 443)
        self.assertIsNone(body["services"][0]["up"])
        with all_tenants():
            self.assertEqual(MonitoredDomain.objects.get(pk=body["id"]).tenant_id, "fyers")

    def test_validation(self):
        self.assertEqual(self.create(name="not a domain").status_code, 400)
        self.assertEqual(self.create(services=[{"name": "x", "port": 70000}]).status_code, 400)
        self.assertEqual(self.create().status_code, 201)
        self.assertEqual(self.create().status_code, 400)  # duplicate for the same client
        self.assertEqual(self.create(headers=IND).status_code, 201)  # another client may add it

    def test_clients_do_not_see_each_others_domains(self):
        pk = self.create().json()["id"]
        names = [r["name"] for r in self.client.get("/api/infra/domains/", {"page_size": 100}, **IND).json()["results"]]
        self.assertNotIn("portal.example.com", names)
        self.assertEqual(self.client.get(f"/api/infra/domains/{pk}/", **IND).status_code, 404)
        self.assertEqual(self.client.delete(f"/api/infra/domains/{pk}/", **IND).status_code, 404)

    def test_shared_domains_are_read_only_for_a_client(self):
        with all_tenants():
            shared = MonitoredDomain.objects.get(name="nse.finspot.in")
        url = f"/api/infra/domains/{shared.pk}/"
        self.assertTrue(self.client.get(url, **FY).json()["shared"])
        self.assertEqual(self.client.patch(url, {"site": "x"}, format="json", **FY).status_code, 403)
        self.assertEqual(self.client.delete(url, **FY).status_code, 403)
        self.assertEqual(self.client.patch(url, {"site": "DC"}, format="json").status_code, 200)

    def test_update_replaces_services(self):
        pk = self.create().json()["id"]
        res = self.client.patch(f"/api/infra/domains/{pk}/", {"services": [{"name": "SSH", "type": "SSH", "port": 22}]}, format="json", **FY)
        self.assertEqual([s["port"] for s in res.json()["services"]], [22])
        res = self.client.patch(f"/api/infra/domains/{pk}/", {"description": "d"}, format="json", **FY)
        self.assertEqual([s["port"] for s in res.json()["services"]], [22])  # untouched when omitted


class DomainCheckTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_demo")

    def setUp(self):
        self.client = APIClient()
        with all_tenants():
            self.domain = MonitoredDomain.objects.get(name="nse.finspot.in")

    def check(self):
        res = self.client.post(f"/api/infra/domains/{self.domain.pk}/check/")
        self.assertEqual(res.status_code, 200, res.content)
        return res.json()

    def test_healthy_domain(self):
        expiry = datetime.now(timezone.utc) + timedelta(days=200)
        with mock.patch("apps.domains.checks.resolve", return_value=["10.0.0.5"]), \
             mock.patch("apps.domains.checks.certificate", return_value={"expiry": expiry, "issuer": "Test CA"}), \
             mock.patch("apps.domains.checks.port_open", side_effect=lambda h, p: 3.2 if p in (80, 443) else None):
            body = self.check()
        self.assertEqual((body["dns_status"], body["ssl_status"], body["ssl_issuer"]), ("Resolved", "Valid", "Test CA"))
        self.assertEqual(body["resolved_ips"], ["10.0.0.5"])
        self.assertEqual({s["port"]: s["up"] for s in body["services"]}, {80: True, 443: True, 3306: False, 8080: False, 9100: False})
        self.assertIsNotNone(body["last_checked"])
        self.assertEqual(body["check_error"], "")

    def test_expiring_and_expired_certificates(self):
        soon = datetime.now(timezone.utc) + timedelta(days=10)
        with mock.patch("apps.domains.checks.resolve", return_value=["10.0.0.5"]), \
             mock.patch("apps.domains.checks.certificate", return_value={"expiry": soon, "issuer": ""}), \
             mock.patch("apps.domains.checks.port_open", return_value=None):
            self.assertEqual(self.check()["ssl_status"], "Expiring")
        err = ssl.SSLCertVerificationError("certificate verify failed")
        err.verify_code, err.verify_message = 10, "certificate has expired"
        with mock.patch("apps.domains.checks.resolve", return_value=["10.0.0.5"]), \
             mock.patch("apps.domains.checks.certificate", side_effect=err), \
             mock.patch("apps.domains.checks.port_open", return_value=None):
            body = self.check()
        self.assertEqual(body["ssl_status"], "Expired")
        self.assertIn("certificate has expired", body["check_error"])

    def test_dns_failure_marks_everything_unreachable(self):
        with mock.patch("apps.domains.checks.resolve", side_effect=OSError("Name or service not known")), \
             mock.patch("apps.domains.checks.certificate") as cert, \
             mock.patch("apps.domains.checks.port_open") as port:
            body = self.check()
        cert.assert_not_called()
        port.assert_not_called()
        self.assertEqual((body["dns_status"], body["ssl_status"]), ("Error", "Unknown"))
        self.assertTrue(all(s["up"] is False for s in body["services"]))
        self.assertIn("Name or service not known", body["check_error"])

    def test_periodic_task_checks_active_domains(self):
        with mock.patch("apps.domains.checks.resolve", side_effect=OSError("offline")):
            self.assertEqual(check_domains(), 11)  # mail.wecrew.in is inactive


class ServiceDomainTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_demo")
        with all_tenants():
            base = InfraDevice.objects.first()
            cls.fy_dev = InfraDevice.objects.create(id="FY-TEST-01", name="FY-TEST-01", tenant_id="fyers", site=base.site, device_type="firewall")
            cls.ind_dev = InfraDevice.objects.create(id="IND-TEST-01", name="IND-TEST-01", tenant_id="indmoney", site=base.site, device_type="switch")

    def setUp(self):
        self.client = APIClient()

    def test_seeded_defaults(self):
        rows = self.client.get("/api/infra/service-domains/").json()["results"]
        self.assertEqual([r["key"] for r in rows], ["applications", "network", "compute", "storage", "monitoring"])
        self.assertTrue(rows[0]["services"])
        self.assertIn("switch", rows[1]["device_kinds"])

    def test_create_with_members(self):
        res = self.client.post("/api/infra/service-domains/", {
            "name": "Trading", "icon": "fa-chart-line", "services": ["checkout-api"],
            "devices": [self.fy_dev.pk], "device_kinds": ["firewall"],
        }, format="json", **FY)
        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual(res.json()["key"], "trading")
        with all_tenants():
            self.assertEqual(ServiceDomain.objects.get(key="trading").tenant_id, "fyers")
        dup = self.client.post("/api/infra/service-domains/", {"name": "Trading"}, format="json", **FY)
        self.assertEqual(dup.status_code, 400)

    def test_cannot_attach_another_clients_device(self):
        res = self.client.post("/api/infra/service-domains/", {"name": "Ops", "devices": [self.ind_dev.pk]}, format="json", **FY)
        self.assertEqual(res.status_code, 400)

    def test_icon_is_validated(self):
        res = self.client.post("/api/infra/service-domains/", {"name": "X", "icon": "\"><script>"}, format="json", **FY)
        self.assertEqual(res.status_code, 400)
