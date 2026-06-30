// src/components/copy-trading/OrderRoleBadge.tsx
import type { OrderRole } from "@/types/copyValidator";

const ROLE_CONFIG: Record<string, { label: string; cls: string }> = {
  entry:        { label: "ENTRY",        cls: "border-bull/40 bg-bull/10 text-bull" },
  partial_exit: { label: "PARTIAL EXIT", cls: "border-warning/40 bg-warning/10 text-warning" },
  full_exit:    { label: "CLOSE",        cls: "border-bear/40 bg-bear/10 text-bear" },
  adjust_sl:    { label: "ADJUST SL",    cls: "border-purple-400/40 bg-purple-500/10 text-purple-400" },
  update_tp:    { label: "UPDATE TP",    cls: "border-teal-400/40 bg-teal-500/10 text-teal-400" },
  cancel:       { label: "CANCEL",       cls: "border-border-default bg-bg-elevated text-text-muted" },
  reenter:      { label: "RE-ENTRY",     cls: "border-bull/30 bg-bull/5 text-bull" },
};

export function OrderRoleBadge({ role }: { role: OrderRole | null | undefined }) {
  if (!role) return null;
  const cfg = ROLE_CONFIG[role] ?? ROLE_CONFIG["entry"];
  if (!cfg) return null;
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-sm border px-1.5 py-0.5 font-mono text-[.52rem] uppercase tracking-[.14em] ${cfg.cls}`}
    >
      {cfg.label}
    </span>
  );
}
