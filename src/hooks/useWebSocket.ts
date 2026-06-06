import { useEffect, useRef, useState } from "react";
import { useWS } from "@/ws/WSProvider";
 
export function useWebSocket<T = any>(topic: string | null) {
  const ws = useWS();
  const [data, setData] = useState<T | null>(null);
  const [lastTs, setLastTs] = useState<number | null>(null);
 
  useEffect(() => {
    if (!topic) return;
    const unsub = ws.subscribe(topic, (msg: T) => {
      setData(msg);
      setLastTs(Date.now());
    });
    return unsub;
  }, [topic, ws]);
 
  return { data, lastTs };
}
 