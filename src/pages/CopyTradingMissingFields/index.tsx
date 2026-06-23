// src/pages/CopyTradingMissingFields/index.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LuArrowLeft, LuLoader, LuLink } from "react-icons/lu";
import axios from "axios";
import { missingFieldsApi } from "@/api/endpoints/missingFields";
import { copyValidatorApi } from "@/api/endpoints/copyValidator";
import { qk } from "@/api/queryKeys";
import { ROUTES } from "@/constants/routes";
import { toast } from "@/components/ui/Toast";
import { ProfileSettingsTabs } from "@/components/copy-trading/ProfileSettingsTabs";
import MissingFieldsForm from "./MissingFieldsForm";
import MissingFieldsPreview from "./MissingFieldsPreview";
import OptionsMissingFieldsForm, {
  DEFAULT_OPTIONS_FORM_STATE,
  deserializeOptionsConfig,
  serializeOptionsConfig,
  validateOptionsForm,
  type OptionsMissingFieldsFormState,
} from "./OptionsMissingFieldsForm";
import {
  DEFAULT_FORM_STATE,
  deserializeConfig,
  serializeConfig,
  validateForm,
  type MissingFieldsFormState,
} from "./types";

function apiErr(err: unknown): string {
  if (axios.isAxiosError(err))
    return err.response?.data?.message ?? err.response?.data?.code ?? "Something went wrong.";
  return "Something went wrong.";
}

export default function CopyTradingMissingFields() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"equity" | "options">("equity");

  // ── Equity tab data ───────────────────────────────────────────────────────
  const optionsQuery = useQuery({
    queryKey: qk.missingFieldsOptions(),
    queryFn: missingFieldsApi.getOptions,
    staleTime: 60 * 60 * 1000,
  });

  const configQuery = useQuery({
    queryKey: qk.missingFieldsConfig(),
    queryFn: missingFieldsApi.getConfig,
  });

  const [equityForm, setEquityForm] = useState<MissingFieldsFormState>(DEFAULT_FORM_STATE);

  useEffect(() => {
    if (configQuery.data) setEquityForm(deserializeConfig(configQuery.data));
  }, [configQuery.data]);

  // ── Options tab data — stored inside validator config profiles.options.missingFields ──
  const optionsValidatorConfigQuery = useQuery({
    queryKey: qk.copyValidatorConfigProfile("options"),
    queryFn: () => copyValidatorApi.getConfig("options"),
  });

  const [optionsForm, setOptionsForm] = useState<OptionsMissingFieldsFormState>(DEFAULT_OPTIONS_FORM_STATE);

  useEffect(() => {
    if (optionsValidatorConfigQuery.data) {
      const data = optionsValidatorConfigQuery.data as {
        profiles?: { options?: { missingFields?: Record<string, unknown> } };
        effectiveConfig?: { missingFields?: Record<string, unknown> };
      };
      const mf = data.effectiveConfig?.missingFields
        ?? data.profiles?.options?.missingFields
        ?? null;
      setOptionsForm(deserializeOptionsConfig(mf as Record<string, unknown>));
    }
  }, [optionsValidatorConfigQuery.data]);

  // ── Save handlers ─────────────────────────────────────────────────────────
  const equitySaveMut = useMutation({
    mutationFn: (cfg: ReturnType<typeof serializeConfig>) => missingFieldsApi.updateConfig(cfg),
    onSuccess: (saved) => {
      toast.success("Equity missing-field defaults saved");
      qc.setQueryData(qk.missingFieldsConfig(), saved);
    },
    onError: (e) => toast.error(apiErr(e)),
  });

  const optionsSaveMut = useMutation({
    mutationFn: (body: { profiles: { options: { missingFields: Record<string, unknown> } } }) => copyValidatorApi.updateConfig(body as Parameters<typeof copyValidatorApi.updateConfig>[0]),
    onSuccess: () => {
      toast.success("Options missing-field defaults saved");
      qc.invalidateQueries({ queryKey: qk.copyValidatorConfigProfile("options") });
    },
    onError: (e) => toast.error(apiErr(e)),
  });

  const onSave = () => {
    if (activeTab === "equity") {
      const errors = validateForm(equityForm);
      if (errors.length) { toast.error(errors[0] ?? "Please fix the highlighted fields."); return; }
      equitySaveMut.mutate(serializeConfig(equityForm));
    } else {
      const errors = validateOptionsForm(optionsForm);
      if (errors.length) { toast.error(errors[0] ?? "Please fix the highlighted fields."); return; }
      const serialized = serializeOptionsConfig(optionsForm);
      optionsSaveMut.mutate({ profiles: { options: serialized as { missingFields: Record<string, unknown> } } });
    }
  };

  const isEquityLoading = configQuery.isLoading || optionsQuery.isLoading;
  const isOptionsLoading = optionsValidatorConfigQuery.isLoading;
  const isLoading = activeTab === "equity" ? isEquityLoading : isOptionsLoading;
  const isError = activeTab === "equity" ? configQuery.isError : optionsValidatorConfigQuery.isError;
  const isSaving = activeTab === "equity" ? equitySaveMut.isPending : optionsSaveMut.isPending;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate(ROUTES.COPY_TRADING)}
          className="mb-3 flex w-fit items-center gap-1.5 font-mono text-[.65rem] text-text-muted transition-colors hover:text-text-secondary"
        >
          <LuArrowLeft className="h-3 w-3" /> Copy Trading
        </button>
        <h1 className="font-display text-xl font-bold uppercase tracking-[.12em] text-text-primary">
          Incomplete Signals
        </h1>
        <p className="mt-1 font-mono text-[.7rem] text-text-muted">
          Configure what happens when SL, TP, or size is missing from a parsed signal — separately for equity and options.
        </p>

        {/* Relationship callout */}
        <div className="mt-3 flex items-start gap-2 rounded-sm border border-border-subtle bg-bg-elevated px-3 py-2">
          <LuLink className="mt-0.5 h-3 w-3 shrink-0 text-text-muted" />
          <p className="font-mono text-[.62rem] text-text-muted">
            Defaults fill missing values <strong className="text-text-secondary">first</strong>, then max % limits are
            enforced.{" "}
            <button
              onClick={() => navigate(ROUTES.COPY_TRADING_VALIDATOR)}
              className="text-accent hover:underline"
            >
              Configure Validation &amp; Limits →
            </button>
          </p>
        </div>
      </div>

      {/* Config form with tabs */}
      <div className="rounded-lg border border-border-subtle bg-bg-surface shadow-card">
        <div className="px-5 pt-5">
          <ProfileSettingsTabs activeTab={activeTab} onTabChange={setActiveTab}>
            {isLoading ? (
              <div className="flex items-center gap-2 font-mono text-[.65rem] text-text-muted pb-5">
                <LuLoader className="h-3.5 w-3.5 animate-spin" /> Loading settings…
              </div>
            ) : isError ? (
              <div className="rounded-sm border border-bear/30 bg-bear/10 px-3 py-2 font-mono text-[.65rem] text-bear mb-5">
                Couldn't load missing-field config.
              </div>
            ) : activeTab === "equity" ? (
              <>
                {/* Quick presets */}
                <div className="mb-5 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[.58rem] uppercase tracking-widest text-text-muted">Quick preset:</span>
                  <button
                    onClick={() =>
                      setEquityForm(
                        deserializeConfig({
                          sl: { whenMissing: "use_default", defaultPctFromEntry: 5 },
                          tp: { whenMissing: "use_default", defaultPctFromEntry: 10 },
                          lotSize: { whenMissing: "use_default", defaultLots: 1 },
                        }),
                      )
                    }
                    className="rounded-sm border border-border-default px-2.5 py-1 font-mono text-[.6rem] text-text-secondary hover:border-accent hover:text-accent"
                  >
                    Safe defaults (5% SL · 10% TP · 1 lot)
                  </button>
                  <button
                    onClick={() =>
                      setEquityForm(
                        deserializeConfig({
                          sl: { whenMissing: "reject" },
                          tp: { whenMissing: "reject" },
                          lotSize: { whenMissing: "reject" },
                        }),
                      )
                    }
                    className="rounded-sm border border-border-default px-2.5 py-1 font-mono text-[.6rem] text-text-secondary hover:border-bear hover:text-bear"
                  >
                    Strict — reject all incomplete
                  </button>
                </div>
                <MissingFieldsForm state={equityForm} onChange={setEquityForm} />
              </>
            ) : (
              <>
                {/* Options presets */}
                <div className="mb-5 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[.58rem] uppercase tracking-widest text-text-muted">Quick preset:</span>
                  <button
                    onClick={() =>
                      setOptionsForm({
                        sl: { whenMissing: "use_default", defaultPctFromEntry: "20" },
                        tp: { whenMissing: "allow_empty", defaultPctFromEntry: "" },
                        contractSize: { whenMissing: "use_default", defaultContracts: "1" },
                      })
                    }
                    className="rounded-sm border border-border-default px-2.5 py-1 font-mono text-[.6rem] text-text-secondary hover:border-purple-400 hover:text-purple-400"
                  >
                    Safe defaults (20% SL · allow TP empty · 1 contract)
                  </button>
                  <button
                    onClick={() =>
                      setOptionsForm({
                        sl: { whenMissing: "reject", defaultPctFromEntry: "" },
                        tp: { whenMissing: "reject", defaultPctFromEntry: "" },
                        contractSize: { whenMissing: "reject", defaultContracts: "" },
                      })
                    }
                    className="rounded-sm border border-border-default px-2.5 py-1 font-mono text-[.6rem] text-text-secondary hover:border-bear hover:text-bear"
                  >
                    Strict — reject all incomplete
                  </button>
                </div>
                <OptionsMissingFieldsForm state={optionsForm} onChange={setOptionsForm} />
              </>
            )}

            <div className="mt-6 mb-5 flex justify-end">
              <button
                onClick={onSave}
                disabled={isSaving || isLoading}
                className="inline-flex items-center gap-2 rounded-sm bg-accent px-5 py-2.5 font-mono text-[.68rem] font-bold uppercase tracking-widest text-bg-base transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving && <LuLoader className="h-3.5 w-3.5 animate-spin" />}
                Save {activeTab === "equity" ? "Equity" : "Options"} defaults
              </button>
            </div>
          </ProfileSettingsTabs>
        </div>
      </div>

      {/* Preview panel — equity only for now */}
      {activeTab === "equity" && <MissingFieldsPreview />}
    </div>
  );
}
