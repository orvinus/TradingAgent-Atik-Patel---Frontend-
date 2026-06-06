// src/store/index.ts
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { createAuthSlice, AuthSlice } from "./slices/authSlice";
import { createPortfolioSlice, PortfolioSlice } from "./slices/portfolioSlice";
import { createStrategySlice, StrategySlice } from "./slices/strategySlice";
import { createMarketSlice, MarketSlice } from "./slices/marketSlice";
import { createAlertsSlice, AlertsSlice } from "./slices/alertsSlice";
import { createUiSlice, UiSlice } from "./slices/uiSlice";

export type AppState =
  & AuthSlice
  & PortfolioSlice
  & StrategySlice
  & MarketSlice
  & AlertsSlice
  & UiSlice;

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (...a) => ({
        ...createAuthSlice(...a),
        ...createPortfolioSlice(...a),
        ...createStrategySlice(...a),
        ...createMarketSlice(...a),
        ...createAlertsSlice(...a),
        ...createUiSlice(...a),
      }),
      {
        name: "tradingagents-store",
        // Only persist UI prefs and auth token — never persist live market data
        partialize: (s) => ({
          token:              s.token,
          refreshToken:       s.refreshToken,
          sessionId:          s.sessionId,
          user:               s.user,
          selectedPlan:       s.selectedPlan,
          telegramConnected:  s.telegramConnected,
          discordConnected:   s.discordConnected,
          connectedBrokers:   s.connectedBrokers,
          onboardingComplete: s.onboardingComplete,
          pendingOnboarding:  s.pendingOnboarding,
          role:               s.role,
          permissions:        s.permissions,
          theme:              s.theme,
          sidebarCollapsed:   s.sidebarCollapsed,
        }),
      }
    ),
    { name: "TradingOS" }
  )
);