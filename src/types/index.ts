export type Unit = "unidad" | "kg";

export type Channel = "retail" | "wholesale";

export type Role = "admin" | "vendedor-minorista" | "vendedor-mayorista";

export type StockState = "normal" | "low" | "out" | "negative";

export type PricingRuleType = "unit-tier" | "kg-tier" | "temporal-offer";

export type OfferEndMode = "date" | "quota" | "stock" | "date-quota";

export type AccountType = "efectivo" | "banco" | "billetera" | "tarjeta" | "otro";

export type SupplierKind = "proveedor" | "hipermercado";

export type PaymentPeriodicity = "semanal" | "mensual";

export interface User {
  id: string;
  name: string;
  username: string;
  password: string;
  role: Role;
  roleLabel: string;
}

export interface Category {
  id: string;
  name: string;
  active: boolean;
}

export interface Supplier {
  id: string;
  name: string;
  cuit: string;
  contact: string;
  phone: string;
  address: string;
  notes: string;
  active: boolean;
  // Un hipermercado tambien puede registrarse como proveedor.
  kind?: SupplierKind;
  // Preferencia: los precios de sus facturas vienen con IVA incluido o sin IVA.
  pricesIncludeIva?: boolean;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  categoryId: string;
  barcode: string;
  internalCode: string;
  supplierIds: string[];
  unit: Unit;
  costNet: number;
  iva: number;
  priceRetail: number;
  priceWholesale: number;
  samePrice: boolean;
  stock: number;
  minStock: number;
  active: boolean;
  createdAt: string;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  typeLabel: string;
  active: boolean;
  initialBalance: number;
  // Medio de pago al que pertenece la cuenta (Efectivo, Transferencia, etc.).
  methodId: string;
  // Disponibilidad por canal de venta.
  retail: boolean;
  wholesale: boolean;
  note: string;
}

// Un medio de pago es el COMO (Efectivo, Transferencia, Mercado Pago...).
// El destino/origen concreto del dinero es la CUENTA (ver Account).
export interface PaymentMethod {
  id: string;
  name: string;
  active: boolean;
}

export interface QuantityTier {
  id: string;
  from: number;
  to: number | null;
  price: number;
}

export interface PricingRule {
  id: string;
  productId: string;
  type: PricingRuleType;
  channel: Channel | "both";
  tiers: QuantityTier[];
  active: boolean;
  label: string;
  // temporal offer
  offerPrice: number | null;
  maxUnits: number | null;
  consumedUnits: number;
  endDate: string | null;
  // Como termina la oferta: por fecha, por cupo promocional, al agotar stock o fecha+cupo.
  offerEndMode?: OfferEndMode | null;
}

export interface ComboComponent {
  productId: string;
  quantity: number;
}

export interface Combo {
  id: string;
  name: string;
  channel: Channel | "both";
  components: ComboComponent[];
  price: number;
  active: boolean;
  createdAt: string;
}

export interface SaleItem {
  id: string;
  kind: "product" | "combo";
  productId: string | null;
  comboId: string | null;
  name: string;
  unit: Unit;
  quantity: number;
  listPrice: number;
  unitPrice: number;
  subtotal: number;
  promotionLabel: string | null;
}

export interface Payment {
  id: string;
  methodId: string;
  methodName: string;
  accountId: string;
  accountName: string;
  amount: number;
  // Solo para pagos en efectivo: con cuanto paga el cliente (opcional).
  received?: number | null;
}

export type SaleStatus =
  | "pendiente"
  | "finalizada"
  | "rechazada"
  | "cancelada"
  | "anulada";

export interface Sale {
  id: string;
  number: number;
  date: string;
  sentAt: string;
  confirmedAt: string | null;
  confirmedByName: string | null;
  sellerId: string;
  sellerName: string;
  channel: Channel;
  customer: string;
  items: SaleItem[];
  payments: Payment[];
  subtotal: number;
  total: number;
  estimatedCost: number;
  estimatedProfit: number;
  estimatedMargin: number;
  status: SaleStatus;
  // Control de caja
  cashReceived: number | null;
  change: number | null;
  transferVerified: boolean;
  returnReason: string | null;
  // Trazabilidad de versiones de la operacion (devuelta / reenviada).
  returnedAt?: string | null;
  resubmittedAt?: string | null;
  version?: number;
  // Anulacion de una venta ya confirmada (reversion trazable de dinero y stock).
  annulledAt?: string | null;
  annulledByName?: string | null;
  annulReason?: string | null;
}

export type StockAdjustReason =
  | "Recuento fisico"
  | "Carga inicial"
  | "Mercaderia recibida"
  | "Correccion"
  | "Rotura"
  | "Otro";

export interface HeldSale {
  id: string;
  createdAt: string;
  sellerId: string;
  sellerName: string;
  channel: Channel;
  customer: string;
  items: SaleItem[];
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  type: "Venta" | "Ajuste" | "Combo" | "Ingreso" | "Consumo" | "Devolucion";
  date: string;
  userId: string;
  userName: string;
  origin: string;
  note: string;
}

export type FinanceMovementKind =
  | "venta"
  | "anulacion"
  | "otro"
  | "pago-proveedor"
  | "transferencia"
  | "ingreso"
  | "compra"
  | "pago-sueldo"
  | "adelanto-sueldo";

export interface FinanceMovement {
  id: string;
  accountId: string;
  accountName: string;
  type: "ingreso" | "egreso";
  amount: number;
  date: string;
  origin: string;
  saleId: string | null;
  userName: string;
  kind?: FinanceMovementKind;
  // Transferencias internas: cuenta de contraparte y referencia del par de movimientos.
  counterAccountId?: string;
  counterAccountName?: string;
  referenceId?: string;
  note?: string;
}

// Apertura de Caja del dia (efectivo inicial del turno).
export interface CashSession {
  id: string;
  dateKey: string;
  openedAt: string;
  openedById: string;
  openedByName: string;
  initialCash: number;
  note: string;
}

export interface AuditEntry {
  id: string;
  date: string;
  userName: string;
  action: string;
  previousValue: string;
  newValue: string;
  origin: string;
}

export interface AppState {
  users: User[];
  currentUserId: string | null;
  products: Product[];
  categories: Category[];
  suppliers: Supplier[];
  accounts: Account[];
  paymentMethods: PaymentMethod[];
  pricingRules: PricingRule[];
  combos: Combo[];
  sales: Sale[];
  heldSales: HeldSale[];
  stockMovements: StockMovement[];
  financeMovements: FinanceMovement[];
  cashSessions: CashSession[];
  auditLog: AuditEntry[];
  saleCounter: number;
  // Sprint 2: compras y cuenta corriente de proveedores.
  purchaseInvoices: PurchaseInvoice[];
  supplierPayments: SupplierPayment[];
  // Sprint 3: empleados, retiros de mercaderia y pagos de sueldo.
  employees: Employee[];
  employeeWithdrawals: EmployeeWithdrawal[];
  employeePayments: EmployeeSalaryPayment[];
  // Adelantos de sueldo entregados al empleado (egreso real de Tesoreria).
  employeeAdvances: EmployeeAdvance[];
}

export type InvoiceStatus = "pagada" | "parcial" | "pendiente";

export type TaxDistributionRule = "neto" | "iva" | "igual";

// Linea de una factura de compra (ingreso de mercaderia).
export interface PurchaseInvoiceLine {
  id: string;
  productId: string;
  productName: string;
  unit: Unit;
  quantity: number;
  boxes: number | null;
  unitsPerBox: number | null;
  // Costo tal como se ingreso (con IVA o sin IVA segun la cabecera).
  costInput: number;
  costNet: number;
  costWithIva: number;
  iva: number;
  subtotalNet: number;
  ivaAmount: number;
  perceptionIva: number;
  perceptionIibb: number;
  total: number;
  prevCostNet: number;
  prevPriceRetail: number;
  prevPriceWholesale: number;
  newPriceRetail: number;
  newPriceWholesale: number;
}

export interface PurchaseInvoice {
  id: string;
  supplierId: string;
  supplierName: string;
  // Fecha y hora de compra informada en la factura.
  date: string;
  createdAt: string;
  receiptType: string;
  receiptNumber: string;
  attachmentName: string | null;
  pricesIncludeIva: boolean;
  perceptionIvaRate: number;
  perceptionIibbRate: number;
  taxDistributionRule: TaxDistributionRule;
  items: PurchaseInvoiceLine[];
  subtotalNet: number;
  ivaTotal: number;
  perceptionIvaTotal: number;
  perceptionIibbTotal: number;
  total: number;
  paidAmount: number;
  status: InvoiceStatus;
  note: string;
  userName: string;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  // Fecha de ingreso (YYYY-MM-DD).
  startDate: string;
  periodicity: PaymentPeriodicity;
  // Remuneracion de referencia, informada por el administrador.
  referenceSalary: number;
  notes: string;
  active: boolean;
  createdAt: string;
}

// Linea de mercaderia retirada por un empleado.
export interface EmployeeWithdrawalLine {
  id: string;
  productId: string;
  productName: string;
  unit: Unit;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

// Retiro de mercaderia: descuenta stock pero NO genera venta ni ingresa dinero.
export interface EmployeeWithdrawal {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  items: EmployeeWithdrawalLine[];
  total: number;
  note: string;
  userName: string;
  // Pago de sueldo en el que se desconto (null mientras sigue pendiente).
  settledPaymentId: string | null;
  settledAt: string | null;
}

export interface EmployeeSalaryDiscount {
  withdrawalId: string;
  date: string;
  amount: number;
}

// Adelanto de sueldo: egreso real al momento de entregarlo.
// Queda pendiente de descuento hasta que se aplique en un pago de sueldo.
export interface EmployeeAdvance {
  id: string;
  employeeId: string;
  employeeName: string;
  amount: number;
  date: string;
  accountId: string;
  accountName: string;
  note: string;
  userName: string;
  // Pago de sueldo en el que se desconto (null mientras sigue pendiente).
  settledPaymentId: string | null;
  settledAt: string | null;
}

export interface EmployeeAdvanceDiscount {
  advanceId: string;
  date: string;
  amount: number;
}

// Pago de sueldo: un unico egreso sobre la cuenta elegida.
export interface EmployeeSalaryPayment {
  id: string;
  employeeId: string;
  employeeName: string;
  periodFrom: string;
  periodTo: string;
  periodicity: PaymentPeriodicity;
  grossAmount: number;
  discounts: EmployeeSalaryDiscount[];
  discountsTotal: number;
  // Adelantos de sueldo descontados en este pago.
  advanceDiscounts: EmployeeAdvanceDiscount[];
  advanceDiscountsTotal: number;
  netAmount: number;
  date: string;
  accountId: string;
  accountName: string;
  note: string;
  userName: string;
}

export interface SupplierPayment {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  amount: number;
  date: string;
  methodId: string;
  methodName: string;
  accountId: string;
  accountName: string;
  note: string;
  userName: string;
}