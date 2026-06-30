// src/pages/CopyTradingOpenTrades/detail.tsx
// Route: /copy-trading/open-trades/:id  (SEPARATE component — fixes React hooks violation)
// All hooks are called unconditionally at the top level. No early returns before any hook.
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LuArrowLeft, LuLoader, LuRefreshCw } from "react-icons/lu";
import { tradeThreadsApi } from "@/api/endpoints/tradeThreads";
import { qk } from "@/api/queryKeys";
import { ROUTES } from "@/constants/routes";
import { ExitConfirmModal } from "@/components/copy-trading/ExitConfirmModal";
import { toast } from "@/components/ui/Toast";
import { Stat, OrdersTable, formatDate } from "./index";
import type { TradeThreadStatus } from "@/types/tradeThreads";
import type { CopyOrder } from "@/types/copyValidator";

const THREAD_STATUS_CFG: Record<TradeThreadStatus, { label: string; cls: string }> = {
  open:          { label: "OPEN",         cls: "border-bull/40 bg-bull/10 text-bull" },
  partial:       { label: "PARTIAL",      cls: "border-warning/40 bg-warning/10 text-warning" },
  closed:        { label: "CLOSED",       cls: "border-border-default bg-bg-elevated text-text-muted" },
  cancelled:     { label: "CANCELLED",    cls: "border-border-default bg-bg-elevated text-text-muted" },
  stopped_out:   { label: "STOPPED OUT",  cls: "border-bear/40 bg-bear/10 text-bear" },
  stale:         { label: "STALE",        cls: "border-border-default bg-bg-elevated text-text-disabled" },
  entry_pending: { label: "PENDING FILL", cls: "border-info/40 bg-info/10 text-info" },
};

export default function CopyTradingOpenTradeDetail() {
  // ── ALL hooks unconditionally at the top — nothing above this block ──────────
  const { id: threadId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [confirmOrderId, setConfirmOrderId] = useState<string | null>(null);

  const safeId = threadId ?? "";

  const detailQuery = useQuery({
    queryKey: qk.tradeThread(safeId),
    queryFn: () => tradeThreadsApi.get(safeId),
    enabled: !!safeId,
    refetchInterval: 30000,
  });

  const eventsQuery = useQuery({
    queryKey: qk.tradeThreadEvents(safeId),
    queryFn: () => tradeThreadsApi.getEvents(safeId),
    enabled: !!safeId,
  });

  const stateQuery = useQuery({
    queryKey: qk.tradeThreadState(safeId),
    queryFn: () => tradeThreadsApi.getState(safeId),
    enabled: !!safeId,
  });

  const syncMut = useMutation({
    mutationFn: () => tradeThreadsApi.sync(safeId),
    onSuccess: (res) => {
      toast.success("Synced from broker");
      qc.setQueryData(qk.tradeThread(safeId), (old: typeof detailQuery.data) =>
        old ? { ...old, thread: res.thread } : old,
      );
      qc.invalidateQueries({ queryKey: qk.tradeThreadState(safeId) });
    },
    onError: () => toast.error("Sync failed"),
  });

  // ── Conditional rendering starts here (AFTER all hooks) ──────────────────────
  const thread = detailQuery.data?.thread ?? stateQuery.data?.thread;
  const orders: CopyOrder[] = detailQuery.data?.orders ?? [];
  const events = eventsQuery.data ?? [];
  const tpLadder = stateQuery.data?.tpLadder ?? [];
  const confirmOrder = confirmOrderId ? (orders.find((o) => o.id === confirmOrderId) ?? null) : null;

  if (detailQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 p-6 font-mono text-[.65rem] text-text-muted">
        <LuLoader className="h-3.5 w-3.5 animate-spin" /> Loading thread…
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="p-6 font-mono text-[.65rem] text-bear">Thread not found.</div>
    );
  }

  const profile = thread.instrumentProfile ?? "equity";
  const isOptions = profile === "options";
  const qtyLabel = isOptions ? "contracts" : profile === "crypto" ? "units" : "shares";
  const meta = thread.metadata ?? {};
  const statusCfg = THREAD_STATUS_CFG[thread.status] ?? THREAD_STATUS_CFG.closed;

  return (
    <div className="flex flex-col gap-5 p-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate(ROUTES.COPY_TRADING_OPEN_TRADES)}
          className="mb-3 flex w-fit items-center gap-1.5 font-mono text-[.65rem] text-text-muted transition-colors hover:text-text-secondary"
        >
          <LuArrowLeft className="h-3 w-3" /> Open Trades
        </button>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl font-bold text-text-primary">
                {thread.symbol ?? "?"} {thread.contractSymbol ?? ""}
              </h1>
              <span className={`rounded-sm border px-1.5 py-0.5 font-mono text-[.52rem] uppercase tracking-[.14em] ${statusCfg.cls}`}>
                {statusCfg.label}
              </span>
            </div>
            <p className="mt-0.5 font-mono text-[.65rem] text-text-muted">{thread.threadKey}</p>
          </div>

          <button
            onClick={() => syncMut.mutate()}
            disabled={syncMut.isPending}
            className="flex items-center gap-1.5 rounded-sm border border-border-default px-3 py-1.5 font-mono text-[.6rem] uppercase tracking-widest text-text-secondary transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
          >
            <LuRefreshCw className={`h-3 w-3 ${syncMut.isPending ? "animate-spin" : ""}`} />
            Sync broker
          </button>
        </div>

        {meta.lastBrokerSyncAt && (
          <p className="mt-1 font-mono text-[.58rem] text-text-disabled">
            Last synced {formatDate(meta.lastBrokerSyncAt as string)}
          </p>
        )}
      </div>

      {/* Position stats */}
      <div className="rounded-lg border border-border-subtle bg-bg-surface p-4 shadow-card">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg-elevated">
            <div
              className={`h-full rounded-full transition-all ${
                thread.status === "stopped_out" ? "bg-bear" :
                thread.status === "closed" || thread.status === "cancelled" ? "bg-border-default" :
                thread.status === "partial" ? "bg-warning" : "bg-bull"
              }`}
              style={{ width: `${Math.min(Math.max(thread.remainingPct ?? 0, 0), 100)}%` }}
            />
          </div>
          <span className="w-10 shrink-0 text-right font-mono text-[.6rem] text-text-muted">
            {thread.remainingPct != null ? `${Math.round(thread.remainingPct)}%` : "—"}
          </span>
        </div>
        <div className="flex flex-wrap gap-4">
          <Stat label="Original" value={`${thread.originalQty ?? "?"} ${qtyLabel}`} />
          <Stat label="Remaining" value={`${thread.remainingQty ?? "?"} ${qtyLabel}`} />
          {meta.avgEntryPrice && <Stat label="Avg entry" value={`$${meta.avgEntryPrice}`} />}
          {meta.currentSlPrice && <Stat label="Current SL" value={`$${meta.currentSlPrice}`} />}
          {meta.brokerPositionQty != null && <Stat label="Broker qty" value={`${meta.brokerPositionQty}`} />}
        </div>
        <div className="mt-3 flex flex-wrap gap-4">
          {thread.openedAt && <Stat label="Opened" value={formatDate(thread.openedAt)} />}
          {thread.closedAt && <Stat label="Closed" value={formatDate(thread.closedAt)} />}
          <Stat label="Platform" value={thread.platform} />
        </div>
      </div>

      {/* TP Ladder */}
      {tpLadder.length > 0 && (
        <div className="rounded-lg border border-border-subtle bg-bg-surface p-4 shadow-card">
          <h2 className="mb-3 font-mono text-[.62rem] uppercase tracking-[.14em] text-text-disabled">TP Ladder</h2>
          <div className="flex flex-col gap-2">
            {tpLadder.map((tp) => (
              <div key={tp.index} className="flex items-center gap-3">
                <span className="w-8 font-mono text-[.62rem] text-text-secondary">TP{tp.level}</span>
                <div className="flex-1">
                  <div className="h-1 overflow-hidden rounded-full bg-bg-elevated">
                    <div
                      className={`h-full rounded-full ${tp.hit ? "bg-bull" : "bg-text-disabled/30"}`}
                      style={{ width: `${tp.exitPct}%` }}
                    />
                  </div>
                </div>
                <span className={`w-16 text-right font-mono text-[.62rem] ${tp.hit ? "text-bull" : "text-text-muted"}`}>
                  {tp.exitPct}% {tp.hit ? "✓" : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Orders */}
      <div className="rounded-lg border border-border-subtle bg-bg-surface shadow-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border-subtle">
          <h2 className="font-display font-bold text-text-primary">Orders</h2>
        </div>
        <OrdersTable orders={orders} onConfirm={(id) => setConfirmOrderId(id)} />
      </div>

      {/* Lifecycle events */}
      {events.length > 0 && (
        <div className="rounded-lg border border-border-subtle bg-bg-surface shadow-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border-subtle">
            <h2 className="font-display font-bold text-text-primary">Lifecycle Timeline</h2>
          </div>
          <div className="divide-y divide-border-subtle">
            {events.map((ev) => (
              <div key={ev.id} className="flex items-start gap-3 px-5 py-3">
                <span className="mt-0.5 shrink-0 font-mono text-[.58rem] text-text-disabled whitespace-nowrap">
                  {formatDate(ev.createdAt)}
                </span>
                <span className="font-mono text-[.6rem] uppercase tracking-widest text-accent shrink-0">
                  {String(ev.eventType ?? (ev as unknown as Record<string, unknown>)["event_type"] ?? "").replace(/_/g, " ")}
                </span>
                <span className="font-mono text-[.63rem] text-text-secondary">{ev.summary ?? "—"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Exit confirm modal for management orders */}
      {confirmOrder && (
        <ExitConfirmModal order={confirmOrder} onClose={() => setConfirmOrderId(null)} />
      )}
    </div>
  );
}
