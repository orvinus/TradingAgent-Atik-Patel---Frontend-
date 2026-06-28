// src/types/broker.ts

export type BrokerType = "alpaca" | "tradier" | "binance" | "coinbase" | "kraken" | "public" | "robinhood" | "mt5";
export type BrokerEnvironment = "paper" | "live" | "testnet";
export type BrokerConnectionStatus = "active" | "inactive" | "error";

// ── Connections ───────────────────────────────────────────────────────────────

export interface BrokerConnection {
  broker_connection_id: string;
  environment: BrokerEnvironment;
  status: BrokerConnectionStatus;
  display_name?: string;
  account_status?: string;
  key_fingerprint?: string;
}

// Alpaca — api_key + api_secret
export interface CreateConnectionPayload {
  environment: BrokerEnvironment;
  display_name?: string;
  api_key: string;
  api_secret: string;
  confirm_secret_storage: true;
}

// Tradier — single bearer_token
export interface CreateTradierConnectionPayload {
  environment: BrokerEnvironment;
  display_name?: string;
  bearer_token: string;
  confirm_secret_storage: true;
}

// Robinhood — api_key + Ed25519 PEM private key; live only; crypto-only
export interface CreateRobinhoodConnectionPayload {
  environment: "live";
  display_name?: string;
  api_key: string;
  ed25519_private_key: string;
  confirm_secret_storage: true;
}

// Public.com — long-lived secret goes in api_key; api_secret unused; live only
export interface CreatePublicConnectionPayload {
  environment: "live";
  display_name?: string;
  api_key: string;
  api_secret?: string;
  account_id?: string;
  confirm_secret_storage: true;
}

// Kraken — api_key + base64 api_secret; live only; optional tier
export interface CreateKrakenConnectionPayload {
  environment: "live";
  display_name?: string;
  api_key: string;
  api_secret: string;
  tier?: "starter" | "intermediate" | "pro";
  confirm_secret_storage: true;
}

// Coinbase — CDP api_key (resource path) + api_secret (EC PEM); live only
export interface CreateCoinbaseConnectionPayload {
  environment: "live";
  display_name?: string;
  api_key: string;
  api_secret: string;
  confirm_secret_storage: true;
}

// Coinbase close-position uses `percentage` instead of `percent`
export interface CoinbaseClosePositionPayload {
  symbol: string;
  qty?: string;
  percentage?: string;
}

// Binance — api_key + exactly one of api_secret (HMAC) or ed25519_pem
export interface CreateBinanceConnectionPayload {
  environment: "testnet" | "live";
  display_name?: string;
  api_key: string;
  api_secret?: string;
  ed25519_pem?: string;
  signing_method?: "hmac" | "ed25519";
  confirm_secret_storage: true;
}

// MT5 — login + password + server (paper or live)
export interface CreateMT5ConnectionPayload {
  environment: "paper" | "live";
  display_name?: string;
  login: string;
  password: string;
  server: string;
  confirm_secret_storage: true;
}

export interface DeleteConnectionResponse {
  connection_id: string;
  deleted: boolean;
}

export interface TestConnectionResponse {
  connection_id: string;
  ok: boolean;
  latency_ms: number;
  detail?: string;
}

// ── Account ───────────────────────────────────────────────────────────────────

export interface AlpacaAccount {
  account_id: string;
  status: string;
  equity: string;
  buying_power: string;
  cash: string;
  currency: string;
}

export interface MarketClock {
  is_open: boolean;
  next_open: string;
  next_close: string;
}

export interface AlpacaPosition {
  symbol: string;
  qty: string;
  avg_cost: string;
  mark_price: string;
  unrealized_pnl: string;
}

export interface PortfolioHistory {
  timestamps: number[];
  equity: number[];
  profit_loss: number[];
  profit_loss_pct: number[];
}

export interface BrokerCapabilities {
  broker_code: string;
  environment: BrokerEnvironment;
  asset_classes: string[];
  order_types: string[];
  supports_fractional: boolean;
  [key: string]: unknown;
}

// ── Orders ────────────────────────────────────────────────────────────────────

export type OrderSide = "buy" | "sell";
export type OrderType =
  | "market"
  | "limit"
  | "stop"
  | "stop_limit"
  | "trailing_stop";
export type TimeInForce = "DAY" | "GTC" | "IOC" | "FOK" | "OPG" | "CLS";
export type OrderStatus =
  | "submitted"
  | "accepted"
  | "pending_new"
  | "new"
  | "partially_filled"
  | "filled"
  | "done_for_day"
  | "canceled"
  | "expired"
  | "replaced"
  | "pending_cancel"
  | "pending_replace"
  | "held";

export interface SubmitOrderPayload {
  client_order_id: string;
  symbol: string;
  asset_class?: "equity" | "option" | "options" | "crypto";
  side: OrderSide;
  order_type: OrderType;
  qty?: string;
  notional?: string;
  limit_price?: string;
  stop_price?: string;
  time_in_force: TimeInForce;
  take_profit?: { limit_price: string };
  stop_loss?: { stop_price: string; limit_price?: string };
  // Tradier options orders require metadata.option_symbol
  metadata?: {
    option_symbol?: string;
    position_intent?: "buy_to_open" | "sell_to_open" | "buy_to_close" | "sell_to_close";
    [key: string]: unknown;
  };
}

export interface AlpacaOrder {
  order_id: string;
  client_order_id: string;
  broker_order_id: string;
  status: OrderStatus;
  submitted_at: string;
  symbol?: string;
  side?: OrderSide;
  order_type?: OrderType;
  qty?: string;
  notional?: string;
  limit_price?: string;
  stop_price?: string;
  filled_qty?: string;
  filled_avg_price?: string;
  child_order_ids: string[];
}

export interface ReplaceOrderPayload {
  qty?: string;
  limit_price?: string;
  stop_price?: string;
  time_in_force?: TimeInForce;
}

export interface CancelOrderResponse {
  broker_order_id: string;
  cancelled: boolean;
}

export interface CancelAllOrdersResponse {
  cancelled_count: number;
  broker_order_ids: string[];
}

export interface UpdateSlTpPayload {
  new_sl_price?: string;
  new_sl_limit_price?: string; // Tradier stop-limit leg
  new_tp_price?: string;
}

export interface UpdateSlTpResponse {
  broker_order_id: string;
  updated_legs: string[];
}

// ── Fills ─────────────────────────────────────────────────────────────────────

export interface AlpacaFill {
  broker_fill_id: string;
  broker_order_id: string;
  symbol: string;
  side: OrderSide;
  qty: string;
  price: string;
  fee?: string;
  filled_at: string;
}

// ── Position Actions ──────────────────────────────────────────────────────────

export interface ClosePositionPayload {
  symbol: string;
  qty?: string;
  percent?: string;
}

export interface SquareOffResponse {
  symbol: string;
  cancelled_orders: string[];
  close_order_id: string;
  message: string;
}

// ── Market Data ───────────────────────────────────────────────────────────────

export interface LatestQuote {
  symbol: string;
  bid: number;
  ask: number;
}

export interface OHLCBar {
  t: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export interface HistoricalBars {
  symbol: string;
  bars: OHLCBar[];
}

export interface OptionsContractsResponse {
  underlying: string;
  symbols: string[];
  count: number;
}

// Tradier uses the same shape for option-chains
export type TradierOptionChainsResponse = OptionsContractsResponse;

// ── Multi-leg Orders ──────────────────────────────────────────────────────────

export interface MultiLegOrderLeg {
  symbol: string;
  side: OrderSide;
  ratio_qty: number;
  position_intent: string;
}

export interface MultiLegOrderPayload {
  client_order_id: string;
  strategy_label?: string;
  qty: number;
  order_type: OrderType;
  limit_price?: string;
  time_in_force: TimeInForce;
  legs: MultiLegOrderLeg[];
}

// ── Unified Broker Connections (GET /brokers/connections) ────────────────────

export interface AllBrokersConnectionEntry {
  id: string;
  broker_code?: string;
  display_name?: string;
  environment: BrokerEnvironment;
  status: BrokerConnectionStatus;
  key_fingerprint?: string;
}

export interface AllBrokersConnectionsResponse {
  by_broker: Record<string, AllBrokersConnectionEntry[]>;
  connections: AllBrokersConnectionEntry[];
  errors: Array<{ broker_code: string; code: string; message: string }>;
}

// ── Broker Catalog & Health ───────────────────────────────────────────────────

export interface BrokerInfo {
  broker_code: string;
  display_name: string;
  paper_supported: boolean;
  live_supported: boolean;
}

export interface BrokerCatalogResponse {
  brokers: BrokerInfo[];
}

export interface BrokerHealthResponse {
  status: "ok" | "degraded";
  service?: string;
  local_db?: string;
  cloud_db?: string;
  redis?: string;
  [key: string]: unknown;
}

// ── Internal Order Intent (API 32) ────────────────────────────────────────────

export type OrderIntentSourceSystem =
  | "ai_trading_mode"
  | "copy_trading"
  | "open_trade_agent"
  | "manual_trading";

export type OrderIntentActorType = "user" | "agent" | "system" | "broker";

export interface OrderIntentPayload {
  trace_id?: string;
  tenant_id: string;
  user_id: string;
  broker_conn_id: string;
  mode: BrokerEnvironment;
  source_system: OrderIntentSourceSystem;
  source_id?: string;
  actor_type: OrderIntentActorType;
  client_order_id: string;
  symbol: string;
  asset_class?: "equity" | "options";
  side: OrderSide;
  order_type: OrderType;
  qty?: string;
  notional?: string;
  limit_price?: string;
  time_in_force: TimeInForce;
  risk_snapshot?: Record<string, unknown>;
  // Tradier options intents need metadata.option_symbol
  metadata?: Record<string, unknown>;
}
