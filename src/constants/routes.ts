// src/constants/routes.ts
export const ROUTES = {
  HOME:         "/",
  MODE:         "/mode",
  STRATEGIES:   "/strategies",
  BROKERS:      "/brokers",
  BACKTEST:     "/backtest",
  RISK:         "/risk",
  NEWS:         "/news",
  FUNDAMENTALS: "/fundamentals",
  ALERTS:       "/alerts",
  ADMIN:        "/admin",
  AUDIT:        "/audit",
  OPTIONS:      (symbol: string) => `/options/${symbol}`,
  DISCOVER:       "/discover",
  BRIEFING:       "/briefing",
  LLM:            "/llm",
  NOTIFICATIONS:  "/notifications",
  SEND_ALERTS:    "/admin/send-alerts",
  LOGIN:          "/login",
} as const;

// Nav items for sidebar — order matches page map from spec.
// `subtitle` = the secondary line shown under the page title in the topbar.
// Use the literal "__live_clock__" sentinel to render a live date/time clock.
export const NAV_ITEMS = [
  { to: ROUTES.HOME,         label: "Dashboard",     icon: "▦", subtitle: "__live_clock__" },
  { to: ROUTES.MODE,         label: "Trading Mode",  icon: "⇄", subtitle: "Select how the platform executes trades on your behalf" },
  { to: ROUTES.STRATEGIES,   label: "Strategies",    icon: "◈", subtitle: "Manage and monitor all deployed trading strategies" },
  { to: ROUTES.BROKERS,      label: "Brokers",       icon: "⬡", subtitle: "Connected brokerage and exchange accounts" },
  { to: ROUTES.BACKTEST,     label: "Backtest",      icon: "◷", subtitle: "Replay strategies against historical data" },
  { to: ROUTES.RISK,         label: "Risk Panel",    icon: "⚠", subtitle: "Live exposure, drawdown, and risk limits" },
  { to: ROUTES.NEWS,         label: "News Feed",     icon: "◉", subtitle: "Real-time market news and headlines" },
  { to: ROUTES.FUNDAMENTALS, label: "Fundamentals",  icon: "◎", subtitle: "Company financials and ratios" },
  { to: ROUTES.ALERTS,       label: "Alerts",        icon: "◆", subtitle: "Triggered notifications and watchlists" },
  { to: ROUTES.OPTIONS,      label: "Options Chain", icon: "⊞", subtitle: "Strikes, greeks, and options analytics" },
  { to: ROUTES.DISCOVER,     label: "Discovery",     icon: "⊹", subtitle: "Find new opportunities across markets" },
  { to: ROUTES.BRIEFING,     label: "Briefing",      icon: "☀", subtitle: "Daily market briefing and outlook" },
  { to: ROUTES.LLM,          label: "LLM Config",    icon: "⊛", subtitle: "Tune the AI models powering the platform" },
  { to: ROUTES.AUDIT,        label: "Audit Trail",   icon: "≡", subtitle: "Every action, signed and timestamped" },
  { to: ROUTES.ADMIN,         label: "Admin",         icon: "⚙", subtitle: "Users, roles, and platform configuration" },
  { to: ROUTES.SEND_ALERTS,   label: "Send Alerts",   icon: "⊟", subtitle: "Dispatch notifications via Telegram, Discord, or platform", adminOnly: true },
  { to: ROUTES.NOTIFICATIONS, label: "Notifications",  icon: "◉", subtitle: "Your notification inbox", hidden: true },
] as const;
