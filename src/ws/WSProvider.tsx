 // src/ws/WSProvider.tsx
import { createContext, useContext, useEffect } from "react";
import { wsManager, WSManager } from "./WSManager";
import { useAppStore } from "@/store/index";
 
const WSContext = createContext<WSManager>(wsManager);
export const useWS = () => useContext(WSContext);
 
export function WSProvider({ children }: { children: React.ReactNode }) {
  const token = useAppStore((s) => s.token);
 
  useEffect(() => {
    if (token) {
      wsManager.connect(token);
    }
    return () => wsManager.disconnect();
  }, [token]);
 
  return <WSContext.Provider value={wsManager}>{children}</WSContext.Provider>;
}
 