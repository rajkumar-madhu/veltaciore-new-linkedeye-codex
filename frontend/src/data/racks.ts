// Datacenter rack elevations — seed/fallback data for the rack screen.
// The same records are served by GET /api/infra/racks/ (backend seed mirrors
// this file); useRacks() prefers the live API and falls back to these.

export interface RackUnit {
  uTop: number;      // highest U occupied
  uBottom: number;   // lowest U occupied
  kind: string;
  label: string;     // callout card title ("" = no card, e.g. servers 2..5)
  desc: string;
  model: string;
  color: string;
  icon: string;
  status: string;
  asset: string;
  ip?: string | null;
  device?: string | null;   // deviceId in inventory for click-through
  chip?: string;            // right-hand callout chip (SERVER 1…)
}

export interface Rack {
  id: string;
  row: string;
  role: string;
  powerKw: number;
  capacityKw: number;
  inletC: number;
  exhaustC: number;
  humidity: number;
  upsRuntime: string;
  units: RackUnit[];
}

export const RACKS: Rack[] = [
  {
    id: "R12", row: "Row C", role: "Mixed compute", powerKw: 142, capacityKw: 160,
    inletC: 22, exhaustC: 34, humidity: 48, upsRuntime: "11m 42s",
    units: [
      { uTop: 42, uBottom: 40, kind: "patch",   label: "Patch Panel",   desc: "Organizes and manages network cable connections.", model: "48-port Cat6A",           color: "#0891b2", icon: "fa-table-cells",      status: "ok",   asset: "PP-BLR-R12-01" },
      { uTop: 38, uBottom: 37, kind: "switch",  label: "Switch",        desc: "Connects devices within the network (LAN).",       model: "Cisco Catalyst 9300-48P", color: "#059669", icon: "fa-network-wired",    status: "ok",   asset: "SW-BLR-CORE-01", ip: "10.10.1.10", device: "SW-BLR-CORE-01" },
      { uTop: 35, uBottom: 34, kind: "firewall",label: "Firewall",      desc: "Monitors and protects network traffic.",           model: "Palo Alto PA-5450",       color: "#dc2626", icon: "fa-shield-halved",    status: "ok",   asset: "FW-BLR-CORE-01", ip: "10.10.0.1", device: "FW-BLR-CORE-01" },
      { uTop: 32, uBottom: 31, kind: "server",  label: "Servers",       desc: "Hosts applications and processes data.",           model: "Dell PowerEdge R760",     color: "#7c3aed", icon: "fa-server",           status: "ok",   asset: "ESX-BLR-01", ip: "10.10.10.11", device: "ESX-BLR-01", chip: "SERVER 1" },
      { uTop: 30, uBottom: 29, kind: "server",  label: "",              desc: "",                                                 model: "Dell PowerEdge R760",     color: "#7c3aed", icon: "fa-server",           status: "warn", asset: "ESX-BLR-02", ip: "10.10.10.12", device: "ESX-BLR-02", chip: "SERVER 2" },
      { uTop: 28, uBottom: 27, kind: "server",  label: "",              desc: "",                                                 model: "Dell PowerEdge R760",     color: "#7c3aed", icon: "fa-server",           status: "ok",   asset: "BARE-BLR-DB-01", ip: "10.10.20.5", device: "BARE-BLR-DB-01", chip: "SERVER 3" },
      { uTop: 26, uBottom: 25, kind: "server",  label: "",              desc: "",                                                 model: "HPE ProLiant DL380",      color: "#7c3aed", icon: "fa-server",           status: "ok",   asset: "BARE-BLR-DB-02", ip: "10.10.20.6", device: "BARE-BLR-DB-02", chip: "SERVER 4" },
      { uTop: 24, uBottom: 23, kind: "server",  label: "",              desc: "",                                                 model: "Dell PowerEdge R750",     color: "#7c3aed", icon: "fa-server",           status: "crit", asset: "WIN-SQL-PROD-01", ip: "10.10.30.30", device: "WIN-SQL-PROD-01", chip: "SERVER 5" },
      { uTop: 21, uBottom: 20, kind: "nas",     label: "NAS",           desc: "Centralized storage for files and data.",          model: "Synology RS3621xs+",      color: "#16a34a", icon: "fa-database",         status: "ok",   asset: "NAS-BLR-01", ip: "10.10.50.10" },
      { uTop: 18, uBottom: 15, kind: "storage", label: "Storage",       desc: "High-capacity storage for large data volumes.",    model: "Pure FlashArray //X70",   color: "#f59e0b", icon: "fa-hard-drive",       status: "ok",   asset: "SAN-BLR-PROD-01", ip: "10.10.50.1", device: "SAN-BLR-PROD-01" },
      { uTop: 13, uBottom: 12, kind: "raid",    label: "",              desc: "",                                                 model: "Dell ME5024 shelf",       color: "#f59e0b", icon: "fa-hard-drive",       status: "ok",   asset: "SAN-BLR-SHELF-02" },
      { uTop: 10, uBottom: 10, kind: "loadbal", label: "Load Balancer", desc: "Distributes traffic across multiple servers.",     model: "F5 BIG-IP i5800",         color: "#e11d48", icon: "fa-scale-balanced",   status: "ok",   asset: "LB-BLR-PROD-01", ip: "10.10.5.10", device: "LB-BLR-PROD-01" },
      { uTop: 8,  uBottom: 5,  kind: "ups",     label: "UPS",           desc: "Provides backup power during outages.",            model: "APC Symmetra PX 160kW",   color: "#0d9488", icon: "fa-plug-circle-bolt", status: "warn", asset: "UPS-BLR-A", device: "UPS-BLR-A" },
      { uTop: 2,  uBottom: 1,  kind: "pdu",     label: "PDU",           desc: "Distributes power to all devices in the rack.",    model: "APC AP8941 · 32A",        color: "#f97316", icon: "fa-bolt",             status: "ok",   asset: "PDU-BLR-R12-A" },
    ],
  },
  {
    id: "R11", row: "Row C", role: "Network core", powerKw: 64, capacityKw: 160,
    inletC: 21, exhaustC: 29, humidity: 46, upsRuntime: "24m 10s",
    units: [
      { uTop: 42, uBottom: 41, kind: "patch",   label: "Patch Panel",   desc: "Structured cabling to Row C cages.",               model: "48-port Cat6A",           color: "#0891b2", icon: "fa-table-cells",      status: "ok",   asset: "PP-BLR-R11-01" },
      { uTop: 40, uBottom: 39, kind: "patch",   label: "",              desc: "",                                                 model: "24-port OM4 fiber",       color: "#0891b2", icon: "fa-table-cells",      status: "ok",   asset: "PP-BLR-R11-02" },
      { uTop: 37, uBottom: 36, kind: "router",  label: "Edge Router",   desc: "WAN edge routing and peering.",                    model: "Cisco ASR 1002-HX",       color: "#2563eb", icon: "fa-route",            status: "ok",   asset: "RTR-BLR-EDGE-01", ip: "10.10.0.252", device: "RTR-BLR-EDGE-01" },
      { uTop: 35, uBottom: 34, kind: "firewall",label: "Firewall",      desc: "Perimeter + DMZ inspection pair.",                 model: "FortiGate 3200F",         color: "#dc2626", icon: "fa-shield-halved",    status: "warn", asset: "FW-BLR-DMZ-02", ip: "10.10.0.2", device: "FW-BLR-DMZ-02" },
      { uTop: 32, uBottom: 31, kind: "switch",  label: "Core Switches", desc: "L3 core, VXLAN spine.",                            model: "Cisco Nexus 93180YC",     color: "#059669", icon: "fa-network-wired",    status: "ok",   asset: "SW-BLR-CORE-02", ip: "10.10.1.11", device: "SW-BLR-CORE-02", chip: "CORE 1" },
      { uTop: 30, uBottom: 29, kind: "switch",  label: "",              desc: "",                                                 model: "Cisco Nexus 93180YC",     color: "#059669", icon: "fa-network-wired",    status: "ok",   asset: "SW-BLR-DIST-04", ip: "10.10.2.4", device: "SW-BLR-DIST-04", chip: "CORE 2" },
      { uTop: 27, uBottom: 26, kind: "switch",  label: "",              desc: "",                                                 model: "Arista 7050X3",           color: "#059669", icon: "fa-network-wired",    status: "crit", asset: "SW-BLR-TOR-13", ip: "10.10.3.13", device: "SW-BLR-TOR-13", chip: "TOR 13" },
      { uTop: 24, uBottom: 24, kind: "loadbal", label: "Load Balancer", desc: "GSLB + TLS offload.",                              model: "F5 BIG-IP i7800",         color: "#e11d48", icon: "fa-scale-balanced",   status: "ok",   asset: "LB-BLR-EDGE-01", ip: "10.10.5.11" },
      { uTop: 8,  uBottom: 5,  kind: "ups",     label: "UPS",           desc: "Provides backup power during outages.",            model: "APC Symmetra PX 160kW",   color: "#0d9488", icon: "fa-plug-circle-bolt", status: "ok",   asset: "UPS-BLR-B" },
      { uTop: 2,  uBottom: 1,  kind: "pdu",     label: "PDU",           desc: "Distributes power to all devices in the rack.",    model: "APC AP8941 · 32A",        color: "#f97316", icon: "fa-bolt",             status: "ok",   asset: "PDU-BLR-R11-A" },
    ],
  },
  {
    id: "R13", row: "Row C", role: "Storage & backup", powerKw: 118, capacityKw: 160,
    inletC: 23, exhaustC: 36, humidity: 51, upsRuntime: "14m 05s",
    units: [
      { uTop: 42, uBottom: 41, kind: "patch",   label: "Patch Panel",   desc: "SAN fabric + backup network cabling.",             model: "24-port OM4 fiber",       color: "#0891b2", icon: "fa-table-cells",      status: "ok",   asset: "PP-BLR-R13-01" },
      { uTop: 39, uBottom: 38, kind: "switch",  label: "SAN Switches",  desc: "Fibre-channel fabric A/B.",                        model: "Brocade G620",            color: "#059669", icon: "fa-network-wired",    status: "ok",   asset: "SAN-SW-BLR-A", ip: "10.10.60.2" },
      { uTop: 37, uBottom: 36, kind: "switch",  label: "",              desc: "",                                                 model: "Brocade G620",            color: "#059669", icon: "fa-network-wired",    status: "ok",   asset: "SAN-SW-BLR-B", ip: "10.10.60.3" },
      { uTop: 33, uBottom: 30, kind: "storage", label: "Storage",       desc: "Primary all-flash array.",                         model: "Pure FlashArray //X90",   color: "#f59e0b", icon: "fa-hard-drive",       status: "ok",   asset: "SAN-BLR-PROD-02", ip: "10.10.50.2" },
      { uTop: 28, uBottom: 25, kind: "storage", label: "",              desc: "",                                                 model: "Dell PowerScale H700",    color: "#f59e0b", icon: "fa-hard-drive",       status: "warn", asset: "NAS-BLR-SCALE-01", ip: "10.10.50.20" },
      { uTop: 23, uBottom: 22, kind: "nas",     label: "Backup NAS",    desc: "Snapshot + replica target.",                       model: "Synology SA3610",         color: "#16a34a", icon: "fa-database",         status: "ok",   asset: "NAS-BLR-BKP-01", ip: "10.10.50.30" },
      { uTop: 20, uBottom: 19, kind: "server",  label: "Media Servers", desc: "Backup media movers.",                             model: "Dell PowerEdge R760",     color: "#7c3aed", icon: "fa-server",           status: "ok",   asset: "BKP-BLR-01", ip: "10.10.70.11", chip: "MEDIA 1" },
      { uTop: 18, uBottom: 17, kind: "server",  label: "",              desc: "",                                                 model: "Dell PowerEdge R760",     color: "#7c3aed", icon: "fa-server",           status: "ok",   asset: "BKP-BLR-02", ip: "10.10.70.12", chip: "MEDIA 2" },
      { uTop: 14, uBottom: 11, kind: "tape",    label: "Tape Library",  desc: "LTO-9 offline vault.",                             model: "IBM TS4300",              color: "#64748b", icon: "fa-box-archive",      status: "ok",   asset: "TAPE-BLR-01" },
      { uTop: 8,  uBottom: 5,  kind: "ups",     label: "UPS",           desc: "Provides backup power during outages.",            model: "APC Symmetra PX 160kW",   color: "#0d9488", icon: "fa-plug-circle-bolt", status: "ok",   asset: "UPS-BLR-C" },
      { uTop: 2,  uBottom: 1,  kind: "pdu",     label: "PDU",           desc: "Distributes power to all devices in the rack.",    model: "APC AP8961 · 32A",        color: "#f97316", icon: "fa-bolt",             status: "ok",   asset: "PDU-BLR-R13-A" },
    ],
  },
];
