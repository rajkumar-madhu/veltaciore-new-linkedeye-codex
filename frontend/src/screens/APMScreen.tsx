// APM — application performance for one service (golden signals, slowest
// transactions, deployments, database operations, owner and alerts).
// No APM / tracing backend is connected yet, so every figure on this page is
// a labelled sample.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { USERS } from "@/data/core";
import { Panel, Pill, StatCard } from "@/components/ld";
import { Button, Card, Crumbs, Page, Table, Tile, cx, toneBg, toneText, ui } from "@/components/ui";
import type { Tone } from "@/components/ld";

import { Icon } from "@/components/Icon";
import { BellIcon, FlaskConicalIcon, GaugeIcon, RotateCcwIcon, Share2Icon } from "lucide-react";
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
// Status text in a table cell / figure box: in light mode the cell's own colour
// won (only the weight showed); in dark mode the status colour won.
const cellTone = { crit: "font-semibold dark:text-tone-crit", warn: "font-semibold dark:text-tone-warn", ok: "font-semibold dark:text-tone-ok" } as const;
const deltaClass = (d: string) => (d.startsWith("+") && d !== "+0%" ? cellTone.crit : d.startsWith("-") ? cellTone.ok : undefined);

// Entity page head (tile, title with pills, "|"-separated meta line).
const entityHead = "flex flex-wrap items-start justify-between gap-3";
const entity = "flex items-center gap-3.5 min-w-0";
const entityTile = "flex-none grid place-items-center w-14 h-14 rounded-[12px] text-5xl";
const entityTitle = cx(ui.h1, "flex items-center gap-2.5 flex-wrap");
const entityMeta = cx(ui.headSub, "flex flex-wrap gap-x-3.5 gap-y-1 [&>span+span]:before:content-['|'] [&>span+span]:before:mr-3.5 [&>span+span]:before:text-line-strong");
// Six-up stat row: 180px columns only. The old dense-card overrides never reached
// StatCard (already Tailwind), so ui.cols[6] would shrink the cards.
const sixUp = "grid-cols-[repeat(auto-fit,minmax(180px,1fr))]";
// Mono text in a table cell keeps the cell's 13px (the old mono class lost to it).
const cellMono = "font-mono font-semibold";

export default function APMScreen() {
  const { setRoute } = useNav();
  const owner = USERS.find((u) => u.id === "u1");
  const totalCalls = TRANSACTIONS.reduce((s, t) => s + t[2], 0);
  const weightedErr = totalCalls ? TRANSACTIONS.reduce((s, t) => s + t[2] * t[5], 0) / totalCalls : 0;

  return (
    <Page>
      <Crumbs items={[{ label: "Home", onClick: () => setRoute("dashboard") }, { label: "Application Catalog", onClick: () => setRoute("apm-catalog") }, { label: "checkout-api" }]} />

      <div className={entityHead}>
        <div className={entity}>
          <span className={cx(entityTile, toneBg.info)} aria-hidden="true"><Icon icon={GaugeIcon} /></span>
          <div>
            <h1 className={entityTitle}>
              checkout-api
              <Pill tone="muted">Sample data</Pill>
            </h1>
            <p className={entityMeta}>
              <span>Application performance</span>
              <span>Node.js</span>
              <span>production · v2.41</span>
            </p>
          </div>
        </div>
        <div className={ui.headSide}>
          <div className={ui.headActions}>
            <Button><Icon icon={Share2Icon} /> Share</Button>
            <Button><Icon icon={BellIcon} /> Add Alert</Button>
            <Button variant="primary"><Icon icon={RotateCcwIcon} /> Rollback v2.40</Button>
          </div>
        </div>
      </div>

      <Card className={ui.notice} role="note">
        <Icon icon={FlaskConicalIcon} />
        <div>
          <b>Sample data</b>
          <p className="text-fg-muted text-xs">No APM or tracing agent is reporting for this service yet. The signals, transactions and deployments below are illustrative.</p>
        </div>
      </Card>

      <div className={cx(ui.grid, sixUp)}>
        <StatCard icon="fa-stopwatch" tone="warn" label="Response time" value="418ms" note="average · sample" />
        <StatCard icon="fa-arrow-right-arrow-left" tone="info" label="Throughput" value={`${(totalCalls / 1000).toFixed(1)}k rpm`} note="sum of transactions" />
        <StatCard icon="fa-bug" tone={errTone(weightedErr)} label="Error rate" value={`${weightedErr.toFixed(2)}%`} note="call-weighted" />
        <StatCard icon="fa-face-smile" tone="warn" label="Apdex" value="0.62" note="target ≥ 0.85" />
        <StatCard icon="fa-chart-line" tone="warn" label="p95" value="842ms" note="target 500ms" />
        <StatCard icon="fa-server" tone="ok" label="Active hosts" value="14" note="sample" />
      </div>

      <div className={ui.split}>
        <div className={ui.rail}>
          <Panel title="Golden signals">
            <dl className={ui.dl}>
              <dt>Service</dt><dd className="font-medium">checkout-api</dd>
              <dt>Tier</dt><dd>Edge / Web</dd>
              <dt>Language</dt><dd>Node.js 20.11</dd>
              <dt>Framework</dt><dd>Express 4.18 · TypeScript</dd>
              <dt>Last deploy</dt><dd><b>v2.41</b> · 2h ago by ci-bot</dd>
              <dt>Compared to</dt><dd>v2.40 · regression detected</dd>
              <dt>Apdex target</dt><dd>≥ 0.85</dd>
              <dt>Current Apdex</dt><dd><span className={toneText.crit}>0.62 · breaching</span></dd>
            </dl>
          </Panel>

          <Panel title="Slowest transactions · by total time">
            <Table>
                <thead>
                  <tr><th scope="col">Endpoint</th><th scope="col">Type</th><th scope="col">Calls/min</th><th scope="col">Avg</th><th scope="col">p95</th><th scope="col">Err %</th></tr>
                </thead>
                <tbody>
                  {TRANSACTIONS.map((r) => (
                    <tr key={r[0]}>
                      <td className={cellMono}>{r[0]}</td>
                      <td><Pill tone={r[1] === "web" ? "info" : "muted"}>{r[1]}</Pill></td>
                      <td>{r[2]}</td>
                      <td>{r[3]}</td>
                      <td>{r[4]}</td>
                      <td><Pill tone={errTone(r[5])}>{r[5].toFixed(2)}%</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
          </Panel>

          <Panel title={`Recent deployments · ${DEPLOYS.length} in last 7d`}>
            <Table>
                <thead>
                  <tr><th scope="col">Version</th><th scope="col">Author</th><th scope="col">When</th><th scope="col">Commits</th><th scope="col">RT Δ</th><th scope="col">Err Δ</th><th scope="col">Outcome</th></tr>
                </thead>
                <tbody>
                  {DEPLOYS.map((r) => (
                    <tr key={r[0]}>
                      <td className={cellMono}>{r[0]}</td>
                      <td className={cellMono}>{r[1]}</td>
                      <td>{r[2]}</td>
                      <td>{r[3]}</td>
                      <td className={deltaClass(r[4])}>{r[4]}</td>
                      <td className={deltaClass(r[5])}>{r[5]}</td>
                      <td><Pill tone={outcomeTone(r[6])}>{r[6]}</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
          </Panel>

          <Panel title="Database operations · top by time">
            <Table>
                <thead>
                  <tr><th scope="col">Op</th><th scope="col">Table</th><th scope="col">Calls</th><th scope="col">Avg</th><th scope="col">p95</th><th scope="col">Status</th></tr>
                </thead>
                <tbody>
                  {DB_OPS.map((r) => (
                    <tr key={r[0] + r[1]}>
                      <td className={cellMono}>{r[0]}</td>
                      <td className={cellMono}>{r[1]}</td>
                      <td>{r[2]}</td>
                      <td className={r[5] === "slow" ? cellTone.crit : undefined}>{r[3]}</td>
                      <td>{r[4]}</td>
                      <td><Pill tone={r[5] === "slow" ? "crit" : "ok"}>{r[5]}</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
          </Panel>
        </div>

        <div className={ui.rail}>
          <Panel title="Service owner">
            <dl className={ui.dl}>
              <dt>Team</dt><dd>SRE Platform</dd>
              <dt>On-call</dt><dd>{owner ? <>{owner.name}<span className={ui.sub}>{owner.team}</span></> : "Unassigned"}</dd>
              <dt>Repo</dt><dd className={ui.mono}>finspot/checkout-api</dd>
              <dt>Runbook</dt><dd className={ui.mono}>KB-2114</dd>
            </dl>
          </Panel>
          <Panel title={`Active alerts (${ALERTS.length})`} action={{ label: "Alert console", onClick: () => setRoute("alerts") }}>
            <ul className={ui.activity}>
              {ALERTS.map(([t, since]) => (
                <li key={t} className={ui.activityItem}>
                  <Tile tone="crit" size="sm"><Icon icon={BellIcon} /></Tile>
                  <span className={ui.activityText}>{t} · <span className="text-fg-muted">triggered {since} ago</span></span>
                  <Pill tone="crit">critical</Pill>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </Page>
  );
}
