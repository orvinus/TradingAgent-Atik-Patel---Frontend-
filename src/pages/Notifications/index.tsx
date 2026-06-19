import { useState } from "react";
import { LuLoader, LuBell, LuCheck, LuChevronLeft, LuChevronRight } from "react-icons/lu";
import { useNotificationInbox, useMarkAsRead, useMarkAllRead, NOTIFICATIONS_PAGE_SIZE } from "@/features/notifications/hooks/useNotificationInbox";
import type { InboxItem, NotificationKind, DeliveryStatus, NotificationChannel } from "@/types/notifications";

const KIND_LABELS: Record<NotificationKind, string> = {
  general: "General",
  alert:   "Alert",
  trade:   "Trade",
  system:  "System",
};

const DELIVERY_COLORS: Record<DeliveryStatus, string> = {
  sent:    "text-bull",
  failed:  "text-bear",
  skipped: "text-text-disabled",
  pending: "text-text-muted",
};

const CHANNEL_ICONS: Record<NotificationChannel, string> = {
  platform: "◉",
  telegram: "✈",
  discord:  "◆",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function KindBadge({ kind }: { kind: NotificationKind }) {
  const colors: Record<NotificationKind, string> = {
    alert:   "border-bear/40 text-bear bg-bear/10",
    trade:   "border-bull/40 text-bull bg-bull/10",
    system:  "border-accent-border text-accent bg-accent-subtle",
    general: "border-border-default text-text-secondary bg-bg-elevated",
  };
  return (
    <span className={`rounded-sm border px-1.5 py-0.5 font-mono text-[.55rem] uppercase tracking-[.12em] ${colors[kind]}`}>
      {KIND_LABELS[kind]}
    </span>
  );
}

function NotificationRow({ item, onRead }: { item: InboxItem; onRead: (id: string) => void }) {
  const title = item.title ?? (KIND_LABELS[item.kind] ?? item.kind);
  const unread = !item.isRead;

  return (
    <div
      className={`px-5 py-4 flex items-start gap-4 hover:bg-bg-elevated/50 transition-colors ${unread ? "bg-accent-subtle/20" : ""}`}
    >
      <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${unread ? "bg-accent" : "bg-transparent"}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={`font-mono text-[.75rem] ${unread ? "font-bold text-text-primary" : "text-text-secondary"}`}>
            {title}
          </p>
          <KindBadge kind={item.kind} />
          {item.audienceType === "broadcast" && (
            <span className="rounded-sm border border-border-subtle px-1.5 py-0.5 font-mono text-[.55rem] uppercase tracking-[.12em] text-text-muted">
              Everyone
            </span>
          )}
        </div>
        <p className="mt-1 text-[.72rem] text-text-secondary leading-relaxed">{item.body}</p>
        <div className="mt-1.5 flex items-center gap-3 flex-wrap">
          <span className="font-mono text-[.6rem] text-text-disabled">{formatDate(item.createdAt)}</span>
          {item.deliveries.length > 0 && (
            <div className="flex items-center gap-1.5">
              {item.deliveries.map((d) => (
                <span
                  key={d.channel}
                  title={`${d.channel}: ${d.status}`}
                  className={`font-mono text-[.62rem] ${DELIVERY_COLORS[d.status]}`}
                >
                  {CHANNEL_ICONS[d.channel] ?? d.channel}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      {unread && (
        <button
          onClick={() => onRead(item.id)}
          title="Mark as read"
          className="flex-shrink-0 rounded-sm p-1 text-text-disabled hover:text-accent hover:bg-accent-subtle transition-colors"
        >
          <LuCheck className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="px-5 py-4 flex items-start gap-4">
      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-bg-elevated flex-shrink-0" />
      <div className="flex-1 flex flex-col gap-2">
        <div className="h-3 w-40 rounded bg-bg-elevated animate-pulse" />
        <div className="h-2.5 w-64 rounded bg-bg-elevated animate-pulse" />
        <div className="h-2 w-24 rounded bg-bg-elevated animate-pulse" />
      </div>
    </div>
  );
}

export default function Notifications() {
  const [page, setPage] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [kindFilter, setKindFilter] = useState<NotificationKind | "">("");

  const offset = page * NOTIFICATIONS_PAGE_SIZE;
  const { data, isLoading, isFetching, error, refetch } = useNotificationInbox(offset, unreadOnly);
  const markRead = useMarkAsRead();
  const markAll = useMarkAllRead();

  const rawItems = data?.items ?? [];
  const items = kindFilter
    ? rawItems.filter((i) => i.kind === kindFilter)
    : rawItems;
  const hasMore = data?.hasMore ?? false;

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LuBell className="h-5 w-5 text-accent" />
          <h1 className="font-display text-base font-bold uppercase tracking-[.16em] text-text-primary">
            Notifications
          </h1>
          {isFetching && <LuLoader className="h-3.5 w-3.5 animate-spin text-text-disabled" />}
        </div>
        <button
          onClick={() => markAll.mutate()}
          disabled={markAll.isPending}
          className="flex items-center gap-1.5 rounded-sm border border-border-default bg-bg-elevated px-3 py-1.5 font-mono text-[.62rem] uppercase tracking-[.14em] text-text-secondary transition-colors hover:border-border-subtle hover:text-text-primary disabled:opacity-50"
        >
          {markAll.isPending ? <LuLoader className="h-3 w-3 animate-spin" /> : <LuCheck className="h-3 w-3" />}
          Mark all read
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <label className="flex items-center gap-1.5 cursor-pointer font-mono text-[.65rem] text-text-secondary">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => { setUnreadOnly(e.target.checked); setPage(0); }}
            className="rounded-sm border-border-default bg-bg-elevated accent-accent h-3.5 w-3.5"
          />
          Unread only
        </label>
        <select
          value={kindFilter}
          onChange={(e) => { setKindFilter(e.target.value as NotificationKind | ""); setPage(0); }}
          className="rounded-sm border border-border-default bg-bg-elevated px-2.5 py-1 font-mono text-[.65rem] text-text-secondary focus:border-accent focus:outline-none"
        >
          <option value="">All kinds</option>
          {(["general", "alert", "trade", "system"] as NotificationKind[]).map((k) => (
            <option key={k} value={k}>{KIND_LABELS[k]}</option>
          ))}
        </select>
      </div>

      {/* List */}
      <div className="rounded-lg border border-border-subtle bg-bg-surface overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-border-subtle">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 p-10 text-center">
            <p className="font-mono text-[.7rem] text-bear">Failed to load notifications.</p>
            <button
              onClick={() => refetch()}
              className="rounded-sm border border-border-default bg-bg-elevated px-3 py-1.5 font-mono text-[.62rem] uppercase tracking-[.14em] text-text-secondary hover:text-text-primary transition-colors"
            >
              Retry
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-12 text-center">
            <LuBell className="h-8 w-8 text-border-default" />
            <p className="font-mono text-[.7rem] uppercase tracking-[.12em] text-text-muted">
              {unreadOnly ? "No unread notifications." : "You're all caught up."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {items.map((item) => (
              <NotificationRow
                key={item.id}
                item={item}
                onRead={(id) => markRead.mutate(id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && !error && (page > 0 || hasMore) && (
        <div className="flex items-center justify-center gap-4 font-mono text-[.65rem] text-text-muted">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="flex items-center gap-1 rounded-sm border border-border-default bg-bg-elevated px-2.5 py-1.5 transition-colors hover:border-border-subtle hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <LuChevronLeft className="h-3.5 w-3.5" /> Prev
          </button>
          <span>Page {page + 1}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasMore}
            className="flex items-center gap-1 rounded-sm border border-border-default bg-bg-elevated px-2.5 py-1.5 transition-colors hover:border-border-subtle hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next <LuChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
