// src/types/copyValidator.ts
//
// Types for the Copy Trading Validator (risk / limits) and Order execution.
// Backend contract: /api/v1/copy-trading/validator/* and /copy-trading/orders/*

// ── Symbol filter ─────────────────────────────────────────────────────────────
export interface SymbolFilter {
  include?: string;
  exclude?: string;
}

// ── Message phrase filter ─────────────────────────────────────────────────────
export interface MessageFilter {
  include?: string;
  exclude?: string;
}

// ── Core enums ──────────────────────────────────────────────────────────────
export type ExecutionMode = "auto" | "manual";
export type FieldMode = "auto" | "manual";
export type OnViolation = "reject" | "clamp";
export type OrderTypeValue = "market" | "limit" | "stop" | "stop_limit";

// ── Instrument / asset types (NEW) ─────────────────────────────────────────
export type InstrumentProfile = "equity" | "commodity" | "options" | "crypto" | "unsupported";
export type SizeUnit = "shares" | "lots" | "contracts" | "units";
export type PriceBasis = "premium" | "spot" | "underlying" | null;
export type ValidatorProfile = "equity" | "commodity" | "crypto" | "options";

export type Platform = "telegram" | "discord" | "discord_account" | "twitter";

// ── Per-field rules ───────────────────────────────────────────────────────────
export interface PctFieldRule {
  mode: FieldMode;
  unit?: ToleranceUnit;
  maxPctFromEntry?: number;
  minPctFromEntry?: number;
  maxPipsFromEntry?: number;
  minPipsFromEntry?: number;
  maxPointsFromEntry?: number;
  minPointsFromEntry?: number;
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

export interface ContractSizeRule {
  mode: FieldMode;
  maxContracts?: number;
  fixedContracts?: number;
  maxPremium?: number;
}

export interface TrailingStopRule {
  mode: "auto" | "manual" | "off";
  trailPct?: number;
  trailAmount?: number;
}

export type SlippageMode = "off" | "auto" | "manual";
export type ToleranceUnit = "pct" | "pips" | "points";

export interface SlippageRule {
  mode: SlippageMode;
  unit?: ToleranceUnit;
  maxPct?: number;
  maxPips?: number;
  maxPoints?: number;
}

export interface SlippageResult {
  enabled: boolean;
  mode: SlippageMode;
  unit?: ToleranceUnit | null;
  maxPct?: number | null;
  maxPips?: number | null;
  maxPoints?: number | null;
  pipSize?: number | null;
  reference_price?: number | null;
  original_limit_price?: number | null;
  adjusted_limit_price?: number | null;
}

export type SpreadMode = "off" | "auto" | "manual";

export interface SpreadRule {
  mode: SpreadMode;
  unit?: ToleranceUnit;
  maxPct?: number;
  maxPips?: number;
  maxPoints?: number;
}

export interface SpreadResult {
  enabled: boolean;
  mode: SpreadMode;
  unit?: ToleranceUnit | null;
  maxPct?: number | null;
  maxPips?: number | null;
  maxPoints?: number | null;
  pipSize?: number | null;
  bid?: number | null;
  ask?: number | null;
  mid?: number | null;
  spreadPct?: number | null;
  crossSpread?: boolean | null;
  limit_before_cross?: number | null;
  crossed_limit_price?: number | null;
}

export interface ValidatorFields {
  entry?: SimpleFieldRule;
  sl?: PctFieldRule;
  tp?: PctFieldRule;
  tpLevels?: PctFieldRule;
  lotSize?: LotSizeRule;
  contractSize?: ContractSizeRule;
  trailingStop?: TrailingStopRule;
  orderType?: OrderTypeRule;
  side?: SimpleFieldRule;
  symbol?: SimpleFieldRule;
  slippage?: SlippageRule;
  spread?: SpreadRule;
}

// Keys of ValidatorFields, used to drive the rules table generically.
export type ValidatorFieldKey = keyof ValidatorFields;

// ── Missing field rules for options (inside profiles.options.missingFields) ──
export interface MissingContractRule {
  whenMissing: "reject" | "use_default" | "allow_empty";
  defaultContracts?: number;
}

export interface ProfileMissingFields {
  sl?: { whenMissing: "reject" | "use_default" | "allow_empty"; defaultPctFromEntry?: number };
  tp?: { whenMissing: "reject" | "use_default" | "allow_empty"; defaultPctFromEntry?: number };
  contractSize?: MissingContractRule;
}

// ── Profile-specific config ──────────────────────────────────────────────────
export interface ProfileConfig {
  executionMode?: ExecutionMode;
  onViolation?: OnViolation;
  fields?: ValidatorFields;
  missingFields?: ProfileMissingFields;
  symbolFilter?: SymbolFilter;
  messageFilter?: MessageFilter;
}

// ── Config (read + write share this shape) ────────────────────────────────────
export interface ValidatorConfigBody {
  executionMode?: ExecutionMode;
  onViolation?: OnViolation;
  fields?: ValidatorFields;
  profiles?: {
    equity?: ProfileConfig;
    commodity?: ProfileConfig;
    crypto?: ProfileConfig;
    options?: ProfileConfig;
  };
}

// The config as returned by GET /config (same shape, fields generally present).
export type ValidatorConfig = ValidatorConfigBody;

// Normalized form state — all mandatory fields filled, profiles optional.
export interface NormalizedValidatorConfig {
  executionMode: ExecutionMode;
  onViolation: OnViolation;
  fields: ValidatorFields;
  symbolFilter?: SymbolFilter;
  messageFilter?: MessageFilter;
  profiles?: ValidatorConfigBody["profiles"];
}

// Extended GET /config?profile=... response
export interface ValidatorConfigResponse {
  config: ValidatorConfig;
  profile?: ValidatorProfile;
  effectiveConfig?: ProfileConfig;
  profiles?: {
    equity?: ProfileConfig;
    commodity?: ProfileConfig;
    crypto?: ProfileConfig;
    options?: ProfileConfig;
  };
}

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
  instrumentProfile?: InstrumentProfile;
  original: Record<string, unknown>;
  adjusted: Record<string, unknown>;
  violations: Violation[];
  summary?: string;
  preSubmitChecks?: PreSubmitCheck[];
  messageFilter?: {
    messageText?: string | null;
    matchedPhrase?: string | null;
    include?: string[];
    exclude?: string[];
  };
  missingFields?: {
    applied: string[];
    rejected: string[];
    present: Record<string, boolean>;
    completeness: "complete" | "partial" | "empty";
  };
}

// Body for POST /validate — either reference an existing signal or pass a raw one.
export interface ValidateBody {
  signalId?: string;
  platform?: Platform;
  sourceId?: string;
  signal?: Record<string, unknown>;
  lotSize?: number;
  contractCount?: number;
  profile?: ValidatorProfile;
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
  messageFilter?: {
    suggestedExcludeDefaults?: string[];
  };
}

// ── Per-source override summaries (GET /config/sources) ───────────────────────
export interface SourceConfigSummary {
  platform: Platform;
  sourceId: string;
  title?: string;
  hasCustomRules: boolean;
  config?: ValidatorConfigBody;
}

// Detailed per-source GET response (GET /config/sources/:platform/:sourceId?profile=equity|commodity|crypto|options)
export interface SourceConfigDetailResponse {
  config: ValidatorConfig | null;
  inheritsFromGlobal: boolean;
  profile: ValidatorProfile;
  effectiveConfig: ProfileConfig;
  globalEffectiveConfig: ProfileConfig;
  sourceOverride?: {
    profiles?: {
      equity?: ProfileConfig;
      commodity?: ProfileConfig;
      crypto?: ProfileConfig;
      options?: ProfileConfig;
    };
    fields?: ValidatorFields | null;
    missingFields?: unknown;
  };
  profiles?: {
    equity?: ProfileConfig;
    commodity?: ProfileConfig;
    crypto?: ProfileConfig;
    options?: ProfileConfig;
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Order execution
// ────────────────────────────────────────────────────────────────────────────
export type OrderExecutionMode = "auto" | "manual_confirm";

export type SizingMode = "fixed_qty" | "notional_usd" | "pct_equity";

export interface SizingConfig {
  equitySizingMode?: SizingMode | undefined;
  equityNotionalUsd?: number | undefined;
  equityPctOfEquity?: number | undefined;
  optionsSizingMode?: SizingMode | undefined;
  optionsNotionalUsd?: number | undefined;
  optionsPctOfEquity?: number | undefined;
}

export interface OrderSettings {
  broker: string;
  brokerConnectionId: string | null;
  orderExecutionMode: OrderExecutionMode;
  isActive?: boolean;
  metadata?: {
    sizingConfig?: SizingConfig;
  };
}

// Connection item inside broker.connections[] from GET /copy-trading/orders/brokers.
export interface OrderBrokerConnection {
  id: string;
  display_name: string;
  environment?: string;
  status?: string;
  key_fingerprint?: string;
  account_id?: string;
  optionsEnabled?: boolean | null;
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
  move_sl_to: string | null;
}

export interface PreSubmitCheck {
  name: "options_enabled" | "market_hours" | "price_sanity" | "tradability" | "buying_power" | "slippage" | "spread" | string;
  ok: boolean;
  code?: string;
  message?: string;
  skipped?: boolean;
  marketMid?: number;
  deviationPct?: number;
  required?: number;
  buyingPower?: number;
  referencePrice?: number;
  marketPrice?: number;
  adverseSlippagePct?: number;
  maxSlippagePct?: number;
  bid?: number;
  ask?: number;
  spreadPct?: number;
  maxSpreadPct?: number;
  crossedLimit?: boolean;
  crossedLimitPrice?: number;
}

export interface OrderPreview {
  instrumentProfile?: InstrumentProfile | null;
  size_unit?: SizeUnit | null;
  qty: number | null;
  side: "buy" | "sell";
  symbol: string;
  underlying_symbol?: string | null;
  contract_symbol?: string | null;
  option_type?: "call" | "put" | null;
  strike?: number | null;
  expiry?: string | null;
  price_basis?: PriceBasis;
  multiplier?: number | null;
  summary: string | null;
  lot_size?: number | null;
  raw_text?: string | null;
  sl_price: number | null;
  tp_price: number | null;
  tp_levels: TpLevel[] | null;
  order_type: string | null;
  entry_display?: string | null;
  asset_class?: string | null;
  limit_price: number | null;
  signal_limit_price?: number | null;
  slippage?: SlippageResult | null;
  spread?: SpreadResult | null;
  time_in_force?: string | null;
  trailing_stop?: { trailPct?: number; trailAmount?: number } | null;
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
  clientOrderId?: string | null;
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
  order_type?: string;
  limit_price?: number | null;
  sl_price?: number;
  tp_price?: number;
  tp_levels?: Array<{ level: number; exit_pct: number; move_sl_to: string | null }>;
  symbol?: string;
  time_in_force?: string;
}

// 502 broker error envelope shape.
export interface BrokerError {
  message: string;
  code?: string;
  preSubmitChecks?: PreSubmitCheck[];
}

// POST /from-signal request body
export interface CreateFromSignalBody {
  platform: "telegram" | "discord";
  signalId: string;
  lotSize?: number;
  qty?: number;
  contractCount?: number;
  forceExecute?: boolean;
  userEdits?: Partial<OrderEdits>;
}
