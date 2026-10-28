"""check_monitoring management command (Prometheus / Loki connectivity report)."""
from io import StringIO
from unittest import mock

from django.core.management import call_command
from django.test import TestCase, override_settings

from apps.monitoring.test_inventory import _resp, _vector


@override_settings(PROMETHEUS_URL="http://prom.test", LOKI_URL="")
class CheckMonitoringTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_demo", stdout=StringIO())

    def _get(self, url, params=None, **kw):
        if url.endswith("/status/buildinfo"):
            return _resp({"status": "success", "data": {"version": "2.53.0"}})
        q = (params or {}).get("query", "")
        if q.startswith("count by (job)") or q.startswith("sum by (job)"):
            return _vector([({"job": "node"}, 3)])
        if q.startswith("count(node_cpu_seconds_total{"):
            return _vector([({}, 8)])
        if q.startswith("count("):
            return _vector([])
        raise AssertionError(q)

    def test_report(self):
        out = StringIO()
        with mock.patch("apps.monitoring.prometheus.requests.get", side_effect=self._get):
            call_command("check_monitoring", stdout=out)
        text = out.getvalue()
        self.assertIn("Prometheus 2.53.0", text)
        self.assertIn("node: 3/3", text)
        self.assertIn("devices have metrics", text)
        self.assertIn("LOKI_URL is not set", text)

    @override_settings(PROMETHEUS_URL="")
    def test_unconfigured_exits_1(self):
        with self.assertRaises(SystemExit) as cm:
            call_command("check_monitoring", stdout=StringIO())
        self.assertEqual(cm.exception.code, 1)
