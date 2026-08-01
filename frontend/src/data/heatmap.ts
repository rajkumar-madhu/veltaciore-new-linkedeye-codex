// LinkedEye-style Heat-Map dataset: monitored domains × category health.
// Each category (Hardwares / Soft limits / Applications) carries C/W/O/U counts
// (Critical / Warning / OK / Unknown). Donut totals are the column sums.
export interface CatCounts { c: number; w: number; o: number; u: number }
export interface HeatDomain {
  domain: string;
  hw: CatCounts;
  sl: CatCounts;
  app: CatCounts;
  time: string;      // last refresh (HH:MM:SS) or "" when never polled
  pending?: boolean; // no data yet (renders white cells)
}

const Z: CatCounts = { c: 0, w: 0, o: 0, u: 0 };

// PROD environment — matches the Finspot LinkedEye UAT board.
export const HEATMAP_PROD: HeatDomain[] = [
  { domain: "fs-dr-le", hw: { ...Z }, sl: { ...Z }, app: { ...Z }, time: "", pending: true },
  { domain: "lemonn-prod-le",          hw: { c: 0, w: 0, o: 252, u: 0 }, sl: { c: 1, w: 3, o: 165, u: 0 }, app: { c: 0, w: 0, o: 61, u: 0 }, time: "08:54:33" },
  { domain: "smifs-mum-le",            hw: { c: 0, w: 0, o: 125, u: 0 }, sl: { c: 0, w: 0, o: 119, u: 0 }, app: { c: 0, w: 0, o: 60, u: 0 }, time: "08:54:33" },
  { domain: "indmoney-ifsc-le",        hw: { c: 0, w: 0, o: 69, u: 0 },  sl: { c: 1, w: 0, o: 35, u: 0 },  app: { c: 0, w: 0, o: 59, u: 0 }, time: "08:54:33" },
  { domain: "fs-dx-le",                hw: { c: 1, w: 0, o: 179, u: 0 }, sl: { c: 1, w: 2, o: 109, u: 0 }, app: { c: 0, w: 0, o: 75, u: 0 }, time: "08:54:42" },
  { domain: "fs-ifsc-le",              hw: { c: 5, w: 0, o: 162, u: 0 }, sl: { c: 4, w: 0, o: 136, u: 0 }, app: { c: 0, w: 2, o: 56, u: 0 }, time: "08:54:33" },
  { domain: "fs-le-isv",               hw: { c: 0, w: 0, o: 288, u: 0 }, sl: { c: 7, w: 3, o: 454, u: 0 }, app: { c: 0, w: 0, o: 61, u: 0 }, time: "08:54:52" },
  { domain: "ftc-mum-finspot-le",      hw: { c: 0, w: 0, o: 363, u: 0 }, sl: { c: 11, w: 21, o: 332, u: 0 }, app: { c: 0, w: 0, o: 61, u: 0 }, time: "08:54:33" },
  { domain: "neo-prod-le",             hw: { c: 1, w: 0, o: 141, u: 0 }, sl: { c: 2, w: 0, o: 61, u: 0 },  app: { c: 0, w: 0, o: 61, u: 0 }, time: "08:54:33" },
  { domain: "fs-blr-indmoney-dr-le",   hw: { c: 0, w: 0, o: 114, u: 0 }, sl: { c: 0, w: 0, o: 42, u: 0 },  app: { c: 0, w: 0, o: 56, u: 0 }, time: "08:54:33" },
  { domain: "fs-mum-indmoney-prod-le", hw: { c: 0, w: 0, o: 448, u: 0 }, sl: { c: 0, w: 0, o: 154, u: 0 }, app: { c: 0, w: 0, o: 56, u: 0 }, time: "08:54:33" },
  { domain: "pl-prod-le",              hw: { c: 0, w: 0, o: 199, u: 3 }, sl: { c: 1, w: 2, o: 141, u: 0 }, app: { c: 0, w: 0, o: 57, u: 0 }, time: "08:54:33" },
];

// UAT environment — a lighter footprint of the same estate.
export const HEATMAP_UAT: HeatDomain[] = [
  { domain: "fs-uat-le",         hw: { c: 0, w: 1, o: 84, u: 0 }, sl: { c: 0, w: 0, o: 52, u: 0 }, app: { c: 0, w: 0, o: 24, u: 0 }, time: "08:54:33" },
  { domain: "lemonn-uat-le",     hw: { c: 0, w: 0, o: 96, u: 0 }, sl: { c: 1, w: 1, o: 61, u: 0 }, app: { c: 0, w: 0, o: 22, u: 0 }, time: "08:54:33" },
  { domain: "indmoney-uat-le",   hw: { c: 1, w: 0, o: 71, u: 0 }, sl: { c: 0, w: 2, o: 44, u: 0 }, app: { c: 0, w: 1, o: 23, u: 0 }, time: "08:54:42" },
  { domain: "ftc-uat-finspot-le", hw: { c: 0, w: 0, o: 120, u: 0 }, sl: { c: 2, w: 4, o: 88, u: 0 }, app: { c: 0, w: 0, o: 25, u: 0 }, time: "08:54:33" },
  { domain: "neo-uat-le",        hw: { c: 0, w: 0, o: 58, u: 2 }, sl: { c: 0, w: 0, o: 31, u: 0 }, app: { c: 0, w: 0, o: 22, u: 0 }, time: "08:54:33" },
];

export type CatKey = "hw" | "sl" | "app";
export const CATEGORIES: { key: CatKey; label: string; short: string }[] = [
  { key: "hw", label: "Hardwares", short: "B" },
  { key: "sl", label: "Soft limits", short: "E" },
  { key: "app", label: "Applications", short: "A" },
];

/** Sum a category's C/W/O/U across all (non-pending) domains — feeds the donuts. */
export function catTotals(rows: HeatDomain[], key: CatKey): CatCounts {
  return rows.filter((r) => !r.pending).reduce<CatCounts>(
    (a, r) => ({ c: a.c + r[key].c, w: a.w + r[key].w, o: a.o + r[key].o, u: a.u + r[key].u }),
    { ...Z },
  );
}
