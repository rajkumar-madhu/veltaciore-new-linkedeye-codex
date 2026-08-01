// Shared status pill — one renderer for the ok/warn/crit/muted badges that were
// previously re-declared in every observability screen. Each screen maps its own
// domain (0/1/2/3, up/degraded/down, ok/warn/alert/nodata) to a tone + label + icon.
import React from "react";

export type PillTone = "ok" | "warn" | "crit" | "muted";

const TONE: Record<PillTone, { c: string; bg: string }> = {
  ok:    { c: "#059669", bg: "#ecfdf5" },
  warn:  { c: "#b45309", bg: "#fffbeb" },
  crit:  { c: "#dc2626", bg: "#fef2f2" },
  muted: { c: "#6b7280", bg: "#f3f4f6" },
};

export function StatusPill({ tone, label, icon }: { tone: PillTone; label: string; icon: string }) {
  const t = TONE[tone];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: t.c, background: t.bg, padding: "2px 9px", borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
      <i className={`fa-solid ${icon}`} /> {label}
    </span>
  );
}
