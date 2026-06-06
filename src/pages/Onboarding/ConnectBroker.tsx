// src/pages/Onboarding/ConnectBroker.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useAppStore } from "@/store/index";
import { OnboardingHeader } from "@/components/auth/OnboardingHeader";
import {
  CreateAlpacaModal,
  CreateTradierModal,
  CreateBinanceModal,
  CreateCoinbaseModal,
  CreateKrakenModal,
  CreatePublicModal,
  CreateRobinhoodModal,
} from "@/components/broker/BrokerConnectionModals";
import { allBrokersApi } from "@/api/endpoints/brokers";
import { qk } from "@/api/queryKeys";
import { LuLoader } from "react-icons/lu";
import type { BrokerType } from "@/types/broker";

// ── Broker registry ───────────────────────────────────────────────────────────

interface BrokerInfo {
  id: string;
  name: string;
  description: string;
  symbol: string;
  /** true = real API integration exists (Alpaca / Tradier) */
  integrated: boolean;
}

const BROKERS: BrokerInfo[] = [
  {
    id: "alpaca",
    name: "Alpaca",
    description: "Commission-free stocks + API access.",
    symbol: "α",
    integrated: true,
  },
  {
    id: "tradier",
    name: "Tradier",
    description: "Options, equities, and API trading.",
    symbol: "T",
    integrated: true,
  },
  {
    id: "binance",
    name: "Binance",
    description: "Crypto spot trading with HMAC & Ed25519.",
    symbol: "B",
    integrated: true,
  },
  {
    id: "public",
    name: "Public",
    description: "Stocks, options, crypto & bonds.",
    symbol: "P",
    integrated: true,
  },
  {
    id: "finance",
    name: "Finance",
    description: "Secure financial account integration.",
    symbol: "₣",
    integrated: false,
  },
  {
    id: "robinhood",
    name: "Robinhood",
    description: "Commission-free crypto investing platform.",
    symbol: "R",
    integrated: true,
  },
  {
    id: "schwab",
    name: "Schwab",
    description: "Professional investing and portfolio mgmt.",
    symbol: "S",
    integrated: false,
  },
  {
    id: "kraken",
    name: "Kraken",
    description: "Advanced cryptocurrency trading.",
    symbol: "K",
    integrated: true,
  },
  {
    id: "coinbase",
    name: "Coinbase",
    description: "Trusted crypto investing and exchange.",
    symbol: "C",
    integrated: true,
  },
  {
    id: "gemini",
    name: "Gemini",
    description: "Regulated crypto investing and exchange.",
    symbol: "G",
    integrated: false,
  },
];

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ConnectBroker() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { setOnboardingComplete, setPendingOnboarding } = useAppStore();

  // Which broker modal is open
  const [activeModal, setActiveModal] = useState<BrokerType | null>(null);

  const { data: allConnsData, isLoading } = useQuery({
    queryKey: qk.allConnections(),
    queryFn: allBrokersApi.listAllConnections,
    staleTime: 30_000,
  });

  const byBroker = allConnsData?.by_broker ?? {};

  const { mutate: disconnect, isPending: isDisconnecting } = useMutation({
    mutationFn: ({ brokerId, connectionId }: { brokerId: string; connectionId: string }) =>
      allBrokersApi.deleteConnection(brokerId, connectionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.allConnections() }),
  });

  function isConnected(brokerId: string): boolean {
    return (byBroker[brokerId]?.length ?? 0) > 0;
  }

  function firstConnectionId(brokerId: string): string | undefined {
    return byBroker[brokerId]?.[0]?.id;
  }

  function finish() {
    setOnboardingComplete(true);
    setPendingOnboarding(false);
    navigate("/", { replace: true });
  }

  const connectedBrokers = BROKERS.filter((b) => isConnected(b.id));
  const notConnectedBrokers = BROKERS.filter((b) => !isConnected(b.id));

  return (
    <div className="flex min-h-screen flex-col">
      <OnboardingHeader onSkip={finish} />

      <main className="flex flex-1 flex-col items-center px-6 py-10">
        {/* Hero */}
        <div className="max-w-3xl text-center">
          <h1 className="font-display text-2xl font-bold uppercase tracking-[.1em] text-text-primary md:text-3xl">
            Connect Your Broker
          </h1>
          <p className="mt-2 font-mono text-[.7rem] uppercase tracking-[.14em] text-text-muted">
            Connect a brokerage or exchange to execute trades and sync portfolio data
          </p>
        </div>

        {/* Loading state */}
        {isLoading ? (
          <div className="mt-20 flex items-center justify-center">
            <LuLoader className="h-6 w-6 animate-spin text-text-muted" />
          </div>
        ) : (
          <div className="mt-10 w-full max-w-6xl space-y-10">

            {/* ── Connected section ── */}
            {connectedBrokers.length > 0 && (
              <section>
                <SectionHeader
                  dot="bg-bull"
                  label="Connected"
                  meta={`${connectedBrokers.length} broker${connectedBrokers.length !== 1 ? "s" : ""}`}
                />
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {connectedBrokers.map((broker) => (
                    <BrokerCard
                      key={broker.id}
                      broker={broker}
                      connected
                      onDisconnect={() => {
                        const connId = firstConnectionId(broker.id);
                        if (connId) disconnect({ brokerId: broker.id, connectionId: connId });
                      }}
                      disconnecting={isDisconnecting}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* ── Not Connected section ── */}
            {notConnectedBrokers.length > 0 && (
              <section>
                <SectionHeader
                  dot="bg-text-disabled"
                  label="Not Connected"
                  meta={`${notConnectedBrokers.length} available`}
                />
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {notConnectedBrokers.map((broker) => (
                    <BrokerCard
                      key={broker.id}
                      broker={broker}
                      connected={false}
                      onConnect={() => {
                        if (broker.integrated) {
                          setActiveModal(broker.id as BrokerType);
                        }
                      }}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        <p className="mt-10 text-center font-mono text-[.62rem] uppercase tracking-[.14em] text-text-disabled">
          Connect multiple brokers and exchanges. Manage from settings anytime.
        </p>

        <button
          onClick={finish}
          className="mt-6 rounded-sm bg-accent px-10 py-2.5 font-mono text-[.72rem] font-bold uppercase tracking-widest text-bg-base transition-colors hover:bg-accent-hover"
        >
          Continue to Dashboard
        </button>
      </main>

      {/* ── Modals ── */}
      {activeModal === "alpaca" && (
        <CreateAlpacaModal
          onClose={() => setActiveModal(null)}
          onCreated={() => {
            setActiveModal(null);
            qc.invalidateQueries({ queryKey: qk.allConnections() });
          }}
        />
      )}
      {activeModal === "tradier" && (
        <CreateTradierModal
          onClose={() => setActiveModal(null)}
          onCreated={() => {
            setActiveModal(null);
            qc.invalidateQueries({ queryKey: qk.allConnections() });
          }}
        />
      )}
      {activeModal === "binance" && (
        <CreateBinanceModal
          onClose={() => setActiveModal(null)}
          onCreated={() => {
            setActiveModal(null);
            qc.invalidateQueries({ queryKey: qk.allConnections() });
          }}
        />
      )}
      {activeModal === "coinbase" && (
        <CreateCoinbaseModal
          onClose={() => setActiveModal(null)}
          onCreated={() => {
            setActiveModal(null);
            qc.invalidateQueries({ queryKey: qk.allConnections() });
          }}
        />
      )}
      {activeModal === "kraken" && (
        <CreateKrakenModal
          onClose={() => setActiveModal(null)}
          onCreated={() => {
            setActiveModal(null);
            qc.invalidateQueries({ queryKey: qk.allConnections() });
          }}
        />
      )}
      {activeModal === "public" && (
        <CreatePublicModal
          onClose={() => setActiveModal(null)}
          onCreated={() => {
            setActiveModal(null);
            qc.invalidateQueries({ queryKey: qk.allConnections() });
          }}
        />
      )}
      {activeModal === "robinhood" && (
        <CreateRobinhoodModal
          onClose={() => setActiveModal(null)}
          onCreated={() => {
            setActiveModal(null);
            qc.invalidateQueries({ queryKey: qk.allConnections() });
          }}
        />
      )}
      {activeModal === "kraken" && (
        <CreateKrakenModal
          onClose={() => setActiveModal(null)}
          onCreated={() => {
            setActiveModal(null);
            qc.invalidateQueries({ queryKey: qk.allConnections() });
          }}
        />
      )}
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({
  dot,
  label,
  meta,
}: {
  dot: string;
  label: string;
  meta: string;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-border-subtle pb-2">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      <h2 className="font-mono text-[.65rem] font-bold uppercase tracking-[.14em] text-text-secondary">
        {label}
      </h2>
      <span className="ml-auto font-mono text-[.6rem] uppercase tracking-widest text-text-disabled">
        {meta}
      </span>
    </div>
  );
}

// ── Broker card ───────────────────────────────────────────────────────────────

function BrokerCard({
  broker,
  connected,
  onConnect,
  onDisconnect,
  disconnecting,
}: {
  broker: BrokerInfo;
  connected: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  disconnecting?: boolean;
}) {
  return (
    <div
      className={`flex flex-col rounded-lg border p-5 transition-colors ${
        connected
          ? "border-accent bg-accent-subtle"
          : "border-border-subtle bg-bg-surface hover:border-border-default"
      }`}
    >
      {/* Icon + Name */}
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md border font-display text-lg font-bold ${
            connected
              ? "border-accent-border bg-accent text-bg-base"
              : "border-border-default bg-bg-elevated text-accent"
          }`}
        >
          {broker.symbol}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-sm font-bold uppercase tracking-[.1em] text-text-primary">
            {broker.name}
          </h3>
          {!broker.integrated && (
            <span className="rounded-sm border border-border-subtle px-1.5 py-0.5 font-mono text-[.52rem] uppercase tracking-widest text-text-disabled">
              Coming Soon
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="mt-3 min-h-[2.6rem] text-[.75rem] leading-relaxed text-text-secondary">
        {broker.description}
      </p>

      {/* Status indicator */}
      <div className="mt-3 flex items-center gap-1.5 font-mono text-[.6rem] uppercase tracking-[.14em]">
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            connected ? "bg-bull" : "bg-text-disabled"
          }`}
        />
        <span className={connected ? "text-bull" : "text-text-disabled"}>
          {connected ? "Connected" : "Not Connected"}
        </span>
      </div>

      {/* Action button */}
      {connected ? (
        <button
          onClick={onDisconnect}
          disabled={disconnecting}
          className="mt-4 flex w-full items-center justify-center rounded-sm border border-bear/40 bg-bear/10 py-2 font-mono text-[.7rem] font-bold uppercase tracking-widest text-bear transition-colors hover:bg-bear/20 disabled:opacity-50"
        >
          {disconnecting ? "Disconnecting…" : "Disconnect"}
        </button>
      ) : broker.integrated ? (
        // Not connected, has integration — primary connect button
        <button
          onClick={onConnect}
          className="mt-4 w-full rounded-sm bg-accent py-2 font-mono text-[.7rem] font-bold uppercase tracking-widest text-bg-base transition-colors hover:bg-accent-hover"
        >
          Connect
        </button>
      ) : (
        // Not connected, no integration yet — disabled
        <button
          disabled
          className="mt-4 w-full cursor-not-allowed rounded-sm border border-border-subtle bg-bg-elevated py-2 font-mono text-[.7rem] uppercase tracking-widest text-text-disabled"
        >
          Coming Soon
        </button>
      )}
    </div>
  );
}
