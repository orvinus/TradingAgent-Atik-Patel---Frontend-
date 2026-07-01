// src/pages/CopyTradingMissingFields/types.ts
// Local form-state types (string-valued for controlled inputs) and
// serialize / deserialize helpers between form state and API shape.

import type {
  MissingFieldsConfig,
  SlFieldConfig,
  TpFieldConfig,
  LotSizeFieldConfig,
  EntryFieldConfig,
  ExitQtyFieldConfig,
  WhenMissing,
  EntryWhenMissing,
  ExitQtyWhenMissing,
} from "@/types/missingFields";

export type { EntryWhenMissing, ExitQtyWhenMissing };

export type PriceMode = "pct" | "fixed";

export interface EntryFormState {
  whenMissing: EntryWhenMissing;
  defaultLimitPrice: string;
}

export interface SlFormState {
  whenMissing: WhenMissing;
  priceMode: PriceMode;
  pct: string;
  fixed: string;
}

export interface TpLevelRow {
  pctFromEntry: string;
  exit_pct: string;
}

export interface TpFormState {
  whenMissing: WhenMissing;
  priceMode: PriceMode;
  pct: string;
  fixed: string;
  multiTp: boolean;
  tpLevels: TpLevelRow[];
}

export interface LotFormState {
  whenMissing: WhenMissing;
  lots: string;
}

export interface ExitQtyFormState {
  whenMissing: ExitQtyWhenMissing;
  defaultExitPct: string;
}

export interface MissingFieldsFormState {
  entry: EntryFormState;
  sl: SlFormState;
  tp: TpFormState;
  lotSize: LotFormState;
  exitQty: ExitQtyFormState;
}

// ── Defaults ──────────────────────────────────────────────────────────────────

export const DEFAULT_FORM_STATE: MissingFieldsFormState = {
  entry: { whenMissing: "use_market", defaultLimitPrice: "" },
  sl: { whenMissing: "reject", priceMode: "pct", pct: "", fixed: "" },
  tp: { whenMissing: "reject", priceMode: "pct", pct: "", fixed: "", multiTp: false, tpLevels: [{ pctFromEntry: "", exit_pct: "" }] },
  lotSize: { whenMissing: "reject", lots: "" },
  exitQty: { whenMissing: "use_default", defaultExitPct: "50" },
};

// ── Deserialize API → form state ──────────────────────────────────────────────

export function deserializeConfig(cfg: Partial<MissingFieldsConfig>): MissingFieldsFormState {
  const entry = cfg.entry ?? ({ whenMissing: "use_market" } as EntryFieldConfig);
  const sl = cfg.sl ?? ({ whenMissing: "reject" } as SlFieldConfig);
  const tp = cfg.tp ?? ({ whenMissing: "reject" } as TpFieldConfig);
  const lot = cfg.lotSize ?? ({ whenMissing: "reject" } as LotSizeFieldConfig);
  const exitQty = cfg.exitQty ?? ({ whenMissing: "use_default", defaultExitPct: 50 } as ExitQtyFieldConfig);

  return {
    entry: {
      whenMissing: entry.whenMissing,
      defaultLimitPrice: entry.defaultLimitPrice != null ? String(entry.defaultLimitPrice) : "",
    },
    sl: {
      whenMissing: sl.whenMissing,
      priceMode: sl.defaultPrice != null ? "fixed" : "pct",
      pct: sl.defaultPctFromEntry != null ? String(sl.defaultPctFromEntry) : "",
      fixed: sl.defaultPrice != null ? String(sl.defaultPrice) : "",
    },
    tp: {
      whenMissing: tp.whenMissing,
      priceMode: tp.defaultPrice != null ? "fixed" : "pct",
      pct: tp.defaultPctFromEntry != null ? String(tp.defaultPctFromEntry) : "",
      fixed: tp.defaultPrice != null ? String(tp.defaultPrice) : "",
      multiTp: Boolean(tp.defaultTpLevels?.length),
      tpLevels:
        tp.defaultTpLevels?.map((l) => ({
          pctFromEntry: String(l.pctFromEntry),
          exit_pct: String(l.exit_pct),
        })) ?? [{ pctFromEntry: "", exit_pct: "" }],
    },
    lotSize: {
      whenMissing: lot.whenMissing,
      lots: lot.defaultLots != null ? String(lot.defaultLots) : "",
    },
    exitQty: {
      whenMissing: exitQty.whenMissing,
      defaultExitPct: exitQty.defaultExitPct != null ? String(exitQty.defaultExitPct) : "50",
    },
  };
}

// ── Serialize form state → API body ──────────────────────────────────────────

const n = (s: string): number | undefined => {
  const v = parseFloat(s);
  return isNaN(v) ? undefined : v;
};

const requireNum = (s: string): number => {
  const v = parseFloat(s);
  if (isNaN(v)) throw new Error(`Expected a number, got: ${s}`);
  return v;
};

export function serializeConfig(form: MissingFieldsFormState): MissingFieldsConfig {
  const entry: EntryFieldConfig = { whenMissing: form.entry.whenMissing };
  if (form.entry.whenMissing === "use_default") {
    const price = n(form.entry.defaultLimitPrice);
    if (price !== undefined) entry.defaultLimitPrice = price;
  }

  const sl: SlFieldConfig = { whenMissing: form.sl.whenMissing };
  if (form.sl.whenMissing === "use_default") {
    const pct = n(form.sl.pct);
    const fixed = n(form.sl.fixed);
    if (form.sl.priceMode === "pct" && pct !== undefined) sl.defaultPctFromEntry = pct;
    else if (fixed !== undefined) sl.defaultPrice = fixed;
  }

  const tp: TpFieldConfig = { whenMissing: form.tp.whenMissing };
  if (form.tp.whenMissing === "use_default") {
    if (form.tp.multiTp) {
      tp.defaultTpLevels = form.tp.tpLevels
        .filter((l) => l.pctFromEntry !== "" && l.exit_pct !== "")
        .map((l) => {
          try {
            return { pctFromEntry: requireNum(l.pctFromEntry), exit_pct: requireNum(l.exit_pct) };
          } catch {
            return null;
          }
        })
        .filter((l): l is { pctFromEntry: number; exit_pct: number } => l !== null);
    } else {
      const pct = n(form.tp.pct);
      const fixed = n(form.tp.fixed);
      if (form.tp.priceMode === "pct" && pct !== undefined) tp.defaultPctFromEntry = pct;
      else if (fixed !== undefined) tp.defaultPrice = fixed;
    }
  }

  const lotSize: LotSizeFieldConfig = { whenMissing: form.lotSize.whenMissing };
  if (form.lotSize.whenMissing === "use_default") {
    const lots = n(form.lotSize.lots);
    if (lots !== undefined) lotSize.defaultLots = lots;
  }

  const exitQty: ExitQtyFieldConfig = { whenMissing: form.exitQty.whenMissing };
  if (form.exitQty.whenMissing === "use_default") {
    const pct = n(form.exitQty.defaultExitPct);
    if (pct !== undefined) exitQty.defaultExitPct = pct;
  }

  return { entry, sl, tp, lotSize, exitQty };
}

// ── Client-side validation ────────────────────────────────────────────────────

export function validateForm(form: MissingFieldsFormState): string[] {
  const errors: string[] = [];
  const num = (s: string) => parseFloat(s);

  if (form.entry.whenMissing === "use_default") {
    const v = num(form.entry.defaultLimitPrice);
    if (!form.entry.defaultLimitPrice || isNaN(v) || v <= 0)
      errors.push("Entry default: limit price must be a positive number.");
  }

  if (form.sl.whenMissing === "use_default") {
    if (form.sl.priceMode === "pct") {
      const v = num(form.sl.pct);
      if (!form.sl.pct || isNaN(v) || v <= 0 || v > 100)
        errors.push("SL default: % from entry must be between 0.1 and 100.");
    } else {
      const v = num(form.sl.fixed);
      if (!form.sl.fixed || isNaN(v) || v <= 0)
        errors.push("SL default: fixed price must be a positive number.");
    }
  }

  if (form.tp.whenMissing === "use_default") {
    if (form.tp.multiTp) {
      if (form.tp.tpLevels.length === 0) errors.push("Add at least one TP level.");
      form.tp.tpLevels.forEach((lvl, i) => {
        const pct = num(lvl.pctFromEntry);
        const ep = num(lvl.exit_pct);
        if (!lvl.pctFromEntry || isNaN(pct) || pct <= 0)
          errors.push(`TP level ${i + 1}: % from entry must be > 0.`);
        if (!lvl.exit_pct || isNaN(ep) || ep <= 0 || ep > 100)
          errors.push(`TP level ${i + 1}: exit % must be between 1 and 100.`);
      });
    } else if (form.tp.priceMode === "pct") {
      const v = num(form.tp.pct);
      if (!form.tp.pct || isNaN(v) || v <= 0 || v > 100)
        errors.push("TP default: % from entry must be between 0.1 and 100.");
    } else {
      const v = num(form.tp.fixed);
      if (!form.tp.fixed || isNaN(v) || v <= 0)
        errors.push("TP default: fixed price must be a positive number.");
    }
  }

  if (form.lotSize.whenMissing === "use_default") {
    const v = num(form.lotSize.lots);
    if (!form.lotSize.lots || isNaN(v) || v <= 0)
      errors.push("Default lots must be a positive number.");
  }

  if (form.exitQty.whenMissing === "use_default") {
    const v = num(form.exitQty.defaultExitPct);
    if (!form.exitQty.defaultExitPct || isNaN(v) || v < 1 || v > 100)
      errors.push("Default sell % is required (1–100).");
  }

  return errors;
}
