// src/api/endpoints/brokers.ts
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
  CreateConnectionPayload,
  DeleteConnectionResponse,
  HistoricalBars,
  LatestQuote,
  MarketClock,
  MultiLegOrderPayload,
  OptionsContractsResponse,
  OrderIntentPayload,
  PortfolioHistory,
  ReplaceOrderPayload,
  SquareOffResponse,
  SubmitOrderPayload,
  TestConnectionResponse,
  UpdateSlTpPayload,
  UpdateSlTpResponse,
} from "@/types/broker";

const BASE = "/brokers/alpaca";

export const brokersApi = {
  // ── Phase A: Health & Discovery ──────────────────────────────────────────

  /** API 2 — Broker liveness (no auth) */
  liveness: async () => {
    const { data } = await apiClient.get<BrokerHealthResponse>("/health/broker-alpaca");
    return data;
  },

  /** API 4 — Detailed broker health (no auth) */
  health: async () => {
    const { data } = await apiClient.get<BrokerHealthResponse>("/health");
    return data;
  },

  /** API 5 — Broker catalog */
  catalog: async () => {
    const { data } = await apiClient.get<BrokerCatalogResponse>("/brokers");
    return data;
  },

  // ── Phase B: Connection Lifecycle ─────────────────────────────────────────

  /** API 6 — Create Alpaca connection */
  createConnection: async (payload: CreateConnectionPayload) => {
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

  /** API 12 — Positions */
  getPositions: async (connectionId: string) => {
    const { data } = await apiClient.get<AlpacaPosition[]>(
      `${BASE}/connections/${connectionId}/positions`
    );
    return Array.isArray(data) ? data : [];
  },

  /** API 27 — Capabilities */
  getCapabilities: async (connectionId: string) => {
    const { data } = await apiClient.get<BrokerCapabilities>(
      `${BASE}/connections/${connectionId}/capabilities`
    );
    return data;
  },

  /** API 26 — Portfolio history */
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

  /** API 28 — Latest quote */
  getLatestQuote: async (connectionId: string, symbol: string) => {
    const { data } = await apiClient.get<LatestQuote>(
      `${BASE}/market-data/quotes/latest`,
      { params: { connection_id: connectionId, symbol } }
    );
    return data;
  },

  /** API 29 — Historical bars */
  getBars: async (connectionId: string, symbol: string, days = 5) => {
    const { data } = await apiClient.get<HistoricalBars>(
      `${BASE}/market-data/bars`,
      { params: { connection_id: connectionId, symbol, days } }
    );
    return data;
  },

  /** API 30 — Options contracts */
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

  // ── Phase E: Orders (submit + list + get + fills) ─────────────────────────

  /** API 15 — Submit order */
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

  /** API 21 — Order children (bracket legs) */
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

  /** API 25 — Exercise option (live only; paper often 400) */
  exerciseOption: async (connectionId: string, symbol: string) => {
    const { data } = await apiClient.post(
      `${BASE}/connections/${connectionId}/positions/${symbol}/exercise`
    );
    return data;
  },

  // ── Phase H: Advanced ─────────────────────────────────────────────────────

  /** API 24 — Multi-leg options order */
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

  // API 31 (SSE stream) uses EventSource, not axios — construct the URL with:
  // `${VITE_BACKEND_URL}/api/v1/brokers/alpaca/connections/:id/stream`
  // and attach Authorization via a query param or session cookie as needed.

  // ── Phase J: Internal Order Intents ──────────────────────────────────────

  /** API 32 — Internal order intent (engine/workers; uses x-internal-token, no JWT) */
  submitOrderIntent: async (
    payload: OrderIntentPayload,
    internalToken: string
  ) => {
    const { data } = await apiClient.post(
      "/internal/broker/alpaca/order-intents",
      payload,
      { headers: { "x-internal-token": internalToken } }
    );
    return data;
  },
};
