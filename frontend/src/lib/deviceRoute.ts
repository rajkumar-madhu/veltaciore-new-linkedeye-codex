// The detail page each kind of device opens. One map for every screen that
// links to a device (asset inventory, monitoring overview, alerts, …).
export const SERVER_KINDS = ["hypervisor", "phys-srv", "linux-srv", "win-srv"];

const BY_KIND: Record<string, string> = {
  switch: "switch-detail",
  firewall: "firewall-detail",
  storage: "storage-detail",
  loadbal: "loadbal-detail",
  ups: "ups-detail",
};

/** Detail route for a device kind; the generic device monitoring page otherwise. */
export function deviceRoute(kind?: string): string {
  if (!kind) return "infra-device";
  if (SERVER_KINDS.includes(kind)) return "server-detail";
  return BY_KIND[kind] ?? "infra-device";
}
