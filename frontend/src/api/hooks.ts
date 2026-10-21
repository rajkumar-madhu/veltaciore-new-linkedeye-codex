// Typed TanStack Query hooks over the DRF API.
//
// Every hook degrades gracefully: when the backend is unreachable the screen
// keeps rendering its seed dataset (the same data the backend serves), so the
// frontend remains fully demoable standalone. Screens read `data` and fall
// back to their local constant when it is undefined.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, unwrap, type Paginated } from "@/api/client";
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
    queryFn: () => apiGet<Paginated<InfraAlert> | InfraAlert[]>("/infra/alerts/").then(unwrap),
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
    queryFn: () => {
      // Relative presets are resolved at fetch time so each refetch slides the window.
      const span = PRESET_SECONDS[preset] ?? 3600;
      const end = live ? Date.now() : (to as number);
      const start = live ? end - span * 1000 : (from as number);
      return apiGet<MetricsResponse>(`/infra/${kind}/${id}/metrics/`, {
        start: new Date(start).toISOString(),
        end: new Date(end).toISOString(),
      });
    },
    refetchInterval: live ? 30_000 : false,
  });
}

const PRESET_SECONDS: Record<string, number> = Object.fromEntries(PRESETS.map((p) => [p.id, p.seconds]));

export function useDeviceMetrics(deviceId: string | undefined, preset: string, from: number | null, to: number | null) {
  return useMetrics("devices", deviceId, preset, from, to);
}

export function useVmMetrics(vmId: string | undefined, preset: string, from: number | null, to: number | null) {
  return useMetrics("vms", vmId, preset, from, to);
}
