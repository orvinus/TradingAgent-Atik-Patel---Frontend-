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

const PROFILE_DESCRIPTIONS: Record<ValidatorProfile, string> = {
  equity: "Rules for equity, ETF, and FX signals (shares / lot size).",
  commodity: "FX and metals signals — gold, silver, oil, forex (lot size in lots). Separate from equity limits.",
  crypto: "Crypto spot and perps (units). Separate from equity limits.",
  options: "Futures and options contracts. Uses contract size and optional premium cap.",
};

export default function CopyTradingValidator() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<ValidatorProfile>("equity");

  const optionsQuery = useQuery({
    queryKey: qk.copyValidatorOptions(),
    queryFn: copyValidatorApi.getOptions,
    staleTime: 60 * 60 * 1000,
  });

  // ── Per-profile queries ──────────────────────────────────────────────────────
  const equityConfigQuery = useQuery({
    queryKey: qk.copyValidatorConfigProfile("equity"),
    queryFn: () => copyValidatorApi.getConfigWithProfile("equity"),
  });
  const commodityConfigQuery = useQuery({
    queryKey: qk.copyValidatorConfigProfile("commodity"),
    queryFn: () => copyValidatorApi.getConfigWithProfile("commodity"),
  });
  const cryptoConfigQuery = useQuery({
    queryKey: qk.copyValidatorConfigProfile("crypto"),
    queryFn: () => copyValidatorApi.getConfigWithProfile("crypto"),
  });
  const optionsConfigQuery = useQuery({
    queryKey: qk.copyValidatorConfigProfile("options"),
    queryFn: () => copyValidatorApi.getConfigWithProfile("options"),
  });

  // ── Per-profile local state ──────────────────────────────────────────────────
  const [equityConfig, setEquityConfig] = useState<NormalizedValidatorConfig>(normalizeConfig());
  const [commodityConfig, setCommodityConfig] = useState<NormalizedValidatorConfig>(normalizeConfig());
  const [cryptoConfig, setCryptoConfig] = useState<NormalizedValidatorConfig>(normalizeConfig());
  const [optionsConfig, setOptionsConfig] = useState<Required<ProfileConfig>>(normalizeOptionsConfig());

  const extractProfile = (data: unknown): ProfileConfig | undefined => {
    const d = data as { savedProfileConfig?: ProfileConfig; effectiveConfig?: ProfileConfig } | undefined;
    return d?.savedProfileConfig ?? d?.effectiveConfig;
  };

  useEffect(() => {
    if (equityConfigQuery.data) {
      const p = extractProfile(equityConfigQuery.data);
      setEquityConfig(normalizeConfig(p));
    }
  }, [equityConfigQuery.data]);

  useEffect(() => {
    if (commodityConfigQuery.data) {
      const p = extractProfile(commodityConfigQuery.data);
      setCommodityConfig(normalizeConfig(p));
    }
  }, [commodityConfigQuery.data]);

  useEffect(() => {
    if (cryptoConfigQuery.data) {
      const p = extractProfile(cryptoConfigQuery.data);
      setCryptoConfig(normalizeConfig(p));
    }
  }, [cryptoConfigQuery.data]);

  useEffect(() => {
    if (optionsConfigQuery.data) {
      const p = extractProfile(optionsConfigQuery.data);
      setOptionsConfig(normalizeOptionsConfig(p));
    }
  }, [optionsConfigQuery.data]);

  // ── Save mutation ────────────────────────────────────────────────────────────
  const saveMut = useMutation({
    mutationFn: ({ body, profile }: { body: ValidatorConfigBody; profile: ValidatorProfile }) =>
      copyValidatorApi.updateConfig(body, profile),
    onSuccess: () => {
      toast.success("Validation settings saved");
      qc.invalidateQueries({ queryKey: qk.copyValidatorConfigProfile(activeTab) });
    },
    onError: (e) => toast.error(apiErr(e)),
  });

  const onSave = () => {
    if (activeTab === "options") {
      const symInc = optionsConfig.symbolFilter?.include?.trim() ?? "";
      const symExc = optionsConfig.symbolFilter?.exclude?.trim() ?? "";
      const msgInc = optionsConfig.messageFilter?.include?.trim() ?? "";
      const msgExc = optionsConfig.messageFilter?.exclude?.trim() ?? "";
      saveMut.mutate({
        profile: "options",
        body: {
          profiles: {
            options: {
              executionMode: optionsConfig.executionMode,
              onViolation: optionsConfig.onViolation,
              fields: optionsConfig.fields,
              symbolFilter: { ...(symInc ? { include: symInc } : {}), ...(symExc ? { exclude: symExc } : {}) },
              messageFilter: { ...(msgInc ? { include: msgInc } : {}), ...(msgExc ? { exclude: msgExc } : {}) },
            },
          },
        },
      });
      return;
    }

    const cfg = activeTab === "equity" ? equityConfig : activeTab === "commodity" ? commodityConfig : cryptoConfig;
    const errs = validateConfig(cfg);
    if (errs.length) { toast.error(errs[0] ?? "Please fix the highlighted rules."); return; }
    saveMut.mutate({ body: { profiles: { [activeTab]: serializeConfig(cfg) } }, profile: activeTab });
  };

  const activeQuery = {
    equity: equityConfigQuery,
    commodity: commodityConfigQuery,
    crypto: cryptoConfigQuery,
    options: optionsConfigQuery,
  }[activeTab];

  const isLoading = activeQuery.isLoading;
  const isError = activeQuery.isError;
  const loadError = activeQuery.error;

  const saveLabel = { equity: "Equity", commodity: "FX & Metals", crypto: "Crypto", options: "Futures & Options" }[activeTab];

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
          Apply separate risk rules for each asset class: equity, commodity, crypto, and futures &amp; options.
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
            {/* Profile description */}
            <p className="mb-4 font-mono text-[.63rem] text-text-muted">
              {PROFILE_DESCRIPTIONS[activeTab]}
            </p>

            {isLoading ? (
              <div className="flex items-center gap-2 font-mono text-[.65rem] text-text-muted pb-5">
                <LuLoader className="h-3.5 w-3.5 animate-spin" /> Loading settings…
              </div>
            ) : isError ? (
              <div className="rounded-sm border border-bear/30 bg-bear/10 px-3 py-2 font-mono text-[.65rem] text-bear mb-5">
                Couldn't load validator settings. {apiErr(loadError)}
              </div>
            ) : activeTab === "options" ? (
              <OptionsValidatorForm
                config={optionsConfig}
                onChange={setOptionsConfig}
                {...(optionsQuery.data?.messageFilter?.suggestedExcludeDefaults != null
                  ? { suggestedMessagePhrases: optionsQuery.data.messageFilter.suggestedExcludeDefaults }
                  : {})}
              />
            ) : activeTab === "commodity" ? (
              <ValidatorForm
                config={commodityConfig}
                onChange={setCommodityConfig}
                options={optionsQuery.data}
                profile="commodity"
                {...(optionsQuery.data?.messageFilter?.suggestedExcludeDefaults != null
                  ? { suggestedMessagePhrases: optionsQuery.data.messageFilter.suggestedExcludeDefaults }
                  : {})}
              />
            ) : activeTab === "crypto" ? (
              <ValidatorForm
                config={cryptoConfig}
                onChange={setCryptoConfig}
                options={optionsQuery.data}
                profile="crypto"
                {...(optionsQuery.data?.messageFilter?.suggestedExcludeDefaults != null
                  ? { suggestedMessagePhrases: optionsQuery.data.messageFilter.suggestedExcludeDefaults }
                  : {})}
              />
            ) : (
              <ValidatorForm
                config={equityConfig}
                onChange={setEquityConfig}
                options={optionsQuery.data}
                profile="equity"
                {...(optionsQuery.data?.messageFilter?.suggestedExcludeDefaults != null
                  ? { suggestedMessagePhrases: optionsQuery.data.messageFilter.suggestedExcludeDefaults }
                  : {})}
              />
            )}

            <div className="mt-6 mb-5 flex justify-end">
              <button
                onClick={onSave}
                disabled={saveMut.isPending || isLoading}
                className="inline-flex items-center gap-2 rounded-sm bg-accent px-5 py-2.5 font-mono text-[.68rem] font-bold uppercase tracking-widest text-bg-base transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saveMut.isPending && <LuLoader className="h-3.5 w-3.5 animate-spin" />}
                Save {saveLabel} settings
              </button>
            </div>
          </ProfileSettingsTabs>
        </div>
      </div>

      {/* Preview — equity only for now */}
      {activeTab === "equity" && <PreviewPanel draftConfig={equityConfig} />}

      {/* Per-source overrides */}
      <SourceOverrides options={optionsQuery.data} />
    </div>
  );
}
