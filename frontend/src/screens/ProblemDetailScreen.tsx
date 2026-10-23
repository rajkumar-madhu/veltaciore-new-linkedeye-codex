// Problem detail.
// Ported from screens/problem-detail.jsx; LinkedEye entity-detail layout.
import "@/styles/servicedesk.css";
import { useNav } from "@/hooks/useNav";
import { INCIDENTS, USERS } from "@/data/core";
import { Panel, Pill } from "@/components/ld";
import type { Tone } from "@/components/ld";

const SEV_TONE: Record<number, Tone> = { 1: "crit", 2: "warn", 3: "info", 4: "ok" };
const PRI_LABEL: Record<number, string> = { 1: "Critical", 2: "High", 3: "Moderate", 4: "Low" };
const STATUS_TONE: Record<string, Tone> = { active: "crit", mitigating: "warn", investigating: "info", resolved: "ok" };
const userName = (id: string | null | undefined) => USERS.find((u) => u.id === id)?.name ?? "Unassigned";

export default function ProblemDetailScreen() {
  const { setRoute } = useNav();
  const p = { id: "PRB-000001", title: "Recurring SwitchPortFlapping on MGMT-SW Gi1/0/3", status: "Root cause analysis", priority: 1, assignee: "u2", created: "3 days ago", kb: null, impact: "High · Network · NOC" };
  const linked = INCIDENTS.slice(0, 4);

  return (
    <div className="ld-dash">
      <nav className="ld-crumbs" aria-label="Breadcrumb">
        <button type="button" className="ld-link" onClick={() => setRoute("dashboard")}>Home</button>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <button type="button" className="ld-link" onClick={() => setRoute("problems")}>Problem Management</button>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <span>{p.id}</span>
      </nav>

      <div className="ld-head ld-entity-head">
        <div className="ld-entity">
          <span className={`ld-tile ld-${SEV_TONE[p.priority]}`} aria-hidden="true"><i className="fa-solid fa-bug" /></span>
          <div>
            <span className="ld-sd-number">{p.id}</span>
            <h1 className="ld-entity-title">
              {p.title}
              <Pill tone={SEV_TONE[p.priority]}>P{p.priority} — {PRI_LABEL[p.priority]}</Pill>
              <Pill tone="info"><span className="ld-pill-dot" />{p.status}</Pill>
            </h1>
            <p className="ld-entity-meta">
              <span>Opened {p.created}</span>
              <span>{linked.length} incidents linked</span>
              <span>{p.impact}</span>
            </p>
          </div>
        </div>
        <div className="ld-head-side">
          <div className="ld-head-actions">
            <button type="button" className="ld-btn"><i className="fa-solid fa-link" aria-hidden="true" /> Link Incident</button>
            <button type="button" className="ld-btn"><i className="fa-solid fa-copy" aria-hidden="true" /> Clone</button>
            <button type="button" className="ld-btn ld-btn-primary"><i className="fa-solid fa-book" aria-hidden="true" /> Publish Known Error</button>
          </div>
        </div>
      </div>

      <div className="ld-grid ld-grid-2">
        <Panel title="Problem Identification">
          <dl className="ld-dl">
            <dt>Number</dt><dd className="ld-mono">{p.id}</dd>
            <dt>Priority</dt><dd><Pill tone={SEV_TONE[p.priority]}>P{p.priority} — {PRI_LABEL[p.priority]}</Pill></dd>
            <dt>Short description</dt><dd><b>{p.title}</b></dd>
            <dt>Category</dt><dd>Network · Switch port</dd>
            <dt>Service</dt><dd>MGMT-SW Gi1/0/3</dd>
            <dt>Configuration item</dt><dd className="ld-mono">CI-SW-08</dd>
          </dl>
        </Panel>
        <Panel title="Assignment">
          <dl className="ld-dl">
            <dt>Owner</dt><dd>{userName(p.assignee)}</dd>
            <dt>Assignment group</dt><dd>NOC — Network Ops</dd>
            <dt>Target RCA</dt><dd>Apr 28, 2026</dd>
            <dt>Known error</dt><dd>{p.kb ?? "Not published"}</dd>
          </dl>
        </Panel>
      </div>

      <Panel title="Root Cause Analysis (AI-synthesized sample)">
        <p className="ld-sd-entry-text">
          Across the {linked.length} linked incidents the common trigger is <b>SFP transceiver flap</b> on port Gi1/0/3 during peak traffic windows. Optical Rx levels approach receive threshold.
        </p>
        <ul className="ld-sd-list">
          <li><b>Five whys:</b> SFP module is past its 5-year recommended lifespan.</li>
          <li><b>Contributing:</b> No automated optical-monitoring threshold alert.</li>
          <li><b>Recommended fix:</b> Replace SFP and add DOM threshold alert in NMS.</li>
        </ul>
      </Panel>

      <Panel title={`Linked Incidents (${linked.length})`}>
        <div className="ld-table-wrap">
          <table className="ld-table">
            <thead>
              <tr><th scope="col">Number</th><th scope="col">Severity</th><th scope="col">Short description</th><th scope="col">Assigned to</th><th scope="col">Status</th></tr>
            </thead>
            <tbody>
              {linked.map(inc => (
                <tr key={inc.id}>
                  <td><button type="button" className="ld-link ld-mono" onClick={() => setRoute("incident-detail")}>{inc.id}</button></td>
                  <td><Pill tone={SEV_TONE[inc.sev] ?? "muted"}>Sev {inc.sev}</Pill></td>
                  <td className="ld-wrap ld-strong">{inc.title}</td>
                  <td>{userName(inc.assignee)}</td>
                  <td><Pill tone={STATUS_TONE[inc.status] ?? "muted"}><span className="ld-pill-dot" />{inc.status}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
