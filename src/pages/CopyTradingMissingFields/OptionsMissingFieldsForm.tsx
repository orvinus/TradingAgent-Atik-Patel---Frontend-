// src/pages/CopyTradingMissingFields/OptionsMissingFieldsForm.tsx
// Missing-fields defaults form for options/futures contracts.
// SL/TP are premium-based; TP supports single % / fixed price / Multi-TP levels.

import { LuPlus, LuTrash2 } from "react-icons/lu";
import type { WhenMissing, EntryWhenMissing, ExitQtyWhenMissing, ExpiryWhenMissing, ExpiryToken } from "@/types/missingFields";
import type { OptionsMissingFieldsApiConfig } from "@/types/missingFields";

const selectCls =
  "rounded-sm border border-border-default bg-bg-base px-2.5 py-1.5 font-mono text-[.68rem] text-text-primary outline-none focus:border-accent disabled:opacity-40";
const inputCls =
  "w-24 rounded-sm border border-border-default bg-bg-base px-2 py-1 font-mono text-[.68rem] text-text-primary outline-none focus:border-accent disabled:opacity-40";
const inputSmCls =
  "w-20 rounded-sm border border-border-default bg-bg-base px-2 py-1 font-mono text-[.68rem] text-text-primary outline-none focus:border-accent disabled:opacity-40";

const WHEN_MISSING_LABELS: Record<WhenMissing, string> = {
  reject: "Reject trade",
  use_default: "Use my default",
  allow_empty: "Allow empty",
};

// ── Form state ────────────────────────────────────────────────────────────────

export type OptionsTpPriceMode = "pct" | "fixed";

export interface OptionsTpLevelRow {
  pctFromEntry: string;
  exit_pct: string;
}

export interface OptionsMissingFieldsFormState {
  entry: {
    whenMissing: EntryWhenMissing;
    defaultPremium: string;
  };
  sl: {
    whenMissing: WhenMissing;
    defaultPctFromEntry: string;
  };
  tp: {
    whenMissing: WhenMissing;
    priceMode: OptionsTpPriceMode;
    defaultPctFromEntry: string;
    fixed: string;
    multiTp: boolean;
    tpLevels: OptionsTpLevelRow[];
  };
  contractSize: {
    whenMissing: WhenMissing;
    defaultContracts: string;
  };
  exitQty: {
    whenMissing: ExitQtyWhenMissing;
    defaultExitPct: string;
  };
  expiry: {
    whenMissing: ExpiryWhenMissing;
    defaultExpiryToken: ExpiryToken;
  };
}

export const DEFAULT_OPTIONS_FORM_STATE: OptionsMissingFieldsFormState = {
  entry: { whenMissing: "use_market", defaultPremium: "" },
  sl: { whenMissing: "reject", defaultPctFromEntry: "" },
  tp: {
    whenMissing: "allow_empty",
    priceMode: "pct",
    defaultPctFromEntry: "",
    fixed: "",
    multiTp: false,
    tpLevels: [{ pctFromEntry: "", exit_pct: "" }],
  },
  contractSize: { whenMissing: "use_default", defaultContracts: "1" },
  exitQty: { whenMissing: "use_default", defaultExitPct: "50" },
  expiry: { whenMissing: "use_default", defaultExpiryToken: "nearest" },
};

// ── Deserialize API → form state ──────────────────────────────────────────────

export function deserializeOptionsConfig(
  raw: Record<string, unknown> | null | undefined,
): OptionsMissingFieldsFormState {
  const mf = raw as OptionsMissingFieldsApiConfig | undefined;

  return {
    entry: {
      whenMissing: mf?.entry?.whenMissing ?? "use_market",
      defaultPremium:
        mf?.entry?.defaultLimitPrice != null ? String(mf.entry.defaultLimitPrice) : "",
    },
    sl: {
      whenMissing: mf?.sl?.whenMissing ?? "reject",
      defaultPctFromEntry:
        mf?.sl?.defaultPctFromEntry != null ? String(mf.sl.defaultPctFromEntry) : "",
    },
    tp: {
      whenMissing: mf?.tp?.whenMissing ?? "allow_empty",
      priceMode: mf?.tp?.defaultPrice != null ? "fixed" : "pct",
      defaultPctFromEntry:
        mf?.tp?.defaultPctFromEntry != null ? String(mf.tp.defaultPctFromEntry) : "",
      fixed: mf?.tp?.defaultPrice != null ? String(mf.tp.defaultPrice) : "",
      multiTp: Boolean(mf?.tp?.defaultTpLevels?.length),
      tpLevels:
        mf?.tp?.defaultTpLevels?.map((l) => ({
          pctFromEntry: String(l.pctFromEntry),
          exit_pct: String(l.exit_pct),
        })) ?? [{ pctFromEntry: "", exit_pct: "" }],
    },
    contractSize: {
      whenMissing: mf?.contractSize?.whenMissing ?? "use_default",
      defaultContracts:
        mf?.contractSize?.defaultContracts != null
          ? String(mf.contractSize.defaultContracts)
          : "1",
    },
    exitQty: {
      whenMissing: mf?.exitQty?.whenMissing ?? "use_default",
      defaultExitPct: mf?.exitQty?.defaultExitPct != null ? String(mf.exitQty.defaultExitPct) : "50",
    },
    expiry: {
      whenMissing: mf?.expiry?.whenMissing ?? "use_default",
      defaultExpiryToken: mf?.expiry?.defaultExpiryToken ?? "nearest",
    },
  };
}

// ── Serialize form state → API body ──────────────────────────────────────────

const n = (s: string): number | undefined => {
  const v = parseFloat(s);
  return isNaN(v) ? undefined : v;
};

export function serializeOptionsConfig(form: OptionsMissingFieldsFormState): OptionsMissingFieldsApiConfig {
  const entry: NonNullable<OptionsMissingFieldsApiConfig["entry"]> = {
    whenMissing: form.entry.whenMissing,
  };
  if (form.entry.whenMissing === "use_default") {
    const v = n(form.entry.defaultPremium);
    if (v !== undefined) entry.defaultLimitPrice = v;
  }

  const sl: NonNullable<OptionsMissingFieldsApiConfig["sl"]> = {
    whenMissing: form.sl.whenMissing,
  };
  if (form.sl.whenMissing === "use_default") {
    const v = n(form.sl.defaultPctFromEntry);
    if (v !== undefined) sl.defaultPctFromEntry = v;
  }

  const tp: NonNullable<OptionsMissingFieldsApiConfig["tp"]> = { whenMissing: form.tp.whenMissing };
  if (form.tp.whenMissing === "use_default") {
    if (form.tp.multiTp) {
      const levels = form.tp.tpLevels
        .filter((l) => l.pctFromEntry !== "" && l.exit_pct !== "")
        .map((l) => {
          const pct = parseFloat(l.pctFromEntry);
          const ep = parseFloat(l.exit_pct);
          return !isNaN(pct) && !isNaN(ep) ? { pctFromEntry: pct, exit_pct: ep } : null;
        })
        .filter((l): l is { pctFromEntry: number; exit_pct: number } => l !== null);
      if (levels.length) tp.defaultTpLevels = levels;
    } else if (form.tp.priceMode === "pct") {
      const v = n(form.tp.defaultPctFromEntry);
      if (v !== undefined) tp.defaultPctFromEntry = v;
    } else {
      const v = n(form.tp.fixed);
      if (v !== undefined) tp.defaultPrice = v;
    }
  }

  const contractSize: NonNullable<OptionsMissingFieldsApiConfig["contractSize"]> = {
    whenMissing: form.contractSize.whenMissing,
  };
  if (form.contractSize.whenMissing === "use_default") {
    const v = n(form.contractSize.defaultContracts);
    if (v !== undefined) contractSize.defaultContracts = v;
  }

  const exitQty: NonNullable<OptionsMissingFieldsApiConfig["exitQty"]> = {
    whenMissing: form.exitQty.whenMissing,
  };
  if (form.exitQty.whenMissing === "use_default") {
    const v = n(form.exitQty.defaultExitPct);
    if (v !== undefined) exitQty.defaultExitPct = v;
  }

  const expiry: NonNullable<OptionsMissingFieldsApiConfig["expiry"]> = {
    whenMissing: form.expiry.whenMissing,
  };
  if (form.expiry.whenMissing === "use_default") {
    expiry.defaultExpiryToken = form.expiry.defaultExpiryToken;
  }

  return { entry, sl, tp, contractSize, exitQty, expiry };
}

// ── Validation ────────────────────────────────────────────────────────────────

export function validateOptionsForm(form: OptionsMissingFieldsFormState): string[] {
  const errors: string[] = [];
  const num = (s: string) => parseFloat(s);

  if (form.entry.whenMissing === "use_default") {
    const v = num(form.entry.defaultPremium);
    if (!form.entry.defaultPremium || isNaN(v) || v <= 0)
      errors.push("Entry default: premium must be a positive number.");
  }

  if (form.sl.whenMissing === "use_default") {
    const v = num(form.sl.defaultPctFromEntry);
    if (!form.sl.defaultPctFromEntry || isNaN(v) || v <= 0 || v > 500)
      errors.push("Options SL default: premium % must be between 0.1 and 500.");
  }

  if (form.tp.whenMissing === "use_default") {
    if (form.tp.multiTp) {
      if (form.tp.tpLevels.length === 0) errors.push("Add at least one TP level.");
      form.tp.tpLevels.forEach((lvl, i) => {
        const pct = num(lvl.pctFromEntry);
        const ep = num(lvl.exit_pct);
        if (!lvl.pctFromEntry || isNaN(pct) || pct <= 0)
          errors.push(`TP level ${i + 1}: % from premium must be > 0.`);
        if (!lvl.exit_pct || isNaN(ep) || ep <= 0 || ep > 100)
          errors.push(`TP level ${i + 1}: exit % must be between 1 and 100.`);
      });
    } else if (form.tp.priceMode === "pct") {
      const v = num(form.tp.defaultPctFromEntry);
      if (!form.tp.defaultPctFromEntry || isNaN(v) || v <= 0 || v > 500)
        errors.push("Options TP default: premium % must be between 0.1 and 500.");
    } else {
      const v = num(form.tp.fixed);
      if (!form.tp.fixed || isNaN(v) || v <= 0)
        errors.push("Options TP default: fixed premium must be a positive number.");
    }
  }

  if (form.contractSize.whenMissing === "use_default") {
    const v = num(form.contractSize.defaultContracts);
    if (!form.contractSize.defaultContracts || isNaN(v) || v < 1 || !Number.isInteger(v))
      errors.push("Default contracts must be a whole number ≥ 1.");
  }

  if (form.exitQty.whenMissing === "use_default") {
    const v = num(form.exitQty.defaultExitPct);
    if (!form.exitQty.defaultExitPct || isNaN(v) || v < 1 || v > 100)
      errors.push("Default sell % is required (1–100).");
  }

  return errors;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function OptionsMissingFieldsForm({
  state,
  onChange,
}: {
  state: OptionsMissingFieldsFormState;
  onChange: (s: OptionsMissingFieldsFormState) => void;
}) {
  const tp = state.tp;
  const setTp = (patch: Partial<typeof tp>) => onChange({ ...state, tp: { ...tp, ...patch } });

  const addLevel = () => setTp({ tpLevels: [...tp.tpLevels, { pctFromEntry: "", exit_pct: "" }] });
  const removeLevel = (i: number) =>
    setTp({ tpLevels: tp.tpLevels.filter((_, idx) => idx !== i) });
  const updateLevel = (i: number, patch: Partial<OptionsTpLevelRow>) =>
    setTp({
      tpLevels: tp.tpLevels.map((l, idx) => (idx === i ? { ...l, ...patch } : l)),
    });

  return (
    <div className="flex flex-col gap-0">
      {/* Options banner */}
      <div className="mb-5 rounded-sm border border-purple-500/30 bg-purple-500/5 px-3 py-2.5">
        <p className="font-mono text-[.62rem] text-purple-300">
          For options, SL and TP are based on <strong>option premium</strong>, not the stock
          price. Contract count replaces lot size.
        </p>
      </div>

      <div className="flex flex-col divide-y divide-border-subtle">
        {/* ── Entry ─────────────────────────────────────────────────────────── */}
        <div className="pb-6">
          <div className="mb-3">
            <h3 className="font-mono text-[.72rem] font-bold uppercase tracking-[.12em] text-text-primary">
              Buy / entry price
            </h3>
            <p className="mt-0.5 font-mono text-[.6rem] text-text-muted">
              Applies when the signal has no premium / limit price, or explicitly says
              &lsquo;market&rsquo;.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-28 font-mono text-[.62rem] text-text-muted">When missing:</span>
            <select
              value={state.entry.whenMissing}
              onChange={(e) =>
                onChange({
                  ...state,
                  entry: { ...state.entry, whenMissing: e.target.value as EntryWhenMissing },
                })
              }
              className={selectCls}
            >
              <option value="reject">Reject trade</option>
              <option value="use_market">Use market order</option>
              <option value="use_default">Use my default premium ($)</option>
            </select>
          </div>
          {state.entry.whenMissing === "use_market" && (
            <p className="ml-[7.25rem] mt-2 font-mono text-[.59rem] text-amber-400">
              Order will buy/sell contracts at market premium. % SL/TP defaults require a
              reference premium — use fixed-price SL/TP when trading at market.
            </p>
          )}
          {state.entry.whenMissing === "use_default" && (
            <div className="ml-[7.25rem] mt-2.5 flex items-center gap-2">
              <label className="font-mono text-[.62rem] text-text-muted">
                Default premium ($)
              </label>
              <input
                type="number"
                min={0.01}
                step={0.01}
                value={state.entry.defaultPremium}
                onChange={(e) =>
                  onChange({
                    ...state,
                    entry: { ...state.entry, defaultPremium: e.target.value },
                  })
                }
                placeholder="1.50"
                className={inputCls}
              />
              <span className="font-mono text-[.62rem] text-text-muted">per contract</span>
            </div>
          )}
        </div>

        {/* ── Stop loss ─────────────────────────────────────────────────────── */}
        <div className="py-6">
          <div className="mb-3">
            <h3 className="font-mono text-[.72rem] font-bold uppercase tracking-[.12em] text-text-primary">
              Stop loss
            </h3>
            <p className="mt-0.5 font-mono text-[.6rem] text-text-muted">
              Applies when the signal has no SL. % is measured from option entry premium.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-28 font-mono text-[.62rem] text-text-muted">When missing:</span>
            <select
              value={state.sl.whenMissing}
              onChange={(e) =>
                onChange({
                  ...state,
                  sl: { ...state.sl, whenMissing: e.target.value as WhenMissing },
                })
              }
              className={selectCls}
            >
              {(["reject", "use_default", "allow_empty"] as WhenMissing[]).map((v) => (
                <option key={v} value={v}>
                  {WHEN_MISSING_LABELS[v]}
                </option>
              ))}
            </select>
          </div>
          {state.sl.whenMissing === "use_default" && (
            <div className="ml-[7.25rem] mt-2.5 flex items-center gap-2">
              <label className="font-mono text-[.62rem] text-text-muted">Default SL</label>
              <input
                type="number"
                min={0.1}
                max={500}
                step={0.1}
                value={state.sl.defaultPctFromEntry}
                onChange={(e) =>
                  onChange({
                    ...state,
                    sl: { ...state.sl, defaultPctFromEntry: e.target.value },
                  })
                }
                placeholder="20"
                className={inputCls}
              />
              <span className="font-mono text-[.62rem] text-text-muted">% from premium</span>
            </div>
          )}
        </div>

        {/* ── Take profit ───────────────────────────────────────────────────── */}
        <div className="py-6">
          <div className="mb-3">
            <h3 className="font-mono text-[.72rem] font-bold uppercase tracking-[.12em] text-text-primary">
              Take profit
            </h3>
            <p className="mt-0.5 font-mono text-[.6rem] text-text-muted">
              Applies when the signal has no TP. % is measured from option entry premium.
            </p>
          </div>

          {/* When missing select */}
          <div className="flex items-center gap-3">
            <span className="w-28 font-mono text-[.62rem] text-text-muted">When missing:</span>
            <select
              value={tp.whenMissing}
              onChange={(e) => setTp({ whenMissing: e.target.value as WhenMissing })}
              className={selectCls}
            >
              {(["reject", "use_default", "allow_empty"] as WhenMissing[]).map((v) => (
                <option key={v} value={v}>
                  {WHEN_MISSING_LABELS[v]}
                </option>
              ))}
            </select>
          </div>

          {tp.whenMissing === "use_default" && (
            <div className="ml-[7.25rem] mt-2.5 flex flex-col gap-2.5">
              {/* Multi-TP toggle */}
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={tp.multiTp}
                  onChange={(e) => setTp({ multiTp: e.target.checked })}
                  className="h-3.5 w-3.5 rounded-sm accent-[var(--color-accent)]"
                />
                <span className="font-mono text-[.65rem] text-text-secondary">
                  Multi-TP levels
                </span>
              </label>

              {tp.multiTp ? (
                /* ── Multi-TP rows ─────────────────────────────────────────── */
                <div className="flex flex-col gap-2">
                  <div className="flex gap-4 font-mono text-[.56rem] uppercase tracking-widest text-text-muted">
                    <span className="w-28">% from premium</span>
                    <span className="w-20">Exit %</span>
                  </div>
                  {tp.tpLevels.map((lvl, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0.1}
                        step={0.1}
                        value={lvl.pctFromEntry}
                        onChange={(e) => updateLevel(i, { pctFromEntry: e.target.value })}
                        placeholder="25"
                        className={inputSmCls}
                      />
                      <span className="font-mono text-[.6rem] text-text-muted">% from premium</span>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={lvl.exit_pct}
                        onChange={(e) => updateLevel(i, { exit_pct: e.target.value })}
                        placeholder="50"
                        className={inputSmCls}
                      />
                      <span className="font-mono text-[.6rem] text-text-muted">exit</span>
                      {tp.tpLevels.length > 1 && (
                        <button
                          onClick={() => removeLevel(i)}
                          className="rounded-sm p-0.5 text-text-muted hover:text-bear"
                        >
                          <LuTrash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={addLevel}
                    className="flex w-fit items-center gap-1 font-mono text-[.62rem] text-accent hover:text-accent-hover"
                  >
                    <LuPlus className="h-3 w-3" /> Add level
                  </button>
                </div>
              ) : (
                /* ── Single TP ─────────────────────────────────────────────── */
                <>
                  {/* Price mode radios */}
                  <div className="flex gap-4">
                    {(["pct", "fixed"] as OptionsTpPriceMode[]).map((m) => (
                      <label key={m} className="flex cursor-pointer items-center gap-1.5">
                        <input
                          type="radio"
                          checked={tp.priceMode === m}
                          onChange={() => setTp({ priceMode: m })}
                          className="h-3.5 w-3.5 accent-[var(--color-accent)]"
                        />
                        <span className="font-mono text-[.65rem] text-text-secondary">
                          {m === "pct" ? "% from premium" : "Fixed premium price"}
                        </span>
                      </label>
                    ))}
                  </div>

                  {tp.priceMode === "pct" ? (
                    <div className="flex items-center gap-2">
                      <label className="font-mono text-[.62rem] text-text-muted">Default TP</label>
                      <input
                        type="number"
                        min={0.1}
                        max={500}
                        step={0.1}
                        value={tp.defaultPctFromEntry}
                        onChange={(e) => setTp({ defaultPctFromEntry: e.target.value })}
                        placeholder="50"
                        className={inputCls}
                      />
                      <span className="font-mono text-[.62rem] text-text-muted">% from premium</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <label className="font-mono text-[.62rem] text-text-muted">
                        Fixed premium ($)
                      </label>
                      <input
                        type="number"
                        min={0.01}
                        step={0.01}
                        value={tp.fixed}
                        onChange={(e) => setTp({ fixed: e.target.value })}
                        placeholder="3.00"
                        className={inputCls}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Contract count ────────────────────────────────────────────────── */}
        <div className="pt-6">
          <div className="mb-3">
            <h3 className="font-mono text-[.72rem] font-bold uppercase tracking-[.12em] text-text-primary">
              Contract count
            </h3>
            <p className="mt-0.5 font-mono text-[.6rem] text-text-muted">
              Used when the signal has no contract count. Recommend: 1 contract as a safe
              default.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-28 font-mono text-[.62rem] text-text-muted">When missing:</span>
            <select
              value={state.contractSize.whenMissing}
              onChange={(e) =>
                onChange({
                  ...state,
                  contractSize: {
                    ...state.contractSize,
                    whenMissing: e.target.value as WhenMissing,
                  },
                })
              }
              className={selectCls}
            >
              {(["reject", "use_default", "allow_empty"] as WhenMissing[]).map((v) => (
                <option key={v} value={v}>
                  {WHEN_MISSING_LABELS[v]}
                </option>
              ))}
            </select>
          </div>
          {state.contractSize.whenMissing === "use_default" && (
            <div className="ml-[7.25rem] mt-2.5 flex items-center gap-2">
              <label className="font-mono text-[.62rem] text-text-muted">
                Default contracts
              </label>
              <input
                type="number"
                min={1}
                step={1}
                value={state.contractSize.defaultContracts}
                onChange={(e) =>
                  onChange({
                    ...state,
                    contractSize: {
                      ...state.contractSize,
                      defaultContracts: e.target.value,
                    },
                  })
                }
                placeholder="1"
                className={inputCls}
              />
              <span className="font-mono text-[.62rem] font-bold text-purple-400">contracts</span>
            </div>
          )}
          <p className="ml-[7.25rem] mt-1.5 font-mono text-[.58rem] text-text-muted">
            Note: this is contract count, NOT lots or shares. 1 contract = 100 shares of the
            underlying.
          </p>
        </div>

        {/* ── Sell quantity / exit % ────────────────────────────────────────── */}
        <div className="pt-6">
          <div className="mb-3">
            <h3 className="font-mono text-[.72rem] font-bold uppercase tracking-[.12em] text-text-primary">
              Sell quantity / exit %
            </h3>
            <p className="mt-0.5 font-mono text-[.6rem] text-text-muted">
              For securing/trim messages without % or contract count (e.g. &ldquo;SECURING FCEL at
              36.00&rdquo;). Applies to partial exits only — not entry contract count.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-28 font-mono text-[.62rem] text-text-muted">When missing:</span>
            <select
              value={state.exitQty.whenMissing}
              onChange={(e) =>
                onChange({
                  ...state,
                  exitQty: { ...state.exitQty, whenMissing: e.target.value as ExitQtyWhenMissing },
                })
              }
              className={selectCls}
            >
              <option value="reject">Reject — partial exit must state how much to sell</option>
              <option value="use_default">Sell my default % of the open position</option>
            </select>
          </div>
          {state.exitQty.whenMissing === "use_default" && (
            <div className="ml-[7.25rem] mt-2.5 flex items-center gap-2">
              <label className="font-mono text-[.62rem] text-text-muted">Default sell %</label>
              <input
                type="number"
                min={1}
                max={100}
                step={1}
                value={state.exitQty.defaultExitPct}
                onChange={(e) =>
                  onChange({
                    ...state,
                    exitQty: { ...state.exitQty, defaultExitPct: e.target.value },
                  })
                }
                placeholder="50"
                className={inputCls}
              />
              <span className="font-mono text-[.62rem] text-text-muted">% of open position</span>
            </div>
          )}
        </div>

        {/* ── Expiry date ───────────────────────────────────────────────────── */}
        <div className="pt-6">
          <div className="mb-3">
            <h3 className="font-mono text-[.72rem] font-bold uppercase tracking-[.12em] text-text-primary">
              Expiry date
            </h3>
            <p className="mt-0.5 font-mono text-[.6rem] text-text-muted">
              When a signal has strike and call/put but no expiry date or phrase (e.g. &ldquo;ORCL
              $185C @ 5.80&rdquo;), the backend resolves expiry from your default using the US
              options calendar.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-28 font-mono text-[.62rem] text-text-muted">When missing:</span>
            <select
              value={state.expiry.whenMissing}
              onChange={(e) =>
                onChange({
                  ...state,
                  expiry: { ...state.expiry, whenMissing: e.target.value as ExpiryWhenMissing },
                })
              }
              className={selectCls}
            >
              <option value="reject">Reject — signal must include expiry</option>
              <option value="use_default">Use my default expiry rule</option>
            </select>
          </div>
          {state.expiry.whenMissing === "use_default" && (
            <div className="ml-[7.25rem] mt-2.5 flex items-center gap-2">
              <label className="font-mono text-[.62rem] text-text-muted">Default expiry</label>
              <select
                value={state.expiry.defaultExpiryToken}
                onChange={(e) =>
                  onChange({
                    ...state,
                    expiry: { ...state.expiry, defaultExpiryToken: e.target.value as ExpiryToken },
                  })
                }
                className={selectCls}
              >
                <option value="nearest">Nearest</option>
                <option value="this_week">This Week</option>
                <option value="next_week">Next Week</option>
                <option value="end_of_month">End Of This Month</option>
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
