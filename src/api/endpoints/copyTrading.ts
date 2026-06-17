// src/api/endpoints/copyTrading.ts
import { apiClient } from "@/api/client";
import type {
  CopierConfig,
  TelegramStatus,
  LoginStartResponse,
  LoginCodeResponse,
  TelegramDialog,
  TelegramSource,
  ParsedSignalRow,
} from "@/types/copyTrading";

interface Envelope<T> {
  success: boolean;
  data: T;
  message?: string;
  code?: string;
}

const BASE = "/telegram/user";

export const copyTradingApi = {
  getConfig: async (): Promise<CopierConfig> => {
    const { data } = await apiClient.get<Envelope<CopierConfig>>(`${BASE}/config`);
    return data.data;
  },

  getStatus: async (): Promise<TelegramStatus> => {
    const { data } = await apiClient.get<Envelope<TelegramStatus>>(`${BASE}/status`);
    return data.data;
  },

  startLogin: async (phone: string): Promise<LoginStartResponse> => {
    const { data } = await apiClient.post<Envelope<LoginStartResponse>>(`${BASE}/login/start`, { phone });
    return data.data;
  },

  submitCode: async (code: string): Promise<LoginCodeResponse> => {
    const { data } = await apiClient.post<Envelope<LoginCodeResponse>>(`${BASE}/login/code`, { code });
    return data.data;
  },

  submitPassword: async (password: string): Promise<LoginCodeResponse> => {
    const { data } = await apiClient.post<Envelope<LoginCodeResponse>>(`${BASE}/login/password`, { password });
    return data.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post(`${BASE}/logout`);
  },

  listDialogs: async (): Promise<TelegramDialog[]> => {
    const { data } = await apiClient.get<Envelope<{ dialogs: TelegramDialog[] }>>(`${BASE}/dialogs`);
    return data.data.dialogs;
  },

  listSources: async (): Promise<TelegramSource[]> => {
    const { data } = await apiClient.get<Envelope<{ sources: TelegramSource[] }>>(`${BASE}/sources`);
    return data.data.sources;
  },

  addSource: async (chatId: string): Promise<TelegramSource> => {
    const { data } = await apiClient.post<Envelope<{ source: TelegramSource }>>(`${BASE}/sources`, { chatId });
    return data.data.source;
  },

  removeSource: async (chatId: string): Promise<void> => {
    await apiClient.delete(`${BASE}/sources/${encodeURIComponent(chatId)}`);
  },

  listSignals: async (params?: { limit?: number; sourceId?: string }): Promise<ParsedSignalRow[]> => {
    const { data } = await apiClient.get<Envelope<{ signals: ParsedSignalRow[] }>>(`${BASE}/signals`, { params });
    return data.data.signals;
  },
};
