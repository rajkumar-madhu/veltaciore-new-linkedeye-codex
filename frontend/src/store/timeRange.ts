// UI state for metric charts: the selected time range. Shared across device
// pages so a range picked on one device carries over to the next.
// Server data (the series themselves) stays in TanStack Query.
import { create } from "zustand";

export type RangePreset = "15m" | "1h" | "6h" | "24h" | "7d" | "30d" | "custom";

export const PRESETS: { id: Exclude<RangePreset, "custom">; label: string; seconds: number }[] = [
  { id: "15m", label: "Last 15 minutes", seconds: 15 * 60 },
  { id: "1h", label: "Last 1 hour", seconds: 3600 },
  { id: "6h", label: "Last 6 hours", seconds: 6 * 3600 },
  { id: "24h", label: "Last 24 hours", seconds: 24 * 3600 },
  { id: "7d", label: "Last 7 days", seconds: 7 * 86400 },
  { id: "30d", label: "Last 30 days", seconds: 30 * 86400 },
];

export const MAX_RANGE_DAYS = 90;

interface TimeRangeState {
  preset: RangePreset;
  /** Custom range bounds (ms since epoch); used only when preset === "custom". */
  from: number | null;
  to: number | null;
  setPreset: (p: Exclude<RangePreset, "custom">) => void;
  setCustom: (from: number, to: number) => void;
}

export const useTimeRange = create<TimeRangeState>((set) => ({
  preset: "1h",
  from: null,
  to: null,
  setPreset: (preset) => set({ preset, from: null, to: null }),
  setCustom: (from, to) => set({ preset: "custom", from, to }),
}));

/** Resolve the current range to concrete bounds (relative presets end now). */
export function resolveRange(s: Pick<TimeRangeState, "preset" | "from" | "to">, now = Date.now()) {
  if (s.preset === "custom" && s.from != null && s.to != null) return { from: s.from, to: s.to, live: false };
  const p = PRESETS.find((x) => x.id === s.preset) ?? PRESETS[1];
  return { from: now - p.seconds * 1000, to: now, live: true };
}
