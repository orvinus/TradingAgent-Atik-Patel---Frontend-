// src/components/copy-trading/ExecutionStatusChip.tsx
export type ExecStatus = "executed" | "pending_confirm" | "skipped" | "failed" | "review_required" | "already_processed";

interface ChipConfig {
  icon: string;
  label: string;
  cls: string;
}

const CHIP: Record<ExecStatus, ChipConfig> = {
  executed:          { icon: "✓", label: "EXECUTED",          cls: "border-bull/40 bg-bull/10 text-bull" },
  pending_confirm:   { icon: "⋯", label: "PENDING CONFIRM",   cls: "border-warning/40 bg-warning/10 text-warning" },
  skipped:           { icon: "—", label: "SKIPPED",           cls: "border-border-default bg-bg-elevated text-text-muted" },
  failed:            { icon: "✗", label: "FAILED",            cls: "border-bear/40 bg-bear/10 text-bear" },
  review_required:   { icon: "⚠", label: "REVIEW REQUIRED",  cls: "border-warning/40 bg-warning/10 text-warning" },
  already_processed: { icon: "✓", label: "ALREADY PROCESSED", cls: "border-border-default bg-bg-elevated text-text-muted" },
};

export function ExecutionStatusChip({ status }: { status: ExecStatus | null | undefined }) {
  if (!status) return null;
  const cfg = CHIP[status] ?? CHIP.skipped;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 font-mono text-[.52rem] uppercase tracking-[.12em] ${cfg.cls}`}
    >
      <span>{cfg.icon}</span>
      {cfg.label}
    </span>
  );
}

// Derive execution status from order status + pipeline outcome flags
export function deriveExecStatus(
  orderStatus: string | null | undefined,
  flags?: { skipped?: boolean; requiresConfirmation?: boolean; reviewQueued?: boolean; idempotentNoop?: boolean },
): ExecStatus | null {
  if (flags?.reviewQueued) return "review_required";
  if (flags?.idempotentNoop) return "already_processed";
  if (flags?.skipped) return "skipped";
  if (!orderStatus) return null;
  if (orderStatus === "submitted" || orderStatus === "filled") return "executed";
  if (orderStatus === "pending_confirmation" || flags?.requiresConfirmation) return "pending_confirm";
  if (orderStatus === "failed" || orderStatus === "rejected") return "failed";
  if (orderStatus === "cancelled") return "skipped";
  return null;
}
