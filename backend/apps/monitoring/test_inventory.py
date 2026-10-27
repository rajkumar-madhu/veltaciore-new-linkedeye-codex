"""Inventory (processes / services / filesystems), BMC hardware and Loki logs."""
from unittest import mock

from django.core.management import call_command
from django.test import SimpleTestCase, TestCase, override_settings
from rest_framework.test import APIClient

from apps.infra.models import InfraDevice
from apps.monitoring import loki
from apps.monitoring import prometheus as prom
from apps.monitoring.test_prometheus import PROM, FakeDevice
from apps.tenants.context import all_tenants


def _resp(body):
    r = mock.Mock()
    r.raise_for_status.return_value = None
    r.json.return_value = body
    return r


def _vector(rows):
    return _resp({"status": "success", "data": {"result": [{"metric": m, "value": [0, str(v)]} for m, v in rows]}})


def _matrix(values):
    return _resp({"status": "success", "data": {"result": [{"values": values}]}})


@override_settings(PROMETHEUS_URL=PROM)
class InventoryTests(SimpleTestCase):
    def _fake_get(self, url, params, **kw):
        q = params["query"]
        if "windows_process_cpu_time_total" in q:
            return _vector([({"process": "sqlservr"}, 4.3), ({"process": "w3wp"}, 2.1)])
        if "windows_process_working_set_private_bytes" in q:
            return _vector([({"process": "sqlservr"}, 1.8e9), ({"process": "w3wp"}, 5.12e8)])
        if "windows_process_threads" in q:
            return _vector([({"process": "sqlservr"}, 112)])
        if "windows_service_start_mode" in q:
            return _vector([({"name": "spooler", "start_mode": "auto"}, 1), ({"name": "wuauserv", "start_mode": "manual"}, 1)])
        if "windows_service_state" in q:
            return _vector([({"name": "w3svc", "state": "running"}, 1), ({"name": "spooler", "state": "stopped"}, 1),
                            ({"name": "wuauserv", "state": "stopped"}, 1)])
        if "windows_logical_disk_size_bytes" in q:
            return _vector([({"volume": "C:"}, 200e9), ({"volume": "D:"}, 0)])
        if "windows_logical_disk_free_bytes" in q:
            return _vector([({"volume": "C:"}, 50e9)])
        raise AssertionError(q)

    def test_windows_inventory(self):
        dev = FakeDevice(device_type="win-srv", agent="win-exporter")
        with mock.patch("apps.monitoring.prometheus.requests.get", side_effect=self._fake_get) as get:
            out = prom.device_inventory(dev, top=5)
        self.assertEqual(out["source"], "prometheus")
        self.assertEqual(out["processes"][0], {"name": "sqlservr", "cpu": 4.3, "mem_bytes": 1.8e9, "threads": 112.0})
        self.assertIsNone(out["processes"][1]["threads"])
        # A stopped auto-start service is a problem; a stopped manual one is not.
        self.assertEqual((out["services"]["running"], out["services"]["stopped"], out["services"]["other"]), (1, 1, 1))
        self.assertEqual(out["services"]["problems"], [{"name": "spooler", "state": "stopped", "start_mode": "auto"}])
        self.assertEqual(out["filesystems"], [{"mount": "C:", "size_bytes": 200e9, "used_bytes": 150e9, "used_pct": 75.0}])
        first = get.call_args_list[0]
        self.assertEqual(first.args[0], f"{PROM}/api/v1/query")
        self.assertIn("topk(5,", first.kwargs["params"]["query"])

    def test_unsupported_family(self):
        out = prom.device_inventory(FakeDevice(device_type="switch", agent="snmp"))
        self.assertEqual(out["source"], "unsupported")

    @override_settings(PROMETHEUS_URL="", METRICS_SAMPLE_DATA=False)
    def test_unconfigured(self):
        out = prom.device_inventory(FakeDevice())
        self.assertEqual(out["source"], "unavailable")
        self.assertEqual(out["processes"], [])


class LokiTests(SimpleTestCase):
    def test_selector_and_search_are_escaped(self):
        q = loki.build_query(FakeDevice(hostname='web"01'), search='a" } |= "b')
        self.assertEqual(q, r'{host="web\"01"} |= "a\" } |= \"b"')

    @override_settings(LOKI_HOST_LABEL="bad label")
    def test_bad_host_label_rejected(self):
        with self.assertRaises(ValueError):
            loki.stream_selector(FakeDevice())

    @override_settings(LOKI_URL="", METRICS_SAMPLE_DATA=False)
    def test_unconfigured(self):
        self.assertEqual(loki.device_logs(FakeDevice())["source"], "unavailable")

    @override_settings(LOKI_URL="http://loki.test", LOKI_ORG_ID="fyers")
    def test_parse_levels_and_filter(self):
        body = {"status": "success", "data": {"result": [
            {"stream": {"host": "DEV-1", "source": "System"}, "values": [
                ["1760000000000000000", '{"levelText":"Error","message":"Disk C: is 92% full","event_id":2013}'],
                ["1760000060000000000", "Service Control Manager: service entered the running state"],
            ]},
            {"stream": {"host": "DEV-1", "level": "warn"}, "values": [["1760000030000000000", "Inlet temperature high"]]},
        ]}}
        with mock.patch("apps.monitoring.loki.requests.get", return_value=_resp(body)) as get:
            out = loki.device_logs(FakeDevice(), start="2025-10-09T00:00:00Z", end="2025-10-10T00:00:00Z")
        self.assertEqual(out["source"], "loki")
        self.assertEqual([e["level"] for e in out["entries"]], ["info", "warning", "error"])
        self.assertEqual(out["entries"][2]["message"], "Disk C: is 92% full")
        self.assertEqual(out["entries"][2]["event_id"], 2013)
        self.assertEqual(get.call_args.kwargs["headers"]["X-Scope-OrgID"], "fyers")
        with mock.patch("apps.monitoring.loki.requests.get", return_value=_resp(body)):
            only = loki.device_logs(FakeDevice(), level="error")
        self.assertEqual(len(only["entries"]), 1)


@override_settings(PROMETHEUS_URL=PROM)
class HardwareApiTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_demo")
        with all_tenants():
            cls.bmc = InfraDevice.objects.filter(device_type__in=["idrac", "ilo"]).select_related("managed_by").first()
            cls.server = cls.bmc.managed_by
            # Seed devices are shared (no tenant); give both an explicit owner.
            InfraDevice.objects.filter(pk__in=[cls.bmc.pk, cls.server.pk]).update(tenant_id="fyers")
            cls.server.refresh_from_db()

    def setUp(self):
        self.client = APIClient()

    def test_hardware_reads_linked_bmc(self):
        values = [[1, "1"], [2, "1"]]
        with mock.patch("apps.monitoring.prometheus.requests.get", return_value=_matrix(values)) as get:
            res = self.client.get(f"/api/infra/devices/{self.server.pk}/hardware/", HTTP_X_TENANT_ID=self.server.tenant_id)
        self.assertEqual(res.status_code, 200, res.content)
        body = res.json()
        self.assertEqual(body["source"], "prometheus")
        ctl = body["controllers"][0]
        self.assertEqual((ctl["id"], ctl["health"]), (self.bmc.pk, "ok"))
        self.assertEqual([s["key"] for s in ctl["sensors"]], ["temperature", "fan", "power"])
        self.assertIn(f'instance="{self.bmc.ip_address}"', get.call_args.kwargs["params"]["query"])

    def test_bmc_of_another_tenant_is_not_read(self):
        with all_tenants():
            InfraDevice.objects.filter(pk=self.bmc.pk).update(tenant_id="indmoney")
        try:
            res = self.client.get(f"/api/infra/devices/{self.server.pk}/hardware/", HTTP_X_TENANT_ID=self.server.tenant_id)
            self.assertEqual(res.json()["source"], "none")
        finally:
            with all_tenants():
                InfraDevice.objects.filter(pk=self.bmc.pk).update(tenant_id="fyers")

    def test_inventory_and_logs_endpoints(self):
        with mock.patch("apps.monitoring.prometheus.requests.get", return_value=_vector([])):
            res = self.client.get(f"/api/infra/devices/{self.server.pk}/inventory/", {"top": "x"},
                                  HTTP_X_TENANT_ID=self.server.tenant_id)
        self.assertEqual(res.status_code, 400)
        with override_settings(LOKI_URL="", METRICS_SAMPLE_DATA=False):
            res = self.client.get(f"/api/infra/devices/{self.server.pk}/logs/", HTTP_X_TENANT_ID=self.server.tenant_id)
        self.assertEqual(res.json()["source"], "unavailable")


class FakeVm:
    id = "VM-APP-01"
    tenant_id = "fyers"


@override_settings(PROMETHEUS_URL=PROM)
class VmInventoryTests(SimpleTestCase):
    def _get(self, url, params, **kw):
        q = params["query"]
        if q.startswith("vmware_vm_power_state"):
            return _vector([({"vm_name": "VM-APP-01", "host_name": "esxi-host-01", "ds_name": "DS01", "cluster_name": "Compute-01", "dc_name": "MUM"}, 1)])
        if "guest_tools_running_status" in q:
            return _vector([({"tools_status": "toolsOk"}, 1)])
        if "guest_tools_version" in q:
            return _vector([({"tools_version": "12.4.5"}, 1)])
        if "boot_timestamp" in q:
            return _vector([({}, 1758000000)])
        if "snapshot_timestamp" in q:
            return _vector([({"vm_snapshot_name": "weekly-backup"}, 1750723200), ({"vm_snapshot_name": "pre-upgrade"}, 1750846500)])
        if "guest_disk_capacity" in q:
            return _vector([({"partition": "/"}, 200e9), ({"partition": "/data"}, 0)])
        if "guest_disk_free" in q:
            return _vector([({"partition": "/"}, 50e9)])
        if "vmware_datastore_" in q:
            self.assertIn('ds_name="DS01"', q)
            return _vector([({}, 1.2e12)])
        raise AssertionError(q)

    def test_vm_inventory(self):
        with mock.patch("apps.monitoring.prometheus.requests.get", side_effect=self._get):
            out = prom.vm_inventory(FakeVm())
        self.assertEqual((out["source"], out["found"], out["host"], out["cluster"]), ("prometheus", True, "esxi-host-01", "Compute-01"))
        self.assertEqual(out["tools"], {"status": "toolsOk", "version": "12.4.5"})
        self.assertEqual([s["name"] for s in out["snapshots"]], ["pre-upgrade", "weekly-backup"])
        self.assertEqual(out["disks"], [{"partition": "/", "capacity_bytes": 200e9, "free_bytes": 50e9, "used_pct": 75.0}])
        self.assertEqual(out["datastore"]["name"], "DS01")

    def test_vm_not_in_prometheus(self):
        with mock.patch("apps.monitoring.prometheus.requests.get", return_value=_vector([])):
            out = prom.vm_inventory(FakeVm())
        self.assertEqual((out["source"], out["found"]), ("prometheus", False))

    @override_settings(PROMETHEUS_URL="", METRICS_SAMPLE_DATA=False)
    def test_unconfigured(self):
        self.assertEqual(prom.vm_inventory(FakeVm())["source"], "unavailable")


@override_settings(PROMETHEUS_URL=PROM)
class FleetLoadTests(SimpleTestCase):
    def test_matches_instances_to_devices_by_ip(self):
        a = FakeDevice(id="SRV-A", ip="10.0.0.1", device_type="linux-srv", agent="node-exporter")
        b = FakeDevice(id="WIN-B", ip="10.0.0.2", device_type="win-srv", agent="win-exporter")
        sw = FakeDevice(id="SW-C", ip="10.0.0.3", device_type="switch", agent="snmp")

        def get(url, params, **kw):
            q = params["query"]
            if "node_cpu" in q:
                return _vector([({"instance": "10.0.0.1:9100"}, 41.5)])
            if "node_memory" in q:
                return _vector([({"instance": "10.0.0.1:9100"}, 63.0)])
            if "windows_cpu" in q:
                return _vector([({"instance": "10.0.0.2:9182"}, 12.0)])
            if "windows_memory" in q:
                return _vector([])
            raise AssertionError(q)

        with mock.patch("apps.monitoring.prometheus.requests.get", side_effect=get):
            out = prom.fleet_load([a, b, sw])
        self.assertEqual(out["source"], "prometheus")
        self.assertEqual(sorted(out["devices"], key=lambda d: d["id"]),
                         [{"id": "SRV-A", "cpu": 41.5, "mem": 63.0}, {"id": "WIN-B", "cpu": 12.0, "mem": None}])

    @override_settings(PROMETHEUS_TENANT_LABEL="tenant")
    def test_tenant_label_limits_series(self):
        with mock.patch("apps.monitoring.prometheus.requests.get", return_value=_vector([])) as get:
            prom.fleet_load([FakeDevice(ip="10.0.0.1")])
        self.assertIn('tenant=~"fyers"', get.call_args_list[0].kwargs["params"]["query"])

    @override_settings(PROMETHEUS_URL="", METRICS_SAMPLE_DATA=False)
    def test_unconfigured(self):
        self.assertEqual(prom.fleet_load([FakeDevice()])["source"], "unavailable")
