import type { Category, Channel, Combo, PricingRule, Product, Unit } from "@/types";
import { normalizeText, round2 } from "@/utils/format";
import { basePrice, resolvePriceForQuantity } from "@/utils/pricing";

export interface CatalogResult {
  kind: "product" | "combo";
  id: string;
  name: string;
  brand: string;
  unit: Unit;
  category: string;
  price: number;
  priceLabel: string;
  stock: number | null;
  promo: string | null;
  score: number;
}

interface SearchArgs {
  query: string;
  products: Product[];
  combos: Combo[];
  categories: Category[];
  productMap: Map<string, Product>;
  rules: PricingRule[];
  channel: Channel;
}

const tokenize = (query: string): string[] =>
  normalizeText(query).split(/\s+/).filter(Boolean);

export const searchCatalog = ({
  query,
  products,
  combos,
  categories,
  productMap,
  rules,
  channel,
}: SearchArgs): CatalogResult[] => {
  const raw = normalizeText(query).trim();
  const tokens = tokenize(query);
  const categoryName = (id: string): string =>
    categories.find((c) => c.id === id)?.name ?? "";

  const results: CatalogResult[] = [];

  products.forEach((product) => {
    if (!product.active) return;
    const cat = categoryName(product.categoryId);
    const hay = normalizeText(
      `${product.name} ${product.brand} ${product.internalCode} ${product.barcode} ${cat}`
    );
    const allMatch = tokens.every((tok) => hay.includes(tok));
    if (!allMatch) return;

    let score = 0;
    const nameNorm = normalizeText(product.name);
    const brandNorm = normalizeText(product.brand);
    if (normalizeText(product.barcode) === raw) score += 1200;
    if (normalizeText(product.internalCode) === raw) score += 1000;
    if (nameNorm === raw) score += 500;
    if (nameNorm.startsWith(raw)) score += 300;
    tokens.forEach((tok) => {
      if (nameNorm.includes(tok)) score += 40;
      if (brandNorm.includes(tok)) score += 20;
    });
    if (score === 0) score = 10;

    const resolved = resolvePriceForQuantity(product, channel, 1, rules);
    let promo: string | null = resolved.label;

    const hasTiers = rules.some(
      (r) =>
        r.productId === product.id &&
        r.active &&
        (r.channel === "both" || r.channel === channel) &&
        (r.type === "unit-tier" || r.type === "kg-tier")
    );
    if (hasTiers && !promo) promo = "Precio por cantidad";

    results.push({
      kind: "product",
      id: product.id,
      name: product.name,
      brand: product.brand,
      unit: product.unit,
      category: cat,
      price: resolved.unitPrice,
      priceLabel: `$ ${round2(resolved.unitPrice).toLocaleString("es-AR")} / ${
        product.unit === "kg" ? "kg" : "un"
      }`,
      stock: product.stock,
      promo,
      score,
    });
  });

  combos.forEach((combo) => {
    if (!combo.active) return;
    if (combo.channel !== "both" && combo.channel !== channel) return;
    const componentText = combo.components
      .map((c) => {
        const p = productMap.get(c.productId);
        return p ? `${p.name} ${p.brand}` : "";
      })
      .join(" ");
    const hay = normalizeText(`${combo.name} combo ${componentText}`);
    const allMatch = tokens.every((tok) => hay.includes(tok));
    if (!allMatch) return;

    let score = 0;
    const nameNorm = normalizeText(combo.name);
    if (nameNorm === raw) score += 500;
    if (nameNorm.startsWith(raw)) score += 300;
    tokens.forEach((tok) => {
      if (nameNorm.includes(tok)) score += 45;
      if (normalizeText(componentText).includes(tok)) score += 15;
    });
    // combos are part of the selling experience: give them a small edge
    score += 25;
    if (score === 0) score = 10;

    results.push({
      kind: "combo",
      id: combo.id,
      name: combo.name,
      brand: "Combo",
      unit: "unidad",
      category: "Combo",
      price: combo.price,
      priceLabel: `$ ${round2(combo.price).toLocaleString("es-AR")} / combo`,
      stock: null,
      promo: "Combo",
      score,
    });
  });

  return results.sort((a, b) => b.score - a.score).slice(0, 40);
};

export const productBasePrice = basePrice;