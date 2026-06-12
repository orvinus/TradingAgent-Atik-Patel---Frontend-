import { StateCreator } from "zustand";
import { AppState } from "../index";
 
export interface UiSlice {
  theme: "dark" | "light";
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  unreadCount: number;
  toggleTheme: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  setCommandPaletteOpen: (v: boolean) => void;
  setUnreadCount: (count: number) => void;
}

export const createUiSlice: StateCreator<AppState, [], [], UiSlice> = (set) => ({
  theme: "dark",
  sidebarCollapsed: false,
  commandPaletteOpen: false,
  unreadCount: 0,
  toggleTheme: () =>
    set((s) => {
      const next = s.theme === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next === "light" ? "light" : "");
      return { theme: next };
    }),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
  setUnreadCount: (unreadCount) => set({ unreadCount }),
});