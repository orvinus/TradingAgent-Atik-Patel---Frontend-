// src/pages/Onboarding/StayConnected.tsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAppStore } from "@/store/index";
import { OnboardingHeader } from "@/components/auth/OnboardingHeader";
import { toast } from "@/components/ui/Toast";
import { notificationsApi, isProviderConnected } from "@/api/endpoints/notifications";
import type { NotificationProvider } from "@/types/notifications";
import { FaTelegramPlane, FaDiscord } from "react-icons/fa";
import { LuExternalLink, LuLoader, LuRefreshCw } from "react-icons/lu";

// Both providers verify by polling — the actual connection is created by the
// backend webhook (Telegram) or OAuth callback (Discord), not the frontend.
const POLL_INTERVAL_MS = 4000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

export default function StayConnected() {
  const navigate = useNavigate();
  const {
    telegramConnected,
    discordConnected,
    setTelegramConnected,
    setDiscordConnected,
  } = useAppStore();

  // Sync both providers with the backend on mount so a returning user sees
  // their real status without having to re-run either flow.
  useEffect(() => {
    let cancelled = false;
    notificationsApi
      .getConnections()
      .then((list) => {
        if (cancelled) return;
        const tg = isProviderConnected(list, "telegram");
        const ds = isProviderConnected(list, "discord");
        if (tg !== telegramConnected) setTelegramConnected(tg);
        if (ds !== discordConnected) setDiscordConnected(ds);
      })
      .catch(() => {
        /* silent — local state stays as-is */
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function next() {
    navigate("/onboarding/broker");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <OnboardingHeader skipTo="/onboarding/broker" />

      <main className="flex flex-1 flex-col items-center px-6 py-10">
        <div className="max-w-2xl text-center">
          <h1 className="font-display text-2xl font-bold uppercase tracking-[.1em] text-text-primary md:text-3xl">
            Stay Connected
          </h1>
          <p className="mt-2 font-mono text-[.7rem] uppercase tracking-[.14em] text-text-muted">
            Connect platforms for real-time alerts, AI signals, and account notifications
          </p>
        </div>

        <div className="mt-10 grid w-full max-w-4xl grid-cols-1 gap-5 md:grid-cols-2">
          <ProviderCard
            provider="telegram"
            title="Telegram"
            description="Receive instant AI trade alerts, market signals, portfolio updates, and important trading notifications directly in Telegram."
            icon={<FaTelegramPlane className="h-6 w-6 text-info" />}
            features={[
              "Real-time alerts",
              "Trade notifications",
              "Portfolio updates",
              "Secure connection",
            ]}
            connected={telegramConnected}
            setConnected={setTelegramConnected}
            connectLabel="Connect Telegram"
            confirmLabel="I've pressed START"
            waitingLabel="Waiting for START..."
            getConnectLink={async () => {
              const res = await notificationsApi.getTelegramConnectLink();
              return { url: res.url, openLabel: `Open @${res.botUsername}` };
            }}
            disconnect={notificationsApi.disconnectTelegram}
          />
          <ProviderCard
            provider="discord"
            title="Discord"
            description="Get live trading signals, community alerts, AI insights, and market updates in your Discord server or DMs."
            icon={<FaDiscord className="h-6 w-6 text-info" />}
            features={[
              "Live trading alerts",
              "AI insights",
              "Community updates",
              "Secure connection",
            ]}
            connected={discordConnected}
            setConnected={setDiscordConnected}
            connectLabel="Connect Discord"
            confirmLabel="I've authorized Discord"
            waitingLabel="Waiting for authorization..."
            getConnectLink={async () => {
              const res = await notificationsApi.getDiscordConnectLink();
              return { url: res.url, openLabel: "Open Discord" };
            }}
            disconnect={notificationsApi.disconnectDiscord}
          />
        </div>

        <p className="mt-8 max-w-2xl text-center font-mono text-[.62rem] uppercase tracking-[.14em] text-text-disabled">
          Connect one or both. Manage notification preferences anytime.
        </p>

        <button
          onClick={next}
          className="mt-6 rounded-sm bg-accent px-10 py-2.5 font-mono text-[.72rem] font-bold uppercase tracking-widest text-bg-base transition-colors hover:bg-accent-hover"
        >
          Continue
        </button>
      </main>
    </div>
  );
}

// ── Shared connect-and-poll card ──────────────────────────────────────────

type CardPhase = "idle" | "linking" | "waiting" | "disconnecting";

interface ProviderCardProps {
  provider: NotificationProvider;
  title: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  connected: boolean;
  setConnected: (v: boolean) => void;
  connectLabel: string;
  confirmLabel: string;
  waitingLabel: string;
  getConnectLink: () => Promise<{ url: string; openLabel: string }>;
  disconnect: () => Promise<unknown>;
}

function ProviderCard({
  provider,
  title,
  description,
  icon,
  features,
  connected,
  setConnected,
  connectLabel,
  confirmLabel,
  waitingLabel,
  getConnectLink,
  disconnect,
}: ProviderCardProps) {
  const [phase, setPhase] = useState<CardPhase>("idle");
  const [link, setLink] = useState<string | null>(null);
  const [openLabel, setOpenLabel] = useState<string>("Open");

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stop any timers on unmount.
  useEffect(() => {
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }

  function startPolling() {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const list = await notificationsApi.getConnections();
        if (isProviderConnected(list, provider)) {
          stopPolling();
          setConnected(true);
          setPhase("idle");
          toast.success(`${title} connected.`);
        }
      } catch {
        /* keep polling — transient errors shouldn't kill the flow */
      }
    }, POLL_INTERVAL_MS);

    timeoutRef.current = setTimeout(() => {
      stopPolling();
      setPhase((p) => (p === "waiting" ? "idle" : p));
      toast.error(`Didn't detect ${title} connection. Try again when ready.`);
    }, POLL_TIMEOUT_MS);
  }

  async function handleConnect() {
    setPhase("linking");
    try {
      const res = await getConnectLink();
      setLink(res.url);
      setOpenLabel(res.openLabel);
      window.open(res.url, "_blank", "noopener,noreferrer");
      setPhase("waiting");
      startPolling();
    } catch (err) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : `Couldn't generate ${title} link. Try again.`;
      toast.error(msg);
      setPhase("idle");
    }
  }

  async function handleCheckNow() {
    try {
      const list = await notificationsApi.getConnections();
      if (isProviderConnected(list, provider)) {
        stopPolling();
        setConnected(true);
        setPhase("idle");
        toast.success(`${title} connected.`);
      } else {
        toast.info(`Not connected yet — finish the ${title} flow first.`);
      }
    } catch {
      toast.error("Couldn't reach the server. Try again in a moment.");
    }
  }

  async function handleDisconnect() {
    setPhase("disconnecting");
    try {
      await disconnect();
      setConnected(false);
      setLink(null);
      toast.success(`${title} disconnected.`);
    } catch (err) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : "Couldn't disconnect. Try again.";
      toast.error(msg);
    } finally {
      setPhase("idle");
    }
  }

  return (
    <div className="rounded-lg border border-border-subtle bg-bg-surface p-6 transition-colors hover:border-border-default">
      <div className="flex flex-col items-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-md border border-border-subtle bg-bg-elevated">
          {icon}
        </div>
        <h3 className="mt-4 font-display text-lg font-bold uppercase tracking-[.1em] text-text-primary">
          Connect with {title}
        </h3>
        <p className="mt-2 text-[.78rem] leading-relaxed text-text-secondary">{description}</p>
      </div>

      <ul className="my-5 grid grid-cols-2 gap-y-2 font-mono text-[.7rem] text-text-secondary">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-accent" /> {f}
          </li>
        ))}
      </ul>

      {connected ? (
        <button
          onClick={handleDisconnect}
          disabled={phase === "disconnecting"}
          className="w-full rounded-sm border border-bear text-bear bg-bg-elevated py-2.5 font-mono font-bold uppercase tracking-widest transition-colors hover:bg-bear hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {phase === "disconnecting" ? (
            <span className="inline-flex items-center justify-center gap-2">
              <LuLoader className="h-3.5 w-3.5 animate-spin" /> Disconnecting...
            </span>
          ) : (
            `Disconnect ${title}`
          )}
        </button>
      ) : phase === "waiting" ? (
        <div className="flex flex-col gap-2">
          {link && (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-sm bg-accent py-2.5 font-mono text-[.72rem] font-bold uppercase tracking-widest text-bg-base transition-colors hover:bg-accent-hover"
            >
              <LuExternalLink className="h-3.5 w-3.5" />
              {openLabel}
            </a>
          )}
          <button
            onClick={handleCheckNow}
            className="flex items-center justify-center gap-2 rounded-sm border border-border-default bg-bg-elevated py-2 font-mono text-[.7rem] uppercase tracking-widest text-text-secondary transition-colors hover:border-accent hover:text-accent"
          >
            <LuRefreshCw className="h-3 w-3" />
            {confirmLabel}
          </button>
        </div>
      ) : (
        <button
          onClick={handleConnect}
          disabled={phase === "linking"}
          className="w-full rounded-sm bg-accent py-2.5 font-mono text-[.72rem] font-bold uppercase tracking-widest text-bg-base transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {phase === "linking" ? (
            <span className="inline-flex items-center justify-center gap-2">
              <LuLoader className="h-3.5 w-3.5 animate-spin" /> Generating link...
            </span>
          ) : (
            connectLabel
          )}
        </button>
      )}

      <div className="mt-3 flex items-center justify-center gap-1.5 font-mono text-[.62rem] uppercase tracking-[.14em]">
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            connected
              ? "bg-bull"
              : phase === "waiting"
              ? "bg-warning animate-pulse"
              : "bg-text-disabled"
          }`}
        />
        <span
          className={
            connected
              ? "text-bull"
              : phase === "waiting"
              ? "text-warning"
              : "text-text-disabled"
          }
        >
          {connected
            ? "Connected"
            : phase === "waiting"
            ? waitingLabel
            : "Not Connected"}
        </span>
      </div>
    </div>
  );
}
