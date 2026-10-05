import type { Product, StockState } from "@/types";

export const getStockState = (product: Product): StockState => {
  if (product.stock < 0) return "negative";
  if (product.stock === 0) return "out";
  if (product.stock <= product.minStock) return "low";
  return "normal";
};

export const stockStateLabel = (state: StockState): string => {
  switch (state) {
    case "negative":
      return "Stock negativo";
    case "out":
      return "Sin stock";
    case "low":
      return "Stock bajo";
    default:
      return "Normal";
  }
};

export const stockStateTone = (
  state: StockState
): "neutral" | "success" | "warning" | "danger" => {
  switch (state) {
    case "negative":
      return "danger";
    case "out":
      return "warning";
    case "low":
      return "warning";
    default:
      return "success";
  }
};