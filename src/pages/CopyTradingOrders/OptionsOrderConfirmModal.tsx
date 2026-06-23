// src/pages/CopyTradingOrders/OptionsOrderConfirmModal.tsx
// Confirm modal for options orders — shows contracts, premium, OCC symbol,
// strike/expiry, and notional estimate. Never uses "lots" or "shares".
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LuLoader, LuX, LuCircleCheck, LuCircleX, LuInfo } from "react-icons/lu";
import axios from "axios";
import { copyOrdersApi } from "@/api/endpoints/copyOrders";
import { qk } from "@/api/queryKeys";
import { toast } from "@/components/ui/Toast";
import { InstrumentBadge } from "@/components/copy-trading/InstrumentBadge";
import { PreSubmitChecksPanel } from "@/components/copy-trading/PreSubmitChecksPanel";
import { EntryTypeToggle, MarketOrderBanner } from "@/components/copy-trading/EntryTypeBadge";
import { formatExpiry, isMarketOrder, mapErrorCode } from "@/utils/copyTradingFormatters";
import type { CopyOrder, OrderEdits, PreSubmitCheck } from "@/types/copyValidator";

const inputCls =
  "w-32 rounded-sm border border-border-default bg-bg-base px-2 py-1 font-mono text-[.68rem] text-text-primary outline-none focus:border-accent disabled:opacity-50";
const tifCls =
  "rounded-sm border border-border-default bg-bg-base px-2 py-1 font-mono text-[.68rem] text-text-primary outline-none focus:border-accent disabled:opacity-50";

const num = (s: string): number | undefined => {
  if (s.trim() === "") return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
};

function brokerErrMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const d = err.response?.data;
    if (d?.brokerError?.message) return d.brokerError.message;
    return mapErrorCode(d?.brokerError?.code ?? d?.code, d?.message ?? "Order failed.");
  }
  return "Order failed.";
}

function getPreSubmitChecks(err: unknown): PreSubmitCheck[] {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.brokerError?.preSubmitChecks
      ?? err.response?.data?.data?.brokerError?.preSubmitChecks
      ?? [];
  }
  return [];
}

export default function OptionsOrderConfirmModal({
  order,
  onClose,
}: {
  order: CopyOrder;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const preview = order.orderPreview;
  const valid = order.validatorResult?.valid;
  const preSubmitChecks = order.validatorResult?.preSubmitChecks ?? [];
  const isPremium = preview?.price_basis === "premium";
  const multiplier = preview?.multiplier ?? 100;

  const [edits, setEdits] = useState({ premium: "", sl: "", tp: "", contracts: "", tif: "DAY" });
  const [blockError, setBlockError] = useState<{ code?: string; message?: string; checks: PreSubmitCheck[] } | null>(null);
  const [orderTypeMode, setOrderTypeMode] = useState<"market" | "limit">("limit");

  useEffect(() => {
    if (preview) {
      const market = isMarketOrder(preview.order_type, preview.limit_price, preview.entry_display);
      setOrderTypeMode(market ? "market" : "limit");
      setEdits({
        premium: preview.limit_price != null ? String(preview.limit_price) : "",
        sl: preview.sl_price != null ? String(preview.sl_price) : "",
        tp: preview.tp_price != null ? String(preview.tp_price) : "",
        contracts: preview.qty != null ? String(preview.qty) : preview.lot_size != null ? String(preview.lot_size) : "",
        tif: preview.time_in_force ?? "DAY",
      });
    }
  }, [order.id]);

  const collectEdits = (): OrderEdits => {
    const e: OrderEdits = {};
    e.order_type = orderTypeMode;
    if (orderTypeMode === "market") {
      e.limit_price = null;
    } else {
      const premium = num(edits.premium);
      if (premium != null) e.limit_price = premium;
    }
    const sl = num(edits.sl); if (sl != null) e.sl_price = sl;
    const tp = num(edits.tp); if (tp != null) e.tp_price = tp;
    const qty = num(edits.contracts); if (qty != null) e.qty = qty;
    if (edits.tif) e.time_in_force = edits.tif;
    return e;
  };

  // Estimated notional: contracts × premium × multiplier (limit only — market price unknown pre-fill)
  const contractsNum = num(edits.contracts) ?? preview?.qty ?? null;
  const premiumNum = orderTypeMode === "limit" ? (num(edits.premium) ?? preview?.limit_price ?? null) : null;
  const estimatedNotional =
    contractsNum != null && premiumNum != null
      ? `~$${(contractsNum * premiumNum * multiplier).toLocaleString(undefined, { maximumFractionDigits: 0 })} (${contractsNum} × $${premiumNum} × ${multiplier})`
      : orderTypeMode === "market" && contractsNum != null
        ? `${contractsNum} contract${contractsNum !== 1 ? "s" : ""} × market premium × ${multiplier}`
        : null;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["copy-orders", "list"] });
    qc.invalidateQueries({ queryKey: qk.copyOrder(order.id) });
  };

  const draftMut = useMutation({
    mutationFn: () => copyOrdersApi.patch(order.id, collectEdits()),
    onSuccess: () => { toast.success("Draft saved"); invalidate(); },
    onError: (e) => toast.error(brokerErrMessage(e)),
  });

  const confirmMut = useMutation({
    mutationFn: () => copyOrdersApi.confirm(order.id, collectEdits()),
    onSuccess: (o) => {
      toast.success(o?.brokerOrderId ? `Options order submitted · ${o.brokerOrderId}` : "Options order submitted");
      invalidate(); onClose();
    },
    onError: (e) => {
      const checks = getPreSubmitChecks(e);
      if (checks.length > 0) {
        const d = axios.isAxiosError(e) ? e.response?.data : null;
        setBlockError({ code: d?.brokerError?.code ?? d?.code, message: d?.brokerError?.message ?? d?.message, checks });
      } else {
        toast.error(brokerErrMessage(e));
      }
    },
  });

  const cancelMut = useMutation({
    mutationFn: () => copyOrdersApi.cancel(order.id),
    onSuccess: () => { toast.info("Order cancelled"); invalidate(); onClose(); },
    onError: (e) => toast.error(brokerErrMessage(e)),
  });

  const busy = draftMut.isPending || confirmMut.isPending || cancelMut.isPending;

  // Options enabled check from pre-submit checks
  const optionsEnabledCheck = preSubmitChecks.find((c) => c.name === "options_enabled");
  const optionsDisabled = optionsEnabledCheck && !optionsEnabledCheck.ok;

  return (
    <div className="fixed inset-0 z-[900] flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:p-8" onClick={onClose}>
      <div className="my-auto w-full max-w-lg rounded-lg border border-border-default bg-bg-surface shadow-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3">
          <div className="flex items-center gap-2.5">
            <h3 className="font-display font-bold text-text-primary">Confirm Copy Trade</h3>
            <InstrumentBadge profile="options" size="md" />
          </div>
          <button onClick={onClose} className="rounded-sm p-1 text-text-muted hover:bg-bg-elevated hover:text-text-secondary">
            <LuX className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4">
          {/* Options not enabled warning */}
          {optionsDisabled && (
            <div className="mb-4 rounded-sm border border-warning/40 bg-warning/10 px-3 py-2.5">
              <p className="font-mono text-[.63rem] font-bold text-warning">Options trading not enabled on this broker connection.</p>
              <p className="mt-0.5 font-mono text-[.6rem] text-text-muted">
                Enable options trading on your Alpaca account to place this order.
              </p>
            </div>
          )}

          {/* Validation status */}
          {order.validatorResult && (
            <div className={`mb-4 flex items-center gap-2 rounded-sm border px-3 py-2 ${valid ? "border-bull/30 bg-bull/10" : "border-bear/30 bg-bear/10"}`}>
              {valid ? <LuCircleCheck className="h-4 w-4 text-bull" /> : <LuCircleX className="h-4 w-4 text-bear" />}
              <span className={`font-mono text-[.68rem] font-bold ${valid ? "text-bull" : "text-bear"}`}>
                {valid ? "Validation passed ✓" : "Validation failed"}
              </span>
            </div>
          )}

          {/* Pre-submit gate failure */}
          {blockError && (
            <div className="mb-4">
              <PreSubmitChecksPanel checks={blockError.checks} errorCode={blockError.code} errorMessage={blockError.message} />
            </div>
          )}

          {/* Pre-submit checks from stored result */}
          {preSubmitChecks.length > 0 && preSubmitChecks.some((c) => !c.ok) && !blockError && (
            <div className="mb-4">
              <PreSubmitChecksPanel checks={preSubmitChecks} errorCode={order.errorCode} errorMessage={order.errorMessage} />
            </div>
          )}

          {/* Error message fallback */}
          {order.errorMessage && !blockError && (
            <div className="mb-4 rounded-sm border border-bear/30 bg-bear/10 px-3 py-2 font-mono text-[.63rem] text-bear">
              {mapErrorCode(order.errorCode, order.errorMessage)}
            </div>
          )}

          {/* Options contract details (static) */}
          {(preview?.underlying_symbol || preview?.strike || preview?.expiry || preview?.contract_symbol) && (
            <div className="mb-4 rounded-sm border border-purple-500/30 bg-purple-500/5 px-3 py-2.5">
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {preview.underlying_symbol && (
                  <span className="font-mono text-[.68rem] font-bold text-text-primary">{preview.underlying_symbol}</span>
                )}
                {preview.strike && preview.option_type && (
                  <span className="font-mono text-[.66rem] text-purple-300">
                    ${preview.strike} {preview.option_type === "call" ? "Call" : "Put"}
                  </span>
                )}
                {preview.expiry && (
                  <span className="font-mono text-[.64rem] text-text-secondary">
                    Exp {formatExpiry(preview.expiry)}
                  </span>
                )}
              </div>
              {preview.contract_symbol && (
                <p className="mt-1 font-mono text-[.6rem] text-text-muted">{preview.contract_symbol}</p>
              )}
            </div>
          )}

          {/* Market order banner */}
          {orderTypeMode === "market" && (
            <div className="mb-4">
              <MarketOrderBanner profile="options" />
            </div>
          )}

          {/* Premium helper tooltip (limit only) */}
          {isPremium && orderTypeMode === "limit" && (
            <div className="mb-4 flex items-start gap-2 rounded-sm border border-border-subtle bg-bg-elevated px-3 py-2">
              <LuInfo className="mt-0.5 h-3 w-3 shrink-0 text-info" />
              <p className="font-mono text-[.6rem] text-text-muted">
                Options prices are <strong className="text-text-secondary">per-contract premium</strong>, not the stock
                price.{preview?.underlying_symbol ? ` ${preview.underlying_symbol} stock trades around the strike $${preview?.strike}; this order uses the option premium.` : ""}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            <StaticRow label="Underlying" value={preview?.underlying_symbol ?? preview?.symbol ?? "—"} />
            <StaticRow label="Side" value={(preview?.side ?? "").toUpperCase()} valueClass={preview?.side === "buy" ? "text-bull" : "text-bear"} />

            {/* Premium entry — market/limit toggle */}
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-[.64rem] text-text-muted">
                {orderTypeMode === "market" ? "Market premium" : "Premium per contract"}
              </span>
              <div className="flex items-center gap-2">
                <EntryTypeToggle value={orderTypeMode} onChange={setOrderTypeMode} disabled={busy} />
                {orderTypeMode === "limit" && (
                  <div className="flex items-center gap-1.5">
                    <input className={inputCls} type="number" step="0.01" value={edits.premium} disabled={busy} onChange={(e) => setEdits({ ...edits, premium: e.target.value })} />
                    {isPremium && <span className="font-mono text-[.58rem] text-purple-400">(prem)</span>}
                  </div>
                )}
              </div>
            </div>

            <EditRow label="Stop loss (premium)">
              <input className={inputCls} type="number" step="0.01" value={edits.sl} disabled={busy} onChange={(e) => setEdits({ ...edits, sl: e.target.value })} />
            </EditRow>

            <EditRow label="Take profit (premium)">
              <input className={inputCls} type="number" step="0.01" value={edits.tp} disabled={busy} onChange={(e) => setEdits({ ...edits, tp: e.target.value })} placeholder="optional" />
            </EditRow>

            <EditRow label="Contracts">
              <div className="flex items-center gap-1.5">
                <input className={inputCls} type="number" min={1} step={1} value={edits.contracts} disabled={busy} onChange={(e) => setEdits({ ...edits, contracts: e.target.value })} />
                <span className="font-mono text-[.62rem] font-bold text-purple-400">contracts</span>
              </div>
            </EditRow>

            <EditRow label="Time in force">
              <select className={tifCls} value={edits.tif} disabled={busy} onChange={(e) => setEdits({ ...edits, tif: e.target.value })}>
                {["DAY", "GTC", "IOC", "FOK"].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </EditRow>

            {estimatedNotional && (
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[.64rem] text-text-muted">Est. notional</span>
                <span className="font-mono text-[.64rem] text-text-secondary">{estimatedNotional}</span>
              </div>
            )}

            <StaticRow label="Broker" value={`${order.broker ?? "—"}${optionsEnabledCheck?.ok ? " ✓ Options enabled" : ""}`} />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border-subtle px-5 py-3">
          <button onClick={() => cancelMut.mutate()} disabled={busy} className="rounded-sm border border-border-default px-4 py-2 font-mono text-[.62rem] uppercase tracking-widest text-text-secondary hover:border-bear hover:text-bear disabled:opacity-50">
            Cancel order
          </button>
          <button onClick={() => draftMut.mutate()} disabled={busy} className="rounded-sm border border-border-default px-4 py-2 font-mono text-[.62rem] uppercase tracking-widest text-text-secondary hover:border-border-strong disabled:opacity-50">
            Save draft
          </button>
          <button
            onClick={() => { setBlockError(null); confirmMut.mutate(); }}
            disabled={busy || !!optionsDisabled}
            className="inline-flex items-center gap-2 rounded-sm bg-purple-600 px-4 py-2 font-mono text-[.62rem] font-bold uppercase tracking-widest text-white hover:bg-purple-500 disabled:opacity-50"
          >
            {confirmMut.isPending && <LuLoader className="h-3.5 w-3.5 animate-spin" />}
            Confirm &amp; Place Order
          </button>
        </div>
      </div>
    </div>
  );
}

function EditRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-mono text-[.64rem] text-text-muted">{label}</span>
      <div>{children}</div>
    </div>
  );
}

function StaticRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-mono text-[.64rem] text-text-muted">{label}</span>
      <span className={`font-mono text-[.68rem] font-bold ${valueClass ?? "text-text-primary"}`}>{value}</span>
    </div>
  );
}
