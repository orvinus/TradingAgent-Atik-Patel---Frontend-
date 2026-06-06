import { StateCreator } from "zustand";
import { AppState } from "../index";
 
export interface UiSlice {
  theme: "dark" | "light";
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  toggleTheme: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  setCommandPaletteOpen: (v: boolean) => void;
}
 
export const createUiSlice: StateCreator<AppState, [], [], UiSlice> = (set) => ({
  theme: "dark",
  sidebarCollapsed: false,
  commandPaletteOpen: false,
  toggleTheme: () =>
    set((s) => {
      const next = s.theme === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next === "light" ? "light" : "");
      return { theme: next };
    }),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
});