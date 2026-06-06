// src/components/ThemeToggle.tsx
import { useThemeStore } from "@/store/themeStore";
import { LuSun, LuMoon } from "react-icons/lu";

export function ThemeToggle() {
  const { theme, toggle } = useThemeStore();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="relative inline-flex items-center w-14 h-7 rounded-full border border-border-default bg-bg-elevated cursor-pointer flex-shrink-0 transition-colors duration-300 hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {/* Sliding pill */}
      <span
        className={`absolute top-[3px] w-5 h-5 rounded-full bg-accent shadow-sm transition-transform duration-300 ease-[cubic-bezier(.34,1.56,.64,1)] ${
          isDark ? "translate-x-[3px]" : "translate-x-[31px]"
        }`}
      />

      {/* Icons */}
      <span className="absolute inset-0 flex items-center justify-between px-[6px] pointer-events-none">
        <LuMoon
          className={`w-3.5 h-3.5 text-white transition-all duration-300 ${
            isDark
              ? "opacity-100 scale-100 rotate-0"
              : "opacity-30 scale-75 -rotate-12"
          }`}
        />
        <LuSun
          className={`w-3.5 h-3.5 text-bg-base transition-all duration-300 ${
            isDark
              ? "opacity-30 scale-75 rotate-12"
              : "opacity-100 scale-100 rotate-0"
          }`}
        />
      </span>
    </button>
  );
}