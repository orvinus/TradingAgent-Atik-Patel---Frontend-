// src/pages/CopyTradingValidator/index.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LuArrowLeft, LuLoader, LuArrowRight, LuTriangleAlert } from "react-icons/lu";
import axios from "axios";
import { copyValidatorApi } from "@/api/endpoints/copyValidator";
import { qk } from "@/api/queryKeys";
import { ROUTES } from "@/constants/routes";
import { toast } from "@/components/ui/Toast";
import type { NormalizedValidatorConfig, ProfileConfig, ValidatorConfigBody, ValidatorProfile } from "@/types/copyValidator";
import { ProfileSettingsTabs } from "@/components/copy-trading/ProfileSettingsTabs";
import ValidatorForm, { normalizeConfig } from "./ValidatorForm";
import OptionsValidatorForm, { normalizeOptionsConfig } from "./OptionsValidatorForm";
import { serializeConfig, validateConfig } from "./serialize";
import PreviewPanel from "./PreviewPanel";
import SourceOverrides from "./SourceOverrides";

function apiErr(err: unknown): string {
  if (axios.isAxiosError(err)) return err.response?.data?.message ?? err.response?.data?.code ?? "Something went wrong.";
  return "Something went wrong.";
}

export default function CopyTradingValidator() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<ValidatorProfile>("equity");

  const optionsQuery = useQuery({
    queryKey: qk.copyValidatorOptions(),
    queryFn: copyValidatorApi.getOptions,
    staleTime: 60 * 60 * 1000,
  });

  // Load equity config (global)
  const equityConfigQuery = useQuery({
    queryKey: qk.copyValidatorConfig(),
    queryFn: () => copyValidatorApi.getConfig(),
  });

  // Load options profile config
  const optionsConfigQuery = useQuery({
    queryKey: qk.copyValidatorConfigProfile("options"),
    queryFn: () => copyValidatorApi.getConfig("options"),
  });

  const [equityConfig, setEquityConfig] = useState<NormalizedValidatorConfig>(normalizeConfig());
  const [optionsConfig, setOptionsConfig] = useState<Required<ProfileConfig>>(normalizeOptionsConfig());

  useEffect(() => {
    if (equityConfigQuery.data) {
      setEquityConfig(normalizeConfig(equityConfigQuery.data));
      // If profiles.equity exists, also hydrate from it
      const profileEquity = (equityConfigQuery.data as { profiles?: { equity?: ProfileConfig } }).profiles?.equity;
      if (profileEquity) setEquityConfig(normalizeConfig({ ...equityConfigQuery.data, ...profileEquity }));
    }
  }, [equityConfigQuery.data]);

  useEffect(() => {
    if (optionsConfigQuery.data) {
      const profileOptions = (optionsConfigQuery.data as { profiles?: { options?: ProfileConfig }; effectiveConfig?: ProfileConfig }).effectiveConfig
        ?? (optionsConfigQuery.data as { profiles?: { options?: ProfileConfig } }).profiles?.options
        ?? optionsConfigQuery.data;
      setOptionsConfig(normalizeOptionsConfig(profileOptions as ProfileConfig));
    }
  }, [optionsConfigQuery.data]);

  const saveMut = useMutation({
    mutationFn: (body: ValidatorConfigBody) => copyValidatorApi.updateConfig(body),
    onSuccess: (saved) => {
      toast.success("Validation settings saved");
      qc.invalidateQueries({ queryKey: qk.copyValidatorConfig() });
      qc.invalidateQueries({ queryKey: qk.copyValidatorConfigProfile("options") });
      qc.setQueryData(qk.copyValidatorConfig(), saved);
    },
    onError: (e) => toast.error(apiErr(e)),
  });

  const onSave = () => {
    if (activeTab === "equity") {
      const errs = validateConfig(equityConfig);
      if (errs.length) { toast.error(errs[0] ?? "Please fix the highlighted rules."); return; }
      saveMut.mutate({
        ...serializeConfig(equityConfig),
        profiles: { equity: serializeConfig(equityConfig) },
      });
    } else {
      saveMut.mutate({
        profiles: {
          options: {
            executionMode: optionsConfig.executionMode,
            onViolation: optionsConfig.onViolation,
            fields: optionsConfig.fields,
          },
        },
      });
    }
  };

  const isLoading = activeTab === "equity" ? equityConfigQuery.isLoading : optionsConfigQuery.isLoading;
  const isError = activeTab === "equity" ? equityConfigQuery.isError : optionsConfigQuery.isError;
  const loadError = activeTab === "equity" ? equityConfigQuery.error : optionsConfigQuery.error;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <button
          onClick={() => navigate(ROUTES.COPY_TRADING)}
          className="mb-3 flex w-fit items-center gap-1.5 font-mono text-[.65rem] text-text-muted transition-colors hover:text-text-secondary"
        >
          <LuArrowLeft className="h-3 w-3" /> Copy Trading
        </button>
        <h1 className="font-display text-xl font-bold uppercase tracking-[.12em] text-text-primary">
          Validation &amp; Limits
        </h1>
        <p className="mt-1 font-mono text-[.7rem] text-text-muted">
          Apply separate risk rules for equity trades and options contracts.
        </p>
      </div>

      {/* Missing values callout */}
      <div className="flex items-center justify-between gap-4 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3">
        <div className="flex items-center gap-3">
          <LuTriangleAlert className="h-4 w-4 shrink-0 text-warning" />
          <div>
            <p className="font-mono text-[.68rem] font-bold text-text-primary">Missing Values in Copy Trading</p>
            <p className="font-mono text-[.62rem] text-text-muted">
              Set defaults for when SL, TP, or size is absent from a parsed signal.
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate(ROUTES.COPY_TRADING_MISSING_FIELDS)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-sm border border-warning/40 bg-warning/10 px-3 py-1.5 font-mono text-[.65rem] font-bold uppercase tracking-widest text-warning transition-colors hover:bg-warning/20"
        >
          Manage <LuArrowRight className="h-3 w-3" />
        </button>
      </div>

      {/* Settings card with tabs */}
      <div className="rounded-lg border border-border-subtle bg-bg-surface shadow-card">
        <div className="px-5 pt-5">
          <ProfileSettingsTabs activeTab={activeTab} onTabChange={setActiveTab}>
            {isLoading ? (
              <div className="flex items-center gap-2 font-mono text-[.65rem] text-text-muted pb-5">
                <LuLoader className="h-3.5 w-3.5 animate-spin" /> Loading settings…
              </div>
            ) : isError ? (
              <div className="rounded-sm border border-bear/30 bg-bear/10 px-3 py-2 font-mono text-[.65rem] text-bear mb-5">
                Couldn't load validator settings. {apiErr(loadError)}
              </div>
            ) : activeTab === "equity" ? (
              <ValidatorForm config={equityConfig} onChange={setEquityConfig} options={optionsQuery.data} />
            ) : (
              <OptionsValidatorForm config={optionsConfig} onChange={setOptionsConfig} />
            )}

            <div className="mt-6 mb-5 flex justify-end">
              <button
                onClick={onSave}
                disabled={saveMut.isPending || isLoading}
                className="inline-flex items-center gap-2 rounded-sm bg-accent px-5 py-2.5 font-mono text-[.68rem] font-bold uppercase tracking-widest text-bg-base transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saveMut.isPending && <LuLoader className="h-3.5 w-3.5 animate-spin" />}
                Save {activeTab === "equity" ? "Equity" : "Options"} settings
              </button>
            </div>
          </ProfileSettingsTabs>
        </div>
      </div>

      {/* Preview */}
      <PreviewPanel draftConfig={equityConfig} />

      {/* Per-source overrides */}
      <SourceOverrides options={optionsQuery.data} />
    </div>
  );
}
