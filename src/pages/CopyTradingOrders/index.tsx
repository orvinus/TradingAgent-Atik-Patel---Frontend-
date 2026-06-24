// src/pages/CopyTradingOrders/index.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LuArrowLeft, LuChevronLeft, LuChevronRight, LuLoader, LuRefreshCw, LuTriangleAlert } from "react-icons/lu";
import axios from "axios";
import { copyOrdersApi } from "@/api/endpoints/copyOrders";
import { qk } from "@/api/queryKeys";
import { ROUTES } from "@/constants/routes";
import { toast } from "@/components/ui/Toast";
import { InstrumentBadge } from "@/components/copy-trading/InstrumentBadge";
import { EntryTypeBadge } from "@/components/copy-trading/EntryTypeBadge";
import { formatSizeLabel, mapErrorCode } from "@/utils/copyTradingFormatters";
import type {
  CopyOrder,
  CopyOrderStatus,
  OrderBrokerConnection,
  OrderExecutionMode,
  OrderSettings,
  SizingConfig,
  SizingMode,
} from "@/types/copyValidator";
import ConfirmOrderModal from "./ConfirmOrderModal";

function apiErr(err: unknown): string {
  if (axios.isAxiosError(err)) return err.response?.data?.message ?? err.response?.data?.code ?? "Something went wrong.";
  return "Something went wrong.";
}

const selectCls =
  "rounded-sm border border-border-default bg-bg-base px-2.5 py-1.5 font-mono text-[.68rem] text-text-primary outline-none focus:border-accent disabled:opacity-50";
const inputCls =
  "w-28 rounded-sm border border-border-default bg-bg-base px-2 py-1 font-mono text-[.68rem] text-text-primary outline-none focus:border-accent disabled:opacity-50";

const STATUS_FILTERS: { value: CopyOrderStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending_confirmation", label: "Pending" },
  { value: "submitted", label: "Submitted" },
  { value: "filled", label: "Filled" },
  { value: "rejected", label: "Rejected" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_STYLE: Record<CopyOrderStatus, string> = {
  pending_confirmation: "border-warning/40 bg-warning/10 text-warning",
  submitted: "border-info/40 bg-info/10 text-info",
  filled: "border-bull/40 bg-bull/10 text-bull",
  rejected: "border-bear/40 bg-bear/10 text-bear",
  failed: "border-bear/40 bg-bear/10 text-bear",
  cancelled: "border-border-default text-text-muted",
};

const SIZING_MODE_LABELS: Record<SizingMode, string> = {
  fixed_qty: "Fixed quantity (use signal / validator defaults)",
  notional_usd: "Dollar notional ($)",
  pct_equity: "% of account equity",
};

function SizingSection({
  label,
  color,
  mode,
  notional,
  pct,
  onMode,
  onNotional,
  onPct,
  disabled,
}: {
  label: string;
  color: string;
  mode: SizingMode;
  notional: string;
  pct: string;
  onMode: (m: SizingMode) => void;
  onNotional: (v: string) => void;
  onPct: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${color}`} />
        <span className="font-mono text-[.68rem] font-bold text-text-primary">{label}</span>
      </div>
      <label className="flex flex-col gap-1">
        <span className="font-mono text-[.58rem] uppercase tracking-[.14em] text-text-disabled">Sizing mode</span>
        <select value={mode} onChange={(e) => onMode(e.target.value as SizingMode)} disabled={disabled} className={selectCls}>
          {(["fixed_qty", "notional_usd", "pct_equity"] as SizingMode[]).map((m) => (
            <option key={m} value={m}>{SIZING_MODE_LABELS[m]}</option>
          ))}
        </select>
      </label>
      {mode === "notional_usd" && (
        <div className="flex items-center gap-2 ml-3">
          <span className="font-mono text-[.62rem] text-text-muted">$ Notional</span>
          <input type="number" min={1} value={notional} onChange={(e) => onNotional(e.target.value)} disabled={disabled} placeholder="1000" className={inputCls} />
        </div>
      )}
      {mode === "pct_equity" && (
        <div className="flex items-center gap-2 ml-3">
          <span className="font-mono text-[.62rem] text-text-muted">% of equity</span>
          <input type="number" min={0.1} max={100} step={0.1} value={pct} onChange={(e) => onPct(e.target.value)} disabled={disabled} placeholder="2" className={inputCls} />
          <span className="font-mono text-[.62rem] text-text-muted">%</span>
        </div>
      )}
      {mode === "fixed_qty" && (
        <p className="ml-3 font-mono text-[.6rem] text-text-muted">
          Uses the quantity from the signal, validator rules, or missing-field defaults.
        </p>
      )}
    </div>
  );
}

export default function CopyTradingOrders() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<CopyOrderStatus | "all">("all");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const settingsQuery = useQuery({ queryKey: qk.copyOrdersSettings(), queryFn: copyOrdersApi.getSettings });
  const brokersQuery = useQuery({ queryKey: qk.copyOrdersBrokers(), queryFn: copyOrdersApi.listBrokers });

  const [settings, setSettings] = useState<OrderSettings>({
    broker: "",
    brokerConnectionId: null,
    orderExecutionMode: "manual_confirm",
  });

  // Sizing config local state
  const [sizing, setSizing] = useState<{
    equityMode: SizingMode; equityNotional: string; equityPct: string;
    optionsMode: SizingMode; optionsNotional: string; optionsPct: string;
  }>({
    equityMode: "fixed_qty", equityNotional: "", equityPct: "",
    optionsMode: "fixed_qty", optionsNotional: "", optionsPct: "",
  });

  const brokers = brokersQuery.data ?? [];
  const selectedBroker = brokers.find((b) => b.id === settings.broker);
  const connections = selectedBroker?.connections ?? [];
  const selectedConnection: OrderBrokerConnection | undefined = connections.find(
    (c) => c.id === settings.brokerConnectionId,
  );
  const optionsEnabled = selectedConnection?.optionsEnabled;

  useEffect(() => {
    if (settingsQuery.data) {
      setSettings(settingsQuery.data);
      const sc = settingsQuery.data.metadata?.sizingConfig;
      if (sc) {
        setSizing({
          equityMode: sc.equitySizingMode ?? "fixed_qty",
          equityNotional: sc.equityNotionalUsd != null ? String(sc.equityNotionalUsd) : "",
          equityPct: sc.equityPctOfEquity != null ? String(sc.equityPctOfEquity) : "",
          optionsMode: sc.optionsSizingMode ?? "fixed_qty",
          optionsNotional: sc.optionsNotionalUsd != null ? String(sc.optionsNotionalUsd) : "",
          optionsPct: sc.optionsPctOfEquity != null ? String(sc.optionsPctOfEquity) : "",
        });
      }
    }
  }, [settingsQuery.data]);

  useEffect(() => {
    if (!settings.broker && brokers.length) {
      const first = brokers.find((b) => b.available) ?? brokers[0];
      if (first) setSettings((s) => ({ ...s, broker: first.id }));
    }
  }, [brokers, settings.broker]);

  const saveMut = useMutation({
    mutationFn: (body: Partial<OrderSettings>) => copyOrdersApi.updateSettings(body),
    onSuccess: (saved) => {
      toast.success("Order settings saved");
      qc.setQueryData(qk.copyOrdersSettings(), saved);
    },
    onError: (e) => toast.error(apiErr(e)),
  });

  const onSave = () => {
    const equityNotional = sizing.equityNotional ? Number(sizing.equityNotional) : undefined;
    const equityPct = sizing.equityPct ? Number(sizing.equityPct) : undefined;
    const optionsNotional = sizing.optionsNotional ? Number(sizing.optionsNotional) : undefined;
    const optionsPct = sizing.optionsPct ? Number(sizing.optionsPct) : undefined;
    const sizingConfig: SizingConfig = { equitySizingMode: sizing.equityMode, optionsSizingMode: sizing.optionsMode };
    if (equityNotional != null) sizingConfig.equityNotionalUsd = equityNotional;
    if (equityPct != null) sizingConfig.equityPctOfEquity = equityPct;
    if (optionsNotional != null) sizingConfig.optionsNotionalUsd = optionsNotional;
    if (optionsPct != null) sizingConfig.optionsPctOfEquity = optionsPct;
    saveMut.mutate({
      broker: settings.broker,
      brokerConnectionId: settings.brokerConnectionId,
      orderExecutionMode: settings.orderExecutionMode,
      metadata: { sizingConfig },
    });
  };

  const [page, setPage] = useState(1);

  const ordersQuery = useQuery({
    queryKey: qk.copyOrdersList(statusFilter),
    queryFn: () => copyOrdersApi.list(statusFilter === "all" ? undefined : { status: statusFilter }),
    refetchInterval: 10000,
  });

  const orders = ordersQuery.data ?? [];

  useEffect(() => { setPage(1); }, [statusFilter]);

  const PAGE_SIZE = 20;
  const pageOrders = orders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <button
          onClick={() => navigate(ROUTES.COPY_TRADING)}
          className="mb-3 flex w-fit items-center gap-1.5 font-mono text-[.65rem] text-text-muted transition-colors hover:text-text-secondary"
        >
          <LuArrowLeft className="h-3 w-3" /> Copy Trading
        </button>
        <h1 className="font-display text-xl font-bold uppercase tracking-[.12em] text-text-primary">Order Settings</h1>
        <p className="mt-1 font-mono text-[.7rem] text-text-muted">
          Choose where valid signals are placed, whether they need confirmation, and how to size positions.
        </p>
      </div>

      {/* Settings card */}
      <div className="rounded-lg border border-border-subtle bg-bg-surface p-5 shadow-card">
        {settingsQuery.isLoading ? (
          <div className="flex items-center gap-2 font-mono text-[.65rem] text-text-muted">
            <LuLoader className="h-3.5 w-3.5 animate-spin" /> Loading settings…
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Broker + Connection */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="font-mono text-[.58rem] uppercase tracking-[.18em] text-text-disabled">Broker</span>
                <select
                  value={settings.broker}
                  onChange={(e) => setSettings({ ...settings, broker: e.target.value, brokerConnectionId: null })}
                  disabled={brokersQuery.isLoading}
                  className={selectCls}
                >
                  <option value="">{brokersQuery.isLoading ? "Loading…" : "Select a broker…"}</option>
                  {brokers.map((b) => (
                    <option key={b.id} value={b.id} disabled={!b.available}>{b.name}</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="font-mono text-[.58rem] uppercase tracking-[.18em] text-text-disabled">Connection</span>
                <select
                  value={settings.brokerConnectionId ?? ""}
                  onChange={(e) => setSettings({ ...settings, brokerConnectionId: e.target.value || null })}
                  disabled={brokersQuery.isLoading || !settings.broker || connections.length === 0}
                  className={selectCls}
                >
                  <option value="">
                    {brokersQuery.isLoading ? "Loading…" : !settings.broker ? "Select a broker first…" : connections.length === 0 ? "No connections available" : "Select a connection…"}
                  </option>
                  {connections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.display_name ?? c.account_id ?? c.id}
                      {c.environment ? ` (${c.environment})` : ""}
                      {c.optionsEnabled === true ? " ✓ Options" : c.optionsEnabled === false ? " ✗ No options" : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* Options not enabled warning */}
            {optionsEnabled === false && (
              <div className="flex items-start gap-2.5 rounded-sm border border-warning/40 bg-warning/10 px-3 py-2.5">
                <LuTriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <div>
                  <p className="font-mono text-[.65rem] font-bold text-warning">Options trading not enabled on this connection</p>
                  <p className="mt-0.5 font-mono text-[.6rem] text-text-muted">
                    Enable options trading on your Alpaca account to copy options signals. Options signals will be blocked at confirm.
                  </p>
                </div>
              </div>
            )}
            {optionsEnabled === true && (
              <div className="flex items-center gap-2 rounded-sm border border-bull/30 bg-bull/5 px-3 py-2">
                <span className="font-mono text-[.63rem] text-bull">✓ Options trading enabled on this connection</span>
              </div>
            )}

            {/* Execution mode */}
            <fieldset>
              <legend className="mb-2 font-mono text-[.58rem] uppercase tracking-[.18em] text-text-disabled">
                When a valid signal arrives
              </legend>
              <div className="flex flex-col gap-2">
                <ExecRadio
                  checked={settings.orderExecutionMode === "auto"}
                  onSelect={() => setSettings({ ...settings, orderExecutionMode: "auto" as OrderExecutionMode })}
                  label="Auto order"
                  hint="Submit to broker immediately."
                />
                <ExecRadio
                  checked={settings.orderExecutionMode === "manual_confirm"}
                  onSelect={() => setSettings({ ...settings, orderExecutionMode: "manual_confirm" as OrderExecutionMode })}
                  label="Manual confirm"
                  hint="Show me details first — I click to confirm."
                />
              </div>
            </fieldset>

            {/* Position sizing */}
            <div className="rounded-sm border border-border-subtle bg-bg-elevated p-4">
              <h3 className="mb-4 font-mono text-[.65rem] font-bold uppercase tracking-[.14em] text-text-secondary">
                Position sizing
              </h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <SizingSection
                  label="Equity & Crypto"
                  color="bg-blue-400"
                  mode={sizing.equityMode}
                  notional={sizing.equityNotional}
                  pct={sizing.equityPct}
                  onMode={(m) => setSizing({ ...sizing, equityMode: m })}
                  onNotional={(v) => setSizing({ ...sizing, equityNotional: v })}
                  onPct={(v) => setSizing({ ...sizing, equityPct: v })}
                  disabled={saveMut.isPending}
                />
                <SizingSection
                  label="Options"
                  color="bg-purple-400"
                  mode={sizing.optionsMode}
                  notional={sizing.optionsNotional}
                  pct={sizing.optionsPct}
                  onMode={(m) => setSizing({ ...sizing, optionsMode: m })}
                  onNotional={(v) => setSizing({ ...sizing, optionsNotional: v })}
                  onPct={(v) => setSizing({ ...sizing, optionsPct: v })}
                  disabled={saveMut.isPending}
                />
              </div>
              <p className="mt-3 font-mono text-[.58rem] text-text-muted">
                Sizing is used when signal has no contract count / quantity, or as an override. Fixed qty falls back to validator / missing-field defaults.
              </p>
            </div>

            <div className="flex justify-end">
              <button
                onClick={onSave}
                disabled={saveMut.isPending}
                className="inline-flex items-center gap-2 rounded-sm bg-accent px-5 py-2.5 font-mono text-[.68rem] font-bold uppercase tracking-widest text-bg-base transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saveMut.isPending && <LuLoader className="h-3.5 w-3.5 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Order history */}
      <div className="rounded-lg border border-border-subtle bg-bg-surface p-5 shadow-card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display font-bold text-text-primary">Orders</h2>
          <div className="flex items-center gap-2">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as CopyOrderStatus | "all")} className={selectCls}>
              {STATUS_FILTERS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <button
              onClick={() => ordersQuery.refetch()}
              className="inline-flex items-center gap-1.5 rounded-sm border border-border-default px-2.5 py-1.5 font-mono text-[.6rem] uppercase tracking-widest text-text-secondary hover:border-accent hover:text-accent"
            >
              <LuRefreshCw className={`h-3 w-3 ${ordersQuery.isFetching ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>
        </div>

        {ordersQuery.isLoading ? (
          <div className="flex items-center gap-2 font-mono text-[.65rem] text-text-muted">
            <LuLoader className="h-3.5 w-3.5 animate-spin" /> Loading orders…
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-sm border border-border-subtle bg-bg-elevated px-3 py-3 font-mono text-[.63rem] text-text-muted">
            No orders yet.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border-subtle text-left">
                    {["Time", "Type", "Instrument", "Side", "Size", "Entry", "SL", "Status", "Notes", ""].map((h) => (
                      <th key={h} className="px-3 py-2 font-mono text-[.54rem] uppercase tracking-[.14em] text-text-muted whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageOrders.map((o) => <OrderRow key={o.id} order={o} onConfirm={() => setConfirmId(o.id)} />)}
                </tbody>
              </table>
            </div>
            {Math.ceil(orders.length / PAGE_SIZE) > 1 && (
              <div className="mt-4 flex items-center justify-between border-t border-border-subtle pt-3">
                <span className="font-mono text-[.6rem] uppercase tracking-widest text-text-disabled">
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, orders.length)} of {orders.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => p - 1)}
                    disabled={page === 1}
                    className="flex items-center gap-1 rounded-sm border border-border-default px-2 py-1 font-mono text-[.62rem] uppercase tracking-widest text-text-muted transition-colors hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <LuChevronLeft className="h-3 w-3" /> Prev
                  </button>
                  <span className="px-2 font-mono text-[.62rem] uppercase tracking-widest text-text-secondary">
                    {page} / {Math.ceil(orders.length / PAGE_SIZE)}
                  </span>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page === Math.ceil(orders.length / PAGE_SIZE)}
                    className="flex items-center gap-1 rounded-sm border border-border-default px-2 py-1 font-mono text-[.62rem] uppercase tracking-widest text-text-muted transition-colors hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    Next <LuChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {confirmId && <ConfirmOrderModal orderId={confirmId} onClose={() => setConfirmId(null)} />}
    </div>
  );
}

function OrderRow({ order, onConfirm }: { order: CopyOrder; onConfirm: () => void }) {
  const pending = order.status === "pending_confirmation";
  const p = order.orderPreview;
  const side = p?.side ?? "";
  const profile = p?.instrumentProfile;
  const isOptions = profile === "options";

  // Instrument display
  const instrumentText = isOptions
    ? [p?.underlying_symbol ?? p?.symbol, p?.strike ? `$${p.strike}` : null, p?.option_type ? (p.option_type === "call" ? "C" : "P") : null].filter(Boolean).join(" ")
    : p?.symbol ?? "—";

  const notes = order.errorMessage
    ? mapErrorCode(order.errorCode, order.errorMessage)
    : order.brokerOrderId
      ? `#${order.brokerOrderId.slice(0, 8)}`
      : p?.summary ?? "—";

  return (
    <tr className="border-b border-border-subtle last:border-0 hover:bg-bg-elevated/40">
      <td className="whitespace-nowrap px-3 py-2 font-mono text-[.62rem] text-text-muted">
        {new Date(order.createdAt).toLocaleString()}
      </td>
      <td className="px-3 py-2">
        <InstrumentBadge profile={profile ?? "equity"} />
      </td>
      <td className="px-3 py-2 font-mono text-[.66rem] font-bold text-text-primary whitespace-nowrap">{instrumentText}</td>
      <td className="px-3 py-2">
        <span className={`font-mono text-[.64rem] font-bold ${side === "buy" ? "text-bull" : side === "sell" ? "text-bear" : "text-text-muted"}`}>
          {side ? side.toUpperCase() : "—"}
        </span>
      </td>
      <td className="px-3 py-2 font-mono text-[.63rem] text-text-secondary whitespace-nowrap">
        {formatSizeLabel(p?.qty ?? p?.lot_size, p?.size_unit)}
      </td>
      <td className="px-3 py-2">
        <div className="flex flex-col gap-0.5">
          <EntryTypeBadge
            orderType={p?.order_type}
            limitPrice={p?.limit_price}
            entryDisplay={p?.entry_display}
            priceBasis={p?.price_basis}
            profile={profile}
          />
          {p?.slippage?.enabled && p.signal_limit_price != null && p.limit_price != null && p.limit_price !== p.signal_limit_price && (
            <span className="font-mono text-[.54rem] text-text-muted">
              sig ${p.signal_limit_price} +{p.slippage.maxPct != null ? `${p.slippage.maxPct}%` : "slip"}
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-2 font-mono text-[.63rem] text-bear">
        {p?.sl_price != null ? `$${p.sl_price}` : "—"}
      </td>
      <td className="px-3 py-2">
        <span className={`rounded-sm border px-2 py-0.5 font-mono text-[.52rem] uppercase tracking-widest ${STATUS_STYLE[order.status] ?? "text-text-muted"}`}>
          {order.status.replace(/_/g, " ")}
        </span>
      </td>
      <td className={`max-w-[14rem] truncate px-3 py-2 font-mono text-[.61rem] ${order.errorMessage ? "text-bear" : "text-text-muted"}`} title={notes}>
        {notes}
      </td>
      <td className="px-3 py-2 text-right">
        <button
          onClick={onConfirm}
          className="rounded-sm border border-border-default px-2.5 py-1 font-mono text-[.56rem] uppercase tracking-widest text-text-secondary transition-colors hover:border-accent hover:text-accent"
        >
          {pending ? "Confirm" : "View"}
        </button>
      </td>
    </tr>
  );
}

function ExecRadio({ checked, onSelect, label, hint }: { checked: boolean; onSelect: () => void; label: string; hint: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <input type="radio" checked={checked} onChange={onSelect} className="mt-0.5 h-3.5 w-3.5 accent-[var(--color-accent)]" />
      <span>
        <span className="font-mono text-[.72rem] font-bold text-text-primary">{label}</span>
        <span className="ml-2 font-mono text-[.62rem] text-text-muted">{hint}</span>
      </span>
    </label>
  );
}
