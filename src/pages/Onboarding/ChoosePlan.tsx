// src/pages/Onboarding/ChoosePlan.tsx
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/store/index";
import { OnboardingHeader } from "@/components/auth/OnboardingHeader";
import { LuCoins, LuShield, LuCheck } from "react-icons/lu";
import type { PlanId, Plan } from "@/types/auth";

const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    price: 20,
    tokens: "1 Million",
    highlight: false,
    features: [
      "Basic AI trade analysis",
      "Real-time market insights",
      "Standard chart indicators",
      "Email support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 50,
    tokens: "3 Million",
    highlight: true,
    features: [
      "Advanced AI trade analysis",
      "Real-time market alerts",
      "Advanced chart indicators",
      "Priority support",
      "Portfolio tracking",
    ],
  },
  {
    id: "elite",
    name: "Elite",
    price: 100,
    tokens: "8 Million",
    highlight: false,
    features: [
      "Premium AI trade analysis",
      "Instant trade signals",
      "Full market analytics",
      "Advanced portfolio management",
      "24/7 premium support",
    ],
  },
];

export default function ChoosePlan() {
  const navigate = useNavigate();
  const { setSelectedPlan, selectedPlan } = useAppStore();

  function pick(id: PlanId) {
    setSelectedPlan(id);
    navigate("/onboarding/connect");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <OnboardingHeader skipTo="/onboarding/connect" />

      <main className="flex flex-1 flex-col items-center px-6 py-10">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold uppercase tracking-[.1em] text-text-primary md:text-3xl">
            Choose Your Trading Plan
          </h1>
          <p className="mt-2 font-mono text-[.7rem] uppercase tracking-[.14em] text-text-muted">
            Select the plan that fits your trading and AI analysis needs
          </p>
        </div>

        <div className="mt-10 grid w-full max-w-5xl grid-cols-1 gap-5 md:grid-cols-3">
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isSelected={selectedPlan === plan.id}
              onChoose={() => pick(plan.id)}
            />
          ))}
        </div>

        <p className="mt-8 flex items-center gap-2 font-mono text-[.62rem] uppercase tracking-[.14em] text-text-disabled">
          <LuShield className="h-3 w-3" />
          Secure payment · Cancel anytime · Upgrade anytime
        </p>
      </main>
    </div>
  );
}

function PlanCard({
  plan,
  isSelected,
  onChoose,
}: {
  plan: Plan;
  isSelected: boolean;
  onChoose: () => void;
}) {
  const accent = plan.highlight || isSelected;

  return (
    <div
      className={`relative rounded-lg border p-7 transition-all ${
        accent
          ? "border-accent bg-accent-subtle shadow-card"
          : "border-border-subtle bg-bg-surface hover:border-border-default"
      }`}
    >
      {plan.highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-sm border border-accent-border bg-accent px-3 py-1 font-mono text-[.6rem] font-bold uppercase tracking-[.14em] text-bg-base">
          Most Popular
        </div>
      )}

      <div className="text-center">
        <h3 className="font-mono text-[.7rem] uppercase tracking-[.16em] text-text-muted">
          {plan.name} Plan
        </h3>
        <div className="mt-3 flex items-baseline justify-center gap-1">
          <span className="font-display text-4xl font-bold text-text-primary">${plan.price}</span>
          <span className="font-mono text-[.7rem] uppercase tracking-widest text-text-muted">/mo</span>
        </div>
      </div>

      <div className="my-6 h-px bg-border-subtle" />

      <div className="mb-4 flex items-center gap-2 font-mono text-[.72rem]">
        <LuCoins className="h-4 w-4 text-accent" />
        <span className="font-bold text-text-primary">{plan.tokens}</span>
        <span className="uppercase tracking-[.12em] text-text-muted">AI Tokens</span>
      </div>

      <ul className="mb-6 flex flex-col gap-2 text-[.78rem] text-text-secondary">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <LuCheck className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-accent" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={onChoose}
        className={`w-full rounded-sm py-2.5 font-mono text-[.72rem] font-bold uppercase tracking-widest transition-colors ${
          accent
            ? "bg-accent text-bg-base hover:bg-accent-hover"
            : "border border-border-default bg-bg-elevated text-text-secondary hover:border-accent hover:text-accent"
        }`}
      >
        Choose {plan.name}
      </button>
    </div>
  );
}
