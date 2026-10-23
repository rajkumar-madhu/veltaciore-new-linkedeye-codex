// Change detail (CAB review).
// Ported from screens/change-detail.jsx; LinkedEye entity-detail layout.
import "@/styles/servicedesk.css";
import { useNav } from "@/hooks/useNav";
import { USERS } from "@/data/core";
import { Panel, Pill } from "@/components/ld";
import type { Tone } from "@/components/ld";

const RISK_TONE: Record<string, Tone> = { High: "crit", Medium: "warn", Low: "ok" };
const userName = (id: string | null | undefined) => USERS.find((u) => u.id === id)?.name ?? "Unassigned";

const PLAN = [
  "Drain traffic from us-east-1c control plane nodes",
  "Upgrade etcd cluster first (quorum preserved)",
  "Upgrade api-server in rolling fashion, 1 at a time",
  "Validate pod scheduling on canary namespace",
  "Flip traffic back; monitor for 15 minutes",
  "Proceed only if error rate < 0.1% — otherwise rollback",
];

const APPROVALS = [
  { who: "u2", role: "Platform Lead", state: "approved" },
  { who: "u5", role: "SRE Manager", state: "approved" },
  { who: "u8", role: "Security", state: "approved" },
  { who: "u1", role: "CAB Chair", state: "pending" },
  { who: "u7", role: "Ops Director", state: "pending" },
];

export default function ChangeDetailScreen() {
  const { setRoute } = useNav();
  const c = { id: "CHG-000004", title: "Kubernetes 1.29 control plane upgrade prod-west", state: "CAB Review", risk: "High", type: "Normal", window: "Sat Apr 27 · 02:00–04:00 UTC", assignee: "u2", service: "k8s-control" };
  const approved = APPROVALS.filter((a) => a.state === "approved").length;
  const riskTone = RISK_TONE[c.risk] ?? "muted";

  return (
    <div className="ld-dash">
      <nav className="ld-crumbs" aria-label="Breadcrumb">
        <button type="button" className="ld-link" onClick={() => setRoute("dashboard")}>Home</button>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <button type="button" className="ld-link" onClick={() => setRoute("changes")}>Change Management</button>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <span>{c.id}</span>
      </nav>

      <div className="ld-head ld-entity-head">
        <div className="ld-entity">
          <span className={`ld-tile ld-${riskTone}`} aria-hidden="true"><i className="fa-solid fa-code-branch" /></span>
          <div>
            <span className="ld-sd-number">{c.id}</span>
            <h1 className="ld-entity-title">
              {c.title}
              <Pill tone="info"><i className="fa-solid fa-gavel" aria-hidden="true" /> {c.state}</Pill>
              <Pill tone={riskTone}>{c.risk} risk</Pill>
            </h1>
            <p className="ld-entity-meta">
              <span>{c.type} change</span>
              <span>Planned window: {c.window}</span>
              <span>Service: <span className="ld-mono">{c.service}</span></span>
            </p>
          </div>
        </div>
        <div className="ld-head-side">
          <div className="ld-head-actions">
            <button type="button" className="ld-btn"><i className="fa-solid fa-xmark" aria-hidden="true" /> Reject</button>
            <button type="button" className="ld-btn"><i className="fa-solid fa-comment" aria-hidden="true" /> Request Info</button>
            <button type="button" className="ld-btn ld-btn-primary"><i className="fa-solid fa-check" aria-hidden="true" /> Approve</button>
          </div>
        </div>
      </div>

      <div className="ld-grid ld-grid-2">
        <Panel title="Change Request Details">
          <dl className="ld-dl">
            <dt>Number</dt><dd className="ld-mono">{c.id}</dd>
            <dt>Type</dt><dd>{c.type}</dd>
            <dt>Short description</dt><dd><b>{c.title}</b></dd>
            <dt>Category</dt><dd>Infrastructure</dd>
            <dt>Requested by</dt><dd>{userName(c.assignee)}</dd>
            <dt>Assignment group</dt><dd>Platform</dd>
            <dt>Configuration item</dt><dd className="ld-mono">{c.service}</dd>
            <dt>Service</dt><dd>k8s-control-plane</dd>
            <dt>Risk</dt><dd><span className={`ld-text-${riskTone}`}>{c.risk}</span> · cluster-wide blast radius</dd>
            <dt>Impact</dt><dd>Production · multi-region</dd>
            <dt>Planned start</dt><dd>{c.window}</dd>
            <dt>Planned end</dt><dd>Sat Apr 27 · 04:00 UTC</dd>
          </dl>
        </Panel>

        <Panel title={`CAB Approvals (${approved} / ${APPROVALS.length})`}>
          <ul className="ld-activity">
            {APPROVALS.map((a) => (
              <li key={a.who}>
                <span className={`ld-tile ld-tile-sm ld-${a.state === "approved" ? "ok" : "warn"}`} aria-hidden="true">
                  <i className={`fa-solid ${a.state === "approved" ? "fa-check" : "fa-clock"}`} />
                </span>
                <span className="ld-activity-text">{userName(a.who)} · <span className="ld-muted">{a.role}</span></span>
                {a.state === "approved" ? <Pill tone="ok">approved</Pill> : <Pill tone="warn">pending</Pill>}
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="ld-grid ld-grid-2">
        <Panel title="Implementation Plan">
          <ol className="ld-sd-steps">
            {PLAN.map((s, i) => (
              <li key={i}><span className="ld-sd-step-n" aria-hidden="true">{i + 1}</span><span>{s}</span></li>
            ))}
          </ol>
        </Panel>

        <Panel title="Risk Assessment (sample)">
          <dl className="ld-dl">
            <dt>Blast radius</dt><dd className="ld-text-warn">Cluster-wide</dd>
            <dt>Rollback time</dt><dd>≤ 5 min (planned)</dd>
            <dt>Peer review</dt><dd>{approved} / {APPROVALS.length} approvers</dd>
            <dt>Tests</dt><dd className="ld-text-ok">Passing</dd>
          </dl>
        </Panel>
      </div>
    </div>
  );
}
