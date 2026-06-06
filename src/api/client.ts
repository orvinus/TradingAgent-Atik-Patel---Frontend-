// src/lib/queryClient.ts
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Spec: offlineFirst for read-only pages
      networkMode: "offlineFirst",
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
      refetchOnWindowFocus: true,
    },
    mutations: {
      // Write actions queued and retried on reconnect
      networkMode: "offlineFirst",
      retry: 3,
    },
  },
});


// src/api/queryKeys.ts — all TanStack Query key factories
export const qk = {
  // Spec cache: staleTime 30s
  strategies:    ()                   => ["strategies"]               as const,
  strategy:      (id: string)         => ["strategies", id]           as const,

  // Spec cache: staleTime 6h
  fundamentals:  (symbol: string)     => ["fundamentals", symbol]     as const,

  // Spec cache: infinite query, pages of 50, never invalidate
  tradeHistory:  (strategyId?: string) => ["trades", strategyId]      as const,

  // Short-lived
  brokers:       ()                   => ["brokers"]                  as const,
  riskProfile:   (scope: string)      => ["risk", scope]              as const,
  news:          (filter?: string)    => ["news", filter]             as const,
  options:       (symbol: string)     => ["options", symbol]          as const,
  backtest:      (runId: string)      => ["backtest", runId]          as const,
  auditLog:      (page: number)       => ["audit", page]              as const,
  users:         ()                   => ["users"]                    as const,
  alerts:        ()                   => ["alerts"]                   as const,
  llmMatrix:     ()                   => ["llm"]                      as const,
  uiBootstrap:   ()                   => ["ui", "bootstrap"]          as const,
  uiPrefs:       ()                   => ["ui", "prefs"]              as const,
};


// src/api/client.ts
import axios from "axios";

const backendUrl = import.meta.env.VITE_BACKEND_URL ?? "";
const apiPath = import.meta.env.VITE_API_URL ?? "/api/v1";

export const apiClient = axios.create({
  baseURL: `${backendUrl.replace(/\/$/, "")}${apiPath}`,
  headers: {
    "Content-Type": "application/json",
    // Bypass the ngrok-free interstitial (ERR_NGROK_6024) — without this,
    // ngrok returns its HTML "Visit Site" page instead of forwarding to the
    // backend, and axios gets HTML where it expected JSON.
    "ngrok-skip-browser-warning": "true",
  },
});

// Attach auth token from localStorage on every request
apiClient.interceptors.request.use((config) => {
  const stored = localStorage.getItem("tradingagents-store");
  const token = stored ? JSON.parse(stored).state?.token : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, logout
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // Clear store — trigger redirect to /login via router guard
      localStorage.removeItem("tradingagents-store");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);