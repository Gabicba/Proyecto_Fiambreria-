import type { Unit } from "@/types";

export const round2 = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

export const round3 = (value: number): number =>
  Math.round((value + Number.EPSILON) * 1000) / 1000;

export const toCurrency = (value: number): string => {
  if (!Number.isFinite(value)) return "$ 0,00";
  return `$ ${round2(value).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const toCurrencyShort = (value: number): string => {
  if (!Number.isFinite(value)) return "$ 0";
  return `$ ${Math.round(value).toLocaleString("es-AR")}`;
};

export const toNumber = (value: number, decimals = 2): string => {
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString("es-AR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

/**
 * Parse a user typed numeric string. Accepts both comma and dot as decimal
 * separators (numeric keypad friendly). Returns NaN when not parseable.
 */
export const parseNumber = (raw: string): number => {
  if (raw === null || raw === undefined) return NaN;
  const cleaned = String(raw).trim().replace(/\s/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === "." || cleaned === ",")
    return NaN;
  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");
  let normalized = cleaned;
  if (hasComma && hasDot) {
    // treat the last separator as decimal
    const lastComma = cleaned.lastIndexOf(",");
    const lastDot = cleaned.lastIndexOf(".");
    if (lastComma > lastDot) {
      normalized = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = cleaned.replace(/,/g, "");
    }
  } else if (hasComma) {
    normalized = cleaned.replace(",", ".");
  }
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? NaN : parsed;
};

export const formatQuantity = (value: number, unit: Unit): string => {
  if (unit === "kg") {
    return `${toNumber(value, 3)} kg`;
  }
  return `${Math.round(value)} un`;
};

export const quantityDecimals = (unit: Unit): number =>
  unit === "kg" ? 3 : 0;

export const uid = (prefix = "id"): string =>
  `${prefix}_${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 8)}`;

export const toDateKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export const toTimeLabel = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const toDateTimeLabel = (iso: string): string => {
  const d = new Date(iso);
  return `${d.toLocaleDateString("es-AR")} ${d.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

export const normalizeText = (value: string): string =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");