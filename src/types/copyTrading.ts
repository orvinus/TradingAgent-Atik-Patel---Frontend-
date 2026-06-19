// src/types/copyTrading.ts

export interface CopierConfig {
  telegramConfigured: boolean;
  openrouterConfigured: boolean;
  primaryModel: string;
  escalationModel: string;
}

export interface TelegramAccount {
  telegramUserId: string;
  username: string | null;
  phoneLast4: string | null;
  status: string;
  connectedAt: string | null;
}

export interface TelegramStatus {
  connected: boolean;
  live: boolean;
  status: "none" | "logging_in" | "active" | "disconnected";
  account: TelegramAccount | null;
}

export type LoginStartResponse = { status: "code_sent" };

export type LoginCodeResponse =
  | { status: "connected"; account: TelegramAccount }
  | { status: "password_needed" }
  | { status: "pending" };

export interface TelegramDialog {
  chatId: string;
  type: "channel" | "group" | "chat";
  title: string;
  username: string | null;
  isMonitored: boolean;
}

export interface TelegramSource {
  id: string;
  userId: string;
  chatId: string;
  chatType: string;
  title: string;
  username: string | null;
  channelUsername?: string | null;
  isActive: boolean;
  connectedAt: string;
  disconnectedAt: string | null;
  lastMessageId: number | null;
  lastMessageAt: string | null;
  signalsCount: number;
}

export interface CopyParserSignal {
  parseable: boolean;
  symbol: string | null;
  side: "buy" | "sell" | null;
  order_type: string | null;
  limit_price: number | null;
  sl_price: number | null;
  tp_price: number | null;
  parser_confidence: number;
  raw_text: string;
  reason: string | null;
}

export interface ParsedSignalRow {
  id: string;
  sourceId: string;
  chatId: string;
  messageId: number;
  parseable: boolean;
  signal: CopyParserSignal;
  reason: string | null;
  modelUsed: string | null;
  latencyMs: number | null;
  rawText: string | null;
  notificationId: string | null;
  createdAt: string;
}
