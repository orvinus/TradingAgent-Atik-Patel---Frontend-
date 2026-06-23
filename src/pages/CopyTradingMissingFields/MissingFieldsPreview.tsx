// src/pages/CopyTradingMissingFields/MissingFieldsPreview.tsx
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { LuLoader, LuCircleCheck, LuCircleX, LuFlaskConical } from "react-icons/lu";
import axios from "axios";
import { missingFieldsApi } from "@/api/endpoints/missingFields";
import type { Completeness, MissingFieldsPreviewResult } from "@/types/missingFields";

function apiErr(err: unknown): string {
  if (axios.isAxiosError(err))
    return err.response?.data?.message ?? err.response?.data?.code ?? "Preview failed.";
  return "Preview failed.";
}

const COMPLETENESS_STYLE: Record<Completeness, { cls: string; label: string }> = {
  complete:   { cls: "border-bull/40 bg-bull/10 text-bull",       label: "Complete" },
  partial:    { cls: "border-warning/40 bg-warning/10 text-warning", label: "Partial" },
  entry_only: { cls: "border-warning/40 bg-warning/10 text-warning", label: "Entry only" },
  invalid:    { cls: "border-bear/40 bg-bear/10 text-bear",        label: "Invalid" },
};

function fmt(v: number | null | undefined): string {
  if (v == null) return "—";
  return v % 1 === 0 ? String(v) : v.toFixed(2);
}

function DefaultChip({ label }: { label: string }) {
  return (
    <span className="ml-1 rounded-sm border border-accent/40 bg-accent/10 px-1.5 py-0.5 font-mono text-[.5rem] uppercase tracking-widest text-accent">
      {label}
    </span>
  );
}

function ResultPanel({ result }: { result: MissingFieldsPreviewResult }) {
  const { valid, adjusted, violations, missingFields, summary } = result;
  const completeness = missingFields?.completeness ?? "invalid";
  const completenessStyle = COMPLETENESS_STYLE[completeness];

  const appliedMap = new Map(
    (missingFields?.applied ?? []).map((a) => [a.field, a]),
  );

  return (
    <div className="mt-4 flex flex-col gap-3">
      {/* Valid / rejected banner */}
      <div
        className={`flex items-center gap-2 rounded-sm border px-3 py-2 ${
          valid ? "border-bull/30 bg-bull/10" : "border-bear/30 bg-bear/10"
        }`}
      >
        {valid ? (
          <LuCircleCheck className="h-4 w-4 shrink-0 text-bull" />
        ) : (
          <LuCircleX className="h-4 w-4 shrink-0 text-bear" />
        )}
        <span className={`font-mono text-[.68rem] font-bold ${valid ? "text-bull" : "text-bear"}`}>
          {valid ? "Valid" : "Rejected"}
        </span>
        <span
          className={`ml-auto rounded-sm border px-2 py-0.5 font-mono text-[.5rem] uppercase tracking-widest ${completenessStyle.cls}`}
        >
          {completenessStyle.label}
        </span>
      </div>

      {/* Summary text */}
      {summary && (
        <p className="font-mono text-[.64rem] text-text-secondary">{summary}</p>
      )}

      {/* Adjusted values */}
      {valid && adjusted && (
        <div className="overflow-hidden rounded-sm border border-border-subtle">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border-subtle bg-bg-elevated">
                {["Field", "Value", "Source"].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-1.5 text-left font-mono text-[.52rem] uppercase tracking-widest text-text-muted"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Entry row */}
              {(() => {
                const entryApplied = appliedMap.get("entry");
                const isMarket = adjusted.order_type === "market" || adjusted.entry_display === "market";
                const entryValue = isMarket ? null : adjusted.limit_price;
                return (
                  <tr className="border-b border-border-subtle">
                    <td className="px-3 py-2 font-mono text-[.64rem] text-text-muted">Entry / limit price</td>
                    <td className="px-3 py-2 font-mono text-[.68rem] font-bold text-text-primary">
                      {isMarket ? (
                        <span className="rounded-sm border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[.54rem] uppercase tracking-widest text-amber-400">
                          MARKET
                        </span>
                      ) : (
                        fmt(entryValue)
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {entryApplied ? (
                        <DefaultChip label="default" />
                      ) : (
                        <span className="font-mono text-[.58rem] text-text-muted">from signal</span>
                      )}
                    </td>
                  </tr>
                );
              })()}
              {[
                { field: "sl", label: "Stop loss",    value: adjusted.sl_price,    apiKey: "sl" },
                { field: "tp", label: "Take profit",  value: adjusted.tp_price,    apiKey: "tp" },
                { field: "lotSize", label: "Lot size", value: adjusted.lot_size,   apiKey: "lotSize" },
              ].map(({ field, label, value, apiKey }) => {
                const applied = appliedMap.get(apiKey);
                return (
                  <tr key={field} className="border-b border-border-subtle last:border-0">
                    <td className="px-3 py-2 font-mono text-[.64rem] text-text-muted">{label}</td>
                    <td className="px-3 py-2 font-mono text-[.68rem] font-bold text-text-primary">
                      {fmt(value)}
                    </td>
                    <td className="px-3 py-2">
                      {applied ? (
                        <DefaultChip label="default" />
                      ) : (
                        <span className="font-mono text-[.58rem] text-text-muted">from signal</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Violations */}
      {!valid && violations?.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {violations.map((v, i) => (
            <div
              key={i}
              className="rounded-sm border border-bear/20 bg-bear/5 px-3 py-1.5 font-mono text-[.63rem] text-bear"
            >
              <span className="mr-2 font-bold uppercase tracking-widest text-[.5rem]">{v.field}</span>
              {v.message}
            </div>
          ))}
        </div>
      )}

      {/* Missing-field rejected list (when no violations but fields were rejected) */}
      {!valid && (missingFields?.rejected ?? []).length > 0 && violations?.length === 0 && (
        <div className="flex flex-col gap-1.5">
          {(missingFields.rejected ?? []).map((r, i) => (
            <div
              key={i}
              className="rounded-sm border border-bear/20 bg-bear/5 px-3 py-1.5 font-mono text-[.63rem] text-bear"
            >
              <span className="mr-2 font-bold uppercase tracking-widest text-[.5rem]">{r.field}</span>
              {r.code}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type EntryScenario = "has_limit" | "no_price" | "market";

const SCENARIO_LABELS: Record<EntryScenario, string> = {
  has_limit: "Has limit price",
  no_price:  "No price",
  market:    "Explicit market",
};

export default function MissingFieldsPreview() {
  const [symbol, setSymbol]           = useState("AAPL");
  const [entry, setEntry]             = useState("225");
  const [side, setSide]               = useState<"buy" | "sell">("buy");
  const [scenario, setScenario]       = useState<EntryScenario>("has_limit");
  const [result, setResult]           = useState<MissingFieldsPreviewResult | null>(null);
  const [previewErr, setPreviewErr]   = useState<string | null>(null);

  const buildSignal = () => {
    const base = {
      parseable: true,
      symbol: symbol.trim() || "AAPL",
      side,
      sl_price: null,
      tp_price: null,
      tp_levels: null,
    };
    if (scenario === "has_limit") {
      return { ...base, order_type: "limit", limit_price: parseFloat(entry) || 225 };
    }
    if (scenario === "market") {
      return { ...base, order_type: "market", limit_price: null };
    }
    return { ...base, order_type: null, limit_price: null };
  };

  const previewMut = useMutation({
    mutationFn: () => missingFieldsApi.preview({ signal: buildSignal() }),
    onSuccess: (data) => {
      setResult(data.result);
      setPreviewErr(null);
    },
    onError: (e) => {
      setPreviewErr(apiErr(e));
      setResult(null);
    },
  });

  const inputCls =
    "rounded-sm border border-border-default bg-bg-base px-2 py-1 font-mono text-[.68rem] text-text-primary outline-none focus:border-accent";

  return (
    <div className="rounded-lg border border-border-subtle bg-bg-surface p-5 shadow-card">
      <div className="mb-4 flex items-center gap-2">
        <LuFlaskConical className="h-4 w-4 text-text-muted" />
        <h2 className="font-display font-bold text-text-primary">Preview</h2>
      </div>
      <p className="mb-4 font-mono text-[.65rem] text-text-muted">
        Test how your defaults apply to an incomplete signal before going live.
      </p>

      {/* Entry scenario quick-test buttons */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="font-mono text-[.56rem] uppercase tracking-widest text-text-muted">Entry scenario:</span>
        {(["has_limit", "no_price", "market"] as EntryScenario[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setScenario(s)}
            className={`rounded-sm border px-2.5 py-1 font-mono text-[.6rem] transition-colors ${
              scenario === s
                ? s === "market"
                  ? "border-amber-500/60 bg-amber-500/15 text-amber-300"
                  : "border-accent/60 bg-accent/15 text-accent"
                : "border-border-default text-text-secondary hover:border-accent hover:text-accent"
            }`}
          >
            {SCENARIO_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Signal inputs */}
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[.56rem] uppercase tracking-widest text-text-muted">Side</span>
          <select
            value={side}
            onChange={(e) => setSide(e.target.value as "buy" | "sell")}
            className={inputCls}
          >
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[.56rem] uppercase tracking-widest text-text-muted">Symbol</span>
          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="AAPL"
            className={inputCls}
          />
        </label>
        {scenario === "has_limit" && (
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[.56rem] uppercase tracking-widest text-text-muted">Entry price</span>
            <input
              type="number"
              value={entry}
              onChange={(e) => setEntry(e.target.value)}
              placeholder="225"
              className={inputCls}
            />
          </label>
        )}
        {scenario !== "has_limit" && (
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[.56rem] uppercase tracking-widest text-text-disabled">Entry price</span>
            <span className="font-mono text-[.65rem] italic text-text-muted">
              {scenario === "market" ? "market order" : "missing (no price in signal)"}
            </span>
          </div>
        )}
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[.56rem] uppercase tracking-widest text-text-disabled">SL / TP / Lots</span>
          <span className="font-mono text-[.65rem] italic text-text-muted">missing (none in signal)</span>
        </div>
      </div>

      <button
        onClick={() => previewMut.mutate()}
        disabled={previewMut.isPending}
        className="mt-4 inline-flex items-center gap-2 rounded-sm border border-accent px-4 py-2 font-mono text-[.65rem] font-bold uppercase tracking-widest text-accent transition-colors hover:bg-accent hover:text-bg-base disabled:cursor-not-allowed disabled:opacity-50"
      >
        {previewMut.isPending && <LuLoader className="h-3.5 w-3.5 animate-spin" />}
        Test preview
      </button>

      {previewErr && (
        <div className="mt-4 rounded-sm border border-bear/30 bg-bear/10 px-3 py-2 font-mono text-[.65rem] text-bear">
          {previewErr}
        </div>
      )}

      {result && <ResultPanel result={result} />}
    </div>
  );
}
