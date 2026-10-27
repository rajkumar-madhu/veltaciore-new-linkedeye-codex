# LinkedEye UI conventions

Screens are styled with **Tailwind CSS** utilities on the LinkedEye theme, plus a
small set of shared components. There is no per-screen CSS: `src/base.css` holds
only the design tokens (CSS variables for light / dark / density), the reset and
the `@keyframes` used by `animate-[…]` utilities.

## Theme (`frontend/tailwind.config.js`)

The theme *is* the LinkedEye tokens, so utilities follow dark mode
(`body[data-theme="dark"]`, also available as the `dark:` variant) and the accent
tweak.

- Colours: `bg` `bg-raised` `bg-muted` `bg-hover` · `fg` `fg-muted` `fg-subtle`
  `fg-faint` · `line` `line-strong` `line-subtle` (`border` defaults to `line`) ·
  `accent` · `critical` `warning` `success` `info` (+ `-bg`) · status tones
  `tone-{crit,warn,ok,info,purple}` and `tone-*-soft` for pills and tiles.
- Font sizes set the size only (line-height stays the body's 1.45):
  `text-2xs` 11 · `xs` 12 · `sm` 13 · `base` 14 · `md` 15 · `lg` 16 · `xl` 17 ·
  `2xl` 18 · `3xl` 22 · `4xl` 24 · `5xl` 26 · `6xl` 28 px.
- Radius `rounded-sm` 6 · `rounded` 8 · `rounded-lg` 12 px; shadows are the token
  shadows; spacing adds `4.5` (18px) and `5.5` (22px).
- Preflight is off: `base.css` provides the reset.

## Building blocks

- `components/ui.tsx`: `Page`, `PageHead`, `Crumbs`, `Card`, `Button`
  (`variant="primary"`, `size="sm"`), `TextButton`, `Table`, `Tabs` / `Tab`,
  `Field`, `Input`, `Select`, `Textarea`, `SearchBox`, `Tile`, and the `ui`
  class strings (`ui.grid` + `ui.cols.stats/2/3/5/6/tables`, `ui.split`,
  `ui.filters`, `ui.dl`, `ui.bars`, `ui.notice`, `ui.mono`, `ui.sub` …),
  `toneBg` / `toneText`, and `cx()` to join classes.
- `components/ld.tsx`: `Pill` + `PillDot`, `Panel`, `Empty`, `StatCard`,
  `Donut`, `Legend`, `TrendChart`, `countBy`, `fmt`, `PALETTE`.
- Charts over time: `TimeChart`, `MetricsBody`, `Sparkline`, `RangeSelect`,
  `LiveButton` (`components/MetricCharts.tsx`); KPI cards `components/KpiCard.tsx`.
- Icons are Lucide through `components/Icon.tsx`: `<Icon icon={ServerIcon} />`
  with `import { ServerIcon } from "lucide-react"` for a fixed icon, or
  `<Icon name={kind.icon} />` when the name comes from data (`fa-server` /
  `server` resolve through `components/iconRegistry.ts`). Icons are 1em and
  `currentColor`; inside utilities target them with `[&_.ld-icon]:…`.

Reference screens — copy their structure:
- `screens/CrossTenantScreen.tsx` — list page: crumbs, head, stat cards, filters, table
- `screens/DashboardScreen.tsx` — summary cards, charts, tables
- `screens/ServerDetailScreen.tsx`, `screens/VmDetailScreen.tsx` — entity detail page with header, KPI cards, tabs
- `screens/DomainsScreen.tsx` — list + details panel + form
- `components/RecordList.tsx` — ITSM list layout (Incidents / Problems / Changes)

## Rules

1. **No fake data presented as live.** A number that looks like a measurement is derived
   from data the screen has, removed, or the panel is labelled "Sample data".
2. **Accessible markup.** Anything clickable is a `<button type="button">` (or a real
   link). `Icon` is aria-hidden unless it has a `title` / `aria-label`. Form labels use
   `htmlFor`. Tabs use `role="tab"` + `aria-selected` (`<Tab>` does this).
3. **Theme tokens only.** Use the theme colours above so dark mode works; raw hex only
   for data-driven values (series colours) or to reproduce a fixed brand colour.
   Inline `style` only for data-driven values (bar widths, series colours).
4. **Prefer the shared pieces** over re-deriving their utilities. A pattern repeated
   inside one screen becomes a local constant or component in that file; one used by
   several screens goes into `ui.tsx`.
5. **Tailwind gotchas.** Conflicting utilities on one element don't resolve by class
   order — don't stack them (`!` only when overriding a shared component's size or
   colour). Stacked variants apply right to left: write `[&_x]:hover:…` for "x when
   hovered", not `hover:[&_x]:…`. Cell defaults in `ui.table` / `ui.dl` use
   `:where()`, so a class on a single `<td>` / `<dd>` wins.
6. **Responsive.** Grids collapse to one column on narrow screens; tables sit in
   `<Table>` (scrolls horizontally); no fixed pixel widths on page containers.
7. `npx tsc --noEmit -p .` (in `frontend/`) and `npm run check:bundle` must pass.

## Old `ld-*` classes → current equivalents

For reading older code and PRs:

| Old class | New |
|---|---|
| `ld-dash` | `<Page>` |
| `ld-head` + `h1` + `p` + `ld-head-actions` | `<PageHead title subtitle actions>` (or `ui.head` / `ui.h1` / `ui.headSub` / `ui.headActions` when the layout is custom) |
| `ld-head-side` / `ld-tags` / `ld-tag` | `ui.headSide` / `ui.tags` / `ui.tag` |
| `ld-crumbs` | `<Crumbs items={[{label, onClick?}, …]}>` |
| `ld-card` | `<Card>` (or `ui.card`) |
| `ld-card ld-panel` + `ld-panel-head` + `h2` | `<Panel title action>`; custom heads: `ui.card` + `ui.panel`, `ui.panelHead`, `ui.panelTitle` |
| `ld-btn` / `ld-btn-primary` / `ld-btn-sm` | `<Button variant="primary" size="sm">` (`buttonClass()` for an `<a>`) |
| `ld-link` | `<TextButton>` (or `ui.link`) |
| `ld-table-wrap` > `ld-table` | `<Table>` (thead / tbody / th / td stay plain) |
| `td.ld-wrap` | `ui.cellWrap` |
| `ld-row-selected` | `ui.rowSelected` |
| `ld-grid` + `ld-grid-stats/2/3/5/6/tables` | `cx(ui.grid, ui.cols.stats)` etc. |
| `ld-split` / `ld-split-wide` / `ld-rail` | `ui.split` / `ui.splitWide` / `ui.rail` |
| `ld-toolbar` / `ld-filters` | `ui.toolbar` / `ui.filters` |
| `ld-form` / `ld-form-field` | `ui.form` / `ui.field` (or `<Field label htmlFor required>`) |
| `ld-field` (+ `ld-field-grow`) | `ui.filterField` (+ `ui.fieldGrow`) |
| `ld-input` / `ld-select` / `ld-textarea` | `<Input>` / `<Select>` / `<Textarea>` (or `ui.input` …) |
| `ld-search` + inner input | `<SearchBox icon={…} …inputProps>` (or `ui.search` + `ui.searchInput`) |
| `ld-req` | `ui.req` |
| `ld-tile` (+ `ld-tile-md/sm`, + tone) | `<Tile tone size="lg/md/sm">` |
| `ld-pill ld-<tone>` | `<Pill tone>`; `ld-pill-dot` → `<PillDot />` |
| `ld-dot` | `ui.dot` |
| `ld-dl` | `ui.dl` |
| `ld-activity` / li / `ld-activity-text` | `ui.activity` / `ui.activityItem` / `ui.activityText` |
| `ld-bars` / li / label / track / fill / value | `ui.bars` / `ui.barItem` (`ui.barItemWide` with a wide value) / `ui.barLabel` / `ui.barTrack` / `ui.barFill` / `ui.barValue` |
| `ld-empty` | `<Empty>` |
| `ld-metrics-off` (inside a card) | `<Card className={ui.notice}>` |
| `ld-pager` / `ld-pager-btns` | `ui.pager` / `ui.pagerBtns` |
| `ld-live` | `ui.live` |
| `ld-mono` | `ui.mono` (`font-mono text-xs font-semibold`) |
| `ld-muted` | `text-fg-muted` |
| `ld-small` | `text-xs` |
| `ld-sub` | `ui.sub` |
| `ld-strong` | `font-medium` |
| `ld-nowrap` | `whitespace-nowrap` |
| `ld-text-ok/crit/warn/info/muted` | `toneText.ok` etc. |
| `ld-<tone>` on something else | `toneBg[tone]` |
