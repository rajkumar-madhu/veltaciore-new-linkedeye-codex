// Problems — LinkedEye list layout (see components/RecordList). Live data from
// useProblemRecords; the state action walks New → … → Known Error → Resolved → Closed.
import React from "react";
import { useUiStore } from "@/store/ui";
import { useProblemRecords, useUpdateProblem } from "@/api/hooks";
import { RecordListScreen } from "@/components/RecordList";
import type { Tone } from "@/components/ld";

const NEXT_STATE: Record<string, string> = {
  New: "Assigned",
  Assigned: "In Progress",
  "In Progress": "Known Error",
  "Known Error": "Resolved",
  Resolved: "Closed",
};

const DONE = new Set(["Resolved", "Closed", "Cancelled", "Canceled"]);

const KNOWN_ERROR_TAB = [{ id: "known-error", label: "Known Errors", filter: (r: { state: string }) => r.state === "Known Error" }];

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


export interface SnProblem {
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

export const SN_PROBLEMS: SnProblem[] = [
  { id: "PRB-000001", opened: "2026-04-22 09:14", title: "Recurring SwitchPortFlapping on MGMT-SW Gi1/0/3", caller: "Siva K",      pri: 1, state: "New",         category: "Network",     group: "NOC — Network Ops",    assignee: null,           sla: "breach", updated: "12m ago", critical: true },
  { id: "PRB-000002", opened: "2026-04-21 14:02", title: "KVM2 sustained CPU spikes during nightly batch",   caller: "Rajkumar M", pri: 1, state: "Assigned",    category: "Server",      group: "Platform Engineering", assignee: "Edukondalu P", sla: "breach", updated: "1h ago", critical: true },
  { id: "PRB-000003", opened: "2026-04-20 10:32", title: "FortiGate session table climbs above 5M nightly",  caller: "Siva K",      pri: 2, state: "Known Error", category: "Firewall",    group: "NOC — Network Ops",    assignee: "Siva K",       sla: "ok",     updated: "2h ago" },
  { id: "PRB-000004", opened: "2026-04-19 11:18", title: "pod-analytics-worker repeatedly OOMKilled",       caller: "System",      pri: 2, state: "In Progress", category: "Kubernetes",  group: "Platform Engineering", assignee: "Rajkumar M",   sla: "warn",   updated: "5h ago" },
  { id: "PRB-000005", opened: "2026-04-18 16:42", title: "OMS adapter latency exceeds 250ms on NSE feed",    caller: "Trading Ops", pri: 1, state: "Resolved",    category: "Trading",     group: "Trading Systems",      assignee: "Rajkumar M",   sla: "met",    updated: "1d ago" },
  { id: "PRB-000006", opened: "2026-04-17 13:08", title: "Certificate auto-rotation skipped for fs-le-dx",   caller: "Security",    pri: 3, state: "New",         category: "Security",    group: "Platform Engineering", assignee: null,           sla: "ok",     updated: "2d ago" },
];

export default function Screen() {
  const search = useUiStore((s) => s.search);
  const createdId = useUiStore((s) => s.params.createdProblemId) as string | undefined;
  const { data } = useProblemRecords(search);
  const update = useUpdateProblem();
  const records = React.useMemo(() => data ?? [], [data]);
  return (
    <RecordListScreen<SnProblem>
      title="Problems"
      subtitle="Find and fix the root causes behind recurring incidents"
      noun={{ one: "Problem", many: "Problems" }}
      totalIcon="fa-magnifying-glass-chart"
      nextState={NEXT_STATE}
      doneStates={DONE}
      stateColor={STATE_COLOR}
      stateTone={STATE_TONE}
      newRoute="problem-new"
      detailRoute="problem-detail"
      majorTitle="Critical Problems"
      majorIcon="fa-fire"
      majorEmpty="No open critical problems."
      majorFilter={(r) => r.pri === 1}
      extraTabs={KNOWN_ERROR_TAB}
      records={records}
      highlightId={createdId}
      onAdvance={(r, next) => update.mutate({ id: r.id, patch: { state: next } })}
      advancing={update.isPending}
    />
  );
}
