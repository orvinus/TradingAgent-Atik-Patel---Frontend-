import { apiClient } from "@/api/client";
import type {
  TwitterConfig,
  TwitterStatus,
  TwitterSource,
  TwitterResolveResult,
} from "@/types/twitterCopyTrading";

interface Envelope<T> {
  success: boolean;
  data: T;
  message?: string;
  code?: string;
}

const BASE = "/twitter/user";

export const twitterCopierApi = {
  getConfig: async (): Promise<TwitterConfig> => {
    const { data } = await apiClient.get<Envelope<TwitterConfig>>(`${BASE}/config`);
    return data.data;
  },

  getStatus: async (): Promise<TwitterStatus> => {
    const { data } = await apiClient.get<Envelope<TwitterStatus>>(`${BASE}/status`);
    return data.data;
  },

  loginWithCookies: async (body: {
    authToken: string;
    ct0: string;
    twid: string;
  }): Promise<TwitterStatus> => {
    const { data } = await apiClient.post<Envelope<TwitterStatus>>(`${BASE}/login/cookies`, body);
    return data.data;
  },

  startLogin: async (body: { username: string; password: string }): Promise<{ status?: string }> => {
    const { data } = await apiClient.post<Envelope<{ status?: string }>>(`${BASE}/login/start`, body);
    return data.data;
  },

  submitCode: async (code: string): Promise<{ status?: string }> => {
    const { data } = await apiClient.post<Envelope<{ status?: string }>>(`${BASE}/login/code`, { code });
    return data.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post(`${BASE}/logout`);
  },

  resolveHandle: async (handle: string): Promise<TwitterResolveResult> => {
    const { data } = await apiClient.get<Envelope<TwitterResolveResult>>(`${BASE}/resolve`, {
      params: { handle: handle.replace(/^@+/, "") },
    });
    return data.data;
  },

  listSources: async (): Promise<TwitterSource[]> => {
    const { data } = await apiClient.get<Envelope<TwitterSource[]>>(`${BASE}/sources`);
    return data.data;
  },

  addSource: async (body: {
    kind: "account" | "list" | "home";
    handle?: string;
    listId?: string;
  }): Promise<TwitterSource> => {
    const { data } = await apiClient.post<Envelope<TwitterSource>>(`${BASE}/sources`, body);
    return data.data;
  },

  removeSource: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE}/sources/${id}`);
  },
};
