// src/pages/Strategies/index.tsx
import { useState } from "react";
import {
  LuPlus, LuPlay, LuPause, LuSquare, LuSettings,
  LuTrendingUp, LuActivity, LuZap,
  LuShield, LuSearch, LuChevronDown, LuChartBar,
  LuTriangleAlert, LuCircleCheck, LuX,
} from "react-icons/lu";

// ── Types ──────────────────────────────────────────────────────────────────
type StrategyStatus = "ACTIVE" | "PAUSED" | "STOPPED" | "DEPLOYING";
type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

interface Strategy {
  id: string;
  name: string;
  type: string;
  status: StrategyStatus;
  risk: RiskLevel;
  pnl: number;
  pnlPct: number;
  trades: number;
  winRate: number;
  drawdown: number;
  equity: number;
  position: string;
  lastSignal: string;
  symbols: string[];
  curve: number[];
  deployed: string;
}

// ── Mock data ──────────────────────────────────────────────────────────────
const mockStrategies: Strategy[] = [
  {
    id: "s1",
    name: "Momentum Alpha",
    type: "Momentum",
    status: "ACTIVE",
    risk: "MEDIUM",
    pnl: 4821.5,
    pnlPct: 3.92,
    trades: 148,
    winRate: 71.4,
    drawdown: 4.2,
    equity: 124385,
    position: "LONG AAPL",
    lastSignal: "14:32:01",
    symbols: ["AAPL", "MSFT", "NVDA"],
    curve: [40, 45, 42, 50, 48, 55, 60, 57, 65, 70, 68, 75, 72, 80, 82],
    deployed: "12 days ago",
  },
  {
    id: "s2",
    name: "Mean Reversion Pro",
    type: "Mean Rev",
    status: "ACTIVE",
    risk: "LOW",
    pnl: 1634.0,
    pnlPct: 1.32,
    trades: 412,
    winRate: 68.9,
    drawdown: 3.1,
    equity: 62400,
    position: "SHORT TSLA",
    lastSignal: "13:15:44",
    symbols: ["TSLA", "AMD"],
    curve: [30, 32, 29, 34, 36, 33, 38, 40, 37, 42, 41, 44, 43, 46, 48],
    deployed: "28 days ago",
  },
  {
    id: "s3",
    name: "Vol Arb Strategy",
    type: "Volatility",
    status: "PAUSED",
    risk: "LOW",
    pnl: -455.0,
    pnlPct: -0.82,
    trades: 62,
    winRate: 74.8,
    drawdown: 2.8,
    equity: 55000,
    position: "FLAT",
    lastSignal: "09:12:00",
    symbols: ["SPY", "QQQ"],
    curve: [50, 48, 52, 49, 45, 43, 46, 44, 41, 39, 40, 38, 37, 35, 34],
    deployed: "5 days ago",
  },
  {
    id: "s4",
    name: "BTC Scalper v3",
    type: "Scalping",
    status: "ACTIVE",
    risk: "HIGH",
    pnl: 8210.0,
    pnlPct: 6.24,
    trades: 921,
    winRate: 62.1,
    drawdown: 8.7,
    equity: 139400,
    position: "LONG BTC",
    lastSignal: "14:38:22",
    symbols: ["BTC", "ETH"],
    curve: [20, 25, 22, 30, 28, 35, 40, 37, 45, 50, 48, 56, 60, 58, 65],
    deployed: "42 days ago",
  },
  {
    id: "s5",
    name: "Sector Rotation",
    type: "Macro",
    status: "STOPPED",
    risk: "MEDIUM",
    pnl: 2100.0,
    pnlPct: 1.78,
    trades: 28,
    winRate: 60.7,
    drawdown: 6.4,
    equity: 0,
    position: "FLAT",
    lastSignal: "Yesterday",
    symbols: ["XLK", "XLE", "XLF"],
    curve: [35, 38, 36, 40, 42, 39, 44, 46, 43, 47, 48, 46, 49, 47, 45],
    deployed: "60 days ago",
  },
  {
    id: "s6",
    name: "News Sentiment AI",
    type: "NLP/AI",
    status: "DEPLOYING",
    risk: "MEDIUM",
    pnl: 0,
    pnlPct: 0,
    trades: 0,
    winRate: 0,
    drawdown: 0,
    equity: 20000,
    position: "—",
    lastSignal: "—",
    symbols: ["AAPL", "TSLA", "AMZN", "NVDA"],
    curve: [50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50],
    deployed: "Just now",
  },
];

// ── Mini sparkline ─────────────────────────────────────────────────────────
function Sparkline({ data, up }: { data: number[]; up: boolean }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 80; const h = 28;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 2) - 1;
    return `${x},${y}`;
  }).join(" ");
  const fill = `0,${h} ${pts} ${w},${h}`;
  const color = up ? "#10b981" : "#ef4444";
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polygon points={fill} fill={color} fillOpacity="0.12" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

// ── Status badge ───────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: StrategyStatus }) {
  const map: Record<StrategyStatus, string> = {
    ACTIVE:    "bg-bull/10 text-bull border-bull/20",
    PAUSED:    "bg-warning/10 text-warning border-warning/20",
    STOPPED:   "bg-bg-elevated text-text-disabled border-border-subtle",
    DEPLOYING: "bg-info/10 text-info border-info/20",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 text-[.6rem] font-mono px-2 py-0.5 rounded border ${map[status]}`}>
      {status === "ACTIVE"    && <span className="w-1.5 h-1.5 rounded-full bg-bull animate-pulse" />}
      {status === "DEPLOYING" && <span className="w-1.5 h-1.5 rounded-full bg-info animate-pulse" />}
      {status === "PAUSED"    && <span className="w-1.5 h-1.5 rounded-full bg-warning" />}
      {status === "STOPPED"   && <span className="w-1.5 h-1.5 rounded-full bg-text-disabled" />}
      {status}
    </span>
  );
}

// ── Risk badge ─────────────────────────────────────────────────────────────
function RiskBadge({ risk }: { risk: RiskLevel }) {
  const map: Record<RiskLevel, string> = {
    LOW:    "text-info bg-info/10 border-info/20",
    MEDIUM: "text-warning bg-warning/10 border-warning/20",
    HIGH:   "text-bear bg-bear/10 border-bear/20",
  };
  return (
    <span className={`text-[.58rem] font-mono px-1.5 py-0.5 rounded border ${map[risk]}`}>
      {risk}
    </span>
  );
}

// ── Deploy modal ───────────────────────────────────────────────────────────
function DeployModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [type, setType] = useState("Momentum");
  const [risk, setRisk] = useState("MEDIUM");
  const [capital, setCapital] = useState("10000");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-base/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-bg-surface border border-border-default rounded-lg overflow-hidden shadow-card">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <LuZap className="w-4 h-4 text-accent" />
            <span className="font-display font-bold text-sm tracking-wide text-text-primary">
              Deploy Strategy
            </span>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
            <LuX className="w-4 h-4" />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex items-center px-5 py-3 border-b border-border-subtle gap-2">
          {["Configure", "Risk", "Review"].map((label, i) => (
            <div key={label} className="flex items-center gap-2 flex-1">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[.6rem] font-mono font-bold flex-shrink-0 ${
                step > i + 1 ? "bg-accent text-bg-base" :
                step === i + 1 ? "bg-accent/20 text-accent border border-accent" :
                "bg-bg-elevated text-text-disabled border border-border-subtle"
              }`}>
                {step > i + 1 ? <LuCircleCheck className="w-3 h-3" /> : i + 1}
              </div>
              <span className={`text-[.62rem] font-mono ${step === i + 1 ? "text-text-primary" : "text-text-muted"}`}>
                {label}
              </span>
              {i < 2 && <div className="flex-1 h-px bg-border-subtle" />}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="p-5 flex flex-col gap-4">
          {step === 1 && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-[.62rem] font-mono tracking-widest uppercase text-text-muted">Strategy Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Momentum Alpha v2"
                  className="bg-bg-elevated border border-border-default rounded-sm px-3 py-2 text-[.78rem] font-mono text-text-primary placeholder-text-disabled focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[.62rem] font-mono tracking-widest uppercase text-text-muted">Strategy Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="bg-bg-elevated border border-border-default rounded-sm px-3 py-2 text-[.78rem] font-mono text-text-primary focus:outline-none focus:border-accent transition-colors"
                >
                  {["Momentum", "Mean Reversion", "Scalping", "Volatility", "Macro", "NLP/AI"].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[.62rem] font-mono tracking-widest uppercase text-text-muted">Allocated Capital ($)</label>
                <input
                  type="number"
                  value={capital}
                  onChange={(e) => setCapital(e.target.value)}
                  className="bg-bg-elevated border border-border-default rounded-sm px-3 py-2 text-[.78rem] font-mono text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-[.7rem] text-text-secondary font-mono">Select a risk profile for this strategy:</p>
              {(["LOW", "MEDIUM", "HIGH"] as RiskLevel[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRisk(r)}
                  className={`text-left px-4 py-3 rounded-lg border transition-all ${
                    risk === r
                      ? r === "LOW"    ? "border-info/40 bg-info/5 text-info"
                      : r === "MEDIUM" ? "border-accent/40 bg-accent/5 text-accent"
                      :                  "border-bear/40 bg-bear/5 text-bear"
                      : "border-border-subtle bg-bg-elevated hover:border-border-default text-text-secondary"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-[.78rem]">{r}</span>
                    <RiskBadge risk={r as RiskLevel} />
                  </div>
                  <p className="text-[.65rem] font-mono opacity-70">
                    {r === "LOW"    ? "Max 5% drawdown · 1x leverage · Conservative sizing"  :
                     r === "MEDIUM" ? "Max 12% drawdown · 2x leverage · Balanced sizing" :
                                      "Max 25% drawdown · 4x leverage · Aggressive sizing"}
                  </p>
                </button>
              ))}
            </>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-3">
              <p className="text-[.7rem] font-mono text-text-secondary">Confirm deployment details:</p>
              {[
                { label: "Name",    value: name || "Unnamed Strategy" },
                { label: "Type",    value: type },
                { label: "Risk",    value: risk },
                { label: "Capital", value: `$${Number(capital).toLocaleString()}` },
                { label: "Status",  value: "Will deploy as ACTIVE" },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-border-subtle">
                  <span className="text-[.65rem] font-mono text-text-muted uppercase tracking-wider">{label}</span>
                  <span className="text-[.72rem] font-mono text-text-primary">{value}</span>
                </div>
              ))}
              <div className="flex items-start gap-2 mt-2 px-3 py-2 bg-warning/5 border border-warning/20 rounded-sm">
                <LuTriangleAlert className="w-3.5 h-3.5 text-warning flex-shrink-0 mt-0.5" />
                <p className="text-[.62rem] font-mono text-warning/80">
                  Strategy will go live immediately. Ensure broker connection is active before deploying.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-border-subtle">
          <button
            onClick={() => step > 1 ? setStep(s => s - 1) : onClose()}
            className="px-4 py-2 text-[.68rem] font-mono uppercase tracking-widest border border-border-default text-text-secondary hover:text-text-primary hover:border-border-strong rounded-sm transition-colors"
          >
            {step === 1 ? "Cancel" : "Back"}
          </button>
          <button
            onClick={() => step < 3 ? setStep(s => s + 1) : onClose()}
            disabled={step === 1 && !name.trim()}
            className="flex items-center gap-2 px-4 py-2 text-[.68rem] font-mono uppercase tracking-widest bg-accent hover:bg-accent-hover text-bg-base font-bold rounded-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {step === 3 ? <><LuZap className="w-3 h-3" /> Deploy</> : <>Next <LuChevronDown className="w-3 h-3 -rotate-90" /></>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function Strategies() {
  const [strategies, setStrategies] = useState<Strategy[]>(mockStrategies);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StrategyStatus | "ALL">("ALL");
  const [showDeploy, setShowDeploy] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = strategies.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.type.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "ALL" || s.status === filter;
    return matchSearch && matchFilter;
  });

  function toggleStatus(id: string) {
    setStrategies((prev) => prev.map((s) => {
      if (s.id !== id) return s;
      return {
        ...s,
        status: s.status === "ACTIVE" ? "PAUSED" : s.status === "PAUSED" ? "ACTIVE" : s.status,
      };
    }));
  }

  function stopStrategy(id: string) {
    setStrategies((prev) => prev.map((s) =>
      s.id === id ? { ...s, status: "STOPPED" as StrategyStatus } : s
    ));
  }

  // Aggregate stats
  const active   = strategies.filter((s) => s.status === "ACTIVE").length;
  const totalPnl = strategies.reduce((acc, s) => acc + s.pnl, 0);
  const avgWin   = strategies.filter((s) => s.trades > 0).reduce((acc, s) => acc + s.winRate, 0) /
    (strategies.filter((s) => s.trades > 0).length || 1);

  return (
    <div className="flex flex-col gap-5">

      {/* ── Page actions ── */}
      <div className="flex items-center justify-end">
        <button
          onClick={() => setShowDeploy(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-bg-base text-[.68rem] font-mono tracking-widest uppercase font-bold rounded-sm transition-colors"
        >
          <LuPlus className="w-3.5 h-3.5" /> Deploy Strategy
        </button>
      </div>

      {/* ── Summary strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Strategies", value: strategies.length.toString(),         color: "text-text-primary", icon: LuChartBar    },
          { label: "Active",           value: active.toString(),                    color: "text-bull",         icon: LuActivity      },
          { label: "Total P&L",        value: `${totalPnl >= 0 ? "+" : ""}$${Math.abs(totalPnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                                                                                    color: totalPnl >= 0 ? "text-bull" : "text-bear", icon: LuTrendingUp },
          { label: "Avg Win Rate",     value: `${avgWin.toFixed(1)}%`,              color: "text-accent",       icon: LuShield        },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="bg-bg-surface border border-border-subtle rounded-lg px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-bg-elevated flex items-center justify-center flex-shrink-0">
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div>
              <p className="text-[.6rem] font-mono text-text-muted uppercase tracking-wider">{label}</p>
              <p className={`font-mono font-bold text-lg ${color}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-disabled" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search strategies..."
            className="w-full bg-bg-surface border border-border-subtle rounded-sm pl-9 pr-3 py-2 text-[.75rem] font-mono text-text-primary placeholder-text-disabled focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        {/* Status filter tabs */}
        <div className="flex items-center bg-bg-surface border border-border-subtle rounded-sm overflow-hidden">
          {(["ALL", "ACTIVE", "PAUSED", "STOPPED"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 text-[.62rem] font-mono uppercase tracking-wider transition-colors border-r border-border-subtle last:border-r-0 ${
                filter === f
                  ? "bg-accent/10 text-accent"
                  : "text-text-muted hover:text-text-secondary hover:bg-bg-elevated"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* ── Strategy table ── */}
      <div className="bg-bg-surface border border-border-subtle rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-bg-elevated border-b border-border-subtle">
              {["Strategy", "Status", "P&L", "Win Rate", "Trades", "Drawdown", "Position", "Curve", "Actions"].map((h, i) => (
                <th key={h} className={`px-4 py-2.5 text-[.6rem] font-mono tracking-widest uppercase text-text-disabled font-normal ${i >= 2 && i <= 6 ? "text-right" : i === 7 ? "text-center" : "text-left"}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center">
                  <p className="text-text-muted font-mono text-sm">No strategies match your filter</p>
                </td>
              </tr>
            ) : filtered.map((s) => (
              <tr
                key={s.id}
                onClick={() => setSelectedId(selectedId === s.id ? null : s.id)}
                className={`border-b border-border-subtle transition-colors cursor-pointer ${
                  selectedId === s.id ? "bg-accent/5" : "hover:bg-bg-elevated"
                }`}
              >
                {/* Name */}
                <td className="px-4 py-3">
                  <div>
                    <p className="font-display font-bold text-[.8rem] tracking-wide text-text-primary">{s.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[.58rem] font-mono text-text-disabled">{s.type}</span>
                      <span className="text-text-disabled">·</span>
                      <RiskBadge risk={s.risk} />
                      <span className="text-text-disabled">·</span>
                      <span className="text-[.58rem] font-mono text-text-disabled">{s.deployed}</span>
                    </div>
                  </div>
                </td>

                {/* Status */}
                <td className="px-4 py-3"><StatusBadge status={s.status} /></td>

                {/* P&L */}
                <td className={`px-4 py-3 text-right font-mono font-bold text-[.78rem] ${s.pnl >= 0 ? "text-bull" : "text-bear"}`}>
                  {s.pnl === 0 ? "—" : `${s.pnl >= 0 ? "+" : ""}$${Math.abs(s.pnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                  {s.pnl !== 0 && (
                    <p className={`text-[.6rem] font-mono ${s.pnlPct >= 0 ? "text-bull" : "text-bear"} opacity-70`}>
                      {s.pnlPct >= 0 ? "+" : ""}{s.pnlPct.toFixed(2)}%
                    </p>
                  )}
                </td>

                {/* Win rate */}
                <td className="px-4 py-3 text-right">
                  {s.winRate > 0 ? (
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-mono text-[.72rem] text-accent">{s.winRate}%</span>
                      <div className="w-16 h-1 bg-bg-elevated rounded-full overflow-hidden">
                        <div className="h-full bg-accent rounded-full" style={{ width: `${s.winRate}%` }} />
                      </div>
                    </div>
                  ) : <span className="text-text-disabled font-mono text-[.7rem]">—</span>}
                </td>

                {/* Trades */}
                <td className="px-4 py-3 text-right font-mono text-[.72rem] text-text-secondary">
                  {s.trades > 0 ? s.trades.toLocaleString() : "—"}
                </td>

                {/* Drawdown */}
                <td className={`px-4 py-3 text-right font-mono text-[.72rem] font-bold ${
                  s.drawdown > 0 ? "text-bear" : "text-text-disabled"
                }`}>
                  {s.drawdown > 0 ? `-${s.drawdown}%` : "—"}
                </td>

                {/* Position */}
                <td className="px-4 py-3 text-right">
                  <span className={`font-mono text-[.68rem] ${
                    s.position.startsWith("LONG")  ? "text-bull" :
                    s.position.startsWith("SHORT") ? "text-bear" :
                    "text-text-disabled"
                  }`}>
                    {s.position}
                  </span>
                </td>

                {/* Curve */}
                <td className="px-4 py-3">
                  <div className="flex justify-center">
                    <Sparkline data={s.curve} up={s.pnl >= 0} />
                  </div>
                </td>

                {/* Actions */}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {/* Play/Pause */}
                    {(s.status === "ACTIVE" || s.status === "PAUSED") && (
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleStatus(s.id); }}
                        className={`p-1.5 rounded hover:bg-bg-elevated transition-colors ${
                          s.status === "ACTIVE" ? "text-warning hover:text-warning" : "text-bull hover:text-bull"
                        }`}
                        title={s.status === "ACTIVE" ? "Pause" : "Resume"}
                      >
                        {s.status === "ACTIVE" ? <LuPause className="w-3.5 h-3.5" /> : <LuPlay className="w-3.5 h-3.5" />}
                      </button>
                    )}
                    {/* Stop */}
                    {s.status !== "STOPPED" && s.status !== "DEPLOYING" && (
                      <button
                        onClick={(e) => { e.stopPropagation(); stopStrategy(s.id); }}
                        className="p-1.5 rounded text-text-disabled hover:text-bear hover:bg-bg-elevated transition-colors"
                        title="Stop"
                      >
                        <LuSquare className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {/* Settings */}
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 rounded text-text-disabled hover:text-text-secondary hover:bg-bg-elevated transition-colors"
                      title="Settings"
                    >
                      <LuSettings className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Expanded detail panel ── */}
      {selectedId && (() => {
        const s = strategies.find((x) => x.id === selectedId)!;
        return (
          <div className="bg-bg-surface border border-border-subtle rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border-subtle">
              <div className="flex items-center gap-3">
                <span className="font-display font-bold text-sm tracking-wide text-text-primary">{s.name}</span>
                <StatusBadge status={s.status} />
              </div>
              <button onClick={() => setSelectedId(null)} className="text-text-muted hover:text-text-primary transition-colors">
                <LuX className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { label: "Equity",       value: s.equity > 0 ? `$${s.equity.toLocaleString()}` : "—",     color: "text-text-primary" },
                { label: "Total P&L",    value: s.pnl !== 0 ? `${s.pnl >= 0 ? "+" : ""}$${Math.abs(s.pnl).toFixed(2)}` : "—", color: s.pnl >= 0 ? "text-bull" : "text-bear" },
                { label: "Win Rate",     value: s.winRate > 0 ? `${s.winRate}%` : "—",                   color: "text-accent"      },
                { label: "Total Trades", value: s.trades > 0 ? s.trades.toLocaleString() : "—",           color: "text-text-primary" },
                { label: "Drawdown",     value: s.drawdown > 0 ? `-${s.drawdown}%` : "—",                color: "text-bear"        },
                { label: "Risk Level",   value: s.risk,                                                   color: "text-warning"     },
                { label: "Last Signal",  value: s.lastSignal,                                             color: "text-text-secondary" },
                { label: "Deployed",     value: s.deployed,                                               color: "text-text-secondary" },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <p className="text-[.6rem] font-mono text-text-disabled uppercase tracking-wider mb-1">{label}</p>
                  <p className={`font-mono font-bold text-sm ${color}`}>{value}</p>
                </div>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-border-subtle flex items-center gap-2 flex-wrap">
              <span className="text-[.6rem] font-mono text-text-disabled uppercase tracking-wider mr-2">Symbols</span>
              {s.symbols.map((sym) => (
                <span key={sym} className="text-[.65rem] font-mono px-2 py-0.5 bg-bg-elevated border border-border-subtle rounded text-text-secondary">
                  {sym}
                </span>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── Deploy modal ── */}
      {showDeploy && <DeployModal onClose={() => setShowDeploy(false)} />}
    </div>
  );
}