import { StateCreator } from "zustand";
import { AppState } from "../index";
 
export interface Position {
  symbol: string;
  side: "LONG" | "SHORT";
  qty: number;
  entry: number;
  current: number;
  pnl: number;
  pnlPct: number;
}
 
export interface PortfolioSlice {
  equity: number;
  dailyPnl: number;
  positions: Position[];
  lastUpdated: number | null;
  setEquity: (equity: number) => void;
  setDailyPnl: (pnl: number) => void;
  setPositions: (positions: Position[]) => void;
  updateLastUpdated: () => void;
}
 
export const createPortfolioSlice: StateCreator<AppState, [], [], PortfolioSlice> = (set) => ({
  equity: 0,
  dailyPnl: 0,
  positions: [],
  lastUpdated: null,
  setEquity: (equity) => set({ equity }),
  setDailyPnl: (dailyPnl) => set({ dailyPnl }),
  setPositions: (positions) => set({ positions }),
  updateLastUpdated: () => set({ lastUpdated: Date.now() }),
});
 