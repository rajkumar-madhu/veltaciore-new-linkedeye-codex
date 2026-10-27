// APM — application performance for one service (golden signals, slowest
// transactions, deployments, database operations, owner and alerts).
// No APM / tracing backend is connected yet, so every figure on this page is
// a labelled sample.
import React from "react";
import "@/styles/observe.css";
import { useNav } from "@/hooks/useNav";
import { USERS } from "@/data/core";
import { Panel, Pill, StatCard } from "@/components/ld";
import type { Tone } from "@/components/ld";

import { Icon } from "@/components/Icon";
import { BellIcon, ChevronRightIcon, FlaskConicalIcon, GaugeIcon, RotateCcwIcon, Share2Icon } from "lucide-react";
const TRANSACTIONS: [string, string, number, string, string, number][] = [
  ["POST /api/checkout", "web", 184, "418ms", "842ms", 2.14],
  ["POST /api/payments/charge", "web", 92, "684ms", "1.84s", 4.82],
  ["GET /api/orders/:id", "web", 684, "184ms", "412ms", 0.18],
  ["Stripe::charge_card", "background", 94, "2.14s", "2.84s", 4.82],
  ["POST /api/cart/items", "web", 1240, "92ms", "184ms", 0.02],
  ["GET /api/inventory", "web", 420, "210ms", "380ms", 0.92],
];

const DEPLOYS: [string, string, string, number, string, string, string][] = [
  ["v2.41", "ci-bot", "2h ago", 4, "+24%", "+184%", "regression"],
  ["v2.40", "marcus.o", "5h ago", 12, "-2%", "-8%", "improved"],
  ["v2.39", "ci-bot", "1d ago", 8, "+1%", "0%", "neutral"],
  ["v2.38", "priya.r", "2d ago", 32, "-18%", "-42%", "improved"],
];

const DB_OPS: [string, string, string, string, string, "good" | "slow"][] = [
  ["SELECT", "orders", "12.4k", "82ms", "184ms", "good"],
  ["UPDATE", "payments", "1.8k", "124ms", "680ms", "slow"],
  ["INSERT", "payment_events", "1.2k", "18ms", "32ms", "good"],
  ["SELECT *", "orders WHERE created_at > $1", "412", "842ms", "2.14s", "slow"],
];

const ALERTS: [string, string][] = [
  ["Apdex below 0.7", "12m"],
  ["Error rate > 1%", "12m"],
  ["Stripe ext err > 5%", "10m"],
];

const errTone = (v: number): Tone => (v > 2 ? "crit" : v > 0.5 ? "warn" : "ok");
const outcomeTone = (o: string): Tone => (o === "regression" ? "crit" : o === "improved" ? "ok" : "muted");
const deltaClass = (d: string) => (d.startsWith("+") && d !== "+0%" ? "ld-text-crit" : d.startsWith("-") ? "ld-text-ok" : "ld-muted");

export default function APMScreen() {
  const { setRoute } = useNav();
  const owner = USERS.find((u) => u.id === "u1");
  const totalCalls = TRANSACTIONS.reduce((s, t) => s + t[2], 0);
  const weightedErr = totalCalls ? TRANSACTIONS.reduce((s, t) => s + t[2] * t[5], 0) / totalCalls : 0;

  return (
    <div className="ld-dash">
      <nav className="ld-crumbs" aria-label="Breadcrumb">
        <button type="button" className="ld-link" onClick={() => setRoute("dashboard")}>Home</button>
        <Icon icon={ChevronRightIcon} />
        <button type="button" className="ld-link" onClick={() => setRoute("apm-catalog")}>Application Catalog</button>
        <Icon icon={ChevronRightIcon} />
        <span>checkout-api</span>
      </nav>

      <div className="ld-head ld-entity-head">
        <div className="ld-entity">
          <span className="ld-tile ld-info" aria-hidden="true"><Icon icon={GaugeIcon} /></span>
          <div>
            <h1 className="ld-entity-title">
              checkout-api
              <Pill tone="muted">Sample data</Pill>
            </h1>
            <p className="ld-entity-meta">
              <span>Application performance</span>
              <span>Node.js</span>
              <span>production · v2.41</span>
            </p>
          </div>
        </div>
        <div className="ld-head-side">
          <div className="ld-head-actions">
            <button type="button" className="ld-btn"><Icon icon={Share2Icon} /> Share</button>
            <button type="button" className="ld-btn"><Icon icon={BellIcon} /> Add Alert</button>
            <button type="button" className="ld-btn ld-btn-primary"><Icon icon={RotateCcwIcon} /> Rollback v2.40</button>
          </div>
        </div>
      </div>

      <div className="ld-card ld-metrics-off" role="note">
        <Icon icon={FlaskConicalIcon} />
        <div>
          <b>Sample data</b>
          <p className="ld-muted ld-small">No APM or tracing agent is reporting for this service yet. The signals, transactions and deployments below are illustrative.</p>
        </div>
      </div>

      <div className="ld-grid ld-grid-stats ld-grid-6">
        <StatCard icon="fa-stopwatch" tone="warn" label="Response time" value="418ms" note="average · sample" />
        <StatCard icon="fa-arrow-right-arrow-left" tone="info" label="Throughput" value={`${(totalCalls / 1000).toFixed(1)}k rpm`} note="sum of transactions" />
        <StatCard icon="fa-bug" tone={errTone(weightedErr)} label="Error rate" value={`${weightedErr.toFixed(2)}%`} note="call-weighted" />
        <StatCard icon="fa-face-smile" tone="warn" label="Apdex" value="0.62" note="target ≥ 0.85" />
        <StatCard icon="fa-chart-line" tone="warn" label="p95" value="842ms" note="target 500ms" />
        <StatCard icon="fa-server" tone="ok" label="Active hosts" value="14" note="sample" />
      </div>

      <div className="ld-split">
        <div className="ld-rail">
          <Panel title="Golden signals">
            <dl className="ld-dl">
              <dt>Service</dt><dd className="ld-strong">checkout-api</dd>
              <dt>Tier</dt><dd>Edge / Web</dd>
              <dt>Language</dt><dd>Node.js 20.11</dd>
              <dt>Framework</dt><dd>Express 4.18 · TypeScript</dd>
              <dt>Last deploy</dt><dd><b>v2.41</b> · 2h ago by ci-bot</dd>
              <dt>Compared to</dt><dd>v2.40 · regression detected</dd>
              <dt>Apdex target</dt><dd>≥ 0.85</dd>
              <dt>Current Apdex</dt><dd><span className="ld-text-crit">0.62 · breaching</span></dd>
            </dl>
          </Panel>

          <Panel title="Slowest transactions · by total time">
            <div className="ld-table-wrap">
              <table className="ld-table">
                <thead>
                  <tr><th scope="col">Endpoint</th><th scope="col">Type</th><th scope="col">Calls/min</th><th scope="col">Avg</th><th scope="col">p95</th><th scope="col">Err %</th></tr>
                </thead>
                <tbody>
                  {TRANSACTIONS.map((r) => (
                    <tr key={r[0]}>
                      <td className="ld-mono">{r[0]}</td>
                      <td><Pill tone={r[1] === "web" ? "info" : "muted"}>{r[1]}</Pill></td>
                      <td>{r[2]}</td>
                      <td>{r[3]}</td>
                      <td>{r[4]}</td>
                      <td><Pill tone={errTone(r[5])}>{r[5].toFixed(2)}%</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title={`Recent deployments · ${DEPLOYS.length} in last 7d`}>
            <div className="ld-table-wrap">
              <table className="ld-table">
                <thead>
                  <tr><th scope="col">Version</th><th scope="col">Author</th><th scope="col">When</th><th scope="col">Commits</th><th scope="col">RT Δ</th><th scope="col">Err Δ</th><th scope="col">Outcome</th></tr>
                </thead>
                <tbody>
                  {DEPLOYS.map((r) => (
                    <tr key={r[0]}>
                      <td className="ld-mono">{r[0]}</td>
                      <td className="ld-mono">{r[1]}</td>
                      <td className="ld-muted">{r[2]}</td>
                      <td>{r[3]}</td>
                      <td className={deltaClass(r[4])}>{r[4]}</td>
                      <td className={deltaClass(r[5])}>{r[5]}</td>
                      <td><Pill tone={outcomeTone(r[6])}>{r[6]}</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Database operations · top by time">
            <div className="ld-table-wrap">
              <table className="ld-table">
                <thead>
                  <tr><th scope="col">Op</th><th scope="col">Table</th><th scope="col">Calls</th><th scope="col">Avg</th><th scope="col">p95</th><th scope="col">Status</th></tr>
                </thead>
                <tbody>
                  {DB_OPS.map((r) => (
                    <tr key={r[0] + r[1]}>
                      <td className="ld-mono">{r[0]}</td>
                      <td className="ld-mono">{r[1]}</td>
                      <td>{r[2]}</td>
                      <td className={r[5] === "slow" ? "ld-text-crit" : undefined}>{r[3]}</td>
                      <td>{r[4]}</td>
                      <td><Pill tone={r[5] === "slow" ? "crit" : "ok"}>{r[5]}</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        <div className="ld-rail">
          <Panel title="Service owner">
            <dl className="ld-dl">
              <dt>Team</dt><dd>SRE Platform</dd>
              <dt>On-call</dt><dd>{owner ? <>{owner.name}<span className="ld-sub">{owner.team}</span></> : "Unassigned"}</dd>
              <dt>Repo</dt><dd className="ld-mono">finspot/checkout-api</dd>
              <dt>Runbook</dt><dd className="ld-mono">KB-2114</dd>
            </dl>
          </Panel>
          <Panel title={`Active alerts (${ALERTS.length})`} action={{ label: "Alert console", onClick: () => setRoute("alerts") }}>
            <ul className="ld-activity">
              {ALERTS.map(([t, since]) => (
                <li key={t}>
                  <span className="ld-tile ld-tile-sm ld-crit" aria-hidden="true"><Icon icon={BellIcon} /></span>
                  <span className="ld-activity-text">{t} · <span className="ld-muted">triggered {since} ago</span></span>
                  <Pill tone="crit">critical</Pill>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
