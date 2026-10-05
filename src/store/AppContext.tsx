import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  Account,
  AppState,
  AuditEntry,
  CashSession,
  Combo,
  FinanceMovement,
  HeldSale,
  Payment,
  PaymentMethod,
  PricingRule,
  Product,
  Sale,
  SaleItem,
  StockMovement,
  User,
} from "@/types";
import { mockUsers, mockAccounts, mockPaymentMethods } from "@/mocks/accounts";
import { mockCategories } from "@/mocks/categories";
import { mockSuppliers } from "@/mocks/suppliers";
import { mockProducts } from "@/mocks/products";
import { mockCombos, mockPricingRules } from "@/mocks/promotions";
import { costWithIva, comboEstimatedCost } from "@/utils/pricing";
import { cashPortionOf, changeFor } from "@/utils/sales";
import { round2, round3, toDateKey, uid } from "@/utils/format";

const STORAGE_KEY = "elchileno_state_v2";

interface SendToControlInput {
  channel: Sale["channel"];
  customer: string;
  items: SaleItem[];
  payments: Payment[];
  seller: User;
  cashReceived: number | null;
  // Si viene, corrige y reenvia una operacion devuelta en lugar de crear una nueva.
  resubmitId?: string;
}

interface ConfirmSaleOptions {
  verifier: User;
  payments?: Payment[];
  cashReceived?: number | null;
  transferVerified?: boolean;
}

interface OpenCashInput {
  initialCash: number;
  note: string;
  user: User;
}

interface AdjustStockInput {
  productId: string;
  newStock: number;
  reason: string;
  note?: string;
  user: User;
  costNet?: number | null;
  priceRetail?: number | null;
  priceWholesale?: number | null;
}

interface AppContextValue {
  state: AppState;
  currentUser: User | null;
  productMap: Map<string, Product>;
  accountMap: Map<string, Account>;
  paymentMethodMap: Map<string, PaymentMethod>;
  login: (username: string, password: string) => User | null;
  logout: () => void;
  upsertProduct: (product: Product, userName: string) => void;
  adjustStock: (input: AdjustStockInput) => void;
  bulkUpdatePrices: (
    updates: {
      productId: string;
      costNet: number;
      priceRetail: number;
      priceWholesale: number;
    }[],
    user: User
  ) => void;
  saveCombo: (combo: Combo) => void;
  deleteCombo: (comboId: string) => void;
  savePricingRule: (rule: PricingRule) => void;
  deletePricingRule: (ruleId: string) => void;
  saveAccount: (account: Account, userName: string) => void;
  openCashSession: (input: OpenCashInput) => CashSession;
  annulSale: (saleId: string, reason: string, user: User) => Sale | null;
  holdSale: (held: HeldSale) => void;
  removeHeldSale: (heldId: string) => void;
  sendToControl: (input: SendToControlInput) => Sale;
  confirmSale: (saleId: string, options: ConfirmSaleOptions) => Sale | null;
  returnSale: (saleId: string, reason: string, user: User) => void;
  cancelSale: (saleId: string, reason: string, user: User) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const buildSeedSales = (userName: string): Sale[] => {
  const today = new Date();
  const withTime = (h: number, m: number): string => {
    const d = new Date(today);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };
  const mk = (
    number: number,
    hour: number,
    minute: number,
    channel: Sale["channel"],
    items: SaleItem[],
    payments: Payment[],
    cost: number
  ): Sale => {
    const subtotal = round2(items.reduce((a, i) => a + i.subtotal, 0));
    const total = subtotal;
    return {
      id: uid("sale"),
      number,
      date: withTime(hour, minute),
      sellerId: "u2",
      sellerName: userName,
      channel,
      customer: channel === "wholesale" ? "Kiosco Don Pedro" : "",
      items,
      payments,
      subtotal,
      total,
      estimatedCost: cost,
      estimatedProfit: round2(total - cost),
      estimatedMargin: total > 0 ? round2(((total - cost) / total) * 100) : 0,
      status: "finalizada",
      sentAt: withTime(hour, minute),
      confirmedAt: withTime(hour, minute),
      confirmedByName: "Rosa Gimenez",
      cashReceived: null,
      change: null,
      transferVerified: false,
      returnReason: null,
    };
  };

  const item = (
    name: string,
    unit: SaleItem["unit"],
    quantity: number,
    unitPrice: number
  ): SaleItem => ({
    id: uid("item"),
    kind: "product",
    productId: null,
    comboId: null,
    name,
    unit,
    quantity,
    listPrice: unitPrice,
    unitPrice,
    subtotal: round2(quantity * unitPrice),
    promotionLabel: null,
  });

  const pay = (
    methodName: string,
    accountId: string,
    accountName: string,
    amount: number
  ): Payment => ({
    id: uid("pay"),
    methodId: "m1",
    methodName,
    accountId,
    accountName,
    amount,
  });

  const s1 = mk(
    1001,
    9,
    20,
    "retail",
    [
      { ...item("Jamon cocido", "kg", 0.25, 9200), productId: "p1" },
      {
        ...item("Queso cremoso", "kg", 0.5, 6900),
        productId: "p9",
        promotionLabel: "Oferta temporal",
      },
    ],
    [pay("Efectivo", "a1", "Caja Efectivo", 5750)],
    3900
  );

  const s2 = mk(
    1002,
    10,
    5,
    "wholesale",
    [{ ...item("Coca Cola 2.25 L", "unidad", 12, 2600), productId: "p14" }],
    [pay("Transferencia", "a2", "Banco X", 31200)],
    25200
  );

  const s3 = mk(
    1003,
    11,
    40,
    "retail",
    [
      {
        ...item("Flautita", "unidad", 6, 150),
        productId: "p13",
        promotionLabel: "Precio por cantidad",
      },
      {
        ...item("Combo Panchos", "unidad", 1, 5600),
        kind: "combo",
        comboId: "cb1",
      },
    ],
    [
      pay("Efectivo", "a1", "Caja Efectivo", 4000),
      pay("Debito", "a2", "Banco X", 2500),
    ],
    4000
  );

  return [s1, s2, s3];
};

const buildInitialState = (): AppState => {
  const sales = buildSeedSales("Carla Diaz");
  const financeMovements: FinanceMovement[] = [];
  sales.forEach((sale) => {
    sale.payments.forEach((payment) => {
      financeMovements.push({
        id: uid("fin"),
        accountId: payment.accountId,
        accountName: payment.accountName,
        type: "ingreso",
        amount: payment.amount,
        date: sale.date,
        origin: `Venta #${sale.number}`,
        saleId: sale.id,
        userName: sale.sellerName,
        kind: "venta",
      });
    });
  });

  return {
    users: mockUsers,
    currentUserId: null,
    products: mockProducts,
    categories: mockCategories,
    suppliers: mockSuppliers,
    accounts: mockAccounts,
    paymentMethods: mockPaymentMethods,
    pricingRules: mockPricingRules,
    combos: mockCombos,
    sales,
    heldSales: [],
    stockMovements: [],
    financeMovements,
    cashSessions: [],
    auditLog: [],
    saleCounter: 1003,
  };
};

const loadState = (): AppState => {
  if (typeof window === "undefined") return buildInitialState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildInitialState();
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed || !parsed.products) return buildInitialState();
    return parsed;
  } catch {
    return buildInitialState();
  }
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AppState>(loadState);
  // Candado de idempotencia: evita que un doble click confirme dos veces la misma venta.
  const processingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore persistence errors on the prototype
    }
  }, [state]);

  const productMap = useMemo(
    () => new Map(state.products.map((p) => [p.id, p])),
    [state.products]
  );
  const accountMap = useMemo(
    () => new Map(state.accounts.map((a) => [a.id, a])),
    [state.accounts]
  );
  const paymentMethodMap = useMemo(
    () => new Map(state.paymentMethods.map((m) => [m.id, m])),
    [state.paymentMethods]
  );

  const currentUser = useMemo(
    () => state.users.find((u) => u.id === state.currentUserId) ?? null,
    [state.users, state.currentUserId]
  );

  const login = useCallback(
    (username: string, password: string): User | null => {
      const user = state.users.find(
        (u) =>
          u.username.toLowerCase() === username.trim().toLowerCase() &&
          u.password === password
      );
      if (user) {
        setState((prev) => ({ ...prev, currentUserId: user.id }));
        return user;
      }
      return null;
    },
    [state.users]
  );

  const logout = useCallback(() => {
    setState((prev) => ({ ...prev, currentUserId: null }));
  }, []);

  const upsertProduct = useCallback((product: Product, userName: string) => {
    setState((prev) => {
      const exists = prev.products.some((p) => p.id === product.id);
      const products = exists
        ? prev.products.map((p) => (p.id === product.id ? product : p))
        : [product, ...prev.products];
      const audit: AuditEntry = {
        id: uid("audit"),
        date: new Date().toISOString(),
        userName,
        action: exists ? "Producto editado" : "Producto creado",
        previousValue: exists ? "Existente" : "—",
        newValue: product.name,
        origin: "Productos e Inventario",
      };
      return { ...prev, products, auditLog: [audit, ...prev.auditLog] };
    });
  }, []);

  const adjustStock = useCallback((input: AdjustStockInput) => {
    const {
      productId,
      newStock,
      reason,
      note,
      user,
      costNet,
      priceRetail,
      priceWholesale,
    } = input;
    setState((prev) => {
      const product = prev.products.find((p) => p.id === productId);
      if (!product) return prev;
      const delta = round3(newStock - product.stock);
      const nowIso = new Date().toISOString();
      const movement: StockMovement = {
        id: uid("mov"),
        productId,
        productName: product.name,
        quantity: delta,
        type: "Ajuste",
        date: nowIso,
        userId: user.id,
        userName: user.name,
        origin: `Ajuste · ${reason}`,
        note: note?.trim() || reason,
      };
      const audits: AuditEntry[] = [
        {
          id: uid("audit"),
          date: nowIso,
          userName: user.name,
          action: "Ajuste de stock",
          previousValue: `${product.stock}`,
          newValue: `${newStock}`,
          origin: `${product.name} · ${reason}`,
        },
      ];
      const updated: Product = { ...product, stock: newStock };
      if (typeof costNet === "number" && costNet > 0 && costNet !== product.costNet) {
        audits.push({
          id: uid("audit"),
          date: nowIso,
          userName: user.name,
          action: "Costo actualizado desde ajuste de stock",
          previousValue: `${product.costNet}`,
          newValue: `${costNet}`,
          origin: product.name,
        });
        updated.costNet = costNet;
      }
      if (typeof priceRetail === "number" && priceRetail !== product.priceRetail) {
        audits.push({
          id: uid("audit"),
          date: nowIso,
          userName: user.name,
          action: "Precio minorista actualizado desde ajuste de stock",
          previousValue: `${product.priceRetail}`,
          newValue: `${priceRetail}`,
          origin: product.name,
        });
        updated.priceRetail = priceRetail;
      }
      if (typeof priceWholesale === "number" && priceWholesale !== product.priceWholesale) {
        audits.push({
          id: uid("audit"),
          date: nowIso,
          userName: user.name,
          action: "Precio mayorista actualizado desde ajuste de stock",
          previousValue: `${product.priceWholesale}`,
          newValue: `${priceWholesale}`,
          origin: product.name,
        });
        updated.priceWholesale = priceWholesale;
      }
      return {
        ...prev,
        products: prev.products.map((p) => (p.id === productId ? updated : p)),
        stockMovements: [movement, ...prev.stockMovements],
        auditLog: [...audits, ...prev.auditLog],
      };
    });
  }, []);

  const bulkUpdatePrices = useCallback(
    (
      updates: {
        productId: string;
        costNet: number;
        priceRetail: number;
        priceWholesale: number;
      }[],
      user: User
    ) => {
      setState((prev) => {
        const products = prev.products.map((p) => {
          const update = updates.find((u) => u.productId === p.id);
          if (!update) return p;
          return {
            ...p,
            costNet: update.costNet,
            priceRetail: update.priceRetail,
            priceWholesale: update.priceWholesale,
          };
        });
        const audit: AuditEntry = {
          id: uid("audit"),
          date: new Date().toISOString(),
          userName: user.name,
          action: "Actualizacion masiva de precios",
          previousValue: "—",
          newValue: `${updates.length} productos`,
          origin: "Productos e Inventario",
        };
        return { ...prev, products, auditLog: [audit, ...prev.auditLog] };
      });
    },
    []
  );

  const saveCombo = useCallback((combo: Combo) => {
    setState((prev) => {
      const exists = prev.combos.some((c) => c.id === combo.id);
      return {
        ...prev,
        combos: exists
          ? prev.combos.map((c) => (c.id === combo.id ? combo : c))
          : [combo, ...prev.combos],
      };
    });
  }, []);

  const deleteCombo = useCallback((comboId: string) => {
    setState((prev) => ({
      ...prev,
      combos: prev.combos.filter((c) => c.id !== comboId),
    }));
  }, []);

  const savePricingRule = useCallback((rule: PricingRule) => {
    setState((prev) => {
      const filtered = prev.pricingRules.filter(
        (r) =>
          !(
            r.productId === rule.productId &&
            r.type === rule.type &&
            r.id !== rule.id
          )
      );
      const exists = prev.pricingRules.some((r) => r.id === rule.id);
      return {
        ...prev,
        pricingRules: exists
          ? filtered.map((r) => (r.id === rule.id ? rule : r))
          : [rule, ...filtered],
      };
    });
  }, []);

  const deletePricingRule = useCallback((ruleId: string) => {
    setState((prev) => ({
      ...prev,
      pricingRules: prev.pricingRules.filter((r) => r.id !== ruleId),
    }));
  }, []);

  const holdSale = useCallback((held: HeldSale) => {
    setState((prev) => ({ ...prev, heldSales: [held, ...prev.heldSales] }));
  }, []);

  const removeHeldSale = useCallback((heldId: string) => {
    setState((prev) => ({
      ...prev,
      heldSales: prev.heldSales.filter((h) => h.id !== heldId),
    }));
  }, []);

  const sendToControl = useCallback(
    ({
      channel,
      customer,
      items,
      payments,
      seller,
      cashReceived,
      resubmitId,
    }: SendToControlInput): Sale => {
      const map = new Map(state.products.map((p) => [p.id, p]));
      const estimatedCost = round2(
        items.reduce((acc, line) => {
          if (line.kind === "combo" && line.comboId) {
            const combo = state.combos.find((c) => c.id === line.comboId);
            if (combo) return acc + comboEstimatedCost(combo, map) * line.quantity;
            return acc;
          }
          if (line.productId) {
            const product = map.get(line.productId);
            if (product) return acc + costWithIva(product) * line.quantity;
          }
          return acc;
        }, 0)
      );
      const subtotal = round2(items.reduce((a, i) => a + i.subtotal, 0));
      const total = round2(payments.reduce((a, p) => a + p.amount, 0)) || subtotal;
      const nowIso = new Date().toISOString();
      const cash = typeof cashReceived === "number" ? round2(cashReceived) : null;

      // Reenvio de una operacion devuelta: se corrige la MISMA operacion, sin
      // duplicar el numero ni generar impactos de stock/ticket antes de tiempo.
      if (resubmitId) {
        const existing = state.sales.find((s) => s.id === resubmitId);
        if (existing && existing.status === "rechazada") {
          const updated: Sale = {
            ...existing,
            sellerId: seller.id,
            sellerName: seller.name,
            channel,
            customer,
            items,
            payments,
            subtotal,
            total,
            estimatedCost,
            estimatedProfit: round2(total - estimatedCost),
            estimatedMargin:
              total > 0 ? round2(((total - estimatedCost) / total) * 100) : 0,
            status: "pendiente",
            sentAt: nowIso,
            confirmedAt: null,
            confirmedByName: null,
            cashReceived: cash,
            change: null,
            transferVerified: false,
            returnReason: null,
            returnedAt: null,
            resubmittedAt: nowIso,
            version: (existing.version ?? 1) + 1,
          };
          const resubmitAudit: AuditEntry = {
            id: uid("audit"),
            date: nowIso,
            userName: seller.name,
            action: "Operacion corregida y reenviada a control",
            previousValue: existing.returnReason ?? "Devuelta a vendedor",
            newValue: `Operacion #${existing.number} · $${total}`,
            origin: "Caja de venta",
          };
          setState((prev) => ({
            ...prev,
            sales: prev.sales.map((s) => (s.id === resubmitId ? updated : s)),
            auditLog: [resubmitAudit, ...prev.auditLog],
          }));
          return updated;
        }
      }

      const nextNumber = state.saleCounter + 1;
      const sale: Sale = {
        id: uid("sale"),
        number: nextNumber,
        date: nowIso,
        sentAt: nowIso,
        confirmedAt: null,
        confirmedByName: null,
        sellerId: seller.id,
        sellerName: seller.name,
        channel,
        customer,
        items,
        payments,
        subtotal,
        total,
        estimatedCost,
        estimatedProfit: round2(total - estimatedCost),
        estimatedMargin: total > 0 ? round2(((total - estimatedCost) / total) * 100) : 0,
        status: "pendiente",
        cashReceived: cash,
        change: null,
        transferVerified: false,
        returnReason: null,
        returnedAt: null,
        resubmittedAt: null,
        version: 1,
      };
      const audit: AuditEntry = {
        id: uid("audit"),
        date: nowIso,
        userName: seller.name,
        action: "Venta enviada a control de caja",
        previousValue: "—",
        newValue: `Operacion #${nextNumber} · $${total}`,
        origin: "Caja de venta",
      };
      setState((prev) => ({
        ...prev,
        sales: [sale, ...prev.sales],
        saleCounter: nextNumber,
        auditLog: [audit, ...prev.auditLog],
      }));
      return sale;
    },
    [state]
  );

  const confirmSale = useCallback(
    (saleId: string, options: ConfirmSaleOptions): Sale | null => {
      // Idempotencia: si ya se esta procesando o ya fue finalizada, no repetir impactos.
      if (processingRef.current.has(saleId)) return null;
      const sale = state.sales.find((s) => s.id === saleId);
      if (!sale || sale.status !== "pendiente") return null;
      processingRef.current.add(saleId);
      const map = new Map(state.products.map((p) => [p.id, p]));
      const nowIso = new Date().toISOString();
      const payments = options.payments ?? sale.payments;
      const transferVerified = options.transferVerified ?? sale.transferVerified;
      const cashReceived =
        typeof options.cashReceived === "number"
          ? round2(options.cashReceived)
          : sale.cashReceived;
      const cashPortion = cashPortionOf(payments, state.accounts);
      const change =
        typeof cashReceived === "number" ? changeFor(cashReceived, cashPortion) : null;

      const stockDeltas = new Map<string, number>();
      const movements: StockMovement[] = [];

      sale.items.forEach((line) => {
        if (line.kind === "combo" && line.comboId) {
          const combo = state.combos.find((c) => c.id === line.comboId);
          combo?.components.forEach((component) => {
            const delta = -round3(component.quantity * line.quantity);
            stockDeltas.set(
              component.productId,
              round3((stockDeltas.get(component.productId) ?? 0) + delta)
            );
            const prod = map.get(component.productId);
            movements.push({
              id: uid("mov"),
              productId: component.productId,
              productName: prod?.name ?? component.productId,
              quantity: delta,
              type: "Combo",
              date: nowIso,
              userId: options.verifier.id,
              userName: options.verifier.name,
              origin: `Venta #${sale.number} · ${combo.name}`,
              note: "Descuento por combo",
            });
          });
        } else if (line.productId) {
          const delta = -round3(line.quantity);
          stockDeltas.set(
            line.productId,
            round3((stockDeltas.get(line.productId) ?? 0) + delta)
          );
          movements.push({
            id: uid("mov"),
            productId: line.productId,
            productName: line.name,
            quantity: delta,
            type: "Venta",
            date: nowIso,
            userId: options.verifier.id,
            userName: options.verifier.name,
            origin: `Venta #${sale.number}`,
            note: line.promotionLabel ?? "",
          });
        }
      });

      const products = state.products.map((p) =>
        stockDeltas.has(p.id)
          ? { ...p, stock: round3(p.stock + (stockDeltas.get(p.id) ?? 0)) }
          : p
      );

      const pricingRules = state.pricingRules.map((rule) => {
        if (rule.type !== "temporal-offer") return rule;
        const sold = sale.items
          .filter((line) => line.productId === rule.productId)
          .reduce((a, line) => a + line.quantity, 0);
        if (sold === 0) return rule;
        return { ...rule, consumedUnits: round3(rule.consumedUnits + sold) };
      });

      const finance: FinanceMovement[] = payments.map((p) => ({
        id: uid("fin"),
        accountId: p.accountId,
        accountName: p.accountName,
        type: "ingreso",
        amount: p.amount,
        date: nowIso,
        origin: `Venta #${sale.number}`,
        saleId: sale.id,
        userName: options.verifier.name,
        kind: "venta",
      }));

      const updatedSale: Sale = {
        ...sale,
        payments,
        status: "finalizada",
        confirmedAt: nowIso,
        confirmedByName: options.verifier.name,
        cashReceived: typeof cashReceived === "number" ? cashReceived : null,
        change,
        transferVerified,
      };

      const audit: AuditEntry = {
        id: uid("audit"),
        date: nowIso,
        userName: options.verifier.name,
        action: "Venta confirmada y finalizada en caja",
        previousValue: "Pendiente de control",
        newValue: `Venta #${sale.number} · $${sale.total}`,
        origin: "Control de ventas",
      };

      // Alerta administrativa para los productos que quedan con stock negativo.
      const negativeAlerts: AuditEntry[] = products
        .filter((p) => stockDeltas.has(p.id) && p.stock < 0)
        .map((p) => ({
          id: uid("audit"),
          date: nowIso,
          userName: options.verifier.name,
          action: "Alerta administrativa: stock negativo",
          previousValue: `${map.get(p.id)?.stock ?? ""}`,
          newValue: `${p.stock}`,
          origin: `${p.name} · Venta #${sale.number}`,
        }));

      setState((prev) => ({
        ...prev,
        products,
        pricingRules,
        sales: prev.sales.map((s) => (s.id === saleId ? updatedSale : s)),
        stockMovements: [...movements, ...prev.stockMovements],
        financeMovements: [...finance, ...prev.financeMovements],
        auditLog: [...negativeAlerts, audit, ...prev.auditLog],
      }));

      return updatedSale;
    },
    [state]
  );

  const returnSale = useCallback(
    (saleId: string, reason: string, user: User) => {
      setState((prev) => {
        const sale = prev.sales.find((s) => s.id === saleId);
        if (!sale) return prev;
        const nowIso = new Date().toISOString();
        const audit: AuditEntry = {
          id: uid("audit"),
          date: nowIso,
          userName: user.name,
          action: "Operacion devuelta para correccion",
          previousValue: "Pendiente de control",
          newValue: reason,
          origin: `Operacion #${sale.number}`,
        };
        return {
          ...prev,
          sales: prev.sales.map((s) =>
            s.id === saleId
              ? { ...s, status: "rechazada", returnReason: reason, returnedAt: nowIso }
              : s
          ),
          auditLog: [audit, ...prev.auditLog],
        };
      });
    },
    []
  );

  const cancelSale = useCallback(
    (saleId: string, reason: string, user: User) => {
      setState((prev) => {
        const sale = prev.sales.find((s) => s.id === saleId);
        if (!sale) return prev;
        const nowIso = new Date().toISOString();
        const audit: AuditEntry = {
          id: uid("audit"),
          date: nowIso,
          userName: user.name,
          action: "Operacion cancelada en caja",
          previousValue: "Pendiente de control",
          newValue: reason || "Cancelada",
          origin: `Operacion #${sale.number}`,
        };
        return {
          ...prev,
          sales: prev.sales.map((s) =>
            s.id === saleId ? { ...s, status: "cancelada", returnReason: reason } : s
          ),
          auditLog: [audit, ...prev.auditLog],
        };
      });
    },
    []
  );

  const saveAccount = useCallback((account: Account, userName: string) => {
    setState((prev) => {
      const exists = prev.accounts.some((a) => a.id === account.id);
      const accounts = exists
        ? prev.accounts.map((a) => (a.id === account.id ? account : a))
        : [...prev.accounts, account];
      const audit: AuditEntry = {
        id: uid("audit"),
        date: new Date().toISOString(),
        userName,
        action: exists ? "Cuenta de cobro editada" : "Cuenta de cobro creada",
        previousValue: exists ? "Existente" : "—",
        newValue: `${account.name}${account.active ? "" : " (inactiva)"}`,
        origin: "Configuracion · Cuentas de cobro",
      };
      return { ...prev, accounts, auditLog: [audit, ...prev.auditLog] };
    });
  }, []);

  const openCashSession = useCallback(
    ({ initialCash, note, user }: OpenCashInput): CashSession => {
      const now = new Date();
      const dateKey = toDateKey(now);
      const session: CashSession = {
        id: uid("cash"),
        dateKey,
        openedAt: now.toISOString(),
        openedById: user.id,
        openedByName: user.name,
        initialCash: round2(initialCash),
        note: note.trim(),
      };
      setState((prev) => {
        if (prev.cashSessions.some((c) => c.dateKey === dateKey)) return prev;
        const audit: AuditEntry = {
          id: uid("audit"),
          date: session.openedAt,
          userName: user.name,
          action: "Apertura de Caja del dia",
          previousValue: "Caja cerrada",
          newValue: `Efectivo inicial ${round2(initialCash)}`,
          origin: "Caja del dia",
        };
        return {
          ...prev,
          cashSessions: [session, ...prev.cashSessions],
          auditLog: [audit, ...prev.auditLog],
        };
      });
      return session;
    },
    []
  );

  const annulSale = useCallback(
    (saleId: string, reason: string, user: User): Sale | null => {
      // Idempotencia: una venta ya anulada no vuelve a mover dinero ni stock.
      const lockKey = `annul_${saleId}`;
      if (processingRef.current.has(lockKey)) return null;
      const sale = state.sales.find((s) => s.id === saleId);
      if (!sale || sale.status !== "finalizada") return null;
      processingRef.current.add(lockKey);
      const map = new Map(state.products.map((p) => [p.id, p]));
      const nowIso = new Date().toISOString();

      // Reversion de stock: reintegra las cantidades descontadas al confirmar.
      const stockDeltas = new Map<string, number>();
      const movements: StockMovement[] = [];
      sale.items.forEach((line) => {
        if (line.kind === "combo" && line.comboId) {
          const combo = state.combos.find((c) => c.id === line.comboId);
          combo?.components.forEach((component) => {
            const delta = round3(component.quantity * line.quantity);
            stockDeltas.set(
              component.productId,
              round3((stockDeltas.get(component.productId) ?? 0) + delta)
            );
            const prod = map.get(component.productId);
            movements.push({
              id: uid("mov"),
              productId: component.productId,
              productName: prod?.name ?? component.productId,
              quantity: delta,
              type: "Devolucion",
              date: nowIso,
              userId: user.id,
              userName: user.name,
              origin: `Anulacion Venta #${sale.number} · ${combo.name}`,
              note: "Reintegro por anulacion (combo)",
            });
          });
        } else if (line.productId) {
          const delta = round3(line.quantity);
          stockDeltas.set(
            line.productId,
            round3((stockDeltas.get(line.productId) ?? 0) + delta)
          );
          movements.push({
            id: uid("mov"),
            productId: line.productId,
            productName: line.name,
            quantity: delta,
            type: "Devolucion",
            date: nowIso,
            userId: user.id,
            userName: user.name,
            origin: `Anulacion Venta #${sale.number}`,
            note: "Reintegro por anulacion",
          });
        }
      });

      const products = state.products.map((p) =>
        stockDeltas.has(p.id)
          ? { ...p, stock: round3(p.stock + (stockDeltas.get(p.id) ?? 0)) }
          : p
      );

      // Reversion financiera: un contramovimiento por cada cobro confirmado.
      const finance: FinanceMovement[] = sale.payments.map((p) => ({
        id: uid("fin"),
        accountId: p.accountId,
        accountName: p.accountName,
        type: "egreso",
        amount: p.amount,
        date: nowIso,
        origin: `Anulacion Venta #${sale.number}`,
        saleId: sale.id,
        userName: user.name,
        kind: "anulacion",
      }));

      // Devuelve el cupo consumido por la venta (si era una oferta temporal).
      const pricingRules = state.pricingRules.map((rule) => {
        if (rule.type !== "temporal-offer") return rule;
        const sold = sale.items
          .filter((line) => line.productId === rule.productId)
          .reduce((a, line) => a + line.quantity, 0);
        if (sold === 0) return rule;
        return {
          ...rule,
          consumedUnits: Math.max(0, round3(rule.consumedUnits - sold)),
        };
      });

      const updatedSale: Sale = {
        ...sale,
        status: "anulada",
        annulledAt: nowIso,
        annulledByName: user.name,
        annulReason: reason,
      };

      const audit: AuditEntry = {
        id: uid("audit"),
        date: nowIso,
        userName: user.name,
        action: "Venta anulada (reversion de dinero y stock)",
        previousValue: `Venta #${sale.number} · $${sale.total}`,
        newValue: reason,
        origin: "Caja del dia",
      };

      setState((prev) => ({
        ...prev,
        products,
        pricingRules,
        sales: prev.sales.map((s) => (s.id === saleId ? updatedSale : s)),
        stockMovements: [...movements, ...prev.stockMovements],
        financeMovements: [...finance, ...prev.financeMovements],
        auditLog: [audit, ...prev.auditLog],
      }));

      return updatedSale;
    },
    [state]
  );

  const value: AppContextValue = {
    state,
    currentUser,
    productMap,
    accountMap,
    paymentMethodMap,
    login,
    logout,
    upsertProduct,
    adjustStock,
    bulkUpdatePrices,
    saveCombo,
    deleteCombo,
    savePricingRule,
    deletePricingRule,
    saveAccount,
    openCashSession,
    annulSale,
    holdSale,
    removeHeldSale,
    sendToControl,
    confirmSale,
    returnSale,
    cancelSale,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextValue => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
};

export const findTodaySales = (sales: Sale[]): Sale[] => {
  const todayKey = toDateKey(new Date());
  return sales.filter(
    (s) => s.status === "finalizada" && toDateKey(new Date(s.date)) === todayKey
  );
};

/** Ventas de hoy confirmadas y anuladas (para el historial operativo de Caja). */
export const findTodaySalesWithAnnulled = (sales: Sale[]): Sale[] => {
  const todayKey = toDateKey(new Date());
  return sales
    .filter(
      (s) =>
        (s.status === "finalizada" || s.status === "anulada") &&
        toDateKey(new Date(s.date)) === todayKey
    )
    .sort((a, b) => b.date.localeCompare(a.date));
};