// URL Checker — website and API endpoint availability checks, on the shared
// CheckMonitorScreen layout. Sample data from data/monitoring.
import React from "react";
import { CheckMonitorScreen } from "@/components/CheckMonitor";
import type { CheckRow, CheckStatus } from "@/components/CheckMonitor";
import { URL_CHECKS } from "@/data/monitoring";

const STATUS: Record<string, CheckStatus> = { Online: "up", Down: "down", Degraded: "warn" };

const ROWS: CheckRow[] = URL_CHECKS.map((c) => ({
  id: c.url,
  name: c.name,
  target: c.url,
  kind: c.type,
  site: c.site,
  status: STATUS[c.status],
  responseMs: c.responseMs,
  lastCheck: c.lastCheck,
  uptime: c.uptime,
}));

const SITES = [...new Set(URL_CHECKS.map((c) => c.site))].sort();

export default function UrlCheckerScreen() {
  return (
    <CheckMonitorScreen
      title="URL Checker"
      subtitle="Monitor website and application endpoints for availability, response time and content"
      icon="fa-link"
      noun={{ one: "URL", many: "URLs" }}
      statusLabel={{ up: "Online", down: "Down", warn: "Degraded", pending: "Pending" }}
      eventMessage={{ up: "200 OK", down: "Connection refused", warn: "Slow response", pending: "Waiting for first check" }}
      columns={{ target: "URL", kind: "Type" }}
      rows={ROWS}
      formFields={[
        { id: "name", label: "Name", type: "text", placeholder: "e.g. NSE Web Portal", required: true },
        { id: "url", label: "URL", type: "text", placeholder: "https://example.com", required: true },
        { id: "type", label: "Check type", type: "select", options: ["Web", "API"], defaultValue: "Web" },
        { id: "site", label: "Site / location", type: "select", options: SITES, defaultValue: SITES[0] },
        { id: "interval", label: "Check interval", type: "select", options: ["1 minute", "5 minutes", "15 minutes"], defaultValue: "5 minutes" },
      ]}
      toRow={(v) => ({
        id: `new-${Date.now()}`,
        name: v.name,
        target: v.url,
        kind: v.type,
        site: v.site,
        status: "pending",
        responseMs: null,
        lastCheck: "—",
        uptime: null,
      })}
    />
  );
}
