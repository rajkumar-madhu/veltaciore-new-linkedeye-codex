// Problem detail.
// Ported from screens/problem-detail.jsx; LinkedEye entity-detail layout.
import "@/styles/servicedesk.css";
import { useNav } from "@/hooks/useNav";
import { INCIDENTS, USERS } from "@/data/core";
import { Panel, Pill, PillDot } from "@/components/ld";
import type { Tone } from "@/components/ld";

import { buttonClass, cx, ui } from "@/components/ui";
import { entityTile, monoLink, sd } from "@/components/RecordList";
import { Icon } from "@/components/Icon";
import { BookIcon, BugIcon, ChevronRightIcon, CopyIcon, LinkIcon } from "lucide-react";
const SEV_TONE: Record<number, Tone> = { 1: "crit", 2: "warn", 3: "info", 4: "ok" };
const PRI_LABEL: Record<number, string> = { 1: "Critical", 2: "High", 3: "Moderate", 4: "Low" };
const STATUS_TONE: Record<string, Tone> = { active: "crit", mitigating: "warn", investigating: "info", resolved: "ok" };
const userName = (id: string | null | undefined) => USERS.find((u) => u.id === id)?.name ?? "Unassigned";

export default function ProblemDetailScreen() {
  const { setRoute } = useNav();
  const p = { id: "PRB-000001", title: "Recurring SwitchPortFlapping on MGMT-SW Gi1/0/3", status: "Root cause analysis", priority: 1, assignee: "u2", created: "3 days ago", kb: null, impact: "High · Network · NOC" };
  const linked = INCIDENTS.slice(0, 4);

  return (
    <div className={ui.page}>
      <nav className={ui.crumbs} aria-label="Breadcrumb">
        <button type="button" className={ui.link} onClick={() => setRoute("dashboard")}>Home</button>
        <Icon icon={ChevronRightIcon} />
        <button type="button" className={ui.link} onClick={() => setRoute("problems")}>Problem Management</button>
        <Icon icon={ChevronRightIcon} />
        <span>{p.id}</span>
      </nav>

      <div className={sd.entityHead}>
        <div className={sd.entity}>
          <span className={entityTile(SEV_TONE[p.priority])} aria-hidden="true"><Icon icon={BugIcon} /></span>
          <div>
            <span className={sd.number}>{p.id}</span>
            <h1 className={sd.entityTitle}>
              {p.title}
              <Pill tone={SEV_TONE[p.priority]}>P{p.priority} — {PRI_LABEL[p.priority]}</Pill>
              <Pill tone="info"><PillDot />{p.status}</Pill>
            </h1>
            <p className={sd.entityMeta}>
              <span>Opened {p.created}</span>
              <span>{linked.length} incidents linked</span>
              <span>{p.impact}</span>
            </p>
          </div>
        </div>
        <div className={ui.headSide}>
          <div className={ui.headActions}>
            <button type="button" className={buttonClass()}><Icon icon={LinkIcon} /> Link Incident</button>
            <button type="button" className={buttonClass()}><Icon icon={CopyIcon} /> Clone</button>
            <button type="button" className={buttonClass("primary")}><Icon icon={BookIcon} /> Publish Known Error</button>
          </div>
        </div>
      </div>

      <div className={cx(ui.grid, ui.cols[2])}>
        <Panel title="Problem Identification">
          <dl className={ui.dl}>
            <dt>Number</dt><dd className={ui.mono}>{p.id}</dd>
            <dt>Priority</dt><dd><Pill tone={SEV_TONE[p.priority]}>P{p.priority} — {PRI_LABEL[p.priority]}</Pill></dd>
            <dt>Short description</dt><dd><b>{p.title}</b></dd>
            <dt>Category</dt><dd>Network · Switch port</dd>
            <dt>Service</dt><dd>MGMT-SW Gi1/0/3</dd>
            <dt>Configuration item</dt><dd className={ui.mono}>CI-SW-08</dd>
          </dl>
        </Panel>
        <Panel title="Assignment">
          <dl className={ui.dl}>
            <dt>Owner</dt><dd>{userName(p.assignee)}</dd>
            <dt>Assignment group</dt><dd>NOC — Network Ops</dd>
            <dt>Target RCA</dt><dd>Apr 28, 2026</dd>
            <dt>Known error</dt><dd>{p.kb ?? "Not published"}</dd>
          </dl>
        </Panel>
      </div>

      <Panel title="Root Cause Analysis (AI-synthesized sample)">
        <p className={sd.entryText}>
          Across the {linked.length} linked incidents the common trigger is <b>SFP transceiver flap</b> on port Gi1/0/3 during peak traffic windows. Optical Rx levels approach receive threshold.
        </p>
        <ul className={sd.list}>
          <li><b>Five whys:</b> SFP module is past its 5-year recommended lifespan.</li>
          <li><b>Contributing:</b> No automated optical-monitoring threshold alert.</li>
          <li><b>Recommended fix:</b> Replace SFP and add DOM threshold alert in NMS.</li>
        </ul>
      </Panel>

      <Panel title={`Linked Incidents (${linked.length})`}>
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr><th scope="col">Number</th><th scope="col">Severity</th><th scope="col">Short description</th><th scope="col">Assigned to</th><th scope="col">Status</th></tr>
            </thead>
            <tbody>
              {linked.map(inc => (
                <tr key={inc.id}>
                  <td><button type="button" className={monoLink} onClick={() => setRoute("incident-detail")}>{inc.id}</button></td>
                  <td><Pill tone={SEV_TONE[inc.sev] ?? "muted"}>Sev {inc.sev}</Pill></td>
                  <td className={cx(ui.cellWrap, "font-medium")}>{inc.title}</td>
                  <td>{userName(inc.assignee)}</td>
                  <td><Pill tone={STATUS_TONE[inc.status] ?? "muted"}><PillDot />{inc.status}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
