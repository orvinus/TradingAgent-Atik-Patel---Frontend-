// src/components/copy-trading/ExitConfirmModal.tsx
// Confirm modal for partial_exit / full_exit / adjust_sl orders
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LuX, LuLoader, LuTriangleAlert } from "react-icons/lu";
import { copyOrdersApi } from "@/api/endpoints/copyOrders";
import { qk } from "@/api/queryKeys";
import { toast } from "@/components/ui/Toast";
import type { CopyOrder, OrderRole } from "@/types/copyValidator";

interface Props {
  order: CopyOrder;
  onClose: () => void;
}

function roleMeta(role: OrderRole | null | undefined): { title: string; cta: string; warning: string } {
  switch (role) {
    case "partial_exit": return {
      title: "Confirm Partial Exit",
      cta: "Sell @ Market",
      warning: "This will place a market SELL order. Market orders fill immediately at the best available price.",
    };
    case "full_exit": return {
      title: "Confirm Close Position",
      cta: "Close @ Market",
      warning: "This will close your full remaining position at market price.",
    };
    case "adjust_sl": return {
      title: "Confirm Stop Adjustment",
      cta: "Update Stop @ Broker",
      warning: "This will patch your bracket stop-loss order at the broker.",
    };
    default: return {
      title: "Confirm Order",
      cta: "Confirm",
      warning: "",
    };
  }
}

export function ExitConfirmModal({ order, onClose }: Props) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const role = order.orderRole;
  const ma = order.managementAction;
  const p = order.orderPreview;
  const meta = roleMeta(role);

  const sizeUnit = p?.size_unit === "contracts" ? "contracts" : p?.size_unit === "shares" ? "shares" : "contracts";
  const qty = ma?.sellQty ?? p?.qty ?? "?";
  const symbol = p?.contract_symbol ?? p?.symbol ?? "?";

  const confirmMut = useMutation({
    mutationFn: () => copyOrdersApi.confirm(order.id, {}),
    onSuccess: () => {
      toast.success("Order confirmed");
      qc.invalidateQueries({ queryKey: qk.copyOrdersList() });
      qc.invalidateQueries({ queryKey: qk.tradeThreadsList() });
      onClose();
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "Confirmation failed";
      setError(msg);
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-sm rounded-lg border border-border-subtle bg-bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute right-4 top-4 text-text-disabled hover:text-text-secondary">
          <LuX className="h-4 w-4" />
        </button>

        <h2 className="font-display font-bold uppercase tracking-[.1em] text-text-primary">{meta.title}</h2>

        {/* Order summary */}
        <div className="mt-4 rounded-sm border border-border-default bg-bg-elevated p-3 space-y-1.5">
          <Row label="Side" value={<span className="text-bear font-bold">SELL</span>} />
          <Row label="Qty" value={`${qty} ${sizeUnit}`} />
          <Row label="Instrument" value={symbol} />
          <Row label="Order type" value="Market" />
          {role === "adjust_sl" && ma?.previousSlPrice != null && (
            <Row
              label="SL change"
              value={
                <span>
                  <span className="text-bear line-through">${ma.previousSlPrice}</span>
                  {" → "}
                  <span className="text-bull">${ma.newSlPrice ?? "?"}</span>
                </span>
              }
            />
          )}
          {role === "adjust_sl" && ma?.adjustMode && (
            <Row label="Mode" value={ma.adjustMode === "breakeven" ? "Breakeven" : "Explicit price"} />
          )}
          {ma?.lifecycleSummary && (
            <Row label="Signal" value={ma.lifecycleSummary} />
          )}
        </div>

        {/* Warning */}
        {meta.warning && (
          <div className="mt-3 flex items-start gap-2 rounded-sm border border-warning/30 bg-warning/5 p-2.5">
            <LuTriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
            <p className="font-mono text-[.62rem] text-text-secondary">{meta.warning}</p>
          </div>
        )}

        {error && (
          <p className="mt-2 font-mono text-[.62rem] text-bear">{error}</p>
        )}

        {/* Actions */}
        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-sm border border-border-default py-2 font-mono text-[.65rem] uppercase tracking-widest text-text-secondary transition-colors hover:text-text-primary"
          >
            Cancel
          </button>
          <button
            onClick={() => confirmMut.mutate()}
            disabled={confirmMut.isPending}
            className="flex-1 flex items-center justify-center gap-2 rounded-sm bg-bear py-2 font-mono text-[.65rem] font-bold uppercase tracking-widest text-white transition-colors hover:bg-bear/80 disabled:opacity-50"
          >
            {confirmMut.isPending && <LuLoader className="h-3.5 w-3.5 animate-spin" />}
            {meta.cta}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="font-mono text-[.6rem] uppercase tracking-[.1em] text-text-disabled">{label}</span>
      <span className="font-mono text-[.66rem] text-text-primary">{value}</span>
    </div>
  );
}
