// Small indicator shown in list/form headers when the signed-in identity lacks
// a writer role. Purely a UX affordance — the authoritative check is the OPA
// rego enforced server-side; this just explains why write controls are hidden.
import React from "react";
import { useCanWrite, useAuth } from "@/auth/auth";

import { Icon } from "@/components/Icon";
import { EyeIcon } from "lucide-react";
export default function ReadOnlyBadge() {
  const canWrite = useCanWrite();
  const role = useAuth((s) => s.identity.roles[0] ?? "viewer");
  if (canWrite) return null;
  return (
    <span
      title={`Signed in as ${role} — read-only. Ask an administrator for a writer role to make changes.`}
      className="inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-[14px] text-[11.5px] font-semibold text-[#6b7280] bg-[#f3f4f6] border border-[#e5e7eb]"
    >
      <Icon icon={EyeIcon} className="text-[10px]" /> Read-only
    </span>
  );
}
