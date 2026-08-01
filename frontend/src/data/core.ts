// Core platform seed data. Generated from the design prototype (data.jsx)
// via backend/scripts/gen_data_ts.mjs — regenerate rather than hand-editing.
import type { Org, Tenant, User, Incident, Service, Integration } from "@/lib/types";

export const ORG: Org = {
  "name": "Finspot Technology Solutions",
  "slug": "finspot",
  "plan": "Enterprise Plus",
  "seatsUsed": 1247,
  "seatsTotal": 2000,
  "founder": "Rajkumar Madhu",
  "contact": "rk.madhu2026@gmail.com",
  "phone": "+91 9176772077"
};

export const TENANTS: Tenant[] = [
  {
    "id": "fyers",
    "name": "Fyers",
    "parent": "finspot",
    "code": "FY",
    "color": "amber",
    "users": 412,
    "incidents": 23,
    "sev1": 1,
    "health": 94,
    "mttr": 18,
    "spend": 48200,
    "plan": "Enterprise"
  },
  {
    "id": "flattrade",
    "name": "FlatTrade",
    "parent": "finspot",
    "code": "FT",
    "color": "teal",
    "users": 286,
    "incidents": 14,
    "sev1": 0,
    "health": 98,
    "mttr": 12,
    "spend": 32100,
    "plan": "Enterprise"
  },
  {
    "id": "indmoney",
    "name": "IndMoney",
    "parent": "finspot",
    "code": "IM",
    "color": "pink",
    "users": 198,
    "incidents": 31,
    "sev1": 2,
    "health": 82,
    "mttr": 42,
    "spend": 28900,
    "plan": "Business"
  },
  {
    "id": "lemonn",
    "name": "Lemonn",
    "parent": "finspot",
    "code": "LM",
    "color": "purple",
    "users": 94,
    "incidents": 9,
    "sev1": 0,
    "health": 96,
    "mttr": 22,
    "spend": 14600,
    "plan": "Business"
  },
  {
    "id": "neo-broking",
    "name": "Neo Broking",
    "parent": "finspot",
    "code": "NB",
    "color": "slate",
    "users": 38,
    "incidents": 4,
    "sev1": 0,
    "health": 99,
    "mttr": 8,
    "spend": 6400,
    "plan": "Growth"
  },
  {
    "id": "betafront",
    "name": "BetaFront",
    "parent": "finspot",
    "code": "BF",
    "color": "green",
    "users": 219,
    "incidents": 18,
    "sev1": 1,
    "health": 88,
    "mttr": 31,
    "spend": 22800,
    "plan": "Business"
  }
];

export const USERS: User[] = [
  {
    "id": "u1",
    "name": "Priya Raghunathan",
    "email": "priya.r@finspot.in",
    "role": "Incident Commander",
    "team": "SRE Platform",
    "color": "amber",
    "status": "online",
    "last": "now"
  },
  {
    "id": "u2",
    "name": "Marcus Okafor",
    "email": "marcus.o@finspot.in",
    "role": "Admin",
    "team": "Platform",
    "color": "purple",
    "status": "online",
    "last": "2m"
  },
  {
    "id": "u3",
    "name": "Yuki Tanaka",
    "email": "yuki.t@finspot.in",
    "role": "Responder",
    "team": "Networking",
    "color": "teal",
    "status": "online",
    "last": "now"
  },
  {
    "id": "u4",
    "name": "Elena Kowalski",
    "email": "elena.k@finspot.in",
    "role": "Responder",
    "team": "Database",
    "color": "pink",
    "status": "away",
    "last": "14m"
  },
  {
    "id": "u5",
    "name": "Devon Hassan",
    "email": "devon.h@finspot.in",
    "role": "Manager",
    "team": "SRE Platform",
    "color": "green",
    "status": "online",
    "last": "5m"
  },
  {
    "id": "u6",
    "name": "Sasha Volkov",
    "email": "sasha.v@finspot.in",
    "role": "Viewer",
    "team": "Finance Ops",
    "color": "slate",
    "status": "offline",
    "last": "1d"
  },
  {
    "id": "u7",
    "name": "Jamal Washington",
    "email": "jamal.w@finspot.in",
    "role": "Responder",
    "team": "Security",
    "color": "slate",
    "status": "online",
    "last": "1m"
  },
  {
    "id": "u8",
    "name": "Noor Rahimi",
    "email": "noor.r@finspot.in",
    "role": "Admin",
    "team": "Platform",
    "color": "amber",
    "status": "online",
    "last": "now"
  }
];

export const INCIDENTS: Incident[] = [
  {
    "id": "INC-48291",
    "sev": 1,
    "title": "Payment gateway timeouts — Stripe connection pool exhausted",
    "service": "checkout-api",
    "tenant": "fyers",
    "assignee": "u1",
    "status": "active",
    "age": "14m",
    "sla": 0.32,
    "sloBurn": 8.4,
    "impacted": "12,400 users"
  },
  {
    "id": "INC-48290",
    "sev": 2,
    "title": "Elevated 5xx on inventory-service, us-east-1 AZ-b",
    "service": "inventory",
    "tenant": "indmoney",
    "assignee": "u3",
    "status": "active",
    "age": "42m",
    "sla": 0.68,
    "sloBurn": 3.2,
    "impacted": "3 regions"
  },
  {
    "id": "INC-48289",
    "sev": 3,
    "title": "Slow queries against analytics_events warehouse",
    "service": "warehouse",
    "tenant": "fyers",
    "assignee": "u4",
    "status": "mitigating",
    "age": "1h 12m",
    "sla": 0.85,
    "sloBurn": 1.1,
    "impacted": "internal dashboards"
  },
  {
    "id": "INC-48288",
    "sev": 2,
    "title": "Auth service CPU saturation during peak window",
    "service": "auth-svc",
    "tenant": "flattrade",
    "assignee": "u5",
    "status": "active",
    "age": "2h 4m",
    "sla": 0.45,
    "sloBurn": 4.8,
    "impacted": "all tenants"
  },
  {
    "id": "INC-48286",
    "sev": 4,
    "title": "Flaky CI runs on deployment pipeline #darwin",
    "service": "ci-pipeline",
    "tenant": "neo-broking",
    "assignee": "u2",
    "status": "investigating",
    "age": "3h 18m",
    "sla": 0.92,
    "sloBurn": 0.4,
    "impacted": "internal"
  },
  {
    "id": "INC-48282",
    "sev": 3,
    "title": "Queue backlog on notifications-worker exceeding threshold",
    "service": "notifications",
    "tenant": "indmoney",
    "assignee": "u7",
    "status": "mitigating",
    "age": "4h 52m",
    "sla": 0.71,
    "sloBurn": 1.8,
    "impacted": "email delivery delayed"
  },
  {
    "id": "INC-48279",
    "sev": 1,
    "title": "Kubernetes control plane unreachable — cluster prod-west",
    "service": "k8s-control",
    "tenant": "betafront",
    "assignee": "u8",
    "status": "active",
    "age": "6m",
    "sla": 0.18,
    "sloBurn": 12.2,
    "impacted": "deployment blocked"
  },
  {
    "id": "INC-48276",
    "sev": 4,
    "title": "Certificate expiring in 7 days on api.lemonn.com",
    "service": "edge",
    "tenant": "lemonn",
    "assignee": null,
    "status": "open",
    "age": "12h",
    "sla": 0.95,
    "sloBurn": 0,
    "impacted": "proactive"
  }
];

export const SERVICES: Service[] = [
  {
    "name": "checkout-api",
    "status": "degraded",
    "uptime": 98.4,
    "p95": "420ms",
    "err": 2.1,
    "deps": 6
  },
  {
    "name": "auth-svc",
    "status": "healthy",
    "uptime": 99.95,
    "p95": "82ms",
    "err": 0.04,
    "deps": 4
  },
  {
    "name": "inventory",
    "status": "degraded",
    "uptime": 99.1,
    "p95": "1.2s",
    "err": 0.8,
    "deps": 9
  },
  {
    "name": "notifications",
    "status": "healthy",
    "uptime": 99.8,
    "p95": "210ms",
    "err": 0.12,
    "deps": 3
  },
  {
    "name": "warehouse",
    "status": "healthy",
    "uptime": 99.99,
    "p95": "4.1s",
    "err": 0,
    "deps": 11
  },
  {
    "name": "edge",
    "status": "healthy",
    "uptime": 100,
    "p95": "24ms",
    "err": 0,
    "deps": 2
  },
  {
    "name": "k8s-control",
    "status": "down",
    "uptime": 97.2,
    "p95": "—",
    "err": 100,
    "deps": 0
  },
  {
    "name": "payments-primary",
    "status": "degraded",
    "uptime": 99.2,
    "p95": "2.4s",
    "err": 1.4,
    "deps": 2
  }
];

export const INTEGRATIONS: Integration[] = [
  {
    "name": "Prometheus",
    "icon": "fa-solid fa-fire-flame-curved",
    "category": "Observability",
    "connected": true,
    "meta": "Metric ingest · 18.6k/s"
  },
  {
    "name": "Grafana",
    "icon": "fa-solid fa-chart-line",
    "category": "Observability",
    "connected": true,
    "meta": "12 dashboards embedded"
  },
  {
    "name": "Grafana Loki",
    "icon": "fa-solid fa-layer-group",
    "category": "Observability",
    "connected": true,
    "meta": "Logs · 2.8B/day"
  },
  {
    "name": "OpenTelemetry",
    "icon": "fa-solid fa-share-nodes",
    "category": "Observability",
    "connected": true,
    "meta": "Traces · 412M spans/day"
  },
  {
    "name": "Datadog",
    "icon": "fa-solid fa-dog",
    "category": "Observability",
    "connected": true,
    "meta": "Bidirectional sync"
  },
  {
    "name": "New Relic",
    "icon": "fa-solid fa-square",
    "category": "Observability",
    "connected": false,
    "meta": "NRQL & APM bridge"
  },
  {
    "name": "Dynatrace",
    "icon": "fa-solid fa-circle-dot",
    "category": "Observability",
    "connected": false,
    "meta": "Smartscape topology"
  },
  {
    "name": "Elastic / ELK",
    "icon": "fa-solid fa-magnifying-glass",
    "category": "Observability",
    "connected": true,
    "meta": "Search backend"
  },
  {
    "name": "Splunk",
    "icon": "fa-solid fa-database",
    "category": "Observability",
    "connected": false,
    "meta": "Log forwarder available"
  },
  {
    "name": "PagerDuty",
    "icon": "fa-solid fa-bell",
    "category": "On-call",
    "connected": true,
    "meta": "3 services · 8 schedules"
  },
  {
    "name": "Opsgenie",
    "icon": "fa-solid fa-headset",
    "category": "On-call",
    "connected": false,
    "meta": "Atlassian on-call"
  },
  {
    "name": "VictorOps / Splunk On-Call",
    "icon": "fa-solid fa-walkie-talkie",
    "category": "On-call",
    "connected": false,
    "meta": "Routing rules"
  },
  {
    "name": "Notify",
    "icon": "fa-solid fa-paper-plane",
    "category": "On-call",
    "connected": true,
    "meta": "SMS + voice fallback"
  },
  {
    "name": "Twilio",
    "icon": "fa-solid fa-phone",
    "category": "On-call",
    "connected": true,
    "meta": "SMS / voice provider"
  },
  {
    "name": "StackStorm",
    "icon": "fa-solid fa-bolt",
    "category": "Automation",
    "connected": true,
    "meta": "Event-driven workflows"
  },
  {
    "name": "Rundeck",
    "icon": "fa-solid fa-rocket",
    "category": "Automation",
    "connected": false,
    "meta": "Job scheduler"
  },
  {
    "name": "Ansible Tower",
    "icon": "fa-solid fa-tower-broadcast",
    "category": "Automation",
    "connected": true,
    "meta": "Config management"
  },
  {
    "name": "Terraform Cloud",
    "icon": "fa-solid fa-cube",
    "category": "Automation",
    "connected": true,
    "meta": "Infra as code"
  },
  {
    "name": "Jenkins",
    "icon": "fa-brands fa-jenkins",
    "category": "Automation",
    "connected": true,
    "meta": "CI/CD pipelines"
  },
  {
    "name": "GitHub Actions",
    "icon": "fa-brands fa-github",
    "category": "Automation",
    "connected": true,
    "meta": "Deploy events"
  },
  {
    "name": "ServiceNow",
    "icon": "fa-solid fa-building",
    "category": "ITSM",
    "connected": true,
    "meta": "Bi-di incident sync"
  },
  {
    "name": "Jira Service Mgmt",
    "icon": "fa-brands fa-jira",
    "category": "ITSM",
    "connected": true,
    "meta": "Tickets · changes"
  },
  {
    "name": "BMC Remedy",
    "icon": "fa-solid fa-life-ring",
    "category": "ITSM",
    "connected": false,
    "meta": "Legacy ITSM bridge"
  },
  {
    "name": "Freshservice",
    "icon": "fa-solid fa-headset",
    "category": "ITSM",
    "connected": false,
    "meta": "SaaS service desk"
  },
  {
    "name": "Slack",
    "icon": "fa-brands fa-slack",
    "category": "Comms",
    "connected": true,
    "meta": "5 channels · slash cmds"
  },
  {
    "name": "Microsoft Teams",
    "icon": "fa-brands fa-microsoft",
    "category": "Comms",
    "connected": true,
    "meta": "War-room bridge"
  },
  {
    "name": "Zoom",
    "icon": "fa-solid fa-video",
    "category": "Comms",
    "connected": true,
    "meta": "Auto-create bridge"
  },
  {
    "name": "Webex",
    "icon": "fa-solid fa-comments",
    "category": "Comms",
    "connected": false,
    "meta": "Cisco Webex bridge"
  },
  {
    "name": "Discord",
    "icon": "fa-brands fa-discord",
    "category": "Comms",
    "connected": false,
    "meta": "Community alerts"
  },
  {
    "name": "Email (SMTP)",
    "icon": "fa-solid fa-envelope",
    "category": "Comms",
    "connected": true,
    "meta": "Outbound only"
  },
  {
    "name": "GitHub",
    "icon": "fa-brands fa-github",
    "category": "SCM",
    "connected": true,
    "meta": "Repo events · PRs"
  },
  {
    "name": "GitLab",
    "icon": "fa-brands fa-gitlab",
    "category": "SCM",
    "connected": false,
    "meta": "Self-hosted available"
  },
  {
    "name": "Bitbucket",
    "icon": "fa-brands fa-bitbucket",
    "category": "SCM",
    "connected": false,
    "meta": "Atlassian repos"
  },
  {
    "name": "AWS",
    "icon": "fa-brands fa-aws",
    "category": "Cloud",
    "connected": true,
    "meta": "CloudWatch · 12 accounts"
  },
  {
    "name": "Azure",
    "icon": "fa-brands fa-microsoft",
    "category": "Cloud",
    "connected": false,
    "meta": "Monitor + Resource Graph"
  },
  {
    "name": "GCP",
    "icon": "fa-brands fa-google",
    "category": "Cloud",
    "connected": false,
    "meta": "Cloud Monitoring"
  },
  {
    "name": "Kubernetes",
    "icon": "fa-solid fa-dharmachakra",
    "category": "Cloud",
    "connected": true,
    "meta": "8 clusters · 2,156 pods"
  },
  {
    "name": "Okta",
    "icon": "fa-solid fa-key",
    "category": "Identity",
    "connected": true,
    "meta": "SAML · SCIM"
  },
  {
    "name": "Azure AD",
    "icon": "fa-brands fa-windows",
    "category": "Identity",
    "connected": false,
    "meta": "Entra ID SSO"
  },
  {
    "name": "1Password",
    "icon": "fa-solid fa-lock",
    "category": "Identity",
    "connected": false,
    "meta": "Secrets vault"
  },
  {
    "name": "HashiCorp Vault",
    "icon": "fa-solid fa-vault",
    "category": "Identity",
    "connected": true,
    "meta": "Secrets · PKI"
  },
  {
    "name": "CrowdStrike",
    "icon": "fa-solid fa-shield-virus",
    "category": "Identity",
    "connected": false,
    "meta": "EDR signal feed"
  },
  {
    "name": "Salesforce",
    "icon": "fa-solid fa-cloud",
    "category": "Business",
    "connected": false,
    "meta": "Customer impact link"
  },
  {
    "name": "HubSpot",
    "icon": "fa-brands fa-hubspot",
    "category": "Business",
    "connected": false,
    "meta": "Customer comms"
  },
  {
    "name": "Statuspage",
    "icon": "fa-solid fa-signal",
    "category": "Business",
    "connected": true,
    "meta": "Public + private pages"
  }
];

// Sparkline data (24 points)
export const spark = (seed: number, trend = 0): number[] => {
  const out: number[] = [];
  let v = 50 + (seed % 30);
  for (let i = 0; i < 24; i++) {
    v += (Math.sin(seed + i * 0.6) * 8) + trend * (i / 24) * 20 + ((seed * (i + 1)) % 7) - 3;
    out.push(Math.max(4, Math.min(96, v)));
  }
  return out;
};
