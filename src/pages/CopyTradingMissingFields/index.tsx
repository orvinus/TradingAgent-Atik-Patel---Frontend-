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
import MissingFieldsForm from "./MissingFieldsForm";
import MissingFieldsPreview from "./MissingFieldsPreview";
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

  const optionsQuery = useQuery({
    queryKey: qk.missingFieldsOptions(),
    queryFn: missingFieldsApi.getOptions,
    staleTime: 60 * 60 * 1000,
  });

  const configQuery = useQuery({
    queryKey: qk.missingFieldsConfig(),
    queryFn: missingFieldsApi.getConfig,
  });

  const [form, setForm] = useState<MissingFieldsFormState>(DEFAULT_FORM_STATE);

  useEffect(() => {
    if (configQuery.data) setForm(deserializeConfig(configQuery.data));
  }, [configQuery.data]);

  const saveMut = useMutation({
    mutationFn: (cfg: ReturnType<typeof serializeConfig>) =>
      missingFieldsApi.updateConfig(cfg),
    onSuccess: (saved) => {
      toast.success("Missing-field defaults saved");
      qc.setQueryData(qk.missingFieldsConfig(), saved);
    },
    onError: (e) => toast.error(apiErr(e)),
  });

  const onSave = () => {
    const errors = validateForm(form);
    if (errors.length) {
      toast.error(errors[0] ?? "Please fix the highlighted fields.");
      return;
    }
    saveMut.mutate(serializeConfig(form));
  };

  const isLoading = configQuery.isLoading || optionsQuery.isLoading;
  const isError = configQuery.isError;

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
          Configure what happens when SL, TP, or lot size is missing from a parsed signal.
        </p>

        {/* Relationship callout */}
        <div className="mt-3 flex items-start gap-2 rounded-sm border border-border-subtle bg-bg-elevated px-3 py-2">
          <LuLink className="mt-0.5 h-3 w-3 shrink-0 text-text-muted" />
          <p className="font-mono text-[.62rem] text-text-muted">
            Defaults fill missing values <strong className="text-text-secondary">first</strong>, then
            max % limits are enforced.{" "}
            <button
              onClick={() => navigate(ROUTES.COPY_TRADING_VALIDATOR)}
              className="text-accent hover:underline"
            >
              Configure Validation &amp; Limits →
            </button>
          </p>
        </div>
      </div>

      {/* Config form */}
      <div className="rounded-lg border border-border-subtle bg-bg-surface p-5 shadow-card">
        {isLoading ? (
          <div className="flex items-center gap-2 font-mono text-[.65rem] text-text-muted">
            <LuLoader className="h-3.5 w-3.5 animate-spin" /> Loading settings…
          </div>
        ) : isError ? (
          <div className="rounded-sm border border-bear/30 bg-bear/10 px-3 py-2 font-mono text-[.65rem] text-bear">
            Couldn't load missing-field config. {apiErr(configQuery.error)}
          </div>
        ) : (
          <>
            {/* Quick presets */}
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="font-mono text-[.58rem] uppercase tracking-widest text-text-muted">
                Quick preset:
              </span>
              <button
                onClick={() =>
                  setForm(
                    deserializeConfig({
                      sl:      { whenMissing: "use_default", defaultPctFromEntry: 5 },
                      tp:      { whenMissing: "use_default", defaultPctFromEntry: 10 },
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
                  setForm(
                    deserializeConfig({
                      sl:      { whenMissing: "reject" },
                      tp:      { whenMissing: "reject" },
                      lotSize: { whenMissing: "reject" },
                    }),
                  )
                }
                className="rounded-sm border border-border-default px-2.5 py-1 font-mono text-[.6rem] text-text-secondary hover:border-bear hover:text-bear"
              >
                Strict — reject all incomplete
              </button>
            </div>

            <MissingFieldsForm state={form} onChange={setForm} />

            <div className="mt-6 flex justify-end">
              <button
                onClick={onSave}
                disabled={saveMut.isPending}
                className="inline-flex items-center gap-2 rounded-sm bg-accent px-5 py-2.5 font-mono text-[.68rem] font-bold uppercase tracking-widest text-bg-base transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saveMut.isPending && <LuLoader className="h-3.5 w-3.5 animate-spin" />}
                Save defaults
              </button>
            </div>
          </>
        )}
      </div>

      {/* Preview panel */}
      <MissingFieldsPreview />
    </div>
  );
}
