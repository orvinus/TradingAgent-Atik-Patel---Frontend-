// src/types/notifications.ts

export type NotificationProvider = "telegram" | "discord";
export type NotificationKind = "general" | "alert" | "trade" | "system";
export type NotificationChannel = "platform" | "telegram" | "discord";
export type DeliveryStatus = "sent" | "failed" | "skipped" | "pending";

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

// ── Inbox ──────────────────────────────────────────────────────────────────

export interface InboxDelivery {
  channel: NotificationChannel;
  status: DeliveryStatus;
  stats: Record<string, unknown>;
  deliveredAt: string | null;
}

export interface InboxItem {
  id: string;
  title: string | null;
  body: string;
  audienceType: "individual" | "broadcast";
  targetUserId: string | null;
  kind: NotificationKind;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  readAt: string | null;
  isRead: boolean;
  deliveries: InboxDelivery[];
}

export interface InboxListResponse {
  items: InboxItem[];
  total?: number;
  hasMore?: boolean;
}

export interface UnreadCountResponse {
  unreadCount: number;
}

// ── Dispatch ───────────────────────────────────────────────────────────────

export interface DispatchUserBody {
  userId: string;
  title?: string;
  text: string;
  kind?: NotificationKind;
  channels?: NotificationChannel[];
}

export interface DispatchBroadcastBody {
  title?: string;
  text: string;
  kind?: NotificationKind;
  channels?: NotificationChannel[];
}

export interface DispatchDeliveryResult {
  status: DeliveryStatus;
  lastError?: string;
}

export interface DispatchResponse {
  notificationId: string;
  deliveries: Partial<Record<NotificationChannel, DispatchDeliveryResult>>;
}
