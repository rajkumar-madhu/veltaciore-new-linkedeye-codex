// BOD Checks — beginning-of-day readiness, modelled on the real Finspot
// checkers: urlchecker.py (HTTP/WSS + SSL days-left, status 0/1/2/3),
// telnet_checker.py (host:port reachability) and k8s_ssl_check.py (apiserver
// cert expiry). Targets come from url.yaml / telnet.yaml (nextalpha PROD).
// Results feed Redis (BOD_* keys) → RabbitMQ (bod_update) → notify service.
import React from "react";
import { useBodChecks } from "@/api/hooks";
import type { BodCheck } from "@/lib/types";
import { useNav } from "@/hooks/useNav";
import { Panel, Pill, StatCard, fmt } from "@/components/ld";
import type { Tone } from "@/components/ld";
import "@/styles/trading.css";

// status model (from the checkers): 0 unreachable / SSL-critical (red),
// 1 HTTP-4xx / SSL-warn (amber), 2 OK (green), 3 timeout (grey-red).
type St = 0 | 1 | 2 | 3;
const ST_PILL: Record<St, { tone: Tone; label: string; icon: string }> = {
  0: { tone: "crit", label: "Down", icon: "fa-circle-xmark" },
  1: { tone: "warn", label: "Warn", icon: "fa-triangle-exclamation" },
  2: { tone: "ok", label: "OK", icon: "fa-circle-check" },
  3: { tone: "muted", label: "Timeout", icon: "fa-clock" },
};
const pill = (s: St) => (
  <Pill tone={ST_PILL[s].tone}><i className={`fa-solid ${ST_PILL[s].icon}`} aria-hidden="true" /> {ST_PILL[s].label}</Pill>
);
const rowTone = (s: St) => (s === 0 || s === 3 ? "ld-trading-row-crit" : s === 1 ? "ld-trading-row-warn" : undefined);
const daysTone = (days: number | null, warn: number, crit: number) =>
  days == null ? "ld-muted" : days < crit ? "ld-text-crit" : days < warn ? "ld-text-warn" : "ld-text-ok";

/** Panel with a collapse toggle (keeps the old FormSection collapse behaviour). */
function Section({ id, title, badge, collapsed, onToggle, children }: {
  id: string; title: string; badge: string; collapsed?: boolean; onToggle: (id: string) => void; children: React.ReactNode;
}) {
  return (
    <section className="ld-card ld-panel" aria-labelledby={`bod-${id}-h`}>
      <div className="ld-panel-head">
        <h2 id={`bod-${id}-h`}>
          <button type="button" className="ld-trading-toggle" aria-expanded={!collapsed} aria-controls={`bod-${id}-body`} onClick={() => onToggle(id)}>
            <i className="fa-solid fa-chevron-down" aria-hidden="true" /> {title}
          </button>
        </h2>
        <Pill tone="muted">{badge}</Pill>
      </div>
      <div id={`bod-${id}-body`} hidden={collapsed}>{children}</div>
    </section>
  );
}

interface UrlCheck { url: string; code: number; sslDate: string; sslDays: number | null; status: St; err?: string; }
// Targets from url.yaml (nextalpha PROD). SSL thresholds: warn 45d, critical 10d.
const G = (url: string, days = 118): UrlCheck => ({ url, code: 200, sslDate: "Nov 19 2026", sslDays: days, status: 2 });
const SEED_URLS: UrlCheck[] = [
  G("https://elasticsearch-nextalpha.finspot.in"),
  G("https://dashboard-nextalpha.finspot.in"),
  G("https://neo4j-nextalpha.finspot.in"),
  G("https://gitea-nextalpha.finspot.in"),
  { url: "https://grafana-nextalpha.finspot.in", code: 200, sslDate: "Aug 24 2026", sslDays: 32, status: 1 },
  G("https://harbor-nextalpha.finspot.in"),
  G("https://jenkins-nextalpha.finspot.in/login"),
  G("https://keycloak-nextalpha.finspot.in"),
  G("https://kibana-nextalpha.finspot.in"),
  G("https://nextalpha-le-prod.finspot.in"),
  G("https://minio-nextalpha.finspot.in"),
  G("https://monitor-nextalpha.finspot.in"),
  G("https://rabbitmq-nextalpha.finspot.in"),
  G("https://nextalpha.finspot.in"),
  G("https://nexus-nextalpha.finspot.in"),
  G("https://prometheus-nextalpha.finspot.in"),
  G("https://alertmanager-nextalpha.finspot.in"),
  G("https://redmine-nextalpha.finspot.in"),
  { url: "https://sonarqube-nextalpha.finspot.in", code: 0, sslDate: "NA", sslDays: null, status: 3, err: "Request timed out" },
  G("https://stackstorm-nextalpha.finspot.in"),
  { url: "https://vault-nextalpha.finspot.in", code: 200, sslDate: "Jul 31 2026", sslDays: 8, status: 0, err: "SSL below critical (10d)" },
];

interface TelnetCheck { host: string; port: number; remark: string; status: St; msg: string; }
const SEED_TELNET: TelnetCheck[] = [
  { host: "154.210.168.116", port: 443, remark: "Web Server_443", status: 2, msg: "Connected" },
];

// k8s_ssl_check.py — apiserver cert (warn 30d, critical 15d).
const SEED_K8S = { component: "kube-apiserver", expiry: "Sep 08 2026", days: 47, status: 2 as St };

export default function BodChecksScreen() {
  const { setRoute } = useNav();
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const toggle = (id: string) => setCollapsed((c) => ({ ...c, [id]: !c[id] }));

  // Live /infra/bod-checks/ (a flat BodCheck[]), reshaped by kind. Falls back
  // to the local seed when the backend is unreachable so the screen still renders.
  const rows: BodCheck[] = useBodChecks().data ?? [];
  const live = rows.length > 0;
  const URLS: UrlCheck[] = rows.length
    ? rows.filter((r) => r.kind === "url").map((r) => ({ url: r.target, code: r.code ?? 0, sslDate: r.ssl_expiry || "NA", sslDays: r.ssl_days, status: r.status, err: r.note || undefined }))
    : SEED_URLS;
  const TELNET: TelnetCheck[] = rows.length
    ? rows.filter((r) => r.kind === "telnet").map((r) => ({ host: r.target, port: r.port ?? 0, remark: r.remark, status: r.status, msg: r.status === 2 ? "Connected" : "Failed" }))
    : SEED_TELNET;
  const k8sRow = rows.find((r) => r.kind === "k8s");
  const K8S = k8sRow ? { component: k8sRow.target, expiry: k8sRow.ssl_expiry, days: k8sRow.ssl_days ?? 0, status: k8sRow.status } : SEED_K8S;

  const all: St[] = [...URLS.map((u) => u.status), ...TELNET.map((t) => t.status), K8S.status];
  const green = all.filter((s) => s === 2).length;
  const amber = all.filter((s) => s === 1).length;
  const red = all.filter((s) => s === 0 || s === 3).length;
  const bodReady = red === 0;

  const flow: [string, string, string][] = [
    ["fa-list-check", "Checks", "url + telnet + k8s"],
    ["fa-database", "Redis", "nextalpha:BOD_URLChecker-…"],
    ["fa-envelope-open-text", "RabbitMQ", "le_refresh · bod_update"],
    ["fa-bell", "Notify", "172.16.0.65:5003 · email"],
  ];

  return (
    <div className="ld-dash">
      <nav className="ld-crumbs" aria-label="Breadcrumb">
        <button type="button" className="ld-link" onClick={() => setRoute("dashboard")}>Home</button>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <span>BOD / EOD</span>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <span>BOD Checks</span>
      </nav>

      <div className="ld-head">
        <div>
          <h1>Beginning-of-Day Checks</h1>
          <p>URL, telnet and Kubernetes-SSL readiness for nextalpha-le-PROD · results go to Redis → RabbitMQ → notify</p>
        </div>
        <div className="ld-head-actions">
          {bodReady
            ? <Pill tone="ok"><i className="fa-solid fa-circle-check" aria-hidden="true" /> BOD ready</Pill>
            : <Pill tone="crit"><i className="fa-solid fa-circle-xmark" aria-hidden="true" /> BOD not ready · {red} down</Pill>}
          {amber > 0 && <Pill tone="warn"><i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> {amber} warning</Pill>}
          <button type="button" className="ld-btn" disabled title="Not wired to the checker service yet"><i className="fa-solid fa-rotate" aria-hidden="true" /> Re-run BOD</button>
          <button type="button" className="ld-btn" disabled title="Not wired to the notify service yet"><i className="fa-solid fa-envelope" aria-hidden="true" /> Send summary</button>
        </div>
      </div>

      {!live && (
        <div className="ld-card ld-trading-note warn" role="status">
          <i className="fa-solid fa-plug-circle-xmark" aria-hidden="true" />
          <p><b>No results from /infra/bod-checks/.</b> Showing the reference target list from url.yaml / telnet.yaml with its last recorded results, not a live run.</p>
        </div>
      )}

      <div className="ld-grid ld-grid-stats">
        <StatCard icon="fa-list-check" tone="info" label="Checks" value={fmt(all.length)} note={`${URLS.length} URL · ${TELNET.length} telnet · 1 k8s`} />
        <StatCard icon="fa-circle-check" tone="ok" label="Healthy" value={fmt(green)} note="status 2 · reachable" />
        <StatCard icon="fa-triangle-exclamation" tone="warn" label="Warning" value={fmt(amber)} note="4xx or SSL < 45d" />
        <StatCard icon="fa-circle-xmark" tone="crit" label="Down / timeout" value={fmt(red)} note="status 0 / 3" />
      </div>

      <Panel title="BOD pipeline">
        <ol className="ld-trading-flow" aria-label="BOD result pipeline">
          {flow.map(([ic, k, v]) => (
            <li key={k}>
              <div className="ld-trading-flow-node">
                <span className="ld-tile ld-tile-sm ld-info" aria-hidden="true"><i className={`fa-solid ${ic}`} /></span>
                <div><b>{k}</b><span>{v}</span></div>
              </div>
            </li>
          ))}
        </ol>
      </Panel>

      <Section id="url" title="URL checks" badge={`${URLS.length} endpoints`} collapsed={collapsed.url} onToggle={toggle}>
        <div className="ld-table-wrap">
          <table className="ld-table">
            <thead>
              <tr><th scope="col">URL</th><th scope="col">Code</th><th scope="col">SSL expiry</th><th scope="col">Days left</th><th scope="col">Status</th></tr>
            </thead>
            <tbody>
              {URLS.map((u) => (
                <tr key={u.url} className={rowTone(u.status)}>
                  <td className="ld-mono">{u.url}</td>
                  <td className={`ld-mono ${u.code === 200 ? "ld-text-ok" : "ld-muted"}`}>{u.code || "—"}</td>
                  <td className="ld-mono ld-muted">{u.sslDate}</td>
                  <td className={`ld-mono ${daysTone(u.sslDays, 45, 10)}`}>{u.sslDays == null ? (u.err ?? "—") : `${u.sslDays}d`}</td>
                  <td>{pill(u.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <div className="ld-grid ld-grid-2">
        <Section id="tel" title="Telnet / port checks" badge="reachability" collapsed={collapsed.tel} onToggle={toggle}>
          <div className="ld-table-wrap">
            <table className="ld-table">
              <thead><tr><th scope="col">Host</th><th scope="col">Port</th><th scope="col">Remark</th><th scope="col">Status</th></tr></thead>
              <tbody>
                {TELNET.map((t) => (
                  <tr key={`${t.host}:${t.port}`} className={rowTone(t.status)}>
                    <td className="ld-mono">{t.host}</td>
                    <td className="ld-mono ld-muted">{t.port}</td>
                    <td className="ld-muted">{t.remark}</td>
                    <td>{pill(t.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="k8s" title="Kubernetes SSL" badge="apiserver cert" collapsed={collapsed.k8s} onToggle={toggle}>
          <div className="ld-panel-head">
            <span className="ld-mono">{K8S.component}</span>
            {pill(K8S.status)}
          </div>
          <dl className="ld-trading-mini">
            <div><dt>Until expiry</dt><dd className={daysTone(K8S.days, 30, 15)}>{K8S.days}d</dd></div>
            <div><dt>Expires</dt><dd className="ld-mono">{K8S.expiry}</dd></div>
            <div><dt>Thresholds</dt><dd className="ld-small">warn 30d · crit 15d</dd></div>
          </dl>
          <p className="ld-small ld-muted">kubeadm certs check-expiration · apiserver</p>
        </Section>
      </div>
    </div>
  );
}
