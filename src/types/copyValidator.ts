// src/types/copyValidator.ts
//
// Types for the Copy Trading Validator (risk / limits) and Order execution.
// Backend contract: /api/v1/copy-trading/validator/* and /copy-trading/orders/*

// ── Core enums ──────────────────────────────────────────────────────────────
export type ExecutionMode = "auto" | "manual";
export type FieldMode = "auto" | "manual";
export type OnViolation = "reject" | "clamp";
export type OrderTypeValue = "market" | "limit" | "stop" | "stop_limit";

export type Platform = "telegram" | "discord";

// ── Per-field rules ───────────────────────────────────────────────────────────
export interface PctFieldRule {
  mode: FieldMode;
  maxPctFromEntry?: number;
  minPctFromEntry?: number;
}

export interface LotSizeRule {
  mode: FieldMode;
  maxLots?: number;
  fixedLots?: number;
}

export interface OrderTypeRule {
  mode: FieldMode;
  value?: OrderTypeValue;
}

export interface SimpleFieldRule {
  mode: FieldMode;
}

export interface ValidatorFields {
  entry?: SimpleFieldRule;
  sl?: PctFieldRule;
  tp?: PctFieldRule;
  tpLevels?: PctFieldRule;
  lotSize?: LotSizeRule;
  orderType?: OrderTypeRule;
  side?: SimpleFieldRule;
  symbol?: SimpleFieldRule;
}

// Keys of ValidatorFields, used to drive the rules table generically.
export type ValidatorFieldKey = keyof ValidatorFields;

// ── Config (read + write share this shape) ────────────────────────────────────
export interface ValidatorConfigBody {
  executionMode?: ExecutionMode;
  onViolation?: OnViolation;
  fields?: ValidatorFields;
}

// The config as returned by GET /config (same shape, fields generally present).
export type ValidatorConfig = ValidatorConfigBody;

// ── Validate result ───────────────────────────────────────────────────────────
export interface Violation {
  field: string;
  code: string;
  message: string;
  original?: unknown;
  limit?: unknown;
  adjusted?: unknown;
  action: "rejected" | "clamped" | "passed";
}

export interface ValidateResult {
  valid: boolean;
  executionMode: ExecutionMode;
  onViolation: OnViolation;
  original: Record<string, unknown>;
  adjusted: Record<string, unknown>;
  violations: Violation[];
  summary?: string;
}

// Body for POST /validate — either reference an existing signal or pass a raw one.
export interface ValidateBody {
  signalId?: string;
  platform?: Platform;
  signal?: Record<string, unknown>;
  // Optional: preview against an unsaved config instead of the stored one.
  config?: ValidatorConfigBody;
}

// ── Field metadata from GET /options ──────────────────────────────────────────
export interface ValidatorFieldOption {
  key: ValidatorFieldKey | string;
  label: string;
  description?: string;
  // "pct" | "lotSize" | "orderType" | "mode" — hints the inputs to render.
  type?: string;
  example?: unknown;
  tooltip?: string;
}

export interface ValidatorOptions {
  fields: ValidatorFieldOption[];
  orderTypes?: OrderTypeValue[];
  executionModes?: ExecutionMode[];
  onViolation?: OnViolation[];
}

// ── Per-source override summaries (GET /config/sources) ───────────────────────
export interface SourceConfigSummary {
  platform: Platform;
  sourceId: string;
  title?: string;
  hasCustomRules: boolean;
  config?: ValidatorConfigBody;
}

// ────────────────────────────────────────────────────────────────────────────
// Order execution
// ────────────────────────────────────────────────────────────────────────────
export type OrderExecutionMode = "auto" | "manual_confirm";

export interface OrderSettings {
  broker: "alpaca";
  brokerConnectionId: string | null;
  orderExecutionMode: OrderExecutionMode;
}

export interface OrderBrokerOption {
  brokerConnectionId: string;
  broker: string;
  displayName: string;
  environment?: string;
}

export type CopyOrderStatus =
  | "pending_confirmation"
  | "submitted"
  | "filled"
  | "rejected"
  | "failed"
  | "cancelled";

export interface CopyOrder {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  entry?: number | null;
  sl?: number | null;
  tp?: number[] | number | null;
  tpLevels?: number[] | null;
  qty?: number | null;
  orderType?: string | null;
  status: CopyOrderStatus;
  broker?: string | null;
  brokerConnectionId?: string | null;
  brokerOrderId?: string | null;
  summary?: string | null;
  validation?: ValidateResult | null;
  createdAt: string;
}

// Editable subset for PATCH /orders/:id and confirm userEdits.
export interface OrderEdits {
  qty?: number;
  entry?: number;
  sl?: number;
  tp?: number[];
  symbol?: string;
}

// 502 broker error envelope shape.
export interface BrokerError {
  message: string;
  code?: string;
}
