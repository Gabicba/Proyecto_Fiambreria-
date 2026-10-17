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
  Employee,
  EmployeeAdvance,
  EmployeeAdvanceDiscount,
  EmployeeSalaryDiscount,
  EmployeeSalaryPayment,
  EmployeeWithdrawal,
  EmployeeWithdrawalLine,
  FinanceMovement,
  HeldSale,
  Payment,
  PaymentMethod,
  PricingRule,
  Product,
  PurchaseInvoice,
  PurchaseInvoiceLine,
  Sale,
  SaleItem,
  StockMovement,
  Supplier,
  SupplierPayment,
  TaxDistributionRule,
  User,
} from "@/types";
import { mockUsers, mockAccounts, mockPaymentMethods } from "@/mocks/accounts";
import { mockCategories } from "@/mocks/categories";
import { mockSuppliers } from "@/mocks/suppliers";
import { mockProducts } from "@/mocks/products";
import { mockCombos, mockPricingRules } from "@/mocks/promotions";
import {
  mockEmployees,
  mockEmployeeAdvances,
  mockEmployeePayments,
  mockEmployeeWithdrawals,
} from "@/mocks/employees";
import { costWithIva, comboEstimatedCost } from "@/utils/pricing";
import { accountBalance } from "@/utils/accounts";
import { computePurchase, invoiceStatus } from "@/utils/purchases";
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

export interface PurchaseLineInput {
  productId: string;
  quantity: number;
  costInput: number;
  boxes?: number | null;
  unitsPerBox?: number | null;
}

export interface CreatePurchaseInput {
  supplierId: string;
  date: string;
  receiptType: string;
  receiptNumber: string;
  attachmentName: string | null;
  pricesIncludeIva: boolean;
  perceptionIvaRate: number;
  perceptionIibbRate: number;
  taxDistributionRule: TaxDistributionRule;
  items: PurchaseLineInput[];
  note: string;
  payNow?: {
    amount: number;
    methodId: string;
    accountId: string;
    note?: string;
  } | null;
  user: User;
}

export interface CreatePurchaseResult {
  invoice: PurchaseInvoice | null;
  error: string | null;
}

export interface RegisterSupplierPaymentInput {
  invoiceId: string;
  amount: number;
  methodId: string;
  accountId: string;
  note: string;
  date?: string;
  user: User;
}

export interface TreasuryIncomeInput {
  accountId: string;
  amount: number;
  date: string;
  origin: string;
  note: string;
  user: User;
}

export interface TreasuryTransferInput {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: string;
  note: string;
  user: User;
}

export interface EmployeeWithdrawalInput {
  employeeId: string;
  date: string;
  items: { productId: string; quantity: number; unitPrice: number }[];
  note: string;
  user: User;
}

export interface EmployeeAdvanceInput {
  employeeId: string;
  amount: number;
  date: string;
  accountId: string;
  note: string;
  user: User;
}

export interface EmployeeSalaryPaymentInput {
  employeeId: string;
  periodFrom: string;
  periodTo: string;
  grossAmount: number;
  withdrawalIds: string[];
  advanceIds: string[];
  date: string;
  accountId: string;
  note: string;
  user: User;
  // Permite registrar un pago adicional aunque ya exista uno para el periodo.
  confirmDuplicate?: boolean;
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
  saveSupplier: (supplier: Supplier, userName: string) => void;
  createPurchaseInvoice: (input: CreatePurchaseInput) => CreatePurchaseResult;
  registerSupplierPayment: (
    input: RegisterSupplierPaymentInput
  ) => { payment: SupplierPayment | null; error: string | null };
  registerTreasuryIncome: (input: TreasuryIncomeInput) => boolean;
  registerTreasuryTransfer: (
    input: TreasuryTransferInput
  ) => { ok: boolean; error: string | null };
  saveEmployee: (employee: Employee, userName: string) => void;
  registerEmployeeWithdrawal: (input: EmployeeWithdrawalInput) => {
    withdrawal: EmployeeWithdrawal | null;
    error: string | null;
  };
  registerEmployeeAdvance: (input: EmployeeAdvanceInput) => {
    advance: EmployeeAdvance | null;
    error: string | null;
  };
  registerEmployeeSalaryPayment: (input: EmployeeSalaryPaymentInput) => {
    payment: EmployeeSalaryPayment | null;
    error: string | null;
  };
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

interface SeedPurchaseData {
  invoices: PurchaseInvoice[];
  payments: SupplierPayment[];
  finance: FinanceMovement[];
}

/** Datos de demostracion de compras: facturas pagadas, parciales y pendientes. */
const buildSeedPurchases = (userName: string): SeedPurchaseData => {
  const invoices: PurchaseInvoice[] = [];
  const payments: SupplierPayment[] = [];
  const finance: FinanceMovement[] = [];

  const at = (daysAgo: number, hour: number, minute: number): string => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };

  const supplierNameOf = (id: string): string =>
    mockSuppliers.find((s) => s.id === id)?.name ?? id;

  const makePayment = (
    invoice: PurchaseInvoice,
    amount: number,
    fractionPaid: number,
    methodId: string,
    accountId: string,
    dateOffsetDays: number,
    hour: number
  ) => {
    const account = mockAccounts.find((a) => a.id === accountId);
    const method = mockPaymentMethods.find((m) => m.id === methodId);
    const date = at(dateOffsetDays, hour, 30);
    const value = round2(invoice.total * amount);
    const payment: SupplierPayment = {
      id: uid("spay"),
      invoiceId: invoice.id,
      invoiceNumber: invoice.receiptNumber,
      supplierId: invoice.supplierId,
      supplierName: invoice.supplierName,
      amount: value,
      date,
      methodId,
      methodName: method?.name ?? "Transferencia",
      accountId,
      accountName: account?.name ?? "Cuenta",
      note: fractionPaid >= 1 ? "Pago total de factura" : "Pago parcial",
      userName,
    };
    payments.push(payment);
    finance.push({
      id: uid("fin"),
      accountId: payment.accountId,
      accountName: payment.accountName,
      type: "egreso",
      amount: value,
      date,
      origin: `Pago factura ${invoice.receiptNumber} · ${invoice.supplierName}`,
      saleId: null,
      userName,
      kind: "pago-proveedor",
      referenceId: invoice.id,
      note: payment.note,
    });
    invoice.paidAmount = round2(invoice.paidAmount + value);
    invoice.status = invoiceStatus(invoice.total, invoice.paidAmount);
  };

  const makeInvoice = (params: {
    supplierId: string;
    date: string;
    receiptType: string;
    receiptNumber: string;
    pricesIncludeIva: boolean;
    perceptionIvaRate: number;
    perceptionIibbRate: number;
    taxDistributionRule: TaxDistributionRule;
    items: { productId: string; quantity: number; costInput: number }[];
    note: string;
    paidFraction?: number;
    paidMethodId?: string;
    paidAccountId?: string;
  }): PurchaseInvoice => {
    const totals = computePurchase(mockProducts, params.items, {
      pricesIncludeIva: params.pricesIncludeIva,
      perceptionIvaRate: params.perceptionIvaRate,
      perceptionIibbRate: params.perceptionIibbRate,
      taxDistributionRule: params.taxDistributionRule,
    });
    const invoice: PurchaseInvoice = {
      id: uid("inv"),
      supplierId: params.supplierId,
      supplierName: supplierNameOf(params.supplierId),
      date: params.date,
      createdAt: params.date,
      receiptType: params.receiptType,
      receiptNumber: params.receiptNumber,
      attachmentName: `factura-${params.receiptNumber}.pdf`,
      pricesIncludeIva: params.pricesIncludeIva,
      perceptionIvaRate: params.perceptionIvaRate,
      perceptionIibbRate: params.perceptionIibbRate,
      taxDistributionRule: params.taxDistributionRule,
      items: totals.lines,
      subtotalNet: totals.subtotalNet,
      ivaTotal: totals.ivaTotal,
      perceptionIvaTotal: totals.perceptionIvaTotal,
      perceptionIibbTotal: totals.perceptionIibbTotal,
      total: totals.total,
      paidAmount: 0,
      status: "pendiente",
      note: params.note,
      userName,
    };
    invoices.push(invoice);
    if (params.paidFraction && params.paidFraction > 0) {
      makePayment(
        invoice,
        params.paidFraction,
        params.paidFraction,
        params.paidMethodId ?? "m2",
        params.paidAccountId ?? "a2",
        0,
        16
      );
    }
    return invoice;
  };

  makeInvoice({
    supplierId: "s1",
    date: at(2, 9, 40),
    receiptType: "Factura A",
    receiptNumber: "0001-00001234",
    pricesIncludeIva: true,
    perceptionIvaRate: 0,
    perceptionIibbRate: 0.5,
    taxDistributionRule: "neto",
    items: [
      { productId: "p1", quantity: 8, costInput: 6650 },
      { productId: "p6", quantity: 6, costInput: 6300 },
      { productId: "p9", quantity: 12, costInput: 5900 },
    ],
    note: "Reposicion semanal de fiambres y quesos.",
  });

  makeInvoice({
    supplierId: "s4",
    date: at(9, 10, 15),
    receiptType: "Factura B",
    receiptNumber: "0002-00004567",
    pricesIncludeIva: true,
    perceptionIvaRate: 3,
    perceptionIibbRate: 1.5,
    taxDistributionRule: "iva",
    items: [
      { productId: "p5", quantity: 5, costInput: 8100 },
      { productId: "p7", quantity: 4, costInput: 4300 },
      { productId: "p11", quantity: 3, costInput: 7100 },
      { productId: "p18", quantity: 24, costInput: 1850 },
    ],
    note: "Ingreso de embutidos artesanales.",
    paidFraction: 1,
    paidMethodId: "m2",
    paidAccountId: "a2",
  });

  makeInvoice({
    supplierId: "s2",
    date: at(16, 8, 30),
    receiptType: "Factura A",
    receiptNumber: "0003-00000999",
    pricesIncludeIva: false,
    perceptionIvaRate: 2,
    perceptionIibbRate: 1,
    taxDistributionRule: "neto",
    items: [
      { productId: "p3", quantity: 30, costInput: 7900 },
      { productId: "p4", quantity: 20, costInput: 7300 },
      { productId: "p12", quantity: 10, costInput: 5600 },
    ],
    note: "Compra de carnes. Precios sin IVA.",
    paidFraction: 0.45,
    paidMethodId: "m1",
    paidAccountId: "a1",
  });

  makeInvoice({
    supplierId: "s3",
    date: at(25, 7, 5),
    receiptType: "Factura C",
    receiptNumber: "0004-00003333",
    pricesIncludeIva: true,
    perceptionIvaRate: 0,
    perceptionIibbRate: 0,
    taxDistributionRule: "igual",
    items: [
      { productId: "p13", quantity: 200, costInput: 95 },
      { productId: "p17", quantity: 120, costInput: 210 },
      { productId: "p14", quantity: 48, costInput: 2150 },
    ],
    note: "Panificados y bebidas.",
    paidFraction: 1,
    paidMethodId: "m1",
    paidAccountId: "a1",
  });

  makeInvoice({
    supplierId: "s5",
    date: at(6, 11, 20),
    receiptType: "Factura B",
    receiptNumber: "0005-00007777",
    pricesIncludeIva: true,
    perceptionIvaRate: 1.5,
    perceptionIibbRate: 0.8,
    taxDistributionRule: "neto",
    items: [
      { productId: "p15", quantity: 48, costInput: 1250 },
      { productId: "p16", quantity: 36, costInput: 1200 },
      { productId: "p14", quantity: 24, costInput: 2180 },
    ],
    note: "Compra a hipermercado mayorista.",
    paidFraction: 0.3,
    paidMethodId: "m3",
    paidAccountId: "a4",
  });

  return { invoices, payments, finance };
};

const buildInitialState = (): AppState => {
  const sales = buildSeedSales("Carla Diaz");
  const purchases = buildSeedPurchases("Rosa Gimenez");
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

  // Egresos de demostracion por pagos de sueldo (neto acreditado al empleado).
  const salaryFinance: FinanceMovement[] = mockEmployeePayments.map((p) => ({
    id: uid("fin"),
    accountId: p.accountId,
    accountName: p.accountName,
    type: "egreso",
    amount: p.netAmount,
    date: p.date,
    origin: `Pago de sueldo · ${p.employeeName}`,
    saleId: null,
    userName: p.userName,
    kind: "pago-sueldo",
    referenceId: p.id,
    note: `Periodo ${p.periodFrom} al ${p.periodTo}`,
  }));

  // Egresos de demostracion por adelantos de sueldo ya entregados.
  const advanceFinance: FinanceMovement[] = mockEmployeeAdvances.map((a) => ({
    id: uid("fin"),
    accountId: a.accountId,
    accountName: a.accountName,
    type: "egreso" as const,
    amount: a.amount,
    date: a.date,
    origin: `Adelanto de sueldo · ${a.employeeName}`,
    saleId: null,
    userName: a.userName,
    kind: "adelanto-sueldo" as const,
    referenceId: a.id,
    note: a.note,
  }));

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
    financeMovements: [
      ...advanceFinance,
      ...salaryFinance,
      ...purchases.finance,
      ...financeMovements,
    ],
    cashSessions: [],
    auditLog: [],
    saleCounter: 1003,
    purchaseInvoices: purchases.invoices,
    supplierPayments: purchases.payments,
    employees: mockEmployees,
    employeeWithdrawals: mockEmployeeWithdrawals,
    employeePayments: mockEmployeePayments,
    employeeAdvances: mockEmployeeAdvances,
  };
};

const loadState = (): AppState => {
  if (typeof window === "undefined") return buildInitialState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildInitialState();
    let parsed = JSON.parse(raw) as AppState;
    if (!parsed || !parsed.products) return buildInitialState();
    // Compatibilidad con estados guardados antes del Sprint 2.
    if (!Array.isArray(parsed.purchaseInvoices)) {
      const purchases = buildSeedPurchases("Rosa Gimenez");
      const suppliers = Array.isArray(parsed.suppliers) ? parsed.suppliers : [];
      const mergedSuppliers = [
        ...suppliers,
        ...mockSuppliers.filter((s) => !suppliers.some((x) => x.id === s.id)),
      ];
      parsed = {
        ...parsed,
        suppliers: mergedSuppliers,
        financeMovements: [
          ...purchases.finance,
          ...(parsed.financeMovements ?? []),
        ],
        purchaseInvoices: purchases.invoices,
        supplierPayments: purchases.payments,
      };
    }
    // Compatibilidad con estados guardados antes del Sprint de empleados.
    if (!Array.isArray(parsed.employees)) {
      const salaryFinance: FinanceMovement[] = mockEmployeePayments.map((p) => ({
        id: uid("fin"),
        accountId: p.accountId,
        accountName: p.accountName,
        type: "egreso" as const,
        amount: p.netAmount,
        date: p.date,
        origin: `Pago de sueldo · ${p.employeeName}`,
        saleId: null,
        userName: p.userName,
        kind: "pago-sueldo" as const,
        referenceId: p.id,
        note: `Periodo ${p.periodFrom} al ${p.periodTo}`,
      }));
      parsed = {
        ...parsed,
        employees: mockEmployees,
        employeeWithdrawals: mockEmployeeWithdrawals,
        employeePayments: mockEmployeePayments,
        financeMovements: [...salaryFinance, ...(parsed.financeMovements ?? [])],
      };
    }
    // Compatibilidad con estados guardados antes de los adelantos de sueldo.
    if (!Array.isArray(parsed.employeeAdvances)) {
      const advanceFinance: FinanceMovement[] = mockEmployeeAdvances.map((a) => ({
        id: uid("fin"),
        accountId: a.accountId,
        accountName: a.accountName,
        type: "egreso" as const,
        amount: a.amount,
        date: a.date,
        origin: `Adelanto de sueldo · ${a.employeeName}`,
        saleId: null,
        userName: a.userName,
        kind: "adelanto-sueldo" as const,
        referenceId: a.id,
        note: a.note,
      }));
      parsed = {
        ...parsed,
        employeeAdvances: mockEmployeeAdvances,
        financeMovements: [...advanceFinance, ...(parsed.financeMovements ?? [])],
      };
    }
    // Normaliza pagos guardados sin el desglose de adelantos.
    parsed = {
      ...parsed,
      employeePayments: (parsed.employeePayments ?? []).map((p) => ({
        ...p,
        advanceDiscounts: Array.isArray(p.advanceDiscounts)
          ? p.advanceDiscounts
          : [],
        advanceDiscountsTotal:
          typeof p.advanceDiscountsTotal === "number"
            ? p.advanceDiscountsTotal
            : 0,
      })),
    };
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

  const saveSupplier = useCallback((supplier: Supplier, userName: string) => {
    setState((prev) => {
      const exists = prev.suppliers.some((s) => s.id === supplier.id);
      const suppliers = exists
        ? prev.suppliers.map((s) => (s.id === supplier.id ? supplier : s))
        : [supplier, ...prev.suppliers];
      const audit: AuditEntry = {
        id: uid("audit"),
        date: new Date().toISOString(),
        userName,
        action: exists ? "Proveedor editado" : "Proveedor creado",
        previousValue: exists ? "Existente" : "—",
        newValue: `${supplier.name}${supplier.active ? "" : " (inactivo)"}`,
        origin: "Proveedores",
      };
      return { ...prev, suppliers, auditLog: [audit, ...prev.auditLog] };
    });
  }, []);

  /**
   * Registra una factura de compra completa.
   * - La mercaderia SUMA stock (nunca lo reemplaza).
   * - Actualiza costos y precios previsualizados por el administrador.
   * - Registra la deuda y, opcionalmente, un pago inicial.
   * - Evita duplicados por proveedor + tipo + numero de comprobante.
   */
  const createPurchaseInvoice = useCallback(
    (input: CreatePurchaseInput): CreatePurchaseResult => {
      const supplier = state.suppliers.find((s) => s.id === input.supplierId);
      if (!supplier) {
        return { invoice: null, error: "Selecciona un proveedor valido." };
      }
      const receiptNumber = input.receiptNumber.trim();
      if (!receiptNumber) {
        return { invoice: null, error: "Ingresa el numero de comprobante." };
      }
      if (input.items.length === 0) {
        return { invoice: null, error: "Agrega al menos un producto." };
      }
      const totals = computePurchase(state.products, input.items, {
        pricesIncludeIva: input.pricesIncludeIva,
        perceptionIvaRate: input.perceptionIvaRate,
        perceptionIibbRate: input.perceptionIibbRate,
        taxDistributionRule: input.taxDistributionRule,
      });
      if (totals.lines.length === 0) {
        return {
          invoice: null,
          error: "Las lineas necesitan producto, cantidad y costo mayores a cero.",
        };
      }
      const duplicate = state.purchaseInvoices.some(
        (i) =>
          i.supplierId === input.supplierId &&
          i.receiptNumber.trim().toLowerCase() === receiptNumber.toLowerCase() &&
          i.receiptType === input.receiptType
      );
      if (duplicate) {
        return {
          invoice: null,
          error: "Ya existe una factura de este proveedor con ese comprobante.",
        };
      }
      const lockKey = `purchase_${input.supplierId}_${receiptNumber}`;
      if (processingRef.current.has(lockKey)) {
        return { invoice: null, error: "La operacion ya se esta registrando." };
      }
      processingRef.current.add(lockKey);

      const nowIso = new Date().toISOString();
      const invoiceId = uid("inv");
      const invoiceDate = input.date || nowIso;

      let payValue = 0;
      let payment: SupplierPayment | null = null;
      let account: Account | null = null;
      if (input.payNow && input.payNow.amount > 0) {
        account =
          state.accounts.find((a) => a.id === input.payNow?.accountId) ?? null;
        if (!account) {
          processingRef.current.delete(lockKey);
          return {
            invoice: null,
            error: "Selecciona una cuenta valida para el pago inicial.",
          };
        }
        payValue = round2(Math.min(input.payNow.amount, totals.total));
      }

      const invoice: PurchaseInvoice = {
        id: invoiceId,
        supplierId: supplier.id,
        supplierName: supplier.name,
        date: invoiceDate,
        createdAt: nowIso,
        receiptType: input.receiptType,
        receiptNumber,
        attachmentName: input.attachmentName,
        pricesIncludeIva: input.pricesIncludeIva,
        perceptionIvaRate: input.perceptionIvaRate,
        perceptionIibbRate: input.perceptionIibbRate,
        taxDistributionRule: input.taxDistributionRule,
        items: totals.lines,
        subtotalNet: totals.subtotalNet,
        ivaTotal: totals.ivaTotal,
        perceptionIvaTotal: totals.perceptionIvaTotal,
        perceptionIibbTotal: totals.perceptionIibbTotal,
        total: totals.total,
        paidAmount: payValue,
        status: invoiceStatus(totals.total, payValue),
        note: input.note.trim(),
        userName: input.user.name,
      };

      if (payValue > 0 && account && input.payNow) {
        const method = state.paymentMethods.find(
          (m) => m.id === input.payNow?.methodId
        );
        payment = {
          id: uid("spay"),
          invoiceId,
          invoiceNumber: receiptNumber,
          supplierId: supplier.id,
          supplierName: supplier.name,
          amount: payValue,
          date: nowIso,
          methodId: input.payNow.methodId,
          methodName: method?.name ?? "—",
          accountId: account.id,
          accountName: account.name,
          note: input.payNow.note?.trim() || "Pago al registrar el ingreso",
          userName: input.user.name,
        };
      }

      const lineByProduct = new Map<string, PurchaseInvoiceLine[]>();
      totals.lines.forEach((line) => {
        const list = lineByProduct.get(line.productId) ?? [];
        list.push(line);
        lineByProduct.set(line.productId, list);
      });

      const stockMovements: StockMovement[] = totals.lines.map((line) => ({
        id: uid("mov"),
        productId: line.productId,
        productName: line.productName,
        quantity: round3(line.quantity),
        type: "Ingreso",
        date: nowIso,
        userId: input.user.id,
        userName: input.user.name,
        origin: `Factura ${receiptNumber} · ${supplier.name}`,
        note: "Mercaderia recibida (suma al stock)",
      }));

      const products = state.products.map((product) => {
        const lines = lineByProduct.get(product.id);
        if (!lines || lines.length === 0) return product;
        const addedQty = round3(lines.reduce((a, l) => a + l.quantity, 0));
        const last = lines[lines.length - 1];
        return {
          ...product,
          stock: round3(product.stock + addedQty),
          costNet: last.costNet,
          priceRetail: last.newPriceRetail,
          priceWholesale: product.samePrice
            ? last.newPriceRetail
            : last.newPriceWholesale,
        };
      });

      const audits: AuditEntry[] = [];
      if (payment) {
        audits.push({
          id: uid("audit"),
          date: nowIso,
          userName: input.user.name,
          action: "Pago a proveedor registrado",
          previousValue: "—",
          newValue: `${payment.invoiceNumber} · ${payValue}`,
          origin: "Ingreso de mercaderia",
        });
      }
      audits.push({
        id: uid("audit"),
        date: nowIso,
        userName: input.user.name,
        action: "Factura de compra registrada",
        previousValue: "—",
        newValue: `${supplier.name} · ${receiptNumber} · $${totals.total}`,
        origin: "Ingreso de mercaderia",
      });
      products.forEach((product) => {
        const lines = lineByProduct.get(product.id);
        if (!lines || lines.length === 0) return;
        const first = lines[0];
        if (first.costNet !== first.prevCostNet) {
          audits.push({
            id: uid("audit"),
            date: nowIso,
            userName: input.user.name,
            action: "Costo aprobado desde ingreso de mercaderia",
            previousValue: `${first.prevCostNet}`,
            newValue: `${first.costNet}`,
            origin: `${product.name} · Factura ${receiptNumber}`,
          });
        }
        if (first.newPriceRetail !== first.prevPriceRetail) {
          audits.push({
            id: uid("audit"),
            date: nowIso,
            userName: input.user.name,
            action: "Precio minorista actualizado con previsualizacion",
            previousValue: `${first.prevPriceRetail}`,
            newValue: `${first.newPriceRetail}`,
            origin: `${product.name} · Factura ${receiptNumber}`,
          });
        }
      });

      const financeMovement: FinanceMovement[] = payment
        ? [
            {
              id: uid("fin"),
              accountId: payment.accountId,
              accountName: payment.accountName,
              type: "egreso",
              amount: payment.amount,
              date: nowIso,
              origin: `Pago factura ${receiptNumber} · ${supplier.name}`,
              saleId: null,
              userName: input.user.name,
              kind: "pago-proveedor",
              referenceId: invoiceId,
              note: payment.note,
            },
          ]
        : [];

      setState((prev) => ({
        ...prev,
        products,
        purchaseInvoices: [invoice, ...prev.purchaseInvoices],
        supplierPayments: payment
          ? [payment, ...prev.supplierPayments]
          : prev.supplierPayments,
        financeMovements: [...financeMovement, ...prev.financeMovements],
        stockMovements: [...stockMovements, ...prev.stockMovements],
        auditLog: [...audits, ...prev.auditLog],
      }));

      return { invoice, error: null };
    },
    [state]
  );

  const registerSupplierPayment = useCallback(
    (
      input: RegisterSupplierPaymentInput
    ): { payment: SupplierPayment | null; error: string | null } => {
      const invoice = state.purchaseInvoices.find((i) => i.id === input.invoiceId);
      if (!invoice) {
        return { payment: null, error: "No se encontro la factura." };
      }
      const balance = round2(invoice.total - invoice.paidAmount);
      if (balance <= 0.009) {
        return { payment: null, error: "La factura ya esta pagada." };
      }
      const amount = round2(input.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        return { payment: null, error: "Ingresa un importe mayor a cero." };
      }
      if (amount > balance + 0.01) {
        return {
          payment: null,
          error: `El pago supera el saldo pendiente (${balance}).`,
        };
      }
      const account = state.accounts.find((a) => a.id === input.accountId);
      if (!account) {
        return { payment: null, error: "Selecciona una cuenta de origen." };
      }
      const lockKey = `spay_${invoice.id}`;
      if (processingRef.current.has(lockKey)) {
        return { payment: null, error: "El pago ya se esta registrando." };
      }
      processingRef.current.add(lockKey);
      window.setTimeout(() => processingRef.current.delete(lockKey), 1200);

      const method = state.paymentMethods.find((m) => m.id === input.methodId);
      const payment: SupplierPayment = {
        id: uid("spay"),
        invoiceId: invoice.id,
        invoiceNumber: invoice.receiptNumber,
        supplierId: invoice.supplierId,
        supplierName: invoice.supplierName,
        amount,
        date: input.date || new Date().toISOString(),
        methodId: input.methodId,
        methodName: method?.name ?? "—",
        accountId: account.id,
        accountName: account.name,
        note: input.note.trim(),
        userName: input.user.name,
      };
      const paidAmount = round2(invoice.paidAmount + amount);
      const status = invoiceStatus(invoice.total, paidAmount);
      const movement: FinanceMovement = {
        id: uid("fin"),
        accountId: account.id,
        accountName: account.name,
        type: "egreso",
        amount,
        date: payment.date,
        origin: `Pago factura ${invoice.receiptNumber} · ${invoice.supplierName}`,
        saleId: null,
        userName: input.user.name,
        kind: "pago-proveedor",
        referenceId: invoice.id,
        note: payment.note,
      };
      const audit: AuditEntry = {
        id: uid("audit"),
        date: payment.date,
        userName: input.user.name,
        action: "Pago a proveedor registrado",
        previousValue: `Saldo ${balance}`,
        newValue: `Saldo ${round2(invoice.total - paidAmount)}`,
        origin: `${invoice.supplierName} · ${invoice.receiptNumber}`,
      };
      setState((prev) => ({
        ...prev,
        purchaseInvoices: prev.purchaseInvoices.map((i) =>
          i.id === invoice.id ? { ...i, paidAmount, status } : i
        ),
        supplierPayments: [payment, ...prev.supplierPayments],
        financeMovements: [movement, ...prev.financeMovements],
        auditLog: [audit, ...prev.auditLog],
      }));
      return { payment, error: null };
    },
    [state]
  );

  const registerTreasuryIncome = useCallback(
    (input: TreasuryIncomeInput): boolean => {
      const account = state.accounts.find((a) => a.id === input.accountId);
      const amount = round2(input.amount);
      if (!account || !Number.isFinite(amount) || amount <= 0) return false;
      const date = input.date || new Date().toISOString();
      const movement: FinanceMovement = {
        id: uid("fin"),
        accountId: account.id,
        accountName: account.name,
        type: "ingreso",
        amount,
        date,
        origin: input.origin.trim() || "Ingreso de dinero",
        saleId: null,
        userName: input.user.name,
        kind: "ingreso",
        note: input.note.trim(),
      };
      const audit: AuditEntry = {
        id: uid("audit"),
        date,
        userName: input.user.name,
        action: "Ingreso de dinero en Tesoreria",
        previousValue: "—",
        newValue: `${account.name} · $${amount}`,
        origin: movement.origin,
      };
      setState((prev) => ({
        ...prev,
        financeMovements: [movement, ...prev.financeMovements],
        auditLog: [audit, ...prev.auditLog],
      }));
      return true;
    },
    [state]
  );

  const registerTreasuryTransfer = useCallback(
    (
      input: TreasuryTransferInput
    ): { ok: boolean; error: string | null } => {
      const from = state.accounts.find((a) => a.id === input.fromAccountId);
      const to = state.accounts.find((a) => a.id === input.toAccountId);
      if (!from || !to) {
        return { ok: false, error: "Selecciona cuenta de origen y destino." };
      }
      if (from.id === to.id) {
        return { ok: false, error: "Las cuentas deben ser distintas." };
      }
      const amount = round2(input.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        return { ok: false, error: "Ingresa un importe mayor a cero." };
      }
      const available = accountBalance(from, state.financeMovements);
      if (amount > available + 0.01) {
        return {
          ok: false,
          error: `Saldo insuficiente en ${from.name} (disponible $${available}).`,
        };
      }
      const lockKey = `transfer_${from.id}_${to.id}`;
      if (processingRef.current.has(lockKey)) {
        return { ok: false, error: "La transferencia ya se esta registrando." };
      }
      processingRef.current.add(lockKey);
      window.setTimeout(() => processingRef.current.delete(lockKey), 1000);

      const date = input.date || new Date().toISOString();
      const referenceId = uid("trf");
      const note = input.note.trim();
      const movements: FinanceMovement[] = [
        {
          id: uid("fin"),
          accountId: from.id,
          accountName: from.name,
          type: "egreso",
          amount,
          date,
          origin: `Transferencia a ${to.name}`,
          saleId: null,
          userName: input.user.name,
          kind: "transferencia",
          counterAccountId: to.id,
          counterAccountName: to.name,
          referenceId,
          note,
        },
        {
          id: uid("fin"),
          accountId: to.id,
          accountName: to.name,
          type: "ingreso",
          amount,
          date,
          origin: `Transferencia desde ${from.name}`,
          saleId: null,
          userName: input.user.name,
          kind: "transferencia",
          counterAccountId: from.id,
          counterAccountName: from.name,
          referenceId,
          note,
        },
      ];
      const audit: AuditEntry = {
        id: uid("audit"),
        date,
        userName: input.user.name,
        action: "Transferencia interna entre cuentas",
        previousValue: `${from.name} · $${amount}`,
        newValue: `${to.name} · $${amount}`,
        origin: "Tesoreria",
      };
      setState((prev) => ({
        ...prev,
        financeMovements: [...movements, ...prev.financeMovements],
        auditLog: [audit, ...prev.auditLog],
      }));
      return { ok: true, error: null };
    },
    [state]
  );

  const saveEmployee = useCallback((employee: Employee, userName: string) => {
    setState((prev) => {
      const existing = prev.employees.find((e) => e.id === employee.id);
      const employees = existing
        ? prev.employees.map((e) => (e.id === employee.id ? employee : e))
        : [employee, ...prev.employees];
      let action = existing ? "Empleado editado" : "Empleado creado";
      if (existing && existing.active !== employee.active) {
        action = employee.active ? "Empleado reactivado" : "Empleado desactivado";
      }
      const audit: AuditEntry = {
        id: uid("audit"),
        date: new Date().toISOString(),
        userName,
        action,
        previousValue: existing ? "Existente" : "—",
        newValue: `${employee.firstName} ${employee.lastName}`,
        origin: "Tesoreria · Empleados",
      };
      return { ...prev, employees, auditLog: [audit, ...prev.auditLog] };
    });
  }, []);

  /**
   * Retiro de mercaderia por un empleado.
   * - Descuenta stock y registra el movimiento de salida.
   * - NO genera una venta, NO ingresa dinero a Caja.
   * - Queda pendiente de descuento hasta que se aplique en un pago de sueldo.
   */
  const registerEmployeeWithdrawal = useCallback(
    (
      input: EmployeeWithdrawalInput
    ): { withdrawal: EmployeeWithdrawal | null; error: string | null } => {
      const employee = state.employees.find((e) => e.id === input.employeeId);
      if (!employee) {
        return { withdrawal: null, error: "Selecciona un empleado valido." };
      }
      if (!employee.active) {
        return {
          withdrawal: null,
          error: "El empleado esta inactivo. Reactivalo antes de registrar retiros.",
        };
      }
      if (input.items.length === 0) {
        return { withdrawal: null, error: "Agrega al menos un producto al retiro." };
      }
      const lines: EmployeeWithdrawalLine[] = [];
      for (const item of input.items) {
        const product = state.products.find((p) => p.id === item.productId);
        if (!product) {
          return { withdrawal: null, error: "Uno de los productos ya no existe." };
        }
        const quantity = round3(item.quantity);
        const unitPrice = round2(item.unitPrice);
        if (!Number.isFinite(quantity) || quantity <= 0) {
          return {
            withdrawal: null,
            error: "Las cantidades del retiro deben ser mayores a cero.",
          };
        }
        if (!Number.isFinite(unitPrice) || unitPrice < 0) {
          return { withdrawal: null, error: "Los precios no pueden ser negativos." };
        }
        lines.push({
          id: uid("wln"),
          productId: product.id,
          productName: product.name,
          unit: product.unit,
          quantity,
          unitPrice,
          subtotal: round2(quantity * unitPrice),
        });
      }
      const total = round2(lines.reduce((a, l) => a + l.subtotal, 0));
      if (total <= 0) {
        return { withdrawal: null, error: "El total del retiro debe ser mayor a cero." };
      }
      const lockKey = `withdrawal_${employee.id}`;
      if (processingRef.current.has(lockKey)) {
        return { withdrawal: null, error: "El retiro ya se esta registrando." };
      }
      processingRef.current.add(lockKey);
      window.setTimeout(() => processingRef.current.delete(lockKey), 1200);

      const nowIso = new Date().toISOString();
      const date = input.date || nowIso;
      const employeeName = `${employee.firstName} ${employee.lastName}`.trim();
      const withdrawal: EmployeeWithdrawal = {
        id: uid("ewd"),
        employeeId: employee.id,
        employeeName,
        date,
        items: lines,
        total,
        note: input.note.trim(),
        userName: input.user.name,
        settledPaymentId: null,
        settledAt: null,
      };

      const movements: StockMovement[] = lines.map((line) => ({
        id: uid("mov"),
        productId: line.productId,
        productName: line.productName,
        quantity: -round3(line.quantity),
        type: "Consumo",
        date: nowIso,
        userId: input.user.id,
        userName: input.user.name,
        origin: `Retiro de mercaderia · ${employeeName}`,
        note: "Retiro de empleado (pendiente de descuento)",
      }));

      const products = state.products.map((product) => {
        const own = lines.filter((l) => l.productId === product.id);
        if (own.length === 0) return product;
        const qty = round3(own.reduce((a, l) => a + l.quantity, 0));
        return { ...product, stock: round3(product.stock - qty) };
      });

      const audit: AuditEntry = {
        id: uid("audit"),
        date: nowIso,
        userName: input.user.name,
        action: "Retiro de mercaderia de empleado",
        previousValue: "—",
        newValue: `${employeeName} · $${total}`,
        origin: "Tesoreria · Empleados",
      };

      setState((prev) => ({
        ...prev,
        products,
        employeeWithdrawals: [withdrawal, ...prev.employeeWithdrawals],
        stockMovements: [...movements, ...prev.stockMovements],
        auditLog: [audit, ...prev.auditLog],
      }));

      return { withdrawal, error: null };
    },
    [state]
  );

  /**
   * Adelanto de sueldo.
   * - Registra un egreso REAL en la cuenta de Tesoreria elegida.
   * - Queda pendiente de descuento hasta aplicarse en un pago de sueldo.
   * - NO afecta stock, ventas ni Caja del dia.
   */
  const registerEmployeeAdvance = useCallback(
    (input: EmployeeAdvanceInput): {
      advance: EmployeeAdvance | null;
      error: string | null;
    } => {
      const employee = state.employees.find((e) => e.id === input.employeeId);
      if (!employee) {
        return { advance: null, error: "Selecciona un empleado valido." };
      }
      if (!employee.active) {
        return {
          advance: null,
          error: "El empleado esta inactivo. Reactivalo antes de registrar adelantos.",
        };
      }
      const account = state.accounts.find((a) => a.id === input.accountId);
      if (!account) {
        return { advance: null, error: "Selecciona una cuenta de Tesoreria." };
      }
      const amount = round2(input.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        return { advance: null, error: "Ingresa un importe mayor a cero." };
      }
      const lockKey = `advance_${employee.id}`;
      if (processingRef.current.has(lockKey)) {
        return { advance: null, error: "El adelanto ya se esta registrando." };
      }
      processingRef.current.add(lockKey);
      window.setTimeout(() => processingRef.current.delete(lockKey), 1200);

      const nowIso = new Date().toISOString();
      const date = input.date || nowIso;
      const employeeName = `${employee.firstName} ${employee.lastName}`.trim();
      const advance: EmployeeAdvance = {
        id: uid("eadv"),
        employeeId: employee.id,
        employeeName,
        amount,
        date,
        accountId: account.id,
        accountName: account.name,
        note: input.note.trim(),
        userName: input.user.name,
        settledPaymentId: null,
        settledAt: null,
      };

      const movement: FinanceMovement = {
        id: uid("fin"),
        accountId: account.id,
        accountName: account.name,
        type: "egreso",
        amount,
        date,
        origin: `Adelanto de sueldo · ${employeeName}`,
        saleId: null,
        userName: input.user.name,
        kind: "adelanto-sueldo",
        referenceId: advance.id,
        note: advance.note,
      };

      const audit: AuditEntry = {
        id: uid("audit"),
        date,
        userName: input.user.name,
        action: "Adelanto de sueldo registrado",
        previousValue: "—",
        newValue: `${employeeName} · $${amount} · ${account.name}`,
        origin: "Tesoreria · Empleados",
      };

      setState((prev) => ({
        ...prev,
        employeeAdvances: [advance, ...prev.employeeAdvances],
        financeMovements: [movement, ...prev.financeMovements],
        auditLog: [audit, ...prev.auditLog],
      }));

      return { advance, error: null };
    },
    [state]
  );

  /**
   * Pago de sueldo (semanal o mensual).
   * - Un unico egreso sobre la cuenta elegida de Tesoreria.
   * - Aplica los retiros seleccionados y los marca como descontados.
   */
  const registerEmployeeSalaryPayment = useCallback(
    (
      input: EmployeeSalaryPaymentInput
    ): { payment: EmployeeSalaryPayment | null; error: string | null } => {
      const employee = state.employees.find((e) => e.id === input.employeeId);
      if (!employee) {
        return { payment: null, error: "Selecciona un empleado valido." };
      }
      if (!employee.active) {
        return {
          payment: null,
          error: "El empleado esta inactivo. Reactivalo antes de registrar pagos.",
        };
      }
      const account = state.accounts.find((a) => a.id === input.accountId);
      if (!account) {
        return { payment: null, error: "Selecciona una cuenta de Tesoreria." };
      }
      const gross = round2(input.grossAmount);
      if (!Number.isFinite(gross) || gross <= 0) {
        return { payment: null, error: "Ingresa un importe bruto mayor a cero." };
      }
      if (!input.periodFrom || !input.periodTo) {
        return { payment: null, error: "Indica el periodo liquidado." };
      }
      if (input.periodFrom > input.periodTo) {
        return { payment: null, error: "El periodo desde no puede ser posterior al hasta." };
      }
      // Evita duplicar un pago para el mismo empleado y periodo.
      const duplicate = state.employeePayments.find(
        (p) =>
          p.employeeId === employee.id &&
          p.periodFrom <= input.periodTo &&
          input.periodFrom <= p.periodTo
      );
      if (duplicate && !input.confirmDuplicate) {
        return {
          payment: null,
          error: `Ya existe un pago de este empleado para el periodo ${duplicate.periodFrom} al ${duplicate.periodTo}.`,
        };
      }
      // Un retiro ya descontado no puede volver a descontarse.
      const alreadySettled = input.withdrawalIds.filter((id) => {
        const withdrawal = state.employeeWithdrawals.find((w) => w.id === id);
        return !withdrawal || Boolean(withdrawal.settledPaymentId);
      });
      if (alreadySettled.length > 0) {
        return {
          payment: null,
          error:
            "Uno de los retiros seleccionados ya fue descontado en otro pago de sueldo.",
        };
      }
      // Un adelanto ya descontado no puede volver a descontarse.
      const settledAdvances = input.advanceIds.filter((id) => {
        const advance = state.employeeAdvances.find((a) => a.id === id);
        return !advance || Boolean(advance.settledPaymentId);
      });
      if (settledAdvances.length > 0) {
        return {
          payment: null,
          error:
            "Uno de los adelantos seleccionados ya fue descontado en otro pago de sueldo.",
        };
      }
      const pending = state.employeeWithdrawals.filter(
        (w) => w.employeeId === employee.id && !w.settledPaymentId
      );
      const selected = pending.filter((w) => input.withdrawalIds.includes(w.id));
      const discounts: EmployeeSalaryDiscount[] = selected.map((w) => ({
        withdrawalId: w.id,
        date: w.date,
        amount: w.total,
      }));
      const discountsTotal = round2(
        discounts.reduce((a, d) => a + d.amount, 0)
      );
      // Adelantos pendientes seleccionados para descontar del sueldo.
      const pendingAdvances = state.employeeAdvances.filter(
        (a) => a.employeeId === employee.id && !a.settledPaymentId
      );
      const selectedAdvances = pendingAdvances.filter((a) =>
        input.advanceIds.includes(a.id)
      );
      const advanceDiscounts: EmployeeAdvanceDiscount[] = selectedAdvances.map(
        (a) => ({
          advanceId: a.id,
          date: a.date,
          amount: a.amount,
        })
      );
      const advanceDiscountsTotal = round2(
        advanceDiscounts.reduce((a, d) => a + d.amount, 0)
      );
      const netAmount = round2(gross - discountsTotal - advanceDiscountsTotal);
      if (netAmount < 0) {
        return {
          payment: null,
          error:
            "Los descuentos superan el importe bruto. Ajusta retiros, adelantos o el importe.",
        };
      }
      const lockKey = `salary_${employee.id}`;
      if (processingRef.current.has(lockKey)) {
        return { payment: null, error: "El pago ya se esta registrando." };
      }
      processingRef.current.add(lockKey);
      window.setTimeout(() => processingRef.current.delete(lockKey), 1200);

      const nowIso = new Date().toISOString();
      const date = input.date || nowIso;
      const employeeName = `${employee.firstName} ${employee.lastName}`.trim();
      const payment: EmployeeSalaryPayment = {
        id: uid("esal"),
        employeeId: employee.id,
        employeeName,
        periodFrom: input.periodFrom,
        periodTo: input.periodTo,
        periodicity: employee.periodicity,
        grossAmount: gross,
        discounts,
        discountsTotal,
        advanceDiscounts,
        advanceDiscountsTotal,
        netAmount,
        date,
        accountId: account.id,
        accountName: account.name,
        note: input.note.trim(),
        userName: input.user.name,
      };

      const finance: FinanceMovement[] =
        netAmount > 0.009
          ? [
              {
                id: uid("fin"),
                accountId: account.id,
                accountName: account.name,
                type: "egreso",
                amount: netAmount,
                date,
                origin: `Pago de sueldo · ${employeeName}`,
                saleId: null,
                userName: input.user.name,
                kind: "pago-sueldo",
                referenceId: payment.id,
                note: `Periodo ${input.periodFrom} al ${input.periodTo}`,
              },
            ]
          : [];

      const audit: AuditEntry = {
        id: uid("audit"),
        date,
        userName: input.user.name,
        action: "Pago de sueldo registrado",
        previousValue: `Pendiente ${round2(discountsTotal + advanceDiscountsTotal)}`,
        newValue: `${employeeName} · Neto ${netAmount}`,
        origin: `${account.name} · ${input.periodFrom} al ${input.periodTo}`,
      };

      setState((prev) => ({
        ...prev,
        employeePayments: [payment, ...prev.employeePayments],
        employeeWithdrawals: prev.employeeWithdrawals.map((w) =>
          selected.some((s) => s.id === w.id)
            ? { ...w, settledPaymentId: payment.id, settledAt: date }
            : w
        ),
        employeeAdvances: prev.employeeAdvances.map((a) =>
          selectedAdvances.some((s) => s.id === a.id)
            ? { ...a, settledPaymentId: payment.id, settledAt: date }
            : a
        ),
        financeMovements: [...finance, ...prev.financeMovements],
        auditLog: [audit, ...prev.auditLog],
      }));

      return { payment, error: null };
    },
    [state]
  );

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
    saveSupplier,
    createPurchaseInvoice,
    registerSupplierPayment,
    registerTreasuryIncome,
    registerTreasuryTransfer,
    saveEmployee,
    registerEmployeeWithdrawal,
    registerEmployeeAdvance,
    registerEmployeeSalaryPayment,
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