// src/pages/CopyTradingValidator/OptionsValidatorForm.tsx
// Validator form for the Options profile tab. Mirrors ValidatorForm structure
// but uses contractSize instead of lotSize, hides trailing stop, and uses
// premium-based SL/TP tooltips.

import type {
  ExecutionMode,
  FieldMode,
  MessageFilter,
  OnViolation,
  ContractSizeRule,
  OrderTypeRule,
  PctFieldRule,
  ProfileConfig,
  SimpleFieldRule,
  SlippageRule,
  SpreadRule,
  SymbolFilter,
} from "@/types/copyValidator";
import { InfoTip } from "./InfoTip";
import { MessageFilterSection } from "./MessageFilterSection";
import { SymbolFilterSection } from "./SymbolFilterSection";
import { RiskDistanceInputs, ToleranceRow } from "./ToleranceRow";

const inputCls =
  "w-20 rounded-sm border border-border-default bg-bg-base px-2 py-1 font-mono text-[.68rem] text-text-primary outline-none focus:border-accent disabled:opacity-40";
const selectCls =
  "rounded-sm border border-border-default bg-bg-base px-2 py-1 font-mono text-[.68rem] text-text-primary outline-none focus:border-accent disabled:opacity-40";

const numOrUndef = (s: string): number | undefined => {
  if (s.trim() === "") return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
};

export function buildDefaultOptionsConfig(): ProfileConfig {
  return {
    executionMode: "auto",
    onViolation: "reject",
    fields: {
      sl: { mode: "auto" },
      tp: { mode: "auto" },
      tpLevels: { mode: "auto" },
      contractSize: { mode: "auto" },
      orderType: { mode: "auto" },
      entry: { mode: "auto" },
      side: { mode: "auto" },
      symbol: { mode: "auto" },
      slippage: { mode: "off" },
      spread: { mode: "off" },
    },
    symbolFilter: {},
    messageFilter: {},
  };
}

export function normalizeOptionsConfig(c?: ProfileConfig): Required<ProfileConfig> {
  const base = buildDefaultOptionsConfig();
  return {
    executionMode: c?.executionMode ?? "auto",
    onViolation: c?.onViolation ?? "reject",
    fields: { ...base.fields, ...(c?.fields ?? {}) },
    missingFields: c?.missingFields ?? {},
    symbolFilter: c?.symbolFilter ?? {},
    messageFilter: c?.messageFilter ?? {},
  };
}

interface Props {
  config: Required<ProfileConfig>;
  onChange: (next: Required<ProfileConfig>) => void;
  suggestedMessagePhrases?: string[];
}

export default function OptionsValidatorForm({ config, onChange, suggestedMessagePhrases }: Props) {
  const manual = config.executionMode === "manual";

  const setExecutionMode = (executionMode: ExecutionMode) => onChange({ ...config, executionMode });
  const setOnViolation = (onViolation: OnViolation) => onChange({ ...config, onViolation });
  const setSymbolFilter = (symbolFilter: SymbolFilter) => onChange({ ...config, symbolFilter });
  const setMessageFilter = (messageFilter: MessageFilter) => onChange({ ...config, messageFilter });

  const setField = (key: string, value: unknown) =>
    onChange({ ...config, fields: { ...config.fields, [key]: value } });

  const fields = config.fields ?? {};

  return (
    <div className="flex flex-col gap-6">
      {/* Options info banner */}
      <div className="rounded-sm border border-purple-500/30 bg-purple-500/5 px-3 py-2.5">
        <p className="font-mono text-[.62rem] text-purple-300">
          Options rules apply to <strong>option premium</strong>, not the underlying stock price. SL/TP % are
          measured from the option's entry premium.
        </p>
      </div>

      {/* Execution mode */}
      <fieldset>
        <legend className="mb-2 font-mono text-[.58rem] uppercase tracking-[.18em] text-text-disabled">
          Execution mode
        </legend>
        <div className="flex flex-col gap-2">
          <RadioRow
            checked={config.executionMode === "auto"}
            onSelect={() => setExecutionMode("auto")}
            label="Auto"
            hint="Use the signal as-is — no limits applied."
          />
          <RadioRow
            checked={config.executionMode === "manual"}
            onSelect={() => setExecutionMode("manual")}
            label="Manual"
            hint="Apply my options rules below."
          />
        </div>
      </fieldset>

      {/* On violation */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-[.68rem] text-text-secondary">When a rule is broken:</span>
        <select
          value={config.onViolation}
          onChange={(e) => setOnViolation(e.target.value as OnViolation)}
          disabled={!manual}
          className={selectCls}
        >
          <option value="reject">Reject trade</option>
          <option value="clamp">Adjust to limit (clamp)</option>
        </select>
      </div>

      {/* Symbol filter */}
      <SymbolFilterSection
        profile="options"
        value={config.symbolFilter ?? {}}
        onChange={setSymbolFilter}
      />

      {/* Message phrase filter */}
      <MessageFilterSection
        value={config.messageFilter ?? {}}
        onChange={setMessageFilter}
        {...(suggestedMessagePhrases != null ? { suggestedDefaults: suggestedMessagePhrases } : {})}
      />

      {/* Field rules */}
      <div>
        <div className="mb-2 flex items-center gap-2 font-mono text-[.58rem] uppercase tracking-[.18em] text-text-disabled">
          Options field rules
          <span className="normal-case tracking-normal text-text-muted">(only apply when Manual)</span>
        </div>

        {!manual && (
          <div className="mb-3 rounded-sm border border-border-subtle bg-bg-elevated px-3 py-2 font-mono text-[.63rem] text-text-muted">
            Options signals will be copied exactly as parsed.
          </div>
        )}

        <div className={`overflow-hidden rounded-sm border border-border-subtle ${manual ? "" : "pointer-events-none opacity-40"}`}>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border-subtle bg-bg-elevated text-left">
                <th className="px-3 py-2 font-mono text-[.56rem] uppercase tracking-[.16em] text-text-muted">Field</th>
                <th className="px-3 py-2 font-mono text-[.56rem] uppercase tracking-[.16em] text-text-muted">Mode</th>
                <th className="px-3 py-2 font-mono text-[.56rem] uppercase tracking-[.16em] text-text-muted">Rules</th>
              </tr>
            </thead>
            <tbody>
              {/* SL */}
              <FieldRow
                label="Stop loss"
                tip="Max/min distance from entry. Use % for option premium (e.g. 50% below entry premium)."
                rule={(fields.sl as PctFieldRule) ?? { mode: "auto" }}
                disabled={!manual}
                onModeChange={(mode) => setField("sl", { ...((fields.sl as PctFieldRule) ?? {}), mode })}
              >
                {(rule) => (
                  <RiskDistanceInputs
                    rule={rule as PctFieldRule}
                    disabled={!manual}
                    onChange={(r) => setField("sl", r)}
                    profile="options"
                    pctMax={500}
                  />
                )}
              </FieldRow>

              {/* TP */}
              <FieldRow
                label="Take profit"
                tip="Max/min distance from entry. Use % for option premium (e.g. 100% above entry premium)."
                rule={(fields.tp as PctFieldRule) ?? { mode: "auto" }}
                disabled={!manual}
                onModeChange={(mode) => setField("tp", { ...((fields.tp as PctFieldRule) ?? {}), mode })}
              >
                {(rule) => (
                  <RiskDistanceInputs
                    rule={rule as PctFieldRule}
                    disabled={!manual}
                    onChange={(r) => setField("tp", r)}
                    profile="options"
                    pctMax={500}
                  />
                )}
              </FieldRow>

              {/* TP Levels */}
              <FieldRow
                label="TP levels"
                tip="Controls multi-TP ladders for options."
                rule={(fields.tpLevels as PctFieldRule) ?? { mode: "auto" }}
                disabled={!manual}
                onModeChange={(mode) => setField("tpLevels", { ...((fields.tpLevels as PctFieldRule) ?? {}), mode })}
              >
                {(rule) => (
                  <RiskDistanceInputs
                    rule={rule as PctFieldRule}
                    disabled={!manual}
                    onChange={(r) => setField("tpLevels", r)}
                    profile="options"
                    pctMax={500}
                  />
                )}
              </FieldRow>

              {/* Contract size */}
              <FieldRow
                label="Contract count"
                tip="Cap or fix the number of contracts per trade. You can also set a max total premium ($)."
                rule={(fields.contractSize as ContractSizeRule) ?? { mode: "auto" }}
                disabled={!manual}
                onModeChange={(mode) => setField("contractSize", { ...((fields.contractSize as ContractSizeRule) ?? {}), mode })}
              >
                {(rule) => (
                  <ContractSizeInputs
                    rule={rule as ContractSizeRule}
                    disabled={!manual}
                    onChange={(r) => setField("contractSize", r)}
                  />
                )}
              </FieldRow>

              {/* Order type */}
              <FieldRow
                label="Order type"
                tip="Options: market or limit only. Trailing stop not supported."
                rule={(fields.orderType as OrderTypeRule) ?? { mode: "auto" }}
                disabled={!manual}
                onModeChange={(mode) => setField("orderType", { ...((fields.orderType as OrderTypeRule) ?? {}), mode })}
              >
                {(rule) => (
                  <select
                    value={(rule as OrderTypeRule).value ?? "market"}
                    disabled={!manual}
                    onChange={(e) => setField("orderType", { ...(rule as OrderTypeRule), value: e.target.value })}
                    className={selectCls}
                  >
                    <option value="market">Market</option>
                    <option value="limit">Limit</option>
                  </select>
                )}
              </FieldRow>

              {/* Entry / Side / Symbol — simple mode rows */}
              {(["entry", "side", "symbol"] as const).map((key) => (
                <FieldRow
                  key={key}
                  label={key.charAt(0).toUpperCase() + key.slice(1)}
                  rule={(fields[key] as SimpleFieldRule) ?? { mode: "auto" }}
                  disabled={!manual}
                  onModeChange={(mode) => setField(key, { mode })}
                >
                  {() => <span className="font-mono text-[.62rem] text-text-muted">Use signal value</span>}
                </FieldRow>
              ))}

              {/* Slippage */}
              <SlippageOptionsRow
                rule={(fields.slippage as SlippageRule) ?? { mode: "off" }}
                disabled={!manual}
                onChange={(r) => setField("slippage", r)}
              />

              {/* Spread */}
              <SpreadOptionsRow
                rule={(fields.spread as SpreadRule) ?? { mode: "off" }}
                disabled={!manual}
                onChange={(r) => setField("spread", r)}
              />

              {/* Trailing stop — always disabled for options */}
              <tr className="border-b border-border-subtle last:border-0 opacity-40">
                <td className="px-3 py-2 align-top">
                  <span className="inline-flex items-center gap-1.5 font-mono text-[.68rem] text-text-muted line-through">
                    Trailing stop
                  </span>
                </td>
                <td className="px-3 py-2 align-top">
                  <span className="font-mono text-[.62rem] text-text-disabled">N/A</span>
                </td>
                <td className="px-3 py-2 align-top">
                  <span className="font-mono text-[.6rem] text-text-muted italic">
                    Not supported for options
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function RadioRow({ checked, onSelect, label, hint }: { checked: boolean; onSelect: () => void; label: string; hint: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <input type="radio" checked={checked} onChange={onSelect} className="mt-0.5 h-3.5 w-3.5 accent-[var(--color-accent)]" />
      <span>
        <span className="font-mono text-[.72rem] font-bold text-text-primary">{label}</span>
        <span className="ml-2 font-mono text-[.62rem] text-text-muted">{hint}</span>
      </span>
    </label>
  );
}

function FieldRow({
  label,
  tip,
  rule,
  disabled,
  onModeChange,
  children,
}: {
  label: string;
  tip?: string;
  rule: { mode: FieldMode };
  disabled: boolean;
  onModeChange: (mode: FieldMode) => void;
  children: (rule: { mode: FieldMode }) => React.ReactNode;
}) {
  return (
    <tr className="border-b border-border-subtle last:border-0">
      <td className="px-3 py-2 align-top">
        <span className="inline-flex items-center gap-1.5 font-mono text-[.68rem] text-text-primary">
          {label}
          {tip && <InfoTip text={tip} />}
        </span>
      </td>
      <td className="px-3 py-2 align-top">
        <select
          value={rule.mode}
          onChange={(e) => onModeChange(e.target.value as FieldMode)}
          disabled={disabled}
          className={selectCls}
        >
          <option value="auto">Auto</option>
          <option value="manual">Manual</option>
        </select>
      </td>
      <td className="px-3 py-2 align-top">
        {rule.mode === "manual" ? children(rule) : (
          <span className="font-mono text-[.62rem] text-text-disabled">Use signal value</span>
        )}
      </td>
    </tr>
  );
}

function SlippageOptionsRow({
  rule,
  disabled,
  onChange,
}: {
  rule: SlippageRule;
  disabled: boolean;
  onChange: (r: SlippageRule) => void;
}) {
  return (
    <ToleranceRow
      label="Slippage tolerance"
      tip="Max the option premium may move from the signal entry. Auto uses server default 0.5%."
      rule={rule}
      disabled={disabled}
      defaultUnit="pct"
      autoDefault="slipDefault"
      onChange={(r) => onChange(r as SlippageRule)}
    />
  );
}

function SpreadOptionsRow({
  rule,
  disabled,
  onChange,
}: {
  rule: SpreadRule;
  disabled: boolean;
  onChange: (r: SpreadRule) => void;
}) {
  return (
    <ToleranceRow
      label="Spread tolerance"
      tip="Max bid-ask spread before reject. Limit orders cross to ask (buy) or bid (sell). Auto uses server default 1%."
      rule={rule}
      disabled={disabled}
      defaultUnit="pct"
      autoDefault="spreadDefault"
      onChange={(r) => onChange(r as SpreadRule)}
    />
  );
}

function ContractSizeInputs({
  rule,
  disabled,
  onChange,
}: {
  rule: ContractSizeRule;
  disabled: boolean;
  onChange: (r: ContractSizeRule) => void;
}) {
  const sel: "max" | "fixed" = rule.fixedContracts != null ? "fixed" : "max";

  const buildRule = (maxC: number | undefined, fixedC: number | undefined, maxP?: number): ContractSizeRule => {
    const next: ContractSizeRule = { mode: rule.mode };
    if (maxC != null) next.maxContracts = maxC;
    if (fixedC != null) next.fixedContracts = fixedC;
    if (maxP != null) next.maxPremium = maxP;
    else if (rule.maxPremium != null) next.maxPremium = rule.maxPremium;
    return next;
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-center gap-2">
        <input
          type="radio"
          checked={sel === "max"}
          disabled={disabled}
          onChange={() => onChange(buildRule(rule.maxContracts ?? rule.fixedContracts, undefined))}
          className="h-3.5 w-3.5 accent-[var(--color-accent)]"
        />
        <span className="font-mono text-[.65rem] text-text-secondary">Max contracts</span>
        <input
          type="number"
          min={1}
          value={sel === "max" ? rule.maxContracts ?? "" : ""}
          disabled={disabled || sel !== "max"}
          onChange={(e) => onChange(buildRule(numOrUndef(e.target.value), undefined))}
          className={inputCls}
        />
      </label>
      <label className="flex items-center gap-2">
        <input
          type="radio"
          checked={sel === "fixed"}
          disabled={disabled}
          onChange={() => onChange(buildRule(undefined, rule.fixedContracts ?? rule.maxContracts))}
          className="h-3.5 w-3.5 accent-[var(--color-accent)]"
        />
        <span className="font-mono text-[.65rem] text-text-secondary">Fixed contracts</span>
        <input
          type="number"
          min={1}
          value={sel === "fixed" ? rule.fixedContracts ?? "" : ""}
          disabled={disabled || sel !== "fixed"}
          onChange={(e) => onChange(buildRule(undefined, numOrUndef(e.target.value)))}
          className={inputCls}
        />
      </label>
      <label className="flex items-center gap-1.5">
        <span className="font-mono text-[.62rem] text-text-muted">Max total premium ($)</span>
        <input
          type="number"
          min={0}
          step="0.01"
          value={rule.maxPremium ?? ""}
          disabled={disabled}
          onChange={(e) => { const v = numOrUndef(e.target.value); const next: ContractSizeRule = { mode: rule.mode }; if (rule.maxContracts != null) next.maxContracts = rule.maxContracts; if (rule.fixedContracts != null) next.fixedContracts = rule.fixedContracts; if (v != null) next.maxPremium = v; onChange(next); }}
          className={inputCls}
          placeholder="e.g. 1500"
        />
      </label>
    </div>
  );
}
