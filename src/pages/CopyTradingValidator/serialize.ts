// src/pages/CopyTradingValidator/serialize.ts
import type {
  LotSizeRule,
  NormalizedValidatorConfig,
  OrderTypeRule,
  PctFieldRule,
  ProfileConfig,
  SlippageRule,
  SpreadRule,
  TrailingStopRule,
  ValidatorConfigBody,
  ValidatorFieldKey,
  ValidatorFields,
} from "@/types/copyValidator";
import { FIELD_DEFS } from "./fieldMeta";

const defKind = new Map(FIELD_DEFS.map((d) => [d.key, d.kind] as const));

function serializeSymbolFilter(c: NormalizedValidatorConfig): Pick<ProfileConfig, "symbolFilter"> {
  const inc = c.symbolFilter?.include?.trim() ?? "";
  const exc = c.symbolFilter?.exclude?.trim() ?? "";
  if (!inc && !exc) return {};
  return { symbolFilter: { ...(inc ? { include: inc } : {}), ...(exc ? { exclude: exc } : {}) } };
}

function serializeMessageFilter(c: NormalizedValidatorConfig): Pick<ProfileConfig, "messageFilter"> {
  const inc = c.messageFilter?.include?.trim() ?? "";
  const exc = c.messageFilter?.exclude?.trim() ?? "";
  if (!inc && !exc) return {};
  return { messageFilter: { ...(inc ? { include: inc } : {}), ...(exc ? { exclude: exc } : {}) } };
}

// Produce a clean payload for PUT /config. Drops undefined inputs and, when in
// full-auto mode, omits the fields block entirely (backend ignores it anyway).
export function serializeConfig(c: NormalizedValidatorConfig): ValidatorConfigBody {
  if (c.executionMode === "auto") {
    return { executionMode: "auto", onViolation: c.onViolation, ...serializeSymbolFilter(c), ...serializeMessageFilter(c) };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fields = {} as Record<ValidatorFieldKey, any>;
  (Object.keys(c.fields) as ValidatorFieldKey[]).forEach((key) => {
    const rule = c.fields[key];
    if (!rule) return;
    const kind = defKind.get(key);

    // Slippage & spread: preserve unit + all max fields in both auto and manual.
    if (kind === "slippage" || kind === "spread") {
      const r = rule as SlippageRule | SpreadRule;
      if (r.mode === "off") { fields[key] = { mode: "off" } as unknown as SlippageRule; return; }
      const out: SlippageRule = { mode: r.mode };
      if (r.unit) out.unit = r.unit;
      if (r.maxPct != null) out.maxPct = r.maxPct;
      if (r.maxPips != null) out.maxPips = r.maxPips;
      if (r.maxPoints != null) out.maxPoints = r.maxPoints;
      fields[key] = out as unknown as SlippageRule;
      return;
    }

    if (rule.mode === "auto") {
      fields[key] = { mode: "auto" };
      return;
    }

    if (kind === "pct") {
      const r = rule as PctFieldRule;
      fields[key] = {
        mode: "manual",
        ...(r.maxPctFromEntry != null ? { maxPctFromEntry: r.maxPctFromEntry } : {}),
        ...(r.minPctFromEntry != null ? { minPctFromEntry: r.minPctFromEntry } : {}),
      } as PctFieldRule;
    } else if (kind === "lotSize") {
      const r = rule as LotSizeRule;
      fields[key] =
        r.fixedLots != null
          ? { mode: "manual", fixedLots: r.fixedLots }
          : { mode: "manual", ...(r.maxLots != null ? { maxLots: r.maxLots } : {}) };
    } else if (kind === "orderType") {
      const r = rule as OrderTypeRule;
      fields[key] = { mode: "manual", ...(r.value ? { value: r.value } : {}) } as OrderTypeRule;
    } else if (kind === "trailingStop") {
      const r = rule as TrailingStopRule;
      if (r.mode === "off") { fields[key] = { mode: "off" } as unknown as TrailingStopRule; return; }
      const ts: TrailingStopRule = { mode: r.mode };
      if (r.trailPct != null) ts.trailPct = r.trailPct;
      if (r.trailAmount != null) ts.trailAmount = r.trailAmount;
      fields[key] = ts as unknown as TrailingStopRule;
    } else {
      fields[key] = { mode: "manual" };
    }
  });

  return { executionMode: "manual", onViolation: c.onViolation, fields: fields as ValidatorFields, ...serializeSymbolFilter(c), ...serializeMessageFilter(c) };
}

// Validate the form before save. Returns a list of human-readable errors.
export function validateConfig(c: NormalizedValidatorConfig): string[] {
  const errors: string[] = [];
  if (c.executionMode !== "manual") return errors;

  (Object.keys(c.fields) as ValidatorFieldKey[]).forEach((key) => {
    const rule = c.fields[key];
    if (!rule || rule.mode !== "manual") return;
    const kind = defKind.get(key);
    if (kind === "pct") {
      const r = rule as PctFieldRule;
      for (const [lbl, v] of [
        ["Max %", r.maxPctFromEntry],
        ["Min %", r.minPctFromEntry],
      ] as const) {
        if (v != null && (v < 0 || v > 100)) errors.push(`${key}: ${lbl} must be between 0 and 100`);
      }
      if (r.maxPctFromEntry != null && r.minPctFromEntry != null && r.minPctFromEntry > r.maxPctFromEntry) {
        errors.push(`${key}: Min % cannot exceed Max %`);
      }
    } else if (kind === "lotSize") {
      const r = rule as LotSizeRule;
      if (r.fixedLots == null && r.maxLots == null) {
        errors.push(`${key}: set a max or fixed lot value`);
      }
      if ((r.fixedLots != null && r.fixedLots <= 0) || (r.maxLots != null && r.maxLots <= 0)) {
        errors.push(`${key}: lots must be greater than 0`);
      }
    }
  });
  return errors;
}
