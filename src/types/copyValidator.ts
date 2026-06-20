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
  broker: string;
  brokerConnectionId: string | null;
  orderExecutionMode: OrderExecutionMode;
}

// Connection item inside broker.connections[] from GET /copy-trading/orders/brokers.
export interface OrderBrokerConnection {
  id: string;
  display_name: string;
  environment?: string;
  status?: string;
  key_fingerprint?: string;
}

// Broker item from GET /copy-trading/orders/brokers.
export interface OrderBroker {
  id: string;
  name: string;
  description?: string;
  available: boolean;
  connections: OrderBrokerConnection[];
}

// Legacy alias kept for any other imports.
export type OrderBrokerOption = OrderBrokerConnection;

export type CopyOrderStatus =
  | "pending_confirmation"
  | "submitted"
  | "filled"
  | "rejected"
  | "failed"
  | "cancelled";

export interface TpLevel {
  level: number;
  exit_pct: number;
  move_sl_to: number | null;
}

export interface OrderPreview {
  qty: number | null;
  side: "buy" | "sell";
  symbol: string;
  summary: string | null;
  lot_size?: number | null;
  raw_text?: string | null;
  sl_price: number | null;
  tp_price: number | null;
  tp_levels: TpLevel[] | null;
  order_type: string | null;
  asset_class?: string | null;
  limit_price: number | null;
  time_in_force?: string | null;
}

export interface UserEditedOrder {
  qty?: number | null;
  symbol?: string | null;
  sl_price?: number | null;
  limit_price?: number | null;
}

export interface CopyOrder {
  id: string;
  platform?: "telegram" | "discord" | null;
  broker?: string | null;
  brokerConnectionId?: string | null;
  status: CopyOrderStatus;
  executionMode?: string | null;
  validatorValid?: boolean | null;
  validatorResult?: ValidateResult | null;
  orderPreview?: OrderPreview | null;
  userEditedOrder?: UserEditedOrder | null;
  brokerOrderId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  confirmedAt?: string | null;
  submittedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

// Editable subset for PATCH /orders/:id and confirm userEdits.
export interface OrderEdits {
  qty?: number;
  limit_price?: number;
  sl_price?: number;
  tp?: number[];
  symbol?: string;
}

// 502 broker error envelope shape.
export interface BrokerError {
  message: string;
  code?: string;
}
