// src/components/copy-trading/InstrumentBadge.tsx
import type { InstrumentProfile } from "@/types/copyValidator";
import { INSTRUMENT_PROFILE_CONFIG } from "@/utils/copyTradingFormatters";

interface Props {
  profile: InstrumentProfile | null | undefined;
  size?: "sm" | "md";
}

export function InstrumentBadge({ profile, size = "sm" }: Props) {
  const cfg = INSTRUMENT_PROFILE_CONFIG[profile ?? "unsupported"];
  const textSize = size === "md" ? "text-[.62rem]" : "text-[.52rem]";
  return (
    <span
      className={`inline-flex items-center rounded-sm border px-1.5 py-0.5 font-mono font-bold uppercase tracking-widest ${textSize} ${cfg.color} ${cfg.bgColor} ${cfg.borderColor}`}
    >
      {cfg.label}
    </span>
  );
}
