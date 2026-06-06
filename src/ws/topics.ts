export const WS_TOPICS = {
  USER_NOTIFICATIONS:    "user.notifications",
  SYSTEM_ANNOUNCEMENTS:  "system.announcements",
  UI_HEARTBEAT:          "ui.heartbeat",
  PORTFOLIO_PNL:         "portfolio.pnl",
  PORTFOLIO_POSITIONS:   "portfolio.positions",
  MARKET_TICK:           (symbol: string) => `market.tick.${symbol}`,
  STRATEGY_STATUS:       (id: string) => `strategy.status.${id}`,
  AGENT_STATUS:          "agent.status",
} as const;