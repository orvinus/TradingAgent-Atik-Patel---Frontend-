// src/pages/CopyTradingValidator/ToleranceRow.tsx
// Shared Slippage / Spread row with unit selector (%, pips, points).

import type { SlippageMode, SlippageRule, SpreadRule, ToleranceUnit } from "@/types/copyValidator";
import { InfoTip } from "./InfoTip";

export const UNIT_LABELS: Record<ToleranceUnit, string> = {
  pct:    "Percent (%)",
  pips:   "Pips",
  points: "Points",
};

export const UNIT_SUFFIX: Record<ToleranceUnit, string> = { pct: "%", pips: "pips", points: "pts" };

export const UNIT_DEFAULTS: Record<ToleranceUnit, { min: number; max: number; step: number; slipDefault: string; spreadDefault: string }> = {
  pct:    { min: 0.01, max: 50,   step: 0.01, slipDefault: "0.5", spreadDefault: "1.0" },
  pips:   { min: 0.1,  max: 500,  step: 0.1,  slipDefault: "3",   spreadDefault: "2" },
  points: { min: 0.1,  max: 5000, step: 0.1,  slipDefault: "5",   spreadDefault: "3" },
};

function getMaxValue(rule: SlippageRule | SpreadRule, unit: ToleranceUnit): number | undefined {
  if (unit === "pips") return rule.maxPips;
  if (unit === "points") return rule.maxPoints;
  return rule.maxPct;
}

const inputCls =
  "w-20 rounded-sm border border-border-default bg-bg-base px-2 py-1 font-mono text-[.68rem] text-text-primary outline-none focus:border-accent disabled:opacity-40";
const selectCls =
  "rounded-sm border border-border-default bg-bg-base px-2 py-1 font-mono text-[.68rem] text-text-primary outline-none focus:border-accent disabled:opacity-40";

const SLIPPAGE_MODE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "off", label: "Off" },
  { value: "auto", label: "Auto" },
  { value: "manual", label: "Manual" },
];

export function ToleranceRow({
  label,
  tip,
  rule,
  disabled,
  defaultUnit,
  autoDefault,
  onChange,
  modeOptions = SLIPPAGE_MODE_OPTIONS,
}: {
  label: string;
  tip?: string;
  rule: SlippageRule | SpreadRule;
  disabled: boolean;
  defaultUnit: ToleranceUnit;
  autoDefault: "slipDefault" | "spreadDefault";
  onChange: (r: SlippageRule | SpreadRule) => void;
  modeOptions?: Array<{ value: string; label: string }>;
}) {
  const active = rule.mode !== "off";
  const required = rule.mode === "manual";
  const unit: ToleranceUnit = rule.unit ?? defaultUnit;
  const cfg = UNIT_DEFAULTS[unit];
  const maxVal = getMaxValue(rule, unit);
  const invalid = required && (maxVal == null || maxVal <= 0);

  const handleModeChange = (mode: string) => {
    if (mode === "off") { onChange({ mode: "off" } as SlippageRule); return; }
    const base: SlippageRule = { mode: mode as SlippageMode, unit };
    if (maxVal != null) {
      if (unit === "pips")   base.maxPips   = maxVal;
      if (unit === "points") base.maxPoints  = maxVal;
      if (unit === "pct")    base.maxPct     = maxVal;
    }
    onChange(base);
  };

  const handleUnitChange = (newUnit: ToleranceUnit) => {
    const out: SlippageRule = { mode: rule.mode, unit: newUnit };
    if (maxVal != null) {
      if (newUnit === "pips")   out.maxPips   = maxVal;
      if (newUnit === "points") out.maxPoints  = maxVal;
      if (newUnit === "pct")    out.maxPct     = maxVal;
    }
    onChange(out);
  };

  const handleMaxChange = (v: number | undefined) => {
    const out: SlippageRule = { mode: rule.mode, unit };
    if (v != null) {
      if (unit === "pips")   out.maxPips   = v;
      if (unit === "points") out.maxPoints  = v;
      if (unit === "pct")    out.maxPct     = v;
    }
    onChange(out);
  };

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
          disabled={disabled}
          onChange={(e) => handleModeChange(e.target.value)}
          className={selectCls}
        >
          {modeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </td>
      <td className="px-3 py-2 align-top">
        {!active ? (
          <span className="font-mono text-[.62rem] text-text-disabled">Disabled</span>
        ) : (
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <label className="flex items-center gap-1.5">
                <span className="font-mono text-[.62rem] text-text-muted">Unit</span>
                <select
                  value={unit}
                  disabled={disabled}
                  onChange={(e) => handleUnitChange(e.target.value as ToleranceUnit)}
                  className={selectCls}
                >
                  {(Object.keys(UNIT_LABELS) as ToleranceUnit[]).map((u) => (
                    <option key={u} value={u}>{UNIT_LABELS[u]}</option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-1.5">
                <span className="font-mono text-[.62rem] text-text-muted">
                  Max{required ? " *" : ""}
                </span>
                <input
                  type="number"
                  min={cfg.min}
                  max={cfg.max}
                  step={cfg.step}
                  value={maxVal ?? ""}
                  disabled={disabled}
                  placeholder={rule.mode === "auto" ? cfg[autoDefault] : ""}
                  onChange={(e) => {
                    const s = e.target.value;
                    const v = s.trim() === "" ? undefined : parseFloat(s);
                    handleMaxChange(isNaN(v as number) ? undefined : v);
                  }}
                  className={`${inputCls} ${invalid ? "border-bear" : ""}`}
                />
                <span className="font-mono text-[.6rem] text-text-muted">{UNIT_SUFFIX[unit]}</span>
              </label>
            </div>
            {rule.mode === "auto" && (
              <span className="font-mono text-[.58rem] text-text-muted">
                Uses your value if set, otherwise server default ({cfg[autoDefault]}{UNIT_SUFFIX[unit]})
              </span>
            )}
            {unit !== "pct" && (
              <span className="font-mono text-[.56rem] text-text-disabled">
                {unit === "pips" ? "FX / gold pip (e.g. 0.0001 for EURUSD)" : "Futures point (tick-based, e.g. ES = 0.25)"}
              </span>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}
