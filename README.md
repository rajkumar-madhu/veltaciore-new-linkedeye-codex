# Argus-LinkedEye Monitoring — ITSM + Infrastructure Platform

Production implementation of the **Argus-LinkedEye Monitoring** platform (designed as "Veltacore ITSM" in
Claude Design; design bundle preserved under `project/`, primary prototype:
`project/uploads/santhira (14)/Veltacore ITSM Platform - Standalone.html`).

A multi-tenant enterprise platform combining ITSM (incidents, problems,
changes, CMDB, service catalog, knowledge, SLAs), infrastructure monitoring
(site topology, device detail, VMs, racks, exporters), APM & an applications
catalog, and **Trading Ops** dashboards (order latency, CTCL queue monitoring)
for the Finspot/LinkedEye estate.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite, TanStack Query, Zustand, React Router, custom design system (`src/styles.css`, ported from the prototype) |
| Backend | Django 5 + DRF, django-filter, Gunicorn/Uvicorn |
| Workers | Celery + Redis 7 (SNMP/node-exporter/blackbox polling, alert rules, EOD `L_ORDERLATENCY*.csv` batch) |
| Database | PostgreSQL 16 (SQLite fallback for zero-config dev) |
| AuthN/Z | Keycloak JWT (RS256/JWKS) + OPA PBAC (`backend/policy/veltacore/authz.rego`) |
| Deploy | docker-compose for dev, Helm chart under `deploy/helm/veltacore` |

## Quick start (dev, zero dependencies beyond Node + Python)

```bash
# Backend — SQLite, Keycloak/OPA off (dev fail-open)
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo      # optional — loads the demo dataset
python manage.py runserver 8000

# Clean multi-tenant start (no demo data): skip seed_demo, or purge an
# already-seeded database with:
#   python manage.py clear_demo         # reversible — re-run seed_demo to restore
# Under docker-compose, set SEED_DEMO=0 to boot empty.

# Frontend — proxies /api to :8000
cd frontend
npm install
npm run dev        # http://localhost:5173
```

The frontend degrades gracefully: every screen renders its seed dataset when
the backend is unreachable, and switches to live API data (30 s auto-refresh
on operational lists) when it is.

## Full stack (Postgres + Redis + Keycloak + OPA + Celery)

```bash
docker compose up --build
```

## Live monitoring data (Prometheus + Loki)

Device, server and VM charts, processes, services, iDRAC / iLO and event logs
read your own Prometheus and Loki. In development (`DJANGO_DEBUG=1`) with no
`PROMETHEUS_URL` / `LOKI_URL` set, they draw generated sample values so every
panel has something to show; each one is labelled "Sample data". Samples switch
off as soon as the URL is set, and are never used in production
(`METRICS_SAMPLE_DATA=0` turns them off in development too). A configured
source that is down still says "not connected".

1. `cp .env.example .env` and set `PROMETHEUS_URL` (plus `PROMETHEUS_TOKEN` if
   it needs one) and `LOKI_URL` / `LOKI_HOST_LABEL`. `.env` is git-ignored;
   never commit tokens.
2. `docker compose up -d` (compose reads `.env`). Outside Docker, export the
   same variables before starting the API.
3. Check what the API can see:

   ```bash
   docker compose exec api python manage.py check_monitoring --devices
   ```

   It prints the Prometheus version, scrape jobs (targets up / total), which
   exporter families have series, and for each device whether its selector
   (IP / port, or `metrics_labels`) matches any series. A device listed as
   "no series" needs its IP corrected or `metrics_labels` set, e.g.
   `{"instance": "srv01.example:9182"}`.

The API host must be able to reach Prometheus and Loki; if they are only on
your internal network, run the API there.

## Tests

```bash
cd backend && python manage.py test apps   # API contract + tenant isolation + EOD CSV
cd frontend && npm run typecheck           # strict TS across all screens
```

## Repository layout

```
frontend/            React app (src/screens = 1:1 ports of the design's screens)
backend/             Django project (apps/ per domain; fixtures/seed.json shared dataset)
backend/policy/      OPA rego policies
deploy/helm/         Kubernetes Helm chart
docker-compose.yml   Dev stack
docs/API.md          Endpoint reference
project/             Original Claude Design handoff bundle (do not edit)
design-reference/    Trading dashboard design HTML (Order Latency, CTCL Monitor)
```

## Multi-tenancy

Every request may carry `X-Tenant-ID: <tenant-id>`. Tenant-scoped rows are
filtered to that tenant (shared/global rows pass through); omitting the header
gives the cross-tenant (super-admin) view. OPA enforces group-based access
(admin, infra-admin, noc-engineer, service-desk-agent, viewer) when
`OPA_URL` is configured.

## Trading Ops

- `GET /api/trading/latency/*` — OMS/exchange latency rollups + L_ORDERLATENCY
  order records (9-column CSV schema; blank `EXCH_STATUS` = unconfirmed)
- `GET /api/trading/ctcl/*` — CTCL adapter lines with queue-depth series and
  the 18-broker CTCL mapping matrix
- Celery beat task `generate_order_latency_csv` writes
  `L_ORDERLATENCY<YYYYMMDDHHmmss>.csv` at 16:15 IST (10:45 UTC) Mon–Fri to
  `TRADING_REPORTS_DIR` (default `/opt/argus/reports`)
