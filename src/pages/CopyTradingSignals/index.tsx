// src/pages/CopyTradingSignals/index.tsx
// Signal inbox — all lifecycle message types with filter tabs
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { LuArrowLeft, LuLoader, LuRefreshCw } from "react-icons/lu";
import { copyTradingApi } from "@/api/endpoints/copyTrading";
import { copyOrdersApi } from "@/api/endpoints/copyOrders";
import { qk } from "@/api/queryKeys";
import { ROUTES } from "@/constants/routes";
import { SignalCard } from "@/components/copy-trading/SignalCard";
import { ExitConfirmModal } from "@/components/copy-trading/ExitConfirmModal";
import type { SignalMessageType } from "@/types/copyTrading";
import type { CopyOrder } from "@/types/copyValidator";

type TabKey = "all" | "entries" | "updates" | "exits";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all",     label: "All" },
  { key: "entries", label: "Entries" },
  { key: "updates", label: "Updates" },
  { key: "exits",   label: "Exits" },
];

function matchesTab(msgType: SignalMessageType | null | undefined, tab: TabKey): boolean {
  if (tab === "all") return msgType !== "noise";
  if (tab === "entries") return msgType === "new_entry";
  if (tab === "updates") return msgType === "commentary";
  if (tab === "exits") return msgType === "partial_exit" || msgType === "full_exit" || msgType === "adjust_sl";
  return true;
}

export default function CopyTradingSignals() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>("all");
  const [confirmOrderId, setConfirmOrderId] = useState<string | null>(null);

  const signalsQuery = useQuery({
    queryKey: qk.copyTradingSignals(),
    queryFn: () => copyTradingApi.listSignals({ limit: 100 }),
    refetchInterval: 15000,
  });

  const ordersQuery = useQuery({
    queryKey: qk.copyOrdersList(),
    queryFn: () => copyOrdersApi.list(),
    refetchInterval: 15000,
  });

  const signals = signalsQuery.data ?? [];
  const orders: CopyOrder[] = ordersQuery.data ?? [];

  // Build a lookup: signalId → order
  const orderBySignalId = new Map<string, CopyOrder>();
  for (const o of orders) {
    if (o.telegramSignalId) orderBySignalId.set(o.telegramSignalId, o);
    if (o.discordSignalId) orderBySignalId.set(o.discordSignalId, o);
  }

  // Build a lookup: threadKey → threadId from orders tradeThreadId
  const threadIdByKey = new Map<string, string>();
  for (const o of orders) {
    if (o.tradeThreadId && o.managementAction?.threadKey) {
      threadIdByKey.set(o.managementAction.threadKey, o.tradeThreadId);
    }
  }

  const filteredSignals = signals.filter((s) => {
    const msgType = s.signal?.message_type ?? null;
    if (msgType === "noise") return false;
    return matchesTab(msgType, tab);
  });

  const confirmOrder = confirmOrderId ? orders.find((o) => o.id === confirmOrderId) ?? null : null;

  const isLoading = signalsQuery.isLoading;
  const isFetching = signalsQuery.isFetching || ordersQuery.isFetching;

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
            <h1 className="font-display text-xl font-bold uppercase tracking-[.12em] text-text-primary">Signal Inbox</h1>
            <p className="mt-1 font-mono text-[.7rem] text-text-muted">
              All parsed messages across Telegram &amp; Discord — entries, updates, exits, and SL adjustments.
            </p>
          </div>
          <button
            onClick={() => { signalsQuery.refetch(); ordersQuery.refetch(); }}
            className="flex items-center gap-1.5 rounded-sm border border-border-default px-2.5 py-1.5 font-mono text-[.6rem] uppercase tracking-widest text-text-secondary hover:border-accent hover:text-accent"
          >
            <LuRefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 border-b border-border-subtle">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`pb-2 px-3 font-mono text-[.65rem] uppercase tracking-widest transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? "border-accent text-accent"
                : "border-transparent text-text-muted hover:text-text-secondary"
            }`}
          >
            {t.label}
          </button>
        ))}
        <button
          onClick={() => navigate(ROUTES.COPY_TRADING_OPEN_TRADES)}
          className="ml-auto pb-2 px-3 font-mono text-[.65rem] uppercase tracking-widest text-text-muted hover:text-accent transition-colors border-b-2 border-transparent -mb-px"
        >
          Open Trades →
        </button>
      </div>

      {/* Signal list */}
      {isLoading ? (
        <div className="flex items-center gap-2 font-mono text-[.65rem] text-text-muted">
          <LuLoader className="h-3.5 w-3.5 animate-spin" /> Loading signals…
        </div>
      ) : filteredSignals.length === 0 ? (
        <div className="rounded-lg border border-border-subtle bg-bg-surface px-5 py-10 text-center">
          <p className="font-mono text-[.68rem] uppercase tracking-widest text-text-muted">No signals yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredSignals.map((signal) => {
            const relatedOrder = orderBySignalId.get(signal.id) ?? null;
            const tKey = signal.signal?.thread_key ?? null;
            const threadId = tKey ? (threadIdByKey.get(tKey) ?? null) : null;
            return (
              <SignalCard
                key={signal.id}
                signal={signal}
                platform="telegram"
                relatedOrder={relatedOrder}
                threadId={threadId}
                onViewOrder={(oid) => setConfirmOrderId(oid)}
              />
            );
          })}
        </div>
      )}

      {confirmOrder && (
        <ExitConfirmModal order={confirmOrder} onClose={() => setConfirmOrderId(null)} />
      )}
    </div>
  );
}
