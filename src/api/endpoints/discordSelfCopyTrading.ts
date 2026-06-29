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
    const { data } = await apiClient.get<Envelope<unknown>>(`${BASE}/dialogs`);
    const d = data.data;
    if (Array.isArray(d)) return d as DiscordSelfDialog[];
    const obj = d as Record<string, unknown> | null | undefined;
    if (obj && Array.isArray(obj.dialogs)) return obj.dialogs as DiscordSelfDialog[];
    if (obj && Array.isArray(obj.channels)) return obj.channels as DiscordSelfDialog[];
    return [];
  },

  listSources: async (): Promise<DiscordSelfSource[]> => {
    const { data } = await apiClient.get<Envelope<unknown>>(`${BASE}/sources`);
    const d = data.data;
    if (Array.isArray(d)) return d as DiscordSelfSource[];
    const obj = d as Record<string, unknown> | null | undefined;
    if (obj && Array.isArray(obj.sources)) return obj.sources as DiscordSelfSource[];
    return [];
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
