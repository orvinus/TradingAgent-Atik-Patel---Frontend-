// src/pages/VerifyEmail/index.tsx
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { authApi } from "@/api/endpoints/auth";
import { useAppStore } from "@/store/index";
import { BrandMark } from "@/components/auth/BrandMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "@/components/ui/Toast";
import { LuMail, LuCheck, LuLoader, LuKey } from "react-icons/lu";

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const setPendingOnboarding = useAppStore((s) => s.setPendingOnboarding);

  const emailFromParams = params.get("email") ?? "";
  const tokenFromParams = params.get("token") ?? "";

  // Pre-fill from URL (e.g. the magic link in the verification email)
  // but never auto-submit — the user still clicks "Verify Email".
  const [token, setToken] = useState(tokenFromParams);
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      toast.error("Verification token is required.");
      return;
    }
    setLoading(true);
    try {
      await authApi.verifyEmail({ token });
      // Flag the next sign-in as a fresh signup so the setup funnel is shown.
      setPendingOnboarding(true);
      setVerified(true);
      toast.success("Email verified. You can now sign in.");
      setTimeout(() => navigate("/login", { replace: true }), 1800);
    } catch (err) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : "Verification failed. The token may be expired or invalid.";
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
          {verified ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-bull/30 bg-bull/10">
                <LuCheck className="h-7 w-7 text-bull" />
              </div>
              <h1 className="font-display text-lg font-bold uppercase tracking-[.12em] text-text-primary">
                Email Verified
              </h1>
              <p className="font-mono text-[.7rem] uppercase tracking-[.14em] text-text-muted">
                Redirecting you to sign in...
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6 flex flex-col items-center gap-3 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-accent-border bg-accent-subtle">
                  <LuMail className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h1 className="font-display text-lg font-bold uppercase tracking-[.12em] text-text-primary">
                    Verify Your Email
                  </h1>
                  <p className="mt-2 font-mono text-[.7rem] uppercase tracking-[.14em] text-text-muted">
                    {emailFromParams ? (
                      <>Sent a link to {emailFromParams}</>
                    ) : (
                      "Enter the verification token from the email"
                    )}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[.62rem] uppercase tracking-[.16em] text-text-muted">
                    Verification Token
                  </label>
                  <div className="relative">
                    <LuKey className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                    <input
                      type="text"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder="Paste your verification token"
                      className="w-full rounded-sm border border-border-default bg-bg-elevated py-2.5 pl-9 pr-3 font-mono text-[.78rem] text-text-primary placeholder-text-disabled transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-sm bg-accent py-2.5 font-mono text-[.78rem] font-bold uppercase tracking-widest text-bg-base transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <LuLoader className="h-3.5 w-3.5 animate-spin" /> Verifying...
                    </>
                  ) : (
                    "Verify Email"
                  )}
                </button>
              </form>

              <p className="mt-6 text-center font-mono text-[.7rem] text-text-muted">
                Already verified?{" "}
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
