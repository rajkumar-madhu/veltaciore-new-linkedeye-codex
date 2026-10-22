// Global UI state: acting tenant, tenant-switcher modal, cross-screen params,
// and theme tweaks (replaces the prototype's useTweaks + window.__ globals).
import { create } from "zustand";
import { TENANTS } from "@/data/core";
import type { Tenant } from "@/lib/types";

export interface Tweaks {
  accent: string;
  dark: boolean;
  sidebarStyle: "navy" | "light";
  density: "compact" | "regular" | "comfy";
  fontSize: number;
  showSparklines: boolean;
  incidentLayout: "war-room" | "classic";
}

export const TWEAK_DEFAULTS: Tweaks = {
  accent: "#2563eb",
  dark: false,
  sidebarStyle: "navy",
  density: "regular",
  fontSize: 13,
  showSparklines: true,
  incidentLayout: "war-room",
};

interface UiState {
  tenant: Tenant;
  setTenant: (t: Tenant) => void;
  switcherOpen: boolean;
  setSwitcher: (open: boolean) => void;
  /** Cross-screen navigation params (selected device, integration, app…). */
  params: Record<string, unknown>;
  setParams: (params: Record<string, unknown>) => void;
  /** Global search query submitted from the header search box. */
  search: string;
  setSearch: (q: string) => void;
  /** Sidebar: auto (full on wide screens, icon rail on narrow), collapsed rail, or expanded overlay. */
  nav: "auto" | "collapsed" | "expanded";
  setNav: (nav: "auto" | "collapsed" | "expanded") => void;
  tweaks: Tweaks;
  setTweak: <K extends keyof Tweaks>(key: K, value: Tweaks[K]) => void;
}

/** Shown as the acting "tenant" when a clean deployment has none provisioned. */
export const NO_TENANT: Tenant = {
  id: "", name: "No business unit", parent: "", code: "—", color: "slate",
  users: 0, incidents: 0, sev1: 0, health: 0, mttr: 0, spend: 0, plan: "—",
};

export const useUiStore = create<UiState>((set) => ({
  tenant: TENANTS[0],
  setTenant: (tenant) => set({ tenant }),
  switcherOpen: false,
  setSwitcher: (switcherOpen) => set({ switcherOpen }),
  params: {},
  setParams: (params) => set((s) => ({ params: { ...s.params, ...params } })),
  search: "",
  setSearch: (search) => set({ search }),
  nav: "auto",
  setNav: (nav) => set({ nav }),
  tweaks: TWEAK_DEFAULTS,
  setTweak: (key, value) => set((s) => ({ tweaks: { ...s.tweaks, [key]: value } })),
}));
