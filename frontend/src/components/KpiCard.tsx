// KPI card for node pages (Netdata style): last value, change over the
// selected range and a trend line, all from a metrics series.
import React from "react";
import type { MetricSeries, MetricsResponse } from "@/api/hooks";
import type { Tone } from "@/components/ld";
import { Sparkline } from "@/components/MetricCharts";

import { Icon } from "@/components/Icon";
export function seriesOf(m: MetricsResponse | undefined, key: string): MetricSeries | undefined {
  return m?.source === "prometheus" ? m.series.find((s) => s.key === key && s.points.length) : undefined;
}
export const lastOf = (s?: MetricSeries) => (s ? s.points[s.points.length - 1][1] : null);

/** Relative change from the first to the last sample in the range. */
function change(points: [number, number][]) {
  if (points.length < 2) return null;
  const a = points[0][1], b = points[points.length - 1][1];
  if (!a) return null;
  return ((b - a) / Math.abs(a)) * 100;
}

function Delta({ points, lowerIsBetter }: { points: [number, number][]; lowerIsBetter?: boolean }) {
  const c = change(points);
  if (c == null || !Number.isFinite(c)) return null;
  const up = c > 0;
  const tone = Math.abs(c) < 0.05 ? "muted" : lowerIsBetter === undefined ? "muted" : up === lowerIsBetter ? "crit" : "ok";
  return (
    <span className={`ld-delta ld-text-${tone}`} title="Change over the selected range">
      <Icon className={`fa-solid ${up ? "fa-arrow-up" : "fa-arrow-down"}`} /> {Math.abs(c).toFixed(1)}%
      <span className="sr-only"> {up ? "up" : "down"} over the selected range</span>
    </span>
  );
}

export function Kpi({ icon, tone, label, value, sub, points, color, lowerIsBetter, children }: {
  icon: string; tone: Tone; label: string; value?: string; sub?: React.ReactNode;
  points?: [number, number][]; color?: string; lowerIsBetter?: boolean; children?: React.ReactNode;
}) {
  return (
    <section className="ld-card ld-kpi" aria-label={label}>
      <div className="ld-kpi-top">
        <span className={`ld-tile ld-tile-sm ld-${tone}`} aria-hidden="true"><Icon className={`fa-solid ${icon}`} /></span>
        <span className="ld-kpi-label">{label}</span>
      </div>
      {children ?? (
        <>
          <div className="ld-kpi-value">
            <b>{value}</b>
            {points && <Delta points={points} lowerIsBetter={lowerIsBetter} />}
          </div>
          {sub && <div className="ld-kpi-sub">{sub}</div>}
          {points && <Sparkline points={points} color={color} label={label} />}
        </>
      )}
    </section>
  );
}

