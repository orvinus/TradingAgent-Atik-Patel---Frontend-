// src/pages/CopyTradingDiscord/index.tsx
import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  LuArrowLeft,
  LuLoader,
  LuExternalLink,
  LuServer,
  LuHash,
  LuRefreshCw,
  LuInfo,
} from "react-icons/lu";
import { discordCopierApi } from "@/api/endpoints/discordCopyTrading";
import { qk } from "@/api/queryKeys";
import { ROUTES } from "@/constants/routes";
import { toast } from "@/components/ui/Toast";
import {
  DiscordBotAccessGuide,
  type GuideFocus,
} from "@/components/discord/DiscordBotAccessGuide";

// ── Error helpers ─────────────────────────────────────────────────────────────

const DISCORD_ERROR_MESSAGES = {
  DISCORD_USER_DISABLED: "Discord copy trading is not available on this server.",
  DISCORD_NOT_CONNECTED: "Connect your Discord account first.",
  DISCORD_BOT_NOT_IN_GUILD: "Add the TRADING-OS bot to this server first.",
  DISCORD_CHANNEL_NO_ACCESS: "Bot cannot read this channel. Check channel permissions.",
  DISCORD_GUILD_FORBIDDEN: "You are not a member of this server.",
  DISCORD_TOKEN_EXPIRED: "Discord session expired. Please connect again.",
  SOURCE_NOT_FOUND: "Channel already stopped or not found.",
} satisfies Record<string, string>;

function apiErr(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const d = err.response?.data;
    const code: string | undefined = d?.code;
    if (code && code in DISCORD_ERROR_MESSAGES) {
      return DISCORD_ERROR_MESSAGES[code as keyof typeof DISCORD_ERROR_MESSAGES];
    }
    return d?.message ?? d?.code ?? "Something went wrong.";
  }
  return "Something went wrong.";
}

function errCode(err: unknown): string | undefined {
  return axios.isAxiosError(err) ? err.response?.data?.code : undefined;
}

// ── Shared UI helpers ─────────────────────────────────────────────────────────

function Back({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-fit items-center gap-1.5 font-mono text-[.65rem] text-text-muted transition-colors hover:text-text-secondary"
    >
      <LuArrowLeft className="h-3 w-3" /> Back
    </button>
  );
}

function PulsingDot() {
  return (
    <span className="relative flex h-1.5 w-1.5">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-bull opacity-75" />
      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-bull" />
    </span>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CopyTradingDiscord() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const initRef = useRef(false);

  // local state
  const [connecting, setConnecting] = useState(false);
  const [polling, setPolling] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [selectedGuildId, setSelectedGuildId] = useState<string | null>(null);
  const [confirmStop, setConfirmStop] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideFocus, setGuideFocus] = useState<GuideFocus>("both");

  function openGuide(focus: GuideFocus = "both") {
    setGuideFocus(focus);
    setGuideOpen(true);
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  const configQuery = useQuery({
    queryKey: qk.discordConfig(),
    queryFn: discordCopierApi.getConfig,
  });

  const statusQuery = useQuery({
    queryKey: qk.discordStatus(),
    queryFn: discordCopierApi.getStatus,
    refetchInterval: polling ? 2500 : false,
    refetchOnWindowFocus: false,
    enabled: configQuery.data?.discordConfigured !== false,
  });

  const guildsQuery = useQuery({
    queryKey: qk.discordGuilds(),
    queryFn: discordCopierApi.listGuilds,
    enabled: statusQuery.data?.connected === true,
  });

  const channelsQuery = useQuery({
    queryKey: qk.discordChannels(selectedGuildId ?? ""),
    queryFn: () => discordCopierApi.listChannels(selectedGuildId!),
    enabled: !!selectedGuildId && statusQuery.data?.connected === true,
  });

  const sourcesQuery = useQuery({
    queryKey: qk.discordSources(),
    queryFn: discordCopierApi.listSources,
    enabled: statusQuery.data?.connected === true,
  });

  // ── OAuth return handling ─────────────────────────────────────────────────
  // If URL has ?connected=1 (redirected from /copy-trading/discord), start polling.
  useEffect(() => {
    if (!initRef.current && searchParams.get("connected") === "1") {
      initRef.current = true;
      setPolling(true);
    }
  }, [searchParams]);

  // Stop polling once status confirms connected.
  useEffect(() => {
    if (polling && statusQuery.data?.connected) {
      setPolling(false);
    }
  }, [polling, statusQuery.data]);

  // ── Mutations ─────────────────────────────────────────────────────────────

  const addSource = useMutation({
    mutationFn: ({ guildId, channelId }: { guildId: string; channelId: string }) =>
      discordCopierApi.addSource(guildId, channelId),
    onSuccess: (source) => {
      qc.invalidateQueries({ queryKey: qk.discordSources() });
      qc.invalidateQueries({ queryKey: qk.discordStatus() });
      const name = source.channelName ? `#${source.channelName}` : "Channel";
      toast.success(`${name} is now being copied`);
    },
    onError: (err) => {
      const c = errCode(err);
      if (c === "DISCORD_BOT_NOT_IN_GUILD") openGuide("part1");
      else if (c === "DISCORD_CHANNEL_NO_ACCESS") openGuide("part2");
      toast.error(apiErr(err));
    },
  });

  const removeSource = useMutation({
    mutationFn: (channelId: string) => discordCopierApi.removeSource(channelId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.discordSources() });
      qc.invalidateQueries({ queryKey: qk.discordStatus() });
      setConfirmStop(null);
      toast.success("Stopped copying channel");
    },
    onError: (err) => {
      const c = errCode(err);
      if (c === "SOURCE_NOT_FOUND") {
        qc.invalidateQueries({ queryKey: qk.discordSources() });
        toast.error(DISCORD_ERROR_MESSAGES.SOURCE_NOT_FOUND);
      } else {
        toast.error(apiErr(err));
      }
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleConnect() {
    setConnecting(true);
    try {
      const { url } = await discordCopierApi.getConnectLink();
      window.location.href = url;
    } catch (err) {
      const c = errCode(err);
      if (c === "DISCORD_USER_DISABLED") {
        toast.error(DISCORD_ERROR_MESSAGES.DISCORD_USER_DISABLED);
      } else {
        toast.error(apiErr(err));
      }
      setConnecting(false);
    }
  }

  async function handleInviteBot() {
    try {
      const { url } = await discordCopierApi.getInvite();
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(apiErr(err));
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await discordCopierApi.logout();
      qc.invalidateQueries({ queryKey: qk.discordStatus() });
      qc.invalidateQueries({ queryKey: qk.discordSources() });
      qc.invalidateQueries({ queryKey: qk.discordGuilds() });
      setSelectedGuildId(null);
      setConfirmLogout(false);
      initRef.current = false;
      toast.success("Disconnected from Discord");
    } catch (err) {
      toast.error(apiErr(err));
    } finally {
      setLoggingOut(false);
    }
  }

  // ── Loading / config guard ────────────────────────────────────────────────

  const configured = configQuery.isSuccess ? (configQuery.data?.discordConfigured ?? true) : true;

  if (configQuery.isSuccess && !configured) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Back onClick={() => navigate(ROUTES.COPY_TRADING)} />
        <h1 className="font-display text-xl font-bold uppercase tracking-[.12em] text-text-primary">
          Discord Copy Trading
        </h1>
        <div className="rounded-sm border border-bear/30 bg-bear/10 px-4 py-3 font-mono text-[.7rem] text-bear">
          Discord copy trading is not available on this server. Contact your administrator.
        </div>
      </div>
    );
  }

  if (statusQuery.isLoading && !polling) {
    return (
      <div className="flex min-h-[60vh] flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <LuLoader className="h-5 w-5 animate-spin text-text-muted" />
          <span className="font-mono text-[.65rem] uppercase tracking-widest text-text-muted">
            Checking connection…
          </span>
        </div>
      </div>
    );
  }

  // ── OAuth polling screen ──────────────────────────────────────────────────

  if (polling) {
    return (
      <div className="flex min-h-[60vh] flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <LuLoader className="h-6 w-6 animate-spin text-accent" />
          <div className="text-center">
            <p className="font-mono text-[.75rem] text-text-primary">Connecting Discord account…</p>
            <p className="mt-1 font-mono text-[.65rem] text-text-muted">
              This usually takes a few seconds.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Not connected screen ──────────────────────────────────────────────────

  if (!statusQuery.data?.connected) {
    return (
      <div className="flex max-w-md flex-col gap-6 p-6">
        <Back onClick={() => navigate(ROUTES.COPY_TRADING)} />
        <div>
          <h1 className="font-display text-xl font-bold uppercase tracking-[.12em] text-text-primary">
            Discord Copy Trading
          </h1>
          <p className="mt-1 font-mono text-[.7rem] text-text-muted">
            Connect your Discord account to start copying signals from channels.
          </p>
        </div>

        <div className="rounded-lg border border-border-subtle bg-bg-surface p-5 shadow-card">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-2xl">💬</span>
            <div>
              <p className="font-mono text-[.72rem] font-bold text-text-primary">Connect via Discord OAuth</p>
              <p className="font-mono text-[.62rem] text-text-muted">
                You'll be redirected to Discord to authorize access.
              </p>
            </div>
          </div>
          <ul className="mb-4 flex flex-col gap-1">
            {["Read your server memberships", "Read messages in selected channels"].map((item) => (
              <li key={item} className="flex items-center gap-1.5 font-mono text-[.63rem] text-text-disabled">
                <span className="text-bull">✓</span> {item}
              </li>
            ))}
          </ul>
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="flex w-full items-center justify-center gap-2 rounded-sm bg-accent py-2.5 font-mono text-[.78rem] font-bold uppercase tracking-widest text-bg-base transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {connecting ? (
              <>
                <LuLoader className="h-3.5 w-3.5 animate-spin" /> Redirecting…
              </>
            ) : (
              "Connect Discord"
            )}
          </button>
        </div>

        {statusQuery.isError && (
          <p className="font-mono text-[.65rem] text-bear">{apiErr(statusQuery.error)}</p>
        )}
      </div>
    );
  }

  // ── Connected dashboard ───────────────────────────────────────────────────

  const status = statusQuery.data;
  const displayName = status.username ?? status.globalName ?? "Connected";
  const guilds = guildsQuery.data ?? [];
  const botPresentGuilds = guilds.filter((g) => g.botPresent);
  const noBotGuilds = guilds.filter((g) => !g.botPresent);
  const sources = sourcesQuery.data ?? [];
  const activeSources = sources.filter((s) => s.isActive);
  const channels = channelsQuery.data ?? [];
  const selectedGuild = guilds.find((g) => g.id === selectedGuildId);

  return (
    <div className="flex flex-col gap-6 p-6">
      {guideOpen && (
        <DiscordBotAccessGuide
          focus={guideFocus}
          selectedGuildId={selectedGuildId}
          onClose={() => setGuideOpen(false)}
        />
      )}

      <Back onClick={() => navigate(ROUTES.COPY_TRADING)} />

      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold uppercase tracking-[.12em] text-text-primary">
          Discord Copy Trading
        </h1>
        <button
          onClick={() => openGuide("both")}
          className="flex items-center gap-1.5 font-mono text-[.62rem] text-text-muted transition-colors hover:text-accent"
        >
          <LuInfo className="h-3.5 w-3.5" />
          Can't see your channel?
        </button>
      </div>

      {/* Connection status header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-subtle bg-bg-surface p-4 shadow-card">
        <div className="flex items-center gap-2">
          <PulsingDot />
          <span className="font-mono text-[.7rem] text-text-primary">
            Connected as {displayName}
          </span>
        </div>

        {confirmLogout ? (
          <div className="flex items-center gap-2">
            <span className="font-mono text-[.62rem] text-text-muted">Disconnect Discord?</span>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="rounded-sm bg-bear px-2.5 py-1 font-mono text-[.62rem] text-white hover:opacity-80 disabled:opacity-50"
            >
              {loggingOut ? <LuLoader className="h-2.5 w-2.5 animate-spin" /> : "Yes, disconnect"}
            </button>
            <button
              onClick={() => setConfirmLogout(false)}
              className="font-mono text-[.62rem] text-text-muted hover:text-text-secondary"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmLogout(true)}
            className="rounded-sm border border-border-default px-3 py-1.5 font-mono text-[.62rem] uppercase tracking-widest text-text-secondary transition-colors hover:border-bear hover:text-bear"
          >
            Logout
          </button>
        )}
      </div>

      {/* Step 1 — Invite Bot */}
      <div className="flex flex-col gap-3">
        <span className="font-mono text-[.62rem] uppercase tracking-[.16em] text-text-muted">
          Step 1 — Add Bot to Server
        </span>
        <div className="rounded-lg border border-border-subtle bg-bg-surface p-4 shadow-card">
          <p className="mb-3 font-mono text-[.65rem] text-text-muted">
            The TRADING-OS bot must be in a server before you can copy its channels. Click below to
            generate a bot invite link and add it to your server.
            {noBotGuilds.length > 0 && (
              <span className="ml-1 text-bear">
                ({noBotGuilds.length} server{noBotGuilds.length !== 1 ? "s" : ""} still need the bot.)
              </span>
            )}
          </p>
          <button
            onClick={handleInviteBot}
            className="flex items-center gap-2 rounded-sm border border-accent px-4 py-2 font-mono text-[.65rem] uppercase tracking-widest text-accent transition-colors hover:bg-accent hover:text-bg-base"
          >
            <LuExternalLink className="h-3.5 w-3.5" />
            Invite Bot to Server
          </button>
        </div>
      </div>

      {/* Step 2 — Select Server */}
      <div className="flex flex-col gap-3">
        <span className="font-mono text-[.62rem] uppercase tracking-[.16em] text-text-muted">
          Step 2 — Select Server
        </span>

        {guildsQuery.isLoading ? (
          <div className="flex items-center gap-2 py-2 font-mono text-[.65rem] text-text-muted">
            <LuLoader className="h-3.5 w-3.5 animate-spin" /> Loading your servers…
          </div>
        ) : guildsQuery.isError ? (
          <p className="font-mono text-[.65rem] text-bear">{apiErr(guildsQuery.error)}</p>
        ) : guilds.length === 0 ? (
          <p className="font-mono text-[.65rem] text-text-muted">
            No servers found. Make sure you share a server with the bot.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border-subtle bg-bg-surface shadow-card">
            {/* Servers with bot first, then without */}
            {[...botPresentGuilds, ...noBotGuilds].map((guild, i, arr) => {
              const isLast = i === arr.length - 1;
              const isSelected = selectedGuildId === guild.id;
              return (
                <div
                  key={guild.id}
                  className={`flex items-center justify-between px-4 py-3 transition-colors ${
                    !isLast ? "border-b border-border-subtle" : ""
                  } ${
                    guild.botPresent
                      ? "cursor-pointer hover:bg-bg-elevated"
                      : "opacity-50 cursor-not-allowed"
                  } ${isSelected ? "bg-bg-elevated" : ""}`}
                  onClick={() => guild.botPresent && setSelectedGuildId(guild.id)}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <LuServer className="h-3.5 w-3.5 flex-shrink-0 text-text-muted" />
                    <div className="min-w-0">
                      <p className="truncate font-mono text-[.72rem] text-text-primary">{guild.name}</p>
                      <p className="font-mono text-[.6rem] text-text-disabled">
                        {guild.botPresent ? "Bot present" : "Bot not added — invite first"}
                      </p>
                    </div>
                  </div>
                  {isSelected && (
                    <span className="ml-3 flex-shrink-0 font-mono text-[.6rem] text-accent">
                      Selected
                    </span>
                  )}
                  {!guild.botPresent && (
                    <div className="ml-3 flex flex-shrink-0 items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleInviteBot(); }}
                        className="font-mono text-[.6rem] text-accent underline hover:no-underline"
                      >
                        Invite bot
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); openGuide("part1"); }}
                        className="font-mono text-[.6rem] text-text-muted underline hover:no-underline"
                      >
                        Setup guide
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Step 3 — Select Channel */}
      {selectedGuildId && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[.62rem] uppercase tracking-[.16em] text-text-muted">
              Step 3 — Select Channel{selectedGuild ? ` in ${selectedGuild.name}` : ""}
            </span>
            <button
              onClick={() => qc.invalidateQueries({ queryKey: qk.discordChannels(selectedGuildId) })}
              className="flex items-center gap-1.5 font-mono text-[.6rem] text-text-muted transition-colors hover:text-text-secondary"
            >
              <LuRefreshCw className="h-3 w-3" /> Refresh
            </button>
          </div>

          {channelsQuery.isLoading ? (
            <div className="flex items-center gap-2 py-2 font-mono text-[.65rem] text-text-muted">
              <LuLoader className="h-3.5 w-3.5 animate-spin" /> Loading channels…
            </div>
          ) : channelsQuery.isError ? (
            <p className="font-mono text-[.65rem] text-bear">{apiErr(channelsQuery.error)}</p>
          ) : channels.length === 0 ? (
            <p className="font-mono text-[.65rem] text-text-muted">
              No readable channels found. Check bot channel permissions.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border-subtle bg-bg-surface shadow-card">
              {channels.map((channel, i) => {
                const isLast = i === channels.length - 1;
                const alreadyCopied = activeSources.some((s) => s.channelId === channel.id);
                const isAdding =
                  addSource.isPending &&
                  addSource.variables?.channelId === channel.id;
                return (
                  <div
                    key={channel.id}
                    className={`flex items-center justify-between px-4 py-3 ${
                      !isLast ? "border-b border-border-subtle" : ""
                    } ${!channel.botCanRead ? "opacity-40" : ""}`}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <LuHash className="h-3.5 w-3.5 flex-shrink-0 text-text-muted" />
                      <div className="min-w-0">
                        <p className="truncate font-mono text-[.72rem] text-text-primary">
                          {channel.name}
                        </p>
                        <p className="font-mono text-[.6rem] text-text-disabled">
                          {channel.type}
                          {!channel.botCanRead && " · bot cannot read this channel"}
                        </p>
                      </div>
                    </div>

                    <div className="ml-4 flex flex-shrink-0 items-center gap-2">
                      {!channel.botCanRead && !alreadyCopied && (
                        <button
                          onClick={() => openGuide("part2")}
                          className="font-mono text-[.6rem] text-text-muted underline hover:no-underline"
                        >
                          Setup guide
                        </button>
                      )}
                      {alreadyCopied ? (
                        <span className="font-mono text-[.62rem] text-bull">Copying</span>
                      ) : (
                        <button
                          onClick={() =>
                            addSource.mutate({ guildId: selectedGuildId, channelId: channel.id })
                          }
                          disabled={!channel.botCanRead || isAdding}
                          title={!channel.botCanRead ? DISCORD_ERROR_MESSAGES.DISCORD_CHANNEL_NO_ACCESS : undefined}
                          className="rounded-sm bg-accent px-2.5 py-1 font-mono text-[.62rem] font-bold text-bg-base transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isAdding ? (
                            <LuLoader className="h-2.5 w-2.5 animate-spin" />
                          ) : (
                            "Copy"
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* My Copied Channels */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[.62rem] uppercase tracking-[.16em] text-text-muted">
            My Copied Channels
          </span>
          <button
            onClick={() => qc.invalidateQueries({ queryKey: qk.discordSources() })}
            className="flex items-center gap-1.5 font-mono text-[.6rem] text-text-muted transition-colors hover:text-text-secondary"
          >
            <LuRefreshCw className="h-3 w-3" /> Refresh
          </button>
        </div>

        {sourcesQuery.isLoading ? (
          <div className="flex items-center gap-2 py-2 font-mono text-[.65rem] text-text-muted">
            <LuLoader className="h-3.5 w-3.5 animate-spin" /> Loading…
          </div>
        ) : activeSources.length === 0 ? (
          <div className="rounded-lg border border-border-subtle bg-bg-surface p-6 text-center shadow-card">
            <p className="font-mono text-[.65rem] text-text-muted">No channels copied yet.</p>
            <p className="mt-1 font-mono text-[.6rem] text-text-disabled">
              Select a server and channel above to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border-subtle bg-bg-surface shadow-card">
            {activeSources.map((source, i) => {
              const isLast = i === activeSources.length - 1;
              const isStopping =
                removeSource.isPending && removeSource.variables === source.channelId;
              return (
                <div
                  key={source.id}
                  className={`flex items-center justify-between px-4 py-3 ${
                    !isLast ? "border-b border-border-subtle" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-[.72rem] text-text-primary">
                      {source.guildName ?? "Unknown server"} /{" "}
                      <span className="text-text-muted">
                        #{source.channelName ?? source.channelId}
                      </span>
                    </p>
                    <p className="font-mono text-[.6rem] text-text-disabled">
                      {source.signalsCount} signal{source.signalsCount !== 1 ? "s" : ""} copied
                      {source.lastMessageAt
                        ? ` · last ${new Date(source.lastMessageAt).toLocaleDateString()}`
                        : ""}
                    </p>
                  </div>

                  <div className="ml-4 flex-shrink-0">
                    {confirmStop === source.channelId ? (
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[.58rem] text-text-muted">Sure?</span>
                        <button
                          onClick={() => removeSource.mutate(source.channelId)}
                          disabled={isStopping}
                          className="rounded-sm bg-bear px-2 py-1 font-mono text-[.58rem] text-white hover:opacity-80 disabled:opacity-50"
                        >
                          {isStopping ? (
                            <LuLoader className="h-2.5 w-2.5 animate-spin" />
                          ) : (
                            "Stop"
                          )}
                        </button>
                        <button
                          onClick={() => setConfirmStop(null)}
                          className="font-mono text-[.58rem] text-text-muted hover:text-text-secondary"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmStop(source.channelId)}
                        className="rounded-sm border border-bear/50 px-2.5 py-1 font-mono text-[.62rem] text-bear transition-colors hover:bg-bear/10"
                      >
                        Stop
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Inactive sources hint */}
      {sources.length > activeSources.length && (
        <p className="font-mono text-[.6rem] text-text-disabled">
          {sources.length - activeSources.length} stopped channel
          {sources.length - activeSources.length !== 1 ? "s" : ""} not shown.
        </p>
      )}
    </div>
  );
}
