"""Device metrics from Prometheus: PromQL building, ranges, safety, scoping."""
from unittest import mock

from django.core.management import call_command
from django.test import SimpleTestCase, TestCase, override_settings
from rest_framework.test import APIClient

from apps.infra.models import InfraDevice, VirtualMachine
from apps.monitoring import prometheus as prom
from apps.tenants.context import all_tenants

PROM = "http://prom.test"


def _ok(values):
    resp = mock.Mock()
    resp.raise_for_status.return_value = None
    resp.json.return_value = {"status": "success", "data": {"result": [{"values": values}]}}
    return resp


class FakeDevice:
    def __init__(self, **kw):
        self.id = kw.get("id", "DEV-1")
        self.tenant_id = kw.get("tenant_id", "fyers")
        self.ip_address = kw.get("ip", "10.10.1.21")
        self.hostname = kw.get("hostname", "")
        self.device_type = kw.get("device_type", "linux-srv")
        self.agent = kw.get("agent", "node-exporter")
        self.exporter_type = ""
        self.metrics_labels = kw.get("labels", {})


class CatalogTests(SimpleTestCase):
    def test_family_detection(self):
        self.assertEqual(prom.family_for_device(FakeDevice(device_type="win-srv", agent="win-exporter")), "windows")
        self.assertEqual(prom.family_for_device(FakeDevice(device_type="hypervisor", agent="vmware-exporter")), "vmware-host")
        self.assertEqual(prom.family_for_device(FakeDevice(device_type="switch", agent="snmp")), "snmp")
        self.assertEqual(prom.family_for_device(FakeDevice(device_type="phys-srv", agent="node-exporter")), "node")

    def test_node_selector_matches_ip_literally(self):
        sel, _ = prom.device_selector(FakeDevice(ip="10.10.1.21"), "node")
        self.assertEqual(sel, r'instance=~"10\.10\.1\.21(:[0-9]+)?"')

    @override_settings(PROMETHEUS_TENANT_LABEL="tenant")
    def test_tenant_label_is_added(self):
        sel, _ = prom.device_selector(FakeDevice(device_type="switch", agent="snmp"), "snmp")
        self.assertEqual(sel, 'tenant="fyers",instance="10.10.1.21"')

    def test_custom_labels_are_escaped_and_validated(self):
        sel, _ = prom.device_selector(FakeDevice(labels={"job": 'node"} or vector(1) #'}), "node")
        self.assertEqual(sel, r'job="node\"} or vector(1) #"')
        with self.assertRaises(ValueError):
            prom.device_selector(FakeDevice(labels={"bad label": "x"}), "node")

    def test_window_defaults_and_step_cap(self):
        start, end, step = prom.resolve_window(None, None, None)
        self.assertEqual(int((end - start).total_seconds()), 3600)
        self.assertEqual(step, 15)
        start, end, step = prom.resolve_window("2026-10-01T00:00:00Z", "2026-10-31T00:00:00Z", "15")
        self.assertLessEqual((end - start).total_seconds() / step, prom.MAX_POINTS)
        with self.assertRaises(ValueError):
            prom.resolve_window("2026-10-02T00:00:00Z", "2026-10-01T00:00:00Z", None)
        with self.assertRaises(ValueError):
            prom.resolve_window("2026-01-01T00:00:00Z", "2026-10-01T00:00:00Z", None)

    @override_settings(PROMETHEUS_URL="", METRICS_SAMPLE_DATA=False)
    def test_unconfigured_prometheus_reports_unavailable_not_fake_data(self):
        out = prom.device_timeseries(FakeDevice())
        self.assertEqual(out["source"], "unavailable")
        self.assertEqual(out["series"], [])

    @override_settings(PROMETHEUS_URL=PROM)
    def test_query_range_request_and_parsing(self):
        with mock.patch("apps.monitoring.prometheus.requests.get", return_value=_ok([[1, "12.5"], [2, "NaN"], [3, "13"]])) as get:
            out = prom.device_timeseries(FakeDevice(), metrics={"cpu"})
        self.assertEqual(out["source"], "prometheus")
        self.assertEqual(out["series"][0]["points"], [[1.0, 12.5], [3.0, 13.0]])
        url = get.call_args.args[0]
        params = get.call_args.kwargs["params"]
        self.assertEqual(url, f"{PROM}/api/v1/query_range")
        self.assertIn('node_cpu_seconds_total{mode="idle",instance=~', params["query"])
        self.assertIn("[60s]", params["query"])


@override_settings(PROMETHEUS_URL=PROM)
class MetricsApiTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_demo")
        with all_tenants():
            cls.device = InfraDevice.objects.filter(agent__contains="node-exporter").first()
            InfraDevice.objects.filter(pk=cls.device.pk).update(tenant_id="fyers")
            cls.vm = VirtualMachine.objects.first()

    def setUp(self):
        self.client = APIClient()

    def test_device_metrics_endpoint(self):
        with mock.patch("apps.monitoring.prometheus.requests.get", return_value=_ok([[1, "5"]])):
            res = self.client.get(f"/api/infra/devices/{self.device.pk}/metrics/",
                                  {"metrics": "cpu,mem", "start": "2026-10-20T00:00:00Z", "end": "2026-10-21T00:00:00Z"},
                                  HTTP_X_TENANT_ID="fyers")
        self.assertEqual(res.status_code, 200, res.content)
        body = res.json()
        self.assertEqual(body["family"], "node")
        self.assertEqual([s["key"] for s in body["series"]], ["cpu", "mem"])
        self.assertEqual(body["step"], 144)  # 24h / 600 points

    def test_bad_range_is_400(self):
        res = self.client.get(f"/api/infra/devices/{self.device.pk}/metrics/", {"start": "yesterday"},
                              HTTP_X_TENANT_ID="fyers")
        self.assertEqual(res.status_code, 400)

    def test_other_tenant_cannot_read_device_metrics(self):
        res = self.client.get(f"/api/infra/devices/{self.device.pk}/metrics/", HTTP_X_TENANT_ID="indmoney")
        self.assertEqual(res.status_code, 404)

    def test_vm_metrics_endpoint(self):
        with mock.patch("apps.monitoring.prometheus.requests.get", return_value=_ok([[1, "4100"]])) as get:
            res = self.client.get(f"/api/infra/vms/{self.vm.pk}/metrics/", {"metrics": "cpu"},
                                  HTTP_X_TENANT_ID=self.vm.tenant_id or "fyers")
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res.json()["family"], "vmware-vm")
        self.assertIn(f'vm_name="{self.vm.pk}"', get.call_args.kwargs["params"]["query"])

    def test_prometheus_error_is_reported(self):
        with mock.patch("apps.monitoring.prometheus.requests.get", side_effect=prom.requests.ConnectionError("refused")):
            res = self.client.get(f"/api/infra/devices/{self.device.pk}/metrics/", HTTP_X_TENANT_ID="fyers")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["source"], "unavailable")
        self.assertIn("refused", res.json()["message"])
