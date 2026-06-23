// src/pages/CopyTradingValidator/SourceOverrides.tsx
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LuLoader, LuX, LuPencil, LuRotateCcw, LuTriangle } from "react-icons/lu";
import axios from "axios";
import { copyValidatorApi } from "@/api/endpoints/copyValidator";
import { copyTradingApi } from "@/api/endpoints/copyTrading";
import { discordCopierApi } from "@/api/endpoints/discordCopyTrading";
import { qk } from "@/api/queryKeys";
import { toast } from "@/components/ui/Toast";
import type {
  NormalizedValidatorConfig,
  Platform,
  ProfileConfig,
  SourceConfigSummary,
  ValidatorConfigBody,
  ValidatorOptions,
} from "@/types/copyValidator";
import ValidatorForm, { normalizeConfig } from "./ValidatorForm";
import OptionsValidatorForm, { normalizeOptionsConfig } from "./OptionsValidatorForm";
import { serializeConfig, validateConfig } from "./serialize";
import { ProfileSettingsTabs } from "@/components/copy-trading/ProfileSettingsTabs";

interface Row {
  platform: Platform;
  sourceId: string;
  title: string;
}

function apiErr(err: unknown): string {
  if (axios.isAxiosError(err)) return err.response?.data?.message ?? err.response?.data?.code ?? "Something went wrong.";
  return "Something went wrong.";
}

// ── Badge helpers ─────────────────────────────────────────────────────────────

function getBadgeInfo(summary?: SourceConfigSummary) {
  if (!summary?.hasCustomRules) return { equityCustom: false, optionsCustom: false };
  const c = summary.config;
  return {
    equityCustom: !!(c?.profiles?.equity || c?.fields),
    optionsCustom: !!c?.profiles?.options,
  };
}

function ProfileBadge({ summary }: { summary?: SourceConfigSummary | undefined }) {
  const { equityCustom, optionsCustom } = getBadgeInfo(summary);
  if (!equityCustom && !optionsCustom) {
    return (
      <span className="rounded-sm border border-border-subtle px-2 py-0.5 font-mono text-[.54rem] uppercase tracking-widest text-text-muted">
        Global default
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1">
      {equityCustom && (
        <span className="rounded-sm border border-blue-500/40 bg-blue-500/10 px-2 py-0.5 font-mono text-[.54rem] uppercase tracking-widest text-blue-400">
          {optionsCustom ? "Equity" : "Custom (Equity)"}
        </span>
      )}
      {optionsCustom && (
        <span className="rounded-sm border border-purple-500/40 bg-purple-500/10 px-2 py-0.5 font-mono text-[.54rem] uppercase tracking-widest text-purple-400">
          {equityCustom ? "Options" : "Custom (Options)"}
        </span>
      )}
    </span>
  );
}

// ── Main list ─────────────────────────────────────────────────────────────────

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

  const getSummary = (r: Row) =>
    (configs.data ?? []).find((c) => c.platform === r.platform && c.sourceId === r.sourceId);

  const loading = tgSources.isLoading || dcSources.isLoading;

  return (
    <div className="rounded-lg border border-border-subtle bg-bg-surface p-5 shadow-card">
      <h2 className="mb-1 font-display font-bold text-text-primary">Per-channel overrides</h2>
      <p className="mb-4 font-mono text-[.63rem] text-text-muted">
        Apply stricter (or looser) rules to a single channel for Equity and/or Options independently.
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
            const summary = getSummary(r);
            return (
              <li key={`${r.platform}:${r.sourceId}`} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <div className="truncate font-mono text-[.68rem] text-text-primary">{r.title}</div>
                  <div className="font-mono text-[.56rem] uppercase tracking-[.16em] text-text-disabled">
                    {r.platform}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ProfileBadge summary={summary} />
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
          summary={getSummary(editing)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

// ── Override modal ────────────────────────────────────────────────────────────

function OverrideModal({
  row,
  options,
  summary,
  onClose,
}: {
  row: Row;
  options?: ValidatorOptions | undefined;
  summary?: SourceConfigSummary | undefined;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const hasCustomRules = summary?.hasCustomRules ?? false;

  const [useCustom, setUseCustom] = useState(hasCustomRules);
  const [activeTab, setActiveTab] = useState<"equity" | "options">("equity");
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const [equityConfig, setEquityConfig] = useState<NormalizedValidatorConfig>(normalizeConfig());
  const [optionsConfig, setOptionsConfig] = useState<Required<ProfileConfig>>(normalizeOptionsConfig());

  const equityDetailQ = useQuery({
    queryKey: qk.copyValidatorSourceProfile(row.platform, row.sourceId, "equity"),
    queryFn: () => copyValidatorApi.getSourceConfigDetail(row.platform, row.sourceId, "equity"),
  });
  const optionsDetailQ = useQuery({
    queryKey: qk.copyValidatorSourceProfile(row.platform, row.sourceId, "options"),
    queryFn: () => copyValidatorApi.getSourceConfigDetail(row.platform, row.sourceId, "options"),
  });

  useEffect(() => {
    if (equityDetailQ.data) setEquityConfig(normalizeConfig(equityDetailQ.data.effectiveConfig));
  }, [equityDetailQ.data]);

  useEffect(() => {
    if (optionsDetailQ.data) setOptionsConfig(normalizeOptionsConfig(optionsDetailQ.data.effectiveConfig));
  }, [optionsDetailQ.data]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: qk.copyValidatorSources() });
    qc.invalidateQueries({ queryKey: qk.copyValidatorSourceProfile(row.platform, row.sourceId, "equity") });
    qc.invalidateQueries({ queryKey: qk.copyValidatorSourceProfile(row.platform, row.sourceId, "options") });
  };

  const saveMut = useMutation({
    mutationFn: (body: ValidatorConfigBody) =>
      copyValidatorApi.updateSourceConfig(row.platform, row.sourceId, body),
    onSuccess: () => {
      toast.success("Channel rules saved");
      invalidate();
      onClose();
    },
    onError: (e) => toast.error(apiErr(e)),
  });

  const deleteMut = useMutation({
    mutationFn: () => copyValidatorApi.deleteSourceConfig(row.platform, row.sourceId),
    onSuccess: () => {
      toast.success("Reverted to global defaults");
      invalidate();
      onClose();
    },
    onError: (e) => toast.error(apiErr(e)),
  });

  const onSave = () => {
    if (!useCustom) {
      if (hasCustomRules) deleteMut.mutate();
      else onClose();
      return;
    }

    const equityErrors = validateConfig(equityConfig);
    if (equityErrors.length) {
      setActiveTab("equity");
      toast.error(`Equity: ${equityErrors[0] ?? "Fix validation errors"}`);
      return;
    }

    const equityBody = serializeConfig(equityConfig);
    const equityProfile: ProfileConfig = {};
    if (equityBody.executionMode != null) equityProfile.executionMode = equityBody.executionMode;
    if (equityBody.onViolation != null) equityProfile.onViolation = equityBody.onViolation;
    if (equityBody.fields != null) equityProfile.fields = equityBody.fields;

    const optionsProfile: ProfileConfig = {
      executionMode: optionsConfig.executionMode,
      onViolation: optionsConfig.onViolation,
    };
    if (optionsConfig.fields && Object.keys(optionsConfig.fields).length > 0) {
      optionsProfile.fields = optionsConfig.fields;
    }
    const mf = optionsConfig.missingFields;
    if (mf && Object.keys(mf).length > 0) optionsProfile.missingFields = mf;

    saveMut.mutate({ profiles: { equity: equityProfile, options: optionsProfile } });
  };

  const busy = saveMut.isPending || deleteMut.isPending;
  const loading = equityDetailQ.isLoading || optionsDetailQ.isLoading;

  return (
    <div
      className="fixed inset-0 z-[900] flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="my-auto w-full max-w-2xl rounded-lg border border-border-default bg-bg-surface shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3">
          <div>
            <h3 className="font-display font-bold text-text-primary">Validation rules</h3>
            <p className="font-mono text-[.6rem] text-text-muted">
              {row.title} · <span className="capitalize">{row.platform}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-sm p-1 text-text-muted hover:bg-bg-elevated hover:text-text-secondary"
          >
            <LuX className="h-4 w-4" />
          </button>
        </div>

        {/* Inheritance toggle + reset */}
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={useCustom}
              onChange={(e) => setUseCustom(e.target.checked)}
              className="h-3.5 w-3.5 accent-[var(--color-accent)]"
            />
            <span className="font-mono text-[.68rem] text-text-secondary">
              Use custom rules for this channel
            </span>
          </label>
          {hasCustomRules && !showResetConfirm && (
            <button
              onClick={() => setShowResetConfirm(true)}
              disabled={busy}
              className="inline-flex items-center gap-1 font-mono text-[.6rem] text-text-muted hover:text-bear disabled:opacity-50"
            >
              <LuRotateCcw className="h-3 w-3" /> Reset to global
            </button>
          )}
        </div>

        {/* Reset confirm banner */}
        {showResetConfirm && (
          <div className="flex items-center justify-between border-b border-border-subtle bg-bear/5 px-5 py-3">
            <div className="flex items-center gap-2">
              <LuTriangle className="h-3.5 w-3.5 flex-shrink-0 text-bear" />
              <span className="font-mono text-[.65rem] text-bear">
                Remove all custom rules for this channel?
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="rounded-sm border border-border-default px-3 py-1 font-mono text-[.6rem] uppercase tracking-widest text-text-secondary hover:border-border-strong"
              >
                Cancel
              </button>
              <button
                onClick={() => { deleteMut.mutate(); setShowResetConfirm(false); }}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-sm bg-bear px-3 py-1 font-mono text-[.6rem] font-bold uppercase tracking-widest text-white disabled:opacity-50"
              >
                {deleteMut.isPending && <LuLoader className="h-3 w-3 animate-spin" />}
                Confirm reset
              </button>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="px-5 py-4">
          {loading ? (
            <div className="flex items-center gap-2 font-mono text-[.65rem] text-text-muted">
              <LuLoader className="h-3.5 w-3.5 animate-spin" /> Loading channel rules…
            </div>
          ) : !useCustom ? (
            <div className="rounded-sm border border-border-subtle bg-bg-elevated px-3 py-2 font-mono text-[.63rem] text-text-muted">
              This channel uses your <strong>global default rules</strong> for both Equity and Options signals.
              Check the box above to set channel-specific overrides.
            </div>
          ) : (
            <>
              <div className="mb-4 rounded-sm border border-border-subtle bg-bg-elevated px-3 py-2.5">
                <p className="font-mono text-[.6rem] text-text-muted">
                  <strong className="text-text-secondary">Equity</strong> rules apply to stock and crypto signals from this channel.{" "}
                  <strong className="text-text-secondary">Options</strong> rules apply to options signals.
                  Changing one tab doesn't affect the other profile.
                </p>
              </div>

              <ProfileSettingsTabs activeTab={activeTab} onTabChange={setActiveTab}>
                {activeTab === "equity" ? (
                  <ValidatorForm config={equityConfig} onChange={setEquityConfig} options={options} />
                ) : (
                  <OptionsValidatorForm config={optionsConfig} onChange={setOptionsConfig} />
                )}
              </ProfileSettingsTabs>

              <CompareSection
                activeTab={activeTab}
                equityConfig={equityConfig}
                optionsConfig={optionsConfig}
                globalEquity={equityDetailQ.data?.globalEffectiveConfig}
                globalOptions={optionsDetailQ.data?.globalEffectiveConfig}
              />
            </>
          )}
        </div>

        {/* Footer */}
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
            {useCustom ? "Save channel rules" : hasCustomRules ? "Use global default" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Compare section ───────────────────────────────────────────────────────────

type ComparePair = { label: string; global: string; channel: string };

function fmtExecMode(v?: string) {
  return v === "manual" ? "Manual" : "Auto";
}
function fmtPct(rule?: { mode?: string; maxPctFromEntry?: number }) {
  if (!rule || rule.mode !== "manual") return "Auto";
  return rule.maxPctFromEntry != null ? `${rule.maxPctFromEntry}%` : "Manual";
}
function fmtLots(rule?: { mode?: string; maxLots?: number; fixedLots?: number }) {
  if (!rule || rule.mode !== "manual") return "Auto";
  if (rule.fixedLots != null) return `Fixed ${rule.fixedLots}`;
  if (rule.maxLots != null) return `Max ${rule.maxLots}`;
  return "Manual";
}
function fmtContracts(rule?: { mode?: string; maxContracts?: number; fixedContracts?: number; maxPremium?: number }) {
  if (!rule || rule.mode !== "manual") return "Auto";
  const parts: string[] = [];
  if (rule.fixedContracts != null) parts.push(`Fixed ${rule.fixedContracts}`);
  else if (rule.maxContracts != null) parts.push(`Max ${rule.maxContracts}`);
  if (rule.maxPremium != null) parts.push(`$${rule.maxPremium} cap`);
  return parts.length ? parts.join(", ") : "Manual";
}

function CompareSection({
  activeTab,
  equityConfig,
  optionsConfig,
  globalEquity,
  globalOptions,
}: {
  activeTab: "equity" | "options";
  equityConfig: NormalizedValidatorConfig;
  optionsConfig: Required<ProfileConfig>;
  globalEquity?: ProfileConfig | undefined;
  globalOptions?: ProfileConfig | undefined;
}) {
  const pairs: ComparePair[] =
    activeTab === "equity"
      ? [
          {
            label: "Execution",
            global: fmtExecMode(globalEquity?.executionMode),
            channel: fmtExecMode(equityConfig.executionMode),
          },
          {
            label: "SL max %",
            global: fmtPct(globalEquity?.fields?.sl),
            channel: fmtPct(equityConfig.fields?.sl),
          },
          {
            label: "TP max %",
            global: fmtPct(globalEquity?.fields?.tp),
            channel: fmtPct(equityConfig.fields?.tp),
          },
          {
            label: "Lot size",
            global: fmtLots(globalEquity?.fields?.lotSize),
            channel: fmtLots(equityConfig.fields?.lotSize),
          },
        ]
      : [
          {
            label: "Execution",
            global: fmtExecMode(globalOptions?.executionMode),
            channel: fmtExecMode(optionsConfig.executionMode),
          },
          {
            label: "SL max %",
            global: fmtPct(globalOptions?.fields?.sl),
            channel: fmtPct(optionsConfig.fields?.sl),
          },
          {
            label: "Contracts",
            global: fmtContracts(globalOptions?.fields?.contractSize),
            channel: fmtContracts(optionsConfig.fields?.contractSize),
          },
        ];

  const diffCount = pairs.filter((p) => p.global !== p.channel).length;

  return (
    <div className="mt-5 rounded-sm border border-border-subtle bg-bg-elevated p-3">
      <div className="mb-2 flex items-center gap-2 font-mono text-[.56rem] uppercase tracking-[.16em] text-text-disabled">
        Compare with global
        {diffCount > 0 && (
          <span className="rounded-sm border border-accent/40 bg-accent/10 px-1.5 py-0.5 font-mono text-[.5rem] text-accent">
            {diffCount} override{diffCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-left">
            <th className="w-24 pb-1.5 font-mono text-[.54rem] uppercase tracking-[.12em] text-text-muted">Field</th>
            <th className="pb-1.5 font-mono text-[.54rem] uppercase tracking-[.12em] text-text-muted">Global</th>
            <th className="pb-1.5 font-mono text-[.54rem] uppercase tracking-[.12em] text-text-muted">This channel</th>
          </tr>
        </thead>
        <tbody>
          {pairs.map((p) => {
            const isDiff = p.global !== p.channel;
            return (
              <tr key={p.label}>
                <td className="py-1 font-mono text-[.6rem] text-text-muted">{p.label}</td>
                <td className="py-1 font-mono text-[.6rem] text-text-secondary">{p.global}</td>
                <td className={`py-1 font-mono text-[.6rem] ${isDiff ? "font-bold text-accent" : "text-text-secondary"}`}>
                  {p.channel}
                  {isDiff && (
                    <span className="ml-1.5 font-mono text-[.52rem] text-text-muted">← override</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
