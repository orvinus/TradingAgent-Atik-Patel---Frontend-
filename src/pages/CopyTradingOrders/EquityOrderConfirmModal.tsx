// src/pages/CopyTradingOrders/EquityOrderConfirmModal.tsx
// Confirm modal for equity (and crypto) orders — renders shares, entry/SL/TP,
// multi-TP breakdown, and time in force.
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LuLoader, LuX, LuCircleCheck, LuCircleX, LuPlus, LuTrash2 } from "react-icons/lu";
import axios from "axios";
import { copyOrdersApi } from "@/api/endpoints/copyOrders";
import { qk } from "@/api/queryKeys";
import { toast } from "@/components/ui/Toast";
import { InstrumentBadge } from "@/components/copy-trading/InstrumentBadge";
import { PreSubmitChecksPanel } from "@/components/copy-trading/PreSubmitChecksPanel";
import { EntryTypeToggle, MarketOrderBanner } from "@/components/copy-trading/EntryTypeBadge";
import { isMarketOrder, mapErrorCode } from "@/utils/copyTradingFormatters";
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

// ── Multi-TP breakdown for display ────────────────────────────────────────────

function MultiTpLegBreakdown({ qty, tp }: { qty: number; tp: TpState }) {
  if (tp.mode !== "multi" || tp.levels.length < 2) return null;
  return (
    <div className="rounded-sm border border-border-subtle bg-bg-elevated px-3 py-2.5">
      <p className="mb-2 font-mono text-[.57rem] uppercase tracking-widest text-text-muted">Multi-TP execution</p>
      {tp.levels.map((row, i) => {
        const pct = num(row.exitPct) ?? 0;
        const shares = Math.round((pct / 100) * qty);
        return (
          <div key={i} className="flex items-center gap-2 font-mono text-[.62rem] text-text-secondary">
            <span className="w-10 text-text-muted">Leg {i + 1}:</span>
            <span className="font-bold text-text-primary">{shares} shares</span>
            <span className="text-text-muted">→ TP {row.price || "?"}</span>
            <span className="text-bull">({pct}%)</span>
          </div>
        );
      })}
    </div>
  );
}

// ── TpSection ─────────────────────────────────────────────────────────────────

function TpSection({ tp, onChange, busy }: { tp: TpState; onChange: (t: TpState) => void; busy: boolean; entry: string; side: string }) {

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
          <span className="font-mono text-[.64rem] text-text-muted">Take profit</span>
          <div className="flex items-center gap-1.5">
            <input
              className={inputCls}
              placeholder="e.g. 1.6"
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
        <p className="text-right font-mono text-[.57rem] text-text-muted">Tip: type 1.4, 1.5 for multiple targets</p>
      </div>
    );
  }

  const totalPct = tp.levels.reduce((sum, r) => sum + (num(r.exitPct) ?? 0), 0);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[.64rem] text-text-muted">Take profit</span>
        <span className="font-mono text-[.57rem] text-text-secondary">Multiple targets</span>
      </div>
      <div className="rounded-sm border border-border-subtle bg-bg-elevated px-3 py-2.5">
        <div className="mb-2 grid grid-cols-[2.5rem_1fr_3.5rem_6rem_1.5rem] gap-1.5 font-mono text-[.57rem] uppercase tracking-wide text-text-muted">
          <span>#</span><span>Price</span><span>Exit %</span><span>Move SL</span><span />
        </div>
        <div className="flex flex-col gap-1.5">
          {tp.levels.map((row, i) => (
            <div key={i} className="grid grid-cols-[2.5rem_1fr_3.5rem_6rem_1.5rem] items-center gap-1.5">
              <span className="font-mono text-[.62rem] text-text-muted">TP{i + 1}</span>
              <input className={smallInput} type="number" placeholder="price" value={row.price} disabled={busy} onChange={(e) => updateLevel(i, { price: e.target.value })} />
              <input className={smallInput} type="number" min={1} max={100} placeholder="%" value={row.exitPct} disabled={busy} onChange={(e) => updateLevel(i, { exitPct: e.target.value })} />
              <select className={selectCls} value={row.moveSlTo} disabled={busy} onChange={(e) => updateLevel(i, { moveSlTo: e.target.value as MoveSlTo })}>
                <option value="none">—</option>
                <option value="entry">entry</option>
                <option value="breakeven">B/E</option>
              </select>
              <button type="button" disabled={busy || tp.levels.length <= 1} onClick={() => {
                const next = tp.levels.filter((_, idx) => idx !== i);
                if (next.length === 1 && next[0]) onChange({ mode: "single", singlePrice: next[0].price, levels: next });
                else { const pcts = distributeEvenPct(next.length); onChange({ ...tp, levels: next.map((r, idx) => ({ ...r, exitPct: String(pcts[idx]) })) }); }
              }} className="flex items-center justify-center text-text-muted hover:text-bear disabled:opacity-30">
                <LuTrash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
        <div className="mt-2.5 flex items-center justify-between border-t border-border-subtle pt-2">
          <button type="button" disabled={busy} onClick={() => {
            const next = [...tp.levels, { price: "", exitPct: "0", moveSlTo: "none" as MoveSlTo }];
            const pcts = distributeEvenPct(next.length);
            onChange({ ...tp, levels: next.map((r, i) => ({ ...r, exitPct: String(pcts[i]) })) });
          }} className="flex items-center gap-1 font-mono text-[.6rem] text-text-secondary hover:text-text-primary disabled:opacity-50">
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

// ── Slippage info block ────────────────────────────────────────────────────────

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
          {refPrice != null && <span><span className="text-text-muted">Signal ref:</span> ${refPrice}</span>}
        </div>
        <p className="mt-1 font-mono text-[.58rem] text-amber-300">
          Order rejected if market exceeds tolerance at submit time.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-sm border border-accent/20 bg-accent/5 px-3 py-2.5">
      <p className="mb-1 font-mono text-[.56rem] uppercase tracking-widest text-accent">
        Slippage applied{maxPct != null ? ` · +${maxPct}%` : ""}
      </p>
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 font-mono text-[.62rem]">
        {refPrice != null && (
          <span>
            <span className="text-text-muted">Signal price:</span>{" "}
            <span className="text-text-primary">${refPrice}</span>
          </span>
        )}
        {submitPrice != null && (
          <span>
            <span className="text-text-muted">Your limit:</span>{" "}
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

// ── Spread info block ──────────────────────────────────────────────────────────

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

// ── Main modal ─────────────────────────────────────────────────────────────────

export default function EquityOrderConfirmModal({
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

  const [edits, setEdits] = useState({ symbol: "", entry: "", sl: "", qty: "", tif: "DAY" });
  const [tpState, setTpState] = useState<TpState>({ mode: "single", singlePrice: "", levels: [{ price: "", exitPct: "100", moveSlTo: "none" }] });
  const [blockError, setBlockError] = useState<{ code?: string; message?: string; checks: PreSubmitCheck[] } | null>(null);
  const [orderTypeMode, setOrderTypeMode] = useState<"market" | "limit">("limit");

  useEffect(() => {
    if (preview) {
      const market = isMarketOrder(preview.order_type, preview.limit_price, preview.entry_display);
      setOrderTypeMode(market ? "market" : "limit");
      setEdits({
        symbol: preview.symbol ?? "",
        entry: preview.limit_price != null ? String(preview.limit_price) : "",
        sl: preview.sl_price != null ? String(preview.sl_price) : "",
        qty: preview.qty != null ? String(preview.qty) : "",
        tif: preview.time_in_force ?? "DAY",
      });
      setTpState(initTpState(preview));
    }
  }, [order.id]);

  const collectEdits = (): OrderEdits => {
    const e: OrderEdits = {};
    if (edits.symbol.trim()) e.symbol = edits.symbol.trim();
    e.order_type = orderTypeMode;
    if (orderTypeMode !== "market") {
      const entry = num(edits.entry);
      if (entry != null) e.limit_price = entry;
    }
    const sl = num(edits.sl); if (sl != null) e.sl_price = sl;
    const qty = num(edits.qty); if (qty != null) e.qty = qty;
    if (edits.tif) e.time_in_force = edits.tif;
    return { ...e, ...buildTpBody(tpState) };
  };

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
      toast.success(o?.brokerOrderId ? `Order submitted · ${o.brokerOrderId}` : "Order submitted");
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
  const qtyNum = num(edits.qty) ?? preview?.qty ?? 0;

  return (
    <div className="fixed inset-0 z-[900] flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:p-8" onClick={onClose}>
      <div className="my-auto w-full max-w-lg rounded-lg border border-border-default bg-bg-surface shadow-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3">
          <div className="flex items-center gap-2.5">
            <h3 className="font-display font-bold text-text-primary">Confirm Copy Trade</h3>
            <InstrumentBadge profile={preview?.instrumentProfile ?? "equity"} size="md" />
          </div>
          <button onClick={onClose} className="rounded-sm p-1 text-text-muted hover:bg-bg-elevated hover:text-text-secondary">
            <LuX className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4">
          {/* Validation status */}
          {order.validatorResult && (
            <div className={`mb-4 flex items-center gap-2 rounded-sm border px-3 py-2 ${valid ? "border-bull/30 bg-bull/10" : "border-bear/30 bg-bear/10"}`}>
              {valid ? <LuCircleCheck className="h-4 w-4 text-bull" /> : <LuCircleX className="h-4 w-4 text-bear" />}
              <span className={`font-mono text-[.68rem] font-bold ${valid ? "text-bull" : "text-bear"}`}>
                {valid ? "Validation passed ✓" : "Validation failed"}
              </span>
              {order.validatorResult.summary && (
                <span className="font-mono text-[.62rem] text-text-secondary">— {order.validatorResult.summary}</span>
              )}
            </div>
          )}

          {/* Pre-submit gate failure */}
          {blockError && (
            <div className="mb-4">
              <PreSubmitChecksPanel checks={blockError.checks} errorCode={blockError.code} errorMessage={blockError.message} />
            </div>
          )}

          {/* Old error message fallback */}
          {order.errorMessage && !blockError && (
            <div className="mb-4 rounded-sm border border-bear/30 bg-bear/10 px-3 py-2 font-mono text-[.63rem] text-bear">
              {mapErrorCode(order.errorCode, order.errorMessage)}
            </div>
          )}

          {/* Pre-submit checks from stored validator result */}
          {preSubmitChecks.length > 0 && preSubmitChecks.some((c) => !c.ok) && !blockError && (
            <div className="mb-4">
              <PreSubmitChecksPanel checks={preSubmitChecks} errorCode={order.errorCode} errorMessage={order.errorMessage} />
            </div>
          )}

          {orderTypeMode === "market" && (
            <div className="mb-4">
              <MarketOrderBanner profile={preview?.instrumentProfile} />
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            <EditRow label="Symbol">
              <input className={inputCls} value={edits.symbol} disabled={busy} onChange={(e) => setEdits({ ...edits, symbol: e.target.value })} />
            </EditRow>
            <StaticRow label="Side" value={(preview?.side ?? "").toUpperCase()} valueClass={preview?.side === "buy" ? "text-bull" : "text-bear"} />

            {/* Entry row — market/limit toggle */}
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-[.64rem] text-text-muted">Entry</span>
              <div className="flex items-center gap-2">
                <EntryTypeToggle value={orderTypeMode} onChange={setOrderTypeMode} disabled={busy} />
                {orderTypeMode === "limit" && (
                  <input
                    className={inputCls}
                    type="number"
                    placeholder="price"
                    value={edits.entry}
                    disabled={busy}
                    onChange={(e) => setEdits({ ...edits, entry: e.target.value })}
                  />
                )}
              </div>
            </div>

            <EditRow label="Stop loss">
              <input className={inputCls} type="number" value={edits.sl} disabled={busy} onChange={(e) => setEdits({ ...edits, sl: e.target.value })} />
            </EditRow>

            <TpSection tp={tpState} onChange={setTpState} busy={busy} entry={edits.entry} side={preview?.side ?? ""} />

            <EditRow label={`Quantity (${preview?.size_unit ?? "shares"})`}>
              <input className={inputCls} type="number" min={1} value={edits.qty} disabled={busy} onChange={(e) => setEdits({ ...edits, qty: e.target.value })} />
            </EditRow>
            <EditRow label="Time in force">
              <select className={tifCls} value={edits.tif} disabled={busy} onChange={(e) => setEdits({ ...edits, tif: e.target.value })}>
                {["DAY", "GTC", "IOC", "FOK"].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </EditRow>
            <StaticRow label="Broker" value={order.broker ?? "—"} />

            {/* Multi-TP breakdown */}
            {tpState.mode === "multi" && qtyNum > 0 && (
              <MultiTpLegBreakdown qty={qtyNum} tp={tpState} />
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
          <button onClick={() => { setBlockError(null); confirmMut.mutate(); }} disabled={busy} className="inline-flex items-center gap-2 rounded-sm bg-accent px-4 py-2 font-mono text-[.62rem] font-bold uppercase tracking-widest text-bg-base hover:bg-accent-hover disabled:opacity-50">
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
