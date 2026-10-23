# LinkedEye UI conventions

Every screen uses the LinkedEye design system: plain CSS `ld-*` classes in
`frontend/src/styles.css` (theme tokens, dark mode included) and the shared
React pieces below. No Tailwind, no new UI libraries. Font Awesome 6 icons
(`fa-solid …`, `fa-brands …`).

Reference screens — copy their structure:
- `screens/DashboardScreen.tsx` — summary cards, charts, tables
- `screens/ServerDetailScreen.tsx`, `screens/VmDetailScreen.tsx` — entity detail page with header, KPI cards, tabs
- `screens/InfraExportersScreen.tsx`, `screens/DomainsScreen.tsx` — list page with filters and table
- `components/RecordList.tsx` — ITSM list layout (Incidents / Problems / Changes)
- `screens/DeviceOnboardingWizard.tsx` — multi-step form

## Page skeleton

```tsx
<div className="ld-dash">
  <nav className="ld-crumbs" aria-label="Breadcrumb">…buttons.ld-link + fa-chevron-right…</nav>
  <div className="ld-head">                          {/* list pages */}
    <div><h1>Title</h1><p>One line on what the page is for</p></div>
    <div className="ld-head-actions">…ld-btn / ld-btn ld-btn-primary…</div>
  </div>
  {/* detail pages: ld-head ld-entity-head › ld-entity (ld-tile icon + h1.ld-entity-title + p.ld-entity-meta) and ld-head-side (actions + ul.ld-tags) */}
  <div className="ld-grid ld-grid-stats">…StatCard…</div>      {/* or ld-kpis › Kpi for metric cards */}
  <div className="ld-tabs" role="tablist">…button.ld-tab[.active] role="tab" aria-selected…</div>
  <div className="ld-grid ld-grid-2 | ld-grid-3">…Panel…</div>
</div>
```

## Components (`components/ld.tsx` unless noted)
- `Panel({ title, action?: { label, onClick } })` — the standard card with a header
- `StatCard({ icon, tone, label, value, note, onClick? })` — summary tile
- `Kpi` (`components/KpiCard.tsx`) — metric card with value, change and sparkline
- `Pill({ tone })` — status badge; `Tone` = crit | warn | ok | info | purple | muted
- `Donut` + `Legend`, `TrendChart`, `Empty`, `countBy`, `fmt`, `PALETTE`
- Charts over time: `TimeChart`, `MetricsBody`, `Sparkline`, `RangeSelect`, `LiveButton` (`components/MetricCharts.tsx`)
- Tables: `div.ld-table-wrap > table.ld-table` with `th scope="col"`; cell helpers `ld-mono`, `ld-strong`, `ld-sub`, `ld-muted`, `ld-nowrap`, `ld-wrap`
- Forms: `ld-form`, `ld-form-field` (label + `ld-input` / `ld-select` / `ld-textarea`), `ld-filters`, `ld-search`
- Lists of events: `ul.ld-activity`; key/value: `dl.ld-dl`; bars: `ul.ld-bars`

## Rules
1. **Keep behaviour.** Same data hooks, same routes, same navigation params, same actions. Restyle markup only, unless a rule below says otherwise.
2. **No fake data presented as live.** A hard-coded number that looks like a measurement ("92%", "24m MTTR", "+14% QoQ") is derived from the data the screen already has, or removed, or the panel is labelled "Sample data". Existing seed fallbacks (`?? SEED`) stay as they are.
3. **Accessible markup.** Anything clickable is a `<button type="button">` (or a real link), never a clickable `div`/`tr`/`a` without `href`. Icons are `aria-hidden="true"`. Form labels use `htmlFor`. Tabs use `role="tab"` + `aria-selected`.
4. **No inline colour soup.** Use classes and theme tokens (`var(--fg)`, `var(--fg-muted)`, `var(--border)`, `var(--bg-raised)`, `var(--accent)`) so dark mode works. Inline `style` only for data-driven values (bar widths, series colours).
5. **CSS.** Prefer existing `ld-*` classes. A screen that needs more puts it in `frontend/src/styles/<area>.css` with `ld-<area>-*` class names and imports it at the top of the screen file. Do not edit `styles.css` or shared components from a screen conversion.
6. **Responsive.** Grids collapse to one column on narrow screens; tables sit in `ld-table-wrap`; no fixed pixel widths on page containers.
7. `npx tsc --noEmit -p .` (in `frontend/`) must pass.
