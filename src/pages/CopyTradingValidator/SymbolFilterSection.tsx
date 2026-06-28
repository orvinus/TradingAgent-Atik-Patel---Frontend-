// src/pages/CopyTradingValidator/SymbolFilterSection.tsx
// Reusable include / exclude symbol filter UI for all four profile tabs.
import type { SymbolFilter, ValidatorProfile } from "@/types/copyValidator";

const PROFILE_META: Record<
  ValidatorProfile,
  { includeLabel: string; includePlaceholder: string; excludePlaceholder: string }
> = {
  equity:    { includeLabel: "Include stocks / ETFs",    includePlaceholder: "AAPL, NVDA, SPY",     excludePlaceholder: "TSLA, GME" },
  commodity: { includeLabel: "Include commodities",      includePlaceholder: "XAUUSD, XAGUSD, WTI", excludePlaceholder: "NGAS" },
  crypto:    { includeLabel: "Include crypto",           includePlaceholder: "BTC, ETH, SOL",        excludePlaceholder: "DOGE, SHIB" },
  options:   { includeLabel: "Include underlyings",      includePlaceholder: "ORCL, ES, AAPL",       excludePlaceholder: "SPY, QQQ" },
};

const inputCls =
  "w-full rounded-sm border border-border-default bg-bg-base px-2.5 py-1.5 font-mono text-[.68rem] text-text-primary outline-none focus:border-accent placeholder:text-text-disabled";

interface Props {
  profile: ValidatorProfile;
  value: SymbolFilter;
  onChange: (next: SymbolFilter) => void;
}

export function SymbolFilterSection({ profile, value, onChange }: Props) {
  const meta = PROFILE_META[profile];
  const inc = value.include ?? "";
  const exc = value.exclude ?? "";

  return (
    <fieldset className="rounded-sm border border-border-subtle bg-bg-elevated/50 p-4">
      <legend className="mb-0 px-1 font-mono text-[.58rem] uppercase tracking-[.18em] text-text-disabled">
        Symbol filter <span className="normal-case tracking-normal text-text-muted">(optional)</span>
      </legend>

      <div className="mt-3 flex flex-col gap-4">
        {/* Include */}
        <div className="flex flex-col gap-1.5">
          <label className="font-mono text-[.65rem] font-bold text-text-secondary">
            {meta.includeLabel}
          </label>
          <input
            type="text"
            value={inc}
            placeholder={meta.includePlaceholder}
            onChange={(e) => onChange({ ...value, include: e.target.value })}
            className={inputCls}
          />
          <p className="font-mono text-[.58rem] text-text-muted">
            When set, <strong className="text-text-secondary">only</strong> these symbols are accepted.
            Leave empty to allow all (except excluded).
          </p>
        </div>

        {/* Exclude */}
        <div className="flex flex-col gap-1.5">
          <label className="font-mono text-[.65rem] font-bold text-text-secondary">
            Exclude symbols
          </label>
          <input
            type="text"
            value={exc}
            placeholder={meta.excludePlaceholder}
            onChange={(e) => onChange({ ...value, exclude: e.target.value })}
            className={inputCls}
          />
          <p className="font-mono text-[.58rem] text-text-muted">
            These symbols are <strong className="text-text-secondary">always rejected</strong>.
            Exclude wins if a symbol appears in both lists.
          </p>
        </div>
      </div>
    </fieldset>
  );
}
