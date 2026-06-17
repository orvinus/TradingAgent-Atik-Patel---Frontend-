// src/pages/CopyTradingTelegram/index.tsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  LuArrowLeft,
  LuLoader,
  LuPhone,
  LuLock,
  LuRefreshCw,
} from "react-icons/lu";
import { copyTradingApi } from "@/api/endpoints/copyTrading";
import { qk } from "@/api/queryKeys";
import { ROUTES } from "@/constants/routes";
import { toast } from "@/components/ui/Toast";
import type { TelegramAccount } from "@/types/copyTrading";

type Step = "loading" | "phone" | "otp" | "password" | "connected" | "channels";

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

// ── Shared back button ────────────────────────────────────────────────────────
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

// ── Shared submit button ──────────────────────────────────────────────────────
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

// ── Page ─────────────────────────────────────────────────────────────────────
export default function CopyTradingTelegram() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const initRef = useRef(false);

  const [step, setStep] = useState<Step>("loading");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [twoFaPassword, setTwoFaPassword] = useState("");
  const [account, setAccount] = useState<TelegramAccount | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [polling, setPolling] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [confirmStop, setConfirmStop] = useState<string | null>(null);

  const statusQuery = useQuery({
    queryKey: qk.copyTradingStatus(),
    queryFn: copyTradingApi.getStatus,
    refetchInterval: polling ? 3500 : false,
    refetchOnWindowFocus: false,
  });

  const sourcesQuery = useQuery({
    queryKey: qk.copyTradingSources(),
    queryFn: copyTradingApi.listSources,
    enabled: step === "connected" || step === "channels",
  });

  const dialogsQuery = useQuery({
    queryKey: qk.copyTradingDialogs(),
    queryFn: copyTradingApi.listDialogs,
    enabled: step === "channels",
  });

  // Initial status check — runs once
  useEffect(() => {
    if (!initRef.current && statusQuery.isSuccess) {
      initRef.current = true;
      if (statusQuery.data.connected && statusQuery.data.live) {
        setAccount(statusQuery.data.account);
        setStep("connected");
      } else {
        setStep("phone");
      }
    }
  }, [statusQuery.isSuccess, statusQuery.data]);

  // Polling effect — fires while waiting for pending login
  useEffect(() => {
    if (polling && statusQuery.data?.connected) {
      setPolling(false);
      setAccount(statusQuery.data.account);
      setStep("connected");
    }
  }, [polling, statusQuery.data]);

  // ── Mutations ─────────────────────────────────────────────────────────────

  const addSource = useMutation({
    mutationFn: copyTradingApi.addSource,
    onSuccess: (source) => {
      qc.invalidateQueries({ queryKey: qk.copyTradingSources() });
      qc.invalidateQueries({ queryKey: qk.copyTradingDialogs() });
      toast.success(`${source.title} is now being copied`);
    },
    onError: (err) => toast.error(apiErr(err)),
  });

  const removeSource = useMutation({
    mutationFn: (chatId: string) => copyTradingApi.removeSource(chatId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.copyTradingSources() });
      qc.invalidateQueries({ queryKey: qk.copyTradingDialogs() });
      setConfirmStop(null);
      toast.success("Stopped copying channel");
    },
    onError: (err) => toast.error(apiErr(err)),
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleStartLogin() {
    const cleaned = phone.replace(/\s/g, "");
    if (!/^\+[1-9]\d{6,14}$/.test(cleaned)) {
      toast.error("Enter a valid phone number with country code (e.g. +91…)");
      return;
    }
    setSubmitting(true);
    try {
      await copyTradingApi.startLogin(cleaned);
      setCode("");
      setStep("otp");
    } catch (err) {
      const c = errCode(err);
      if (c === "TELEGRAM_USER_ALREADY_CONNECTED") {
        toast.error("Already connected — redirecting to dashboard");
        setStep("connected");
      } else if (c === "TELEGRAM_USER_DISABLED") {
        toast.error("Telegram copy trading is not available. Contact support.");
      } else if (c === "TELEGRAM_FLOOD_WAIT") {
        toast.error("Too many attempts. Please wait and try again.");
      } else {
        toast.error(apiErr(err));
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitCode() {
    if (!code.trim()) return;
    setSubmitting(true);
    try {
      const res = await copyTradingApi.submitCode(code.trim());
      if (res.status === "connected") {
        setAccount(res.account);
        qc.invalidateQueries({ queryKey: qk.copyTradingStatus() });
        setStep("connected");
      } else if (res.status === "password_needed") {
        setTwoFaPassword("");
        setStep("password");
      } else {
        setPolling(true);
      }
    } catch (err) {
      const c = errCode(err);
      if (c === "PHONE_CODE_INVALID") {
        toast.error("Incorrect code. Try again.");
        setCode("");
      } else if (c === "PHONE_CODE_EXPIRED") {
        toast.error("Code expired. Start over with your phone number.");
        setStep("phone");
      } else if (c === "TELEGRAM_LOGIN_NOT_STARTED") {
        toast.error("Session expired. Enter your phone number again.");
        setStep("phone");
      } else {
        toast.error(apiErr(err));
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitPassword() {
    if (!twoFaPassword.trim()) return;
    setSubmitting(true);
    try {
      const res = await copyTradingApi.submitPassword(twoFaPassword.trim());
      if (res.status === "connected") {
        setAccount(res.account);
        qc.invalidateQueries({ queryKey: qk.copyTradingStatus() });
        setStep("connected");
      } else {
        setPolling(true);
      }
    } catch (err) {
      const c = errCode(err);
      if (c === "PASSWORD_HASH_INVALID") {
        toast.error("Incorrect password. Try again.");
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
      await copyTradingApi.logout();
      qc.invalidateQueries({ queryKey: qk.copyTradingStatus() });
      qc.invalidateQueries({ queryKey: qk.copyTradingSources() });
      setAccount(null);
      setPhone("");
      setCode("");
      setTwoFaPassword("");
      setConfirmLogout(false);
      initRef.current = false;
      setStep("phone");
      toast.success("Disconnected from Telegram");
    } catch (err) {
      toast.error(apiErr(err));
    } finally {
      setSubmitting(false);
    }
  }

  // ── Loading ───────────────────────────────────────────────────────────────

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

  const sources = sourcesQuery.data ?? [];
  const dialogs = dialogsQuery.data ?? [];

  // ── Phone screen ──────────────────────────────────────────────────────────

  if (step === "phone") {
    return (
      <div className="flex max-w-md flex-col gap-6 p-6">
        <Back onClick={() => navigate(ROUTES.COPY_TRADING)} />
        <div>
          <h1 className="font-display text-xl font-bold uppercase tracking-[.12em] text-text-primary">
            Connect Telegram
          </h1>
          <p className="mt-1 font-mono text-[.7rem] text-text-muted">
            We'll send a verification code to your Telegram app.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="font-mono text-[.62rem] uppercase tracking-[.16em] text-text-muted">
            Phone number
          </label>
          <div className="relative">
            <LuPhone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleStartLogin()}
              placeholder="+919876543210"
              className="w-full rounded-sm border border-border-default bg-bg-elevated py-2.5 pl-9 pr-3 font-mono text-[.82rem] text-text-primary placeholder-text-disabled transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          <p className="font-mono text-[.6rem] text-text-disabled">
            Include country code, e.g. +91, +1, +44
          </p>
        </div>
        <SubmitBtn
          loading={submitting}
          disabled={!phone.trim()}
          loadingLabel="Sending…"
          label="Continue"
          onClick={handleStartLogin}
        />
      </div>
    );
  }

  // ── OTP screen ────────────────────────────────────────────────────────────

  if (step === "otp") {
    return (
      <div className="flex max-w-md flex-col gap-6 p-6">
        <Back onClick={() => { setPolling(false); setStep("phone"); }} />
        <div>
          <h1 className="font-display text-xl font-bold uppercase tracking-[.12em] text-text-primary">
            Verify code
          </h1>
          <p className="mt-1 font-mono text-[.7rem] text-text-muted">
            Open your Telegram app — the code was sent there (or via SMS). It usually arrives within a few
            seconds.
          </p>
        </div>

        {polling && (
          <div className="flex items-center gap-2 rounded-sm border border-accent/30 bg-accent/10 px-3 py-2.5">
            <LuLoader className="h-3.5 w-3.5 animate-spin text-accent" />
            <span className="font-mono text-[.65rem] text-accent">
              Waiting for Telegram to confirm login…
            </span>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="font-mono text-[.62rem] uppercase tracking-[.16em] text-text-muted">
            Verification code
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            onKeyDown={(e) => e.key === "Enter" && handleSubmitCode()}
            placeholder="12345"
            className="w-full rounded-sm border border-border-default bg-bg-elevated px-3 py-2.5 text-center font-mono text-[.82rem] tracking-[.3em] text-text-primary placeholder-text-disabled transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        <SubmitBtn
          loading={submitting}
          disabled={!code.trim() || polling}
          loadingLabel="Verifying…"
          label="Verify"
          onClick={handleSubmitCode}
        />

        <button
          onClick={() => { setCode(""); handleStartLogin(); }}
          className="text-center font-mono text-[.65rem] text-accent transition-colors hover:text-accent-hover"
        >
          Didn't get a code? Resend
        </button>
      </div>
    );
  }

  // ── 2FA screen ────────────────────────────────────────────────────────────

  if (step === "password") {
    return (
      <div className="flex max-w-md flex-col gap-6 p-6">
        <Back onClick={() => setStep("otp")} />
        <div>
          <h1 className="font-display text-xl font-bold uppercase tracking-[.12em] text-text-primary">
            Two-step verification
          </h1>
          <p className="mt-1 font-mono text-[.7rem] text-text-muted">
            Your Telegram account has 2FA enabled. Enter your Telegram cloud password.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="font-mono text-[.62rem] uppercase tracking-[.16em] text-text-muted">
            Password
          </label>
          <div className="relative">
            <LuLock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="password"
              value={twoFaPassword}
              onChange={(e) => setTwoFaPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmitPassword()}
              placeholder="••••••••••••"
              className="w-full rounded-sm border border-border-default bg-bg-elevated py-2.5 pl-9 pr-3 font-mono text-[.82rem] text-text-primary placeholder-text-disabled transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
        </div>
        <SubmitBtn
          loading={submitting}
          disabled={!twoFaPassword.trim()}
          loadingLabel="Verifying…"
          label="Continue"
          onClick={handleSubmitPassword}
        />
      </div>
    );
  }

  // ── Channel picker ────────────────────────────────────────────────────────

  if (step === "channels") {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Back onClick={() => setStep("connected")} />
        <div>
          <h1 className="font-display text-xl font-bold uppercase tracking-[.12em] text-text-primary">
            Select channels to copy
          </h1>
          <p className="mt-1 font-mono text-[.7rem] text-text-muted">
            Loading channels… this may take a few seconds on first fetch.
          </p>
        </div>

        {dialogsQuery.isLoading && (
          <div className="flex items-center gap-2 py-4 font-mono text-[.65rem] text-text-muted">
            <LuLoader className="h-4 w-4 animate-spin" /> Loading your Telegram channels…
          </div>
        )}

        {dialogsQuery.isError && (
          <p className="py-4 font-mono text-[.65rem] text-bear">{apiErr(dialogsQuery.error)}</p>
        )}

        {dialogsQuery.isSuccess && dialogs.length === 0 && (
          <p className="font-mono text-[.65rem] text-text-muted">
            No channels found in your Telegram account.
          </p>
        )}

        {dialogsQuery.isSuccess && dialogs.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-border-subtle bg-bg-surface shadow-card">
            {dialogs.map((dialog, i) => {
              const isLast = i === dialogs.length - 1;
              const isAdding  = addSource.isPending && addSource.variables === dialog.chatId;
              const isStopping = removeSource.isPending && removeSource.variables === dialog.chatId;

              return (
                <div
                  key={dialog.chatId}
                  className={`flex items-center justify-between px-4 py-3 ${
                    !isLast ? "border-b border-border-subtle" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-[.72rem] text-text-primary">
                      {dialog.type === "channel" ? "📢" : "👥"} {dialog.title}
                    </p>
                    <p className="mt-0.5 font-mono text-[.6rem] text-text-disabled">
                      {dialog.type}
                      {dialog.username ? ` · @${dialog.username}` : ""}
                    </p>
                  </div>

                  <div className="ml-4 flex-shrink-0">
                    {dialog.isMonitored ? (
                      confirmStop === dialog.chatId ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[.58rem] text-text-muted">Sure?</span>
                          <button
                            onClick={() => removeSource.mutate(dialog.chatId)}
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
                          onClick={() => setConfirmStop(dialog.chatId)}
                          className="rounded-sm border border-bear/50 px-2.5 py-1 font-mono text-[.62rem] text-bear transition-colors hover:bg-bear/10"
                        >
                          Stop
                        </button>
                      )
                    ) : (
                      <button
                        onClick={() => addSource.mutate(dialog.chatId)}
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
      </div>
    );
  }

  // ── Connected dashboard ───────────────────────────────────────────────────

  const displayAccount = account ?? statusQuery.data?.account;
  const usernameLabel = displayAccount?.username
    ? `@${displayAccount.username}`
    : displayAccount?.phoneLast4
    ? `***${displayAccount.phoneLast4}`
    : "Connected";

  return (
    <div className="flex flex-col gap-6 p-6">
      <Back onClick={() => navigate(ROUTES.COPY_TRADING)} />

      <h1 className="font-display text-xl font-bold uppercase tracking-[.12em] text-text-primary">
        Telegram Copy Trading
      </h1>

      {/* Connection header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-subtle bg-bg-surface p-4 shadow-card">
        <div className="flex items-center gap-2">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-bull opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-bull" />
          </span>
          <span className="font-mono text-[.7rem] text-text-primary">
            Connected as {usernameLabel}
          </span>
          {displayAccount?.phoneLast4 && displayAccount.username && (
            <span className="font-mono text-[.65rem] text-text-muted">
              · ***{displayAccount.phoneLast4}
            </span>
          )}
        </div>

        {confirmLogout ? (
          <div className="flex items-center gap-2">
            <span className="font-mono text-[.62rem] text-text-muted">Disconnect Telegram?</span>
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

      {/* My Copied Channels */}
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
            {sources.length > 0 ? "Add more channels" : "Fetch Channels"}
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
              Tap Fetch Channels to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border-subtle bg-bg-surface shadow-card">
            {sources.map((source, i) => {
              const isLast    = i === sources.length - 1;
              const isStopping = removeSource.isPending && removeSource.variables === source.chatId;
              const handle    = source.username ?? source.channelUsername;

              return (
                <div
                  key={source.id}
                  className={`flex items-center justify-between px-4 py-3 ${
                    !isLast ? "border-b border-border-subtle" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-[.72rem] text-text-primary">
                      {source.title}
                    </p>
                    {handle && (
                      <p className="font-mono text-[.6rem] text-text-disabled">@{handle}</p>
                    )}
                  </div>

                  <div className="ml-4 flex-shrink-0">
                    {confirmStop === source.chatId ? (
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[.58rem] text-text-muted">Sure?</span>
                        <button
                          onClick={() => removeSource.mutate(source.chatId)}
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
                        onClick={() => setConfirmStop(source.chatId)}
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
