// Changes — LinkedEye list layout (see components/RecordList). Live data from
// useChangeRecords; the state action walks New → Scheduled → CAB Review → Approved → Implement → Completed.
import React from "react";
import { useUiStore } from "@/store/ui";
import { useChangeRecords, useUpdateChange } from "@/api/hooks";
import { RecordListScreen } from "@/components/RecordList";
import { Pill } from "@/components/ld";
import type { Tone } from "@/components/ld";

const NEXT_STATE: Record<string, string> = {
  New: "Scheduled",
  Scheduled: "CAB Review",
  "CAB Review": "Approved",
  Approved: "Implement",
  Implement: "Completed",
};

const DONE = new Set(["Completed", "Closed", "Cancelled", "Canceled"]);

const RISK_TONE: Record<string, Tone> = { High: "crit", Medium: "warn", Low: "ok" };

const CHANGE_TABS = [
  { id: "cab", label: "CAB Review", filter: (r: { state: string }) => r.state === "CAB Review" },
  { id: "scheduled", label: "Scheduled", filter: (r: { state: string }) => r.state === "Scheduled" || r.state === "Approved" },
];

const RISK_COLUMN = {
  header: "Risk",
  render: (r: { risk?: string }) =>
    r.risk ? <Pill tone={RISK_TONE[r.risk] ?? "muted"}>{r.risk}</Pill> : <span className="text-fg-muted">—</span>,
};

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


export interface SnChange {
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
  risk?: string;
}

export const SN_CHANGES: SnChange[] = [
  { id: "CHG-000001", opened: "2026-04-25 02:00", title: "Replace failing switch GM-SW SFP module port Gi1/0/5", caller: "Siva K",      pri: 1, state: "Implement",  category: "Network",     group: "NOC — Network Ops",    assignee: "Siva K",       sla: "breach", updated: "5m ago",  critical: true,  risk: "High" },
  { id: "CHG-000002", opened: "2026-04-24 22:00", title: "Resize KVM2 memory from 64GB → 128GB",                caller: "Rajkumar M", pri: 2, state: "Scheduled",  category: "Server",      group: "Platform Engineering", assignee: "Edukondalu P", sla: "ok",     updated: "14m ago" },
  { id: "CHG-000003", opened: "2026-04-24 18:30", title: "FortiGate session table tuning to 8M entries",      caller: "Siva K",      pri: 2, state: "CAB Review", category: "Firewall",    group: "NOC — Network Ops",    assignee: "Siva K",       sla: "warn",   updated: "1h ago" },
  { id: "CHG-000004", opened: "2026-04-24 14:00", title: "Kubernetes 1.29 control plane upgrade prod-west",   caller: "Rajkumar M", pri: 1, state: "CAB Review", category: "Kubernetes",  group: "Platform Engineering", assignee: "Rajkumar M",   sla: "breach", updated: "2h ago",  critical: true,  risk: "High" },
  { id: "CHG-000005", opened: "2026-04-24 10:00", title: "Rotate SSL certificate fs-le-dx.finspot.in",        caller: "Security",    pri: 3, state: "Approved",   category: "Security",    group: "Platform Engineering", assignee: "Edukondalu P", sla: "ok",     updated: "4h ago" },
  { id: "CHG-000006", opened: "2026-04-23 16:30", title: "Increase NSE adapter connection pool 120 → 200",    caller: "Trading Ops", pri: 1, state: "Completed",  category: "Trading",     group: "Trading Systems",      assignee: "Rajkumar M",   sla: "met",    updated: "1d ago" },
  { id: "CHG-000007", opened: "2026-04-23 09:00", title: "Standard CDN cache invalidation — quarterly",       caller: "System",      pri: 3, state: "Completed",  category: "CDN",         group: "Platform Engineering", assignee: "System",       sla: "met",    updated: "1d ago" },
];

export default function Screen() {
  const search = useUiStore((s) => s.search);
  const createdId = useUiStore((s) => s.params.createdChangeId) as string | undefined;
  const { data } = useChangeRecords(search);
  const update = useUpdateChange();
  const records = React.useMemo(() => data ?? [], [data]);
  return (
    <RecordListScreen<SnChange>
      title="Changes"
      subtitle="Plan, approve and track changes to your infrastructure and services"
      noun={{ one: "Change", many: "Changes" }}
      totalIcon="fa-code-branch"
      nextState={NEXT_STATE}
      doneStates={DONE}
      doneLabel="completed"
      stateColor={STATE_COLOR}
      stateTone={STATE_TONE}
      newRoute="change-new"
      detailRoute="change-detail"
      majorTitle="High-Risk Changes"
      majorIcon="fa-bolt"
      majorEmpty="No open high-risk changes."
      majorFilter={(r) => r.risk === "High" || r.pri === 1}
      extraTabs={CHANGE_TABS}
      extraColumn={RISK_COLUMN}
      records={records}
      highlightId={createdId}
      onAdvance={(r, next) => update.mutate({ id: r.id, patch: { state: next } })}
      advancing={update.isPending}
    />
  );
}
