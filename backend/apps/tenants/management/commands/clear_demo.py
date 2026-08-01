"""Purge all demo/seed data for a clean multi-tenant start.

This empties every seeded table (tenants, incidents, devices, trading, …) so a
deployment can be handed to real tenants with no sample data. It is fully
reversible: run `python manage.py seed_demo` to restore the demo dataset.

    python manage.py clear_demo            # purge everything
    python manage.py clear_demo --yes      # skip the confirmation prompt
"""
from django.core.management.base import BaseCommand
from django.db import transaction


class Command(BaseCommand):
    help = "Remove all seeded demo data (reversible via seed_demo)."

    def add_arguments(self, parser):
        parser.add_argument("--yes", action="store_true", help="Skip confirmation.")

    @transaction.atomic
    def handle(self, *args, **opts):
        from apps.apm.models import Service
        from apps.changes.models import ChangeRequest, SnChangeRecord
        from apps.cmdb.models import Article, ConfigItem
        from apps.incidents.models import Incident, Sla, SnIncidentRecord
        from apps.infra.models import (
            DeviceAlert, DeviceInterface, Exporter, InfraDevice, Site,
            TopologyConnection, VirtualMachine,
        )
        from apps.integrations.models import Integration
        from apps.accounts.models import Person
        from apps.problems.models import Problem, SnProblemRecord
        from apps.tenants.models import Tenant
        from apps.trading.models import (
            BrokerClient, CtclLine, LatencyHourly, LatencySegment,
            OrderLatencyRecord,
        )

        models = [
            DeviceInterface, DeviceAlert, VirtualMachine, TopologyConnection,
            InfraDevice, Site, Exporter, Incident, SnIncidentRecord, Sla,
            Problem, SnProblemRecord, ChangeRequest, SnChangeRecord, ConfigItem,
            Article, Service, Integration, Person, LatencyHourly, LatencySegment,
            OrderLatencyRecord, CtclLine, BrokerClient, Tenant,
        ]

        total = sum(m.objects.count() for m in models)
        if not opts["yes"]:
            confirm = input(f"This deletes {total} seeded rows across {len(models)} tables. Type 'yes' to proceed: ")
            if confirm.strip().lower() != "yes":
                self.stdout.write(self.style.WARNING("Aborted — nothing deleted."))
                return

        for m in models:
            m.objects.all().delete()

        self.stdout.write(self.style.SUCCESS(
            f"Cleared {total} rows. The platform is now empty and multi-tenant-ready. "
            "Run 'python manage.py seed_demo' to restore the demo dataset."
        ))
