// src/types/tradeThreads.ts — Trade thread & review queue types (Phase 2 + V2)

export type TradeThreadStatus = "open" | "partial" | "closed" | "cancelled" | "stopped_out" | "stale" | "entry_pending";

export interface TradeThreadMetadata {
  avgEntryPrice?: number | null;
  entryFilledAt?: string | null;
  currentSlPrice?: number | null;
  lastSlAdjustAt?: string | null;
  lastBrokerSyncAt?: string | null;
  brokerPositionQty?: number | null;
}

export interface TradeThread {
  id: string;
  platform: "telegram" | "discord";
  sourceId: string;
  threadKey: string;
  status: TradeThreadStatus;
  instrumentProfile: string | null;
  symbol: string | null;
  contractSymbol: string | null;
  assetClass: string | null;
  entryOrderId: string | null;
  entryTelegramSignalId: string | null;
  entryDiscordSignalId: string | null;
  originalQty: number | null;
  remainingQty: number | null;
  remainingPct: number | null;
  openedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  metadata?: TradeThreadMetadata | null;
}

export interface TpLadderEntry {
  index: number;
  level: number;
  exitPct: number;
  hit: boolean;
}

export interface ThreadState {
  thread: TradeThread;
  tpLadder: TpLadderEntry[];
}

// ── Thread detail (includes orders) ──────────────────────────────────────────
export interface TradeThreadDetail {
  thread: TradeThread;
  orders: import("./copyValidator").CopyOrder[];
}

// ── Thread event / lifecycle log ─────────────────────────────────────────────
export type ThreadEventType =
  | "entry"
  | "update"
  | "partial_exit"
  | "full_exit"
  | "adjust_sl"
  | "update_tp"
  | "stop_loss_hit"
  | "cancel"
  | "reenter"
  | "sync";

export interface ThreadEvent {
  id: string;
  threadId: string;
  eventType: ThreadEventType;
  summary: string | null;
  orderId: string | null;
  signalId: string | null;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
}

// ── Review queue (V2.2) ──────────────────────────────────────────────────────
export type ReviewQueueFlag =
  | "ambiguous_target"
  | "orphan_fill"
  | "low_confidence"
  | "directional_violation"
  | "status_action_mismatch";

export type ReviewQueueStatus = "pending" | "approved" | "rejected" | "expired";

export interface ReviewQueueCandidate {
  threadId: string;
  threadKey: string;
  symbol: string | null;
  remainingPct: number | null;
  openedAt: string | null;
}

export interface ReviewQueueItem {
  id: string;
  status: ReviewQueueStatus;
  flag: ReviewQueueFlag;
  platform: "telegram" | "discord";
  sourceId: string;
  sourceTitle?: string | null;
  signalId: string | null;
  classification: {
    messageType: string | null;
    lifecycleSummary: string | null;
    confidence: number | null;
  };
  candidates: ReviewQueueCandidate[];
  violations: string[];
  rawText: string | null;
  createdAt: string;
  expiresAt: string | null;
}

export interface ReviewQueueListResponse {
  items: ReviewQueueItem[];
  pendingCount: number;
}

// ── Retry / from-signal response ─────────────────────────────────────────────
export interface FromSignalResult {
  success: boolean;
  data: {
    order?: import("./copyValidator").CopyOrder | null;
    thread?: TradeThread | null;
    submitted?: boolean;
    skipped?: boolean;
    reason?: string | null;
    threadKey?: string | null;
    managementAction?: Record<string, unknown> | null;
    summary?: string | null;
    reviewQueued?: boolean;
    idempotentNoop?: boolean;
    closeAll?: boolean;
    count?: number;
    reenter?: boolean;
    results?: Array<{
      op: string;
      submitted?: boolean;
      requiresConfirmation?: boolean;
      cancelled?: boolean;
    }>;
  };
}

// ── Thread sync response ──────────────────────────────────────────────────────
export interface ThreadSyncResponse {
  synced: boolean;
  thread: TradeThread;
}
