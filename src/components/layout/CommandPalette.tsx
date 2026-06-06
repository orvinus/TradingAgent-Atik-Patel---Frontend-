// src/components/layout/CommandPalette.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/store/index";
import { NAV_ITEMS, ROUTES } from "@/constants/routes";
import { LuSearch, LuCornerDownLeft, LuArrowUp, LuArrowDown } from "react-icons/lu";

interface Item {
  to: string;
  label: string;
  icon: string;
}

// Resolve any function-typed routes (e.g. options requires :symbol)
function resolveItems(): Item[] {
  return NAV_ITEMS.map((n) => ({
    to: typeof n.to === "function" ? n.to("AAPL") : n.to,
    label: n.label,
    icon: n.icon,
  }));
}

// Loose substring match — keeps it dependency-free and predictable.
function matches(query: string, label: string): boolean {
  if (!query) return true;
  return label.toLowerCase().includes(query.toLowerCase());
}

export function CommandPalette() {
  const navigate = useNavigate();
  const open = useAppStore((s) => s.commandPaletteOpen);
  const setOpen = useAppStore((s) => s.setCommandPaletteOpen);

  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const allItems = useMemo(resolveItems, []);
  const items = useMemo(
    () => allItems.filter((i) => matches(query, i.label)),
    [allItems, query],
  );

  // Reset state on every open + focus the input.
  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      // Focus on next frame so the input is mounted.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Keep active index in range when results change.
  useEffect(() => {
    if (active >= items.length) setActive(0);
  }, [items.length, active]);

  // Scroll active row into view.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const row = list.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    row?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function pick(item: Item) {
    setOpen(false);
    navigate(item.to);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (items.length === 0 ? 0 : (a + 1) % items.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) =>
        items.length === 0 ? 0 : (a - 1 + items.length) % items.length,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = items[active];
      if (item) pick(item);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      className="fixed inset-0 z-[900] flex items-start justify-center px-4 pt-[12vh]"
      onMouseDown={(e) => {
        // Close on backdrop click.
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden />

      {/* Panel */}
      <div
        className="relative w-full max-w-xl overflow-hidden rounded-md border border-border-default bg-bg-surface shadow-card"
        onKeyDown={onKeyDown}
      >
        {/* Input row */}
        <div className="flex items-center gap-3 border-b border-border-subtle px-4">
          <LuSearch className="h-4 w-4 flex-shrink-0 text-text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            placeholder="Search pages, strategies, symbols..."
            className="flex-1 bg-transparent py-3 font-mono text-sm text-text-primary placeholder-text-disabled outline-none"
          />
          <kbd className="hidden rounded-sm border border-border-subtle bg-bg-elevated px-1.5 py-0.5 font-mono text-[.6rem] uppercase tracking-[.16em] text-text-muted sm:inline-flex">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          className="max-h-[55vh] overflow-y-auto py-1"
          role="listbox"
          aria-label="Search results"
        >
          {items.length === 0 ? (
            <div className="px-4 py-10 text-center font-mono text-[.7rem] uppercase tracking-[.14em] text-text-muted">
              No results for "{query}"
            </div>
          ) : (
            items.map((item, idx) => {
              const isActive = idx === active;
              return (
                <button
                  key={item.to}
                  data-idx={idx}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onMouseEnter={() => setActive(idx)}
                  onClick={() => pick(item)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    isActive
                      ? "bg-accent-subtle text-accent"
                      : "text-text-secondary hover:bg-bg-elevated"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 flex-shrink-0 items-center justify-center text-base ${
                      isActive ? "text-accent" : "text-text-muted"
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span className="flex-1 font-mono text-[.78rem] uppercase tracking-[.12em]">
                    {item.label}
                  </span>
                  <span className="font-mono text-[.6rem] uppercase tracking-[.14em] text-text-disabled">
                    {item.to === ROUTES.HOME ? "/" : item.to}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer hints */}
        <div className="flex items-center justify-between gap-3 border-t border-border-subtle bg-bg-elevated/50 px-4 py-2 font-mono text-[.6rem] uppercase tracking-[.14em] text-text-muted">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Kbd>
                <LuArrowUp className="h-2.5 w-2.5" />
              </Kbd>
              <Kbd>
                <LuArrowDown className="h-2.5 w-2.5" />
              </Kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <Kbd>
                <LuCornerDownLeft className="h-2.5 w-2.5" />
              </Kbd>
              Open
            </span>
          </div>
          <span className="flex items-center gap-1">
            <Kbd>Esc</Kbd>
            Close
          </span>
        </div>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded-sm border border-border-subtle bg-bg-surface px-1 text-[.55rem] tracking-normal text-text-secondary">
      {children}
    </span>
  );
}
