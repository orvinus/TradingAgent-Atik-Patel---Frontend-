// src/components/copy-trading/MessageTypeBadge.tsx
import type { SignalMessageType } from "@/types/copyTrading";

interface Config {
  label: string;
  cls: string;
}

const BADGE_CONFIG: Record<string, Config> = {
  new_entry:    { label: "ENTRY",        cls: "border-bull/40 bg-bull/10 text-bull" },
  commentary:   { label: "UPDATE",       cls: "border-info/40 bg-info/10 text-info" },
  partial_exit: { label: "PARTIAL EXIT", cls: "border-warning/40 bg-warning/10 text-warning" },
  full_exit:    { label: "CLOSE",        cls: "border-bear/40 bg-bear/10 text-bear" },
  adjust_sl:    { label: "ADJUST SL",    cls: "border-purple-400/40 bg-purple-500/10 text-purple-400" },
  noise:        { label: "NOISE",        cls: "border-border-default bg-bg-elevated text-text-disabled" },
};

export function MessageTypeBadge({ messageType }: { messageType: SignalMessageType | null | undefined }) {
  if (!messageType || messageType === "noise") return null;
  const cfg = BADGE_CONFIG[messageType] ?? BADGE_CONFIG["commentary"];
  if (!cfg) return null;
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-sm border px-1.5 py-0.5 font-mono text-[.52rem] uppercase tracking-[.14em] ${cfg.cls}`}
    >
      {cfg.label}
    </span>
  );
}

export function messageTypeLabel(t: SignalMessageType | null | undefined): string {
  if (!t) return "";
  return BADGE_CONFIG[t]?.label ?? t;
}
