"""Aggregated ITSM router: /api/incidents/, /api/problems/, /api/changes/,
/api/cmdb/config-items/, /api/knowledge/articles/, /api/slas/, /api/services/,
/api/audit/events/."""
from rest_framework.routers import DefaultRouter

from apps.apm.views import ServiceViewSet
from apps.audit.views import AuditEventViewSet
from apps.changes.views import ChangeViewSet, SnChangeRecordViewSet
from apps.cmdb.views import ArticleViewSet, ConfigItemViewSet
from apps.incidents.views import IncidentViewSet, SlaViewSet, SnIncidentRecordViewSet
from apps.problems.views import ProblemViewSet, SnProblemRecordViewSet

router = DefaultRouter()
router.register("incidents/records", SnIncidentRecordViewSet, basename="incident-record")
router.register("incidents", IncidentViewSet, basename="incident")
router.register("problems/records", SnProblemRecordViewSet, basename="problem-record")
router.register("problems", ProblemViewSet, basename="problem")
router.register("changes/records", SnChangeRecordViewSet, basename="change-record")
router.register("changes", ChangeViewSet, basename="change")
router.register("cmdb/config-items", ConfigItemViewSet, basename="config-item")
router.register("knowledge/articles", ArticleViewSet, basename="article")
router.register("slas", SlaViewSet, basename="sla")
router.register("services", ServiceViewSet, basename="service")
router.register("audit/events", AuditEventViewSet, basename="audit-event")

urlpatterns = router.urls
