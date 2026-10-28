// Flow Designer — LinkedEye entity layout for one automation flow: header,
// properties, the step canvas (as a responsive vertical flow) and a rail with
// recent runs. There is no flow-execution endpoint yet, so run history and
// suggestions are labelled as sample data.
import { useNav } from "@/hooks/useNav";
import { USERS } from "@/data/core";
import { Panel, Pill, PillDot, StatCard, fmt } from "@/components/ld";
import { Button, Crumbs, Page, Tile, cx, toneBg, ui } from "@/components/ui";

import { Icon } from "@/components/Icon";
import { HistoryIcon, PlayIcon, TestTubeIcon, WorkflowIcon } from "lucide-react";
// Entity title row (was ld-head ld-entity-head / ld-entity / ld-tile ld-info)
const entityHead = "flex flex-wrap items-start justify-between gap-3";
const entity = "flex items-center gap-3.5 min-w-0";
const entityTile = cx("flex-none w-14 h-14 rounded-[12px] grid place-items-center text-5xl", toneBg.info);
const entityTitle = cx(ui.h1, "flex items-center gap-2.5 flex-wrap");
const entityMeta = cx(
  ui.headSub,
  "flex flex-wrap gap-x-3.5 gap-y-1 [&>span+span]:before:content-['|'] [&>span+span]:before:mr-3.5 [&>span+span]:before:text-line-strong",
);
// Flow canvas: vertical step list joined by connectors, then a parallel branch row (were ld-admin-flow / -branch / -node)
const flow = cx(
  "list-none flex flex-col items-center gap-0 m-0 py-2 px-0",
  "[&>li]:flex [&>li]:flex-col [&>li]:items-center [&>li]:w-full",
  "[&>li+li]:before:content-[''] [&>li+li]:before:block [&>li+li]:before:w-0.5 [&>li+li]:before:h-5.5 [&>li+li]:before:bg-line-strong",
);
const branch = "list-none m-0 grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3 w-full pt-3 border-t-2 border-line-strong";
const node = "flex items-start gap-2.5 py-2.5 px-3 border border-line border-l-4 rounded bg-bg-raised shadow-sm";

interface FlowStep { kind: "trigger" | "ai" | "logic" | "action"; icon: string; title: string; sub: string }

const NODE_COLOR: Record<FlowStep["kind"], string> = { trigger: "#2563eb", ai: "#8b5cf6", logic: "#f59e0b", action: "#6b7785" };

const MAIN_STEPS: FlowStep[] = [
  { kind: "trigger", icon: "fa-bolt", title: "Sev-1 declared", sub: "Trigger" },
  { kind: "ai", icon: "fa-wand-magic-sparkles", title: "AI correlate & RCA", sub: "Find similar in 90d" },
  { kind: "logic", icon: "fa-code-branch", title: "Has runbook?", sub: "Decision · KB match" },
];
const BRANCH_STEPS: FlowStep[] = [
  { kind: "action", icon: "fa-play", title: "Run runbook", sub: "pool-expansion-v3" },
  { kind: "action", icon: "fa-user-plus", title: "Page on-call", sub: "PagerDuty Tier 1" },
  { kind: "action", icon: "fa-comment", title: "Open war-room", sub: "Slack + Zoom" },
];
const STEP_COUNT = MAIN_STEPS.length + BRANCH_STEPS.length;

const SAMPLE_RUNS: [string, string, "success" | "failed"][] = [
  ["14m ago", "INC-48291", "success"],
  ["2h ago", "INC-48279", "success"],
  ["1d ago", "INC-48241", "success"],
  ["1d ago", "INC-48238", "failed"],
  ["2d ago", "INC-48201", "success"],
];

function FlowNode({ step, wide }: { step: FlowStep; wide?: boolean }) {
  const c = NODE_COLOR[step.kind];
  return (
    <div className={cx(node, wide ? "w-full" : "w-[min(100%,260px)]")} style={{ borderLeftColor: c }}>
      <Tile tone="muted" size="sm" style={{ color: c, background: `${c}20` }}><Icon className={`fa-solid ${step.icon}`} /></Tile>
      <span>
        <span className="text-sm font-semibold text-fg">{step.title}</span>
        <span className="block text-xs text-fg-muted">{step.sub}</span>
      </span>
    </div>
  );
}

export default function FlowScreen() {
  const { setRoute } = useNav();
  const owner = USERS.find((u) => u.id === "u1");
  const sampleOk = SAMPLE_RUNS.filter((r) => r[2] === "success").length;

  return (
    <Page>
      <Crumbs items={[{ label: "Home", onClick: () => setRoute("dashboard") }, { label: "Automation" }, { label: "Flow Designer" }]} />

      <div className={entityHead}>
        <div className={entity}>
          <span className={entityTile} aria-hidden="true"><Icon icon={WorkflowIcon} /></span>
          <div>
            <h1 className={entityTitle}>Sev-1 Auto-Response <Pill tone="ok"><PillDot />Active</Pill></h1>
            <p className={entityMeta}><span className={ui.mono}>FLOW-0042</span><span>Triggered when a Sev 1 is declared</span></p>
          </div>
        </div>
        <div className={ui.headSide}>
          <div className={ui.headActions}>
            <Button><Icon icon={HistoryIcon} /> History</Button>
            <Button><Icon icon={TestTubeIcon} /> Test Run</Button>
            <Button variant="primary"><Icon icon={PlayIcon} /> Activate</Button>
          </div>
        </div>
      </div>

      <div className={cx(ui.grid, ui.cols.stats)}>
        <StatCard icon="fa-list-ol" tone="info" label="Steps" value={fmt(STEP_COUNT)} note={`${BRANCH_STEPS.length} parallel actions`} />
        <StatCard icon="fa-bolt" tone="purple" label="Trigger" value="Sev-1" note="incident declared" />
        <StatCard icon="fa-toggle-on" tone="ok" label="State" value="Active" note="enabled" />
      </div>

      <div className={ui.split}>
        <div className={ui.rail}>
          <Panel title="Flow Properties">
            <dl className={ui.dl}>
              <dt>Name</dt><dd className="font-medium">Sev-1 Auto-Response</dd>
              <dt>Application</dt><dd>Incident Management</dd>
              <dt>Trigger</dt><dd>When Sev-1 incident declared</dd>
              <dt>Run as</dt><dd>System Service Account</dd>
              <dt>Owner</dt><dd>{owner?.name ?? "—"}</dd>
              <dt>Maintenance window</dt><dd>None</dd>
            </dl>
          </Panel>

          <section className={cx(ui.card, ui.panel)} aria-labelledby="flow-canvas-h">
            <div className={ui.panelHead}>
              <h2 className={ui.panelTitle} id="flow-canvas-h">Flow Canvas</h2>
              <span className="text-fg-muted text-xs">{STEP_COUNT} steps</span>
            </div>
            <ol className={flow} aria-label="Flow steps in order">
              {MAIN_STEPS.map((s) => (
                <li key={s.title}><FlowNode step={s} /></li>
              ))}
              <li>
                <ul className={branch} aria-label="Actions run in parallel">
                  {BRANCH_STEPS.map((s) => (
                    <li key={s.title}><FlowNode step={s} wide /></li>
                  ))}
                </ul>
              </li>
            </ol>
          </section>
        </div>

        <div className={ui.rail}>
          <section className={cx(ui.card, ui.panel)} aria-labelledby="flow-runs-h">
            <div className={ui.panelHead}>
              <h2 className={ui.panelTitle} id="flow-runs-h">Recent Runs</h2>
              <Pill tone="muted">Sample data</Pill>
            </div>
            <ul className={ui.activity}>
              {SAMPLE_RUNS.map(([t, inc, st], i) => (
                <li key={i} className={ui.activityItem}>
                  <span className={ui.activityText}><span className={ui.mono}>{inc}</span> <span className="text-fg-muted text-xs">· {t}</span></span>
                  <Pill tone={st === "success" ? "ok" : "crit"}><PillDot />{st}</Pill>
                </li>
              ))}
            </ul>
            <span className="text-fg-muted text-xs">{sampleOk} of {SAMPLE_RUNS.length} sample runs succeeded</span>
          </section>

          <section className={cx(ui.card, ui.panel)} aria-labelledby="flow-ai-h">
            <div className={ui.panelHead}>
              <h2 className={ui.panelTitle} id="flow-ai-h">AI Suggestions</h2>
              <Pill tone="muted">Sample data</Pill>
            </div>
            <p className="text-xs">Add an "Attach runbook link" step after paging on-call so responders land on the right playbook.</p>
          </section>
        </div>
      </div>

      <p className="text-fg-muted text-xs">Flow execution history is not connected to the backend yet.</p>
    </Page>
  );
}
