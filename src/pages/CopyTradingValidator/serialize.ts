// src/pages/CopyTradingValidator/serialize.ts
import type {
  LotSizeRule,
  OrderTypeRule,
  PctFieldRule,
  ValidatorConfigBody,
  ValidatorFieldKey,
  ValidatorFields,
} from "@/types/copyValidator";
import { FIELD_DEFS } from "./fieldMeta";

const defKind = new Map(FIELD_DEFS.map((d) => [d.key, d.kind] as const));

// Produce a clean payload for PUT /config. Drops undefined inputs and, when in
// full-auto mode, omits the fields block entirely (backend ignores it anyway).
export function serializeConfig(c: Required<ValidatorConfigBody>): ValidatorConfigBody {
  if (c.executionMode === "auto") {
    return { executionMode: "auto", onViolation: c.onViolation };
  }

  const fields: ValidatorFields = {};
  (Object.keys(c.fields) as ValidatorFieldKey[]).forEach((key) => {
    const rule = c.fields[key];
    if (!rule) return;
    if (rule.mode === "auto") {
      fields[key] = { mode: "auto" };
      return;
    }
    const kind = defKind.get(key);
    if (kind === "pct") {
      const r = rule as PctFieldRule;
      fields[key] = {
        mode: "manual",
        ...(r.maxPctFromEntry != null ? { maxPctFromEntry: r.maxPctFromEntry } : {}),
        ...(r.minPctFromEntry != null ? { minPctFromEntry: r.minPctFromEntry } : {}),
      } as PctFieldRule;
    } else if (kind === "lotSize") {
      const r = rule as LotSizeRule;
      // Mutually exclusive: fixed wins if present.
      fields[key] =
        r.fixedLots != null
          ? { mode: "manual", fixedLots: r.fixedLots }
          : { mode: "manual", ...(r.maxLots != null ? { maxLots: r.maxLots } : {}) };
    } else if (kind === "orderType") {
      const r = rule as OrderTypeRule;
      fields[key] = { mode: "manual", ...(r.value ? { value: r.value } : {}) } as OrderTypeRule;
    } else {
      fields[key] = { mode: "manual" };
    }
  });

  return { executionMode: "manual", onViolation: c.onViolation, fields };
}

// Validate the form before save. Returns a list of human-readable errors.
export function validateConfig(c: Required<ValidatorConfigBody>): string[] {
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
