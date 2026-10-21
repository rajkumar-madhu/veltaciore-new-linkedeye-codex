// Sample data for the monitoring-configuration screens (templates, domains,
// URL checks, Telnet checks). There is no backend API for these yet, so the
// screens render this seed — the same approach as the Synthetics screen.
// Swap each export for a hook once the endpoints exist.

export interface MonitoringTemplate {
  name: string;
  icon: string;
}

export interface TemplateCategory {
  id: string;
  title: string;
  icon: string;
  color: string;
  description: string;
  templates: MonitoringTemplate[];
  custom?: boolean;
}

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  {
    id: "switches", title: "Switches", icon: "fa-network-wired", color: "#2563eb",
    description: "Layer 2/3 switch monitoring (Cisco, HPE, Aruba, etc.)",
    templates: [
      { name: "Switch Availability", icon: "fa-signal" }, { name: "Interface Errors", icon: "fa-triangle-exclamation" },
      { name: "Port Status", icon: "fa-ethernet" }, { name: "CPU Utilization", icon: "fa-microchip" },
      { name: "Bandwidth Utilization", icon: "fa-gauge-high" }, { name: "Memory Usage", icon: "fa-memory" },
      { name: "VLAN Status", icon: "fa-diagram-project" }, { name: "Stacking Status", icon: "fa-layer-group" },
      { name: "PoE Status", icon: "fa-plug" }, { name: "Temperature", icon: "fa-temperature-half" },
    ],
  },
  {
    id: "firewalls", title: "Firewalls", icon: "fa-shield-halved", color: "#dc2626",
    description: "Fortinet, Palo Alto, Sophos, CheckPoint, etc.",
    templates: [
      { name: "Firewall Availability", icon: "fa-signal" }, { name: "VPN Tunnel Status", icon: "fa-lock" },
      { name: "CPU Utilization", icon: "fa-microchip" }, { name: "Throughput", icon: "fa-gauge-high" },
      { name: "Memory Usage", icon: "fa-memory" }, { name: "Policy Match Count", icon: "fa-list-check" },
      { name: "Interface Status", icon: "fa-ethernet" }, { name: "IPS / Threat Events", icon: "fa-bug" },
      { name: "Session Count", icon: "fa-users" }, { name: "License Expiry", icon: "fa-id-card" },
    ],
  },
  {
    id: "routers", title: "Routers & SD-WAN", icon: "fa-route", color: "#16a34a",
    description: "Routers, SD-WAN, WAN links, BGP/OSPF",
    templates: [
      { name: "Router Availability", icon: "fa-signal" }, { name: "BGP Status", icon: "fa-share-nodes" },
      { name: "Interface Status", icon: "fa-ethernet" }, { name: "OSPF Neighbors", icon: "fa-circle-nodes" },
      { name: "WAN Link Latency", icon: "fa-stopwatch" }, { name: "Tunnel Status", icon: "fa-lock" },
      { name: "WAN Link Packet Loss", icon: "fa-chart-line" }, { name: "CPU & Memory", icon: "fa-microchip" },
    ],
  },
  {
    id: "servers", title: "Physical Servers", icon: "fa-server", color: "#7c3aed",
    description: "Dell, HPE, Lenovo, Supermicro (iDRAC / iLO / IPMI)",
    templates: [
      { name: "Server Availability", icon: "fa-signal" }, { name: "Hardware Health", icon: "fa-heart-pulse" },
      { name: "CPU Utilization", icon: "fa-microchip" }, { name: "Power Supply", icon: "fa-plug" },
      { name: "Memory Usage", icon: "fa-memory" }, { name: "Fan Status", icon: "fa-fan" },
      { name: "Disk Space", icon: "fa-hard-drive" }, { name: "Temperature", icon: "fa-temperature-half" },
      { name: "RAID Status", icon: "fa-database" }, { name: "iDRAC / iLO Status", icon: "fa-microchip" },
    ],
  },
  {
    id: "virtualization", title: "Virtualization", icon: "fa-cube", color: "#ea580c",
    description: "VMware, KVM, Proxmox, Hyper-V",
    templates: [
      { name: "ESXi Host Availability", icon: "fa-signal" }, { name: "VM CPU & Memory", icon: "fa-microchip" },
      { name: "vCenter Health", icon: "fa-heart-pulse" }, { name: "Snapshot Status", icon: "fa-camera" },
      { name: "VM Status", icon: "fa-desktop" }, { name: "Cluster Health", icon: "fa-circle-nodes" },
      { name: "Datastore Usage", icon: "fa-hard-drive" }, { name: "Migration Status", icon: "fa-right-left" },
    ],
  },
  {
    id: "storage", title: "Storage & Databases", icon: "fa-database", color: "#0284c7",
    description: "SAN, NAS, MySQL, PostgreSQL, SQL Server, etc.",
    templates: [
      { name: "Storage Availability", icon: "fa-signal" }, { name: "MySQL Health", icon: "fa-database" },
      { name: "Disk Usage", icon: "fa-hard-drive" }, { name: "PostgreSQL Health", icon: "fa-database" },
      { name: "IOPS & Latency", icon: "fa-gauge-high" }, { name: "SQL Server Health", icon: "fa-database" },
      { name: "Volume Status", icon: "fa-box-archive" }, { name: "Backup Status", icon: "fa-clock-rotate-left" },
    ],
  },
  {
    id: "urls", title: "URLs & Applications", icon: "fa-globe", color: "#db2777",
    description: "Websites, APIs, applications, services",
    templates: [
      { name: "HTTP/HTTPS Check", icon: "fa-globe" }, { name: "TCP Port Check", icon: "fa-ethernet" },
      { name: "DNS Resolution", icon: "fa-sitemap" }, { name: "WebSocket Check", icon: "fa-bolt" },
      { name: "SSL Certificate", icon: "fa-lock" }, { name: "Application Process", icon: "fa-gears" },
      { name: "Response Time", icon: "fa-stopwatch" }, { name: "Endpoint Availability", icon: "fa-signal" },
      { name: "API Health", icon: "fa-code" }, { name: "Custom Script Check", icon: "fa-terminal" },
    ],
  },
  {
    id: "cloud", title: "Kubernetes & Cloud", icon: "fa-cloud", color: "#0891b2",
    description: "Kubernetes, Docker, AWS, Azure, GCP",
    templates: [
      { name: "Cluster Health", icon: "fa-dharmachakra" }, { name: "PVC Usage", icon: "fa-hard-drive" },
      { name: "Node Status", icon: "fa-server" }, { name: "Ingress Status", icon: "fa-door-open" },
      { name: "Pod Status", icon: "fa-cubes" }, { name: "AWS Service Health", icon: "fa-cloud" },
      { name: "Deployment Status", icon: "fa-rocket" }, { name: "Azure Service Health", icon: "fa-cloud" },
    ],
  },
  {
    id: "wireless", title: "Wireless & Network", icon: "fa-wifi", color: "#16a34a",
    description: "Access points, controllers, DHCP, DNS, etc.",
    templates: [
      { name: "AP Availability", icon: "fa-signal" }, { name: "Controller Health", icon: "fa-heart-pulse" },
      { name: "Client Count", icon: "fa-users" }, { name: "DHCP Service", icon: "fa-network-wired" },
      { name: "Signal Strength", icon: "fa-wifi" }, { name: "DNS Service", icon: "fa-sitemap" },
      { name: "SSID Status", icon: "fa-tower-broadcast" }, { name: "ICMP Ping", icon: "fa-satellite-dish" },
    ],
  },
  {
    id: "ops", title: "Operations & Security", icon: "fa-gear", color: "#ca8a04",
    description: "Syslog, certificates, backup, NTP, etc.",
    templates: [
      { name: "Syslog Monitoring", icon: "fa-file-lines" }, { name: "Authentication", icon: "fa-user-lock" },
      { name: "Certificate Expiry", icon: "fa-certificate" }, { name: "Configuration Drift", icon: "fa-code-compare" },
      { name: "NTP Service", icon: "fa-clock" }, { name: "Event Correlation", icon: "fa-link" },
      { name: "Backup Status", icon: "fa-clock-rotate-left" }, { name: "File Integrity", icon: "fa-file-shield" },
    ],
  },
  {
    id: "custom", title: "Custom Templates", icon: "fa-puzzle-piece", color: "#64748b", custom: true,
    description: "Create and manage custom monitoring templates",
    templates: [
      { name: "Custom HTTP Check", icon: "fa-globe" }, { name: "Custom SNMP Check", icon: "fa-network-wired" },
      { name: "Custom Script", icon: "fa-terminal" }, { name: "Custom Application", icon: "fa-window-maximize" },
      { name: "Custom Metric", icon: "fa-chart-line" },
    ],
  },
];

export interface DomainRecord {
  name: string;
  type: string;
  site: string;
  ip: string;
  dns: "Resolved" | "Error";
  ssl: "Valid" | "Expiring" | "Expired";
  status: "Active" | "Inactive";
  sslExpiry: string;
  created: string;
  modified: string;
  description: string;
  services: { name: string; type: string; port: number; up: boolean }[];
}

const svc = (base: string): DomainRecord["services"] => [
  { name: `${base} Web Portal`, type: "HTTP", port: 80, up: true },
  { name: `${base} API`, type: "HTTPS", port: 443, up: true },
  { name: `${base} Database`, type: "MySQL", port: 3306, up: true },
  { name: `${base} Application`, type: "Application", port: 8080, up: true },
  { name: `${base} Monitoring`, type: "Node Exporter", port: 9100, up: true },
];

export const DOMAINS: DomainRecord[] = [
  { name: "nse.finspot.in", type: "Production", site: "Mumbai (NSE)", ip: "10.10.1.21", dns: "Resolved", ssl: "Valid", status: "Active", sslExpiry: "15 Jan 2027", created: "12 Mar 2026 10:15", modified: "20 Jun 2026 14:30", description: "NSE trading platform main domain", services: svc("NSE") },
  { name: "bse.finspot.in", type: "Production", site: "Mumbai (BSE)", ip: "10.10.1.22", dns: "Resolved", ssl: "Valid", status: "Active", sslExpiry: "02 Feb 2027", created: "12 Mar 2026 10:18", modified: "18 Jun 2026 09:12", description: "BSE trading platform domain", services: svc("BSE") },
  { name: "mcx.finspot.in", type: "Production", site: "Mumbai (MCX)", ip: "10.10.1.23", dns: "Resolved", ssl: "Valid", status: "Active", sslExpiry: "28 Dec 2026", created: "14 Mar 2026 11:40", modified: "16 Jun 2026 17:05", description: "MCX commodities platform domain", services: svc("MCX") },
  { name: "cdsl.finspot.in", type: "Production", site: "Mumbai (CDSL)", ip: "10.10.2.11", dns: "Resolved", ssl: "Expiring", status: "Active", sslExpiry: "05 Nov 2026", created: "20 Mar 2026 09:02", modified: "21 Jun 2026 08:45", description: "CDSL depository integration", services: svc("CDSL").slice(0, 3) },
  { name: "nsdl.finspot.in", type: "Production", site: "Mumbai (NSDL)", ip: "10.10.2.12", dns: "Resolved", ssl: "Valid", status: "Active", sslExpiry: "19 Mar 2027", created: "20 Mar 2026 09:10", modified: "12 Jun 2026 13:20", description: "NSDL depository integration", services: svc("NSDL").slice(0, 3) },
  { name: "app.wecrew.in", type: "Application", site: "DR Site", ip: "10.20.1.10", dns: "Resolved", ssl: "Valid", status: "Active", sslExpiry: "11 Apr 2027", created: "02 Apr 2026 15:30", modified: "22 Jun 2026 10:00", description: "WeCrew customer application", services: svc("App").slice(0, 2) },
  { name: "api.wecrew.in", type: "API", site: "Mumbai (NSE)", ip: "10.10.1.50", dns: "Resolved", ssl: "Valid", status: "Active", sslExpiry: "11 Apr 2027", created: "02 Apr 2026 15:32", modified: "22 Jun 2026 10:02", description: "WeCrew public API gateway", services: svc("API").slice(1, 2) },
  { name: "monitoring.wecrew.in", type: "Monitoring", site: "All Sites", ip: "10.10.0.10", dns: "Resolved", ssl: "Valid", status: "Active", sslExpiry: "30 May 2027", created: "05 Apr 2026 12:00", modified: "19 Jun 2026 16:40", description: "LinkedEye monitoring endpoint", services: svc("Monitoring").slice(4) },
  { name: "backup.finspot.in", type: "Backup", site: "DR Site", ip: "10.60.1.15", dns: "Resolved", ssl: "Valid", status: "Active", sslExpiry: "14 Feb 2027", created: "08 Apr 2026 08:20", modified: "10 Jun 2026 07:55", description: "Backup and archival service", services: [] },
  { name: "vpn.finspot.in", type: "VPN", site: "Mumbai (NSE)", ip: "10.10.3.5", dns: "Resolved", ssl: "Valid", status: "Active", sslExpiry: "01 Mar 2027", created: "09 Apr 2026 18:10", modified: "15 Jun 2026 11:25", description: "Remote access VPN gateway", services: [] },
  { name: "mail.wecrew.in", type: "Mail", site: "All Sites", ip: "10.10.0.25", dns: "Error", ssl: "Valid", status: "Inactive", sslExpiry: "22 Jan 2027", created: "10 Apr 2026 10:45", modified: "23 Jun 2026 06:30", description: "Corporate mail relay", services: [{ name: "SMTP Relay", type: "SMTP", port: 587, up: false }] },
  { name: "test.finspot.in", type: "Test", site: "Chennai", ip: "10.30.1.100", dns: "Resolved", ssl: "Valid", status: "Active", sslExpiry: "07 Dec 2026", created: "11 Apr 2026 14:00", modified: "20 Jun 2026 15:15", description: "Pre-production test environment", services: svc("Test").slice(0, 2) },
];

export interface UrlCheck {
  /** Owning client (tenant id) — checks are tenant-scoped. */
  client: string;
  name: string;
  description: string;
  url: string;
  type: "Web" | "API";
  site: string;
  status: "Online" | "Down" | "Degraded";
  responseMs: number | null;
  lastCheck: string;
  uptime: number;
}

export const URL_CHECKS: UrlCheck[] = [
  { client: "fyers", name: "NSE Web Portal", description: "NSE public site availability", url: "https://www.nseindia.com", type: "Web", site: "Mumbai (NSE)", status: "Online", responseMs: 321, lastCheck: "26 Jun 11:02:15", uptime: 99.98 },
  { client: "fyers", name: "BSE Portal", description: "BSE public site availability", url: "https://www.bseindia.com", type: "Web", site: "Mumbai (BSE)", status: "Online", responseMs: 412, lastCheck: "26 Jun 11:02:12", uptime: 99.95 },
  { client: "indmoney", name: "MCX Portal", description: "MCX commodities portal", url: "https://www.mcxindia.com", type: "Web", site: "Mumbai (MCX)", status: "Degraded", responseMs: 1842, lastCheck: "26 Jun 11:02:10", uptime: 95.23 },
  { client: "flattrade", name: "WeCrew Academy", description: "Training portal for client staff", url: "https://wecrew.in", type: "Web", site: "All Sites", status: "Online", responseMs: 289, lastCheck: "26 Jun 11:02:14", uptime: 99.99 },
  { client: "fyers", name: "LinkedEye API", description: "LinkedEye public API health", url: "https://api.wecrew.in", type: "API", site: "All Sites", status: "Online", responseMs: 356, lastCheck: "26 Jun 11:02:11", uptime: 99.96 },
  { client: "lemonn", name: "Redmine", description: "Internal ticketing", url: "https://redmine.wecrew.in", type: "Web", site: "Mumbai", status: "Down", responseMs: null, lastCheck: "26 Jun 11:01:55", uptime: 87.42 },
  { client: "fyers", name: "Grafana", description: "Dashboards for the NOC", url: "https://grafana.wecrew.in", type: "Web", site: "All Sites", status: "Online", responseMs: 623, lastCheck: "26 Jun 11:02:13", uptime: 99.91 },
  { client: "indmoney", name: "Prometheus", description: "Metrics backend UI", url: "https://prometheus.wecrew.in", type: "Web", site: "All Sites", status: "Online", responseMs: 512, lastCheck: "26 Jun 11:02:12", uptime: 99.93 },
  { client: "neo-broking", name: "Superset", description: "Analytics dashboards", url: "https://superset.wecrew.in", type: "Web", site: "All Sites", status: "Degraded", responseMs: 1256, lastCheck: "26 Jun 11:02:09", uptime: 96.18 },
  { client: "betafront", name: "Customer Portal", description: "Customer self-service portal", url: "https://customer.wecrew.in", type: "Web", site: "DR Site", status: "Online", responseMs: 398, lastCheck: "26 Jun 11:02:10", uptime: 99.89 },
];

export interface TelnetCheck {
  /** Owning client (tenant id) — checks are tenant-scoped. */
  client: string;
  host: string;
  ip: string;
  description: string;
  port: number;
  service: string;
  site: string;
  status: "Up" | "Down" | "Unknown";
  responseMs: number | null;
  lastCheck: string;
  uptime: number;
}

export const TELNET_CHECKS: TelnetCheck[] = [
  { client: "fyers", host: "NSE-GW-01", ip: "10.10.1.1", description: "NSE gateway management access", port: 23, service: "Telnet", site: "Mumbai (NSE)", status: "Up", responseMs: 28, lastCheck: "26 Jun 11:00:15", uptime: 99.98 },
  { client: "fyers", host: "BSE-CORE-01", ip: "10.10.1.2", description: "BSE core switch CLI", port: 23, service: "Telnet", site: "Mumbai (BSE)", status: "Up", responseMs: 32, lastCheck: "26 Jun 11:00:14", uptime: 99.95 },
  { client: "indmoney", host: "MCX-SW-01", ip: "10.10.1.3", description: "MCX access switch", port: 23, service: "Telnet", site: "Mumbai (MCX)", status: "Down", responseMs: null, lastCheck: "26 Jun 10:58:02", uptime: 92.12 },
  { client: "fyers", host: "FIREWALL-01", ip: "10.10.1.254", description: "Perimeter firewall management port", port: 23, service: "Management", site: "Mumbai (NSE)", status: "Up", responseMs: 45, lastCheck: "26 Jun 11:00:12", uptime: 99.9 },
  { client: "flattrade", host: "DC-ROUTER-01", ip: "10.20.0.1", description: "Bangalore DC edge router", port: 23, service: "Telnet", site: "Bangalore DC", status: "Up", responseMs: 38, lastCheck: "26 Jun 11:00:10", uptime: 99.87 },
  { client: "lemonn", host: "CHN-SW-01", ip: "10.30.0.2", description: "Chennai DC distribution switch", port: 23, service: "Telnet", site: "Chennai DC", status: "Unknown", responseMs: null, lastCheck: "26 Jun 10:59:55", uptime: 98.23 },
  { client: "neo-broking", host: "DEL-SW-01", ip: "10.40.0.2", description: "Delhi DC distribution switch", port: 23, service: "Telnet", site: "Delhi DC", status: "Up", responseMs: 52, lastCheck: "26 Jun 11:00:08", uptime: 99.92 },
  { client: "fyers", host: "APP-SRV-01", ip: "10.10.1.21", description: "OMS application admin console", port: 2323, service: "Application", site: "Mumbai (NSE)", status: "Down", responseMs: null, lastCheck: "26 Jun 10:57:12", uptime: 88.45 },
  { client: "flattrade", host: "DB-CLUSTER-01", ip: "10.20.5.10", description: "Database cluster management", port: 23, service: "Telnet", site: "Bangalore DC", status: "Up", responseMs: 41, lastCheck: "26 Jun 11:00:06", uptime: 99.96 },
  { client: "betafront", host: "VPN-GW-01", ip: "10.40.0.1", description: "Remote access VPN gateway", port: 23, service: "Telnet", site: "Delhi DC", status: "Up", responseMs: 36, lastCheck: "26 Jun 11:00:04", uptime: 99.93 },
];
