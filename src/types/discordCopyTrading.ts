// src/types/discordCopyTrading.ts

export interface DiscordCopierConfig {
  discordConfigured: boolean;
  openrouterConfigured: boolean;
  primaryModel: string;
  escalationModel: string;
  copyRedirectUri: string | null;
}

export interface DiscordConnectionStatus {
  connected: boolean;
  discordUserId: string | null;
  username: string | null;
  globalName: string | null;
  connectedAt: string | null;
  activeSources: number;
}

export interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  botPresent: boolean;
}

export interface DiscordChannel {
  id: string;
  name: string;
  type: "text" | "announcement";
  guildId: string;
  botCanRead: boolean;
}

export interface DiscordSource {
  id: string;
  guildId: string;
  channelId: string;
  guildName: string | null;
  channelName: string | null;
  isActive: boolean;
  signalsCount: number;
  lastMessageAt: string | null;
}

export interface DiscordParsedSignal {
  id: string;
  sourceId: string;
  guildId: string;
  channelId: string;
  messageId: string;
  parseable: boolean;
  signal: Record<string, unknown>;
  rawText: string | null;
  notificationId: string | null;
  createdAt: string;
}
