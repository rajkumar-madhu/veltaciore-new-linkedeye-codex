// Small indicator shown in list/form headers when the signed-in identity lacks
// a writer role. Purely a UX affordance — the authoritative check is the OPA
// rego enforced server-side; this just explains why write controls are hidden.
import React from "react";
import { useCanWrite, useAuth } from "@/auth/auth";

export default function ReadOnlyBadge() {
  const canWrite = useCanWrite();
  const role = useAuth((s) => s.identity.roles[0] ?? "viewer");
  if (canWrite) return null;
  return (
    <span
      title={`Signed in as ${role} — read-only. Ask an administrator for a writer role to make changes.`}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px",
        borderRadius: 14, fontSize: 11.5, fontWeight: 600, color: "#6b7280",
        background: "#f3f4f6", border: "1px solid #e5e7eb",
      }}
    >
      <i className="fa-solid fa-eye" style={{ fontSize: 10 }} /> Read-only
    </span>
  );
}
