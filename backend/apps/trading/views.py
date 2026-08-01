"""Trading Ops endpoints, shaped exactly as the frontend hooks expect."""
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    BrokerClient,
    CtclLine,
    LatencyHourly,
    LatencySegment,
    MarketDay,
    OrderLatencyRecord,
)


class LatencyHourlyView(APIView):
    def get(self, request):
        rows = LatencyHourly.objects.all()
        return Response([
            {
                "label": r.label, "orders": r.orders,
                "oms_med": r.oms_med, "oms_p99": r.oms_p99,
                "exch_med": r.exch_med, "exch_p99": r.exch_p99,
            }
            for r in rows
        ])


class LatencySegmentsView(APIView):
    def get(self, request):
        rows = LatencySegment.objects.all()
        return Response([
            {
                "seg": r.seg, "count": r.count, "pct": r.pct,
                "oms_med": r.oms_med, "oms_p99": r.oms_p99,
                "exch_med": r.exch_med, "exch_p99": r.exch_p99,
            }
            for r in rows
        ])


class OrderRecordsView(APIView):
    def get(self, request):
        rows = OrderLatencyRecord.objects.all()[:200]
        return Response([
            {
                "ord": r.noren_ord_num, "seg": r.exch_seg, "rmks": r.ext_rmks,
                "oms": r.oms_status,
                "lat": r.oms_latency if r.oms_latency is not None else "",
                "exch": r.exch_status if r.exch_status is not None else "",
                "conf": r.oms_exch_confirmation,
                "omsT": r.oms_update_time, "exchT": r.exch_update_time,
            }
            for r in rows
        ])


class CtclLinesView(APIView):
    def get(self, request):
        rows = CtclLine.objects.all()
        return Response([
            {
                "id": r.id, "segment": r.segment, "role": r.role,
                "samples": r.samples, "status": r.status, "series": r.series,
            }
            for r in rows
        ])


class MarketCalendarView(APIView):
    def get(self, request):
        rows = MarketDay.objects.all()
        return Response([
            {"date": r.date, "kind": r.kind, "name": r.name, "segments": r.segments}
            for r in rows
        ])


class BrokersView(APIView):
    def get(self, request):
        rows = BrokerClient.objects.all()
        return Response([
            {
                "n": r.name, "ctcls": r.ctcls,
                "nse": int(r.nse), "nfo": int(r.nfo),
                "bse": int(r.bse), "bfo": int(r.bfo),
            }
            for r in rows
        ])
