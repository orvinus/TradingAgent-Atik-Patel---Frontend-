// src/pages/Signup/index.tsx
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { authApi } from "@/api/endpoints/auth";
import { BrandMark } from "@/components/auth/BrandMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "@/components/ui/Toast";
import {
  LuMail,
  LuLock,
  LuEye,
  LuEyeOff,
  LuLoader,
  LuCheck,
  LuX,
  LuUser,
  LuChevronDown,
} from "react-icons/lu";

const TIMEZONES = [
  "Asia/Kolkata",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Asia/Dubai",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Australia/Sydney",
  "UTC",
];

function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

// ─── Password validation ────────────────────────────────────────────────────

interface PwChecks {
  minLength: boolean; // >= 12
  maxLength: boolean; // <= 128
  upper: boolean;     // at least one A-Z
  lower: boolean;     // at least one a-z
  number: boolean;    // at least one 0-9
  symbol: boolean;    // at least one special char
}

function pwChecks(pw: string): PwChecks {
  return {
    minLength: pw.length >= 12,
    maxLength: pw.length <= 128,
    upper:     /[A-Z]/.test(pw),
    lower:     /[a-z]/.test(pw),
    number:    /[0-9]/.test(pw),
    symbol:    /[^A-Za-z0-9]/.test(pw),
  };
}

function strengthScore(c: PwChecks): number {
  // Score based on the 5 content rules (excluding maxLength)
  return [c.minLength, c.upper, c.lower, c.number, c.symbol].filter(Boolean).length;
}

const RULE_LABELS: { key: keyof PwChecks; label: string }[] = [
  { key: "minLength", label: "12-128 characters" },
  { key: "upper",     label: "One uppercase letter (A-Z)" },
  { key: "lower",     label: "One lowercase letter (a-z)" },
  { key: "number",    label: "One digit (0-9)" },
  { key: "symbol",    label: "One special character (!@#...)" },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function Signup() {
  const navigate = useNavigate();
  const detected = useMemo(detectTimezone, []);

  const [firstName, setFirstName]       = useState("");
  const [lastName, setLastName]         = useState("");
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [confirm, setConfirm]           = useState("");
  const [showPw, setShowPw]             = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [tz, setTz]                     = useState(detected);
  const [agreeTerms, setAgreeTerms]     = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [pwTouched, setPwTouched]       = useState(false);

  const checks   = pwChecks(password);
  const score    = strengthScore(checks);
  const allValid = checks.minLength && checks.maxLength && checks.upper && checks.lower && checks.number && checks.symbol;
  const match    = confirm.length > 0 && password === confirm;

  const strengthLabel = ["", "Weak", "Weak", "Fair", "Good", "Strong"][score];
  const strengthBarClass = (i: number) => {
    if (i >= score) return "bg-border-subtle";
    if (score <= 2)  return "bg-bear";
    if (score === 3) return "bg-warning";
    if (score === 4) return "bg-info";
    return "bg-bull";
  };
  const strengthLabelClass =
    score <= 2 ? "text-bear" : score === 3 ? "text-warning" : score === 4 ? "text-info" : "text-bull";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPwTouched(true);

    if (!firstName || !lastName) {
      toast.error("Please enter your name.");
      return;
    }
    if (!email) {
      toast.error("Email is required.");
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
    if (!agreeTerms || !agreePrivacy) {
      toast.error("Please agree to the Terms and Privacy Policy.");
      return;
    }

    setLoading(true);
    try {
      const reg = await authApi.register({
        first_name: firstName,
        last_name: lastName,
        email,
        password,
        tz,
        agree_terms: agreeTerms,
        agree_privacy: agreePrivacy,
      });

      // Backend sends a verification email — user must paste the token from
      // their inbox into the verify screen. We only carry the email forward.
      toast.success("Account created. Check your inbox for the verification token.");
      const params = new URLSearchParams({ email: reg.email });
      navigate(`/verify-email?${params.toString()}`);
    } catch (err) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : "Registration failed. Please try again.";
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
          <div className="mb-6 text-center">
            <h1 className="font-display text-xl font-bold uppercase tracking-[.12em] text-text-primary">
              Create Your Account
            </h1>
            <p className="mt-2 font-mono text-[.7rem] uppercase tracking-[.14em] text-text-muted">
              Join the next generation trading platform
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            {/* Name */}
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <LuUser className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First Name *"
                  className="w-full rounded-sm border border-border-default bg-bg-elevated py-2.5 pl-9 pr-3 font-mono text-[.82rem] text-text-primary placeholder-text-disabled transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last Name *"
                className="w-full rounded-sm border border-border-default bg-bg-elevated py-2.5 px-3 font-mono text-[.82rem] text-text-primary placeholder-text-disabled transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            {/* Email */}
            <div className="relative">
              <LuMail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address"
                autoComplete="email"
                className="w-full rounded-sm border border-border-default bg-bg-elevated py-2.5 pl-9 pr-3 font-mono text-[.82rem] text-text-primary placeholder-text-disabled transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            {/* Password */}
            <div>
              <div className="relative">
                <LuLock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPwTouched(true);
                  }}
                  onBlur={() => setPwTouched(true)}
                  placeholder="Minimum 12 characters"
                  autoComplete="new-password"
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

              {/* Strength bar + checklist — shown once user starts typing */}
              {pwTouched && password.length > 0 && (
                <div className="mt-2 flex flex-col gap-1.5">
                  {/* 5-segment bar */}
                  <div className="flex gap-1">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <span
                        key={i}
                        className={`h-0.5 flex-1 rounded-full transition-colors duration-300 ${strengthBarClass(i)}`}
                      />
                    ))}
                  </div>

                  {score > 0 && (
                    <span className="font-mono text-[.6rem] uppercase tracking-widest text-text-muted">
                      Strength:{" "}
                      <span className={strengthLabelClass}>{strengthLabel}</span>
                    </span>
                  )}

                  {/* Rule checklist */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {RULE_LABELS.map(({ key, label }) => (
                      <CheckItem key={key} ok={checks[key]} label={label} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm */}
            <div className="relative">
              <LuLock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                type={showConfirm ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm Password"
                autoComplete="new-password"
                maxLength={128}
                className="w-full rounded-sm border border-border-default bg-bg-elevated py-2.5 pl-9 pr-28 font-mono text-[.82rem] text-text-primary placeholder-text-disabled transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
              {confirm.length > 0 && (
                <span
                  className={`absolute right-10 top-1/2 flex -translate-y-1/2 items-center gap-1 font-mono text-[.62rem] uppercase tracking-[.12em] ${
                    match ? "text-bull" : "text-bear"
                  }`}
                >
                  {match ? <LuCheck className="h-3 w-3" /> : <LuX className="h-3 w-3" />}
                  {match ? "Match" : "Mismatch"}
                </span>
              )}
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-disabled transition-colors hover:text-text-secondary"
              >
                {showConfirm ? <LuEyeOff className="h-4 w-4" /> : <LuEye className="h-4 w-4" />}
              </button>
            </div>

            {/* Timezone */}
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[.62rem] uppercase tracking-[.16em] text-text-muted">
                Timezone
              </label>
              <div className="relative">
                <select
                  value={tz}
                  onChange={(e) => setTz(e.target.value)}
                  className="w-full appearance-none rounded-sm border border-border-default bg-bg-elevated py-2.5 px-3 pr-9 font-mono text-[.82rem] text-text-primary transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  {!TIMEZONES.includes(detected) && (
                    <option value={detected}>{detected} (detected)</option>
                  )}
                  {TIMEZONES.map((z) => (
                    <option key={z} value={z}>
                      {z}
                    </option>
                  ))}
                </select>
                <LuChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              </div>
            </div>

            {/* Agreements */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[.65rem] text-text-secondary">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="h-3.5 w-3.5 rounded-sm border-border-default bg-bg-elevated accent-accent"
                />
                I agree to{" "}
                <a href="#" className="text-accent hover:text-accent-hover">
                  Terms of Service
                </a>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={agreePrivacy}
                  onChange={(e) => setAgreePrivacy(e.target.checked)}
                  className="h-3.5 w-3.5 rounded-sm border-border-default bg-bg-elevated accent-accent"
                />
                I agree to{" "}
                <a href="#" className="text-accent hover:text-accent-hover">
                  Privacy Policy
                </a>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-sm bg-accent py-2.5 font-mono text-[.78rem] font-bold uppercase tracking-widest text-bg-base transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <LuLoader className="h-3.5 w-3.5 animate-spin" /> Creating account...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="mt-6 text-center font-mono text-[.7rem] text-text-muted">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-accent transition-colors hover:text-accent-hover"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function CheckItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`flex items-center gap-1 font-mono text-[.62rem] uppercase tracking-[.12em] transition-colors ${
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