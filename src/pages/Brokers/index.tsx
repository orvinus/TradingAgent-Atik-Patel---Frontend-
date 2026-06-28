// src/pages/Brokers/index.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { allBrokersApi } from "@/api/endpoints/brokers";
import { qk } from "@/api/queryKeys";
import { toast } from "@/components/ui/Toast";
import { LuLoader, LuSettings2 } from "react-icons/lu";
import {
  CreateAlpacaModal,
  CreateTradierModal,
  CreateBinanceModal,
  CreateCoinbaseModal,
  CreateKrakenModal,
  CreatePublicModal,
  CreateRobinhoodModal,
  CreateMT5Modal,
} from "@/components/broker/BrokerConnectionModals";
import { BROKERS, type BrokerInfo } from "@/lib/brokers";
import { ROUTES } from "@/constants/routes";
import type { BrokerType } from "@/types/broker";

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Brokers() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [activeModal, setActiveModal] = useState<BrokerType | null>(null);

  const { data: allConnsData, isLoading } = useQuery({
    queryKey: qk.allConnections(),
    queryFn: allBrokersApi.listAllConnections,
    staleTime: 30_000,
  });

  const byBroker = allConnsData?.by_broker ?? {};

  function isConnected(brokerId: string): boolean {
    return (byBroker[brokerId]?.length ?? 0) > 0;
  }

  function firstConnectionId(brokerId: string): string | undefined {
    return byBroker[brokerId]?.[0]?.id;
  }

  const { mutate: disconnect, isPending: isDisconnecting, variables: disconnectingId } = useMutation({
    mutationFn: ({ brokerId, connectionId }: { brokerId: string; connectionId: string }) =>
      allBrokersApi.deleteConnection(brokerId, connectionId),
    onSuccess: () => {
      toast.success("Disconnected.");
      qc.invalidateQueries({ queryKey: qk.allConnections() });
    },
    onError: (err) => {
      const msg = axios.isAxiosError(err) ? err.response?.data?.message : null;
      toast.error(msg ?? "Failed to disconnect.");
    },
  });

  const connectedBrokers = BROKERS.filter((b) => isConnected(b.id));
  const notConnectedBrokers = BROKERS.filter((b) => !isConnected(b.id));

  return (
    <div className="flex flex-col items-center px-4 py-10">
      {/* Hero */}
      <div className="w-full max-w-6xl text-center">
        <h1 className="font-display text-2xl font-bold uppercase tracking-[.1em] text-text-primary md:text-3xl">
          Connect Your Broker
        </h1>
        <p className="mt-2 font-mono text-[.7rem] uppercase tracking-[.14em] text-text-muted">
          One account per broker. Connect a brokerage or exchange to execute trades and sync portfolio data
        </p>
      </div>

      {/* Loading */}
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
                    onManage={() => navigate(ROUTES.BROKER_DETAIL(broker.id))}
                    onDisconnect={() => {
                      const connId = firstConnectionId(broker.id);
                      if (connId) disconnect({ brokerId: broker.id, connectionId: connId });
                    }}
                    disconnecting={isDisconnecting && disconnectingId?.brokerId === broker.id}
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
                      if (broker.integrated) setActiveModal(broker.id as BrokerType);
                    }}
                    onManage={() => {}}
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
      {activeModal === "mt5" && (
        <CreateMT5Modal
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

function SectionHeader({ dot, label, meta }: { dot: string; label: string; meta: string }) {
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
  onManage,
  onDisconnect,
  disconnecting,
}: {
  broker: BrokerInfo;
  connected: boolean;
  onConnect?: () => void;
  onManage: () => void;
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
          className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border font-display text-lg font-bold ${
            connected
              ? "border-accent-border bg-accent text-bg-base"
              : "border-border-default bg-bg-elevated text-accent"
          }`}
        >
          {broker.logo ? (
            <img src={broker.logo} alt={broker.name} className="h-full w-full object-cover" />
          ) : (
            broker.symbol
          )}
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

      {/* Status */}
      <div className="mt-3 flex items-center gap-1.5 font-mono text-[.6rem] uppercase tracking-[.14em]">
        <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-bull" : "bg-text-disabled"}`} />
        <span className={connected ? "text-bull" : "text-text-disabled"}>
          {connected ? `Connected` : "Not Connected"}
        </span>
      </div>

      {/* Actions */}
      {connected ? (
        <div className="mt-4 flex gap-2">
          <button
            onClick={onManage}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-sm border border-accent bg-accent py-2 font-mono text-[.7rem] font-bold uppercase tracking-widest text-bg-base transition-colors hover:bg-accent-hover"
          >
            <LuSettings2 className="h-3 w-3" />
            Manage
          </button>
          <button
            onClick={onDisconnect}
            disabled={disconnecting}
            className="flex items-center justify-center rounded-sm border border-bear/40 bg-bear/10 px-3 py-2 font-mono text-[.7rem] font-bold uppercase tracking-widest text-bear transition-colors hover:bg-bear/20 disabled:opacity-50"
            title="Disconnect"
          >
            {disconnecting ? <LuLoader className="h-3 w-3 animate-spin" /> : "Disconnect"}
          </button>
        </div>
      ) : broker.integrated ? (
        <button
          onClick={onConnect}
          className="mt-4 w-full rounded-sm bg-accent py-2 font-mono text-[.7rem] font-bold uppercase tracking-widest text-bg-base transition-colors hover:bg-accent-hover"
        >
          Connect
        </button>
      ) : (
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
