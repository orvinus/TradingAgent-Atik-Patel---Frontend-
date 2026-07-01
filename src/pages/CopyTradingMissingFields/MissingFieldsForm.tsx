// src/pages/CopyTradingMissingFields/MissingFieldsForm.tsx
import { LuPlus, LuTrash2 } from "react-icons/lu";
import type { WhenMissing } from "@/types/missingFields";
import type {
  MissingFieldsFormState,
  PriceMode,
  EntryFormState,
  SlFormState,
  TpFormState,
  LotFormState,
  ExitQtyFormState,
  TpLevelRow,
  EntryWhenMissing,
  ExitQtyWhenMissing,
} from "./types";

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

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-3">
      <h3 className="font-mono text-[.72rem] font-bold uppercase tracking-[.12em] text-text-primary">{title}</h3>
      {hint && <p className="mt-0.5 font-mono text-[.6rem] text-text-muted">{hint}</p>}
    </div>
  );
}

function WhenMissingSelect({
  value,
  onChange,
}: {
  value: WhenMissing;
  onChange: (v: WhenMissing) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 font-mono text-[.62rem] text-text-muted">When missing:</span>
      <select value={value} onChange={(e) => onChange(e.target.value as WhenMissing)} className={selectCls}>
        {(["reject", "use_default", "allow_empty"] as WhenMissing[]).map((v) => (
          <option key={v} value={v}>{WHEN_MISSING_LABELS[v]}</option>
        ))}
      </select>
    </div>
  );
}

function PriceModeRadio({
  value,
  onChange,
  disabled,
}: {
  value: PriceMode;
  onChange: (v: PriceMode) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-4">
      {(["pct", "fixed"] as PriceMode[]).map((m) => (
        <label key={m} className="flex cursor-pointer items-center gap-1.5">
          <input
            type="radio"
            checked={value === m}
            onChange={() => onChange(m)}
            disabled={disabled}
            className="h-3.5 w-3.5 accent-[var(--color-accent)]"
          />
          <span className="font-mono text-[.65rem] text-text-secondary">
            {m === "pct" ? "% from entry" : "Fixed price"}
          </span>
        </label>
      ))}
    </div>
  );
}

// ── Entry Section ─────────────────────────────────────────────────────────────

const ENTRY_WHEN_MISSING_LABELS: Record<EntryWhenMissing, string> = {
  reject: "Reject trade",
  use_market: "Use market order",
  use_default: "Use my default limit price",
};

function EntrySection({ state, onChange }: { state: EntryFormState; onChange: (s: EntryFormState) => void }) {
  const useDefault = state.whenMissing === "use_default";
  const useMarket = state.whenMissing === "use_market";

  return (
    <div className="flex flex-col gap-3">
      <SectionHeader
        title="Buy / entry price"
        hint="Applies when the signal has no limit price OR the signal explicitly says 'market'."
      />
      <div className="flex items-center gap-3">
        <span className="w-28 font-mono text-[.62rem] text-text-muted">When missing:</span>
        <select
          value={state.whenMissing}
          onChange={(e) => onChange({ ...state, whenMissing: e.target.value as EntryWhenMissing })}
          className={selectCls}
        >
          {(["reject", "use_market", "use_default"] as EntryWhenMissing[]).map((v) => (
            <option key={v} value={v}>{ENTRY_WHEN_MISSING_LABELS[v]}</option>
          ))}
        </select>
      </div>

      {useMarket && (
        <p className="ml-[7.25rem] font-mono text-[.59rem] text-amber-400">
          Market orders are placed immediately at the current price. % SL/TP defaults will only work if the signal includes a reference price — otherwise use fixed-price SL/TP defaults.
        </p>
      )}

      {useDefault && (
        <div className="ml-[7.25rem] flex items-center gap-2">
          <label className="font-mono text-[.62rem] text-text-muted">Default limit price</label>
          <input
            type="number"
            min={0.01}
            step="any"
            value={state.defaultLimitPrice}
            onChange={(e) => onChange({ ...state, defaultLimitPrice: e.target.value })}
            placeholder="220.00"
            className={inputCls}
          />
        </div>
      )}
    </div>
  );
}

// ── SL Section ────────────────────────────────────────────────────────────────

function SlSection({ state, onChange }: { state: SlFormState; onChange: (s: SlFormState) => void }) {
  const useDefault = state.whenMissing === "use_default";
  return (
    <div className="flex flex-col gap-3">
      <SectionHeader title="Stop loss" hint="Applies when the parsed signal has no SL." />
      <WhenMissingSelect value={state.whenMissing} onChange={(v) => onChange({ ...state, whenMissing: v })} />

      {useDefault && (
        <div className="ml-[7.25rem] flex flex-col gap-2.5">
          <PriceModeRadio
            value={state.priceMode}
            onChange={(m) => onChange({ ...state, priceMode: m })}
          />
          {state.priceMode === "pct" ? (
            <div className="flex items-center gap-2">
              <label className="font-mono text-[.62rem] text-text-muted">Default</label>
              <input
                type="number"
                min={0.1}
                max={100}
                step={0.1}
                value={state.pct}
                onChange={(e) => onChange({ ...state, pct: e.target.value })}
                placeholder="5"
                className={inputCls}
              />
              <span className="font-mono text-[.62rem] text-text-muted">% from entry</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <label className="font-mono text-[.62rem] text-text-muted">Fixed SL price</label>
              <input
                type="number"
                min={0}
                step="any"
                value={state.fixed}
                onChange={(e) => onChange({ ...state, fixed: e.target.value })}
                placeholder="210.00"
                className={inputCls}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── TP Section ────────────────────────────────────────────────────────────────

function TpSection({ state, onChange }: { state: TpFormState; onChange: (s: TpFormState) => void }) {
  const useDefault = state.whenMissing === "use_default";

  const addLevel = () =>
    onChange({ ...state, tpLevels: [...state.tpLevels, { pctFromEntry: "", exit_pct: "" }] });

  const removeLevel = (i: number) =>
    onChange({ ...state, tpLevels: state.tpLevels.filter((_, idx) => idx !== i) });

  const updateLevel = (i: number, patch: Partial<TpLevelRow>) =>
    onChange({
      ...state,
      tpLevels: state.tpLevels.map((l, idx) => (idx === i ? { ...l, ...patch } : l)),
    });

  return (
    <div className="flex flex-col gap-3">
      <SectionHeader title="Take profit" hint="Applies when the parsed signal has no TP." />
      <WhenMissingSelect value={state.whenMissing} onChange={(v) => onChange({ ...state, whenMissing: v })} />

      {useDefault && (
        <div className="ml-[7.25rem] flex flex-col gap-2.5">
          {/* Multi-TP toggle */}
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={state.multiTp}
              onChange={(e) => onChange({ ...state, multiTp: e.target.checked })}
              className="h-3.5 w-3.5 rounded-sm accent-[var(--color-accent)]"
            />
            <span className="font-mono text-[.65rem] text-text-secondary">Multi-TP levels</span>
          </label>

          {state.multiTp ? (
            <div className="flex flex-col gap-2">
              <div className="flex gap-6 font-mono text-[.56rem] uppercase tracking-widest text-text-muted">
                <span className="w-28">% from entry</span>
                <span className="w-20">Exit %</span>
              </div>
              {state.tpLevels.map((lvl, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0.1}
                    step={0.1}
                    value={lvl.pctFromEntry}
                    onChange={(e) => updateLevel(i, { pctFromEntry: e.target.value })}
                    placeholder="10"
                    className={inputSmCls}
                  />
                  <span className="font-mono text-[.6rem] text-text-muted">%</span>
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
                  {state.tpLevels.length > 1 && (
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
            <>
              <PriceModeRadio
                value={state.priceMode}
                onChange={(m) => onChange({ ...state, priceMode: m })}
              />
              {state.priceMode === "pct" ? (
                <div className="flex items-center gap-2">
                  <label className="font-mono text-[.62rem] text-text-muted">Default</label>
                  <input
                    type="number"
                    min={0.1}
                    max={100}
                    step={0.1}
                    value={state.pct}
                    onChange={(e) => onChange({ ...state, pct: e.target.value })}
                    placeholder="10"
                    className={inputCls}
                  />
                  <span className="font-mono text-[.62rem] text-text-muted">% from entry</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <label className="font-mono text-[.62rem] text-text-muted">Fixed TP price</label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={state.fixed}
                    onChange={(e) => onChange({ ...state, fixed: e.target.value })}
                    placeholder="250.00"
                    className={inputCls}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Lot Size Section ──────────────────────────────────────────────────────────

function LotSection({ state, onChange }: { state: LotFormState; onChange: (s: LotFormState) => void }) {
  const useDefault = state.whenMissing === "use_default";
  return (
    <div className="flex flex-col gap-3">
      <SectionHeader title="Lot / quantity" hint="Applies when the parsed signal has no lot size or quantity." />
      <WhenMissingSelect value={state.whenMissing} onChange={(v) => onChange({ ...state, whenMissing: v })} />

      {useDefault && (
        <div className="ml-[7.25rem] flex items-center gap-2">
          <label className="font-mono text-[.62rem] text-text-muted">Default lots</label>
          <input
            type="number"
            min={0.01}
            step={0.01}
            value={state.lots}
            onChange={(e) => onChange({ ...state, lots: e.target.value })}
            placeholder="1"
            className={inputCls}
          />
        </div>
      )}
    </div>
  );
}

// ── Exit Qty Section ──────────────────────────────────────────────────────────

function ExitQtySection({
  state,
  onChange,
}: {
  state: ExitQtyFormState;
  onChange: (s: ExitQtyFormState) => void;
}) {
  const useDefault = state.whenMissing === "use_default";
  return (
    <div className="flex flex-col gap-3">
      <SectionHeader
        title="Sell quantity / exit %"
        hint="For securing/trim messages without % or lot size (e.g. &ldquo;SECURING FCEL at 36.00&rdquo;). Applies to partial exits only — not entry lot size."
      />
      <div className="flex items-center gap-3">
        <span className="w-28 font-mono text-[.62rem] text-text-muted">When missing:</span>
        <select
          value={state.whenMissing}
          onChange={(e) => onChange({ ...state, whenMissing: e.target.value as ExitQtyWhenMissing })}
          className={selectCls}
        >
          <option value="reject">Reject — partial exit must state how much to sell</option>
          <option value="use_default">Sell my default % of the open position</option>
        </select>
      </div>
      {useDefault && (
        <div className="ml-[7.25rem] flex items-center gap-2">
          <label className="font-mono text-[.62rem] text-text-muted">Default sell %</label>
          <input
            type="number"
            min={1}
            max={100}
            step={1}
            value={state.defaultExitPct}
            onChange={(e) => onChange({ ...state, defaultExitPct: e.target.value })}
            placeholder="50"
            className={inputCls}
          />
          <span className="font-mono text-[.62rem] text-text-muted">% of open position</span>
        </div>
      )}
    </div>
  );
}

// ── Root form component ───────────────────────────────────────────────────────

export default function MissingFieldsForm({
  state,
  onChange,
}: {
  state: MissingFieldsFormState;
  onChange: (s: MissingFieldsFormState) => void;
}) {
  return (
    <div className="flex flex-col divide-y divide-border-subtle">
      <div className="pb-6">
        <EntrySection state={state.entry} onChange={(entry) => onChange({ ...state, entry })} />
      </div>
      <div className="py-6">
        <SlSection state={state.sl} onChange={(sl) => onChange({ ...state, sl })} />
      </div>
      <div className="py-6">
        <TpSection state={state.tp} onChange={(tp) => onChange({ ...state, tp })} />
      </div>
      <div className="py-6">
        <LotSection state={state.lotSize} onChange={(lotSize) => onChange({ ...state, lotSize })} />
      </div>
      <div className="pt-6">
        <ExitQtySection state={state.exitQty} onChange={(exitQty) => onChange({ ...state, exitQty })} />
      </div>
    </div>
  );
}
