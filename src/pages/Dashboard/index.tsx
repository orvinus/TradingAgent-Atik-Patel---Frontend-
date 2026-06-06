// src/pages/Dashboard.tsx
import { Link } from "react-router-dom";
import {
  LuTrendingUp, LuTrendingDown, LuActivity, LuZap,
  LuBrain, LuCircleDot, LuNewspaper, LuArrowUpRight,
  LuArrowDownRight, LuMinus, LuCoins, LuBell, LuPlug,
  LuCheck, LuArrowRight,
} from "react-icons/lu";
import { useAppStore } from "@/store/index";

// ── Mock Data ──────────────────────────────────────────────────────────────

const stats = [
  {
    label: "Total Equity",
    value: "$124,385.20",
    change: "+2.40%",
    changeAbs: "+$2,914.20",
    up: true,
    icon: LuTrendingUp,
    accentClass: "text-bull",
    bgClass: "bg-bull/5 border-bull/20",
    sparkline: [62, 58, 65, 70, 68, 75, 72, 80, 78, 85, 82, 90],
  },
  {
    label: "Daily P&L",
    value: "+$3,021.50",
    change: "+2.49%",
    changeAbs: "Today",
    up: true,
    icon: LuActivity,
    accentClass: "text-bull",
    bgClass: "bg-bull/5 border-bull/20",
    sparkline: [40, 55, 45, 60, 58, 65, 70, 68, 75, 80, 78, 85],
  },
  {
    label: "Open Positions",
    value: "8",
    change: "3 pending",
    changeAbs: "2 profitable",
    up: null,
    icon: LuCircleDot,
    accentClass: "text-info",
    bgClass: "bg-info/5 border-info/20",
    sparkline: [5, 6, 7, 6, 8, 7, 9, 8, 8, 9, 8, 8],
  },
  {
    label: "Max Drawdown",
    value: "-4.20%",
    change: "-$5,224.18",
    changeAbs: "vs -8% limit",
    up: false,
    icon: LuTrendingDown,
    accentClass: "text-bear",
    bgClass: "bg-bear/5 border-bear/20",
    sparkline: [20, 18, 22, 25, 20, 18, 15, 17, 14, 12, 13, 11],
  },
];

const heatmapPositions = [
  { symbol: "AAPL",  side: "L", pnlPct: +3.92, value: 9472,  pnl: "+$357" },
  { symbol: "NVDA",  side: "L", pnlPct: -1.62, value: 13083, pnl: "-$213" },
  { symbol: "TSLA",  side: "S", pnlPct: +2.74, value: 4824,  pnl: "+$136" },
  { symbol: "BTC",   side: "L", pnlPct: +2.17, value: 31725, pnl: "+$675" },
  { symbol: "ETH",   side: "L", pnlPct: -0.84, value: 8240,  pnl: "-$70"  },
  { symbol: "MSFT",  side: "L", pnlPct: +1.33, value: 6210,  pnl: "+$82"  },
  { symbol: "AMZN",  side: "S", pnlPct: -2.10, value: 5880,  pnl: "-$126" },
  { symbol: "SPY",   side: "L", pnlPct: +0.55, value: 11200, pnl: "+$61"  },
];

const strategies = [
  {
    name: "Momentum Alpha",
    status: "ACTIVE",
    pnl: "+$1,842",
    pnlPct: "+3.2%",
    up: true,
    position: "LONG AAPL",
    trades: 14,
    curve: [30, 35, 32, 40, 38, 45, 48, 44, 52, 58, 55, 62],
  },
  {
    name: "Mean Reversion",
    status: "ACTIVE",
    pnl: "+$634",
    pnlPct: "+1.1%",
    up: true,
    position: "SHORT TSLA",
    trades: 9,
    curve: [20, 22, 19, 24, 26, 23, 28, 30, 27, 32, 31, 34],
  },
  {
    name: "Vol Arb",
    status: "PAUSED",
    pnl: "-$455",
    pnlPct: "-0.8%",
    up: false,
    position: "FLAT",
    trades: 5,
    curve: [40, 38, 42, 39, 35, 33, 36, 34, 31, 29, 30, 28],
  },
  {
    name: "BTC Scalper",
    status: "ACTIVE",
    pnl: "+$675",
    pnlPct: "+2.2%",
    up: true,
    position: "LONG BTC",
    trades: 22,
    curve: [15, 18, 16, 22, 20, 25, 28, 24, 30, 35, 32, 38],
  },
];

const agents = [
  { name: "Signal Scanner",   status: "PROCESSING", ping: 12,  activity: 92 },
  { name: "Risk Engine",      status: "IDLE",        ping: 8,   activity: 15 },
  { name: "Order Router",     status: "PROCESSING", ping: 4,   activity: 78 },
  { name: "News Sentiment",   status: "PROCESSING", ping: 31,  activity: 65 },
  { name: "Pattern Detect",   status: "IDLE",        ping: 18,  activity: 20 },
  { name: "Portfolio Opt",    status: "COMPUTING",  ping: 22,  activity: 45 },
];

const news = [
  { time: "14:38", headline: "Fed holds rates steady, signals data-dependent path ahead", sentiment: "bullish",  score: 0.72, tickers: ["SPY", "TLT"] },
  { time: "14:21", headline: "NVDA data center revenue beats estimates by 18%",           sentiment: "bullish",  score: 0.91, tickers: ["NVDA"] },
  { time: "13:55", headline: "CPI data comes in hotter than expected at 3.4%",            sentiment: "bearish",  score: 0.68, tickers: ["SPY", "QQQ"] },
  { time: "13:12", headline: "TSLA recalls 125k vehicles over software issue",             sentiment: "bearish",  score: 0.84, tickers: ["TSLA"] },
  { time: "12:47", headline: "Bitcoin ETF sees record $840M inflows in single session",   sentiment: "bullish",  score: 0.79, tickers: ["BTC"] },
  { time: "11:30", headline: "AAPL iPhone 17 supply chain checks point to strong demand", sentiment: "bullish",  score: 0.63, tickers: ["AAPL"] },
];

const equityCurve = [
  98200, 99100, 97800, 100200, 101500, 99800, 102400, 104100,
  103200, 105800, 107200, 106100, 108900, 110200, 109100, 111800,
  113200, 112100, 114800, 116200, 115100, 117800, 119200, 118100,
  120800, 119200, 121500, 123100, 122000, 124385,
];
const spyCurve = [
  99000, 99400, 98800, 100100, 100800, 99600, 101200, 102100,
  101800, 103200, 104100, 103500, 105200, 106100, 105400, 107200,
  108100, 107500, 109200, 110100, 109400, 111200, 112100, 111400,
  113200, 112100, 113800, 114900, 114100, 115600,
];
const drawdownPoints = [3, 4, 12, 13, 19, 20]; // indices where drawdown occurred

// ── Mini sparkline component ──────────────────────────────────────────────
function Sparkline({ data, color = "#10b981", height = 28 }: { data: number[]; color?: string; height?: number }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 80;
  const h = height;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ── Mini equity curve for strategies ──────────────────────────────────────
function MiniCurve({ data, up }: { data: number[]; up: boolean }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 72; const h = 24;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 2) - 1;
    return `${x},${y}`;
  }).join(" ");
  const fillPts = `0,${h} ${pts} ${w},${h}`;
  const color = up ? "#10b981" : "#ef4444";
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polygon points={fillPts} fill={color} fillOpacity="0.15" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

// ── Main equity chart ──────────────────────────────────────────────────────
function EquityChart() {
  const min = Math.min(...equityCurve, ...spyCurve);
  const max = Math.max(...equityCurve, ...spyCurve);
  const range = max - min;
  const w = 600; const h = 120;
  const pad = { l: 48, r: 8, t: 8, b: 20 };
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;

  const toX = (i: number) => pad.l + (i / (equityCurve.length - 1)) * iw;
  const toY = (v: number) => pad.t + ih - ((v - min) / range) * ih;

  const eqPts = equityCurve.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");
  const spyPts = spyCurve.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");
  const fillPts = `${pad.l},${pad.t + ih} ${eqPts} ${toX(equityCurve.length - 1)},${pad.t + ih}`;

  const labels = ["97k", "103k", "109k", "115k", "121k"];
  const yTicks = labels.map((_, i) => pad.t + ih - (i / (labels.length - 1)) * ih);

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" className="w-full">
      {/* Drawdown shading */}
      {drawdownPoints.map((idx, i) => {
        if (i % 2 !== 0) return null;
        const x1 = toX(idx);
        const x2 = toX(drawdownPoints[i + 1] ?? idx + 1);
        return (
          <rect key={i} x={x1} y={pad.t} width={x2 - x1} height={ih} fill="#ef4444" fillOpacity="0.08" />
        );
      })}
      {/* Grid lines */}
      {yTicks.map((y, i) => (
        <g key={i}>
          <line x1={pad.l} y1={y} x2={w - pad.r} y2={y} stroke="#1e2a3a" strokeWidth="0.5" />
          <text x={pad.l - 4} y={y + 3} fill="#475569" fontSize="8" textAnchor="end" fontFamily="JetBrains Mono, monospace">
            {labels[i]}
          </text>
        </g>
      ))}
      {/* SPY comparison */}
      <polyline points={spyPts} fill="none" stroke="#3b82f6" strokeWidth="1" strokeDasharray="3,2" opacity="0.5" />
      {/* Equity fill */}
      <polygon points={fillPts} fill="#10b981" fillOpacity="0.08" />
      {/* Equity line */}
      <polyline points={eqPts} fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinejoin="round" />
      {/* Trade markers */}
      {[4, 9, 14, 19, 24].map((idx) => (
        <circle key={idx} cx={toX(idx)} cy={toY(equityCurve[idx] ?? 0)} r="2.5" fill="#10b981" stroke="#080c14" strokeWidth="1" />
      ))}
      {/* Current value dot */}
      <circle cx={toX(equityCurve.length - 1)} cy={toY(equityCurve[equityCurve.length - 1] ?? 0)} r="3" fill="#10b981" stroke="#080c14" strokeWidth="1.5" />
    </svg>
  );
}

// ── Heatmap cell color ─────────────────────────────────────────────────────
function heatColor(pct: number): string {
  if (pct > 3)   return "bg-bull/30 border-bull/40 text-bull";
  if (pct > 1.5) return "bg-bull/20 border-bull/25 text-bull";
  if (pct > 0)   return "bg-bull/10 border-bull/15 text-bull";
  if (pct > -1.5) return "bg-bear/10 border-bear/15 text-bear";
  if (pct > -3)  return "bg-bear/20 border-bear/25 text-bear";
  return "bg-bear/30 border-bear/40 text-bear";
}

// ── Live pulse dot ─────────────────────────────────────────────────────────
function PulseDot({ active = true }: { active?: boolean }) {
  return (
    <span className="relative flex h-2 w-2 flex-shrink-0">
      {active && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-bull opacity-75" />}
      <span className={`relative inline-flex rounded-full h-2 w-2 ${active ? "bg-bull" : "bg-text-disabled"}`} />
    </span>
  );
}

// ── Agent status color ────────────────────────────────────────────────────
function agentColor(status: string) {
  if (status === "PROCESSING") return "text-bull bg-bull/10 border-bull/20";
  if (status === "COMPUTING")  return "text-warning bg-warning/10 border-warning/20";
  return "text-text-disabled bg-bg-elevated border-border-subtle";
}

// ── Setup Connections card ────────────────────────────────────────────────
// Surfaces any onboarding steps the user skipped after sign-up so they can
// complete them later from the dashboard.
function SetupConnections() {
  const selectedPlan      = useAppStore((s) => s.selectedPlan);
  const telegramConnected = useAppStore((s) => s.telegramConnected);
  const discordConnected  = useAppStore((s) => s.discordConnected);
  const connectedBrokers  = useAppStore((s) => s.connectedBrokers);

  const planDone    = !!selectedPlan;
  const notifyDone  = telegramConnected || discordConnected;
  const brokerDone  = connectedBrokers.length > 0;

  if (planDone && notifyDone && brokerDone) return null;

  const items = [
    {
      key: "plan",
      done: planDone,
      icon: LuCoins,
      title: planDone ? `Plan: ${selectedPlan}` : "Choose a plan",
      desc:  planDone ? "Subscription active" : "Pick a tier to unlock AI trade analysis",
      cta:   planDone ? "Change plan" : "Choose plan",
      to:    "/onboarding/plan",
    },
    {
      key: "notify",
      done: notifyDone,
      icon: LuBell,
      title: notifyDone ? "Notifications connected" : "Connect notifications",
      desc:  notifyDone
        ? [telegramConnected && "Telegram", discordConnected && "Discord"].filter(Boolean).join(" · ")
        : "Get alerts on Telegram or Discord",
      cta:   notifyDone ? "Manage" : "Connect",
      to:    "/onboarding/connect",
    },
    {
      key: "broker",
      done: brokerDone,
      icon: LuPlug,
      title: brokerDone ? `${connectedBrokers.length} broker${connectedBrokers.length > 1 ? "s" : ""} connected` : "Connect a broker",
      desc:  brokerDone
        ? connectedBrokers.join(" · ")
        : "Link a brokerage or exchange to execute trades",
      cta:   brokerDone ? "Manage" : "Connect",
      to:    "/onboarding/broker",
    },
  ];

  return (
    <div className="bg-bg-surface border border-border-subtle rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <span className="text-[.62rem] tracking-[.14em] uppercase text-text-muted">Complete Your Setup</span>
          <span className="font-mono text-[.6rem] text-text-disabled">
            {items.filter((i) => i.done).length} / {items.length}
          </span>
        </div>
        <span className="font-mono text-[.6rem] text-text-disabled uppercase tracking-widest">
          Skipped at sign-up
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border-subtle">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <div key={it.key} className="px-4 py-3 flex items-center gap-3">
              <div
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border ${
                  it.done
                    ? "border-bull/30 bg-bull/10 text-bull"
                    : "border-accent-border bg-accent-subtle text-accent"
                }`}
              >
                {it.done ? <LuCheck className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[.72rem] text-text-primary truncate">{it.title}</p>
                <p className="font-mono text-[.6rem] text-text-disabled truncate">{it.desc}</p>
              </div>
              <Link
                to={it.to}
                className={`flex flex-shrink-0 items-center gap-1 rounded-sm px-2.5 py-1.5 font-mono text-[.62rem] uppercase tracking-[.12em] transition-colors ${
                  it.done
                    ? "border border-border-subtle bg-bg-elevated text-text-muted hover:border-border-default hover:text-text-secondary"
                    : "border border-accent-border bg-accent-subtle text-accent hover:bg-accent/15"
                }`}
              >
                {it.cta}
                <LuArrowRight className="h-3 w-3" />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  return (
    <div className="flex flex-col gap-4 text-text-primary font-body">

      {/* ── Page actions ── */}
      <div className="flex items-center justify-end">
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-accent-border bg-accent-subtle text-accent text-[.68rem] tracking-widest uppercase hover:bg-accent/20 transition-colors cursor-pointer font-mono">
          <LuZap className="w-3 h-3" /> New Order
        </button>
      </div>

      {/* ── Post-signup setup CTAs (only shown when something was skipped) ── */}
      <SetupConnections />

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((st) => {
          const Icon = st.icon;
          return (
            <div key={st.label} className={`rounded-lg border p-4 flex flex-col gap-2 ${st.bgClass} transition-colors duration-300`}>
              <div className="flex items-center justify-between">
                <span className="text-[.62rem] tracking-[.12em] uppercase text-text-muted">{st.label}</span>
                <Icon className={`w-3.5 h-3.5 ${st.accentClass}`} />
              </div>
              <p className={`font-mono text-2xl font-bold ${st.accentClass}`}>{st.value}</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`font-mono text-[.7rem] ${st.up === true ? "text-bull" : st.up === false ? "text-bear" : "text-text-muted"}`}>
                    {st.change}
                  </p>
                  <p className="font-mono text-[.62rem] text-text-disabled">{st.changeAbs}</p>
                </div>
                <Sparkline data={st.sparkline} color={st.up === false ? "#ef4444" : "#10b981"} />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Row 2: Equity chart + AI agents ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

        {/* Equity curve */}
        <div className="lg:col-span-2 bg-bg-surface border border-border-subtle rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-subtle">
            <div className="flex items-center gap-3">
              <span className="text-[.62rem] tracking-[.14em] uppercase text-text-muted">Equity Curve</span>
              <div className="flex items-center gap-2 text-[.6rem] font-mono">
                <span className="flex items-center gap-1"><span className="w-3 h-[2px] bg-bull inline-block rounded" /> Portfolio</span>
                <span className="flex items-center gap-1"><span className="w-3 h-[2px] bg-info inline-block rounded opacity-50 border-dashed" /> SPY</span>
                <span className="flex items-center gap-1"><span className="w-3 h-2 bg-bear/20 inline-block rounded" /> Drawdown</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <PulseDot active={true} />
              <span className="font-mono text-[.6rem] text-text-muted">LIVE</span>
            </div>
          </div>
          <div className="px-2 py-2">
            <EquityChart />
          </div>
          <div className="px-4 py-2 border-t border-border-subtle flex items-center gap-4 text-[.62rem] font-mono text-text-muted">
            <span>● Trade executions</span>
            <span className="text-bull">+26.7% all time</span>
            <span className="text-info">SPY +15.6%</span>
            <span className="text-bear">Max DD -4.2%</span>
          </div>
        </div>

        {/* AI Agent Activity */}
        <div className="bg-bg-surface border border-border-subtle rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <LuBrain className="w-3.5 h-3.5 text-accent" />
              <span className="text-[.62rem] tracking-[.14em] uppercase text-text-muted">AI Pipeline</span>
            </div>
            <PulseDot active={true} />
          </div>
          <div className="divide-y divide-border-subtle">
            {agents.map((ag) => (
              <div key={ag.name} className="px-4 py-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <PulseDot active={ag.status !== "IDLE"} />
                  <div className="min-w-0">
                    <p className="text-[.7rem] text-text-primary truncate">{ag.name}</p>
                    <p className="font-mono text-[.6rem] text-text-disabled">{ag.ping}ms</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Activity bar */}
                  <div className="w-12 h-1 bg-bg-elevated rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${ag.status === "IDLE" ? "bg-border-subtle" : ag.status === "COMPUTING" ? "bg-warning" : "bg-bull"}`}
                      style={{ width: `${ag.activity}%` }}
                    />
                  </div>
                  <span className={`text-[.58rem] font-mono px-1.5 py-0.5 rounded border ${agentColor(ag.status)}`}>
                    {ag.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 3: Heatmap + Strategy grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

        {/* Portfolio Heatmap */}
        <div className="bg-bg-surface border border-border-subtle rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-subtle">
            <span className="text-[.62rem] tracking-[.14em] uppercase text-text-muted">Portfolio Heatmap</span>
            <span className="text-[.6rem] font-mono text-text-disabled">Sized by position value</span>
          </div>
          <div className="p-3 grid grid-cols-4 gap-2">
            {heatmapPositions.map((p) => {
              // Size tiles by relative position value
              const maxVal = Math.max(...heatmapPositions.map((x) => x.value));
              const sizePct = Math.round((p.value / maxVal) * 100);
              return (
                <div
                  key={p.symbol}
                  className={`rounded border flex flex-col items-center justify-center p-2 gap-0.5 cursor-default hover:opacity-80 transition-opacity ${heatColor(p.pnlPct)}`}
                  style={{ minHeight: `${40 + sizePct * 0.4}px` }}
                >
                  <span className="font-display font-bold text-[.8rem] tracking-wide">{p.symbol}</span>
                  <span className="font-mono text-[.58rem] opacity-70">{p.side === "L" ? "LONG" : "SHORT"}</span>
                  <span className="font-mono text-[.68rem] font-bold">
                    {p.pnlPct > 0 ? "+" : ""}{p.pnlPct.toFixed(2)}%
                  </span>
                  <span className="font-mono text-[.6rem] opacity-70">{p.pnl}</span>
                </div>
              );
            })}
          </div>
          <div className="px-4 py-2 border-t border-border-subtle flex items-center gap-4 text-[.6rem] font-mono">
            <span className="text-bull">■ Profit</span>
            <span className="text-bear">■ Loss</span>
            <span className="text-text-disabled">Size = position value</span>
          </div>
        </div>

        {/* Strategy Status Grid */}
        <div className="bg-bg-surface border border-border-subtle rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-subtle">
            <span className="text-[.62rem] tracking-[.14em] uppercase text-text-muted">Strategy Status</span>
            <span className="text-[.6rem] font-mono text-text-disabled">{strategies.filter(s => s.status === "ACTIVE").length} active</span>
          </div>
          <div className="divide-y divide-border-subtle">
            {strategies.map((st) => (
              <div key={st.name} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <PulseDot active={st.status === "ACTIVE"} />
                    <span className="text-[.72rem] font-display font-bold text-text-primary truncate">{st.name}</span>
                    <span className={`text-[.58rem] font-mono px-1.5 py-0.5 rounded border flex-shrink-0 ${
                      st.status === "ACTIVE"
                        ? "text-bull bg-bull/10 border-bull/20"
                        : "text-text-disabled bg-bg-elevated border-border-subtle"
                    }`}>
                      {st.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[.62rem] font-mono text-text-muted">
                    <span>{st.position}</span>
                    <span>{st.trades} trades</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <MiniCurve data={st.curve} up={st.up} />
                  <span className={`font-mono text-[.72rem] font-bold ${st.up ? "text-bull" : "text-bear"}`}>
                    {st.pnl}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 4: Positions table + News feed ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

        {/* Open Positions table */}
        <div className="lg:col-span-2 bg-bg-surface border border-border-subtle rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-subtle">
            <span className="text-[.62rem] tracking-[.14em] uppercase text-text-muted">Open Positions</span>
            <div className="flex items-center gap-2">
              <PulseDot active={true} />
              <span className="text-[.6rem] font-mono text-text-disabled">8 active · 3 pending</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[.72rem]">
              <thead>
                <tr className="bg-bg-elevated">
                  {["Symbol","Side","Qty","Entry","Current","P&L","P&L%"].map((h, i) => (
                    <th key={h} className={`px-3 py-2 text-[.6rem] tracking-widest uppercase text-text-disabled font-normal border-b border-border-subtle ${i >= 2 ? "text-right" : "text-left"}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmapPositions.slice(0, 6).map((p) => (
                  <tr key={p.symbol} className="border-b border-border-subtle hover:bg-bg-elevated transition-colors">
                    <td className="px-3 py-2.5 font-display font-bold text-[.82rem] tracking-wide text-text-primary">{p.symbol}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-block px-2 py-0.5 rounded-sm text-[.62rem] font-mono border ${
                        p.side === "L"
                          ? "bg-bull/10 text-bull border-bull/20"
                          : "bg-bear/10 text-bear border-bear/20"
                      }`}>
                        {p.side === "L" ? "LONG" : "SHORT"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-text-secondary">
                      {Math.round(p.value / 189)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-text-secondary">
                      ${(p.value / Math.round(p.value / 189)).toFixed(2)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-text-primary">
                      ${((p.value / Math.round(p.value / 189)) * (1 + p.pnlPct / 100)).toFixed(2)}
                    </td>
                    <td className={`px-3 py-2.5 text-right font-mono font-bold ${p.pnlPct >= 0 ? "text-bull" : "text-bear"}`}>
                      {p.pnl}
                    </td>
                    <td className={`px-3 py-2.5 text-right font-mono font-bold ${p.pnlPct >= 0 ? "text-bull" : "text-bear"}`}>
                      {p.pnlPct > 0 ? "+" : ""}{p.pnlPct.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* News feed */}
        <div className="bg-bg-surface border border-border-subtle rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <LuNewspaper className="w-3.5 h-3.5 text-text-muted" />
              <span className="text-[.62rem] tracking-[.14em] uppercase text-text-muted">News & Sentiment</span>
            </div>
            <PulseDot active={true} />
          </div>
          <ul className="divide-y divide-border-subtle">
            {news.map((n, i) => (
              <li key={i} className="px-4 py-3 hover:bg-bg-elevated transition-colors cursor-default">
                <div className="flex items-start gap-2">
                  {/* Sentiment icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {n.sentiment === "bullish"
                      ? <LuArrowUpRight className="w-3.5 h-3.5 text-bull" />
                      : n.sentiment === "bearish"
                      ? <LuArrowDownRight className="w-3.5 h-3.5 text-bear" />
                      : <LuMinus className="w-3.5 h-3.5 text-text-muted" />
                    }
                  </div>
                  <div className="min-w-0">
                    <p className="text-[.7rem] text-text-secondary leading-snug">{n.headline}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono text-[.6rem] text-text-disabled">{n.time}</span>
                      {/* Confidence bar */}
                      <div className="flex items-center gap-1">
                        <div className="w-12 h-1 bg-bg-elevated rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${n.sentiment === "bullish" ? "bg-bull" : "bg-bear"}`}
                            style={{ width: `${n.score * 100}%` }}
                          />
                        </div>
                        <span className={`font-mono text-[.58rem] ${n.sentiment === "bullish" ? "text-bull" : "text-bear"}`}>
                          {Math.round(n.score * 100)}%
                        </span>
                      </div>
                      {/* Tickers */}
                      <div className="flex gap-1">
                        {n.tickers.map((t) => (
                          <span key={t} className="font-mono text-[.58rem] px-1 py-0.5 bg-bg-elevated border border-border-subtle rounded text-text-muted">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

      </div>
    </div>
  );
}