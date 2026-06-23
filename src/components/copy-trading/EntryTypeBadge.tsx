// src/components/copy-trading/EntryTypeBadge.tsx
// Three reusable primitives for market vs limit order display:
//   EntryTypeBadge   — inline amber MARKET chip or formatted price chip
//   MarketOrderBanner — amber info box for confirm modals
//   EntryTypeToggle  — pill switch between market and limit
import type { InstrumentProfile, PriceBasis } from "@/types/copyValidator";
import { isMarketOrder } from "@/utils/copyTradingFormatters";

// ── EntryTypeBadge ────────────────────────────────────────────────────────────

interface BadgeProps {
  orderType?: string | null | undefined;
  limitPrice?: number | null | undefined;
  entryDisplay?: string | null | undefined;
  priceBasis?: PriceBasis | undefined;
  profile?: InstrumentProfile | null | undefined;
}

export function EntryTypeBadge({ orderType, limitPrice, entryDisplay, priceBasis, profile }: BadgeProps) {
  const market = isMarketOrder(orderType, limitPrice, entryDisplay);

  if (market) {
    return (
      <span className="inline-flex items-center rounded-sm border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[.54rem] uppercase tracking-widest text-amber-400">
        MARKET
      </span>
    );
  }

  const isPremium = priceBasis === "premium" || profile === "options";
  const suffix = isPremium ? " prem" : "";
  const label = limitPrice != null ? `$${limitPrice}${suffix}` : "—";

  return (
    <span className="inline-flex items-center rounded-sm border border-border-default px-1.5 py-0.5 font-mono text-[.54rem] uppercase tracking-widest text-text-secondary">
      LIMIT {label}
    </span>
  );
}

// ── MarketOrderBanner ─────────────────────────────────────────────────────────

export function MarketOrderBanner({ profile }: { profile?: InstrumentProfile | null | undefined }) {
  const isOptions = profile === "options";
  const isCrypto = profile === "crypto";

  const msg = isOptions
    ? "This order buys/sells option contracts at the current market premium."
    : isCrypto
      ? "This order executes at the current market price. No US market-hours restriction for crypto."
      : "This order executes at the current market price. SL and TP become bracket legs submitted with the order.";

  return (
    <div className="flex items-start gap-2.5 rounded-sm border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
      <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400" />
      <p className="font-mono text-[.62rem] text-amber-300">{msg}</p>
    </div>
  );
}

// ── EntryTypeToggle ───────────────────────────────────────────────────────────

export function EntryTypeToggle({
  value,
  onChange,
  disabled,
}: {
  value: "market" | "limit";
  onChange: (v: "market" | "limit") => void;
  disabled?: boolean | undefined;
}) {
  return (
    <div className="inline-flex rounded-sm border border-border-default p-0.5">
      {(["market", "limit"] as const).map((t) => (
        <button
          key={t}
          type="button"
          disabled={disabled}
          onClick={() => onChange(t)}
          className={`rounded-sm px-3 py-1 font-mono text-[.6rem] uppercase tracking-widest transition-colors ${
            value === t
              ? t === "market"
                ? "bg-amber-500/20 font-bold text-amber-300"
                : "bg-accent/20 font-bold text-accent"
              : "text-text-muted hover:text-text-secondary"
          } disabled:opacity-50`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
