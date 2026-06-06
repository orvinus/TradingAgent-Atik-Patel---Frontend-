// src/pages/ForgotPassword/index.tsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { authApi } from "@/api/endpoints/auth";
import { BrandMark } from "@/components/auth/BrandMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "@/components/ui/Toast";
import { LuMail, LuLoader, LuArrowLeft } from "react-icons/lu";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!email) {
      toast.error("Please enter your email.");
      return;
    }

    setLoading(true);
    try {
      await authApi.forgotPassword({ email });
      setSent(true);
      toast.success("Reset link sent. Check your inbox for the token.");

      // Carry only the email forward — the user must paste the reset
      // token from their inbox into the reset-password screen.
      const params = new URLSearchParams({ email });
      setTimeout(() => {
        navigate(`/reset-password?${params.toString()}`);
      }, 1200);
    } catch (err) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : "Could not send reset link. Please try again.";
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
          <div className="mb-6 text-center">
            <h1 className="font-display text-xl font-bold uppercase tracking-[.12em] text-text-primary">
              Forgot Password?
            </h1>
            <p className="mt-2 font-mono text-[.7rem] uppercase tracking-[.14em] text-text-muted">
              Enter your email and we'll send a reset link
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

            <button
              type="submit"
              disabled={loading || sent}
              className="flex w-full items-center justify-center gap-2 rounded-sm bg-accent py-2.5 font-mono text-[.78rem] font-bold uppercase tracking-widest text-bg-base transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <LuLoader className="h-3.5 w-3.5 animate-spin" /> Sending...
                </>
              ) : (
                "Send Reset Link"
              )}
            </button>
          </form>

          <Link
            to="/login"
            className="mt-6 flex items-center justify-center gap-1.5 font-mono text-[.7rem] uppercase tracking-[.14em] text-text-muted transition-colors hover:text-text-secondary"
          >
            <LuArrowLeft className="h-3 w-3" /> Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
