// src/pages/CopyTradingMissingFields/OptionsMissingFieldsForm.tsx
// Missing-fields defaults form for options contracts.
// Uses "contractSize" instead of "lotSize"; SL/TP are premium-based.

import type { WhenMissing } from "@/types/missingFields";

const selectCls =
  "rounded-sm border border-border-default bg-bg-base px-2.5 py-1.5 font-mono text-[.68rem] text-text-primary outline-none focus:border-accent disabled:opacity-40";
const inputCls =
  "w-24 rounded-sm border border-border-default bg-bg-base px-2 py-1 font-mono text-[.68rem] text-text-primary outline-none focus:border-accent disabled:opacity-40";

const WHEN_MISSING_LABELS: Record<WhenMissing, string> = {
  reject: "Reject trade",
  use_default: "Use my default",
  allow_empty: "Allow empty",
};

// ── Form state ────────────────────────────────────────────────────────────────

export interface OptionsMissingFieldsFormState {
  sl: {
    whenMissing: WhenMissing;
    defaultPctFromEntry: string;
  };
  tp: {
    whenMissing: WhenMissing;
    defaultPctFromEntry: string;
  };
  contractSize: {
    whenMissing: WhenMissing;
    defaultContracts: string;
  };
}

export const DEFAULT_OPTIONS_FORM_STATE: OptionsMissingFieldsFormState = {
  sl: { whenMissing: "reject", defaultPctFromEntry: "" },
  tp: { whenMissing: "allow_empty", defaultPctFromEntry: "" },
  contractSize: { whenMissing: "use_default", defaultContracts: "1" },
};

export function deserializeOptionsConfig(raw: Record<string, unknown> | null | undefined): OptionsMissingFieldsFormState {
  const mf = raw as {
    sl?: { whenMissing?: WhenMissing; defaultPctFromEntry?: number };
    tp?: { whenMissing?: WhenMissing; defaultPctFromEntry?: number };
    contractSize?: { whenMissing?: WhenMissing; defaultContracts?: number };
  } | undefined;

  return {
    sl: {
      whenMissing: mf?.sl?.whenMissing ?? "reject",
      defaultPctFromEntry: mf?.sl?.defaultPctFromEntry != null ? String(mf.sl.defaultPctFromEntry) : "",
    },
    tp: {
      whenMissing: mf?.tp?.whenMissing ?? "allow_empty",
      defaultPctFromEntry: mf?.tp?.defaultPctFromEntry != null ? String(mf.tp.defaultPctFromEntry) : "",
    },
    contractSize: {
      whenMissing: mf?.contractSize?.whenMissing ?? "use_default",
      defaultContracts: mf?.contractSize?.defaultContracts != null ? String(mf.contractSize.defaultContracts) : "1",
    },
  };
}

export function serializeOptionsConfig(form: OptionsMissingFieldsFormState) {
  const n = (s: string) => { const v = parseFloat(s); return isNaN(v) ? undefined : v; };
  return {
    missingFields: {
      sl: {
        whenMissing: form.sl.whenMissing,
        ...(form.sl.whenMissing === "use_default" && n(form.sl.defaultPctFromEntry) != null
          ? { defaultPctFromEntry: n(form.sl.defaultPctFromEntry) }
          : {}),
      },
      tp: {
        whenMissing: form.tp.whenMissing,
        ...(form.tp.whenMissing === "use_default" && n(form.tp.defaultPctFromEntry) != null
          ? { defaultPctFromEntry: n(form.tp.defaultPctFromEntry) }
          : {}),
      },
      contractSize: {
        whenMissing: form.contractSize.whenMissing,
        ...(form.contractSize.whenMissing === "use_default" && n(form.contractSize.defaultContracts) != null
          ? { defaultContracts: n(form.contractSize.defaultContracts) }
          : {}),
      },
    },
  };
}

export function validateOptionsForm(form: OptionsMissingFieldsFormState): string[] {
  const errors: string[] = [];
  const n = (s: string) => parseFloat(s);

  if (form.sl.whenMissing === "use_default") {
    const v = n(form.sl.defaultPctFromEntry);
    if (!form.sl.defaultPctFromEntry || isNaN(v) || v <= 0 || v > 500)
      errors.push("Options SL default: premium % must be between 0.1 and 500.");
  }
  if (form.tp.whenMissing === "use_default") {
    const v = n(form.tp.defaultPctFromEntry);
    if (!form.tp.defaultPctFromEntry || isNaN(v) || v <= 0 || v > 500)
      errors.push("Options TP default: premium % must be between 0.1 and 500.");
  }
  if (form.contractSize.whenMissing === "use_default") {
    const v = n(form.contractSize.defaultContracts);
    if (!form.contractSize.defaultContracts || isNaN(v) || v < 1 || !Number.isInteger(v))
      errors.push("Default contracts must be a whole number ≥ 1.");
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
  return (
    <div className="flex flex-col gap-0">
      {/* Options banner */}
      <div className="mb-5 rounded-sm border border-purple-500/30 bg-purple-500/5 px-3 py-2.5">
        <p className="font-mono text-[.62rem] text-purple-300">
          For options, SL and TP are based on <strong>option premium</strong>, not the stock price. Contract count
          replaces lot size.
        </p>
      </div>

      <div className="flex flex-col divide-y divide-border-subtle">
        {/* SL */}
        <div className="pb-6">
          <div className="mb-3">
            <h3 className="font-mono text-[.72rem] font-bold uppercase tracking-[.12em] text-text-primary">Stop loss</h3>
            <p className="mt-0.5 font-mono text-[.6rem] text-text-muted">
              Applies when the signal has no SL. % is measured from option entry premium.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-28 font-mono text-[.62rem] text-text-muted">When missing:</span>
            <select
              value={state.sl.whenMissing}
              onChange={(e) => onChange({ ...state, sl: { ...state.sl, whenMissing: e.target.value as WhenMissing } })}
              className={selectCls}
            >
              {(["reject", "use_default", "allow_empty"] as WhenMissing[]).map((v) => (
                <option key={v} value={v}>{WHEN_MISSING_LABELS[v]}</option>
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
                onChange={(e) => onChange({ ...state, sl: { ...state.sl, defaultPctFromEntry: e.target.value } })}
                placeholder="20"
                className={inputCls}
              />
              <span className="font-mono text-[.62rem] text-text-muted">% from premium entry</span>
            </div>
          )}
        </div>

        {/* TP */}
        <div className="py-6">
          <div className="mb-3">
            <h3 className="font-mono text-[.72rem] font-bold uppercase tracking-[.12em] text-text-primary">Take profit</h3>
            <p className="mt-0.5 font-mono text-[.6rem] text-text-muted">
              Applies when the signal has no TP. % is measured from option entry premium.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-28 font-mono text-[.62rem] text-text-muted">When missing:</span>
            <select
              value={state.tp.whenMissing}
              onChange={(e) => onChange({ ...state, tp: { ...state.tp, whenMissing: e.target.value as WhenMissing } })}
              className={selectCls}
            >
              {(["reject", "use_default", "allow_empty"] as WhenMissing[]).map((v) => (
                <option key={v} value={v}>{WHEN_MISSING_LABELS[v]}</option>
              ))}
            </select>
          </div>
          {state.tp.whenMissing === "use_default" && (
            <div className="ml-[7.25rem] mt-2.5 flex items-center gap-2">
              <label className="font-mono text-[.62rem] text-text-muted">Default TP</label>
              <input
                type="number"
                min={0.1}
                max={500}
                step={0.1}
                value={state.tp.defaultPctFromEntry}
                onChange={(e) => onChange({ ...state, tp: { ...state.tp, defaultPctFromEntry: e.target.value } })}
                placeholder="50"
                className={inputCls}
              />
              <span className="font-mono text-[.62rem] text-text-muted">% from premium entry</span>
            </div>
          )}
        </div>

        {/* Contract count */}
        <div className="pt-6">
          <div className="mb-3">
            <h3 className="font-mono text-[.72rem] font-bold uppercase tracking-[.12em] text-text-primary">
              Contract count
            </h3>
            <p className="mt-0.5 font-mono text-[.6rem] text-text-muted">
              Used when the signal has no contract count. Recommend: 1 contract as a safe default.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-28 font-mono text-[.62rem] text-text-muted">When missing:</span>
            <select
              value={state.contractSize.whenMissing}
              onChange={(e) =>
                onChange({ ...state, contractSize: { ...state.contractSize, whenMissing: e.target.value as WhenMissing } })
              }
              className={selectCls}
            >
              {(["reject", "use_default", "allow_empty"] as WhenMissing[]).map((v) => (
                <option key={v} value={v}>{WHEN_MISSING_LABELS[v]}</option>
              ))}
            </select>
          </div>
          {state.contractSize.whenMissing === "use_default" && (
            <div className="ml-[7.25rem] mt-2.5 flex items-center gap-2">
              <label className="font-mono text-[.62rem] text-text-muted">Default contracts</label>
              <input
                type="number"
                min={1}
                step={1}
                value={state.contractSize.defaultContracts}
                onChange={(e) =>
                  onChange({ ...state, contractSize: { ...state.contractSize, defaultContracts: e.target.value } })
                }
                placeholder="1"
                className={inputCls}
              />
              <span className="font-mono text-[.62rem] text-purple-400 font-bold">contracts</span>
            </div>
          )}
          <p className="ml-[7.25rem] mt-1.5 font-mono text-[.58rem] text-text-muted">
            Note: this is contract count, NOT lots or shares. 1 contract = 100 shares of the underlying.
          </p>
        </div>
      </div>
    </div>
  );
}
