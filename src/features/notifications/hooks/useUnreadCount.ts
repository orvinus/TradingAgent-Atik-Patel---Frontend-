import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { notificationsApi } from "@/api/endpoints/notifications";
import { useAppStore } from "@/store/index";
import { qk } from "@/api/queryKeys";

export function useUnreadCount() {
  const setUnreadCount = useAppStore((s) => s.setUnreadCount);

  const query = useQuery({
    queryKey: qk.notificationsUnreadCount(),
    queryFn: notificationsApi.getUnreadCount,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (typeof query.data === "number") {
      setUnreadCount(query.data);
    }
  }, [query.data, setUnreadCount]);

  return query;
}
