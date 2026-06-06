// src/pages/ResetPassword/index.tsx
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { authApi } from "@/api/endpoints/auth";
import { BrandMark } from "@/components/auth/BrandMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "@/components/ui/Toast";
import {
  LuLock,
  LuKey,
  LuEye,
  LuEyeOff,
  LuLoader,
  LuCheck,
  LuX,
} from "react-icons/lu";

interface PwChecks {
  length: boolean;
  upper: boolean;
  number: boolean;
  symbol: boolean;
}

function pwChecks(pw: string): PwChecks {
  return {
    length: pw.length >= 12,
    upper: /[A-Z]/.test(pw),
    number: /[0-9]/.test(pw),
    symbol: /[^A-Za-z0-9]/.test(pw),
  };
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [token, setToken] = useState(params.get("token") ?? "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const checks = pwChecks(password);
  const allValid = checks.length && checks.upper && checks.number && checks.symbol;
  const match = confirm.length > 0 && password === confirm;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!token) {
      toast.error("Reset token is required.");
      return;
    }
    if (!allValid) {
      toast.error("Password does not meet all requirements.");
      return;
    }
    if (!match) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword({ token, new_password: password });
      setDone(true);
      toast.success("Password reset. You can now sign in.");
      setTimeout(() => navigate("/login", { replace: true }), 1800);
    } catch (err) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : "Could not reset password. The token may be invalid or expired.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between px-6 py-4">
        <BrandMark size="sm" showWord />
        <ThemeToggle />
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md rounded-lg border border-border-subtle bg-bg-surface p-8 shadow-card">
          {done ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-bull/30 bg-bull/10">
                <LuCheck className="h-7 w-7 text-bull" />
              </div>
              <h1 className="font-display text-lg font-bold uppercase tracking-[.12em] text-text-primary">
                Password Reset
              </h1>
              <p className="font-mono text-[.7rem] uppercase tracking-[.14em] text-text-muted">
                You can now sign in with your new password
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6 text-center">
                <h1 className="font-display text-xl font-bold uppercase tracking-[.12em] text-text-primary">
                  Reset Password
                </h1>
                <p className="mt-2 font-mono text-[.7rem] uppercase tracking-[.14em] text-text-muted">
                  Enter your token and a new password
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
                <div className="relative">
                  <LuKey className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Reset Token"
                    className="w-full rounded-sm border border-border-default bg-bg-elevated py-2.5 pl-9 pr-3 font-mono text-[.78rem] text-text-primary placeholder-text-disabled transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>

                <div>
                  <div className="relative">
                    <LuLock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                    <input
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="New Password (min 12 chars)"
                      autoComplete="new-password"
                      className="w-full rounded-sm border border-border-default bg-bg-elevated py-2.5 pl-9 pr-10 font-mono text-[.82rem] text-text-primary placeholder-text-disabled transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-disabled transition-colors hover:text-text-secondary"
                    >
                      {showPw ? <LuEyeOff className="h-4 w-4" /> : <LuEye className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[.62rem] uppercase tracking-[.12em]">
                    <CheckItem ok={checks.length} label="12+ Chars" />
                    <CheckItem ok={checks.upper} label="1 Upper" />
                    <CheckItem ok={checks.number} label="1 Number" />
                    <CheckItem ok={checks.symbol} label="1 Symbol" />
                  </div>
                </div>

                <div className="relative">
                  <LuLock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                  <input
                    type={showPw ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Confirm New Password"
                    autoComplete="new-password"
                    className="w-full rounded-sm border border-border-default bg-bg-elevated py-2.5 pl-9 pr-24 font-mono text-[.82rem] text-text-primary placeholder-text-disabled transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                  {confirm.length > 0 && (
                    <span
                      className={`absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 font-mono text-[.62rem] uppercase tracking-[.12em] ${
                        match ? "text-bull" : "text-bear"
                      }`}
                    >
                      {match ? <LuCheck className="h-3 w-3" /> : <LuX className="h-3 w-3" />}
                      {match ? "Match" : "Mismatch"}
                    </span>
                  )}
                </div>


                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 flex w-full items-center justify-center gap-2 rounded-sm bg-accent py-2.5 font-mono text-[.78rem] font-bold uppercase tracking-widest text-bg-base transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <LuLoader className="h-3.5 w-3.5 animate-spin" /> Resetting...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </button>
              </form>

              <p className="mt-6 text-center font-mono text-[.7rem] text-text-muted">
                Remember your password?{" "}
                <Link
                  to="/login"
                  className="text-accent transition-colors hover:text-accent-hover"
                >
                  Sign In
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CheckItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`flex items-center gap-1 transition-colors ${
        ok ? "text-bull" : "text-text-muted"
      }`}
    >
      <span
        className={`flex h-3 w-3 items-center justify-center rounded-full ${
          ok ? "bg-bull/20" : "bg-bg-overlay"
        }`}
      >
        <LuCheck className="h-2 w-2" />
      </span>
      {label}
    </span>
  );
}
