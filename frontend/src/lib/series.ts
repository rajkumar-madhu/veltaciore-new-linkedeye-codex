// Deterministic pseudo-series generator shared by the chart screens. Each
// screen varies only the sine/cosine frequencies (and whether to floor at 0),
// so those are options rather than three near-identical copies.
import { TIME_LABELS } from "@/components/deviceDetail";

export function wave(
  seed: number,
  base: number,
  amp: number,
  { n = TIME_LABELS.length, f1 = 0.8, f2 = 1.9, cosAmp = 0.4, floor = false }: { n?: number; f1?: number; f2?: number; cosAmp?: number; floor?: boolean } = {},
): number[] {
  return Array.from({ length: n }, (_, i) => {
    const v = base + amp * Math.sin(i * f1 + seed) + amp * cosAmp * Math.cos(i * f2 + seed);
    return Math.round((floor ? Math.max(0, v) : v) * 10) / 10;
  });
}
