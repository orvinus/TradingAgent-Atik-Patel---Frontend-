// src/pages/CopyTrading/index.tsx
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { LuLoader, LuWifiOff } from "react-icons/lu";
import { copyTradingApi } from "@/api/endpoints/copyTrading";
import { discordCopierApi } from "@/api/endpoints/discordCopyTrading";
import { discordSelfCopierApi } from "@/api/endpoints/discordSelfCopyTrading";
import { twitterCopierApi } from "@/api/endpoints/twitterCopyTrading";
import { qk } from "@/api/queryKeys";
import { ROUTES } from "@/constants/routes";

function StatusDot() {
  return (
    <span className="relative flex h-1.5 w-1.5">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-bull opacity-75" />
      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-bull" />
    </span>
  );
}

interface ProviderCardProps {
  icon: string;
  label: string;
  subtitle: string;
  configured: boolean;
  connected: boolean;
  loading: boolean;
  username: string | null | undefined;
  activeSources: number;
  sourceLabel: string;
  route: string;
}

function ProviderCard({
  icon,
  label,
  subtitle,
  configured,
  connected,
  loading,
  username,
  activeSources,
  sourceLabel,
  route,
}: ProviderCardProps) {
  const navigate = useNavigate();
  const count = typeof activeSources === "number" ? activeSources : 0;

  return (
    <div
      className={`flex flex-col gap-4 rounded-lg border bg-bg-surface p-6 shadow-card ${
        !configured ? "border-border-subtle opacity-50" : "border-border-subtle"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="mb-1 font-mono text-[.58rem] uppercase tracking-[.18em] text-text-disabled">
            Provider
          </div>
          <h2 className="font-display font-bold text-text-primary">{label}</h2>
        </div>
        <span className="text-xl">{icon}</span>
      </div>

      <div className="flex flex-col gap-1">
        {loading ? (
          <div className="flex items-center gap-1.5 font-mono text-[.65rem] text-text-muted">
            <LuLoader className="h-3 w-3 animate-spin" /> Checking status…
          </div>
        ) : connected ? (
          <>
            <div className="flex items-center gap-1.5 font-mono text-[.65rem] text-bull">
              <StatusDot />
              Connected{username != null ? ` · ${username}` : ""}
            </div>
            <div className="font-mono text-[.63rem] text-text-muted">
              {count} {sourceLabel}{count !== 1 ? "s" : ""} active
            </div>
          </>
        ) : (
          <div className="flex items-center gap-1.5 font-mono text-[.65rem] text-text-muted">
            <LuWifiOff className="h-3 w-3" /> Not connected
          </div>
        )}
        <p className="mt-1 font-mono text-[.63rem] text-text-disabled">{subtitle}</p>
      </div>

      <button
        onClick={() => navigate(route)}
        disabled={!configured}
        className="mt-auto rounded-sm border border-accent py-2 font-mono text-[.65rem] uppercase tracking-widest text-accent transition-colors hover:bg-accent hover:text-bg-base disabled:cursor-not-allowed disabled:opacity-40"
      >
        {connected ? "Manage →" : "Connect →"}
      </button>
    </div>
  );
}

export default function CopyTrading() {
  const navigate = useNavigate();

  // ── Telegram ─────────────────────────────────────────────────────────────
  const tgConfigQuery = useQuery({
    queryKey: qk.copyTradingConfig(),
    queryFn: copyTradingApi.getConfig,
  });
  const tgStatusQuery = useQuery({
    queryKey: qk.copyTradingStatus(),
    queryFn: copyTradingApi.getStatus,
    enabled: tgConfigQuery.data?.telegramConfigured !== false,
  });
  const tgSourcesQuery = useQuery({
    queryKey: qk.copyTradingSources(),
    queryFn: copyTradingApi.listSources,
    enabled: tgStatusQuery.data?.connected === true,
  });
  const tgConfigured   = tgConfigQuery.isSuccess ? (tgConfigQuery.data?.telegramConfigured ?? true) : true;
  const tgConnected    = tgStatusQuery.data?.connected ?? false;
  const tgUsername     = tgStatusQuery.data?.account?.username
    ? `@${tgStatusQuery.data.account.username}`
    : undefined;
  const tgActiveCount  = (tgSourcesQuery.data ?? []).filter((s) => s.isActive).length;

  // ── Discord Bot ──────────────────────────────────────────────────────────
  const dcConfigQuery = useQuery({
    queryKey: qk.discordConfig(),
    queryFn: discordCopierApi.getConfig,
  });
  const dcStatusQuery = useQuery({
    queryKey: qk.discordStatus(),
    queryFn: discordCopierApi.getStatus,
    enabled: dcConfigQuery.data?.discordConfigured !== false,
  });
  const dcConfigured   = dcConfigQuery.isSuccess ? (dcConfigQuery.data?.discordConfigured ?? true) : true;
  const dcConnected    = dcStatusQuery.data?.connected ?? false;
  const dcUsername     = dcStatusQuery.data?.username ?? dcStatusQuery.data?.globalName;
  const dcActiveSources = dcStatusQuery.data?.activeSources ?? 0;

  // ── Discord Account (Self) ───────────────────────────────────────────────
  const dcSelfConfigQuery = useQuery({
    queryKey: qk.discordSelfConfig(),
    queryFn: discordSelfCopierApi.getConfig,
  });
  const dcSelfStatusQuery = useQuery({
    queryKey: qk.discordSelfStatus(),
    queryFn: discordSelfCopierApi.getStatus,
    enabled: dcSelfConfigQuery.data?.discordSelfConfigured !== false,
  });
  const dcSelfConfigured   = dcSelfConfigQuery.isSuccess
    ? (dcSelfConfigQuery.data?.discordSelfConfigured ?? true)
    : true;
  const dcSelfConnected    = dcSelfStatusQuery.data?.connected ?? false;
  const dcSelfUsername     = dcSelfStatusQuery.data?.username ?? dcSelfStatusQuery.data?.globalName;
  const dcSelfActiveSources = dcSelfStatusQuery.data?.activeSources ?? 0;

  // ── X (Twitter) ──────────────────────────────────────────────────────────
  const xConfigQuery = useQuery({
    queryKey: qk.twitterConfig(),
    queryFn: twitterCopierApi.getConfig,
  });
  const xStatusQuery = useQuery({
    queryKey: qk.twitterStatus(),
    queryFn: twitterCopierApi.getStatus,
    enabled: xConfigQuery.data?.twitterConfigured !== false,
  });
  const xConfigured    = xConfigQuery.isSuccess ? (xConfigQuery.data?.twitterConfigured ?? true) : true;
  const xConnected     = xStatusQuery.data?.connected ?? false;
  const xHandle        = xStatusQuery.data?.handle ? `@${xStatusQuery.data.handle}` : undefined;
  const xActiveSources = xStatusQuery.data?.activeSources ?? 0;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="font-display text-xl font-bold uppercase tracking-[.12em] text-text-primary">
          Copy Trading Connection
        </h1>
        <p className="mt-1 font-mono text-[.7rem] text-text-muted">
          Connect signal sources to copy trades into TRADING-OS.
        </p>
      </div>

      {tgConfigQuery.isSuccess && !tgConfigured && (
        <div className="rounded-sm border border-bear/30 bg-bear/10 px-4 py-3 font-mono text-[.7rem] text-bear">
          Telegram copy trading is not enabled on this server. Contact your administrator.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ProviderCard
          icon="📱"
          label="Telegram"
          subtitle="Copy channel signals into your platform"
          configured={tgConfigured}
          connected={tgConnected}
          loading={tgStatusQuery.isLoading}
          username={tgUsername}
          activeSources={tgActiveCount}
          sourceLabel="channel"
          route={ROUTES.COPY_TRADING_TELEGRAM}
        />

        <ProviderCard
          icon="🤖"
          label="Discord (Bot)"
          subtitle="Invite bot to your server"
          configured={dcConfigured}
          connected={dcConnected}
          loading={dcStatusQuery.isLoading}
          username={dcUsername}
          activeSources={dcActiveSources}
          sourceLabel="channel"
          route={ROUTES.COPY_TRADING_DISCORD}
        />

        <ProviderCard
          icon="💬"
          label="Discord (Account)"
          subtitle="No bot required"
          configured={dcSelfConfigured}
          connected={dcSelfConnected}
          loading={dcSelfStatusQuery.isLoading}
          username={dcSelfUsername}
          activeSources={dcSelfActiveSources}
          sourceLabel="channel"
          route={ROUTES.COPY_TRADING_DISCORD_ACCOUNT}
        />

        <ProviderCard
          icon="🐦"
          label="X (Twitter)"
          subtitle="Cookie connect · polls every ~5 min"
          configured={xConfigured}
          connected={xConnected}
          loading={xStatusQuery.isLoading}
          username={xHandle}
          activeSources={xActiveSources}
          sourceLabel="source"
          route={ROUTES.COPY_TRADING_X}
        />
      </div>

      {/* ── Live trading ─────────────────────────────────────────────────────── */}
      <div className="mt-2">
        <div className="mb-1 font-mono text-[.58rem] uppercase tracking-[.18em] text-text-disabled">
          Live trading
        </div>
        <p className="mb-3 font-mono text-[.63rem] text-text-muted">
          View incoming signals, active positions, and management orders.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <button
            onClick={() => navigate(ROUTES.COPY_TRADING_SIGNALS)}
            className="flex flex-col gap-2 rounded-lg border border-border-subtle bg-bg-surface p-5 text-left shadow-card transition-colors hover:border-accent/50"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-text-primary">Signal Inbox</h2>
              <span className="text-lg">📨</span>
            </div>
            <p className="font-mono text-[.63rem] text-text-muted">
              All lifecycle messages — entries, updates, partial exits, closes, and SL adjustments.
            </p>
            <span className="mt-1 font-mono text-[.62rem] uppercase tracking-widest text-accent">
              View signals →
            </span>
          </button>

          <button
            onClick={() => navigate(ROUTES.COPY_TRADING_OPEN_TRADES)}
            className="flex flex-col gap-2 rounded-lg border border-border-subtle bg-bg-surface p-5 text-left shadow-card transition-colors hover:border-accent/50"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-text-primary">Open Trades</h2>
              <span className="text-lg">📊</span>
            </div>
            <p className="font-mono text-[.63rem] text-text-muted">
              Trade threads — live position progress, partial fills, and broker sync.
            </p>
            <span className="mt-1 font-mono text-[.62rem] uppercase tracking-widest text-accent">
              View positions →
            </span>
          </button>

          <button
            onClick={() => navigate(ROUTES.COPY_TRADING_REVIEW_QUEUE)}
            className="flex flex-col gap-2 rounded-lg border border-border-subtle bg-bg-surface p-5 text-left shadow-card transition-colors hover:border-accent/50"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-text-primary">Review Queue</h2>
              <span className="text-lg">⚠️</span>
            </div>
            <p className="font-mono text-[.63rem] text-text-muted">
              Ambiguous or low-confidence signals held for human review before execution.
            </p>
            <span className="mt-1 font-mono text-[.62rem] uppercase tracking-widest text-accent">
              Review now →
            </span>
          </button>
        </div>
      </div>

      {/* ── Rules & execution ─────────────────────────────────────────────── */}
      <div className="mt-2">
        <div className="mb-1 font-mono text-[.58rem] uppercase tracking-[.18em] text-text-disabled">
          Rules &amp; execution
        </div>
        <p className="mb-3 font-mono text-[.63rem] text-text-muted">
          Control how parsed signals turn into orders — apply risk limits and choose auto vs. manual confirmation.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <button
            onClick={() => navigate(ROUTES.COPY_TRADING_VALIDATOR)}
            className="flex flex-col gap-2 rounded-lg border border-border-subtle bg-bg-surface p-5 text-left shadow-card transition-colors hover:border-accent/50"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-text-primary">Validation &amp; Limits</h2>
              <span className="text-lg">🛡️</span>
            </div>
            <p className="font-mono text-[.63rem] text-text-muted">
              Auto-copy signals exactly, or apply per-field rules (SL/TP %, lot size caps) and reject or clamp on violation.
            </p>
            <span className="mt-1 font-mono text-[.62rem] uppercase tracking-widest text-accent">
              Configure rules →
            </span>
          </button>

          <button
            onClick={() => navigate(ROUTES.COPY_TRADING_ORDERS)}
            className="flex flex-col gap-2 rounded-lg border border-border-subtle bg-bg-surface p-5 text-left shadow-card transition-colors hover:border-accent/50"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-text-primary">Order Settings</h2>
              <span className="text-lg">⚡</span>
            </div>
            <p className="font-mono text-[.63rem] text-text-muted">
              Pick a broker connection, choose auto-submit or manual confirm. Applies to entry and management exit orders.
            </p>
            <span className="mt-1 font-mono text-[.62rem] uppercase tracking-widest text-accent">
              Manage orders →
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
