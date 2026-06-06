// src/layouts/AuthLayout.tsx
import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { useAppStore } from "@/store/index";

export default function AuthLayout() {
  const { theme } = useAppStore();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme === "light" ? "light" : "");
  }, [theme]);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-bg-base font-body text-text-primary transition-colors duration-300">
      {/* Subtle accent glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-accent/5 blur-[120px]" />
        <div className="absolute -bottom-32 right-0 h-[300px] w-[500px] rounded-full bg-accent/5 blur-[100px]" />
      </div>

      <div className="relative z-10 flex min-h-screen w-full flex-col">
        <Outlet />
      </div>
    </div>
  );
}
