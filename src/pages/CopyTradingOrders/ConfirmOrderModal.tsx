// src/pages/CopyTradingOrders/ConfirmOrderModal.tsx
// Router: loads the order and delegates to EquityOrderConfirmModal or
// OptionsOrderConfirmModal based on orderPreview.instrumentProfile.
import { useQuery } from "@tanstack/react-query";
import { LuLoader } from "react-icons/lu";
import { copyOrdersApi } from "@/api/endpoints/copyOrders";
import { qk } from "@/api/queryKeys";
import EquityOrderConfirmModal from "./EquityOrderConfirmModal";
import OptionsOrderConfirmModal from "./OptionsOrderConfirmModal";

export default function ConfirmOrderModal({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const orderQuery = useQuery({
    queryKey: qk.copyOrder(orderId),
    queryFn: () => copyOrdersApi.get(orderId),
  });

  const order = orderQuery.data;

  if (orderQuery.isLoading) {
    return (
      <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/60">
        <div className="flex items-center gap-2 rounded-lg border border-border-default bg-bg-surface px-5 py-4 shadow-card">
          <LuLoader className="h-4 w-4 animate-spin text-accent" />
          <span className="font-mono text-[.68rem] text-text-muted">Loading order…</span>
        </div>
      </div>
    );
  }

  if (orderQuery.isError || !order) {
    return (
      <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/60" onClick={onClose}>
        <div className="rounded-lg border border-bear/30 bg-bg-surface px-5 py-4 shadow-card" onClick={(e) => e.stopPropagation()}>
          <p className="font-mono text-[.65rem] text-bear">Couldn't load this order.</p>
          <button onClick={onClose} className="mt-2 font-mono text-[.62rem] text-text-muted hover:text-text-secondary underline">Close</button>
        </div>
      </div>
    );
  }

  const profile = order.orderPreview?.instrumentProfile;

  if (profile === "options") {
    return <OptionsOrderConfirmModal order={order} onClose={onClose} />;
  }

  // equity, crypto, unsupported, or null — use equity modal
  return <EquityOrderConfirmModal order={order} onClose={onClose} />;
}
