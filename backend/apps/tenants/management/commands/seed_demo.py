"""Seed the database with the demo dataset shared with the frontend.

Loads backend/fixtures/seed.json (generated from the design prototype via
scripts/extract_fixtures.mjs) plus the Trading Ops datasets, so every API
endpoint returns exactly the data the design was built around.

Usage: python manage.py seed_demo [--flush]
"""
import json
import random
import zlib
from pathlib import Path

from django.core.management.base import BaseCommand

from apps.tenants.context import system_task

FIXTURES = Path(__file__).resolve().parents[4] / "fixtures" / "seed.json"

SN_INCIDENTS = [
    {"id": "INC-000001", "opened": "2026-04-24 06:32", "title": "SwitchPortDown — GM-SW Gi1/0/5 down, no link detecte…", "caller": "System (Alert)", "pri": 1, "state": "New", "category": "Network", "group": "NOC — Network Ops", "assignee": None, "sla": "breach", "updated": "2m ago", "critical": True},
    {"id": "INC-000002", "opened": "2026-04-24 06:26", "title": "ServerHighCPU — KVM2 (10.10.10.15) sustained CPU usa…", "caller": "System (Alert)", "pri": 1, "state": "Assigned", "category": "Server", "group": "Platform Engineering", "assignee": "Rajkumar M", "sla": "breach", "updated": "8m ago", "critical": True},
    {"id": "INC-000003", "opened": "2026-04-24 06:11", "title": "FortiGateSessionTableHigh — 100F-FW session table at 5…", "caller": "System (Alert)", "pri": 2, "state": "In Progress", "category": "Firewall", "group": "NOC — Network Ops", "assignee": "Siva K", "sla": "ok", "updated": "23m ago", "critical": False},
    {"id": "INC-000007", "opened": "2026-04-24 06:29", "title": "SwitchPortFlapping — MGMT-SW Gi1/0/3 flapped 6 times …", "caller": "System (Alert)", "pri": 1, "state": "New", "category": "Network", "group": "NOC — Network Ops", "assignee": None, "sla": "warn", "updated": "5m ago", "critical": False},
    {"id": "INC-000008", "opened": "2026-04-24 06:22", "title": "OOMKilled — pod-analytics-worker-7f8d9 terminated by K…", "caller": "System (Alert)", "pri": 2, "state": "New", "category": "Kubernetes", "group": "Platform Engineering", "assignee": None, "sla": "ok", "updated": "12m ago", "critical": False},
    {"id": "INC-000006", "opened": "2026-04-24 03:34", "title": "ServerDiskCritical — KVM1 /data partition at 92% utilization", "caller": "System (Alert)", "pri": 2, "state": "Assigned", "category": "Server", "group": "Platform Engineering", "assignee": "Edukondalu P", "sla": "ok", "updated": "3h ago", "critical": False},
    {"id": "INC-000005", "opened": "2026-04-24 04:34", "title": "TradingHighLatency — NSE Adapter OMS latency exceede…", "caller": "System (Alert)", "pri": 1, "state": "Resolved", "category": "Trading", "group": "Trading Systems", "assignee": "Rajkumar M", "sla": "met", "updated": "2h ago", "critical": False},
    {"id": "INC-000004", "opened": "2026-04-24 05:34", "title": "SSLCertExpiring — fs-le-dx.finspot.in certificate expires in …", "caller": "System (Alert)", "pri": 3, "state": "New", "category": "Security", "group": "Platform Engineering", "assignee": None, "sla": "ok", "updated": "1h ago", "critical": False},
]

SN_PROBLEMS = [
    {"id": "PRB-000001", "opened": "2026-04-22 09:14", "title": "Recurring SwitchPortFlapping on MGMT-SW Gi1/0/3", "caller": "Siva K", "pri": 1, "state": "New", "category": "Network", "group": "NOC — Network Ops", "assignee": None, "sla": "breach", "updated": "12m ago", "critical": True},
    {"id": "PRB-000002", "opened": "2026-04-21 14:02", "title": "KVM2 sustained CPU spikes during nightly batch", "caller": "Rajkumar M", "pri": 1, "state": "Assigned", "category": "Server", "group": "Platform Engineering", "assignee": "Edukondalu P", "sla": "breach", "updated": "1h ago", "critical": True},
    {"id": "PRB-000003", "opened": "2026-04-20 10:32", "title": "FortiGate session table climbs above 5M nightly", "caller": "Siva K", "pri": 2, "state": "Known Error", "category": "Firewall", "group": "NOC — Network Ops", "assignee": "Siva K", "sla": "ok", "updated": "2h ago", "critical": False},
    {"id": "PRB-000004", "opened": "2026-04-19 11:18", "title": "pod-analytics-worker repeatedly OOMKilled", "caller": "System", "pri": 2, "state": "In Progress", "category": "Kubernetes", "group": "Platform Engineering", "assignee": "Rajkumar M", "sla": "warn", "updated": "5h ago", "critical": False},
    {"id": "PRB-000005", "opened": "2026-04-18 16:42", "title": "OMS adapter latency exceeds 250ms on NSE feed", "caller": "Trading Ops", "pri": 1, "state": "Resolved", "category": "Trading", "group": "Trading Systems", "assignee": "Rajkumar M", "sla": "met", "updated": "1d ago", "critical": False},
    {"id": "PRB-000006", "opened": "2026-04-17 13:08", "title": "Certificate auto-rotation skipped for fs-le-dx", "caller": "Security", "pri": 3, "state": "New", "category": "Security", "group": "Platform Engineering", "assignee": None, "sla": "ok", "updated": "2d ago", "critical": False},
]

SN_CHANGES = [
    {"id": "CHG-000001", "opened": "2026-04-25 02:00", "title": "Replace failing switch GM-SW SFP module port Gi1/0/5", "caller": "Siva K", "pri": 1, "state": "Implement", "category": "Network", "group": "NOC — Network Ops", "assignee": "Siva K", "sla": "breach", "updated": "5m ago", "critical": True, "risk": "High"},
    {"id": "CHG-000002", "opened": "2026-04-24 22:00", "title": "Resize KVM2 memory from 64GB → 128GB", "caller": "Rajkumar M", "pri": 2, "state": "Scheduled", "category": "Server", "group": "Platform Engineering", "assignee": "Edukondalu P", "sla": "ok", "updated": "14m ago", "critical": False, "risk": "Medium"},
    {"id": "CHG-000003", "opened": "2026-04-24 18:30", "title": "FortiGate session table tuning to 8M entries", "caller": "Siva K", "pri": 2, "state": "CAB Review", "category": "Firewall", "group": "NOC — Network Ops", "assignee": "Siva K", "sla": "warn", "updated": "1h ago", "critical": False, "risk": "Medium"},
    {"id": "CHG-000004", "opened": "2026-04-24 14:00", "title": "Kubernetes 1.29 control plane upgrade prod-west", "caller": "Rajkumar M", "pri": 1, "state": "CAB Review", "category": "Kubernetes", "group": "Platform Engineering", "assignee": "Rajkumar M", "sla": "breach", "updated": "2h ago", "critical": True, "risk": "High"},
    {"id": "CHG-000005", "opened": "2026-04-24 10:00", "title": "Rotate SSL certificate fs-le-dx.finspot.in", "caller": "Security", "pri": 3, "state": "Approved", "category": "Security", "group": "Platform Engineering", "assignee": "Edukondalu P", "sla": "ok", "updated": "4h ago", "critical": False, "risk": "Low"},
    {"id": "CHG-000006", "opened": "2026-04-23 16:30", "title": "Increase NSE adapter connection pool 120 → 200", "caller": "Trading Ops", "pri": 1, "state": "Completed", "category": "Trading", "group": "Trading Systems", "assignee": "Rajkumar M", "sla": "met", "updated": "1d ago", "critical": False, "risk": "Medium"},
    {"id": "CHG-000007", "opened": "2026-04-23 09:00", "title": "Standard CDN cache invalidation — quarterly", "caller": "System", "pri": 3, "state": "Completed", "category": "CDN", "group": "Platform Engineering", "assignee": "System", "sla": "met", "updated": "1d ago", "critical": False, "risk": "Low"},
]

LATENCY_HOURLY = [
    {"label": "09:00", "orders": 2341, "oms_med": 512, "oms_p99": 1820, "exch_med": 5210, "exch_p99": 11200},
    {"label": "09:30", "orders": 18420, "oms_med": 441, "oms_p99": 1540, "exch_med": 4890, "exch_p99": 10100},
    {"label": "10:00", "orders": 32150, "oms_med": 892, "oms_p99": 6200000, "exch_med": 6820, "exch_p99": 6200000},
    {"label": "10:30", "orders": 28900, "oms_med": 438, "oms_p99": 1410, "exch_med": 4720, "exch_p99": 9800},
    {"label": "11:00", "orders": 24310, "oms_med": 429, "oms_p99": 1390, "exch_med": 4650, "exch_p99": 9400},
    {"label": "11:30", "orders": 22180, "oms_med": 431, "oms_p99": 1380, "exch_med": 4620, "exch_p99": 9350},
    {"label": "12:00", "orders": 19870, "oms_med": 435, "oms_p99": 1420, "exch_med": 4700, "exch_p99": 9600},
    {"label": "12:30", "orders": 18340, "oms_med": 433, "oms_p99": 1400, "exch_med": 4670, "exch_p99": 9500},
    {"label": "13:00", "orders": 17820, "oms_med": 436, "oms_p99": 1430, "exch_med": 4710, "exch_p99": 9700},
    {"label": "13:30", "orders": 16540, "oms_med": 430, "oms_p99": 1370, "exch_med": 4600, "exch_p99": 9200},
    {"label": "14:00", "orders": 15980, "oms_med": 434, "oms_p99": 1410, "exch_med": 4680, "exch_p99": 9550},
    {"label": "14:30", "orders": 17120, "oms_med": 432, "oms_p99": 1395, "exch_med": 4640, "exch_p99": 9300},
    {"label": "15:00", "orders": 18540, "oms_med": 440, "oms_p99": 1460, "exch_med": 4780, "exch_p99": 9900},
]

LATENCY_SEGMENTS = [
    {"seg": "NFO", "count": 190525, "pct": 88.2, "oms_med": 429, "oms_p99": 1380, "exch_med": 4580, "exch_p99": 9200},
    {"seg": "BFO", "count": 17764, "pct": 8.2, "oms_med": 460, "oms_p99": 1490, "exch_med": 4900, "exch_p99": 10200},
    {"seg": "NSE", "count": 7598, "pct": 3.5, "oms_med": 892, "oms_p99": 10400, "exch_med": 8200, "exch_p99": 15800},
    {"seg": "BSE", "count": 228, "pct": 0.1, "oms_med": 510, "oms_p99": 1680, "exch_med": 5300, "exch_p99": 11000},
]

SAMPLE_ORDERS = [
    ("26060800001782", "NSE", "L7245591q22", 65, 1433.25, 48, 3640150, 1780889419, 1780889422),
    ("26060800001783", "NSE", "L82481334ee", 56, 1227.75, None, 0, 1780889447, 0),
    ("26060800001784", "NSE", "L434512344", 65, 2064.75, 48, 7203, 1780889451, 1780889451),
    ("26060800001785", "NFO", "L9912345abc", 45, None, None, 0, 1780889460, 0),
    ("26060800001786", "BSE", "L2201990def1", 65, 1890.5, 48, 2000512, 1780889472, 1780889474),
    ("26060800001787", "NFO", "L3341290fe12", 56, 980.25, 48, 1500200, 1780889485, 1780889486),
    ("26060800001788", "NSE", "L5512891bb", 65, 3201.0, 48, 4100000, 1780889501, 1780889505),
    ("26060800001789", "NFO", "L1198234cd", 48, 750.0, None, 0, 1780889512, 0),
    ("26060800001790", "BSE", "L8821990ee", 65, 1650.0, 48, 1800100, 1780889520, 1780889521),
    ("26060800001791", "NFO", "L0091234ff", 65, 2100.5, 48, 2200300, 1780889533, 1780889535),
    ("26060800001792", "NSE", "L6671234ab", 56, None, None, 0, 1780889548, 0),
    ("26060800001793", "NSE", "L4412891cd", 65, 1900.0, 48, 3500000, 1780889560, 1780889563),
    ("26060800001794", "NFO", "L9981234de", 65, 1245.5, 48, 1200400, 1780889571, 1780889572),
    ("26060800001795", "BFO", "L3391234ef", 45, 880.0, None, 0, 1780889583, 0),
    ("26060800001796", "BFO", "L7721890ab", 65, 2310.25, 48, 2500100, 1780889591, 1780889593),
]

CTCL_LINES = [
    {"id": "NSE-5864", "segment": "NSE", "role": "Line-1 Primary", "samples": 29901, "status": "Full Day",
     "series": [580, 680, 720, 610, 510, 490, 480, 478, 472, 460, 458, 452, 455, 460, 470, 500, 520, 560, 640, 720, 810, 920, 1060, 1114, 920, 800, 720]},
    {"id": "NSE-2729", "segment": "NSE", "role": "Line-2 Secondary", "samples": 8556, "status": "Truncated",
     "series": [2991, 3800, 4750, 5538] + [None] * 23},
    {"id": "NSE-48621", "segment": "NSE", "role": "Line-3 AMO/Reg", "samples": 1347, "status": "Full Day",
     "series": [1071, 890, 810, 700, 680, 650, 630, 610, 620, 600, 615, 635, 660, 630, 600, 598, 592, 590, 600, 610, 640, 660, 648, 640, 630, 620, 600]},
    {"id": "NFO-13424", "segment": "NFO", "role": "Line-1 Primary", "samples": 266, "status": "Flash only", "series": []},
    {"id": "NFO-13429", "segment": "NFO", "role": "Line-2 Secondary", "samples": 0, "status": "Empty", "series": []},
    {"id": "NFO-12492", "segment": "NFO", "role": "AMO Line-1", "samples": None, "status": "Active",
     "series": [280, 320, 350, 280, 200, 180, 170, 160, 150, 145, 140, 140, 145, 150, 155, 160, 165, 160, 155, 165, 175, 185, 210, 240, 310, 380, 420]},
    {"id": "NFO-57507", "segment": "NFO", "role": "AMO Line-2", "samples": None, "status": "Active", "series": []},
    {"id": "BSE-L1", "segment": "BSE", "role": "BSE Regular", "samples": 99219, "status": "Full Day",
     "series": [1222, 880, 780, 680, 620, 580, 560, 520, 500, 490, 480, 475, 470, 460, 468, 472, 480, 490, 510, 530, 560, 590, 640, 700, 760, 820, 880]},
    {"id": "BFO-L1", "segment": "BFO", "role": "BSE F&O", "samples": None, "status": "Active",
     "series": [390, 350, 300, 260, 230, 220, 210, 200, 195, 190, 188, 186, 188, 192, 196, 200, 205, 210, 220, 230, 245, 260, 280, 310, 350, 380, 410]},
]

BROKERS = [
    ("BetaFront", 1, 1, 1, 1), ("IndMoney", 1, 1, 1, 1), ("FlatTrade", 1, 1, 1, 1),
    ("W2W", 1, 0, 1, 1), ("Lemonn", 1, 1, 1, 1), ("Neo", 1, 1, 1, 1),
    ("Fyers", 1, 1, 1, 1), ("SMC Global", 1, 1, 0, 1), ("Marwadi", 1, 1, 0, 1),
    ("Geojit", 1, 1, 1, 1), ("CapitalVia", 1, 1, 0, 0), ("Navia", 1, 1, 1, 1),
    ("Profitmart", 1, 1, 1, 1), ("Tradingo", 0, 1, 1, 1), ("Nirmal Bang", 1, 1, 1, 1),
    ("Stock19", 1, 1, 1, 0), ("Asit C Mehta", 0, 0, 1, 1), ("SMIFS", 0, 0, 1, 1),
]

# ── Datacenter racks (mirrors the frontend rack elevations) ──────────────────
# Unit tuple: (u_top, u_bottom, kind, label, desc, model, color, icon, status,
#              asset, ip, device, chip)
RACKS = [
    {
        "name": "R12", "row": "Row C", "role": "Mixed compute", "power_kw": 142,
        "capacity_kw": 160, "inlet_c": 22, "exhaust_c": 34, "humidity": 48, "ups_runtime": "11m 42s",
        "units": [
            (42, 40, "patch", "Patch Panel", "Organizes and manages network cable connections.", "48-port Cat6A", "#0891b2", "fa-table-cells", "ok", "PP-BLR-R12-01", None, "", ""),
            (38, 37, "switch", "Switch", "Connects devices within the network (LAN).", "Cisco Catalyst 9300-48P", "#059669", "fa-network-wired", "ok", "SW-BLR-CORE-01", "10.10.1.10", "SW-BLR-CORE-01", ""),
            (35, 34, "firewall", "Firewall", "Monitors and protects network traffic.", "Palo Alto PA-5450", "#dc2626", "fa-shield-halved", "ok", "FW-BLR-CORE-01", "10.10.0.1", "FW-BLR-CORE-01", ""),
            (32, 31, "server", "Servers", "Hosts applications and processes data.", "Dell PowerEdge R760", "#7c3aed", "fa-server", "ok", "ESX-BLR-01", "10.10.10.11", "ESX-BLR-01", "SERVER 1"),
            (30, 29, "server", "", "", "Dell PowerEdge R760", "#7c3aed", "fa-server", "warn", "ESX-BLR-02", "10.10.10.12", "ESX-BLR-02", "SERVER 2"),
            (28, 27, "server", "", "", "Dell PowerEdge R760", "#7c3aed", "fa-server", "ok", "BARE-BLR-DB-01", "10.10.20.5", "BARE-BLR-DB-01", "SERVER 3"),
            (26, 25, "server", "", "", "HPE ProLiant DL380", "#7c3aed", "fa-server", "ok", "BARE-BLR-DB-02", "10.10.20.6", "BARE-BLR-DB-02", "SERVER 4"),
            (24, 23, "server", "", "", "Dell PowerEdge R750", "#7c3aed", "fa-server", "crit", "WIN-SQL-PROD-01", "10.10.30.30", "WIN-SQL-PROD-01", "SERVER 5"),
            (21, 20, "nas", "NAS", "Centralized storage for files and data.", "Synology RS3621xs+", "#16a34a", "fa-database", "ok", "NAS-BLR-01", "10.10.50.10", "", ""),
            (18, 15, "storage", "Storage", "High-capacity storage for large data volumes.", "Pure FlashArray //X70", "#f59e0b", "fa-hard-drive", "ok", "SAN-BLR-PROD-01", "10.10.50.1", "SAN-BLR-PROD-01", ""),
            (13, 12, "raid", "", "", "Dell ME5024 shelf", "#f59e0b", "fa-hard-drive", "ok", "SAN-BLR-SHELF-02", None, "", ""),
            (10, 10, "loadbal", "Load Balancer", "Distributes traffic across multiple servers.", "F5 BIG-IP i5800", "#e11d48", "fa-scale-balanced", "ok", "LB-BLR-PROD-01", "10.10.5.10", "LB-BLR-PROD-01", ""),
            (8, 5, "ups", "UPS", "Provides backup power during outages.", "APC Symmetra PX 160kW", "#0d9488", "fa-plug-circle-bolt", "warn", "UPS-BLR-A", None, "UPS-BLR-A", ""),
            (2, 1, "pdu", "PDU", "Distributes power to all devices in the rack.", "APC AP8941 · 32A", "#f97316", "fa-bolt", "ok", "PDU-BLR-R12-A", None, "", ""),
        ],
    },
    {
        "name": "R11", "row": "Row C", "role": "Network core", "power_kw": 64,
        "capacity_kw": 160, "inlet_c": 21, "exhaust_c": 29, "humidity": 46, "ups_runtime": "24m 10s",
        "units": [
            (42, 41, "patch", "Patch Panel", "Structured cabling to Row C cages.", "48-port Cat6A", "#0891b2", "fa-table-cells", "ok", "PP-BLR-R11-01", None, "", ""),
            (40, 39, "patch", "", "", "24-port OM4 fiber", "#0891b2", "fa-table-cells", "ok", "PP-BLR-R11-02", None, "", ""),
            (37, 36, "router", "Edge Router", "WAN edge routing and peering.", "Cisco ASR 1002-HX", "#2563eb", "fa-route", "ok", "RTR-BLR-EDGE-01", "10.10.0.252", "RTR-BLR-EDGE-01", ""),
            (35, 34, "firewall", "Firewall", "Perimeter + DMZ inspection pair.", "FortiGate 3200F", "#dc2626", "fa-shield-halved", "warn", "FW-BLR-DMZ-02", "10.10.0.2", "FW-BLR-DMZ-02", ""),
            (32, 31, "switch", "Core Switches", "L3 core, VXLAN spine.", "Cisco Nexus 93180YC", "#059669", "fa-network-wired", "ok", "SW-BLR-CORE-02", "10.10.1.11", "SW-BLR-CORE-02", "CORE 1"),
            (30, 29, "switch", "", "", "Cisco Nexus 93180YC", "#059669", "fa-network-wired", "ok", "SW-BLR-DIST-04", "10.10.2.4", "SW-BLR-DIST-04", "CORE 2"),
            (27, 26, "switch", "", "", "Arista 7050X3", "#059669", "fa-network-wired", "crit", "SW-BLR-TOR-13", "10.10.3.13", "SW-BLR-TOR-13", "TOR 13"),
            (24, 24, "loadbal", "Load Balancer", "GSLB + TLS offload.", "F5 BIG-IP i7800", "#e11d48", "fa-scale-balanced", "ok", "LB-BLR-EDGE-01", "10.10.5.11", "", ""),
            (8, 5, "ups", "UPS", "Provides backup power during outages.", "APC Symmetra PX 160kW", "#0d9488", "fa-plug-circle-bolt", "ok", "UPS-BLR-B", None, "", ""),
            (2, 1, "pdu", "PDU", "Distributes power to all devices in the rack.", "APC AP8941 · 32A", "#f97316", "fa-bolt", "ok", "PDU-BLR-R11-A", None, "", ""),
        ],
    },
    {
        "name": "R13", "row": "Row C", "role": "Storage & backup", "power_kw": 118,
        "capacity_kw": 160, "inlet_c": 23, "exhaust_c": 36, "humidity": 51, "ups_runtime": "14m 05s",
        "units": [
            (42, 41, "patch", "Patch Panel", "SAN fabric + backup network cabling.", "24-port OM4 fiber", "#0891b2", "fa-table-cells", "ok", "PP-BLR-R13-01", None, "", ""),
            (39, 38, "switch", "SAN Switches", "Fibre-channel fabric A/B.", "Brocade G620", "#059669", "fa-network-wired", "ok", "SAN-SW-BLR-A", "10.10.60.2", "", ""),
            (37, 36, "switch", "", "", "Brocade G620", "#059669", "fa-network-wired", "ok", "SAN-SW-BLR-B", "10.10.60.3", "", ""),
            (33, 30, "storage", "Storage", "Primary all-flash array.", "Pure FlashArray //X90", "#f59e0b", "fa-hard-drive", "ok", "SAN-BLR-PROD-02", "10.10.50.2", "", ""),
            (28, 25, "storage", "", "", "Dell PowerScale H700", "#f59e0b", "fa-hard-drive", "warn", "NAS-BLR-SCALE-01", "10.10.50.20", "", ""),
            (23, 22, "nas", "Backup NAS", "Snapshot + replica target.", "Synology SA3610", "#16a34a", "fa-database", "ok", "NAS-BLR-BKP-01", "10.10.50.30", "", ""),
            (20, 19, "server", "Media Servers", "Backup media movers.", "Dell PowerEdge R760", "#7c3aed", "fa-server", "ok", "BKP-BLR-01", "10.10.70.11", "", "MEDIA 1"),
            (18, 17, "server", "", "", "Dell PowerEdge R760", "#7c3aed", "fa-server", "ok", "BKP-BLR-02", "10.10.70.12", "", "MEDIA 2"),
            (14, 11, "tape", "Tape Library", "LTO-9 offline vault.", "IBM TS4300", "#64748b", "fa-box-archive", "ok", "TAPE-BLR-01", None, "", ""),
            (8, 5, "ups", "UPS", "Provides backup power during outages.", "APC Symmetra PX 160kW", "#0d9488", "fa-plug-circle-bolt", "ok", "UPS-BLR-C", None, "", ""),
            (2, 1, "pdu", "PDU", "Distributes power to all devices in the rack.", "APC AP8961 · 32A", "#f97316", "fa-bolt", "ok", "PDU-BLR-R13-A", None, "", ""),
        ],
    },
]


class Command(BaseCommand):
    help = "Seed the database with the demo dataset."

    def add_arguments(self, parser):
        parser.add_argument("--flush", action="store_true", help="Delete existing rows first")

    @system_task  # seeds / clears every tenant's data
    def handle(self, *args, **opts):
        from datetime import date

        from apps.accounts.models import Person
        from apps.apm.models import Service
        from apps.changes.models import ChangeRequest, SnChangeRecord
        from apps.cmdb.models import Article, ConfigItem
        from apps.incidents.models import Incident, Sla, SnIncidentRecord
        from apps.infra.models import (
            BodCheck, DeviceAlert, DeviceInterface, Exporter, InfraDevice,
            TopologyConnection, VirtualMachine,
        )
        from apps.integrations.models import Integration
        from apps.problems.models import Problem, SnProblemRecord
        from apps.sites.models import Rack, RackUnit, Site
        from apps.tenants.models import Tenant
        from apps.trading.models import (
            BrokerClient, CtclLine, LatencyHourly, LatencySegment,
            MarketDay, OrderLatencyRecord,
        )

        seed = json.loads(FIXTURES.read_text())
        rng = random.Random(42)
        day = date(2026, 6, 16)

        if opts["flush"]:
            for m in (DeviceInterface, DeviceAlert, VirtualMachine, TopologyConnection,
                      InfraDevice, Site, Exporter, Incident, SnIncidentRecord, Sla,
                      Problem, SnProblemRecord, ChangeRequest, SnChangeRecord, ConfigItem, Article, Service, Integration,
                      Person, LatencyHourly, LatencySegment, OrderLatencyRecord,
                      CtclLine, BrokerClient, Tenant):
                m.objects.all().delete()

        for t in seed["TENANTS"]:
            Tenant.objects.update_or_create(id=t["id"], defaults={k: v for k, v in t.items() if k != "id"})
        self.stdout.write(f"tenants: {Tenant.objects.count()}")

        for u in seed["USERS"]:
            Person.objects.update_or_create(id=u["id"], defaults={k: v for k, v in u.items() if k != "id"})

        for s in seed["SITES"]:
            Site.objects.update_or_create(id=s["id"], defaults={k: v for k, v in s.items() if k != "id"})

        for d in seed["DEVICES"]:
            os_parts = (d.get("os") or "").split(" ", 1)
            InfraDevice.objects.update_or_create(
                id=d["id"],
                defaults={
                    "site_id": d["site"],
                    "name": d["id"],
                    "hostname": d["id"].lower(),
                    "ip_address": d.get("ip") or None,
                    "device_type": d["kind"],
                    "vendor": (d.get("model") or "").split(" ")[0],
                    "model": d.get("model", ""),
                    "serial_number": f"SN{rng.randint(10**9, 10**10 - 1)}",
                    "os_name": os_parts[0] if os_parts else "",
                    "os_version": os_parts[1] if len(os_parts) > 1 else "",
                    "status": d.get("status", "unknown"),
                    "health_status": d.get("status", "unknown"),
                    "uptime": d.get("uptime", ""),
                    "cpu": d.get("cpu", 0),
                    "mem": d.get("mem", 0),
                    "iface_summary": d.get("iface", "—"),
                    "throughput": d.get("throughput", "—"),
                    "sessions": d.get("sessions", "—"),
                    "last_seen": d.get("lastSeen", ""),
                    "agent": d.get("agent", ""),
                    "role": d.get("role", ""),
                    "snmp_profile": "standard" if "snmp" in (d.get("agent") or "") else "",
                    "exporter_type": d.get("agent", ""),
                },
            )
        self.stdout.write(f"devices: {InfraDevice.objects.count()}")

        for src, dst in seed["NET_LINKS"]:
            if InfraDevice.objects.filter(id=src).exists() and InfraDevice.objects.filter(id=dst).exists():
                TopologyConnection.objects.get_or_create(
                    src_id=src, dst_id=dst, src_port="", dst_port="",
                    defaults={"bandwidth": "10G", "status": "ok"},
                )

        for v in seed["VMS"]:
            host, _ = InfraDevice.objects.get_or_create(
                id=v["host"],
                defaults={"site_id": seed["SITES"][0]["id"], "device_type": "hypervisor", "status": "ok"},
            )
            VirtualMachine.objects.update_or_create(
                id=v["id"],
                defaults={
                    "host": host, "cluster": v.get("cluster", ""), "os": v.get("os", ""),
                    "cpu": v.get("cpu", ""), "mem": v.get("mem", ""), "disk": v.get("disk", ""),
                    "state": v.get("state", "running"), "cpu_use": v.get("cpuUse", 0),
                    "mem_use": v.get("memUse", 0), "ip": v.get("ip") or None,
                },
            )

        for a in seed["INFRA_ALERTS"]:
            if not InfraDevice.objects.filter(id=a["device"]).exists():
                continue
            DeviceAlert.objects.update_or_create(
                id=a["id"],
                defaults={
                    "device_id": a["device"], "site_id": a["site"], "sev": a["sev"],
                    "title": a["title"], "detail": a.get("detail", ""),
                    "since": a.get("since", ""), "rule": a.get("rule", ""),
                },
            )

        for e in seed["EXPORTERS"]:
            Exporter.objects.update_or_create(name=e["name"], defaults={k: v for k, v in e.items() if k != "name"})

        # ── BOD checks (url.yaml / telnet.yaml + k8s apiserver cert) ─────────
        BodCheck.objects.all().delete()
        _url_hosts = [
            "elasticsearch", "dashboard", "neo4j", "gitea", "grafana", "harbor",
            "jenkins", "keycloak", "kibana", "nextalpha-le-prod", "minio",
            "monitor", "rabbitmq", "nextalpha", "nexus", "prometheus",
            "alertmanager", "redmine", "sonarqube", "stackstorm", "vault",
        ]
        _url_overrides = {
            "grafana": dict(ssl_expiry="Aug 24 2026", ssl_days=32, status=1),
            "sonarqube": dict(code=None, ssl_expiry="NA", ssl_days=None, status=3, note="Request timed out"),
            "vault": dict(ssl_expiry="Jul 31 2026", ssl_days=8, status=0, note="SSL below critical (10d)"),
        }
        _jenkins_path = {"jenkins": "/login"}
        bod = []
        for i, h in enumerate(_url_hosts):
            path = _jenkins_path.get(h, "")
            base = dict(kind="url", target=f"https://{h}-nextalpha.finspot.in{path}" if h != "nextalpha-le-prod" and h != "nextalpha" else f"https://{h}.finspot.in",
                        code=200, ssl_expiry="Nov 19 2026", ssl_days=118, status=2, order=i)
            base.update(_url_overrides.get(h, {}))
            bod.append(BodCheck(**base))
        bod.append(BodCheck(kind="telnet", target="154.210.168.116", port=443, remark="Web Server_443", status=2, order=0))
        bod.append(BodCheck(kind="k8s", target="kube-apiserver", ssl_expiry="Sep 08 2026", ssl_days=47, status=2, remark="warn 30d / crit 15d", order=0))
        BodCheck.objects.bulk_create(bod)

        # ── Market calendar 2026 (holiday_calendar / mock_calendar) ─────────
        MarketDay.objects.all().delete()
        _all_seg = ["NSE", "NFO", "CDS", "NSLB", "NCOM", "BSE", "BFO", "BCD", "BSLB", "BCOM", "MCX"]
        _with_nmf = _all_seg + ["NMF"]
        _mock_seg = ["NSE", "NFO", "CDS", "NSLB", "NCOM", "NMF", "BSE", "BFO", "BCD", "BSLB", "BCOM"]
        _holidays = [
            ("2026-01-26", "Republic Day", _all_seg), ("2026-03-03", "Holi", _all_seg),
            ("2026-03-26", "Shri Ram Navami", _with_nmf), ("2026-03-31", "Mahavir Jayanti", _all_seg),
            ("2026-04-03", "Good Friday", _all_seg), ("2026-04-14", "Baba Saheb Ambedkar Jayanti", _all_seg),
            ("2026-05-01", "Maharashtra Day", _all_seg), ("2026-05-28", "Bakri Id", _all_seg),
            ("2026-06-26", "Muharram", _all_seg), ("2026-09-14", "Ganesh Chaturthi", _all_seg),
            ("2026-10-02", "Mahatma Gandhi Jayanti", _with_nmf), ("2026-10-20", "Dussehra", _all_seg),
            ("2026-11-10", "Diwali-Balipratipada", _all_seg),
            ("2026-11-24", "Prakash Gurpurb Sri Guru Nanak Dev", _with_nmf), ("2026-12-25", "Christmas", _all_seg),
        ]
        _mocks = ["2026-01-03", "2026-02-07", "2026-03-07", "2026-04-04", "2026-05-02", "2026-06-06",
                  "2026-07-04", "2026-08-01", "2026-09-05", "2026-10-03", "2026-11-07", "2026-12-05"]
        mkdays = [MarketDay(date=d, kind="holiday", name=n, segments=s) for d, n, s in _holidays]
        for d in _mocks:
            seg = _mock_seg + (["NIE", "BIX"] if d == "2026-06-06" else [])
            mkdays.append(MarketDay(date=d, kind="mock", name="Mock session", segments=seg))
        MarketDay.objects.bulk_create(mkdays)

        # ── Racks + rack units (Row C in the Bangalore DC) ──────────────────
        blr = seed["SITES"][0]["id"]
        for pos, rk in enumerate(RACKS):
            rack, _ = Rack.objects.update_or_create(
                site_id=blr, name=rk["name"],
                defaults={
                    "position": pos, "row": rk["row"], "role": rk["role"],
                    "power_kw": rk["power_kw"], "capacity_kw": rk["capacity_kw"],
                    "inlet_c": rk["inlet_c"], "exhaust_c": rk["exhaust_c"],
                    "humidity": rk["humidity"], "ups_runtime": rk["ups_runtime"],
                },
            )
            rack.rack_units.all().delete()
            RackUnit.objects.bulk_create([
                RackUnit(
                    rack=rack, position=upos, u_top=u[0], u_bottom=u[1], kind=u[2],
                    label=u[3], description=u[4], model=u[5], color=u[6], icon=u[7],
                    status=u[8], asset=u[9], ip=u[10], device_id=u[11] or "", chip=u[12],
                )
                for upos, u in enumerate(rk["units"])
            ])

        # Server NICs and which switch port each one is cabled to. The seed's
        # links carry no port names, so give every server-side link a NIC
        # (ens2f0, ens2f1, …) and a switch port, plus a management NIC and an
        # out-of-band (iDRAC/iLO) port that are not linked.
        server_kinds = ("hypervisor", "phys-srv", "win-srv", "linux-srv")
        switch_ports: dict[str, int] = {}
        for srv in InfraDevice.objects.filter(device_type__in=server_kinds).order_by("id"):
            links = list(TopologyConnection.objects.filter(dst=srv, dst_port="")) + list(
                TopologyConnection.objects.filter(src=srv, src_port="")
            )
            nics = [("eno1", "1G", "management", "10")]
            for n, _ in enumerate(links or [None]):
                nics.append((f"ens2f{n}", "25G" if srv.device_type == "hypervisor" else "10G", f"data uplink {n + 1}", "100"))
            nics.append(("idrac" if "Dell" in srv.model else "ilo", "1G", "out-of-band management", "99"))
            for idx, (name, speed, desc, vlan) in enumerate(nics):
                DeviceInterface.objects.update_or_create(
                    device=srv, name=name,
                    defaults={
                        "description": desc, "mac_address": f"B0:26:28:{zlib.crc32(srv.id.encode()) & 0xFF:02X}:{idx:02X}:1{idx}",
                        "admin_status": "up", "oper_status": "up", "speed": speed, "duplex": "full",
                        "mtu": 9000 if name.startswith("ens") else 1500, "vlan": vlan,
                        "rx_mbps": rng.uniform(5, 900), "tx_mbps": rng.uniform(5, 700),
                    },
                )
            # Physical servers get their out-of-band controller as a device of
            # its own, linked back with managed_by (read by …/hardware/).
            if srv.device_type in ("hypervisor", "phys-srv") and not srv.model.startswith("VM"):
                dell = "Dell" in srv.model
                ip = None
                if srv.ip_address:
                    octets = str(srv.ip_address).split(".")
                    ip = ".".join(octets[:3] + [str((int(octets[3]) + 100) % 254 + 1)])
                InfraDevice.objects.update_or_create(
                    id=f"{srv.id}-{'IDRAC' if dell else 'ILO'}",
                    defaults={
                        "tenant_id": srv.tenant_id, "site": srv.site, "managed_by": srv,
                        "name": f"{srv.id} {'iDRAC' if dell else 'iLO'}",
                        "device_type": "idrac" if dell else "ilo", "vendor": "Dell" if dell else "HPE",
                        "model": srv.model, "ip_address": ip, "os_name": "iDRAC9" if dell else "iLO 5",
                        "os_version": "6.10.30" if dell else "2.77", "status": "ok", "agent": "redfish-exporter",
                    },
                )
            for n, link in enumerate(links):
                peer = link.src if link.dst_id == srv.id else link.dst
                switch_ports[peer.id] = switch_ports.get(peer.id, 0) + 1
                port = f"Te1/0/{switch_ports[peer.id]}"
                if link.dst_id == srv.id:
                    link.dst_port, link.src_port = f"ens2f{n}", port
                else:
                    link.src_port, link.dst_port = f"ens2f{n}", port
                link.bandwidth = "25G" if srv.device_type == "hypervisor" else "10G"
                link.save()

        # Interfaces for the hero switch (device-detail endpoints)
        hero = InfraDevice.objects.filter(id="SW-BLR-TOR-13").first()
        if hero:
            for i in range(1, 49):
                up = i not in (13, 27)
                DeviceInterface.objects.update_or_create(
                    device=hero, name=f"Gi1/0/{i}",
                    defaults={
                        "description": f"access port {i}", "mac_address": f"00:1B:44:{i:02X}:3A:B7",
                        "admin_status": "up", "oper_status": "up" if up else "down",
                        "speed": "1G", "duplex": "full", "mtu": 1500, "vlan": str(100 + (i % 4)),
                        "rx_mbps": rng.uniform(20, 800) if up else 0,
                        "tx_mbps": rng.uniform(15, 600) if up else 0,
                        "rx_packets": rng.randint(10**6, 10**9), "tx_packets": rng.randint(10**6, 10**9),
                        "rx_errors": rng.randint(0, 40) if up else 0, "tx_errors": rng.randint(0, 20) if up else 0,
                        "rx_drops": rng.randint(0, 15), "tx_drops": rng.randint(0, 10),
                        "crc_errors": 0 if up else rng.randint(50, 400),
                        "error_rate": round(rng.uniform(0, 0.4), 3) if up else 4.2,
                        "utilization": round(rng.uniform(4, 78), 1) if up else 0,
                        "last_change": "2026-06-12 04:18" if up else "2026-06-16 09:41",
                    },
                )

        for i in seed["INCIDENTS"]:
            Incident.objects.update_or_create(
                id=i["id"],
                defaults={
                    "tenant_id": i.get("tenant"), "sev": i["sev"], "title": i["title"],
                    "service": i["service"], "assignee": i.get("assignee"),
                    "status": i["status"], "age": i.get("age", ""), "sla": i.get("sla", 1.0),
                    "slo_burn": i.get("sloBurn", 0.0), "impacted": i.get("impacted", ""),
                },
            )

        for r in SN_INCIDENTS:
            SnIncidentRecord.objects.update_or_create(id=r["id"], defaults={k: v for k, v in r.items() if k != "id"})

        for p in seed["PROBLEMS"]:
            Problem.objects.update_or_create(id=p["id"], defaults={k: v for k, v in p.items() if k != "id"})

        for r in SN_PROBLEMS:
            SnProblemRecord.objects.update_or_create(id=r["id"], defaults={k: v for k, v in r.items() if k != "id"})

        for r in SN_CHANGES:
            SnChangeRecord.objects.update_or_create(id=r["id"], defaults={k: v for k, v in r.items() if k != "id"})

        tenant_ids = set(Tenant.objects.values_list("id", flat=True))
        for c in seed["CHANGES"]:
            # e.g. CHG-2214 references the parent org, not a business unit
            tenant_id = c.get("tenant") if c.get("tenant") in tenant_ids else None
            ChangeRequest.objects.update_or_create(
                id=c["id"],
                defaults={
                    "tenant_id": tenant_id,
                    **{k: v for k, v in c.items() if k not in ("id", "tenant")},
                },
            )

        for ci in seed["CIS"]:
            ConfigItem.objects.update_or_create(id=ci["id"], defaults={k: v for k, v in ci.items() if k != "id"})

        for a in seed["ARTICLES"]:
            Article.objects.update_or_create(id=a["id"], defaults={k: v for k, v in a.items() if k != "id"})

        for s in seed["SLAS"]:
            Sla.objects.update_or_create(id=s["id"], defaults={k: v for k, v in s.items() if k != "id"})

        for s in seed["SERVICES"]:
            Service.objects.update_or_create(name=s["name"], defaults={k: v for k, v in s.items() if k != "name"})

        for g in seed["INTEGRATIONS"]:
            Integration.objects.update_or_create(name=g["name"], defaults={k: v for k, v in g.items() if k != "name"})

        # ── Trading Ops ──────────────────────────────────────────────────────
        for h in LATENCY_HOURLY:
            LatencyHourly.objects.update_or_create(day=day, label=h["label"], defaults=h)
        for s in LATENCY_SEGMENTS:
            LatencySegment.objects.update_or_create(day=day, seg=s["seg"], defaults=s)
        for (ordno, seg, rmks, oms, lat, exch, conf, oms_t, exch_t) in SAMPLE_ORDERS:
            OrderLatencyRecord.objects.update_or_create(
                noren_ord_num=ordno,
                defaults={
                    "exch_seg": seg, "ext_rmks": rmks, "oms_status": oms,
                    "oms_latency": lat, "exch_status": exch,
                    "oms_exch_confirmation": conf,
                    "oms_update_time": oms_t, "exch_update_time": exch_t,
                },
            )
        for pos, line in enumerate(CTCL_LINES):
            CtclLine.objects.update_or_create(
                id=line["id"],
                defaults={"position": pos, **{k: v for k, v in line.items() if k != "id"}},
            )
        for idx, (name, nse, nfo, bse, bfo) in enumerate(BROKERS, start=101):
            BrokerClient.objects.update_or_create(
                name=name,
                defaults={
                    "ctcls": {
                        "n1": f"5864-{idx}" if nse else "—",
                        "n2": f"2729-{idx}" if name not in ("Tradingo",) else "—",
                        "nf1": f"13424-{idx}" if nfo else "—",
                        "nf2": f"57507-{idx}" if nfo else "—",
                        "bse": f"BSE-{idx}" if bse else "—",
                        "bfo": f"BFO-{idx}" if bfo else "—",
                    },
                    "nse": bool(nse), "nfo": bool(nfo), "bse": bool(bse), "bfo": bool(bfo),
                    "position": idx - 101,
                },
            )

        # ── Domains (DNS names + heatmap business domains) ──────────────────
        from apps.domains.seed import seed as seed_domains
        seed_domains()

        self.stdout.write(self.style.SUCCESS("Demo data seeded."))
