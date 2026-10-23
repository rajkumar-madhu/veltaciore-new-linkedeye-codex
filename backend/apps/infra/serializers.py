"""Serializers emit the exact field names the frontend consumes."""
from rest_framework import serializers

from apps.sites.models import Rack, RackUnit, Site
from .models import (
    BodCheck,
    DeviceAlert,
    DeviceInterface,
    Exporter,
    InfraDevice,
    TopologyConnection,
    VirtualMachine,
)


class SiteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Site
        fields = ["id", "name", "region", "devices", "health"]


class RackUnitSerializer(serializers.ModelSerializer):
    uTop = serializers.IntegerField(source="u_top")
    uBottom = serializers.IntegerField(source="u_bottom")
    desc = serializers.CharField(source="description")
    device = serializers.SerializerMethodField()

    class Meta:
        model = RackUnit
        fields = [
            "uTop", "uBottom", "kind", "label", "desc", "model", "color",
            "icon", "status", "asset", "ip", "device", "chip",
        ]

    def get_device(self, obj: RackUnit):
        return obj.device_id or None


class RackSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source="name")
    role = serializers.CharField()
    powerKw = serializers.FloatField(source="power_kw")
    capacityKw = serializers.FloatField(source="capacity_kw")
    inletC = serializers.FloatField(source="inlet_c")
    exhaustC = serializers.FloatField(source="exhaust_c")
    upsRuntime = serializers.CharField(source="ups_runtime")
    units = RackUnitSerializer(source="rack_units", many=True)

    class Meta:
        model = Rack
        fields = [
            "id", "site", "row", "role", "powerKw", "capacityKw",
            "inletC", "exhaustC", "humidity", "upsRuntime", "units",
        ]


class DeviceSerializer(serializers.ModelSerializer):
    kind = serializers.CharField(source="device_type")
    ip = serializers.IPAddressField(source="ip_address")
    os = serializers.SerializerMethodField()
    iface = serializers.CharField(source="iface_summary")
    lastSeen = serializers.CharField(source="last_seen")
    site = serializers.PrimaryKeyRelatedField(read_only=True)
    # Lifecycle changes only via POST …/transition/ (OPA-checked, audited).
    lifecycleState = serializers.CharField(source="lifecycle_state", read_only=True)
    criticalityTier = serializers.CharField(source="criticality_tier", read_only=True)
    owningTeam = serializers.CharField(source="owning_team", read_only=True)

    class Meta:
        model = InfraDevice
        fields = [
            "id", "kind", "model", "site", "ip", "os", "uptime", "cpu", "mem",
            "status", "role", "iface", "throughput", "sessions", "lastSeen",
            "agent", "vendor", "serial_number", "hostname", "location",
            "monitoring_enabled", "snmp_profile", "exporter_type",
            "lifecycleState", "criticalityTier", "owningTeam",
        ]

    def get_os(self, obj: InfraDevice) -> str:
        return f"{obj.os_name} {obj.os_version}".strip()


class DeviceInterfaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeviceInterface
        exclude = ["device"]


class DeviceAlertSerializer(serializers.ModelSerializer):
    device = serializers.PrimaryKeyRelatedField(read_only=True)
    # Lets the UI open the right detail page without loading every device.
    deviceKind = serializers.CharField(source="device.device_type", read_only=True)
    site = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = DeviceAlert
        fields = [
            "id", "sev", "device", "deviceKind", "site", "title", "detail", "since", "rule",
            "acknowledged", "resolved",
        ]


class VmSerializer(serializers.ModelSerializer):
    host = serializers.PrimaryKeyRelatedField(read_only=True)
    cpuUse = serializers.FloatField(source="cpu_use")
    memUse = serializers.FloatField(source="mem_use")

    class Meta:
        model = VirtualMachine
        fields = [
            "id", "host", "cluster", "os", "cpu", "mem", "disk", "state",
            "cpuUse", "memUse", "ip",
        ]


class ExporterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Exporter
        fields = ["name", "version", "port", "protocol", "hosts", "scrapes", "lag", "status", "note", "sites"]


class BodCheckSerializer(serializers.ModelSerializer):
    class Meta:
        model = BodCheck
        fields = ["env", "kind", "target", "port", "code", "ssl_expiry", "ssl_days", "status", "remark", "note", "order"]


class TopologyConnectionSerializer(serializers.ModelSerializer):
    src = serializers.PrimaryKeyRelatedField(read_only=True)
    dst = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = TopologyConnection
        fields = ["src", "dst", "src_port", "dst_port", "bandwidth", "status"]
