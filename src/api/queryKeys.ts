// src/api/queryKeys.ts — all TanStack Query key factories

export const qk = {
  // ── Strategies ─────────────────────────────────────────────────────────
  strategies:       ()                    => ["strategies"]                as const,
  strategy:         (id: string)          => ["strategies", id]            as const,

  // ── Fundamentals ───────────────────────────────────────────────────────
  fundamentals:     (symbol: string)      => ["fundamentals", symbol]      as const,

  // ── Trade history ──────────────────────────────────────────────────────
  tradeHistory:     (strategyId?: string) => ["trades", strategyId]        as const,

  // ── Broker catalog & health ────────────────────────────────────────────
  brokers:          ()                    => ["brokers"]                   as const,
  brokerHealth:     ()                    => ["brokers", "health"]         as const,
  brokerLiveness:   ()                    => ["brokers", "liveness"]       as const,
  allConnections:   ()                    => ["brokers", "connections"]    as const,

  // ── Alpaca connections ─────────────────────────────────────────────────
  alpacaConnections: ()                   => ["alpaca", "connections"]     as const,

  // ── Per-connection data (keyed by connectionId) ────────────────────────
  alpacaAccount:    (cid: string)         => ["alpaca", cid, "account"]    as const,
  alpacaClock:      (cid: string)         => ["alpaca", cid, "clock"]      as const,
  alpacaPositions:  (cid: string)         => ["alpaca", cid, "positions"]  as const,
  alpacaCapabilities:(cid: string)        => ["alpaca", cid, "capabilities"] as const,
  alpacaHistory:    (cid: string, period: string, tf: string) =>
                                             ["alpaca", cid, "history", period, tf] as const,

  // ── Orders & fills ─────────────────────────────────────────────────────
  alpacaOrders:     (cid: string, status?: string) =>
                                             ["alpaca", cid, "orders", status ?? "open"] as const,
  alpacaOrder:      (cid: string, oid: string) =>
                                             ["alpaca", cid, "orders", oid] as const,
  alpacaFills:      (cid: string)         => ["alpaca", cid, "fills"]      as const,

  // ── Market data ────────────────────────────────────────────────────────
  alpacaQuote:      (cid: string, symbol: string) =>
                                             ["alpaca", cid, "quote", symbol] as const,
  alpacaBars:       (cid: string, symbol: string, days: number) =>
                                             ["alpaca", cid, "bars", symbol, days] as const,
  alpacaOptions:    (cid: string, underlying: string) =>
                                             ["alpaca", cid, "options", underlying] as const,

  // ── Tradier connections ────────────────────────────────────────────────
  tradierConnections: ()                  => ["tradier", "connections"]    as const,

  // ── Per-connection Tradier data ────────────────────────────────────────
  tradierAccount:   (cid: string)         => ["tradier", cid, "account"]   as const,
  tradierClock:     (cid: string)         => ["tradier", cid, "clock"]     as const,
  tradierPositions: (cid: string)         => ["tradier", cid, "positions"] as const,
  tradierCapabilities:(cid: string)       => ["tradier", cid, "capabilities"] as const,
  tradierHistory:   (cid: string, period: string, tf: string) =>
                                             ["tradier", cid, "history", period, tf] as const,

  // ── Tradier orders & fills ─────────────────────────────────────────────
  tradierOrders:    (cid: string, status?: string) =>
                                             ["tradier", cid, "orders", status ?? "open"] as const,
  tradierOrder:     (cid: string, oid: string) =>
                                             ["tradier", cid, "orders", oid] as const,
  tradierFills:     (cid: string)         => ["tradier", cid, "fills"]     as const,

  // ── Tradier market data ────────────────────────────────────────────────
  tradierQuote:     (cid: string, symbol: string) =>
                                             ["tradier", cid, "quote", symbol] as const,
  tradierBars:      (cid: string, symbol: string, days: number) =>
                                             ["tradier", cid, "bars", symbol, days] as const,
  tradierOptionChains:(cid: string, underlying: string) =>
                                             ["tradier", cid, "option-chains", underlying] as const,

  // ── Robinhood connections ─────────────────────────────────────────────
  robinhoodConnections: ()                => ["robinhood", "connections"]  as const,

  // ── Per-connection Robinhood data ──────────────────────────────────────
  robinhoodAccount:   (cid: string)       => ["robinhood", cid, "account"] as const,
  robinhoodClock:     (cid: string)       => ["robinhood", cid, "clock"]   as const,
  robinhoodPositions: (cid: string)       => ["robinhood", cid, "positions"] as const,
  robinhoodCapabilities:(cid: string)     => ["robinhood", cid, "capabilities"] as const,
  robinhoodHistory:   (cid: string, period: string, tf: string) =>
                                             ["robinhood", cid, "history", period, tf] as const,

  // ── Robinhood orders & fills ───────────────────────────────────────────
  robinhoodOrders:    (cid: string, status?: string) =>
                                             ["robinhood", cid, "orders", status ?? "open"] as const,
  robinhoodOrder:     (cid: string, oid: string) =>
                                             ["robinhood", cid, "orders", oid] as const,
  robinhoodFills:     (cid: string)       => ["robinhood", cid, "fills"]   as const,

  // ── Robinhood market data ──────────────────────────────────────────────
  robinhoodQuote:     (cid: string, symbol: string) =>
                                             ["robinhood", cid, "quote", symbol] as const,
  robinhoodBars:      (cid: string, symbol: string, days: number) =>
                                             ["robinhood", cid, "bars", symbol, days] as const,

  // ── Public.com connections ────────────────────────────────────────────
  publicConnections: ()                   => ["public", "connections"]     as const,

  // ── Per-connection Public.com data ────────────────────────────────────
  publicAccount:     (cid: string)        => ["public", cid, "account"]    as const,
  publicClock:       (cid: string)        => ["public", cid, "clock"]      as const,
  publicPositions:   (cid: string)        => ["public", cid, "positions"]  as const,
  publicCapabilities:(cid: string)        => ["public", cid, "capabilities"] as const,
  publicHistory:     (cid: string, period: string, tf: string) =>
                                             ["public", cid, "history", period, tf] as const,

  // ── Public.com orders & fills ─────────────────────────────────────────
  publicOrders:      (cid: string, status?: string) =>
                                             ["public", cid, "orders", status ?? "open"] as const,
  publicOrder:       (cid: string, oid: string) =>
                                             ["public", cid, "orders", oid] as const,
  publicFills:       (cid: string)        => ["public", cid, "fills"]      as const,

  // ── Public.com market data ────────────────────────────────────────────
  publicQuote:       (cid: string, symbol: string) =>
                                             ["public", cid, "quote", symbol] as const,
  publicBars:        (cid: string, symbol: string, days: number) =>
                                             ["public", cid, "bars", symbol, days] as const,

  // ── Kraken connections ────────────────────────────────────────────────
  krakenConnections: ()                   => ["kraken", "connections"]     as const,

  // ── Per-connection Kraken data ─────────────────────────────────────────
  krakenAccount:     (cid: string)        => ["kraken", cid, "account"]    as const,
  krakenClock:       (cid: string)        => ["kraken", cid, "clock"]      as const,
  krakenPositions:   (cid: string)        => ["kraken", cid, "positions"]  as const,
  krakenCapabilities:(cid: string)        => ["kraken", cid, "capabilities"] as const,
  krakenHistory:     (cid: string, period: string, tf: string) =>
                                             ["kraken", cid, "history", period, tf] as const,

  // ── Kraken orders & fills ──────────────────────────────────────────────
  krakenOrders:      (cid: string, status?: string) =>
                                             ["kraken", cid, "orders", status ?? "open"] as const,
  krakenOrder:       (cid: string, oid: string) =>
                                             ["kraken", cid, "orders", oid] as const,
  krakenFills:       (cid: string)        => ["kraken", cid, "fills"]      as const,

  // ── Kraken market data ─────────────────────────────────────────────────
  krakenQuote:       (cid: string, symbol: string) =>
                                             ["kraken", cid, "quote", symbol] as const,
  krakenBars:        (cid: string, symbol: string, days: number) =>
                                             ["kraken", cid, "bars", symbol, days] as const,

  // ── Coinbase connections ───────────────────────────────────────────────
  coinbaseConnections: ()                 => ["coinbase", "connections"]   as const,

  // ── Per-connection Coinbase data ───────────────────────────────────────
  coinbaseAccount:   (cid: string)        => ["coinbase", cid, "account"]  as const,
  coinbaseClock:     (cid: string)        => ["coinbase", cid, "clock"]    as const,
  coinbasePositions: (cid: string)        => ["coinbase", cid, "positions"] as const,
  coinbaseCapabilities:(cid: string)      => ["coinbase", cid, "capabilities"] as const,
  coinbaseHistory:   (cid: string, period: string, tf: string) =>
                                             ["coinbase", cid, "history", period, tf] as const,

  // ── Coinbase orders & fills ────────────────────────────────────────────
  coinbaseOrders:    (cid: string, status?: string) =>
                                             ["coinbase", cid, "orders", status ?? "open"] as const,
  coinbaseOrder:     (cid: string, oid: string) =>
                                             ["coinbase", cid, "orders", oid] as const,
  coinbaseFills:     (cid: string)        => ["coinbase", cid, "fills"]    as const,

  // ── Coinbase market data ───────────────────────────────────────────────
  coinbaseQuote:     (cid: string, symbol: string) =>
                                             ["coinbase", cid, "quote", symbol] as const,
  coinbaseBars:      (cid: string, symbol: string, days: number) =>
                                             ["coinbase", cid, "bars", symbol, days] as const,

  // ── Binance connections ────────────────────────────────────────────────
  binanceConnections: ()                  => ["binance", "connections"]    as const,

  // ── Per-connection Binance data ────────────────────────────────────────
  binanceAccount:    (cid: string)        => ["binance", cid, "account"]   as const,
  binanceClock:      (cid: string)        => ["binance", cid, "clock"]     as const,
  binancePositions:  (cid: string)        => ["binance", cid, "positions"] as const,
  binanceCapabilities:(cid: string)       => ["binance", cid, "capabilities"] as const,
  binanceHistory:    (cid: string, period: string, tf: string) =>
                                             ["binance", cid, "history", period, tf] as const,

  // ── Binance orders & fills ─────────────────────────────────────────────
  binanceOrders:     (cid: string, status?: string) =>
                                             ["binance", cid, "orders", status ?? "open"] as const,
  binanceOrder:      (cid: string, oid: string) =>
                                             ["binance", cid, "orders", oid] as const,
  binanceFills:      (cid: string)        => ["binance", cid, "fills"]     as const,

  // ── Binance market data ────────────────────────────────────────────────
  binanceQuote:      (cid: string, symbol: string) =>
                                             ["binance", cid, "quote", symbol] as const,
  binanceBars:       (cid: string, symbol: string, days: number) =>
                                             ["binance", cid, "bars", symbol, days] as const,

  // ── Copy Trading (Telegram) ────────────────────────────────────────────
  copyTradingConfig:        ()                           => ["copy-trading", "config"]             as const,
  copyTradingStatus:        ()                           => ["copy-trading", "status"]             as const,
  copyTradingSources:       ()                           => ["copy-trading", "sources"]            as const,
  copyTradingDialogs:       ()                           => ["copy-trading", "dialogs"]            as const,

  // ── Copy Trading (Discord) ─────────────────────────────────────────────
  discordConfig:            ()                           => ["discord-copy", "config"]             as const,
  discordStatus:            ()                           => ["discord-copy", "status"]             as const,
  discordGuilds:            ()                           => ["discord-copy", "guilds"]             as const,
  discordChannels:          (guildId: string)            => ["discord-copy", "channels", guildId]  as const,
  discordSources:           ()                           => ["discord-copy", "sources"]            as const,
  discordInvite:            ()                           => ["discord-copy", "invite"]             as const,

  // ── Copy Trading Validator (risk / limits) ─────────────────────────────
  copyValidatorOptions:     ()                           => ["copy-validator", "options"]          as const,
  copyValidatorConfig:      ()                           => ["copy-validator", "config"]           as const,
  copyValidatorSources:     ()                           => ["copy-validator", "sources"]          as const,
  copyValidatorSource:      (platform: string, sourceId: string) =>
                                                            ["copy-validator", "sources", platform, sourceId] as const,

  // ── Copy Trading Missing Fields ────────────────────────────────────────────
  missingFieldsOptions:     ()                           => ["missing-fields", "options"]          as const,
  missingFieldsConfig:      ()                           => ["missing-fields", "config"]           as const,
  missingFieldsSource:      (platform: string, sourceId: string) =>
                                                            ["missing-fields", "sources", platform, sourceId] as const,

  // ── Copy Trading Orders ─────────────────────────────────────────────────
  copyOrdersSettings:       ()                           => ["copy-orders", "settings"]            as const,
  copyOrdersBrokers:        ()                           => ["copy-orders", "brokers"]             as const,
  copyOrdersList:           (status?: string)            => ["copy-orders", "list", status ?? "all"] as const,
  copyOrder:                (id: string)                 => ["copy-orders", id]                    as const,

  // ── Notifications ──────────────────────────────────────────────────────
  notificationsUnreadCount: ()                           => ["notifications", "unread-count"]     as const,
  notificationsInbox:       (offset: number, unreadOnly: boolean, limit: number) =>
                                                            ["notifications", "inbox", offset, unreadOnly, limit] as const,
  notificationsInboxPreview: ()                           => ["notifications", "inbox", "preview"] as const,

  // ── Other ──────────────────────────────────────────────────────────────
  riskProfile:      (scope: string)       => ["risk", scope]               as const,
  news:             (filter?: string)     => ["news", filter]              as const,
  options:          (symbol: string)      => ["options", symbol]           as const,
  backtest:         (runId: string)       => ["backtest", runId]           as const,
  auditLog:         (page: number)        => ["audit", page]               as const,
  users:            ()                    => ["users"]                     as const,
  alerts:           ()                    => ["alerts"]                    as const,
  llmMatrix:        ()                    => ["llm"]                       as const,
  uiBootstrap:      ()                    => ["ui", "bootstrap"]           as const,
  uiPrefs:          ()                    => ["ui", "prefs"]               as const,
};
