import type {
  InvoiceStatus,
  Product,
  PurchaseInvoice,
  PurchaseInvoiceLine,
  SupplierPayment,
  TaxDistributionRule,
  Unit,
} from "@/types";
import { round2 } from "@/utils/format";

export const invoiceBalance = (invoice: PurchaseInvoice): number =>
  round2(Math.max(0, invoice.total - invoice.paidAmount));

export const invoiceStatus = (
  total: number,
  paid: number
): InvoiceStatus => {
  if (paid <= 0.009) return "pendiente";
  if (paid + 0.01 >= total) return "pagada";
  return "parcial";
};

export const invoiceStatusLabel = (status: InvoiceStatus): string => {
  if (status === "pagada") return "Pagada";
  if (status === "parcial") return "Parcialmente pagada";
  return "Pendiente de pago";
};

export const invoiceStatusTone = (
  status: InvoiceStatus
): "success" | "warning" | "danger" => {
  if (status === "pagada") return "success";
  if (status === "parcial") return "warning";
  return "danger";
};

export const supplierInvoices = (
  supplierId: string,
  invoices: PurchaseInvoice[]
): PurchaseInvoice[] =>
  invoices
    .filter((i) => i.supplierId === supplierId)
    .sort((a, b) => b.date.localeCompare(a.date));

export const supplierPayments = (
  supplierId: string,
  payments: SupplierPayment[]
): SupplierPayment[] =>
  payments
    .filter((p) => p.supplierId === supplierId)
    .sort((a, b) => b.date.localeCompare(a.date));

/** Deuda total de un proveedor: suma de saldos de todas sus facturas. */
export const supplierDebt = (
  supplierId: string,
  invoices: PurchaseInvoice[]
): number =>
  round2(
    invoices
      .filter((i) => i.supplierId === supplierId)
      .reduce((acc, i) => acc + invoiceBalance(i), 0)
  );

export const supplierFinancialStatus = (
  supplierId: string,
  invoices: PurchaseInvoice[]
): "al-dia" | "pendiente" =>
  supplierDebt(supplierId, invoices) > 0.5 ? "pendiente" : "al-dia";

/**
 * Distribuye un impuesto adicional (percepcion) entre las lineas de la factura.
 * Reglas configurables:
 *  - "neto": en proporcion al subtotal neto de cada linea.
 *  - "iva": en proporcion al IVA de cada linea.
 *  - "igual": en partes iguales entre las lineas.
 */
export const distributeTax = (
  bases: { net: number; iva: number }[],
  totalTax: number,
  rule: TaxDistributionRule
): number[] => {
  if (bases.length === 0) return [];
  if (totalTax <= 0) return bases.map(() => 0);

  if (rule === "igual") {
    const share = totalTax / bases.length;
    const result = bases.map(() => round2(share));
    // Ajuste de redondeo sobre la ultima linea.
    const diff = round2(totalTax - result.reduce((a, b) => a + b, 0));
    result[result.length - 1] = round2(result[result.length - 1] + diff);
    return result;
  }

  const weights = bases.map((b) => (rule === "iva" ? b.iva : b.net));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalWeight <= 0) {
    const share = totalTax / bases.length;
    return bases.map(() => round2(share));
  }
  const result = weights.map((w) => round2((totalTax * w) / totalWeight));
  const diff = round2(totalTax - result.reduce((a, b) => a + b, 0));
  const lastIndex = result.findIndex((_, idx) => idx === result.length - 1);
  result[lastIndex] = round2(result[lastIndex] + diff);
  return result;
};

/** Nuevo precio conservando el multiplicador actual sobre el costo sin IVA. */
export const priceFromMultiplier = (
  newCostWithIva: number,
  prevPrice: number,
  prevCostWithIva: number
): number => {
  if (prevCostWithIva <= 0 || prevPrice <= 0) return round2(prevPrice);
  return round2(newCostWithIva * (prevPrice / prevCostWithIva));
};

/** Costo sin IVA a partir del importe facturado segun la modalidad. */
export const netCostFromInput = (
  costInput: number,
  iva: number,
  includesIva: boolean
): number => round2(includesIva ? costInput / (1 + iva / 100) : costInput);

/** Costo con IVA a partir del importe facturado segun la modalidad. */
export const grossCostFromInput = (
  costInput: number,
  iva: number,
  includesIva: boolean
): number => round2(includesIva ? costInput : costInput * (1 + iva / 100));

/**
 * Convierte un importe facturado entre modalidades sin alterar su valor economico.
 * De "con IVA" a "sin IVA" divide por (1 + IVA); al reves multiplica.
 */
export const convertCostInput = (
  costInput: number,
  iva: number,
  fromIncludesIva: boolean,
  toIncludesIva: boolean
): number => {
  if (fromIncludesIva === toIncludesIva) return round2(costInput);
  return round2(
    toIncludesIva
      ? costInput * (1 + iva / 100)
      : costInput / (1 + iva / 100)
  );
};

export interface RawPurchaseLine {
  productId: string;
  quantity: number;
  costInput: number;
  boxes?: number | null;
  unitsPerBox?: number | null;
}

export interface PurchaseTotals {
  lines: PurchaseInvoiceLine[];
  subtotalNet: number;
  ivaTotal: number;
  perceptionIvaTotal: number;
  perceptionIibbTotal: number;
  total: number;
}

/**
 * Calcula las lineas de una factura de compra.
 * - Si los precios incluyen IVA, el costo neto se despeja segun el IVA del producto.
 * - Los nuevos precios de venta mantienen el multiplicador actual sobre el costo sin IVA.
 * - Las percepciones se distribuyen entre lineas con la regla configurable.
 */
export const computePurchase = (
  products: Product[],
  items: RawPurchaseLine[],
  options: {
    pricesIncludeIva: boolean;
    perceptionIvaRate: number;
    perceptionIibbRate: number;
    taxDistributionRule: TaxDistributionRule;
  }
): PurchaseTotals => {
  const map = new Map(products.map((p) => [p.id, p]));
  const draft: Omit<
    PurchaseInvoiceLine,
    "perceptionIva" | "perceptionIibb" | "total"
  >[] = [];

  items.forEach((item) => {
    const product = map.get(item.productId);
    if (!product || item.costInput <= 0 || item.quantity <= 0) return;
    const iva = product.iva;
    const costNet = netCostFromInput(
      item.costInput,
      iva,
      options.pricesIncludeIva
    );
    const costWithIva = round2(costNet * (1 + iva / 100));
    const subtotalNet = round2(costNet * item.quantity);
    const ivaAmount = round2(subtotalNet * (iva / 100));
    // Las reglas comerciales existentes se calculan sobre el costo SIN IVA.
    const newPriceRetail = priceFromMultiplier(
      costNet,
      product.priceRetail,
      product.costNet
    );
    const newPriceWholesale = product.samePrice
      ? newPriceRetail
      : priceFromMultiplier(costNet, product.priceWholesale, product.costNet);

    draft.push({
      id: `pl_${item.productId}_${draft.length}`,
      productId: product.id,
      productName: product.name,
      unit: product.unit as Unit,
      quantity: item.quantity,
      boxes: item.boxes ?? null,
      unitsPerBox: item.unitsPerBox ?? null,
      costInput: round2(item.costInput),
      costNet,
      costWithIva,
      iva,
      subtotalNet,
      ivaAmount,
      prevCostNet: product.costNet,
      prevPriceRetail: product.priceRetail,
      prevPriceWholesale: product.priceWholesale,
      newPriceRetail,
      newPriceWholesale,
    });
  });

  const subtotalNet = round2(draft.reduce((a, l) => a + l.subtotalNet, 0));
  const ivaTotal = round2(draft.reduce((a, l) => a + l.ivaAmount, 0));
  const perceptionIvaTotal = round2(
    subtotalNet * (options.perceptionIvaRate / 100)
  );
  const perceptionIibbTotal = round2(
    subtotalNet * (options.perceptionIibbRate / 100)
  );
  const bases = draft.map((l) => ({ net: l.subtotalNet, iva: l.ivaAmount }));
  const ivaShares = distributeTax(
    bases,
    perceptionIvaTotal,
    options.taxDistributionRule
  );
  const iibbShares = distributeTax(
    bases,
    perceptionIibbTotal,
    options.taxDistributionRule
  );

  const lines: PurchaseInvoiceLine[] = draft.map((l, index) => {
    const perceptionIva = ivaShares[index] ?? 0;
    const perceptionIibb = iibbShares[index] ?? 0;
    return {
      ...l,
      perceptionIva,
      perceptionIibb,
      total: round2(
        l.subtotalNet + l.ivaAmount + perceptionIva + perceptionIibb
      ),
    };
  });

  const total = round2(lines.reduce((a, l) => a + l.total, 0));

  return {
    lines,
    subtotalNet,
    ivaTotal,
    perceptionIvaTotal,
    perceptionIibbTotal,
    total,
  };
};