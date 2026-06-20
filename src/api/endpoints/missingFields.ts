// src/api/endpoints/missingFields.ts
import { apiClient } from "@/api/client";
import type {
  MissingFieldsConfig,
  MissingFieldsOptions,
  MissingFieldsPreviewResponse,
  MissingFieldsSourceConfig,
} from "@/types/missingFields";

function unwrap<T = unknown>(body: unknown): T {
  if (body && typeof body === "object" && "data" in (body as Record<string, unknown>)) {
    return (body as { data: T }).data;
  }
  return body as T;
}

const BASE = "/copy-trading/missing-fields";

export const missingFieldsApi = {
  getOptions: async (): Promise<MissingFieldsOptions> => {
    const { data } = await apiClient.get(`${BASE}/options`);
    return unwrap<MissingFieldsOptions>(data);
  },

  getConfig: async (): Promise<MissingFieldsConfig> => {
    const { data } = await apiClient.get(`${BASE}/config`);
    const d = unwrap<{ missingFields?: MissingFieldsConfig } & MissingFieldsConfig>(data);
    return (d?.missingFields ?? d) as MissingFieldsConfig;
  },

  updateConfig: async (missingFields: MissingFieldsConfig): Promise<MissingFieldsConfig> => {
    const { data } = await apiClient.put(`${BASE}/config`, { missingFields });
    const d = unwrap<{ missingFields?: MissingFieldsConfig } & MissingFieldsConfig>(data);
    return (d?.missingFields ?? d ?? missingFields) as MissingFieldsConfig;
  },

  preview: async (body: {
    platform?: string;
    sourceId?: string;
    signal: Record<string, unknown>;
  }): Promise<MissingFieldsPreviewResponse> => {
    const { data } = await apiClient.post(`${BASE}/preview`, body);
    return unwrap<MissingFieldsPreviewResponse>(data);
  },

  getSourceConfig: async (platform: string, sourceId: string): Promise<MissingFieldsSourceConfig> => {
    const { data } = await apiClient.get(
      `${BASE}/config/sources/${platform}/${encodeURIComponent(sourceId)}`,
    );
    return unwrap<MissingFieldsSourceConfig>(data);
  },

  updateSourceConfig: async (
    platform: string,
    sourceId: string,
    missingFields: MissingFieldsConfig,
  ): Promise<MissingFieldsSourceConfig> => {
    const { data } = await apiClient.put(
      `${BASE}/config/sources/${platform}/${encodeURIComponent(sourceId)}`,
      { missingFields },
    );
    return unwrap<MissingFieldsSourceConfig>(data);
  },

  deleteSourceConfig: async (platform: string, sourceId: string): Promise<void> => {
    await apiClient.delete(
      `${BASE}/config/sources/${platform}/${encodeURIComponent(sourceId)}`,
    );
  },
};
