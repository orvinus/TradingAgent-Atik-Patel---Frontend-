// src/components/copy-trading/SignalCard.tsx
// Full lifecycle signal card for the inbox — supports all Phase 0/2/3/V2 states.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LuLoader, LuRefreshCw, LuExternalLink } from "react-icons/lu";
import { tradeThreadsApi } from "@/api/endpoints/tradeThreads";
import { qk } from "@/api/queryKeys";
import { ROUTES } from "@/constants/routes";
import { MessageTypeBadge } from "./MessageTypeBadge";
import { ExecutionStatusChip, deriveExecStatus } from "./ExecutionStatusChip";
import { ModActionChips } from "./ModActionChips";
import type { ParsedSignalRow, SignalMessageType } from "@/types/copyTrading";
import type { CopyOrder } from "@/types/copyValidator";

// Human-readable skip reasons
const SKIP_REASON_MAP: Record<string, string> = {
  no_open_thread:                "No open trade for this symbol",
  no_open_position:              "No position at broker",
  management_execution_disabled: "Auto-exit disabled in settings",
  exit_qty_zero:                 "Could not calculate sell size",
  broker_not_configured:         "Broker not connected",
  no_bracket_order:              "Entry had no bracket SL",
  no_entry_price:                "Cannot compute breakeven",
  trail_not_supported:           "Trailing stop not automated",
  adjust_sl_execution_disabled:  "Adjust SL feature is off",
  not_management_message:        "Not a management message",
  no_thread_key:                 "No thread key found",
  ambiguous_target:              "Needs review — tap to resolve",
  duplicate_event:               "Already processed (duplicate)",
  directional_violation:         "Stop price invalid for this side",
};

function skipReasonText(reason: string | null | undefined): string {
  if (!reason) return "Skipped";
  return SKIP_REASON_MAP[reason] ?? reason;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

// Confidence bar (0–1 → 0–100 width)
function ConfidenceBar({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color = pct >= 80 ? "bg-bull" : pct >= 55 ? "bg-warning" : "bg-bear";
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1 w-16 overflow-hidden rounded-full bg-bg-elevated">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-[.55rem] text-text-disabled">{pct}%</span>
    </div>
  );
}

interface SignalCardProps {
  signal: ParsedSignalRow;
  platform: "telegram" | "discord";
  // Related order (if any — caller provides it after matching by signalId)
  relatedOrder?: CopyOrder | null;
  // Thread ID if already resolved
  threadId?: string | null;
  onViewOrder?: (orderId: string) => void;
}

export function SignalCard({ signal, platform, relatedOrder, threadId, onViewOrder }: SignalCardProps) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [retryError, setRetryError] = useState<string | null>(null);

  const s = signal.signal;
  const msgType: SignalMessageType | null = s?.message_type ?? null;
  const lifecycleSummary = s?.lifecycle_summary ?? null;
  const rawText = s?.raw_text ?? signal.rawText ?? "";
  const threadKey = s?.thread_key ?? null;
  const modActions = s?.mod_actions ?? null;
  const modLabels = s?.mod_action_labels ?? null;
  const scopeHint = s?.scope_hint ?? null;
  const setupRef = s?.setup_ref ?? null;
  const actionConf = s?.action_confidence ?? s?.parser_confidence ?? null;
  const linkConf = s?.link_confidence ?? null;
  const tpIndex = s?.tp_index ?? null;

  // Hide noise entirely
  if (msgType === "noise") return null;

  // Is this a management message type?
  const isManagement = msgType === "partial_exit" || msgType === "full_exit" || msgType === "adjust_sl";

  // Derive execution status from related order
  const orderStatus = relatedOrder?.status ?? null;
  const managementAction = relatedOrder?.managementAction ?? null;
  let execStatus = deriveExecStatus(orderStatus);

  // If no order found yet but it's a management type → could be pending
  if (!relatedOrder && isManagement) execStatus = null;


  // Retry mutation
  const retryMut = useMutation({
    mutationFn: () =>
      tradeThreadsApi.fromSignal({ platform, signalId: signal.id, forceExecute: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.copyOrdersList() });
      qc.invalidateQueries({ queryKey: qk.tradeThreadsList() });
      setRetryError(null);
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "Retry failed";
      setRetryError(msg);
    },
  });

  const canRetry = isManagement && (execStatus === "skipped" || execStatus === "failed" || !execStatus);

  // Size unit from managementAction
  const sizeUnit =
    relatedOrder?.orderPreview?.size_unit === "contracts" ? "contracts" :
    relatedOrder?.orderPreview?.size_unit === "shares" ? "shares" : "contracts";

  return (
    <div className="rounded-lg border border-border-subtle bg-bg-surface p-4 shadow-card transition-colors hover:border-border-default">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <MessageTypeBadge messageType={msgType} />
          {scopeHint === "channel" && (
            <span className="rounded-sm border border-bear/50 bg-bear/10 px-1.5 py-0.5 font-mono text-[.5rem] uppercase tracking-widest text-bear font-bold">
              CLOSE ALL
            </span>
          )}
          {setupRef && (
            <span className="rounded-sm border border-border-default px-1.5 py-0.5 font-mono text-[.5rem] text-text-muted">
              Setup #{setupRef}
            </span>
          )}
        </div>
        <span className="shrink-0 font-mono text-[.58rem] text-text-disabled">
          {formatTime(signal.createdAt)}
        </span>
      </div>

      {/* Primary: lifecycle summary */}
      {lifecycleSummary && (
        <p className="mt-2 font-mono text-[.72rem] font-semibold text-text-primary leading-snug">
          {lifecycleSummary}
        </p>
      )}

      {/* Secondary: raw text truncated */}
      {rawText && (
        <p className="mt-1 line-clamp-2 font-mono text-[.63rem] text-text-muted leading-snug" title={rawText}>
          {rawText}
        </p>
      )}

      {/* V2 mod action chips */}
      {(modActions?.length || modLabels?.length) ? (
        <div className="mt-2">
          <ModActionChips ops={modActions?.map((m) => m.op) ?? null} labels={modLabels} tpIndex={tpIndex} />
        </div>
      ) : null}

      {/* Confidence row */}
      {actionConf != null && (
        <div className="mt-2 flex items-center gap-3">
          <ConfidenceBar confidence={actionConf} />
          {linkConf != null && (
            <span className="font-mono text-[.55rem] text-text-disabled" title={`Link confidence: ${Math.round(linkConf * 100)}%`}>
              Link {Math.round(linkConf * 100)}%
            </span>
          )}
        </div>
      )}

      {/* Phase 2: execution status for management messages */}
      {isManagement && (
        <div className="mt-3 border-t border-border-subtle pt-3 flex flex-col gap-2">
          {execStatus && (
            <div className="flex items-center gap-2">
              <ExecutionStatusChip status={execStatus} />
              {execStatus === "executed" && managementAction?.sellQty != null && (
                <span className="font-mono text-[.62rem] text-text-secondary">
                  Sold {managementAction.sellQty} {sizeUnit} @ market
                </span>
              )}
              {execStatus === "executed" && msgType === "adjust_sl" && managementAction?.newSlPrice != null && (
                <span className="font-mono text-[.62rem] text-text-secondary">
                  {managementAction.previousSlPrice != null && (
                    <span className="text-bear line-through mr-1">${managementAction.previousSlPrice}</span>
                  )}
                  <span className="text-bull">→ ${managementAction.newSlPrice}</span>
                </span>
              )}
            </div>
          )}

          {/* Fill details on entry orders */}
          {relatedOrder?.filledQty != null && (
            <p className="font-mono text-[.6rem] text-text-secondary">
              Filled: {relatedOrder.filledQty} @ ${relatedOrder.avgFillPrice ?? "—"}
            </p>
          )}

          {/* Skipped reason message */}
          {execStatus === "skipped" && (
            <p className="font-mono text-[.62rem] text-warning">
              ⚠ {skipReasonText(managementAction?.lifecycleSummary ?? undefined)}
            </p>
          )}

          {/* Retry button */}
          {canRetry && execStatus !== "executed" && execStatus !== "pending_confirm" && (
            <button
              onClick={() => retryMut.mutate()}
              disabled={retryMut.isPending}
              className="self-start flex items-center gap-1.5 rounded-sm border border-border-default px-2.5 py-1 font-mono text-[.6rem] uppercase tracking-widest text-text-secondary transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
            >
              {retryMut.isPending ? (
                <LuLoader className="h-3 w-3 animate-spin" />
              ) : (
                <LuRefreshCw className="h-3 w-3" />
              )}
              Retry {msgType === "adjust_sl" ? "SL adjust" : "exit"}
            </button>
          )}
          {retryError && (
            <p className="font-mono text-[.6rem] text-bear">{retryError}</p>
          )}
        </div>
      )}

      {/* Thread / order links */}
      {(threadId || threadKey || relatedOrder?.id) && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {threadKey && (
            <span className="font-mono text-[.58rem] text-text-disabled">
              Thread: <span className="text-text-muted">{threadKey}</span>
            </span>
          )}
          {(threadId || threadKey) && (
            <button
              onClick={() => {
                if (threadId) navigate(ROUTES.COPY_TRADING_OPEN_TRADE(threadId));
                else navigate(ROUTES.COPY_TRADING_OPEN_TRADES);
              }}
              className="flex items-center gap-1 font-mono text-[.6rem] text-accent hover:underline"
            >
              <LuExternalLink className="h-2.5 w-2.5" />
              View thread
            </button>
          )}
          {relatedOrder?.id && onViewOrder && (
            <button
              onClick={() => onViewOrder(relatedOrder.id)}
              className="flex items-center gap-1 font-mono text-[.6rem] text-accent hover:underline"
            >
              <LuExternalLink className="h-2.5 w-2.5" />
              View order
            </button>
          )}
        </div>
      )}
    </div>
  );
}
