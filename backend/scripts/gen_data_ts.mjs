// Generate frontend/src/data/*.ts from backend/fixtures/seed.json.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const seed = JSON.parse(readFileSync(join(here, "..", "fixtures", "seed.json"), "utf8"));
const dataDir = join(here, "..", "..", "frontend", "src", "data");

const J = (v) => JSON.stringify(v, null, 2);

writeFileSync(join(dataDir, "core.ts"), `// Core platform seed data. Generated from the design prototype (data.jsx)
// via backend/scripts/gen_data_ts.mjs — regenerate rather than hand-editing.
import type { Org, Tenant, User, Incident, Service, Integration } from "@/lib/types";

export const ORG: Org = ${J(seed.ORG)};

export const TENANTS: Tenant[] = ${J(seed.TENANTS)};

export const USERS: User[] = ${J(seed.USERS)};

export const INCIDENTS: Incident[] = ${J(seed.INCIDENTS)};

export const SERVICES: Service[] = ${J(seed.SERVICES)};

export const INTEGRATIONS: Integration[] = ${J(seed.INTEGRATIONS)};

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
`);

writeFileSync(join(dataDir, "infra.ts"), `// Infrastructure seed data. Generated from the design prototype (data-infra.jsx)
// via backend/scripts/gen_data_ts.mjs — regenerate rather than hand-editing.
import type { Site, DeviceKind, Device, Vm, InfraAlert, Exporter } from "@/lib/types";

export const SITES: Site[] = ${J(seed.SITES)};

export const DEVICE_KINDS: DeviceKind[] = ${J(seed.DEVICE_KINDS)};

export const DEVICE_COUNTS: Record<string, number> = ${J(seed.DEVICE_COUNTS)};

export const DEVICES: Device[] = ${J(seed.DEVICES)};

export const NET_LINKS: [string, string][] = ${J(seed.NET_LINKS)};

export const VMS: Vm[] = ${J(seed.VMS)};

export const INFRA_ALERTS: InfraAlert[] = ${J(seed.INFRA_ALERTS)};

export const EXPORTERS: Exporter[] = ${J(seed.EXPORTERS)};
`);

writeFileSync(join(dataDir, "itsm.ts"), `// ITSM seed data. Generated from the design prototype (data-itsm.jsx)
// via backend/scripts/gen_data_ts.mjs — regenerate rather than hand-editing.
import type { Problem, Change, CatalogCategory, CatalogItem, ConfigItem, Article, Sla } from "@/lib/types";

export const PROBLEMS: Problem[] = ${J(seed.PROBLEMS)};

export const CHANGES: Change[] = ${J(seed.CHANGES)};

export const CATALOG_CATEGORIES: CatalogCategory[] = ${J(seed.CATALOG_CATEGORIES)};

export const CATALOG_ITEMS: CatalogItem[] = ${J(seed.CATALOG_ITEMS)};

export const CIS: ConfigItem[] = ${J(seed.CIS)};

export const ARTICLES: Article[] = ${J(seed.ARTICLES)};

export const SLAS: Sla[] = ${J(seed.SLAS)};
`);

writeFileSync(join(dataDir, "deviceVendorModels.ts"), `// Device onboarding catalog. Generated from the design prototype
// (device-vendor-models.jsx) via backend/scripts/gen_data_ts.mjs.
import type { OnboardDeviceType, MonitoringMethod, VendorModel, CredentialProfile } from "@/lib/types";

export const ONBOARD_DEVICE_TYPES: OnboardDeviceType[] = ${J(seed.ONBOARD_DEVICE_TYPES)};

export const SWITCH_ROLES: string[] = ${J(seed.SWITCH_ROLES)};

export const MONITORING_METHODS: MonitoringMethod[] = ${J(seed.MONITORING_METHODS)};

export const VENDOR_MODELS: Record<string, VendorModel[]> = ${J(seed.VENDOR_MODELS)};

export const CAP_LABELS: Record<string, string> = ${J(seed.CAP_LABELS)};

export const CREDENTIAL_PROFILES: CredentialProfile[] = ${J(seed.CREDENTIAL_PROFILES)};
`);

console.log("generated core.ts, infra.ts, itsm.ts, deviceVendorModels.ts");
