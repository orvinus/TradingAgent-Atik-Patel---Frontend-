// src/api/endpoints/notifications.ts
import { apiClient } from "@/api/client";
import type {
  ApiEnvelope,
  ConnectionsListResponse,
  DisconnectResponse,
  DiscordConnectLinkResponse,
  NotificationConnection,
  NotificationProvider,
  TelegramConnectLinkResponse,
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
};

// ── helpers ───────────────────────────────────────────────────────────────

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
