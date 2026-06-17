// src/pages/CopyTrading/index.tsx
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { LuLoader, LuWifiOff } from "react-icons/lu";
import { copyTradingApi } from "@/api/endpoints/copyTrading";
import { qk } from "@/api/queryKeys";
import { ROUTES } from "@/constants/routes";

export default function CopyTrading() {
  const navigate = useNavigate();

  const configQuery = useQuery({
    queryKey: qk.copyTradingConfig(),
    queryFn: copyTradingApi.getConfig,
  });

  const statusQuery = useQuery({
    queryKey: qk.copyTradingStatus(),
    queryFn: copyTradingApi.getStatus,
    enabled: configQuery.data?.telegramConfigured !== false,
  });

  const sourcesQuery = useQuery({
    queryKey: qk.copyTradingSources(),
    queryFn: copyTradingApi.listSources,
    enabled: statusQuery.data?.connected === true,
  });

  const configured = configQuery.isSuccess ? (configQuery.data?.telegramConfigured ?? true) : true;
  const connected  = statusQuery.data?.connected ?? false;
  const account    = statusQuery.data?.account;
  const activeCount = (sourcesQuery.data ?? []).filter((s) => s.isActive).length;

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

      {configQuery.isSuccess && !configured && (
        <div className="rounded-sm border border-bear/30 bg-bear/10 px-4 py-3 font-mono text-[.7rem] text-bear">
          Telegram copy trading is not enabled on this server. Contact your administrator.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Telegram card */}
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
              <h2 className="font-display font-bold text-text-primary">Telegram</h2>
            </div>
            <span className="text-xl">📱</span>
          </div>

          <div className="flex flex-col gap-1">
            {statusQuery.isLoading ? (
              <div className="flex items-center gap-1.5 font-mono text-[.65rem] text-text-muted">
                <LuLoader className="h-3 w-3 animate-spin" /> Checking status…
              </div>
            ) : connected ? (
              <>
                <div className="flex items-center gap-1.5 font-mono text-[.65rem] text-bull">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-bull opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-bull" />
                  </span>
                  Connected{account?.username ? ` · @${account.username}` : ""}
                </div>
                <div className="font-mono text-[.63rem] text-text-muted">
                  {sourcesQuery.isLoading
                    ? "Loading channels…"
                    : `${activeCount} channel${activeCount !== 1 ? "s" : ""} active`}
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
            disabled={!configured}
            className="mt-auto rounded-sm border border-accent py-2 font-mono text-[.65rem] uppercase tracking-widest text-accent transition-colors hover:bg-accent hover:text-bg-base disabled:cursor-not-allowed disabled:opacity-40"
          >
            {connected ? "Manage →" : "Connect →"}
          </button>
        </div>

        {/* Discord card — coming soon */}
        <div className="flex flex-col gap-4 rounded-lg border border-border-subtle bg-bg-surface p-6 shadow-card opacity-50">
          <div className="flex items-start justify-between">
            <div>
              <div className="mb-1 font-mono text-[.58rem] uppercase tracking-[.18em] text-text-disabled">
                Provider
              </div>
              <h2 className="font-display font-bold text-text-primary">Discord</h2>
            </div>
            <span className="text-xl">💬</span>
          </div>
          <p className="font-mono text-[.63rem] text-text-disabled">Copy signals from Discord channels</p>
          <div className="mt-auto rounded-sm border border-border-subtle py-2 text-center font-mono text-[.65rem] uppercase tracking-widest text-text-disabled">
            Coming soon
          </div>
        </div>
      </div>
    </div>
  );
}
