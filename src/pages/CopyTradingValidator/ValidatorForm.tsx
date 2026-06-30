// src/pages/CopyTradingValidator/ValidatorForm.tsx
//
// Controlled config form shared by the global Validation & Limits page and the
// per-source override modal. Renders execution mode, on-violation behaviour,
// and the per-field rules table.
import { useState, useEffect } from "react";
import type {
  ExecutionMode,
  FieldMode,
  LotSizeRule,
  MessageFilter,
  NormalizedValidatorConfig,
  OnViolation,
  OrderTypeRule,
  OrderTypeValue,
  PctFieldRule,
  ProfileConfig,
  SlippageMode,
  SlippageRule,
  SpreadMode,
  SpreadRule,
  SymbolFilter,
  ToleranceUnit,
  TrailingStopRule,
  ValidatorConfigBody,
  ValidatorFieldKey,
  ValidatorFields,
  ValidatorOptions,
  ValidatorProfile,
} from "@/types/copyValidator";
import { FIELD_DEFS, ORDER_TYPE_OPTIONS, ORDER_TYPE_LABELS, TOOLTIPS } from "./fieldMeta";
import { InfoTip } from "./InfoTip";
import { MessageFilterSection } from "./MessageFilterSection";
import { SymbolFilterSection } from "./SymbolFilterSection";
import { RiskDistanceInputs, ToleranceRow } from "./ToleranceRow";

// ── Defaults / normalisation ──────────────────────────────────────────────────
export function buildDefaultFields(): ValidatorFields {
  return {
    sl: { mode: "auto" },
    tp: { mode: "auto" },
    tpLevels: { mode: "auto" },
    lotSize: { mode: "auto" },
    trailingStop: { mode: "off" },
    orderType: { mode: "auto" },
    entry: { mode: "auto" },
    side: { mode: "auto" },
    symbol: { mode: "auto" },
    slippage: { mode: "off" },
    spread: { mode: "off" },
  };
}

export function normalizeConfig(c?: ValidatorConfigBody | ProfileConfig): NormalizedValidatorConfig {
  const result: NormalizedValidatorConfig = {
    executionMode: c?.executionMode ?? "auto",
    onViolation: c?.onViolation ?? "reject",
    fields: { ...buildDefaultFields(), ...(c?.fields ?? {}) },
  };
  const asBody = c as ValidatorConfigBody | undefined;
  if (asBody?.profiles != null) result.profiles = asBody.profiles;
  const pc = c as ProfileConfig | undefined;
  if (pc?.symbolFilter != null) result.symbolFilter = pc.symbolFilter;
  if (pc?.messageFilter != null) result.messageFilter = pc.messageFilter;
  return result;
}

const numOrUndef = (s: string): number | undefined => {
  if (s.trim() === "") return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
};

const inputCls =
  "w-20 rounded-sm border border-border-default bg-bg-base px-2 py-1 font-mono text-[.68rem] text-text-primary outline-none focus:border-accent disabled:opacity-40";
const selectCls =
  "rounded-sm border border-border-default bg-bg-base px-2 py-1 font-mono text-[.68rem] text-text-primary outline-none focus:border-accent disabled:opacity-40";

function sizeUnitLabelFor(profile?: ValidatorProfile): string {
  if (profile === "commodity") return "Lots";
  if (profile === "crypto") return "Units";
  return "Shares";
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ValidatorForm({
  config,
  onChange,
  options,
  profile,
  suggestedMessagePhrases,
}: {
  config: NormalizedValidatorConfig;
  onChange: (next: NormalizedValidatorConfig) => void;
  options?: ValidatorOptions | undefined;
  profile?: ValidatorProfile;
  suggestedMessagePhrases?: string[];
}) {
  const showTrailingStop = !profile || profile === "equity";
  const manual = config.executionMode === "manual";

  // Runtime label/tooltip overrides keyed by field.
  const optByKey = new Map((options?.fields ?? []).map((f) => [f.key, f]));

  const setExecutionMode = (executionMode: ExecutionMode) => onChange({ ...config, executionMode });
  const setOnViolation = (onViolation: OnViolation) => onChange({ ...config, onViolation });
  const setSymbolFilter = (symbolFilter: SymbolFilter) => onChange({ ...config, symbolFilter });
  const setMessageFilter = (messageFilter: MessageFilter) => onChange({ ...config, messageFilter });

  const setField = (key: ValidatorFieldKey, value: ValidatorFields[ValidatorFieldKey]) =>
    onChange({ ...config, fields: { ...config.fields, [key]: value } });

  return (
    <div className="flex flex-col gap-6">
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
            hint="Use the channel signal as-is — no limits applied."
          />
          <RadioRow
            checked={config.executionMode === "manual"}
            onSelect={() => setExecutionMode("manual")}
            label="Manual"
            hint="Apply my rules below (each field can still be Auto)."
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
        <span className="font-mono text-[.62rem] text-text-muted">
          {config.onViolation === "reject" ? TOOLTIPS.reject : TOOLTIPS.clamp}
        </span>
      </div>

      {/* Symbol filter */}
      <SymbolFilterSection
        profile={profile ?? "equity"}
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
          Field rules
          <span className="normal-case tracking-normal text-text-muted">
            (only apply when Manual)
          </span>
        </div>

        {!manual && (
          <div className="mb-3 rounded-sm border border-border-subtle bg-bg-elevated px-3 py-2 font-mono text-[.63rem] text-text-muted">
            Signals will be copied exactly as parsed. No limits applied.
          </div>
        )}

        <div
          className={`overflow-hidden rounded-sm border border-border-subtle ${
            manual ? "" : "pointer-events-none opacity-40"
          }`}
        >
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border-subtle bg-bg-elevated text-left">
                <th className="px-3 py-2 font-mono text-[.56rem] uppercase tracking-[.16em] text-text-muted">
                  Field
                </th>
                <th className="px-3 py-2 font-mono text-[.56rem] uppercase tracking-[.16em] text-text-muted">
                  Mode
                </th>
                <th className="px-3 py-2 font-mono text-[.56rem] uppercase tracking-[.16em] text-text-muted">
                  Rules
                </th>
              </tr>
            </thead>
            <tbody>
              {FIELD_DEFS.filter((def) => def.key !== "trailingStop" || showTrailingStop).map((def) => {
                const opt = optByKey.get(def.key);
                const rawLabel = opt?.label ?? def.label;
                const label = def.key === "lotSize" ? `${rawLabel} (${sizeUnitLabelFor(profile)})` : rawLabel;
                const tip = opt?.tooltip ?? opt?.description ?? def.tooltip;

                if (def.kind === "slippage") {
                  const rule = (config.fields.slippage ?? { mode: "off" as SlippageMode }) as SlippageRule;
                  return (
                    <SlippageRow
                      key={def.key}
                      label={label}
                      tip={tip}
                      rule={rule}
                      disabled={!manual}
                      onChange={(r) => setField("slippage", r)}
                    />
                  );
                }

                if (def.kind === "spread") {
                  const rule = (config.fields.spread ?? { mode: "off" as SpreadMode }) as SpreadRule;
                  return (
                    <SpreadRow
                      key={def.key}
                      label={label}
                      tip={tip}
                      rule={rule}
                      disabled={!manual}
                      onChange={(r) => setField("spread", r)}
                    />
                  );
                }

                const rule = config.fields[def.key] ?? { mode: "auto" as FieldMode };
                return (
                  <tr key={def.key} className="border-b border-border-subtle last:border-0">
                    <td className="px-3 py-2 align-top">
                      <span className="inline-flex items-center gap-1.5 font-mono text-[.68rem] text-text-primary">
                        {label}
                        <InfoTip text={tip} />
                      </span>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <select
                        value={rule.mode}
                        onChange={(e) =>
                          setField(def.key, { ...rule, mode: e.target.value as FieldMode })
                        }
                        disabled={!manual}
                        className={selectCls}
                      >
                        <option value="auto">Auto</option>
                        <option value="manual">Manual</option>
                      </select>
                    </td>
                    <td className="px-3 py-2 align-top">
                      {rule.mode === "manual" ? (
                        <RuleInputs def={def} rule={rule} disabled={!manual} onChange={(v) => setField(def.key, v)} sizeUnit={sizeUnitLabelFor(profile)} {...(profile != null ? { profile } : {})} />
                      ) : (
                        <span className="font-mono text-[.62rem] text-text-disabled">Use signal value</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function RadioRow({
  checked,
  onSelect,
  label,
  hint,
}: {
  checked: boolean;
  onSelect: () => void;
  label: string;
  hint: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <input
        type="radio"
        checked={checked}
        onChange={onSelect}
        className="mt-0.5 h-3.5 w-3.5 accent-[var(--color-accent)]"
      />
      <span>
        <span className="font-mono text-[.72rem] font-bold text-text-primary">{label}</span>
        <span className="ml-2 font-mono text-[.62rem] text-text-muted">{hint}</span>
      </span>
    </label>
  );
}

function LotSizeInputs({
  rule,
  disabled,
  onChange,
  sizeUnit,
}: {
  rule: LotSizeRule;
  disabled: boolean;
  onChange: (r: LotSizeRule) => void;
  sizeUnit?: string;
}) {
  const unitLower = sizeUnit?.toLowerCase() ?? "lots";
  const [sel, setSel] = useState<"max" | "fixed">(rule.fixedLots != null ? "fixed" : "max");

  // Sync when a saved config is loaded (non-null values are authoritative)
  useEffect(() => {
    if (rule.fixedLots != null) setSel("fixed");
    else if (rule.maxLots != null) setSel("max");
  }, [rule.fixedLots, rule.maxLots]);

  const selectMax = () => {
    setSel("max");
    const carry = rule.maxLots ?? rule.fixedLots;
    const next: LotSizeRule = { mode: rule.mode };
    if (carry != null) next.maxLots = carry;
    onChange(next);
  };

  const selectFixed = () => {
    setSel("fixed");
    const carry = rule.fixedLots ?? rule.maxLots;
    const next: LotSizeRule = { mode: rule.mode };
    if (carry != null) next.fixedLots = carry;
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-center gap-2">
        <input
          type="radio"
          checked={sel === "max"}
          disabled={disabled}
          onChange={selectMax}
          className="h-3.5 w-3.5 accent-[var(--color-accent)]"
        />
        <span className="inline-flex items-center gap-1 font-mono text-[.65rem] text-text-secondary">
          Max {unitLower} allowed <InfoTip text={TOOLTIPS.maxLots} />
        </span>
        <input
          type="number"
          min={0}
          value={sel === "max" ? rule.maxLots ?? "" : ""}
          disabled={disabled || sel !== "max"}
          onChange={(e) => {
            const next: LotSizeRule = { mode: rule.mode };
            const v = numOrUndef(e.target.value);
            if (v != null) next.maxLots = v;
            onChange(next);
          }}
          className={inputCls}
        />
      </label>
      <label className="flex items-center gap-2">
        <input
          type="radio"
          checked={sel === "fixed"}
          disabled={disabled}
          onChange={selectFixed}
          className="h-3.5 w-3.5 accent-[var(--color-accent)]"
        />
        <span className="inline-flex items-center gap-1 font-mono text-[.65rem] text-text-secondary">
          Fixed {unitLower} (always) <InfoTip text={TOOLTIPS.fixedLots} />
        </span>
        <input
          type="number"
          min={0}
          value={sel === "fixed" ? rule.fixedLots ?? "" : ""}
          disabled={disabled || sel !== "fixed"}
          onChange={(e) => {
            const next: LotSizeRule = { mode: rule.mode };
            const v = numOrUndef(e.target.value);
            if (v != null) next.fixedLots = v;
            onChange(next);
          }}
          className={inputCls}
        />
      </label>
    </div>
  );
}

function RuleInputs({
  def,
  rule,
  disabled,
  onChange,
  sizeUnit,
  profile,
}: {
  def: (typeof FIELD_DEFS)[number];
  rule: ValidatorFields[ValidatorFieldKey];
  disabled: boolean;
  onChange: (v: ValidatorFields[ValidatorFieldKey]) => void;
  sizeUnit?: string;
  profile?: ValidatorProfile;
}) {
  if (def.kind === "pct") {
    return (
      <RiskDistanceInputs
        rule={rule as PctFieldRule}
        disabled={disabled}
        onChange={(r) => onChange(r)}
        {...(profile != null ? { profile } : {})}
      />
    );
  }

  if (def.kind === "lotSize") {
    return (
      <LotSizeInputs
        rule={rule as LotSizeRule}
        disabled={disabled}
        onChange={(r) => onChange(r)}
        {...(sizeUnit != null ? { sizeUnit } : {})}
      />
    );
  }

  if (def.kind === "orderType") {
    const r = rule as OrderTypeRule;
    return (
      <select
        value={r.value ?? "market"}
        disabled={disabled}
        onChange={(e) => onChange({ ...r, value: e.target.value as OrderTypeValue })}
        className={selectCls}
      >
        {ORDER_TYPE_OPTIONS.map((ot) => (
          <option key={ot} value={ot}>
            {ORDER_TYPE_LABELS[ot]}
          </option>
        ))}
      </select>
    );
  }

  if (def.kind === "trailingStop") {
    const r = (rule as TrailingStopRule) ?? { mode: "off" };
    return (
      <div className="flex flex-col gap-2">
        <select
          value={r.mode}
          disabled={disabled}
          onChange={(e) => onChange({ ...r, mode: e.target.value as TrailingStopRule["mode"] })}
          className={selectCls}
        >
          <option value="off">Off</option>
          <option value="auto">Auto (use signal)</option>
          <option value="manual">Manual</option>
        </select>
        {r.mode === "manual" && (
          <div className="flex flex-col gap-1.5 pl-1">
            <label className="flex items-center gap-2">
              <span className="w-36 font-mono text-[.62rem] text-text-muted">Trail % from price</span>
              <input
                type="number"
                min={0.01}
                step={0.1}
                value={r.trailPct ?? ""}
                disabled={disabled}
                placeholder="e.g. 5"
                onChange={(e) => { const v = numOrUndef(e.target.value); const next: TrailingStopRule = { mode: r.mode }; if (v != null) next.trailPct = v; onChange(next); }}
                className={inputCls}
              />
              <span className="font-mono text-[.6rem] text-text-muted">%</span>
            </label>
            <span className="font-mono text-[.58rem] text-text-disabled pl-36">— OR —</span>
            <label className="flex items-center gap-2">
              <span className="w-36 font-mono text-[.62rem] text-text-muted">Trail $ amount</span>
              <input
                type="number"
                min={0.01}
                step={0.01}
                value={r.trailAmount ?? ""}
                disabled={disabled}
                placeholder="e.g. 2.50"
                onChange={(e) => { const v = numOrUndef(e.target.value); const next: TrailingStopRule = { mode: r.mode }; if (v != null) next.trailAmount = v; onChange(next); }}
                className={inputCls}
              />
            </label>
          </div>
        )}
      </div>
    );
  }

  // "mode" kind — manual just means "use signal value", no extra inputs in v1.
  return <span className="font-mono text-[.62rem] text-text-muted">Use signal value</span>;
}

// ── Spread row ─────────────────────────────────────────────────────────────────

function SpreadRow({
  label,
  tip,
  rule,
  disabled,
  defaultUnit,
  onChange,
}: {
  label: string;
  tip?: string | undefined;
  rule: SpreadRule;
  disabled: boolean;
  defaultUnit?: ToleranceUnit;
  onChange: (r: SpreadRule) => void;
}) {
  return (
    <ToleranceRow
      label={label}
      {...(tip != null ? { tip } : {})}
      rule={rule}
      disabled={disabled}
      defaultUnit={defaultUnit ?? "pct"}
      autoDefault="spreadDefault"
      onChange={(r) => onChange(r as SpreadRule)}
    />
  );
}

// ── Slippage row ───────────────────────────────────────────────────────────────

function SlippageRow({
  label,
  tip,
  rule,
  disabled,
  defaultUnit,
  onChange,
}: {
  label: string;
  tip?: string | undefined;
  rule: SlippageRule;
  disabled: boolean;
  defaultUnit?: ToleranceUnit;
  onChange: (r: SlippageRule) => void;
}) {
  return (
    <ToleranceRow
      label={label}
      {...(tip != null ? { tip } : {})}
      rule={rule}
      disabled={disabled}
      defaultUnit={defaultUnit ?? "pct"}
      autoDefault="slipDefault"
      onChange={(r) => onChange(r as SlippageRule)}
    />
  );
}
