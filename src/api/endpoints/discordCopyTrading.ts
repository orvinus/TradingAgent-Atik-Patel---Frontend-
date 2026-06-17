// src/api/endpoints/discordCopyTrading.ts
import { apiClient } from "@/api/client";
import type {
  DiscordCopierConfig,
  DiscordConnectionStatus,
  DiscordGuild,
  DiscordChannel,
  DiscordSource,
  DiscordParsedSignal,
} from "@/types/discordCopyTrading";

interface Envelope<T> {
  success: boolean;
  data: T;
  message?: string;
  code?: string;
}

const BASE = "/discord/user";

export const discordCopierApi = {
  getConfig: async (): Promise<DiscordCopierConfig> => {
    const { data } = await apiClient.get<Envelope<DiscordCopierConfig>>(`${BASE}/config`);
    return data.data;
  },

  getConnectLink: async (): Promise<{ url: string; state: string; scopes: string[]; redirectUri: string }> => {
    const { data } = await apiClient.get<Envelope<{ url: string; state: string; scopes: string[]; redirectUri: string }>>(`${BASE}/connect-link`);
    return data.data;
  },

  getStatus: async (): Promise<DiscordConnectionStatus> => {
    const { data } = await apiClient.get<Envelope<DiscordConnectionStatus>>(`${BASE}/status`);
    return data.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post(`${BASE}/logout`);
  },

  getInvite: async (): Promise<{ url: string; instructions: string }> => {
    const { data } = await apiClient.get<Envelope<{ url: string; instructions: string }>>(`${BASE}/invite`);
    return data.data;
  },

  listGuilds: async (): Promise<DiscordGuild[]> => {
    const { data } = await apiClient.get<Envelope<{ guilds: DiscordGuild[] }>>(`${BASE}/guilds`);
    return data.data.guilds;
  },

  listChannels: async (guildId: string): Promise<DiscordChannel[]> => {
    const { data } = await apiClient.get<Envelope<{ channels: DiscordChannel[] }>>(
      `${BASE}/guilds/${encodeURIComponent(guildId)}/channels`,
    );
    return data.data.channels;
  },

  listSources: async (): Promise<DiscordSource[]> => {
    const { data } = await apiClient.get<Envelope<{ sources: DiscordSource[] }>>(`${BASE}/sources`);
    return data.data.sources;
  },

  addSource: async (guildId: string, channelId: string): Promise<DiscordSource> => {
    const { data } = await apiClient.post<Envelope<{ source: DiscordSource }>>(`${BASE}/sources`, {
      guildId,
      channelId,
    });
    return data.data.source;
  },

  removeSource: async (channelId: string): Promise<void> => {
    await apiClient.delete(`${BASE}/sources/${encodeURIComponent(channelId)}`);
  },

  listSignals: async (params?: { limit?: number; sourceId?: string }): Promise<DiscordParsedSignal[]> => {
    const { data } = await apiClient.get<Envelope<{ signals: DiscordParsedSignal[] }>>(`${BASE}/signals`, {
      params,
    });
    return data.data.signals;
  },
};
