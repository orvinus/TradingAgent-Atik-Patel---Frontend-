// src/components/copy-trading/ProfileSettingsTabs.tsx
// Reusable tab shell for Equity & Crypto vs Options profile switching.

interface Tab {
  id: string;
  label: string;
}

const TABS: Tab[] = [
  { id: "equity", label: "Equity & Crypto" },
  { id: "options", label: "Options" },
];

interface Props {
  activeTab: "equity" | "options";
  onTabChange: (tab: "equity" | "options") => void;
  children: React.ReactNode;
}

export function ProfileSettingsTabs({ activeTab, onTabChange, children }: Props) {
  return (
    <div className="flex flex-col gap-0">
      {/* Tab bar */}
      <div className="flex border-b border-border-subtle">
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id as "equity" | "options")}
              className={`px-4 py-2.5 font-mono text-[.65rem] font-bold uppercase tracking-widest transition-colors ${
                active
                  ? "border-b-2 border-accent text-accent"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              {tab.id === "options" ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                  {tab.label}
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                  {tab.label}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="pt-5">{children}</div>
    </div>
  );
}
