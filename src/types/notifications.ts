// src/types/notifications.ts

export type NotificationProvider = "telegram" | "discord";

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface TelegramConnectLinkResponse {
  provider: "telegram";
  url: string;
  startPayload: string;
  botUsername: string;
}

export interface DiscordConnectLinkResponse {
  provider: "discord";
  url: string;
  state: string;
  scopes: string[];
}

// Backend shape isn't pinned in the doc, so accept the common variants
// (snake_case from the DB layer, or camelCase from a serializer — the live
// API uses `providerType` / `isConnected`).
export interface NotificationConnection {
  id?: string;
  provider?: NotificationProvider;
  providerType?: NotificationProvider;
  provider_type?: NotificationProvider;
  isConnected?: boolean;
  is_connected?: boolean;
  connectedAt?: string | null;
  disconnectedAt?: string | null;
  providerUsername?: string | null;
  providerUserId?: string;
  provider_user_id?: string;
  metadata?: Record<string, unknown>;
  provider_metadata?: Record<string, unknown>;
}

export type ConnectionsListResponse =
  | NotificationConnection[]
  | { connections: NotificationConnection[] };

export interface DisconnectResponse {
  provider: NotificationProvider;
  disconnected: boolean;
}
