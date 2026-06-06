// src/components/auth/OnboardingHeader.tsx
import { Link, useNavigate } from "react-router-dom";
import { BrandMark } from "./BrandMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAppStore } from "@/store/index";
import { LuLogOut } from "react-icons/lu";

interface Props {
  skipTo?: string;
  onSkip?: () => void;
}

export function OnboardingHeader({ skipTo, onSkip }: Props) {
  const navigate = useNavigate();
  const logout = useAppStore((s) => s.logout);

  function handleSignOut() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="flex items-center justify-between border-b border-border-subtle px-6 py-4">
      <BrandMark size="sm" showWord />

      <div className="flex items-center gap-3">
        <ThemeToggle />

        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 rounded-sm border border-border-subtle bg-bg-elevated px-3 py-1.5 font-mono text-[.62rem] uppercase tracking-[.16em] text-text-muted transition-colors hover:border-border-default hover:text-text-secondary"
        >
          <LuLogOut className="h-3 w-3" />
          Sign out
        </button>

        {(skipTo || onSkip) && (
          skipTo ? (
            <Link
              to={skipTo}
              className="rounded-sm border border-accent-border bg-accent-subtle px-3 py-1.5 font-mono text-[.62rem] uppercase tracking-[.16em] text-accent transition-colors hover:bg-accent/15"
            >
              Skip
            </Link>
          ) : (
            <button
              onClick={onSkip}
              className="rounded-sm border border-accent-border bg-accent-subtle px-3 py-1.5 font-mono text-[.62rem] uppercase tracking-[.16em] text-accent transition-colors hover:bg-accent/15"
            >
              Skip
            </button>
          )
        )}
      </div>
    </header>
  );
}
