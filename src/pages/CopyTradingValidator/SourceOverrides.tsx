// src/pages/CopyTradingValidator/SourceOverrides.tsx
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LuLoader, LuX, LuPencil } from "react-icons/lu";
import axios from "axios";
import { copyValidatorApi } from "@/api/endpoints/copyValidator";
import { copyTradingApi } from "@/api/endpoints/copyTrading";
import { discordCopierApi } from "@/api/endpoints/discordCopyTrading";
import { qk } from "@/api/queryKeys";
import { toast } from "@/components/ui/Toast";
import type { Platform, ValidatorConfigBody, ValidatorOptions } from "@/types/copyValidator";
import ValidatorForm, { normalizeConfig } from "./ValidatorForm";
import { serializeConfig, validateConfig } from "./serialize";

interface Row {
  platform: Platform;
  sourceId: string;
  title: string;
}

function apiErr(err: unknown): string {
  if (axios.isAxiosError(err)) return err.response?.data?.message ?? err.response?.data?.code ?? "Something went wrong.";
  return "Something went wrong.";
}

export default function SourceOverrides({ options }: { options?: ValidatorOptions | undefined }) {
  const tgSources = useQuery({ queryKey: qk.copyTradingSources(), queryFn: copyTradingApi.listSources });
  const dcSources = useQuery({ queryKey: qk.discordSources(), queryFn: discordCopierApi.listSources });
  const configs = useQuery({ queryKey: qk.copyValidatorSources(), queryFn: copyValidatorApi.listSourceConfigs });

  const [editing, setEditing] = useState<Row | null>(null);

  const rows: Row[] = [
    ...(tgSources.data ?? []).map((s) => ({
      platform: "telegram" as const,
      sourceId: s.id,
      title: s.title || s.username || s.chatId,
    })),
    ...(dcSources.data ?? []).map((s) => ({
      platform: "discord" as const,
      sourceId: s.id,
      title: [s.guildName, s.channelName].filter(Boolean).join(" / ") || s.channelId,
    })),
  ];

  const hasCustom = (r: Row) =>
    (configs.data ?? []).some((c) => c.platform === r.platform && c.sourceId === r.sourceId && c.hasCustomRules);

  const loading = tgSources.isLoading || dcSources.isLoading;

  return (
    <div className="rounded-lg border border-border-subtle bg-bg-surface p-5 shadow-card">
      <h2 className="mb-1 font-display font-bold text-text-primary">Per-channel overrides</h2>
      <p className="mb-4 font-mono text-[.63rem] text-text-muted">
        Apply stricter (or looser) rules to a single channel. Channels without an override use your global default.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 font-mono text-[.65rem] text-text-muted">
          <LuLoader className="h-3.5 w-3.5 animate-spin" /> Loading channels…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-sm border border-border-subtle bg-bg-elevated px-3 py-2 font-mono text-[.63rem] text-text-muted">
          No copied channels yet. Connect a Telegram or Discord channel first.
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-border-subtle">
          {rows.map((r) => {
            const custom = hasCustom(r);
            return (
              <li key={`${r.platform}:${r.sourceId}`} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <div className="truncate font-mono text-[.68rem] text-text-primary">{r.title}</div>
                  <div className="font-mono text-[.56rem] uppercase tracking-[.16em] text-text-disabled">
                    {r.platform}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-sm border px-2 py-0.5 font-mono text-[.54rem] uppercase tracking-widest ${
                      custom ? "border-accent/40 bg-accent-subtle text-accent" : "border-border-subtle text-text-muted"
                    }`}
                  >
                    {custom ? "Custom rules" : "Global default"}
                  </span>
                  <button
                    onClick={() => setEditing(r)}
                    className="inline-flex items-center gap-1 rounded-sm border border-border-default px-2 py-1 font-mono text-[.58rem] uppercase tracking-widest text-text-secondary transition-colors hover:border-accent hover:text-accent"
                  >
                    <LuPencil className="h-3 w-3" /> Rules
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editing && (
        <OverrideModal
          row={editing}
          options={options}
          hasCustom={hasCustom(editing)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function OverrideModal({
  row,
  options,
  hasCustom,
  onClose,
}: {
  row: Row;
  options?: ValidatorOptions | undefined;
  hasCustom: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [useCustom, setUseCustom] = useState(hasCustom);
  const [config, setConfig] = useState<Required<ValidatorConfigBody>>(normalizeConfig());

  const sourceConfig = useQuery({
    queryKey: qk.copyValidatorSource(row.platform, row.sourceId),
    queryFn: () => copyValidatorApi.getSourceConfig(row.platform, row.sourceId),
    enabled: hasCustom,
  });

  useEffect(() => {
    if (sourceConfig.data) setConfig(normalizeConfig(sourceConfig.data));
  }, [sourceConfig.data]);

  const saveMut = useMutation({
    mutationFn: (body: ValidatorConfigBody) => copyValidatorApi.updateSourceConfig(row.platform, row.sourceId, body),
    onSuccess: () => {
      toast.success("Channel rules saved");
      qc.invalidateQueries({ queryKey: qk.copyValidatorSources() });
      qc.invalidateQueries({ queryKey: qk.copyValidatorSource(row.platform, row.sourceId) });
      onClose();
    },
    onError: (e) => toast.error(apiErr(e)),
  });

  const clearMut = useMutation({
    mutationFn: () => copyValidatorApi.deleteSourceConfig(row.platform, row.sourceId),
    onSuccess: () => {
      toast.success("Reverted to global default");
      qc.invalidateQueries({ queryKey: qk.copyValidatorSources() });
      onClose();
    },
    onError: (e) => toast.error(apiErr(e)),
  });

  const onSave = () => {
    if (!useCustom) {
      clearMut.mutate();
      return;
    }
    const errs = validateConfig(config);
    if (errs.length) {
      toast.error(errs[0] ?? "Please fix the highlighted rules.");
      return;
    }
    saveMut.mutate(serializeConfig(config));
  };

  const busy = saveMut.isPending || clearMut.isPending;

  return (
    <div className="fixed inset-0 z-[900] flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:p-8" onClick={onClose}>
      <div
        className="my-auto w-full max-w-2xl rounded-lg border border-border-default bg-bg-surface shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3">
          <div>
            <h3 className="font-display font-bold text-text-primary">Validation rules</h3>
            <p className="font-mono text-[.6rem] text-text-muted">
              {row.title} · {row.platform}
            </p>
          </div>
          <button onClick={onClose} className="rounded-sm p-1 text-text-muted hover:bg-bg-elevated hover:text-text-secondary">
            <LuX className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4">
          <label className="mb-4 flex items-center gap-2">
            <input type="checkbox" checked={useCustom} onChange={(e) => setUseCustom(e.target.checked)} className="h-3.5 w-3.5 accent-[var(--color-accent)]" />
            <span className="font-mono text-[.68rem] text-text-secondary">Use custom rules for this channel only</span>
          </label>

          {useCustom ? (
            sourceConfig.isLoading && hasCustom ? (
              <div className="flex items-center gap-2 font-mono text-[.65rem] text-text-muted">
                <LuLoader className="h-3.5 w-3.5 animate-spin" /> Loading rules…
              </div>
            ) : (
              <ValidatorForm config={config} onChange={setConfig} options={options} />
            )
          ) : (
            <div className="rounded-sm border border-border-subtle bg-bg-elevated px-3 py-2 font-mono text-[.63rem] text-text-muted">
              This channel will use your global default rules. Saving will remove any custom override.
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border-subtle px-5 py-3">
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded-sm border border-border-default px-4 py-2 font-mono text-[.62rem] uppercase tracking-widest text-text-secondary hover:border-border-strong disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-sm bg-accent px-4 py-2 font-mono text-[.62rem] font-bold uppercase tracking-widest text-bg-base hover:bg-accent-hover disabled:opacity-50"
          >
            {busy && <LuLoader className="h-3.5 w-3.5 animate-spin" />}
            {useCustom ? "Save rules" : "Use global default"}
          </button>
        </div>
      </div>
    </div>
  );
}
