// Incidents list — clean ServiceNow filter-chip + table layout.
// Ported from screens/incidents.jsx.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { useUiStore } from "@/store/ui";
import { useIncidentRecords, useUpdateIncident } from "@/api/hooks";
import { useCanWrite } from "@/auth/auth";
import ReadOnlyBadge from "@/components/ReadOnlyBadge";

// State machine for the click-to-advance STATE pill.
const NEXT_STATE: Record<string, string> = {
  New: "Assigned",
  Assigned: "In Progress",
  "In Progress": "Resolved",
  Resolved: "Closed",
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

export default function IncidentsScreen() {
  const { setRoute } = useNav();
  const tenant = useUiStore((s) => s.tenant);
  const createdId = useUiStore((s) => s.params.createdIncidentId) as string | undefined;
  const search = useUiStore((s) => s.search);
  const setSearch = useUiStore((s) => s.setSearch);
  const { data } = useIncidentRecords(search);
  const update = useUpdateIncident();
  const canWrite = useCanWrite();
  const records = data ?? [];

  const advanceState = (e: React.MouseEvent, inc: SnIncident) => {
    e.stopPropagation();
    if (!canWrite) return;
    const next = NEXT_STATE[inc.state];
    if (next) update.mutate({ id: inc.id, patch: { state: next } });
  };
  const [filters, setFilters] = React.useState([
    { k: "State", op: "≠", v: "Closed" },
    { k: "Priority", op: "=", v: "P1,P2,P3" },
    { k: "Site", op: "=", v: "fs-prd-htspr1" },
  ]);
  const removeFilter = (i: number) => setFilters(filters.filter((_, idx) => idx !== i));

  // Sort state — clicking a sortable header toggles asc/desc.
  const [sort, setSort] = React.useState<{ key: "id" | "opened" | "pri" | "state"; dir: "asc" | "desc" }>({ key: "id", dir: "asc" });
  const toggleSort = (key: "id" | "opened" | "pri" | "state") =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  const sortCaret = (key: string) =>
    sort.key === key ? (
      <i className={`fa-solid fa-caret-${sort.dir === "asc" ? "up" : "down"}`} style={{ marginLeft: 4, fontSize: 9 }} />
    ) : (
      <i className="fa-solid fa-sort" style={{ marginLeft: 4, fontSize: 9, opacity: 0.3 }} />
    );

  // Apply the active filter chips (client-side) then sort.
  const visible = React.useMemo(() => {
    const rows = records.filter((inc) => {
      for (const f of filters) {
        if (f.k === "State" && f.op === "≠" && inc.state === f.v) return false;
        if (f.k === "Priority" && f.op === "=") {
          const allowed = f.v.split(",").map((p) => Number(p.replace(/\D/g, "")));
          if (allowed.length && !allowed.includes(inc.pri)) return false;
        }
        // "Site" has no backing field on records — it stays a display-only chip.
      }
      return true;
    });
    const dir = sort.dir === "asc" ? 1 : -1;
    const val = (inc: SnIncident): string | number =>
      sort.key === "pri" ? inc.pri : sort.key === "state" ? inc.state : sort.key === "opened" ? inc.opened : inc.id;
    return [...rows].sort((a, b) => {
      const av = val(a), bv = val(b);
      return av < bv ? -dir : av > bv ? dir : 0;
    });
  }, [records, filters, sort]);

  const slaPill = (s: string) => {
    if (s === "breach") return <span style={{ color: "#dc2626", fontWeight: 600, fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}><i className="fa-solid fa-triangle-exclamation" /> Breach</span>;
    if (s === "warn") return <span style={{ color: "#d97706", fontWeight: 600, fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}><i className="fa-solid fa-clock" /> Warning</span>;
    if (s === "met") return <span style={{ color: "#059669", fontWeight: 600, fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}><i className="fa-solid fa-check" /> Met</span>;
    return <span style={{ color: "#059669", fontWeight: 600, fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}><i className="fa-solid fa-check" /> OK</span>;
  };

  const statePill = (s: string) => {
    const colors: Record<string, { dot: string; bg: string; fg: string }> = {
      New: { dot: "#a855f7", bg: "#faf5ff", fg: "#6b21a8" },
      Assigned: { dot: "#3b82f6", bg: "#eff6ff", fg: "#1d4ed8" },
      "In Progress": { dot: "#10b981", bg: "#ecfdf5", fg: "#047857" },
      Resolved: { dot: "#16a34a", bg: "#f0fdf4", fg: "#15803d" },
    };
    const c = colors[s] || colors.New;
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500, color: c.fg, padding: "2px 8px", borderRadius: 12, background: c.bg }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: c.dot }} /> {s}
      </span>
    );
  };

  const priBadge = (p: number) => {
    const colors: Record<number, { bg: string; fg: string; brd: string }> = {
      1: { bg: "#fef3c7", fg: "#92400e", brd: "#fcd34d" },
      2: { bg: "#fef3c7", fg: "#92400e", brd: "#fcd34d" },
      3: { bg: "#dbeafe", fg: "#1e40af", brd: "#93c5fd" },
      4: { bg: "#f3f4f6", fg: "#374151", brd: "#d1d5db" },
    };
    const c = colors[p] || colors[3];
    return (
      <span style={{ display: "inline-block", width: 22, height: 22, lineHeight: "20px", textAlign: "center", border: `1px solid ${c.brd}`, background: c.bg, color: c.fg, fontSize: 12, fontWeight: 700, borderRadius: 3 }}>
        {p}
      </span>
    );
  };

  return (
    <div className="page page-fade sn-dash">
      <div className="sn-breadcrumb">
        <a className="sn-link">Home</a><span className="sn-bc-sep">›</span>
        <a className="sn-link">Incident Management</a><span className="sn-bc-sep">›</span>
        <span>All Incidents</span>
      </div>

      <div className="sn-form-header">
        <div className="sn-form-title-row">
          <span className="sn-rec-number">INCIDENTS</span>
          <span className="sn-pill prio-1"><i className="fa-solid fa-circle" /> {visible.filter((i) => i.pri === 1).length} Critical</span>
          <span className="sn-pill state-progress"><i className="fa-solid fa-spinner fa-spin" /> {visible.filter((i) => i.state !== "Resolved").length} Active</span>
        </div>
        <div className="sn-form-title-meta">
          <div>
            <h1>All Incidents · {tenant.name}</h1>
            <div className="sn-form-sub">{visible.length} records · auto-refresh 30s · last sync 2s ago</div>
          </div>
          <div className="sn-form-actions">
            <ReadOnlyBadge />
            <button className="sn-btn"><i className="fa-solid fa-file-export" /> Export</button>
            {canWrite && (
              <button className="sn-btn primary" onClick={() => setRoute("incident-new")}><i className="fa-solid fa-plus" /> New Incident</button>
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{ margin: "16px 24px 0", background: "white", border: "1px solid #e5e8eb", borderRadius: 6, overflow: "hidden" }}>
        {/* Active filters bar */}
        <div style={{ padding: "12px 20px", borderBottom: "1px solid #e5e8eb", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", background: "white" }}>
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

        {/* Table */}
        <table className="sn-list-table" style={{ fontSize: 12.5 }}>
          <thead>
            <tr>
              <th style={{ width: 36 }}><input type="checkbox" /></th>
              <th style={{ cursor: "pointer" }} onClick={() => toggleSort("id")}>NUMBER {sortCaret("id")}</th>
              <th style={{ cursor: "pointer" }} onClick={() => toggleSort("opened")}>OPENED {sortCaret("opened")}</th>
              <th>SHORT DESCRIPTION</th>
              <th style={{ width: 130 }}>CALLER</th>
              <th style={{ width: 60, textAlign: "center", cursor: "pointer" }} onClick={() => toggleSort("pri")}>PRI {sortCaret("pri")}</th>
              <th style={{ width: 130, cursor: "pointer" }} onClick={() => toggleSort("state")}>STATE {sortCaret("state")}</th>
              <th style={{ width: 110 }}>CATEGORY</th>
              <th style={{ width: 180 }}>ASSIGNMENT GROUP</th>
              <th style={{ width: 130 }}>ASSIGNED TO</th>
              <th style={{ width: 100 }}>SLA</th>
              <th style={{ width: 80 }}>UPDATED</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((inc) => (
              <tr key={inc.id} onClick={() => setRoute("incident-detail")} style={{ cursor: "pointer", background: inc.id === createdId ? "#ecfdf5" : inc.critical ? "#fef2f2" : undefined, boxShadow: inc.id === createdId ? "inset 3px 0 0 var(--success)" : undefined }}>
                <td onClick={(e) => e.stopPropagation()}><input type="checkbox" /></td>
                <td><a className="sn-link mono" style={{ fontWeight: 700, color: inc.critical ? "#dc2626" : "#016" }}>{inc.id}</a></td>
                <td className="mono" style={{ fontSize: 11.5, color: "#475467" }}>{inc.opened}</td>
                <td style={{ color: "#0f1c3f" }}>{inc.title}</td>
                <td style={{ color: "#475467" }}>{inc.caller}</td>
                <td style={{ textAlign: "center" }}>{priBadge(inc.pri)}</td>
                <td
                  onClick={(e) => advanceState(e, inc)}
                  title={!canWrite ? "Read-only" : NEXT_STATE[inc.state] ? `Click to advance → ${NEXT_STATE[inc.state]}` : "Final state"}
                  style={{ cursor: canWrite && NEXT_STATE[inc.state] ? "pointer" : "default" }}
                >
                  {statePill(inc.state)}
                </td>
                <td style={{ color: "#475467" }}>{inc.category}</td>
                <td style={{ color: "#475467", fontSize: 11.5 }}>{inc.group}</td>
                <td style={{ color: inc.assignee ? "#0f1c3f" : "#9ca3af" }}>{inc.assignee || "—"}</td>
                <td>{slaPill(inc.sla)}</td>
                <td className="text-mute" style={{ fontSize: 11 }}>{inc.updated}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer */}
        <div style={{ padding: "12px 20px", borderTop: "1px solid #e5e8eb", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fafbfc" }}>
          <span style={{ fontSize: 11.5, color: "#6b7785" }}>
            Showing 1–{visible.length} of {visible.length} · Rows per page: 20
          </span>
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
