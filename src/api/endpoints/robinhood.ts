// src/api/endpoints/robinhood.ts
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
  CreateRobinhoodConnectionPayload,
  DeleteConnectionResponse,
  HistoricalBars,
  LatestQuote,
  MarketClock,
  OrderIntentPayload,
  PortfolioHistory,
  SubmitOrderPayload,
  TestConnectionResponse,
} from "@/types/broker";

const BASE = "/brokers/robinhood";

export const robinhoodApi = {
  // ── Phase A: Health & Discovery ──────────────────────────────────────────

  liveness: async () => {
    const { data } = await apiClient.get<BrokerHealthResponse>("/health/broker-robinhood");
    return data;
  },

  health: async () => {
    const { data } = await apiClient.get<BrokerHealthResponse>("/health/robinhood");
    return data;
  },

  catalog: async () => {
    const { data } = await apiClient.get<BrokerCatalogResponse>("/brokers");
    return data;
  },

  // ── Phase B: Connection Lifecycle ─────────────────────────────────────────

  /**
   * API 6 — Create Robinhood connection (live only)
   * api_key + ed25519_private_key (PEM) for Ed25519 request signing.
   * No notional orders; qty required for all order submissions.
   */
  createConnection: async (payload: CreateRobinhoodConnectionPayload) => {
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

  /** API 10 — Account snapshot (equity/cash may be derived from buying_power) */
  getAccount: async (connectionId: string) => {
    const { data } = await apiClient.get<AlpacaAccount>(
      `${BASE}/connections/${connectionId}/account`
    );
    return data;
  },

  /** API 11 — Clock (always open — crypto 24/7; is_open: true, next_open/close: null) */
  getClock: async (connectionId: string) => {
    const { data } = await apiClient.get<MarketClock>(
      `${BASE}/connections/${connectionId}/clock`
    );
    return data;
  },

  /** API 12 — Positions (crypto holdings; symbol normalised to BASE-USD) */
  getPositions: async (connectionId: string) => {
    const { data } = await apiClient.get<AlpacaPosition[]>(
      `${BASE}/connections/${connectionId}/positions`
    );
    return Array.isArray(data) ? data : [];
  },

  /** API 21 — Capabilities (order_types: market/limit/stop_limit; tif: GTC/IOC; no paper) */
  getCapabilities: async (connectionId: string) => {
    const { data } = await apiClient.get<BrokerCapabilities>(
      `${BASE}/connections/${connectionId}/capabilities`
    );
    return data;
  },

  /** API 20 — Portfolio history (returns empty arrays — do not use for charts) */
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

  /** API 22 — Latest quote (symbol: BTC-USD) */
  getLatestQuote: async (connectionId: string, symbol: string) => {
    const { data } = await apiClient.get<LatestQuote>(
      `${BASE}/market-data/quotes/latest`,
      { params: { connection_id: connectionId, symbol } }
    );
    return data;
  },

  /** API 23 — Historical bars (returns bars: [] stub — use external data for candles) */
  getBars: async (connectionId: string, symbol: string, days = 5) => {
    const { data } = await apiClient.get<HistoricalBars>(
      `${BASE}/market-data/bars`,
      { params: { connection_id: connectionId, symbol, days } }
    );
    return data;
  },

  // ── Phase E: Orders ───────────────────────────────────────────────────────

  /**
   * API 15 — Submit order (crypto only)
   * Constraints: qty required (notional rejected); order_type: market|limit|stop_limit;
   * time_in_force: GTC or IOC; symbol: BASE-USD.
   * Bracket / trailing / notional orders rejected by Node.
   */
  submitOrder: async (connectionId: string, payload: SubmitOrderPayload) => {
    const { data } = await apiClient.post<AlpacaOrder>(
      `${BASE}/connections/${connectionId}/orders`,
      payload
    );
    return data;
  },

  /** API 13 — List orders (status: open | closed | all; limit: 1–500) */
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

  /** API 14 — Get single order (orderId = Robinhood broker_order_id) */
  getOrder: async (connectionId: string, orderId: string) => {
    const { data } = await apiClient.get<AlpacaOrder>(
      `${BASE}/connections/${connectionId}/orders/${orderId}`
    );
    return data;
  },

  /** API 18 — Fills (derived from filled orders; limit: 1–200) */
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

  // Note: APIs 26–30 exist as routes but Robinhood returns 422:
  //   replaceOrder, updateSlTp, submitMultiLegOrder, getOptionsContracts, exerciseOption.
  //   Do not expose these in the UI for Robinhood connections.
  //   No squareOff route — use cancelOrder(s) + closePosition instead.
  //   No getOrderChildren route — Robinhood has no bracket child concept.

  // ── Phase G: Position Actions ─────────────────────────────────────────────

  /**
   * API 19 — Close position (use `percent` for partial close)
   * No squareOff route on Robinhood — cancel orders separately then call this.
   */
  closePosition: async (connectionId: string, payload: ClosePositionPayload) => {
    const { data } = await apiClient.post(
      `${BASE}/connections/${connectionId}/close-position`,
      payload
    );
    return data;
  },

  // ── Phase K: Internal Order Intents ──────────────────────────────────────

  /**
   * API 25 — Internal order intent (x-internal-token; mode: "live"; asset_class: "crypto")
   * Same constraints as API 15: qty only, GTC/IOC, no notional.
   * 503 if BROKER_ROBINHOOD_INTERNAL_TOKEN is unset on Node.
   */
  submitOrderIntent: async (
    payload: OrderIntentPayload,
    internalToken: string
  ) => {
    const { data } = await apiClient.post(
      "/internal/broker/robinhood/order-intents",
      payload,
      { headers: { "x-internal-token": internalToken } }
    );
    return data;
  },
};
