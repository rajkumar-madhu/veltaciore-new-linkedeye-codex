# Unified Observability Control Plane Design

Date: 2026-08-02
Status: Approved direction; pending specification review

## Objective

Evolve Argus-LinkedEye from a collection of operational screens into a production-grade, multi-tenant observability control plane inspired by the breadth and investigation ergonomics of New Relic. The product remains specific to the Finspot/LinkedEye estate: infrastructure, Kubernetes, APM, logs, traces, ITSM, BOD/EOD, order latency, and CTCL operations must work as one connected system.

The redesign must not copy New Relic branding or visual styling. It will reuse the useful product patterns: capability navigation, global context, entity-centered exploration, composable dashboards, query-driven charts, and progressive drill-down.

## Audience and primary job

Primary users are NOC engineers, SREs, infrastructure administrators, service-desk agents, trading-operations users, and incident commanders. The home workspace has one job: show whether production is healthy, identify what needs attention, and provide the shortest credible path from a symptom to evidence and action.

## Scope

The unified suite includes:

- Operations overview and cross-tenant health
- Infrastructure and network monitoring
- Kubernetes estate monitoring
- APM and service health
- Logs and distributed traces
- Synthetics, monitors, alert conditions, and SLOs
- Trading Ops, BOD/EOD, order latency, and CTCL monitoring
- Incidents, problems, changes, CMDB, knowledge, and runbooks
- Saved and configurable dashboards
- Entity catalog and relationship map
- Global search and query workspace

The first implementation increment will establish the shared shell, home workspace, reusable chart system, context filters, and drill-down contracts. It will not attempt to replace every existing detail screen in one change.

## Product architecture

### Shared application shell

The shell provides persistent context across every workspace:

- Compact capability navigation grouped into Observe, Operate, Trading Ops, and Manage
- Global command search for entities, incidents, dashboards, and actions
- Tenant, environment, site, and time-range selectors
- Auto-refresh state with pause and last-successful-refresh status
- Notifications, help, user identity, and role-aware actions

The current tenant header remains authoritative. Environment, site, and time range become explicit UI state and are included in query keys and API parameters where supported.

### Workspaces

1. **Home**: unified production health and prioritized attention queue.
2. **Dashboards**: saved views, configurable widget grid, import/export, ownership, favorites, and sharing.
3. **Explore**: query metrics, logs, and traces from one workspace.
4. **Entities**: services, hosts, pods, databases, network devices, sites, and trading components.
5. **Operate**: incidents, alert correlation, on-call context, runbooks, and changes.
6. **Trading Ops**: BOD/EOD, order latency, CTCL, and market calendar.

Existing routes remain available during migration and are progressively linked into the shared context model.

## Home workspace design

### Information hierarchy

The home page replaces the current ServiceNow-record metaphor with an observability workspace:

1. Context bar: scope, time range, refresh, and data freshness.
2. Production pulse: a compact status band summarizing health, active incidents, affected services, and readiness.
3. Golden signals: traffic, errors, latency, and saturation with comparison periods.
4. Attention queue: correlated incidents, critical alerts, failing checks, and risky changes, ranked by urgency and blast radius.
5. Domain grid: Infrastructure, Kubernetes, Services, Trading Ops, and BOD readiness.
6. Investigation panels: service health trends, infrastructure saturation, deployment/change overlays, and latency distributions.
7. Operational footer: on-call ownership, recent changes, and system data-source health.

Dense tables and secondary administrative information move behind drill-downs or collapsible panels. Empty datasets do not display invented operational values.

### Visual direction

The design is a disciplined operations console rather than a marketing dashboard.

- Ink `#0e1116` for navigation and high-contrast text
- Control blue `#2b4cff` for selection and interactive focus
- Signal coral `#ff5b2e` for urgent attention
- Healthy green `#0f7a55` for verified normal state
- Neutral canvas `#f5f7fa` and raised white surfaces
- Instrument Serif only for restrained workspace titles; the main interface uses a highly legible sans serif, and JetBrains Mono is used for identifiers and data

The signature element is the **Production Pulse Rail**: a horizontal, time-aware strip connecting incidents, deployments, error spikes, latency anomalies, and trading events. It makes correlation visible rather than presenting independent KPI cards.

Motion is limited to refresh transitions, chart focus, and new-event arrival. Reduced-motion preferences disable non-essential animation.

## Chart system

Charts become reusable, typed components instead of isolated SVG implementations.

### Required chart types

- Time series: line, area, stacked area, and multi-axis only when units require it
- Value and trend: KPI with comparison, threshold, and freshness
- Distribution: histogram and percentile bands
- Composition: stacked bar; pie/donut only for small categorical sets
- State: heat map, status matrix, topology, and geographic/site map
- Event overlay: incidents, deployments, changes, BOD stages, and market events
- Table: sortable, filterable, virtualizable for large result sets

### Common interaction contract

Every time-based chart supports:

- Shared time range and timezone
- Crosshair and exact tooltip values
- Series show/hide and isolate
- Drag-to-zoom and reset
- Previous-period comparison
- Threshold and anomaly annotations
- Data freshness indicator
- View query, open entity, inspect related logs/traces, and create incident actions where applicable
- Keyboard focus, accessible labels, and non-color status cues

Chart panels have consistent loading, empty, stale, error, and permission-denied states. A visible badge distinguishes live API data from local demo or fallback data.

### Technology boundary

A single chart adapter layer will own formatting, axes, colors, tooltips, responsiveness, and accessibility. Screens provide typed series and annotations rather than rendering chart primitives directly. The implementation plan will select a maintained chart library after testing bundle size, accessibility, interaction support, and React compatibility.

## Entity and investigation model

All telemetry is organized around entities. An entity has identity, type, tenant, environment, site, health, tags, relationships, telemetry links, and ownership.

The investigation flow is:

`Production signal -> affected entity -> correlated metrics/logs/traces/changes -> incident -> runbook/action`

Links preserve global scope and time range. Each entity page provides overview, golden signals, dependencies, alerts, logs, traces, changes, and related incidents. Unsupported telemetry panels state what integration is required instead of silently showing seed data.

## Data flow and backend contracts

The existing React, TanStack Query, Zustand, Django/DRF, tenant middleware, Keycloak, and OPA foundations remain.

- The frontend sends tenant plus optional environment, site, and time-range filters.
- TanStack Query keys include every scope dimension to prevent cross-context cache leakage.
- Dashboard endpoints return widget definitions separately from query results.
- Metrics, logs, traces, alerts, and events use normalized response envelopes containing data, units, query window, source, and freshness.
- Entity identifiers are stable and used across telemetry and ITSM links.
- Long-running or expensive queries expose explicit pending and timeout states.
- Write actions remain protected by OPA and mirrored by client-side role affordances.

Live data is the production default. Seed/fallback data is allowed only in an explicit demo mode and must be visually labeled.

## Reliability and failure handling

- Partial failure does not blank the workspace; each panel reports its own state.
- Stale panels retain the last successful result with age and retry controls.
- Disconnected integrations provide setup guidance and affected capabilities.
- Query failures show a safe diagnostic summary and correlation identifier.
- Auto-refresh pauses when the browser tab is hidden and resumes without creating overlapping requests.
- Destructive or externally visible actions require confirmation and auditable backend events.
- Large tables and high-cardinality series enforce limits and guide users to narrow scope.

## Responsive and accessibility requirements

- Desktop layouts target NOC displays and common laptop widths.
- Tablet retains investigation and incident actions.
- Mobile prioritizes incident status, alerts, on-call, and acknowledgement actions rather than reproducing the full wallboard.
- All controls have visible focus, semantic names, and keyboard operation.
- Charts provide textual summaries and do not encode status by color alone.
- Contrast meets WCAG AA for text and essential visual indicators.

## Migration strategy

1. Introduce shared context state, observability shell, data-state components, and chart adapter.
2. Rebuild the home workspace using existing APIs and clearly labeled unavailable telemetry.
3. Add saved dashboards and widget contracts.
4. Normalize entities and connect infrastructure, Kubernetes, services, and Trading Ops.
5. Add unified metric/log/trace exploration and correlation.
6. Migrate remaining screens incrementally while preserving route compatibility.

## Testing and acceptance criteria

- Unit tests cover scope serialization, query keys, chart transformations, thresholds, and freshness logic.
- Component tests cover loading, empty, stale, error, permission, demo, and live states.
- Backend tests verify tenant isolation and every filter dimension.
- End-to-end tests cover dashboard load, scope change, time change, chart interaction, drill-down, and incident creation.
- Visual regression checks cover light/dark themes and desktop/tablet/mobile breakpoints.
- Performance checks enforce bounded initial JavaScript and avoid rendering unbounded chart points or table rows.
- Accessibility checks cover keyboard navigation, focus order, names, contrast, and chart summaries.

The first increment is accepted when a user can open Home, confirm data freshness, identify the highest-impact production issue, drill into its entity evidence while preserving context, and start the permitted operational response without encountering unlabeled demo data.

## Explicit non-goals for the first increment

- Reimplementing every New Relic capability
- Copying New Relic visual assets, code, or branding
- Replacing Keycloak, OPA, Django, or the existing tenant model
- Building a new telemetry storage engine before source contracts are defined
- Migrating every existing detail screen in the initial dashboard change
