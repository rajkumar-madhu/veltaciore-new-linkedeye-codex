// LinkedEye-style Domain Status heatmap: one tile per monitored host, colored
// by live health status, sorted worst-first, with a count legend. Shared by the
// Operations Dashboard and the Live Topology / Domain Status screen.
import React from "react";
import { STATUS_COLORS, normalizeStatus, getHealthColor, type NormalizedStatus } from "@/lib/statusColors";
import type { Device } from "@/lib/types";

import { Icon } from "@/components/Icon";
import { ServerIcon } from "lucide-react";
export function DomainHeatmap({
  devices,
  title = "Domain Status · Fleet Health",
  bare = false,
}: {
  devices: Device[];
  title?: string;
  /** bare: render just the grid + legend (no section chrome), for embedding on dark pages. */
  bare?: boolean;
}) {
  const rank: Record<NormalizedStatus, number> = { crit: 0, warn: 1, unknown: 2, ok: 3 };
  const sorted = [...devices].sort((a, b) => rank[normalizeStatus(a.status)] - rank[normalizeStatus(b.status)]);
  const counts: Record<NormalizedStatus, number> = { ok: 0, warn: 0, crit: 0, unknown: 0 };
  devices.forEach((d) => (counts[normalizeStatus(d.status)] += 1));
  const legend: NormalizedStatus[] = ["ok", "warn", "crit", "unknown"];

  const body = (
    <div style={{ background: bare ? "transparent" : "#0b1220", padding: bare ? 0 : 16 }}>
      {devices.length === 0 ? (
        <div style={{ color: "#64748b", fontSize: 12.5, textAlign: "center", padding: "22px 0" }}>
          <Icon icon={ServerIcon} style={{ fontSize: 20, opacity: 0.5, display: "block", marginBottom: 8 }} />
          No monitored hosts yet.
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(15px, 1fr))", gap: 3 }}>
            {sorted.map((d) => {
              const c = getHealthColor(d.status);
              const n = normalizeStatus(d.status);
              return (
                <div
                  key={d.id}
                  title={`${d.id} · ${d.model ?? d.kind} · ${c.label}`}
                  style={{
                    aspectRatio: "1", borderRadius: 2, background: c.line, cursor: "pointer",
                    boxShadow: n === "crit" ? `0 0 0 1px ${c.line}, 0 0 6px ${c.line}` : "none",
                    opacity: n === "ok" ? 0.85 : 1,
                  }}
                />
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 18, marginTop: 14, flexWrap: "wrap" }}>
            {legend.map((s) => (
              <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, color: "#cbd5e1" }}>
                <span style={{ width: 11, height: 11, borderRadius: 2, background: STATUS_COLORS[s].line }} />
                {STATUS_COLORS[s].label} <b style={{ color: "#fff", fontVariantNumeric: "tabular-nums" }}>{counts[s]}</b>
              </span>
            ))}
            <span style={{ marginLeft: "auto", fontSize: 11.5, color: "#64748b" }}>
              hover a tile for host detail · SNMP + node-exporter
            </span>
          </div>
        </>
      )}
    </div>
  );

  if (bare) return body;

  return (
    <div className="sn-form-section" style={{ overflow: "hidden" }}>
      <div className="sn-section-header">
        <span className="sn-section-title">{title}</span>
        <span className="sn-section-badge">{devices.length} hosts</span>
      </div>
      {body}
    </div>
  );
}
