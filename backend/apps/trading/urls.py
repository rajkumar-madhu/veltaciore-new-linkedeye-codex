from django.urls import path

from .views import (
    BrokersView,
    CtclLinesView,
    LatencyHourlyView,
    LatencySegmentsView,
    MarketCalendarView,
    OrderRecordsView,
)

urlpatterns = [
    path("latency/hourly/", LatencyHourlyView.as_view()),
    path("latency/segments/", LatencySegmentsView.as_view()),
    path("latency/orders/", OrderRecordsView.as_view()),
    path("ctcl/lines/", CtclLinesView.as_view()),
    path("ctcl/brokers/", BrokersView.as_view()),
    path("calendar/", MarketCalendarView.as_view()),
]
