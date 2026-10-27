# Moving screens from `ld-*` CSS to Tailwind

The frontend is switching from hand-written CSS (`src/styles.css`, `src/styles/*.css`)
to Tailwind utilities. **The look must not change**: light and dark mode, spacing,
font sizes and colours stay exactly as they are. Behaviour, data hooks, routes and
accessibility stay as they are too.

## What is already in place

- `tailwind.config.js`: the theme *is* the LinkedEye tokens (CSS variables), so
  utilities follow dark mode (`body[data-theme="dark"]`) and the accent tweak.
  - colours: `bg` `bg-raised` `bg-muted` `bg-hover` · `fg` `fg-muted` `fg-subtle`
    `fg-faint` · `line` `line-strong` `line-subtle` (borders: `border-line`) ·
    `accent` · `critical` `warning` `success` `info` (+ `-bg`, e.g. `bg-info-bg`) ·
    `tone-{crit,warn,ok,info,purple}` and `tone-*-soft` (pill / tile colours).
    Plain `border` already uses `--border`.
  - font sizes set **size only** (line-height stays the body's 1.45):
    `text-2xs` 11 · `xs` 12 · `sm` 13 · `base` 14 · `md` 15 · `lg` 16 · `xl` 17 ·
    `2xl` 18 · `3xl` 22 · `4xl` 24 · `5xl` 26 · `6xl` 28 px. Other sizes: `text-[12.5px]`.
  - radius: `rounded-sm` 6 · `rounded` 8 · `rounded-lg` 12 px; shadows `shadow-sm`
    `shadow-md` `shadow-lg` `shadow-pop` are the token shadows.
  - spacing is Tailwind's (4px steps) plus `4.5` = 18px and `5.5` = 22px; use
    `p-[9px]` style values for anything else.
  - Preflight is **off**; `styles.css` still provides the reset (`* { margin:0;
    padding:0; box-sizing:border-box }`, `button { font: inherit }`, …).
- `components/ui.tsx`: components and class strings that reproduce the shared
  `ld-*` classes exactly. **Use these instead of re-deriving the utilities.**
- `components/ld.tsx`: `Pill` (+ `PillDot`), `Panel`, `Empty`, `StatCard`, `Donut`,
  `Legend`, `TrendChart` — already Tailwind.
- Icons: `components/Icon.tsx` (Lucide). `<Icon icon={ServerIcon} />` or
  `<Icon name={data.icon} />`. Icons are 1em and `currentColor`. CSS can target
  them with `.ld-icon` / `[data-icon="chevron-down"]`; in utilities use
  `[&_.ld-icon]:text-accent` etc.
- Reference conversion: `screens/CrossTenantScreen.tsx`.

## Mapping

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

Everything not in the table (area classes such as `ld-trading-*`, `ld-infra-*`,
prototype classes such as `card`, `btn`, `sb-*`): open the rule in the CSS and
write the same declarations as utilities.

## How to convert a file

1. For every class in the file, find **all** CSS rules that mention it:
   `grep -n "\.<class>\b" src/styles.css src/styles/*.css`. That includes
   - media queries (`@media (max-width: 640px)` → `max-sm:`, `min-width: 1280px` →
     `xl:`, other widths → `max-[720px]:` / `min-[900px]:`),
   - pseudo classes (`:hover` → `hover:`, `:focus-visible`, `:disabled`,
     `:last-child`, `::before` → `before:content-['|']` …),
   - **context rules** where the class is styled by a parent or sibling
     (`.ld-grid-6 .ld-stat`, `.ld-entity .ld-tile`, `.x.active .y`,
     `[data-theme="dark"] .x`). Reproduce them: put the variant on the child
     (`group` / `group-[.active]:`, `peer-*`, `dark:` — `dark:` is wired to
     `[data-theme="dark"]`), or an arbitrary descendant variant on the parent
     (`[&_.ld-icon]:text-accent`, `[&>li]:flex`).
2. Replace the classes with the mapping above or with utilities that produce the
   same computed style. Keep data-driven inline `style` (widths, series colours).
3. Remove the `ld-*` / legacy class names from the file entirely. Keep the
   `ld-icon` class (it is not CSS you own) and `sr-only`.
4. Don't edit `src/styles.css`, `src/styles/*.css`, `tailwind.config.js`,
   `components/ui.tsx`, `components/ld.tsx` or `components/Icon.tsx`. Unused CSS
   is deleted centrally afterwards. If a shared piece is missing from `ui.tsx`,
   write the utilities inline in your file and say so in your report.
5. Keep: behaviour, hooks, routes, `role` / `aria-*` / `htmlFor`, button types,
   and comments that explain the code.

## Checking your work

- `cd frontend && npx tsc --noEmit -p .` must pass. Errors only in files you were
  not given are someone else's work in progress: re-run later.
- Screenshot the routes you converted and compare with the references (the API
  on :8000 and Vite on :5179 are running):

  ```bash
  S=/tmp/claude-0/-home-user-veltaciore-new-linkedeye-codex/8440cf9a-a1c7-5ffd-bfe2-508f96a5b3e1/scratchpad
  cd $S/pw && node routes.mjs $S/shots/<you>-light light route-a,route-b
  node routes.mjs $S/shots/<you>-dark dark route-a,route-b
  python3 -W ignore $S/tools/imgdiff.py $S/shots/ref-light $S/shots/<you>-light $S/shots/<you>-diff-light 0.3
  python3 -W ignore $S/tools/imgdiff.py $S/shots/ref-dark  $S/shots/<you>-dark  $S/shots/<you>-diff-dark 0.3
  ```

  `imgdiff.py` compares only files present in both folders, so routes you didn't
  shoot show as "missing" — ignore those. It prints the share of changed pixels and
  writes a side-by-side image (old | new | changed pixels in red) for every route
  above the threshold. Look at them (Read the PNG). Target: below 0.3% on every
  route except the live chart pages (server / switch / firewall / loadbal / storage /
  ups / vm detail, node), whose sample charts move with the clock — there, check
  the diff image and make sure only chart lines and numbers changed. A changed page
  height (`size (a)->(b)`) is always a real difference.
