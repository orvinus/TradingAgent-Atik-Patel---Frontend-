import { apiClient } from "@/api/client";
import type {
  DiscordSelfConfig,
  DiscordSelfStatus,
  DiscordSelfDialog,
  DiscordSelfSource,
} from "@/types/discordSelfCopyTrading";

interface Envelope<T> {
  success: boolean;
  data: T;
  message?: string;
  code?: string;
}

const BASE = "/discord/self";

export const discordSelfCopierApi = {
  getConfig: async (): Promise<DiscordSelfConfig> => {
    const { data } = await apiClient.get<Envelope<DiscordSelfConfig>>(`${BASE}/config`);
    return data.data;
  },

  getStatus: async (): Promise<DiscordSelfStatus> => {
    const { data } = await apiClient.get<Envelope<DiscordSelfStatus>>(`${BASE}/status`);
    return data.data;
  },

  startLogin: async (body: { email: string; password: string; proxy?: string }): Promise<{ status?: string }> => {
    const { data } = await apiClient.post<Envelope<{ status?: string }>>(`${BASE}/login/start`, body);
    return data.data;
  },

  submitCode: async (code: string): Promise<{ status?: string; connected?: boolean }> => {
    const { data } = await apiClient.post<Envelope<{ status?: string; connected?: boolean }>>(
      `${BASE}/login/code`,
      { code },
    );
    return data.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post(`${BASE}/logout`);
  },

  listDialogs: async (): Promise<DiscordSelfDialog[]> => {
    const { data } = await apiClient.get<Envelope<DiscordSelfDialog[]>>(`${BASE}/dialogs`);
    return data.data;
  },

  listSources: async (): Promise<DiscordSelfSource[]> => {
    const { data } = await apiClient.get<Envelope<DiscordSelfSource[]>>(`${BASE}/sources`);
    return data.data;
  },

  addSource: async (channelId: string, guildId?: string): Promise<DiscordSelfSource> => {
    const { data } = await apiClient.post<Envelope<DiscordSelfSource>>(`${BASE}/sources`, {
      channelId,
      ...(guildId !== undefined ? { guildId } : {}),
    });
    return data.data;
  },

  removeSource: async (channelId: string): Promise<void> => {
    await apiClient.delete(`${BASE}/sources/${encodeURIComponent(channelId)}`);
  },
};
