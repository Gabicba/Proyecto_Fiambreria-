import type {
  Channel,
  ComboComponent,
  OfferEndMode,
  PricingRule,
  Product,
} from "@/types";
import { round2, round3 } from "@/utils/format";

export const costWithIva = (product: { costNet: number; iva: number }): number =>
  round2(product.costNet * (1 + product.iva / 100));

export const multiplier = (price: number, cost: number): number =>
  cost > 0 ? round2(price / cost) : 0;

export const markup = (price: number, cost: number): number =>
  cost > 0 ? round2(((price - cost) / cost) * 100) : 0;

export const margin = (price: number, cost: number): number =>
  price > 0 ? round2(((price - cost) / price) * 100) : 0;

export const profit = (price: number, cost: number): number =>
  round2(price - cost);

export const basePrice = (product: Product, channel: Channel): number =>
  channel === "retail" ? product.priceRetail : product.priceWholesale;

export interface ResolvedPrice {
  unitPrice: number;
  listPrice: number;
  label: string | null;
}

const ruleApplies = (rule: PricingRule, channel: Channel): boolean =>
  rule.active && (rule.channel === "both" || rule.channel === channel);

const matchesTier = (
  tiers: PricingRule["tiers"],
  quantity: number
): { price: number } | null => {
  for (const tier of tiers) {
    const upper = tier.to === null ? Number.POSITIVE_INFINITY : tier.to;
    if (quantity >= tier.from && quantity <= upper) {
      return { price: tier.price };
    }
  }
  return null;
};

export const offerEndModeOf = (rule: PricingRule): OfferEndMode => {
  if (rule.offerEndMode) return rule.offerEndMode;
  const hasQuota = rule.maxUnits !== null;
  const hasDate = Boolean(rule.endDate);
  if (hasQuota && hasDate) return "date-quota";
  if (hasQuota) return "quota";
  if (hasDate) return "date";
  return "stock";
};

export type OfferStatus = "activa" | "agotada" | "vencida" | "pausada";

/** Cupo promocional restante (no confundir con el stock fisico del producto). */
export const offerRemaining = (rule: PricingRule): number | null =>
  rule.maxUnits === null
    ? null
    : Math.max(0, round3(rule.maxUnits - rule.consumedUnits));

/** Una oferta aplica si esta activa y su condicion de finalizacion no se cumplio. */
export const isOfferActive = (
  rule: PricingRule,
  product: Pick<Product, "stock"> | undefined,
  now: number = Date.now()
): boolean => {
  if (!rule.active) return false;
  const mode = offerEndModeOf(rule);
  if (rule.endDate && mode !== "quota" && now > new Date(rule.endDate).getTime()) {
    return false;
  }
  if (
    (mode === "quota" || mode === "date-quota") &&
    rule.maxUnits !== null &&
    rule.consumedUnits >= rule.maxUnits
  ) {
    return false;
  }
  if (mode === "stock" && product && product.stock <= 0) return false;
  return true;
};

export const offerStatus = (
  rule: PricingRule,
  product: Pick<Product, "stock"> | undefined,
  now: number = Date.now()
): OfferStatus => {
  if (!rule.active) return "pausada";
  const mode = offerEndModeOf(rule);
  if (rule.endDate && mode !== "quota" && now > new Date(rule.endDate).getTime()) {
    return "vencida";
  }
  if (
    (mode === "quota" || mode === "date-quota") &&
    rule.maxUnits !== null &&
    rule.consumedUnits >= rule.maxUnits
  ) {
    return "agotada";
  }
  if (mode === "stock" && product && product.stock <= 0) return "agotada";
  return "activa";
};

/**
 * Resolves the effective unit price for a given product + quantity + channel.
 * Priority: temporal offer -> quantity tiers -> product base price.
 */
export const resolvePriceForQuantity = (
  product: Product,
  channel: Channel,
  quantity: number,
  rules: PricingRule[]
): ResolvedPrice => {
  const list = basePrice(product, channel);

  // temporal offer: la vigencia depende del modo de finalizacion configurado.
  const offer = rules.find(
    (r) => r.productId === product.id && r.type === "temporal-offer"
  );
  if (
    offer &&
    ruleApplies(offer, channel) &&
    offer.offerPrice !== null &&
    isOfferActive(offer, product)
  ) {
    return {
      unitPrice: offer.offerPrice,
      listPrice: list,
      label: offer.label || "Oferta temporal",
    };
  }

  const tierRule = rules.find(
    (r) =>
      r.productId === product.id &&
      (r.type === "unit-tier" || r.type === "kg-tier") &&
      ruleApplies(r, channel)
  );
  if (tierRule) {
    const tier = matchesTier(tierRule.tiers, quantity);
    if (tier && tier.price !== list) {
      return {
        unitPrice: tier.price,
        listPrice: list,
        label: tierRule.label || "Precio por cantidad",
      };
    }
  }

  return { unitPrice: list, listPrice: list, label: null };
};

export const tierLabel = (type: PricingRule["type"]): string =>
  type === "unit-tier" ? "Precio por cantidad" : "Escalonado por kg";

export const comboEstimatedCost = (
  combo: { components: ComboComponent[] },
  productMap: Map<string, Product>
): number => {
  let total = 0;
  combo.components.forEach((component) => {
    const product = productMap.get(component.productId);
    if (!product) return;
    total += costWithIva(product) * component.quantity;
  });
  return round2(total);
};

export const comboNormalPrice = (
  combo: { components: ComboComponent[] },
  productMap: Map<string, Product>,
  channel: Channel
): number => {
  let total = 0;
  combo.components.forEach((component) => {
    const product = productMap.get(component.productId);
    if (!product) return;
    total += basePrice(product, channel) * component.quantity;
  });
  return round2(total);
};

export const componentQuantity = (quantity: number, unit: Product["unit"]): number =>
  unit === "kg" ? round3(quantity) : Math.round(quantity);