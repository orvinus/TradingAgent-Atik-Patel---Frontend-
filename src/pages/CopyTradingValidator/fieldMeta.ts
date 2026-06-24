// src/pages/CopyTradingValidator/fieldMeta.ts
//
// Static field metadata used to render the rules table. GET /options may
// override labels/tooltips at runtime; these are the local fallbacks so the
// UI is fully functional even before (or without) the options call.
import type { ValidatorFieldKey, OrderTypeValue } from "@/types/copyValidator";

export type FieldKind = "pct" | "lotSize" | "orderType" | "mode" | "trailingStop" | "slippage" | "spread";

export interface FieldDef {
  key: ValidatorFieldKey;
  label: string;
  kind: FieldKind;
  tooltip: string;
}

// Order mirrors the spec wireframe.
export const FIELD_DEFS: FieldDef[] = [
  {
    key: "sl",
    label: "Stop loss",
    kind: "pct",
    tooltip: "For a BUY, stop loss cannot be more than this % below the entry price.",
  },
  {
    key: "tp",
    label: "Take profit",
    kind: "pct",
    tooltip: "For a BUY, take profit cannot be more than this % above the entry price.",
  },
  {
    key: "tpLevels",
    label: "TP levels",
    kind: "pct",
    tooltip: "Applies the % limits to each level in the signal's TP ladder.",
  },
  {
    key: "lotSize",
    label: "Lot size",
    kind: "lotSize",
    tooltip: "Cap or fix the position size regardless of the signal's suggestion.",
  },
  {
    key: "trailingStop",
    label: "Trailing stop",
    kind: "trailingStop",
    tooltip: "Set a trailing stop — either a % trail or a fixed $ amount below the price.",
  },
  {
    key: "orderType",
    label: "Order type",
    kind: "orderType",
    tooltip: "Force a specific order type instead of using the signal's.",
  },
  { key: "entry", label: "Entry price", kind: "mode", tooltip: "Use the entry price from the signal." },
  { key: "side", label: "Side", kind: "mode", tooltip: "Use the buy/sell side from the signal." },
  { key: "symbol", label: "Symbol", kind: "mode", tooltip: "Use the symbol from the signal." },
  {
    key: "slippage",
    label: "Slippage tolerance",
    kind: "slippage",
    tooltip: "Maximum price movement from signal entry before reject (market) or limit widen (limit). Auto uses server default 0.5% when no value set.",
  },
  {
    key: "spread",
    label: "Spread tolerance",
    kind: "spread",
    tooltip: "Maximum bid-ask spread % before reject. Limit orders cross to ask (buy) or bid (sell) when spread check passes. Auto uses server default 1% when no value set.",
  },
];

export const ORDER_TYPE_OPTIONS: OrderTypeValue[] = ["market", "limit", "stop", "stop_limit"];

export const ORDER_TYPE_LABELS: Record<OrderTypeValue, string> = {
  market: "Market",
  limit: "Limit",
  stop: "Stop",
  stop_limit: "Stop limit",
};

export const TOOLTIPS = {
  maxPctSl: "For a BUY, stop loss cannot be more than this % below the entry price.",
  maxPctTp: "For a BUY, take profit cannot be more than this % above the entry price.",
  fixedLots: "Always trade this many lots, ignoring the signal's size hint.",
  maxLots: "Cap position size; signals suggesting more lots will be rejected or clamped.",
  reject: "Signal will not be traded if it breaks a rule.",
  clamp: "SL / TP / lots adjusted to the nearest allowed value when possible.",
  trailingStop: "Trailing stop follows price by a fixed % or $ amount. Only supported for equity.",
};
