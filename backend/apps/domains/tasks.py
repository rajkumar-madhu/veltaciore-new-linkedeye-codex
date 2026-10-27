"""Periodic domain checks (Celery beat: apps.domains.tasks.check_domains)."""
from celery import shared_task

from apps.tenants.context import system_task


@shared_task
@system_task  # checks every tenant's domains
def check_domains() -> int:
    from .checks import run_check
    from .models import MonitoredDomain

    n = 0
    for d in MonitoredDomain.objects.filter(active=True).prefetch_related("services"):
        run_check(d)
        n += 1
    return n
