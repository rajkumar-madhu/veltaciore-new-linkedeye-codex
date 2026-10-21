"""Append-only audit trail (apps.audit.models.AuditEvent / apps.audit.events)."""
from django.core.management import call_command
from django.db import DatabaseError, connection, transaction
from django.test import TestCase
from rest_framework.test import APIClient

from apps.audit.events import record, snapshot
from apps.audit.models import AppendOnlyError, AuditEvent
from apps.infra.models import InfraDevice
from apps.tenants.context import all_tenants, tenant_scope


class AuditTrailTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_demo")

    def _device(self):
        with all_tenants():
            return InfraDevice.objects.first()

    def test_record_stores_actor_entity_and_before_after(self):
        d = self._device()
        before = snapshot(d)
        d.role = "Core"
        with self.assertLogs("linkedeye.audit", level="INFO") as logs:
            ev = record("device.update", d, before=before, after=snapshot(d), actor="priya")
        self.assertEqual(ev.entity_type, "infra.infradevice")
        self.assertEqual(ev.entity_id, d.pk)
        self.assertEqual(ev.actor, "priya")
        self.assertNotEqual(ev.before["role"], "Core")
        self.assertEqual(ev.after["role"], "Core")
        self.assertIn('"action": "device.update"', logs.output[0])

    def test_events_cannot_be_updated_or_deleted_through_the_orm(self):
        ev = record("device.update", self._device(), actor="x")
        ev.reason = "tampered"
        with self.assertRaises(AppendOnlyError):
            ev.save()
        with self.assertRaises(AppendOnlyError):
            ev.delete()
        with all_tenants():
            with self.assertRaises(AppendOnlyError):
                AuditEvent.objects.filter(pk=ev.pk).update(reason="tampered")
            with self.assertRaises(AppendOnlyError):
                AuditEvent.objects.filter(pk=ev.pk).delete()

    def test_database_trigger_blocks_raw_update_and_delete(self):
        ev = record("device.update", self._device(), actor="x")
        for sql in (
            "UPDATE audit_auditevent SET reason = 'tampered' WHERE id = %s",
            "DELETE FROM audit_auditevent WHERE id = %s",
        ):
            with self.assertRaises(DatabaseError):
                with transaction.atomic(), connection.cursor() as cur:
                    cur.execute(sql, [ev.pk])
        self.assertEqual(AuditEvent.unscoped.get(pk=ev.pk).reason, "")

    def test_secret_fields_are_redacted_in_snapshots(self):
        from types import SimpleNamespace

        fields = [SimpleNamespace(attname=n) for n in ("hostname", "snmp_community", "api_key", "password_hash")]
        obj = SimpleNamespace(
            _meta=SimpleNamespace(concrete_fields=fields),
            hostname="sw-01", snmp_community="public", api_key="k-123", password_hash="x",
        )
        snap = snapshot(obj)
        self.assertEqual(snap["hostname"], "sw-01")
        for name in ("snmp_community", "api_key", "password_hash"):
            self.assertEqual(snap[name], "[redacted]", name)

    def test_events_are_tenant_scoped_and_listed_read_only(self):
        d = self._device()
        with all_tenants():
            other = InfraDevice.objects.exclude(tenant_id=d.tenant_id).exclude(tenant_id=None).first()
        record("device.update", d, actor="x")
        if other is not None:
            record("device.update", other, actor="y")
        client = APIClient()
        tenant = d.tenant_id or "fyers"
        res = client.get("/api/audit/events/", HTTP_X_TENANT_ID=tenant)
        self.assertEqual(res.status_code, 200)
        tenants = {row["tenant"] for row in res.json()["results"]}
        self.assertTrue(tenants <= {tenant, None})
        self.assertEqual(client.post("/api/audit/events/", {}, HTTP_X_TENANT_ID=tenant).status_code, 405)
        with tenant_scope(tenant):
            self.assertTrue(AuditEvent.objects.filter(actor="x").exists())
