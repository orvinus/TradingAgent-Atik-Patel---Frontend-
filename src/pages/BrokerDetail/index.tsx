// src/pages/BrokerDetail/index.tsx
// Dedicated per-broker management page. Reached from the Brokers list via
// "Manage". Shows the broker overview on top and a single filterable table
// below with Positions / Orders / Fills views.
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient, useIsFetching } from "@tanstack/react-query";
import axios from "axios";
import { allBrokersApi } from "@/api/endpoints/brokers";
import { qk } from "@/api/queryKeys";
import { toast } from "@/components/ui/Toast";
import {
  LuLoader, LuPlus, LuRefreshCw, LuCheck, LuX, LuArrowLeft,
  LuTrash2, LuSearch, LuChevronLeft, LuChevronRight,
} from "react-icons/lu";
import {
  getBrokerInfo,
  useBrokerApi,
  CRYPTO_BROKERS,
  accountKey,
  clockKey,
  positionsKey,
  ordersKey,
  fillsKey,
} from "@/lib/brokers";
import type {
  BrokerType,
  AlpacaOrder,
  OrderSide,
  OrderType,
  TimeInForce,
} from "@/types/broker";

const INTEGRATED_BROKERS = new Set<BrokerType>([
  "alpaca", "tradier", "binance", "coinbase", "kraken", "public", "robinhood",
]);

function isBrokerType(v: string | undefined): v is BrokerType {
  return !!v && INTEGRATED_BROKERS.has(v as BrokerType);
}

// The API can return enum-prefixed strings like "ORDERSIDE.buy" or "ORDERTYPE.limit".
// These helpers extract the plain value after the last dot.
const normSide = (raw: string | undefined): string =>
  (raw?.split(".").pop() ?? "").toLowerCase();

const normEnum = (raw: string | undefined): string =>
  raw?.split(".").pop()?.toUpperCase() ?? "—";

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BrokerDetail() {
  const { brokerId } = useParams<{ brokerId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const broker = isBrokerType(brokerId) ? brokerId : null;
  const info = brokerId ? getBrokerInfo(brokerId) : undefined;

  const { data: allConnsData, isLoading } = useQuery({
    queryKey: qk.allConnections(),
    queryFn: allBrokersApi.listAllConnections,
    staleTime: 30_000,
  });

  const connection = broker
    ? allConnsData?.by_broker?.[broker]?.[0]
    : undefined;
  const cid = connection?.id;

  const { mutate: disconnect, isPending: isDisconnecting } = useMutation({
    mutationFn: () => allBrokersApi.deleteConnection(broker!, cid!),
    onSuccess: () => {
      toast.success("Disconnected.");
      qc.invalidateQueries({ queryKey: qk.allConnections() });
      navigate("/brokers");
    },
    onError: (err) => {
      const msg = axios.isAxiosError(err) ? err.response?.data?.message : null;
      toast.error(msg ?? "Failed to disconnect.");
    },
  });

  const api = useBrokerApi(broker ?? "alpaca");
  const testMut = useMutation({
    mutationFn: () => api.testConnection(cid!),
    onSuccess: (res) => {
      if (res.ok) toast.success(`Connection OK — ${res.latency_ms} ms`);
      else toast.error("Connection test failed.");
    },
    onError: () => toast.error("Connection test failed."),
  });

  // ── Guard rails ──────────────────────────────────────────────────────────
  if (!broker || !info?.integrated) {
    return (
      <EmptyState
        title="Unknown broker"
        message="This broker is not available."
        onBack={() => navigate("/brokers")}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <LuLoader className="h-6 w-6 animate-spin text-text-muted" />
      </div>
    );
  }

  if (!connection || !cid) {
    return (
      <EmptyState
        title={`${info.name} not connected`}
        message="Connect this broker to manage positions, orders, and fills."
        onBack={() => navigate("/brokers")}
      />
    );
  }

  const statusColor =
    connection.status === "active" ? "bg-bull"
    : connection.status === "error" ? "bg-bear"
    : "bg-text-disabled";

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4">
        <button
          onClick={() => navigate("/brokers")}
          className="flex w-fit items-center gap-1.5 font-mono text-[.65rem] uppercase tracking-widest text-text-muted transition-colors hover:text-text-primary"
        >
          <LuArrowLeft className="h-3.5 w-3.5" /> Back to Brokers
        </button>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border-subtle bg-bg-surface p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-accent-border bg-accent font-display text-2xl font-bold text-bg-base">
              {info.symbol}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-xl font-bold uppercase tracking-[.1em] text-text-primary">
                  {info.name}
                </h1>
                <span className="rounded-sm border border-border-subtle px-1.5 py-0.5 font-mono text-[.55rem] uppercase tracking-widest text-text-disabled">
                  {connection.environment}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 font-mono text-[.6rem] uppercase tracking-[.14em]">
                <span className={`h-1.5 w-1.5 rounded-full ${statusColor}`} />
                <span className="text-text-secondary">
                  {connection.display_name || connection.status}
                </span>
                <span className="text-text-disabled">· {cid.slice(0, 12)}…</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => testMut.mutate()}
              disabled={testMut.isPending}
              className="flex items-center gap-1.5 rounded-sm border border-border-default bg-bg-elevated px-3 py-2 font-mono text-[.68rem] uppercase tracking-widest text-text-secondary transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              {testMut.isPending ? <LuLoader className="h-3.5 w-3.5 animate-spin" /> : <LuRefreshCw className="h-3.5 w-3.5" />}
              Test
            </button>
            <button
              onClick={() => {
                if (confirm("Disconnect this broker? This cannot be undone.")) disconnect();
              }}
              disabled={isDisconnecting}
              className="flex items-center gap-1.5 rounded-sm border border-bear/40 bg-bear/10 px-3 py-2 font-mono text-[.68rem] font-bold uppercase tracking-widest text-bear transition-colors hover:bg-bear/20 disabled:opacity-50"
            >
              {isDisconnecting ? <LuLoader className="h-3.5 w-3.5 animate-spin" /> : <LuTrash2 className="h-3.5 w-3.5" />}
              Disconnect
            </button>
          </div>
        </div>
      </div>

      {/* ── Overview ── */}
      <Overview cid={cid} broker={broker} />

      {/* ── Activity table ── */}
      <ActivityTable cid={cid} broker={broker} />
    </div>
  );
}

// ── Empty / error state ─────────────────────────────────────────────────────

function EmptyState({ title, message, onBack }: { title: string; message: string; onBack: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-32 text-center">
      <h1 className="font-display text-lg font-bold uppercase tracking-[.1em] text-text-primary">{title}</h1>
      <p className="font-mono text-[.7rem] uppercase tracking-widest text-text-muted">{message}</p>
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 rounded-sm bg-accent px-4 py-2 font-mono text-[.7rem] font-bold uppercase tracking-widest text-bg-base transition-colors hover:bg-accent-hover"
      >
        <LuArrowLeft className="h-3.5 w-3.5" /> Back to Brokers
      </button>
    </div>
  );
}

// ── Overview ─────────────────────────────────────────────────────────────────

function Overview({ cid, broker }: { cid: string; broker: BrokerType }) {
  const api = useBrokerApi(broker);

  const { data: account, isLoading: loadingAcct } = useQuery({
    queryKey: accountKey(broker, cid),
    queryFn: () => api.getAccount(cid),
    staleTime: 30_000,
  });

  const { data: clock } = useQuery({
    queryKey: clockKey(broker, cid),
    queryFn: () => api.getClock(cid),
    staleTime: 60_000,
  });

  return (
    <section className="space-y-4">
      <SectionHeader label="Overview" />

      {clock && (
        <div className="flex flex-wrap items-center gap-2 rounded-sm border border-border-subtle bg-bg-elevated px-4 py-2.5">
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

      {loadingAcct ? (
        <div className="flex items-center justify-center py-10">
          <LuLoader className="h-5 w-5 animate-spin text-text-muted" />
        </div>
      ) : account ? (
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
      ) : (
        <p className="py-6 text-center font-mono text-[.7rem] text-text-muted">
          Could not load account data.
        </p>
      )}

      {broker === "tradier" && (
        <p className="font-mono text-[.6rem] leading-relaxed text-text-disabled">
          ⓘ Tradier portfolio history may return a single equity snapshot rather than a full historical curve.
        </p>
      )}
    </section>
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

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-border-subtle pb-2">
      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
      <h2 className="font-mono text-[.65rem] font-bold uppercase tracking-[.14em] text-text-secondary">
        {label}
      </h2>
    </div>
  );
}

// ── Activity Table (Positions / Orders / Fills) ───────────────────────────────

type View = "positions" | "orders" | "fills";

function ActivityTable({ cid, broker }: { cid: string; broker: BrokerType }) {
  const [view, setView] = useState<View>("positions");
  const [search, setSearch] = useState("");
  const [side, setSide] = useState<"all" | OrderSide>("all");
  const [orderStatus, setOrderStatus] = useState<"open" | "closed" | "all">("open");
  const [showSubmit, setShowSubmit] = useState(false);
  const qc = useQueryClient();

  const VIEWS: { id: View; label: string }[] = [
    { id: "positions", label: "Open Positions" },
    { id: "orders",    label: "Past Orders"    },
    { id: "fills",     label: "Fills"          },
  ];

  const activeQueryKey =
    view === "positions" ? positionsKey(broker, cid)
    : view === "orders"  ? ordersKey(broker, cid, orderStatus)
    : fillsKey(broker, cid);

  const isFetching = useIsFetching({ queryKey: activeQueryKey }) > 0;

  function handleRefresh() {
    qc.invalidateQueries({ queryKey: activeQueryKey });
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle pb-2">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          <h2 className="font-mono text-[.65rem] font-bold uppercase tracking-[.14em] text-text-secondary">
            Activity
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isFetching}
            title="Refresh"
            className="flex items-center gap-1.5 rounded-sm border border-border-default bg-bg-elevated px-3 py-1.5 font-mono text-[.68rem] uppercase tracking-widest text-text-secondary transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LuRefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowSubmit(true)}
            className="flex items-center gap-1.5 rounded-sm bg-accent px-3 py-1.5 font-mono text-[.68rem] font-bold uppercase tracking-widest text-bg-base transition-colors hover:bg-accent-hover"
          >
            <LuPlus className="h-3.5 w-3.5" />
            New Order
          </button>
        </div>
      </div>

      {/* View tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-sm border border-border-subtle bg-bg-elevated p-0.5">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`rounded-sm px-3 py-1.5 font-mono text-[.65rem] uppercase tracking-widest transition-colors ${
                view === v.id ? "bg-accent text-bg-base" : "text-text-muted hover:text-text-primary"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <LuSearch className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-disabled" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value.toUpperCase())}
            placeholder="Filter by symbol…"
            className="w-full rounded-sm border border-border-default bg-bg-elevated py-1.5 pl-8 pr-3 font-mono text-[.7rem] uppercase text-text-primary placeholder:text-text-disabled focus:border-accent focus:outline-none"
          />
        </div>

        {/* Side filter — for orders + fills */}
        {view !== "positions" && (
          <FilterPills
            value={side}
            options={["all", "buy", "sell"] as const}
            onChange={(v) => setSide(v as "all" | OrderSide)}
          />
        )}

        {/* Status filter — orders only */}
        {view === "orders" && (
          <FilterPills
            value={orderStatus}
            options={["open", "closed", "all"] as const}
            onChange={(v) => setOrderStatus(v as "open" | "closed" | "all")}
          />
        )}

        {search && (
          <button
            onClick={() => setSearch("")}
            className="flex items-center gap-1 rounded-sm border border-border-default px-2 py-1.5 font-mono text-[.62rem] uppercase tracking-widest text-text-muted transition-colors hover:text-text-primary"
          >
            <LuX className="h-3 w-3" /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border-subtle bg-bg-surface p-4">
        {view === "positions" && <PositionsTable cid={cid} broker={broker} search={search} />}
        {view === "orders"    && <OrdersTable    cid={cid} broker={broker} search={search} side={side} status={orderStatus} />}
        {view === "fills"     && <FillsTable     cid={cid} broker={broker} search={search} side={side} />}
      </div>

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
    </section>
  );
}

function FilterPills<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1 rounded-sm border border-border-subtle bg-bg-elevated p-0.5">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`rounded-sm px-3 py-1 font-mono text-[.62rem] uppercase tracking-widest transition-colors ${
            value === o ? "bg-accent text-bg-base" : "text-text-muted hover:text-text-primary"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function TableEmpty({ label }: { label: string }) {
  return (
    <p className="py-8 text-center font-mono text-[.7rem] uppercase tracking-widest text-text-muted">
      {label}
    </p>
  );
}

function TableLoader() {
  return (
    <div className="flex items-center justify-center py-10">
      <LuLoader className="h-5 w-5 animate-spin text-text-muted" />
    </div>
  );
}

const PAGE_SIZE = 20;

function Pagination({
  page,
  total,
  onPage,
}: {
  page: number;
  total: number;
  onPage: (p: number) => void;
}) {
  const pages = Math.ceil(total / PAGE_SIZE);
  if (pages <= 1) return null;
  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="mt-4 flex items-center justify-between border-t border-border-subtle pt-3">
      <span className="font-mono text-[.6rem] uppercase tracking-widest text-text-disabled">
        {start}–{end} of {total}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          className="flex items-center gap-1 rounded-sm border border-border-default px-2 py-1 font-mono text-[.62rem] uppercase tracking-widest text-text-muted transition-colors hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-30"
        >
          <LuChevronLeft className="h-3 w-3" /> Prev
        </button>
        <span className="px-2 font-mono text-[.62rem] uppercase tracking-widest text-text-secondary">
          {page} / {pages}
        </span>
        <button
          onClick={() => onPage(page + 1)}
          disabled={page === pages}
          className="flex items-center gap-1 rounded-sm border border-border-default px-2 py-1 font-mono text-[.62rem] uppercase tracking-widest text-text-muted transition-colors hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-30"
        >
          Next <LuChevronRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ── Positions ──────────────────────────────────────────────────────────────

function PositionsTable({ cid, broker, search }: { cid: string; broker: BrokerType; search: string }) {
  const api = useBrokerApi(broker);
  const [page, setPage] = useState(1);

  const { data: positions = [], isLoading } = useQuery({
    queryKey: positionsKey(broker, cid),
    queryFn: () => api.getPositions(cid),
    staleTime: 30_000,
  });

  const rows = useMemo(
    () => positions.filter((p) => !search || p.symbol.toUpperCase().includes(search)),
    [positions, search],
  );

  useEffect(() => { setPage(1); }, [search]);

  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (isLoading) return <TableLoader />;
  if (rows.length === 0) return <TableEmpty label={search ? "No matching positions" : "No open positions"} />;

  return (
    <div>
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
            {pageRows.map((pos) => {
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
      <Pagination page={page} total={rows.length} onPage={setPage} />
    </div>
  );
}

// ── Orders ───────────────────────────────────────────────────────────────────

function OrdersTable({
  cid,
  broker,
  search,
  side,
  status,
}: {
  cid: string;
  broker: BrokerType;
  search: string;
  side: "all" | OrderSide;
  status: "open" | "closed" | "all";
}) {
  const api = useBrokerApi(broker);
  const qc = useQueryClient();
  const [page, setPage] = useState(1);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ordersKey(broker, cid, status),
    queryFn: () => api.listOrders(cid, { status, limit: 100 }),
    staleTime: 15_000,
  });

  const cancelMut = useMutation({
    mutationFn: (orderId: string) => api.cancelOrder(cid, orderId),
    onSuccess: () => {
      toast.success("Order cancelled.");
      qc.invalidateQueries({ queryKey: ordersKey(broker, cid, status) });
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

  const rows = useMemo(
    () =>
      orders.filter((o) => {
        if (search && !(o.symbol ?? "").toUpperCase().includes(search)) return false;
        if (side !== "all" && normSide(o.side) !== side) return false;
        return true;
      }),
    [orders, search, side],
  );

  useEffect(() => { setPage(1); }, [search, side, status]);

  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (isLoading) return <TableLoader />;
  if (rows.length === 0) return <TableEmpty label={`No ${status} orders`} />;

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border-subtle">
              {["Symbol", "Side", "Type", "Qty", "Limit", "Stop", "Status", ""].map((h) => (
                <th key={h} className="pb-2 pr-4 font-mono text-[.6rem] uppercase tracking-widest text-text-muted">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((order) => (
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
      <Pagination page={page} total={rows.length} onPage={setPage} />
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
  const OPEN_STATUSES = new Set(["new", "accepted", "pending_new", "partially_filled", "submitted", "open", "held"]);
  const canCancel = OPEN_STATUSES.has((order.status ?? "").toLowerCase());

  return (
    <tr className="border-b border-border-subtle last:border-0">
      <td className="py-2.5 pr-4 font-display text-sm font-bold uppercase tracking-wider text-text-primary">
        {order.symbol ?? "—"}
      </td>
      <td className={`py-2.5 pr-4 font-mono text-sm font-bold ${normSide(order.side) === "buy" ? "text-bull" : "text-bear"}`}>
        {normEnum(order.side)}
      </td>
      <td className="py-2.5 pr-4 font-mono text-[.68rem] uppercase tracking-widest text-text-secondary">
        {normEnum(order.order_type)}
      </td>
      <td className="py-2.5 pr-4 font-mono text-sm text-text-secondary">{order.qty ?? order.notional ?? "—"}</td>
      <td className="py-2.5 pr-4 font-mono text-sm text-text-secondary">
        {order.limit_price ? `$${order.limit_price}` : "—"}
      </td>
      <td className="py-2.5 pr-4 font-mono text-sm text-text-secondary">
        {order.stop_price ? `$${order.stop_price}` : "—"}
      </td>
      <td className={`py-2.5 pr-4 font-mono text-[.62rem] uppercase tracking-widest ${statusColor(order.status)}`}>
        {order.status}
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

// ── Fills ──────────────────────────────────────────────────────────────────

function FillsTable({
  cid,
  broker,
  search,
  side,
}: {
  cid: string;
  broker: BrokerType;
  search: string;
  side: "all" | OrderSide;
}) {
  const api = useBrokerApi(broker);
  const [page, setPage] = useState(1);

  const { data: fills = [], isLoading } = useQuery({
    queryKey: fillsKey(broker, cid),
    queryFn: () => api.getFills(cid, { limit: 100 }),
    staleTime: 30_000,
  });

  const rows = useMemo(
    () =>
      fills.filter((f) => {
        if (search && !f.symbol.toUpperCase().includes(search)) return false;
        if (side !== "all" && normSide(f.side) !== side) return false;
        return true;
      }),
    [fills, search, side],
  );

  useEffect(() => { setPage(1); }, [search, side]);

  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (isLoading) return <TableLoader />;
  if (rows.length === 0) return <TableEmpty label={search || side !== "all" ? "No matching fills" : "No fills yet"} />;

  return (
    <div>
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
            {pageRows.map((fill) => (
              <tr key={fill.broker_fill_id} className="border-b border-border-subtle last:border-0">
                <td className="py-2.5 pr-4 font-display text-sm font-bold uppercase tracking-wider text-text-primary">
                  {fill.symbol}
                </td>
                <td className={`py-2.5 pr-4 font-mono text-sm font-bold ${normSide(fill.side) === "buy" ? "text-bull" : "text-bear"}`}>
                  {normEnum(fill.side)}
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
      <Pagination page={page} total={rows.length} onPage={setPage} />
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
