// src/pages/Brokers/index.tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { brokersApi } from "@/api/endpoints/alpaca";
import { tradierApi } from "@/api/endpoints/tradier";
import { binanceApi } from "@/api/endpoints/binance";
import { coinbaseApi } from "@/api/endpoints/coinbase";
import { krakenApi } from "@/api/endpoints/kraken";
import { publicApi } from "@/api/endpoints/public";
import { robinhoodApi } from "@/api/endpoints/robinhood";
import { allBrokersApi } from "@/api/endpoints/brokers";
import { qk } from "@/api/queryKeys";
import { toast } from "@/components/ui/Toast";
import {
  LuLoader, LuPlus, LuTrash2, LuRefreshCw,
  LuCheck, LuChevronRight, LuX, LuSettings2,
} from "react-icons/lu";
import {
  CreateAlpacaModal,
  CreateTradierModal,
  CreateBinanceModal,
  CreateCoinbaseModal,
  CreateKrakenModal,
  CreatePublicModal,
  CreateRobinhoodModal,
} from "@/components/broker/BrokerConnectionModals";
import type {
  AllBrokersConnectionEntry,
  BrokerConnection,
  BrokerType,
  AlpacaOrder,
  OrderSide,
  OrderType,
  TimeInForce,
} from "@/types/broker";

/** Normalizes unified API entry → BrokerConnection (maps id → broker_connection_id) */
function toConnection(entry: AllBrokersConnectionEntry): BrokerConnection {
  return { ...entry, broker_connection_id: entry.id };
}

// ── Broker registry ───────────────────────────────────────────────────────────

interface BrokerInfo {
  id: string;
  name: string;
  description: string;
  symbol: string;
  integrated: boolean;
}

const BROKERS: BrokerInfo[] = [
  { id: "alpaca",    name: "Alpaca",    description: "Commission-free stocks + API access.",         symbol: "α", integrated: true  },
  { id: "tradier",   name: "Tradier",   description: "Options, equities, and API trading.",           symbol: "T", integrated: true  },
  { id: "binance",   name: "Binance",   description: "Crypto spot trading with HMAC & Ed25519.",     symbol: "B", integrated: true  },
  { id: "public",    name: "Public",    description: "Stocks, options, crypto & bonds.",              symbol: "P", integrated: true  },
  { id: "finance",   name: "Finance",   description: "Secure financial account integration.",         symbol: "₣", integrated: false },
  { id: "robinhood", name: "Robinhood", description: "Commission-free crypto investing platform.",    symbol: "R", integrated: true  },
  { id: "schwab",    name: "Schwab",    description: "Professional investing and portfolio mgmt.",    symbol: "S", integrated: false },
  { id: "kraken",    name: "Kraken",    description: "Advanced cryptocurrency trading.",              symbol: "K", integrated: true  },
  { id: "coinbase",  name: "Coinbase",  description: "Trusted crypto investing and exchange.",        symbol: "C", integrated: true  },
  { id: "gemini",    name: "Gemini",    description: "Regulated crypto investing and exchange.",      symbol: "G", integrated: false },
];

// ── Unified broker API dispatch ───────────────────────────────────────────────

type SharedBrokerApi = typeof brokersApi;

const CRYPTO_BROKERS = new Set<BrokerType>(["binance", "coinbase", "kraken", "robinhood"]);

function useBrokerApi(broker: BrokerType): SharedBrokerApi {
  if (broker === "alpaca")    return brokersApi;
  if (broker === "binance")   return binanceApi    as unknown as SharedBrokerApi;
  if (broker === "coinbase")  return coinbaseApi   as unknown as SharedBrokerApi;
  if (broker === "kraken")    return krakenApi     as unknown as SharedBrokerApi;
  if (broker === "public")    return publicApi     as unknown as SharedBrokerApi;
  if (broker === "robinhood") return robinhoodApi  as unknown as SharedBrokerApi;
  return tradierApi as unknown as SharedBrokerApi;
}

function accountKey(broker: BrokerType, cid: string) {
  if (broker === "alpaca")    return qk.alpacaAccount(cid);
  if (broker === "binance")   return qk.binanceAccount(cid);
  if (broker === "coinbase")  return qk.coinbaseAccount(cid);
  if (broker === "kraken")    return qk.krakenAccount(cid);
  if (broker === "public")    return qk.publicAccount(cid);
  if (broker === "robinhood") return qk.robinhoodAccount(cid);
  return qk.tradierAccount(cid);
}
function clockKey(broker: BrokerType, cid: string) {
  if (broker === "alpaca")    return qk.alpacaClock(cid);
  if (broker === "binance")   return qk.binanceClock(cid);
  if (broker === "coinbase")  return qk.coinbaseClock(cid);
  if (broker === "kraken")    return qk.krakenClock(cid);
  if (broker === "public")    return qk.publicClock(cid);
  if (broker === "robinhood") return qk.robinhoodClock(cid);
  return qk.tradierClock(cid);
}
function positionsKey(broker: BrokerType, cid: string) {
  if (broker === "alpaca")    return qk.alpacaPositions(cid);
  if (broker === "binance")   return qk.binancePositions(cid);
  if (broker === "coinbase")  return qk.coinbasePositions(cid);
  if (broker === "kraken")    return qk.krakenPositions(cid);
  if (broker === "public")    return qk.publicPositions(cid);
  if (broker === "robinhood") return qk.robinhoodPositions(cid);
  return qk.tradierPositions(cid);
}
function ordersKey(broker: BrokerType, cid: string, status?: string) {
  if (broker === "alpaca")    return qk.alpacaOrders(cid, status);
  if (broker === "binance")   return qk.binanceOrders(cid, status);
  if (broker === "coinbase")  return qk.coinbaseOrders(cid, status);
  if (broker === "kraken")    return qk.krakenOrders(cid, status);
  if (broker === "public")    return qk.publicOrders(cid, status);
  if (broker === "robinhood") return qk.robinhoodOrders(cid, status);
  return qk.tradierOrders(cid, status);
}
function fillsKey(broker: BrokerType, cid: string) {
  if (broker === "alpaca")    return qk.alpacaFills(cid);
  if (broker === "binance")   return qk.binanceFills(cid);
  if (broker === "coinbase")  return qk.coinbaseFills(cid);
  if (broker === "kraken")    return qk.krakenFills(cid);
  if (broker === "public")    return qk.publicFills(cid);
  if (broker === "robinhood") return qk.robinhoodFills(cid);
  return qk.tradierFills(cid);
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Brokers() {
  const qc = useQueryClient();
  const [activeModal, setActiveModal] = useState<BrokerType | null>(null);
  const [managingBroker, setManagingBroker] = useState<BrokerType | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);

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
    onSuccess: (_, { brokerId }) => {
      toast.success("Disconnected.");
      qc.invalidateQueries({ queryKey: qk.allConnections() });
      if (managingBroker === brokerId) {
        setManagingBroker(null);
        setSelectedConnectionId(null);
      }
    },
    onError: (err) => {
      const msg = axios.isAxiosError(err) ? err.response?.data?.message : null;
      toast.error(msg ?? "Failed to disconnect.");
    },
  });

  function connectionsForBroker(brokerId: string): BrokerConnection[] {
    return (byBroker[brokerId] ?? []).map(toConnection);
  }

  function handleManage(brokerId: BrokerType) {
    if (managingBroker === brokerId) {
      setManagingBroker(null);
      setSelectedConnectionId(null);
    } else {
      setManagingBroker(brokerId);
      setSelectedConnectionId(null);
    }
  }

  const connectedBrokers = BROKERS.filter((b) => isConnected(b.id));
  const notConnectedBrokers = BROKERS.filter((b) => !isConnected(b.id));

  const managingConnections = managingBroker ? connectionsForBroker(managingBroker) : [];
  const selectedConn = managingConnections.find(
    (c) => c.broker_connection_id === selectedConnectionId
  );

  return (
    <div className="flex flex-col items-center px-4 py-10">
      {/* Hero */}
      <div className="w-full max-w-6xl text-center">
        <h1 className="font-display text-2xl font-bold uppercase tracking-[.1em] text-text-primary md:text-3xl">
          Connect Your Broker
        </h1>
        <p className="mt-2 font-mono text-[.7rem] uppercase tracking-[.14em] text-text-muted">
          Connect a brokerage or exchange to execute trades and sync portfolio data
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
                    managing={managingBroker === broker.id}
                    onManage={() => handleManage(broker.id as BrokerType)}
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

          {/* ── Connection management panel ── */}
          {managingBroker && (
            <ConnectionsPanel
              broker={managingBroker}
              connections={managingConnections}
              selectedId={selectedConnectionId}
              onSelect={(id) =>
                setSelectedConnectionId(selectedConnectionId === id ? null : id)
              }
            />
          )}

          {/* ── Connection detail ── */}
          {selectedConn && managingBroker && (
            <ConnectionDetail conn={selectedConn} broker={managingBroker} />
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
                    managing={false}
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
  managing,
  onConnect,
  onManage,
  onDisconnect,
  disconnecting,
}: {
  broker: BrokerInfo;
  connected: boolean;
  managing: boolean;
  onConnect?: () => void;
  onManage: () => void;
  onDisconnect?: () => void;
  disconnecting?: boolean;
}) {
  return (
    <div
      className={`flex flex-col rounded-lg border p-5 transition-colors ${
        managing
          ? "border-accent bg-accent-subtle ring-1 ring-accent/30"
          : connected
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
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-sm border py-2 font-mono text-[.7rem] font-bold uppercase tracking-widest transition-colors ${
              managing
                ? "border-accent bg-accent text-bg-base hover:bg-accent-hover"
                : "border-accent/40 bg-accent/10 text-accent hover:bg-accent/20"
            }`}
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

// ── Connections panel (shown below connected broker cards) ────────────────────

function ConnectionsPanel({
  broker,
  connections,
  selectedId,
  onSelect,
}: {
  broker: BrokerType;
  connections: BrokerConnection[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const api = useBrokerApi(broker);
  const qc = useQueryClient();

  const deleteMut = useMutation({
    mutationFn: (cid: string) => api.deleteConnection(cid),
    onSuccess: (_, cid) => {
      toast.success("Connection deleted.");
      qc.invalidateQueries({ queryKey: qk.allConnections() });
      if (selectedId === cid) onSelect(cid);
    },
    onError: (err) => {
      const msg = axios.isAxiosError(err) ? err.response?.data?.message : null;
      toast.error(msg ?? "Failed to delete connection.");
    },
  });

  const testMut = useMutation({
    mutationFn: (cid: string) => api.testConnection(cid),
    onSuccess: (res) => {
      if (res.ok) toast.success(`Connection OK — ${res.latency_ms} ms`);
      else toast.error("Connection test failed.");
    },
    onError: () => toast.error("Connection test failed."),
  });

  return (
    <div className="rounded-lg border border-border-subtle bg-bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-mono text-[.65rem] font-bold uppercase tracking-[.14em] text-text-secondary">
          {broker} connections
        </h3>
        <span className="font-mono text-[.6rem] uppercase tracking-widest text-text-disabled">
          {connections.length} total
        </span>
      </div>

      {connections.length === 0 ? (
        <p className="py-4 text-center font-mono text-[.7rem] uppercase tracking-widest text-text-muted">
          No connections yet
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {connections.map((conn) => (
            <ConnectionCard
              key={conn.broker_connection_id}
              conn={conn}
              broker={broker}
              selected={selectedId === conn.broker_connection_id}
              onSelect={() => onSelect(conn.broker_connection_id)}
              onTest={() => testMut.mutate(conn.broker_connection_id)}
              onDelete={() => {
                if (confirm("Delete this connection? This cannot be undone.")) {
                  deleteMut.mutate(conn.broker_connection_id);
                }
              }}
              testing={testMut.isPending && testMut.variables === conn.broker_connection_id}
              deleting={deleteMut.isPending && deleteMut.variables === conn.broker_connection_id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Connection Card ───────────────────────────────────────────────────────────

function ConnectionCard({
  conn,
  broker,
  selected,
  onSelect,
  onTest,
  onDelete,
  testing,
  deleting,
}: {
  conn: BrokerConnection;
  broker: BrokerType;
  selected: boolean;
  onSelect: () => void;
  onTest: () => void;
  onDelete: () => void;
  testing: boolean;
  deleting: boolean;
}) {
  const statusColor =
    conn.status === "active" ? "bg-bull"
    : conn.status === "error" ? "bg-bear"
    : "bg-text-disabled";

  return (
    <div
      className={`rounded-lg border p-4 transition-colors ${
        selected
          ? "border-accent bg-accent-subtle"
          : "border-border-subtle bg-bg-elevated hover:border-border-default"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusColor}`} />
            <p className="truncate font-display text-sm font-bold uppercase tracking-wider text-text-primary">
              {conn.display_name || (broker === "alpaca" ? "Alpaca" : "Tradier")}
            </p>
            <span className="rounded-sm border border-border-subtle px-1.5 py-0.5 font-mono text-[.55rem] uppercase tracking-widest text-text-disabled">
              {conn.environment}
            </span>
          </div>
          <p className="mt-0.5 font-mono text-[.62rem] uppercase tracking-widest text-text-muted">
            {conn.account_status ?? conn.status}
          </p>
          <p className="mt-1 truncate font-mono text-[.58rem] text-text-disabled">
            {conn.broker_connection_id.slice(0, 18)}…
          </p>
        </div>
        <button
          onClick={onSelect}
          className={`shrink-0 rounded-sm p-1.5 transition-colors ${
            selected ? "text-accent" : "text-text-muted hover:text-text-primary"
          }`}
          title={selected ? "Collapse" : "Expand"}
        >
          <LuChevronRight
            className={`h-4 w-4 transition-transform ${selected ? "rotate-90" : ""}`}
          />
        </button>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={onTest}
          disabled={testing}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-sm border border-border-default bg-bg-surface py-1.5 font-mono text-[.65rem] uppercase tracking-widest text-text-secondary transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {testing ? <LuLoader className="h-3 w-3 animate-spin" /> : <LuRefreshCw className="h-3 w-3" />}
          Test
        </button>
        <button
          onClick={onDelete}
          disabled={deleting}
          className="flex items-center justify-center gap-1.5 rounded-sm border border-border-default bg-bg-surface px-3 py-1.5 font-mono text-[.65rem] uppercase tracking-widest text-text-secondary transition-colors hover:border-bear hover:text-bear disabled:cursor-not-allowed disabled:opacity-50"
          title="Delete connection"
        >
          {deleting ? <LuLoader className="h-3 w-3 animate-spin" /> : <LuTrash2 className="h-3 w-3" />}
        </button>
      </div>
    </div>
  );
}

// ── Connection Detail (Tabs) ──────────────────────────────────────────────────

type Tab = "overview" | "positions" | "orders" | "fills";

function ConnectionDetail({ conn, broker }: { conn: BrokerConnection; broker: BrokerType }) {
  const [tab, setTab] = useState<Tab>("overview");
  const cid = conn.broker_connection_id;

  const TABS: { id: Tab; label: string }[] = [
    { id: "overview",  label: "Overview"  },
    { id: "positions", label: "Positions" },
    { id: "orders",    label: "Orders"    },
    { id: "fills",     label: "Fills"     },
  ];

  return (
    <div className="rounded-lg border border-border-subtle bg-bg-surface">
      <div className="flex items-center gap-1 border-b border-border-subtle px-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-3 font-mono text-[.68rem] uppercase tracking-widest transition-colors ${
              tab === t.id
                ? "border-b-2 border-accent text-accent"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            {t.label}
          </button>
        ))}
        <span className="ml-auto font-mono text-[.6rem] uppercase tracking-widest text-text-disabled">
          {broker} · {conn.environment}
        </span>
      </div>

      <div className="p-5">
        {tab === "overview"  && <OverviewTab  cid={cid} broker={broker} />}
        {tab === "positions" && <PositionsTab cid={cid} broker={broker} />}
        {tab === "orders"    && <OrdersTab    cid={cid} broker={broker} />}
        {tab === "fills"     && <FillsTab     cid={cid} broker={broker} />}
      </div>
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({ cid, broker }: { cid: string; broker: BrokerType }) {
  const api = useBrokerApi(broker);

  const { data: account, isLoading: loadingAcct } = useQuery({
    queryKey: accountKey(broker, cid),
    queryFn: () => api.getAccount(cid),
    staleTime: 30_000,
  });

  const { data: clock, isLoading: loadingClock } = useQuery({
    queryKey: clockKey(broker, cid),
    queryFn: () => api.getClock(cid),
    staleTime: 60_000,
  });

  if (loadingAcct || loadingClock) {
    return (
      <div className="flex items-center justify-center py-10">
        <LuLoader className="h-5 w-5 animate-spin text-text-muted" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {clock && (
        <div className="flex items-center gap-2 rounded-sm border border-border-subtle bg-bg-elevated px-4 py-2.5">
          <span className={`h-2 w-2 rounded-full ${clock.is_open ? "bg-bull animate-pulse" : "bg-text-disabled"}`} />
          <span className="font-mono text-[.68rem] uppercase tracking-widest text-text-secondary">
            Market {clock.is_open ? "Open" : "Closed"}
          </span>
          <span className="ml-auto font-mono text-[.62rem] text-text-disabled">
            {clock.is_open
              ? `Closes ${new Date(clock.next_close).toLocaleString()}`
              : `Opens ${new Date(clock.next_open).toLocaleString()}`}
          </span>
        </div>
      )}

      {account && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Equity"       value={`$${parseFloat(account.equity).toLocaleString()}`} />
          <StatCard label="Buying Power" value={`$${parseFloat(account.buying_power).toLocaleString()}`} />
          <StatCard label="Cash"         value={`$${parseFloat(account.cash).toLocaleString()}`} />
          <StatCard
            label="Status"
            value={account.status}
            highlight={account.status === "ACTIVE" || account.status === "active"}
          />
        </div>
      )}

      {!account && !loadingAcct && (
        <p className="py-6 text-center font-mono text-[.7rem] text-text-muted">
          Could not load account data.
        </p>
      )}

      {broker === "tradier" && (
        <p className="font-mono text-[.6rem] leading-relaxed text-text-disabled">
          ⓘ Tradier portfolio history may return a single equity snapshot rather than a full historical curve.
        </p>
      )}
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-sm border border-border-subtle bg-bg-elevated p-3">
      <p className="font-mono text-[.6rem] uppercase tracking-widest text-text-muted">{label}</p>
      <p className={`mt-1 font-display text-lg font-bold ${highlight ? "text-bull" : "text-text-primary"}`}>
        {value}
      </p>
    </div>
  );
}

// ── Positions Tab ─────────────────────────────────────────────────────────────

function PositionsTab({ cid, broker }: { cid: string; broker: BrokerType }) {
  const api = useBrokerApi(broker);

  const { data: positions = [], isLoading } = useQuery({
    queryKey: positionsKey(broker, cid),
    queryFn: () => api.getPositions(cid),
    staleTime: 30_000,
  });

  if (isLoading) return (
    <div className="flex items-center justify-center py-10">
      <LuLoader className="h-5 w-5 animate-spin text-text-muted" />
    </div>
  );

  if (positions.length === 0) return (
    <p className="py-8 text-center font-mono text-[.7rem] uppercase tracking-widest text-text-muted">
      No open positions
    </p>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border-subtle">
            {["Symbol", "Qty", "Avg Cost", "Mark Price", "Unrealized P&L"].map((h) => (
              <th key={h} className="pb-2 pr-4 font-mono text-[.6rem] uppercase tracking-widest text-text-muted">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {positions.map((pos) => {
            const pnl = parseFloat(pos.unrealized_pnl);
            return (
              <tr key={pos.symbol} className="border-b border-border-subtle last:border-0">
                <td className="py-2.5 pr-4 font-display font-bold uppercase tracking-wider text-text-primary">{pos.symbol}</td>
                <td className="py-2.5 pr-4 font-mono text-sm text-text-secondary">{pos.qty}</td>
                <td className="py-2.5 pr-4 font-mono text-sm text-text-secondary">${parseFloat(pos.avg_cost).toFixed(2)}</td>
                <td className="py-2.5 pr-4 font-mono text-sm text-text-secondary">${parseFloat(pos.mark_price).toFixed(2)}</td>
                <td className={`py-2.5 font-mono text-sm font-bold ${pnl >= 0 ? "text-bull" : "text-bear"}`}>
                  {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Orders Tab ────────────────────────────────────────────────────────────────

function OrdersTab({ cid, broker }: { cid: string; broker: BrokerType }) {
  const [orderStatus, setOrderStatus] = useState<"open" | "closed" | "all">("open");
  const [showSubmit, setShowSubmit] = useState(false);
  const api = useBrokerApi(broker);
  const qc = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ordersKey(broker, cid, orderStatus),
    queryFn: () => api.listOrders(cid, { status: orderStatus, limit: 100 }),
    staleTime: 15_000,
  });

  const cancelMut = useMutation({
    mutationFn: (orderId: string) => api.cancelOrder(cid, orderId),
    onSuccess: () => {
      toast.success("Order cancelled.");
      qc.invalidateQueries({ queryKey: ordersKey(broker, cid, orderStatus) });
    },
    onError: (err) => {
      const msg = axios.isAxiosError(err) ? err.response?.data?.message : null;
      toast.error(msg ?? "Failed to cancel order.");
    },
  });

  const statusColor = (s: string) =>
    s === "filled" ? "text-bull"
    : s === "canceled" || s === "expired" ? "text-bear"
    : s === "new" || s === "accepted" || s === "partially_filled" ? "text-info"
    : "text-text-muted";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1 rounded-sm border border-border-subtle bg-bg-elevated p-0.5">
          {(["open", "closed", "all"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setOrderStatus(s)}
              className={`rounded-sm px-3 py-1 font-mono text-[.65rem] uppercase tracking-widest transition-colors ${
                orderStatus === s ? "bg-accent text-bg-base" : "text-text-muted hover:text-text-primary"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowSubmit(true)}
          className="flex items-center gap-1.5 rounded-sm bg-accent px-3 py-1.5 font-mono text-[.68rem] font-bold uppercase tracking-widest text-bg-base transition-colors hover:bg-accent-hover"
        >
          <LuPlus className="h-3.5 w-3.5" />
          New Order
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <LuLoader className="h-5 w-5 animate-spin text-text-muted" />
        </div>
      ) : orders.length === 0 ? (
        <p className="py-6 text-center font-mono text-[.7rem] uppercase tracking-widest text-text-muted">
          No {orderStatus} orders
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border-subtle">
                {["Symbol", "Side", "Type", "Qty", "Limit", "Status", "Submitted", ""].map((h) => (
                  <th key={h} className="pb-2 pr-4 font-mono text-[.6rem] uppercase tracking-widest text-text-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <OrderRow
                  key={order.broker_order_id}
                  order={order}
                  onCancel={() => cancelMut.mutate(order.broker_order_id)}
                  cancelling={cancelMut.isPending && cancelMut.variables === order.broker_order_id}
                  statusColor={statusColor}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showSubmit && (
        <SubmitOrderModal
          cid={cid}
          broker={broker}
          onClose={() => setShowSubmit(false)}
          onSubmitted={() => {
            setShowSubmit(false);
            qc.invalidateQueries({ queryKey: ordersKey(broker, cid, orderStatus) });
          }}
        />
      )}
    </div>
  );
}

function OrderRow({
  order,
  onCancel,
  cancelling,
  statusColor,
}: {
  order: AlpacaOrder;
  onCancel: () => void;
  cancelling: boolean;
  statusColor: (s: string) => string;
}) {
  const canCancel = !["filled", "canceled", "expired", "replaced"].includes(order.status);

  return (
    <tr className="border-b border-border-subtle last:border-0">
      <td className="py-2.5 pr-4 font-display text-sm font-bold uppercase tracking-wider text-text-primary">
        {order.symbol ?? "—"}
      </td>
      <td className={`py-2.5 pr-4 font-mono text-sm font-bold ${order.side === "buy" ? "text-bull" : "text-bear"}`}>
        {order.side?.toUpperCase() ?? "—"}
      </td>
      <td className="py-2.5 pr-4 font-mono text-[.68rem] uppercase tracking-widest text-text-secondary">
        {order.order_type ?? "—"}
      </td>
      <td className="py-2.5 pr-4 font-mono text-sm text-text-secondary">{order.qty ?? order.notional ?? "—"}</td>
      <td className="py-2.5 pr-4 font-mono text-sm text-text-secondary">
        {order.limit_price ? `$${order.limit_price}` : "—"}
      </td>
      <td className={`py-2.5 pr-4 font-mono text-[.62rem] uppercase tracking-widest ${statusColor(order.status)}`}>
        {order.status}
      </td>
      <td className="py-2.5 pr-4 font-mono text-[.62rem] text-text-disabled">
        {new Date(order.submitted_at).toLocaleString()}
      </td>
      <td className="py-2.5">
        {canCancel && (
          <button
            onClick={onCancel}
            disabled={cancelling}
            className="flex items-center gap-1 rounded-sm border border-border-default px-2 py-1 font-mono text-[.62rem] uppercase tracking-widest text-text-muted transition-colors hover:border-bear hover:text-bear disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelling ? <LuLoader className="h-3 w-3 animate-spin" /> : <LuX className="h-3 w-3" />}
            Cancel
          </button>
        )}
      </td>
    </tr>
  );
}

// ── Fills Tab ─────────────────────────────────────────────────────────────────

function FillsTab({ cid, broker }: { cid: string; broker: BrokerType }) {
  const api = useBrokerApi(broker);

  const { data: fills = [], isLoading } = useQuery({
    queryKey: fillsKey(broker, cid),
    queryFn: () => api.getFills(cid, { limit: 100 }),
    staleTime: 30_000,
  });

  if (isLoading) return (
    <div className="flex items-center justify-center py-10">
      <LuLoader className="h-5 w-5 animate-spin text-text-muted" />
    </div>
  );

  if (fills.length === 0) return (
    <p className="py-8 text-center font-mono text-[.7rem] uppercase tracking-widest text-text-muted">
      No fills yet
    </p>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border-subtle">
            {["Symbol", "Side", "Qty", "Price", "Fee", "Filled At"].map((h) => (
              <th key={h} className="pb-2 pr-4 font-mono text-[.6rem] uppercase tracking-widest text-text-muted">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {fills.map((fill) => (
            <tr key={fill.broker_fill_id} className="border-b border-border-subtle last:border-0">
              <td className="py-2.5 pr-4 font-display text-sm font-bold uppercase tracking-wider text-text-primary">
                {fill.symbol}
              </td>
              <td className={`py-2.5 pr-4 font-mono text-sm font-bold ${fill.side === "buy" ? "text-bull" : "text-bear"}`}>
                {fill.side.toUpperCase()}
              </td>
              <td className="py-2.5 pr-4 font-mono text-sm text-text-secondary">{fill.qty}</td>
              <td className="py-2.5 pr-4 font-mono text-sm text-text-secondary">
                ${parseFloat(fill.price).toFixed(2)}
              </td>
              <td className="py-2.5 pr-4 font-mono text-sm text-text-secondary">
                {fill.fee ? `$${parseFloat(fill.fee).toFixed(4)}` : "—"}
              </td>
              <td className="py-2.5 font-mono text-[.62rem] text-text-disabled">
                {new Date(fill.filled_at).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Submit Order Modal ────────────────────────────────────────────────────────

function SubmitOrderModal({
  cid,
  broker,
  onClose,
  onSubmitted,
}: {
  cid: string;
  broker: BrokerType;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const api = useBrokerApi(broker);
  const [symbol, setSymbol] = useState("");
  const [assetClass, setAssetClass] = useState<"equity" | "options" | "crypto">(
    CRYPTO_BROKERS.has(broker) ? "crypto" : "equity"
  );
  const [optionSymbol, setOptionSymbol] = useState("");
  const [side, setSide] = useState<OrderSide>("buy");
  const [orderType, setOrderType] = useState<OrderType>("limit");
  const [qty, setQty] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [tif, setTif] = useState<TimeInForce>("DAY");

  const submitMut = useMutation({
    mutationFn: () => {
      const payload = {
        client_order_id: `manual-${Date.now()}`,
        symbol: symbol.toUpperCase().trim(),
        asset_class: assetClass,
        side,
        order_type: orderType,
        ...(qty ? { qty } : {}),
        ...(limitPrice ? { limit_price: limitPrice } : {}),
        time_in_force: tif,
        ...(broker === "tradier" && assetClass === "options" && optionSymbol
          ? { metadata: { option_symbol: optionSymbol.toUpperCase().trim() } }
          : {}),
      };
      return api.submitOrder(cid, payload);
    },
    onSuccess: (res) => {
      toast.success(`Order submitted — ${res.broker_order_id.slice(0, 8)}…`);
      onSubmitted();
    },
    onError: (err) => {
      const msg = axios.isAxiosError(err) ? err.response?.data?.message : null;
      toast.error(msg ?? "Failed to submit order.");
    },
  });

  const canSubmit =
    symbol.trim().length > 0 &&
    qty.trim().length > 0 &&
    (orderType !== "limit" || limitPrice.trim().length > 0) &&
    !(broker === "tradier" && assetClass === "options" && optionSymbol.trim().length === 0) &&
    !submitMut.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-lg border border-border-default bg-bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
          <h2 className="font-display text-base font-bold uppercase tracking-[.1em] text-text-primary">
            Submit Order
            <span className="ml-2 font-mono text-[.6rem] font-normal normal-case tracking-widest text-text-muted">
              {broker}
            </span>
          </h2>
          <button onClick={onClose} className="rounded-sm p-1 text-text-muted transition-colors hover:text-text-primary">
            <LuX className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-5 py-5">
          <div>
            <label className="mb-1.5 block font-mono text-[.65rem] uppercase tracking-widest text-text-muted">
              Symbol (underlying)
            </label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="SPY"
              className="w-full rounded-sm border border-border-default bg-bg-elevated px-3 py-2 font-mono text-sm uppercase text-text-primary placeholder:text-text-disabled focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block font-mono text-[.65rem] uppercase tracking-widest text-text-muted">
              Asset Class
            </label>
            <div className="flex gap-2">
              {(CRYPTO_BROKERS.has(broker)
                ? (["crypto"] as const)
                : (["equity", "options"] as const)
              ).map((a) => (
                <button
                  key={a}
                  onClick={() => setAssetClass(a)}
                  className={`flex-1 rounded-sm border py-1.5 font-mono text-[.68rem] uppercase tracking-widest transition-colors ${
                    assetClass === a
                      ? "border-accent bg-accent text-bg-base"
                      : "border-border-default bg-bg-elevated text-text-secondary hover:border-accent hover:text-accent"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {broker === "tradier" && assetClass === "options" && (
            <div>
              <label className="mb-1.5 block font-mono text-[.65rem] uppercase tracking-widest text-text-muted">
                Option Symbol <span className="text-bear">*</span>
              </label>
              <input
                type="text"
                value={optionSymbol}
                onChange={(e) => setOptionSymbol(e.target.value.toUpperCase())}
                placeholder="SPY260620C00580000"
                className="w-full rounded-sm border border-border-default bg-bg-elevated px-3 py-2 font-mono text-sm uppercase text-text-primary placeholder:text-text-disabled focus:border-accent focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block font-mono text-[.65rem] uppercase tracking-widest text-text-muted">Side</label>
            <div className="flex gap-2">
              {(["buy", "sell"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSide(s)}
                  className={`flex-1 rounded-sm border py-2 font-mono text-[.7rem] font-bold uppercase tracking-widest transition-colors ${
                    side === s
                      ? s === "buy" ? "border-bull bg-bull/20 text-bull" : "border-bear bg-bear/20 text-bear"
                      : "border-border-default bg-bg-elevated text-text-secondary"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block font-mono text-[.65rem] uppercase tracking-widest text-text-muted">
              Order Type
            </label>
            <select
              value={orderType}
              onChange={(e) => setOrderType(e.target.value as OrderType)}
              className="w-full rounded-sm border border-border-default bg-bg-elevated px-3 py-2 font-mono text-sm text-text-primary focus:border-accent focus:outline-none"
            >
              <option value="market">Market</option>
              <option value="limit">Limit</option>
              <option value="stop">Stop</option>
              <option value="stop_limit">Stop Limit</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block font-mono text-[.65rem] uppercase tracking-widest text-text-muted">
              Quantity {broker === "tradier" && <span className="text-text-disabled">(whole shares)</span>}
            </label>
            <input
              type="number"
              min="1"
              step={broker === "tradier" ? "1" : "any"}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="1"
              className="w-full rounded-sm border border-border-default bg-bg-elevated px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-disabled focus:border-accent focus:outline-none"
            />
          </div>

          {(orderType === "limit" || orderType === "stop_limit") && (
            <div>
              <label className="mb-1.5 block font-mono text-[.65rem] uppercase tracking-widest text-text-muted">
                Limit Price
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                placeholder="400.00"
                className="w-full rounded-sm border border-border-default bg-bg-elevated px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-disabled focus:border-accent focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block font-mono text-[.65rem] uppercase tracking-widest text-text-muted">
              Time in Force
            </label>
            <select
              value={tif}
              onChange={(e) => setTif(e.target.value as TimeInForce)}
              className="w-full rounded-sm border border-border-default bg-bg-elevated px-3 py-2 font-mono text-sm text-text-primary focus:border-accent focus:outline-none"
            >
              <option value="DAY">DAY</option>
              <option value="GTC">GTC</option>
              <option value="IOC">IOC</option>
              <option value="FOK">FOK</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 border-t border-border-subtle px-5 py-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-sm border border-border-default bg-bg-elevated py-2 font-mono text-[.7rem] uppercase tracking-widest text-text-secondary transition-colors hover:text-text-primary"
          >
            Cancel
          </button>
          <button
            onClick={() => submitMut.mutate()}
            disabled={!canSubmit}
            className={`flex flex-1 items-center justify-center gap-2 rounded-sm py-2 font-mono text-[.7rem] font-bold uppercase tracking-widest text-bg-base transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              side === "buy" ? "bg-bull hover:bg-bull/80" : "bg-bear hover:bg-bear/80"
            }`}
          >
            {submitMut.isPending ? (
              <><LuLoader className="h-3.5 w-3.5 animate-spin" /> Submitting…</>
            ) : (
              <><LuCheck className="h-3.5 w-3.5" /> {side === "buy" ? "Buy" : "Sell"} {symbol || "—"}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
