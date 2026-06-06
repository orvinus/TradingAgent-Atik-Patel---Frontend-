// src/lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Tailwind class merger
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format currency — always monospace-ready
export function formatCurrency(
  value: number,
  opts: { sign?: boolean; decimals?: number; compact?: boolean } = {}
): string {
  const { sign = false, decimals = 2, compact = false } = opts;
  const abs = Math.abs(value);
  let str: string;

  if (compact && abs >= 1_000_000) {
    str = `$${(abs / 1_000_000).toFixed(1)}M`;
  } else if (compact && abs >= 1_000) {
    str = `$${(abs / 1_000).toFixed(1)}K`;
  } else {
    str = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(abs);
  }

  if (sign && value > 0) return `+${str}`;
  if (value < 0) return `-${str}`;
  return str;
}

// Format percentage
export function formatPct(value: number, sign = true): string {
  const str = `${Math.abs(value).toFixed(2)}%`;
  if (sign && value > 0) return `+${str}`;
  if (value < 0) return `-${str}`;
  return str;
}

// Format timestamp for activity feeds
export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

// P&L color class helper
export function pnlColor(value: number): string {
  if (value > 0) return "text-bull";
  if (value < 0) return "text-bear";
  return "text-text-muted";
}

// Clamp a number between min and max
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}