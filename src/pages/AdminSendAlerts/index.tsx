import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { LuLoader, LuSend, LuLock, LuTriangleAlert, LuCheck } from "react-icons/lu";
import { notificationsApi } from "@/api/endpoints/notifications";
import { useHasAnyPermission } from "@/hooks/usePermissions";
import { toast } from "@/components/ui/Toast";
import type {
  NotificationKind,
  NotificationChannel,
  DispatchResponse,
  DeliveryStatus,
} from "@/types/notifications";

type Audience = "broadcast" | "user";

const KIND_OPTIONS: NotificationKind[] = ["general", "alert", "trade", "system"];
const CHANNEL_OPTIONS: NotificationChannel[] = ["platform", "telegram", "discord"];

function getTextLimit(channels: NotificationChannel[]): number {
  if (channels.includes("discord") && channels.length === 1) return 2000;
  return 4096;
}

const DELIVERY_COLORS: Record<DeliveryStatus, string> = {
  sent:    "text-bull",
  failed:  "text-bear",
  skipped: "text-text-muted",
  pending: "text-text-disabled",
};

function DeliveryResult({ result }: { result: DispatchResponse }) {
  const entries = Object.entries(result.deliveries) as [NotificationChannel, { status: DeliveryStatus; lastError?: string }][];
  return (
    <div className="rounded-sm border border-border-subtle bg-bg-elevated p-4 flex flex-col gap-2">
      <p className="font-mono text-[.62rem] uppercase tracking-[.14em] text-text-muted">Delivery result</p>
      {entries.map(([channel, d]) => (
        <div key={channel} className="flex items-center gap-2">
          <span className={`font-mono text-[.68rem] font-bold capitalize ${DELIVERY_COLORS[d.status]}`}>
            {channel}
          </span>
          <span className={`font-mono text-[.65rem] ${DELIVERY_COLORS[d.status]}`}>
            {d.status}
          </span>
          {d.lastError && (
            <span className="font-mono text-[.6rem] text-bear truncate">{d.lastError}</span>
          )}
        </div>
      ))}
    </div>
  );
}

export default function AdminSendAlerts() {
  const isAdmin = useHasAnyPermission([
    "notifications.dispatch.write",
    "rbac.roles.read",
  ]);

  const [audience, setAudience] = useState<Audience>("broadcast");
  const [userId, setUserId] = useState("");
  const [channels, setChannels] = useState<NotificationChannel[]>(["platform"]);
  const [kind, setKind] = useState<NotificationKind>("general");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lastResult, setLastResult] = useState<DispatchResponse | null>(null);

  const textLimit = getTextLimit(channels);

  const dispatchMutation = useMutation({
    mutationFn: async () => {
      if (audience === "user") {
        return notificationsApi.adminDispatchToUser({
          userId: userId.trim(),
          title: title.trim() || undefined,
          text: text.trim(),
          kind,
          channels,
        });
      }
      return notificationsApi.adminDispatchBroadcast({
        title: title.trim() || undefined,
        text: text.trim(),
        kind,
        channels,
      });
    },
    onSuccess: (result) => {
      setLastResult(result);
      const failed = Object.entries(result.deliveries).filter(([, d]) => d.status === "failed");
      if (failed.length === 0) {
        toast.success("Notification sent successfully.");
      } else {
        const names = failed.map(([ch]) => ch).join(", ");
        toast.error(`Sent, but failed on: ${names}`);
      }
      setText("");
      setTitle("");
      setConfirmOpen(false);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string; code?: string } } })
          ?.response?.data?.message ??
        (err as { response?: { data?: { code?: string } } })
          ?.response?.data?.code ??
        "Failed to send notification.";
      toast.error(msg);
      setConfirmOpen(false);
    },
  });

  if (!isAdmin) {
    return (
      <div className="rounded-lg border border-border-subtle bg-bg-surface p-12">
        <div className="flex flex-col items-center text-center gap-3">
          <LuLock className="h-6 w-6 text-text-disabled" />
          <p className="font-mono text-[.7rem] uppercase tracking-[.14em] text-text-muted">
            Admin access required to send alerts.
          </p>
        </div>
      </div>
    );
  }

  const canSubmit =
    text.trim().length > 0 &&
    text.trim().length <= textLimit &&
    (audience === "broadcast" || userId.trim().length > 0) &&
    channels.length > 0 &&
    !dispatchMutation.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    if (audience === "broadcast") {
      setConfirmOpen(true);
    } else {
      dispatchMutation.mutate();
    }
  }

  function toggleChannel(ch: NotificationChannel) {
    setChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    );
  }

  return (
    <div className="flex flex-col gap-4 max-w-xl">
      <div className="flex items-center gap-3">
        <span className="text-2xl text-accent">⊟</span>
        <div>
          <h1 className="font-display text-base font-bold uppercase tracking-[.16em] text-text-primary">
            Send Alerts
          </h1>
          <p className="font-mono text-[.6rem] uppercase tracking-[.14em] text-text-muted">
            Dispatch notifications to users or everyone
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="rounded-lg border border-border-subtle bg-bg-surface p-5 flex flex-col gap-5">

        {/* Audience */}
        <fieldset className="flex flex-col gap-1.5">
          <legend className="font-mono text-[.62rem] uppercase tracking-[.16em] text-text-muted mb-1">
            Audience
          </legend>
          <div className="flex items-center gap-4">
            {(["broadcast", "user"] as Audience[]).map((a) => (
              <label key={a} className="flex items-center gap-1.5 cursor-pointer font-mono text-[.68rem] text-text-secondary">
                <input
                  type="radio"
                  name="audience"
                  value={a}
                  checked={audience === a}
                  onChange={() => setAudience(a)}
                  className="accent-accent"
                />
                {a === "broadcast" ? "All users" : "One user"}
              </label>
            ))}
          </div>
        </fieldset>

        {/* User ID (shown only for "user" audience) */}
        {audience === "user" && (
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[.62rem] uppercase tracking-[.16em] text-text-muted">
              User ID
            </span>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="UUID of the target user"
              className="rounded-sm border border-border-default bg-bg-elevated px-3 py-2 font-mono text-[.75rem] text-text-primary placeholder-text-disabled focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <span className="font-mono text-[.58rem] text-text-disabled">
              Paste the user's UUID. A user search endpoint will be added by the backend team.
            </span>
          </label>
        )}

        {/* Channels */}
        <fieldset className="flex flex-col gap-1.5">
          <legend className="font-mono text-[.62rem] uppercase tracking-[.16em] text-text-muted mb-1">
            Channels
          </legend>
          <div className="flex items-center gap-4">
            {CHANNEL_OPTIONS.map((ch) => (
              <label key={ch} className="flex items-center gap-1.5 cursor-pointer font-mono text-[.68rem] text-text-secondary capitalize">
                <input
                  type="checkbox"
                  checked={channels.includes(ch)}
                  onChange={() => toggleChannel(ch)}
                  className="rounded-sm accent-accent h-3.5 w-3.5"
                />
                {ch}
              </label>
            ))}
          </div>
          {channels.length === 0 && (
            <span className="font-mono text-[.6rem] text-bear">Select at least one channel.</span>
          )}
        </fieldset>

        {/* Kind */}
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[.62rem] uppercase tracking-[.16em] text-text-muted">Kind</span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as NotificationKind)}
            className="rounded-sm border border-border-default bg-bg-elevated px-3 py-2 font-mono text-[.75rem] text-text-primary focus:border-accent focus:outline-none"
          >
            {KIND_OPTIONS.map((k) => (
              <option key={k} value={k} className="capitalize">{k}</option>
            ))}
          </select>
        </label>

        {/* Title */}
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[.62rem] uppercase tracking-[.16em] text-text-muted">
            Title <span className="text-text-disabled">(optional)</span>
          </span>
          <input
            type="text"
            value={title}
            maxLength={255}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Notification title"
            className="rounded-sm border border-border-default bg-bg-elevated px-3 py-2 font-mono text-[.75rem] text-text-primary placeholder-text-disabled focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </label>

        {/* Message */}
        <label className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[.62rem] uppercase tracking-[.16em] text-text-muted">Message</span>
            <span className={`font-mono text-[.6rem] ${text.length > textLimit ? "text-bear" : "text-text-disabled"}`}>
              {text.length} / {textLimit}
            </span>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder="Notification body text..."
            className="w-full resize-none rounded-sm border border-border-default bg-bg-elevated px-3 py-2 font-mono text-[.75rem] text-text-primary placeholder-text-disabled focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
          {text.length > textLimit && (
            <span className="font-mono text-[.6rem] text-bear">Message too long for selected channels.</span>
          )}
        </label>

        {/* Submit */}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex items-center gap-2 rounded-sm bg-accent px-5 py-2.5 font-mono text-[.7rem] font-bold uppercase tracking-[.14em] text-bg-base transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {dispatchMutation.isPending ? (
              <LuLoader className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <LuSend className="h-3.5 w-3.5" />
            )}
            Send notification
          </button>
        </div>
      </form>

      {/* Delivery result */}
      {lastResult && <DeliveryResult result={lastResult} />}

      {/* Broadcast confirm dialog */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
          onClick={() => !dispatchMutation.isPending && setConfirmOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-lg border border-border-subtle bg-bg-surface shadow-card"
          >
            <div className="flex items-start gap-3 p-5">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-accent-border bg-accent-subtle text-accent">
                <LuTriangleAlert className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-display text-[.82rem] font-bold uppercase tracking-[.12em] text-text-primary">
                  Send to all users?
                </h3>
                <p className="mt-1.5 text-[.74rem] text-text-secondary leading-relaxed">
                  This will dispatch <span className="text-accent font-bold capitalize">{kind}</span> to{" "}
                  <span className="text-accent font-bold">every user</span> via{" "}
                  {channels.join(", ")}. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border-subtle px-5 py-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={dispatchMutation.isPending}
                className="rounded-sm border border-border-default bg-bg-elevated px-3 py-2 font-mono text-[.7rem] uppercase tracking-[.14em] text-text-secondary transition-colors hover:text-text-primary disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => dispatchMutation.mutate()}
                disabled={dispatchMutation.isPending}
                className="flex items-center gap-2 rounded-sm bg-accent px-4 py-2 font-mono text-[.7rem] font-bold uppercase tracking-[.14em] text-bg-base hover:bg-accent-hover disabled:opacity-60"
              >
                {dispatchMutation.isPending ? (
                  <LuLoader className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <LuCheck className="h-3.5 w-3.5" />
                )}
                Confirm send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
