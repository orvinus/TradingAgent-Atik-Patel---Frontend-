// src/pages/CopyTradingMissingFields/index.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LuArrowLeft, LuLoader, LuLink } from "react-icons/lu";
import axios from "axios";
import { missingFieldsApi } from "@/api/endpoints/missingFields";
import { qk } from "@/api/queryKeys";
import { ROUTES } from "@/constants/routes";
import { toast } from "@/components/ui/Toast";
import type { ValidatorProfile } from "@/types/copyValidator";
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
  const [activeTab, setActiveTab] = useState<ValidatorProfile>("equity");

  // ── Shared field-metadata ─────────────────────────────────────────────────
  const optionsQuery = useQuery({
    queryKey: qk.missingFieldsOptions(),
    queryFn: missingFieldsApi.getOptions,
    staleTime: 60 * 60 * 1000,
  });

  // ── Equity config ─────────────────────────────────────────────────────────
  const configQuery = useQuery({
    queryKey: qk.missingFieldsConfig(),
    queryFn: missingFieldsApi.getConfig,
  });
  const [equityForm, setEquityForm] = useState<MissingFieldsFormState>(DEFAULT_FORM_STATE);
  useEffect(() => {
    if (configQuery.data) setEquityForm(deserializeConfig(configQuery.data));
  }, [configQuery.data]);

  // ── Commodity + Crypto config — from full config object ───────────────────
  const fullConfigQuery = useQuery({
    queryKey: qk.missingFieldsFullConfig(),
    queryFn: missingFieldsApi.getFullConfig,
  });
  const [commodityForm, setCommodityForm] = useState<MissingFieldsFormState>(DEFAULT_FORM_STATE);
  const [cryptoForm, setCryptoForm] = useState<MissingFieldsFormState>(DEFAULT_FORM_STATE);

  useEffect(() => {
    if (fullConfigQuery.data) {
      if (fullConfigQuery.data.commodityMissingFields) {
        setCommodityForm(deserializeConfig(fullConfigQuery.data.commodityMissingFields));
      }
      if (fullConfigQuery.data.cryptoMissingFields) {
        setCryptoForm(deserializeConfig(fullConfigQuery.data.cryptoMissingFields));
      }
    }
  }, [fullConfigQuery.data]);

  // ── Options config ────────────────────────────────────────────────────────
  const optionsConfigQuery = useQuery({
    queryKey: qk.missingFieldsOptionsConfig(),
    queryFn: missingFieldsApi.getOptionsConfig,
  });
  const [optionsForm, setOptionsForm] = useState<OptionsMissingFieldsFormState>(DEFAULT_OPTIONS_FORM_STATE);
  useEffect(() => {
    if (optionsConfigQuery.data) {
      setOptionsForm(deserializeOptionsConfig(optionsConfigQuery.data as Record<string, unknown>));
    }
  }, [optionsConfigQuery.data]);

  // ── Save handlers ─────────────────────────────────────────────────────────
  const equitySaveMut = useMutation({
    mutationFn: (cfg: ReturnType<typeof serializeConfig>) => missingFieldsApi.updateConfig(cfg),
    onSuccess: (saved) => {
      toast.success("Equity missing-field defaults saved");
      qc.setQueryData(qk.missingFieldsConfig(), saved);
    },
    onError: (e) => toast.error(apiErr(e)),
  });

  const commoditySaveMut = useMutation({
    mutationFn: (cfg: ReturnType<typeof serializeConfig>) => missingFieldsApi.updateCommodityConfig(cfg),
    onSuccess: () => {
      toast.success("Commodity missing-field defaults saved");
      qc.invalidateQueries({ queryKey: qk.missingFieldsFullConfig() });
    },
    onError: (e) => toast.error(apiErr(e)),
  });

  const cryptoSaveMut = useMutation({
    mutationFn: (cfg: ReturnType<typeof serializeConfig>) => missingFieldsApi.updateCryptoConfig(cfg),
    onSuccess: () => {
      toast.success("Crypto missing-field defaults saved");
      qc.invalidateQueries({ queryKey: qk.missingFieldsFullConfig() });
    },
    onError: (e) => toast.error(apiErr(e)),
  });

  const optionsSaveMut = useMutation({
    mutationFn: missingFieldsApi.updateOptionsConfig,
    onSuccess: () => {
      toast.success("Options missing-field defaults saved");
      qc.invalidateQueries({ queryKey: qk.missingFieldsOptionsConfig() });
    },
    onError: (e) => toast.error(apiErr(e)),
  });

  const onSave = () => {
    if (activeTab === "equity") {
      const errors = validateForm(equityForm);
      if (errors.length) { toast.error(errors[0] ?? "Please fix the highlighted fields."); return; }
      equitySaveMut.mutate(serializeConfig(equityForm));
    } else if (activeTab === "commodity") {
      const errors = validateForm(commodityForm);
      if (errors.length) { toast.error(errors[0] ?? "Please fix the highlighted fields."); return; }
      commoditySaveMut.mutate(serializeConfig(commodityForm));
    } else if (activeTab === "crypto") {
      const errors = validateForm(cryptoForm);
      if (errors.length) { toast.error(errors[0] ?? "Please fix the highlighted fields."); return; }
      cryptoSaveMut.mutate(serializeConfig(cryptoForm));
    } else {
      const errors = validateOptionsForm(optionsForm);
      if (errors.length) { toast.error(errors[0] ?? "Please fix the highlighted fields."); return; }
      optionsSaveMut.mutate(serializeOptionsConfig(optionsForm));
    }
  };

  const isLoading = {
    equity: configQuery.isLoading || optionsQuery.isLoading,
    commodity: fullConfigQuery.isLoading || optionsQuery.isLoading,
    crypto: fullConfigQuery.isLoading || optionsQuery.isLoading,
    options: optionsConfigQuery.isLoading,
  }[activeTab];

  const isError = {
    equity: configQuery.isError,
    commodity: fullConfigQuery.isError,
    crypto: fullConfigQuery.isError,
    options: optionsConfigQuery.isError,
  }[activeTab];

  const isSaving = {
    equity: equitySaveMut.isPending,
    commodity: commoditySaveMut.isPending,
    crypto: cryptoSaveMut.isPending,
    options: optionsSaveMut.isPending,
  }[activeTab];

  const saveLabel = { equity: "Equity", commodity: "Commodity", crypto: "Crypto", options: "Options" }[activeTab];

  // Quick presets for lot-based profiles
  const safeDefaultsPreset = (setter: (s: MissingFieldsFormState) => void, defaultLots = "1") =>
    setter(
      deserializeConfig({
        entry: { whenMissing: "use_market" },
        sl: { whenMissing: "use_default", defaultPctFromEntry: 5 },
        tp: { whenMissing: "use_default", defaultPctFromEntry: 10 },
        lotSize: { whenMissing: "use_default", defaultLots: Number(defaultLots) },
      }),
    );

  const strictPreset = (setter: (s: MissingFieldsFormState) => void) =>
    setter(
      deserializeConfig({
        entry: { whenMissing: "reject" },
        sl: { whenMissing: "reject" },
        tp: { whenMissing: "reject" },
        lotSize: { whenMissing: "reject" },
      }),
    );

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
          Configure defaults for when SL, TP, or size is missing — separately per asset class.
        </p>

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
            ) : activeTab === "options" ? (
              <>
                <div className="mb-5 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[.58rem] uppercase tracking-widest text-text-muted">Quick preset:</span>
                  <button
                    onClick={() =>
                      setOptionsForm({
                        entry: { whenMissing: "use_market", defaultPremium: "" },
                        sl: { whenMissing: "use_default", defaultPctFromEntry: "20" },
                        tp: { whenMissing: "allow_empty", priceMode: "pct", defaultPctFromEntry: "", fixed: "", multiTp: false, tpLevels: [{ pctFromEntry: "", exit_pct: "" }] },
                        contractSize: { whenMissing: "use_default", defaultContracts: "1" },
                        exitQty: { whenMissing: "use_default", defaultExitPct: "50" },
                        expiry: { whenMissing: "use_default", defaultExpiryToken: "nearest" },
                      })
                    }
                    className="rounded-sm border border-border-default px-2.5 py-1 font-mono text-[.6rem] text-text-secondary hover:border-purple-400 hover:text-purple-400"
                  >
                    Safe defaults (market · 20% SL · allow TP empty · 1 contract)
                  </button>
                  <button
                    onClick={() =>
                      setOptionsForm({
                        entry: { whenMissing: "reject", defaultPremium: "" },
                        sl: { whenMissing: "reject", defaultPctFromEntry: "" },
                        tp: { whenMissing: "reject", priceMode: "pct", defaultPctFromEntry: "", fixed: "", multiTp: false, tpLevels: [{ pctFromEntry: "", exit_pct: "" }] },
                        contractSize: { whenMissing: "reject", defaultContracts: "" },
                        exitQty: { whenMissing: "reject", defaultExitPct: "" },
                        expiry: { whenMissing: "reject", defaultExpiryToken: "nearest" },
                      })
                    }
                    className="rounded-sm border border-border-default px-2.5 py-1 font-mono text-[.6rem] text-text-secondary hover:border-bear hover:text-bear"
                  >
                    Strict — reject all incomplete
                  </button>
                </div>
                <OptionsMissingFieldsForm state={optionsForm} onChange={setOptionsForm} />
              </>
            ) : activeTab === "commodity" ? (
              <>
                <p className="mb-4 font-mono text-[.62rem] text-text-muted">
                  Defaults for spot commodity signals (XAUUSD, XAGUSD, WTI, etc.). Size unit: <strong>lots</strong>.
                </p>
                <div className="mb-5 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[.58rem] uppercase tracking-widest text-text-muted">Quick preset:</span>
                  <button
                    onClick={() => safeDefaultsPreset(setCommodityForm, "0.1")}
                    className="rounded-sm border border-border-default px-2.5 py-1 font-mono text-[.6rem] text-text-secondary hover:border-amber-400 hover:text-amber-400"
                  >
                    Safe defaults (market · 5% SL · 10% TP · 0.1 lots)
                  </button>
                  <button
                    onClick={() => strictPreset(setCommodityForm)}
                    className="rounded-sm border border-border-default px-2.5 py-1 font-mono text-[.6rem] text-text-secondary hover:border-bear hover:text-bear"
                  >
                    Strict — reject all incomplete
                  </button>
                </div>
                <MissingFieldsForm state={commodityForm} onChange={setCommodityForm} />
              </>
            ) : activeTab === "crypto" ? (
              <>
                <p className="mb-4 font-mono text-[.62rem] text-text-muted">
                  Defaults for crypto spot and perp signals (BTC, ETH, etc.). Size unit: <strong>units</strong>.
                </p>
                <div className="mb-5 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[.58rem] uppercase tracking-widest text-text-muted">Quick preset:</span>
                  <button
                    onClick={() => safeDefaultsPreset(setCryptoForm, "0.001")}
                    className="rounded-sm border border-border-default px-2.5 py-1 font-mono text-[.6rem] text-text-secondary hover:border-orange-400 hover:text-orange-400"
                  >
                    Safe defaults (market · 5% SL · 10% TP · 0.001 units)
                  </button>
                  <button
                    onClick={() => strictPreset(setCryptoForm)}
                    className="rounded-sm border border-border-default px-2.5 py-1 font-mono text-[.6rem] text-text-secondary hover:border-bear hover:text-bear"
                  >
                    Strict — reject all incomplete
                  </button>
                </div>
                <MissingFieldsForm state={cryptoForm} onChange={setCryptoForm} />
              </>
            ) : (
              <>
                <div className="mb-5 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[.58rem] uppercase tracking-widest text-text-muted">Quick preset:</span>
                  <button
                    onClick={() => safeDefaultsPreset(setEquityForm, "1")}
                    className="rounded-sm border border-border-default px-2.5 py-1 font-mono text-[.6rem] text-text-secondary hover:border-accent hover:text-accent"
                  >
                    Safe defaults (market · 5% SL · 10% TP · 1 lot)
                  </button>
                  <button
                    onClick={() => strictPreset(setEquityForm)}
                    className="rounded-sm border border-border-default px-2.5 py-1 font-mono text-[.6rem] text-text-secondary hover:border-bear hover:text-bear"
                  >
                    Strict — reject all incomplete
                  </button>
                </div>
                <MissingFieldsForm state={equityForm} onChange={setEquityForm} />
              </>
            )}

            <div className="mt-6 mb-5 flex justify-end">
              <button
                onClick={onSave}
                disabled={isSaving || isLoading}
                className="inline-flex items-center gap-2 rounded-sm bg-accent px-5 py-2.5 font-mono text-[.68rem] font-bold uppercase tracking-widest text-bg-base transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving && <LuLoader className="h-3.5 w-3.5 animate-spin" />}
                Save {saveLabel} defaults
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
