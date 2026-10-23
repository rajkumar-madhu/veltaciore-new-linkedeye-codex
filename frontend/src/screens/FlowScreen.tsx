// Flow Designer — LinkedEye entity layout for one automation flow: header,
// properties, the step canvas (as a responsive vertical flow) and a rail with
// recent runs. There is no flow-execution endpoint yet, so run history and
// suggestions are labelled as sample data.
import "@/styles/admin.css";
import { useNav } from "@/hooks/useNav";
import { USERS } from "@/data/core";
import { Panel, Pill, StatCard, fmt } from "@/components/ld";

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

function FlowNode({ step }: { step: FlowStep }) {
  const c = NODE_COLOR[step.kind];
  return (
    <div className="ld-admin-node" style={{ ["--node" as string]: c }}>
      <span className="ld-tile ld-tile-sm" style={{ color: c, background: `${c}20` }} aria-hidden="true"><i className={`fa-solid ${step.icon}`} /></span>
      <span>
        <span className="ld-admin-node-title">{step.title}</span>
        <span className="ld-admin-node-sub">{step.sub}</span>
      </span>
    </div>
  );
}

export default function FlowScreen() {
  const { setRoute } = useNav();
  const owner = USERS.find((u) => u.id === "u1");
  const sampleOk = SAMPLE_RUNS.filter((r) => r[2] === "success").length;

  return (
    <div className="ld-dash">
      <nav className="ld-crumbs" aria-label="Breadcrumb">
        <button type="button" className="ld-link" onClick={() => setRoute("dashboard")}>Home</button>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <span>Automation</span>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <span>Flow Designer</span>
      </nav>

      <div className="ld-head ld-entity-head">
        <div className="ld-entity">
          <span className="ld-tile ld-info" aria-hidden="true"><i className="fa-solid fa-diagram-project" /></span>
          <div>
            <h1 className="ld-entity-title">Sev-1 Auto-Response <Pill tone="ok"><span className="ld-pill-dot" />Active</Pill></h1>
            <p className="ld-entity-meta ld-muted"><span className="ld-mono">FLOW-0042</span><span>Triggered when a Sev 1 is declared</span></p>
          </div>
        </div>
        <div className="ld-head-side">
          <div className="ld-head-actions">
            <button type="button" className="ld-btn"><i className="fa-solid fa-clock-rotate-left" aria-hidden="true" /> History</button>
            <button type="button" className="ld-btn"><i className="fa-solid fa-vial" aria-hidden="true" /> Test Run</button>
            <button type="button" className="ld-btn ld-btn-primary"><i className="fa-solid fa-play" aria-hidden="true" /> Activate</button>
          </div>
        </div>
      </div>

      <div className="ld-grid ld-grid-stats">
        <StatCard icon="fa-list-ol" tone="info" label="Steps" value={fmt(STEP_COUNT)} note={`${BRANCH_STEPS.length} parallel actions`} />
        <StatCard icon="fa-bolt" tone="purple" label="Trigger" value="Sev-1" note="incident declared" />
        <StatCard icon="fa-toggle-on" tone="ok" label="State" value="Active" note="enabled" />
      </div>

      <div className="ld-split">
        <div className="ld-rail">
          <Panel title="Flow Properties">
            <dl className="ld-dl">
              <dt>Name</dt><dd className="ld-strong">Sev-1 Auto-Response</dd>
              <dt>Application</dt><dd>Incident Management</dd>
              <dt>Trigger</dt><dd>When Sev-1 incident declared</dd>
              <dt>Run as</dt><dd>System Service Account</dd>
              <dt>Owner</dt><dd>{owner?.name ?? "—"}</dd>
              <dt>Maintenance window</dt><dd>None</dd>
            </dl>
          </Panel>

          <section className="ld-card ld-panel" aria-labelledby="flow-canvas-h">
            <div className="ld-panel-head">
              <h2 id="flow-canvas-h">Flow Canvas</h2>
              <span className="ld-muted ld-small">{STEP_COUNT} steps</span>
            </div>
            <ol className="ld-admin-flow" aria-label="Flow steps in order">
              {MAIN_STEPS.map((s) => (
                <li key={s.title}><FlowNode step={s} /></li>
              ))}
              <li>
                <ul className="ld-admin-branch" aria-label="Actions run in parallel">
                  {BRANCH_STEPS.map((s) => (
                    <li key={s.title}><FlowNode step={s} /></li>
                  ))}
                </ul>
              </li>
            </ol>
          </section>
        </div>

        <div className="ld-rail">
          <section className="ld-card ld-panel" aria-labelledby="flow-runs-h">
            <div className="ld-panel-head">
              <h2 id="flow-runs-h">Recent Runs</h2>
              <Pill tone="muted">Sample data</Pill>
            </div>
            <ul className="ld-activity">
              {SAMPLE_RUNS.map(([t, inc, st], i) => (
                <li key={i}>
                  <span className="ld-activity-text"><span className="ld-mono">{inc}</span> <span className="ld-muted ld-small">· {t}</span></span>
                  <Pill tone={st === "success" ? "ok" : "crit"}><span className="ld-pill-dot" />{st}</Pill>
                </li>
              ))}
            </ul>
            <span className="ld-muted ld-small">{sampleOk} of {SAMPLE_RUNS.length} sample runs succeeded</span>
          </section>

          <section className="ld-card ld-panel" aria-labelledby="flow-ai-h">
            <div className="ld-panel-head">
              <h2 id="flow-ai-h">AI Suggestions</h2>
              <Pill tone="muted">Sample data</Pill>
            </div>
            <p className="ld-small">Add an "Attach runbook link" step after paging on-call so responders land on the right playbook.</p>
          </section>
        </div>
      </div>

      <p className="ld-muted ld-small">Flow execution history is not connected to the backend yet.</p>
    </div>
  );
}
