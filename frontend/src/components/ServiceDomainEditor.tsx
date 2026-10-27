// Create / edit a business domain for the heatmap (/api/infra/service-domains/):
// a name and icon, the APM services it covers, whole device kinds, and
// individual devices. Shared domains are read-only unless the all-clients
// view is selected (the API enforces the same).
import React from "react";
import { useDeleteServiceDomain, useSaveServiceDomain } from "@/api/hooks";
import type { ServiceDomain, ServiceDomainInput } from "@/api/hooks";
import { apiErrorText } from "@/api/client";
import { NO_TENANT, useUiStore } from "@/store/ui";
import type { Device, Service } from "@/lib/types";
import { Empty } from "@/components/ld";
import { Button, Card, Input, SearchBox, Select, ui } from "@/components/ui";

import { Icon } from "@/components/Icon";
import { SearchIcon, Trash2Icon } from "lucide-react";
/** The global input:focus outline colour beats SearchBox's outline-none; keep the inner input unringed (the box shows the ring). */
const searchInputFix = "focus:outline-none";
const ICONS: [string, string][] = [
  ["fa-layer-group", "Layers"], ["fa-chart-line", "Trading / chart"], ["fa-cubes", "Applications"],
  ["fa-network-wired", "Network"], ["fa-server", "Servers"], ["fa-database", "Databases"],
  ["fa-hard-drive", "Storage"], ["fa-shield-halved", "Security"], ["fa-globe", "External services"],
  ["fa-building-columns", "Exchange / bank"], ["fa-tower-broadcast", "Monitoring"], ["fa-cloud", "Cloud"],
];
const DEVICE_LIST_LIMIT = 60;

/** Heatmap side panel, its h2 and the note right under it. */
const heatPanel = "p-4 flex flex-col gap-3";
const heatPanelTitle = "m-0 text-2xl";
const heatPanelNote = "-mt-2 text-fg-muted text-xs";
/** Error line and action row. */
const formError = "m-0 px-3 py-2 rounded bg-critical-bg text-critical text-sm";
const formActions = "flex flex-wrap gap-2 items-center";
/** Checkbox picker fieldsets: box, legend, list and option label. */
const pick = "border border-line rounded px-3 pt-2 pb-2.5 m-0 flex flex-col gap-2 min-w-0";
const pickLegend = "text-xs text-fg-muted px-1";
const pickList = "list-none m-0 p-0 grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-x-3 gap-y-1 max-h-[220px] overflow-auto";
const pickLabel = "flex items-center gap-1.5 text-sm text-fg cursor-pointer";

export function DomainEditor({ domain, services, devices, kindLabel, onDone }: {
  domain?: ServiceDomain;
  services: Service[];
  devices: Device[];
  kindLabel: Record<string, string>;
  onDone: (savedId?: number) => void;
}) {
  const save = useSaveServiceDomain();
  const del = useDeleteServiceDomain();
  const allClients = useUiStore((s) => s.tenant.id === NO_TENANT.id);
  const readOnly = !!domain?.shared && !allClients;
  const [f, setF] = React.useState<ServiceDomainInput>(() => ({
    name: domain?.name ?? "", description: domain?.description ?? "", icon: domain?.icon ?? "fa-layer-group",
    order: domain?.order ?? 100, services: domain?.services ?? [], devices: domain?.devices ?? [], device_kinds: domain?.device_kinds ?? [],
  }));
  const [devSearch, setDevSearch] = React.useState("");
  const uid = React.useId();
  const set = <K extends keyof ServiceDomainInput>(k: K, v: ServiceDomainInput[K]) => setF((x) => ({ ...x, [k]: v }));
  const toggle = (k: "services" | "devices" | "device_kinds", v: string) =>
    set(k, f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v]);

  const kinds = [...new Set([...devices.map((d) => d.kind), ...f.device_kinds])].sort((a, b) => (kindLabel[a] ?? a).localeCompare(kindLabel[b] ?? b));
  const q = devSearch.trim().toLowerCase();
  const byKind = new Set(f.device_kinds);
  const devMatches = devices.filter((d) => !byKind.has(d.kind) && (!q || d.id.toLowerCase().includes(q) || d.role.toLowerCase().includes(q)));
  const shown = [...devMatches.filter((d) => f.devices.includes(d.id)), ...devMatches.filter((d) => !f.devices.includes(d.id))].slice(0, DEVICE_LIST_LIMIT);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    // Devices already covered by a selected kind are dropped; the kind includes them.
    const body = { ...f, devices: f.devices.filter((id) => !byKind.has(devices.find((d) => d.id === id)?.kind ?? "")) };
    save.mutate({ id: domain?.id, body }, { onSuccess: (d) => onDone((d as ServiceDomain).id) });
  };

  return (
    <Card as="section" className={heatPanel} aria-labelledby={`${uid}-h`}>
      <h2 id={`${uid}-h`} className={heatPanelTitle}>{domain ? `Edit domain — ${domain.name}` : "Add domain"}</h2>
      <p className={heatPanelNote}>Group the services and devices that make up a business domain, such as Trading.</p>
      {readOnly && <p className={heatPanelNote}>Shared domain: visible to every client, editable from the all-clients view.</p>}
      <form className={ui.form} onSubmit={submit}>
        <fieldset className="border-0 p-0 m-0 flex flex-col gap-2.5 min-w-0" disabled={readOnly}>
          <label className={ui.field} htmlFor={`${uid}-name`}>
            Name *
            <Input id={`${uid}-name`} required maxLength={128} value={f.name} placeholder="Trading" onChange={(e) => set("name", e.target.value)} />
          </label>
          <label className={ui.field} htmlFor={`${uid}-desc`}>
            Description
            <Input id={`${uid}-desc`} maxLength={500} value={f.description} placeholder="Trading and order management systems" onChange={(e) => set("description", e.target.value)} />
          </label>
          <label className={ui.field} htmlFor={`${uid}-icon`}>
            Icon
            <Select id={`${uid}-icon`} value={f.icon} onChange={(e) => set("icon", e.target.value)}>
              {ICONS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
            </Select>
          </label>

          <fieldset className={pick}>
            <legend className={pickLegend}>Services ({f.services.length} selected)</legend>
            {services.length ? (
              <ul className={pickList}>
                {services.map((x) => (
                  <li key={x.name}><label className={pickLabel}><input type="checkbox" checked={f.services.includes(x.name)} onChange={() => toggle("services", x.name)} /> {x.name}</label></li>
                ))}
              </ul>
            ) : <Empty>No APM services yet.</Empty>}
          </fieldset>

          <fieldset className={pick}>
            <legend className={pickLegend}>Whole device kinds ({f.device_kinds.length} selected)</legend>
            {kinds.length ? (
              <ul className={pickList}>
                {kinds.map((k) => (
                  <li key={k}>
                    <label className={pickLabel}><input type="checkbox" checked={f.device_kinds.includes(k)} onChange={() => toggle("device_kinds", k)} /> {kindLabel[k] ?? k}{" "}
                      <span className="text-fg-muted text-xs">({devices.filter((d) => d.kind === k).length})</span></label>
                  </li>
                ))}
              </ul>
            ) : <Empty>No devices yet.</Empty>}
          </fieldset>

          <fieldset className={pick}>
            <legend className={pickLegend}>Individual devices ({f.devices.filter((id) => !byKind.has(devices.find((d) => d.id === id)?.kind ?? "")).length} selected)</legend>
            <label className="sr-only" htmlFor={`${uid}-dev-q`}>Search devices</label>
            <SearchBox inputClassName={searchInputFix} icon={<Icon icon={SearchIcon} />} id={`${uid}-dev-q`} value={devSearch} onChange={(e) => setDevSearch(e.target.value)} placeholder="Device id or role…" />
            {shown.length ? (
              <ul className={pickList}>
                {shown.map((d) => (
                  <li key={d.id}>
                    <label className={pickLabel}><input type="checkbox" checked={f.devices.includes(d.id)} onChange={() => toggle("devices", d.id)} />{" "}
                      <span className={ui.mono}>{d.id}</span> <span className="text-fg-muted text-xs">{kindLabel[d.kind] ?? d.kind}{d.role ? ` · ${d.role}` : ""}</span></label>
                  </li>
                ))}
              </ul>
            ) : <Empty>{q ? "No devices match." : "Every device is covered by a selected kind."}</Empty>}
            {devMatches.length > shown.length && <p className="text-fg-muted text-xs">Showing {shown.length} of {devMatches.length}; search to narrow.</p>}
          </fieldset>
        </fieldset>

        {(save.error || del.error) && <p className={formError} role="alert">{apiErrorText(save.error ?? del.error)}</p>}
        <div className={formActions}>
          {!readOnly && <Button type="submit" variant="primary" disabled={save.isPending}>{save.isPending ? "Saving…" : domain ? "Save changes" : "Add domain"}</Button>}
          <Button onClick={() => onDone()}>{readOnly ? "Close" : "Cancel"}</Button>
          {domain && !readOnly && (
            <Button className="ml-auto !text-critical" disabled={del.isPending}
              onClick={() => { if (window.confirm(`Delete the ${domain.name} domain? Its services and devices are not affected.`)) del.mutate(domain.id, { onSuccess: () => onDone() }); }}>
              <Icon icon={Trash2Icon} /> Delete
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
