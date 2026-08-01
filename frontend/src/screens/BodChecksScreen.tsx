// BOD Checks — beginning-of-day readiness, modelled on the real Finspot
// checkers: urlchecker.py (HTTP/WSS + SSL days-left, status 0/1/2/3),
// telnet_checker.py (host:port reachability) and k8s_ssl_check.py (apiserver
// cert expiry). Targets come from url.yaml / telnet.yaml (nextalpha PROD).
// Results feed Redis (BOD_* keys) → RabbitMQ (bod_update) → notify service.
import React from "react";
import { Kpi, FormSection } from "@/components/primitives";
import { useBodChecks } from "@/api/hooks";
import type { BodCheck } from "@/lib/types";
import { StatusPill, type PillTone } from "@/components/StatusPill";

// status model (from the checkers): 0 unreachable / SSL-critical (red),
// 1 HTTP-4xx / SSL-warn (amber), 2 OK (green), 3 timeout (grey-red).
type St = 0 | 1 | 2 | 3;
const ST_PILL: Record<St, { tone: PillTone; label: string; icon: string }> = {
  0: { tone: "crit", label: "Down", icon: "fa-circle-xmark" },
  1: { tone: "warn", label: "Warn", icon: "fa-triangle-exclamation" },
  2: { tone: "ok", label: "OK", icon: "fa-circle-check" },
  3: { tone: "muted", label: "Timeout", icon: "fa-clock" },
};
const pill = (s: St) => <StatusPill {...ST_PILL[s]} />;

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
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const toggle = (id: string) => setCollapsed((c) => ({ ...c, [id]: !c[id] }));

  // Live /infra/bod-checks/ (a flat BodCheck[]), reshaped by kind. Falls back
  // to the local seed when the backend is unreachable so the screen still renders.
  const rows: BodCheck[] = useBodChecks().data ?? [];
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

  return (
    <div className="page page-fade sn-dash">
      <div className="sn-breadcrumb">
        <a className="sn-link">Home</a><span className="sn-bc-sep">›</span>
        <a className="sn-link">Trading Ops</a><span className="sn-bc-sep">›</span>
        <span>BOD Checks</span>
      </div>

      <div className="sn-form-header">
        <div className="sn-form-title-row">
          <span className="sn-rec-number">BOD · nextalpha-le-PROD</span>
          {bodReady
            ? <span className="sn-pill svc-healthy"><i className="fa-solid fa-circle-check" /> BOD ready</span>
            : <span className="sn-pill prio-1"><i className="fa-solid fa-circle-xmark" /> BOD not ready · {red} down</span>}
          {amber > 0 && <span className="sn-pill state-progress"><i className="fa-solid fa-triangle-exclamation" /> {amber} warning</span>}
        </div>
        <div className="sn-form-title-meta">
          <div>
            <h1>Beginning-of-Day Checks</h1>
            <div className="sn-form-sub">URL · telnet · k8s-SSL readiness · site nextalpha · executed 06:15 IST · pushes to Redis → RabbitMQ → notify</div>
          </div>
          <div className="sn-form-actions">
            <button className="sn-btn"><i className="fa-solid fa-rotate" /> Re-run BOD</button>
            <button className="sn-btn"><i className="fa-solid fa-envelope" /> Send summary</button>
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 24px 0" }}>
        <div className="sn-kpi-strip">
          <Kpi l="Checks" v={all.length} s="21 URL · 1 telnet · 1 k8s" tone="neutral" />
          <Kpi l="Healthy" v={green} s="status 2 · reachable" tone="ok" />
          <Kpi l="Warning" v={amber} s="4xx or SSL < 45d" tone="warn" />
          <Kpi l="Down / timeout" v={red} s="status 0 / 3" tone="crit" />
        </div>
      </div>

      {/* BOD pipeline strip */}
      <div style={{ padding: "16px 24px 0" }}>
        <div className="card" style={{ background: "white", border: "1px solid #e5e8eb", borderRadius: 6, padding: "12px 18px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", fontSize: 12.5 }}>
          {[
            ["fa-list-check", "Checks", "url + telnet + k8s"],
            ["fa-database", "Redis", "nextalpha:BOD_URLChecker-…"],
            ["fa-rabbit", "RabbitMQ", "le_refresh · bod_update"],
            ["fa-bell", "Notify", "172.16.0.65:5003 · email"],
          ].map(([ic, k, v], i, arr) => (
            <React.Fragment key={k}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 28, height: 28, borderRadius: 6, background: "var(--accent)", color: "white", display: "grid", placeItems: "center" }}><i className={`fa-solid ${ic}`} /></span>
                <div><b style={{ color: "#0f1c3f" }}>{k}</b><div className="mono" style={{ fontSize: 10.5, color: "#8a94a3" }}>{v}</div></div>
              </div>
              {i < arr.length - 1 && <i className="fa-solid fa-arrow-right" style={{ color: "#c0c7d0" }} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div style={{ padding: "16px 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* URL checks */}
        <FormSection id="url" title="URL checks" badge={`${URLS.length} endpoints`} collapsed={collapsed.url} onToggle={toggle}>
          <table className="sn-list-table" style={{ fontSize: 12.5 }}>
            <thead>
              <tr><th>URL</th><th style={{ width: 90 }}>CODE</th><th style={{ width: 140 }}>SSL EXPIRY</th><th style={{ width: 100 }}>DAYS LEFT</th><th style={{ width: 110 }}>STATUS</th></tr>
            </thead>
            <tbody>
              {URLS.map((u) => (
                <tr key={u.url} style={{ background: u.status === 0 || u.status === 3 ? "#fef2f2" : u.status === 1 ? "#fffbeb" : undefined }}>
                  <td className="mono" style={{ color: "#0f1c3f", fontSize: 11.5 }}>{u.url}</td>
                  <td className="mono" style={{ color: u.code === 200 ? "#059669" : "#8a94a3" }}>{u.code || "—"}</td>
                  <td className="mono" style={{ color: "#475467", fontSize: 11.5 }}>{u.sslDate}</td>
                  <td className="mono" style={{ fontWeight: 700, color: u.sslDays == null ? "#8a94a3" : u.sslDays < 10 ? "#dc2626" : u.sslDays < 45 ? "#b45309" : "#059669" }}>
                    {u.sslDays == null ? (u.err ?? "—") : `${u.sslDays}d`}
                  </td>
                  <td>{pill(u.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </FormSection>

        {/* Telnet + K8s */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <FormSection id="tel" title="Telnet / port checks" badge="reachability" collapsed={collapsed.tel} onToggle={toggle}>
            <table className="sn-list-table" style={{ fontSize: 12.5 }}>
              <thead><tr><th>HOST</th><th style={{ width: 60 }}>PORT</th><th>REMARK</th><th style={{ width: 100 }}>STATUS</th></tr></thead>
              <tbody>
                {TELNET.map((t) => (
                  <tr key={`${t.host}:${t.port}`}>
                    <td className="mono" style={{ color: "#0f1c3f" }}>{t.host}</td>
                    <td className="mono" style={{ color: "#475467" }}>{t.port}</td>
                    <td style={{ color: "#475467" }}>{t.remark}</td>
                    <td>{pill(t.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </FormSection>

          <FormSection id="k8s" title="Kubernetes SSL" badge="apiserver cert" collapsed={collapsed.k8s} onToggle={toggle}>
            <div style={{ padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span className="mono" style={{ fontWeight: 700, color: "#0f1c3f" }}>{K8S.component}</span>
                {pill(K8S.status)}
              </div>
              <div style={{ display: "flex", gap: 20 }}>
                <div><div style={{ fontSize: 20, fontWeight: 800, color: K8S.days < 15 ? "#dc2626" : K8S.days < 30 ? "#b45309" : "#059669" }}>{K8S.days}d</div><div style={{ fontSize: 11, color: "#8a94a3" }}>until expiry</div></div>
                <div><div style={{ fontSize: 14, fontWeight: 600, color: "#475467", marginTop: 4 }} className="mono">{K8S.expiry}</div><div style={{ fontSize: 11, color: "#8a94a3" }}>warn 30d · crit 15d</div></div>
              </div>
              <div style={{ fontSize: 11, color: "#8a94a3", marginTop: 10 }}>kubeadm certs check-expiration · apiserver</div>
            </div>
          </FormSection>
        </div>
      </div>
    </div>
  );
}
