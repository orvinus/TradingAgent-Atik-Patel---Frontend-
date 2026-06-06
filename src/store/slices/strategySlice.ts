// src/store/slices/strategySlice.ts
import { StateCreator } from "zustand";
import { AppState } from "../index";
 
export interface Strategy {
  id: string;
  name: string;
  status: "ACTIVE" | "PAUSED" | "STOPPED";
  pnl: number;
  trades: number;
}
 
export interface StrategySlice {
  strategies: Strategy[];
  setStrategies: (strategies: Strategy[]) => void;
}
 
export const createStrategySlice: StateCreator<AppState, [], [], StrategySlice> = (set) => ({
  strategies: [],
  setStrategies: (strategies) => set({ strategies }),
});
 