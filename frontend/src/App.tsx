// Root component: chrome + routing. Ported from app.jsx.
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Sidebar, Header, TenantSwitcher } from "@/components/Shell";
import { useUiStore, NO_TENANT } from "@/store/ui";
import { useNav } from "@/hooks/useNav";
import { useTenants } from "@/api/hooks";

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

import DashboardScreen from "@/screens/DashboardScreen";
import IncidentsScreen from "@/screens/IncidentsScreen";
import IncidentDetailScreen from "@/screens/IncidentDetailScreen";
import IncidentNewScreen from "@/screens/IncidentNewScreen";
import CrossTenantScreen from "@/screens/CrossTenantScreen";
import AdminTenantsScreen from "@/screens/AdminTenantsScreen";
import AdminBillingScreen from "@/screens/AdminBillingScreen";
import AdminUsageScreen from "@/screens/AdminUsageScreen";
import OnboardingScreen from "@/screens/OnboardingScreen";
import SignInScreen from "@/screens/SignInScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import UsersScreen from "@/screens/UsersScreen";
import RunbooksScreen from "@/screens/RunbooksScreen";
import IntegrationsScreen from "@/screens/IntegrationsScreen";
import IntegrationDetailScreen from "@/screens/IntegrationDetailScreen";
import ProblemsScreen from "@/screens/ProblemsScreen";
import ProblemDetailScreen from "@/screens/ProblemDetailScreen";
import ProblemNewScreen from "@/screens/ProblemNewScreen";
import ChangesScreen from "@/screens/ChangesScreen";
import ChangeDetailScreen from "@/screens/ChangeDetailScreen";
import ChangeNewScreen from "@/screens/ChangeNewScreen";
import CatalogScreen, { CatalogRequestScreen } from "@/screens/CatalogScreen";
import CMDBScreen from "@/screens/CMDBScreen";
import KnowledgeScreen, { KnowledgeArticleScreen } from "@/screens/KnowledgeScreen";
import FlowScreen from "@/screens/FlowScreen";
import ReportsScreen, { SLAScreen } from "@/screens/ReportsScreen";
import InfraScreen from "@/screens/InfraScreen";
import InfraAssetsScreen from "@/screens/InfraAssetsScreen";
import InfraDeviceScreen from "@/screens/InfraDeviceScreen";
import FirewallDetailScreen from "@/screens/FirewallDetailScreen";
import SwitchDetailScreen from "@/screens/SwitchDetailScreen";
import ServerDetailScreen from "@/screens/ServerDetailScreen";
import StorageDetailScreen from "@/screens/StorageDetailScreen";
import LoadBalancerDetailScreen from "@/screens/LoadBalancerDetailScreen";
import UpsDetailScreen from "@/screens/UpsDetailScreen";
import InfraTopologyScreen from "@/screens/InfraTopologyScreen";
import DeviceOnboardingWizard from "@/screens/DeviceOnboardingWizard";
import InfraVMsScreen from "@/screens/InfraVMsScreen";
import InfraRackScreen from "@/screens/InfraRackScreen";
import InfraExportersScreen from "@/screens/InfraExportersScreen";
import APMScreen from "@/screens/APMScreen";
import APMCatalogScreen from "@/screens/APMCatalogScreen";
import AppDetailScreen from "@/screens/AppDetailScreen";
import LogsScreen from "@/screens/LogsScreen";
import AlertsScreen from "@/screens/AlertsScreen";
import AlertGroupingScreen from "@/screens/AlertGroupingScreen";
import StatusPageScreen from "@/screens/StatusPageScreen";
import RetroScreen from "@/screens/RetroScreen";
import EntityMapScreen from "@/screens/EntityMapScreen";
import OrderLatencyScreen from "@/screens/OrderLatencyScreen";
import CtclMonitorScreen from "@/screens/CtclMonitorScreen";
import MetricsExplorerScreen from "@/screens/MetricsExplorerScreen";
import SyntheticsScreen from "@/screens/SyntheticsScreen";
import SlosScreen from "@/screens/SlosScreen";
import MonitorsScreen from "@/screens/MonitorsScreen";
import HostMapScreen from "@/screens/HostMapScreen";
import NodeViewScreen from "@/screens/NodeViewScreen";
import MarketCalendarScreen from "@/screens/MarketCalendarScreen";
import BodChecksScreen from "@/screens/BodChecksScreen";
import BodEodScreen from "@/screens/BodEodScreen";
import SiteDetailScreen from "@/screens/SiteDetailScreen";

export default function App() {
  const { route } = useNav();
  const tweaks = useUiStore((s) => s.tweaks);
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
      <div className={`app${noChrome ? " no-chrome" : ""}`}>
        {!noChrome && <Sidebar />}
        {!noChrome && <Header />}
        <main className="main">
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
        </main>
      </div>
      <TenantSwitcher />
    </>
  );
}
