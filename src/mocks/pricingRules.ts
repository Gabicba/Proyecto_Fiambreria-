import type { Product } from './products';

export interface PricingRule {
  id: string;
  name: string;
  type: 'quantity_discount' | '3x2' | 'combo' | 'category_promo' | 'supplier_promo' | 'manual_promo';
  appliesTo: 'retail' | 'wholesale' | 'both';
  minQuantity: number;
  discountPercent: number;
  discountAmount: number;
  category: string;
  supplier: string;
  productIds: string[];
  startDate: string;
  endDate: string;
  isActive: boolean;
}

// NEW: Tier pricing — e.g. "1 KG por $11.700", "2 KG por $21.700"
export interface PricingTier {
  id: string;
  productId: string;
  productName: string;
  productImage?: string;
  unitLabel: string;        // e.g. "1 KG", "2 KG", "1/2 KG", "1/2 KG Molido"
  quantity: number;         // numeric quantity (1, 2, 4, 0.5)
  totalPrice: number;       // price for that quantity
  isActive: boolean;
  appliesTo: 'retail' | 'wholesale' | 'both';
}

export interface AppliedDiscount {
  ruleId: string;
  ruleName: string;
  amount: number;
  description: string;
}

const RULES_KEY = 'fiambreria_pricing_rules';
const TIERS_KEY = 'fiambreria_pricing_tiers';

// Default tiers for demo (will be overridden once user creates their own)
function generateDefaultTiers(): PricingTier[] {
  return [
    { id: 'T001', productId: '1', productName: 'Jamón crudo c/hueso', unitLabel: '1 KG', quantity: 1, totalPrice: 18500, isActive: true, appliesTo: 'retail' },
    { id: 'T002', productId: '1', productName: 'Jamón crudo c/hueso', unitLabel: '2 KG', quantity: 2, totalPrice: 34000, isActive: true, appliesTo: 'retail' },
    { id: 'T003', productId: '1', productName: 'Jamón crudo c/hueso', unitLabel: '4 KG', quantity: 4, totalPrice: 62000, isActive: true, appliesTo: 'retail' },
    { id: 'T004', productId: '1', productName: 'Jamón crudo c/hueso', unitLabel: '1/2 KG', quantity: 0.5, totalPrice: 9400, isActive: true, appliesTo: 'retail' },
    { id: 'T005', productId: '2', productName: 'Jamón cocido', unitLabel: '1 KG', quantity: 1, totalPrice: 9200, isActive: true, appliesTo: 'retail' },
    { id: 'T006', productId: '2', productName: 'Jamón cocido', unitLabel: '2 KG', quantity: 2, totalPrice: 17000, isActive: true, appliesTo: 'retail' },
    { id: 'T007', productId: '2', productName: 'Jamón cocido', unitLabel: '1/2 KG', quantity: 0.5, totalPrice: 4700, isActive: false, appliesTo: 'retail' },
    { id: 'T008', productId: '8', productName: 'Queso cremoso', unitLabel: '1 KG', quantity: 1, totalPrice: 5800, isActive: true, appliesTo: 'retail' },
    { id: 'T009', productId: '8', productName: 'Queso cremoso', unitLabel: '2 KG', quantity: 2, totalPrice: 10800, isActive: true, appliesTo: 'retail' },
    { id: 'T010', productId: '8', productName: 'Queso cremoso', unitLabel: '1/2 KG Molido', quantity: 0.5, totalPrice: 3100, isActive: true, appliesTo: 'retail' },
  ];
}

export function loadPricingRules(): PricingRule[] {
  try {
    const data = localStorage.getItem(RULES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function savePricingRules(rules: PricingRule[]): void {
  localStorage.setItem(RULES_KEY, JSON.stringify(rules));
}

export function loadPricingTiers(): PricingTier[] {
  try {
    const data = localStorage.getItem(TIERS_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }

  return generateDefaultTiers();
}

export function savePricingTiers(tiers: PricingTier[]): void {
  localStorage.setItem(TIERS_KEY, JSON.stringify(tiers));
}

function isRuleActive(rule: PricingRule): boolean {
  if (!rule.isActive) return false;
  const now = new Date().toISOString().split('T')[0];
  if (rule.startDate && now < rule.startDate) return false;
  if (rule.endDate && now > rule.endDate) return false;
  return true;
}

function ruleAppliesToMode(rule: PricingRule, mode: 'retail' | 'wholesale'): boolean {
  return rule.appliesTo === mode || rule.appliesTo === 'both';
}

interface CartItemLike {
  product: {
    id: string;
    category: string;
    supplier: string;
    retailPrice: number;
    wholesalePrice: number;
    unit: string;
  };
  quantity: number;
  weightKg?: number;
}

export function calculateDiscounts(
  cart: CartItemLike[],
  mode: 'retail' | 'wholesale',
  priceField: 'retailPrice' | 'wholesalePrice'
): AppliedDiscount[] {
  const rules = loadPricingRules();
  const discounts: AppliedDiscount[] = [];

  for (const rule of rules) {
    if (!isRuleActive(rule)) continue;
    if (!ruleAppliesToMode(rule, mode)) continue;

    let discountAmount = 0;

    switch (rule.type) {
      case 'quantity_discount': {
        for (const item of cart) {
          const qty = item.product.unit === 'kg' && item.weightKg ? item.weightKg : item.quantity;
          if (qty >= rule.minQuantity) {
            const price = item.product[priceField];
            const lineTotal = price * qty;
            discountAmount += Math.round(lineTotal * (rule.discountPercent / 100));
          }
        }
        break;
      }

      case '3x2': {
        for (const item of cart) {
          const qty = item.product.unit === 'kg' && item.weightKg ? item.weightKg : item.quantity;
          if (qty >= 3) {
            const price = item.product[priceField];
            const freeUnits = Math.floor(qty / 3);
            discountAmount += Math.round(price * freeUnits);
          }
        }
        break;
      }

      case 'category_promo': {
        if (!rule.category) break;
        const categoryItems = cart.filter((item) => item.product.category === rule.category);
        const categoryQty = categoryItems.reduce((sum, item) => {
          const qty = item.product.unit === 'kg' && item.weightKg ? item.weightKg : item.quantity;
          return sum + qty;
        }, 0);
        if (categoryQty >= rule.minQuantity) {
          for (const item of categoryItems) {
            const qty = item.product.unit === 'kg' && item.weightKg ? item.weightKg : item.quantity;
            const price = item.product[priceField];
            discountAmount += Math.round(price * qty * (rule.discountPercent / 100));
          }
        }
        break;
      }

      case 'supplier_promo': {
        if (!rule.supplier) break;
        const supplierItems = cart.filter((item) => item.product.supplier === rule.supplier);
        const supplierQty = supplierItems.reduce((sum, item) => {
          const qty = item.product.unit === 'kg' && item.weightKg ? item.weightKg : item.quantity;
          return sum + qty;
        }, 0);
        if (supplierQty >= rule.minQuantity) {
          for (const item of supplierItems) {
            const qty = item.product.unit === 'kg' && item.weightKg ? item.weightKg : item.quantity;
            const price = item.product[priceField];
            discountAmount += Math.round(price * qty * (rule.discountPercent / 100));
          }
        }
        break;
      }

      case 'combo': {
        if (rule.productIds.length === 0) break;
        const cartProductIds = new Set(cart.map((item) => item.product.id));
        const hasAllCombo = rule.productIds.every((pid) => cartProductIds.has(pid));
        if (hasAllCombo) {
          for (const item of cart) {
            if (rule.productIds.includes(item.product.id)) {
              const qty = item.product.unit === 'kg' && item.weightKg ? item.weightKg : item.quantity;
              const price = item.product[priceField];
              discountAmount += Math.round(price * qty * (rule.discountPercent / 100));
            }
          }
        }
        break;
      }

      case 'manual_promo':
        break;
    }

    if (discountAmount > 0) {
      discounts.push({
        ruleId: rule.id,
        ruleName: rule.name,
        amount: discountAmount,
        description: `${rule.name}: -${discountAmount.toLocaleString('es-AR')}`,
      });
    }
  }

  return discounts;
}

// NEW: Calculate best tier price for a product + quantity
export function getBestTierPrice(
  productId: string,
  quantity: number,
  mode: 'retail' | 'wholesale'
): { tierId: string | null; unitPrice: number; totalPrice: number; unitLabel: string } | null {
  const tiers = loadPricingTiers().filter(
    (t) => t.productId === productId && t.isActive && (t.appliesTo === mode || t.appliesTo === 'both')
  );
  if (tiers.length === 0) return null;

  // Sort by quantity desc — biggest pack first
  const sorted = tiers.sort((a, b) => b.quantity - a.quantity);

  for (const tier of sorted) {
    if (quantity >= tier.quantity) {
      return {
        tierId: tier.id,
        unitPrice: tier.totalPrice / tier.quantity,
        totalPrice: tier.totalPrice,
        unitLabel: tier.unitLabel,
      };
    }
  }

  return null;
}