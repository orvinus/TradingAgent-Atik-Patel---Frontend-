// src/components/copy-trading/PreSubmitChecksPanel.tsx
import { LuCircleCheck, LuCircleX, LuMinus } from "react-icons/lu";
import type { PreSubmitCheck } from "@/types/copyValidator";
import { mapErrorCode } from "@/utils/copyTradingFormatters";

const CHECK_LABELS: Record<string, string> = {
  options_enabled: "Options enabled on broker",
  market_hours: "Market hours",
  price_sanity: "Price sanity",
  tradability: "Contract tradability",
  buying_power: "Buying power",
  slippage: "Slippage tolerance",
};

interface Props {
  checks: PreSubmitCheck[];
  errorCode?: string | null | undefined;
  errorMessage?: string | null | undefined;
}

export function PreSubmitChecksPanel({ checks, errorCode, errorMessage }: Props) {
  const failedCheck = checks.find((c) => !c.ok && !c.skipped);
  const friendlyMessage = failedCheck?.message
    ? failedCheck.message
    : mapErrorCode(errorCode, errorMessage ?? undefined);

  return (
    <div className="rounded-sm border border-bear/30 bg-bear/10 p-4">
      <div className="mb-3 flex items-center gap-2">
        <LuCircleX className="h-4 w-4 text-bear" />
        <span className="font-mono text-[.68rem] font-bold text-bear">Order blocked — pre-submit check failed</span>
      </div>

      {failedCheck && (
        <div className="mb-3 rounded-sm border border-bear/20 bg-bear/5 px-3 py-2">
          <p className="font-mono text-[.63rem] font-bold uppercase tracking-widest text-bear">
            {errorCode ?? failedCheck.code ?? "Error"}
          </p>
          <p className="mt-0.5 font-mono text-[.62rem] text-text-secondary">{friendlyMessage}</p>
          {failedCheck.deviationPct != null && (
            <p className="mt-0.5 font-mono text-[.6rem] text-text-muted">
              Deviation: {failedCheck.deviationPct.toFixed(1)}% from market mid
              {failedCheck.marketMid != null ? ` $${failedCheck.marketMid}` : ""}
            </p>
          )}
          {failedCheck.required != null && failedCheck.buyingPower != null && (
            <p className="mt-0.5 font-mono text-[.6rem] text-text-muted">
              Required: ${failedCheck.required.toLocaleString()} · Available: ${failedCheck.buyingPower.toLocaleString()}
            </p>
          )}
          {failedCheck.adverseSlippagePct != null && (
            <p className="mt-0.5 font-mono text-[.6rem] text-text-muted">
              Moved {failedCheck.adverseSlippagePct.toFixed(2)}% vs max {failedCheck.maxSlippagePct?.toFixed(2) ?? "—"}%
              {failedCheck.referencePrice != null ? ` · Signal ref $${failedCheck.referencePrice}` : ""}
              {failedCheck.marketPrice != null ? ` · Market $${failedCheck.marketPrice}` : ""}
            </p>
          )}
        </div>
      )}

      <p className="mb-2 font-mono text-[.58rem] uppercase tracking-[.14em] text-text-muted">Checks run:</p>
      <div className="flex flex-col gap-1">
        {checks.map((check, i) => (
          <div key={i} className="flex items-center gap-2">
            {check.skipped ? (
              <LuMinus className="h-3 w-3 text-text-disabled" />
            ) : check.ok ? (
              <LuCircleCheck className="h-3 w-3 text-bull" />
            ) : (
              <LuCircleX className="h-3 w-3 text-bear" />
            )}
            <span
              className={`font-mono text-[.62rem] ${
                check.skipped ? "text-text-disabled" : check.ok ? "text-text-secondary" : "text-bear"
              }`}
            >
              {CHECK_LABELS[check.name] ?? check.name}
              {check.skipped && " (skipped)"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
