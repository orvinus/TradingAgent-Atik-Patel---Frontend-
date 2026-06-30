// src/pages/CopyTradingOpenTrades/index.tsx — LIST ONLY
// The :id detail route is handled by detail.tsx (CopyTradingOpenTradeDetail).
// This component NEVER reads useParams / params.id — no conditional hooks possible.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { LuArrowLeft, LuLoader, LuRefreshCw } from "react-icons/lu";
import { tradeThreadsApi } from "@/api/endpoints/tradeThreads";
import { qk } from "@/api/queryKeys";
import { ROUTES } from "@/constants/routes";
import { OrderRoleBadge } from "@/components/copy-trading/OrderRoleBadge";
import { ExecutionStatusChip, deriveExecStatus } from "@/components/copy-trading/ExecutionStatusChip";
import type { TradeThread, TradeThreadStatus } from "@/types/tradeThreads";
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

function ThreadStatusBadge({ status }: { status: TradeThreadStatus }) {
  const cfg = THREAD_STATUS_CFG[status] ?? THREAD_STATUS_CFG.closed;
  return (
    <span className={`rounded-sm border px-1.5 py-0.5 font-mono text-[.52rem] uppercase tracking-[.14em] ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

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
            {thread.contractSymbol && (
              <span className="font-normal text-text-muted text-[.65rem]">{thread.contractSymbol}</span>
            )}
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
        <span className="font-mono text-[.6rem] text-text-disabled capitalize">{thread.platform}</span>
        {thread.openedAt && (
          <span className="font-mono text-[.6rem] text-text-disabled">{formatRelative(thread.openedAt)}</span>
        )}
      </div>
    </button>
  );
}

type StatusTab = "open" | "partial" | "closed" | "all";

const STATUS_TABS: { key: StatusTab; label: string }[] = [
  { key: "open",    label: "Open" },
  { key: "partial", label: "Partial" },
  { key: "closed",  label: "Closed" },
  { key: "all",     label: "All" },
];

export default function CopyTradingOpenTrades() {
  // All hooks at the top — unconditional, no early returns above this block
  const navigate = useNavigate();
  const [statusTab, setStatusTab] = useState<StatusTab>("open");

  const threadsQuery = useQuery({
    queryKey: qk.tradeThreadsList(statusTab),
    queryFn: () =>
      tradeThreadsApi.list(
        statusTab === "all" ? undefined : { status: statusTab as "open" | "partial" | "closed" },
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
            <h1 className="font-display text-xl font-bold uppercase tracking-[.12em] text-text-primary">
              Open Trades
            </h1>
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

// ── Thread detail helper used only by detail.tsx ──────────────────────────────
// Exported so detail.tsx can reuse the stat + order table components.

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

export function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono text-[.54rem] uppercase tracking-[.14em] text-text-disabled">{label}</span>
      <span className="font-mono text-[.68rem] text-text-primary">{value}</span>
    </div>
  );
}

interface OrdersTableProps {
  orders: CopyOrder[];
  onConfirm: (id: string) => void;
}

export function OrdersTable({ orders, onConfirm }: OrdersTableProps) {
  if (orders.length === 0) {
    return <p className="px-5 py-4 font-mono text-[.63rem] text-text-muted">No orders yet.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border-subtle text-left">
            {["Role", "Side", "Qty", "Type", "Status", "Fill", ""].map((h) => (
              <th key={h} className="px-3 py-2 font-mono text-[.54rem] uppercase tracking-[.14em] text-text-muted whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => {
            const isPending = o.status === "pending_confirmation";
            const isManagement = o.orderRole === "partial_exit" || o.orderRole === "full_exit" || o.orderRole === "adjust_sl";
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
                <td className="px-3 py-2"><ExecutionStatusChip status={execStatus} /></td>
                <td className="px-3 py-2 font-mono text-[.62rem] text-text-secondary whitespace-nowrap">{fillStr}</td>
                <td className="px-3 py-2 text-right">
                  {isPending && isManagement && (
                    <button
                      onClick={() => onConfirm(o.id)}
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
  );
}

// Re-export formatDate so detail.tsx can use it
export { formatDate };
