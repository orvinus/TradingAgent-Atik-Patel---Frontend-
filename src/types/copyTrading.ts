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

// ── Lifecycle / Phase 0 ─────────────────────────────────────────────────────
export type SignalMessageType =
  | "new_entry"
  | "commentary"
  | "partial_exit"
  | "full_exit"
  | "adjust_sl"
  | "noise";

export type ModActionOp =
  | "open_order"
  | "take_profit_hit"
  | "close_partial"
  | "close_full"
  | "close_all"
  | "move_sl_breakeven"
  | "set_sl"
  | "update_tp"
  | "stop_loss_hit"
  | "cancel_order"
  | "reenter"
  | "order_triggered"
  | "scale_in";

export interface ModAction {
  op: ModActionOp;
  tp_index?: number | null;
  exit_pct?: number | null;
  new_sl_price?: number | null;
  new_tp_price?: number | null;
  confidence: number;
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
  // Lifecycle (Phase 0)
  message_type?: SignalMessageType | null;
  lifecycle_summary?: string | null;
  thread_key?: string | null;
  exit_pct?: number | null;
  reference_price?: number | null;
  asset_class?: string | null;
  strike?: number | null;
  expiry?: string | null;
  // V2 classification
  mod_actions?: ModAction[] | null;
  mod_action_labels?: string[] | null;
  primary_mod_op?: ModActionOp | null;
  link_method?: string | null;
  link_confidence?: number | null;
  scope_hint?: "single" | "channel" | null;
  setup_ref?: string | null;
  tp_index?: number | null;
  action_confidence?: number | null;
}

// Signal summary from GET /signals/:id/summary
export interface SignalSummary {
  parseable: boolean;
  messageType: SignalMessageType | null;
  threadKey: string | null;
  exitPct: number | null;
  referencePrice: number | null;
  lifecycleSummary: string | null;
  summary: string | null;
  confidence?: number | null;
  reason?: string | null;
  modActions?: ModAction[] | null;
  modActionLabels?: string[] | null;
  primaryModOp?: ModActionOp | null;
  linkMethod?: string | null;
  linkConfidence?: number | null;
  scopeHint?: "single" | "channel" | null;
  setupRef?: string | null;
  tpIndex?: number | null;
  actionConfidence?: number | null;
}

// Signal thread from GET /signals/:id/thread
export interface SignalThread {
  threadKey: string;
  threadMessages: ParsedSignalRow[];
  channelContext: ParsedSignalRow[];
  summary: {
    messageType: SignalMessageType | null;
    lifecycleSummary: string | null;
  };
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
