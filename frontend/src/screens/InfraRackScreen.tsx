// Physical datacenter rack visualization — 42U elevations modeled on the
// datacenter-rack reference. Multiple racks per site (picker), front and rear
// views (PSUs / fans / cabling on the rear), labeled callouts, and
// click-through to device monitoring.
//
// Rack, unit, status, power and climate values come from useRacks() (seed
// fallback). Faceplate details (lit ports, drive bays, fans) are drawn for
// recognition only; unit status colours come from monitoring.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { Empty, Panel, Pill, PillDot, StatCard } from "@/components/ld";
import type { Tone } from "@/components/ld";
import { useRacks } from "@/api/hooks";
import { RACKS, type RackUnit } from "@/data/racks";
import { Button, Card, Crumbs, Page, Table, TextButton, Tile, cx, toneText, ui } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { CameraIcon, CircleCheckIcon, CircleXIcon, ExternalLinkIcon, PlusIcon, ServerIcon, TriangleAlertIcon } from "lucide-react";
const U_TOTAL = 42;

const statusColor = (s: string) => (s === "ok" ? "#10b981" : s === "warn" ? "#f59e0b" : "#ef4444");
const statusTone = (s: string): Tone => (s === "ok" ? "ok" : s === "warn" ? "warn" : "crit");
const statusLabel = (s: string) => (s === "ok" ? "Healthy" : s === "warn" ? "Warning" : "Critical");

// Table cells / dl values kept the cell's 13px / colour over mono size and (light) status colour.
const cellMono = "font-mono font-semibold";
const cellWarn = "font-semibold dark:text-tone-warn";
const cellOk = "font-semibold dark:text-tone-ok";
// Entity sub-line: items separated by a "|" (inherits the page-head paragraph style).
const entityMeta = "text-base text-fg-muted mt-1 flex flex-wrap gap-x-3.5 gap-y-1 [&_span+span]:before:content-['|'] [&_span+span]:before:mr-3.5 [&_span+span]:before:text-line-strong";
const focusRing = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2";
const pickCard = cx(
  ui.card,
  "flex items-center gap-3 w-full text-left text-fg px-3.5 py-3 cursor-pointer hover:border-line-strong",
  "aria-pressed:border-accent aria-pressed:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_18%,transparent)]",
  focusRing,
);
// Segmented toggle (aria-pressed buttons).
const seg = "inline-flex border border-line-strong rounded overflow-hidden bg-bg-raised";
const segBtn = "border-0 bg-transparent text-sm font-semibold text-fg-muted px-3 min-h-9 cursor-pointer [button+&]:border-l [button+&]:border-line aria-pressed:bg-accent aria-pressed:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:-outline-offset-2";
const railNums = "[&_span]:text-[#6b7380] [&_span]:text-[8px] [&_span]:font-mono [&_span]:grid [&_span]:place-items-center";
const railCol = "grid grid-rows-[repeat(42,var(--u))] gap-y-0.5";

/** Custom-property style for a data-driven colour. */
const cv = (c: string, extra?: React.CSSProperties) => ({ "--c": c, ...extra }) as React.CSSProperties;

/* ── shared faceplate atoms ──────────────────────────────────────────────── */
// The chassis is drawn as physical hardware (dark metal) in both themes; only
// the surrounding cards follow the page theme. Container rules styled every
// nested span (LEDs included) with `[&_span]:`, at the same specificity as
// before, so an LED inside a drive bay / fan / socket still takes that
// container's look; the small-LED size wins with `!`.

const LED = "flex-none w-1.5 h-1.5 rounded-full bg-[color:var(--c,#22c55e)] shadow-[0_0_5px_var(--c,#22c55e)]";
const portCells = "[&_span]:h-2 [&_span]:rounded-[1px] [&_span]:bg-[#0b0f14] [&_span]:border [&_span]:border-[#262b33] [&_span[data-on]]:bg-[color:var(--c,#22c55e)] [&_span[data-on]]:shadow-[0_0_4px_var(--c,#22c55e)]";
const sfp = cx("flex gap-0.5 flex-none [&_span]:w-2.5", portCells);
const face = "flex-none text-[#8b94a3] text-[8.5px] font-mono leading-[1.1]";
const ledRow = "flex gap-[3px] flex-none";
const ledCol = "flex flex-col gap-[3px] items-center flex-none";
const dataOn = (on: boolean) => (on ? { "data-on": "" } : {});

function Led({ c, sm }: { c: string; sm?: boolean }) {
  return <span className={cx(LED, sm && "!w-1 !h-1")} style={cv(c)} />;
}
const RingLed = () => <span className="flex-none w-2 h-2 rounded-full border-[1.5px] border-[#3b82f6] shadow-[0_0_4px_#3b82f6]" />;

function PortGrid({ n, lit, cable }: { n: number; lit: number; cable?: string }) {
  return (
    <div className={cx("grid grid-cols-[repeat(var(--n),1fr)] gap-0.5 flex-1 max-w-[320px]", portCells)} style={cv(cable ?? "#22c55e", { "--n": n / 2 } as React.CSSProperties)}>
      {Array.from({ length: n }).map((_, i) => <span key={i} {...dataOn(i < lit)} />)}
    </div>
  );
}

function DriveBays({ n, vertical, failed }: { n: number; vertical?: boolean; failed?: number }) {
  return (
    <div className={cx(
      "flex gap-[3px] flex-1 max-w-[340px]",
      "[&_span]:flex-1 [&_span]:h-3.5 [&_span]:flex [&_span]:items-end [&_span]:justify-center [&_span]:pb-0.5 [&_span]:bg-[linear-gradient(180deg,#20242c,#141820)] [&_span]:border [&_span]:border-[#2c313a] [&_span]:rounded-[2px]",
      vertical && "[&_span]:!h-[26px]",
    )}>
      {Array.from({ length: n }).map((_, i) => <span key={i}><Led sm c={i === failed ? "#ef4444" : "#22c55e"} /></span>)}
    </div>
  );
}

const VentGrille = ({ w = 54 }: { w?: number }) => (
  <span className="flex-none self-stretch rounded-[2px] bg-[radial-gradient(circle,#2e333c_1.2px,transparent_1.3px)] bg-[length:5px_5px] border border-[#262b33]" style={{ width: w }} />
);
const Lcd = ({ text, color = "#67e8f9", big }: { text: React.ReactNode; color?: string; big?: boolean }) => (
  <span className={cx(
    "flex-none bg-[#082f49] border border-[#0c4a6e] rounded-[2px] text-[color:var(--c,#67e8f9)] font-mono font-bold tracking-[0.04em] shadow-[inset_0_0_6px_rgba(103,232,249,0.25)] whitespace-nowrap",
    big ? "px-3.5 py-1.5 text-sm" : "px-2 py-0.5 text-[9.5px]",
  )} style={cv(color)}>{text}</span>
);
const Face = ({ children }: { children: React.ReactNode }) => <span className={face}>{children}</span>;
const Fill = () => <span className="flex-1" />;

/* rear-side atoms */

function Psu({ ok = true }: { ok?: boolean }) {
  return (
    <span className="flex-none w-11 self-stretch min-h-3.5 flex items-center justify-between px-1 bg-[linear-gradient(180deg,#262b33,#181c23)] border border-[#333945] rounded-[2px] [&>span:first-child]:w-2 [&>span:first-child]:h-2 [&>span:first-child]:bg-[#0b0f14] [&>span:first-child]:border [&>span:first-child]:border-[#3a414c] [&>span:first-child]:rounded-[1px]">
      <span /><Led sm c={ok ? "#22c55e" : "#ef4444"} />
    </span>
  );
}

function FanBank({ n = 4, failed }: { n?: number; failed?: number }) {
  return (
    <span className="flex gap-[3px] flex-1 max-w-[220px] [&_span]:flex-1 [&_span]:h-4 [&_span]:grid [&_span]:place-items-center [&_span]:rounded-[2px] [&_span]:border [&_span]:border-[#2c313a] [&_span]:bg-[radial-gradient(circle_at_50%_50%,#2a303a_25%,#171b22_70%)]">
      {Array.from({ length: n }).map((_, i) => <span key={i}><Led sm c={i === failed ? "#ef4444" : "#22c55e"} /></span>)}
    </span>
  );
}

function CableBundle({ color = "#3b82f6", n = 6 }: { color?: string; n?: number }) {
  return (
    <span className="flex gap-0.5 flex-none [&_span]:w-[3px] [&_span]:h-4 [&_span]:rounded-[2px] [&_span]:bg-[color:var(--c)] [&_span:nth-child(3n+1)]:opacity-50 [&_span:nth-child(3n+2)]:opacity-[0.68] [&_span:nth-child(3n)]:opacity-[0.86]" style={cv(color)}>
      {Array.from({ length: n }).map((_, i) => <span key={i} />)}
    </span>
  );
}

const sockets = "flex gap-1 flex-1 max-w-[360px] [&_span]:flex-1 [&_span]:h-4 [&_span]:grid [&_span]:place-items-center [&_span]:bg-[#0b0f14] [&_span]:border [&_span]:border-[#2c313a] [&_span]:rounded-[2px] [&_i]:w-1.5 [&_i]:h-1.5 [&_i]:bg-[#1f242c] [&_i]:border [&_i]:border-[#343a44] [&_i]:rounded-[1px]";

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
          <span className={sfp} style={cv("#22c55e")}>{[0, 1, 2, 3].map((i) => <span key={i} {...dataOn(i < 2)} />)}</span>
          <Face>SFP+</Face>
        </>
      );
    case "router":
      return (<><Lcd text="ASR · WAN" color="#93c5fd" /><PortGrid n={12} lit={8} cable="#3b82f6" /><VentGrille w={26} /></>);
    case "firewall":
      return (
        <>
          <Lcd text={`${r.model.split(" ")[0].toUpperCase()} · ${r.status === "warn" ? "HA-SYNC" : "ACTIVE"}`} />
          <span className={ledRow}>
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
          <span className={ledCol}><Led c={statusColor(r.status)} /><RingLed /></span>
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
          <span className={ledCol}><Led sm c="#22c55e" /><Led sm c={statusColor(r.status)} /></span>
        </>
      );
    case "tape":
      return (
        <>
          <Lcd text="LTO-9 · VAULT" color="#cbd5e1" />
          <span className="grid grid-cols-8 gap-[3px] flex-1 max-w-[300px] [&_span]:h-2.5 [&_span]:bg-[#3f4650] [&_span]:border [&_span]:border-[#2c313a] [&_span]:rounded-[1px] [&_span[data-empty]]:bg-[#0b0f14]">{Array.from({ length: 16 }).map((_, i) => <span key={i} {...(i % 5 === 0 ? { "data-empty": "" } : {})} />)}</span>
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
          <span className="flex-none w-3.5 h-5 bg-[#7f1d1d] border border-[#b91c1c] rounded-[2px] shadow-[inset_0_-8px_0_#dc2626]" />
          <span className={sockets}>{Array.from({ length: 8 }).map((_, i) => <span key={i}><i /></span>)}</span>
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
          <span className={sfp} style={cv("#22c55e")}><span data-on="" /></span>
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
          <span className={sfp} style={cv(r.status === "crit" ? "#ef4444" : "#22c55e")}><span data-on="" /></span>
          <span className={sfp} style={cv("#22c55e")}><span data-on="" /><span data-on="" /></span>
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
          <span className="flex gap-[3px] flex-none [&_span]:w-3 [&_span]:h-[22px] [&_span]:bg-[#101418] [&_span]:border [&_span]:border-[#2c313a] [&_span]:rounded-[2px] [&_span]:shadow-[inset_0_-10px_0_#1f242c] [&_span[data-on]]:shadow-[inset_0_-10px_0_#16a34a]">{Array.from({ length: 4 }).map((_, i) => <span key={i} {...dataOn(i === 0)} />)}</span>
          <VentGrille w={90} />
          <Fill />
          <Lcd text={`BATT · ${upsRuntime}`} color={r.status === "warn" ? "#fbbf24" : "#67e8f9"} />
          <CableBundle color="#dc2626" n={3} />
        </>
      );
    case "pdu":
      return (
        <>
          <span className={sockets}>{Array.from({ length: 10 }).map((_, i) => <span key={i}><Led sm c={i < 8 ? "#22c55e" : "#1f242c"} /></span>)}</span>
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
    <Page>
      <Crumbs items={[{ label: "Home", onClick: () => setRoute("dashboard") }, { label: "Monitoring", onClick: () => setRoute("infra") }, { label: "Bangalore DC-1" }, { label: `Rack ${rack.id} · ${rack.row}` }]} />

      <div className={cx(ui.head, "!items-start")}>
        <div className="flex items-center gap-3.5 min-w-0">
          <Tile tone="purple" className="!text-5xl"><Icon icon={ServerIcon} /></Tile>
          <div>
            <h1 className={cx(ui.h1, "flex items-center gap-2.5 flex-wrap")}>
              Rack {rack.id} / {rack.row}
              <Pill tone={counts.crit ? "crit" : counts.warn ? "warn" : "ok"}>
                <PillDot />{counts.crit ? `${counts.crit} critical` : counts.warn ? `${counts.warn} warning` : "All healthy"}
              </Pill>
            </h1>
            <p className={entityMeta}>
              <span>dc-blr-1</span>
              <span>{rack.role}</span>
              <span>42U enclosure · {occupied}U occupied</span>
              <span>{rack.powerKw} kW · {loadPct}% of capacity</span>
              <span>inlet {rack.inletC}°C</span>
            </p>
          </div>
        </div>
        <div className={ui.headSide}>
          <div className={ui.headActions}>
            <Button><Icon icon={CameraIcon} /> Photo</Button>
            <Button><Icon icon={ExternalLinkIcon} /> Open in CMDB</Button>
            <Button variant="primary"><Icon icon={PlusIcon} /> Add Device</Button>
          </div>
          <ul className={ui.tags} aria-label="Unit status">
            <li className={ui.tag}><Icon icon={CircleCheckIcon} /> {counts.ok} / {units.length} healthy</li>
            <li className={ui.tag}><Icon icon={TriangleAlertIcon} /> {counts.warn} warning</li>
            <li className={ui.tag}><Icon icon={CircleXIcon} /> {counts.crit} critical</li>
          </ul>
        </div>
      </div>

      {/* Rack picker */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3" role="group" aria-label="Racks">
        {racks.map((r) => {
          const crit = r.units.some((u) => u.status === "crit");
          const warn = r.units.some((u) => u.status === "warn");
          const tone = crit ? "#ef4444" : warn ? "#f59e0b" : "#10b981";
          return (
            <button key={r.id} type="button" className={pickCard} aria-pressed={r.id === rack.id} onClick={() => { setRackId(r.id); setHover(null); }}>
              <span className="flex-none w-[22px] h-[34px] rounded-[3px] bg-[#171b22] border border-[#2c313a] flex flex-col gap-[1.5px] p-0.5 [&_span]:flex-1 [&_span]:rounded-[1px] [&_span]:bg-[#2b303a] [&_span[data-lit]]:bg-[color:var(--c)]" style={cv(tone)} aria-hidden="true">
                {Array.from({ length: 7 }).map((_, i) => <span key={i} {...(i % 3 === 0 ? { "data-lit": "" } : {})} />)}
              </span>
              <span className="flex flex-col gap-0.5 min-w-0">
                <span className="font-bold text-sm">Rack {r.id} <span className="text-fg-muted">· {r.role}</span></span>
                <span className="text-xs text-fg-muted">{r.units.length} devices · {r.powerKw} kW · <span className={toneText[crit ? "crit" : warn ? "warn" : "ok"]}>{crit ? "critical" : warn ? "warning" : "healthy"}</span></span>
              </span>
            </button>
          );
        })}
      </div>

      <div className={cx(ui.grid, ui.cols[5])}>
        <StatCard icon="fa-layer-group" tone="info" label="Rack units" value={`${occupied} / 42`} note={`${42 - occupied}U free`} />
        <StatCard icon="fa-bolt" tone={rack.powerKw / rack.capacityKw > 0.8 ? "warn" : "ok"} label="Power draw" value={`${rack.powerKw} kW`} note={`${loadPct}% of ${rack.capacityKw} kW`} />
        <StatCard icon="fa-temperature-half" tone="info" label="Inlet temp" value={`${rack.inletC}°C`} note={`exhaust ${rack.exhaustC}°C`} />
        <StatCard icon="fa-server" tone="purple" label="Devices" value={units.length} note="in this rack" />
        <StatCard icon="fa-circle-xmark" tone={counts.crit ? "crit" : "ok"} label="Critical" value={counts.crit} note={counts.crit ? "needs attention" : "none"} />
      </div>

      <Card as="section" className={ui.panel} aria-labelledby="elev-h">
        <div className={ui.panelHead}>
          <h2 id="elev-h" className={ui.panelTitle}>Physical rack view · 42U {side} elevation</h2>
          <div className={seg} role="group" aria-label="Rack side">
            {(["front", "rear"] as const).map((s) => (
              <button key={s} type="button" className={segBtn} aria-pressed={side === s} onClick={() => setSide(s)}>
                <Icon name={s === "front" ? "square-caret-down" : "plug"} /> {s === "front" ? "Front" : "Rear"}
              </button>
            ))}
          </div>
        </div>
        <p className="text-fg-muted text-xs">Faceplates are illustrative; the coloured edge and status LED of each unit come from monitoring. Select a unit to open its device page.</p>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-4.5 items-start min-[1100px]:grid-cols-[minmax(180px,230px)_minmax(360px,1fr)_minmax(110px,150px)]">
          {/* Left: labeled callout cards */}
          <div className="flex flex-col gap-2.5 order-2 min-[1100px]:order-none min-[1100px]:sticky min-[1100px]:top-3">
            {callouts.map((r) => {
              const body = (
                <>
                  <span className="flex-none w-[34px] h-[34px] rounded bg-[#0f1723] text-[color:var(--c)] grid place-items-center text-base" aria-hidden="true"><Icon name={r.icon} /></span>
                  <span>
                    <span className="block font-bold text-[12.5px] text-[color:var(--c)] tracking-[0.02em] uppercase dark:brightness-[1.35]">{r.label}</span>
                    <span className="block text-xs text-fg-muted leading-[1.45]">{r.desc}</span>
                  </span>
                </>
              );
              const cls = cx(
                "flex gap-2.5 px-3 py-2.5 w-full text-left text-fg bg-bg-raised border-[1.5px] rounded-[10px]", focusRing,
                hover === r.asset ? "border-[color:var(--c)]" : "border-line",
              );
              return r.device ? (
                <button key={r.asset} type="button" className={cx(cls, "cursor-pointer hover:border-[color:var(--c)]")} style={cv(r.color)} onClick={() => open(r)} {...hoverProps(r)}>{body}</button>
              ) : (
                <div key={r.asset} className={cls} style={cv(r.color)} onMouseEnter={() => setHover(r.asset)} onMouseLeave={() => setHover(null)}>{body}</div>
              );
            })}
          </div>

          {/* Center: rack chassis */}
          <div className="[--u:15px] bg-[linear-gradient(180deg,#23272e,#171a20)] border-[6px] border-[#14171c] rounded-[10px] shadow-lg pt-3 px-1.5 pb-2.5 min-w-0 overflow-x-auto" role="group" aria-label={`Rack ${rack.id} ${side} elevation`}>
            <div className="text-[#8b94a3] text-[10px] text-center mb-2 tracking-[0.18em] font-bold" aria-hidden="true">{side.toUpperCase()} · 42U</div>
            <div className="grid grid-cols-[22px_minmax(340px,1fr)_22px] gap-1">
              <div className={cx(railCol, railNums)} aria-hidden="true">
                {Array.from({ length: U_TOTAL }).map((_, i) => <span key={i}>{U_TOTAL - i}</span>)}
              </div>

              <div className={cx(railCol, "relative")}>
                {Array.from({ length: U_TOTAL }).map((_, i) => (
                  <span key={i} className="[grid-column:1] bg-[repeating-linear-gradient(90deg,#1b1f26_0_10px,#181c22_10px_20px)] border border-[#242932] rounded-[2px]" style={{ gridRow: `${i + 1} / span 1` }} aria-hidden="true" />
                ))}
                {units.map((r) => {
                  const rowStart = U_TOTAL - r.uTop + 1;
                  const span = r.uTop - r.uBottom + 1;
                  const cls = cx(
                    "[grid-column:1] z-[1] flex items-center gap-2 px-2 py-[3px] overflow-hidden text-left text-[#cbd5e1] border border-l-[3px] rounded-[3px]",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#93c5fd] focus-visible:outline-offset-1",
                    side === "rear" ? "bg-[linear-gradient(180deg,#232830_0%,#191d25_55%,#14181f_100%)]" : "bg-[linear-gradient(180deg,#2b303a_0%,#1d212a_55%,#171b23_100%)]",
                    hover === r.asset
                      ? "border-[color:var(--c)] shadow-[0_0_0_1px_var(--c),0_0_14px_color-mix(in_srgb,var(--c)_35%,transparent)]"
                      : "border-[#3a404b] border-l-[color:var(--c)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
                  );
                  const style = cv(r.color, { gridRow: `${rowStart} / span ${span}` });
                  const desc = `${nameOf(r)} · ${r.asset} · ${uLabel(r)} · ${r.model}${r.ip ? ` · ${r.ip}` : ""} · ${statusLabel(r.status)}`;
                  const face = (
                    <>
                      <Led c={statusColor(r.status)} />
                      {side === "front" ? <FrontFace r={r} /> : <RearFace r={r} upsRuntime={rack.upsRuntime} />}
                    </>
                  );
                  return r.device ? (
                    <button key={r.asset} type="button" className={cx(cls, "cursor-pointer")} style={style} title={desc} aria-label={`Open ${desc}`} onClick={() => open(r)} {...hoverProps(r)}>{face}</button>
                  ) : (
                    <div key={r.asset} className={cls} style={style} title={desc} role="img" aria-label={desc}
                      onMouseEnter={() => setHover(r.asset)} onMouseLeave={() => setHover(null)}>{face}</div>
                  );
                })}
              </div>

              <div className={cx(railCol, railNums)} aria-hidden="true">
                {Array.from({ length: U_TOTAL }).map((_, i) => <span key={i}>{U_TOTAL - i}</span>)}
              </div>
            </div>
            <div className="text-[#6b7380] text-[9px] text-center mt-[9px] font-mono" aria-hidden="true">argus-linkedeye · dc-blr-1 · {rack.id} · {rack.row.toLowerCase()}</div>
          </div>

          {/* Right: chips + asset callouts (wide screens; the inventory table carries the same data) */}
          <div className="hidden min-[1100px]:grid grid-rows-[repeat(42,calc(var(--u,15px)+2px))] items-center pt-[39px]" aria-hidden="true">
            {units.filter((r) => r.chip || r.ip).map((r) => {
              const rowStart = U_TOTAL - r.uTop + 1;
              const span = r.uTop - r.uBottom + 1;
              return (
                <span key={r.asset} className="flex items-center gap-1.5 min-w-0 p-0 border-0 bg-transparent text-fg-muted text-left before:content-[''] before:flex-none before:w-2.5 before:h-0.5 before:bg-[color:var(--c)]" style={cv(r.chip ? "var(--accent)" : r.color, { gridRow: `${rowStart} / span ${span}` })}
                  onMouseEnter={() => setHover(r.asset)} onMouseLeave={() => setHover(null)}>
                  {r.chip ? <span className={cx("bg-accent text-white text-[10px] font-bold tracking-[0.03em] rounded-[6px] px-[9px] py-1 whitespace-nowrap", hover === r.asset && "shadow-[0_0_0_2px_color-mix(in_srgb,var(--accent)_40%,transparent)]")}><Icon icon={ServerIcon} /> {r.chip}</span> : <span className="font-mono text-[9.5px] whitespace-nowrap overflow-hidden text-ellipsis">{r.asset}</span>}
                </span>
              );
            })}
          </div>
        </div>
      </Card>

      <div className={ui.split}>
        <Panel title={`Rack Inventory (${units.length})`}>
          {units.length ? (
            <Table>
                <thead><tr><th scope="col">Device</th><th scope="col">U</th><th scope="col">Model</th><th scope="col">Asset ID</th><th scope="col">IP</th><th scope="col">Status</th></tr></thead>
                <tbody>
                  {units.map((r) => (
                    <tr key={r.asset} className={hover === r.asset ? ui.rowSelected : undefined}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <span className="flex-none w-7 h-7 rounded grid place-items-center text-xs bg-bg-muted text-accent" aria-hidden="true"><Icon name={r.icon} /></span>
                          {r.device
                            ? <TextButton onClick={() => open(r)}>{nameOf(r)}</TextButton>
                            : <span className="font-medium">{nameOf(r)}</span>}
                        </div>
                      </td>
                      <td className={cellMono}>{uLabel(r)}</td>
                      <td>{r.model}</td>
                      <td className={cellMono}>{r.asset}</td>
                      <td className={cellMono}>{r.ip || "—"}</td>
                      <td><Pill tone={statusTone(r.status)}><PillDot />{statusLabel(r.status)}</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
          ) : (
            <Empty>This rack has no units recorded.</Empty>
          )}
        </Panel>

        <div className={ui.rail}>
          <Panel title="Rack Identity">
            <dl className={ui.dl}>
              <dt>Rack ID</dt><dd className={ui.mono}>RACK-{rack.id}</dd>
              <dt>Site</dt><dd>Bangalore DC-1</dd>
              <dt>Row · position</dt><dd>{rack.row} · Position {rack.id.replace("R", "")}</dd>
              <dt>Role</dt><dd>{rack.role}</dd>
              <dt>Total height</dt><dd>42U</dd>
              <dt>Occupied</dt><dd>{occupied}U / 42U</dd>
              <dt>Free U</dt><dd>{42 - occupied}U available</dd>
            </dl>
          </Panel>

          <Panel title="Power & Cooling">
            <dl className={ui.dl}>
              <dt>Power draw</dt><dd className={rack.powerKw / rack.capacityKw > 0.8 ? cellWarn : cellOk}>{rack.powerKw} kW</dd>
              <dt>Capacity</dt><dd>{rack.capacityKw} kW · {loadPct}%</dd>
              <dt>UPS runtime</dt><dd>{rack.upsRuntime}</dd>
              <dt>Inlet temp</dt><dd>{rack.inletC}°C</dd>
              <dt>Exhaust temp</dt><dd>{rack.exhaustC}°C</dd>
              <dt>Humidity</dt><dd>{rack.humidity}%</dd>
            </dl>
          </Panel>
        </div>
      </div>
    </Page>
  );
}
