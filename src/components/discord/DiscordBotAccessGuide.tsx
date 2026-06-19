// src/components/discord/DiscordBotAccessGuide.tsx
import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LuX,
  LuCopy,
  LuExternalLink,
  LuRefreshCw,
  LuLoader,
  LuInfo,
  LuTriangleAlert,
  LuCheck,
} from "react-icons/lu";
import { discordCopierApi } from "@/api/endpoints/discordCopyTrading";
import { qk } from "@/api/queryKeys";
import { toast } from "@/components/ui/Toast";

export type GuideFocus = "part1" | "part2" | "both";

export interface DiscordBotAccessGuideProps {
  /** Pre-fetched invite URL; if omitted, component fetches GET /invite */
  inviteUrl?: string;
  /** Which section to emphasize on open */
  focus?: GuideFocus;
  /** Callback to close the panel */
  onClose?: () => void;
  /** Called after refresh button is clicked; caller should invalidate guilds/channels */
  onRefresh?: () => void;
  /** guildId currently selected — used to also refresh channels */
  selectedGuildId?: string | null;
}

async function copyInviteUrl(url: string) {
  try {
    await navigator.clipboard.writeText(url);
    toast.success("Bot invite link copied — send this to your server admin");
  } catch {
    toast.info("Select the link and copy manually (Ctrl+C / Cmd+C)");
  }
}

function openInviteUrl(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

// ── Inline compact banner ─────────────────────────────────────────────────────

interface InlineBannerProps {
  type: "no-bot" | "no-access";
  onOpenGuide: (focus: GuideFocus) => void;
}

export function DiscordBotInlineBanner({ type, onOpenGuide }: InlineBannerProps) {
  if (type === "no-bot") {
    return (
      <div className="flex items-center gap-1.5 rounded-sm border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 font-mono text-[.6rem] text-amber-400">
        <LuTriangleAlert className="h-3 w-3 flex-shrink-0" />
        <span>TRADING-OS bot not in this server.</span>
        <button
          onClick={() => onOpenGuide("part1")}
          className="ml-0.5 underline hover:no-underline"
        >
          View setup guide →
        </button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 rounded-sm border border-bear/30 bg-bear/10 px-2.5 py-1.5 font-mono text-[.6rem] text-bear">
      <LuTriangleAlert className="h-3 w-3 flex-shrink-0" />
      <span>Bot cannot read this channel — likely private.</span>
      <button
        onClick={() => onOpenGuide("part2")}
        className="ml-0.5 underline hover:no-underline"
      >
        Ask admin to complete Step 2 →
      </button>
    </div>
  );
}

// ── Full guide panel ──────────────────────────────────────────────────────────

export function DiscordBotAccessGuide({
  inviteUrl: inviteUrlProp,
  focus = "both",
  onClose,
  onRefresh,
  selectedGuildId,
}: DiscordBotAccessGuideProps) {
  const qc = useQueryClient();
  const part1Ref = useRef<HTMLDivElement>(null);
  const part2Ref = useRef<HTMLDivElement>(null);

  const inviteQuery = useQuery({
    queryKey: qk.discordInvite(),
    queryFn: discordCopierApi.getInvite,
    enabled: !inviteUrlProp,
    staleTime: 5 * 60 * 1000,
  });

  const inviteUrl = inviteUrlProp ?? inviteQuery.data?.url;

  // Scroll the focused section into view after mount
  useEffect(() => {
    const delay = setTimeout(() => {
      if (focus === "part1") part1Ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      if (focus === "part2") part2Ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
    return () => clearTimeout(delay);
  }, [focus]);

  async function handleRefresh() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: qk.discordGuilds() }),
      selectedGuildId
        ? qc.invalidateQueries({ queryKey: qk.discordChannels(selectedGuildId) })
        : Promise.resolve(null),
    ]);
    toast.success("Server and channel list updated");
    onRefresh?.();
  }

  const highlightPart1 = focus === "part1" || focus === "both";
  const highlightPart2 = focus === "part2" || focus === "both";

  return (
    // Overlay backdrop
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Panel */}
      <div
        className="relative z-10 flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-border-subtle bg-bg-base shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border-subtle bg-bg-base px-5 py-4">
          <div>
            <h2 className="font-display text-[.85rem] font-bold uppercase tracking-[.12em] text-text-primary">
              Can't see your signal channel?
            </h2>
            <p className="mt-0.5 font-mono text-[.6rem] text-text-muted">
              Discord bot setup guide
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-sm p-1.5 text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-primary"
            >
              <LuX className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex flex-col gap-5 p-5">
          {/* Intro */}
          <div className="flex gap-3 rounded-sm border border-border-subtle bg-bg-surface p-3.5">
            <LuInfo className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-accent" />
            <p className="font-mono text-[.65rem] leading-relaxed text-text-muted">
              Unlike Telegram, Discord does not let TRADING-OS read your private signal servers
              automatically. Your <span className="text-text-primary">signal server administrator</span>{" "}
              must add our bot to the server and grant access to the specific channel you want to copy.
            </p>
          </div>

          {/* ── Part 1 ── */}
          <div
            ref={part1Ref}
            className={`flex flex-col gap-3 rounded-lg border p-4 transition-colors ${
              highlightPart1
                ? "border-accent/40 bg-accent/5"
                : "border-border-subtle bg-bg-surface"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent font-mono text-[.6rem] font-bold text-bg-base">
                1
              </span>
              <h3 className="font-mono text-[.72rem] font-bold text-text-primary">
                Ask your server admin to add our bot
              </h3>
            </div>

            <p className="font-mono text-[.63rem] leading-relaxed text-text-muted">
              Copy the link below and send it to the <span className="text-text-primary">owner or admin</span>{" "}
              of your signal Discord server. They will choose the server and authorize{" "}
              <span className="text-text-primary">TRADING-OS Assistant Bot</span> to join.
            </p>
            <p className="font-mono text-[.63rem] font-semibold text-bear">
              You cannot add the bot yourself unless you have "Manage Server" permission.
            </p>

            {/* Invite URL field */}
            {inviteQuery.isLoading && !inviteUrlProp ? (
              <div className="flex items-center gap-2 rounded-sm border border-border-subtle bg-bg-elevated px-3 py-2.5">
                <LuLoader className="h-3 w-3 animate-spin text-text-muted" />
                <span className="font-mono text-[.62rem] text-text-muted">Loading invite link…</span>
              </div>
            ) : inviteQuery.isError && !inviteUrlProp ? (
              <div className="flex items-center justify-between rounded-sm border border-bear/30 bg-bear/5 px-3 py-2.5">
                <span className="font-mono text-[.62rem] text-bear">
                  Unable to load bot invite link. Try again.
                </span>
                <button
                  onClick={() => inviteQuery.refetch()}
                  className="ml-2 font-mono text-[.6rem] text-accent underline hover:no-underline"
                >
                  Retry
                </button>
              </div>
            ) : inviteUrl ? (
              <div className="flex items-stretch gap-2">
                <div className="min-w-0 flex-1 overflow-hidden rounded-sm border border-border-subtle bg-bg-elevated px-3 py-2.5">
                  <span className="block truncate font-mono text-[.6rem] text-text-disabled">
                    {inviteUrl}
                  </span>
                </div>
                <button
                  onClick={() => copyInviteUrl(inviteUrl)}
                  className="flex flex-shrink-0 items-center gap-1.5 rounded-sm bg-accent px-3 font-mono text-[.62rem] font-bold text-bg-base transition-colors hover:bg-accent-hover"
                >
                  <LuCopy className="h-3 w-3" /> Copy
                </button>
                <button
                  onClick={() => openInviteUrl(inviteUrl)}
                  className="flex flex-shrink-0 items-center gap-1.5 rounded-sm border border-border-default px-3 font-mono text-[.62rem] text-text-secondary transition-colors hover:border-accent hover:text-accent"
                >
                  <LuExternalLink className="h-3 w-3" /> Open
                </button>
              </div>
            ) : null}

            {/* Admin steps */}
            <div className="flex flex-col gap-1.5">
              <p className="font-mono text-[.6rem] uppercase tracking-widest text-text-muted">
                What your admin does:
              </p>
              {[
                "Open the invite link received from TRADING-OS",
                "Select the signal Discord server from the dropdown",
                <>Click <strong>Authorize</strong> / <strong>Continue</strong></>,
                <>Confirm <strong>TRADING-OS Assistant Bot</strong> appears in the server's member list</>,
                "Return here and click Refresh servers below",
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-bg-elevated font-mono text-[.55rem] text-text-muted">
                    {i + 1}
                  </span>
                  <p className="font-mono text-[.63rem] leading-relaxed text-text-muted">{step}</p>
                </div>
              ))}
            </div>

            <div className="flex items-start gap-2 rounded-sm border border-amber-500/20 bg-amber-500/5 px-3 py-2">
              <LuTriangleAlert className="mt-0.5 h-3 w-3 flex-shrink-0 text-amber-400" />
              <p className="font-mono text-[.6rem] leading-relaxed text-amber-300">
                You must have "Manage Server" to add bots yourself. If the server is private and you're
                only a member, ask the owner or admin.
              </p>
            </div>
          </div>

          {/* ── Part 2 ── */}
          <div
            ref={part2Ref}
            className={`flex flex-col gap-3 rounded-lg border p-4 transition-colors ${
              highlightPart2
                ? "border-accent/40 bg-accent/5"
                : "border-border-subtle bg-bg-surface"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent font-mono text-[.6rem] font-bold text-bg-base">
                2
              </span>
              <h3 className="font-mono text-[.72rem] font-bold text-text-primary">
                Private channel? Grant bot access to the channel
              </h3>
            </div>

            <p className="font-mono text-[.63rem] leading-relaxed text-text-muted">
              After the bot joins the server,{" "}
              <span className="text-text-primary">private channels</span> are still hidden from the bot by
              default. The server admin must allow the bot to view that specific channel.
            </p>

            {/* Admin steps */}
            <div className="flex flex-col gap-1.5">
              {[
                <>In Discord, go to the <strong>private signal channel</strong></>,
                <>Click the <strong>gear icon ⚙️</strong> next to the channel name (<strong>Edit Channel</strong>)</>,
                <>Open the <strong>Permissions</strong> tab</>,
                <>Click <strong>+</strong> under roles/members → <strong>Add members or roles</strong></>,
                <>Search for <strong>TRADING-OS Assistant Bot</strong> and add it</>,
                <>Turn <strong>ON</strong> these permissions:</>,
                <>Click <strong>Save Changes</strong></>,
                "Ask the user to refresh channels in TRADING-OS",
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-bg-elevated font-mono text-[.55rem] text-text-muted">
                    {i + 1}
                  </span>
                  <div className="flex flex-col gap-1">
                    <p className="font-mono text-[.63rem] leading-relaxed text-text-muted">{step}</p>
                    {i === 5 && (
                      <div className="ml-0 mt-0.5 flex flex-col gap-0.5">
                        {["View Channel", "Read Message History"].map((perm) => (
                          <div key={perm} className="flex items-center gap-1.5">
                            <LuCheck className="h-3 w-3 flex-shrink-0 text-bull" />
                            <span className="font-mono text-[.63rem] text-text-primary">{perm}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Tip */}
            <div className="flex items-start gap-2 rounded-sm border border-accent/20 bg-accent/5 px-3 py-2">
              <LuInfo className="mt-0.5 h-3 w-3 flex-shrink-0 text-accent" />
              <p className="font-mono text-[.6rem] leading-relaxed text-text-muted">
                <span className="text-text-secondary">Tip:</span> If the channel is under a category, the
                bot may also need <strong>View Channel</strong> on the category, or explicit channel-level
                permissions.
              </p>
            </div>
          </div>

          {/* ── Footer / Refresh ── */}
          <button
            onClick={handleRefresh}
            className="flex items-center justify-center gap-2 rounded-sm border border-border-default py-2.5 font-mono text-[.65rem] uppercase tracking-widest text-text-secondary transition-colors hover:border-accent hover:text-accent"
          >
            <LuRefreshCw className="h-3.5 w-3.5" />
            Refresh servers &amp; channels
          </button>
        </div>
      </div>
    </div>
  );
}
