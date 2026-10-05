import { useCallback, useMemo, useState } from "react";
import type { Channel, Combo, Product, SaleItem, Unit } from "@/types";
import { useApp } from "@/store/AppContext";
import {
  comboEstimatedCost,
  costWithIva,
  resolvePriceForQuantity,
} from "@/utils/pricing";
import { round2, round3, uid } from "@/utils/format";

interface CartLine {
  id: string;
  kind: "product" | "combo";
  productId: string | null;
  comboId: string | null;
  quantity: number;
}

export interface CartLineView extends SaleItem {
  lineId: string;
  availableStock: number | null;
}

interface UseSaleCart {
  lines: CartLineView[];
  subtotal: number;
  estimatedCost: number;
  estimatedProfit: number;
  itemCount: number;
  unitCount: number;
  addProduct: (product: Product, quantity?: number) => string;
  addCombo: (combo: Combo, quantity?: number) => string;
  setQuantity: (lineId: string, quantity: number) => void;
  removeLine: (lineId: string) => void;
  clear: () => void;
  loadItems: (items: SaleItem[]) => void;
  toSaleItems: () => SaleItem[];
  hasZeroQuantity: boolean;
}

export const useSaleCart = (channel: Channel): UseSaleCart => {
  const { state, productMap } = useApp();
  const [lines, setLines] = useState<CartLine[]>([]);

  const addProduct = useCallback(
    (product: Product, quantity = 1): string => {
      const existing = lines.find(
        (l) => l.kind === "product" && l.productId === product.id
      );
      if (existing) {
        setLines((prev) =>
          prev.map((l) =>
            l.id === existing.id
              ? { ...l, quantity: round3(l.quantity + quantity) }
              : l
          )
        );
        return existing.id;
      }
      const id = uid("line");
      setLines((prev) => [
        ...prev,
        {
          id,
          kind: "product",
          productId: product.id,
          comboId: null,
          quantity,
        },
      ]);
      return id;
    },
    [lines]
  );

  const addCombo = useCallback(
    (combo: Combo, quantity = 1): string => {
      const existing = lines.find(
        (l) => l.kind === "combo" && l.comboId === combo.id
      );
      if (existing) {
        setLines((prev) =>
          prev.map((l) =>
            l.id === existing.id
              ? { ...l, quantity: round3(l.quantity + quantity) }
              : l
          )
        );
        return existing.id;
      }
      const id = uid("line");
      setLines((prev) => [
        ...prev,
        {
          id,
          kind: "combo",
          productId: null,
          comboId: combo.id,
          quantity,
        },
      ]);
      return id;
    },
    [lines]
  );

  const unitOf = (line: CartLine): Unit => {
    if (line.kind === "combo") return "unidad";
    const product = line.productId ? productMap.get(line.productId) : null;
    return product?.unit ?? "unidad";
  };

  const setQuantity = useCallback(
    (lineId: string, quantity: number) => {
      setLines((prev) =>
        prev.map((line) => {
          if (line.id !== lineId) return line;
          const unit = unitOf(line);
          let next = quantity;
          if (unit === "unidad") next = Math.max(0, Math.round(next));
          else next = Math.max(0, round3(next));
          return { ...line, quantity: next };
        })
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [productMap]
  );

  const removeLine = useCallback((lineId: string) => {
    setLines((prev) => prev.filter((l) => l.id !== lineId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const loadItems = useCallback((items: SaleItem[]) => {
    setLines(
      items.map((item) => ({
        id: uid("line"),
        kind: item.kind,
        productId: item.productId,
        comboId: item.comboId,
        quantity: item.quantity,
      }))
    );
  }, []);

  const linesView = useMemo<CartLineView[]>(() => {
    return lines.map((line) => {
      if (line.kind === "combo" && line.comboId) {
        const combo = state.combos.find((c) => c.id === line.comboId);
        const unitPrice = combo?.price ?? 0;
        const name = combo?.name ?? "Combo";
        return {
          lineId: line.id,
          id: line.id,
          kind: "combo" as const,
          productId: null,
          comboId: line.comboId,
          name,
          unit: "unidad" as Unit,
          quantity: line.quantity,
          listPrice: unitPrice,
          unitPrice,
          subtotal: round2(unitPrice * line.quantity),
          promotionLabel: "Combo",
          availableStock: null,
        };
      }
      const product = line.productId ? productMap.get(line.productId) : null;
      if (!product) {
        return {
          lineId: line.id,
          id: line.id,
          kind: "product" as const,
          productId: line.productId,
          comboId: null,
          name: "Producto eliminado",
          unit: "unidad" as Unit,
          quantity: line.quantity,
          listPrice: 0,
          unitPrice: 0,
          subtotal: 0,
          promotionLabel: null,
          availableStock: null,
        };
      }
      const resolved = resolvePriceForQuantity(
        product,
        channel,
        line.quantity,
        state.pricingRules
      );
      return {
        lineId: line.id,
        id: line.id,
        kind: "product" as const,
        productId: product.id,
        comboId: null,
        name: product.name,
        unit: product.unit,
        quantity: line.quantity,
        listPrice: resolved.listPrice,
        unitPrice: resolved.unitPrice,
        subtotal: round2(resolved.unitPrice * line.quantity),
        promotionLabel: resolved.label,
        availableStock: product.stock,
      };
    });
  }, [lines, productMap, channel, state.pricingRules, state.combos]);

  const subtotal = useMemo(
    () => round2(linesView.reduce((a, l) => a + l.subtotal, 0)),
    [linesView]
  );

  const estimatedCost = useMemo(
    () =>
      round2(
        linesView.reduce((acc, line) => {
          if (line.kind === "combo" && line.comboId) {
            const combo = state.combos.find((c) => c.id === line.comboId);
            if (combo) return acc + comboEstimatedCost(combo, productMap) * line.quantity;
            return acc;
          }
          if (line.productId) {
            const product = productMap.get(line.productId);
            if (product) return acc + costWithIva(product) * line.quantity;
          }
          return acc;
        }, 0)
      ),
    [linesView, productMap, state.combos]
  );

  const itemCount = linesView.length;
  const unitCount = linesView.reduce((a, l) => a + l.quantity, 0);
  const hasZeroQuantity = linesView.some((l) => l.quantity <= 0);

  const toSaleItems = useCallback(
    (): SaleItem[] =>
      linesView.map(({ lineId, availableStock, ...item }) => {
        void lineId;
        void availableStock;
        return item;
      }),
    [linesView]
  );

  return {
    lines: linesView,
    subtotal,
    estimatedCost,
    estimatedProfit: round2(subtotal - estimatedCost),
    itemCount,
    unitCount,
    addProduct,
    addCombo,
    setQuantity,
    removeLine,
    clear,
    loadItems,
    toSaleItems,
    hasZeroQuantity,
  };
};