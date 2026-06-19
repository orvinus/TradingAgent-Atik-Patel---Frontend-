// src/pages/CopyTradingOrders/index.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LuArrowLeft, LuLoader, LuRefreshCw } from "react-icons/lu";
import axios from "axios";
import { copyOrdersApi } from "@/api/endpoints/copyOrders";
import { qk } from "@/api/queryKeys";
import { ROUTES } from "@/constants/routes";
import { toast } from "@/components/ui/Toast";
import type { CopyOrder, CopyOrderStatus, OrderExecutionMode, OrderSettings } from "@/types/copyValidator";
import ConfirmOrderModal from "./ConfirmOrderModal";

function apiErr(err: unknown): string {
  if (axios.isAxiosError(err)) return err.response?.data?.message ?? err.response?.data?.code ?? "Something went wrong.";
  return "Something went wrong.";
}

const selectCls =
  "rounded-sm border border-border-default bg-bg-base px-2.5 py-1.5 font-mono text-[.68rem] text-text-primary outline-none focus:border-accent disabled:opacity-50";

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

export default function CopyTradingOrders() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<CopyOrderStatus | "all">("all");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  // ── Settings ───────────────────────────────────────────────────────────────
  const settingsQuery = useQuery({ queryKey: qk.copyOrdersSettings(), queryFn: copyOrdersApi.getSettings });
  const brokersQuery = useQuery({ queryKey: qk.copyOrdersBrokers(), queryFn: copyOrdersApi.listBrokers });

  const [settings, setSettings] = useState<OrderSettings>({
    broker: "alpaca",
    brokerConnectionId: null,
    orderExecutionMode: "manual_confirm",
  });

  useEffect(() => {
    if (settingsQuery.data) setSettings(settingsQuery.data);
  }, [settingsQuery.data]);

  const saveMut = useMutation({
    mutationFn: (body: Partial<OrderSettings>) => copyOrdersApi.updateSettings(body),
    onSuccess: (saved) => {
      toast.success("Order settings saved");
      qc.setQueryData(qk.copyOrdersSettings(), saved);
    },
    onError: (e) => toast.error(apiErr(e)),
  });

  // ── Orders ───────────────────────────────────────────────────────────────
  const ordersQuery = useQuery({
    queryKey: qk.copyOrdersList(statusFilter),
    queryFn: () => copyOrdersApi.list(statusFilter === "all" ? undefined : { status: statusFilter }),
    refetchInterval: 10000, // surface new pending_confirmation orders
  });

  const orders = ordersQuery.data ?? [];

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
          Choose where valid signals are placed and whether they need your confirmation.
        </p>
      </div>

      {/* Settings card */}
      <div className="rounded-lg border border-border-subtle bg-bg-surface p-5 shadow-card">
        {settingsQuery.isLoading ? (
          <div className="flex items-center gap-2 font-mono text-[.65rem] text-text-muted">
            <LuLoader className="h-3.5 w-3.5 animate-spin" /> Loading settings…
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="font-mono text-[.58rem] uppercase tracking-[.18em] text-text-disabled">Broker</span>
                <select
                  value={settings.broker}
                  onChange={(e) => setSettings({ ...settings, broker: e.target.value as "alpaca" })}
                  className={selectCls}
                >
                  <option value="alpaca">Alpaca</option>
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="font-mono text-[.58rem] uppercase tracking-[.18em] text-text-disabled">Connection</span>
                <select
                  value={settings.brokerConnectionId ?? ""}
                  onChange={(e) => setSettings({ ...settings, brokerConnectionId: e.target.value || null })}
                  disabled={brokersQuery.isLoading}
                  className={selectCls}
                >
                  <option value="">
                    {brokersQuery.isLoading ? "Loading connections…" : "Select a connection…"}
                  </option>
                  {(brokersQuery.data ?? []).map((b) => (
                    <option key={b.brokerConnectionId} value={b.brokerConnectionId}>
                      {b.displayName}
                      {b.environment ? ` (${b.environment})` : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>

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

            <div className="flex justify-end">
              <button
                onClick={() => saveMut.mutate(settings)}
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
              {STATUS_FILTERS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
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
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border-subtle text-left">
                  {["Time", "Symbol", "Side", "Status", "Summary", ""].map((h) => (
                    <th key={h} className="px-3 py-2 font-mono text-[.54rem] uppercase tracking-[.14em] text-text-muted">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <OrderRow key={o.id} order={o} onConfirm={() => setConfirmId(o.id)} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {confirmId && <ConfirmOrderModal orderId={confirmId} onClose={() => setConfirmId(null)} />}
    </div>
  );
}

function OrderRow({ order, onConfirm }: { order: CopyOrder; onConfirm: () => void }) {
  const pending = order.status === "pending_confirmation";
  return (
    <tr className="border-b border-border-subtle last:border-0">
      <td className="px-3 py-2 font-mono text-[.62rem] text-text-muted">{new Date(order.createdAt).toLocaleString()}</td>
      <td className="px-3 py-2 font-mono text-[.66rem] text-text-primary">{order.symbol}</td>
      <td className="px-3 py-2 font-mono text-[.64rem] text-text-secondary">{(order.side ?? "").toUpperCase()}</td>
      <td className="px-3 py-2">
        <span className={`rounded-sm border px-2 py-0.5 font-mono text-[.52rem] uppercase tracking-widest ${STATUS_STYLE[order.status] ?? "text-text-muted"}`}>
          {order.status.replace(/_/g, " ")}
        </span>
      </td>
      <td className="px-3 py-2 font-mono text-[.62rem] text-text-muted">{order.summary ?? "—"}</td>
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

function ExecRadio({
  checked,
  onSelect,
  label,
  hint,
}: {
  checked: boolean;
  onSelect: () => void;
  label: string;
  hint: string;
}) {
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
