import { useEffect, useState } from "react";
 
export function useStaleDetector(lastTs: number | null, thresholdMs = 5000) {
  const [isStale, setIsStale] = useState(false);
 
  useEffect(() => {
    const check = () => {
      if (!lastTs) { setIsStale(true); return; }
      setIsStale(Date.now() - lastTs > thresholdMs);
    };
    check();
    const id = setInterval(check, 1000);
    return () => clearInterval(id);
  }, [lastTs, thresholdMs]);
 
  return isStale;
}