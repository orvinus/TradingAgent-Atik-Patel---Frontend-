// src/components/copy-trading/ProfileSettingsTabs.tsx
// Reusable tab shell for four asset-class profile tabs.
import type { ValidatorProfile } from "@/types/copyValidator";

interface Tab {
  id: ValidatorProfile;
  label: string;
  dotColor: string;
}

const TABS: Tab[] = [
  { id: "equity",    label: "Equity",             dotColor: "bg-blue-400" },
  { id: "commodity", label: "FX & Metals",          dotColor: "bg-amber-400" },
  { id: "crypto",    label: "Crypto",              dotColor: "bg-orange-400" },
  { id: "options",   label: "Futures & Options",   dotColor: "bg-purple-400" },
];

interface Props {
  activeTab: ValidatorProfile;
  onTabChange: (tab: ValidatorProfile) => void;
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
              onClick={() => onTabChange(tab.id)}
              className={`px-4 py-2.5 font-mono text-[.65rem] font-bold uppercase tracking-widest transition-colors ${
                active
                  ? "border-b-2 border-accent text-accent"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${tab.dotColor}`} />
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="pt-5">{children}</div>
    </div>
  );
}
