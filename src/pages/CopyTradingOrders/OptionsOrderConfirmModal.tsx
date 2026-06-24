// src/pages/CopyTradingOrders/OptionsOrderConfirmModal.tsx
// Confirm modal for options orders — shows contracts, premium, OCC symbol,
// strike/expiry, and notional estimate. Never uses "lots" or "shares".
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LuLoader, LuX, LuCircleCheck, LuCircleX, LuInfo, LuPlus, LuTrash2 } from "react-icons/lu";
import axios from "axios";
import { copyOrdersApi } from "@/api/endpoints/copyOrders";
import { qk } from "@/api/queryKeys";
import { toast } from "@/components/ui/Toast";
import { InstrumentBadge } from "@/components/copy-trading/InstrumentBadge";
import { PreSubmitChecksPanel } from "@/components/copy-trading/PreSubmitChecksPanel";
import { EntryTypeToggle, MarketOrderBanner } from "@/components/copy-trading/EntryTypeBadge";
import { formatExpiry, isMarketOrder, mapErrorCode } from "@/utils/copyTradingFormatters";
import type { CopyOrder, OrderEdits, OrderPreview, PreSubmitCheck, SlippageResult, SpreadResult } from "@/types/copyValidator";

type TpMode = "single" | "multi";
type MoveSlTo = "none" | "entry" | "breakeven";

interface TpLevelRow {
  price: string;
  exitPct: string;
  moveSlTo: MoveSlTo;
}

interface TpState {
  mode: TpMode;
  singlePrice: string;
  levels: TpLevelRow[];
}

const inputCls =
  "w-32 rounded-sm border border-border-default bg-bg-base px-2 py-1 font-mono text-[.68rem] text-text-primary outline-none focus:border-accent disabled:opacity-50";
const smallInput =
  "w-full rounded-sm border border-border-default bg-bg-base px-2 py-1 font-mono text-[.68rem] text-text-primary outline-none focus:border-accent disabled:opacity-50";
const selectCls =
  "w-full rounded-sm border border-border-default bg-bg-base px-1.5 py-1 font-mono text-[.65rem] text-text-primary outline-none focus:border-accent disabled:opacity-50";
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

function distributeEvenPct(n: number): number[] {
  const base = Math.floor(100 / n);
  const rem = 100 - base * n;
  return Array.from({ length: n }, (_, i) => (i === 0 ? base + rem : base));
}

function initTpState(preview: OrderPreview | null | undefined): TpState {
  const levels = preview?.tp_levels;
  if (levels && levels.length > 1) {
    return {
      mode: "multi",
      singlePrice: "",
      levels: levels.map((l) => ({
        price: String(l.level),
        exitPct: String(l.exit_pct),
        moveSlTo: (l.move_sl_to === "entry" ? "entry" : l.move_sl_to === "breakeven" ? "breakeven" : "none") as MoveSlTo,
      })),
    };
  }
  const price = preview?.tp_price ?? (levels?.[0]?.level ?? null);
  return {
    mode: "single",
    singlePrice: price != null ? String(price) : "",
    levels: [{ price: "", exitPct: "100", moveSlTo: "none" }],
  };
}

function buildTpBody(tp: TpState): Pick<OrderEdits, "tp_price" | "tp_levels"> {
  if (tp.mode === "single") {
    const p = num(tp.singlePrice);
    return p != null ? { tp_price: p } : {};
  }
  const levels: Array<{ level: number; exit_pct: number; move_sl_to: string | null }> = [];
  for (const r of tp.levels) {
    const level = num(r.price);
    const exit_pct = num(r.exitPct);
    if (level != null && exit_pct != null) {
      levels.push({ level, exit_pct, move_sl_to: r.moveSlTo === "none" ? null : r.moveSlTo });
    }
  }
  return levels.length > 0 ? { tp_levels: levels } : {};
}

// ── Multi-TP contracts breakdown ──────────────────────────────────────────────

function MultiTpLegBreakdown({ contracts, tp }: { contracts: number; tp: TpState }) {
  if (tp.mode !== "multi" || tp.levels.length < 2) return null;
  return (
    <div className="rounded-sm border border-purple-500/20 bg-purple-500/5 px-3 py-2.5">
      <p className="mb-2 font-mono text-[.57rem] uppercase tracking-widest text-text-muted">Multi-TP execution</p>
      {tp.levels.map((row, i) => {
        const pct = num(row.exitPct) ?? 0;
        const legs = Math.round((pct / 100) * contracts);
        return (
          <div key={i} className="flex items-center gap-2 font-mono text-[.62rem] text-text-secondary">
            <span className="w-10 text-text-muted">Leg {i + 1}:</span>
            <span className="font-bold text-text-primary">{legs} contract{legs !== 1 ? "s" : ""}</span>
            <span className="text-text-muted">→ TP @{row.price || "?"}</span>
            <span className="text-bull">({pct}%)</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Options TP Section ────────────────────────────────────────────────────────

function OptionsTpSection({ tp, onChange, busy }: { tp: TpState; onChange: (t: TpState) => void; busy: boolean }) {
  const handleSingleBlur = (raw: string) => {
    const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
    const values = parts.map(Number).filter((n) => Number.isFinite(n) && n > 0);
    if (values.length >= 2 && values.length === parts.length) {
      const pcts = distributeEvenPct(values.length);
      onChange({ mode: "multi", singlePrice: raw, levels: values.map((v, i) => ({ price: String(v), exitPct: String(pcts[i]), moveSlTo: "none" })) });
    }
  };

  const updateLevel = (i: number, patch: Partial<TpLevelRow>) =>
    onChange({ ...tp, levels: tp.levels.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) });

  if (tp.mode === "single") {
    return (
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-[.64rem] text-text-muted">Take profit (premium)</span>
          <div className="flex items-center gap-1.5">
            <input
              className={inputCls}
              type="number"
              step="0.01"
              placeholder="e.g. 2.50"
              value={tp.singlePrice}
              disabled={busy}
              onChange={(e) => onChange({ ...tp, singlePrice: e.target.value })}
              onBlur={(e) => handleSingleBlur(e.target.value)}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                const pcts = distributeEvenPct(2);
                onChange({ mode: "multi", singlePrice: tp.singlePrice, levels: [{ price: tp.singlePrice, exitPct: String(pcts[0]), moveSlTo: "none" }, { price: "", exitPct: String(pcts[1]), moveSlTo: "none" }] });
              }}
              className="whitespace-nowrap font-mono text-[.6rem] text-text-muted underline-offset-2 hover:text-text-secondary disabled:opacity-50"
            >
              + multi
            </button>
          </div>
        </div>
        <p className="text-right font-mono text-[.57rem] text-text-muted">Tip: type 2.0, 2.5 for multiple targets</p>
      </div>
    );
  }

  const totalPct = tp.levels.reduce((sum, r) => sum + (num(r.exitPct) ?? 0), 0);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[.64rem] text-text-muted">Take profit (premium)</span>
        <span className="font-mono text-[.57rem] text-text-secondary">Multiple targets</span>
      </div>
      <div className="rounded-sm border border-border-subtle bg-bg-elevated px-3 py-2.5">
        <div className="mb-2 grid grid-cols-[2.5rem_1fr_3.5rem_6rem_1.5rem] gap-1.5 font-mono text-[.57rem] uppercase tracking-wide text-text-muted">
          <span>#</span><span>Premium</span><span>Exit %</span><span>Move SL</span><span />
        </div>
        <div className="flex flex-col gap-1.5">
          {tp.levels.map((row, i) => (
            <div key={i} className="grid grid-cols-[2.5rem_1fr_3.5rem_6rem_1.5rem] items-center gap-1.5">
              <span className="font-mono text-[.62rem] text-text-muted">TP{i + 1}</span>
              <input className={smallInput} type="number" step="0.01" placeholder="premium" value={row.price} disabled={busy} onChange={(e) => updateLevel(i, { price: e.target.value })} />
              <input className={smallInput} type="number" min={1} max={100} placeholder="%" value={row.exitPct} disabled={busy} onChange={(e) => updateLevel(i, { exitPct: e.target.value })} />
              <select className={selectCls} value={row.moveSlTo} disabled={busy} onChange={(e) => updateLevel(i, { moveSlTo: e.target.value as MoveSlTo })}>
                <option value="none">—</option>
                <option value="entry">entry</option>
                <option value="breakeven">B/E</option>
              </select>
              <button
                type="button"
                disabled={busy || tp.levels.length <= 1}
                onClick={() => {
                  const next = tp.levels.filter((_, idx) => idx !== i);
                  if (next.length === 1 && next[0]) onChange({ mode: "single", singlePrice: next[0].price, levels: next });
                  else { const pcts = distributeEvenPct(next.length); onChange({ ...tp, levels: next.map((r, idx) => ({ ...r, exitPct: String(pcts[idx]) })) }); }
                }}
                className="flex items-center justify-center text-text-muted hover:text-bear disabled:opacity-30"
              >
                <LuTrash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
        <div className="mt-2.5 flex items-center justify-between border-t border-border-subtle pt-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              const next = [...tp.levels, { price: "", exitPct: "0", moveSlTo: "none" as MoveSlTo }];
              const pcts = distributeEvenPct(next.length);
              onChange({ ...tp, levels: next.map((r, i) => ({ ...r, exitPct: String(pcts[i]) })) });
            }}
            className="flex items-center gap-1 font-mono text-[.6rem] text-text-secondary hover:text-text-primary disabled:opacity-50"
          >
            <LuPlus className="h-3 w-3" /> Add level
          </button>
          <span className={`font-mono text-[.62rem] font-semibold ${Math.abs(totalPct - 100) > 0.01 ? "text-bear" : "text-bull"}`}>
            Total: {totalPct}%{Math.abs(totalPct - 100) > 0.01 ? " ≠ 100" : " ✓"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Slippage info block (options / premium labels) ────────────────────────────

function SlippageInfoBlock({
  slippage,
  orderType,
}: {
  slippage: SlippageResult;
  orderType: "market" | "limit";
}) {
  const maxPct = slippage.maxPct;
  const refPrice = slippage.reference_price ?? slippage.original_limit_price;
  const submitPrice = slippage.adjusted_limit_price;

  if (orderType === "market") {
    return (
      <div className="rounded-sm border border-amber-500/30 bg-amber-500/5 px-3 py-2.5">
        <p className="mb-1 font-mono text-[.56rem] uppercase tracking-widest text-amber-400">Slippage check</p>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 font-mono text-[.62rem] text-text-secondary">
          <span><span className="text-text-muted">Max slip:</span> {maxPct != null ? `${maxPct}%` : "0.5% (default)"}</span>
          {refPrice != null && <span><span className="text-text-muted">Signal ref premium:</span> ${refPrice}</span>}
        </div>
        <p className="mt-1 font-mono text-[.58rem] text-amber-300">
          Order rejected if market premium exceeds tolerance at submit.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-sm border border-purple-500/30 bg-purple-500/5 px-3 py-2.5">
      <p className="mb-1 font-mono text-[.56rem] uppercase tracking-widest text-purple-400">
        Slippage applied{maxPct != null ? ` · +${maxPct}%` : ""}
      </p>
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 font-mono text-[.62rem]">
        {refPrice != null && (
          <span>
            <span className="text-text-muted">Signal premium:</span>{" "}
            <span className="text-text-primary">${refPrice}</span>
          </span>
        )}
        {submitPrice != null && (
          <span>
            <span className="text-text-muted">Submit limit:</span>{" "}
            <span className="font-bold text-bull">${submitPrice}</span>
          </span>
        )}
      </div>
      {refPrice != null && submitPrice != null && (
        <p className="mt-0.5 font-mono text-[.58rem] text-text-muted">
          Limit widened by {maxPct != null ? `${maxPct}%` : "~0.5%"} to improve fill chance.
        </p>
      )}
    </div>
  );
}

// ── Spread info block (options) ────────────────────────────────────────────────

function SpreadInfoBlock({
  spread,
  orderType,
}: {
  spread: SpreadResult;
  orderType: "market" | "limit";
}) {
  const maxPct = spread.maxPct;
  const bid = spread.bid;
  const ask = spread.ask;
  const spreadPct = spread.spreadPct;
  const crossedPrice = spread.crossed_limit_price;
  const beforeCross = spread.limit_before_cross;

  if (orderType === "market") {
    return (
      <div className="rounded-sm border border-sky-500/30 bg-sky-500/5 px-3 py-2.5">
        <p className="mb-1 font-mono text-[.56rem] uppercase tracking-widest text-sky-400">Spread check</p>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 font-mono text-[.62rem] text-text-secondary">
          <span><span className="text-text-muted">Max spread:</span> {maxPct != null ? `${maxPct}%` : "1% (default)"}</span>
          {bid != null && <span><span className="text-text-muted">Bid:</span> ${bid}</span>}
          {ask != null && <span><span className="text-text-muted">Ask:</span> ${ask}</span>}
          {spreadPct != null && <span><span className="text-text-muted">Live spread:</span> {spreadPct.toFixed(2)}%</span>}
        </div>
        <p className="mt-1 font-mono text-[.58rem] text-sky-300">
          Order rejected if spread exceeds tolerance at submit time.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-sm border border-sky-500/20 bg-sky-500/5 px-3 py-2.5">
      <p className="mb-1 font-mono text-[.56rem] uppercase tracking-widest text-sky-400">
        Spread check{maxPct != null ? ` · max ${maxPct}%` : ""}
      </p>
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 font-mono text-[.62rem]">
        {bid != null && <span><span className="text-text-muted">Bid:</span> ${bid}</span>}
        {ask != null && <span><span className="text-text-muted">Ask:</span> ${ask}</span>}
        {spreadPct != null && <span><span className="text-text-muted">Spread:</span> {spreadPct.toFixed(2)}%</span>}
      </div>
      {spread.crossSpread && crossedPrice != null && (
        <p className="mt-0.5 font-mono text-[.58rem] text-text-muted">
          Limit crossed to ask ${crossedPrice}
          {beforeCross != null ? ` (was $${beforeCross})` : ""}
        </p>
      )}
    </div>
  );
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

  const [edits, setEdits] = useState({ premium: "", sl: "", contracts: "", tif: "DAY" });
  const [tpState, setTpState] = useState<TpState>({ mode: "single", singlePrice: "", levels: [{ price: "", exitPct: "100", moveSlTo: "none" }] });
  const [blockError, setBlockError] = useState<{ code?: string; message?: string; checks: PreSubmitCheck[] } | null>(null);
  const [orderTypeMode, setOrderTypeMode] = useState<"market" | "limit">("limit");

  useEffect(() => {
    if (preview) {
      const market = isMarketOrder(preview.order_type, preview.limit_price, preview.entry_display);
      setOrderTypeMode(market ? "market" : "limit");
      setEdits({
        premium: preview.limit_price != null ? String(preview.limit_price) : "",
        sl: preview.sl_price != null ? String(preview.sl_price) : "",
        contracts: preview.qty != null ? String(preview.qty) : preview.lot_size != null ? String(preview.lot_size) : "",
        tif: preview.time_in_force ?? "DAY",
      });
      setTpState(initTpState(preview));
    }
  }, [order.id]);

  const collectEdits = (): OrderEdits => {
    const e: OrderEdits = {};
    e.order_type = orderTypeMode;
    if (orderTypeMode !== "market") {
      const premium = num(edits.premium);
      if (premium != null) e.limit_price = premium;
    }
    const sl = num(edits.sl); if (sl != null) e.sl_price = sl;
    const qty = num(edits.contracts); if (qty != null) e.qty = qty;
    if (edits.tif) e.time_in_force = edits.tif;
    return { ...e, ...buildTpBody(tpState) };
  };

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

            <OptionsTpSection tp={tpState} onChange={setTpState} busy={busy} />

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

            {/* Multi-TP contracts breakdown */}
            {tpState.mode === "multi" && contractsNum != null && contractsNum > 0 && (
              <MultiTpLegBreakdown contracts={contractsNum} tp={tpState} />
            )}

            {/* Slippage info */}
            {preview?.slippage?.enabled && (
              <SlippageInfoBlock
                slippage={preview.slippage}
                orderType={orderTypeMode}
              />
            )}

            {/* Spread info */}
            {preview?.spread?.enabled && (
              <SpreadInfoBlock
                spread={preview.spread}
                orderType={orderTypeMode}
              />
            )}
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
