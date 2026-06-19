// src/pages/CopyTradingValidator/PreviewPanel.tsx
import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { LuLoader, LuCircleCheck, LuCircleX } from "react-icons/lu";
import axios from "axios";
import { copyValidatorApi } from "@/api/endpoints/copyValidator";
import { copyTradingApi } from "@/api/endpoints/copyTrading";
import { discordCopierApi } from "@/api/endpoints/discordCopyTrading";
import type {
  Platform,
  ValidateBody,
  ValidateResult,
  ValidatorConfigBody,
} from "@/types/copyValidator";
import { ORDER_TYPE_OPTIONS } from "./fieldMeta";

function apiErr(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const d = err.response?.data;
    return d?.message ?? d?.code ?? "Validation failed.";
  }
  return "Validation failed.";
}

const inputCls =
  "rounded-sm border border-border-default bg-bg-base px-2 py-1.5 font-mono text-[.68rem] text-text-primary outline-none focus:border-accent";

const num = (s: string): number | undefined => {
  if (s.trim() === "") return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
};

function signalLabel(s: Record<string, unknown>): string {
  const sym = s.symbol ?? "?";
  const side = (s.side as string)?.toUpperCase() ?? "";
  const entry = s.limit_price ?? s.entry ?? s.entry_price;
  return `${side} ${sym}${entry != null ? ` @ ${entry}` : ""}`.trim();
}

export default function PreviewPanel({ draftConfig }: { draftConfig: Required<ValidatorConfigBody> }) {
  const [mode, setMode] = useState<"inbox" | "custom">("inbox");
  const [platform, setPlatform] = useState<Platform>("telegram");
  const [signalId, setSignalId] = useState<string>("");
  const [useDraft, setUseDraft] = useState(true);

  // Custom signal fields
  const [custom, setCustom] = useState({
    symbol: "",
    side: "buy",
    entry: "",
    sl: "",
    tp: "",
    lots: "",
    orderType: "market",
  });

  const [result, setResult] = useState<ValidateResult | null>(null);

  const tgSignals = useQuery({
    queryKey: ["copy-validator", "preview-signals", "telegram"],
    queryFn: () => copyTradingApi.listSignals({ limit: 25 }),
    enabled: mode === "inbox" && platform === "telegram",
  });
  const dcSignals = useQuery({
    queryKey: ["copy-validator", "preview-signals", "discord"],
    queryFn: () => discordCopierApi.listSignals({ limit: 25 }),
    enabled: mode === "inbox" && platform === "discord",
  });

  const signals = platform === "telegram" ? tgSignals.data ?? [] : dcSignals.data ?? [];
  const signalsLoading = platform === "telegram" ? tgSignals.isLoading : dcSignals.isLoading;

  const validateMut = useMutation({
    mutationFn: (body: ValidateBody) => copyValidatorApi.validate(body),
    onSuccess: (r) => setResult(r),
    onError: () => setResult(null),
  });

  const buildBody = (): ValidateBody | null => {
    const base: ValidateBody = useDraft ? { config: draftConfig } : {};
    if (mode === "inbox") {
      if (!signalId) return null;
      return { ...base, platform, signalId };
    }
    const signal: Record<string, unknown> = {
      symbol: custom.symbol || undefined,
      side: custom.side,
      entry: num(custom.entry),
      limit_price: num(custom.entry),
      sl_price: num(custom.sl),
      tp_levels: custom.tp
        ? custom.tp.split(",").map((t) => Number(t.trim())).filter((n) => Number.isFinite(n))
        : undefined,
      lots: num(custom.lots),
      order_type: custom.orderType,
    };
    return { ...base, signal };
  };

  const canTest = mode === "inbox" ? !!signalId : custom.symbol.trim() !== "";

  const onTest = () => {
    const body = buildBody();
    if (body) validateMut.mutate(body);
  };

  const tpList = useMemo(() => {
    if (!result) return "";
    const adj = result.adjusted ?? {};
    const tl = (adj.tp_levels ?? adj.tpLevels) as unknown;
    return Array.isArray(tl) ? tl.join(", ") : "";
  }, [result]);

  return (
    <div className="rounded-lg border border-border-subtle bg-bg-surface p-5 shadow-card">
      <h2 className="mb-1 font-display font-bold text-text-primary">Preview</h2>
      <p className="mb-4 font-mono text-[.63rem] text-text-muted">
        Test how a signal would be validated before saving your rules.
      </p>

      {/* Source mode toggle */}
      <div className="mb-3 inline-flex rounded-sm border border-border-subtle p-0.5">
        {(["inbox", "custom"] as const).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              setResult(null);
            }}
            className={`rounded-sm px-3 py-1 font-mono text-[.62rem] uppercase tracking-widest transition-colors ${
              mode === m ? "bg-accent text-bg-base" : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {m === "inbox" ? "From inbox" : "Custom signal"}
          </button>
        ))}
      </div>

      {mode === "inbox" ? (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={platform}
            onChange={(e) => {
              setPlatform(e.target.value as Platform);
              setSignalId("");
            }}
            className={inputCls}
          >
            <option value="telegram">Telegram</option>
            <option value="discord">Discord</option>
          </select>
          <select
            value={signalId}
            onChange={(e) => setSignalId(e.target.value)}
            disabled={signalsLoading}
            className={`${inputCls} min-w-[16rem] flex-1`}
          >
            <option value="">{signalsLoading ? "Loading signals…" : "Select a recent signal…"}</option>
            {signals.map((s) => (
              <option key={s.id} value={s.id}>
                {signalLabel((s.signal ?? {}) as Record<string, unknown>)} · {new Date(s.createdAt).toLocaleString()}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <input className={inputCls} placeholder="Symbol" value={custom.symbol} onChange={(e) => setCustom({ ...custom, symbol: e.target.value })} />
          <select className={inputCls} value={custom.side} onChange={(e) => setCustom({ ...custom, side: e.target.value })}>
            <option value="buy">BUY</option>
            <option value="sell">SELL</option>
          </select>
          <select className={inputCls} value={custom.orderType} onChange={(e) => setCustom({ ...custom, orderType: e.target.value })}>
            {ORDER_TYPE_OPTIONS.map((ot) => (
              <option key={ot} value={ot}>
                {ot}
              </option>
            ))}
          </select>
          <input className={inputCls} placeholder="Entry" value={custom.entry} onChange={(e) => setCustom({ ...custom, entry: e.target.value })} />
          <input className={inputCls} placeholder="Stop loss" value={custom.sl} onChange={(e) => setCustom({ ...custom, sl: e.target.value })} />
          <input className={inputCls} placeholder="Lots" value={custom.lots} onChange={(e) => setCustom({ ...custom, lots: e.target.value })} />
          <input className={`${inputCls} col-span-2 sm:col-span-3`} placeholder="TP levels (comma separated, e.g. 1860, 1915, 1978)" value={custom.tp} onChange={(e) => setCustom({ ...custom, tp: e.target.value })} />
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          onClick={onTest}
          disabled={!canTest || validateMut.isPending}
          className="inline-flex items-center gap-2 rounded-sm bg-accent px-4 py-2 font-mono text-[.65rem] font-bold uppercase tracking-widest text-bg-base transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {validateMut.isPending && <LuLoader className="h-3.5 w-3.5 animate-spin" />}
          Test validation
        </button>
        <label className="flex items-center gap-1.5 font-mono text-[.62rem] text-text-muted">
          <input type="checkbox" checked={useDraft} onChange={(e) => setUseDraft(e.target.checked)} className="h-3.5 w-3.5 accent-[var(--color-accent)]" />
          Test against current (unsaved) rules
        </label>
      </div>

      {validateMut.isError && (
        <div className="mt-3 rounded-sm border border-bear/30 bg-bear/10 px-3 py-2 font-mono text-[.65rem] text-bear">
          {apiErr(validateMut.error)}
        </div>
      )}

      {result && <ResultView result={result} tpList={tpList} />}
    </div>
  );
}

// ── Result ──────────────────────────────────────────────────────────────────
function ResultView({ result, tpList }: { result: ValidateResult; tpList: string }) {
  return (
    <div className="mt-4 flex flex-col gap-4">
      <div
        className={`flex items-center gap-2 rounded-sm border px-3 py-2.5 ${
          result.valid ? "border-bull/30 bg-bull/10" : "border-bear/30 bg-bear/10"
        }`}
      >
        {result.valid ? (
          <LuCircleCheck className="h-4 w-4 flex-shrink-0 text-bull" />
        ) : (
          <LuCircleX className="h-4 w-4 flex-shrink-0 text-bear" />
        )}
        <span className={`font-mono text-[.72rem] font-bold ${result.valid ? "text-bull" : "text-bear"}`}>
          {result.valid ? "VALID" : "REJECTED"}
        </span>
        {result.summary && <span className="font-mono text-[.66rem] text-text-secondary">— {result.summary}</span>}
      </div>

      {tpList && (
        <div className="font-mono text-[.62rem] text-text-muted">Adjusted TP levels: {tpList}</div>
      )}

      {/* Violations */}
      {result.violations.length > 0 && (
        <div className="overflow-hidden rounded-sm border border-border-subtle">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border-subtle bg-bg-elevated text-left">
                {["Field", "Message", "Original", "Adjusted", "Action"].map((h) => (
                  <th key={h} className="px-3 py-2 font-mono text-[.54rem] uppercase tracking-[.14em] text-text-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.violations.map((v, i) => (
                <tr key={`${v.field}-${i}`} className="border-b border-border-subtle last:border-0">
                  <td className="px-3 py-2 font-mono text-[.64rem] text-text-primary">{v.field}</td>
                  <td className="px-3 py-2 font-mono text-[.62rem] text-text-secondary">{v.message}</td>
                  <td className="px-3 py-2 font-mono text-[.62rem] text-text-muted">{fmt(v.original)}</td>
                  <td className="px-3 py-2 font-mono text-[.62rem] text-text-muted">{fmt(v.adjusted)}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`font-mono text-[.56rem] uppercase tracking-widest ${
                        v.action === "rejected"
                          ? "text-bear"
                          : v.action === "clamped"
                            ? "text-warning"
                            : "text-bull"
                      }`}
                    >
                      {v.action}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Original vs adjusted */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <KeyValueCard title="Original" obj={result.original} />
        <KeyValueCard title="Adjusted" obj={result.adjusted} />
      </div>
    </div>
  );
}

function KeyValueCard({ title, obj }: { title: string; obj: Record<string, unknown> }) {
  const entries = Object.entries(obj ?? {});
  return (
    <div className="rounded-sm border border-border-subtle bg-bg-elevated p-3">
      <div className="mb-2 font-mono text-[.56rem] uppercase tracking-[.16em] text-text-disabled">{title}</div>
      {entries.length === 0 ? (
        <div className="font-mono text-[.62rem] text-text-muted">—</div>
      ) : (
        <dl className="flex flex-col gap-1">
          {entries.map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-3">
              <dt className="font-mono text-[.6rem] text-text-muted">{k}</dt>
              <dd className="font-mono text-[.64rem] text-text-primary">{fmt(v)}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function fmt(v: unknown): string {
  if (v == null) return "—";
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
