// Telnet Monitoring — TCP/Telnet connectivity checks for network devices,
// servers and services, on the shared CheckMonitorScreen layout.
// Sample data from data/monitoring.
import React from "react";
import { CheckMonitorScreen } from "@/components/CheckMonitor";
import type { CheckRow, CheckStatus } from "@/components/CheckMonitor";
import { TELNET_CHECKS } from "@/data/monitoring";

const STATUS: Record<string, CheckStatus> = { Up: "up", Down: "down", Unknown: "warn" };

const ROWS: CheckRow[] = TELNET_CHECKS.map((c) => ({
  id: `${c.host}:${c.port}`,
  name: c.host,
  target: String(c.port),
  kind: c.service,
  site: c.site,
  status: STATUS[c.status],
  responseMs: c.responseMs,
  lastCheck: c.lastCheck,
  uptime: c.uptime,
}));

const SITES = [...new Set(TELNET_CHECKS.map((c) => c.site))].sort();

export default function TelnetMonitoringScreen() {
  return (
    <CheckMonitorScreen
      title="Telnet Monitoring"
      subtitle="Monitor TCP/Telnet connectivity for network devices, servers and services"
      icon="fa-terminal"
      noun={{ one: "Check", many: "Checks" }}
      statusLabel={{ up: "Up", down: "Down", warn: "Unknown", pending: "Pending" }}
      eventMessage={{ up: "Telnet OK", down: "Connection refused", warn: "Timeout", pending: "Waiting for first check" }}
      columns={{ target: "Port", kind: "Service" }}
      rows={ROWS}
      formFields={[
        { id: "host", label: "Hostname / IP", type: "text", placeholder: "e.g. 10.10.1.21", required: true },
        { id: "port", label: "Port", type: "number", defaultValue: "23", required: true },
        { id: "service", label: "Service name", type: "text", defaultValue: "Telnet" },
        { id: "site", label: "Site / location", type: "select", options: SITES, defaultValue: SITES[0] },
        { id: "interval", label: "Check interval", type: "select", options: ["1 minute", "5 minutes", "15 minutes"], defaultValue: "5 minutes" },
        { id: "timeout", label: "Timeout (seconds)", type: "number", defaultValue: "10", required: true },
      ]}
      toRow={(v) => ({
        id: `new-${Date.now()}`,
        name: v.host,
        target: v.port,
        kind: v.service || "Telnet",
        site: v.site,
        status: "pending",
        responseMs: null,
        lastCheck: "—",
        uptime: null,
      })}
    />
  );
}
