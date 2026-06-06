// src/api/endpoints/public.ts
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
  CreatePublicConnectionPayload,
  DeleteConnectionResponse,
  HistoricalBars,
  LatestQuote,
  MarketClock,
  MultiLegOrderPayload,
  OrderIntentPayload,
  OptionsContractsResponse,
  PortfolioHistory,
  ReplaceOrderPayload,
  SquareOffResponse,
  SubmitOrderPayload,
  TestConnectionResponse,
  UpdateSlTpPayload,
  UpdateSlTpResponse,
} from "@/types/broker";

const BASE = "/brokers/public";

export const publicApi = {
  // ── Phase A: Health & Discovery ──────────────────────────────────────────

  liveness: async () => {
    const { data } = await apiClient.get<BrokerHealthResponse>("/health/broker-public");
    return data;
  },

  health: async () => {
    const { data } = await apiClient.get<BrokerHealthResponse>("/health/public");
    return data;
  },

  catalog: async () => {
    const { data } = await apiClient.get<BrokerCatalogResponse>("/brokers");
    return data;
  },

  // ── Phase B: Connection Lifecycle ─────────────────────────────────────────

  /**
   * API 6 — Create Public.com connection (live only)
   * api_key = long-lived secret (not a traditional API key).
   * api_secret is unused — omit or send empty string.
   * account_id is optional; microservice picks first account if omitted.
   */
  createConnection: async (payload: CreatePublicConnectionPayload) => {
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

  /** API 8 — Delete connection (soft delete) */
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

  /** API 11 — Clock (synthesized NYSE schedule) */
  getClock: async (connectionId: string) => {
    const { data } = await apiClient.get<MarketClock>(
      `${BASE}/connections/${connectionId}/clock`
    );
    return data;
  },

  /** API 12 — Positions (equity, crypto, options holdings) */
  getPositions: async (connectionId: string) => {
    const { data } = await apiClient.get<AlpacaPosition[]>(
      `${BASE}/connections/${connectionId}/positions`
    );
    return Array.isArray(data) ? data : [];
  },

  /** API 27 — Capabilities (native_bracket: false, streaming_mode: "rest_poll") */
  getCapabilities: async (connectionId: string) => {
    const { data } = await apiClient.get<BrokerCapabilities>(
      `${BASE}/connections/${connectionId}/capabilities`
    );
    return data;
  },

  /** API 26 — Portfolio history (synthetic; may include _recon: true — treat as approximate) */
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

  /** API 28 — Latest quote (equity: SPY; crypto: BTC-USD) */
  getLatestQuote: async (connectionId: string, symbol: string) => {
    const { data } = await apiClient.get<LatestQuote>(
      `${BASE}/market-data/quotes/latest`,
      { params: { connection_id: connectionId, symbol } }
    );
    return data;
  },

  /** API 29 — Historical bars (may return empty stub if upstream unavailable) */
  getBars: async (connectionId: string, symbol: string, days = 5) => {
    const { data } = await apiClient.get<HistoricalBars>(
      `${BASE}/market-data/bars`,
      { params: { connection_id: connectionId, symbol, days } }
    );
    return data;
  },

  /** API 30 — Options contracts (underlying: SPY; type: call|put; expiration_date_gte optional) */
  getOptionsContracts: async (
    connectionId: string,
    params: {
      underlying: string;
      limit?: number;
      type?: "call" | "put";
      expiration_date_gte?: string;
    }
  ) => {
    const { data } = await apiClient.get<OptionsContractsResponse>(
      `${BASE}/options/contracts`,
      { params: { connection_id: connectionId, ...params } }
    );
    return data;
  },

  // ── Phase E: Orders ───────────────────────────────────────────────────────

  /**
   * API 15 — Submit order
   * Prefer time_in_force: "DAY" — live API often rejects "GTC".
   * Brackets are simulated (MARKET parent + poller-spawned children after fill).
   * Options: symbol = 21-char OCC (SPY260620C00580000), metadata.position_intent = "open"|"close".
   */
  submitOrder: async (connectionId: string, payload: SubmitOrderPayload) => {
    const { data } = await apiClient.post<AlpacaOrder>(
      `${BASE}/connections/${connectionId}/orders`,
      payload
    );
    return data;
  },

  /** API 13 — List orders (pre-market queued orders may not appear until filled/cancelled) */
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

  /** API 14 — Get single order */
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

  /** API 18 — Replace/modify order */
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

  /** API 21 — Order children (real bracket legs after parent fills — not empty like Kraken) */
  getOrderChildren: async (connectionId: string, orderId: string) => {
    const { data } = await apiClient.get<AlpacaOrder[]>(
      `${BASE}/connections/${connectionId}/orders/${orderId}/children`
    );
    return Array.isArray(data) ? data : [];
  },

  /** API 22 — Update SL/TP legs */
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

  /** API 20 — Close position (use `percent`, not `percentage`) */
  closePosition: async (connectionId: string, payload: ClosePositionPayload) => {
    const { data } = await apiClient.post(
      `${BASE}/connections/${connectionId}/close-position`,
      payload
    );
    return data;
  },

  /** API 23 — Square off (cancel open orders + close position) */
  squareOff: async (connectionId: string, symbol: string) => {
    const { data } = await apiClient.post<SquareOffResponse>(
      `${BASE}/connections/${connectionId}/positions/${symbol}/square-off`
    );
    return data;
  },

  /** API 25 — Exercise option (requires options-enabled account) */
  exerciseOption: async (connectionId: string, symbol: string) => {
    const { data } = await apiClient.post(
      `${BASE}/connections/${connectionId}/positions/${symbol}/exercise`
    );
    return data;
  },

  // ── Phase H: Advanced ─────────────────────────────────────────────────────

  /** API 24 — Multi-leg options order (bull_call_spread, iron_condor, etc.) */
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

  // ── Phase J: Internal Order Intents ──────────────────────────────────────

  /** API 32 — Internal order intent (x-internal-token; prefer time_in_force: "DAY") */
  submitOrderIntent: async (
    payload: OrderIntentPayload,
    internalToken: string
  ) => {
    const { data } = await apiClient.post(
      "/internal/broker/public/order-intents",
      payload,
      { headers: { "x-internal-token": internalToken } }
    );
    return data;
  },
};
