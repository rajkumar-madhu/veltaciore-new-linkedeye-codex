// KPI card for node pages (Netdata style): last value, change over the
// selected range and a trend line, all from a metrics series.
import React from "react";
import type { MetricSeries, MetricsResponse } from "@/api/hooks";
import type { Tone } from "@/components/ld";
import { Sparkline } from "@/components/MetricCharts";
import { Card, Tile, cx } from "@/components/ui";

import { Icon } from "@/components/Icon";

/** Shared pieces of the node / device detail pages (entity header, KPI row). */
export const node = {
  /** page title row with the entity on the left  */
  head: "flex flex-wrap items-start justify-between gap-3",
  entity: "flex items-center gap-3.5 min-w-0",
  title: "flex items-center gap-2.5 flex-wrap text-5xl font-bold tracking-[-0.02em] text-fg",
  /** "a | b | c" meta line under the title */
  meta: "flex flex-wrap gap-x-3.5 gap-y-1 mt-1 text-base text-fg-muted [&_span+span]:before:content-['|'] [&_span+span]:before:mr-3.5 [&_span+span]:before:text-line-strong",
  /** big icon tile in the header of network / storage / power devices */
  deviceTile: "flex-none w-14 h-14 rounded-[12px] grid place-items-center text-4xl bg-info-bg text-accent",
  kpis: "grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3",
  /** value row of a KPI card (bold number + delta) */
  kpiValue: "flex items-baseline flex-wrap gap-2 [&>b]:text-3xl [&>b]:font-bold [&>b]:tracking-[-0.02em] [&>b]:text-fg [&>b]:leading-[1.25]",
  kpiSub: "flex gap-2.5 text-xs text-fg-muted",
  /** dashed "Sample data" note inside a panel */
  sample: "flex items-start gap-2 py-2 px-2.5 border border-dashed border-line-strong rounded bg-bg-muted text-xs text-fg-muted [&_.ld-icon]:mt-0.5 [&_.ld-icon]:text-warning",
} as const;

const DELTA_TONE = { crit: "text-tone-crit", ok: "text-tone-ok", muted: "text-fg-muted" } as const;
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
    <span className={cx("text-sm font-bold whitespace-nowrap", DELTA_TONE[tone])} title="Change over the selected range">
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
    <Card as="section" className="flex flex-col gap-0.5 pt-3 px-3.5 pb-2 min-w-0 [&>svg]:mt-1.5 [&>svg]:h-[30px]" aria-label={label}>
      <div className="flex items-center gap-2">
        <Tile tone={tone} size="sm"><Icon className={`fa-solid ${icon}`} /></Tile>
        <span className="text-sm text-fg-muted font-semibold">{label}</span>
      </div>
      {children ?? (
        <>
          <div className={node.kpiValue}>
            <b>{value}</b>
            {points && <Delta points={points} lowerIsBetter={lowerIsBetter} />}
          </div>
          {sub && <div className={node.kpiSub}>{sub}</div>}
          {points && <Sparkline points={points} color={color} label={label} />}
        </>
      )}
    </Card>
  );
}

