// src/lib/themeStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "dark" | "light";

interface ThemeState {
  theme: Theme;
  toggle: () => void;
}

// Helper — keeps the DOM attribute in sync with state
function applyTheme(theme: Theme) {
  if (theme === "light") {
    document.documentElement.setAttribute("data-theme", "light");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "dark",
      toggle: () => {
        const next: Theme = get().theme === "dark" ? "light" : "dark";
        applyTheme(next);   // ← sync DOM immediately on every toggle
        set({ theme: next });
      },
    }),
    {
      name: "theme",   // key in localStorage
      onRehydrateStorage: () => (state) => {
        // When the page loads and zustand rehydrates from localStorage,
        // re-apply the saved theme to the DOM straight away.
        if (state) applyTheme(state.theme);
      },
    }
  )
);