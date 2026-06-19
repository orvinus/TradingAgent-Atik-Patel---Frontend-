// src/api/endpoints/notifications.ts
import { apiClient } from "@/api/client";
import type {
  ApiEnvelope,
  ConnectionsListResponse,
  DisconnectResponse,
  DiscordConnectLinkResponse,
  DispatchBroadcastBody,
  DispatchResponse,
  DispatchUserBody,
  InboxItem,
  InboxListResponse,
  NotificationConnection,
  NotificationProvider,
  TelegramConnectLinkResponse,
  UnreadCountResponse,
} from "@/types/notifications";

export const notificationsApi = {
  getTelegramConnectLink: async () => {
    const { data } = await apiClient.get<ApiEnvelope<TelegramConnectLinkResponse>>(
      "/notifications/telegram/connect-link"
    );
    return data.data;
  },

  getDiscordConnectLink: async () => {
    const { data } = await apiClient.get<ApiEnvelope<DiscordConnectLinkResponse>>(
      "/notifications/discord/connect-link"
    );
    return data.data;
  },

  getConnections: async () => {
    const { data } = await apiClient.get<ApiEnvelope<ConnectionsListResponse>>(
      "/notifications/connections"
    );
    return normalizeConnectionList(data.data);
  },

  disconnectTelegram: async () => {
    const { data } = await apiClient.delete<ApiEnvelope<DisconnectResponse>>(
      "/notifications/telegram/disconnect"
    );
    return data.data;
  },

  disconnectDiscord: async () => {
    const { data } = await apiClient.delete<ApiEnvelope<DisconnectResponse>>(
      "/notifications/discord/disconnect"
    );
    return data.data;
  },

  // ── Inbox ──────────────────────────────────────────────────────────────

  getUnreadCount: async (): Promise<number> => {
    const { data } = await apiClient.get<ApiEnvelope<UnreadCountResponse>>(
      "/notifications/inbox/unread-count"
    );
    return data.data.unreadCount;
  },

  getInbox: async (params: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
  }): Promise<{ items: InboxItem[]; hasMore: boolean }> => {
    const { data } = await apiClient.get<ApiEnvelope<InboxListResponse | InboxItem[]>>(
      "/notifications/inbox",
      { params }
    );
    const limit = params.limit ?? 20;
    const raw = data.data;
    const items: InboxItem[] = Array.isArray(raw) ? raw : (raw.items ?? []);
    const hasMore = items.length === limit;
    return { items, hasMore };
  },

  markAsRead: async (notificationId: string): Promise<void> => {
    await apiClient.post(`/notifications/inbox/${notificationId}/read`);
  },

  // ── Admin dispatch ─────────────────────────────────────────────────────

  adminDispatchToUser: async (body: DispatchUserBody): Promise<DispatchResponse> => {
    const { data } = await apiClient.post<ApiEnvelope<DispatchResponse>>(
      "/notifications/dispatch/user",
      body,
      { headers: dispatchHeaders() }
    );
    return data.data;
  },

  adminDispatchBroadcast: async (body: DispatchBroadcastBody): Promise<DispatchResponse> => {
    const { data } = await apiClient.post<ApiEnvelope<DispatchResponse>>(
      "/notifications/dispatch/broadcast",
      body,
      { headers: dispatchHeaders() }
    );
    return data.data;
  },
};

// ── helpers ───────────────────────────────────────────────────────────────

function dispatchHeaders(): Record<string, string> {
  const key = import.meta.env.VITE_NOTIFICATIONS_DISPATCH_API_KEY as string | undefined;
  return key ? { "X-Notifications-Api-Key": key } : {};
}

function normalizeConnectionList(
  payload: ConnectionsListResponse
): NotificationConnection[] {
  if (Array.isArray(payload)) return payload;
  return payload.connections ?? [];
}

export function findConnection(
  list: NotificationConnection[],
  provider: NotificationProvider
): NotificationConnection | undefined {
  return list.find(
    (c) => (c.provider ?? c.providerType ?? c.provider_type) === provider
  );
}

export function isProviderConnected(
  list: NotificationConnection[],
  provider: NotificationProvider
): boolean {
  const c = findConnection(list, provider);
  if (!c) return false;
  return Boolean(c.isConnected ?? c.is_connected);
}
