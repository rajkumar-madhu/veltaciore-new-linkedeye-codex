// LinkedEye-style Heat-Map: monitored domains × category (Hardwares / Soft
// limits / Applications) health matrix, with a PROD/UAT toggle, an
// expanded (C/W/O/U counts) vs compact (single status cell) view, and a
// PROD-ENV donut summary. Recreated from the Finspot LinkedEye dashboard.
import React from "react";
import { Icon } from "@/components/Icon";
import { ClockIcon, MoveHorizontalIcon, NetworkIcon, RefreshCwIcon } from "lucide-react";
import {
  HEATMAP_PROD, HEATMAP_UAT, CATEGORIES, catTotals,
  type HeatDomain, type CatKey, type CatCounts,
} from "@/data/heatmap";

const RED = "#e0321c", AMBER = "#f2a01e", GREEN = "#159a38", GRAY = "#5b5b5b", WHITE = "#f5f5f5";

/** Worst status of a category → the compact cell colour. */
function worst(cc: CatCounts, pending?: boolean): string {
  if (pending) return WHITE;
  if (cc.c > 0) return RED;
  if (cc.w > 0) return AMBER;
  if (cc.o > 0) return GREEN;
  return GRAY;
}
const anyCrit = (d: HeatDomain) => d.hw.c + d.sl.c + d.app.c > 0;

function Donut({ title, counts }: { title: string; counts: { label: string; value: number; color: string }[] }) {
  const total = counts.reduce((a, c) => a + c.value, 0) || 1;
  const R = 52, C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div style={{ flex: 1, minWidth: 180 }}>
      <div style={{ color: AMBER, fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{title}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <svg viewBox="0 0 140 140" width={112} height={112} style={{ transform: "rotate(-90deg)" }}>
          <circle cx="70" cy="70" r={R} fill="none" stroke="#2a2a2a" strokeWidth="16" />
          {counts.filter((c) => c.value > 0).map((c, i) => {
            const frac = c.value / total;
            const dash = `${frac * C} ${C}`;
            const el = <circle key={i} cx="70" cy="70" r={R} fill="none" stroke={c.color} strokeWidth="16" strokeDasharray={dash} strokeDashoffset={-acc * C} />;
            acc += frac;
            return el;
          })}
        </svg>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12.5 }}>
          {counts.map((c) => (
            <span key={c.label} style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "#d0d0d0" }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: c.color }} />
              {c.label}(<b style={{ color: "#fff", fontVariantNumeric: "tabular-nums" }}>{c.value}</b>)
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function HeatMap() {
  const [env, setEnv] = React.useState<"PROD" | "UAT">("PROD");
  const [expanded, setExpanded] = React.useState(true);
  const rows = env === "PROD" ? HEATMAP_PROD : HEATMAP_UAT;

  const cellNum = (v: number, color: string) => (
    <td style={{ background: color, textAlign: "center", color: "#111", fontWeight: 700, fontSize: 12.5, borderRight: "1px solid #0d0d0d", fontVariantNumeric: "tabular-nums", padding: "9px 4px" }}>{v}</td>
  );

  return (
    <div style={{ background: "#161616", border: "1px solid #2b2b2b", borderRadius: 8, overflow: "hidden" }}>
      {/* header bar */}
      <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #2b2b2b" }}>
        <span style={{ color: "#f0f0f0", fontWeight: 700, fontSize: 15 }}>Heat-Map</span>
        <div style={{ margin: "0 auto", display: "inline-flex", border: `1px solid ${AMBER}`, borderRadius: 4, overflow: "hidden", fontSize: 12.5, fontWeight: 700 }}>
          {(["PROD", "UAT"] as const).map((e) => (
            <button key={e} onClick={() => setEnv(e)} style={{ padding: "4px 14px", border: "none", cursor: "pointer", background: env === e ? AMBER : "transparent", color: env === e ? "#111" : "#cfcfcf" }}>{e}</button>
          ))}
        </div>
        <div style={{ display: "inline-flex", gap: 10, color: "#9a9a9a" }}>
          <Icon icon={MoveHorizontalIcon} title="Prev / next" style={{ cursor: "pointer" }} />
          <Icon icon={RefreshCwIcon} title="Refresh" style={{ cursor: "pointer" }} />
          <Icon className={`fa-solid ${expanded ? "fa-compress" : "fa-expand"}`} title={expanded ? "Compact" : "Expand"} style={{ cursor: "pointer" }} onClick={() => setExpanded((x) => !x)} />
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", color: "#e6e6e6" }}>
          <thead>
            {expanded ? (
              <>
                <tr style={{ background: "#1e1e1e" }}>
                  <th rowSpan={2} style={{ textAlign: "left", padding: "10px 16px", fontSize: 12.5, letterSpacing: ".04em", borderRight: "1px solid #0d0d0d" }}>DOMAINNAME</th>
                  {CATEGORIES.map((c) => (
                    <th key={c.key} colSpan={4} style={{ padding: "8px 4px", fontSize: 13, fontWeight: 700, borderRight: "1px solid #0d0d0d", borderBottom: "1px solid #0d0d0d" }}>{c.label}</th>
                  ))}
                  <th rowSpan={2} style={{ padding: "8px 10px", fontSize: 12.5, minWidth: 92 }}><Icon icon={ClockIcon} /> Time</th>
                </tr>
                <tr style={{ background: "#1e1e1e" }}>
                  {CATEGORIES.flatMap((c) =>
                    (["C", "W", "O", "U"] as const).map((k) => (
                      <th key={c.key + k} style={{ padding: "5px 4px", borderRight: "1px solid #0d0d0d", borderBottom: "1px solid #0d0d0d" }}>
                        <span style={{ display: "inline-grid", placeItems: "center", width: 18, height: 18, background: "#000", color: "#e6e6e6", borderRadius: 3, fontSize: 10.5, fontWeight: 700 }}>{k}</span>
                      </th>
                    )),
                  )}
                </tr>
              </>
            ) : (
              <tr style={{ background: "#1e1e1e" }}>
                <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 12.5, borderRight: "1px solid #0d0d0d" }}>DOMAINNAME</th>
                {CATEGORIES.map((c) => (
                  <th key={c.key} style={{ padding: "8px 4px", borderRight: "1px solid #0d0d0d" }}>
                    <span style={{ display: "inline-grid", placeItems: "center", width: 18, height: 18, background: "#000", borderRadius: 3, fontSize: 10.5, fontWeight: 700 }}>{c.short}</span>
                  </th>
                ))}
                <th style={{ padding: "8px 10px" }}><Icon icon={NetworkIcon} /></th>
                <th style={{ padding: "8px 10px", minWidth: 92 }}><Icon icon={ClockIcon} /></th>
              </tr>
            )}
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.domain} style={{ borderBottom: "1px solid #0d0d0d" }}>
                <td style={{ padding: "9px 16px", color: d.pending ? "#cfcfcf" : anyCrit(d) ? "#ff5a4d" : "#46c25e", fontSize: 13, borderRight: "1px solid #0d0d0d", whiteSpace: "nowrap" }}>{d.domain}</td>
                {expanded ? (
                  (["hw", "sl", "app"] as CatKey[]).flatMap((key) => {
                    const cc = d[key];
                    return d.pending
                      ? (["c", "w", "o", "u"] as const).map((k) => <td key={key + k} style={{ background: WHITE, borderRight: "1px solid #0d0d0d" }} />)
                      : [cellNum(cc.c, RED), cellNum(cc.w, AMBER), cellNum(cc.o, GREEN), cellNum(cc.u, GRAY)].map((el, i) =>
                          React.cloneElement(el, { key: key + i }),
                        );
                  })
                ) : (
                  (["hw", "sl", "app"] as CatKey[]).map((key) => (
                    <td key={key} style={{ background: worst(d[key], d.pending), borderRight: "1px solid #0d0d0d", minWidth: 90 }} />
                  ))
                )}
                {!expanded && (
                  <td style={{ textAlign: "center", background: d.pending ? RED : "transparent" }}>
                    <Icon icon={RefreshCwIcon} style={{ color: d.pending ? "#fff" : "#2ecc71" }} />
                  </td>
                )}
                <td style={{ padding: "9px 10px", textAlign: "center", fontSize: 12, color: "#cfcfcf", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                  {expanded && <Icon icon={RefreshCwIcon} style={{ color: "#2ecc71", marginRight: 8 }} />}
                  {d.time || "- : - : -"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PROD/UAT ENV donut summary */}
      <div style={{ borderTop: "1px solid #2b2b2b", padding: "16px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
          <span style={{ color: "#e6e6e6", fontWeight: 700, fontSize: 13.5 }}>{env} ENV</span>
          <span style={{ color: "#8a8a8a", fontSize: 12 }}>Last Update:- [ {rows.find((r) => r.time)?.time ?? "--:--:--"} ]</span>
        </div>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          {CATEGORIES.map((c) => {
            const t = catTotals(rows, c.key);
            return (
              <Donut key={c.key} title={c.label} counts={[
                { label: "Critical", value: t.c, color: RED },
                { label: "OK", value: t.o, color: GREEN },
                { label: "WARNING", value: t.w, color: AMBER },
                { label: "UNKNOWN", value: t.u, color: GRAY },
              ].filter((x) => x.value > 0)} />
            );
          })}
        </div>
      </div>
    </div>
  );
}
