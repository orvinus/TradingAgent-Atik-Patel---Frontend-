// src/pages/CopyTradingOpenTrades/index.tsx
// Trade threads list + detail view (Phase 2 + Phase 3 fill sync)
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  LuArrowLeft, LuLoader, LuRefreshCw,
} from "react-icons/lu";
import { tradeThreadsApi } from "@/api/endpoints/tradeThreads";
import { qk } from "@/api/queryKeys";
import { ROUTES } from "@/constants/routes";
import { OrderRoleBadge } from "@/components/copy-trading/OrderRoleBadge";
import { ExecutionStatusChip, deriveExecStatus } from "@/components/copy-trading/ExecutionStatusChip";
import { ExitConfirmModal } from "@/components/copy-trading/ExitConfirmModal";
import type { TradeThread, TradeThreadStatus } from "@/types/tradeThreads";
import type { CopyOrder } from "@/types/copyValidator";

// ── Thread status badge ───────────────────────────────────────────────────────
const THREAD_STATUS_CFG: Record<TradeThreadStatus, { label: string; cls: string }> = {
  open:          { label: "OPEN",         cls: "border-bull/40 bg-bull/10 text-bull" },
  partial:       { label: "PARTIAL",      cls: "border-warning/40 bg-warning/10 text-warning" },
  closed:        { label: "CLOSED",       cls: "border-border-default bg-bg-elevated text-text-muted" },
  cancelled:     { label: "CANCELLED",    cls: "border-border-default bg-bg-elevated text-text-muted" },
  stopped_out:   { label: "STOPPED OUT",  cls: "border-bear/40 bg-bear/10 text-bear" },
  stale:         { label: "STALE",        cls: "border-border-default bg-bg-elevated text-text-disabled" },
  entry_pending: { label: "PENDING FILL", cls: "border-info/40 bg-info/10 text-info" },
};

function ThreadStatusBadge({ status }: { status: TradeThreadStatus }) {
  const cfg = THREAD_STATUS_CFG[status] ?? THREAD_STATUS_CFG.closed;
  return (
    <span className={`rounded-sm border px-1.5 py-0.5 font-mono text-[.52rem] uppercase tracking-[.14em] ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

// ── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ pct, status }: { pct: number | null; status: TradeThreadStatus }) {
  const filled = pct ?? 0;
  const barColor =
    status === "stopped_out" ? "bg-bear" :
    status === "closed" || status === "cancelled" ? "bg-border-default" :
    status === "partial" ? "bg-warning" : "bg-bull";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg-elevated">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(Math.max(filled, 0), 100)}%` }}
        />
      </div>
      <span className="w-10 shrink-0 text-right font-mono text-[.6rem] text-text-muted">
        {filled != null ? `${Math.round(filled)}%` : "—"}
      </span>
    </div>
  );
}

function formatRelative(iso: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
}

// ── Thread card (list view) ───────────────────────────────────────────────────
function ThreadCard({ thread, onSelect }: { thread: TradeThread; onSelect: () => void }) {
  const profile = thread.instrumentProfile ?? "equity";
  const isOptions = profile === "options";
  const qtyLabel = isOptions ? "contracts" : profile === "crypto" ? "units" : "shares";

  return (
    <button
      onClick={onSelect}
      className="w-full rounded-lg border border-border-subtle bg-bg-surface p-4 shadow-card text-left transition-colors hover:border-border-default"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-[.72rem] font-bold text-text-primary truncate">
            {thread.symbol ?? "?"}{" "}
            {thread.contractSymbol ? (
              <span className="font-normal text-text-muted text-[.65rem]">{thread.contractSymbol}</span>
            ) : null}
          </p>
          <p className="mt-0.5 font-mono text-[.58rem] text-text-disabled truncate">{thread.threadKey}</p>
        </div>
        <ThreadStatusBadge status={thread.status} />
      </div>

      <div className="mt-3">
        <ProgressBar pct={thread.remainingPct} status={thread.status} />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        {thread.originalQty != null && (
          <span className="font-mono text-[.6rem] text-text-muted">
            {thread.originalQty} {qtyLabel} orig
            {thread.remainingQty != null ? ` · ${thread.remainingQty} remaining` : ""}
          </span>
        )}
        <span className="font-mono text-[.6rem] text-text-disabled capitalize">
          {thread.platform}
        </span>
        {thread.openedAt && (
          <span className="font-mono text-[.6rem] text-text-disabled">
            {formatRelative(thread.openedAt)}
          </span>
        )}
      </div>
    </button>
  );
}

// ── Thread detail view ────────────────────────────────────────────────────────
function ThreadDetail({ threadId, onBack }: { threadId: string; onBack: () => void }) {
  const qc = useQueryClient();
  const [confirmOrderId, setConfirmOrderId] = useState<string | null>(null);

  const detailQuery = useQuery({
    queryKey: qk.tradeThread(threadId),
    queryFn: () => tradeThreadsApi.get(threadId),
    refetchInterval: 30000,
  });

  const eventsQuery = useQuery({
    queryKey: qk.tradeThreadEvents(threadId),
    queryFn: () => tradeThreadsApi.getEvents(threadId),
  });

  const syncMut = useMutation({
    mutationFn: () => tradeThreadsApi.sync(threadId),
    onSuccess: (res) => {
      qc.setQueryData(qk.tradeThread(threadId), (old: typeof detailQuery.data) =>
        old ? { ...old, thread: res.thread } : old,
      );
    },
  });

  const thread = detailQuery.data?.thread;
  const orders: CopyOrder[] = detailQuery.data?.orders ?? [];
  const events = eventsQuery.data ?? [];

  const confirmOrder = confirmOrderId ? orders.find((o) => o.id === confirmOrderId) ?? null : null;

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

  return (
    <div className="flex flex-col gap-5 p-6">
      <div>
        <button onClick={onBack} className="mb-3 flex w-fit items-center gap-1.5 font-mono text-[.65rem] text-text-muted transition-colors hover:text-text-secondary">
          <LuArrowLeft className="h-3 w-3" /> Open Trades
        </button>

        {/* Thread header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl font-bold text-text-primary">
                {thread.symbol ?? "?"} {thread.contractSymbol ?? ""}
              </h1>
              <ThreadStatusBadge status={thread.status} />
            </div>
            <p className="mt-0.5 font-mono text-[.65rem] text-text-muted">{thread.threadKey}</p>
          </div>

          {/* Sync button */}
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

      {/* Progress */}
      <div className="rounded-lg border border-border-subtle bg-bg-surface p-4 shadow-card">
        <ProgressBar pct={thread.remainingPct} status={thread.status} />
        <div className="mt-2 flex flex-wrap gap-4">
          <Stat label="Original" value={`${thread.originalQty ?? "?"} ${qtyLabel}`} />
          <Stat label="Remaining" value={`${thread.remainingQty ?? "?"} ${qtyLabel}`} />
          {thread.remainingPct != null && <Stat label="Remaining %" value={`${Math.round(thread.remainingPct)}%`} />}
          {meta.avgEntryPrice && <Stat label="Avg entry" value={`$${meta.avgEntryPrice}`} />}
          {meta.currentSlPrice && <Stat label="Current SL" value={`$${meta.currentSlPrice}`} />}
          {meta.brokerPositionQty != null && <Stat label="Broker qty" value={`${meta.brokerPositionQty}`} />}
        </div>
        <div className="mt-3 flex gap-4">
          {thread.openedAt && <Stat label="Opened" value={formatDate(thread.openedAt)} />}
          {thread.closedAt && <Stat label="Closed" value={formatDate(thread.closedAt)} />}
          <Stat label="Platform" value={thread.platform} />
        </div>
      </div>

      {/* Orders table */}
      <div className="rounded-lg border border-border-subtle bg-bg-surface shadow-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border-subtle">
          <h2 className="font-display font-bold text-text-primary">Orders</h2>
        </div>
        {orders.length === 0 ? (
          <p className="px-5 py-4 font-mono text-[.63rem] text-text-muted">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border-subtle text-left">
                  {["Role", "Side", "Qty", "Type", "Status", "Fill", "Signal", ""].map((h) => (
                    <th key={h} className="px-3 py-2 font-mono text-[.54rem] uppercase tracking-[.14em] text-text-muted whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const isPending = o.status === "pending_confirmation";
                  const p = o.orderPreview;
                  const unit = p?.size_unit === "contracts" ? "contracts" : p?.size_unit === "shares" ? "shares" : "";
                  const fillStr = o.filledQty != null
                    ? `${o.filledQty}${o.avgFillPrice != null ? ` @ $${o.avgFillPrice}` : ""}`
                    : "—";
                  const execStatus = deriveExecStatus(o.status);
                  return (
                    <tr key={o.id} className="border-b border-border-subtle last:border-0 hover:bg-bg-elevated/40">
                      <td className="px-3 py-2"><OrderRoleBadge role={o.orderRole} /></td>
                      <td className="px-3 py-2">
                        <span className={`font-mono text-[.64rem] font-bold ${p?.side === "buy" ? "text-bull" : "text-bear"}`}>
                          {(p?.side ?? "").toUpperCase() || "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-[.63rem] text-text-secondary whitespace-nowrap">
                        {p?.qty ?? o.managementAction?.sellQty ?? "?"} {unit}
                      </td>
                      <td className="px-3 py-2 font-mono text-[.62rem] text-text-muted uppercase">
                        {p?.order_type ?? "—"}
                      </td>
                      <td className="px-3 py-2">
                        <ExecutionStatusChip status={execStatus} />
                      </td>
                      <td className="px-3 py-2 font-mono text-[.62rem] text-text-secondary whitespace-nowrap">
                        {fillStr}
                      </td>
                      <td className="px-3 py-2 font-mono text-[.6rem] text-text-disabled whitespace-nowrap">
                        {(o.telegramSignalId ?? o.discordSignalId ?? "—").slice(0, 8)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {isPending && (
                          <button
                            onClick={() => setConfirmOrderId(o.id)}
                            className="rounded-sm border border-warning/40 px-2 py-0.5 font-mono text-[.58rem] uppercase tracking-widest text-warning transition-colors hover:bg-warning/10"
                          >
                            Confirm
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
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
                  {ev.eventType.replace(/_/g, " ")}
                </span>
                <span className="font-mono text-[.63rem] text-text-secondary">{ev.summary ?? "—"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {confirmOrder && (
        <ExitConfirmModal order={confirmOrder} onClose={() => setConfirmOrderId(null)} />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono text-[.54rem] uppercase tracking-[.14em] text-text-disabled">{label}</span>
      <span className="font-mono text-[.68rem] text-text-primary">{value}</span>
    </div>
  );
}

// ── Filter tabs ───────────────────────────────────────────────────────────────
type StatusTab = "open" | "partial" | "closed" | "all";

const STATUS_TABS: { key: StatusTab; label: string }[] = [
  { key: "open",    label: "Open" },
  { key: "partial", label: "Partial" },
  { key: "closed",  label: "Closed" },
  { key: "all",     label: "All" },
];

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CopyTradingOpenTrades() {
  const navigate = useNavigate();
  const params = useParams<{ id?: string }>();
  const [statusTab, setStatusTab] = useState<StatusTab>("open");

  // If we have a thread ID in the URL, show detail
  if (params.id) {
    return (
      <ThreadDetail
        threadId={params.id}
        onBack={() => navigate(ROUTES.COPY_TRADING_OPEN_TRADES)}
      />
    );
  }

  const threadsQuery = useQuery({
    queryKey: qk.tradeThreadsList(statusTab),
    queryFn: () =>
      tradeThreadsApi.list(
        statusTab === "all" ? undefined : { status: statusTab as "open" | "partial" | "closed" }
      ),
    refetchInterval: 15000,
  });

  const threads = threadsQuery.data ?? [];

  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <button
          onClick={() => navigate(ROUTES.COPY_TRADING)}
          className="mb-3 flex w-fit items-center gap-1.5 font-mono text-[.65rem] text-text-muted transition-colors hover:text-text-secondary"
        >
          <LuArrowLeft className="h-3 w-3" /> Copy Trading
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold uppercase tracking-[.12em] text-text-primary">Open Trades</h1>
            <p className="mt-1 font-mono text-[.7rem] text-text-muted">
              Trade threads — live position tracking across entry, partial exits, and closes.
            </p>
          </div>
          <button
            onClick={() => threadsQuery.refetch()}
            className="flex items-center gap-1.5 rounded-sm border border-border-default px-2.5 py-1.5 font-mono text-[.6rem] uppercase tracking-widest text-text-secondary hover:border-accent hover:text-accent"
          >
            <LuRefreshCw className={`h-3 w-3 ${threadsQuery.isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-1 border-b border-border-subtle">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setStatusTab(t.key)}
            className={`pb-2 px-3 font-mono text-[.65rem] uppercase tracking-widest transition-colors border-b-2 -mb-px ${
              statusTab === t.key
                ? "border-accent text-accent"
                : "border-transparent text-text-muted hover:text-text-secondary"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Thread list */}
      {threadsQuery.isLoading ? (
        <div className="flex items-center gap-2 font-mono text-[.65rem] text-text-muted">
          <LuLoader className="h-3.5 w-3.5 animate-spin" /> Loading threads…
        </div>
      ) : threads.length === 0 ? (
        <div className="rounded-lg border border-border-subtle bg-bg-surface px-5 py-10 text-center">
          <p className="font-mono text-[.68rem] uppercase tracking-widest text-text-muted">No trades found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {threads.map((t) => (
            <ThreadCard
              key={t.id}
              thread={t}
              onSelect={() => navigate(ROUTES.COPY_TRADING_OPEN_TRADE(t.id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
