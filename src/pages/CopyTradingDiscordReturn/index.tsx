// src/pages/CopyTradingDiscordReturn/index.tsx
// Receives the OAuth callback redirect from the backend (e.g. /copy-trading/discord?connected=1)
// and immediately forwards to the main Discord copy trading page, preserving query params.
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { LuLoader } from "react-icons/lu";
import { ROUTES } from "@/constants/routes";

export default function CopyTradingDiscordReturn() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const connected = searchParams.get("connected");
    const target =
      ROUTES.COPY_TRADING_DISCORD + (connected === "1" ? "?connected=1" : "");
    navigate(target, { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex min-h-[60vh] flex-1 items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <LuLoader className="h-5 w-5 animate-spin text-text-muted" />
        <span className="font-mono text-[.65rem] uppercase tracking-widest text-text-muted">
          Completing connection…
        </span>
      </div>
    </div>
  );
}
