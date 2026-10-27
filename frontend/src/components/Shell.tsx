// App chrome: sidebar, header, tenant switcher. Ported from shell.jsx.
import React from "react";
import { ORG, TENANTS, INCIDENTS } from "@/data/core";
import { Avatar, Pill } from "@/components/primitives";
import { useUiStore } from "@/store/ui";
import { useNav } from "@/hooks/useNav";
import { useTenants, useIncidents, useIncidentRecords, useProblemRecords, useChangeRecords, useDevices, useInfraAlerts } from "@/api/hooks";
import { useAuth } from "@/auth/auth";
import type { Tenant } from "@/lib/types";
import { cx } from "@/components/ui";

import { Icon } from "@/components/Icon";
import { BellIcon, ChevronDownIcon, CircleHelpIcon, EyeIcon, InboxIcon, LogOutIcon, MenuIcon, PlusIcon, SearchIcon, SettingsIcon, SlidersHorizontalIcon, UserIcon, XIcon } from "lucide-react";
const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  "infra-admin": "Infra Admin",
  "noc-engineer": "NOC Engineer",
  "service-desk-agent": "Service Desk",
  viewer: "Viewer",
};
const roleLabel = (r: string) => ROLE_LABELS[r] ?? r;

interface NavItem {
  id: string;
  label: string;
  icon: string;
  kbd?: string;
  badge?: { n: number | string; kind: string };
}

interface NavGroup {
  group: string;
  label: string;
  icon: string;
  items: NavItem[];
  /** detail routes that belong to this group (keeps it open and highlighted) */
  also?: string[];
}

type NavNode = NavItem | NavGroup;
const isGroup = (n: NavNode): n is NavGroup => "group" in n;

// Grouped like the LinkedEye reference: one entry per area, sub-pages inside.
const NAV: NavNode[] = [
  { id: "dashboard", label: "Dashboard", icon: "fa-gauge-high", kbd: "G D" },
  { group: "service-desk", label: "Service Desk", icon: "fa-headset", also: ["incident-detail", "incident-new", "problem-detail", "change-detail", "change-new", "catalog-request", "knowledge-article", "retro"], items: [
    { id: "incidents", label: "Incidents", icon: "fa-triangle-exclamation", badge: { n: 4, kind: "critical" } },
    { id: "problems", label: "Problems", icon: "fa-magnifying-glass-chart", badge: { n: 12, kind: "warning" } },
    { id: "changes", label: "Changes", icon: "fa-code-branch", badge: { n: 7, kind: "info" } },
    { id: "catalog", label: "Service catalog", icon: "fa-bag-shopping" },
    { id: "knowledge", label: "Knowledge base", icon: "fa-book-open" },
    { id: "slas", label: "SLA definitions", icon: "fa-stopwatch" },
    { id: "status-page", label: "Status page", icon: "fa-bullhorn" },
  ]},
  { group: "assets", label: "Assets", icon: "fa-boxes-stacked", also: ["firewall-detail", "storage-detail", "loadbal-detail", "ups-detail"], items: [
    { id: "infra-assets", label: "Asset inventory", icon: "fa-boxes-stacked", badge: { n: 1599, kind: "neutral" } },
    { id: "infra-rack", label: "Datacenter rack", icon: "fa-server" },
    { id: "site-detail", label: "Sites", icon: "fa-location-dot" },
    { id: "infra-onboarding", label: "Onboard device", icon: "fa-plus" },
  ]},
  { group: "cmdb", label: "CMDB", icon: "fa-sitemap", items: [
    { id: "cmdb", label: "Configuration items", icon: "fa-sitemap" },
    { id: "entity-map", label: "Entity map", icon: "fa-circle-nodes" },
  ]},
  { group: "monitoring", label: "Monitoring", icon: "fa-desktop", also: ["server-detail", "switch-detail", "vm-detail", "infra-device", "node"], items: [
    { id: "infra", label: "Overview", icon: "fa-chart-pie" },
    { id: "host-map", label: "Infrastructure", icon: "fa-hexagon-nodes" },
    { id: "heatmap", label: "Heatmap", icon: "fa-table-cells" },
    { id: "infra-vms", label: "Virtual Machines", icon: "fa-cube" },
    { id: "infra-topology", label: "Network Devices", icon: "fa-network-wired" },
    { id: "url-checker", label: "URL Checker", icon: "fa-link" },
    { id: "telnet-monitoring", label: "Telnet Monitoring", icon: "fa-terminal" },
    { id: "domains", label: "Domains", icon: "fa-earth-asia" },
    { id: "synthetics", label: "Uptime Checks", icon: "fa-globe" },
    { id: "infra-templates", label: "Templates", icon: "fa-layer-group" },
    { id: "infra-exporters", label: "All Exporters", icon: "fa-tower-broadcast" },
    { id: "metrics", label: "Metrics", icon: "fa-chart-line" },
    { id: "logs", label: "Logs & Events", icon: "fa-list-ul" },
    { id: "alerts", label: "Alerts", icon: "fa-bell" },
  ]},
  { group: "apm", label: "Applications", icon: "fa-cubes", also: ["app-detail"], items: [
    { id: "apm", label: "APM & traces", icon: "fa-gauge-high" },
    { id: "apm-catalog", label: "Applications Catalog", icon: "fa-cubes" },
    { id: "slos", label: "SLOs", icon: "fa-bullseye" },
    { id: "monitors", label: "Monitors", icon: "fa-bell" },
    { id: "alert-grouping", label: "Alert grouping", icon: "fa-layer-group" },
  ]},
  { group: "bod", label: "BOD / EOD", icon: "fa-clipboard-check", items: [
    { id: "bod-checks", label: "BOD checks", icon: "fa-clipboard-check", badge: { n: 2, kind: "critical" } },
    { id: "bod-eod", label: "BOD/EOD status", icon: "fa-timeline" },
    { id: "order-latency", label: "Order latency", icon: "fa-stopwatch-20", badge: { n: 1, kind: "critical" } },
    { id: "ctcl-monitor", label: "CTCL data monitor", icon: "fa-wave-square", badge: { n: 2, kind: "warning" } },
    { id: "market-calendar", label: "Market calendar", icon: "fa-calendar-days" },
  ]},
  { group: "automation", label: "Automation", icon: "fa-robot", also: ["integration-detail"], items: [
    { id: "runbooks", label: "Runbooks", icon: "fa-book", badge: { n: 184, kind: "neutral" } },
    { id: "flow", label: "Flow Designer", icon: "fa-diagram-project" },
    { id: "integrations", label: "Integrations", icon: "fa-plug" },
  ]},
  { group: "analytics", label: "Analytics", icon: "fa-chart-simple", items: [
    { id: "cross-tenant", label: "Cross-client view", icon: "fa-grip-vertical" },
  ]},
  { id: "reports", label: "Reports", icon: "fa-chart-column" },
  { group: "admin", label: "Administration", icon: "fa-gear", also: ["admin-usage"], items: [
    { id: "admin-tenants", label: "Clients", icon: "fa-building" },
    { id: "users", label: "People & roles", icon: "fa-user-gear" },
    { id: "admin-billing", label: "Billing & plans", icon: "fa-credit-card" },
    { id: "admin-usage", label: "Usage & quotas", icon: "fa-gauge-high" },
    { id: "settings", label: "Settings", icon: "fa-sliders" },
  ]},
];

const groupOf = (route: string) =>
  NAV.find((n): n is NavGroup => isGroup(n) && (n.items.some((i) => i.id === route) || !!n.also?.includes(route)))?.group;

export function colorFor(name: string): string {
  return (
    {
      amber: "linear-gradient(135deg,#f59e0b,#ef4444)",
      teal: "linear-gradient(135deg,#14b8a6,#0891b2)",
      pink: "linear-gradient(135deg,#ec4899,#8b5cf6)",
      purple: "linear-gradient(135deg,#8b5cf6,#6366f1)",
      slate: "linear-gradient(135deg,#64748b,#475569)",
      green: "linear-gradient(135deg,#10b981,#059669)",
    } as Record<string, string>
  )[name] || "linear-gradient(135deg,#2563eb,#8b5cf6)";
}

// Variants keyed on the app shell (App.tsx names the group: group/app + data-nav)
// and on <body data-sidebar="light">.
// Hidden in the icon rail: chosen with the menu button, or the default on narrow screens.
const RAIL_HIDE = "group-data-[nav=collapsed]/app:hidden max-[900px]:group-data-[nav=auto]/app:hidden";
const RAIL_CENTER = "group-data-[nav=collapsed]/app:justify-center group-data-[nav=collapsed]/app:px-0 max-[900px]:group-data-[nav=auto]/app:justify-center max-[900px]:group-data-[nav=auto]/app:px-0";
const FOCUS_SB = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#5b9bff] focus-visible:outline-offset-1";

/** A sidebar row (leaf, sub-page or group head). */
function sbItem({ active, activeGroup, sub }: { active?: boolean; activeGroup?: boolean; sub?: boolean }) {
  return cx(
    "flex items-center gap-3 w-[calc(100%-16px)] mx-2 mt-0 mb-0.5 rounded-[8px] [border:0] text-left relative cursor-pointer [transition:background_.12s,color_.12s]",
    FOCUS_SB, RAIL_CENTER,
    sub ? "min-h-0 py-1.5 pl-[46px] pr-3 text-[12.5px]" : "min-h-[38px] py-2 px-3 text-base",
    active
      ? "bg-accent !text-[#5eead4] font-semibold [box-shadow:0_2px_8px_rgba(22,98,224,0.3)]"
      : cx(
          "bg-transparent font-normal hover:bg-white/[.07] hover:text-white [[data-sidebar=light]_&:hover]:bg-bg-hover [[data-sidebar=light]_&:hover]:text-fg",
          activeGroup ? "text-white [[data-sidebar=light]_&]:text-accent" : "text-[#d4daea] [[data-sidebar=light]_&]:text-fg-muted",
        ),
  );
}

const SB_ICON = "w-[18px] h-[18px] grid place-items-center text-md shrink-0";

const SB_BADGE: Record<string, string> = {
  critical: "bg-[#e5383b] text-white",
  warning: "bg-[#f5a524] text-[#3b2300]",
};

export function Sidebar() {
  const { route, setRoute } = useNav();
  const tenant = useUiStore((s) => s.tenant);
  const setSwitcher = useUiStore((s) => s.setSwitcher);
  const setNav = useUiStore((s) => s.setNav);
  const apiUp = useTenants().isSuccess;
  // Live counts for the nav badges; undefined (offline) keeps the seed badge.
  const counts: Record<string, number | undefined> = {
    incidents: useIncidentRecords().data?.length,
    problems: useProblemRecords().data?.length,
    changes: useChangeRecords().data?.length,
    "infra-assets": useDevices().data?.length,
  };
  const badgeFor = (i: NavItem): NavItem["badge"] => {
    const n = counts[i.id];
    if (n === undefined) return i.badge;          // offline → keep seed badge
    return n > 0 ? { n, kind: i.badge?.kind ?? "neutral" } : undefined;
  };
  const activeGroup = groupOf(route);
  const [open, setOpen] = React.useState<Record<string, boolean>>({});
  const isOpen = (g: string) => open[g] ?? g === activeGroup;
  const go = (id: string) => {
    setRoute(id);
    if (window.matchMedia("(max-width: 900px)").matches) setNav("auto");
  };

  const leaf = (i: NavItem, sub = false) => {
    const badge = badgeFor(i);
    return (
      <button
        type="button"
        key={i.id}
        className={sbItem({ active: route === i.id, sub })}
        aria-current={route === i.id ? "page" : undefined}
        title={i.label}
        onClick={() => go(i.id)}
      >
        {!sub && <span className={SB_ICON} aria-hidden="true"><Icon className={`fa-solid ${i.icon}`} /></span>}
        <span className={cx("flex-1", RAIL_HIDE)}>{i.label}</span>
        {badge && (
          <span className={cx("text-2xs font-bold py-0.5 px-2 rounded-[999px] min-w-[18px] text-center", RAIL_HIDE,
            route === i.id ? "bg-white/25 text-white" : SB_BADGE[badge.kind] ?? "bg-white/[.12] text-white")}>{badge.n}</span>
        )}
        {!badge && i.kbd && (
          <kbd className={cx("text-[10px] py-px px-[5px] rounded-[4px]", RAIL_HIDE,
            route === i.id ? "bg-white/20 text-white" : "bg-white/[.08] text-white/50 [[data-sidebar=light]_&]:bg-bg-muted [[data-sidebar=light]_&]:text-fg-subtle")}>{i.kbd}</kbd>
        )}
      </button>
    );
  };

  return (
    <aside className={cx(
      "[grid-area:sidebar] flex flex-col bg-[#0f1b3d] text-white/[.82] border-r border-r-[#1b2a55]",
      "[[data-sidebar=light]_&]:bg-bg-raised [[data-sidebar=light]_&]:text-fg [[data-sidebar=light]_&]:border-r-line",
      // narrow screens: the expanded menu is a drawer over the page; the rail is hidden on phones
      "max-[900px]:group-data-[nav=expanded]/app:fixed max-[900px]:group-data-[nav=expanded]/app:inset-y-0 max-[900px]:group-data-[nav=expanded]/app:left-0 max-[900px]:group-data-[nav=expanded]/app:right-auto max-[900px]:group-data-[nav=expanded]/app:w-[264px] max-[900px]:group-data-[nav=expanded]/app:z-[90] max-[900px]:group-data-[nav=expanded]/app:[box-shadow:0_0_0_100vmax_rgba(15,23,42,0.45)]",
      "max-[560px]:group-data-[nav=auto]/app:hidden",
    )}>
      <div className={cx("flex items-center gap-2.5 min-h-16 py-3.5 px-4 border-b border-b-[#1f2d58] [[data-sidebar=light]_&]:border-b-line", RAIL_CENTER)}>
        <div className="w-[34px] h-[34px] rounded-[10px] bg-[#1662e0] grid place-items-center text-white font-bold text-md tracking-[-0.02em] [box-shadow:0_4px_12px_rgba(22,98,224,0.35)]" aria-hidden="true"><Icon icon={EyeIcon} /></div>
        <div className={cx("flex flex-col gap-px min-w-0", RAIL_HIDE)}>
          <b className="text-2xl font-bold tracking-[-0.01em] text-white [[data-sidebar=light]_&]:text-fg">LinkedEye</b>
          <span className="text-[10.5px] tracking-normal text-[#aab4d0] whitespace-nowrap overflow-hidden text-ellipsis [[data-sidebar=light]_&]:text-fg-subtle">ITSM &amp; Monitoring Platform</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto pt-2 px-3 pb-3 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-white/[.12] [&::-webkit-scrollbar-thumb]:rounded-[2px]" aria-label="Main">
        {NAV.map((n) => {
          if (!isGroup(n)) return leaf(n);
          const expanded = isOpen(n.group);
          const here = activeGroup === n.group;
          return (
            <div key={n.group}>
              <button
                type="button"
                className={sbItem({ activeGroup: here })}
                aria-expanded={expanded}
                aria-controls={`sb-${n.group}`}
                title={n.label}
                onClick={() => setOpen((o) => ({ ...o, [n.group]: !expanded }))}
              >
                <span className={SB_ICON} aria-hidden="true"><Icon className={`fa-solid ${n.icon}`} /></span>
                <span className={cx("flex-1", RAIL_HIDE)}>{n.label}</span>
                <Icon className={cx(`fa-solid fa-chevron-${expanded ? "down" : "right"}`, "text-[10px] opacity-60 ml-auto", RAIL_HIDE)} />
              </button>
              {expanded && <div id={`sb-${n.group}`} className={cx("flex flex-col mt-0.5 mb-1.5", RAIL_HIDE)}>{n.items.map((i) => leaf(i, true))}</div>}
            </div>
          );
        })}
      </nav>

      <div className="flex flex-col gap-2 p-3 border-t border-t-[#1f2d58] [[data-sidebar=light]_&]:border-t-line">
        <button type="button" className={cx(
          "flex items-center gap-2.5 w-full m-0 min-h-[52px] py-2 px-3 rounded-[10px] bg-[#15244d] border border-[#22305a] text-white text-left cursor-pointer [transition:background_.15s]",
          "hover:bg-[#1a2b5c] hover:border-[#2c3c70]", FOCUS_SB,
          "[[data-sidebar=light]_&]:bg-bg-muted [[data-sidebar=light]_&]:border-line [[data-sidebar=light]_&]:text-fg [[data-sidebar=light]_&:hover]:bg-bg-hover [[data-sidebar=light]_&:hover]:border-line",
          "group-data-[nav=collapsed]/app:justify-center group-data-[nav=collapsed]/app:p-[6px] max-[900px]:group-data-[nav=auto]/app:justify-center max-[900px]:group-data-[nav=auto]/app:p-[6px]",
        )} onClick={() => setSwitcher(true)} title={`${ORG.name} · switch client`}>
          <span className="w-[26px] h-[26px] rounded-[6px] grid place-items-center text-white text-2xs font-bold shrink-0" style={{ background: colorFor(tenant.color) }} aria-hidden="true">{tenant.code}</span>
          <span className={cx("flex flex-col flex-1 min-w-0 overflow-hidden", RAIL_HIDE)}>
            <span className="text-2xs text-[#aab4d0] [[data-sidebar=light]_&]:text-fg-subtle">Client</span>
            <span className="text-sm font-semibold text-white whitespace-nowrap overflow-hidden text-ellipsis [[data-sidebar=light]_&]:text-fg">{tenant.name}</span>
          </span>
          <Icon icon={ChevronDownIcon} className={cx("text-[10px] text-white/50", RAIL_HIDE)} />
        </button>
        <div className={cx("flex flex-col gap-0.5 mt-2 py-2.5 px-3 border border-white/[.12] rounded-[8px] text-[11.5px] text-white/70 [[data-sidebar=light]_&]:border-line [[data-sidebar=light]_&]:text-fg-muted", RAIL_HIDE)}>
          <b className="text-white text-[12.5px] [[data-sidebar=light]_&]:text-fg">LinkedEye v9.0</b>
          <span>Full-Stack Observability</span>
          <span className={cx("inline-flex items-center gap-1.5 mt-1 py-1 px-2 rounded-[6px] font-semibold", apiUp ? "text-[#6ee7b7] bg-[rgba(16,185,129,0.12)]" : "text-[#fca5a5] bg-[rgba(239,68,68,0.12)]")}>
            <Icon className={`fa-solid ${apiUp ? "fa-circle-check" : "fa-circle-exclamation"}`} /> {apiUp ? "API connected" : "API not reachable"}
          </span>
        </div>
      </div>
    </aside>
  );
}

const ICON_BTN = "w-8 h-8 grid place-items-center rounded-[7px] [border:none] bg-transparent relative shrink-0 [transition:all_.12s] hover:bg-bg-hover hover:text-fg";
const ICON_BTN_PLAIN = cx(ICON_BTN, "text-fg-subtle text-sm");

const MENU_ITEM = "flex items-center gap-2.5 py-2 px-2.5 [border:0] rounded-[6px] bg-transparent text-sm text-left hover:bg-bg-hover";

export function Header() {
  const { route, setRoute } = useNav();
  const setSearch = useUiStore((s) => s.setSearch);
  const nav = useUiStore((s) => s.nav);
  const setNav = useUiStore((s) => s.setNav);
  const [q, setQ] = React.useState("");
  const [menu, setMenu] = React.useState(false);
  const identity = useAuth((s) => s.identity);
  const logout = useAuth((s) => s.logout);
  const liveIncidents = useIncidents().data;
  const activeSev1 = (liveIncidents ?? INCIDENTS).filter((i) => i.sev === 1 && i.status === "active").length;
  const alertCount = (useInfraAlerts().data ?? []).filter((a) => a.sev === "critical" || a.sev === "warning" || a.sev === "warn").length;
  const toggleNav = () => {
    const narrow = window.matchMedia("(max-width: 900px)").matches;
    setNav(narrow ? (nav === "expanded" ? "auto" : "expanded") : (nav === "collapsed" ? "auto" : "collapsed"));
  };
  return (
    <header className="[grid-area:header] relative z-20 flex flex-nowrap items-center gap-4 px-4 h-[52px] bg-bg-raised border-b border-line">
      <button type="button" className={cx(ICON_BTN, "flex-none text-lg text-fg")} aria-label="Toggle navigation" onClick={toggleNav}>
        <Icon icon={MenuIcon} />
      </button>

      <div className="relative flex-[1_1_160px] min-w-[120px] max-w-[520px] mx-auto h-8 bg-bg-muted border border-line rounded-[6px] hover:border-line-strong">
        <Icon icon={SearchIcon} className="absolute left-[11px] top-1/2 -translate-y-1/2 text-fg-faint text-2xs" />
        <input
          className="w-full h-8 bg-bg-muted border border-transparent rounded-[7px] pr-3 pl-8 text-[12.5px] text-fg [transition:all_.15s] placeholder:text-fg-subtle focus:[outline:none] focus:border-accent focus:bg-bg-raised focus:[box-shadow:0_0_0_3px_rgba(37,99,235,0.1)]"
          aria-label="Search"
          placeholder="Search incidents, devices, VMs, services or runbooks…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setSearch(q.trim());
              // Search the list you're on; otherwise default to incidents.
              setRoute(route === "problems" || route === "changes" || route === "infra-assets" ? route : "incidents");
            } else if (e.key === "Escape") {
              setQ("");
              setSearch("");
            }
          }}
        />
        {q ? (
          <button type="button" className="[border:0] bg-transparent text-fg-subtle py-0 px-0.5" aria-label="Clear search" onClick={() => { setQ(""); setSearch(""); }}>
            <Icon icon={XIcon} />
          </button>
        ) : (
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-fg-subtle bg-bg-raised py-0.5 px-[5px] rounded-[4px] border border-line max-[900px]:hidden">↵</kbd>
        )}
      </div>

      <div className="flex items-center gap-1 ml-auto shrink-0">
        {activeSev1 > 0 && (
          <button type="button" className="flex items-center gap-1.5 py-1 px-2.5 bg-[#fef3f2] text-[#b42318] [border:0] rounded-[5px] cursor-pointer whitespace-nowrap shrink-0 [transition:transform_.15s] hover:-translate-y-px" onClick={() => setRoute("incidents")}>
            <span className="w-2 h-2 rounded-[50%] bg-[#b42318] ml-1 animate-[pulse-red_1.2s_ease-in-out_infinite]" />
            <span className="max-[900px]:hidden">{activeSev1} active Sev 1</span>
          </button>
        )}
        <button type="button" className="inline-flex items-center gap-1.5 min-h-[34px] px-3.5 [border:0] rounded bg-accent text-white text-sm font-semibold cursor-pointer hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 max-[900px]:hidden" onClick={() => setRoute("incident-new")}>
          <Icon icon={PlusIcon} /> New
        </button>
        <button type="button" className={ICON_BTN_PLAIN} title="Alerts" aria-label={`Alerts (${alertCount})`} onClick={() => setRoute("alerts")}>
          <Icon icon={BellIcon} />
          {alertCount > 0 && <span className="absolute -top-[3px] -right-1 min-w-[17px] h-[17px] px-1 rounded-[9px] bg-critical text-white text-[10px] font-bold grid place-items-center border-2 border-bg-raised">{alertCount > 99 ? "99+" : alertCount}</span>}
        </button>
        <button type="button" className={ICON_BTN_PLAIN} title="Help" aria-label="Help" onClick={() => setRoute("knowledge")}><Icon icon={CircleHelpIcon} /></button>
        <button type="button" className={ICON_BTN_PLAIN} title="Settings" aria-label="Settings" onClick={() => setRoute("settings")}><Icon icon={SettingsIcon} /></button>
        <div className="relative">
          <button type="button" className="flex items-center gap-2 py-1 pr-2 pl-1 rounded-[7px] cursor-pointer [border:0] bg-transparent text-left shrink-0 hover:bg-bg-hover [&>div]:min-w-0" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)}
            title={`${identity.name} · ${identity.email}\nroles: ${identity.roles.join(", ") || "none"}`}>
            <Avatar name={identity.name} color="amber" />
            <span className="block flex-col leading-[1.2] text-2xs text-fg-subtle whitespace-nowrap">
              <b className="text-sm font-[550] whitespace-nowrap">{identity.name.split(" ")[0]}</b>
              <span className="block text-2xs text-fg-subtle whitespace-nowrap">{identity.roles[0] ? roleLabel(identity.roles[0]) : "no role"}</span>
            </span>
            <Icon icon={ChevronDownIcon} className="text-[9px] text-fg-faint" />
          </button>
          {menu && (
            <div className="absolute right-0 top-[calc(100%+6px)] z-[80] min-w-[220px] p-1.5 bg-bg-raised border border-line rounded-[10px] [box-shadow:var(--shadow-lg,0_12px_28px_rgba(0,0,0,.18))] flex flex-col" role="menu">
              <div className="flex flex-col py-2 px-2.5 border-b border-line mb-1 text-xs text-fg-muted"><b className="text-fg text-sm">{identity.name}</b><span>{identity.email}</span></div>
              <button type="button" role="menuitem" className={MENU_ITEM} onClick={() => { setMenu(false); setRoute("users"); }}><Icon icon={UserIcon} /> Profile &amp; roles</button>
              <button type="button" role="menuitem" className={MENU_ITEM} onClick={() => { setMenu(false); setRoute("settings"); }}><Icon icon={SlidersHorizontalIcon} /> Settings</button>
              <button type="button" role="menuitem" className={MENU_ITEM} onClick={() => { setMenu(false); logout(); setRoute("sign-in"); }}><Icon icon={LogOutIcon} /> Sign out</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

const TSW_SECTION = "text-[10.5px] font-semibold text-fg-subtle uppercase tracking-[0.06em] pt-2 px-3 pb-1";
const tswRow = (focus = false) => cx("flex items-center gap-3 py-2 px-3 rounded-[8px] cursor-pointer hover:bg-bg-muted", focus && "bg-bg-muted");
const TSW_ICON = "w-8 h-8 rounded-[7px] grid place-items-center text-white font-bold text-xs shrink-0";
const TSW_INFO = "flex-1 min-w-0 [&_b]:block [&_b]:text-sm [&_b]:font-[550] [&_span]:block [&_span]:text-[11.5px] [&_span]:text-fg-subtle";
const TSW_META = "flex gap-2.5 items-center text-2xs text-fg-subtle";

export function TenantSwitcher() {
  const open = useUiStore((s) => s.switcherOpen);
  const onClose = () => useUiStore.getState().setSwitcher(false);
  const tenant = useUiStore((s) => s.tenant);
  const setTenant = useUiStore((s) => s.setTenant);
  const liveTenants = useTenants().data;
  const { setRoute } = useNav();
  const [q, setQ] = React.useState("");
  const [focus, setFocus] = React.useState(0);

  React.useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") setFocus((f) => Math.min(f + 1, TENANTS.length));
      if (e.key === "ArrowUp") setFocus((f) => Math.max(f - 1, 0));
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open]);

  if (!open) return null;
  // Live tenants when the backend is up; seed list only as an offline fallback.
  const source = liveTenants && liveTenants.length ? liveTenants : (liveTenants ? [] : TENANTS);
  const filtered = source.filter((t) => t.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="fixed inset-0 bg-[rgba(10,20,51,0.55)] [backdrop-filter:blur(4px)] z-[1000] grid place-items-center py-[60px] px-5 animate-[fadein_0.15s_ease]" onClick={onClose}>
      <div className="bg-bg-raised rounded-[14px] w-[640px] max-w-full [box-shadow:var(--shadow-pop)] overflow-hidden border border-line" onClick={(e) => e.stopPropagation()}>
        <div className="py-3.5 px-4.5 border-b border-line flex items-center gap-3">
          <Icon icon={SearchIcon} className="text-fg-faint" />
          <input className="flex-1 [border:none] bg-transparent [outline:none] text-base" autoFocus placeholder="Jump to tenant, workspace, or view…" value={q} onChange={(e) => setQ(e.target.value)} />
          <kbd className="text-[10.5px] text-fg-subtle bg-bg-muted py-0.5 px-1.5 rounded-[4px]">esc</kbd>
        </div>
        <div className="max-h-[480px] overflow-y-auto p-1.5">
          <div className={TSW_SECTION}>Parent organization</div>
          <div className={tswRow()} onClick={() => { onClose(); setRoute("cross-tenant"); }}>
            <div className={TSW_ICON} style={{ background: "linear-gradient(135deg,#0f1c3f,#2563eb)" }}>FS</div>
            <div className={TSW_INFO}>
              <b>{ORG.name}</b>
              <span>All business units · cross-tenant view</span>
            </div>
            <div className={TSW_META}><Pill kind="purple" noDot>Super-admin</Pill></div>
          </div>

          <div className={TSW_SECTION}>Business units ({filtered.length})</div>
          {source.length === 0 && (
            <div className={tswRow()} style={{ cursor: "default", opacity: 0.75 }}>
              <div className={TSW_ICON} style={{ background: "var(--bg-muted)", color: "var(--fg-muted)" }}><Icon icon={InboxIcon} /></div>
              <div className={TSW_INFO}>
                <b>No business units provisioned</b>
                <span>Clean deployment · create one to get started</span>
              </div>
            </div>
          )}
          {filtered.map((t, i) => (
            <div key={t.id} className={tswRow(i + 1 === focus)} onClick={() => { setTenant(t); onClose(); }}>
              <div className={TSW_ICON} style={{ background: colorFor(t.color) }}>{t.code}</div>
              <div className={TSW_INFO}>
                <b>
                  {t.name}{" "}
                  {tenant.id === t.id && <span style={{ color: "var(--fg-subtle)", fontWeight: 400, fontSize: 11 }}>· current</span>}
                </b>
                <span>{t.users} users · {t.incidents} open incidents · {t.plan}</span>
              </div>
              <div className={TSW_META}>
                {t.sev1 > 0 && <Pill kind="critical">{t.sev1} Sev 1</Pill>}
                <span className="font-mono tabular-nums" style={{ fontSize: 11 }}>{t.health}%</span>
              </div>
            </div>
          ))}

          <div className={TSW_SECTION}>Quick actions</div>
          <div className={tswRow()} onClick={() => { onClose(); setRoute("onboarding"); }}>
            <div className={TSW_ICON} style={{ background: "var(--bg-muted)", color: "var(--fg)" }}><Icon icon={PlusIcon} /></div>
            <div className={TSW_INFO}>
              <b>Create a new business unit</b>
              <span>Provision a new sub-tenant under {ORG.name}</span>
            </div>
            <kbd style={{ fontSize: 10, color: "var(--fg-subtle)" }}>⌘ N</kbd>
          </div>
        </div>
      </div>
    </div>
  );
}
