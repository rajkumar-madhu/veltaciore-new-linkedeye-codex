// Problems list — clean ServiceNow filter-chip + table layout.
// Ported from screens/problems.jsx.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { useUiStore } from "@/store/ui";
import { useProblemRecords, useUpdateProblem } from "@/api/hooks";
import { useCanWrite } from "@/auth/auth";
import ReadOnlyBadge from "@/components/ReadOnlyBadge";

// Click-to-advance progression for the problem STATE pill.
const NEXT_STATE: Record<string, string> = {
  New: "Assigned",
  Assigned: "In Progress",
  "In Progress": "Known Error",
  "Known Error": "Resolved",
  Resolved: "Closed",
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

export default function ProblemsScreen() {
  const { setRoute } = useNav();
  // Live /problems/records/ data (SN record shape) with local seed fallback so
  // the screen renders standalone when the backend is down.
  const search = useUiStore((s) => s.search);
  const setSearch = useUiStore((s) => s.setSearch);
  const { data } = useProblemRecords(search);
  const problems = data ?? [];
  const createdId = useUiStore((s) => s.params.createdProblemId) as string | undefined;
  const [filters, setFilters] = React.useState([
    { k: "State", op: "≠", v: "Closed" },
    { k: "Priority", op: "=", v: "P1,P2,P3" },
  ]);
  const removeFilter = (i: number) => setFilters(filters.filter((_, idx) => idx !== i));

  const update = useUpdateProblem();
  const canWrite = useCanWrite();
  const advanceState = (e: React.MouseEvent, p: SnProblem) => {
    e.stopPropagation();
    if (!canWrite) return;
    const next = NEXT_STATE[p.state];
    if (next) update.mutate({ id: p.id, patch: { state: next } });
  };

  const [sort, setSort] = React.useState<{ key: "id" | "opened" | "pri" | "state"; dir: "asc" | "desc" }>({ key: "id", dir: "asc" });
  const toggleSort = (key: "id" | "opened" | "pri" | "state") =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  const sortCaret = (key: string) =>
    sort.key === key ? (
      <i className={`fa-solid fa-caret-${sort.dir === "asc" ? "up" : "down"}`} style={{ marginLeft: 4, fontSize: 9 }} />
    ) : (
      <i className="fa-solid fa-sort" style={{ marginLeft: 4, fontSize: 9, opacity: 0.3 }} />
    );

  const visible = React.useMemo(() => {
    const rows = problems.filter((p) => {
      for (const f of filters) {
        if (f.k === "State" && f.op === "≠" && p.state === f.v) return false;
        if (f.k === "Priority" && f.op === "=") {
          const allowed = f.v.split(",").map((x) => Number(x.replace(/\D/g, "")));
          if (allowed.length && !allowed.includes(p.pri)) return false;
        }
      }
      return true;
    });
    const dir = sort.dir === "asc" ? 1 : -1;
    const val = (p: SnProblem): string | number =>
      sort.key === "pri" ? p.pri : sort.key === "state" ? p.state : sort.key === "opened" ? p.opened : p.id;
    return [...rows].sort((a, b) => {
      const av = val(a), bv = val(b);
      return av < bv ? -dir : av > bv ? dir : 0;
    });
  }, [problems, filters, sort]);

  const slaPill = (s: string) => {
    if (s === "breach") return <span style={{ color: "#dc2626", fontWeight: 600, fontSize: 12 }}><i className="fa-solid fa-triangle-exclamation" /> Breach</span>;
    if (s === "warn")   return <span style={{ color: "#d97706", fontWeight: 600, fontSize: 12 }}><i className="fa-solid fa-clock" /> Warning</span>;
    if (s === "met")    return <span style={{ color: "#059669", fontWeight: 600, fontSize: 12 }}><i className="fa-solid fa-check" /> Met</span>;
    return <span style={{ color: "#059669", fontWeight: 600, fontSize: 12 }}><i className="fa-solid fa-check" /> OK</span>;
  };

  const statePill = (s: string) => {
    const colors: Record<string, { dot: string; bg: string; fg: string }> = {
      "New": { dot: "#a855f7", bg: "#faf5ff", fg: "#6b21a8" },
      "Assigned": { dot: "#3b82f6", bg: "#eff6ff", fg: "#1d4ed8" },
      "In Progress": { dot: "#10b981", bg: "#ecfdf5", fg: "#047857" },
      "Known Error": { dot: "#f59e0b", bg: "#fffbeb", fg: "#b45309" },
      "Resolved": { dot: "#16a34a", bg: "#f0fdf4", fg: "#15803d" },
    };
    const c = colors[s] || colors.New;
    return <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500, color: c.fg, padding: "2px 8px", borderRadius: 12, background: c.bg }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: c.dot }} /> {s}
    </span>;
  };

  const priBadge = (p: number) => {
    const colors: Record<number, { bg: string; fg: string; brd: string }> = { 1: { bg: "#fef3c7", fg: "#92400e", brd: "#fcd34d" }, 2: { bg: "#fef3c7", fg: "#92400e", brd: "#fcd34d" }, 3: { bg: "#dbeafe", fg: "#1e40af", brd: "#93c5fd" } };
    const c = colors[p] || colors[3];
    return <span style={{ display: "inline-block", width: 22, height: 22, lineHeight: "20px", textAlign: "center", border: `1px solid ${c.brd}`, background: c.bg, color: c.fg, fontSize: 12, fontWeight: 700, borderRadius: 3 }}>{p}</span>;
  };

  return (
    <div className="page page-fade sn-dash">
      <div className="sn-breadcrumb">
        <a className="sn-link">Home</a><span className="sn-bc-sep">›</span>
        <a className="sn-link">Problem Management</a><span className="sn-bc-sep">›</span>
        <span>All Problems</span>
      </div>

      <div className="sn-form-header">
        <div className="sn-form-title-row">
          <span className="sn-rec-number">PROBLEMS</span>
          <span className="sn-pill prio-1"><i className="fa-solid fa-circle" /> {visible.filter(p => p.pri === 1).length} Critical</span>
          <span className="sn-pill state-progress"><i className="fa-solid fa-spinner fa-spin" /> {visible.filter(p => p.state !== "Resolved").length} Active</span>
        </div>
        <div className="sn-form-title-meta">
          <div>
            <h1>Problem Management</h1>
            <div className="sn-form-sub">{visible.length} records · auto-refresh 60s · last sync 4s ago</div>
          </div>
          <div className="sn-form-actions">
            <ReadOnlyBadge />
            <button className="sn-btn"><i className="fa-solid fa-file-export" /> Export</button>
            {canWrite && (
              <button className="sn-btn primary" onClick={() => setRoute("problem-new")}><i className="fa-solid fa-plus" /> New Problem</button>
            )}
          </div>
        </div>
      </div>

      <div style={{ margin: "16px 24px 0", background: "white", border: "1px solid #e5e8eb", borderRadius: 6, overflow: "hidden" }}>
        <div style={{ padding: "12px 20px", borderBottom: "1px solid #e5e8eb", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11.5, color: "#6b7785", fontWeight: 600 }}>Active filters:</span>
          {search && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 12px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 16, fontSize: 12, color: "#1d4ed8", fontWeight: 600 }}>
              <i className="fa-solid fa-magnifying-glass" style={{ fontSize: 10 }} /> “{search}”
              <i className="fa-solid fa-xmark" onClick={() => setSearch("")} style={{ cursor: "pointer", fontSize: 10, opacity: 0.7 }} title="Clear search" />
            </span>
          )}
          {filters.map((f, i) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 12px", background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 16, fontSize: 12, color: "#047857", fontWeight: 500 }}>
              {f.k} {f.op} {f.v}
              <i className="fa-solid fa-xmark" onClick={() => removeFilter(i)} style={{ cursor: "pointer", fontSize: 10, opacity: 0.7 }} />
            </span>
          ))}
          <span style={{ flex: 1 }} />
          <button className="sn-btn" style={{ padding: "5px 12px" }}><i className="fa-solid fa-filter" /> Add Filter</button>
        </div>

        <table className="sn-list-table" style={{ fontSize: 12.5 }}>
          <thead>
            <tr>
              <th style={{ width: 36 }}><input type="checkbox" /></th>
              <th style={{ cursor: "pointer" }} onClick={() => toggleSort("id")}>NUMBER {sortCaret("id")}</th>
              <th style={{ cursor: "pointer" }} onClick={() => toggleSort("opened")}>OPENED {sortCaret("opened")}</th>
              <th>SHORT DESCRIPTION</th>
              <th style={{ width: 130 }}>CALLER</th>
              <th style={{ width: 60, textAlign: "center", cursor: "pointer" }} onClick={() => toggleSort("pri")}>PRI {sortCaret("pri")}</th>
              <th style={{ width: 140, cursor: "pointer" }} onClick={() => toggleSort("state")}>STATE {sortCaret("state")}</th>
              <th style={{ width: 110 }}>CATEGORY</th>
              <th style={{ width: 180 }}>ASSIGNMENT GROUP</th>
              <th style={{ width: 130 }}>ASSIGNED TO</th>
              <th style={{ width: 100 }}>SLA</th>
              <th style={{ width: 80 }}>UPDATED</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(p => (
              <tr key={p.id} onClick={() => setRoute("problem-detail")} style={{ cursor: "pointer", background: p.id === createdId ? "#ecfdf5" : p.critical ? "#fef2f2" : undefined, boxShadow: p.id === createdId ? "inset 3px 0 0 var(--success)" : undefined }}>
                <td onClick={(e) => e.stopPropagation()}><input type="checkbox" /></td>
                <td><a className="sn-link mono" style={{ fontWeight: 700, color: p.critical ? "#dc2626" : "#016" }}>{p.id}</a></td>
                <td className="mono" style={{ fontSize: 11.5, color: "#475467" }}>{p.opened}</td>
                <td style={{ color: "#0f1c3f" }}>{p.title}</td>
                <td style={{ color: "#475467" }}>{p.caller}</td>
                <td style={{ textAlign: "center" }}>{priBadge(p.pri)}</td>
                <td onClick={(e) => advanceState(e, p)} title={!canWrite ? "Read-only" : NEXT_STATE[p.state] ? `Click to advance → ${NEXT_STATE[p.state]}` : "Final state"} style={{ cursor: canWrite && NEXT_STATE[p.state] ? "pointer" : "default" }}>{statePill(p.state)}</td>
                <td style={{ color: "#475467" }}>{p.category}</td>
                <td style={{ color: "#475467", fontSize: 11.5 }}>{p.group}</td>
                <td style={{ color: p.assignee ? "#0f1c3f" : "#9ca3af" }}>{p.assignee || "—"}</td>
                <td>{slaPill(p.sla)}</td>
                <td className="text-mute" style={{ fontSize: 11 }}>{p.updated}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ padding: "12px 20px", borderTop: "1px solid #e5e8eb", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fafbfc" }}>
          <span style={{ fontSize: 11.5, color: "#6b7785" }}>Showing 1–{visible.length} of {visible.length} · Rows per page: 20</span>
          <div style={{ display: "flex", gap: 4 }}>
            <button className="sn-btn" style={{ padding: "3px 10px", fontSize: 11 }}><i className="fa-solid fa-chevron-left" /></button>
            <button className="sn-btn primary" style={{ padding: "3px 12px", fontSize: 11 }}>1</button>
            <button className="sn-btn" style={{ padding: "3px 10px", fontSize: 11 }}><i className="fa-solid fa-chevron-right" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
