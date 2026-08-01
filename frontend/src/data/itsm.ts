// ITSM seed data. Generated from the design prototype (data-itsm.jsx)
// via backend/scripts/gen_data_ts.mjs — regenerate rather than hand-editing.
import type { Problem, Change, CatalogCategory, CatalogItem, ConfigItem, Article, Sla } from "@/lib/types";

export const PROBLEMS: Problem[] = [
  {
    "id": "PRB-3912",
    "title": "Connection pool sizing regression in payments-primary",
    "status": "Root cause analysis",
    "priority": 1,
    "assignee": "u2",
    "linked": 4,
    "created": "14 days ago",
    "age": "14d",
    "impact": "High · Fyers",
    "kb": "KB-2114"
  },
  {
    "id": "PRB-3908",
    "title": "Intermittent p95 spikes on inventory-service during scale events",
    "status": "Known error",
    "priority": 2,
    "assignee": "u3",
    "linked": 7,
    "created": "28 days ago",
    "age": "28d",
    "impact": "Medium · IndMoney",
    "kb": null
  },
  {
    "id": "PRB-3902",
    "title": "Elastic search shard rebalance causes query timeouts",
    "status": "Resolved",
    "priority": 3,
    "assignee": "u4",
    "linked": 3,
    "created": "6 weeks ago",
    "age": "42d",
    "impact": "Low · internal",
    "kb": "KB-1983"
  },
  {
    "id": "PRB-3898",
    "title": "Kafka consumer lag on notifications-worker during backfills",
    "status": "Assessment",
    "priority": 2,
    "assignee": "u7",
    "linked": 5,
    "created": "2 months ago",
    "age": "58d",
    "impact": "Medium · cross-tenant",
    "kb": null
  },
  {
    "id": "PRB-3890",
    "title": "Kubernetes etcd leader elections during network partition",
    "status": "Root cause analysis",
    "priority": 1,
    "assignee": "u8",
    "linked": 2,
    "created": "9 days ago",
    "age": "9d",
    "impact": "High · BetaFront",
    "kb": null
  },
  {
    "id": "PRB-3882",
    "title": "Memory leak in auth-svc after 72h uptime",
    "status": "Known error",
    "priority": 2,
    "assignee": "u5",
    "linked": 11,
    "created": "3 months ago",
    "age": "91d",
    "impact": "Medium · all tenants",
    "kb": "KB-2088"
  }
];

export const CHANGES: Change[] = [
  {
    "id": "CHG-2219",
    "title": "Rollback payments-primary pool config to 200 connections",
    "type": "Emergency",
    "state": "Approved",
    "risk": "Moderate",
    "window": "Now · immediate",
    "assignee": "u1",
    "approvers": 3,
    "approved": 3,
    "tenant": "fyers",
    "service": "payments-primary"
  },
  {
    "id": "CHG-2218",
    "title": "Upgrade Kubernetes control plane to 1.29 in prod-east",
    "type": "Normal",
    "state": "CAB review",
    "risk": "High",
    "window": "Sat Apr 27 · 02:00–04:00 UTC",
    "assignee": "u2",
    "approvers": 5,
    "approved": 3,
    "tenant": "fyers",
    "service": "k8s-control"
  },
  {
    "id": "CHG-2217",
    "title": "Enable TLS 1.3 on edge load balancers",
    "type": "Standard",
    "state": "Scheduled",
    "risk": "Low",
    "window": "Tue Apr 30 · 14:00 UTC",
    "assignee": "u7",
    "approvers": 1,
    "approved": 1,
    "tenant": "flattrade",
    "service": "edge"
  },
  {
    "id": "CHG-2216",
    "title": "Deploy feature flag service v2.4",
    "type": "Normal",
    "state": "Implementing",
    "risk": "Moderate",
    "window": "In progress",
    "assignee": "u5",
    "approvers": 3,
    "approved": 3,
    "tenant": "indmoney",
    "service": "feature-flags"
  },
  {
    "id": "CHG-2215",
    "title": "Database schema migration for orders table",
    "type": "Normal",
    "state": "Draft",
    "risk": "High",
    "window": "TBD",
    "assignee": "u4",
    "approvers": 0,
    "approved": 0,
    "tenant": "fyers",
    "service": "orders-db"
  },
  {
    "id": "CHG-2214",
    "title": "Rotate Okta SAML certificate",
    "type": "Standard",
    "state": "Completed",
    "risk": "Low",
    "window": "Apr 22 · 10:00 UTC",
    "assignee": "u8",
    "approvers": 1,
    "approved": 1,
    "tenant": "finspot-holdings",
    "service": "sso"
  },
  {
    "id": "CHG-2213",
    "title": "Update CDN cache invalidation rules",
    "type": "Standard",
    "state": "Completed",
    "risk": "Low",
    "window": "Apr 21 · 08:30 UTC",
    "assignee": "u7",
    "approvers": 1,
    "approved": 1,
    "tenant": "indmoney",
    "service": "cdn"
  }
];

export const CATALOG_CATEGORIES: CatalogCategory[] = [
  {
    "id": "access",
    "label": "Access & accounts",
    "icon": "fa-user-lock",
    "count": 24,
    "color": "#2563eb"
  },
  {
    "id": "hardware",
    "label": "Hardware",
    "icon": "fa-laptop",
    "count": 18,
    "color": "#8b5cf6"
  },
  {
    "id": "software",
    "label": "Software",
    "icon": "fa-box",
    "count": 42,
    "color": "#10b981"
  },
  {
    "id": "dev",
    "label": "Developer tools",
    "icon": "fa-code",
    "count": 31,
    "color": "#f59e0b"
  },
  {
    "id": "hr",
    "label": "People & HR",
    "icon": "fa-users",
    "count": 16,
    "color": "#ec4899"
  },
  {
    "id": "finance",
    "label": "Finance",
    "icon": "fa-coins",
    "count": 12,
    "color": "#0891b2"
  },
  {
    "id": "infra",
    "label": "Cloud & infra",
    "icon": "fa-cloud",
    "count": 28,
    "color": "#6366f1"
  },
  {
    "id": "security",
    "label": "Security",
    "icon": "fa-shield-halved",
    "count": 19,
    "color": "#ef4444"
  }
];

export const CATALOG_ITEMS: CatalogItem[] = [
  {
    "id": "ci-1",
    "cat": "access",
    "title": "New employee onboarding",
    "desc": "Provisions accounts, laptop, and day-1 software",
    "sla": "2 days",
    "eta": "Next business day",
    "popular": true,
    "badge": "Bundle"
  },
  {
    "id": "ci-2",
    "cat": "access",
    "title": "Access request — production",
    "desc": "Time-bound elevated access with approval workflow",
    "sla": "1 hour",
    "eta": "Within hour",
    "popular": true,
    "badge": "Approval"
  },
  {
    "id": "ci-3",
    "cat": "hardware",
    "title": "MacBook Pro 16\"",
    "desc": "Standard engineering laptop configuration",
    "sla": "3 days",
    "eta": "2–3 business days",
    "popular": true
  },
  {
    "id": "ci-4",
    "cat": "hardware",
    "title": "External monitor",
    "desc": "Dell U2723QE · 27\" 4K · USB-C",
    "sla": "5 days",
    "eta": "1 week"
  },
  {
    "id": "ci-5",
    "cat": "software",
    "title": "Figma — Professional",
    "desc": "Full design seat with organization access",
    "sla": "30 min",
    "eta": "Same day",
    "popular": true,
    "badge": "SSO"
  },
  {
    "id": "ci-6",
    "cat": "software",
    "title": "Adobe Creative Cloud",
    "desc": "All apps · managed license",
    "sla": "1 day",
    "eta": "Next business day"
  },
  {
    "id": "ci-7",
    "cat": "dev",
    "title": "GitHub org access",
    "desc": "Join the Finspot GitHub org with team scopes",
    "sla": "1 hour",
    "eta": "Within hour",
    "badge": "Auto"
  },
  {
    "id": "ci-8",
    "cat": "dev",
    "title": "AWS sandbox account",
    "desc": "Personal sandbox with $300 monthly budget",
    "sla": "4 hours",
    "eta": "Same day",
    "badge": "Auto"
  },
  {
    "id": "ci-9",
    "cat": "infra",
    "title": "Provision new micro-service",
    "desc": "Bootstrap repo, CI, k8s namespace, observability",
    "sla": "1 day",
    "eta": "Next business day",
    "badge": "Flow"
  },
  {
    "id": "ci-10",
    "cat": "infra",
    "title": "Spin up staging environment",
    "desc": "Ephemeral per-PR environment with data seed",
    "sla": "30 min",
    "eta": "Within hour"
  },
  {
    "id": "ci-11",
    "cat": "hr",
    "title": "Time off request",
    "desc": "Vacation, sick, or personal time",
    "sla": "1 day",
    "eta": "Next business day"
  },
  {
    "id": "ci-12",
    "cat": "security",
    "title": "Report security concern",
    "desc": "Confidential · routed to security@",
    "sla": "30 min",
    "eta": "Immediate",
    "badge": "Urgent"
  }
];

export const CIS: ConfigItem[] = [
  {
    "id": "CI-01",
    "name": "checkout-api",
    "cls": "Application",
    "env": "prod",
    "region": "us-east-1",
    "owner": "u1",
    "health": "degraded",
    "deps": 6
  },
  {
    "id": "CI-02",
    "name": "payments-primary",
    "cls": "Database",
    "env": "prod",
    "region": "us-east-1",
    "owner": "u4",
    "health": "degraded",
    "deps": 2
  },
  {
    "id": "CI-03",
    "name": "auth-svc",
    "cls": "Application",
    "env": "prod",
    "region": "us-east-1",
    "owner": "u8",
    "health": "healthy",
    "deps": 4
  },
  {
    "id": "CI-04",
    "name": "inventory",
    "cls": "Application",
    "env": "prod",
    "region": "us-east-1",
    "owner": "u3",
    "health": "degraded",
    "deps": 9
  },
  {
    "id": "CI-05",
    "name": "notifications",
    "cls": "Application",
    "env": "prod",
    "region": "us-east-1",
    "owner": "u7",
    "health": "healthy",
    "deps": 3
  },
  {
    "id": "CI-06",
    "name": "warehouse",
    "cls": "Data store",
    "env": "prod",
    "region": "us-east-1",
    "owner": "u4",
    "health": "healthy",
    "deps": 11
  },
  {
    "id": "CI-07",
    "name": "edge",
    "cls": "Load balancer",
    "env": "prod",
    "region": "global",
    "owner": "u7",
    "health": "healthy",
    "deps": 2
  },
  {
    "id": "CI-08",
    "name": "k8s-control",
    "cls": "Platform",
    "env": "prod",
    "region": "us-west-2",
    "owner": "u2",
    "health": "down",
    "deps": 0
  },
  {
    "id": "CI-09",
    "name": "redis-cache",
    "cls": "Cache",
    "env": "prod",
    "region": "us-east-1",
    "owner": "u2",
    "health": "healthy",
    "deps": 1
  },
  {
    "id": "CI-10",
    "name": "kafka-broker",
    "cls": "Message queue",
    "env": "prod",
    "region": "us-east-1",
    "owner": "u2",
    "health": "healthy",
    "deps": 3
  },
  {
    "id": "CI-11",
    "name": "stripe-api",
    "cls": "External SaaS",
    "env": "prod",
    "region": "global",
    "owner": null,
    "health": "degraded",
    "deps": 0
  },
  {
    "id": "CI-12",
    "name": "datadog",
    "cls": "External SaaS",
    "env": "prod",
    "region": "global",
    "owner": null,
    "health": "healthy",
    "deps": 0
  }
];

export const ARTICLES: Article[] = [
  {
    "id": "KB-2114",
    "title": "Runbook: Stripe connection pool exhaustion",
    "cat": "Runbooks",
    "views": 1283,
    "upd": "2 days ago",
    "author": "u1",
    "rating": 4.8,
    "tag": "payments"
  },
  {
    "id": "KB-2113",
    "title": "How to declare and lead a Sev-1 incident",
    "cat": "Process",
    "views": 4120,
    "upd": "1 week ago",
    "author": "u5",
    "rating": 4.9,
    "tag": "incident"
  },
  {
    "id": "KB-2110",
    "title": "Setting up on-call rotations in Argus-LinkedEye",
    "cat": "Onboarding",
    "views": 782,
    "upd": "2 weeks ago",
    "author": "u2",
    "rating": 4.6,
    "tag": "on-call"
  },
  {
    "id": "KB-2108",
    "title": "Writing effective post-incident reviews",
    "cat": "Process",
    "views": 988,
    "upd": "3 weeks ago",
    "author": "u5",
    "rating": 4.7,
    "tag": "postmortem"
  },
  {
    "id": "KB-2104",
    "title": "Database migration playbook — zero-downtime",
    "cat": "Runbooks",
    "views": 2011,
    "upd": "1 month ago",
    "author": "u4",
    "rating": 4.9,
    "tag": "database"
  },
  {
    "id": "KB-2088",
    "title": "Known error: auth-svc memory leak after 72h",
    "cat": "Known errors",
    "views": 144,
    "upd": "1 month ago",
    "author": "u5",
    "rating": 4.2,
    "tag": "auth"
  },
  {
    "id": "KB-1983",
    "title": "Elasticsearch shard rebalance tuning",
    "cat": "Runbooks",
    "views": 312,
    "upd": "3 months ago",
    "author": "u3",
    "rating": 4.5,
    "tag": "search"
  },
  {
    "id": "KB-1880",
    "title": "Slack integration — incident channels & bots",
    "cat": "Onboarding",
    "views": 621,
    "upd": "4 months ago",
    "author": "u8",
    "rating": 4.4,
    "tag": "chatops"
  }
];

export const SLAS: Sla[] = [
  {
    "id": "SLA-01",
    "name": "Sev 1 response",
    "target": "5 min",
    "window": "24×7",
    "breach": 2,
    "compliance": 94.2
  },
  {
    "id": "SLA-02",
    "name": "Sev 1 resolution",
    "target": "1 hour",
    "window": "24×7",
    "breach": 4,
    "compliance": 88.6
  },
  {
    "id": "SLA-03",
    "name": "Sev 2 response",
    "target": "15 min",
    "window": "24×7",
    "breach": 1,
    "compliance": 97.4
  },
  {
    "id": "SLA-04",
    "name": "Sev 2 resolution",
    "target": "4 hours",
    "window": "24×7",
    "breach": 3,
    "compliance": 92.1
  },
  {
    "id": "SLA-05",
    "name": "Sev 3 resolution",
    "target": "1 day",
    "window": "business",
    "breach": 0,
    "compliance": 99
  },
  {
    "id": "SLA-06",
    "name": "Change approval",
    "target": "2 days",
    "window": "business",
    "breach": 0,
    "compliance": 98.3
  },
  {
    "id": "SLA-07",
    "name": "Access request",
    "target": "1 hour",
    "window": "24×7",
    "breach": 0,
    "compliance": 96.8
  },
  {
    "id": "SLA-08",
    "name": "Problem RCA",
    "target": "5 days",
    "window": "business",
    "breach": 1,
    "compliance": 91.4
  }
];
