"""DNS, TLS certificate and port checks for MonitoredDomain.

Each probe has a short timeout so a check of a whole client's domains stays
bounded. Results are written back on the model; nothing is invented when a
probe cannot run (the state says Error with the reason).
"""
import socket
import ssl
import time
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeout
from datetime import datetime, timezone

from django.conf import settings

TIMEOUT = 5.0
_pool = ThreadPoolExecutor(max_workers=8, thread_name_prefix="domain-check")


def warn_days() -> int:
    return int(getattr(settings, "DOMAIN_SSL_WARN_DAYS", 30))


def resolve(name: str) -> list[str]:
    """Addresses for ``name``; raises OSError on failure. getaddrinfo has no
    timeout of its own, so it runs on a worker with one."""
    fut = _pool.submit(socket.getaddrinfo, name, None, 0, socket.SOCK_STREAM)
    try:
        infos = fut.result(timeout=TIMEOUT)
    except FutureTimeout as e:
        raise OSError("DNS lookup timed out") from e
    seen: list[str] = []
    for info in infos:
        ip = info[4][0]
        if ip not in seen:
            seen.append(ip)
    return seen


def certificate(name: str, port: int) -> dict:
    """{'expiry': datetime, 'issuer': str} of the verified certificate."""
    ctx = ssl.create_default_context()
    with socket.create_connection((name, port), timeout=TIMEOUT) as sock:
        with ctx.wrap_socket(sock, server_hostname=name) as tls:
            cert = tls.getpeercert()
    expiry = datetime.fromtimestamp(ssl.cert_time_to_seconds(cert["notAfter"]), tz=timezone.utc)
    issuer = dict(x[0] for x in cert.get("issuer", ()))
    return {"expiry": expiry, "issuer": issuer.get("organizationName") or issuer.get("commonName", "")}


def port_open(host: str, port: int) -> float | None:
    """Connect time in ms, or None when the port does not accept a connection."""
    start = time.monotonic()
    try:
        with socket.create_connection((host, port), timeout=TIMEOUT):
            return round((time.monotonic() - start) * 1000, 1)
    except OSError:
        return None


def ssl_state(expiry: datetime, now: datetime) -> str:
    days = (expiry - now).total_seconds() / 86400
    return "Expired" if days < 0 else "Expiring" if days <= warn_days() else "Valid"


def run_check(domain) -> None:
    """Check one domain and save the results on it and its services."""
    now = datetime.now(timezone.utc)
    errors: list[str] = []
    try:
        domain.resolved_ips = resolve(domain.name)
        domain.dns_status = "Resolved"
    except OSError as e:
        domain.resolved_ips = []
        domain.dns_status = "Error"
        errors.append(f"DNS: {e}")

    if not domain.check_ssl:
        domain.ssl_status = "Off"
    elif domain.dns_status != "Resolved":
        domain.ssl_status = "Unknown"
    else:
        try:
            cert = certificate(domain.name, domain.ssl_port)
            domain.ssl_expiry = cert["expiry"]
            domain.ssl_issuer = cert["issuer"][:255]
            domain.ssl_status = ssl_state(cert["expiry"], now)
        except ssl.SSLCertVerificationError as e:
            # Verification fails for an expired certificate too; say which.
            domain.ssl_status = "Expired" if getattr(e, "verify_code", None) == 10 else "Error"
            errors.append(f"SSL: {getattr(e, 'verify_message', None) or e}")
        except (OSError, ssl.SSLError, ValueError, KeyError) as e:
            domain.ssl_status = "Error"
            errors.append(f"SSL: {e}")

    for svc in domain.services.all():
        ms = port_open(domain.name, svc.port) if domain.dns_status == "Resolved" else None
        svc.up = ms is not None
        svc.response_ms = ms
        svc.last_checked = now
        svc.save(update_fields=["up", "response_ms", "last_checked"])

    domain.check_error = "; ".join(errors)[:500]
    domain.last_checked = now
    domain.save(update_fields=["dns_status", "resolved_ips", "ssl_status", "ssl_expiry", "ssl_issuer",
                               "check_error", "last_checked", "updated_at"])
