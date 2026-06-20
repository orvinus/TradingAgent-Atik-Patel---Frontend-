// src/pages/CopyTradingValidator/InfoTip.tsx
import { useState } from "react";
import { LuInfo } from "react-icons/lu";

/** Small hover/focus tooltip for explaining a rule input. */
export function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={text}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="text-text-muted transition-colors hover:text-text-secondary"
      >
        <LuInfo className="h-3 w-3" />
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 z-50 mb-1.5 w-56 -translate-x-1/2 rounded-sm border border-border-default bg-bg-overlay px-2.5 py-1.5 font-mono text-[.6rem] leading-snug text-text-secondary shadow-card"
        >
          {text}
        </span>
      )}
    </span>
  );
}
