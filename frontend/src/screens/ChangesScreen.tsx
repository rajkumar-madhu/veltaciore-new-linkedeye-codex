// Changes list — clean ServiceNow filter-chip + table layout.
// Ported from screens/changes.jsx.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { useUiStore } from "@/store/ui";
import { useChangeRecords, useUpdateChange } from "@/api/hooks";
import { useCanWrite } from "@/auth/auth";
import ReadOnlyBadge from "@/components/ReadOnlyBadge";

// Click-to-advance progression for the change STATE pill.
const NEXT_STATE: Record<string, string> = {
  New: "Scheduled",
  Scheduled: "CAB Review",
  "CAB Review": "Approved",
  Approved: "Implement",
  Implement: "Completed",
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

export default function ChangesScreen() {
  const { setRoute } = useNav();
  // Live /changes/records/ data (SN record shape) with local seed fallback so
  // the screen renders standalone when the backend is down.
  const search = useUiStore((s) => s.search);
  const setSearch = useUiStore((s) => s.setSearch);
  const { data } = useChangeRecords(search);
  const changes = data ?? [];
  const createdId = useUiStore((s) => s.params.createdChangeId) as string | undefined;
  const [filters, setFilters] = React.useState([
    { k: "State", op: "≠", v: "Closed" },
    { k: "Type", op: "=", v: "Normal,Emergency" },
  ]);
  const removeFilter = (i: number) => setFilters(filters.filter((_, idx) => idx !== i));

  const update = useUpdateChange();
  const canWrite = useCanWrite();
  const advanceState = (e: React.MouseEvent, c: SnChange) => {
    e.stopPropagation();
    if (!canWrite) return;
    const next = NEXT_STATE[c.state];
    if (next) update.mutate({ id: c.id, patch: { state: next } });
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
    const rows = changes.filter((c) => {
      for (const f of filters) {
        if (f.k === "State" && f.op === "≠" && c.state === f.v) return false;
        // "Type" has no backing field on change records — display-only chip.
      }
      return true;
    });
    const dir = sort.dir === "asc" ? 1 : -1;
    const val = (c: SnChange): string | number =>
      sort.key === "pri" ? c.pri : sort.key === "state" ? c.state : sort.key === "opened" ? c.opened : c.id;
    return [...rows].sort((a, b) => {
      const av = val(a), bv = val(b);
      return av < bv ? -dir : av > bv ? dir : 0;
    });
  }, [changes, filters, sort]);

  const slaPill = (s: string) => {
    if (s === "breach") return <span style={{ color: "#dc2626", fontWeight: 600, fontSize: 12 }}><i className="fa-solid fa-triangle-exclamation" /> Breach</span>;
    if (s === "warn")   return <span style={{ color: "#d97706", fontWeight: 600, fontSize: 12 }}><i className="fa-solid fa-clock" /> Warning</span>;
    if (s === "met")    return <span style={{ color: "#059669", fontWeight: 600, fontSize: 12 }}><i className="fa-solid fa-check" /> Met</span>;
    return <span style={{ color: "#059669", fontWeight: 600, fontSize: 12 }}><i className="fa-solid fa-check" /> OK</span>;
  };

  const statePill = (s: string) => {
    const colors: Record<string, { dot: string; bg: string; fg: string }> = {
      "Draft": { dot: "#94a3b8", bg: "#f1f5f9", fg: "#475569" },
      "CAB Review": { dot: "#f59e0b", bg: "#fffbeb", fg: "#b45309" },
      "Approved": { dot: "#3b82f6", bg: "#eff6ff", fg: "#1d4ed8" },
      "Scheduled": { dot: "#a855f7", bg: "#faf5ff", fg: "#6b21a8" },
      "Implement": { dot: "#10b981", bg: "#ecfdf5", fg: "#047857" },
      "Completed": { dot: "#16a34a", bg: "#f0fdf4", fg: "#15803d" },
    };
    const c = colors[s] || colors.Draft;
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
        <a className="sn-link">Change Management</a><span className="sn-bc-sep">›</span>
        <span>All Changes</span>
      </div>

      <div className="sn-form-header">
        <div className="sn-form-title-row">
          <span className="sn-rec-number">CHANGES</span>
          <span className="sn-pill prio-1"><i className="fa-solid fa-circle" /> {visible.filter(c => c.pri === 1).length} Critical</span>
          <span className="sn-pill state-progress"><i className="fa-solid fa-spinner fa-spin" /> {visible.filter(c => c.state !== "Completed").length} Active</span>
        </div>
        <div className="sn-form-title-meta">
          <div>
            <h1>Change Management</h1>
            <div className="sn-form-sub">{visible.length} records · CAB meets Fri 14:00 UTC · 2 pending approval</div>
          </div>
          <div className="sn-form-actions">
            <ReadOnlyBadge />
            <button className="sn-btn"><i className="fa-solid fa-calendar" /> Calendar</button>
            {canWrite && (
              <button className="sn-btn primary" onClick={() => setRoute("change-new")}><i className="fa-solid fa-plus" /> New Change</button>
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
            {visible.map(c => (
              <tr key={c.id} onClick={() => setRoute("change-detail")} style={{ cursor: "pointer", background: c.id === createdId ? "#ecfdf5" : c.critical ? "#fef2f2" : undefined, boxShadow: c.id === createdId ? "inset 3px 0 0 var(--success)" : undefined }}>
                <td onClick={(e) => e.stopPropagation()}><input type="checkbox" /></td>
                <td><a className="sn-link mono" style={{ fontWeight: 700, color: c.critical ? "#dc2626" : "#016" }}>{c.id}</a></td>
                <td className="mono" style={{ fontSize: 11.5, color: "#475467" }}>{c.opened}</td>
                <td style={{ color: "#0f1c3f" }}>{c.title}</td>
                <td style={{ color: "#475467" }}>{c.caller}</td>
                <td style={{ textAlign: "center" }}>{priBadge(c.pri)}</td>
                <td onClick={(e) => advanceState(e, c)} title={!canWrite ? "Read-only" : NEXT_STATE[c.state] ? `Click to advance → ${NEXT_STATE[c.state]}` : "Final state"} style={{ cursor: canWrite && NEXT_STATE[c.state] ? "pointer" : "default" }}>{statePill(c.state)}</td>
                <td style={{ color: "#475467" }}>{c.category}</td>
                <td style={{ color: "#475467", fontSize: 11.5 }}>{c.group}</td>
                <td style={{ color: c.assignee ? "#0f1c3f" : "#9ca3af" }}>{c.assignee || "—"}</td>
                <td>{slaPill(c.sla)}</td>
                <td className="text-mute" style={{ fontSize: 11 }}>{c.updated}</td>
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
