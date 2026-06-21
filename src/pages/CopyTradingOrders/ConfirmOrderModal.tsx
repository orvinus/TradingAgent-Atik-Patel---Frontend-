// src/pages/CopyTradingOrders/ConfirmOrderModal.tsx
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LuLoader, LuX, LuCircleCheck, LuCircleX, LuPlus, LuTrash2 } from "react-icons/lu";
import axios from "axios";
import { copyOrdersApi } from "@/api/endpoints/copyOrders";
import { qk } from "@/api/queryKeys";
import { toast } from "@/components/ui/Toast";
import type { OrderEdits, OrderPreview } from "@/types/copyValidator";

// ── TP state types ─────────────────────────────────────────────────────────

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

// ── Pure helpers ───────────────────────────────────────────────────────────

function brokerErrMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const d = err.response?.data;
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

function distributeEvenPct(n: number): number[] {
  const base = Math.floor(100 / n);
  const remainder = 100 - base * n;
  return Array.from({ length: n }, (_, i) => (i === 0 ? base + remainder : base));
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

function validateTp(tp: TpState, entry: string, side: string): string | null {
  const entryNum = num(entry);
  const isBuy = side === "buy";

  if (tp.mode === "single") {
    const p = num(tp.singlePrice);
    if (p == null) return null;
    if (p <= 0) return "TP price must be positive";
    if (entryNum != null) {
      if (isBuy && p <= entryNum) return "For BUY: TP must be above entry";
      if (!isBuy && p >= entryNum) return "For SELL: TP must be below entry";
    }
    return null;
  }

  for (const r of tp.levels) {
    const p = num(r.price);
    if (p == null || p <= 0) return "All TP prices must be positive";
    const pct = num(r.exitPct);
    if (pct == null || pct < 1 || pct > 100) return "Exit % must be 1–100 for each level";
    if (entryNum != null) {
      if (isBuy && p <= entryNum) return "All TP levels must be above entry for BUY";
      if (!isBuy && p >= entryNum) return "All TP levels must be below entry for SELL";
    }
  }
  const totalPct = tp.levels.reduce((sum, r) => sum + (num(r.exitPct) ?? 0), 0);
  if (Math.abs(totalPct - 100) > 0.01) return `Exit % total is ${totalPct}% — must equal 100%`;
  return null;
}

// ── TpSection component ────────────────────────────────────────────────────

const smallInput =
  "w-full rounded-sm border border-border-default bg-bg-base px-2 py-1 font-mono text-[.68rem] text-text-primary outline-none focus:border-accent disabled:opacity-50";
const selectCls =
  "w-full rounded-sm border border-border-default bg-bg-base px-1.5 py-1 font-mono text-[.65rem] text-text-primary outline-none focus:border-accent disabled:opacity-50";

function TpSection({
  tp,
  onChange,
  busy,
  entry,
  side,
}: {
  tp: TpState;
  onChange: (next: TpState) => void;
  busy: boolean;
  entry: string;
  side: string;
}) {
  const tpError = validateTp(tp, entry, side);
  const totalPct = tp.levels.reduce((sum, r) => sum + (num(r.exitPct) ?? 0), 0);

  const handleSingleBlur = (raw: string) => {
    const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
    const values = parts.map(Number).filter((n) => Number.isFinite(n) && n > 0);
    if (values.length >= 2 && values.length === parts.length) {
      const pcts = distributeEvenPct(values.length);
      onChange({
        mode: "multi",
        singlePrice: raw,
        levels: values.map((v, i) => ({ price: String(v), exitPct: String(pcts[i]), moveSlTo: "none" })),
      });
    }
  };

  const updateLevel = (i: number, patch: Partial<TpLevelRow>) => {
    onChange({ ...tp, levels: tp.levels.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) });
  };

  const addLevel = () => {
    const next = [...tp.levels, { price: "", exitPct: "0", moveSlTo: "none" as MoveSlTo }];
    const pcts = distributeEvenPct(next.length);
    onChange({ ...tp, levels: next.map((r, i) => ({ ...r, exitPct: String(pcts[i]) })) });
  };

  const removeLevel = (i: number) => {
    const next = tp.levels.filter((_, idx) => idx !== i);
    if (next.length === 0) return;
    const first = next[0];
    if (next.length === 1 && first) {
      onChange({ mode: "single", singlePrice: first.price, levels: next });
    } else {
      const pcts = distributeEvenPct(next.length);
      onChange({ ...tp, levels: next.map((r, idx) => ({ ...r, exitPct: String(pcts[idx]) })) });
    }
  };

  const switchToMulti = () => {
    const pcts = distributeEvenPct(2);
    onChange({
      mode: "multi",
      singlePrice: tp.singlePrice,
      levels: [
        { price: tp.singlePrice, exitPct: String(pcts[0]), moveSlTo: "none" },
        { price: "", exitPct: String(pcts[1]), moveSlTo: "none" },
      ],
    });
  };

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
              onClick={switchToMulti}
              className="whitespace-nowrap font-mono text-[.6rem] text-text-muted underline-offset-2 hover:text-text-secondary disabled:opacity-50"
            >
              + multi
            </button>
          </div>
        </div>
        <p className="text-right font-mono text-[.57rem] text-text-muted">
          Tip: type 1.4, 1.5 for multiple targets
        </p>
        {tpError && <p className="text-right font-mono text-[.6rem] text-bear">{tpError}</p>}
      </div>
    );
  }

  // Multi mode
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[.64rem] text-text-muted">Take profit</span>
        <span className="font-mono text-[.57rem] text-text-secondary">Multiple targets</span>
      </div>

      <div className="rounded-sm border border-border-subtle bg-bg-elevated px-3 py-2.5">
        {/* Column headers */}
        <div className="mb-2 grid grid-cols-[2.5rem_1fr_3.5rem_6rem_1.5rem] gap-1.5 font-mono text-[.57rem] uppercase tracking-wide text-text-muted">
          <span>#</span>
          <span>Price</span>
          <span>Exit %</span>
          <span>Move SL</span>
          <span />
        </div>

        <div className="flex flex-col gap-1.5">
          {tp.levels.map((row, i) => (
            <div key={i} className="grid grid-cols-[2.5rem_1fr_3.5rem_6rem_1.5rem] items-center gap-1.5">
              <span className="font-mono text-[.62rem] text-text-muted">TP{i + 1}</span>
              <input
                className={smallInput}
                type="number"
                placeholder="price"
                value={row.price}
                disabled={busy}
                onChange={(e) => updateLevel(i, { price: e.target.value })}
              />
              <input
                className={smallInput}
                type="number"
                min={1}
                max={100}
                placeholder="%"
                value={row.exitPct}
                disabled={busy}
                onChange={(e) => updateLevel(i, { exitPct: e.target.value })}
              />
              <select
                className={selectCls}
                value={row.moveSlTo}
                disabled={busy}
                onChange={(e) => updateLevel(i, { moveSlTo: e.target.value as MoveSlTo })}
              >
                <option value="none">—</option>
                <option value="entry">entry</option>
                <option value="breakeven">B/E</option>
              </select>
              <button
                type="button"
                disabled={busy || tp.levels.length <= 1}
                onClick={() => removeLevel(i)}
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
            onClick={addLevel}
            className="flex items-center gap-1 font-mono text-[.6rem] text-text-secondary hover:text-text-primary disabled:opacity-50"
          >
            <LuPlus className="h-3 w-3" /> Add level
          </button>
          <span
            className={`font-mono text-[.62rem] font-semibold ${Math.abs(totalPct - 100) > 0.01 ? "text-bear" : "text-bull"}`}
          >
            Total: {totalPct}%{Math.abs(totalPct - 100) > 0.01 ? " ≠ 100" : " ✓"}
          </span>
        </div>
      </div>

      {tpError && <p className="font-mono text-[.6rem] text-bear">{tpError}</p>}

      {/* Move SL legend */}
      <div className="rounded-sm border border-border-subtle bg-bg-base px-3 py-2 flex flex-col gap-1">
        <p className="font-mono text-[.57rem] font-semibold uppercase tracking-wide text-text-muted mb-0.5">Move SL — what each option means</p>
        <div className="flex items-start gap-2">
          <span className="font-mono text-[.62rem] font-bold text-text-secondary w-20 shrink-0">entry</span>
          <span className="font-mono text-[.6rem] text-text-muted">Move SL to your original buy/sell price when this TP hits — locks in no loss.</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="font-mono text-[.62rem] font-bold text-text-secondary w-20 shrink-0">B/E</span>
          <span className="font-mono text-[.6rem] text-text-muted">Move SL to breakeven (entry + fees/spread) — covers your cost.</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="font-mono text-[.62rem] font-bold text-text-secondary w-20 shrink-0">—</span>
          <span className="font-mono text-[.6rem] text-text-muted">Don't move SL when this TP is hit — let the trade run as-is.</span>
        </div>
      </div>

      <p className="font-mono text-[.57rem] text-text-muted">
        First TP sent to broker as primary bracket target; extra levels stored for agent tracking.
      </p>
    </div>
  );
}

// ── Main modal ─────────────────────────────────────────────────────────────

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

  const [tpState, setTpState] = useState<TpState>({ mode: "single", singlePrice: "", levels: [{ price: "", exitPct: "100", moveSlTo: "none" }] });

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
      setTpState(initTpState(preview));
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
    return { ...e, ...buildTpBody(tpState) };
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

              <div className="flex flex-col gap-2.5">
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

                <TpSection
                  tp={tpState}
                  onChange={setTpState}
                  busy={busy}
                  entry={edits.entry}
                  side={order.orderPreview?.side ?? ""}
                />

                <EditRow label="Quantity">
                  <input className={inputCls} type="number" value={edits.qty} disabled={busy} onChange={(e) => setEdits({ ...edits, qty: e.target.value })} />
                </EditRow>
                <StaticRow label="Broker" value={order.broker ?? "—"} />

                {order.errorMessage && (
                  <div className="rounded-sm border border-bear/30 bg-bear/10 px-3 py-2 font-mono text-[.63rem] text-bear">
                    {order.errorMessage}
                  </div>
                )}
              </div>
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
      <span className="font-mono text-[.64rem] text-text-muted">{label}</span>
      <div>{children}</div>
    </div>
  );
}

function StaticRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-mono text-[.64rem] text-text-muted">{label}</span>
      <span className="font-mono text-[.68rem] text-text-primary">{value}</span>
    </div>
  );
}
