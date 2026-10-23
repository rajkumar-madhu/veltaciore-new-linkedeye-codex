// Shared entity types — mirror the prototype data shapes and the DRF API.

export interface Org {
  name: string;
  slug: string;
  plan: string;
  seatsUsed: number;
  seatsTotal: number;
  founder: string;
  contact: string;
  phone: string;
}

export interface Tenant {
  id: string;
  name: string;
  parent: string;
  code: string;
  color: string;
  users: number;
  incidents: number;
  sev1: number;
  health: number;
  mttr: number;
  spend: number;
  plan: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  team: string;
  color: string;
  status: string;
  last: string;
}

export interface Incident {
  id: string;
  sev: number;
  title: string;
  service: string;
  tenant?: string;
  assignee: string | null;
  status: string;
  age: string;
  sla: number;
  sloBurn: number;
  impacted: string;
}

export interface Service {
  name: string;
  status: string;
  uptime: number;
  p95: string;
  err: number;
  deps: number;
}

export interface Integration {
  name: string;
  icon: string;
  category: string;
  connected: boolean;
  meta: string;
}

export interface Site {
  id: string;
  name: string;
  region: string;
  devices: number;
  health: number;
}

export interface DeviceKind {
  id: string;
  label: string;
  icon: string;
  color: string;
  iconBrand?: boolean;
}

export interface Device {
  id: string;
  kind: string;
  model: string;
  site: string;
  ip: string;
  os: string;
  uptime: string;
  cpu: number;
  mem: number;
  status: string;
  role: string;
  iface: string;
  throughput: string;
  sessions: string;
  lastSeen: string;
  agent: string;
  vendor?: string;
  serial_number?: string;
  hostname?: string;
  location?: string;
}

export interface Vm {
  id: string;
  host: string;
  cluster: string;
  os: string;
  cpu: string;
  mem: string;
  disk: string;
  state: string;
  cpuUse: number;
  memUse: number;
  ip: string;
}

export interface InfraAlert {
  id: string;
  sev: string;
  device: string;
  /** the alerting device's kind (switch, firewall, …), sent by the alerts API */
  deviceKind?: string;
  site: string;
  title: string;
  detail: string;
  since: string;
  rule: string;
}

export interface Exporter {
  name: string;
  version: string;
  hosts: number;
  scrapes: string;
  lag: string;
  status: string;
  sites: string[];
  port?: number;       // /metrics port (Prometheus scrape target)
  protocol?: string;   // HTTP · SNMP · Redfish · IPMI
  note?: string;       // operational note surfaced when degraded
}

export interface MarketDay {
  date: string;                    // ISO "2026-01-26"
  kind: "holiday" | "mock";
  name: string;
  segments: string[];
}

export interface BodCheck {
  env: string;
  kind: "url" | "telnet" | "k8s";
  target: string;
  port: number | null;
  code: number | null;
  ssl_expiry: string;
  ssl_days: number | null;
  status: 0 | 1 | 2 | 3;   // 0 down · 1 warn · 2 ok · 3 timeout
  remark: string;
  note: string;
  order: number;
}

export interface Problem {
  id: string;
  title: string;
  status: string;
  priority: number;
  assignee: string;
  linked: number;
  created: string;
  age: string;
  impact: string;
  kb: string | null;
}

export interface Change {
  id: string;
  title: string;
  type: string;
  state: string;
  risk: string;
  window: string;
  assignee: string;
  approvers: number;
  approved: number;
  tenant?: string;
  service: string;
}

export interface CatalogCategory {
  id: string;
  label: string;
  icon: string;
  count: number;
  color: string;
}

export interface CatalogItem {
  id: string;
  cat: string;
  title: string;
  desc: string;
  sla: string;
  eta: string;
  popular?: boolean;
  badge?: string;
}

export interface ConfigItem {
  id: string;
  name: string;
  cls: string;
  env: string;
  region: string;
  owner: string | null;
  health: string;
  deps: number;
}

export interface Article {
  id: string;
  title: string;
  cat: string;
  views: number;
  upd: string;
  author: string;
  rating: number;
  tag: string;
}

export interface Sla {
  id: string;
  name: string;
  target: string;
  window: string;
  breach: number;
  compliance: number;
}

// ── Device onboarding wizard data ───────────────────────────────────────────

export interface OnboardDeviceType {
  id: string;
  label: string;
  icon: string;
  brand?: boolean;
}

export interface MonitoringMethod {
  id: string;
  label: string;
  hint: string;
}

export interface VendorModel {
  model: string;
  type: string;
  methods: string[];
  snmp: string | null;
  role: string | null;
  caps: string[];
}

export interface CredentialProfile {
  id: string;
  name: string;
  method: string;
  detail: string;
}
