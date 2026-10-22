// Device Onboarding Wizard (vendor/model-aware)
// Ported from screens/infra-onboarding.jsx.
// Maps to: GET /api/infra/device-types/ · GET/POST /api/infra/credential-profiles/
//          POST /api/infra/devices/test-connection/ · POST /api/infra/devices/discover/ · POST /api/infra/devices/
import React from "react";
import { useNav } from "@/hooks/useNav";
import { useDevices } from "@/api/hooks";
import { Panel, Pill } from "@/components/ld";
import { SITES, DEVICES } from "@/data/infra";
import {
  ONBOARD_DEVICE_TYPES,
  SWITCH_ROLES,
  MONITORING_METHODS,
  VENDOR_MODELS,
  CAP_LABELS,
  CREDENTIAL_PROFILES,
} from "@/data/deviceVendorModels";
import { STATUS_COLORS, statusBadgeStyle } from "@/lib/statusColors";
import type { Site, OnboardDeviceType, MonitoringMethod, CredentialProfile } from "@/lib/types";

interface OnboardForm {
  tenant: string;
  site: string;
  type: string | null;
  vendor: string | null;
  model: string | null;
  customModel: string;
  role: string | null;
  name: string;
  hostname: string;
  ip: string;
  serial: string;
  location: string;
  rack: string;
  owner: string;
  method: string | null;
  cred: string | null;
  newCredName: string;
  newCredSecret: string;
}

export default function DeviceOnboardingWizard() {
  const { setRoute } = useNav();
  const STEPS = ["Tenant & Site", "Device Type", "Vendor & Model", "Details", "Monitoring", "Credentials", "Discovery", "Review"];
  const [step, setStep] = React.useState(0);
  const [f, setF] = React.useState<OnboardForm>({
    tenant: "Fyers", site: "dc-blr-1",
    type: null, vendor: null, model: null, customModel: "", role: null,
    name: "", hostname: "", ip: "", serial: "", location: "", rack: "", owner: "",
    method: null, cred: null, newCredName: "", newCredSecret: "",
  });
  const set = <K extends keyof OnboardForm>(k: K, v: OnboardForm[K]) => setF(x => ({ ...x, [k]: v } as OnboardForm));
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [vq, setVq] = React.useState(""); const [mq, setMq] = React.useState("");
  const [test, setTest] = React.useState<null | "testing" | "ok" | "fail">(null);      // null | testing | ok | fail
  const [disc, setDisc] = React.useState<{ stage: number; failed: boolean } | null>(null);      // null | {stage, failed}
  const [saved, setSaved] = React.useState(false);
  const [draft, setDraft] = React.useState(false);

  const profile = f.vendor && f.model && f.model !== "__custom" ? (VENDOR_MODELS[f.vendor] || []).find(m => m.model === f.model) : null;
  const modelLabel = f.model === "__custom" ? (f.customModel || "Custom model") : f.model;
  const typeObj = ONBOARD_DEVICE_TYPES.find(t => t.id === f.type) || ({} as OnboardDeviceType);

  // ---- validation per step ----
  const validate = () => {
    const e: Record<string, string> = {};
    if (step === 1 && !f.type) e.type = "Pick a device type to continue.";
    if (step === 2) {
      if (!f.vendor) e.vendor = "Select a vendor — choose Generic if unsure.";
      if (!f.model) e.model = "Select a model, or use “Other / Custom model”.";
      if (f.model === "__custom" && !f.customModel.trim()) e.customModel = "Give the custom model a name so the team can recognize it.";
      if (!f.role) e.role = "Select the role this device plays in the topology.";
    }
    if (step === 3) {
      if (!f.name.trim()) e.name = "Device name is required — e.g. SW-BLR-ACC-21.";
      if (!f.ip.trim()) e.ip = "Management IP is required.";
      else if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(f.ip.trim())) e.ip = "That doesn’t look like a valid IPv4 address.";
    }
    if (step === 4 && !f.method) e.method = "Choose how this device will be monitored.";
    if (step === 5) {
      if (!f.cred) e.cred = "Pick a saved credential profile or create a new one.";
      if (f.cred === "__new" && !f.newCredName.trim()) e.newCredName = "Name the new credential profile.";
      if (f.cred === "__new" && !f.newCredSecret.trim()) e.newCredSecret = "Enter the secret / community / token.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };
  const next = () => { if (validate()) { setStep(s => s + 1); if (step + 1 === 6) runDiscovery(); } };
  const back = () => { setErrors({}); setStep(s => Math.max(0, s - 1)); };

  // ---- simulated test connection (POST /api/infra/devices/test-connection/) ----
  const runTest = () => {
    if (!f.ip.trim()) { setErrors(e => ({ ...e, ip: "Enter the management IP first." })); return; }
    setTest("testing");
    setTimeout(() => setTest(f.ip.trim().endsWith(".13") ? "fail" : "ok"), 1200);
  };

  // ---- simulated discovery (POST /api/infra/devices/discover/) ----
  const DISC_STAGES: [string, string, string][] = [
    ["Interfaces & ports", "fa-ethernet", "48 interfaces · 44 up · LLDP neighbors on 12 ports"],
    ["CPU / memory / disk", "fa-gauge-high", "CPU 2 cores · 32 GB RAM · flash 8 GB"],
    ["Power / fan / temp sensors", "fa-fan", "2 PSUs OK · 3 fan trays OK · inlet 31°C"],
    ["Connected ports", "fa-plug", "Uplink to SW-BLR-DIST-04 Gi1/0/24 · 11 access endpoints"],
    ["Hosted VMs", "fa-cube", f.type === "phys-srv" ? "Hypervisor detected · 6 VMs found" : "Not applicable for this device type"],
    ["Topology links", "fa-circle-nodes", "2 uplinks mapped into dc-blr-1 topology"],
  ];
  const runDiscovery = (fail?: boolean) => {
    setDisc({ stage: 0, failed: false });
    let i = 0;
    const iv = setInterval(() => {
      i += 1;
      if (i === 3 && fail === undefined && f.ip.trim().endsWith(".99")) { clearInterval(iv); setDisc({ stage: i, failed: true }); return; }
      if (i >= DISC_STAGES.length) { clearInterval(iv); setDisc({ stage: DISC_STAGES.length, failed: false }); return; }
      setDisc({ stage: i, failed: false });
    }, 480);
  };

  // ---- finish: save + register device + go to detail ----
  const finish = () => {
    const id = (f.name || "NEW-DEVICE").toUpperCase();
    const kindMap: Record<string, string> = { k8s: "linux-srv", oob: "phys-srv", generic: "switch", vm: "vm" };
    if (!DEVICES.some(d => d.id === id)) {
      DEVICES.push({
        id, kind: kindMap[f.type as string] || (f.type as string), model: `${f.vendor} ${modelLabel}`, site: f.site, ip: f.ip,
        os: profile ? (profile.snmp as string) : "—", uptime: "0d 0h", cpu: 4, mem: 9, status: "ok",
        role: f.role || "Unassigned", iface: "48 / 48 up", throughput: "—", sessions: "—",
        lastSeen: "just now", agent: f.method === "snmp" ? "snmp" : (f.method as string),
      });
    }
    setSaved(true);
    setTimeout(() => { setRoute("infra-device", { deviceId: id }); }, 1400);
  };

  // ---- small UI helpers ----
  const Err = ({ k }: { k: string }) => errors[k] ? <div style={{ color: STATUS_COLORS.crit.fg, fontSize: 11.5, marginTop: 4 }}><i className="fa-solid fa-circle-exclamation" style={{ marginRight: 5 }} />{errors[k]}</div> : null;
  const L = ({ children, tip }: { children?: React.ReactNode; tip?: string }) => (
    <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, marginBottom: 4, color: "var(--fg, #16212e)" }}>
      {children}{tip && <i className="fa-solid fa-circle-question" title={tip} style={{ marginLeft: 5, color: "var(--fg-faint)", cursor: "help" }} />}
    </label>
  );
  const inputStyle = (k: string): React.CSSProperties => ({ width: "100%", boxSizing: "border-box", padding: "7px 10px", fontSize: 12.5, border: `1px solid ${errors[k] ? STATUS_COLORS.crit.border : "var(--border, #d5dbe1)"}`, borderRadius: 4, outline: "none", fontFamily: "inherit", background: "white" });
  const Card = ({ active, onClick, children, style }: { active?: boolean; onClick?: () => void; children?: React.ReactNode; style?: React.CSSProperties }) => (
    <button type="button" className={`ld-choice${active ? " active" : ""}`} aria-pressed={!!active} onClick={onClick} style={style}>{children}</button>
  );

  const vendors = Object.keys(VENDOR_MODELS).filter(v => !vq || v.toLowerCase().includes(vq.toLowerCase()));
  const models = f.vendor ? (VENDOR_MODELS[f.vendor] || []).filter(m => (!f.type || m.type === f.type || f.type === "generic" || !["switch","router","firewall","loadbal","phys-srv"].includes(f.type)) && (!mq || m.model.toLowerCase().includes(mq.toLowerCase()))) : [];
  const methodOK = (m: MonitoringMethod) => !profile || profile.methods.includes(m.id);
  const liveDevices = useDevices().data;
  // Newest first; exporter agents are listed on the Exporters screen, not here.
  const recent = (liveDevices ?? DEVICES).filter((d) => d.kind !== "exporter").slice(-5).reverse();

  return (
    <div className="ld-dash">
      <div className="ld-head">
        <div>
          <h1>Onboarding Device</h1>
          <p>Add a device to inventory, start monitoring, and place it in the site topology</p>
        </div>
        <div className="ld-head-actions">
          <Pill tone="info">{f.tenant}</Pill>
          <Pill tone="muted"><i className="fa-solid fa-building" aria-hidden="true" /> {(SITES.find(s => s.id === f.site) || ({} as Site)).name}</Pill>
          {draft && <Pill tone="warn"><i className="fa-solid fa-floppy-disk" aria-hidden="true" /> Draft saved</Pill>}
          <button type="button" className="ld-btn" onClick={() => { setDraft(true); setTimeout(() => setDraft(false), 2500); }}><i className="fa-solid fa-floppy-disk" aria-hidden="true" /> Save as draft</button>
          <button type="button" className="ld-btn" onClick={() => setRoute("infra-topology")}>Cancel</button>
        </div>
      </div>

      {/* Stepper */}
      <ol className="ld-card ld-stepper" aria-label="Onboarding steps">
        {STEPS.map((label, i) => {
          const state = i < step ? "done" : i === step ? "current" : "todo";
          return (
            <li key={label} className={`ld-step ld-step-${state}`} aria-current={i === step ? "step" : undefined}>
              <button type="button" className="ld-step-btn" onClick={() => i < step && setStep(i)} disabled={i >= step}>
                <span className="ld-step-num" aria-hidden="true">{i < step ? <i className="fa-solid fa-check" /> : i + 1}</span>
                <span className="ld-step-label">{label}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="ld-split">
        <div>
          <div className="ld-card ld-panel ld-wizard">

            {/* STEP 0 — Tenant & Site */}
            {step === 0 && (
              <div style={{ maxWidth: 560 }}>
                <h3 style={{ margin: "0 0 4px", fontSize: 15 }}>Where does this device live?</h3>
                <p style={{ margin: "0 0 16px", fontSize: 12.5, color: "var(--fg-muted)" }}>Devices are isolated per tenant and grouped by site for topology and access control.</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div><L tip="Tenant isolation — the device is only visible inside this client workspace.">Client / tenant</L>
                    <select className="select" style={{ width: "100%" }} value={f.tenant} onChange={e => set("tenant", e.target.value)}>
                      {["Fyers", "IndMoney", "Helion Energy", "Acme Labs"].map(t => <option key={t}>{t}</option>)}
                    </select></div>
                  <div><L>Site / data center</L>
                    <select className="select" style={{ width: "100%" }} value={f.site} onChange={e => set("site", e.target.value)}>
                      {SITES.map(s => <option key={s.id} value={s.id}>{s.name} · {s.region}</option>)}
                    </select></div>
                </div>
              </div>
            )}

            {/* STEP 1 — Device Type */}
            {step === 1 && (
              <div>
                <h3 style={{ margin: "0 0 4px", fontSize: 15 }}>What kind of device is it?</h3>
                <p style={{ margin: "0 0 14px", fontSize: 12.5, color: "var(--fg-muted)" }}>This decides which vendors, monitoring methods, and dashboards apply.</p>
                <Err k="type" />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10, marginTop: 8 }}>
                  {ONBOARD_DEVICE_TYPES.map(t => (
                    <Card key={t.id} active={f.type === t.id} onClick={() => { set("type", t.id); set("vendor", null); set("model", null); set("role", null); }}>
                      <i className={`${(t as OnboardDeviceType & { brand?: boolean }).brand ? "fa-brands" : "fa-solid"} ${t.icon}`} style={{ fontSize: 17, color: f.type === t.id ? "#0ea5e9" : "var(--fg-muted)" }} />
                      <div style={{ marginTop: 7, fontSize: 12.5, fontWeight: 600 }}>{t.label}</div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 2 — Vendor & Model */}
            {step === 2 && (
              <div>
                <h3 style={{ margin: "0 0 4px", fontSize: 15 }}>Vendor & model</h3>
                <p style={{ margin: "0 0 14px", fontSize: 12.5, color: "var(--fg-muted)" }}>Picking the exact model auto-maps the monitoring template, SNMP OID profile, and topology role.</p>
                <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 16 }}>
                  <div>
                    <L>Vendor</L>
                    <input value={vq} onChange={e => setVq(e.target.value)} placeholder="Search vendors…" style={{ ...inputStyle("vendor"), marginBottom: 6 }} />
                    <div style={{ border: "1px solid var(--border, #e5e8eb)", borderRadius: 4, maxHeight: 260, overflowY: "auto" }}>
                      {vendors.map(v => (
                        <button type="button" key={v} className={`ld-list-option${f.vendor === v ? " active" : ""}`} aria-pressed={f.vendor === v}
                          onClick={() => { set("vendor", v); set("model", null); set("role", null); setMq(""); }}>{v}</button>
                      ))}
                    </div>
                    <Err k="vendor" />
                  </div>
                  <div>
                    <L>Model</L>
                    <input value={mq} onChange={e => setMq(e.target.value)} placeholder="Search models…" style={{ ...inputStyle("model"), marginBottom: 6 }} disabled={!f.vendor} />
                    <div style={{ border: "1px solid var(--border, #e5e8eb)", borderRadius: 4, maxHeight: 200, overflowY: "auto" }}>
                      {!f.vendor && <div style={{ padding: 14, fontSize: 12, color: "var(--fg-muted)" }}>Select a vendor first</div>}
                      {f.vendor && models.map(m => (
                        <button type="button" key={m.model} className={`ld-list-option ld-list-option-split${f.model === m.model ? " active" : ""}`} aria-pressed={f.model === m.model}
                          onClick={() => { set("model", m.model); set("role", m.role); }}>
                          <span>{m.model}</span>
                          <span className="ld-muted ld-small">{m.role} · {m.methods.join(" / ")}</span>
                        </button>
                      ))}
                      {f.vendor && (
                        <button type="button" className={`ld-list-option ld-list-option-add${f.model === "__custom" ? " active" : ""}`} aria-pressed={f.model === "__custom"} onClick={() => set("model", "__custom")}>
                          <i className="fa-solid fa-plus" aria-hidden="true" style={{ marginRight: 6 }} />Other / Custom model…
                        </button>
                      )}
                    </div>
                    <Err k="model" />
                    {f.model === "__custom" && (
                      <div style={{ marginTop: 10 }}>
                        <L tip="Stored as a custom model profile; you can refine capabilities later in Settings → Model Profiles.">Custom model name</L>
                        <input value={f.customModel} onChange={e => set("customModel", e.target.value)} placeholder="e.g. Catalyst 9300X-48HX" style={inputStyle("customModel")} />
                        <Err k="customModel" />
                      </div>
                    )}
                    <div style={{ marginTop: 12 }}>
                      <L>Layer / role in topology</L>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {[...new Set([...(f.type === "switch" ? SWITCH_ROLES : []), "Edge", "Firewall", "Load Balancer", "Server", "Unassigned", ...(profile ? [profile.role] : [])])].map(r => (
                          <button type="button" key={r} className={`ld-btn ld-btn-sm${f.role === r ? " ld-btn-primary" : ""}`} aria-pressed={f.role === r} onClick={() => set("role", r)}>{r}</button>
                        ))}
                      </div>
                      <Err k="role" />
                    </div>
                  </div>
                </div>
                {(profile || f.model === "__custom") && (
                  <div style={{ marginTop: 16, border: `1px solid ${STATUS_COLORS.ok.border}`, background: "#f0fdf6", borderRadius: 6, padding: "12px 14px" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}><i className="fa-solid fa-wand-magic-sparkles" style={{ color: STATUS_COLORS.ok.line, marginRight: 6 }} />Auto-mapped profile — {f.vendor} {modelLabel}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: 11.5, color: "var(--fg-muted)" }}>
                      <span><b>SNMP profile:</b> <span className="mono">{profile ? profile.snmp : "generic-mib2 (custom)"}</span></span>
                      <span><b>Discovery:</b> {profile && profile.caps.includes("interfaces") ? "IF-MIB + LLDP" : "ICMP sweep"}</span>
                      <span><b>Suggested role:</b> {profile ? profile.role : "set manually"}</span>
                    </div>
                    <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {(profile ? profile.caps : ["interfaces"]).map(c => <span key={c} style={{ background: "white", border: "1px solid var(--border, #d5dbe1)", borderRadius: 10, padding: "1px 9px", fontSize: 10.5, fontWeight: 600 }}>{CAP_LABELS[c]}</span>)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 3 — Basic Details */}
            {step === 3 && (
              <div style={{ maxWidth: 640 }}>
                <h3 style={{ margin: "0 0 14px", fontSize: 15 }}>Basic details</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div><L>Device name *</L><input value={f.name} onChange={e => set("name", e.target.value.toUpperCase())} placeholder="SW-BLR-ACC-21" style={inputStyle("name")} /><Err k="name" /></div>
                  <div><L>Hostname</L><input value={f.hostname} onChange={e => set("hostname", e.target.value)} placeholder="sw-blr-acc-21.mgmt.local" style={inputStyle("hostname")} /></div>
                  <div><L tip="Management-plane IP the poller will reach — must be routable from the monitoring VLAN.">Management IP *</L><input value={f.ip} onChange={e => set("ip", e.target.value)} placeholder="10.10.3.21" style={inputStyle("ip")} /><Err k="ip" /></div>
                  <div><L>Serial number</L><input value={f.serial} onChange={e => set("serial", e.target.value)} placeholder="FOC-2547X8WR" style={inputStyle("serial")} /></div>
                  <div><L>Location</L><input value={f.location} onChange={e => set("location", e.target.value)} placeholder="Hall B · Row C" style={inputStyle("location")} /></div>
                  <div><L>Rack / U</L><input value={f.rack} onChange={e => set("rack", e.target.value)} placeholder="rack-c34 / U22" style={inputStyle("rack")} /></div>
                  <div style={{ gridColumn: "1 / -1" }}><L>Owner / team</L><input value={f.owner} onChange={e => set("owner", e.target.value)} placeholder="Network Eng · Priya R." style={inputStyle("owner")} /></div>
                </div>
                <div style={{ marginTop: 10, fontSize: 11.5, color: "var(--fg-muted)" }}>Vendor & model: <b>{f.vendor} {modelLabel}</b> · {f.role}</div>
              </div>
            )}

            {/* STEP 4 — Monitoring method */}
            {step === 4 && (
              <div>
                <h3 style={{ margin: "0 0 4px", fontSize: 15 }}>How should we monitor it?</h3>
                <p style={{ margin: "0 0 12px", fontSize: 12.5, color: "var(--fg-muted)" }}>Methods recommended for <b>{f.vendor} {modelLabel}</b> are highlighted; others are still selectable.</p>
                <Err k="method" />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10, marginTop: 8 }}>
                  {MONITORING_METHODS.map(m => {
                    const rec = methodOK(m);
                    return (
                      <Card key={m.id} active={f.method === m.id} onClick={() => set("method", m.id)} style={{ opacity: rec ? 1 : 0.55 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <b style={{ fontSize: 13 }}>{m.label}</b>
                          {rec && profile && <span style={statusBadgeStyle("ok")}><i className="fa-solid fa-thumbs-up" style={{ fontSize: 8 }} /> Recommended</span>}
                        </div>
                        <div style={{ marginTop: 6, fontSize: 11.5, color: "var(--fg-muted)", lineHeight: 1.45 }}>{m.hint}</div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 5 — Credentials */}
            {step === 5 && (
              <div style={{ maxWidth: 620 }}>
                <h3 style={{ margin: "0 0 4px", fontSize: 15 }}>Credentials</h3>
                <p style={{ margin: "0 0 12px", fontSize: 12.5, color: "var(--fg-muted)" }}>Credentials are stored in Vault and never shown again after saving.</p>
                <Err k="cred" />
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                  {CREDENTIAL_PROFILES.filter(c => !f.method || c.method === f.method || f.method === "blackbox").map(c => (
                    <Card key={c.id} active={f.cred === c.id} onClick={() => set("cred", c.id)}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span className="mono" style={{ fontSize: 12.5, fontWeight: 700 }}>{c.name}</span>
                        <span style={{ fontSize: 11, color: "var(--fg-muted)" }}>{c.detail}</span>
                      </div>
                    </Card>
                  ))}
                  <div className={`ld-choice ld-choice-static${f.cred === "__new" ? " active" : ""}`}>
                    <button type="button" className="ld-link" aria-pressed={f.cred === "__new"} onClick={() => set("cred", "__new")}>
                      <i className="fa-solid fa-plus" aria-hidden="true" style={{ marginRight: 6 }} />Create new credential profile
                    </button>
                    {f.cred === "__new" && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
                        <div><L>Profile name</L><input value={f.newCredName} onChange={e => set("newCredName", e.target.value)} placeholder="snmp-v3-branch" style={inputStyle("newCredName")} /><Err k="newCredName" /></div>
                        <div><L tip="SNMP community / v3 auth+priv pass / API token — depending on the monitoring method.">Secret</L><input type="password" value={f.newCredSecret} onChange={e => set("newCredSecret", e.target.value)} placeholder="••••••••••" style={inputStyle("newCredSecret")} /><Err k="newCredSecret" /></div>
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12 }}>
                  <button type="button" className="ld-btn" onClick={runTest} disabled={test === "testing"}>
                    {test === "testing" ? <><i className="fa-solid fa-circle-notch fa-spin" /> Testing…</> : <><i className="fa-solid fa-plug-circle-check" /> Test connection</>}
                  </button>
                  {test === "ok" && <span style={statusBadgeStyle("ok")}><i className="fa-solid fa-check" style={{ fontSize: 8 }} /> Reachable · SNMP OK · sysName matched in 84 ms</span>}
                  {test === "fail" && <span style={statusBadgeStyle("crit")}><i className="fa-solid fa-xmark" style={{ fontSize: 8 }} /> Couldn’t reach {f.ip} — check IP, VLAN routing, or firewall rules, then retry</span>}
                </div>
              </div>
            )}

            {/* STEP 6 — Discovery */}
            {step === 6 && (
              <div style={{ maxWidth: 620 }}>
                <h3 style={{ margin: "0 0 4px", fontSize: 15 }}>Auto-discovery</h3>
                <p style={{ margin: "0 0 14px", fontSize: 12.5, color: "var(--fg-muted)" }}>Probing <span className="mono">{f.ip}</span> with <b>{(MONITORING_METHODS.find(m => m.id === f.method) || ({} as MonitoringMethod)).label}</b> · profile <span className="mono">{profile ? profile.snmp : "generic-mib2"}</span></p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {DISC_STAGES.map((s, i) => {
                    const state = !disc ? "wait" : disc.failed && i === disc.stage ? "fail" : i < (disc?.stage ?? 0) ? "done" : i === disc?.stage && !disc.failed && disc.stage < DISC_STAGES.length ? "run" : "wait";
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, border: "1px solid var(--border, #e5e8eb)", borderRadius: 5, padding: "10px 14px", background: state === "fail" ? "#fef2f2" : "white" }}>
                        <span style={{ width: 20, textAlign: "center" }}>
                          {state === "done" && <i className="fa-solid fa-circle-check" style={{ color: STATUS_COLORS.ok.line }} />}
                          {state === "run" && <i className="fa-solid fa-circle-notch fa-spin" style={{ color: "#0ea5e9" }} />}
                          {state === "fail" && <i className="fa-solid fa-circle-xmark" style={{ color: STATUS_COLORS.crit.line }} />}
                          {state === "wait" && <i className="fa-regular fa-circle" style={{ color: "var(--fg-faint)" }} />}
                        </span>
                        <i className={`fa-solid ${s[1]}`} style={{ color: "var(--fg-muted)", width: 16 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 600 }}>{s[0]}</div>
                          {state === "done" && <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>{s[2]}</div>}
                          {state === "fail" && <div style={{ fontSize: 11, color: STATUS_COLORS.crit.fg }}>Sensor walk timed out — the device may filter SNMP hardware OIDs. You can retry or skip this step.</div>}
                        </div>
                        {state === "fail" && <button type="button" className="ld-btn ld-btn-sm" onClick={() => runDiscovery(false)}><i className="fa-solid fa-rotate" aria-hidden="true" /> Retry</button>}
                      </div>
                    );
                  })}
                </div>
                {disc && disc.stage >= DISC_STAGES.length && (
                  <div style={{ marginTop: 12, ...statusBadgeStyle("ok"), padding: "8px 12px", fontSize: 12 }}><i className="fa-solid fa-check-double" /> Discovery complete — review before saving</div>
                )}
              </div>
            )}

            {/* STEP 7 — Review & Finish */}
            {step === 7 && (
              <div style={{ maxWidth: 680 }}>
                <h3 style={{ margin: "0 0 14px", fontSize: 15 }}>Review & finish</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, border: "1px solid var(--border, #e5e8eb)", borderRadius: 6, overflow: "hidden" }}>
                  {[["Device", `${f.name || "—"} · ${f.hostname || "no hostname"}`], ["Tenant / site", `${f.tenant} · ${(SITES.find(s => s.id === f.site) || ({} as Site)).name}`],
                    ["Type / role", `${typeObj.label} · ${f.role}`], ["Vendor / model", `${f.vendor} ${modelLabel}`],
                    ["Management IP", f.ip], ["Serial", f.serial || "—"],
                    ["Location", `${f.location || "—"} · ${f.rack || "—"}`], ["Owner", f.owner || "—"],
                    ["Monitoring", `${(MONITORING_METHODS.find(m => m.id === f.method) || ({} as MonitoringMethod)).label} · ${profile ? profile.snmp : "generic-mib2"}`],
                    ["Credential", f.cred === "__new" ? f.newCredName : (CREDENTIAL_PROFILES.find(c => c.id === f.cred) || ({} as CredentialProfile)).name],
                    ["Reachability", "Reachable · 84 ms"], ["Discovered", "48 interfaces · 2 uplinks · sensors OK"],
                  ].map(([k, v], i) => (
                    <div key={k} style={{ padding: "9px 14px", borderBottom: "1px solid #f1f5f9", borderRight: i % 2 === 0 ? "1px solid #f1f5f9" : "none", background: i % 4 < 2 ? "white" : "#fafbfc" }}>
                      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--fg-muted)", fontWeight: 700 }}>{k}</div>
                      <div style={{ fontSize: 12.5, marginTop: 2, fontWeight: 500 }}>{v}</div>
                    </div>
                  ))}
                </div>
                {(profile || f.model === "__custom") && (
                  <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {(profile ? profile.caps : ["interfaces"]).map(c => <span key={c} style={{ background: "#f1f5f9", borderRadius: 10, padding: "2px 9px", fontSize: 10.5, fontWeight: 600 }}><i className="fa-solid fa-check" style={{ color: STATUS_COLORS.ok.line, marginRight: 4 }} />{CAP_LABELS[c]}</span>)}
                  </div>
                )}
                {saved && (
                  <div style={{ marginTop: 14, ...statusBadgeStyle("ok"), padding: "10px 14px", fontSize: 12.5 }}>
                    <i className="fa-solid fa-circle-check" /> Device saved · monitoring started · added to {(SITES.find(s => s.id === f.site) || ({} as Site)).name} topology — opening device page…
                  </div>
                )}
              </div>
            )}

            {/* Nav buttons */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 22, paddingTop: 14, borderTop: "1px solid var(--border, #e5e8eb)" }}>
              <button type="button" className="ld-btn" onClick={back} disabled={step === 0 || saved}><i className="fa-solid fa-arrow-left" aria-hidden="true" /> Back</button>
              {step < 7 && <button type="button" className="ld-btn ld-btn-primary" onClick={next} disabled={step === 6 && (!disc || disc.failed || disc.stage < 6)}>
                {step === 6 && disc && !disc.failed && disc.stage < 6 ? <><i className="fa-solid fa-circle-notch fa-spin" /> Discovering…</> : <>Continue <i className="fa-solid fa-arrow-right" /></>}
              </button>}
              {step === 7 && <button type="button" className="ld-btn ld-btn-primary" onClick={finish} disabled={saved}><i className="fa-solid fa-rocket" aria-hidden="true" /> Save & start monitoring</button>}
            </div>
          </div>
        </div>

        <div className="ld-rail">
          <Panel title="Summary so far">
            <dl className="ld-dl">
              <dt>Tenant</dt><dd>{f.tenant}</dd>
              <dt>Site</dt><dd>{(SITES.find(s => s.id === f.site) || ({} as Site)).name}</dd>
              <dt>Type</dt><dd>{typeObj.label || "—"}</dd>
              <dt>Vendor / model</dt><dd>{f.vendor ? `${f.vendor} ${modelLabel || ""}` : "—"}</dd>
              <dt>Role</dt><dd>{f.role || "—"}</dd>
              <dt>IP</dt><dd>{f.ip ? <span className="ld-mono">{f.ip}</span> : "—"}</dd>
              <dt>Monitoring</dt><dd>{(MONITORING_METHODS.find(m => m.id === f.method) || ({} as MonitoringMethod)).label || "—"}</dd>
              <dt>Connection</dt>
              <dd>{test === "ok" ? <Pill tone="ok">Verified</Pill> : test === "fail" ? <Pill tone="crit">Failed</Pill> : "Not tested"}</dd>
            </dl>
          </Panel>
          <Panel title="Tips">
            <div className="ld-tips">
              <p><b>SNMP v3</b> is preferred over v2c — v2c communities travel in clear text.</p>
              <p><b>Test the connection</b> before discovery to catch VLAN/firewall issues early.</p>
              <p>Can’t find the model? Use <b>Other / Custom model</b> — it still gets the generic MIB-2 profile and can be refined later.</p>
            </div>
          </Panel>
        </div>
      </div>

      <Panel title="Recent Devices" action={{ label: "View All", onClick: () => setRoute("infra-assets") }}>
        <div className="ld-table-wrap">
          <table className="ld-table">
            <thead>
              <tr><th scope="col">Device</th><th scope="col">IP Address</th><th scope="col">Model</th><th scope="col">Site</th><th scope="col">Status</th><th scope="col">Last seen</th></tr>
            </thead>
            <tbody>
              {recent.map((d) => (
                <tr key={d.id}>
                  <td>
                    <button type="button" className="ld-link ld-mono" onClick={() => setRoute("infra-device", { deviceId: d.id })}>{d.id}</button>
                  </td>
                  <td className="ld-mono">{d.ip}</td>
                  <td className="ld-muted">{d.model}</td>
                  <td className="ld-muted">{d.site}</td>
                  <td><Pill tone={d.status === "ok" ? "ok" : d.status === "warn" ? "warn" : "crit"}><span className="ld-pill-dot" />{d.status === "ok" ? "Online" : d.status === "warn" ? "Warning" : "Offline"}</Pill></td>
                  <td className="ld-muted">{d.lastSeen}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
