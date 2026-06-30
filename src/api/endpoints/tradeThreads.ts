// src/api/endpoints/tradeThreads.ts — Trade threads, review queue, from-signal APIs
import { apiClient } from "@/api/client";
import type {
  TradeThread,
  TradeThreadDetail,
  ThreadEvent,
  ThreadState,
  ThreadSyncResponse,
  ReviewQueueItem,
  ReviewQueueListResponse,
  FromSignalResult,
} from "@/types/tradeThreads";

interface Envelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

const BASE = "/copy-trading";

export const tradeThreadsApi = {
  // ── Thread list ──────────────────────────────────────────────────────────
  list: async (params?: {
    status?: "open" | "partial" | "closed" | "cancelled";
    sourceId?: string;
    limit?: number;
  }): Promise<TradeThread[]> => {
    const { data } = await apiClient.get<Envelope<{ threads: TradeThread[] }>>(
      `${BASE}/threads/list`,
      { params },
    );
    return data.data.threads ?? [];
  },

  // ── Thread detail ────────────────────────────────────────────────────────
  get: async (id: string): Promise<TradeThreadDetail> => {
    const { data } = await apiClient.get<Envelope<TradeThreadDetail>>(
      `${BASE}/threads/${encodeURIComponent(id)}`,
    );
    return data.data;
  },

  // ── Thread state (V2.5) ──────────────────────────────────────────────────
  getState: async (id: string): Promise<ThreadState> => {
    const { data } = await apiClient.get<Envelope<ThreadState>>(
      `${BASE}/threads/${encodeURIComponent(id)}/state`,
    );
    return data.data;
  },

  // ── Thread events / lifecycle log ────────────────────────────────────────
  getEvents: async (id: string, limit = 50): Promise<ThreadEvent[]> => {
    const { data } = await apiClient.get<Envelope<{ events: ThreadEvent[] }>>(
      `${BASE}/threads/${encodeURIComponent(id)}/events`,
      { params: { limit } },
    );
    return data.data.events ?? [];
  },

  // ── Broker sync ──────────────────────────────────────────────────────────
  sync: async (id: string): Promise<ThreadSyncResponse> => {
    const { data } = await apiClient.post<Envelope<ThreadSyncResponse>>(
      `${BASE}/threads/${encodeURIComponent(id)}/sync`,
      {},
    );
    return data.data;
  },

  // ── Retry management execution (exit / adjust_sl / re-entry) ────────────
  fromSignal: async (body: {
    platform: "telegram" | "discord";
    signalId: string;
    forceExecute?: boolean;
    targetThreadId?: string;
  }): Promise<FromSignalResult["data"]> => {
    const { data } = await apiClient.post<FromSignalResult>(
      `${BASE}/threads/from-signal`,
      body,
    );
    return data.data;
  },

  // ── Review queue ─────────────────────────────────────────────────────────
  listReviewQueue: async (params?: {
    status?: "pending" | "approved" | "rejected";
    limit?: number;
  }): Promise<ReviewQueueListResponse> => {
    const { data } = await apiClient.get<Envelope<ReviewQueueListResponse>>(
      `${BASE}/review-queue/list`,
      { params },
    );
    return data.data;
  },

  approveReview: async (
    id: string,
    body: { targetThreadId?: string; targetOrderId?: string; forceExecute?: boolean },
  ): Promise<ReviewQueueItem> => {
    const { data } = await apiClient.post<Envelope<{ item: ReviewQueueItem }>>(
      `${BASE}/review-queue/${encodeURIComponent(id)}/approve`,
      body,
    );
    return data.data.item;
  },

  rejectReview: async (id: string, reason?: string): Promise<ReviewQueueItem> => {
    const { data } = await apiClient.post<Envelope<{ item: ReviewQueueItem }>>(
      `${BASE}/review-queue/${encodeURIComponent(id)}/reject`,
      { reason },
    );
    return data.data.item;
  },
};

// ── Discord variants of signal summary/thread ─────────────────────────────
// Import and re-export from discordSelfCopyTrading or call the discord-user base
import { apiClient as client } from "@/api/client";
import type { SignalSummary, SignalThread } from "@/types/copyTrading";

export const discordSignalApi = {
  getSignalSummary: async (id: string): Promise<SignalSummary> => {
    const { data } = await client.get<Envelope<SignalSummary>>(
      `/discord/user/signals/${encodeURIComponent(id)}/summary`,
    );
    return data.data;
  },
  getSignalThread: async (id: string): Promise<SignalThread> => {
    const { data } = await client.get<Envelope<SignalThread>>(
      `/discord/user/signals/${encodeURIComponent(id)}/thread`,
    );
    return data.data;
  },
};
