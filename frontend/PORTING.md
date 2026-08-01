# Screen porting conventions (prototype JSX → production TSX)

Source prototype: `/home/claude/repo/project/uploads/santhira (14)/` (in-browser
React + Babel, components on `window`). Target: `/home/claude/repo/frontend/src/screens/*.tsx`
(Vite + React 18 + TypeScript strict).

## Non-negotiables

1. **Pixel-faithful**: keep ALL JSX markup, classNames, and inline styles exactly
   as in the source. Do not redesign, simplify, or "improve" markup.
2. **One screen file per source file** (plus named exports for secondary screens
   defined in the same source file, e.g. `CatalogScreen` + `CatalogRequestScreen`).
3. Default-export the primary screen component.
4. Do **NOT** edit shared files (`components/`, `data/`, `lib/`, `store/`,
   `hooks/`, `api/`, `App.tsx`). If a helper you need is missing from the shared
   layer, define it locally inside your screen file.

## Mechanical conversions

| Prototype | Production |
|---|---|
| `function XScreen({ tenant, setRoute })` | `export default function XScreen()` with `const { setRoute } = useNav();` and `const tenant = useUiStore((s) => s.tenant);` (only pull what the screen uses) |
| `setRoute("route-id")` | same, via `useNav()` |
| `window.__integName = g.name; setRoute("integration-detail")` | `setRoute("integration-detail", { integName: g.name })` — 2nd arg stores params in the UI store |
| reading `window.__integName` | `const integName = useUiStore((s) => s.params.integName as string \| undefined)` |
| Globals `ORG, TENANTS, USERS, INCIDENTS, SERVICES, INTEGRATIONS, spark` | `import { ... } from "@/data/core"` |
| Globals `TIMELINE_EVENTS, CHAT` | `import { ... } from "@/data/incidentContent"` |
| Globals `SITES, DEVICE_KINDS, DEVICE_COUNTS, DEVICES, NET_LINKS, VMS, INFRA_ALERTS, EXPORTERS` | `import { ... } from "@/data/infra"` |
| Globals `PROBLEMS, CHANGES, CATALOG_CATEGORIES, CATALOG_ITEMS, CIS, ARTICLES, SLAS` | `import { ... } from "@/data/itsm"` |
| Globals `ONBOARD_DEVICE_TYPES, SWITCH_ROLES, MONITORING_METHODS, VENDOR_MODELS, CAP_LABELS, CREDENTIAL_PROFILES` | `import { ... } from "@/data/deviceVendorModels"` |
| Components `Avatar, UserById, Sparkline, Pill, Sev, SLAIndicator, Gauge, AreaChart, BarChart, Heatmap, KPI, FormSection, FormRow, Field, Kpi` | `import { ... } from "@/components/primitives"` |
| `colorFor` | `import { colorFor } from "@/components/Shell"` |
| Status helpers `STATUS_COLORS, THRESHOLDS, normalizeStatus, getHealthColor, getMetricColor, getCpuColor, getMemColor, getDiskColor, getUtilColor, getErrorRateColor, getPacketLossColor, getInterfaceColor, getLinkColor, getStatusBadgeClass, getStatusLabel, statusBadgeStyle` | `import { ... } from "@/lib/statusColors"` |
| `React.useState` etc. | keep as `React.useState` with `import React from "react"` |
| `Object.assign(window, {...})` | delete; use ES exports |

## TypeScript rules

- Annotate function params and useState generics where inference fails
  (`React.useState<string | null>(null)`).
- Local data arrays: define a local `interface` (or inline type) when the array
  is screen-local. Keep field names identical to the source.
- Index-signature lookups (`colors[s]`) — type the map `Record<string, T>`.
- Event handlers: `(e: React.MouseEvent)` / `(e: React.ChangeEvent<HTMLInputElement>)`.
- `style={{ ... }}` objects sometimes need `as const` or explicit
  `React.CSSProperties` when using nonstandard values — prefer keeping values
  as-is and cast the whole object only if tsc complains.
- Avoid `any` where trivial; a pragmatic `as` cast is acceptable to preserve
  markup fidelity. `noUnusedLocals` is OFF — unused imports are fine but tidy up.
- SVG numeric attrs (strokeWidth etc.) can stay as in source.

## Live data (TanStack Query)

Screens that list core entities should consume the API hook and fall back to
the local seed constant so the app still renders without the backend:

```tsx
import { useProblems } from "@/api/hooks";
import { PROBLEMS } from "@/data/itsm";
...
const { data } = useProblems();
const problems = data ?? PROBLEMS;
```

Available hooks (in `@/api/hooks`): useTenants, useSites, useDevices, useDevice,
useVms, useInfraAlerts, useExporters, useIncidents, useIncidentRecords,
useProblems, useChanges, useConfigItems, useArticles, useSlas, useServices,
useLatencyHourly, useLatencySegments, useOrderRecords, useCtclLines, useBrokers.

Only wire the hook when the screen's primary list matches one of these — leave
screen-local illustrative datasets as plain constants. Do not invent new hooks.

## Reference example

See `src/screens/IncidentsScreen.tsx` — a completed port of
`screens/incidents.jsx` demonstrating every rule above.
