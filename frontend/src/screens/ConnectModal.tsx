// screens/connect-modal.jsx — credential-aware "Connect integration" flow.
// Pasting an API key / token wires up metric ingestion AND alert→incident
// automation automatically — the way Datadog / PagerDuty / Prometheus do.
// Ported from screens/connect-modal.jsx.
import React from "react";
import type { Integration } from "@/lib/types";

import { Icon } from "@/components/Icon";
import { cx } from "@/components/ui";
import { ActivityIcon, CheckIcon, LoaderCircleIcon, LockIcon, PlugIcon, PlugZapIcon, SlidersHorizontalIcon, TriangleAlertIcon, XIcon } from "lucide-react";
// Modal shell, form rows, automation cards and success pipeline
// (were the prototype le-modal-* / le-field / le-auto-* / le-pipe-* / sn-btn classes).
const m = {
  backdrop: "fixed inset-0 bg-[rgba(10,20,51,0.5)] backdrop-blur-[3px] z-[1200] grid place-items-center py-10 px-5 overflow-y-auto",
  modal: "bg-bg-raised rounded-[12px] max-w-full shadow-pop border border-line overflow-hidden flex flex-col max-h-[calc(100vh-80px)] animate-[modalpop_0.16s_cubic-bezier(.2,.8,.3,1)]",
  head: "flex items-center gap-3 py-4 px-4.5 border-b border-line",
  icon: "w-[38px] h-[38px] rounded-[9px] grid place-items-center text-[17px] shrink-0",
  titles: "flex-1 min-w-0",
  title: "text-[15.5px] font-bold text-fg leading-[1.25] whitespace-nowrap overflow-hidden text-ellipsis",
  subtitle: "text-xs text-fg-subtle mt-0.5",
  close: "w-[30px] h-[30px] rounded-[7px] border border-line bg-bg-raised text-fg-subtle cursor-pointer grid place-items-center shrink-0 hover:bg-bg-muted hover:text-fg",
  body: "p-4.5 overflow-y-auto",
  foot: "flex items-center justify-end gap-2 py-[13px] px-4.5 border-t border-line bg-bg-muted flex-wrap",
};
const field = "mb-3.5 last:mb-0";
const fieldLabel = "block text-[11.5px] font-semibold text-fg-muted mb-[5px]";
const inputClass = (mono?: boolean) =>
  cx(
    "w-full py-2 px-2.5 border border-line-strong rounded-[7px] bg-bg-raised [outline:none] focus:border-brand-500 focus:shadow-[0_0_0_3px_var(--blue-50)]",
    mono ? "font-mono text-xs tabular-nums" : "font-sans text-sm",
  );
const snBtn = (primary?: boolean) =>
  cx(
    "inline-flex items-center gap-[5px] py-[5px] px-3 border text-xs font-medium rounded-[3px] cursor-pointer whitespace-nowrap [transition:all_.12s]",
    primary
      ? "![background:var(--brand-grad)] !border-transparent !text-white hover:brightness-[1.07] disabled:opacity-50 disabled:cursor-not-allowed"
      : "bg-white border-[#d2d6dc] text-[#424952] hover:bg-[#f4f6f9] hover:border-[#6b7785] hover:text-black",
  );
const auto = {
  card: (on: boolean) =>
    cx("flex gap-[11px] items-start p-3 border rounded-[9px] cursor-pointer [transition:border-color_.12s,background_.12s]", on ? "border-brand-500 bg-brand-50" : "border-line"),
  icon: (on: boolean) => cx("w-8 h-8 rounded grid place-items-center text-base shrink-0", on ? "bg-brand-600 text-white" : "bg-bg-muted text-fg-subtle"),
  text: "flex-1 min-w-0",
  textTitle: "text-sm text-fg block",
  textDesc: "text-[11.5px] text-fg-subtle leading-[1.45] block mt-0.5",
  switch: (on: boolean) =>
    cx(
      "w-[38px] h-[22px] rounded-[11px] relative shrink-0 mt-[3px] [transition:background_.14s]",
      "after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-[18px] after:h-[18px] after:rounded-full after:bg-white after:shadow-[0_1px_2px_rgba(0,0,0,.2)] after:[transition:transform_.14s]",
      on ? "bg-brand-600 after:translate-x-4" : "bg-line-strong",
    ),
};
const pipe = {
  row: "flex items-center gap-[11px] py-[11px] px-[13px] border border-line rounded-[9px] bg-bg-raised",
  dot: "inline-block w-[9px] h-[9px] rounded-full shrink-0",
  live: "bg-success shadow-[0_0_0_0_rgba(16,185,129,.5)] animate-[livepulse_1.6s_infinite]",
  ic: "w-[30px] h-[30px] rounded-[7px] grid place-items-center text-sm shrink-0",
  body: "flex-1 min-w-0",
  bodyTitle: "text-[12.5px] text-fg block",
  bodySub: "text-2xs text-fg-subtle",
  mono: "font-mono text-2xs text-fg-subtle whitespace-nowrap tabular-nums",
};

export interface CredField {
  key: string;
  label: string;
  req?: boolean;
  secret?: boolean;
  mono?: boolean;
  ph?: string;
  val?: string;
  select?: string[];
}

export interface CredSchema {
  blurb: string;
  fields: CredField[];
}

// Per-integration credential field schema. Falls back to a generic API-key form.
export function credSchema(name: string): CredSchema {
  const S: Record<string, CredSchema> = {
    "Prometheus": {
      blurb: "Point Argus-LinkedEye at your Prometheus HTTP API. We scrape series + read Alertmanager.",
      fields: [
        { key: "endpoint", label: "Server URL", req: true, mono: true, ph: "https://prometheus.finspot.in", val: "https://prometheus.finspot.in" },
        { key: "token", label: "Bearer token", secret: true, mono: true, ph: "(optional) bearer for protected /api/v1" },
        { key: "alertmgr", label: "Alertmanager URL", mono: true, ph: "https://alertmanager.finspot.in", val: "https://alertmanager.finspot.in" },
      ],
    },
    "Grafana": {
      blurb: "Connect with a Grafana service-account token to embed dashboards and read alert state.",
      fields: [
        { key: "endpoint", label: "Grafana URL", req: true, mono: true, ph: "https://grafana.finspot.in", val: "https://grafana.finspot.in" },
        { key: "token", label: "Service-account token", req: true, secret: true, mono: true, ph: "glsa_xxxxxxxxxxxxxxxx" },
      ],
    },
    "Grafana Loki": {
      blurb: "Stream logs from Loki. Multi-tenant deployments need the X-Scope-OrgID header.",
      fields: [
        { key: "endpoint", label: "Loki endpoint", req: true, mono: true, ph: "https://loki.finspot.in", val: "https://loki.finspot.in" },
        { key: "tenant", label: "Tenant ID (X-Scope-OrgID)", req: true, mono: true, ph: "finspot-prod", val: "finspot-prod" },
        { key: "token", label: "Bearer token", secret: true, mono: true, ph: "(optional)" },
      ],
    },
    "Datadog": {
      blurb: "Two-way sync. We read metrics + monitors and push incident state back to Datadog.",
      fields: [
        { key: "apikey", label: "API key", req: true, secret: true, mono: true, ph: "dd_api_••••••••••••••••" },
        { key: "appkey", label: "Application key", req: true, secret: true, mono: true, ph: "dd_app_••••••••••••••••" },
        { key: "site", label: "Site", select: ["datadoghq.com", "us3.datadoghq.com", "us5.datadoghq.com", "datadoghq.eu", "ddog-gov.com"] },
      ],
    },
    "PagerDuty": {
      blurb: "Use an Events API v2 routing key. Triggers flow straight into Argus-LinkedEye incidents.",
      fields: [
        { key: "routing", label: "Integration / routing key", req: true, secret: true, mono: true, ph: "R0ABCD1234EFGH5678IJKL" },
        { key: "apitoken", label: "REST API token", secret: true, mono: true, ph: "(optional) for schedule + escalation sync" },
      ],
    },
    "Kubernetes": {
      blurb: "Connect a cluster with a read-scoped service-account token. We watch events + pod health.",
      fields: [
        { key: "apiserver", label: "API server URL", req: true, mono: true, ph: "https://k8s-prod.finspot.in:6443", val: "https://k8s-prod.finspot.in:6443" },
        { key: "token", label: "Service-account token", req: true, secret: true, mono: true, ph: "eyJhbGciOiJSUzI1NiIsImtpZCI6..." },
        { key: "namespace", label: "Namespace scope", mono: true, ph: "all namespaces", val: "" },
      ],
    },
    "OpenTelemetry": {
      blurb: "Send traces + metrics to the Argus-LinkedEye OTLP collector.",
      fields: [
        { key: "endpoint", label: "OTLP endpoint", req: true, mono: true, ph: "https://otlp.finspot.in:4317", val: "https://otlp.finspot.in:4317" },
        { key: "token", label: "Ingest header (Authorization)", secret: true, mono: true, ph: "Bearer ..." },
      ],
    },
    "Opsgenie": {
      blurb: "Connect with an Opsgenie API key to sync alerts, on-call, and escalations.",
      fields: [
        { key: "apikey", label: "API key", req: true, secret: true, mono: true, ph: "og_••••••••••••••••" },
        { key: "region", label: "Region", select: ["US", "EU"] },
      ],
    },
    "New Relic": {
      blurb: "Bridge NRQL + APM. We read entities and create incidents from NRQL alert conditions.",
      fields: [
        { key: "account", label: "Account ID", req: true, mono: true, ph: "1234567" },
        { key: "apikey", label: "User API key", req: true, secret: true, mono: true, ph: "NRAK-••••••••••••••••" },
      ],
    },
    "Splunk": {
      blurb: "Forward logs via HEC and create incidents from saved-search alerts.",
      fields: [
        { key: "endpoint", label: "HEC endpoint", req: true, mono: true, ph: "https://splunk.finspot.in:8088", val: "https://splunk.finspot.in:8088" },
        { key: "token", label: "HEC token", req: true, secret: true, mono: true, ph: "00000000-0000-0000-0000-000000000000" },
      ],
    },
  };
  return S[name] || {
    blurb: "Authenticate with an API key. We'll verify the connection and start syncing automatically.",
    fields: [
      { key: "endpoint", label: "Endpoint URL", req: true, mono: true, ph: "https://api.example.com" },
      { key: "apikey", label: "API key", req: true, secret: true, mono: true, ph: "••••••••••••••••" },
    ],
  };
}

// Tailor automation copy by category — but the two pillars are always present:
// metric ingestion + alert→incident creation.
function autoCopy(category: string) {
  const metricsByCat: Record<string, { title: string; desc: string }> = {
    "On-call": { title: "Sync on-call schedules & escalations", desc: "Import rotations, escalation policies, and responder routing." },
    "Comms": { title: "Provision war-room channels", desc: "Auto-create a channel + bridge for every Sev 1 / Sev 2 incident." },
    "ITSM": { title: "Bi-directional ticket sync", desc: "Mirror incident state, notes, and resolution back to the system of record." },
    "SCM": { title: "Ingest deploy & change events", desc: "Correlate commits, PRs, and releases against incident timelines." },
  };
  const metrics = metricsByCat[category] || {
    title: "Auto-ingest metrics & telemetry",
    desc: "Begin scraping series, logs, and traces on connect — no manual pipeline setup.",
  };
  return {
    metrics,
    incidents: {
      title: "Auto-create incidents from alerts",
      desc: "Every firing alert routes through correlation and opens a deduped Argus-LinkedEye incident.",
    },
  };
}

export function ConnectModal({
  integ,
  catColor,
  onClose,
  onConnected,
}: {
  integ: Integration;
  catColor: (c: string) => string;
  onClose: () => void;
  onConnected?: (integ: Integration) => void;
}) {
  const schema = credSchema(integ.name);
  const copy = autoCopy(integ.category);
  const color = catColor(integ.category);

  const [vals, setVals] = React.useState<Record<string, string>>(() => {
    const v: Record<string, string> = {};
    schema.fields.forEach(f => { v[f.key] = f.val !== undefined ? f.val : (f.select ? f.select[0] : ""); });
    return v;
  });
  const [reveal, setReveal] = React.useState<Record<string, boolean>>({});
  const [autoMetrics, setAutoMetrics] = React.useState(true);
  const [autoIncidents, setAutoIncidents] = React.useState(true);
  const [phase, setPhase] = React.useState("form"); // form | connecting | done

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && phase !== "connecting") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, phase]);

  const required = schema.fields.filter(f => f.req);
  const missing = required.some(f => !String(vals[f.key] || "").trim());

  function connect() {
    setPhase("connecting");
    setTimeout(() => setPhase("done"), 1400);
  }

  const set = (k: string, v: string) => setVals(s => ({ ...s, [k]: v }));

  return (
    <div className={m.backdrop} onClick={() => phase !== "connecting" && onClose()}>
      <div className={cx(m.modal, "w-[720px]")} onClick={e => e.stopPropagation()}>
        <div className={m.head}>
          <div className={m.icon} style={{ color, background: color + "18" }}><Icon className={integ.icon} /></div>
          <div className={m.titles}>
            <h3 className={m.title}>{phase === "done" ? `${integ.name} connected` : `Connect ${integ.name}`}</h3>
            <p className={m.subtitle}>{integ.category} · {phase === "done" ? "live · syncing automatically" : schema.blurb}</p>
          </div>
          {phase !== "connecting" && <button className={m.close} onClick={onClose} aria-label="Close"><Icon icon={XIcon} /></button>}
        </div>

        <div className={m.body}>
          {phase === "done" ? (
            <div className="text-center pt-2 px-1.5 pb-1">
              <div className="w-14 h-14 rounded-full bg-success-bg text-success grid place-items-center text-5xl mx-auto mb-3.5"><Icon icon={CheckIcon} /></div>
              <h4 className="text-lg font-bold text-fg mb-[5px]">You're live</h4>
              <p className="text-[12.5px] text-fg-subtle mb-4">Credentials verified. {integ.name} is now wired into Argus-LinkedEye and working automatically.</p>
              <div className="flex flex-col gap-2 text-left">
                <div className={pipe.row}>
                  <span className={pipe.dot} style={{ background: "var(--success)" }} />
                  <span className={pipe.ic} style={{ background: "var(--success-bg)", color: "var(--success)" }}><Icon icon={PlugZapIcon} /></span>
                  <div className={pipe.body}><b className={pipe.bodyTitle}>Connection verified</b><span className={pipe.bodySub}>TCP · TLS · API auth 200 OK</span></div>
                  <span className={pipe.mono}>12ms</span>
                </div>
                {autoMetrics && (
                  <div className={pipe.row}>
                    <span className={cx(pipe.dot, pipe.live)} />
                    <span className={pipe.ic} style={{ background: "var(--blue-50)", color: "var(--blue-600)" }}><Icon icon={ActivityIcon} /></span>
                    <div className={pipe.body}><b className={pipe.bodyTitle}>{copy.metrics.title}</b><span className={pipe.bodySub}>flowing now · {ingestStat(integ)}</span></div>
                    <span className={pipe.mono}>live</span>
                  </div>
                )}
                {autoIncidents && (
                  <div className={pipe.row}>
                    <span className={cx(pipe.dot, pipe.live)} />
                    <span className={pipe.ic} style={{ background: "#fef2f2", color: "var(--critical)" }}><Icon icon={TriangleAlertIcon} /></span>
                    <div className={pipe.body}><b className={pipe.bodyTitle}>Alert→incident automation armed</b><span className={pipe.bodySub}>watching {ruleStat(integ)} · auto-dedupe + correlation on</span></div>
                    <span className={pipe.mono}>live</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {schema.fields.map(f => (
                <div className={field} key={f.key}>
                  <label className={fieldLabel}>{f.label}{f.req && <span className="text-critical ml-0.5">*</span>}</label>
                  {f.select ? (
                    <select className={inputClass(false)} value={vals[f.key]} onChange={e => set(f.key, e.target.value)} disabled={phase === "connecting"}>
                      {f.select.map(o => <option key={o}>{o}</option>)}
                    </select>
                  ) : f.secret ? (
                    <div className="flex gap-1.5">
                      <input className={cx(inputClass(f.mono), "flex-1")} type={reveal[f.key] ? "text" : "password"} value={vals[f.key]} placeholder={f.ph} onChange={e => set(f.key, e.target.value)} disabled={phase === "connecting"} />
                      <button className={snBtn()} type="button" onClick={() => setReveal(r => ({ ...r, [f.key]: !r[f.key] }))} title={reveal[f.key] ? "Hide" : "Show"}><Icon className={`fa-solid ${reveal[f.key] ? "fa-eye-slash" : "fa-eye"}`} /></button>
                    </div>
                  ) : (
                    <input className={inputClass(f.mono)} value={vals[f.key]} placeholder={f.ph} onChange={e => set(f.key, e.target.value)} disabled={phase === "connecting"} />
                  )}
                </div>
              ))}

              <div className={field} style={{ marginTop: 18 }}>
                <label className={fieldLabel} style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--fg-subtle)" }}>On connect — runs automatically</label>
                <div className="flex flex-col gap-[9px] mt-1 mb-0.5">
                  <div className={auto.card(autoMetrics)} onClick={() => phase !== "connecting" && setAutoMetrics(v => !v)}>
                    <span className={auto.icon(autoMetrics)}><Icon icon={ActivityIcon} /></span>
                    <span className={auto.text}><b className={auto.textTitle}>{copy.metrics.title}</b><span className={auto.textDesc}>{copy.metrics.desc}</span></span>
                    <span className={auto.switch(autoMetrics)} />
                  </div>
                  <div className={auto.card(autoIncidents)} onClick={() => phase !== "connecting" && setAutoIncidents(v => !v)}>
                    <span className={auto.icon(autoIncidents)}><Icon icon={TriangleAlertIcon} /></span>
                    <span className={auto.text}><b className={auto.textTitle}>{copy.incidents.title}</b><span className={auto.textDesc}>{copy.incidents.desc}</span></span>
                    <span className={auto.switch(autoIncidents)} />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className={m.foot}>
          {phase === "done" ? (
            <>
              <span className="flex-1 mr-auto" />
              <button className={snBtn()} onClick={onClose}>Done</button>
              <button className={snBtn(true)} onClick={() => onConnected && onConnected(integ)}><Icon icon={SlidersHorizontalIcon} /> Configure integration</button>
            </>
          ) : (
            <>
              <span className="flex-1 mr-auto" style={{ fontSize: 11.5, color: "var(--fg-subtle)", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Icon icon={LockIcon} /> Credentials are encrypted at rest · stored in Vault
              </span>
              <button className={snBtn()} onClick={onClose} disabled={phase === "connecting"}>Cancel</button>
              <button className={snBtn(true)} onClick={connect} disabled={missing || phase === "connecting"}>
                {phase === "connecting"
                  ? <><Icon icon={LoaderCircleIcon} spin /> Connecting…</>
                  : <><Icon icon={PlugIcon} /> Connect &amp; start sync</>}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ingestStat(integ: Integration) {
  const m: Record<string, string> = {
    "Prometheus": "18.6k samples/s across 4.2k series",
    "Grafana": "12 dashboards · 38 panels embedded",
    "Grafana Loki": "2.8B log lines/day indexed",
    "Datadog": "metrics + 142 monitors mirrored",
    "Kubernetes": "8 clusters · 2,156 pods watched",
    "OpenTelemetry": "412M spans/day received",
    "New Relic": "APM + NRQL entities synced",
    "Splunk": "HEC stream connected",
  };
  return m[integ.name] || "telemetry streaming";
}

function ruleStat(integ: Integration) {
  const m: Record<string, string> = {
    "Prometheus": "142 Alertmanager rules",
    "Grafana": "26 alert rules",
    "Datadog": "142 monitors",
    "PagerDuty": "3 services · 8 schedules",
    "Kubernetes": "event + liveness probes",
    "Opsgenie": "alert policies",
    "New Relic": "NRQL alert conditions",
    "Splunk": "saved-search alerts",
  };
  return m[integ.name] || "alert rules";
}
