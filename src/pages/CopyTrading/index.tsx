// src/pages/CopyTrading/index.tsx
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { LuLoader, LuWifiOff } from "react-icons/lu";
import { copyTradingApi } from "@/api/endpoints/copyTrading";
import { discordCopierApi } from "@/api/endpoints/discordCopyTrading";
import { qk } from "@/api/queryKeys";
import { ROUTES } from "@/constants/routes";

export default function CopyTrading() {
  const navigate = useNavigate();

  // ── Telegram ────────────────────────────────────────────────────────────
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

  const tgConfigured  = tgConfigQuery.isSuccess ? (tgConfigQuery.data?.telegramConfigured ?? true) : true;
  const tgConnected   = tgStatusQuery.data?.connected ?? false;
  const tgAccount     = tgStatusQuery.data?.account;
  const tgActiveCount = (tgSourcesQuery.data ?? []).filter((s) => s.isActive).length;

  // ── Discord ─────────────────────────────────────────────────────────────
  const dcConfigQuery = useQuery({
    queryKey: qk.discordConfig(),
    queryFn: discordCopierApi.getConfig,
  });

  const dcStatusQuery = useQuery({
    queryKey: qk.discordStatus(),
    queryFn: discordCopierApi.getStatus,
    enabled: dcConfigQuery.data?.discordConfigured !== false,
  });

  const dcConfigured  = dcConfigQuery.isSuccess ? (dcConfigQuery.data?.discordConfigured ?? true) : true;
  const dcConnected   = dcStatusQuery.data?.connected ?? false;
  const dcUsername    = dcStatusQuery.data?.username ?? dcStatusQuery.data?.globalName;
  const dcActiveSources = dcStatusQuery.data?.activeSources ?? 0;

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Telegram card */}
        <div
          className={`flex flex-col gap-4 rounded-lg border bg-bg-surface p-6 shadow-card ${
            !tgConfigured ? "border-border-subtle opacity-50" : "border-border-subtle"
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="mb-1 font-mono text-[.58rem] uppercase tracking-[.18em] text-text-disabled">
                Provider
              </div>
              <h2 className="font-display font-bold text-text-primary">Telegram</h2>
            </div>
            <span className="text-xl">📱</span>
          </div>

          <div className="flex flex-col gap-1">
            {tgStatusQuery.isLoading ? (
              <div className="flex items-center gap-1.5 font-mono text-[.65rem] text-text-muted">
                <LuLoader className="h-3 w-3 animate-spin" /> Checking status…
              </div>
            ) : tgConnected ? (
              <>
                <div className="flex items-center gap-1.5 font-mono text-[.65rem] text-bull">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-bull opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-bull" />
                  </span>
                  Connected{tgAccount?.username ? ` · @${tgAccount.username}` : ""}
                </div>
                <div className="font-mono text-[.63rem] text-text-muted">
                  {tgSourcesQuery.isLoading
                    ? "Loading channels…"
                    : `${tgActiveCount} channel${tgActiveCount !== 1 ? "s" : ""} active`}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-1.5 font-mono text-[.65rem] text-text-muted">
                <LuWifiOff className="h-3 w-3" /> Not connected
              </div>
            )}
            <p className="mt-1 font-mono text-[.63rem] text-text-disabled">
              Copy channel signals into your platform
            </p>
          </div>

          <button
            onClick={() => navigate(ROUTES.COPY_TRADING_TELEGRAM)}
            disabled={!tgConfigured}
            className="mt-auto rounded-sm border border-accent py-2 font-mono text-[.65rem] uppercase tracking-widest text-accent transition-colors hover:bg-accent hover:text-bg-base disabled:cursor-not-allowed disabled:opacity-40"
          >
            {tgConnected ? "Manage →" : "Connect →"}
          </button>
        </div>

        {/* Discord card */}
        <div
          className={`flex flex-col gap-4 rounded-lg border bg-bg-surface p-6 shadow-card ${
            !dcConfigured ? "border-border-subtle opacity-50" : "border-border-subtle"
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="mb-1 font-mono text-[.58rem] uppercase tracking-[.18em] text-text-disabled">
                Provider
              </div>
              <h2 className="font-display font-bold text-text-primary">Discord</h2>
            </div>
            <span className="text-xl">💬</span>
          </div>

          <div className="flex flex-col gap-1">
            {dcStatusQuery.isLoading ? (
              <div className="flex items-center gap-1.5 font-mono text-[.65rem] text-text-muted">
                <LuLoader className="h-3 w-3 animate-spin" /> Checking status…
              </div>
            ) : dcConnected ? (
              <>
                <div className="flex items-center gap-1.5 font-mono text-[.65rem] text-bull">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-bull opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-bull" />
                  </span>
                  Connected{dcUsername ? ` · ${dcUsername}` : ""}
                </div>
                <div className="font-mono text-[.63rem] text-text-muted">
                  {dcStatusQuery.isLoading
                    ? "Loading…"
                    : `${dcActiveSources} channel${dcActiveSources !== 1 ? "s" : ""} active`}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-1.5 font-mono text-[.65rem] text-text-muted">
                <LuWifiOff className="h-3 w-3" /> Not connected
              </div>
            )}
            <p className="mt-1 font-mono text-[.63rem] text-text-disabled">
              Copy channel signals from Discord
            </p>
          </div>

          <button
            onClick={() => navigate(ROUTES.COPY_TRADING_DISCORD)}
            disabled={!dcConfigured}
            className="mt-auto rounded-sm border border-accent py-2 font-mono text-[.65rem] uppercase tracking-widest text-accent transition-colors hover:bg-accent hover:text-bg-base disabled:cursor-not-allowed disabled:opacity-40"
          >
            {dcConnected ? "Manage →" : "Connect →"}
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
              Pick a broker connection and choose auto-submit or manual confirm. Review pending and past copy orders.
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
