import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
 
export function useVirtualTable<T>(rows: T[], estimateSize = 36) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan: 10,
  });
  return { parentRef, virtualizer };
}
 