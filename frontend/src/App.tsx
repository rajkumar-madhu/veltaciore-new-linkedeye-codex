// Root component: chrome + routing. Ported from app.jsx.
import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Sidebar, Header, TenantSwitcher } from "@/components/Shell";
import { useUiStore, NO_TENANT } from "@/store/ui";
import { useNav } from "@/hooks/useNav";
import { useTenants } from "@/api/hooks";
import { cx } from "@/components/ui";

/**
 * Sync the acting tenant to the live backend. Offline (data undefined) we keep
 * the seed tenant so the demo still works; online we adopt the real tenants —
 * selecting the first, or the empty placeholder when a clean deployment has none.
 */
function useTenantBootstrap() {
  const { data } = useTenants();
  const tenant = useUiStore((s) => s.tenant);
  const setTenant = useUiStore((s) => s.setTenant);
  React.useEffect(() => {
    if (!data) return;
    if (data.length === 0) {
      if (tenant.id !== NO_TENANT.id) setTenant(NO_TENANT);
    } else if (!data.some((t) => t.id === tenant.id)) {
      setTenant(data[0]);
    }
  }, [data, tenant.id, setTenant]);
}

const DashboardScreen = React.lazy(() => import("@/screens/DashboardScreen"));
const IncidentsScreen = React.lazy(() => import("@/screens/IncidentsScreen"));
const IncidentDetailScreen = React.lazy(() => import("@/screens/IncidentDetailScreen"));
const IncidentNewScreen = React.lazy(() => import("@/screens/IncidentNewScreen"));
const CrossTenantScreen = React.lazy(() => import("@/screens/CrossTenantScreen"));
const AdminTenantsScreen = React.lazy(() => import("@/screens/AdminTenantsScreen"));
const AdminBillingScreen = React.lazy(() => import("@/screens/AdminBillingScreen"));
const AdminUsageScreen = React.lazy(() => import("@/screens/AdminUsageScreen"));
const OnboardingScreen = React.lazy(() => import("@/screens/OnboardingScreen"));
const SignInScreen = React.lazy(() => import("@/screens/SignInScreen"));
const SettingsScreen = React.lazy(() => import("@/screens/SettingsScreen"));
const UsersScreen = React.lazy(() => import("@/screens/UsersScreen"));
const RunbooksScreen = React.lazy(() => import("@/screens/RunbooksScreen"));
const IntegrationsScreen = React.lazy(() => import("@/screens/IntegrationsScreen"));
const IntegrationDetailScreen = React.lazy(() => import("@/screens/IntegrationDetailScreen"));
const ProblemsScreen = React.lazy(() => import("@/screens/ProblemsScreen"));
const ProblemDetailScreen = React.lazy(() => import("@/screens/ProblemDetailScreen"));
const ProblemNewScreen = React.lazy(() => import("@/screens/ProblemNewScreen"));
const ChangesScreen = React.lazy(() => import("@/screens/ChangesScreen"));
const ChangeDetailScreen = React.lazy(() => import("@/screens/ChangeDetailScreen"));
const ChangeNewScreen = React.lazy(() => import("@/screens/ChangeNewScreen"));
const CatalogScreen = React.lazy(() => import("@/screens/CatalogScreen"));
const CatalogRequestScreen = React.lazy(() =>
  import("@/screens/CatalogScreen").then((module) => ({ default: module.CatalogRequestScreen })),
);
const CMDBScreen = React.lazy(() => import("@/screens/CMDBScreen"));
const KnowledgeScreen = React.lazy(() => import("@/screens/KnowledgeScreen"));
const KnowledgeArticleScreen = React.lazy(() =>
  import("@/screens/KnowledgeScreen").then((module) => ({ default: module.KnowledgeArticleScreen })),
);
const FlowScreen = React.lazy(() => import("@/screens/FlowScreen"));
const ReportsScreen = React.lazy(() => import("@/screens/ReportsScreen"));
const SLAScreen = React.lazy(() =>
  import("@/screens/ReportsScreen").then((module) => ({ default: module.SLAScreen })),
);
const InfraScreen = React.lazy(() => import("@/screens/InfraScreen"));
const InfraAssetsScreen = React.lazy(() => import("@/screens/InfraAssetsScreen"));
const InfraDeviceScreen = React.lazy(() => import("@/screens/InfraDeviceScreen"));
const FirewallDetailScreen = React.lazy(() => import("@/screens/FirewallDetailScreen"));
const SwitchDetailScreen = React.lazy(() => import("@/screens/SwitchDetailScreen"));
const ServerDetailScreen = React.lazy(() => import("@/screens/ServerDetailScreen"));
const StorageDetailScreen = React.lazy(() => import("@/screens/StorageDetailScreen"));
const LoadBalancerDetailScreen = React.lazy(() => import("@/screens/LoadBalancerDetailScreen"));
const UpsDetailScreen = React.lazy(() => import("@/screens/UpsDetailScreen"));
const InfraTopologyScreen = React.lazy(() => import("@/screens/InfraTopologyScreen"));
const DeviceOnboardingWizard = React.lazy(() => import("@/screens/DeviceOnboardingWizard"));
const InfraVMsScreen = React.lazy(() => import("@/screens/InfraVMsScreen"));
const InfraRackScreen = React.lazy(() => import("@/screens/InfraRackScreen"));
const InfraExportersScreen = React.lazy(() => import("@/screens/InfraExportersScreen"));
const MonitoringTemplatesScreen = React.lazy(() => import("@/screens/MonitoringTemplatesScreen"));
const VmDetailScreen = React.lazy(() => import("@/screens/VmDetailScreen"));
const DomainsScreen = React.lazy(() => import("@/screens/DomainsScreen"));
const UrlCheckerScreen = React.lazy(() => import("@/screens/UrlCheckerScreen"));
const TelnetMonitoringScreen = React.lazy(() => import("@/screens/TelnetMonitoringScreen"));
const HeatmapScreen = React.lazy(() => import("@/screens/HeatmapScreen"));
const APMScreen = React.lazy(() => import("@/screens/APMScreen"));
const APMCatalogScreen = React.lazy(() => import("@/screens/APMCatalogScreen"));
const AppDetailScreen = React.lazy(() => import("@/screens/AppDetailScreen"));
const LogsScreen = React.lazy(() => import("@/screens/LogsScreen"));
const AlertsScreen = React.lazy(() => import("@/screens/AlertsScreen"));
const AlertGroupingScreen = React.lazy(() => import("@/screens/AlertGroupingScreen"));
const StatusPageScreen = React.lazy(() => import("@/screens/StatusPageScreen"));
const RetroScreen = React.lazy(() => import("@/screens/RetroScreen"));
const EntityMapScreen = React.lazy(() => import("@/screens/EntityMapScreen"));
const OrderLatencyScreen = React.lazy(() => import("@/screens/OrderLatencyScreen"));
const CtclMonitorScreen = React.lazy(() => import("@/screens/CtclMonitorScreen"));
const MetricsExplorerScreen = React.lazy(() => import("@/screens/MetricsExplorerScreen"));
const SyntheticsScreen = React.lazy(() => import("@/screens/SyntheticsScreen"));
const SlosScreen = React.lazy(() => import("@/screens/SlosScreen"));
const MonitorsScreen = React.lazy(() => import("@/screens/MonitorsScreen"));
const HostMapScreen = React.lazy(() => import("@/screens/HostMapScreen"));
const NodeViewScreen = React.lazy(() => import("@/screens/NodeViewScreen"));
const MarketCalendarScreen = React.lazy(() => import("@/screens/MarketCalendarScreen"));
const BodChecksScreen = React.lazy(() => import("@/screens/BodChecksScreen"));
const BodEodScreen = React.lazy(() => import("@/screens/BodEodScreen"));
const SiteDetailScreen = React.lazy(() => import("@/screens/SiteDetailScreen"));

const ROUTE_MSG = "min-h-[45vh] grid place-content-center justify-items-center gap-2.5 text-fg-muted text-xs";

function RouteLoading() {
  return (
    <div className={ROUTE_MSG} role="status" aria-live="polite">
      <span className="w-[22px] h-[22px] border-2 border-line border-t-accent rounded-[50%] animate-[route-loading-spin_0.7s_linear_infinite] motion-reduce:animate-none" aria-hidden="true" />
      <span>Loading workspace…</span>
    </div>
  );
}

/**
 * Catches render errors from a route, most often a lazy chunk that failed to
 * download (e.g. its hashed file was removed by a newer deploy). Keeps the
 * shell usable instead of letting React unmount the whole tree. Keyed by
 * pathname so navigating elsewhere clears the error.
 */
class RouteErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("Route failed to render", error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className={ROUTE_MSG} role="alert">
        <span>This page failed to load.</span>
        <button className="inline-flex items-center gap-1.5 h-8 py-1.5 px-3 text-[12.5px] font-medium tracking-[-0.005em] rounded-[5px] border border-line-strong bg-bg-raised text-fg whitespace-nowrap cursor-pointer [transition:all_.12s] hover:bg-bg-muted hover:border-fg-faint" type="button" onClick={() => window.location.reload()}>
          Reload
        </button>
      </div>
    );
  }
}

export default function App() {
  const { route } = useNav();
  const location = useLocation();
  const tweaks = useUiStore((s) => s.tweaks);
  const nav = useUiStore((s) => s.nav);
  const setSwitcher = useUiStore((s) => s.setSwitcher);
  useTenantBootstrap();

  React.useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSwitcher(true);
      }
      if (e.key === "Escape") setSwitcher(false);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [setSwitcher]);

  // Derive the document theme attributes from tweaks
  React.useEffect(() => {
    document.documentElement.style.setProperty("--accent", tweaks.accent);
    document.body.setAttribute("data-theme", tweaks.dark ? "dark" : "light");
    document.body.setAttribute("data-density", tweaks.density);
    document.body.setAttribute("data-sidebar", tweaks.sidebarStyle);
    document.body.style.fontSize = tweaks.fontSize + "px";
  }, [tweaks.accent, tweaks.dark, tweaks.density, tweaks.sidebarStyle, tweaks.fontSize]);

  const noChrome = route === "onboarding" || route === "sign-in";

  return (
    <>
      {/* group/app + data-nav drive the sidebar / header variants in Shell.tsx */}
      <div
        data-nav={nav}
        className={cx(
          "group/app grid h-screen overflow-hidden",
          noChrome
            ? "grid-cols-[1fr] grid-rows-[1fr] [grid-template-areas:'main']"
            : cx(
                "grid-cols-[var(--sidebar)_1fr] grid-rows-[var(--header)_1fr] [grid-template-areas:'sidebar_header'_'sidebar_main']",
                // icon rail (68px) when collapsed and on narrow screens; no rail on phones
                "max-[900px]:[--sidebar:68px] max-[560px]:[--sidebar:0px]",
              ),
          nav === "collapsed" && "[--sidebar:68px]",
        )}
      >
        {!noChrome && <Sidebar />}
        {!noChrome && <Header />}
        <main className="[grid-area:main] overflow-auto relative [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-thumb]:[background:var(--border-strong)_padding-box_content-box] [&::-webkit-scrollbar-thumb]:rounded-[5px] [&::-webkit-scrollbar-thumb]:[border:2px_solid_var(--bg)] [&::-webkit-scrollbar-thumb:hover]:[background:var(--fg-faint)_padding-box_content-box]">
          <RouteErrorBoundary key={location.pathname}>
          <React.Suspense fallback={<RouteLoading />}>
            <Routes>
            <Route path="/" element={<DashboardScreen />} />
            <Route path="/dashboard" element={<Navigate to="/" replace />} />
            <Route path="/incidents" element={<IncidentsScreen />} />
            <Route path="/incident-detail" element={<IncidentDetailScreen />} />
            <Route path="/incident-new" element={<IncidentNewScreen />} />
            <Route path="/cross-tenant" element={<CrossTenantScreen />} />
            <Route path="/admin-tenants" element={<AdminTenantsScreen />} />
            <Route path="/admin-billing" element={<AdminBillingScreen />} />
            <Route path="/admin-usage" element={<AdminUsageScreen />} />
            <Route path="/onboarding" element={<OnboardingScreen />} />
            <Route path="/sign-in" element={<SignInScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
            <Route path="/users" element={<UsersScreen />} />
            <Route path="/runbooks" element={<RunbooksScreen />} />
            <Route path="/integrations" element={<IntegrationsScreen />} />
            <Route path="/integration-detail" element={<IntegrationDetailScreen />} />
            <Route path="/problems" element={<ProblemsScreen />} />
            <Route path="/problem-detail" element={<ProblemDetailScreen />} />
            <Route path="/problem-new" element={<ProblemNewScreen />} />
            <Route path="/changes" element={<ChangesScreen />} />
            <Route path="/change-detail" element={<ChangeDetailScreen />} />
            <Route path="/change-new" element={<ChangeNewScreen />} />
            <Route path="/catalog" element={<CatalogScreen />} />
            <Route path="/catalog-request" element={<CatalogRequestScreen />} />
            <Route path="/cmdb" element={<CMDBScreen />} />
            <Route path="/knowledge" element={<KnowledgeScreen />} />
            <Route path="/knowledge-article" element={<KnowledgeArticleScreen />} />
            <Route path="/flow" element={<FlowScreen />} />
            <Route path="/reports" element={<ReportsScreen />} />
            <Route path="/slas" element={<SLAScreen />} />
            <Route path="/infra" element={<InfraScreen />} />
            <Route path="/infra-assets" element={<InfraAssetsScreen />} />
            <Route path="/infra-device" element={<InfraDeviceScreen />} />
            <Route path="/firewall-detail" element={<FirewallDetailScreen />} />
            <Route path="/switch-detail" element={<SwitchDetailScreen />} />
            <Route path="/server-detail" element={<ServerDetailScreen />} />
            <Route path="/storage-detail" element={<StorageDetailScreen />} />
            <Route path="/loadbal-detail" element={<LoadBalancerDetailScreen />} />
            <Route path="/ups-detail" element={<UpsDetailScreen />} />
            <Route path="/infra-topology" element={<InfraTopologyScreen />} />
            <Route path="/infra-onboarding" element={<DeviceOnboardingWizard />} />
            <Route path="/infra-vms" element={<InfraVMsScreen />} />
            <Route path="/infra-rack" element={<InfraRackScreen />} />
            <Route path="/infra-exporters" element={<InfraExportersScreen />} />
            <Route path="/infra-templates" element={<MonitoringTemplatesScreen />} />
            <Route path="/vm-detail" element={<VmDetailScreen />} />
            <Route path="/domains" element={<DomainsScreen />} />
            <Route path="/url-checker" element={<UrlCheckerScreen />} />
            <Route path="/telnet-monitoring" element={<TelnetMonitoringScreen />} />
            <Route path="/heatmap" element={<HeatmapScreen />} />
            <Route path="/apm" element={<APMScreen />} />
            <Route path="/apm-catalog" element={<APMCatalogScreen />} />
            <Route path="/app-detail" element={<AppDetailScreen />} />
            <Route path="/logs" element={<LogsScreen />} />
            <Route path="/alerts" element={<AlertsScreen />} />
            <Route path="/alert-grouping" element={<AlertGroupingScreen />} />
            <Route path="/status-page" element={<StatusPageScreen />} />
            <Route path="/retro" element={<RetroScreen />} />
            <Route path="/entity-map" element={<EntityMapScreen />} />
            <Route path="/order-latency" element={<OrderLatencyScreen />} />
            <Route path="/ctcl-monitor" element={<CtclMonitorScreen />} />
            <Route path="/metrics" element={<MetricsExplorerScreen />} />
            <Route path="/synthetics" element={<SyntheticsScreen />} />
            <Route path="/slos" element={<SlosScreen />} />
            <Route path="/monitors" element={<MonitorsScreen />} />
            <Route path="/host-map" element={<HostMapScreen />} />
            <Route path="/node" element={<NodeViewScreen />} />
            <Route path="/market-calendar" element={<MarketCalendarScreen />} />
            <Route path="/bod-checks" element={<BodChecksScreen />} />
            <Route path="/bod-eod" element={<BodEodScreen />} />
            <Route path="/site-detail" element={<SiteDetailScreen />} />
            <Route path="/lesites" element={<SiteDetailScreen />} />
            <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </React.Suspense>
          </RouteErrorBoundary>
        </main>
      </div>
      <TenantSwitcher />
    </>
  );
}
