// src/api/endpoints/coinbase.ts
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
  CoinbaseClosePositionPayload,
  CreateCoinbaseConnectionPayload,
  DeleteConnectionResponse,
  HistoricalBars,
  LatestQuote,
  MarketClock,
  OrderIntentPayload,
  PortfolioHistory,
  SquareOffResponse,
  SubmitOrderPayload,
  TestConnectionResponse,
} from "@/types/broker";

const BASE = "/brokers/coinbase";

export const coinbaseApi = {
  // ── Phase A: Health & Discovery ──────────────────────────────────────────

  liveness: async () => {
    const { data } = await apiClient.get<BrokerHealthResponse>("/health/broker-coinbase");
    return data;
  },

  health: async () => {
    const { data } = await apiClient.get<BrokerHealthResponse>("/health/coinbase");
    return data;
  },

  catalog: async () => {
    const { data } = await apiClient.get<BrokerCatalogResponse>("/brokers");
    return data;
  },

  // ── Phase B: Connection Lifecycle ─────────────────────────────────────────

  /** API 6 — Create Coinbase connection (live only; api_key = CDP resource path, api_secret = EC PEM) */
  createConnection: async (payload: CreateCoinbaseConnectionPayload) => {
    const { data } = await apiClient.post<BrokerConnection>(`${BASE}/connections`, payload);
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

  /** API 8 — Delete connection (soft delete on microservice) */
  deleteConnection: async (connectionId: string) => {
    const { data } = await apiClient.delete<DeleteConnectionResponse>(
      `${BASE}/connections/${connectionId}`
    );
    return data;
  },

  // ── Phase C: Account & Portfolio Reads ───────────────────────────────────

  /** API 10 — Account snapshot (equity/buying_power/cash in USD) */
  getAccount: async (connectionId: string) => {
    const { data } = await apiClient.get<AlpacaAccount>(
      `${BASE}/connections/${connectionId}/account`
    );
    return data;
  },

  /** API 11 — Market clock (crypto 24/7 — is_open: true, next_open/close: null) */
  getClock: async (connectionId: string) => {
    const { data } = await apiClient.get<MarketClock>(
      `${BASE}/connections/${connectionId}/clock`
    );
    return data;
  },

  /** API 12 — Crypto holdings (symbol: BTC-USD; some fields may be null) */
  getPositions: async (connectionId: string) => {
    const { data } = await apiClient.get<AlpacaPosition[]>(
      `${BASE}/connections/${connectionId}/positions`
    );
    return Array.isArray(data) ? data : [];
  },

  /** API 13 — Capabilities (asset_classes: ["crypto"], order_types: market/limit/stop/stop_limit) */
  getCapabilities: async (connectionId: string) => {
    const { data } = await apiClient.get<BrokerCapabilities>(
      `${BASE}/connections/${connectionId}/capabilities`
    );
    return data;
  },

  /** API 14 — Portfolio history (stub; do not use for charts) */
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

  /** API 15 — Latest quote (symbol: BTC-USD) */
  getLatestQuote: async (connectionId: string, symbol: string) => {
    const { data } = await apiClient.get<LatestQuote>(
      `${BASE}/market-data/quotes/latest`,
      { params: { connection_id: connectionId, symbol } }
    );
    return data;
  },

  /** API 16 — Historical bars (daily candles; days 1–365) */
  getBars: async (connectionId: string, symbol: string, days = 5) => {
    const { data } = await apiClient.get<HistoricalBars>(
      `${BASE}/market-data/bars`,
      { params: { connection_id: connectionId, symbol, days } }
    );
    return data;
  },

  // ── Phase E: Orders ───────────────────────────────────────────────────────

  /**
   * API 17 — Submit order
   * asset_class must be "crypto"; symbol format: BASE-USD (e.g. BTC-USD).
   * time_in_force: GTC, GTT, IOC, FOK.
   * Use notional for market buys, qty for limit/stop orders.
   */
  submitOrder: async (connectionId: string, payload: SubmitOrderPayload) => {
    const { data } = await apiClient.post<AlpacaOrder>(
      `${BASE}/connections/${connectionId}/orders`,
      payload
    );
    return data;
  },

  /** API 18 — List orders (status: open | closed | all; limit: 1–500) */
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

  /** API 19 — Get single order (orderId = Coinbase broker_order_id) */
  getOrder: async (connectionId: string, orderId: string) => {
    const { data } = await apiClient.get<AlpacaOrder>(
      `${BASE}/connections/${connectionId}/orders/${orderId}`
    );
    return data;
  },

  /** API 22 — Fills (limit: 1–500) */
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

  /** API 20 — Cancel single order */
  cancelOrder: async (connectionId: string, orderId: string) => {
    const { data } = await apiClient.delete<CancelOrderResponse>(
      `${BASE}/connections/${connectionId}/orders/${orderId}`
    );
    return data;
  },

  /** API 21 — Cancel all open orders (superadmin only) */
  cancelAllOrders: async (connectionId: string) => {
    const { data } = await apiClient.delete<CancelAllOrdersResponse>(
      `${BASE}/connections/${connectionId}/orders`
    );
    return data;
  },

  // Note: Coinbase has NO replaceOrder, updateSlTp, getOrderChildren, submitMultiLegOrder,
  //       getOptionsContracts, or exerciseOption routes.

  // ── Phase G: Position Actions ─────────────────────────────────────────────

  /**
   * API 23 — Close position
   * Use `percentage` (not `percent`) for partial percentage close.
   * Full close: { symbol }; by qty: { symbol, qty }; partial: { symbol, percentage: "50" }
   */
  closePosition: async (connectionId: string, payload: CoinbaseClosePositionPayload) => {
    const { data } = await apiClient.post(
      `${BASE}/connections/${connectionId}/close-position`,
      payload
    );
    return data;
  },

  /** API 24 — Square off (cancel open orders + market-close position) */
  squareOff: async (connectionId: string, symbol: string) => {
    const { data } = await apiClient.post<SquareOffResponse>(
      `${BASE}/connections/${connectionId}/positions/${symbol}/square-off`
    );
    return data;
  },

  // ── Phase J: Internal Order Intents ──────────────────────────────────────

  /** API 26 — Internal order intent (x-internal-token only; mode must be "live") */
  submitOrderIntent: async (
    payload: OrderIntentPayload,
    internalToken: string
  ) => {
    const { data } = await apiClient.post(
      "/internal/broker/coinbase/order-intents",
      payload,
      { headers: { "x-internal-token": internalToken } }
    );
    return data;
  },
};
