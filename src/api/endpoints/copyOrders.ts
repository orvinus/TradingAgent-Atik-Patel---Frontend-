// src/api/endpoints/copyOrders.ts
import { apiClient } from "@/api/client";
import type {
  CopyOrder,
  CopyOrderStatus,
  CreateFromSignalBody,
  OrderBroker,
  OrderEdits,
  OrderSettings,
} from "@/types/copyValidator";

function unwrap<T = unknown>(body: unknown): T {
  if (body && typeof body === "object" && "data" in (body as Record<string, unknown>)) {
    return (body as { data: T }).data;
  }
  return body as T;
}

const BASE = "/copy-trading/orders";

export const copyOrdersApi = {
  // ── Settings ───────────────────────────────────────────────────────────────
  getSettings: async (): Promise<OrderSettings> => {
    const { data } = await apiClient.get(`${BASE}/settings`);
    const d = unwrap<{ settings?: OrderSettings } & OrderSettings>(data);
    return (d?.settings ?? d) as OrderSettings;
  },

  updateSettings: async (body: Partial<OrderSettings>): Promise<OrderSettings> => {
    const { data } = await apiClient.put(`${BASE}/settings`, body);
    const d = unwrap<{ settings?: OrderSettings } & OrderSettings>(data);
    return (d?.settings ?? d ?? body) as OrderSettings;
  },

  // GET /orders/brokers — { success, data: { brokers: [{ id, name, available, connections: [...] }] } }
  listBrokers: async (): Promise<OrderBroker[]> => {
    const { data } = await apiClient.get(`${BASE}/brokers`);
    const d = unwrap<unknown>(data);
    if (Array.isArray(d)) return d as OrderBroker[];
    return (d as { brokers?: OrderBroker[] })?.brokers ?? [];
  },

  // ── Orders ───────────────────────────────────────────────────────────────
  list: async (params?: { status?: CopyOrderStatus; limit?: number }): Promise<CopyOrder[]> => {
    const { data } = await apiClient.get(`${BASE}/list`, { params });
    const d = unwrap<unknown>(data);
    if (Array.isArray(d)) return d as CopyOrder[];
    return (d as { orders?: CopyOrder[] })?.orders ?? [];
  },

  get: async (id: string): Promise<CopyOrder> => {
    const { data } = await apiClient.get(`${BASE}/${encodeURIComponent(id)}`);
    const d = unwrap<{ order?: CopyOrder } & CopyOrder>(data);
    return (d?.order ?? d) as CopyOrder;
  },

  patch: async (id: string, edits: OrderEdits): Promise<CopyOrder> => {
    const { data } = await apiClient.patch(`${BASE}/${encodeURIComponent(id)}`, edits);
    const d = unwrap<{ order?: CopyOrder } & CopyOrder>(data);
    return (d?.order ?? d) as CopyOrder;
  },

  confirm: async (id: string, userEdits?: OrderEdits): Promise<CopyOrder> => {
    const hasEdits = userEdits && Object.keys(userEdits).length > 0;
    const { data } = await apiClient.post(
      `${BASE}/${encodeURIComponent(id)}/confirm`,
      hasEdits ? { userEdits } : {},
    );
    const d = unwrap<{ order?: CopyOrder } & CopyOrder>(data);
    return (d?.order ?? d) as CopyOrder;
  },

  cancel: async (id: string): Promise<CopyOrder> => {
    const { data } = await apiClient.post(`${BASE}/${encodeURIComponent(id)}/cancel`, {});
    const d = unwrap<{ order?: CopyOrder } & CopyOrder>(data);
    return (d?.order ?? d) as CopyOrder;
  },

  createFromSignal: async (body: CreateFromSignalBody): Promise<CopyOrder> => {
    const { data } = await apiClient.post(`${BASE}/from-signal`, body);
    const d = unwrap<{ order?: CopyOrder } & CopyOrder>(data);
    return (d?.order ?? d) as CopyOrder;
  },
};
