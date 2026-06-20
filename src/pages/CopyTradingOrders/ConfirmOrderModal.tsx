// src/pages/CopyTradingOrders/ConfirmOrderModal.tsx
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LuLoader, LuX, LuCircleCheck, LuCircleX } from "react-icons/lu";
import axios from "axios";
import { copyOrdersApi } from "@/api/endpoints/copyOrders";
import { qk } from "@/api/queryKeys";
import { toast } from "@/components/ui/Toast";
import type { OrderEdits, TpLevel } from "@/types/copyValidator";

function brokerErrMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const d = err.response?.data;
    // 502 — broker rejected the order.
    if (d?.brokerError?.message) return d.brokerError.message;
    return d?.message ?? d?.code ?? "Order failed.";
  }
  return "Order failed.";
}

const inputCls =
  "w-32 rounded-sm border border-border-default bg-bg-base px-2 py-1 font-mono text-[.68rem] text-text-primary outline-none focus:border-accent disabled:opacity-50";

const num = (s: string): number | undefined => {
  if (s.trim() === "") return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
};

const tpToText = (tp_price: number | null | undefined, levels: TpLevel[] | null | undefined): string => {
  if (levels && levels.length) return levels.map((l) => l.level).join(", ");
  return tp_price != null ? String(tp_price) : "—";
};

export default function ConfirmOrderModal({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const qc = useQueryClient();

  const orderQuery = useQuery({
    queryKey: qk.copyOrder(orderId),
    queryFn: () => copyOrdersApi.get(orderId),
  });

  const order = orderQuery.data;

  const [edits, setEdits] = useState<{ symbol: string; entry: string; sl: string; qty: string }>({
    symbol: "",
    entry: "",
    sl: "",
    qty: "",
  });

  useEffect(() => {
    if (order) {
      const preview = order.orderPreview;
      const edited = order.userEditedOrder;
      setEdits({
        symbol: edited?.symbol ?? preview?.symbol ?? "",
        entry: (edited?.limit_price ?? preview?.limit_price) != null
          ? String(edited?.limit_price ?? preview?.limit_price)
          : "",
        sl: (edited?.sl_price ?? preview?.sl_price) != null
          ? String(edited?.sl_price ?? preview?.sl_price)
          : "",
        qty: (edited?.qty ?? preview?.qty) != null
          ? String(edited?.qty ?? preview?.qty)
          : "",
      });
    }
  }, [order]);

  const collectEdits = (): OrderEdits => {
    const e: OrderEdits = {};
    if (edits.symbol.trim()) e.symbol = edits.symbol.trim();
    const entry = num(edits.entry);
    if (entry != null) e.limit_price = entry;
    const sl = num(edits.sl);
    if (sl != null) e.sl_price = sl;
    const qty = num(edits.qty);
    if (qty != null) e.qty = qty;
    return e;
  };

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["copy-orders", "list"] });
    qc.invalidateQueries({ queryKey: qk.copyOrder(orderId) });
  };

  const draftMut = useMutation({
    mutationFn: () => copyOrdersApi.patch(orderId, collectEdits()),
    onSuccess: () => {
      toast.success("Draft saved");
      invalidate();
    },
    onError: (e) => toast.error(brokerErrMessage(e)),
  });

  const confirmMut = useMutation({
    mutationFn: () => copyOrdersApi.confirm(orderId, collectEdits()),
    onSuccess: (o) => {
      toast.success(
        o?.brokerOrderId ? `Order submitted to ${o.broker ?? "broker"} · ${o.brokerOrderId}` : "Order submitted to broker",
      );
      invalidate();
      onClose();
    },
    onError: (e) => toast.error(brokerErrMessage(e)),
  });

  const cancelMut = useMutation({
    mutationFn: () => copyOrdersApi.cancel(orderId),
    onSuccess: () => {
      toast.info("Order cancelled");
      invalidate();
      onClose();
    },
    onError: (e) => toast.error(brokerErrMessage(e)),
  });

  const busy = draftMut.isPending || confirmMut.isPending || cancelMut.isPending;
  const valid = order?.validatorResult?.valid;

  return (
    <div className="fixed inset-0 z-[900] flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:p-8" onClick={onClose}>
      <div className="my-auto w-full max-w-lg rounded-lg border border-border-default bg-bg-surface shadow-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3">
          <h3 className="font-display font-bold text-text-primary">Confirm Copy Trade</h3>
          <button onClick={onClose} className="rounded-sm p-1 text-text-muted hover:bg-bg-elevated hover:text-text-secondary">
            <LuX className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4">
          {orderQuery.isLoading ? (
            <div className="flex items-center gap-2 font-mono text-[.65rem] text-text-muted">
              <LuLoader className="h-3.5 w-3.5 animate-spin" /> Loading order…
            </div>
          ) : orderQuery.isError || !order ? (
            <div className="rounded-sm border border-bear/30 bg-bear/10 px-3 py-2 font-mono text-[.65rem] text-bear">
              Couldn't load this order.
            </div>
          ) : (
            <>
              {/* Validation badge */}
              {order.validatorResult && (
                <div
                  className={`mb-4 flex items-center gap-2 rounded-sm border px-3 py-2 ${
                    valid ? "border-bull/30 bg-bull/10" : "border-bear/30 bg-bear/10"
                  }`}
                >
                  {valid ? <LuCircleCheck className="h-4 w-4 text-bull" /> : <LuCircleX className="h-4 w-4 text-bear" />}
                  <span className={`font-mono text-[.68rem] font-bold ${valid ? "text-bull" : "text-bear"}`}>
                    {valid ? "Validation passed" : "Validation failed"}
                  </span>
                  {order.validatorResult.summary && (
                    <span className="font-mono text-[.62rem] text-text-secondary">— {order.validatorResult.summary}</span>
                  )}
                </div>
              )}

              <dl className="flex flex-col gap-2.5">
                <EditRow label="Symbol">
                  <input className={inputCls} value={edits.symbol} disabled={busy} onChange={(e) => setEdits({ ...edits, symbol: e.target.value })} />
                </EditRow>
                <StaticRow label="Side" value={(order.orderPreview?.side ?? "").toUpperCase()} />
                <EditRow label="Entry (limit)">
                  <input className={inputCls} type="number" value={edits.entry} disabled={busy} onChange={(e) => setEdits({ ...edits, entry: e.target.value })} />
                </EditRow>
                <EditRow label="Stop loss">
                  <input className={inputCls} type="number" value={edits.sl} disabled={busy} onChange={(e) => setEdits({ ...edits, sl: e.target.value })} />
                </EditRow>
                <StaticRow label="Take profit" value={tpToText(order.orderPreview?.tp_price, order.orderPreview?.tp_levels)} />
                <EditRow label="Quantity">
                  <input className={inputCls} type="number" value={edits.qty} disabled={busy} onChange={(e) => setEdits({ ...edits, qty: e.target.value })} />
                </EditRow>
                <StaticRow label="Broker" value={order.broker ?? "—"} />
                {order.errorMessage && (
                  <div className="mt-1 rounded-sm border border-bear/30 bg-bear/10 px-3 py-2 font-mono text-[.63rem] text-bear">
                    {order.errorMessage}
                  </div>
                )}
              </dl>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border-subtle px-5 py-3">
          <button
            onClick={() => cancelMut.mutate()}
            disabled={busy || !order}
            className="rounded-sm border border-border-default px-4 py-2 font-mono text-[.62rem] uppercase tracking-widest text-text-secondary hover:border-bear hover:text-bear disabled:opacity-50"
          >
            Cancel order
          </button>
          <button
            onClick={() => draftMut.mutate()}
            disabled={busy || !order}
            className="rounded-sm border border-border-default px-4 py-2 font-mono text-[.62rem] uppercase tracking-widest text-text-secondary hover:border-border-strong disabled:opacity-50"
          >
            Save draft
          </button>
          <button
            onClick={() => confirmMut.mutate()}
            disabled={busy || !order}
            className="inline-flex items-center gap-2 rounded-sm bg-accent px-4 py-2 font-mono text-[.62rem] font-bold uppercase tracking-widest text-bg-base hover:bg-accent-hover disabled:opacity-50"
          >
            {confirmMut.isPending && <LuLoader className="h-3.5 w-3.5 animate-spin" />}
            Confirm &amp; place order
          </button>
        </div>
      </div>
    </div>
  );
}

function EditRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="font-mono text-[.64rem] text-text-muted">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function StaticRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="font-mono text-[.64rem] text-text-muted">{label}</dt>
      <dd className="font-mono text-[.68rem] text-text-primary">{value}</dd>
    </div>
  );
}
