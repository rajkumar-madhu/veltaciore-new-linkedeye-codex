// screens/connect-modal.jsx — credential-aware "Connect integration" flow.
// Pasting an API key / token wires up metric ingestion AND alert→incident
// automation automatically — the way Datadog / PagerDuty / Prometheus do.
// Ported from screens/connect-modal.jsx.
import React from "react";
import type { Integration } from "@/lib/types";

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
    <div className="le-modal-backdrop" onClick={() => phase !== "connecting" && onClose()}>
      <div className="le-modal wide" onClick={e => e.stopPropagation()}>
        <div className="le-modal-head">
          <div className="le-modal-icon" style={{ color, background: color + "18" }}><i className={integ.icon} /></div>
          <div className="le-modal-titles">
            <h3>{phase === "done" ? `${integ.name} connected` : `Connect ${integ.name}`}</h3>
            <p>{integ.category} · {phase === "done" ? "live · syncing automatically" : schema.blurb}</p>
          </div>
          {phase !== "connecting" && <button className="le-modal-x" onClick={onClose} aria-label="Close"><i className="fa-solid fa-xmark" /></button>}
        </div>

        <div className="le-modal-body">
          {phase === "done" ? (
            <div className="le-connect-success">
              <div className="le-connect-check"><i className="fa-solid fa-check" /></div>
              <h4>You're live</h4>
              <p>Credentials verified. {integ.name} is now wired into Argus-LinkedEye and working automatically.</p>
              <div className="le-pipe">
                <div className="le-pipe-row">
                  <span className="dot" style={{ background: "var(--success)" }} />
                  <span className="ic" style={{ background: "var(--success-bg)", color: "var(--success)" }}><i className="fa-solid fa-plug-circle-check" /></span>
                  <div className="body"><b>Connection verified</b><span>TCP · TLS · API auth 200 OK</span></div>
                  <span className="mono">12ms</span>
                </div>
                {autoMetrics && (
                  <div className="le-pipe-row">
                    <span className="dot live" />
                    <span className="ic" style={{ background: "var(--blue-50)", color: "var(--blue-600)" }}><i className="fa-solid fa-wave-square" /></span>
                    <div className="body"><b>{copy.metrics.title}</b><span>flowing now · {ingestStat(integ)}</span></div>
                    <span className="mono">live</span>
                  </div>
                )}
                {autoIncidents && (
                  <div className="le-pipe-row">
                    <span className="dot live" />
                    <span className="ic" style={{ background: "#fef2f2", color: "var(--critical)" }}><i className="fa-solid fa-triangle-exclamation" /></span>
                    <div className="body"><b>Alert→incident automation armed</b><span>watching {ruleStat(integ)} · auto-dedupe + correlation on</span></div>
                    <span className="mono">live</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {schema.fields.map(f => (
                <div className="le-field" key={f.key}>
                  <label>{f.label}{f.req && <span className="req">*</span>}</label>
                  {f.select ? (
                    <select className="le-input" value={vals[f.key]} onChange={e => set(f.key, e.target.value)} disabled={phase === "connecting"}>
                      {f.select.map(o => <option key={o}>{o}</option>)}
                    </select>
                  ) : f.secret ? (
                    <div className="le-input-group">
                      <input className={`le-input ${f.mono ? "mono" : ""}`} type={reveal[f.key] ? "text" : "password"} value={vals[f.key]} placeholder={f.ph} onChange={e => set(f.key, e.target.value)} disabled={phase === "connecting"} />
                      <button className="sn-btn" type="button" onClick={() => setReveal(r => ({ ...r, [f.key]: !r[f.key] }))} title={reveal[f.key] ? "Hide" : "Show"}><i className={`fa-solid ${reveal[f.key] ? "fa-eye-slash" : "fa-eye"}`} /></button>
                    </div>
                  ) : (
                    <input className={`le-input ${f.mono ? "mono" : ""}`} value={vals[f.key]} placeholder={f.ph} onChange={e => set(f.key, e.target.value)} disabled={phase === "connecting"} />
                  )}
                </div>
              ))}

              <div className="le-field" style={{ marginTop: 18 }}>
                <label style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--fg-subtle)" }}>On connect — runs automatically</label>
                <div className="le-auto">
                  <div className={`le-auto-card ${autoMetrics ? "on" : ""}`} onClick={() => phase !== "connecting" && setAutoMetrics(v => !v)}>
                    <span className="le-auto-ic"><i className="fa-solid fa-wave-square" /></span>
                    <span className="le-auto-txt"><b>{copy.metrics.title}</b><span>{copy.metrics.desc}</span></span>
                    <span className="le-switch" />
                  </div>
                  <div className={`le-auto-card ${autoIncidents ? "on" : ""}`} onClick={() => phase !== "connecting" && setAutoIncidents(v => !v)}>
                    <span className="le-auto-ic"><i className="fa-solid fa-triangle-exclamation" /></span>
                    <span className="le-auto-txt"><b>{copy.incidents.title}</b><span>{copy.incidents.desc}</span></span>
                    <span className="le-switch" />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="le-modal-foot">
          {phase === "done" ? (
            <>
              <span className="spacer" />
              <button className="sn-btn" onClick={onClose}>Done</button>
              <button className="sn-btn primary" onClick={() => onConnected && onConnected(integ)}><i className="fa-solid fa-sliders" /> Configure integration</button>
            </>
          ) : (
            <>
              <span className="spacer" style={{ fontSize: 11.5, color: "var(--fg-subtle)", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <i className="fa-solid fa-lock" /> Credentials are encrypted at rest · stored in Vault
              </span>
              <button className="sn-btn" onClick={onClose} disabled={phase === "connecting"}>Cancel</button>
              <button className="sn-btn primary" onClick={connect} disabled={missing || phase === "connecting"}>
                {phase === "connecting"
                  ? <><i className="fa-solid fa-circle-notch fa-spin" /> Connecting…</>
                  : <><i className="fa-solid fa-plug" /> Connect &amp; start sync</>}
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
