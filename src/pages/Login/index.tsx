// src/pages/Login/index.tsx
import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAppStore } from "@/store/index";
import { authApi } from "@/api/endpoints/auth";
import { loadRoleAndPermissions } from "@/hooks/usePermissions";
import { BrandMark } from "@/components/auth/BrandMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "@/components/ui/Toast";
import { LuMail, LuLock, LuEye, LuEyeOff, LuLoader } from "react-icons/lu";

// ─── Password validation ────────────────────────────────────────────────────

interface PasswordRules {
  minLength: boolean;   // ≥ 12
  maxLength: boolean;   // ≤ 128
  uppercase: boolean;   // at least one A-Z
  lowercase: boolean;   // at least one a-z
  digit: boolean;       // at least one 0-9
  symbol: boolean;      // at least one special char
}

function checkPassword(pw: string): PasswordRules {
  return {
    minLength: pw.length >= 12,
    maxLength: pw.length <= 128,
    uppercase: /[A-Z]/.test(pw),
    lowercase: /[a-z]/.test(pw),
    digit: /[0-9]/.test(pw),
    symbol: /[^A-Za-z0-9]/.test(pw),
  };
}

function isPasswordValid(rules: PasswordRules): boolean {
  return Object.values(rules).every(Boolean);
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function Login() {
  const navigate = useNavigate();
  const { setSession, setUser, pendingOnboarding } = useAppStore();

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading]   = useState(false);

  const pwRules = useMemo(() => checkPassword(password), [password]);
  const pwValid = isPasswordValid(pwRules);


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Email and password are required.");
      return;
    }

    if (!pwValid) {
      toast.error("Please fix the password issues below before signing in.");
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.login({ email, password });
      setSession({
        token: res.access_token,
        refreshToken: res.refresh_token,
        sessionId: res.session_id,
      });
      setUser({ id: res.session_id, email });
      // Pull role from JWT and load that role's RBAC permissions for UI gating.
      // Don't block sign-in on this — it runs in the background.
      void loadRoleAndPermissions(res.access_token);
      toast.success("Signed in. Welcome back.");
      navigate(pendingOnboarding ? "/onboarding/plan" : "/", { replace: true });
    } catch (err) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : "Invalid credentials. Please try again.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4">
        <BrandMark size="sm" showWord />
        <ThemeToggle />
      </div>

      {/* Card */}
      <div className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md rounded-lg border border-border-subtle bg-bg-surface p-8 shadow-card">
          {/* Heading */}
          <div className="mb-7 text-center">
            <h1 className="font-display text-xl font-bold uppercase tracking-[.12em] text-text-primary">
              Welcome to TradingOS
            </h1>
            <p className="mt-2 font-mono text-[.7rem] uppercase tracking-[.14em] text-text-muted">
              Sign in to access your trading OS
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[.62rem] uppercase tracking-[.16em] text-text-muted">
                Email Address
              </label>
              <div className="relative">
                <LuMail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="trader@firm.com"
                  autoComplete="email"
                  className="w-full rounded-sm border border-border-default bg-bg-elevated py-2.5 pl-9 pr-3 font-mono text-[.82rem] text-text-primary placeholder-text-disabled transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[.62rem] uppercase tracking-[.16em] text-text-muted">
                Password
              </label>
              <div className="relative">
                <LuLock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  maxLength={128}
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
            </div>

            {/* Remember + forgot */}
            <div className="flex items-center justify-between font-mono text-[.65rem]">
              <label className="flex cursor-pointer items-center gap-2 text-text-secondary">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-3.5 w-3.5 rounded-sm border-border-default bg-bg-elevated accent-accent"
                />
                Remember me
              </label>
              <Link
                to="/forgot-password"
                className="text-accent transition-colors hover:text-accent-hover"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-sm bg-accent py-2.5 font-mono text-[.78rem] font-bold uppercase tracking-widest text-bg-base transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <LuLoader className="h-3.5 w-3.5 animate-spin" /> Authenticating...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="mt-6 text-center font-mono text-[.7rem] text-text-muted">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="text-accent transition-colors hover:text-accent-hover"
            >
              Sign Up
            </Link>
          </p>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between border-t border-border-subtle px-6 py-3">
        <div className="flex items-center gap-3 font-mono text-[.6rem] text-text-disabled">
          <span className="flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-bull opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-bull" />
            </span>
            All systems operational
          </span>
          <span>·</span>
          <span>v2.4.1</span>
        </div>
        <span className="font-mono text-[.6rem] text-text-disabled">© 2026 Trading OS</span>
      </div>
    </div>
  );
}