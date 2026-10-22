"""Device lifecycle transitions: allowed edges, OPA decision, audit record."""
from unittest import mock

from django.core.management import call_command
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.audit.models import AuditEvent
from apps.infra.models import InfraDevice
from apps.tenants.context import all_tenants


class LifecycleTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_demo")
        with all_tenants():
            d = InfraDevice.objects.first()
            InfraDevice.objects.filter(pk=d.pk).update(lifecycle_state="pending_review", tenant_id="fyers")
            cls.device_id = d.pk

    def setUp(self):
        self.client = APIClient()

    def _post(self, to, reason="", tenant="fyers"):
        return self.client.post(
            f"/api/infra/devices/{self.device_id}/transition/",
            {"to": to, "reason": reason}, format="json", HTTP_X_TENANT_ID=tenant,
        )

    def _state(self):
        return InfraDevice.unscoped.get(pk=self.device_id).lifecycle_state

    def _events(self):
        return AuditEvent.unscoped.filter(entity_id=self.device_id, action="device.transition")

    def test_allowed_transition_changes_state_and_writes_audit(self):
        res = self._post("active")
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res.json()["lifecycleState"], "active")
        self.assertEqual(self._state(), "active")
        ev = self._events().get()
        self.assertEqual(ev.before["lifecycle_state"], "pending_review")
        self.assertEqual(ev.after["lifecycle_state"], "active")
        self.assertEqual(ev.tenant_id, "fyers")

    def test_disallowed_edge_is_rejected_without_audit(self):
        res = self._post("discovered")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(self._state(), "pending_review")
        self.assertFalse(self._events().exists())

    def test_decommission_requires_reason(self):
        self.assertEqual(self._post("decommissioned").status_code, 400)
        self.assertEqual(self._post("decommissioned", reason="Replaced by SW-02").status_code, 200)
        self.assertEqual(self._events().get().reason, "Replaced by SW-02")

    @override_settings(OPA_URL="http://opa.test/v1/data/veltacore/authz/allow", OPA_FAIL_OPEN=False)
    def test_policy_denial_leaves_state_and_trail_untouched(self):
        # Request-level check allows the call; the action-level check denies the move.
        decisions = iter([True, False])
        with mock.patch("apps.policy.permissions.OpaPermission._decide", side_effect=lambda *a, **k: next(decisions)):
            res = self._post("active")
        self.assertEqual(res.status_code, 403)
        self.assertEqual(self._state(), "pending_review")
        self.assertFalse(self._events().exists())

    @override_settings(OPA_URL="http://opa.test/v1/data/veltacore/authz/allow", OPA_FAIL_OPEN=False)
    def test_action_level_input_names_the_transition(self):
        seen = []

        def decide(self_, payload, request):
            seen.append(payload)
            return True

        with mock.patch("apps.policy.permissions.OpaPermission._decide", decide):
            self._post("active")
        action = seen[-1]["resource"]
        self.assertEqual(action["action"], "device.transition")
        self.assertEqual((action["from"], action["to"]), ("pending_review", "active"))

    def test_other_tenant_cannot_transition_device(self):
        res = self._post("active", tenant="indmoney")
        self.assertEqual(res.status_code, 404)
        self.assertEqual(self._state(), "pending_review")


class RelationshipTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_demo")

    def test_hypervisor_family(self):
        res = APIClient().get("/api/infra/devices/ESX-BLR-01/relationships/", HTTP_X_TENANT_ID="fyers")
        self.assertEqual(res.status_code, 200, res.content)
        body = res.json()
        self.assertEqual(len(body["vms"]), 4)
        self.assertTrue(all(v["host"] == "ESX-BLR-01" for v in body["vms"]))
        names = [n["name"] for n in body["nics"]]
        self.assertIn("eno1", names)
        linked = [n for n in body["nics"] if n["connected_to"]]
        self.assertEqual(len(linked), 1)
        self.assertEqual(linked[0]["name"], "ens2f0")
        self.assertEqual(linked[0]["connected_to"]["peer"]["id"], "SW-BLR-TOR-12")
        self.assertTrue(linked[0]["connected_to"]["port"].startswith("Te1/0/"))
        self.assertEqual(body["other_links"], [])

    def test_peer_in_other_tenant_is_restricted(self):
        with all_tenants():
            InfraDevice.objects.filter(pk="ESX-BLR-01").update(tenant_id="fyers")
            InfraDevice.objects.filter(pk="SW-BLR-TOR-12").update(tenant_id="indmoney")
        body = APIClient().get("/api/infra/devices/ESX-BLR-01/relationships/", HTTP_X_TENANT_ID="fyers").json()
        peer = next(n for n in body["nics"] if n["connected_to"])["connected_to"]["peer"]
        self.assertEqual(peer, {"id": None, "restricted": True})
