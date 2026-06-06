// src/api/endpoints/kraken.ts
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
  CreateKrakenConnectionPayload,
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
} from "@/types/broker";

const BASE = "/brokers/kraken";

export const krakenApi = {
  // ── Phase A: Health & Discovery ──────────────────────────────────────────

  liveness: async () => {
    const { data } = await apiClient.get<BrokerHealthResponse>("/health/broker-kraken");
    return data;
  },

  health: async () => {
    const { data } = await apiClient.get<BrokerHealthResponse>("/health/kraken");
    return data;
  },

  catalog: async () => {
    const { data } = await apiClient.get<BrokerCatalogResponse>("/brokers");
    return data;
  },

  // ── Phase B: Connection Lifecycle ─────────────────────────────────────────

  /**
   * API 6 — Create Kraken connection (live only)
   * api_secret = base64 private key shown once in Kraken UI.
   * order_class must always be "simple" — bracket/OCO are rejected by Node.
   */
  createConnection: async (payload: CreateKrakenConnectionPayload) => {
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

  /** API 8 — Delete connection (hard delete — same key can be re-linked) */
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

  /** API 11 — Clock (crypto 24/7) */
  getClock: async (connectionId: string) => {
    const { data } = await apiClient.get<MarketClock>(
      `${BASE}/connections/${connectionId}/clock`
    );
    return data;
  },

  /** API 12 — Positions (spot balances; symbol format: BTC/USD) */
  getPositions: async (connectionId: string) => {
    const { data } = await apiClient.get<AlpacaPosition[]>(
      `${BASE}/connections/${connectionId}/positions`
    );
    return Array.isArray(data) ? data : [];
  },

  /** API 13 — Capabilities (asset_classes: ["crypto"], supports_short: false) */
  getCapabilities: async (connectionId: string) => {
    const { data } = await apiClient.get<BrokerCapabilities>(
      `${BASE}/connections/${connectionId}/capabilities`
    );
    return data;
  },

  /** API 14 — Portfolio history (built from Kraken Ledger entries) */
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

  /** API 27 — Latest quote (symbol: BTC/USD) */
  getLatestQuote: async (connectionId: string, symbol: string) => {
    const { data } = await apiClient.get<LatestQuote>(
      `${BASE}/market-data/quotes/latest`,
      { params: { connection_id: connectionId, symbol } }
    );
    return data;
  },

  /** API 28 — Historical bars (OHLC; days 1–365) */
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
   * order_class must be "simple" — bracket/oco/oto rejected at Node.
   * Symbol format: BTC/USD (slash). Notional supported for market orders only.
   */
  submitOrder: async (connectionId: string, payload: SubmitOrderPayload) => {
    const { data } = await apiClient.post<AlpacaOrder>(
      `${BASE}/connections/${connectionId}/orders`,
      payload
    );
    return data;
  },

  /** API 15 — List orders (status: open | closed | all; limit: 1–500) */
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

  /** API 16 — Get single order */
  getOrder: async (connectionId: string, orderId: string) => {
    const { data } = await apiClient.get<AlpacaOrder>(
      `${BASE}/connections/${connectionId}/orders/${orderId}`
    );
    return data;
  },

  /** API 21 — Fills */
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

  /** API 20 — Replace/modify order (uses Kraken EditOrder upstream) */
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

  /** API 18 — Cancel single order */
  cancelOrder: async (connectionId: string, orderId: string) => {
    const { data } = await apiClient.delete<CancelOrderResponse>(
      `${BASE}/connections/${connectionId}/orders/${orderId}`
    );
    return data;
  },

  /** API 19 — Cancel all open orders (superadmin only) */
  cancelAllOrders: async (connectionId: string) => {
    const { data } = await apiClient.delete<CancelAllOrdersResponse>(
      `${BASE}/connections/${connectionId}/orders`
    );
    return data;
  },

  /** API 24 — Order children (always returns [] on Kraken Spot) */
  getOrderChildren: async (connectionId: string, orderId: string) => {
    const { data } = await apiClient.get<AlpacaOrder[]>(
      `${BASE}/connections/${connectionId}/orders/${orderId}/children`
    );
    return Array.isArray(data) ? data : [];
  },

  // Note: No updateSlTp route on Kraken — PATCH .../orders/:id/sl-tp does not exist.

  // ── Phase G: Position Actions ─────────────────────────────────────────────

  /**
   * API 22 — Close position
   * Use `percent` (not `percentage`) for partial percentage close.
   * Symbol format: BTC/USD.
   */
  closePosition: async (connectionId: string, payload: ClosePositionPayload) => {
    const { data } = await apiClient.post(
      `${BASE}/connections/${connectionId}/close-position`,
      payload
    );
    return data;
  },

  /**
   * API 23 — Square off (cancel open orders + close position)
   * URL-encode slash: BTC/USD → BTC%2FUSD in the path.
   */
  squareOff: async (connectionId: string, symbol: string) => {
    const { data } = await apiClient.post<SquareOffResponse>(
      `${BASE}/connections/${connectionId}/positions/${encodeURIComponent(symbol)}/square-off`
    );
    return data;
  },

  // ── Phase J: Internal Order Intents ──────────────────────────────────────

  /** API 31 — Internal order intent (x-internal-token; mode: "live"; order_class: "simple") */
  submitOrderIntent: async (
    payload: OrderIntentPayload,
    internalToken: string
  ) => {
    const { data } = await apiClient.post(
      "/internal/broker/kraken/order-intents",
      payload,
      { headers: { "x-internal-token": internalToken } }
    );
    return data;
  },
};
