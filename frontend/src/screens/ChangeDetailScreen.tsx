// Change detail (CAB review).
// Ported from screens/change-detail.jsx; LinkedEye entity-detail layout.
import { useNav } from "@/hooks/useNav";
import { USERS } from "@/data/core";
import { Panel, Pill } from "@/components/ld";
import type { Tone } from "@/components/ld";

import { Tile, buttonClass, cx, toneText, ui } from "@/components/ui";
import { ddTone, entityTile, sd } from "@/components/RecordList";
import { Icon } from "@/components/Icon";
import { CheckIcon, ChevronRightIcon, GavelIcon, GitBranchIcon, MessageSquareIcon, XIcon } from "lucide-react";
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
    <div className={ui.page}>
      <nav className={ui.crumbs} aria-label="Breadcrumb">
        <button type="button" className={ui.link} onClick={() => setRoute("dashboard")}>Home</button>
        <Icon icon={ChevronRightIcon} />
        <button type="button" className={ui.link} onClick={() => setRoute("changes")}>Change Management</button>
        <Icon icon={ChevronRightIcon} />
        <span>{c.id}</span>
      </nav>

      <div className={sd.entityHead}>
        <div className={sd.entity}>
          <span className={entityTile(riskTone)} aria-hidden="true"><Icon icon={GitBranchIcon} /></span>
          <div>
            <span className={sd.number}>{c.id}</span>
            <h1 className={sd.entityTitle}>
              {c.title}
              <Pill tone="info"><Icon icon={GavelIcon} /> {c.state}</Pill>
              <Pill tone={riskTone}>{c.risk} risk</Pill>
            </h1>
            <p className={sd.entityMeta}>
              <span>{c.type} change</span>
              <span>Planned window: {c.window}</span>
              <span>Service: <span className={ui.mono}>{c.service}</span></span>
            </p>
          </div>
        </div>
        <div className={ui.headSide}>
          <div className={ui.headActions}>
            <button type="button" className={buttonClass()}><Icon icon={XIcon} /> Reject</button>
            <button type="button" className={buttonClass()}><Icon icon={MessageSquareIcon} /> Request Info</button>
            <button type="button" className={buttonClass("primary")}><Icon icon={CheckIcon} /> Approve</button>
          </div>
        </div>
      </div>

      <div className={cx(ui.grid, ui.cols[2])}>
        <Panel title="Change Request Details">
          <dl className={ui.dl}>
            <dt>Number</dt><dd className={ui.mono}>{c.id}</dd>
            <dt>Type</dt><dd>{c.type}</dd>
            <dt>Short description</dt><dd><b>{c.title}</b></dd>
            <dt>Category</dt><dd>Infrastructure</dd>
            <dt>Requested by</dt><dd>{userName(c.assignee)}</dd>
            <dt>Assignment group</dt><dd>Platform</dd>
            <dt>Configuration item</dt><dd className={ui.mono}>{c.service}</dd>
            <dt>Service</dt><dd>k8s-control-plane</dd>
            <dt>Risk</dt><dd><span className={toneText[riskTone]}>{c.risk}</span> · cluster-wide blast radius</dd>
            <dt>Impact</dt><dd>Production · multi-region</dd>
            <dt>Planned start</dt><dd>{c.window}</dd>
            <dt>Planned end</dt><dd>Sat Apr 27 · 04:00 UTC</dd>
          </dl>
        </Panel>

        <Panel title={`CAB Approvals (${approved} / ${APPROVALS.length})`}>
          <ul className={ui.activity}>
            {APPROVALS.map((a) => (
              <li key={a.who} className={ui.activityItem}>
                <Tile tone={a.state === "approved" ? "ok" : "warn"} size="sm">
                  <Icon name={a.state === "approved" ? "fa-check" : "fa-clock"} />
                </Tile>
                <span className={ui.activityText}>{userName(a.who)} · <span className="text-fg-muted">{a.role}</span></span>
                {a.state === "approved" ? <Pill tone="ok">approved</Pill> : <Pill tone="warn">pending</Pill>}
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className={cx(ui.grid, ui.cols[2])}>
        <Panel title="Implementation Plan">
          <ol className={sd.steps}>
            {PLAN.map((s, i) => (
              <li key={i} className={sd.step}><span className={sd.stepN} aria-hidden="true">{i + 1}</span><span>{s}</span></li>
            ))}
          </ol>
        </Panel>

        <Panel title="Risk Assessment (sample)">
          <dl className={ui.dl}>
            <dt>Blast radius</dt><dd className={ddTone.warn}>Cluster-wide</dd>
            <dt>Rollback time</dt><dd>≤ 5 min (planned)</dd>
            <dt>Peer review</dt><dd>{approved} / {APPROVALS.length} approvers</dd>
            <dt>Tests</dt><dd className={ddTone.ok}>Passing</dd>
          </dl>
        </Panel>
      </div>
    </div>
  );
}
