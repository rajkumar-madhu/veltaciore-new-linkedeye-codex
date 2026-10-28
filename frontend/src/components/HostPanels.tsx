// Host panels for the server page, all from live sources:
//   processes / services / filesystems → GET …/inventory/   (Prometheus, now)
//   iDRAC / iLO                         → GET …/hardware/    (Redfish exporter)
//   event logs                          → GET …/logs/        (Loki)
// Each panel shows why it is empty (not connected / not collected) instead of
// placeholder values.
import React from "react";
import { useDeviceLogs, type BmcController, type DeviceHardware, type DeviceInventory, type LogEntry } from "@/api/hooks";
import { useTimeRange } from "@/store/timeRange";
import { Donut, Empty, Legend, Panel, Pill } from "@/components/ld";
import { Button, Card, SearchBox, Select, Table, TextButton, cx, toneText, ui } from "@/components/ui";
import type { Slice, Tone } from "@/components/ld";
import { SampleNotice, Sparkline, TimeChart, fmtValue } from "@/components/MetricCharts";

import { Icon } from "@/components/Icon";
import { ArrowRightIcon, SearchIcon, UnplugIcon } from "lucide-react";
export function fmtBytes(b: number | null | undefined) {
  if (b == null) return "—";
  const u = ["B", "KB", "MB", "GB", "TB", "PB"];
  let i = 0;
  let v = b;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v >= 100 ? v.toFixed(0) : v.toFixed(1)} ${u[i]}`;
}

/** Why an inventory-backed panel has nothing to show, or null when it has data. */
function inventoryGap(inv: DeviceInventory | undefined, loading: boolean): string | null {
  if (loading) return "Loading…";
  if (!inv) return "The API is not reachable from this browser.";
  if (inv.source === "unavailable") return `Prometheus is not connected. ${inv.message ?? ""}`;
  if (inv.source === "unsupported") return inv.message ?? "Not collected for this device type.";
  return null;
}

/** One-line marker on a panel whose rows are generated sample values. */
function SampleLine({ sample, setting = "PROMETHEUS_URL" }: { sample?: boolean; setting?: string }) {
  if (!sample) return null;
  return <p className="text-fg-muted text-xs"><Pill tone="muted">Sample data</Pill> Generated rows, not from this device. Set {setting} on the API for live data.</p>;
}

// ── Processes ───────────────────────────────────────────────────────────────
export function ProcessTable({ inv, loading, limit, onViewAll }: { inv?: DeviceInventory; loading: boolean; limit?: number; onViewAll?: () => void }) {
  const gap = inventoryGap(inv, loading);
  const rows = (inv?.processes ?? []).slice(0, limit);
  return (
    <Panel title="Top Processes (by CPU)" action={onViewAll ? { label: "View all", onClick: onViewAll } : undefined}>
      <SampleLine sample={inv?.sample} />
      {gap ? <Empty>{gap}</Empty> : rows.length ? (
        <Table>
            <thead><tr><th scope="col">Process</th><th scope="col">CPU</th><th scope="col">Memory</th><th scope="col">Threads</th></tr></thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.name}>
                  <td className="font-mono font-medium">{p.name}</td>
                  <td>{p.cpu.toFixed(1)}%</td>
                  <td>{fmtBytes(p.mem_bytes)}</td>
                  <td>{p.threads ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </Table>
      ) : (
        <Empty>No per-process metrics. Enable the process collector (windows_exporter) or install process-exporter (Linux).</Empty>
      )}
    </Panel>
  );
}

// ── Services ────────────────────────────────────────────────────────────────
export function serviceSlices(inv?: DeviceInventory): Slice[] {
  const s = inv?.services;
  if (!s) return [];
  return [
    { label: "Running", value: s.running, color: "#16a34a" },
    { label: "Stopped", value: s.stopped, color: "#f5a524" },
    { label: "Other", value: s.other, color: "#98a2b3" },
  ];
}

export function ServicesPanel({ inv, loading }: { inv?: DeviceInventory; loading: boolean }) {
  const gap = inventoryGap(inv, loading);
  const s = inv?.services;
  const total = s ? s.running + s.stopped + s.other : 0;
  return (
    <div className={cx(ui.grid, ui.cols[2])}>
      <Panel title="Services">
        <SampleLine sample={inv?.sample} />
        {gap ? <Empty>{gap}</Empty> : s && total ? (
          <div className="flex flex-wrap items-center gap-4.5">
            <Donut slices={serviceSlices(inv)} center={`${Math.round((s.running / total) * 100)}%`} sub="running" label={`${s.running} of ${total} services running`} />
            <Legend slices={serviceSlices(inv)} />
          </div>
        ) : (
          <Empty>No service metrics. Enable the service collector (windows_exporter) or the systemd collector (node_exporter).</Empty>
        )}
        <p className="text-fg-muted text-xs">Stopped = set to start automatically but not running (Windows), or failed (systemd). Other = manual or disabled.</p>
      </Panel>
      <Panel title={`Services needing attention${s ? ` (${s.problems.length})` : ""}`}>
        {gap ? <Empty>{gap}</Empty> : s?.problems.length ? (
          <Table>
              <thead><tr><th scope="col">Service</th><th scope="col">State</th><th scope="col">Start mode</th></tr></thead>
              <tbody>
                {s.problems.map((p) => (
                  <tr key={p.name}>
                    <td className="font-mono font-medium">{p.name}</td>
                    <td><Pill tone={p.state === "failed" ? "crit" : "warn"}>{p.state}</Pill></td>
                    <td>{p.start_mode || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
        ) : (
          <Empty>All automatic services are running.</Empty>
        )}
      </Panel>
    </div>
  );
}

// ── Filesystems ─────────────────────────────────────────────────────────────
export function FilesystemTable({ inv, loading }: { inv?: DeviceInventory; loading: boolean }) {
  const gap = inventoryGap(inv, loading);
  const rows = inv?.filesystems ?? [];
  const tone = (p: number | null): Tone => (p == null ? "muted" : p >= 90 ? "crit" : p >= 75 ? "warn" : "ok");
  return (
    <Panel title={`Disks / Volumes${rows.length ? ` (${rows.length})` : ""}`}>
      <SampleLine sample={inv?.sample} />
      {gap ? <Empty>{gap}</Empty> : rows.length ? (
        <Table>
            <thead><tr><th scope="col">Volume</th><th scope="col">Size</th><th scope="col">Used</th><th scope="col">Free</th><th scope="col">Usage</th></tr></thead>
            <tbody>
              {rows.map((f) => (
                <tr key={f.mount}>
                  <td className="font-mono font-medium">{f.mount}</td>
                  <td>{fmtBytes(f.size_bytes)}</td>
                  <td>{fmtBytes(f.used_bytes)}</td>
                  <td>{f.used_bytes == null ? "—" : fmtBytes(f.size_bytes - f.used_bytes)}</td>
                  <td>
                    <span className="inline-block align-middle w-[90px] h-2 rounded-[5px] bg-bg-muted overflow-hidden" role="img" aria-label={`${f.used_pct ?? "unknown"}% used`}>
                      <span className={ui.barFill} style={{ width: `${f.used_pct ?? 0}%`, background: tone(f.used_pct) === "crit" ? "#e5383b" : tone(f.used_pct) === "warn" ? "#f5a524" : "#16a34a" }} />
                    </span>{" "}
                    <Pill tone={tone(f.used_pct)}>{f.used_pct == null ? "—" : `${f.used_pct}%`}</Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
      ) : (
        <Empty>No filesystem metrics for this device.</Empty>
      )}
    </Panel>
  );
}

// ── iDRAC / iLO ─────────────────────────────────────────────────────────────
const HEALTH: Record<BmcController["health"], { label: string; tone: Tone }> = {
  ok: { label: "Healthy", tone: "ok" },
  warn: { label: "Warning", tone: "warn" },
  crit: { label: "Critical", tone: "crit" },
  unknown: { label: "Unknown", tone: "muted" },
};
const SENSOR_COLOR: Record<string, string> = { temperature: "#16a34a", fan: "#2f6bff", power: "#f97316" };

// Vendor mark: Dell's ring, HPE's green bar, a plain box for anything else.
const BMC_LOGO: Record<string, string> = {
  idrac: "w-16 h-16 self-center rounded-full border-[3px] border-[#0076ce] text-[#0076ce] text-md",
  ilo: "w-[76px] h-[46px] self-center rounded-[2px] border-t-8 border-[#01a982] text-[#01a982] text-2xl",
  other: "w-[76px] rounded-[10px] text-2xl",
};
const bmcTile = "flex flex-col gap-0.5 py-2 px-2.5 border border-line rounded min-w-0 [&_b]:text-2xl [&>svg]:h-[22px]";

export function BmcCard({ c, onDetails }: { c: BmcController; onDetails?: () => void }) {
  const h = HEALTH[c.health] ?? HEALTH.unknown;
  const name = c.kind === "idrac" ? "Dell iDRAC" : c.kind === "ilo" ? "HPE iLO" : c.vendor || "BMC";
  return (
    <Card as="section" className="flex flex-col gap-3 py-4 px-4.5" aria-label={`${name} ${c.model}`}>
      <header className="flex flex-wrap items-center gap-2.5">
        <h3 className="m-0 text-lg font-bold">{name}</h3>
        <span className="text-fg-muted">{c.model}</span>
        <Pill tone={h.tone}><Icon className={`fa-solid ${c.health === "ok" ? "fa-circle-check" : "fa-circle-exclamation"}`} /> {h.label}</Pill>
        {onDetails && <TextButton className="ml-auto" onClick={onDetails}>View details <Icon icon={ArrowRightIcon} /></TextButton>}
      </header>
      <div className="flex items-stretch gap-3.5 max-[720px]:flex-col">
        <span className={cx("flex-none grid place-items-center font-black tracking-[0.04em]", BMC_LOGO[c.kind] ?? BMC_LOGO.other)} aria-hidden="true">{c.kind === "idrac" ? "DELL" : c.kind === "ilo" ? "HPE" : "BMC"}</span>
        <div className="flex-1 grid grid-cols-[repeat(auto-fit,minmax(110px,1fr))] gap-2 min-w-0">
          <div className={bmcTile}>
            <span className="text-fg-muted text-xs">System Health</span>
            <b className={toneText[h.tone]}><Icon className={`fa-solid ${c.health === "ok" ? "fa-circle-check" : "fa-circle-exclamation"}`} /> {c.health === "ok" ? "OK" : h.label}</b>
          </div>
          {c.sensors.length ? c.sensors.map((s) => {
            const last = s.points[s.points.length - 1];
            return (
              <div key={s.key} className={bmcTile}>
                <span className="text-fg-muted text-xs">{s.key === "fan" ? "Fan Speed" : s.label}</span>
                <b>{last ? fmtValue(last[1], s.unit) : "—"}</b>
                <Sparkline points={s.points} color={SENSOR_COLOR[s.key]} label={s.label} />
              </div>
            );
          }) : <div className={cx(bmcTile, "text-fg-muted text-xs")}>Sensor readings unavailable.</div>}
        </div>
      </div>
      <footer className="text-fg-muted text-xs">
        {c.kind === "ilo" ? "iLO" : "iDRAC"} IP <span className={ui.mono}>{c.ip || "—"}</span> · Firmware {c.firmware || "—"} · Model {c.model || "—"}
      </footer>
    </Card>
  );
}

export function HardwareSection({ hw, loading, detailed, onDetails }: { hw?: DeviceHardware; loading: boolean; detailed?: boolean; onDetails?: () => void }) {
  if (loading) return <Card><Empty>Loading hardware…</Empty></Card>;
  if (!hw) return <Card><Empty>The API is not reachable from this browser.</Empty></Card>;
  if (hw.source === "none") {
    return detailed ? (
      <Card><Empty>No iDRAC / iLO is linked to this device. Onboard the controller as its own device and link it to this server (managed_by).</Empty></Card>
    ) : null;
  }
  const startSec = Date.parse(hw.start) / 1000, endSec = Date.parse(hw.end) / 1000;
  return (
    <>
      {hw.sample && <SampleNotice what="iDRAC / iLO readings" />}
      {hw.source === "unavailable" && (
        <Card className={ui.notice} role="status">
          <Icon icon={UnplugIcon} />
          <div><b>Prometheus is not connected</b><p className="text-fg-muted text-xs">{hw.message}</p></div>
        </Card>
      )}
      <div className={cx(ui.grid, ui.cols[2])}>
        {hw.controllers.map((c) => <BmcCard key={c.id} c={c} onDetails={onDetails} />)}
      </div>
      {detailed && hw.controllers.map((c) => c.sensors.some((s) => s.points.length) && (
        <div key={c.id} className={cx(ui.grid, ui.cols[3])}>
          {c.sensors.map((s) => (
            <Panel key={s.key} title={`${c.id} · ${s.label}`}>
              {s.points.length ? <TimeChart series={[s]} startSec={startSec} endSec={endSec} /> : <Empty>No samples in this range.</Empty>}
            </Panel>
          ))}
        </div>
      ))}
    </>
  );
}

// ── Event logs (Loki) ───────────────────────────────────────────────────────
const LEVEL_TONE: Record<LogEntry["level"], Tone> = { critical: "crit", error: "crit", warning: "warn", info: "info", debug: "muted" };
const LEVEL_ICON: Record<LogEntry["level"], string> = { critical: "fa-circle-xmark", error: "fa-circle-xmark", warning: "fa-triangle-exclamation", info: "fa-circle-info", debug: "fa-bug" };

// Table cells keep the table's own colour and size (the old status-text classes
// only added their weight there), so the level column is just bold for alerts.
const cellTone: Record<Tone, string | undefined> = { crit: "font-semibold", warn: "font-semibold", ok: "font-semibold", info: undefined, purple: undefined, muted: undefined };

export function EventLogs({ deviceId, title = "Event Logs", kind = "devices", compact = false, onViewAll }: {
  deviceId: string; title?: string; kind?: "devices" | "vms";
  /** a short "Recent Events" list: no filters, five rows, time / type / message */
  compact?: boolean;
  onViewAll?: () => void;
}) {
  const { preset, from, to } = useTimeRange();
  const [draft, setDraft] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [level, setLevel] = React.useState("");
  const q = useDeviceLogs(deviceId, preset, from, to, search, level, kind);
  const id = React.useId();
  return (
    <Panel title={title} action={onViewAll ? { label: "View all", onClick: onViewAll } : undefined}>
      {!compact && <form className="flex flex-wrap gap-2 mb-3" onSubmit={(e) => { e.preventDefault(); setSearch(draft.trim()); }}>
        <label className="sr-only" htmlFor={`${id}-q`}>Search log text</label>
        <SearchBox className="flex-[1_1_240px]" icon={<Icon icon={SearchIcon} />} id={`${id}-q`} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Search message text…" />
        <label className="sr-only" htmlFor={`${id}-lvl`}>Level</label>
        <Select id={`${id}-lvl`} value={level} onChange={(e) => setLevel(e.target.value)}>
          <option value="">All levels</option>
          <option value="critical">Critical</option>
          <option value="error">Error</option>
          <option value="warning">Warning</option>
          <option value="info">Information</option>
          <option value="debug">Debug</option>
        </Select>
        <Button type="submit">Search</Button>
      </form>}
      <SampleLine sample={q.data?.sample} setting="LOKI_URL" />
      {q.isLoading ? <Empty>Loading logs…</Empty> : !q.data ? <Empty>The API is not reachable from this browser.</Empty> : q.data.source !== "loki" ? (
        <div className={ui.notice} role="status">
          <Icon icon={UnplugIcon} />
          <div>
            <b>Loki is not connected</b>
            <p className="text-fg-muted text-xs">{q.data.message} Set LOKI_URL on the API to your Loki to read Windows Event Logs and the journal.</p>
          </div>
        </div>
      ) : q.data.entries.length && compact ? (
        <Table>
            <thead><tr><th scope="col">Time</th><th scope="col">Type</th><th scope="col">Message</th></tr></thead>
            <tbody>
              {q.data.entries.slice(0, 5).map((e, i) => (
                <tr key={`${e.ts}-${i}`}>
                  <td>{new Date(e.ts).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                  <td className={cellTone[LEVEL_TONE[e.level]]}><Icon className={`fa-solid ${LEVEL_ICON[e.level]}`} /> {e.level === "info" ? "Info" : e.level[0].toUpperCase() + e.level.slice(1)}</td>
                  <td className={ui.cellWrap}>{e.message}</td>
                </tr>
              ))}
            </tbody>
          </Table>
      ) : q.data.entries.length ? (
        <Table className="[&_td]:align-top">
            <thead><tr><th scope="col">Time</th><th scope="col">Level</th><th scope="col">Source</th><th scope="col">Event</th><th scope="col">Message</th></tr></thead>
            <tbody>
              {q.data.entries.map((e, i) => (
                <tr key={`${e.ts}-${i}`}>
                  <td className="font-mono font-semibold">{new Date(e.ts).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "medium" })}</td>
                  <td><Pill tone={LEVEL_TONE[e.level]}><Icon className={`fa-solid ${LEVEL_ICON[e.level]}`} /> {e.level === "info" ? "Information" : e.level[0].toUpperCase() + e.level.slice(1)}</Pill></td>
                  <td>{e.source || "—"}</td>
                  <td className="font-mono font-semibold">{e.event_id ?? "—"}</td>
                  <td className={ui.cellWrap}>{e.message}</td>
                </tr>
              ))}
            </tbody>
          </Table>
      ) : (
        <Empty>No log lines in this range{search ? ` matching “${search}”` : ""}.</Empty>
      )}
      {q.data?.source === "loki" && !compact && <p className="text-fg-muted text-xs">Query <code className={ui.mono}>{q.data.query}</code> · newest first, up to 200 lines.</p>}
    </Panel>
  );
}

