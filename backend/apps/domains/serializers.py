import re

from rest_framework import serializers

from apps.apm.models import Service
from apps.infra.models import InfraDevice

from .models import DomainService, MonitoredDomain, ServiceDomain

HOSTNAME = re.compile(r"^(?=.{1,253}$)(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$")


class DomainServiceSerializer(serializers.ModelSerializer):
    port = serializers.IntegerField(min_value=1, max_value=65535)

    class Meta:
        model = DomainService
        fields = ["id", "name", "type", "port", "up", "response_ms", "last_checked"]
        read_only_fields = ["id", "up", "response_ms", "last_checked"]


class _SharedField(serializers.SerializerMethodField):
    """True for shared rows (no client): visible to every client, editable
    only from the all-clients scope."""

    def to_representation(self, obj):
        return obj.tenant_id is None


class MonitoredDomainSerializer(serializers.ModelSerializer):
    services = DomainServiceSerializer(many=True, required=False)
    shared = _SharedField()
    ssl_port = serializers.IntegerField(min_value=1, max_value=65535, required=False)

    class Meta:
        model = MonitoredDomain
        fields = [
            "id", "name", "type", "site", "description", "active", "check_ssl", "ssl_port",
            "dns_status", "resolved_ips", "ssl_status", "ssl_expiry", "ssl_issuer", "check_error",
            "last_checked", "created_at", "updated_at", "services", "shared",
        ]
        read_only_fields = [
            "id", "dns_status", "resolved_ips", "ssl_status", "ssl_expiry", "ssl_issuer",
            "check_error", "last_checked", "created_at", "updated_at",
        ]
        # Uniqueness per client is checked in validate_name (the tenant is not a field).
        validators = []

    def validate_name(self, value: str) -> str:
        name = value.strip().lower().rstrip(".")
        if not HOSTNAME.match(name):
            raise serializers.ValidationError("Enter a domain name such as app.example.com.")
        qs = MonitoredDomain.objects.filter(name=name)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("This domain is already monitored.")
        return name

    def _save_services(self, domain, services):
        if services is None:
            return
        domain.services.all().delete()
        DomainService.objects.bulk_create(DomainService(domain=domain, **s) for s in services)

    def create(self, validated):
        services = validated.pop("services", [])
        domain = MonitoredDomain.objects.create(**validated)
        self._save_services(domain, services)
        return domain

    def update(self, instance, validated):
        services = validated.pop("services", None)
        for k, v in validated.items():
            setattr(instance, k, v)
        instance.save()
        self._save_services(instance, services)
        return instance


class ServiceDomainSerializer(serializers.ModelSerializer):
    # Querysets are tenant-scoped at validation time, so a client can only
    # attach its own (or shared) services and devices.
    services = serializers.PrimaryKeyRelatedField(many=True, required=False, queryset=Service.objects.all())
    devices = serializers.PrimaryKeyRelatedField(many=True, required=False, queryset=InfraDevice.objects.all())
    device_kinds = serializers.ListField(child=serializers.CharField(max_length=32), required=False)
    key = serializers.SlugField(max_length=64, required=False)
    shared = _SharedField()

    class Meta:
        model = ServiceDomain
        fields = ["id", "key", "name", "description", "icon", "order", "services", "devices", "device_kinds", "shared"]
        read_only_fields = ["id"]
        validators = []

    def validate_icon(self, value: str) -> str:
        if not re.fullmatch(r"fa-[a-z0-9-]{1,40}", value):
            raise serializers.ValidationError("Use a Font Awesome icon name such as fa-chart-line.")
        return value

    def validate(self, attrs):
        from django.utils.text import slugify

        key = attrs.get("key") or (None if self.instance else slugify(attrs.get("name", "")))
        if key is not None:
            if not key:
                raise serializers.ValidationError({"name": "Enter a name."})
            qs = ServiceDomain.objects.filter(key=key)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError({"key": "A domain with this name already exists."})
            attrs["key"] = key
        return attrs
