import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "@/api/endpoints/notifications";
import { useAppStore } from "@/store/index";
import { qk } from "@/api/queryKeys";

export const NOTIFICATIONS_PAGE_SIZE = 10;
const PREVIEW_SIZE = 3;

export function useNotificationInbox(offset: number, unreadOnly: boolean) {
  return useQuery({
    queryKey: qk.notificationsInbox(offset, unreadOnly, NOTIFICATIONS_PAGE_SIZE),
    queryFn: () =>
      notificationsApi.getInbox({ limit: NOTIFICATIONS_PAGE_SIZE, offset, unreadOnly }),
    placeholderData: (prev) => prev,
  });
}

export function useNotificationPreview() {
  return useQuery({
    queryKey: qk.notificationsInboxPreview(),
    queryFn: () => notificationsApi.getInbox({ limit: PREVIEW_SIZE, offset: 0 }),
  });
}

export function useMarkAsRead() {
  const qc = useQueryClient();
  const setUnreadCount = useAppStore((s) => s.setUnreadCount);
  const unreadCount = useAppStore((s) => s.unreadCount);

  return useMutation({
    mutationFn: notificationsApi.markAsRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      setUnreadCount(Math.max(0, unreadCount - 1));
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  const setUnreadCount = useAppStore((s) => s.setUnreadCount);

  return useMutation({
    mutationFn: async () => {
      let offset = 0;
      const all: string[] = [];
      while (true) {
        const { items, hasMore } = await notificationsApi.getInbox({
          limit: 100,
          offset,
          unreadOnly: true,
        });
        all.push(...items.map((i) => i.id));
        if (!hasMore) break;
        offset += 100;
      }
      await Promise.all(all.map(notificationsApi.markAsRead));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      setUnreadCount(0);
    },
  });
}
