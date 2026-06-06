// src/components/ui/Toast.tsx
//
// Toast notifications for app-wide feedback.
//   import { toast } from "@/components/ui/Toast";
//   toast.success("Saved");
//   toast.error("Login failed");
//   toast.info("Heads up");
//   toast.warning("Careful");
//
// Mount <ToastViewport /> once near the app root (already done in App.tsx).
//
import { useEffect, useState } from "react";
import { create } from "zustand";
import {
  LuCircleCheck,
  LuCircleX,
  LuCircleAlert,
  LuInfo,
  LuX,
} from "react-icons/lu";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "info" | "warning";

interface ToastItemModel {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
}

interface ToastStore {
  toasts: ToastItemModel[];
  push: (t: ToastItemModel) => void;
  remove: (id: string) => void;
}

const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (t) => set((s) => ({ toasts: [...s.toasts, t] })),
  remove: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

let nextId = 0;
function fire(variant: ToastVariant, message: string, duration: number) {
  const id = `t-${++nextId}`;
  useToastStore.getState().push({ id, message, variant, duration });
  return id;
}

export const toast = {
  success: (message: string, duration = 3500) =>
    fire("success", message, duration),
  error: (message: string, duration = 5000) =>
    fire("error", message, duration),
  info: (message: string, duration = 3500) =>
    fire("info", message, duration),
  warning: (message: string, duration = 4500) =>
    fire("warning", message, duration),
  dismiss: (id: string) => useToastStore.getState().remove(id),
};

// ── Viewport ──────────────────────────────────────────────────────────────

export function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed top-4 right-4 z-[1000] flex w-[min(92vw,22rem)] flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}

// ── Per-toast item ────────────────────────────────────────────────────────

const VARIANT_STYLES: Record<
  ToastVariant,
  { ring: string; bar: string; iconColor: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  success: {
    ring: "border-bull/30",
    bar: "bg-bull",
    iconColor: "text-bull",
    Icon: LuCircleCheck,
  },
  error: {
    ring: "border-bear/30",
    bar: "bg-bear",
    iconColor: "text-bear",
    Icon: LuCircleX,
  },
  info: {
    ring: "border-info/30",
    bar: "bg-info",
    iconColor: "text-info",
    Icon: LuInfo,
  },
  warning: {
    ring: "border-warning/30",
    bar: "bg-warning",
    iconColor: "text-warning",
    Icon: LuCircleAlert,
  },
};

function ToastItem({ toast: t }: { toast: ToastItemModel }) {
  const remove = useToastStore((s) => s.remove);
  const { ring, bar, iconColor, Icon } = VARIANT_STYLES[t.variant];

  const [mounted, setMounted] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const f = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(f);
  }, []);

  useEffect(() => {
    if (t.duration <= 0) return;
    const timer = window.setTimeout(() => {
      setLeaving(true);
      window.setTimeout(() => remove(t.id), 220);
    }, t.duration);
    return () => window.clearTimeout(timer);
  }, [t.id, t.duration, remove]);

  function dismiss() {
    setLeaving(true);
    window.setTimeout(() => remove(t.id), 220);
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-sm border bg-bg-surface pl-4 pr-2 py-3 shadow-card transition-all duration-200 ease-out",
        ring,
        mounted && !leaving
          ? "translate-x-0 opacity-100"
          : "translate-x-3 opacity-0",
      )}
    >
      {/* Variant accent stripe */}
      <span className={cn("absolute left-0 top-0 h-full w-0.5", bar)} />

      <Icon className={cn("mt-0.5 h-4 w-4 flex-shrink-0", iconColor)} />

      <p className="flex-1 pr-1 font-mono text-[.72rem] leading-[1.35] text-text-primary">
        {t.message}
      </p>

      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss notification"
        className="flex-shrink-0 rounded-sm p-1 text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-secondary"
      >
        <LuX className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
