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
import type { ValidatorConfigBody } from "@/types/copyValidator";
import ValidatorForm, { normalizeConfig } from "./ValidatorForm";
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

  const optionsQuery = useQuery({
    queryKey: qk.copyValidatorOptions(),
    queryFn: copyValidatorApi.getOptions,
    staleTime: 60 * 60 * 1000, // metadata rarely changes
  });

  const configQuery = useQuery({
    queryKey: qk.copyValidatorConfig(),
    queryFn: copyValidatorApi.getConfig,
  });

  const [config, setConfig] = useState<Required<ValidatorConfigBody>>(normalizeConfig());

  // Populate form state once the stored config loads.
  useEffect(() => {
    if (configQuery.data) setConfig(normalizeConfig(configQuery.data));
  }, [configQuery.data]);

  const saveMut = useMutation({
    mutationFn: (body: ValidatorConfigBody) => copyValidatorApi.updateConfig(body),
    onSuccess: (saved) => {
      toast.success("Validation settings saved");
      qc.setQueryData(qk.copyValidatorConfig(), saved);
    },
    onError: (e) => toast.error(apiErr(e)),
  });

  const onSave = () => {
    const errs = validateConfig(config);
    if (errs.length) {
      toast.error(errs[0] ?? "Please fix the highlighted rules.");
      return;
    }
    saveMut.mutate(serializeConfig(config));
  };

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
          Copy signals exactly, or apply per-field risk limits before they become orders.
        </p>
      </div>

      {/* Missing values callout */}
      <div className="flex items-center justify-between gap-4 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3">
        <div className="flex items-center gap-3">
          <LuTriangleAlert className="h-4 w-4 shrink-0 text-warning" />
          <div>
            <p className="font-mono text-[.68rem] font-bold text-text-primary">Missing Values in Copy Trading</p>
            <p className="font-mono text-[.62rem] text-text-muted">
              Set defaults for when SL, TP, or lot size is absent from a parsed signal.
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

      {/* Settings */}
      <div className="rounded-lg border border-border-subtle bg-bg-surface p-5 shadow-card">
        {configQuery.isLoading ? (
          <div className="flex items-center gap-2 font-mono text-[.65rem] text-text-muted">
            <LuLoader className="h-3.5 w-3.5 animate-spin" /> Loading settings…
          </div>
        ) : configQuery.isError ? (
          <div className="rounded-sm border border-bear/30 bg-bear/10 px-3 py-2 font-mono text-[.65rem] text-bear">
            Couldn't load validator settings. {apiErr(configQuery.error)}
          </div>
        ) : (
          <>
            <ValidatorForm config={config} onChange={setConfig} options={optionsQuery.data} />
            <div className="mt-6 flex justify-end">
              <button
                onClick={onSave}
                disabled={saveMut.isPending}
                className="inline-flex items-center gap-2 rounded-sm bg-accent px-5 py-2.5 font-mono text-[.68rem] font-bold uppercase tracking-widest text-bg-base transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saveMut.isPending && <LuLoader className="h-3.5 w-3.5 animate-spin" />}
                Save settings
              </button>
            </div>
          </>
        )}
      </div>

      {/* Preview */}
      <PreviewPanel draftConfig={config} />

      {/* Per-source overrides */}
      <SourceOverrides options={optionsQuery.data} />
    </div>
  );
}
