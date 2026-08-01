// War-room timeline + chat content for INC-48291. Ported from data.jsx.
import React from "react";

export interface TimelineEvent {
  t: string;
  type: string;
  body: React.ReactNode;
  meta: string[];
}

export const TIMELINE_EVENTS: TimelineEvent[] = [
  { t: "14:32:08", type: "critical", body: <>PagerDuty escalation triggered — <b>Sev 1</b> declared automatically by alert rule <code>stripe_timeout_rate &gt; 5%</code></>, meta: ["Alert rule", "auto"] },
  { t: "14:32:14", type: "ai", body: <><b>Argus AI</b> correlated 3 related signals: increased DB CPU on <code>payments-primary</code>, GC pauses on <code>checkout-api</code>, and inbound rate limit on Stripe webhook. Likely root cause: <b>connection pool exhaustion</b>.</>, meta: ["Confidence 87%", "2 runbooks suggested"] },
  { t: "14:32:30", type: "info", body: <>Priya Raghunathan joined as <b>Incident Commander</b></>, meta: ["SRE Platform"] },
  { t: "14:34:02", type: "info", body: <>Bridge opened in #inc-48291-war-room · Zoom bridge auto-provisioned</>, meta: ["Slack", "Zoom"] },
  { t: "14:35:47", type: "warn", body: <>Auto-scaled <code>checkout-api</code> from 12 → 24 replicas via runbook <i>pool-expansion-v3</i></>, meta: ["runbook", "Kubernetes"] },
  { t: "14:38:15", type: "info", body: <>Status page updated: "Investigating elevated payment failures"</>, meta: ["statuspage.io", "public"] },
  { t: "14:41:09", type: "success", body: <>p95 latency on <code>checkout-api</code> dropped from 8.4s → 420ms</>, meta: ["Datadog metric"] },
  { t: "14:42:50", type: "ai", body: <><b>Argus AI</b> recommends creating a problem record to track the underlying pool-sizing regression.</>, meta: ["Suggestion"] },
];

export interface ChatMessage {
  u?: string;
  ai?: boolean;
  role?: string;
  time: string;
  text: string;
}

export const CHAT: ChatMessage[] = [
  { u: "u1", role: "IC", time: "14:33", text: "Taking IC. Can someone grab the last deploy diff for checkout-api?" },
  { u: "u3", role: "Responder", time: "14:34", text: "On it. Looking at commits since 12:00 UTC." },
  { u: "u5", role: "Manager", time: "14:35", text: "FYI exec comms — Fyers finance team pinged. I'll handle stakeholder updates." },
  { ai: true, time: "14:36", text: "Pool size on payments-primary was reduced from 200 → 120 in deploy `2f8a1c` at 12:47 UTC. High likelihood this is the trigger. Rollback suggested." },
  { u: "u3", role: "Responder", time: "14:37", text: "Confirmed — rolling back now via argo-rollbacks." },
  { u: "u1", role: "IC", time: "14:39", text: "Status page updated. Let's wait 3m and see if errors drop." },
];
