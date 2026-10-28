"""Demo domains for seed_demo. Names, types and ports only; DNS / certificate
/ port state stays "Unknown" until a real check runs."""

PORTS = [("Web Portal", "HTTP", 80), ("API", "HTTPS", 443), ("Database", "MySQL", 3306),
         ("Application", "Application", 8080), ("Monitoring", "Node Exporter", 9100)]


def _svc(base, sl=slice(None)):
    return [{"name": f"{base} {n}", "type": t, "port": p} for n, t, p in PORTS[sl]]


DOMAINS = [
    ("nse.finspot.in", "Production", "Mumbai (NSE)", "NSE trading platform main domain", True, _svc("NSE")),
    ("bse.finspot.in", "Production", "Mumbai (BSE)", "BSE trading platform domain", True, _svc("BSE")),
    ("mcx.finspot.in", "Production", "Mumbai (MCX)", "MCX commodities platform domain", True, _svc("MCX")),
    ("cdsl.finspot.in", "Production", "Mumbai (CDSL)", "CDSL depository integration", True, _svc("CDSL", slice(0, 3))),
    ("nsdl.finspot.in", "Production", "Mumbai (NSDL)", "NSDL depository integration", True, _svc("NSDL", slice(0, 3))),
    ("app.wecrew.in", "Application", "DR Site", "WeCrew customer application", True, _svc("App", slice(0, 2))),
    ("api.wecrew.in", "API", "Mumbai (NSE)", "WeCrew public API gateway", True, _svc("API", slice(1, 2))),
    ("monitoring.wecrew.in", "Monitoring", "All Sites", "LinkedEye monitoring endpoint", True, _svc("Monitoring", slice(4, None))),
    ("backup.finspot.in", "Backup", "DR Site", "Backup and archival service", True, []),
    ("vpn.finspot.in", "VPN", "Mumbai (NSE)", "Remote access VPN gateway", True, []),
    ("mail.wecrew.in", "Mail", "All Sites", "Corporate mail relay", False, [{"name": "SMTP Relay", "type": "SMTP", "port": 587}]),
    ("test.finspot.in", "Test", "Chennai", "Pre-production test environment", True, _svc("Test", slice(0, 2))),
]

# Business domains for the heatmap: (key, name, description, icon, device kinds, all services?)
SERVICE_DOMAINS = [
    ("applications", "Applications", "Business services traced by APM", "fa-cubes", [], True),
    ("network", "Network", "Switching, routing, firewalls and load balancing", "fa-network-wired",
     ["switch", "router", "firewall", "loadbal"], False),
    ("compute", "Compute", "Physical, Windows and Linux servers and hypervisors", "fa-server",
     ["phys-srv", "win-srv", "linux-srv", "hypervisor", "idrac", "ilo"], False),
    ("storage", "Storage & Power", "Storage arrays, UPS and power", "fa-hard-drive", ["storage", "ups"], False),
    ("monitoring", "Monitoring", "Exporters and probes that collect the data", "fa-tower-broadcast", ["exporter"], False),
]


def seed():
    from apps.apm.models import Service

    from .models import DomainService, MonitoredDomain, ServiceDomain

    for name, type_, site, desc, active, services in DOMAINS:
        d, _ = MonitoredDomain.objects.update_or_create(
            tenant=None, name=name, defaults={"type": type_, "site": site, "description": desc, "active": active})
        if not d.services.exists():
            DomainService.objects.bulk_create(DomainService(domain=d, **s) for s in services)
    for order, (key, name, desc, icon, kinds, all_services) in enumerate(SERVICE_DOMAINS):
        sd, _ = ServiceDomain.objects.update_or_create(
            tenant=None, key=key, defaults={"name": name, "description": desc, "icon": icon, "order": order, "device_kinds": kinds})
        if all_services:
            sd.services.set(Service.objects.all())
