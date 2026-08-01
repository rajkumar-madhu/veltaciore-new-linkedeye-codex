"""Record mutating API requests in AuditLog (best-effort, never blocks)."""
import logging

log = logging.getLogger(__name__)


class AuditMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if request.method in ("POST", "PUT", "PATCH", "DELETE") and request.path.startswith("/api/"):
            try:
                from .models import AuditLog

                AuditLog.objects.create(
                    tenant_id=getattr(request, "tenant_id", None),
                    user=getattr(getattr(request, "user", None), "username", "") or "",
                    method=request.method,
                    path=request.path[:255],
                    status=response.status_code,
                    ip=request.META.get("REMOTE_ADDR"),
                )
            except Exception:  # pragma: no cover — audit must never break requests
                log.exception("audit write failed")
        return response
