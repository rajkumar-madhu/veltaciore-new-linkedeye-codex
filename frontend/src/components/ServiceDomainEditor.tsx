// Create / edit a business domain for the heatmap (/api/infra/service-domains/):
// a name and icon, the APM services it covers, whole device kinds, and
// individual devices. Shared domains are read-only unless the all-clients
// view is selected (the API enforces the same).
import React from "react";
import "@/styles/infra.css"; // ld-dom-* form pieces shared with the Domains page
import { useDeleteServiceDomain, useSaveServiceDomain } from "@/api/hooks";
import type { ServiceDomain, ServiceDomainInput } from "@/api/hooks";
import { apiErrorText } from "@/api/client";
import { NO_TENANT, useUiStore } from "@/store/ui";
import type { Device, Service } from "@/lib/types";
import { Empty } from "@/components/ld";

const ICONS: [string, string][] = [
  ["fa-layer-group", "Layers"], ["fa-chart-line", "Trading / chart"], ["fa-cubes", "Applications"],
  ["fa-network-wired", "Network"], ["fa-server", "Servers"], ["fa-database", "Databases"],
  ["fa-hard-drive", "Storage"], ["fa-shield-halved", "Security"], ["fa-globe", "External services"],
  ["fa-building-columns", "Exchange / bank"], ["fa-tower-broadcast", "Monitoring"], ["fa-cloud", "Cloud"],
];
const DEVICE_LIST_LIMIT = 60;

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
    <section className="ld-card ld-heat-panel" aria-labelledby={`${uid}-h`}>
      <h2 id={`${uid}-h`}>{domain ? `Edit domain — ${domain.name}` : "Add domain"}</h2>
      <p className="ld-muted ld-small">Group the services and devices that make up a business domain, such as Trading.</p>
      {readOnly && <p className="ld-muted ld-small">Shared domain: visible to every client, editable from the all-clients view.</p>}
      <form className="ld-form" onSubmit={submit}>
        <fieldset className="ld-heat-fields" disabled={readOnly}>
          <label className="ld-form-field" htmlFor={`${uid}-name`}>
            Name *
            <input id={`${uid}-name`} className="ld-input" required maxLength={128} value={f.name} placeholder="Trading" onChange={(e) => set("name", e.target.value)} />
          </label>
          <label className="ld-form-field" htmlFor={`${uid}-desc`}>
            Description
            <input id={`${uid}-desc`} className="ld-input" maxLength={500} value={f.description} placeholder="Trading and order management systems" onChange={(e) => set("description", e.target.value)} />
          </label>
          <label className="ld-form-field" htmlFor={`${uid}-icon`}>
            Icon
            <select id={`${uid}-icon`} className="ld-select" value={f.icon} onChange={(e) => set("icon", e.target.value)}>
              {ICONS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
            </select>
          </label>

          <fieldset className="ld-heat-pick">
            <legend>Services ({f.services.length} selected)</legend>
            {services.length ? (
              <ul>
                {services.map((x) => (
                  <li key={x.name}><label><input type="checkbox" checked={f.services.includes(x.name)} onChange={() => toggle("services", x.name)} /> {x.name}</label></li>
                ))}
              </ul>
            ) : <Empty>No APM services yet.</Empty>}
          </fieldset>

          <fieldset className="ld-heat-pick">
            <legend>Whole device kinds ({f.device_kinds.length} selected)</legend>
            {kinds.length ? (
              <ul>
                {kinds.map((k) => (
                  <li key={k}>
                    <label><input type="checkbox" checked={f.device_kinds.includes(k)} onChange={() => toggle("device_kinds", k)} /> {kindLabel[k] ?? k}{" "}
                      <span className="ld-muted ld-small">({devices.filter((d) => d.kind === k).length})</span></label>
                  </li>
                ))}
              </ul>
            ) : <Empty>No devices yet.</Empty>}
          </fieldset>

          <fieldset className="ld-heat-pick">
            <legend>Individual devices ({f.devices.filter((id) => !byKind.has(devices.find((d) => d.id === id)?.kind ?? "")).length} selected)</legend>
            <label className="sr-only" htmlFor={`${uid}-dev-q`}>Search devices</label>
            <span className="ld-search">
              <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
              <input id={`${uid}-dev-q`} value={devSearch} onChange={(e) => setDevSearch(e.target.value)} placeholder="Device id or role…" />
            </span>
            {shown.length ? (
              <ul>
                {shown.map((d) => (
                  <li key={d.id}>
                    <label><input type="checkbox" checked={f.devices.includes(d.id)} onChange={() => toggle("devices", d.id)} />{" "}
                      <span className="ld-mono">{d.id}</span> <span className="ld-muted ld-small">{kindLabel[d.kind] ?? d.kind}{d.role ? ` · ${d.role}` : ""}</span></label>
                  </li>
                ))}
              </ul>
            ) : <Empty>{q ? "No devices match." : "Every device is covered by a selected kind."}</Empty>}
            {devMatches.length > shown.length && <p className="ld-muted ld-small">Showing {shown.length} of {devMatches.length}; search to narrow.</p>}
          </fieldset>
        </fieldset>

        {(save.error || del.error) && <p className="ld-dom-error" role="alert">{apiErrorText(save.error ?? del.error)}</p>}
        <div className="ld-dom-actions">
          {!readOnly && <button type="submit" className="ld-btn ld-btn-primary" disabled={save.isPending}>{save.isPending ? "Saving…" : domain ? "Save changes" : "Add domain"}</button>}
          <button type="button" className="ld-btn" onClick={() => onDone()}>{readOnly ? "Close" : "Cancel"}</button>
          {domain && !readOnly && (
            <button type="button" className="ld-btn ld-heat-delete" disabled={del.isPending}
              onClick={() => { if (window.confirm(`Delete the ${domain.name} domain? Its services and devices are not affected.`)) del.mutate(domain.id, { onSuccess: () => onDone() }); }}>
              <i className="fa-solid fa-trash" aria-hidden="true" /> Delete
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
