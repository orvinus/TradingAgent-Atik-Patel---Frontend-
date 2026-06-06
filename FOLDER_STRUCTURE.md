src/
├── main.tsx                          # Entry point — React 18 createRoot
├── App.tsx                           # Router setup, QueryClient, WSProvider, Suspense
├── vite-env.d.ts
│
├── styles/
│   └── tokens.css                    # CSS custom properties (colors, radii, fonts)
│
├── router/
│   └── index.tsx                     # createBrowserRouter — all 15 routes + auth guard
│
├── layouts/
│   ├── RootLayout.tsx                # Sidebar + topbar + <Outlet />
│   └── AuthLayout.tsx                # Centered card layout for login/TOTP
│
├── pages/
│   ├── Dashboard/
│   │   └── index.tsx                 # Page 1  — /
│   ├── TradingMode/
│   │   └── index.tsx                 # Page 2  — /mode
│   ├── Strategies/
│   │   └── index.tsx                 # Page 3  — /strategies
│   ├── Brokers/
│   │   └── index.tsx                 # Page 4  — /brokers
│   ├── Backtest/
│   │   └── index.tsx                 # Page 5  — /backtest
│   ├── Risk/
│   │   └── index.tsx                 # Page 6  — /risk
│   ├── News/
│   │   └── index.tsx                 # Page 7  — /news
│   ├── Fundamentals/
│   │   └── index.tsx                 # Page 8  — /fundamentals
│   ├── Alerts/
│   │   └── index.tsx                 # Page 9  — /alerts
│   ├── Admin/
│   │   └── index.tsx                 # Page 10 — /admin
│   ├── Audit/
│   │   └── index.tsx                 # Page 11 — /audit
│   ├── Options/
│   │   └── index.tsx                 # Page 12 — /options/:symbol
│   ├── Discover/
│   │   └── index.tsx                 # Page 13 — /discover
│   ├── Briefing/
│   │   └── index.tsx                 # Page 14 — /briefing
│   ├── LLM/
│   │   └── index.tsx                 # Page 15 — /llm
│   └── Login/
│       └── index.tsx                 # Auth — /login
│
├── components/
│   │
│   ├── ui/                           # Shared primitives (no business logic)
│   │   ├── Button.tsx
│   │   ├── Badge.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   ├── Toast.tsx
│   │   ├── Tabs.tsx
│   │   ├── Table.tsx                 # Wraps @tanstack/react-virtual
│   │   ├── Skeleton.tsx
│   │   ├── Tooltip.tsx
│   │   └── PulseDot.tsx              # Live data indicator
│   │
│   ├── charts/                       # Chart wrappers
│   │   ├── EquityChart.tsx           # Recharts area + drawdown shading
│   │   ├── MiniSparkline.tsx
│   │   ├── MiniCurve.tsx
│   │   └── CandlestickChart.tsx      # lightweight-charts
│   │
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Topbar.tsx
│   │   ├── Breadcrumb.tsx
│   │   └── CommandPalette.tsx        # Cmd+K / Ctrl+K
│   │
│   ├── dashboard/                    # Dashboard-specific panels
│   │   ├── StatCards.tsx
│   │   ├── PortfolioHeatmap.tsx
│   │   ├── StrategyStatusGrid.tsx
│   │   ├── AIAgentPanel.tsx
│   │   ├── OpenPositionsTable.tsx
│   │   └── NewsFeed.tsx
│   │
│   └── ThemeToggle.tsx
│
├── store/
│   ├── index.ts                      # Zustand — composes all slices with devtools + persist
│   ├── slices/
│   │   ├── authSlice.ts              # user, session, TOTP state
│   │   ├── portfolioSlice.ts         # live P&L, positions
│   │   ├── strategySlice.ts          # user strategies
│   │   ├── marketSlice.ts            # subscribed symbols, ticks
│   │   ├── alertsSlice.ts            # in-app notifications
│   │   └── uiSlice.ts                # theme, sidebar, modals
│   └── themeStore.ts                 # Separate persist store for theme
│
├── ws/
│   ├── WSProvider.tsx                # Context provider — mounts WSManager
│   ├── WSManager.ts                  # WebSocket class with reconnect + subscriptions
│   └── topics.ts                     # WS topic string constants
│
├── hooks/
│   ├── useWebSocket.ts               # Subscribe to a WS topic, returns latest message
│   ├── useStaleDetector.ts           # Returns true if lastUpdated > 5s ago
│   ├── useCommandPalette.ts          # Cmd+K open/close + search
│   ├── useVirtualTable.ts            # Wraps @tanstack/react-virtual for big tables
│   └── usePageVisibility.ts          # visibilitychange → throttle WS
│
├── api/
│   ├── client.ts                     # Axios instance — base URL, auth header, interceptors
│   ├── endpoints/
│   │   ├── auth.ts
│   │   ├── portfolio.ts
│   │   ├── strategies.ts
│   │   ├── brokers.ts
│   │   ├── market.ts
│   │   ├── news.ts
│   │   ├── options.ts
│   │   ├── risk.ts
│   │   ├── backtest.ts
│   │   ├── fundamentals.ts
│   │   ├── alerts.ts
│   │   ├── audit.ts
│   │   ├── admin.ts
│   │   └── ui.ts                     # GET /api/v1/ui/preferences, /bootstrap
│   └── queryKeys.ts                  # All TanStack Query key factories
│
├── lib/
│   ├── queryClient.ts                # TanStack QueryClient config + cache strategy
│   ├── themeStore.ts                 # Zustand theme store (persist to localStorage)
│   └── utils.ts                      # cn(), formatCurrency(), formatPct(), etc.
│
├── types/
│   ├── portfolio.ts
│   ├── strategy.ts
│   ├── market.ts
│   ├── broker.ts
│   ├── news.ts
│   ├── options.ts
│   ├── auth.ts
│   └── ws.ts
│
└── constants/
    ├── routes.ts                     # Route path strings
    └── ws.ts                         # WS topic constants (mirrors ws/topics.ts)
