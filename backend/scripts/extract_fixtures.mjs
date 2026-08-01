// Extract the prototype's seed datasets into backend/fixtures/seed.json.
// Transpiles the design bundle's data files (JSX → JS) with esbuild, evaluates
// them against a stub window/React, and dumps the globals the backend seeds.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..", "..");
const require = createRequire(join(repo, "frontend", "package.json"));
const esbuild = require("esbuild");

const SRC = join(repo, "project", "uploads", "santhira (14)");
const files = ["data.jsx", "data-infra.jsx", "data-itsm.jsx", "device-vendor-models.jsx"];

const window = {};
const React = {
  createElement: () => null,
  Fragment: Symbol("Fragment"),
};
const sandbox = { window, React, Math, Object, Array, JSON };

for (const f of files) {
  const src = readFileSync(join(SRC, f), "utf8");
  const { code } = esbuild.transformSync(src, { loader: "jsx", format: "iife" });
  // eslint-disable-next-line no-new-func
  new Function(...Object.keys(sandbox), code)(...Object.values(sandbox));
}

const keys = [
  "ORG", "TENANTS", "USERS", "INCIDENTS", "SERVICES", "INTEGRATIONS",
  "SITES", "DEVICE_KINDS", "DEVICE_COUNTS", "DEVICES", "NET_LINKS", "VMS",
  "INFRA_ALERTS", "EXPORTERS",
  "PROBLEMS", "CHANGES", "CATALOG_CATEGORIES", "CATALOG_ITEMS", "CIS",
  "ARTICLES", "SLAS",
  "ONBOARD_DEVICE_TYPES", "SWITCH_ROLES", "MONITORING_METHODS", "VENDOR_MODELS", "CAP_LABELS", "CREDENTIAL_PROFILES",
];
const out = {};
for (const k of keys) {
  if (window[k] !== undefined) out[k] = window[k];
}
mkdirSync(join(here, "..", "fixtures"), { recursive: true });
const dest = join(here, "..", "fixtures", "seed.json");
writeFileSync(dest, JSON.stringify(out, null, 1));
console.log(
  "wrote", dest, "with keys:",
  Object.keys(out).map((k) => `${k}(${Array.isArray(out[k]) ? out[k].length : "obj"})`).join(", "),
);
