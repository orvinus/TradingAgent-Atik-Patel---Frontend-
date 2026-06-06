// src/api/endpoints/binance.ts
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
  CreateBinanceConnectionPayload,
  DeleteConnectionResponse,
  HistoricalBars,
  LatestQuote,
  MarketClock,
  OrderIntentPayload,
  PortfolioHistory,
  ReplaceOrderPayload,
  SquareOffResponse,
  SubmitOrderPayload,
  TestConnectionResponse,
  UpdateSlTpPayload,
  UpdateSlTpResponse,
} from "@/types/broker";

const BASE = "/brokers/binance";

export const binanceApi = {
  // ── Phase A: Health & Discovery ──────────────────────────────────────────

  liveness: async () => {
    const { data } = await apiClient.get<BrokerHealthResponse>("/health/broker-binance");
    return data;
  },

  health: async () => {
    const { data } = await apiClient.get<BrokerHealthResponse>("/health/binance");
    return data;
  },

  catalog: async () => {
    const { data } = await apiClient.get<BrokerCatalogResponse>("/brokers");
    return data;
  },

  // ── Phase B: Connection Lifecycle ─────────────────────────────────────────

  /** API 6 — Create Binance connection (HMAC or Ed25519; send exactly one secret) */
  createConnection: async (payload: CreateBinanceConnectionPayload) => {
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

  /** API 8 — Delete connection */
  deleteConnection: async (connectionId: string) => {
    const { data } = await apiClient.delete<DeleteConnectionResponse>(
      `${BASE}/connections/${connectionId}`
    );
    return data;
  },

  // ── Phase C: Account & Portfolio Reads ───────────────────────────────────

  /** API 10 — Account snapshot (USDT-centric buying power / cash) */
  getAccount: async (connectionId: string) => {
    const { data } = await apiClient.get<AlpacaAccount>(
      `${BASE}/connections/${connectionId}/account`
    );
    return data;
  },

  /** API 11 — Clock (always open — is_open: true, next_open/close null) */
  getClock: async (connectionId: string) => {
    const { data } = await apiClient.get<MarketClock>(
      `${BASE}/connections/${connectionId}/clock`
    );
    return data;
  },

  /** API 12 — Positions (non-zero base-asset balances) */
  getPositions: async (connectionId: string) => {
    const { data } = await apiClient.get<AlpacaPosition[]>(
      `${BASE}/connections/${connectionId}/positions`
    );
    return Array.isArray(data) ? data : [];
  },

  /** API 13 — Capabilities (includes oco, bracket, trailing_stop; supports_short: false) */
  getCapabilities: async (connectionId: string) => {
    const { data } = await apiClient.get<BrokerCapabilities>(
      `${BASE}/connections/${connectionId}/capabilities`
    );
    return data;
  },

  /** API 25 — Portfolio history (synthesized from klines) */
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

  /** API 26 — Latest quote (symbol: BTCUSDT or BTC-USDT) */
  getLatestQuote: async (connectionId: string, symbol: string) => {
    const { data } = await apiClient.get<LatestQuote>(
      `${BASE}/market-data/quotes/latest`,
      { params: { connection_id: connectionId, symbol } }
    );
    return data;
  },

  /** API 27 — Historical bars (klines); timeframe: 1m, 5m, 1h, 1d, etc. */
  getBars: async (
    connectionId: string,
    symbol: string,
    days = 5,
    timeframe = "1h"
  ) => {
    const { data } = await apiClient.get<HistoricalBars>(
      `${BASE}/market-data/bars`,
      { params: { connection_id: connectionId, symbol, days, timeframe } }
    );
    return data;
  },

  // ── Phase E: Orders ───────────────────────────────────────────────────────

  /**
   * API 16 — Submit order
   * Native bracket/OCO: use order_type "bracket" + limit_price + stop_price.
   * Notional buys supported for market orders.
   */
  submitOrder: async (connectionId: string, payload: SubmitOrderPayload) => {
    const { data } = await apiClient.post<AlpacaOrder>(
      `${BASE}/connections/${connectionId}/orders`,
      payload
    );
    return data;
  },

  /** API 14 — List orders */
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

  /** API 15 — Get single order (may be orderListId for OCO) */
  getOrder: async (connectionId: string, orderId: string) => {
    const { data } = await apiClient.get<AlpacaOrder>(
      `${BASE}/connections/${connectionId}/orders/${orderId}`
    );
    return data;
  },

  /** API 21 — Fills (optional symbol filter: ?symbol=BTCUSDT) */
  getFills: async (
    connectionId: string,
    params: { limit?: number; symbol?: string } = {}
  ) => {
    const { data } = await apiClient.get<AlpacaFill[]>(
      `${BASE}/connections/${connectionId}/fills`,
      { params }
    );
    return Array.isArray(data) ? data : [];
  },

  // ── Phase F: Order Management ─────────────────────────────────────────────

  /** API 19 — Replace/modify order */
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

  /** API 17 — Cancel single order */
  cancelOrder: async (connectionId: string, orderId: string) => {
    const { data } = await apiClient.delete<CancelOrderResponse>(
      `${BASE}/connections/${connectionId}/orders/${orderId}`
    );
    return data;
  },

  /** API 18 — Cancel all open orders (superadmin); optional ?symbol=BTCUSDT to scope */
  cancelAllOrders: async (connectionId: string, symbol?: string) => {
    const { data } = await apiClient.delete<CancelAllOrdersResponse>(
      `${BASE}/connections/${connectionId}/orders`,
      symbol ? { params: { symbol } } : undefined
    );
    return data;
  },

  /** API 20 — Order children (OCO legs; [] for simple orders) */
  getOrderChildren: async (connectionId: string, orderId: string) => {
    const { data } = await apiClient.get<AlpacaOrder[]>(
      `${BASE}/connections/${connectionId}/orders/${orderId}/children`
    );
    return Array.isArray(data) ? data : [];
  },

  /** API 24 — Update SL/TP (new_sl_price, new_tp_price) */
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

  /** API 22 — Close position (symbol + optional percent or qty) */
  closePosition: async (connectionId: string, payload: ClosePositionPayload) => {
    const { data } = await apiClient.post(
      `${BASE}/connections/${connectionId}/close-position`,
      payload
    );
    return data;
  },

  /** API 23 — Square off (cancel open orders for symbol + close position) */
  squareOff: async (connectionId: string, symbol: string) => {
    const { data } = await apiClient.post<SquareOffResponse>(
      `${BASE}/connections/${connectionId}/positions/${symbol}/square-off`
    );
    return data;
  },

  // Note: Binance v1 has no multi-leg, options contracts, or exercise routes.

  // ── Phase J: Internal Order Intents ──────────────────────────────────────

  /** API 29 — Internal order intent (x-internal-token; mode must match connection) */
  submitOrderIntent: async (
    payload: OrderIntentPayload,
    internalToken: string
  ) => {
    const { data } = await apiClient.post(
      "/internal/broker/binance/order-intents",
      payload,
      { headers: { "x-internal-token": internalToken } }
    );
    return data;
  },
};
