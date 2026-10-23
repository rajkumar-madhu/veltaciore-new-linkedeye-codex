// Event intelligence: alert grouping & noise reduction
// Datadog / PagerDuty concept: raw alerts collapsed into incidents, grouping rules, suppression.
// There is no grouping API yet, so the page shows a labelled sample; every
// summary figure is derived from the sample rows below.
import React from "react";
import "@/styles/observe.css";
import { useNav } from "@/hooks/useNav";
import { Empty, PALETTE, Panel, Pill, StatCard, fmt } from "@/components/ld";
import type { Tone } from "@/components/ld";
import { Sparkline } from "@/components/MetricCharts";

type Strategy = "Intelligent" | "Content" | "Time";

const GROUPS: { title: string; count: number; svc: string; strat: Strategy; status: "open" | "ack" | "suppressed"; age: string; spark: number[] }[] = [
  { title: "Stripe connection pool exhaustion", count: 14, svc: "payments-api", strat: "Intelligent", status: "open", age: "6m", spark: [2, 3, 5, 8, 11, 13, 14] },
  { title: "k8s node memory pressure — pool-3", count: 9, svc: "platform", strat: "Content", status: "open", age: "18m", spark: [1, 2, 2, 4, 6, 7, 9] },
  { title: "Elevated p99 latency · checkout flow", count: 6, svc: "web-frontend", strat: "Time", status: "ack", age: "31m", spark: [1, 1, 3, 4, 5, 6, 6] },
  { title: "TLS cert expiry warnings (batch)", count: 23, svc: "edge-proxy", strat: "Content", status: "suppressed", age: "2h", spark: [4, 8, 12, 16, 19, 22, 23] },
  { title: "Disk usage > 80% · db-replica-02", count: 4, svc: "database", strat: "Intelligent", status: "open", age: "44m", spark: [1, 1, 2, 2, 3, 3, 4] },
];

const STRAT: Record<Strategy, { tone: Tone; icon: string; color: string }> = {
  Intelligent: { tone: "purple", icon: "fa-wand-magic-sparkles", color: "#7c4dff" },
  Content: { tone: "info", icon: "fa-align-left", color: "#2f6bff" },
  Time: { tone: "muted", icon: "fa-clock", color: "#0ea5e9" },
};
const STATUS: Record<string, { tone: Tone; icon: string; label: string }> = {
  open: { tone: "crit", icon: "fa-fire", label: "Open" },
  ack: { tone: "warn", icon: "fa-user-check", label: "Acknowledged" },
  suppressed: { tone: "muted", icon: "fa-bell-slash", label: "Suppressed" },
};

const RULES: { name: string; strat: Strategy; window: string; on: boolean }[] = [
  { name: "Collapse by service + alert name", strat: "Content", window: "5 min", on: true },
  { name: "Intelligent correlation (ML)", strat: "Intelligent", window: "rolling", on: true },
  { name: "Flapping detector — auto-resolve", strat: "Time", window: "10 min", on: true },
  { name: "Deploy-window mute · production", strat: "Time", window: "during deploys", on: false },
];

const NOISY = [
  { src: "prometheus-alertmanager", n: 1840 },
  { src: "datadog-monitors", n: 1120 },
  { src: "cloudwatch", n: 690 },
  { src: "blackbox-probes", n: 410 },
  { src: "custom-webhooks", n: 320 },
];

export default function AlertGroupingScreen() {
  const { setRoute } = useNav();

  const raw = GROUPS.reduce((s, g) => s + g.count, 0);
  const reduction = raw ? Math.round((1 - GROUPS.length / raw) * 100) : 0;
  const suppressed = GROUPS.filter((g) => g.status === "suppressed");
  const open = GROUPS.filter((g) => g.status === "open").length;
  const activeRules = RULES.filter((r) => r.on).length;
  const noisyMax = NOISY[0]?.n ?? 1;

  return (
    <div className="ld-dash">
      <nav className="ld-crumbs" aria-label="Breadcrumb">
        <button type="button" className="ld-link" onClick={() => setRoute("dashboard")}>Home</button>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <button type="button" className="ld-link" onClick={() => setRoute("alerts")}>Alerts</button>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <span>Alert grouping</span>
      </nav>

      <div className="ld-head">
        <div>
          <h1>Alert Grouping &amp; Noise Reduction</h1>
          <p>Raw alerts collapsed into actionable incidents by correlation and grouping rules</p>
        </div>
        <div className="ld-head-actions">
          <button type="button" className="ld-btn"><i className="fa-solid fa-flask" aria-hidden="true" /> Simulate</button>
          <button type="button" className="ld-btn"><i className="fa-solid fa-clock-rotate-left" aria-hidden="true" /> History</button>
          <button type="button" className="ld-btn ld-btn-primary"><i className="fa-solid fa-plus" aria-hidden="true" /> New rule</button>
        </div>
      </div>

      <div className="ld-card ld-metrics-off" role="note">
        <i className="fa-solid fa-flask" aria-hidden="true" />
        <div>
          <b>Sample data</b>
          <p className="ld-muted ld-small">Alert grouping is not connected to an event source yet. The groups, rules and sources below are illustrative; summary figures are computed from them.</p>
        </div>
      </div>

      <div className="ld-grid ld-grid-stats">
        <StatCard icon="fa-bell" tone="info" label="Raw alerts" value={fmt(raw)} note="before grouping" />
        <StatCard icon="fa-layer-group" tone="ok" label="After grouping" value={fmt(GROUPS.length)} note={`${reduction}% noise reduced`} />
        <StatCard icon="fa-bell-slash" tone="warn" label="Suppressed" value={fmt(suppressed.length)} note={`${fmt(suppressed.reduce((s, g) => s + g.count, 0))} raw alerts muted`} />
        <StatCard icon="fa-fire" tone="crit" label="Open after dedup" value={fmt(open)} note="need triage" />
      </div>

      <div className="ld-split">
        <div className="ld-rail">
          <Panel title={`Grouped alerts · ${GROUPS.length} groups from ${raw} raw`}>
            <div className="ld-table-wrap">
              <table className="ld-table">
                <thead>
                  <tr>
                    <th scope="col">Group</th>
                    <th scope="col">Service</th>
                    <th scope="col">Strategy</th>
                    <th scope="col">Trend</th>
                    <th scope="col">Status</th>
                    <th scope="col">Age</th>
                  </tr>
                </thead>
                <tbody>
                  {GROUPS.map((g) => {
                    const sm = STRAT[g.strat], st = STATUS[g.status];
                    return (
                      <tr key={g.title}>
                        <td className="ld-wrap">
                          <button type="button" className="ld-link ld-strong" onClick={() => setRoute("incident-detail")}>{g.title}</button>
                          <span className="ld-sub">{g.count} alerts collapsed → 1 incident</span>
                        </td>
                        <td className="ld-mono">{g.svc}</td>
                        <td><Pill tone={sm.tone}><i className={`fa-solid ${sm.icon}`} aria-hidden="true" /> {g.strat}</Pill></td>
                        <td><Sparkline points={g.spark.map((v, i) => [i, v])} color={sm.color} label={`${g.title} alert count`} /></td>
                        <td><Pill tone={st.tone}><i className={`fa-solid ${st.icon}`} aria-hidden="true" /> {st.label}</Pill></td>
                        <td className="ld-muted">{g.age}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title={`Grouping rules · ${activeRules} of ${RULES.length} active`}>
            <div className="ld-table-wrap">
              <table className="ld-table">
                <thead>
                  <tr><th scope="col">Rule</th><th scope="col">Strategy</th><th scope="col">Window</th><th scope="col">Enabled</th></tr>
                </thead>
                <tbody>
                  {RULES.map((r) => {
                    const sm = STRAT[r.strat];
                    return (
                      <tr key={r.name}>
                        <td className="ld-strong ld-wrap">{r.name}</td>
                        <td><Pill tone={sm.tone}><i className={`fa-solid ${sm.icon}`} aria-hidden="true" /> {r.strat}</Pill></td>
                        <td className="ld-muted">{r.window}</td>
                        <td><Pill tone={r.on ? "ok" : "muted"}>{r.on ? "On" : "Off"}</Pill></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        <div className="ld-rail">
          <Panel title="Noise reduction">
            <div className="ld-obs-big">{reduction}%</div>
            <p className="ld-muted ld-small ld-obs-center">of raw alerts folded into a group</p>
            <span className="ld-bar-track" role="img" aria-label={`${reduction}% noise reduced`}>
              <span className="ld-bar-fill" style={{ width: `${reduction}%`, background: "#16a34a" }} />
            </span>
            <div className="ld-obs-pair">
              <div><b>{fmt(raw)}</b>raw</div>
              <div><b>{fmt(GROUPS.length)}</b>shown</div>
            </div>
          </Panel>

          <Panel title="Top noisy sources">
            {NOISY.length ? (
              <ul className="ld-bars">
                {NOISY.map((n, i) => (
                  <li key={n.src}>
                    <span className="ld-bar-label ld-mono" title={n.src}>{n.src}</span>
                    <span className="ld-bar-track">
                      <span className="ld-bar-fill" style={{ width: `${(n.n / noisyMax) * 100}%`, background: PALETTE[i % PALETTE.length] }} />
                    </span>
                    <span className="ld-bar-value ld-bar-value-wide">{fmt(n.n)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No sources.</Empty>
            )}
          </Panel>

          <Panel title="Intelligent grouping">
            <dl className="ld-dl">
              <dt>Model</dt><dd className="ld-mono">correlation-v3</dd>
              <dt>Trained on</dt><dd>180 days of incident history</dd>
              <dt>Rules using it</dt><dd>{RULES.filter((r) => r.strat === "Intelligent" && r.on).length}</dd>
            </dl>
          </Panel>
        </div>
      </div>
    </div>
  );
}
