// src/api/endpoints/copyValidator.ts
import { apiClient } from "@/api/client";
import type {
  Platform,
  ValidatorConfig,
  ValidatorConfigBody,
  ValidatorOptions,
  ValidateBody,
  ValidateResult,
  SourceConfigSummary,
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

  getConfig: async (): Promise<ValidatorConfig> => {
    const { data } = await apiClient.get(`${BASE}/config`);
    const d = unwrap<{ config?: ValidatorConfig } & ValidatorConfig>(data);
    return (d?.config ?? d ?? {}) as ValidatorConfig;
  },

  updateConfig: async (body: ValidatorConfigBody): Promise<ValidatorConfig> => {
    const { data } = await apiClient.put(`${BASE}/config`, body);
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
    return unwrap<ValidateResult>(data);
  },
};
