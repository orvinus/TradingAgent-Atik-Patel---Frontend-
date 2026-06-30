export interface DiscordSelfConfig {
  discordSelfConfigured: boolean;
  proxyRequired?: boolean;
}

export interface DiscordSelfStatus {
  connected: boolean;
  live?: boolean;
  discordUserId?: string;
  username?: string;
  globalName?: string;
  email?: string;
  connectedAt?: string;
  activeSources?: number;
}

export interface DiscordSelfDialog {
  channelId: string;
  guildId?: string;
  channelName: string;
  guildName?: string;
  type: "text" | "announcement" | "dm";
  isMonitored?: boolean;
}

export interface DiscordSelfSource {
  id: string;
  channelId: string;
  guildId?: string;
  channelName: string;
  guildName?: string;
  isActive: boolean;
  signalsCount?: number;
  lastMessageAt?: string;
}
