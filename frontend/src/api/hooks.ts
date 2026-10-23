// Typed TanStack Query hooks over the DRF API.
//
// Every hook degrades gracefully: when the backend is unreachable the screen
// keeps rendering its seed dataset (the same data the backend serves), so the
// frontend remains fully demoable standalone. Screens read `data` and fall
// back to their local constant when it is undefined.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiGetAll, apiGetAllClients, apiPost, apiPatch, unwrap, type Paginated } from "@/api/client";
import { useUiStore } from "@/store/ui";
import { PRESETS } from "@/store/timeRange";
import type {
  Tenant,
  Site,
  Device,
  Vm,
  InfraAlert,
  Exporter,
  BodCheck,
  MarketDay,
  Incident,
  Problem,
  Change,
  ConfigItem,
  Article,
  Sla,
  Service,
} from "@/lib/types";
import type { SnIncident } from "@/screens/IncidentsScreen";
import type { SnProblem } from "@/screens/ProblemsScreen";
import type { SnChange } from "@/screens/ChangesScreen";
import type { Rack } from "@/data/racks";

function useTenantId(): string {
  return useUiStore((s) => s.tenant.id);
}

/** Shared options: quiet failure (fallback data path), 30s refresh for live data. */
const quiet = { retry: 0, refetchOnWindowFocus: false } as const;

export function useTenants() {
  return useQuery({
    ...quiet,
    queryKey: ["tenants"],
    queryFn: () => apiGet<Paginated<Tenant> | Tenant[]>("/tenants/").then(unwrap),
  });
}

export function useSites() {
  return useQuery({
    ...quiet,
    queryKey: ["sites"],
    queryFn: () => apiGet<Paginated<Site> | Site[]>("/infra/sites/").then(unwrap),
  });
}

export function useDevices(siteId?: string, search?: string) {
  const tenant = useTenantId();
  return useQuery({
    ...quiet,
    queryKey: ["devices", tenant, siteId, search],
    queryFn: () =>
      apiGet<Paginated<Device> | Device[]>("/infra/devices/", { site: siteId, search }).then(unwrap),
    refetchInterval: 30_000,
  });
}

export function useDevice(deviceId?: string) {
  return useQuery({
    ...quiet,
    enabled: !!deviceId,
    queryKey: ["device", deviceId],
    queryFn: () => apiGet<Device>(`/infra/devices/${deviceId}/`),
    refetchInterval: 30_000,
  });
}

export interface TopoLinkApi {
  src: string;
  dst: string;
  src_port: string;
  dst_port: string;
  bandwidth: number;
  status: string;
}
export interface SiteTopology {
  devices: Device[];
  links: TopoLinkApi[];
}

/** Live per-site topology (devices + links) from the backend. */
export function useTopology(siteId?: string) {
  const tenant = useTenantId();
  return useQuery({
    ...quiet,
    enabled: !!siteId,
    queryKey: ["topology", tenant, siteId],
    queryFn: () => apiGet<SiteTopology>(`/infra/sites/${siteId}/topology/`),
    refetchInterval: 15_000,
  });
}

export function useVms() {
  const tenant = useTenantId();
  return useQuery({
    ...quiet,
    queryKey: ["vms", tenant],
    queryFn: () => apiGet<Paginated<Vm> | Vm[]>("/infra/vms/").then(unwrap),
    refetchInterval: 30_000,
  });
}

export function useInfraAlerts() {
  const tenant = useTenantId();
  return useQuery({
    ...quiet,
    queryKey: ["infra-alerts", tenant],
    queryFn: () => apiGetAll<InfraAlert>("/infra/alerts/"),
    refetchInterval: 30_000,
  });
}

export function useExporters() {
  return useQuery({
    ...quiet,
    queryKey: ["exporters"],
    queryFn: () => apiGet<Paginated<Exporter> | Exporter[]>("/infra/exporters/").then(unwrap),
  });
}

export function useBodChecks() {
  return useQuery({
    ...quiet,
    queryKey: ["bod-checks"],
    queryFn: () => apiGet<Paginated<BodCheck> | BodCheck[]>("/infra/bod-checks/").then(unwrap),
  });
}

export function useRacks() {
  const tenant = useTenantId();
  return useQuery({
    ...quiet,
    queryKey: ["racks", tenant],
    queryFn: () => apiGet<Paginated<Rack> | Rack[]>("/infra/racks/").then(unwrap),
  });
}

export function useIncidents() {
  const tenant = useTenantId();
  return useQuery({
    ...quiet,
    queryKey: ["incidents", tenant],
    queryFn: () => apiGet<Paginated<Incident> | Incident[]>("/incidents/").then(unwrap),
    refetchInterval: 30_000,
  });
}

/** Patch a core incident's status (war-room Acknowledge / Resolve). */
export function useUpdateCoreIncident() {
  const qc = useQueryClient();
  const tenant = useTenantId();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Pick<Incident, "status">> }) =>
      apiPatch<Incident>(`/incidents/${id}/`, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["incidents", tenant] });
    },
  });
}

/** ServiceNow-style incident records for the list screen. */
export function useIncidentRecords(search?: string) {
  const tenant = useTenantId();
  return useQuery({
    ...quiet,
    queryKey: ["incident-records", tenant, search ?? ""],
    queryFn: () =>
      apiGet<Paginated<SnIncident> | SnIncident[]>("/incidents/records/", { search }).then(unwrap),
    refetchInterval: 30_000,
  });
}

/** Patch an incident record's state/assignee (Acknowledge/Assign/Resolve). */
export function useUpdateIncident() {
  const qc = useQueryClient();
  const tenant = useTenantId();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Pick<SnIncident, "state" | "assignee" | "pri">> }) =>
      apiPatch<SnIncident>(`/incidents/records/${id}/`, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["incident-records", tenant] });
    },
  });
}

/** Payload for creating a ServiceNow-style incident record. */
export interface NewIncident {
  title: string;
  caller: string;
  pri: number;
  category: string;
  group?: string;
  assignee?: string | null;
  state?: string;
}

/** Create an incident record; on success the Incidents list refetches. */
export function useCreateIncident() {
  const qc = useQueryClient();
  const tenant = useTenantId();
  return useMutation({
    mutationFn: (body: NewIncident) =>
      apiPost<SnIncident>("/incidents/records/", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["incident-records", tenant] });
    },
  });
}

export function useProblems() {
  const tenant = useTenantId();
  return useQuery({
    ...quiet,
    queryKey: ["problems", tenant],
    queryFn: () => apiGet<Paginated<Problem> | Problem[]>("/problems/").then(unwrap),
  });
}

/** ServiceNow-style problem records for the Problems list screen. */
export function useProblemRecords(search?: string) {
  const tenant = useTenantId();
  return useQuery({
    ...quiet,
    queryKey: ["problem-records", tenant, search ?? ""],
    queryFn: () =>
      apiGet<Paginated<SnProblem> | SnProblem[]>("/problems/records/", { search }).then(unwrap),
    refetchInterval: 30_000,
  });
}

export interface NewProblem {
  title: string;
  caller: string;
  pri: number;
  category: string;
  group?: string;
  assignee?: string | null;
  state?: string;
}

/** Create a problem record; on success the Problems list refetches. */
export function useCreateProblem() {
  const qc = useQueryClient();
  const tenant = useTenantId();
  return useMutation({
    mutationFn: (body: NewProblem) => apiPost<SnProblem>("/problems/records/", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["problem-records", tenant] });
    },
  });
}

/** Patch a problem record's state/assignee. */
export function useUpdateProblem() {
  const qc = useQueryClient();
  const tenant = useTenantId();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Pick<SnProblem, "state" | "assignee" | "pri">> }) =>
      apiPatch<SnProblem>(`/problems/records/${id}/`, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["problem-records", tenant] });
    },
  });
}

export function useChanges() {
  const tenant = useTenantId();
  return useQuery({
    ...quiet,
    queryKey: ["changes", tenant],
    queryFn: () => apiGet<Paginated<Change> | Change[]>("/changes/").then(unwrap),
  });
}

/** ServiceNow-style change records for the Changes list screen. */
export function useChangeRecords(search?: string) {
  const tenant = useTenantId();
  return useQuery({
    ...quiet,
    queryKey: ["change-records", tenant, search ?? ""],
    queryFn: () =>
      apiGet<Paginated<SnChange> | SnChange[]>("/changes/records/", { search }).then(unwrap),
    refetchInterval: 30_000,
  });
}

export interface NewChange {
  title: string;
  caller: string;
  pri: number;
  category: string;
  risk?: string;
  group?: string;
  assignee?: string | null;
  state?: string;
}

/** Create a change record; on success the Changes list refetches. */
export function useCreateChange() {
  const qc = useQueryClient();
  const tenant = useTenantId();
  return useMutation({
    mutationFn: (body: NewChange) => apiPost<SnChange>("/changes/records/", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["change-records", tenant] });
    },
  });
}

/** Patch a change record's state/assignee. */
export function useUpdateChange() {
  const qc = useQueryClient();
  const tenant = useTenantId();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Pick<SnChange, "state" | "assignee" | "pri">> }) =>
      apiPatch<SnChange>(`/changes/records/${id}/`, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["change-records", tenant] });
    },
  });
}

export function useConfigItems() {
  const tenant = useTenantId();
  return useQuery({
    ...quiet,
    queryKey: ["config-items", tenant],
    queryFn: () => apiGet<Paginated<ConfigItem> | ConfigItem[]>("/cmdb/config-items/").then(unwrap),
  });
}

export function useArticles() {
  return useQuery({
    ...quiet,
    queryKey: ["articles"],
    queryFn: () => apiGet<Paginated<Article> | Article[]>("/knowledge/articles/").then(unwrap),
  });
}

export function useSlas() {
  return useQuery({
    ...quiet,
    queryKey: ["slas"],
    queryFn: () => apiGet<Paginated<Sla> | Sla[]>("/slas/").then(unwrap),
  });
}

export function useServices() {
  const tenant = useTenantId();
  return useQuery({
    ...quiet,
    queryKey: ["services", tenant],
    queryFn: () => apiGet<Paginated<Service> | Service[]>("/services/").then(unwrap),
    refetchInterval: 30_000,
  });
}

// ── Trading Ops ────────────────────────────────────────────────────────────

export interface LatencyHourly {
  label: string;
  orders: number;
  oms_med: number;
  oms_p99: number;
  exch_med: number;
  exch_p99: number;
}

export interface LatencySegment {
  seg: string;
  count: number;
  pct: number;
  oms_med: number;
  oms_p99: number;
  exch_med: number;
  exch_p99: number;
}

export interface OrderRecord {
  ord: string;
  seg: string;
  rmks: string;
  oms: number;
  lat: number | string;
  exch: number | string;
  conf: number;
  omsT: number;
  exchT: number;
}

export function useLatencyHourly() {
  return useQuery({
    ...quiet,
    queryKey: ["latency-hourly"],
    queryFn: () => apiGet<LatencyHourly[]>("/trading/latency/hourly/"),
    refetchInterval: 30_000,
  });
}

export function useMarketCalendar() {
  return useQuery({
    ...quiet,
    queryKey: ["market-calendar"],
    queryFn: () => apiGet<MarketDay[]>("/trading/calendar/"),
  });
}

export function useLatencySegments() {
  return useQuery({
    ...quiet,
    queryKey: ["latency-segments"],
    queryFn: () => apiGet<LatencySegment[]>("/trading/latency/segments/"),
  });
}

export function useOrderRecords() {
  return useQuery({
    ...quiet,
    queryKey: ["order-records"],
    queryFn: () => apiGet<OrderRecord[]>("/trading/latency/orders/"),
  });
}

export interface CtclLine {
  id: string;
  segment: string;
  role: string;
  samples: number | null;
  status: string;
  series: (number | null)[];
}

export interface BrokerCtcl {
  n: string;
  ctcls: Record<string, string>;
  nse: number;
  nfo: number;
  bse: number;
  bfo: number;
}

export function useCtclLines() {
  return useQuery({
    ...quiet,
    queryKey: ["ctcl-lines"],
    queryFn: () => apiGet<CtclLine[]>("/trading/ctcl/lines/"),
    refetchInterval: 30_000,
  });
}

export function useBrokers() {
  return useQuery({
    ...quiet,
    queryKey: ["brokers"],
    queryFn: () => apiGet<BrokerCtcl[]>("/trading/ctcl/brokers/"),
  });
}

// ── Device / VM metrics (Prometheus via the API) ───────────────────────────

export interface MetricSeries {
  key: string;
  label: string;
  unit: string;
  group: string;
  /** parts of a whole (e.g. CPU modes) — drawn stacked */
  stack?: boolean;
  /** [unix seconds, value] */
  points: [number, number][];
}

export interface MetricsResponse {
  family: string | null;
  /** "prometheus" = real data; "unavailable" / "unsupported" = no data, see message */
  source: "prometheus" | "unavailable" | "unsupported";
  message?: string;
  start: string;
  end: string;
  step: number;
  series: MetricSeries[];
}

function useMetrics(kind: "devices" | "vms", id: string | undefined, preset: string, from: number | null, to: number | null) {
  const tenant = useTenantId();
  const live = preset !== "custom";
  return useQuery({
    retry: 0,
    refetchOnWindowFocus: false,
    enabled: !!id,
    queryKey: ["metrics", kind, tenant, id, preset, from, to],
    queryFn: () => apiGet<MetricsResponse>(`/infra/${kind}/${id}/metrics/`, rangeParams(preset, from, to)),
    refetchInterval: live ? 30_000 : false,
  });
}

const PRESET_SECONDS: Record<string, number> = Object.fromEntries(PRESETS.map((p) => [p.id, p.seconds]));

/** start/end query params; relative presets are resolved at fetch time so each refetch slides the window. */
function rangeParams(preset: string, from: number | null, to: number | null) {
  const live = preset !== "custom";
  const span = PRESET_SECONDS[preset] ?? 3600;
  const end = live ? Date.now() : (to as number);
  const start = live ? end - span * 1000 : (from as number);
  return { start: new Date(start).toISOString(), end: new Date(end).toISOString() };
}

export function useDeviceMetrics(deviceId: string | undefined, preset: string, from: number | null, to: number | null) {
  return useMetrics("devices", deviceId, preset, from, to);
}

export function useVmMetrics(vmId: string | undefined, preset: string, from: number | null, to: number | null) {
  return useMetrics("vms", vmId, preset, from, to);
}

// ── Device relationships (site / rack / VMs / NIC → switch port) ───────────

export interface PeerRef {
  id: string | null;
  /** true when the linked device belongs to a tenant the caller can't see */
  restricted: boolean;
  name?: string;
  kind?: string;
  model?: string;
  ip?: string;
  status?: string;
}

export interface NicLink {
  name: string;
  description: string;
  mac: string;
  speed: string;
  admin_status: string;
  oper_status: string;
  vlan: string;
  mtu: number;
  rx_mbps: number;
  tx_mbps: number;
  connected_to: { peer: PeerRef; port: string; bandwidth: string; status: string } | null;
}

export interface DeviceRelationships {
  device: { id: string; kind: string; model: string; ip: string };
  site: { id: string; name: string };
  rack: { id: string; name: string; u_top: number; u_bottom: number } | null;
  vms: Vm[];
  nics: NicLink[];
  other_links: { local_port: string; peer_port: string; peer: PeerRef; bandwidth: string; status: string }[];
}

export function useDeviceRelationships(deviceId?: string) {
  const tenant = useTenantId();
  return useQuery({
    ...quiet,
    enabled: !!deviceId,
    queryKey: ["device-relationships", tenant, deviceId],
    queryFn: () => apiGet<DeviceRelationships>(`/infra/devices/${deviceId}/relationships/`),
    refetchInterval: 60_000,
  });
}

// ── Device inventory: processes, services, filesystems (Prometheus, now) ───

export interface DeviceProcess { name: string; cpu: number; mem_bytes: number | null; threads: number | null }

export interface DeviceInventory {
  family: string | null;
  source: "prometheus" | "unavailable" | "unsupported";
  message?: string;
  processes: DeviceProcess[];
  services: { running: number; stopped: number; other: number; problems: { name: string; state: string; start_mode: string }[] } | null;
  filesystems: { mount: string; size_bytes: number; used_bytes: number | null; used_pct: number | null }[];
}

export function useDeviceInventory(deviceId?: string, top = 10) {
  const tenant = useTenantId();
  return useQuery({
    ...quiet,
    enabled: !!deviceId,
    queryKey: ["device-inventory", tenant, deviceId, top],
    queryFn: () => apiGet<DeviceInventory>(`/infra/devices/${deviceId}/inventory/`, { top: String(top) }),
    refetchInterval: 30_000,
  });
}

// ── Hardware: iDRAC / iLO via the Redfish exporter ─────────────────────────

export interface BmcController {
  id: string;
  kind: "idrac" | "ilo" | string;
  vendor: string;
  model: string;
  ip: string;
  firmware: string;
  health: "ok" | "warn" | "crit" | "unknown";
  /** temperature (°C), fan (RPM), power (W) over the selected range */
  sensors: MetricSeries[];
}

export interface DeviceHardware {
  source: "prometheus" | "unavailable" | "none";
  message?: string;
  start: string;
  end: string;
  controllers: BmcController[];
}

export function useDeviceHardware(deviceId: string | undefined, preset: string, from: number | null, to: number | null) {
  const tenant = useTenantId();
  return useQuery({
    ...quiet,
    enabled: !!deviceId,
    queryKey: ["device-hardware", tenant, deviceId, preset, from, to],
    queryFn: () => apiGet<DeviceHardware>(`/infra/devices/${deviceId}/hardware/`, rangeParams(preset, from, to)),
    refetchInterval: preset !== "custom" ? 60_000 : false,
  });
}

// ── Device logs (Windows Event Logs / journal) from Loki ────────────────────

export interface LogEntry { ts: string; level: "critical" | "error" | "warning" | "info" | "debug"; source: string; event_id?: string | number | null; message: string }

export interface DeviceLogs {
  source: "loki" | "unavailable";
  message?: string;
  query: string;
  entries: LogEntry[];
}

export function useDeviceLogs(deviceId: string | undefined, preset: string, from: number | null, to: number | null, search: string, level: string, kind: "devices" | "vms" = "devices") {
  const tenant = useTenantId();
  return useQuery({
    ...quiet,
    enabled: !!deviceId,
    queryKey: ["logs", kind, tenant, deviceId, preset, from, to, search, level],
    queryFn: () => apiGet<DeviceLogs>(`/infra/${kind}/${deviceId}/logs/`, { ...rangeParams(preset, from, to), search, level, limit: "200" }),
    refetchInterval: preset !== "custom" ? 30_000 : false,
  });
}

// ── VM inventory: VMware Tools, snapshots, guest disks, datastore ──────────

export interface VmInventory {
  source: "prometheus" | "unavailable";
  message?: string;
  found?: boolean;
  host?: string;
  cluster?: string;
  datacenter?: string;
  powered_on?: boolean;
  boot_time?: string | null;
  tools?: { status: string; version: string };
  snapshots?: { name: string; created: string }[];
  disks?: { partition: string; capacity_bytes: number; free_bytes: number | null; used_pct: number | null }[];
  datastore?: { name: string; capacity: number | null; free: number | null; provisioned: number | null; accessible: number | null } | null;
}

export function useVmInventory(vmId?: string) {
  const tenant = useTenantId();
  return useQuery({
    ...quiet,
    enabled: !!vmId,
    queryKey: ["vm-inventory", tenant, vmId],
    queryFn: () => apiGet<VmInventory>(`/infra/vms/${vmId}/inventory/`),
    refetchInterval: 60_000,
  });
}

// ── Cross-client rollup (admins; read without a client header) ────────────

export interface ClientSummary {
  id: string; name: string; code: string; color: string; plan: string;
  tickets_total: number; tickets_open: number; sla_met_pct: number | null; sla_breached: number;
  incidents_active: number; sev1: number; sev2: number;
  changes_open: number; changes_implementing: number;
  devices_total: number; devices_down: number; devices_warn: number; devices_online_pct: number | null;
  alerts_open: number; alerts_critical: number;
}

export interface CrossClientSummary {
  clients: ClientSummary[];
  totals: Omit<ClientSummary, "id" | "name" | "code" | "color" | "plan" | "sla_met_pct">;
}

export function useCrossClientSummary() {
  return useQuery({
    ...quiet,
    queryKey: ["cross-client-summary"],
    queryFn: () => apiGetAllClients<CrossClientSummary>("/tenants-summary/"),
    refetchInterval: 60_000,
  });
}

// ── Fleet load: live CPU / memory per server from Prometheus ───────────────

export interface FleetLoad {
  source: "prometheus" | "unavailable";
  message?: string;
  devices: { id: string; cpu: number | null; mem: number | null }[];
}

export function useDeviceLoad() {
  const tenant = useTenantId();
  return useQuery({
    ...quiet,
    queryKey: ["device-load", tenant],
    queryFn: () => apiGet<FleetLoad>("/infra/devices/load/"),
    refetchInterval: 30_000,
  });
}
