// src/pages/CopyTradingX/index.tsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  LuArrowLeft,
  LuLoader,
  LuChevronDown,
  LuChevronUp,
  LuRefreshCw,
  LuTriangle,
  LuSearch,
} from "react-icons/lu";
import { twitterCopierApi } from "@/api/endpoints/twitterCopyTrading";
import type { TwitterSource } from "@/types/twitterCopyTrading";
import { qk } from "@/api/queryKeys";
import { ROUTES } from "@/constants/routes";
import { toast } from "@/components/ui/Toast";

type Step = "loading" | "connect" | "connected";
type SourceKind = "account" | "list" | "home";

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

function MaskedInput({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-mono text-[.62rem] uppercase tracking-[.16em] text-text-muted">
        {label}
      </label>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-sm border border-border-default bg-bg-elevated px-3 py-2.5 font-mono text-[.82rem] text-text-primary placeholder-text-disabled transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      />
      {hint && <p className="font-mono text-[.6rem] text-text-disabled">{hint}</p>}
    </div>
  );
}

function CookieHelpPanel() {
  return (
    <div className="rounded-lg border border-border-subtle bg-bg-surface p-4 shadow-card">
      <p className="mb-3 font-mono text-[.62rem] uppercase tracking-[.16em] text-text-muted">
        How to get your cookies
      </p>
      <ol className="flex flex-col gap-2 font-mono text-[.65rem] text-text-muted">
        <li>
          <span className="mr-1.5 font-bold text-accent">1.</span>
          Open <span className="text-text-primary">x.com</span> while logged in
        </li>
        <li>
          <span className="mr-1.5 font-bold text-accent">2.</span>
          Press <span className="text-text-primary">F12</span> → Application tab → Cookies →{" "}
          <span className="text-text-primary">https://x.com</span>
        </li>
        <li>
          <span className="mr-1.5 font-bold text-accent">3.</span>
          Copy the <span className="text-text-primary">Value</span> of each cookie:
          <ul className="mt-1.5 flex flex-col gap-1 pl-4">
            <li>
              • <span className="text-text-primary">auth_token</span> — your session token
            </li>
            <li>
              • <span className="text-text-primary">ct0</span> — CSRF token
            </li>
            <li>
              • <span className="text-text-primary">twid</span> — looks like{" "}
              <span className="text-text-primary">u%3D1234567890</span>
            </li>
          </ul>
        </li>
        <li>
          <span className="mr-1.5 font-bold text-accent">4.</span>
          Paste all three below and click Connect
        </li>
      </ol>
      <p className="mt-3 rounded-sm border border-yellow-500/20 bg-yellow-500/5 px-2.5 py-1.5 font-mono text-[.6rem] text-yellow-400/80">
        ⚠ These cookies are your X session — treat them like a password and never share them.
      </p>
    </div>
  );
}

export default function CopyTradingX() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const initRef = useRef(false);

  const [step, setStep] = useState<Step>("loading");
  const [authToken, setAuthToken] = useState("");
  const [ct0, setCt0] = useState("");
  const [twid, setTwid] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [confirmStop, setConfirmStop] = useState<string | null>(null);
  const [sourcesSearch, setSourcesSearch] = useState("");

  // Add source form
  const [kind, setKind] = useState<SourceKind>("account");
  const [handle, setHandle] = useState("");
  const [listId, setListId] = useState("");
  const [resolving, setResolving] = useState(false);
  const [resolvedHandle, setResolvedHandle] = useState<string | null>(null);

  // Advanced section (password login)
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advUsername, setAdvUsername] = useState("");
  const [advPassword, setAdvPassword] = useState("");
  const [advMfaCode, setAdvMfaCode] = useState("");
  const [advStep, setAdvStep] = useState<"credentials" | "mfa">("credentials");

  const configQuery = useQuery({
    queryKey: qk.twitterConfig(),
    queryFn: twitterCopierApi.getConfig,
  });

  const statusQuery = useQuery({
    queryKey: qk.twitterStatus(),
    queryFn: twitterCopierApi.getStatus,
    refetchOnWindowFocus: false,
    enabled: configQuery.data?.twitterConfigured !== false,
  });

  const sourcesQuery = useQuery({
    queryKey: qk.twitterSources(),
    queryFn: twitterCopierApi.listSources,
    enabled: step === "connected",
    refetchInterval: step === "connected" ? 60000 : false,
  });

  useEffect(() => {
    if (!initRef.current && statusQuery.isSuccess) {
      initRef.current = true;
      if (statusQuery.data.connected) {
        setStep("connected");
      } else {
        setStep("connect");
      }
    }
  }, [statusQuery.isSuccess, statusQuery.data]);

  const addSource = useMutation({
    mutationFn: twitterCopierApi.addSource,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.twitterSources() });
      setHandle("");
      setListId("");
      setResolvedHandle(null);
      toast.success("Source added — new tweets checked every ~5 min");
    },
    onError: (err) => {
      const c = errCode(err);
      if (c === "SOURCE_LIMIT") {
        toast.error("Max 50 sources reached. Stop one before adding another.");
      } else if (c === "HOME_DISABLED") {
        toast.error("Home timeline not available.");
      } else {
        toast.error(apiErr(err));
      }
    },
  });

  const removeSource = useMutation({
    mutationFn: (id: string) => twitterCopierApi.removeSource(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.twitterSources() });
      setConfirmStop(null);
      toast.success("Stopped copying source");
    },
    onError: (err) => toast.error(apiErr(err)),
  });

  async function handleCookieConnect() {
    if (!authToken.trim() || !ct0.trim() || !twid.trim()) return;
    setSubmitting(true);
    try {
      await twitterCopierApi.loginWithCookies({
        authToken: authToken.trim(),
        ct0: ct0.trim(),
        twid: twid.trim(),
      });
      qc.invalidateQueries({ queryKey: qk.twitterStatus() });
      setStep("connected");
      toast.success("Connected to X");
    } catch (err) {
      const c = errCode(err);
      if (c === "TWITTER_COOKIES_INVALID") {
        toast.error("Invalid cookies — copy fresh values from x.com");
        setAuthToken("");
        setCt0("");
        setTwid("");
      } else if (c === "TWITTER_TWID_REQUIRED") {
        toast.error("The twid cookie is required.");
      } else if (c === "TWITTER_USER_ALREADY_CONNECTED") {
        toast.success("Already connected");
        setStep("connected");
      } else if (c === "TWITTER_USER_CAPTCHA") {
        toast.error("X blocked login. Try using fresher cookies.");
      } else {
        toast.error(apiErr(err));
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAdvancedLogin() {
    if (!advUsername.trim() || !advPassword.trim()) return;
    setSubmitting(true);
    try {
      const res = await twitterCopierApi.startLogin({
        username: advUsername.trim(),
        password: advPassword.trim(),
      });
      if (res?.status === "code_needed") {
        setAdvMfaCode("");
        setAdvStep("mfa");
      } else {
        qc.invalidateQueries({ queryKey: qk.twitterStatus() });
        setStep("connected");
      }
    } catch (err) {
      const c = errCode(err);
      if (c === "TWITTER_USER_CAPTCHA") {
        toast.error("X blocked login — use cookies instead.");
        setShowAdvanced(false);
      } else {
        toast.error(apiErr(err));
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAdvancedMfa() {
    if (!advMfaCode.trim()) return;
    setSubmitting(true);
    try {
      await twitterCopierApi.submitCode(advMfaCode.trim());
      qc.invalidateQueries({ queryKey: qk.twitterStatus() });
      setStep("connected");
    } catch (err) {
      toast.error(apiErr(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    setSubmitting(true);
    try {
      await twitterCopierApi.logout();
      qc.invalidateQueries({ queryKey: qk.twitterStatus() });
      qc.invalidateQueries({ queryKey: qk.twitterSources() });
      setAuthToken("");
      setCt0("");
      setTwid("");
      setConfirmLogout(false);
      initRef.current = false;
      setStep("connect");
      toast.success("Disconnected from X");
    } catch (err) {
      toast.error(apiErr(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResolve() {
    if (!handle.trim()) return;
    setResolving(true);
    try {
      const res = await twitterCopierApi.resolveHandle(handle.trim());
      setResolvedHandle(res.displayName ?? res.handle);
      toast.success(`Found: ${res.displayName ?? res.handle}`);
    } catch {
      toast.error("Handle not found");
      setResolvedHandle(null);
    } finally {
      setResolving(false);
    }
  }

  function handleAddSource() {
    if (kind === "account") {
      if (!handle.trim()) {
        toast.error("Enter a Twitter handle");
        return;
      }
      addSource.mutate({ kind: "account", handle: handle.trim().replace(/^@+/, "") });
    } else if (kind === "list") {
      if (!listId.trim()) {
        toast.error("Enter a list ID from the URL");
        return;
      }
      addSource.mutate({ kind: "list", listId: listId.trim() });
    } else {
      addSource.mutate({ kind: "home" });
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

  if (configQuery.isSuccess && configQuery.data?.twitterConfigured === false) {
    return (
      <div className="flex max-w-md flex-col gap-6 p-6">
        <Back onClick={() => navigate(ROUTES.COPY_TRADING)} />
        <div className="rounded-sm border border-bear/30 bg-bear/10 px-4 py-3 font-mono text-[.7rem] text-bear">
          X (Twitter) copy trading is not enabled on this server. Contact your administrator.
        </div>
      </div>
    );
  }

  // ── Connect page ──────────────────────────────────────────────────────────

  if (step === "connect") {
    return (
      <div className="flex max-w-lg flex-col gap-6 p-6">
        <Back onClick={() => navigate(ROUTES.COPY_TRADING)} />
        <div>
          <h1 className="font-display text-xl font-bold uppercase tracking-[.12em] text-text-primary">
            Connect X (Twitter)
          </h1>
          <p className="mt-1 font-mono text-[.7rem] text-text-muted">
            Paste your session cookies to connect. Tweets are checked every ~5 minutes.
          </p>
        </div>

        <CookieHelpPanel />

        <div className="flex flex-col gap-4">
          <MaskedInput
            label="auth_token"
            value={authToken}
            onChange={setAuthToken}
            placeholder="Paste auth_token value"
          />
          <MaskedInput
            label="ct0"
            value={ct0}
            onChange={setCt0}
            placeholder="Paste ct0 value"
          />
          <MaskedInput
            label="twid"
            value={twid}
            onChange={setTwid}
            placeholder="Paste twid value (e.g. u%3D1234…)"
            hint="Starts with u%3D followed by your user ID"
          />
        </div>

        <SubmitBtn
          loading={submitting}
          disabled={!authToken.trim() || !ct0.trim() || !twid.trim()}
          loadingLabel="Connecting…"
          label="Connect with Cookies"
          onClick={handleCookieConnect}
        />

        {/* Advanced — password login */}
        <div className="border-t border-border-subtle pt-4">
          <button
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex w-full items-center justify-between font-mono text-[.62rem] uppercase tracking-[.16em] text-text-disabled transition-colors hover:text-text-muted"
          >
            <span>Advanced — password login (often blocked)</span>
            {showAdvanced ? (
              <LuChevronUp className="h-3.5 w-3.5" />
            ) : (
              <LuChevronDown className="h-3.5 w-3.5" />
            )}
          </button>

          {showAdvanced && (
            <div className="mt-4 flex flex-col gap-4">
              <p className="font-mono text-[.63rem] text-text-disabled">
                Password login frequently triggers X's bot detection. Use cookies above if possible.
              </p>

              {advStep === "credentials" ? (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-mono text-[.62rem] uppercase tracking-[.16em] text-text-muted">
                      Username or email
                    </label>
                    <input
                      type="text"
                      value={advUsername}
                      onChange={(e) => setAdvUsername(e.target.value)}
                      placeholder="@handle or email"
                      className="w-full rounded-sm border border-border-default bg-bg-elevated px-3 py-2.5 font-mono text-[.82rem] text-text-primary placeholder-text-disabled transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-mono text-[.62rem] uppercase tracking-[.16em] text-text-muted">
                      Password
                    </label>
                    <input
                      type="password"
                      value={advPassword}
                      onChange={(e) => setAdvPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full rounded-sm border border-border-default bg-bg-elevated px-3 py-2.5 font-mono text-[.82rem] text-text-primary placeholder-text-disabled transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>
                  <SubmitBtn
                    loading={submitting}
                    disabled={!advUsername.trim() || !advPassword.trim()}
                    loadingLabel="Logging in…"
                    label="Log In with Password"
                    onClick={handleAdvancedLogin}
                  />
                </>
              ) : (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-mono text-[.62rem] uppercase tracking-[.16em] text-text-muted">
                      Verification code
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={advMfaCode}
                      onChange={(e) =>
                        setAdvMfaCode(e.target.value.replace(/\D/g, "").slice(0, 8))
                      }
                      placeholder="123456"
                      className="w-full rounded-sm border border-border-default bg-bg-elevated px-3 py-2.5 text-center font-mono text-[.82rem] tracking-[.3em] text-text-primary placeholder-text-disabled transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>
                  <SubmitBtn
                    loading={submitting}
                    disabled={!advMfaCode.trim()}
                    loadingLabel="Verifying…"
                    label="Submit Code"
                    onClick={handleAdvancedMfa}
                  />
                  <button
                    onClick={() => setAdvStep("credentials")}
                    className="text-center font-mono text-[.65rem] text-text-muted hover:text-text-secondary"
                  >
                    ← Back to credentials
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Connected dashboard ───────────────────────────────────────────────────

  function normalizeSources(raw: unknown): TwitterSource[] {
    if (Array.isArray(raw)) return raw as TwitterSource[];
    const obj = raw as Record<string, unknown> | null | undefined;
    if (obj && Array.isArray(obj.sources)) return obj.sources as TwitterSource[];
    return [];
  }
  const sources = normalizeSources(sourcesQuery.data);
  const sq = sourcesSearch.toLowerCase();
  const filteredSources = sq
    ? sources.filter(
        (s) =>
          (s.handle ?? "").toLowerCase().includes(sq) ||
          (s.displayName ?? "").toLowerCase().includes(sq) ||
          (s.listId ?? "").toLowerCase().includes(sq),
      )
    : sources;
  const status = statusQuery.data;
  const displayHandle = status?.handle ? `@${status.handle}` : (status?.displayName ?? "Connected");
  const sessionInvalid =
    status?.status === "action_required" || status?.status === "session_invalid";
  const homeEnabled = configQuery.data?.homeEnabled ?? false;

  return (
    <div className="flex flex-col gap-6 p-6">
      <Back onClick={() => navigate(ROUTES.COPY_TRADING)} />

      <h1 className="font-display text-xl font-bold uppercase tracking-[.12em] text-text-primary">
        X (Twitter) Copy Trading
      </h1>

      {/* Session invalid banner */}
      {sessionInvalid && (
        <div className="flex items-start gap-3 rounded-lg border border-bear/30 bg-bear/10 p-4">
          <LuTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-bear" />
          <div className="flex flex-col gap-2">
            <p className="font-mono text-[.68rem] text-bear">
              Your X session has expired. Re-paste your cookies to restore the connection.
            </p>
            <button
              onClick={() => setStep("connect")}
              className="w-fit rounded-sm bg-bear px-3 py-1.5 font-mono text-[.62rem] uppercase tracking-widest text-white hover:opacity-80"
            >
              Re-connect →
            </button>
          </div>
        </div>
      )}

      {/* Connection header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-subtle bg-bg-surface p-4 shadow-card">
        <div className="flex items-center gap-2">
          <span className="relative flex h-1.5 w-1.5">
            <span
              className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                sessionInvalid ? "bg-bear" : "bg-bull"
              }`}
            />
            <span
              className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
                sessionInvalid ? "bg-bear" : "bg-bull"
              }`}
            />
          </span>
          <span className="font-mono text-[.7rem] text-text-primary">{displayHandle}</span>
        </div>

        {confirmLogout ? (
          <div className="flex items-center gap-2">
            <span className="font-mono text-[.62rem] text-text-muted">Disconnect X?</span>
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

      {/* Polling notice */}
      <div className="rounded-sm border border-border-subtle bg-bg-surface px-3 py-2 font-mono text-[.62rem] text-text-disabled">
        🕐 New tweets checked every ~5 minutes · Only tweets posted after you add a source are copied
      </div>

      {/* Add source form */}
      <div className="flex flex-col gap-4 rounded-lg border border-border-subtle bg-bg-surface p-5 shadow-card">
        <p className="font-mono text-[.62rem] uppercase tracking-[.16em] text-text-muted">
          Add source
        </p>

        <div className="flex gap-2">
          {(["account", "list", ...(homeEnabled ? (["home"] as SourceKind[]) : [])] as SourceKind[]).map(
            (k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={`rounded-sm border px-3 py-1 font-mono text-[.62rem] uppercase tracking-widest transition-colors ${
                  kind === k
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border-subtle text-text-muted hover:border-accent/50"
                }`}
              >
                {k === "account" ? "@Account" : k === "list" ? "List" : "Home"}
              </button>
            ),
          )}
        </div>

        {kind === "account" && (
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[.62rem] uppercase tracking-[.16em] text-text-muted">
              Twitter handle
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={handle}
                onChange={(e) => {
                  setHandle(e.target.value);
                  setResolvedHandle(null);
                }}
                placeholder="elonmusk (no @)"
                className="flex-1 rounded-sm border border-border-default bg-bg-elevated px-3 py-2.5 font-mono text-[.82rem] text-text-primary placeholder-text-disabled transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <button
                onClick={handleResolve}
                disabled={!handle.trim() || resolving}
                className="flex items-center gap-1.5 rounded-sm border border-border-default px-3 font-mono text-[.62rem] uppercase tracking-widest text-text-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-40"
              >
                {resolving ? <LuLoader className="h-3 w-3 animate-spin" /> : "Verify"}
              </button>
            </div>
            {resolvedHandle && (
              <p className="font-mono text-[.6rem] text-bull">✓ {resolvedHandle}</p>
            )}
          </div>
        )}

        {kind === "list" && (
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[.62rem] uppercase tracking-[.16em] text-text-muted">
              List ID
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={listId}
              onChange={(e) => setListId(e.target.value.replace(/\D/g, ""))}
              placeholder="12345678 (from x.com/i/lists/…)"
              className="w-full rounded-sm border border-border-default bg-bg-elevated px-3 py-2.5 font-mono text-[.82rem] text-text-primary placeholder-text-disabled transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <p className="font-mono text-[.6rem] text-text-disabled">
              Find the numeric ID in the URL: x.com/i/lists/<strong>ID</strong>
            </p>
          </div>
        )}

        {kind === "home" && (
          <p className="font-mono text-[.65rem] text-text-muted">
            Copies signals from your home timeline. Checked every ~5 min.
          </p>
        )}

        <button
          onClick={handleAddSource}
          disabled={addSource.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-sm bg-accent py-2 font-mono text-[.72rem] font-bold uppercase tracking-widest text-bg-base transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {addSource.isPending ? (
            <>
              <LuLoader className="h-3 w-3 animate-spin" /> Adding…
            </>
          ) : (
            `Add ${kind === "account" ? "@Account" : kind === "list" ? "List" : "Home Timeline"}`
          )}
        </button>
      </div>

      {/* My Copied Sources */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[.62rem] uppercase tracking-[.16em] text-text-muted">
            My Copied Sources
          </span>
          <button
            onClick={() => qc.invalidateQueries({ queryKey: qk.twitterSources() })}
            className="flex items-center gap-1.5 font-mono text-[.6rem] text-text-muted transition-colors hover:text-text-secondary"
          >
            <LuRefreshCw className="h-3 w-3" /> Refresh
          </button>
        </div>

        {sourcesQuery.isLoading ? (
          <div className="flex items-center gap-2 py-4 font-mono text-[.65rem] text-text-muted">
            <LuLoader className="h-3.5 w-3.5 animate-spin" /> Loading sources…
          </div>
        ) : sources.length === 0 ? (
          <div className="rounded-lg border border-border-subtle bg-bg-surface p-6 text-center shadow-card">
            <p className="font-mono text-[.65rem] text-text-muted">No sources added yet.</p>
            <p className="mt-1 font-mono text-[.6rem] text-text-disabled">
              Add an @account, list, or home timeline above.
            </p>
          </div>
        ) : (
          <>
            <div className="relative">
              <LuSearch className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={sourcesSearch}
                onChange={(e) => setSourcesSearch(e.target.value)}
                placeholder="Search sources…"
                className="w-full rounded-sm border border-border-default bg-bg-elevated py-2 pl-8 pr-3 font-mono text-[.7rem] text-text-primary placeholder-text-disabled focus:border-accent focus:outline-none"
              />
            </div>
            {filteredSources.length === 0 ? (
              <p className="font-mono text-[.65rem] text-text-muted">No sources match your search.</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border-subtle bg-bg-surface shadow-card">
                {filteredSources.map((source, i) => {
                  const isLast = i === filteredSources.length - 1;
                  const isStopping = removeSource.isPending && removeSource.variables === source.id;
                  const label =
                    source.kind === "account"
                      ? `@${source.handle ?? source.displayName}`
                      : source.kind === "list"
                      ? `List ${source.listId}`
                      : "Home Timeline";
                  return (
                    <div
                      key={source.id}
                      className={`flex items-center justify-between px-4 py-3 ${
                        !isLast ? "border-b border-border-subtle" : ""
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-[.72rem] text-text-primary">
                          {source.kind === "account"
                            ? "🐦"
                            : source.kind === "list"
                            ? "📋"
                            : "🏠"}{" "}
                          {label}
                        </p>
                        <div className="flex items-center gap-3">
                          {source.signalsCount !== undefined && (
                            <p className="font-mono text-[.6rem] text-text-disabled">
                              {source.signalsCount} signal{source.signalsCount !== 1 ? "s" : ""}
                            </p>
                          )}
                          {source.lastItemAt && (
                            <p className="font-mono text-[.6rem] text-text-disabled">
                              Last: {new Date(source.lastItemAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        {confirmStop === source.id ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[.58rem] text-text-muted">Sure?</span>
                            <button
                              onClick={() => removeSource.mutate(source.id)}
                              disabled={isStopping}
                              className="rounded-sm bg-bear px-2 py-1 font-mono text-[.58rem] text-white hover:opacity-80 disabled:opacity-50"
                            >
                              {isStopping ? (
                                <LuLoader className="h-2.5 w-2.5 animate-spin" />
                              ) : (
                                "Stop"
                              )}
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
                            onClick={() => setConfirmStop(source.id)}
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
          </>
        )}
      </div>
    </div>
  );
}
