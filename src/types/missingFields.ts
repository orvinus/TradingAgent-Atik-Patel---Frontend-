// src/types/missingFields.ts
// Types for the Copy Trading Missing Fields API (/copy-trading/missing-fields)

export type WhenMissing = "reject" | "use_default" | "allow_empty";

export type EntryWhenMissing = "reject" | "use_market" | "use_default";

export type Completeness = "complete" | "partial" | "entry_only" | "invalid";

// ── Config shapes (API) ───────────────────────────────────────────────────────

export interface TpDefaultLevel {
  pctFromEntry: number;
  exit_pct: number;
}

export interface SlFieldConfig {
  whenMissing: WhenMissing;
  defaultPctFromEntry?: number;
  defaultPrice?: number;
}

export interface TpFieldConfig {
  whenMissing: WhenMissing;
  defaultPctFromEntry?: number;
  defaultPrice?: number;
  defaultTpLevels?: TpDefaultLevel[];
}

export interface LotSizeFieldConfig {
  whenMissing: WhenMissing;
  defaultLots?: number;
}

export interface EntryFieldConfig {
  whenMissing: EntryWhenMissing;
  defaultLimitPrice?: number;
}

export interface MissingFieldsConfig {
  entry?: EntryFieldConfig;
  sl: SlFieldConfig;
  tp: TpFieldConfig;
  lotSize: LotSizeFieldConfig;
}

// Full config response including per-profile keys
export interface MissingFieldsFullConfig {
  missingFields?: MissingFieldsConfig;
  commodityMissingFields?: MissingFieldsConfig;
  cryptoMissingFields?: MissingFieldsConfig;
}

// ── Options response ──────────────────────────────────────────────────────────

export interface MissingFieldMeta {
  key: "sl" | "tp" | "lotSize";
  label: string;
  supports: string[];
}

export interface MissingFieldsOptions {
  whenMissing: WhenMissing[];
  fields: MissingFieldMeta[];
  examples?: Record<string, unknown>;
}

// ── Preview ───────────────────────────────────────────────────────────────────

export interface MissingFieldApplied {
  field: string;
  code: string;
  action: "filled" | "rejected";
  adjusted?: number | null;
}

export interface MissingFieldsResultData {
  applied: MissingFieldApplied[];
  rejected: MissingFieldApplied[];
  present: Record<string, boolean>;
  completeness: Completeness;
}

export interface PreviewViolation {
  field: string;
  code: string;
  message: string;
  action: "rejected" | "clamped" | "passed";
}

export interface MissingFieldsPreviewResult {
  valid: boolean;
  executionMode?: string;
  adjusted?: {
    symbol?: string;
    side?: string;
    order_type?: string | null;
    limit_price?: number | null;
    entry_display?: string | null;
    sl_price?: number | null;
    tp_price?: number | null;
    lot_size?: number | null;
  };
  violations: PreviewViolation[];
  missingFields: MissingFieldsResultData;
  summary?: string;
}

export interface MissingFieldsPreviewResponse {
  result: MissingFieldsPreviewResult;
  configUsed?: Record<string, unknown>;
}

// ── Options-specific config ───────────────────────────────────────────────────

export interface ContractSizeFieldConfig {
  whenMissing: WhenMissing;
  defaultContracts?: number;
}

export interface OptionsMissingFieldsApiConfig {
  entry?: EntryFieldConfig;
  sl?: SlFieldConfig;
  tp?: TpFieldConfig;
  contractSize?: ContractSizeFieldConfig;
}

// ── Source override ───────────────────────────────────────────────────────────

export interface MissingFieldsSourceConfig {
  inheritsFromGlobal?: boolean;
  effectiveMissingFields?: MissingFieldsConfig;
  missingFields?: MissingFieldsConfig;
}
