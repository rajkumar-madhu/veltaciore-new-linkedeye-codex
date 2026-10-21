// App chrome: sidebar, header, tenant switcher. Ported from shell.jsx.
import React from "react";
import { ORG, TENANTS, INCIDENTS } from "@/data/core";
import { Avatar, Pill } from "@/components/primitives";
import { useUiStore } from "@/store/ui";
import { useNav } from "@/hooks/useNav";
import { useTenants, useIncidents, useIncidentRecords, useProblemRecords, useChangeRecords, useDevices } from "@/api/hooks";
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
  hidden?: boolean;
  badge?: { n: number | string; kind: string };
}

const NAV: { section: string; items: NavItem[] }[] = [
  { section: "Operate", items: [
    { id: "dashboard", label: "Dashboard", icon: "fa-gauge-high", kbd: "G D" },
    { id: "incidents", label: "Incidents", icon: "fa-triangle-exclamation", kbd: "G I", badge: { n: 4, kind: "critical" } },
    { id: "incident-detail", label: "Sev-1 Active", icon: "fa-fire", hidden: true },
    { id: "problems", label: "Problems", icon: "fa-magnifying-glass-chart", badge: { n: 12, kind: "warning" } },
    { id: "changes", label: "Changes", icon: "fa-code-branch", badge: { n: 7, kind: "info" } },
    { id: "status-page", label: "Status page", icon: "fa-bullhorn" },
    { id: "retro", label: "Retrospectives", icon: "fa-clipboard-check" },
    { id: "cross-tenant", label: "Cross-tenant", icon: "fa-grip-vertical" },
  ]},
  { section: "Service", items: [
    { id: "catalog", label: "Service catalog", icon: "fa-bag-shopping" },
    { id: "knowledge", label: "Knowledge base", icon: "fa-book-open" },
    { id: "cmdb", label: "CMDB · CIs", icon: "fa-sitemap" },
    { id: "slas", label: "SLA definitions", icon: "fa-stopwatch" },
    { id: "runbooks", label: "Runbooks", icon: "fa-book", badge: { n: 184, kind: "neutral" } },
  ]},
  { section: "Observe", items: [
    { id: "metrics", label: "Metrics Explorer", icon: "fa-chart-line" },
    { id: "apm", label: "APM & traces", icon: "fa-gauge-high" },
    { id: "apm-catalog", label: "Applications Catalog", icon: "fa-cubes" },
    { id: "synthetics", label: "Synthetics", icon: "fa-globe" },
    { id: "url-checker", label: "URL Checker", icon: "fa-link" },
    { id: "telnet-monitoring", label: "Telnet monitoring", icon: "fa-terminal" },
    { id: "domains", label: "Domains", icon: "fa-earth-asia" },
    { id: "slos", label: "SLOs", icon: "fa-bullseye" },
    { id: "logs", label: "Logs", icon: "fa-list-ul", badge: { n: "2.8B", kind: "neutral" } },
    { id: "monitors", label: "Monitors", icon: "fa-bell" },
    { id: "alerts", label: "Alert conditions", icon: "fa-bell-concierge" },
    { id: "alert-grouping", label: "Alert grouping", icon: "fa-layer-group" },
    { id: "entity-map", label: "Entity map", icon: "fa-circle-nodes" },
  ]},
  { section: "Trading Ops", items: [
    { id: "bod-checks", label: "BOD checks", icon: "fa-clipboard-check", badge: { n: 2, kind: "critical" } },
    { id: "bod-eod", label: "BOD/EOD status", icon: "fa-timeline" },
    { id: "order-latency", label: "Order latency", icon: "fa-stopwatch-20", badge: { n: 1, kind: "critical" } },
    { id: "ctcl-monitor", label: "CTCL data monitor", icon: "fa-wave-square", badge: { n: 2, kind: "warning" } },
    { id: "market-calendar", label: "Market calendar", icon: "fa-calendar-days" },
  ]},
  { section: "Infrastructure", items: [
    { id: "infra", label: "Overview", icon: "fa-server" },
    { id: "site-detail", label: "LE Sites", icon: "fa-location-dot" },
    { id: "host-map", label: "Host map", icon: "fa-hexagon-nodes" },
    { id: "infra-assets", label: "Asset inventory", icon: "fa-boxes-stacked", badge: { n: 1599, kind: "neutral" } },
    { id: "node", label: "Node view", icon: "fa-microchip" },
    { id: "infra-topology", label: "Network topology", icon: "fa-circle-nodes" },
    { id: "infra-vms", label: "Virtual machines", icon: "fa-cube" },
    { id: "infra-rack", label: "Datacenter rack", icon: "fa-server" },
    { id: "infra-device", label: "Device detail", icon: "fa-microchip", hidden: true },
    { id: "infra-exporters", label: "Exporters", icon: "fa-tower-broadcast" },
    { id: "infra-templates", label: "Monitoring templates", icon: "fa-layer-group" },
  ]},
  { section: "Build", items: [
    { id: "flow", label: "Flow Designer", icon: "fa-diagram-project" },
    { id: "reports", label: "Reports", icon: "fa-chart-column" },
    { id: "integrations", label: "Integrations", icon: "fa-plug" },
  ]},
  { section: "Admin", items: [
    { id: "admin-tenants", label: "Tenants", icon: "fa-building" },
    { id: "admin-billing", label: "Billing & plans", icon: "fa-credit-card" },
    { id: "admin-usage", label: "Usage & quotas", icon: "fa-gauge-high" },
    { id: "users", label: "People & roles", icon: "fa-user-gear" },
    { id: "settings", label: "Settings", icon: "fa-sliders" },
  ]},
];

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
  const identity = useAuth((s) => s.identity);
  // Live counts for the ITSM nav badges; undefined (offline) keeps the seed badge.
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
  return (
    <aside className="sidebar">
      <div className="sb-head">
        <div className="sb-logo" aria-hidden="true"><i className="fa-solid fa-eye" /></div>
        <div className="sb-brand">
          <b>LinkedEye</b>
          <span>ITSM &amp; Monitoring Platform</span>
        </div>
      </div>

      <nav className="sb-nav">
        {NAV.map((sec) => (
          <div key={sec.section} className="sb-section">
            <div className="sb-section-title">{sec.section}</div>
            {sec.items.filter((i) => !i.hidden).map((i) => {
              const badge = badgeFor(i);
              return (
              <button
                type="button"
                key={i.id}
                className={`sb-item${route === i.id ? " active" : ""}`}
                aria-current={route === i.id ? "page" : undefined}
                onClick={() => setRoute(i.id)}
              >
                <span className="sb-icon" aria-hidden="true"><i className={`fa-solid ${i.icon}`} /></span>
                <span className="sb-label">{i.label}</span>
                {badge && <span className={`sb-badge ${badge.kind}`}>{badge.n}</span>}
                {!badge && i.kbd && <kbd>{i.kbd}</kbd>}
              </button>
            );})}
          </div>
        ))}
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
        <div className="sb-env">
          <span className="env-dot" />
          <span>Production · us-east-1</span>
          <i className="fa-solid fa-bolt" />
        </div>
        <div className="sb-user">
          <Avatar name={identity.name} color="amber" />
          <div className="sb-user-info">
            <b>{identity.name}</b>
            <span>{identity.email}</span>
          </div>
          <i className="fa-solid fa-chevron-up" style={{ color: "rgba(255,255,255,0.5)", fontSize: 10 }} />
        </div>
      </div>
    </aside>
  );
}

export function Header() {
  const { route, setRoute } = useNav();
  const tenant = useUiStore((s) => s.tenant);
  const setSearch = useUiStore((s) => s.setSearch);
  const [q, setQ] = React.useState("");
  const crumbs = crumbsFor(route, tenant);
  const identity = useAuth((s) => s.identity);
  const logout = useAuth((s) => s.logout);
  const liveIncidents = useIncidents().data;
  const activeSev1 = (liveIncidents ?? INCIDENTS).filter((i) => i.sev === 1 && i.status === "active").length;
  return (
    <header className="header">
      <div className="hdr-crumbs">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <i className="fa-solid fa-chevron-right" />}
            <span
              className={`crumb${i === crumbs.length - 1 ? " current" : ""}`}
              onClick={c.to ? () => setRoute(c.to!) : undefined}
            >
              {c.label}
            </span>
          </React.Fragment>
        ))}
      </div>

      <div className="hdr-command">
        <i className="fa-solid fa-magnifying-glass" />
        <input
          className="hdr-command-input"
          placeholder="Search incidents by number, title, caller…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setSearch(q.trim());
              // Search the list you're on; otherwise default to incidents.
              setRoute(route === "problems" || route === "changes" ? route : "incidents");
            } else if (e.key === "Escape") {
              setQ("");
              setSearch("");
            }
          }}
        />
        {q ? (
          <i
            className="fa-solid fa-xmark"
            style={{ cursor: "pointer" }}
            title="Clear"
            onClick={() => { setQ(""); setSearch(""); }}
          />
        ) : (
          <kbd>↵</kbd>
        )}
      </div>

      <div className="hdr-right">
        {activeSev1 > 0 && (
          <div className="hdr-incident-pill" onClick={() => setRoute("incident-detail")}>
            <span className="pulse-dot" />
            <span>{activeSev1} active Sev 1</span>
          </div>
        )}
        <div className="hdr-divider" />
        <button type="button" className="hdr-new" onClick={() => setRoute("incident-new")}>
          <i className="fa-solid fa-plus" aria-hidden="true" /> New
        </button>
        <button className="icon-btn" title="Automation"><i className="fa-solid fa-robot" /></button>
        <button className="icon-btn" title="Notifications"><i className="fa-solid fa-bell" /><span className="dot" /></button>
        <button className="icon-btn" title="Help"><i className="fa-solid fa-circle-question" /></button>
        <button className="icon-btn" title="Sign out" onClick={() => { logout(); setRoute("sign-in"); }}><i className="fa-solid fa-right-from-bracket" /></button>
        <div className="hdr-divider" />
        <div className="hdr-user" title={`${identity.name} · ${identity.email}\nroles: ${identity.roles.join(", ") || "none"}`}>
          <Avatar name={identity.name} color="amber" />
          <div>
            <b>{identity.name.split(" ")[0]}</b>
            <span>{identity.roles[0] ? roleLabel(identity.roles[0]) : "no role"}</span>
          </div>
          <i className="fa-solid fa-chevron-down" />
        </div>
      </div>
    </header>
  );
}

interface Crumb {
  label: string;
  to?: string;
}

function crumbsFor(route: string, tenant: Tenant): Crumb[] {
  const base: Crumb[] = [{ label: ORG.name }, { label: tenant.name }];
  const map: Record<string, Crumb[]> = {
    dashboard: [...base, { label: "Operations", to: "dashboard" }, { label: `${tenant.name} Dashboard` }],
    incidents: [...base, { label: "Incidents" }],
    "incident-detail": [...base, { label: "Incidents", to: "incidents" }, { label: "INC-48291" }],
    "cross-tenant": [{ label: ORG.name }, { label: "Cross-tenant view" }],
    services: [...base, { label: "Services" }],
    runbooks: [...base, { label: "Runbooks" }],
    problems: [...base, { label: "Problem management" }],
    "problem-detail": [...base, { label: "Problems", to: "problems" }, { label: "PRB-3912" }],
    changes: [...base, { label: "Change management" }],
    "status-page": [...base, { label: "Status page & comms" }],
    retro: [...base, { label: "Incidents", to: "incidents" }, { label: "Retrospective · INC-48279" }],
    "alert-grouping": [...base, { label: "Alert grouping & noise reduction" }],
    "change-detail": [...base, { label: "Changes", to: "changes" }, { label: "CHG-2219" }],
    "change-new": [...base, { label: "Changes", to: "changes" }, { label: "New change" }],
    catalog: [...base, { label: "Service catalog" }],
    "catalog-request": [...base, { label: "Service catalog", to: "catalog" }, { label: "New request" }],
    knowledge: [...base, { label: "Knowledge base" }],
    "knowledge-article": [...base, { label: "Knowledge base", to: "knowledge" }, { label: "Article" }],
    infra: [...base, { label: "Infrastructure" }],
    "infra-assets": [...base, { label: "Infrastructure", to: "infra" }, { label: "Asset inventory" }],
    "infra-topology": [...base, { label: "Infrastructure", to: "infra" }, { label: "Topology" }],
    "infra-vms": [...base, { label: "Infrastructure", to: "infra" }, { label: "Virtual machines" }],
    "infra-rack": [...base, { label: "Infrastructure", to: "infra" }, { label: "Datacenter rack" }],
    "infra-device": [...base, { label: "Infrastructure", to: "infra" }, { label: "Asset inventory", to: "infra-assets" }, { label: "SW-BLR-TOR-13" }],
    "firewall-detail": [...base, { label: "Infrastructure", to: "infra" }, { label: "Asset inventory", to: "infra-assets" }, { label: "Firewall" }],
    "switch-detail": [...base, { label: "Infrastructure", to: "infra" }, { label: "Asset inventory", to: "infra-assets" }, { label: "Switch" }],
    "server-detail": [...base, { label: "Infrastructure", to: "infra" }, { label: "Asset inventory", to: "infra-assets" }, { label: "Server" }],
    "storage-detail": [...base, { label: "Infrastructure", to: "infra" }, { label: "Asset inventory", to: "infra-assets" }, { label: "Storage" }],
    "loadbal-detail": [...base, { label: "Infrastructure", to: "infra" }, { label: "Asset inventory", to: "infra-assets" }, { label: "Load balancer" }],
    "ups-detail": [...base, { label: "Infrastructure", to: "infra" }, { label: "Asset inventory", to: "infra-assets" }, { label: "UPS" }],
    "infra-exporters": [...base, { label: "Infrastructure", to: "infra" }, { label: "Exporters" }],
    "infra-templates": [...base, { label: "Infrastructure", to: "infra" }, { label: "Monitoring templates" }],
    domains: [...base, { label: "Monitoring" }, { label: "Domains" }],
    "url-checker": [...base, { label: "Monitoring" }, { label: "URL Checker" }],
    "telnet-monitoring": [...base, { label: "Monitoring" }, { label: "Telnet monitoring" }],
    "infra-onboarding": [...base, { label: "Infrastructure", to: "infra" }, { label: "Onboard device" }],
    "order-latency": [...base, { label: "Trading Ops" }, { label: "Order latency" }],
    "ctcl-monitor": [...base, { label: "Trading Ops" }, { label: "CTCL data monitor" }],
    cmdb: [...base, { label: "CMDB" }],
    slas: [...base, { label: "SLA definitions" }],
    flow: [...base, { label: "Flow Designer" }],
    reports: [...base, { label: "Reports & analytics" }],
    apm: [...base, { label: "APM & traces" }],
    "apm-catalog": [...base, { label: "Applications Catalog" }],
    "app-detail": [...base, { label: "Applications Catalog", to: "apm-catalog" }, { label: "Application" }],
    logs: [...base, { label: "Logs" }],
    alerts: [...base, { label: "Alert conditions" }],
    "entity-map": [...base, { label: "Entity map" }],
    "admin-tenants": [{ label: ORG.name }, { label: "Super-admin" }, { label: "Tenants" }],
    "admin-billing": [{ label: ORG.name }, { label: "Super-admin" }, { label: "Billing & plans" }],
    "admin-usage": [{ label: ORG.name }, { label: "Super-admin" }, { label: "Usage & quotas" }],
    users: [...base, { label: "People & roles" }],
    settings: [...base, { label: "Settings" }],
    integrations: [...base, { label: "Integrations" }],
    "integration-detail": [...base, { label: "Integrations", to: "integrations" }, { label: "Integration" }],
    onboarding: [{ label: ORG.name }, { label: "Onboarding" }],
  };
  return map[route] || base;
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
