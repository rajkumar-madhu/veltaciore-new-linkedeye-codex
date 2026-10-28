"""Sample monitoring data: only without a configured source, always flagged."""
from django.core.management import call_command
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.infra.models import InfraDevice, VirtualMachine
from apps.tenants.context import all_tenants


@override_settings(PROMETHEUS_URL="", LOKI_URL="", METRICS_SAMPLE_DATA=True)
class SampleModeTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_demo")
        with all_tenants():
            cls.win = InfraDevice.objects.filter(device_type="win-srv").first()
            cls.bmc = InfraDevice.objects.filter(device_type__in=["idrac", "ilo"]).first()
            cls.vm = VirtualMachine.objects.first()

    def setUp(self):
        self.client = APIClient()

    def get(self, path, **params):
        res = self.client.get(path, params)
        self.assertEqual(res.status_code, 200, res.content)
        return res.json()

    def test_metrics_are_sample_and_continuous(self):
        rng = {"start": "2026-10-20T00:00:00Z", "end": "2026-10-20T01:00:00Z"}
        a = self.get(f"/api/infra/devices/{self.win.pk}/metrics/", **rng)
        b = self.get(f"/api/infra/devices/{self.win.pk}/metrics/", **rng)
        self.assertTrue(a["sample"])
        self.assertEqual(a["source"], "prometheus")
        self.assertEqual(a, b)  # deterministic: a refresh draws the same line
        keys = {s["key"] for s in a["series"]}
        self.assertTrue({"cpu", "cpu_idle", "mem", "mem_used_gb", "net_rx", "processes"} <= keys)
        for s in a["series"]:
            self.assertTrue(s["points"], s["key"])
            if s["unit"] == "%":
                self.assertTrue(all(0 <= v <= 100 for _, v in s["points"]), s["key"])
        # the CPU modes add up to the total the KPI card shows
        by = {s["key"]: s["points"] for s in a["series"]}
        modes = [k for k in by if k.startswith("cpu_") and k != "cpu_idle"]
        for i, (_, total) in enumerate(by["cpu"]):
            self.assertAlmostEqual(sum(by[k][i][1] for k in modes), total, delta=0.05)

    def test_every_panel_has_sample_data(self):
        inv = self.get(f"/api/infra/devices/{self.win.pk}/inventory/")
        self.assertTrue(inv["sample"] and inv["processes"] and inv["filesystems"])
        hw = self.get(f"/api/infra/devices/{self.bmc.managed_by_id}/hardware/")
        self.assertTrue(hw["sample"])
        self.assertEqual([s["key"] for s in hw["controllers"][0]["sensors"]], ["temperature", "fan", "power"])
        self.assertTrue(self.get(f"/api/infra/devices/{self.win.pk}/logs/")["entries"])
        self.assertTrue(self.get(f"/api/infra/vms/{self.vm.pk}/metrics/")["sample"])
        self.assertTrue(self.get(f"/api/infra/vms/{self.vm.pk}/inventory/")["found"])
        self.assertTrue(self.get("/api/infra/devices/load/")["sample"])

    @override_settings(PROMETHEUS_URL="http://prom.test")
    def test_configured_prometheus_is_never_replaced_by_samples(self):
        from unittest import mock
        from apps.monitoring import prometheus as prom
        with mock.patch("apps.monitoring.prometheus.requests.get", side_effect=prom.requests.ConnectionError("down")):
            out = self.get(f"/api/infra/devices/{self.win.pk}/metrics/")
        self.assertEqual(out["source"], "unavailable")
        self.assertNotIn("sample", out)

    @override_settings(METRICS_SAMPLE_DATA=False)
    def test_off_in_production(self):
        out = self.get(f"/api/infra/devices/{self.win.pk}/metrics/")
        self.assertEqual(out["source"], "unavailable")
