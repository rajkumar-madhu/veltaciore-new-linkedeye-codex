// App chrome: sidebar, header, tenant switcher. Ported from shell.jsx.
import React from "react";
import { ORG, TENANTS, INCIDENTS } from "@/data/core";
import { Avatar, Pill } from "@/components/primitives";
import { useUiStore } from "@/store/ui";
import { useNav } from "@/hooks/useNav";
import { useTenants, useIncidents, useIncidentRecords, useProblemRecords, useChangeRecords, useDevices, useInfraAlerts } from "@/api/hooks";
import { useAuth } from "@/auth/auth";
import type { Tenant } from "@/lib/types";

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
        className={`sb-item${sub ? " sb-sub" : ""}${route === i.id ? " active" : ""}`}
        aria-current={route === i.id ? "page" : undefined}
        title={i.label}
        onClick={() => go(i.id)}
      >
        {!sub && <span className="sb-icon" aria-hidden="true"><i className={`fa-solid ${i.icon}`} /></span>}
        <span className="sb-label">{i.label}</span>
        {badge && <span className={`sb-badge ${badge.kind}`}>{badge.n}</span>}
        {!badge && i.kbd && <kbd>{i.kbd}</kbd>}
      </button>
    );
  };

  return (
    <aside className="sidebar">
      <div className="sb-head">
        <div className="sb-logo" aria-hidden="true"><i className="fa-solid fa-eye" /></div>
        <div className="sb-brand">
          <b>LinkedEye</b>
          <span>ITSM &amp; Monitoring Platform</span>
        </div>
      </div>

      <nav className="sb-nav" aria-label="Main">
        {NAV.map((n) => {
          if (!isGroup(n)) return leaf(n);
          const expanded = isOpen(n.group);
          const here = activeGroup === n.group;
          return (
            <div key={n.group} className={`sb-group${here ? " here" : ""}`}>
              <button
                type="button"
                className={`sb-item sb-group-head${here ? " active-group" : ""}`}
                aria-expanded={expanded}
                aria-controls={`sb-${n.group}`}
                title={n.label}
                onClick={() => setOpen((o) => ({ ...o, [n.group]: !expanded }))}
              >
                <span className="sb-icon" aria-hidden="true"><i className={`fa-solid ${n.icon}`} /></span>
                <span className="sb-label">{n.label}</span>
                <i className={`fa-solid fa-chevron-${expanded ? "down" : "right"} sb-caret`} aria-hidden="true" />
              </button>
              {expanded && <div id={`sb-${n.group}`} className="sb-children">{n.items.map((i) => leaf(i, true))}</div>}
            </div>
          );
        })}
      </nav>

      <div className="sb-foot">
        <button type="button" className="tenant-switch" onClick={() => setSwitcher(true)} title={`${ORG.name} · switch client`}>
          <span className="t-icon" style={{ background: colorFor(tenant.color) }} aria-hidden="true">{tenant.code}</span>
          <span className="t-body">
            <span className="t-unit-label">Client</span>
            <span className="t-org">{tenant.name}</span>
          </span>
          <i className="fa-solid fa-chevron-down" aria-hidden="true" />
        </button>
        <div className="sb-version">
          <b>LinkedEye v9.0</b>
          <span>Full-Stack Observability</span>
          <span className={`sb-api ${apiUp ? "up" : "down"}`}>
            <i className={`fa-solid ${apiUp ? "fa-circle-check" : "fa-circle-exclamation"}`} aria-hidden="true" /> {apiUp ? "API connected" : "API not reachable"}
          </span>
        </div>
      </div>
    </aside>
  );
}

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
    <header className="header">
      <button type="button" className="icon-btn hdr-burger" aria-label="Toggle navigation" onClick={toggleNav}>
        <i className="fa-solid fa-bars" aria-hidden="true" />
      </button>

      <div className="hdr-command">
        <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
        <input
          className="hdr-command-input"
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
          <button type="button" className="hdr-clear" aria-label="Clear search" onClick={() => { setQ(""); setSearch(""); }}>
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        ) : (
          <kbd>↵</kbd>
        )}
      </div>

      <div className="hdr-right">
        {activeSev1 > 0 && (
          <button type="button" className="hdr-incident-pill" onClick={() => setRoute("incidents")}>
            <span className="pulse-dot" />
            <span>{activeSev1} active Sev 1</span>
          </button>
        )}
        <button type="button" className="hdr-new" onClick={() => setRoute("incident-new")}>
          <i className="fa-solid fa-plus" aria-hidden="true" /> New
        </button>
        <button type="button" className="icon-btn" title="Alerts" aria-label={`Alerts (${alertCount})`} onClick={() => setRoute("alerts")}>
          <i className="fa-solid fa-bell" aria-hidden="true" />
          {alertCount > 0 && <span className="hdr-count">{alertCount > 99 ? "99+" : alertCount}</span>}
        </button>
        <button type="button" className="icon-btn" title="Help" aria-label="Help" onClick={() => setRoute("knowledge")}><i className="fa-solid fa-circle-question" aria-hidden="true" /></button>
        <button type="button" className="icon-btn" title="Settings" aria-label="Settings" onClick={() => setRoute("settings")}><i className="fa-solid fa-gear" aria-hidden="true" /></button>
        <div className="hdr-user-wrap">
          <button type="button" className="hdr-user" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)}
            title={`${identity.name} · ${identity.email}\nroles: ${identity.roles.join(", ") || "none"}`}>
            <Avatar name={identity.name} color="amber" />
            <span className="hdr-user-text">
              <b>{identity.name.split(" ")[0]}</b>
              <span>{identity.roles[0] ? roleLabel(identity.roles[0]) : "no role"}</span>
            </span>
            <i className="fa-solid fa-chevron-down" aria-hidden="true" />
          </button>
          {menu && (
            <div className="hdr-menu" role="menu">
              <div className="hdr-menu-id"><b>{identity.name}</b><span>{identity.email}</span></div>
              <button type="button" role="menuitem" onClick={() => { setMenu(false); setRoute("users"); }}><i className="fa-solid fa-user" aria-hidden="true" /> Profile &amp; roles</button>
              <button type="button" role="menuitem" onClick={() => { setMenu(false); setRoute("settings"); }}><i className="fa-solid fa-sliders" aria-hidden="true" /> Settings</button>
              <button type="button" role="menuitem" onClick={() => { setMenu(false); logout(); setRoute("sign-in"); }}><i className="fa-solid fa-right-from-bracket" aria-hidden="true" /> Sign out</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

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
    <div className="tsw-backdrop" onClick={onClose}>
      <div className="tsw" onClick={(e) => e.stopPropagation()}>
        <div className="tsw-head">
          <i className="fa-solid fa-magnifying-glass" />
          <input autoFocus placeholder="Jump to tenant, workspace, or view…" value={q} onChange={(e) => setQ(e.target.value)} />
          <kbd>esc</kbd>
        </div>
        <div className="tsw-body">
          <div className="tsw-section-title">Parent organization</div>
          <div className="tsw-row" onClick={() => { onClose(); setRoute("cross-tenant"); }}>
            <div className="tsw-icon" style={{ background: "linear-gradient(135deg,#0f1c3f,#2563eb)" }}>FS</div>
            <div className="tsw-info">
              <b>{ORG.name}</b>
              <span>All business units · cross-tenant view</span>
            </div>
            <div className="tsw-meta"><Pill kind="purple" noDot>Super-admin</Pill></div>
          </div>

          <div className="tsw-section-title">Business units ({filtered.length})</div>
          {source.length === 0 && (
            <div className="tsw-row" style={{ cursor: "default", opacity: 0.75 }}>
              <div className="tsw-icon" style={{ background: "var(--bg-muted)", color: "var(--fg-muted)" }}><i className="fa-solid fa-inbox" /></div>
              <div className="tsw-info">
                <b>No business units provisioned</b>
                <span>Clean deployment · create one to get started</span>
              </div>
            </div>
          )}
          {filtered.map((t, i) => (
            <div key={t.id} className={`tsw-row${i + 1 === focus ? " focus" : ""}`} onClick={() => { setTenant(t); onClose(); }}>
              <div className="tsw-icon" style={{ background: colorFor(t.color) }}>{t.code}</div>
              <div className="tsw-info">
                <b>
                  {t.name}{" "}
                  {tenant.id === t.id && <span style={{ color: "var(--fg-subtle)", fontWeight: 400, fontSize: 11 }}>· current</span>}
                </b>
                <span>{t.users} users · {t.incidents} open incidents · {t.plan}</span>
              </div>
              <div className="tsw-meta">
                {t.sev1 > 0 && <Pill kind="critical">{t.sev1} Sev 1</Pill>}
                <span className="mono" style={{ fontSize: 11 }}>{t.health}%</span>
              </div>
            </div>
          ))}

          <div className="tsw-section-title">Quick actions</div>
          <div className="tsw-row" onClick={() => { onClose(); setRoute("onboarding"); }}>
            <div className="tsw-icon" style={{ background: "var(--bg-muted)", color: "var(--fg)" }}><i className="fa-solid fa-plus" /></div>
            <div className="tsw-info">
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
