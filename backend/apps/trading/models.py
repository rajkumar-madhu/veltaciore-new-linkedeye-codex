from django.db import models

from apps.tenants.models import TenantScopedModel


class LatencyHourly(models.Model):
    """Hourly OMS/exchange latency rollup for one trading day."""

    day = models.DateField()
    label = models.CharField(max_length=8)  # "09:30"
    orders = models.PositiveIntegerField(default=0)
    oms_med = models.FloatField(default=0)
    oms_p99 = models.FloatField(default=0)
    exch_med = models.FloatField(default=0)
    exch_p99 = models.FloatField(default=0)

    class Meta:
        ordering = ["day", "label"]
        unique_together = [("day", "label")]


class LatencySegment(models.Model):
    day = models.DateField()
    seg = models.CharField(max_length=8)  # NFO/BFO/NSE/BSE
    count = models.PositiveIntegerField(default=0)
    pct = models.FloatField(default=0)
    oms_med = models.FloatField(default=0)
    oms_p99 = models.FloatField(default=0)
    exch_med = models.FloatField(default=0)
    exch_p99 = models.FloatField(default=0)

    class Meta:
        ordering = ["day", "-count"]
        unique_together = [("day", "seg")]


class OrderLatencyRecord(models.Model):
    """One row of the L_ORDERLATENCY EOD CSV (9-column schema)."""

    noren_ord_num = models.CharField(primary_key=True, max_length=16)
    exch_seg = models.CharField(max_length=8)
    ext_rmks = models.CharField(max_length=32, blank=True, default="")
    oms_status = models.PositiveSmallIntegerField()  # 65/56/48/45/70
    oms_latency = models.FloatField(null=True, blank=True)  # µs; null when unknown
    exch_status = models.PositiveSmallIntegerField(null=True, blank=True)  # 48 or null
    oms_exch_confirmation = models.FloatField(default=0)  # µs; 0 when unconfirmed
    oms_update_time = models.BigIntegerField(default=0)  # epoch
    exch_update_time = models.BigIntegerField(default=0)  # epoch; 0 = sentinel

    class Meta:
        ordering = ["noren_ord_num"]


class CtclLine(models.Model):
    """A CTCL adapter line whose queue depth is sampled through the day."""

    id = models.CharField(primary_key=True, max_length=24)  # NSE-5864
    segment = models.CharField(max_length=8)
    role = models.CharField(max_length=32)
    samples = models.PositiveIntegerField(null=True, blank=True)
    status = models.CharField(max_length=24, default="Active")
    series = models.JSONField(default=list)  # queue depth per 15-min bucket; null = no data
    position = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["position", "id"]


class BrokerClient(TenantScopedModel):
    """A broker routing through Noren OMS via per-segment CTCL codes."""

    name = models.CharField(primary_key=True, max_length=64)
    ctcls = models.JSONField(default=dict)  # {n1, n2, nf1, nf2, bse, bfo}
    nse = models.BooleanField(default=True)
    nfo = models.BooleanField(default=True)
    bse = models.BooleanField(default=True)
    bfo = models.BooleanField(default=True)
    position = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["position", "name"]


class MarketDay(models.Model):
    """A 2026 exchange trading holiday or mock (test) session, per segment.
    From holiday_calendar_2026.csv / mock_calendar_2026.csv."""

    date = models.CharField(max_length=10)   # ISO "2026-01-26"
    kind = models.CharField(max_length=8, default="holiday")  # holiday | mock
    name = models.CharField(max_length=80, blank=True, default="")
    segments = models.JSONField(default=list)  # ["NSE", "NFO", ...]

    class Meta:
        ordering = ["date"]
