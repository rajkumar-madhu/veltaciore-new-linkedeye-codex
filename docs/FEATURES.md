# Argus-LinkedEye — Feature Map

A navigable index of the platform's screens, their routes, and which are backed
by live Django/DRF endpoints. Grouped as they appear in the sidebar.

## Access & authorization

Client-side PBAC gates write actions by role; the authoritative check is the OPA
rego enforced server-side. Roles: `admin`, `infra-admin`, `noc-engineer`,
`service-desk-agent` (writers) and `viewer` (read-only).

| Behaviour | Where |
|---|---|
| Hide New Incident/Problem/Change + state-advance for viewers | `IncidentsScreen`, `ProblemsScreen`, `ChangesScreen` |
| War-room: Acknowledge/Resolve hidden, composer → read-only banner | `IncidentDetailScreen` |
| Catalog submit, runbook run, dashboard "Declare Incident" gated | `CatalogScreen`, `RunbooksScreen`, `DashboardScreen` |
| `useCanWrite()` selector + dev role map | `src/auth/auth.ts` |
| Shared read-only indicator | `components/ReadOnlyBadge.tsx` |

## Observability

| Screen | Route | Notes |
|---|---|---|
| Metrics Explorer | `/metrics` | Ad-hoc query bar (metric · tag · agg · group-by · range), multi-series chart, catalog, small-multiples |
| Monitors | `/monitors` | Alert-rule builder — metric/anomaly/composite/log/synthetic, warning+critical thresholds, live evaluation preview |
| Synthetics | `/synthetics` | HTTP/TCP/ICMP/browser checks, probe locations, request waterfall, assertions |
| SLOs | `/slos` | Error-budget burn-down, fast/slow-burn alert policy |

## Infrastructure

| Screen | Route | Live endpoint |
|---|---|---|
| LE Sites (list + detail) | `/lesites`, `/site-detail` | `/api/infra/devices`, `/api/infra/exporters`, `/api/infra/bod-checks` |
| Host Map | `/host-map` | — (hexagon fleet grid) |
| Node view | `/node` | — (Netdata-style per-host) |
| Exporters & collectors | `/infra-exporters` | **`/api/infra/exporters`** (12 exporters, ports/protocols, iLO SSL note) |

## Trading Ops / BOD

| Screen | Route | Live endpoint / data |
|---|---|---|
| BOD Checks | `/bod-checks` | **`/api/infra/bod-checks`** — 21 URL + telnet + k8s checks, status 0/1/2/3 |
| BOD/EOD Status | `/bod-eod` | trading-day lifecycle; BOD stage reads `/bod-checks` live |
| Order Latency | `/order-latency` | Message-Queue tab parsed from real `QueSize_NSE_22Jul2026.csv` |
| Market Calendar | `/market-calendar` | **`/api/trading/calendar`** — 15 holidays + 12 mocks; Export ICS produces a real `.ics` |

Cross-tenant (`/cross-tenant`) and the Operations Dashboard (`/`) both roll up
BOD readiness computed live from `/api/infra/bod-checks` + `/api/trading/calendar`.

## BOD data flow (mirrors the real Finspot checkers)

```
urlchecker.py / telnet_checker.py / k8s_ssl_check.py
        │  status 0 down · 1 warn · 2 ok · 3 timeout
        ▼
Redis (BOD_* keys) ──► RabbitMQ (bod_update) ──► notify service
        │
        ▼  (this app)
/api/infra/bod-checks  ──►  BOD Checks screen
                            BOD/EOD Status (BOD stage)
                            Dashboard BOD panel
                            Cross-tenant BOD rollup
                            LE Sites per-site readiness
```

## Backend endpoints added this cycle

| Endpoint | Model | Migration |
|---|---|---|
| `GET /api/infra/exporters/` | `Exporter` (+ port/protocol/note) | `infra/0002` |
| `GET /api/infra/bod-checks/` | `BodCheck` | `infra/0003` |
| `GET /api/trading/calendar/` | `MarketDay` | `trading/0003` |

Seeded via `python manage.py seed_demo` (gated by `SEED_DEMO`).

## Shared components / utils

- `components/StatusPill.tsx` — one ok/warn/crit/muted pill (used by BodChecks, Synthetics, Monitors)
- `lib/series.ts` — `wave()` deterministic pseudo-series (Metrics, Monitors, Node)
- `components/deviceDetail.tsx` — `LineChart`, `Donut`, `TIME_LABELS`
- `lib/statusColors.ts` — normalized status → color logic
