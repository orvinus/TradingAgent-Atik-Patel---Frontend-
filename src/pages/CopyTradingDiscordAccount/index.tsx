// src/pages/CopyTradingDiscordAccount/index.tsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { LuArrowLeft, LuLoader, LuMail, LuLock, LuRefreshCw, LuTriangle, LuSearch } from "react-icons/lu";
import { discordSelfCopierApi } from "@/api/endpoints/discordSelfCopyTrading";
import type { DiscordSelfDialog, DiscordSelfSource } from "@/types/discordSelfCopyTrading";
import { qk } from "@/api/queryKeys";
import { ROUTES } from "@/constants/routes";
import { toast } from "@/components/ui/Toast";

type Step = "loading" | "disclaimer" | "credentials" | "mfa" | "connected" | "channels";

function apiErr(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const d = err.response?.data;
    return d?.message ?? d?.code ?? "Something went wrong.";
  }
  return "Something went wrong.";
}

function errCode(err: unknown): string | undefined {
  return axios.isAxiosError(err) ? err.response?.data?.code : undefined;
}

function Back({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-fit items-center gap-1.5 font-mono text-[.65rem] text-text-muted transition-colors hover:text-text-secondary"
    >
      <LuArrowLeft className="h-3 w-3" /> Back
    </button>
  );
}

function SubmitBtn({
  loading,
  disabled,
  loadingLabel,
  label,
  onClick,
}: {
  loading: boolean;
  disabled?: boolean;
  loadingLabel: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className="flex w-full items-center justify-center gap-2 rounded-sm bg-accent py-2.5 font-mono text-[.78rem] font-bold uppercase tracking-widest text-bg-base transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? (
        <>
          <LuLoader className="h-3.5 w-3.5 animate-spin" />
          {loadingLabel}
        </>
      ) : (
        label
      )}
    </button>
  );
}

export default function CopyTradingDiscordAccount() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const initRef = useRef(false);

  const [step, setStep] = useState<Step>("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [proxy, setProxy] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [polling, setPolling] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [confirmStop, setConfirmStop] = useState<string | null>(null);
  const [dialogSearch, setDialogSearch] = useState("");

  const configQuery = useQuery({
    queryKey: qk.discordSelfConfig(),
    queryFn: discordSelfCopierApi.getConfig,
  });

  const statusQuery = useQuery({
    queryKey: qk.discordSelfStatus(),
    queryFn: discordSelfCopierApi.getStatus,
    refetchInterval: polling ? 3000 : false,
    refetchOnWindowFocus: false,
    enabled: configQuery.data?.discordSelfConfigured !== false,
  });

  const sourcesQuery = useQuery({
    queryKey: qk.discordSelfSources(),
    queryFn: discordSelfCopierApi.listSources,
    enabled: step === "connected" || step === "channels",
  });

  const dialogsQuery = useQuery({
    queryKey: qk.discordSelfDialogs(),
    queryFn: discordSelfCopierApi.listDialogs,
    enabled: step === "channels",
  });

  useEffect(() => {
    if (!initRef.current && statusQuery.isSuccess) {
      initRef.current = true;
      if (statusQuery.data.connected && statusQuery.data.live) {
        setStep("connected");
      } else {
        setStep("disclaimer");
      }
    }
  }, [statusQuery.isSuccess, statusQuery.data]);

  useEffect(() => {
    if (polling && statusQuery.data?.connected && statusQuery.data?.live) {
      setPolling(false);
      setStep("connected");
    }
  }, [polling, statusQuery.data]);

  const addSource = useMutation({
    mutationFn: ({ channelId, guildId }: { channelId: string; guildId?: string }) =>
      discordSelfCopierApi.addSource(channelId, guildId),
    onSuccess: (source) => {
      qc.invalidateQueries({ queryKey: qk.discordSelfSources() });
      qc.invalidateQueries({ queryKey: qk.discordSelfDialogs() });
      toast.success(`Now copying #${source.channelName}`);
    },
    onError: (err) => toast.error(apiErr(err)),
  });

  const removeSource = useMutation({
    mutationFn: (channelId: string) => discordSelfCopierApi.removeSource(channelId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.discordSelfSources() });
      qc.invalidateQueries({ queryKey: qk.discordSelfDialogs() });
      setConfirmStop(null);
      toast.success("Stopped copying channel");
    },
    onError: (err) => toast.error(apiErr(err)),
  });

  async function handleLogin() {
    if (!email.trim() || !password.trim()) return;
    setSubmitting(true);
    try {
      const res = await discordSelfCopierApi.startLogin({
        email: email.trim(),
        password: password.trim(),
        ...(proxy.trim() ? { proxy: proxy.trim() } : {}),
      });
      if (res?.status === "code_needed") {
        setMfaCode("");
        setStep("mfa");
      } else {
        setPolling(true);
        setStep("connected");
        qc.invalidateQueries({ queryKey: qk.discordSelfStatus() });
      }
    } catch (err) {
      const c = errCode(err);
      if (c === "DISCORD_SELF_ALREADY_CONNECTED") {
        toast.success("Already connected");
        setStep("connected");
      } else if (c === "DISCORD_SELF_CAPTCHA") {
        toast.error("Discord blocked login with a captcha. Please try again in a moment.");
      } else if (c === "DISCORD_SELF_DISABLED") {
        toast.error("Discord Account copy trading is not enabled. Contact support.");
      } else {
        toast.error(apiErr(err));
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMfa() {
    if (!mfaCode.trim()) return;
    setSubmitting(true);
    try {
      const res = await discordSelfCopierApi.submitCode(mfaCode.trim());
      if (res?.status === "connected" || res?.connected) {
        qc.invalidateQueries({ queryKey: qk.discordSelfStatus() });
        setStep("connected");
      } else {
        setPolling(true);
      }
    } catch (err) {
      const c = errCode(err);
      if (c === "DISCORD_SELF_LOGIN_NOT_STARTED") {
        toast.error("Session expired. Please log in again.");
        setStep("credentials");
      } else {
        toast.error(apiErr(err));
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    setSubmitting(true);
    try {
      await discordSelfCopierApi.logout();
      qc.invalidateQueries({ queryKey: qk.discordSelfStatus() });
      qc.invalidateQueries({ queryKey: qk.discordSelfSources() });
      setEmail("");
      setPassword("");
      setProxy("");
      setMfaCode("");
      setConfirmLogout(false);
      initRef.current = false;
      setStep("disclaimer");
      toast.success("Disconnected from Discord Account");
    } catch (err) {
      toast.error(apiErr(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "loading") {
    return (
      <div className="flex min-h-[60vh] flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <LuLoader className="h-5 w-5 animate-spin text-text-muted" />
          <span className="font-mono text-[.65rem] uppercase tracking-widest text-text-muted">
            Checking connection…
          </span>
        </div>
      </div>
    );
  }

  if (configQuery.isSuccess && configQuery.data?.discordSelfConfigured === false) {
    return (
      <div className="flex max-w-md flex-col gap-6 p-6">
        <Back onClick={() => navigate(ROUTES.COPY_TRADING)} />
        <div className="rounded-sm border border-bear/30 bg-bear/10 px-4 py-3 font-mono text-[.7rem] text-bear">
          Discord Account copy trading is not enabled on this server. Contact your administrator.
        </div>
      </div>
    );
  }

  // ── Disclaimer ────────────────────────────────────────────────────────────

  if (step === "disclaimer") {
    return (
      <div className="flex max-w-md flex-col gap-6 p-6">
        <Back onClick={() => navigate(ROUTES.COPY_TRADING)} />
        <div>
          <h1 className="font-display text-xl font-bold uppercase tracking-[.12em] text-text-primary">
            Discord (Your Account)
          </h1>
          <p className="mt-1 font-mono text-[.7rem] text-text-muted">
            Connect using your own Discord email and password. No bot required.
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
          <div className="flex items-center gap-2">
            <LuTriangle className="h-4 w-4 flex-shrink-0 text-yellow-400" />
            <span className="font-mono text-[.68rem] font-bold uppercase tracking-widest text-yellow-400">
              Risk Warning
            </span>
          </div>
          <ul className="flex flex-col gap-1.5 font-mono text-[.65rem] text-text-muted">
            <li>• Logging into Discord via third-party automation may violate Discord's Terms of Service.</li>
            <li>• Your account could be rate-limited, flagged, or banned by Discord.</li>
            <li>• Use this at your own risk. We recommend a secondary Discord account.</li>
            <li>• Only new messages posted after you start copying are processed — no backfill.</li>
          </ul>
        </div>

        <SubmitBtn
          loading={false}
          loadingLabel=""
          label="I understand — Continue"
          onClick={() => setStep("credentials")}
        />
      </div>
    );
  }

  // ── Credentials ───────────────────────────────────────────────────────────

  if (step === "credentials") {
    const proxyRequired = configQuery.data?.proxyRequired ?? false;
    return (
      <div className="flex max-w-md flex-col gap-6 p-6">
        <Back onClick={() => setStep("disclaimer")} />
        <div>
          <h1 className="font-display text-xl font-bold uppercase tracking-[.12em] text-text-primary">
            Log in to Discord
          </h1>
          <p className="mt-1 font-mono text-[.7rem] text-text-muted">
            Enter your Discord account credentials.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[.62rem] uppercase tracking-[.16em] text-text-muted">
              Email
            </label>
            <div className="relative">
              <LuMail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-sm border border-border-default bg-bg-elevated py-2.5 pl-9 pr-3 font-mono text-[.82rem] text-text-primary placeholder-text-disabled transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[.62rem] uppercase tracking-[.16em] text-text-muted">
              Password
            </label>
            <div className="relative">
              <LuLock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="••••••••••••"
                className="w-full rounded-sm border border-border-default bg-bg-elevated py-2.5 pl-9 pr-3 font-mono text-[.82rem] text-text-primary placeholder-text-disabled transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          {proxyRequired && (
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[.62rem] uppercase tracking-[.16em] text-text-muted">
                Proxy (required)
              </label>
              <input
                type="text"
                value={proxy}
                onChange={(e) => setProxy(e.target.value)}
                placeholder="http://user:pass@host:port"
                className="w-full rounded-sm border border-border-default bg-bg-elevated px-3 py-2.5 font-mono text-[.82rem] text-text-primary placeholder-text-disabled transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          )}
        </div>

        <SubmitBtn
          loading={submitting}
          disabled={!email.trim() || !password.trim() || (proxyRequired && !proxy.trim())}
          loadingLabel="Logging in…"
          label="Log In"
          onClick={handleLogin}
        />
      </div>
    );
  }

  // ── MFA ───────────────────────────────────────────────────────────────────

  if (step === "mfa") {
    return (
      <div className="flex max-w-md flex-col gap-6 p-6">
        <Back onClick={() => setStep("credentials")} />
        <div>
          <h1 className="font-display text-xl font-bold uppercase tracking-[.12em] text-text-primary">
            Two-factor authentication
          </h1>
          <p className="mt-1 font-mono text-[.7rem] text-text-muted">
            Enter the 6-digit code from your authenticator app.
          </p>
        </div>

        {polling && (
          <div className="flex items-center gap-2 rounded-sm border border-accent/30 bg-accent/10 px-3 py-2.5">
            <LuLoader className="h-3.5 w-3.5 animate-spin text-accent" />
            <span className="font-mono text-[.65rem] text-accent">
              Waiting for Discord to confirm login…
            </span>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="font-mono text-[.62rem] uppercase tracking-[.16em] text-text-muted">
            Authentication code
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
            onKeyDown={(e) => e.key === "Enter" && handleMfa()}
            placeholder="123456"
            className="w-full rounded-sm border border-border-default bg-bg-elevated px-3 py-2.5 text-center font-mono text-[.82rem] tracking-[.3em] text-text-primary placeholder-text-disabled transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        <SubmitBtn
          loading={submitting}
          disabled={!mfaCode.trim() || polling}
          loadingLabel="Verifying…"
          label="Verify"
          onClick={handleMfa}
        />
      </div>
    );
  }

  // ── Channel picker ────────────────────────────────────────────────────────

  if (step === "channels") {
    const dialogs = normalizeDialogs(dialogsQuery.data);
    const dq = dialogSearch.toLowerCase();
    const filteredDialogs = dq
      ? dialogs.filter(
          (d) =>
            d.channelName.toLowerCase().includes(dq) ||
            (d.guildName ?? "").toLowerCase().includes(dq),
        )
      : dialogs;

    return (
      <div className="flex flex-col gap-6 p-6">
        <Back onClick={() => setStep("connected")} />
        <div>
          <h1 className="font-display text-xl font-bold uppercase tracking-[.12em] text-text-primary">
            Select channels to copy
          </h1>
          <p className="mt-1 font-mono text-[.7rem] text-text-muted">
            Only new messages posted after you start copying are processed — no backfill.
          </p>
        </div>

        {dialogsQuery.isLoading && (
          <div className="flex items-center gap-2 py-4 font-mono text-[.65rem] text-text-muted">
            <LuLoader className="h-4 w-4 animate-spin" /> Loading your Discord channels…
          </div>
        )}

        {dialogsQuery.isError && (
          <p className="py-4 font-mono text-[.65rem] text-bear">{apiErr(dialogsQuery.error)}</p>
        )}

        {dialogsQuery.isSuccess && dialogs.length === 0 && (
          <p className="font-mono text-[.65rem] text-text-muted">No channels found.</p>
        )}

        {dialogsQuery.isSuccess && dialogs.length > 0 && (
          <>
            <div className="relative">
              <LuSearch className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={dialogSearch}
                onChange={(e) => setDialogSearch(e.target.value)}
                placeholder="Search channels…"
                className="w-full rounded-sm border border-border-default bg-bg-elevated py-2 pl-8 pr-3 font-mono text-[.7rem] text-text-primary placeholder-text-disabled focus:border-accent focus:outline-none"
              />
            </div>
            {filteredDialogs.length === 0 ? (
              <p className="font-mono text-[.65rem] text-text-muted">No channels match your search.</p>
            ) : (
          <div className="overflow-hidden rounded-lg border border-border-subtle bg-bg-surface shadow-card">
            {filteredDialogs.map((dialog, i) => {
              const isLast = i === filteredDialogs.length - 1;
              const isAdding =
                addSource.isPending &&
                addSource.variables?.channelId === dialog.channelId;
              const isStopping =
                removeSource.isPending && removeSource.variables === dialog.channelId;

              const label =
                dialog.guildName
                  ? `${dialog.guildName} · #${dialog.channelName}`
                  : dialog.channelName;

              return (
                <div
                  key={dialog.channelId}
                  className={`flex items-center justify-between px-4 py-3 ${
                    !isLast ? "border-b border-border-subtle" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-[.72rem] text-text-primary">
                      {dialog.type === "dm" ? "💬" : "🔊"} {label}
                    </p>
                    <p className="mt-0.5 font-mono text-[.6rem] text-text-disabled">
                      {dialog.type}
                    </p>
                  </div>

                  <div className="ml-4 flex-shrink-0">
                    {dialog.isMonitored ? (
                      confirmStop === dialog.channelId ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[.58rem] text-text-muted">Sure?</span>
                          <button
                            onClick={() => removeSource.mutate(dialog.channelId)}
                            disabled={isStopping}
                            className="rounded-sm bg-bear px-2 py-1 font-mono text-[.58rem] text-white hover:opacity-80 disabled:opacity-50"
                          >
                            {isStopping ? <LuLoader className="h-2.5 w-2.5 animate-spin" /> : "Stop"}
                          </button>
                          <button
                            onClick={() => setConfirmStop(null)}
                            className="font-mono text-[.58rem] text-text-muted hover:text-text-secondary"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmStop(dialog.channelId)}
                          className="rounded-sm border border-bear/50 px-2.5 py-1 font-mono text-[.62rem] text-bear transition-colors hover:bg-bear/10"
                        >
                          Stop
                        </button>
                      )
                    ) : (
                      <button
                        onClick={() =>
                          addSource.mutate({
                            channelId: dialog.channelId,
                            ...(dialog.guildId !== undefined ? { guildId: dialog.guildId } : {}),
                          })
                        }
                        disabled={isAdding}
                        className="rounded-sm bg-accent px-2.5 py-1 font-mono text-[.62rem] font-bold text-bg-base transition-colors hover:bg-accent-hover disabled:opacity-50"
                      >
                        {isAdding ? <LuLoader className="h-2.5 w-2.5 animate-spin" /> : "Copy"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
            )}
          </>
        )}
      </div>
    );
  }

  // ── Connected dashboard ───────────────────────────────────────────────────

  function normalizeDialogs(raw: unknown): DiscordSelfDialog[] {
    if (Array.isArray(raw)) return raw as DiscordSelfDialog[];
    const obj = raw as Record<string, unknown> | null | undefined;
    if (obj && Array.isArray(obj.dialogs)) return obj.dialogs as DiscordSelfDialog[];
    if (obj && Array.isArray(obj.channels)) return obj.channels as DiscordSelfDialog[];
    return [];
  }

  function normalizeSources(raw: unknown): DiscordSelfSource[] {
    if (Array.isArray(raw)) return raw as DiscordSelfSource[];
    const obj = raw as Record<string, unknown> | null | undefined;
    if (obj && Array.isArray(obj.sources)) return obj.sources as DiscordSelfSource[];
    return [];
  }
  const sources = normalizeSources(sourcesQuery.data);
  const status = statusQuery.data;
  const displayName = status?.username ?? status?.globalName ?? status?.email ?? "Connected";

  return (
    <div className="flex flex-col gap-6 p-6">
      <Back onClick={() => navigate(ROUTES.COPY_TRADING)} />

      <h1 className="font-display text-xl font-bold uppercase tracking-[.12em] text-text-primary">
        Discord Account Copy Trading
      </h1>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-subtle bg-bg-surface p-4 shadow-card">
        <div className="flex items-center gap-2">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-bull opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-bull" />
          </span>
          <span className="font-mono text-[.7rem] text-text-primary">
            Connected as {displayName}
          </span>
        </div>

        {confirmLogout ? (
          <div className="flex items-center gap-2">
            <span className="font-mono text-[.62rem] text-text-muted">Disconnect?</span>
            <button
              onClick={handleLogout}
              disabled={submitting}
              className="rounded-sm bg-bear px-2.5 py-1 font-mono text-[.62rem] text-white hover:opacity-80 disabled:opacity-50"
            >
              {submitting ? <LuLoader className="h-2.5 w-2.5 animate-spin" /> : "Yes, disconnect"}
            </button>
            <button
              onClick={() => setConfirmLogout(false)}
              className="font-mono text-[.62rem] text-text-muted hover:text-text-secondary"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmLogout(true)}
            className="rounded-sm border border-border-default px-3 py-1.5 font-mono text-[.62rem] uppercase tracking-widest text-text-secondary transition-colors hover:border-bear hover:text-bear"
          >
            Logout
          </button>
        )}
      </div>

      <div className="rounded-sm border border-yellow-500/20 bg-yellow-500/5 px-3 py-2 font-mono text-[.62rem] text-yellow-400/80">
        ⚠ Only new messages posted after you start copying are processed — no backfill.
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[.62rem] uppercase tracking-[.16em] text-text-muted">
            My Copied Channels
          </span>
          <button
            onClick={() => setStep("channels")}
            className="flex items-center gap-1.5 rounded-sm border border-accent px-3 py-1.5 font-mono text-[.62rem] uppercase tracking-widest text-accent transition-colors hover:bg-accent hover:text-bg-base"
          >
            <LuRefreshCw className="h-3 w-3" />
            {sources.length > 0 ? "Add more" : "Browse Channels"}
          </button>
        </div>

        {sourcesQuery.isLoading ? (
          <div className="flex items-center gap-2 py-4 font-mono text-[.65rem] text-text-muted">
            <LuLoader className="h-3.5 w-3.5 animate-spin" /> Loading channels…
          </div>
        ) : sources.length === 0 ? (
          <div className="rounded-lg border border-border-subtle bg-bg-surface p-6 text-center shadow-card">
            <p className="font-mono text-[.65rem] text-text-muted">No channels copied yet.</p>
            <p className="mt-1 font-mono text-[.6rem] text-text-disabled">
              Tap Browse Channels to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border-subtle bg-bg-surface shadow-card">
            {sources.map((source, i) => {
              const isLast = i === sources.length - 1;
              const isStopping =
                removeSource.isPending && removeSource.variables === source.channelId;
              const label = source.guildName
                ? `${source.guildName} · #${source.channelName}`
                : source.channelName;

              return (
                <div
                  key={source.id}
                  className={`flex items-center justify-between px-4 py-3 ${
                    !isLast ? "border-b border-border-subtle" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-[.72rem] text-text-primary">{label}</p>
                    {source.signalsCount !== undefined && (
                      <p className="font-mono text-[.6rem] text-text-disabled">
                        {source.signalsCount} signal{source.signalsCount !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>

                  <div className="ml-4 flex-shrink-0">
                    {confirmStop === source.channelId ? (
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[.58rem] text-text-muted">Sure?</span>
                        <button
                          onClick={() => removeSource.mutate(source.channelId)}
                          disabled={isStopping}
                          className="rounded-sm bg-bear px-2 py-1 font-mono text-[.58rem] text-white hover:opacity-80 disabled:opacity-50"
                        >
                          {isStopping ? <LuLoader className="h-2.5 w-2.5 animate-spin" /> : "Stop"}
                        </button>
                        <button
                          onClick={() => setConfirmStop(null)}
                          className="font-mono text-[.58rem] text-text-muted hover:text-text-secondary"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmStop(source.channelId)}
                        className="rounded-sm border border-bear/50 px-2.5 py-1 font-mono text-[.62rem] text-bear transition-colors hover:bg-bear/10"
                      >
                        Stop
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
