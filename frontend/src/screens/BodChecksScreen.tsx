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
import { Button, Crumbs, Page, PageHead, Table, cx, ui } from "@/components/ui";

import { Icon } from "@/components/Icon";
import { ChevronDownIcon, CircleCheckIcon, CircleXIcon, MailIcon, RefreshCwIcon, TriangleAlertIcon, UnplugIcon } from "lucide-react";
// Table cells keep the cell size (13px); the old mono class only set 12px outside tables.
const monoCell = "font-mono font-semibold";
// In table cells the old muted / status-text classes lost to the cell colour, so
// a cell stays fg in light mode; the status tone shows only in dark mode.
const CELL_TONE: Record<Tone, string> = {
  crit: "font-semibold dark:text-tone-crit", warn: "font-semibold dark:text-tone-warn", ok: "font-semibold dark:text-tone-ok",
  info: "", purple: "", muted: "",
};
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
  <Pill tone={ST_PILL[s].tone}><Icon name={ST_PILL[s].icon} /> {ST_PILL[s].label}</Pill>
);
const rowTone = (s: St) => (s === 0 || s === 3 ? "[&>td]:bg-critical-bg" : s === 1 ? "[&>td]:bg-warning-bg" : undefined);
const daysLevel = (days: number | null, warn: number, crit: number): Tone =>
  days == null ? "muted" : days < crit ? "crit" : days < warn ? "warn" : "ok";
/** Inside the mini stat boxes the tone only showed in dark mode (the box's own
 * dd colour won in light mode); kept that way. */
const DARK_INK: Record<Tone, string> = {
  crit: "dark:text-tone-crit", warn: "dark:text-tone-warn", ok: "dark:text-tone-ok", info: "", purple: "", muted: "",
};

// Collapsible section header button; the chevron turns when collapsed.
const toggleClass = cx(
  "inline-flex items-center gap-2 border-0 bg-transparent p-0 text-lg font-semibold text-fg cursor-pointer text-left",
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
  "[&_.ld-icon]:text-2xs [&_.ld-icon]:text-fg-muted [&_.ld-icon]:[transition:transform_.15s] [&[aria-expanded=false]_.ld-icon]:-rotate-90",
);
// Pipeline step icon: the old tile rule was overridden by the node's span rule
// (block, mono 11.5px, muted ink; tone ink in dark mode).
const flowTile = "block flex-none w-7 h-7 rounded-[8px] bg-tone-info-soft text-fg-muted dark:text-tone-info font-mono text-[11.5px] [overflow-wrap:anywhere]";
// Mini stat row (until expiry / expires / thresholds)
const mini = "grid grid-cols-[repeat(auto-fit,minmax(90px,1fr))] gap-2 m-0";
const miniBox = "px-2.5 py-2 rounded-sm bg-bg-muted min-w-0";
const miniDt = "text-[11.5px] text-fg-muted";
const miniDd = "mt-0.5 mb-0 text-lg font-bold text-fg tabular-nums";

/** Panel with a collapse toggle (keeps the old FormSection collapse behaviour). */
function Section({ id, title, badge, collapsed, onToggle, children }: {
  id: string; title: string; badge: string; collapsed?: boolean; onToggle: (id: string) => void; children: React.ReactNode;
}) {
  return (
    <section className={cx(ui.card, ui.panel)} aria-labelledby={`bod-${id}-h`}>
      <div className={ui.panelHead}>
        <h2 id={`bod-${id}-h`} className={ui.panelTitle}>
          <button type="button" className={toggleClass} aria-expanded={!collapsed} aria-controls={`bod-${id}-body`} onClick={() => onToggle(id)}>
            <Icon icon={ChevronDownIcon} /> {title}
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
    <Page>
      <Crumbs items={[{ label: "Home", onClick: () => setRoute("dashboard") }, { label: "BOD / EOD" }, { label: "BOD Checks" }]} />

      <PageHead
        title="Beginning-of-Day Checks"
        subtitle="URL, telnet and Kubernetes-SSL readiness for nextalpha-le-PROD · results go to Redis → RabbitMQ → notify"
        actions={
          <>
            {bodReady
              ? <Pill tone="ok"><Icon icon={CircleCheckIcon} /> BOD ready</Pill>
              : <Pill tone="crit"><Icon icon={CircleXIcon} /> BOD not ready · {red} down</Pill>}
            {amber > 0 && <Pill tone="warn"><Icon icon={TriangleAlertIcon} /> {amber} warning</Pill>}
            <Button disabled title="Not wired to the checker service yet"><Icon icon={RefreshCwIcon} /> Re-run BOD</Button>
            <Button disabled title="Not wired to the notify service yet"><Icon icon={MailIcon} /> Send summary</Button>
          </>
        }
      />

      {!live && (
        <div className={cx(ui.card, "flex items-start gap-3 px-4 py-3 border-l-4 border-l-warning text-sm text-fg leading-[1.5] [&_b]:text-fg [&>.ld-icon]:mt-[3px] [&>.ld-icon]:text-md [&>.ld-icon]:flex-none [&>.ld-icon]:text-warning")} role="status">
          <Icon icon={UnplugIcon} />
          <p><b>No results from /infra/bod-checks/.</b> Showing the reference target list from url.yaml / telnet.yaml with its last recorded results, not a live run.</p>
        </div>
      )}

      <div className={cx(ui.grid, ui.cols.stats)}>
        <StatCard icon="fa-list-check" tone="info" label="Checks" value={fmt(all.length)} note={`${URLS.length} URL · ${TELNET.length} telnet · 1 k8s`} />
        <StatCard icon="fa-circle-check" tone="ok" label="Healthy" value={fmt(green)} note="status 2 · reachable" />
        <StatCard icon="fa-triangle-exclamation" tone="warn" label="Warning" value={fmt(amber)} note="4xx or SSL < 45d" />
        <StatCard icon="fa-circle-xmark" tone="crit" label="Down / timeout" value={fmt(red)} note="status 0 / 3" />
      </div>

      <Panel title="BOD pipeline">
        {/* The separator between steps is the old Font Awesome arrow glyph (\f061), kept as it renders. */}
        <ol className="list-none flex flex-wrap items-stretch gap-2.5 [&>li+li]:before:content-['\f061'] [&>li+li]:before:[font-family:'Font_Awesome_6_Free'] [&>li+li]:before:font-black [&>li+li]:before:text-xs [&>li+li]:before:text-fg-faint max-sm:[&>li+li]:before:hidden" aria-label="BOD result pipeline">
          {flow.map(([ic, k, v]) => (
            <li key={k} className="flex items-center gap-2.5 max-sm:flex-[1_1_100%]">
              <div className="flex items-center gap-2.5 px-3 py-2 border border-line rounded bg-bg-muted min-w-0 max-sm:flex-1">
                <span className={flowTile} aria-hidden="true"><Icon name={ic} /></span>
                <div><b className="block text-sm text-fg">{k}</b><span className="block text-[11.5px] text-fg-muted font-mono [overflow-wrap:anywhere]">{v}</span></div>
              </div>
            </li>
          ))}
        </ol>
      </Panel>

      <Section id="url" title="URL checks" badge={`${URLS.length} endpoints`} collapsed={collapsed.url} onToggle={toggle}>
        <Table>
          <thead>
            <tr><th scope="col">URL</th><th scope="col">Code</th><th scope="col">SSL expiry</th><th scope="col">Days left</th><th scope="col">Status</th></tr>
          </thead>
          <tbody>
            {URLS.map((u) => (
              <tr key={u.url} className={rowTone(u.status)}>
                <td className={monoCell}>{u.url}</td>
                <td className={cx(monoCell, u.code === 200 && CELL_TONE.ok)}>{u.code || "—"}</td>
                <td className={monoCell}>{u.sslDate}</td>
                <td className={cx(monoCell, CELL_TONE[daysLevel(u.sslDays, 45, 10)])}>{u.sslDays == null ? (u.err ?? "—") : `${u.sslDays}d`}</td>
                <td>{pill(u.status)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Section>

      <div className={cx(ui.grid, ui.cols[2])}>
        <Section id="tel" title="Telnet / port checks" badge="reachability" collapsed={collapsed.tel} onToggle={toggle}>
          <Table>
            <thead><tr><th scope="col">Host</th><th scope="col">Port</th><th scope="col">Remark</th><th scope="col">Status</th></tr></thead>
            <tbody>
              {TELNET.map((t) => (
                <tr key={`${t.host}:${t.port}`} className={rowTone(t.status)}>
                  <td className={monoCell}>{t.host}</td>
                  <td className={monoCell}>{t.port}</td>
                  <td>{t.remark}</td>
                  <td>{pill(t.status)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Section>

        <Section id="k8s" title="Kubernetes SSL" badge="apiserver cert" collapsed={collapsed.k8s} onToggle={toggle}>
          <div className={ui.panelHead}>
            <span className={ui.mono}>{K8S.component}</span>
            {pill(K8S.status)}
          </div>
          <dl className={mini}>
            <div className={miniBox}><dt className={miniDt}>Until expiry</dt><dd className={cx(miniDd, DARK_INK[daysLevel(K8S.days, 30, 15)])}>{K8S.days}d</dd></div>
            <div className={miniBox}><dt className={miniDt}>Expires</dt><dd className={cx(miniDd, "font-mono")}>{K8S.expiry}</dd></div>
            <div className={miniBox}><dt className={miniDt}>Thresholds</dt><dd className={miniDd}>warn 30d · crit 15d</dd></div>
          </dl>
          <p className="text-xs text-fg-muted">kubeadm certs check-expiration · apiserver</p>
        </Section>
      </div>
    </Page>
  );
}
