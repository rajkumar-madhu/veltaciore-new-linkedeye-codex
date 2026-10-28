// Host Map — at-a-glance fleet health as a hexagon grid (the Datadog
// infrastructure hostmap). Each hex is a host, filled by a chosen metric and
// grouped by datacenter/role. Hover or focus a hex for the host and its values.
//
// The fleet below is generated sample data (no host-metrics API feeds this
// screen yet), so the page is labelled "Sample data" throughout.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { Empty, Panel, Pill, StatCard } from "@/components/ld";
import { Card, Crumbs, Page, PageHead, cx, ui } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { FlaskConicalIcon, HexagonIcon } from "lucide-react";
// Segmented toggle (aria-pressed buttons).
const seg = "inline-flex border border-line-strong rounded overflow-hidden bg-bg-raised";
const segBtn = "border-0 bg-transparent text-sm font-semibold text-fg-muted px-3 min-h-9 cursor-pointer [button+&]:border-l [button+&]:border-line aria-pressed:bg-accent aria-pressed:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:-outline-offset-2";
const hexBtn = cx(
  "block w-full aspect-square p-0 border-0 bg-transparent cursor-pointer rounded-[6px]",
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-1",
  "[&_svg]:block [&_svg]:w-full [&_svg]:h-full",
  "[&_polygon]:stroke-bg-raised [&_polygon]:[stroke-width:2] [&_polygon]:hover:stroke-fg [&_polygon]:hover:[stroke-width:5] [&_polygon]:aria-pressed:stroke-fg [&_polygon]:aria-pressed:[stroke-width:5]",
  "[&_text]:fill-white [&_text]:text-3xl [&_text]:font-bold",
);

interface Host {
  name: string;
  dc: string;
  role: string;
  cpu: number;    // %
  mem: number;    // %
  load: number;   // 1m load avg
  status: "ok" | "warn" | "crit";
}

// Deterministic fleet across three datacenters and a few roles.
const ROLES = ["trading", "db", "k8s", "edge", "storage"];
const DCS = ["dc-blr-1", "dc-fra-1", "dc-nyc-1"];
function mkHosts(): Host[] {
  const out: Host[] = [];
  let n = 1;
  for (const dc of DCS) {
    const count = dc === "dc-blr-1" ? 34 : dc === "dc-fra-1" ? 22 : 16;
    for (let i = 0; i < count; i++) {
      const role = ROLES[(n + i) % ROLES.length];
      const cpu = Math.round(18 + ((n * 37 + i * 13) % 78));
      const mem = Math.round(30 + ((n * 19 + i * 29) % 65));
      const load = Math.round((0.4 + ((n * 7 + i * 11) % 40) / 10) * 10) / 10;
      const status: Host["status"] = cpu > 88 || mem > 92 ? "crit" : cpu > 75 || mem > 82 ? "warn" : "ok";
      out.push({ name: `${role}-${dc.split("-")[1]}${String(i + 1).padStart(2, "0")}`, dc, role, cpu, mem, load, status });
      n++;
    }
  }
  return out;
}
const HOSTS = mkHosts();

type Metric = "cpu" | "mem" | "load";
const METRIC_MAX: Record<Metric, number> = { cpu: 100, mem: 100, load: 6 };
const METRIC_LABEL: Record<Metric, string> = { cpu: "CPU", mem: "Memory", load: "Load 1m" };

// Green→amber→red fill by metric intensity.
const SCALE = ["#10b981", "#84cc16", "#f59e0b", "#f97316", "#dc2626"];
function fill(v: number, max: number): string {
  const t = Math.min(1, v / max);
  if (t < 0.5) return SCALE[0];
  if (t < 0.7) return SCALE[1];
  if (t < 0.82) return SCALE[2];
  if (t < 0.92) return SCALE[3];
  return SCALE[4];
}

// Pointy-top hexagon path in a 100×100 viewBox cell.
const HEX = "50,3 93,26 93,74 50,97 7,74 7,26";
const STATUS = { ok: { label: "OK", tone: "ok" }, warn: { label: "Warning", tone: "warn" }, crit: { label: "Critical", tone: "crit" } } as const;

export default function HostMapScreen() {
  const { setRoute } = useNav();
  const [metric, setMetric] = React.useState<Metric>("cpu");
  const [groupBy, setGroupBy] = React.useState<"dc" | "role">("dc");
  const [hover, setHover] = React.useState<Host | null>(null);

  const groups = groupBy === "dc" ? DCS : ROLES;
  const val = (h: Host) => (metric === "cpu" ? h.cpu : metric === "mem" ? h.mem : h.load);
  const unit = metric === "load" ? "" : "%";
  const crit = HOSTS.filter((h) => h.status === "crit").length;
  const warn = HOSTS.filter((h) => h.status === "warn").length;
  const avg = Math.round(HOSTS.reduce((s, h) => s + val(h), 0) / HOSTS.length * 10) / 10;

  return (
    <Page>
      <Crumbs items={[{ label: "Home", onClick: () => setRoute("dashboard") }, { label: "Monitoring", onClick: () => setRoute("infra") }, { label: "Host Map" }]} />

      <PageHead
        title={`Host Map · ${METRIC_LABEL[metric]}`}
        subtitle={`Fleet health across ${DCS.length} datacenters, filled by ${METRIC_LABEL[metric].toLowerCase()} and grouped by ${groupBy === "dc" ? "datacenter" : "role"}`}
        actions={
          <>
            <div className={seg} role="group" aria-label="Fill by metric">
              {(["cpu", "mem", "load"] as Metric[]).map((m) => (
                <button key={m} type="button" className={segBtn} aria-pressed={metric === m} onClick={() => setMetric(m)}>{METRIC_LABEL[m]}</button>
              ))}
            </div>
            <div className={seg} role="group" aria-label="Group by">
              {(["dc", "role"] as const).map((g) => (
                <button key={g} type="button" className={segBtn} aria-pressed={groupBy === g} onClick={() => setGroupBy(g)}>{g === "dc" ? "Datacenter" : "Role"}</button>
              ))}
            </div>
          </>
        }
      />

      <Card className="flex items-start gap-3 px-4 py-3 [&_.ld-icon]:text-2xl [&_.ld-icon]:text-fg-muted [&_.ld-icon]:mt-0.5 [&_b]:text-fg" role="note">
        <Icon icon={FlaskConicalIcon} />
        <div>
          <b>Sample data</b>
          <p className="text-fg-muted text-xs">This map shows a generated fleet to demonstrate the layout. It is not connected to live host metrics yet.</p>
        </div>
      </Card>

      <div className={cx(ui.grid, ui.cols.stats)}>
        <StatCard icon="fa-server" tone="info" label="Hosts (sample)" value={HOSTS.length} note={`${DCS.length} datacenters`} />
        <StatCard icon="fa-gauge-high" tone={avg > 75 ? "warn" : "ok"} label={`Avg ${METRIC_LABEL[metric].toLowerCase()} (sample)`} value={`${avg}${unit}`} note="across fleet" />
        <StatCard icon="fa-fire" tone="crit" label="Critical (sample)" value={crit} note="needs attention" />
        <StatCard icon="fa-triangle-exclamation" tone="warn" label="Warning (sample)" value={warn} note="elevated" />
      </div>

      <div className={ui.split}>
        <Card as="section" className={ui.panel} aria-labelledby="hexmap-h">
          <div className={ui.panelHead}>
            <h2 id="hexmap-h" className={ui.panelTitle}>Hosts by {groupBy === "dc" ? "datacenter" : "role"}</h2>
            <Pill tone="muted">Sample data</Pill>
          </div>
          {groups.map((g) => {
            const members = HOSTS.filter((h) => (groupBy === "dc" ? h.dc : h.role) === g);
            return (
              <div key={g} className="[&+&]:mt-4.5">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-fg m-0 mb-2 [&_.ld-icon]:text-accent"><Icon name={groupBy === "dc" ? "warehouse" : "layer-group"} /> {g} <span className="text-fg-muted text-xs">· {members.length} hosts</span></h3>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(44px,1fr))] gap-1 max-w-full">
                  {members.map((h) => (
                    <button key={h.name} type="button" className={hexBtn} aria-pressed={hover?.name === h.name}
                      aria-label={`${h.name}: ${METRIC_LABEL[metric]} ${val(h)}${unit}, ${STATUS[h.status].label}`}
                      onMouseEnter={() => setHover(h)} onMouseLeave={() => setHover(null)}
                      onFocus={() => setHover(h)} onBlur={() => setHover(null)}>
                      <svg viewBox="0 0 100 100" aria-hidden="true">
                        <polygon points={HEX} fill={fill(val(h), METRIC_MAX[metric])} />
                        <text x="50" y="58" textAnchor="middle">{Math.round(val(h))}</text>
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          <div className="flex items-center flex-wrap gap-1.5 text-xs text-fg-muted" aria-hidden="true">
            <span>low</span>
            {SCALE.map((c) => <span key={c} className="w-[26px] h-2.5 rounded-[2px]" style={{ background: c }} />)}
            <span>high {METRIC_LABEL[metric].toLowerCase()}{unit}</span>
          </div>
        </Card>

        <div className={cx(ui.rail, "sticky top-4")}>
          <Panel title={hover ? hover.name : "Host details"}>
            {hover ? (
              <div aria-live="polite">
                <p className="text-fg-muted text-xs">{hover.dc} · {hover.role}</p>
                {([["CPU", hover.cpu, "%", 100], ["Memory", hover.mem, "%", 100], ["Load 1m", hover.load, "", 6]] as const).map(([l, v, u, max]) => (
                  <div key={l} className="[&+&]:mt-2.5">
                    <div className="flex justify-between text-sm mb-1 text-fg-muted"><span>{l}</span><b className="text-fg">{v}{u}</b></div>
                    <span className={cx(ui.barTrack, "block")}>
                      <span className={ui.barFill} style={{ width: `${Math.min(100, (v / max) * 100)}%`, background: fill(v, max) }} />
                    </span>
                  </div>
                ))}
                <p className="text-xs mt-3">Status: <Pill tone={STATUS[hover.status].tone}>{STATUS[hover.status].label}</Pill></p>
              </div>
            ) : (
              <Empty>
                <Icon icon={HexagonIcon} /> Hover or focus a hex to inspect a host.
              </Empty>
            )}
          </Panel>
        </div>
      </div>
    </Page>
  );
}
