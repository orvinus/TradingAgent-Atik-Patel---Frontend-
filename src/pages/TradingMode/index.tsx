// src/pages/TradingMode/index.tsx
import { useState } from "react";
import {
  LuBrain, LuCopy, LuZap, LuShield, LuActivity,
  LuCircleCheck, LuArrowRight,
  LuFlame, LuRadar, LuWifi, LuTriangleAlert,
} from "react-icons/lu";

// ── Types ──────────────────────────────────────────────────────────────────
type Mode = "ai" | "copy" | null;

// ── Mock signal sources for copy trading ──────────────────────────────────
const signalSources = [
  {
    id: "alpha-1",
    name: "Momentum Alpha",
    author: "quant_desk_7",
    winRate: 71.4,
    avgPnl: "+$284",
    totalTrades: 1842,
    followers: 312,
    drawdown: 4.2,
    live: true,
    tags: ["Momentum", "Large Cap"],
    monthlyReturn: "+18.4%",
  },
  {
    id: "mean-rev",
    name: "Mean Reversion Pro",
    author: "statarb_labs",
    winRate: 68.9,
    avgPnl: "+$142",
    totalTrades: 4210,
    followers: 891,
    drawdown: 3.1,
    live: true,
    tags: ["Mean Rev", "Options"],
    monthlyReturn: "+11.2%",
  },
  {
    id: "btc-scalp",
    name: "BTC Scalper v3",
    author: "crypto_quant",
    winRate: 62.1,
    avgPnl: "+$388",
    totalTrades: 9214,
    followers: 1204,
    drawdown: 8.7,
    live: false,
    tags: ["Crypto", "Scalping"],
    monthlyReturn: "+24.1%",
  },
  {
    id: "vol-arb",
    name: "Vol Arb Strategy",
    author: "options_flow",
    winRate: 74.8,
    avgPnl: "+$521",
    totalTrades: 622,
    followers: 188,
    drawdown: 2.8,
    live: true,
    tags: ["Volatility", "Hedged"],
    monthlyReturn: "+9.8%",
  },
];

// ── AI strategy configs ────────────────────────────────────────────────────
const aiConfigs = [
  {
    id: "conservative",
    label: "Conservative",
    icon: LuShield,
    risk: 1,
    description: "Capital preservation first. Low drawdown, steady compounding.",
    targetReturn: "8–15% / yr",
    maxDrawdown: "< 5%",
    leverage: "1x",
    color: "text-info border-info/30 bg-info/5",
    accentColor: "bg-info",
  },
  {
    id: "balanced",
    label: "Balanced",
    icon: LuActivity,
    risk: 2,
    description: "Optimized risk/reward. Diversified across momentum and mean-reversion signals.",
    targetReturn: "20–35% / yr",
    maxDrawdown: "< 12%",
    leverage: "2x",
    color: "text-accent border-accent/30 bg-accent/5",
    accentColor: "bg-accent",
  },
  {
    id: "aggressive",
    label: "Aggressive",
    icon: LuFlame,
    risk: 3,
    description: "Maximum alpha capture. High conviction entries, concentrated positions.",
    targetReturn: "50–80% / yr",
    maxDrawdown: "< 25%",
    leverage: "4x",
    color: "text-bear border-bear/30 bg-bear/5",
    accentColor: "bg-bear",
  },
];

// ── Mini bar chart ─────────────────────────────────────────────────────────
function WinRateBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-bg-elevated rounded-full overflow-hidden">
        <div
          className="h-full bg-bull rounded-full"
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="font-mono text-[.65rem] text-bull w-8 text-right">{value}%</span>
    </div>
  );
}

// ── Risk dots ──────────────────────────────────────────────────────────────
function RiskDots({ level }: { level: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={`w-2 h-2 rounded-full ${
            i <= level
              ? level === 1 ? "bg-info" : level === 2 ? "bg-accent" : "bg-bear"
              : "bg-border-default"
          }`}
        />
      ))}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function TradingMode() {
  const [selectedMode, setSelectedMode] = useState<Mode>(null);
  const [selectedAiConfig, setSelectedAiConfig] = useState<string>("balanced");
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [activating, setActivating] = useState(false);
  const [activated, setActivated] = useState(false);

  async function handleActivate() {
    if (!selectedMode) return;
    if (selectedMode === "copy" && !selectedSource) return;
    setActivating(true);
    await new Promise((r) => setTimeout(r, 1200));
    setActivating(false);
    setActivated(true);
  }

  return (
    <div className="flex flex-col gap-6">

      {/* ── Page actions ── */}
      {activated && (
        <div className="flex items-center justify-end">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-bull/10 border border-bull/25 text-bull text-[.68rem] font-mono">
            <LuCircleCheck className="w-3.5 h-3.5" />
            Mode active
          </div>
        </div>
      )}

      {/* ── Mode selector cards ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* AI Mode */}
        <button
          onClick={() => { setSelectedMode("ai"); setActivated(false); }}
          className={`text-left rounded-lg border-2 p-5 transition-all duration-200 cursor-pointer group ${
            selectedMode === "ai"
              ? "border-accent bg-accent/5"
              : "border-border-subtle bg-bg-surface hover:border-border-default"
          }`}
        >
          <div className="flex items-start justify-between mb-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              selectedMode === "ai" ? "bg-accent/20" : "bg-bg-elevated"
            }`}>
              <LuBrain className={`w-5 h-5 ${selectedMode === "ai" ? "text-accent" : "text-text-muted"}`} />
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
              selectedMode === "ai" ? "border-accent bg-accent" : "border-border-default"
            }`}>
              {selectedMode === "ai" && <span className="w-2 h-2 rounded-full bg-bg-base" />}
            </div>
          </div>

          <h2 className="font-display font-bold text-base tracking-wide text-text-primary mb-1">
            AI Autonomous
          </h2>
          <p className="text-[.72rem] text-text-secondary leading-relaxed mb-4">
            Our AI agents analyze markets 24/7, generate signals, manage risk, and execute trades
            automatically based on your selected risk profile.
          </p>

          <div className="flex flex-wrap gap-2">
            {["Multi-strategy", "Auto risk mgmt", "24/7 execution", "Backtested"].map((tag) => (
              <span key={tag} className="text-[.6rem] font-mono px-2 py-0.5 rounded bg-bg-elevated border border-border-subtle text-text-muted">
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-border-subtle grid grid-cols-3 gap-3">
            {[
              { label: "Avg Return", value: "+31.2%", color: "text-bull" },
              { label: "Win Rate",   value: "68.4%",  color: "text-accent" },
              { label: "Strategies", value: "12",     color: "text-text-primary" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-[.58rem] font-mono text-text-disabled uppercase tracking-wider mb-0.5">{stat.label}</p>
                <p className={`font-mono font-bold text-sm ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>
        </button>

        {/* Copy Mode */}
        <button
          onClick={() => { setSelectedMode("copy"); setActivated(false); }}
          className={`text-left rounded-lg border-2 p-5 transition-all duration-200 cursor-pointer group ${
            selectedMode === "copy"
              ? "border-info bg-info/5"
              : "border-border-subtle bg-bg-surface hover:border-border-default"
          }`}
        >
          <div className="flex items-start justify-between mb-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              selectedMode === "copy" ? "bg-info/20" : "bg-bg-elevated"
            }`}>
              <LuCopy className={`w-5 h-5 ${selectedMode === "copy" ? "text-info" : "text-text-muted"}`} />
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
              selectedMode === "copy" ? "border-info bg-info" : "border-border-default"
            }`}>
              {selectedMode === "copy" && <span className="w-2 h-2 rounded-full bg-bg-base" />}
            </div>
          </div>

          <h2 className="font-display font-bold text-base tracking-wide text-text-primary mb-1">
            Copy Trading
          </h2>
          <p className="text-[.72rem] text-text-secondary leading-relaxed mb-4">
            Mirror trades from verified signal sources in real time. You choose the source,
            set position sizing, and the platform handles execution automatically.
          </p>

          <div className="flex flex-wrap gap-2">
            {["Signal mirroring", "Custom sizing", "Live sources", "Performance verified"].map((tag) => (
              <span key={tag} className="text-[.6rem] font-mono px-2 py-0.5 rounded bg-bg-elevated border border-border-subtle text-text-muted">
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-border-subtle grid grid-cols-3 gap-3">
            {[
              { label: "Sources",    value: "48",     color: "text-text-primary" },
              { label: "Avg Return", value: "+22.8%", color: "text-bull" },
              { label: "Top Win %",  value: "74.8%",  color: "text-accent" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-[.58rem] font-mono text-text-disabled uppercase tracking-wider mb-0.5">{stat.label}</p>
                <p className={`font-mono font-bold text-sm ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>
        </button>
      </div>

      {/* ── AI Config — shown when AI mode selected ── */}
      {selectedMode === "ai" && (
        <div className="bg-bg-surface border border-border-subtle rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-border-subtle flex items-center gap-2">
            <LuRadar className="w-3.5 h-3.5 text-accent" />
            <span className="text-[.65rem] font-mono tracking-[.14em] uppercase text-text-muted">
              Risk Profile
            </span>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            {aiConfigs.map((cfg) => {
              const Icon = cfg.icon;
              const isSelected = selectedAiConfig === cfg.id;
              return (
                <button
                  key={cfg.id}
                  onClick={() => setSelectedAiConfig(cfg.id)}
                  className={`text-left rounded-lg border p-4 transition-all duration-200 cursor-pointer ${
                    isSelected ? cfg.color : "border-border-subtle bg-bg-elevated hover:border-border-default"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${isSelected ? "" : "text-text-muted"}`} />
                      <span className="font-display font-bold text-[.82rem] tracking-wide">
                        {cfg.label}
                      </span>
                    </div>
                    <RiskDots level={cfg.risk} />
                  </div>
                  <p className="text-[.68rem] text-text-secondary leading-relaxed mb-3">
                    {cfg.description}
                  </p>
                  <div className="flex flex-col gap-1.5 text-[.62rem] font-mono">
                    <div className="flex justify-between">
                      <span className="text-text-disabled">Target</span>
                      <span className="text-bull">{cfg.targetReturn}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-disabled">Max DD</span>
                      <span className="text-bear">{cfg.maxDrawdown}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-disabled">Leverage</span>
                      <span className="text-text-primary">{cfg.leverage}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* AI agent status */}
          <div className="px-5 py-3 border-t border-border-subtle bg-bg-elevated flex items-center gap-6 flex-wrap">
            {[
              { icon: LuBrain,    label: "Signal Scanner",  status: "Ready" },
              { icon: LuShield,   label: "Risk Engine",     status: "Ready" },
              { icon: LuZap,      label: "Order Router",    status: "Ready" },
              { icon: LuActivity, label: "Pattern Detect",  status: "Ready" },
            ].map(({ icon: Icon, label, status }) => (
              <div key={label} className="flex items-center gap-1.5 text-[.62rem] font-mono">
                <Icon className="w-3 h-3 text-accent" />
                <span className="text-text-muted">{label}</span>
                <span className="text-bull">{status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Copy source selector — shown when copy mode selected ── */}
      {selectedMode === "copy" && (
        <div className="bg-bg-surface border border-border-subtle rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-border-subtle flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LuWifi className="w-3.5 h-3.5 text-info" />
              <span className="text-[.65rem] font-mono tracking-[.14em] uppercase text-text-muted">
                Signal Sources
              </span>
            </div>
            <span className="text-[.62rem] font-mono text-text-disabled">
              {signalSources.filter((s) => s.live).length} live
            </span>
          </div>

          <div className="divide-y divide-border-subtle">
            {signalSources.map((src) => {
              const isSelected = selectedSource === src.id;
              return (
                <button
                  key={src.id}
                  onClick={() => setSelectedSource(src.id)}
                  className={`w-full text-left px-5 py-4 transition-colors flex items-start gap-4 ${
                    isSelected ? "bg-info/5" : "hover:bg-bg-elevated"
                  }`}
                >
                  {/* Select dot */}
                  <div className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                    isSelected ? "border-info bg-info" : "border-border-default"
                  }`}>
                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-bg-base" />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-display font-bold text-[.82rem] text-text-primary">
                        {src.name}
                      </span>
                      {src.live ? (
                        <span className="flex items-center gap-1 text-[.58rem] font-mono px-1.5 py-0.5 bg-bull/10 border border-bull/20 text-bull rounded">
                          <span className="w-1.5 h-1.5 rounded-full bg-bull animate-pulse inline-block" />
                          LIVE
                        </span>
                      ) : (
                        <span className="text-[.58rem] font-mono px-1.5 py-0.5 bg-bg-elevated border border-border-subtle text-text-disabled rounded">
                          PAUSED
                        </span>
                      )}
                      {src.tags.map((t) => (
                        <span key={t} className="text-[.58rem] font-mono px-1.5 py-0.5 bg-bg-elevated border border-border-subtle text-text-muted rounded">
                          {t}
                        </span>
                      ))}
                    </div>

                    <p className="text-[.62rem] font-mono text-text-disabled mb-2">
                      by {src.author} · {src.totalTrades.toLocaleString()} trades · {src.followers} followers
                    </p>

                    {/* Stats row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2">
                      <div>
                        <p className="text-[.58rem] font-mono text-text-disabled uppercase mb-1">Win Rate</p>
                        <WinRateBar value={src.winRate} />
                      </div>
                      <div>
                        <p className="text-[.58rem] font-mono text-text-disabled uppercase mb-1">Avg P&L</p>
                        <p className="font-mono text-[.72rem] text-bull font-bold">{src.avgPnl}</p>
                      </div>
                      <div>
                        <p className="text-[.58rem] font-mono text-text-disabled uppercase mb-1">Monthly</p>
                        <p className="font-mono text-[.72rem] text-bull font-bold">{src.monthlyReturn}</p>
                      </div>
                      <div>
                        <p className="text-[.58rem] font-mono text-text-disabled uppercase mb-1">Max DD</p>
                        <p className="font-mono text-[.72rem] text-bear font-bold">-{src.drawdown}%</p>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Warning */}
          <div className="px-5 py-3 border-t border-border-subtle bg-warning/5 flex items-start gap-2">
            <LuTriangleAlert className="w-3.5 h-3.5 text-warning flex-shrink-0 mt-0.5" />
            <p className="text-[.62rem] font-mono text-warning/80 leading-relaxed">
              Past performance does not guarantee future results. Copy trading involves significant risk of loss.
              Only trade with capital you can afford to lose.
            </p>
          </div>
        </div>
      )}

      {/* ── Activate button ── */}
      {selectedMode && (
        <div className="flex items-center justify-between pt-2">
          <div className="text-[.68rem] font-mono text-text-muted">
            {selectedMode === "ai"
              ? `AI Autonomous · ${aiConfigs.find((c) => c.id === selectedAiConfig)?.label} profile`
              : selectedSource
              ? `Copy · ${signalSources.find((s) => s.id === selectedSource)?.name}`
              : "Select a signal source to continue"
            }
          </div>

          <button
            onClick={handleActivate}
            disabled={activating || activated || (selectedMode === "copy" && !selectedSource)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-sm font-mono text-[.72rem] tracking-widest uppercase font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              activated
                ? "bg-bull/20 border border-bull/30 text-bull cursor-default"
                : selectedMode === "ai"
                ? "bg-accent hover:bg-accent-hover text-bg-base"
                : "bg-info hover:bg-info/80 text-bg-base"
            }`}
          >
            {activated ? (
              <><LuCircleCheck className="w-3.5 h-3.5" /> Activated</>
            ) : activating ? (
              <><span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> Activating...</>
            ) : (
              <><LuArrowRight className="w-3.5 h-3.5" /> Activate Mode</>
            )}
          </button>
        </div>
      )}

    </div>
  );
}