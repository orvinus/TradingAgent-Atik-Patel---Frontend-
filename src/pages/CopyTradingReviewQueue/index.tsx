// src/pages/CopyTradingReviewQueue/index.tsx — V2 Review Queue screen
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LuArrowLeft, LuLoader, LuRefreshCw, LuCheck, LuX } from "react-icons/lu";
import { tradeThreadsApi } from "@/api/endpoints/tradeThreads";
import { qk } from "@/api/queryKeys";
import { ROUTES } from "@/constants/routes";
import type { ReviewQueueItem, ReviewQueueFlag, ReviewQueueCandidate } from "@/types/tradeThreads";

const FLAG_TEXT: Record<ReviewQueueFlag, string> = {
  ambiguous_target:         "Multiple open trades match",
  orphan_fill:              "Price doesn't match any open trade",
  low_confidence:           "AI confidence below threshold",
  directional_violation:    "SL direction invalid for side",
  status_action_mismatch:   "Action wrong for order state",
};

const FLAG_CLS: Record<ReviewQueueFlag, string> = {
  ambiguous_target:       "border-warning/40 bg-warning/10 text-warning",
  orphan_fill:            "border-info/40 bg-info/10 text-info",
  low_confidence:         "border-border-default bg-bg-elevated text-text-muted",
  directional_violation:  "border-bear/40 bg-bear/10 text-bear",
  status_action_mismatch: "border-bear/40 bg-bear/10 text-bear",
};

function FlagBadge({ flag }: { flag: ReviewQueueFlag }) {
  return (
    <span className={`inline-flex items-center rounded-sm border px-1.5 py-0.5 font-mono text-[.52rem] uppercase tracking-[.12em] ${FLAG_CLS[flag]}`}>
      {FLAG_TEXT[flag]}
    </span>
  );
}

function ConfidenceBar({ confidence }: { confidence: number | null }) {
  if (confidence == null) return null;
  const pct = Math.round(confidence * 100);
  const color = pct >= 75 ? "bg-bull" : pct >= 55 ? "bg-warning" : "bg-bear";
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-bg-elevated">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-[.57rem] text-text-disabled">{pct}% confidence</span>
    </div>
  );
}

function CandidateButton({ candidate, onSelect }: { candidate: ReviewQueueCandidate; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className="rounded-sm border border-border-default px-2.5 py-1.5 font-mono text-[.6rem] text-text-secondary transition-colors hover:border-accent hover:text-accent text-left"
    >
      <span className="font-bold">{candidate.symbol ?? candidate.threadKey}</span>
      {candidate.remainingPct != null && (
        <span className="ml-1 text-text-muted">{Math.round(candidate.remainingPct)}% remaining</span>
      )}
    </button>
  );
}

function ReviewCard({ item }: { item: ReviewQueueItem }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);

  const approveMut = useMutation({
    mutationFn: (targetThreadId: string) =>
      tradeThreadsApi.approveReview(item.id, { targetThreadId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.reviewQueueList() });
      qc.invalidateQueries({ queryKey: qk.tradeThreadsList() });
    },
    onSettled: () => setBusy(null),
  });

  const rejectMut = useMutation({
    mutationFn: () => tradeThreadsApi.rejectReview(item.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.reviewQueueList() }),
    onSettled: () => setBusy(null),
  });

  const conf = item.classification;
  const age = new Date(item.createdAt).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
  });

  return (
    <div className="rounded-lg border border-border-subtle bg-bg-surface p-5 shadow-card flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="rounded-sm border border-warning/40 bg-warning/10 px-1.5 py-0.5 font-mono text-[.52rem] uppercase tracking-[.14em] text-warning font-bold">
              REVIEW REQUIRED
            </span>
            <FlagBadge flag={item.flag} />
          </div>
          {conf.lifecycleSummary && (
            <p className="font-mono text-[.72rem] font-semibold text-text-primary">{conf.lifecycleSummary}</p>
          )}
        </div>
        <span className="shrink-0 font-mono text-[.58rem] text-text-disabled">{age}</span>
      </div>

      {/* Raw text */}
      {item.rawText && (
        <p className="line-clamp-2 font-mono text-[.63rem] text-text-muted" title={item.rawText}>
          {item.rawText}
        </p>
      )}

      {/* Confidence + source */}
      <div className="flex items-center gap-4 flex-wrap">
        <ConfidenceBar confidence={conf.confidence} />
        {item.sourceTitle && (
          <span className="font-mono text-[.6rem] text-text-disabled capitalize">
            {item.platform} · {item.sourceTitle}
          </span>
        )}
      </div>

      {/* Violations */}
      {item.violations.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {item.violations.map((v, i) => (
            <span key={i} className="rounded-sm border border-bear/30 bg-bear/5 px-1.5 py-0.5 font-mono text-[.55rem] text-bear">
              {v}
            </span>
          ))}
        </div>
      )}

      {/* Candidate threads to approve into */}
      {item.candidates.length > 0 && (
        <div>
          <p className="mb-1.5 font-mono text-[.6rem] uppercase tracking-[.1em] text-text-disabled">Choose thread:</p>
          <div className="flex flex-wrap gap-2">
            {item.candidates.map((c) => (
              <CandidateButton
                key={c.threadId}
                candidate={c}
                onSelect={() => {
                  setBusy("approve");
                  approveMut.mutate(c.threadId);
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        {item.candidates.length === 0 && (
          <button
            onClick={() => { setBusy("approve"); approveMut.mutate(""); }}
            disabled={busy !== null}
            className="flex items-center gap-1.5 rounded-sm border border-bull/40 bg-bull/10 px-3 py-1.5 font-mono text-[.6rem] uppercase tracking-widest text-bull transition-colors hover:bg-bull/20 disabled:opacity-50"
          >
            {busy === "approve" ? <LuLoader className="h-3 w-3 animate-spin" /> : <LuCheck className="h-3 w-3" />}
            Approve
          </button>
        )}
        <button
          onClick={() => { setBusy("reject"); rejectMut.mutate(); }}
          disabled={busy !== null}
          className="flex items-center gap-1.5 rounded-sm border border-border-default px-3 py-1.5 font-mono text-[.6rem] uppercase tracking-widest text-text-secondary transition-colors hover:border-bear/40 hover:text-bear disabled:opacity-50"
        >
          {busy === "reject" ? <LuLoader className="h-3 w-3 animate-spin" /> : <LuX className="h-3 w-3" />}
          Reject
        </button>
        {item.candidates[0]?.threadId && (
          <button
            onClick={() => navigate(ROUTES.COPY_TRADING_OPEN_TRADE(item.candidates[0]!.threadId))}
            className="ml-auto font-mono text-[.6rem] text-accent hover:underline"
          >
            View thread →
          </button>
        )}
      </div>
    </div>
  );
}

export default function CopyTradingReviewQueue() {
  const navigate = useNavigate();

  const queueQuery = useQuery({
    queryKey: qk.reviewQueueList(),
    queryFn: () => tradeThreadsApi.listReviewQueue({ status: "pending" }),
    refetchInterval: 20000,
  });

  const items = queueQuery.data?.items ?? [];
  const pendingCount = queueQuery.data?.pendingCount ?? 0;

  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <button
          onClick={() => navigate(ROUTES.COPY_TRADING)}
          className="mb-3 flex w-fit items-center gap-1.5 font-mono text-[.65rem] text-text-muted transition-colors hover:text-text-secondary"
        >
          <LuArrowLeft className="h-3 w-3" /> Copy Trading
        </button>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-xl font-bold uppercase tracking-[.12em] text-text-primary">
                Review Queue
              </h1>
              {pendingCount > 0 && (
                <span className="rounded-full bg-warning px-2 py-0.5 font-mono text-[.6rem] font-bold text-bg-base">
                  {pendingCount}
                </span>
              )}
            </div>
            <p className="mt-1 font-mono text-[.7rem] text-text-muted">
              Ambiguous or low-confidence signals that need human resolution before execution.
            </p>
          </div>
          <button
            onClick={() => queueQuery.refetch()}
            className="flex items-center gap-1.5 rounded-sm border border-border-default px-2.5 py-1.5 font-mono text-[.6rem] uppercase tracking-widest text-text-secondary hover:border-accent hover:text-accent"
          >
            <LuRefreshCw className={`h-3 w-3 ${queueQuery.isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {queueQuery.isLoading ? (
        <div className="flex items-center gap-2 font-mono text-[.65rem] text-text-muted">
          <LuLoader className="h-3.5 w-3.5 animate-spin" /> Loading queue…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-border-subtle bg-bg-surface px-5 py-10 text-center">
          <p className="font-mono text-[.68rem] uppercase tracking-widest text-text-muted">
            No pending items — all clear.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <ReviewCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
