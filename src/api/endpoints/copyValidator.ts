// src/api/endpoints/copyValidator.ts
import { apiClient } from "@/api/client";
import type {
  Platform,
  SourceConfigDetailResponse,
  ValidatorConfig,
  ValidatorConfigBody,
  ValidatorConfigResponse,
  ValidatorOptions,
  ValidateBody,
  ValidateResult,
  SourceConfigSummary,
  ValidatorProfile,
} from "@/types/copyValidator";

// Backend wraps payloads in { success, data } like the rest of copy-trading.
// We unwrap defensively so the client works whether or not the envelope is
// present, and whether config is nested under `.config` or returned flat.
function unwrap<T = unknown>(body: unknown): T {
  if (body && typeof body === "object" && "data" in (body as Record<string, unknown>)) {
    return (body as { data: T }).data;
  }
  return body as T;
}

const BASE = "/copy-trading/validator";

export const copyValidatorApi = {
  getOptions: async (): Promise<ValidatorOptions> => {
    const { data } = await apiClient.get(`${BASE}/options`);
    const d = unwrap<ValidatorOptions | ValidatorOptions["fields"]>(data);
    return Array.isArray(d) ? { fields: d } : (d as ValidatorOptions);
  },

  getConfig: async (profile?: ValidatorProfile): Promise<ValidatorConfig> => {
    const { data } = await apiClient.get(`${BASE}/config`, { params: profile ? { profile } : undefined });
    const d = unwrap<{ config?: ValidatorConfig } & ValidatorConfig>(data);
    return (d?.config ?? d ?? {}) as ValidatorConfig;
  },

  getConfigWithProfile: async (profile: ValidatorProfile): Promise<ValidatorConfigResponse> => {
    const { data } = await apiClient.get(`${BASE}/config`, { params: { profile } });
    return unwrap<ValidatorConfigResponse>(data);
  },

  updateConfig: async (body: ValidatorConfigBody, profile?: ValidatorProfile): Promise<ValidatorConfig> => {
    const { data } = await apiClient.put(`${BASE}/config`, body, { params: profile ? { profile } : undefined });
    const d = unwrap<{ config?: ValidatorConfig } & ValidatorConfig>(data);
    return (d?.config ?? d ?? body) as ValidatorConfig;
  },

  // ── Per-source overrides ────────────────────────────────────────────────
  listSourceConfigs: async (): Promise<SourceConfigSummary[]> => {
    const { data } = await apiClient.get(`${BASE}/config/sources`);
    const d = unwrap<unknown>(data);
    if (Array.isArray(d)) return d as SourceConfigSummary[];
    return (d as { sources?: SourceConfigSummary[] })?.sources ?? [];
  },

  getSourceConfig: async (platform: Platform, sourceId: string): Promise<ValidatorConfig> => {
    const { data } = await apiClient.get(
      `${BASE}/config/sources/${platform}/${encodeURIComponent(sourceId)}`,
    );
    const d = unwrap<{ config?: ValidatorConfig } & ValidatorConfig>(data);
    return (d?.config ?? d ?? {}) as ValidatorConfig;
  },

  getSourceConfigDetail: async (
    platform: Platform,
    sourceId: string,
    profile: ValidatorProfile = "equity",
  ): Promise<SourceConfigDetailResponse> => {
    const { data } = await apiClient.get(
      `${BASE}/config/sources/${platform}/${encodeURIComponent(sourceId)}`,
      { params: { profile } },
    );
    return unwrap<SourceConfigDetailResponse>(data);
  },

  updateSourceConfig: async (
    platform: Platform,
    sourceId: string,
    body: ValidatorConfigBody,
  ): Promise<ValidatorConfig> => {
    const { data } = await apiClient.put(
      `${BASE}/config/sources/${platform}/${encodeURIComponent(sourceId)}`,
      body,
    );
    const d = unwrap<{ config?: ValidatorConfig } & ValidatorConfig>(data);
    return (d?.config ?? d ?? body) as ValidatorConfig;
  },

  deleteSourceConfig: async (platform: Platform, sourceId: string): Promise<void> => {
    await apiClient.delete(`${BASE}/config/sources/${platform}/${encodeURIComponent(sourceId)}`);
  },

  // ── Preview ──────────────────────────────────────────────────────────────
  validate: async (body: ValidateBody): Promise<ValidateResult> => {
    const { data } = await apiClient.post(`${BASE}/validate`, body);
    const d = unwrap<{ result?: ValidateResult } & ValidateResult>(data);
    return (d?.result ?? d) as ValidateResult;
  },
};
