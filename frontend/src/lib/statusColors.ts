// Centralized infra status + threshold color logic.
// Ported from status-colors.jsx.
import type React from "react";

export interface StatusColor {
  fg: string;
  bg: string;
  border: string;
  line: string;
  label: string;
}

export type NormalizedStatus = "ok" | "warn" | "crit" | "unknown";

export const STATUS_COLORS: Record<NormalizedStatus, StatusColor> = {
  ok:      { fg: "#047857", bg: "#d1fae5", border: "#6ee7b7", line: "#10b981", label: "Up" },       // emerald
  warn:    { fg: "#b45309", bg: "#fef3c7", border: "#fcd34d", line: "#f59e0b", label: "Warning" },  // amber
  crit:    { fg: "#b91c1c", bg: "#fee2e2", border: "#fca5a5", line: "#ef4444", label: "Critical" }, // red
  unknown: { fg: "#475569", bg: "#f1f5f9", border: "#cbd5e1", line: "#94a3b8", label: "Unknown" },  // slate
};

// Normalize any raw device/link status string → ok | warn | crit | unknown
export function normalizeStatus(s: unknown): NormalizedStatus {
  const v = String(s || "").toLowerCase();
  if (["ok", "up", "healthy", "online"].includes(v)) return "ok";
  if (["warn", "warning", "degraded"].includes(v)) return "warn";
  if (["critical", "crit", "down", "failed", "unreachable", "error"].includes(v)) return "crit";
  return "unknown";
}

export function getHealthColor(status: unknown): StatusColor {
  return STATUS_COLORS[normalizeStatus(status)];
}

// value vs thresholds → color set. e.g. CPU: getMetricColor(v, 70, 85)
export function getMetricColor(
  value: number | null | undefined,
  warningThreshold: number,
  criticalThreshold: number,
): StatusColor {
  if (value == null || isNaN(value)) return STATUS_COLORS.unknown;
  if (value > criticalThreshold) return STATUS_COLORS.crit;
  if (value > warningThreshold) return STATUS_COLORS.warn;
  return STATUS_COLORS.ok;
}

// Standard thresholds
export const THRESHOLDS: Record<string, [number, number]> = {
  cpu:  [70, 85],
  mem:  [75, 90],
  disk: [75, 90],
  util: [70, 85],   // interface utilization
};

export function getCpuColor(v: number | null | undefined): StatusColor  { return getMetricColor(v, ...THRESHOLDS.cpu); }
export function getMemColor(v: number | null | undefined): StatusColor  { return getMetricColor(v, ...THRESHOLDS.mem); }
export function getDiskColor(v: number | null | undefined): StatusColor { return getMetricColor(v, ...THRESHOLDS.disk); }
export function getUtilColor(v: number | null | undefined): StatusColor { return getMetricColor(v, ...THRESHOLDS.util); }

// Error rate %: 0 green · >0–2 amber · >2 red
export function getErrorRateColor(pct: number | null | undefined): StatusColor {
  if (pct == null || isNaN(pct)) return STATUS_COLORS.unknown;
  if (pct > 2) return STATUS_COLORS.crit;
  if (pct > 0) return STATUS_COLORS.warn;
  return STATUS_COLORS.ok;
}

// Packet loss %: 0–1 green · >1–5 amber · >5 red
export function getPacketLossColor(pct: number | null | undefined): StatusColor {
  if (pct == null || isNaN(pct)) return STATUS_COLORS.unknown;
  if (pct > 5) return STATUS_COLORS.crit;
  if (pct > 1) return STATUS_COLORS.warn;
  return STATUS_COLORS.ok;
}

// Interface: oper status dominates, then error rate, then utilization
export function getInterfaceColor(
  operStatus: unknown,
  utilization: number | null | undefined,
  errorRate: number | null | undefined,
): StatusColor {
  if (normalizeStatus(operStatus) !== "ok")
    return normalizeStatus(operStatus) === "unknown" ? STATUS_COLORS.unknown : STATUS_COLORS.crit;
  const err = getErrorRateColor(errorRate);
  if (err !== STATUS_COLORS.ok) return err;
  return getUtilColor(utilization);
}

// Link: down/critical → red; else worst of error-rate / utilization
export function getLinkColor(
  linkStatus: unknown,
  utilization: number | null | undefined,
  errorRate: number | null | undefined,
): StatusColor {
  const s = normalizeStatus(linkStatus);
  if (s === "crit") return STATUS_COLORS.crit;
  if (s === "unknown") return STATUS_COLORS.unknown;
  const err = getErrorRateColor(errorRate), util = getUtilColor(utilization);
  if (err === STATUS_COLORS.crit || util === STATUS_COLORS.crit) return STATUS_COLORS.crit;
  if (err === STATUS_COLORS.warn || util === STATUS_COLORS.warn || s === "warn") return STATUS_COLORS.warn;
  return STATUS_COLORS.ok;
}

// Existing pill classes in styles.css mapped to normalized status
export function getStatusBadgeClass(status: unknown): string {
  return { ok: "svc-healthy", warn: "state-mitigating", crit: "state-active", unknown: "state-neutral" }[normalizeStatus(status)];
}

export function getStatusLabel(status: unknown): string {
  const s = String(status || "").toLowerCase();
  if (s === "down") return "Down";
  if (s === "critical") return "Critical";
  return getHealthColor(status).label;
}

// Inline badge style (for places without a pill class)
export function statusBadgeStyle(status: unknown): React.CSSProperties {
  const c = getHealthColor(status);
  return { background: c.bg, color: c.fg, border: `1px solid ${c.border}`, borderRadius: 10, padding: "1px 8px", fontSize: 10.5, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5 };
}
