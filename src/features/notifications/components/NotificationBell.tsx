import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuBell, LuCheck, LuLoader } from "react-icons/lu";
import { useAppStore } from "@/store/index";
import { useUnreadCount } from "../hooks/useUnreadCount";
import { useMarkAsRead, useNotificationPreview } from "../hooks/useNotificationInbox";
import type { InboxItem } from "@/types/notifications";
import { ROUTES } from "@/constants/routes";

function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function NotificationRow({ item, onRead }: { item: InboxItem; onRead: (id: string) => void }) {
  const title = item.title ?? item.kind.charAt(0).toUpperCase() + item.kind.slice(1);
  const unread = !item.isRead;

  return (
    <button
      onClick={() => onRead(item.id)}
      className="w-full text-left px-4 py-3 hover:bg-bg-elevated transition-colors flex items-start gap-3"
    >
      {unread && (
        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
      )}
      {!unread && <span className="mt-1.5 w-1.5 h-1.5 flex-shrink-0" />}
      <div className="min-w-0 flex-1">
        <p className={`font-mono text-[.7rem] truncate ${unread ? "font-bold text-text-primary" : "text-text-secondary"}`}>
          {title}
        </p>
        <p className="font-mono text-[.63rem] text-text-muted truncate mt-0.5">{item.body}</p>
        <p className="font-mono text-[.58rem] text-text-disabled mt-0.5">{relativeTime(item.createdAt)}{unread ? " · unread" : ""}</p>
      </div>
    </button>
  );
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const unreadCount = useAppStore((s) => s.unreadCount);

  useUnreadCount();

  const previewQuery = useNotificationPreview();
  const markRead = useMarkAsRead();

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleRead(id: string) {
    markRead.mutate(id);
  }

  const displayCount = unreadCount > 99 ? "99+" : unreadCount > 0 ? String(unreadCount) : null;
  const items = previewQuery.data?.items ?? [];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-1.5 rounded-sm hover:bg-bg-elevated transition-colors"
        aria-label="Notifications"
      >
        <LuBell className="w-4 h-4 text-text-secondary" />
        {displayCount && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-bear text-white text-[.55rem] font-mono flex items-center justify-center px-0.5">
            {displayCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-72 rounded-sm border border-border-subtle bg-bg-surface shadow-card">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-subtle">
            <span className="font-mono text-[.62rem] uppercase tracking-[.14em] text-text-muted">
              Notifications
            </span>
            {previewQuery.isFetching && (
              <LuLoader className="h-3 w-3 animate-spin text-text-disabled" />
            )}
          </div>

          {previewQuery.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <LuLoader className="h-4 w-4 animate-spin text-text-disabled" />
            </div>
          ) : items.length === 0 ? (
            <div className="px-4 py-8 text-center font-mono text-[.65rem] text-text-muted">
              You're all caught up.
            </div>
          ) : (
            <div className="divide-y divide-border-subtle">
              {items.map((item) => (
                <NotificationRow key={item.id} item={item} onRead={handleRead} />
              ))}
            </div>
          )}

          <div className="border-t border-border-subtle">
            <button
              onClick={() => {
                setOpen(false);
                navigate(ROUTES.NOTIFICATIONS);
              }}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 font-mono text-[.62rem] uppercase tracking-[.12em] text-accent hover:bg-accent-subtle transition-colors"
            >
              <LuCheck className="h-3 w-3" />
              Show all
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
