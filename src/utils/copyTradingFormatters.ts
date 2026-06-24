// src/utils/copyTradingFormatters.ts
import type { InstrumentProfile, SizeUnit } from "@/types/copyValidator";

export function formatSizeLabel(qty: number | null | undefined, sizeUnit: SizeUnit | null | undefined): string {
  if (qty == null) return "—";
  const unit = sizeUnit ?? "shares";
  const label = unit === "contracts" ? "contracts" : unit === "units" ? "units" : "shares";
  return `${qty} ${label}`;
}

export function formatPremium(price: number | null | undefined, isPremium: boolean): string {
  if (price == null) return "—";
  return isPremium ? `$${price} premium` : `$${price}`;
}

export function formatExpiry(expiry: string | null | undefined): string {
  if (!expiry) return "—";
  try {
    return new Date(expiry).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return expiry;
  }
}

export const ERROR_CODE_MESSAGES: Record<string, string> = {
  ASSET_CLASS_MISMATCH:
    "This signal looks like an option but was classified as equity. It was blocked to prevent a wrong order.",
  PREMIUM_REQUIRES_OPTIONS:
    "Premium-based pricing requires an options order, not shares.",
  OPTIONS_EXECUTION_NOT_SUPPORTED:
    "Options copy trading is disabled on the server.",
  OPTIONS_INCOMPLETE:
    "Missing strike, expiry, or call/put — cannot build contract.",
  PREMIUM_STRIKE_CONFUSION:
    "Entry price looks like the stock/strike price, not the option premium.",
  OPTIONS_NOT_ENABLED_ON_BROKER:
    "Enable options on your Alpaca account to trade this signal.",
  PRICE_SANITY_FAILED:
    "Limit price is too far from the current market price.",
  PRICE_SANITY_NO_QUOTE:
    "Could not verify price against market — order blocked.",
  MARKET_CLOSED:
    "US market is closed. Market equity/options orders cannot be placed now.",
  INSUFFICIENT_BUYING_POWER:
    "Not enough buying power for this order size.",
  TRADABILITY_FAILED:
    "This option contract is not available on your broker.",
  TRAILING_NOT_SUPPORTED_FOR_OPTIONS:
    "Trailing stops are not supported for options.",
  MAX_CONTRACTS_EXCEEDED:
    "Contract count exceeds your options limit setting.",
  MAX_PREMIUM_EXCEEDED:
    "Option premium exceeds your max premium setting.",
  VALIDATION_FAILED:
    "Signal failed your validation rules — review settings.",
  INVALID_LEVELS_MARKET:
    "SL/TP levels are on the wrong side of the current market price. Adjust the bracket before placing.",
  MARKET_ENTRY_NO_REFERENCE:
    "Cannot apply % defaults on market orders without a limit price. Use fixed-price defaults or require SL/TP in the signal.",
  LIMIT_PRICE_REQUIRED:
    "Your validator requires a limit price but this signal is a market order. Set order type to Auto in Validation & Limits.",
  SLIPPAGE_EXCEEDED:
    "Price moved too far from the signal. Order not sent.",
};

export function mapErrorCode(code: string | null | undefined, fallback?: string): string {
  if (!code) return fallback ?? "An error occurred.";
  return ERROR_CODE_MESSAGES[code] ?? fallback ?? code;
}

export function isMarketOrder(
  orderType?: string | null,
  limitPrice?: number | null,
  entryDisplay?: string | null,
): boolean {
  if (orderType === "market") return true;
  if (entryDisplay === "market") return true;
  if (orderType === "limit" || orderType === "stop" || orderType === "stop_limit") return false;
  return limitPrice == null;
}

export const INSTRUMENT_PROFILE_CONFIG: Record<
  InstrumentProfile,
  { label: string; color: string; bgColor: string; borderColor: string; sizeLabel: string; priceLabel: string }
> = {
  equity: {
    label: "Equity",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/40",
    sizeLabel: "Shares",
    priceLabel: "Entry / Limit price",
  },
  options: {
    label: "Options",
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/40",
    sizeLabel: "Contracts",
    priceLabel: "Premium per contract",
  },
  crypto: {
    label: "Crypto",
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/40",
    sizeLabel: "Units",
    priceLabel: "Price",
  },
  unsupported: {
    label: "Unknown",
    color: "text-text-muted",
    bgColor: "bg-bg-elevated",
    borderColor: "border-border-default",
    sizeLabel: "Qty",
    priceLabel: "Price",
  },
};
