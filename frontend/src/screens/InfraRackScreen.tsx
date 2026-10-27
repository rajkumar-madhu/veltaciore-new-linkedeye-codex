// Physical datacenter rack visualization — 42U elevations modeled on the
// datacenter-rack reference. Multiple racks per site (picker), front and rear
// views (PSUs / fans / cabling on the rear), labeled callouts, and
// click-through to device monitoring.
//
// Rack, unit, status, power and climate values come from useRacks() (seed
// fallback). Faceplate details (lit ports, drive bays, fans) are drawn for
// recognition only; unit status colours come from monitoring.
import React from "react";
import "@/styles/infra.css";
import { useNav } from "@/hooks/useNav";
import { Empty, Panel, Pill, StatCard } from "@/components/ld";
import type { Tone } from "@/components/ld";
import { useRacks } from "@/api/hooks";
import { RACKS, type RackUnit } from "@/data/racks";

import { Icon } from "@/components/Icon";
import { CameraIcon, ChevronRightIcon, CircleCheckIcon, CircleXIcon, ExternalLinkIcon, PlusIcon, ServerIcon, TriangleAlertIcon } from "lucide-react";
const U_TOTAL = 42;

const statusColor = (s: string) => (s === "ok" ? "#10b981" : s === "warn" ? "#f59e0b" : "#ef4444");
const statusTone = (s: string): Tone => (s === "ok" ? "ok" : s === "warn" ? "warn" : "crit");
const statusLabel = (s: string) => (s === "ok" ? "Healthy" : s === "warn" ? "Warning" : "Critical");

/** Custom-property style for a data-driven colour. */
const cv = (c: string, extra?: React.CSSProperties) => ({ "--c": c, ...extra }) as React.CSSProperties;

/* ── shared faceplate atoms ──────────────────────────────────────────────── */

function Led({ c, sm }: { c: string; sm?: boolean }) {
  return <span className={`ld-infra-led${sm ? " sm" : ""}`} style={cv(c)} />;
}

function PortGrid({ n, lit, cable }: { n: number; lit: number; cable?: string }) {
  return (
    <div className="ld-infra-ports" style={cv(cable ?? "#22c55e", { "--n": n / 2 } as React.CSSProperties)}>
      {Array.from({ length: n }).map((_, i) => <span key={i} className={i < lit ? "on" : undefined} />)}
    </div>
  );
}

function DriveBays({ n, vertical, failed }: { n: number; vertical?: boolean; failed?: number }) {
  return (
    <div className={`ld-infra-bays${vertical ? " tall" : ""}`}>
      {Array.from({ length: n }).map((_, i) => <span key={i}><Led sm c={i === failed ? "#ef4444" : "#22c55e"} /></span>)}
    </div>
  );
}

const VentGrille = ({ w = 54 }: { w?: number }) => <span className="ld-infra-vent" style={{ width: w }} />;
const Lcd = ({ text, color = "#67e8f9", big }: { text: React.ReactNode; color?: string; big?: boolean }) => (
  <span className={`ld-infra-lcd${big ? " big" : ""}`} style={cv(color)}>{text}</span>
);
const Face = ({ children }: { children: React.ReactNode }) => <span className="ld-infra-face">{children}</span>;
const Fill = () => <span className="ld-infra-fill" />;

/* rear-side atoms */

function Psu({ ok = true }: { ok?: boolean }) {
  return <span className="ld-infra-psu"><span /><Led sm c={ok ? "#22c55e" : "#ef4444"} /></span>;
}

function FanBank({ n = 4, failed }: { n?: number; failed?: number }) {
  return (
    <span className="ld-infra-fans">
      {Array.from({ length: n }).map((_, i) => <span key={i}><Led sm c={i === failed ? "#ef4444" : "#22c55e"} /></span>)}
    </span>
  );
}

function CableBundle({ color = "#3b82f6", n = 6 }: { color?: string; n?: number }) {
  return <span className="ld-infra-cables" style={cv(color)}>{Array.from({ length: n }).map((_, i) => <span key={i} />)}</span>;
}

/* ── faceplates ──────────────────────────────────────────────────────────── */

function FrontFace({ r }: { r: RackUnit }) {
  switch (r.kind) {
    case "patch":
      return (<><VentGrille w={20} /><PortGrid n={24} lit={18} cable="#3b82f6" /><Face>{r.model.includes("fiber") ? "OM4" : "CAT6A"}</Face></>);
    case "switch":
      return (
        <>
          <Face>SYS<br />STAT</Face>
          <PortGrid n={24} lit={r.status === "crit" ? 9 : 20} />
          <span className="ld-infra-sfp" style={cv("#22c55e")}>{[0, 1, 2, 3].map((i) => <span key={i} className={i < 2 ? "on" : undefined} />)}</span>
          <Face>SFP+</Face>
        </>
      );
    case "router":
      return (<><Lcd text="ASR · WAN" color="#93c5fd" /><PortGrid n={12} lit={8} cable="#3b82f6" /><VentGrille w={26} /></>);
    case "firewall":
      return (
        <>
          <Lcd text={`${r.model.split(" ")[0].toUpperCase()} · ${r.status === "warn" ? "HA-SYNC" : "ACTIVE"}`} />
          <span className="ld-infra-ledrow">
            {["#22c55e", "#22c55e", r.status === "warn" ? "#f59e0b" : "#22c55e", "#22c55e"].map((c, i) => <Led key={i} sm c={c} />)}
          </span>
          <PortGrid n={12} lit={9} />
          <VentGrille w={26} />
        </>
      );
    case "server":
      return (
        <>
          <VentGrille />
          <DriveBays n={6} failed={r.status === "crit" ? 2 : undefined} />
          <span className="ld-infra-ledcol"><Led c={statusColor(r.status)} /><span className="ld-infra-led ring" /></span>
        </>
      );
    case "nas":
      return (<><Face>NAS</Face><DriveBays n={8} /><Led c={statusColor(r.status)} /></>);
    case "storage":
    case "raid":
      return (
        <>
          <VentGrille w={24} />
          <DriveBays n={10} vertical={r.kind === "storage"} failed={r.status === "warn" ? 6 : undefined} />
          <span className="ld-infra-ledcol"><Led sm c="#22c55e" /><Led sm c={statusColor(r.status)} /></span>
        </>
      );
    case "tape":
      return (
        <>
          <Lcd text="LTO-9 · VAULT" color="#cbd5e1" />
          <span className="ld-infra-tapes">{Array.from({ length: 16 }).map((_, i) => <span key={i} className={i % 5 === 0 ? "empty" : undefined} />)}</span>
          <Led c="#22c55e" />
        </>
      );
    case "loadbal":
      return (<><Lcd text="LOAD BALANCER" color="#86efac" /><PortGrid n={12} lit={8} /><VentGrille w={22} /></>);
    case "ups":
      return (
        <>
          <VentGrille w={70} />
          <Fill />
          <Lcd big text={r.status === "ok" ? "UPS · ONLINE" : "UPS · ALARM"} color={r.status === "ok" ? "#67e8f9" : "#fbbf24"} />
          <Fill />
          <VentGrille w={70} />
        </>
      );
    case "pdu":
      return (
        <>
          <span className="ld-infra-switch" />
          <span className="ld-infra-sockets">{Array.from({ length: 8 }).map((_, i) => <span key={i}><i /></span>)}</span>
          <Face>32A</Face>
        </>
      );
    default:
      return null;
  }
}

function RearFace({ r, upsRuntime }: { r: RackUnit; upsRuntime: string }) {
  switch (r.kind) {
    case "patch":
      return (<><CableBundle color="#3b82f6" n={10} /><Fill /><Face>punch-down</Face><CableBundle color="#3b82f6" n={10} /></>);
    case "switch":
    case "router":
    case "firewall":
    case "loadbal":
      return (
        <>
          <Psu /><Psu ok={r.status !== "crit"} />
          <FanBank n={4} failed={r.status === "crit" ? 1 : undefined} />
          <Fill />
          <Face>MGMT</Face>
          <span className="ld-infra-sfp" style={cv("#22c55e")}><span className="on" /></span>
          <CableBundle color={r.kind === "firewall" ? "#f97316" : "#22c55e"} n={5} />
        </>
      );
    case "server":
      return (
        <>
          <Psu /><Psu ok={r.status !== "crit"} />
          <FanBank n={3} />
          <Fill />
          <Face>iDRAC</Face>
          <span className="ld-infra-sfp" style={cv(r.status === "crit" ? "#ef4444" : "#22c55e")}><span className="on" /></span>
          <span className="ld-infra-sfp" style={cv("#22c55e")}><span className="on" /><span className="on" /></span>
        </>
      );
    case "nas":
    case "storage":
    case "raid":
      return (
        <>
          <Psu /><Psu />
          <FanBank n={4} failed={r.status === "warn" ? 2 : undefined} />
          <Fill />
          <Face>CTRL A/B</Face>
          <CableBundle color="#f59e0b" n={4} />
        </>
      );
    case "tape":
      return (<><Psu /><FanBank n={2} /><Fill /><Face>SAS ×4</Face><CableBundle color="#64748b" n={4} /></>);
    case "ups":
      return (
        <>
          <span className="ld-infra-breakers">{Array.from({ length: 4 }).map((_, i) => <span key={i} className={i === 0 ? "on" : undefined} />)}</span>
          <VentGrille w={90} />
          <Fill />
          <Lcd text={`BATT · ${upsRuntime}`} color={r.status === "warn" ? "#fbbf24" : "#67e8f9"} />
          <CableBundle color="#dc2626" n={3} />
        </>
      );
    case "pdu":
      return (
        <>
          <span className="ld-infra-sockets">{Array.from({ length: 10 }).map((_, i) => <span key={i}><Led sm c={i < 8 ? "#22c55e" : "#1f242c"} /></span>)}</span>
          <Face>C13 ×24</Face>
        </>
      );
    default:
      return null;
  }
}

/* ── screen ──────────────────────────────────────────────────────────────── */

export default function InfraRackScreen() {
  const { setRoute } = useNav();
  const { data } = useRacks();
  const racks = data && data.length ? data : RACKS;
  const [hover, setHover] = React.useState<string | null>(null);
  const [rackId, setRackId] = React.useState<string | null>(null);
  const [side, setSide] = React.useState<"front" | "rear">("front");

  const rack = racks.find((r) => r.id === rackId) ?? racks[0];
  const units = rack.units;
  const occupied = units.reduce((n, r) => n + (r.uTop - r.uBottom + 1), 0);
  const counts = {
    ok: units.filter((r) => r.status === "ok").length,
    warn: units.filter((r) => r.status === "warn").length,
    crit: units.filter((r) => r.status === "crit").length,
  };
  const loadPct = Math.round(rack.powerKw / rack.capacityKw * 100);
  const open = (r: RackUnit) => {
    if (!r.device) return;
    const route =
      r.kind === "firewall" ? "firewall-detail"
      : r.kind === "switch" ? "switch-detail"
      : r.kind === "server" ? "server-detail"
      : ["storage", "raid", "nas"].includes(r.kind) ? "storage-detail"
      : r.kind === "loadbal" ? "loadbal-detail"
      : r.kind === "ups" ? "ups-detail"
      : "infra-device";
    setRoute(route, { deviceId: r.device });
  };
  const callouts = units.filter((r) => r.label);
  const uLabel = (r: RackUnit) => (r.uTop === r.uBottom ? `U${String(r.uTop).padStart(2, "0")}` : `U${String(r.uBottom).padStart(2, "0")}–${String(r.uTop).padStart(2, "0")}`);
  const nameOf = (r: RackUnit) => r.label || r.chip || r.kind.toUpperCase();
  const hoverProps = (r: RackUnit) => ({
    onMouseEnter: () => setHover(r.asset), onMouseLeave: () => setHover(null),
    onFocus: () => setHover(r.asset), onBlur: () => setHover(null),
  });

  return (
    <div className="ld-dash">
      <nav className="ld-crumbs" aria-label="Breadcrumb">
        <button type="button" className="ld-link" onClick={() => setRoute("dashboard")}>Home</button>
        <Icon icon={ChevronRightIcon} />
        <button type="button" className="ld-link" onClick={() => setRoute("infra")}>Monitoring</button>
        <Icon icon={ChevronRightIcon} />
        <span>Bangalore DC-1</span>
        <Icon icon={ChevronRightIcon} />
        <span>Rack {rack.id} · {rack.row}</span>
      </nav>

      <div className="ld-head ld-entity-head">
        <div className="ld-entity">
          <span className="ld-tile ld-purple" aria-hidden="true"><Icon icon={ServerIcon} /></span>
          <div>
            <h1 className="ld-entity-title">
              Rack {rack.id} / {rack.row}
              <Pill tone={counts.crit ? "crit" : counts.warn ? "warn" : "ok"}>
                <span className="ld-pill-dot" />{counts.crit ? `${counts.crit} critical` : counts.warn ? `${counts.warn} warning` : "All healthy"}
              </Pill>
            </h1>
            <p className="ld-entity-meta">
              <span>dc-blr-1</span>
              <span>{rack.role}</span>
              <span>42U enclosure · {occupied}U occupied</span>
              <span>{rack.powerKw} kW · {loadPct}% of capacity</span>
              <span>inlet {rack.inletC}°C</span>
            </p>
          </div>
        </div>
        <div className="ld-head-side">
          <div className="ld-head-actions">
            <button type="button" className="ld-btn"><Icon icon={CameraIcon} /> Photo</button>
            <button type="button" className="ld-btn"><Icon icon={ExternalLinkIcon} /> Open in CMDB</button>
            <button type="button" className="ld-btn ld-btn-primary"><Icon icon={PlusIcon} /> Add Device</button>
          </div>
          <ul className="ld-tags" aria-label="Unit status">
            <li className="ld-tag"><Icon icon={CircleCheckIcon} /> {counts.ok} / {units.length} healthy</li>
            <li className="ld-tag"><Icon icon={TriangleAlertIcon} /> {counts.warn} warning</li>
            <li className="ld-tag"><Icon icon={CircleXIcon} /> {counts.crit} critical</li>
          </ul>
        </div>
      </div>

      {/* Rack picker */}
      <div className="ld-infra-picker" role="group" aria-label="Racks">
        {racks.map((r) => {
          const crit = r.units.some((u) => u.status === "crit");
          const warn = r.units.some((u) => u.status === "warn");
          const tone = crit ? "#ef4444" : warn ? "#f59e0b" : "#10b981";
          return (
            <button key={r.id} type="button" className="ld-card ld-infra-pick" aria-pressed={r.id === rack.id} onClick={() => { setRackId(r.id); setHover(null); }}>
              <span className="ld-infra-rack-glyph" style={cv(tone)} aria-hidden="true">
                {Array.from({ length: 7 }).map((_, i) => <span key={i} className={i % 3 === 0 ? "lit" : undefined} />)}
              </span>
              <span className="ld-infra-pick-body">
                <span className="ld-infra-pick-title">Rack {r.id} <span className="ld-muted">· {r.role}</span></span>
                <span className="ld-infra-pick-sub">{r.units.length} devices · {r.powerKw} kW · <span className={`ld-text-${crit ? "crit" : warn ? "warn" : "ok"}`}>{crit ? "critical" : warn ? "warning" : "healthy"}</span></span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="ld-grid ld-grid-stats ld-grid-5">
        <StatCard icon="fa-layer-group" tone="info" label="Rack units" value={`${occupied} / 42`} note={`${42 - occupied}U free`} />
        <StatCard icon="fa-bolt" tone={rack.powerKw / rack.capacityKw > 0.8 ? "warn" : "ok"} label="Power draw" value={`${rack.powerKw} kW`} note={`${loadPct}% of ${rack.capacityKw} kW`} />
        <StatCard icon="fa-temperature-half" tone="info" label="Inlet temp" value={`${rack.inletC}°C`} note={`exhaust ${rack.exhaustC}°C`} />
        <StatCard icon="fa-server" tone="purple" label="Devices" value={units.length} note="in this rack" />
        <StatCard icon="fa-circle-xmark" tone={counts.crit ? "crit" : "ok"} label="Critical" value={counts.crit} note={counts.crit ? "needs attention" : "none"} />
      </div>

      <section className="ld-card ld-panel" aria-labelledby="elev-h">
        <div className="ld-panel-head">
          <h2 id="elev-h">Physical rack view · 42U {side} elevation</h2>
          <div className="ld-infra-seg" role="group" aria-label="Rack side">
            {(["front", "rear"] as const).map((s) => (
              <button key={s} type="button" aria-pressed={side === s} onClick={() => setSide(s)}>
                <Icon className={`fa-solid ${s === "front" ? "fa-square-caret-down" : "fa-plug"}`} /> {s === "front" ? "Front" : "Rear"}
              </button>
            ))}
          </div>
        </div>
        <p className="ld-muted ld-small">Faceplates are illustrative; the coloured edge and status LED of each unit come from monitoring. Select a unit to open its device page.</p>

        <div className="ld-infra-elev">
          {/* Left: labeled callout cards */}
          <div className="ld-infra-callouts">
            {callouts.map((r) => {
              const body = (
                <>
                  <span className="ld-infra-callout-icon" aria-hidden="true"><Icon className={`fa-solid ${r.icon}`} /></span>
                  <span>
                    <span className="ld-infra-callout-title">{r.label}</span>
                    <span className="ld-infra-callout-desc">{r.desc}</span>
                  </span>
                </>
              );
              const cls = `ld-infra-callout${hover === r.asset ? " active" : ""}`;
              return r.device ? (
                <button key={r.asset} type="button" className={cls} style={cv(r.color)} onClick={() => open(r)} {...hoverProps(r)}>{body}</button>
              ) : (
                <div key={r.asset} className={cls} style={cv(r.color)} onMouseEnter={() => setHover(r.asset)} onMouseLeave={() => setHover(null)}>{body}</div>
              );
            })}
          </div>

          {/* Center: rack chassis */}
          <div className="ld-infra-chassis" role="group" aria-label={`Rack ${rack.id} ${side} elevation`}>
            <div className="ld-infra-chassis-cap" aria-hidden="true">{side.toUpperCase()} · 42U</div>
            <div className="ld-infra-rails">
              <div className="ld-infra-rail" aria-hidden="true">
                {Array.from({ length: U_TOTAL }).map((_, i) => <span key={i}>{U_TOTAL - i}</span>)}
              </div>

              <div className="ld-infra-bay-grid">
                {Array.from({ length: U_TOTAL }).map((_, i) => (
                  <span key={i} className="ld-infra-slot" style={{ gridRow: `${i + 1} / span 1` }} aria-hidden="true" />
                ))}
                {units.map((r) => {
                  const rowStart = U_TOTAL - r.uTop + 1;
                  const span = r.uTop - r.uBottom + 1;
                  const cls = `ld-infra-unit${side === "rear" ? " rear" : ""}${hover === r.asset ? " active" : ""}`;
                  const style = cv(r.color, { gridRow: `${rowStart} / span ${span}` });
                  const desc = `${nameOf(r)} · ${r.asset} · ${uLabel(r)} · ${r.model}${r.ip ? ` · ${r.ip}` : ""} · ${statusLabel(r.status)}`;
                  const face = (
                    <>
                      <Led c={statusColor(r.status)} />
                      {side === "front" ? <FrontFace r={r} /> : <RearFace r={r} upsRuntime={rack.upsRuntime} />}
                    </>
                  );
                  return r.device ? (
                    <button key={r.asset} type="button" className={cls} style={style} title={desc} aria-label={`Open ${desc}`} onClick={() => open(r)} {...hoverProps(r)}>{face}</button>
                  ) : (
                    <div key={r.asset} className={cls} style={style} title={desc} role="img" aria-label={desc}
                      onMouseEnter={() => setHover(r.asset)} onMouseLeave={() => setHover(null)}>{face}</div>
                  );
                })}
              </div>

              <div className="ld-infra-rail" aria-hidden="true">
                {Array.from({ length: U_TOTAL }).map((_, i) => <span key={i}>{U_TOTAL - i}</span>)}
              </div>
            </div>
            <div className="ld-infra-chassis-foot" aria-hidden="true">argus-linkedeye · dc-blr-1 · {rack.id} · {rack.row.toLowerCase()}</div>
          </div>

          {/* Right: chips + asset callouts (wide screens; the inventory table carries the same data) */}
          <div className="ld-infra-chips" aria-hidden="true">
            {units.filter((r) => r.chip || r.ip).map((r) => {
              const rowStart = U_TOTAL - r.uTop + 1;
              const span = r.uTop - r.uBottom + 1;
              return (
                <span key={r.asset} className={`ld-infra-chip${hover === r.asset ? " active" : ""}`} style={cv(r.chip ? "var(--accent)" : r.color, { gridRow: `${rowStart} / span ${span}` })}
                  onMouseEnter={() => setHover(r.asset)} onMouseLeave={() => setHover(null)}>
                  {r.chip ? <span className="ld-infra-chip-tag"><Icon icon={ServerIcon} /> {r.chip}</span> : <span className="ld-infra-chip-asset">{r.asset}</span>}
                </span>
              );
            })}
          </div>
        </div>
      </section>

      <div className="ld-split">
        <Panel title={`Rack Inventory (${units.length})`}>
          {units.length ? (
            <div className="ld-table-wrap">
              <table className="ld-table">
                <thead><tr><th scope="col">Device</th><th scope="col">U</th><th scope="col">Model</th><th scope="col">Asset ID</th><th scope="col">IP</th><th scope="col">Status</th></tr></thead>
                <tbody>
                  {units.map((r) => (
                    <tr key={r.asset} className={hover === r.asset ? "ld-row-selected" : undefined}>
                      <td>
                        <div className="ld-infra-cell">
                          <span className="ld-infra-kind" aria-hidden="true"><Icon className={`fa-solid ${r.icon}`} /></span>
                          {r.device
                            ? <button type="button" className="ld-link" onClick={() => open(r)}>{nameOf(r)}</button>
                            : <span className="ld-strong">{nameOf(r)}</span>}
                        </div>
                      </td>
                      <td className="ld-mono">{uLabel(r)}</td>
                      <td className="ld-muted">{r.model}</td>
                      <td className="ld-mono">{r.asset}</td>
                      <td className="ld-mono">{r.ip || "—"}</td>
                      <td><Pill tone={statusTone(r.status)}><span className="ld-pill-dot" />{statusLabel(r.status)}</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>This rack has no units recorded.</Empty>
          )}
        </Panel>

        <div className="ld-rail">
          <Panel title="Rack Identity">
            <dl className="ld-dl">
              <dt>Rack ID</dt><dd className="ld-mono">RACK-{rack.id}</dd>
              <dt>Site</dt><dd>Bangalore DC-1</dd>
              <dt>Row · position</dt><dd>{rack.row} · Position {rack.id.replace("R", "")}</dd>
              <dt>Role</dt><dd>{rack.role}</dd>
              <dt>Total height</dt><dd>42U</dd>
              <dt>Occupied</dt><dd>{occupied}U / 42U</dd>
              <dt>Free U</dt><dd>{42 - occupied}U available</dd>
            </dl>
          </Panel>

          <Panel title="Power & Cooling">
            <dl className="ld-dl">
              <dt>Power draw</dt><dd className={rack.powerKw / rack.capacityKw > 0.8 ? "ld-text-warn" : "ld-text-ok"}>{rack.powerKw} kW</dd>
              <dt>Capacity</dt><dd>{rack.capacityKw} kW · {loadPct}%</dd>
              <dt>UPS runtime</dt><dd>{rack.upsRuntime}</dd>
              <dt>Inlet temp</dt><dd>{rack.inletC}°C</dd>
              <dt>Exhaust temp</dt><dd>{rack.exhaustC}°C</dd>
              <dt>Humidity</dt><dd>{rack.humidity}%</dd>
            </dl>
          </Panel>
        </div>
      </div>
    </div>
  );
}
