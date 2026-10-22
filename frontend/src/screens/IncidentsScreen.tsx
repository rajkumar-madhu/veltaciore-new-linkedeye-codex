// Incidents — LinkedEye list layout (see components/RecordList). Live data from
// useIncidentRecords; the state action walks New → Assigned → In Progress → Resolved → Closed.
import React from "react";
import { useUiStore } from "@/store/ui";
import { useIncidentRecords, useUpdateIncident } from "@/api/hooks";
import { RecordListScreen } from "@/components/RecordList";
import type { Tone } from "@/components/ld";

const NEXT_STATE: Record<string, string> = {
  New: "Assigned",
  Assigned: "In Progress",
  "In Progress": "Resolved",
  Resolved: "Closed",
};

const DONE = new Set(["Resolved", "Closed", "Cancelled", "Canceled"]);

const STATE_TONE: Record<string, Tone> = {
  New: "crit",
  Assigned: "warn",
  "In Progress": "warn",
  "On Hold": "info",
  "Known Error": "purple",
  Scheduled: "info",
  "CAB Review": "purple",
  Approved: "info",
  Implement: "warn",
  Resolved: "ok",
  Completed: "ok",
  Closed: "muted",
};

const STATE_COLOR: Record<string, string> = {
  New: "#e5383b",
  Assigned: "#f5a524",
  "In Progress": "#2f6bff",
  "On Hold": "#7c4dff",
  "Known Error": "#7c4dff",
  Scheduled: "#0ea5e9",
  "CAB Review": "#7c4dff",
  Approved: "#2f6bff",
  Implement: "#f5a524",
  Resolved: "#16a34a",
  Completed: "#16a34a",
  Closed: "#98a2b3",
};

export interface SnIncident {
  id: string;
  opened: string;
  title: string;
  caller: string;
  pri: number;
  state: string;
  category: string;
  group: string;
  assignee: string | null;
  sla: string;
  updated: string;
  critical?: boolean;
}

export const SN_INCIDENTS: SnIncident[] = [
  { id: "INC-000001", opened: "2026-04-24 06:32", title: "SwitchPortDown — GM-SW Gi1/0/5 down, no link detecte…", caller: "System (Alert)", pri: 1, state: "New", category: "Network", group: "NOC — Network Ops", assignee: null, sla: "breach", updated: "2m ago", critical: true },
  { id: "INC-000002", opened: "2026-04-24 06:26", title: "ServerHighCPU — KVM2 (10.10.10.15) sustained CPU usa…", caller: "System (Alert)", pri: 1, state: "Assigned", category: "Server", group: "Platform Engineering", assignee: "Rajkumar M", sla: "breach", updated: "8m ago", critical: true },
  { id: "INC-000003", opened: "2026-04-24 06:11", title: "FortiGateSessionTableHigh — 100F-FW session table at 5…", caller: "System (Alert)", pri: 2, state: "In Progress", category: "Firewall", group: "NOC — Network Ops", assignee: "Siva K", sla: "ok", updated: "23m ago" },
  { id: "INC-000007", opened: "2026-04-24 06:29", title: "SwitchPortFlapping — MGMT-SW Gi1/0/3 flapped 6 times …", caller: "System (Alert)", pri: 1, state: "New", category: "Network", group: "NOC — Network Ops", assignee: null, sla: "warn", updated: "5m ago" },
  { id: "INC-000008", opened: "2026-04-24 06:22", title: "OOMKilled — pod-analytics-worker-7f8d9 terminated by K…", caller: "System (Alert)", pri: 2, state: "New", category: "Kubernetes", group: "Platform Engineering", assignee: null, sla: "ok", updated: "12m ago" },
  { id: "INC-000006", opened: "2026-04-24 03:34", title: "ServerDiskCritical — KVM1 /data partition at 92% utilization", caller: "System (Alert)", pri: 2, state: "Assigned", category: "Server", group: "Platform Engineering", assignee: "Edukondalu P", sla: "ok", updated: "3h ago" },
  { id: "INC-000005", opened: "2026-04-24 04:34", title: "TradingHighLatency — NSE Adapter OMS latency exceede…", caller: "System (Alert)", pri: 1, state: "Resolved", category: "Trading", group: "Trading Systems", assignee: "Rajkumar M", sla: "met", updated: "2h ago" },
  { id: "INC-000004", opened: "2026-04-24 05:34", title: "SSLCertExpiring — fs-le-dx.finspot.in certificate expires in …", caller: "System (Alert)", pri: 3, state: "New", category: "Security", group: "Platform Engineering", assignee: null, sla: "ok", updated: "1h ago" },
];

export default function Screen() {
  const search = useUiStore((s) => s.search);
  const createdId = useUiStore((s) => s.params.createdIncidentId) as string | undefined;
  const { data } = useIncidentRecords(search);
  const update = useUpdateIncident();
  const records = React.useMemo(() => data ?? [], [data]);
  return (
    <RecordListScreen<SnIncident>
      title="Incidents"
      subtitle="View, manage and resolve incidents across your IT infrastructure and services"
      noun={{ one: "Incident", many: "Incidents" }}
      totalIcon="fa-triangle-exclamation"
      nextState={NEXT_STATE}
      doneStates={DONE}
      stateColor={STATE_COLOR}
      stateTone={STATE_TONE}
      newRoute="incident-new"
      detailRoute="incident-detail"
      majorTitle="Major Incidents"
      majorIcon="fa-fire"
      majorEmpty="No open critical incidents."
      majorFilter={(r) => r.pri === 1}
      records={records}
      highlightId={createdId}
      onAdvance={(r, next) => update.mutate({ id: r.id, patch: { state: next } })}
      advancing={update.isPending}
    />
  );
}
