// src/api/endpoints/tradier.ts
import { apiClient } from "@/api/client";
import type {
  AlpacaAccount,
  AlpacaFill,
  AlpacaOrder,
  AlpacaPosition,
  BrokerCapabilities,
  BrokerCatalogResponse,
  BrokerConnection,
  BrokerHealthResponse,
  CancelAllOrdersResponse,
  CancelOrderResponse,
  ClosePositionPayload,
  CreateTradierConnectionPayload,
  DeleteConnectionResponse,
  HistoricalBars,
  LatestQuote,
  MarketClock,
  MultiLegOrderPayload,
  OrderIntentPayload,
  PortfolioHistory,
  ReplaceOrderPayload,
  SquareOffResponse,
  SubmitOrderPayload,
  TestConnectionResponse,
  TradierOptionChainsResponse,
  UpdateSlTpPayload,
  UpdateSlTpResponse,
} from "@/types/broker";

const BASE = "/brokers/tradier";

export const tradierApi = {
  // ── Phase A: Health & Discovery ──────────────────────────────────────────

  /** API 2 — Broker liveness (no auth) */
  liveness: async () => {
    const { data } = await apiClient.get<BrokerHealthResponse>("/health/broker-tradier");
    return data;
  },

  /** API 4 — Detailed broker health (no auth) */
  health: async () => {
    const { data } = await apiClient.get<BrokerHealthResponse>("/health/tradier");
    return data;
  },

  /** API 5 — Broker catalog (shared route with Alpaca) */
  catalog: async () => {
    const { data } = await apiClient.get<BrokerCatalogResponse>("/brokers");
    return data;
  },

  // ── Phase B: Connection Lifecycle ─────────────────────────────────────────

  /** API 6 — Create Tradier connection (bearer_token only) */
  createConnection: async (payload: CreateTradierConnectionPayload) => {
    const { data } = await apiClient.post<BrokerConnection>(
      `${BASE}/connections`,
      payload
    );
    return data;
  },

  /** API 7 — List connections */
  listConnections: async () => {
    const { data } = await apiClient.get<BrokerConnection[]>(`${BASE}/connections`);
    return Array.isArray(data) ? data : [];
  },

  /** API 9 — Test connection */
  testConnection: async (connectionId: string) => {
    const { data } = await apiClient.post<TestConnectionResponse>(
      `${BASE}/connections/${connectionId}/test`
    );
    return data;
  },

  /** API 8 — Delete connection */
  deleteConnection: async (connectionId: string) => {
    const { data } = await apiClient.delete<DeleteConnectionResponse>(
      `${BASE}/connections/${connectionId}`
    );
    return data;
  },

  // ── Phase C: Account & Portfolio Reads ───────────────────────────────────

  /** API 10 — Account snapshot */
  getAccount: async (connectionId: string) => {
    const { data } = await apiClient.get<AlpacaAccount>(
      `${BASE}/connections/${connectionId}/account`
    );
    return data;
  },

  /** API 11 — Market clock */
  getClock: async (connectionId: string) => {
    const { data } = await apiClient.get<MarketClock>(
      `${BASE}/connections/${connectionId}/clock`
    );
    return data;
  },

  /** API 12 — Positions (whole shares only — no fractional) */
  getPositions: async (connectionId: string) => {
    const { data } = await apiClient.get<AlpacaPosition[]>(
      `${BASE}/connections/${connectionId}/positions`
    );
    return Array.isArray(data) ? data : [];
  },

  /** API 26 — Capabilities (supports_fractional: false) */
  getCapabilities: async (connectionId: string) => {
    const { data } = await apiClient.get<BrokerCapabilities>(
      `${BASE}/connections/${connectionId}/capabilities`
    );
    return data;
  },

  /** API 25 — Portfolio history (often returns single snapshot, not full curve) */
  getPortfolioHistory: async (
    connectionId: string,
    params: { period?: string; timeframe?: string } = {}
  ) => {
    const { data } = await apiClient.get<PortfolioHistory>(
      `${BASE}/connections/${connectionId}/portfolio-history`,
      { params }
    );
    return data;
  },

  // ── Phase D: Market Data ──────────────────────────────────────────────────

  /** API 27 — Latest quote */
  getLatestQuote: async (connectionId: string, symbol: string) => {
    const { data } = await apiClient.get<LatestQuote>(
      `${BASE}/market-data/quotes/latest`,
      { params: { connection_id: connectionId, symbol } }
    );
    return data;
  },

  /** API 28 — Historical bars */
  getBars: async (connectionId: string, symbol: string, days = 5) => {
    const { data } = await apiClient.get<HistoricalBars>(
      `${BASE}/market-data/bars`,
      { params: { connection_id: connectionId, symbol, days } }
    );
    return data;
  },

  /**
   * API 29 — Option chains
   * Tradier-specific route: /market-data/option-chains (not /options/contracts)
   * Saves a symbol as OPTION_SYMBOL for options orders.
   */
  getOptionChains: async (
    connectionId: string,
    params: {
      underlying: string;
      limit?: number;
      expiration_date_gte?: string;
    }
  ) => {
    const { data } = await apiClient.get<TradierOptionChainsResponse>(
      `${BASE}/market-data/option-chains`,
      { params: { connection_id: connectionId, ...params } }
    );
    return data;
  },

  // ── Phase E: Orders (submit + list + get + fills) ─────────────────────────

  /**
   * API 15 — Submit order
   * For options: include asset_class="options" AND metadata.option_symbol.
   * Node returns 400 if asset_class is "options" but metadata.option_symbol is missing.
   * Tradier does NOT support fractional quantities — use whole share strings.
   */
  submitOrder: async (connectionId: string, payload: SubmitOrderPayload) => {
    const { data } = await apiClient.post<AlpacaOrder>(
      `${BASE}/connections/${connectionId}/orders`,
      payload
    );
    return data;
  },

  /** API 13 — List orders */
  listOrders: async (
    connectionId: string,
    params: { status?: "open" | "closed" | "all"; limit?: number } = {}
  ) => {
    const { data } = await apiClient.get<AlpacaOrder[]>(
      `${BASE}/connections/${connectionId}/orders`,
      { params }
    );
    return Array.isArray(data) ? data : [];
  },

  /** API 14 — Get single order (microservice scans up to 500 orders to find by ID) */
  getOrder: async (connectionId: string, orderId: string) => {
    const { data } = await apiClient.get<AlpacaOrder>(
      `${BASE}/connections/${connectionId}/orders/${orderId}`
    );
    return data;
  },

  /** API 19 — Fills */
  getFills: async (
    connectionId: string,
    params: { limit?: number } = {}
  ) => {
    const { data } = await apiClient.get<AlpacaFill[]>(
      `${BASE}/connections/${connectionId}/fills`,
      { params }
    );
    return Array.isArray(data) ? data : [];
  },

  // ── Phase F: Order Management ─────────────────────────────────────────────

  /**
   * API 18 — Replace/modify order
   * Tradier uses PUT internally; broker_order_id typically unchanged after replace.
   */
  replaceOrder: async (
    connectionId: string,
    orderId: string,
    payload: ReplaceOrderPayload
  ) => {
    const { data } = await apiClient.patch<AlpacaOrder>(
      `${BASE}/connections/${connectionId}/orders/${orderId}`,
      payload
    );
    return data;
  },

  /** API 16 — Cancel single order */
  cancelOrder: async (connectionId: string, orderId: string) => {
    const { data } = await apiClient.delete<CancelOrderResponse>(
      `${BASE}/connections/${connectionId}/orders/${orderId}`
    );
    return data;
  },

  /** API 17 — Cancel all open orders (superadmin only) */
  cancelAllOrders: async (connectionId: string) => {
    const { data } = await apiClient.delete<CancelAllOrdersResponse>(
      `${BASE}/connections/${connectionId}/orders`
    );
    return data;
  },

  /** API 21 — Order children (bracket legs) */
  getOrderChildren: async (connectionId: string, orderId: string) => {
    const { data } = await apiClient.get<AlpacaOrder[]>(
      `${BASE}/connections/${connectionId}/orders/${orderId}/children`
    );
    return Array.isArray(data) ? data : [];
  },

  /**
   * API 22 — Update SL/TP legs
   * Tradier supports new_sl_limit_price for stop-limit stop-loss legs.
   */
  updateSlTp: async (
    connectionId: string,
    orderId: string,
    payload: UpdateSlTpPayload
  ) => {
    const { data } = await apiClient.patch<UpdateSlTpResponse>(
      `${BASE}/connections/${connectionId}/orders/${orderId}/sl-tp`,
      payload
    );
    return data;
  },

  // ── Phase G: Position Actions ─────────────────────────────────────────────

  /** API 20 — Close position (full, by qty, or by percent) */
  closePosition: async (connectionId: string, payload: ClosePositionPayload) => {
    const { data } = await apiClient.post(
      `${BASE}/connections/${connectionId}/close-position`,
      payload
    );
    return data;
  },

  /** API 23 — Square off symbol (cancel orders + close position) */
  squareOff: async (connectionId: string, symbol: string) => {
    const { data } = await apiClient.post<SquareOffResponse>(
      `${BASE}/connections/${connectionId}/positions/${symbol}/square-off`
    );
    return data;
  },

  // Note: Tradier has NO exerciseOption route — do not call it.

  // ── Phase H: Options & Advanced ───────────────────────────────────────────

  /**
   * API 24 — Multi-leg options order
   * Tradier submits one order per leg (not atomic). Partial leg failure is possible.
   */
  submitMultiLegOrder: async (
    connectionId: string,
    payload: MultiLegOrderPayload
  ) => {
    const { data } = await apiClient.post(
      `${BASE}/connections/${connectionId}/multi-leg-orders`,
      payload
    );
    return data;
  },

  // API 30 (SSE stream) uses EventSource, not axios. Events: quote, trade, heartbeat.
  // URL: `${VITE_BACKEND_URL}/api/v1/brokers/tradier/connections/:id/stream`

  // ── Phase J: Internal Order Intents ──────────────────────────────────────

  /**
   * API 31 — Internal order intent (engine/workers; x-internal-token, no JWT)
   * For options: include asset_class="options" and metadata.option_symbol.
   */
  submitOrderIntent: async (
    payload: OrderIntentPayload,
    internalToken: string
  ) => {
    const { data } = await apiClient.post(
      "/internal/broker/tradier/order-intents",
      payload,
      { headers: { "x-internal-token": internalToken } }
    );
    return data;
  },
};
