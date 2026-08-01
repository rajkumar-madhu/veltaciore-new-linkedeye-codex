# Veltacore API reference

Base URL: `/api`. All list endpoints support DRF pagination
(`?page=`, 50/page), `?search=`, `?ordering=` and the filters noted below.
Responses are `{count, next, previous, results}` for viewsets and plain JSON
arrays/objects for the trading + device-detail endpoints.

Headers:
- `X-Tenant-ID: <tenant-id>` — scope tenant-bound rows; omit for cross-tenant.
- `Authorization: Bearer <keycloak-jwt>` — required when Keycloak is configured.

## Tenants
| Endpoint | Notes |
|---|---|
| `GET /tenants/` | search: name, code, plan |

## ITSM
| Endpoint | Filters |
|---|---|
| `GET /incidents/` | sev, status, service |
| `GET /incidents/records/` | pri, state, category, group (ServiceNow-style list) |
| `GET /problems/` | status, priority |
| `GET /changes/` | type, state, risk |
| `GET /cmdb/config-items/` | cls, env, health |
| `GET /knowledge/articles/` | cat, tag |
| `GET /slas/` | — |
| `GET /services/` | status |

## Infrastructure
| Endpoint | Notes |
|---|---|
| `GET /infra/sites/` | |
| `GET /infra/sites/{id}/topology/` | `{site, devices[], links[]}` |
| `GET /infra/sites/{id}/devices/` | |
| `GET /infra/devices/` | filters: site, device_type, status, vendor · search: id, name, hostname, ip, model, vendor, serial |
| `GET /infra/devices/{id}/` | frontend field names (kind, ip, iface, lastSeen…) |
| `GET /infra/devices/{id}/overview/` | |
| `GET /infra/devices/{id}/availability/` | status, uptime, ping, loss, SLA, blackbox |
| `GET /infra/devices/{id}/metrics/` | 24-point cpu/mem/disk/rx/tx series |
| `GET /infra/devices/{id}/interfaces/` | per-NIC RX/TX, errors, drops, CRC, util |
| `GET /infra/devices/{id}/alerts/` | |
| `GET /infra/alerts/` | sev, site, acknowledged, resolved |
| `GET /infra/vms/` | cluster, state |
| `GET /infra/exporters/` | |

## Trading Ops
| Endpoint | Shape |
|---|---|
| `GET /trading/latency/hourly/` | `[{label, orders, oms_med, oms_p99, exch_med, exch_p99}]` |
| `GET /trading/latency/segments/` | `[{seg, count, pct, …}]` (NFO/BFO/NSE/BSE) |
| `GET /trading/latency/orders/` | `[{ord, seg, rmks, oms, lat, exch, conf, omsT, exchT}]` — mirrors the L_ORDERLATENCY 9-column CSV; `""` = blank/unconfirmed |
| `GET /trading/ctcl/lines/` | `[{id, segment, role, samples, status, series[]}]` — series is queue depth per 15-min bucket, `null` = no data |
| `GET /trading/ctcl/brokers/` | `[{n, ctcls{n1,n2,nf1,nf2,bse,bfo}, nse, nfo, bse, bfo}]` |

## Status codes (trading)
- `OMS_STATUS`: 65 COMPLETE · 56 OPEN · 48 CANCELED · 45 REJECT · 70 TRIGGER_PENDING
- `EXCH_STATUS`: 48 confirmed · blank pending/not sent
