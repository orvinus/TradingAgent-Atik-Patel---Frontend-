// src/components/copy-trading/ModActionChips.tsx — V2 mod_action chips
import type { ModActionOp } from "@/types/copyTrading";

const OP_LABEL: Record<string, string> = {
  open_order:       "ENTRY",
  take_profit_hit:  "TP HIT",
  close_partial:    "PARTIAL CLOSE",
  close_full:       "CLOSE ALL",
  close_all:        "CLOSE ALL POSITIONS",
  move_sl_breakeven:"SL → BREAKEVEN",
  set_sl:           "SET SL",
  update_tp:        "UPDATE TP",
  stop_loss_hit:    "SL HIT",
  cancel_order:     "CANCEL",
  reenter:          "RE-ENTRY",
  order_triggered:  "TRIGGERED",
  scale_in:         "SCALE IN",
};

const OP_CLS: Record<string, string> = {
  open_order:       "border-bull/40 bg-bull/10 text-bull",
  take_profit_hit:  "border-warning/40 bg-warning/10 text-warning",
  close_partial:    "border-warning/40 bg-warning/10 text-warning",
  close_full:       "border-bear/40 bg-bear/10 text-bear",
  close_all:        "border-bear/60 bg-bear/20 text-bear font-bold",
  move_sl_breakeven:"border-purple-400/40 bg-purple-500/10 text-purple-400",
  set_sl:           "border-purple-400/40 bg-purple-500/10 text-purple-400",
  update_tp:        "border-teal-400/40 bg-teal-500/10 text-teal-400",
  stop_loss_hit:    "border-bear/40 bg-bear/10 text-bear",
  cancel_order:     "border-border-default bg-bg-elevated text-text-muted",
  reenter:          "border-bull/30 bg-bull/5 text-bull",
  order_triggered:  "border-info/40 bg-info/10 text-info",
  scale_in:         "border-bull/30 bg-bull/5 text-bull",
};

export function ModActionChips({
  ops,
  labels,
  tpIndex,
}: {
  ops?: ModActionOp[] | string[] | null;
  labels?: string[] | null;
  tpIndex?: number | null;
}) {
  if (!ops?.length && !labels?.length) return null;

  const display = labels?.length
    ? labels
    : (ops ?? []).map((op) => {
        let base = OP_LABEL[op] ?? op.toUpperCase();
        if ((op === "take_profit_hit") && tpIndex != null) base = `TP${tpIndex} HIT`;
        return base;
      });

  const clsList = (ops ?? []).map((op) => OP_CLS[op] ?? "border-border-default text-text-muted");

  return (
    <div className="flex flex-wrap gap-1">
      {display.map((label, i) => (
        <span
          key={i}
          className={`inline-flex items-center rounded-sm border px-1.5 py-0.5 font-mono text-[.5rem] uppercase tracking-[.12em] ${clsList[i] ?? "border-border-default text-text-muted"}`}
        >
          {label}
        </span>
      ))}
    </div>
  );
}
