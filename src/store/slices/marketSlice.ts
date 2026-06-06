import { StateCreator } from "zustand";
import { AppState } from "../index";
 
export interface Tick {
  symbol: string;
  price: number;
  change: number;
  changePct: number;
  ts: number;
}
 
export interface MarketSlice {
  ticks: Record<string, Tick>;
  subscribedSymbols: string[];
  setTick: (tick: Tick) => void;
  subscribeSymbol: (symbol: string) => void;
  unsubscribeSymbol: (symbol: string) => void;
}
 
export const createMarketSlice: StateCreator<AppState, [], [], MarketSlice> = (set) => ({
  ticks: {},
  subscribedSymbols: [],
  setTick: (tick) =>
    set((s) => ({ ticks: { ...s.ticks, [tick.symbol]: tick } })),
  subscribeSymbol: (symbol) =>
    set((s) => ({ subscribedSymbols: [...new Set([...s.subscribedSymbols, symbol])] })),
  unsubscribeSymbol: (symbol) =>
    set((s) => ({ subscribedSymbols: s.subscribedSymbols.filter((s) => s !== symbol) })),
});