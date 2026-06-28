// src/pages/CopyTradingValidator/MessageFilterSection.tsx
// Include / exclude message-phrase filter UI, shared across all four profile tabs.

import { useState } from "react";
import type { MessageFilter } from "@/types/copyValidator";

// Fallback chips shown when the API doesn't return suggestions.
const FALLBACK_SUGGESTIONS = [
  "high trade",
  "loto",
  "lotto",
  "hero",
  "zero trade",
  "zero risk",
  "lottery",
  "gamble",
  "casino",
  "100% win",
  "guaranteed",
];

const inputCls =
  "w-full rounded-sm border border-border-default bg-bg-base px-2.5 py-1.5 font-mono text-[.68rem] text-text-primary outline-none focus:border-accent placeholder:text-text-disabled";

interface Props {
  value: MessageFilter;
  onChange: (next: MessageFilter) => void;
  suggestedDefaults?: string[];
}

export function MessageFilterSection({ value, onChange, suggestedDefaults }: Props) {
  const [showInclude, setShowInclude] = useState(
    !!(value.include && value.include.trim().length > 0),
  );

  const exc = value.exclude ?? "";
  const inc = value.include ?? "";

  const suggestions = suggestedDefaults ?? FALLBACK_SUGGESTIONS;

  // Add a suggested phrase into the exclude field (comma-separated).
  const addSuggestion = (phrase: string) => {
    const existing = exc
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (existing.map((s) => s.toLowerCase()).includes(phrase.toLowerCase())) return;
    const next = [...existing, phrase].join(", ");
    onChange({ ...value, exclude: next });
  };

  // Which suggestions are already in the exclude field?
  const activeExcludes = new Set(
    exc
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );

  return (
    <fieldset className="rounded-sm border border-border-subtle bg-bg-elevated/50 p-4">
      <legend className="mb-0 px-1 font-mono text-[.58rem] uppercase tracking-[.18em] text-text-disabled">
        Message phrase filter{" "}
        <span className="normal-case tracking-normal text-text-muted">(optional)</span>
      </legend>

      <div className="mt-3 flex flex-col gap-4">
        {/* Exclude phrases — primary */}
        <div className="flex flex-col gap-1.5">
          <label className="font-mono text-[.65rem] font-bold text-text-secondary">
            Exclude phrases
          </label>
          <input
            type="text"
            value={exc}
            placeholder="high trade, loto, hero, zero trade, lottery, gamble"
            onChange={(e) => onChange({ ...value, exclude: e.target.value })}
            className={inputCls}
          />
          <p className="font-mono text-[.58rem] text-text-muted">
            Reject signals whose message contains{" "}
            <strong className="text-text-secondary">any</strong> of these phrases.
            Comma-separated, case-insensitive.
          </p>

          {/* Suggested blocklist chips */}
          <div className="mt-1 flex flex-wrap gap-1.5">
            <span className="self-center font-mono text-[.56rem] text-text-disabled">
              Add suggested:
            </span>
            {suggestions.map((phrase) => {
              const active = activeExcludes.has(phrase.toLowerCase());
              return (
                <button
                  key={phrase}
                  type="button"
                  onClick={() => addSuggestion(phrase)}
                  disabled={active}
                  className={`rounded-sm border px-1.5 py-0.5 font-mono text-[.58rem] transition-colors ${
                    active
                      ? "border-border-subtle bg-bg-elevated text-text-disabled cursor-default"
                      : "border-border-default bg-bg-base text-text-muted hover:border-accent hover:text-text-primary cursor-pointer"
                  }`}
                >
                  {active ? "✓ " : "+ "}
                  {phrase}
                </button>
              );
            })}
          </div>
        </div>

        {/* Include phrases — advanced / collapsed */}
        {!showInclude ? (
          <button
            type="button"
            onClick={() => setShowInclude(true)}
            className="self-start font-mono text-[.6rem] text-text-muted underline decoration-dotted hover:text-text-primary"
          >
            + Add include phrases (advanced)
          </button>
        ) : (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="font-mono text-[.65rem] font-bold text-text-secondary">
                Include phrases{" "}
                <span className="font-normal text-text-muted">(advanced, optional)</span>
              </label>
              {!inc.trim() && (
                <button
                  type="button"
                  onClick={() => setShowInclude(false)}
                  className="font-mono text-[.58rem] text-text-disabled hover:text-text-muted"
                >
                  hide
                </button>
              )}
            </div>
            <input
              type="text"
              value={inc}
              placeholder="BUY, signal, trade alert"
              onChange={(e) => onChange({ ...value, include: e.target.value })}
              className={inputCls}
            />
            <p className="font-mono text-[.58rem] text-text-muted">
              When set, the message must contain{" "}
              <strong className="text-text-secondary">at least one</strong> of these phrases —
              otherwise the signal is rejected.
            </p>
          </div>
        )}
      </div>
    </fieldset>
  );
}
