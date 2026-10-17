import { useMemo, useState } from "react";
import { useApp } from "@/store/AppContext";
import Button from "@/components/base/Button";
import Chip from "@/components/base/Chip";
import Select from "@/components/base/Select";
import ReportDetailModal, {
  type ReportField,
} from "./components/ReportDetailModal";
import {
  invoiceBalance,
  invoiceStatusLabel,
} from "@/utils/purchases";
import {
  movementKindLabel,
  movementKindOptions,
  movementMatchesFilter,
} from "@/utils/treasury";
import { getStockState, stockStateLabel } from "@/utils/inventory";
import {
  round2,
  toCurrency,
  toDateKey,
  toDateTimeLabel,
  toNumber,
} from "@/utils/format";

type ReportKey =
  | "sales"
  | "products"
  | "channels"
  | "payments"
  | "stock"
  | "entries"
  | "suppliers"
  | "invoices"
  | "treasury"
  | "perceptions"
  | "employees";

interface ReportRow {
  id: string;
  values: string[];
  title: string;
  fields: ReportField[];
}

interface ReportColumn {
  label: string;
  align?: "right";
}

interface ReportDef {
  label: string;
  icon: string;
  columns: ReportColumn[];
  rows: ReportRow[];
  totals: string[];
  note: string;
}

const reports: { key: ReportKey; label: string; icon: string }[] = [
  { key: "sales", label: "Ventas por periodo", icon: "ri-line-chart-line" },
  { key: "products", label: "Productos vendidos", icon: "ri-shopping-bag-3-line" },
  { key: "channels", label: "Minorista y mayorista", icon: "ri-store-3-line" },
  { key: "payments", label: "Medios de pago y cuentas", icon: "ri-bank-card-line" },
  { key: "stock", label: "Stock critico", icon: "ri-archive-2-line" },
  { key: "entries", label: "Ingresos de mercaderia", icon: "ri-inbox-archive-line" },
  { key: "suppliers", label: "Compras por proveedor", icon: "ri-truck-line" },
  { key: "invoices", label: "Facturas y pagos", icon: "ri-file-list-3-line" },
  { key: "treasury", label: "Movimientos de tesoreria", icon: "ri-arrow-left-right-line" },
  { key: "perceptions", label: "Percepciones IVA e IIBB", icon: "ri-percent-line" },
  { key: "employees", label: "Empleados: sueldos, retiros y adelantos", icon: "ri-team-line" },
];

const channelLabel = (channel: string): string =>
  channel === "wholesale" ? "Mayorista" : "Minorista";

const ReportsPage = () => {
  const { state } = useApp();
  const today = new Date();
  const defaultFrom = new Date();
  defaultFrom.setDate(defaultFrom.getDate() - 30);

  const [from, setFrom] = useState(toDateKey(defaultFrom));
  const [to, setTo] = useState(toDateKey(today));
  const [reportKey, setReportKey] = useState<ReportKey>("sales");
  const [supplierId, setSupplierId] = useState("all");
  const [productId, setProductId] = useState("all");
  const [sellerId, setSellerId] = useState("all");
  const [channel, setChannel] = useState("all");
  const [accountId, setAccountId] = useState("all");
  const [movementType, setMovementType] = useState("all");
  const [employeeId, setEmployeeId] = useState("all");
  const [detail, setDetail] = useState<{ title: string; fields: ReportField[] } | null>(
    null
  );

  const inRange = (iso: string): boolean => {
    const key = toDateKey(new Date(iso));
    if (from && key < from) return false;
    if (to && key > to) return false;
    return true;
  };

  const baseSales = useMemo(
    () =>
      state.sales
        .filter((s) => s.status === "finalizada" && inRange(s.date))
        .filter((s) => sellerId === "all" || s.sellerId === sellerId)
        .filter((s) => channel === "all" || s.channel === channel)
        .filter((s) =>
          productId === "all"
            ? true
            : s.items.some((i) => i.productId === productId)
        )
        .sort((a, b) => b.date.localeCompare(a.date)),
    [state.sales, from, to, sellerId, channel, productId]
  );

  const baseInvoices = useMemo(
    () =>
      state.purchaseInvoices
        .filter((i) => inRange(i.date))
        .filter((i) => supplierId === "all" || i.supplierId === supplierId)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [state.purchaseInvoices, from, to, supplierId]
  );

  const baseMovements = useMemo(
    () =>
      state.financeMovements
        .filter((m) => inRange(m.date))
        .filter((m) => accountId === "all" || m.accountId === accountId)
        .filter((m) => movementMatchesFilter(m, movementType))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [state.financeMovements, from, to, accountId, movementType]
  );

  const employeeData = useMemo(() => {
    const payments = state.employeePayments
      .filter((p) => inRange(p.date))
      .filter((p) => employeeId === "all" || p.employeeId === employeeId)
      .sort((a, b) => b.date.localeCompare(a.date));
    const withdrawals = state.employeeWithdrawals
      .filter((w) => inRange(w.date))
      .filter((w) => employeeId === "all" || w.employeeId === employeeId)
      .sort((a, b) => b.date.localeCompare(a.date));
    const advances = state.employeeAdvances
      .filter((a) => inRange(a.date))
      .filter((a) => employeeId === "all" || a.employeeId === employeeId)
      .sort((a, b) => b.date.localeCompare(a.date));
    const paidGross = round2(payments.reduce((a, p) => a + p.grossAmount, 0));
    const paidDiscounts = round2(
      payments.reduce((a, p) => a + p.discountsTotal, 0)
    );
    const paidAdvanceDiscounts = round2(
      payments.reduce((a, p) => a + (p.advanceDiscountsTotal ?? 0), 0)
    );
    const paidNet = round2(payments.reduce((a, p) => a + p.netAmount, 0));
    const pendingWithdrawals = withdrawals.filter((w) => !w.settledPaymentId);
    const pendingTotal = round2(
      pendingWithdrawals.reduce((a, w) => a + w.total, 0)
    );
    const withdrawnTotal = round2(withdrawals.reduce((a, w) => a + w.total, 0));
    const pendingAdvances = advances.filter((a) => !a.settledPaymentId);
    const advancePendingTotal = round2(
      pendingAdvances.reduce((a, x) => a + x.amount, 0)
    );
    const advancesTotal = round2(advances.reduce((a, x) => a + x.amount, 0));
    return {
      payments,
      withdrawals,
      advances,
      paidGross,
      paidDiscounts,
      paidAdvanceDiscounts,
      paidNet,
      pendingWithdrawals,
      pendingTotal,
      withdrawnTotal,
      pendingAdvances,
      advancePendingTotal,
      advancesTotal,
    };
  }, [
    state.employeePayments,
    state.employeeWithdrawals,
    state.employeeAdvances,
    from,
    to,
    employeeId,
  ]);

  const kpis = useMemo(() => {
    const salesTotal = baseSales.reduce((a, s) => a + s.total, 0);
    const purchasesTotal = baseInvoices.reduce((a, i) => a + i.total, 0);
    const debt = state.purchaseInvoices.reduce(
      (a, i) => a + invoiceBalance(i),
      0
    );
    const net = baseMovements.reduce(
      (a, m) => a + (m.type === "ingreso" ? m.amount : -m.amount),
      0
    );
    return { salesTotal, purchasesTotal, debt, net };
  }, [baseSales, baseInvoices, baseMovements, state.purchaseInvoices]);

  const reportData = useMemo<ReportDef>(() => {
    if (reportKey === "sales") {
      const rows: ReportRow[] = baseSales.map((s) => ({
        id: s.id,
        values: [
          `#${s.number}`,
          toDateTimeLabel(s.date),
          s.sellerName,
          channelLabel(s.channel),
          String(s.items.length),
          toCurrency(s.total),
        ],
        title: `Venta #${s.number}`,
        fields: [
          { label: "Numero", value: `#${s.number}` },
          { label: "Fecha y hora", value: toDateTimeLabel(s.date) },
          { label: "Vendedor", value: s.sellerName },
          { label: "Tipo de venta", value: channelLabel(s.channel) },
          { label: "Cliente", value: s.customer || "Consumidor final" },
          {
            label: "Productos",
            value: s.items
              .map((i) => `${i.name} × ${toNumber(i.quantity, 3)}`)
              .join(", "),
          },
          { label: "Subtotal", value: toCurrency(s.subtotal) },
          {
            label: "Cobros",
            value: s.payments
              .map((p) => `${p.methodName} · ${p.accountName} · ${toCurrency(p.amount)}`)
              .join(" | "),
          },
          { label: "Total", value: toCurrency(s.total) },
          { label: "Control", value: `${s.confirmedByName ?? "—"}` },
        ],
      }));
      return {
        label: "Ventas por periodo",
        icon: "ri-line-chart-line",
        columns: [
          { label: "Venta" },
          { label: "Fecha y hora" },
          { label: "Vendedor" },
          { label: "Tipo" },
          { label: "Items", align: "right" },
          { label: "Total", align: "right" },
        ],
        rows,
        totals: [
          "",
          "",
          "",
          `${rows.length} ventas`,
          "",
          toCurrency(baseSales.reduce((a, s) => a + s.total, 0)),
        ],
        note: "Solo ventas confirmadas por Caja. Las pendientes, devueltas o anuladas no suman.",
      };
    }

    if (reportKey === "products") {
      const map = new Map<
        string,
        { name: string; unit: string; qty: number; sales: Set<number>; amount: number }
      >();
      baseSales.forEach((sale) =>
        sale.items.forEach((item) => {
          if (item.kind !== "product" || !item.productId) return;
          if (productId !== "all" && item.productId !== productId) return;
          const current = map.get(item.productId) ?? {
            name: item.name,
            unit: item.unit,
            qty: 0,
            sales: new Set<number>(),
            amount: 0,
          };
          current.qty = round2(current.qty + item.quantity);
          current.amount = round2(current.amount + item.subtotal);
          current.sales.add(sale.number);
          map.set(item.productId, current);
        })
      );
      const productAmountTotal = [...map.values()].reduce(
        (a, d) => a + d.amount,
        0
      );
      const rows: ReportRow[] = [...map.entries()]
        .map(([id, data]) => ({
          id,
          data,
          values: [
            data.name,
            data.unit === "kg" ? "kg" : "un",
            toNumber(data.qty, data.unit === "kg" ? 3 : 0),
            String(data.sales.size),
            toCurrency(data.amount),
          ],
          title: data.name,
          fields: [
            { label: "Producto", value: data.name },
            { label: "Unidad", value: data.unit === "kg" ? "Kilogramos" : "Unidad" },
            {
              label: "Cantidad vendida",
              value: `${toNumber(data.qty, data.unit === "kg" ? 3 : 0)} ${
                data.unit === "kg" ? "kg" : "un"
              }`,
            },
            { label: "Ventas", value: `${data.sales.size}` },
            { label: "Importe", value: toCurrency(data.amount) },
          ],
        }))
        .sort((a, b) => b.data.amount - a.data.amount);
      return {
        label: "Productos vendidos y cantidades",
        icon: "ri-shopping-bag-3-line",
        columns: [
          { label: "Producto" },
          { label: "Unidad" },
          { label: "Cantidad", align: "right" },
          { label: "Ventas", align: "right" },
          { label: "Importe", align: "right" },
        ],
        rows,
        totals: [
          `${rows.length} productos`,
          "",
          "",
          "",
          toCurrency(productAmountTotal),
        ],
        note: "No incluye componentes de combos desglosados: cada combo se cuenta como linea propia.",
      };
    }

    if (reportKey === "channels") {
      const rows: ReportRow[] = (["retail", "wholesale"] as const).map((ch) => {
        const list = baseSales.filter((s) => s.channel === ch);
        const total = list.reduce((a, s) => a + s.total, 0);
        const items = list.reduce((a, s) => a + s.items.length, 0);
        return {
          id: ch,
          values: [
            channelLabel(ch),
            String(list.length),
            String(items),
            toCurrency(total),
            toCurrency(list.length ? total / list.length : 0),
          ],
          title: `Ventas ${channelLabel(ch)}`,
          fields: [
            { label: "Canal", value: channelLabel(ch) },
            { label: "Ventas", value: String(list.length) },
            { label: "Items", value: String(items) },
            { label: "Total", value: toCurrency(total) },
            {
              label: "Ticket promedio",
              value: toCurrency(list.length ? total / list.length : 0),
            },
            {
              label: "Operaciones",
              value: list.map((s) => `#${s.number}`).join(", ") || "—",
            },
          ],
        };
      });
      return {
        label: "Ventas minoristas y mayoristas",
        icon: "ri-store-3-line",
        columns: [
          { label: "Canal" },
          { label: "Ventas", align: "right" },
          { label: "Items", align: "right" },
          { label: "Total", align: "right" },
          { label: "Ticket promedio", align: "right" },
        ],
        rows,
        totals: [
          "Total",
          String(baseSales.length),
          "",
          toCurrency(baseSales.reduce((a, s) => a + s.total, 0)),
          "",
        ],
        note: "Comparativo por canal de venta dentro del periodo filtrado.",
      };
    }

    if (reportKey === "payments") {
      const map = new Map<
        string,
        { method: string; account: string; count: number; amount: number }
      >();
      baseSales.forEach((sale) =>
        sale.payments.forEach((p) => {
          if (accountId !== "all" && p.accountId !== accountId) return;
          const key = `${p.methodName}|${p.accountName}`;
          const current = map.get(key) ?? {
            method: p.methodName,
            account: p.accountName,
            count: 0,
            amount: 0,
          };
          current.count += 1;
          current.amount = round2(current.amount + p.amount);
          map.set(key, current);
        })
      );
      const paymentTotal = [...map.values()].reduce(
        (a, d) => a + d.amount,
        0
      );
      const rows: ReportRow[] = [...map.entries()]
        .map(([id, data]) => ({
          id,
          data,
          values: [
            data.method,
            data.account,
            String(data.count),
            toCurrency(data.amount),
          ],
          title: `${data.method} · ${data.account}`,
          fields: [
            { label: "Medio de pago", value: data.method },
            { label: "Cuenta", value: data.account },
            { label: "Cobros", value: String(data.count) },
            { label: "Importe", value: toCurrency(data.amount) },
          ],
        }))
        .sort((a, b) => b.data.amount - a.data.amount);
      return {
        label: "Medios de pago y cuentas",
        icon: "ri-bank-card-line",
        columns: [
          { label: "Medio de pago" },
          { label: "Cuenta" },
          { label: "Cobros", align: "right" },
          { label: "Importe", align: "right" },
        ],
        rows,
        totals: [
          `${rows.length} combinaciones`,
          "",
          "",
          toCurrency(paymentTotal),
        ],
        note: "Solo cobros de ventas confirmadas. Los pagos a proveedores no se mezclan aca.",
      };
    }

    if (reportKey === "stock") {
      const rows: ReportRow[] = state.products
        .filter((p) => productId === "all" || p.id === productId)
        .filter((p) => getStockState(p) !== "normal")
        .map((p) => {
          const stateName = getStockState(p);
          return {
            id: p.id,
            stateName,
            values: [
              p.name,
              toNumber(p.stock, p.unit === "kg" ? 3 : 0),
              toNumber(p.minStock, p.unit === "kg" ? 3 : 0),
              stockStateLabel(stateName),
              toCurrency(p.costNet * p.stock),
            ],
            title: p.name,
            fields: [
              { label: "Producto", value: p.name },
              { label: "Marca", value: p.brand || "—" },
              { label: "Stock actual", value: `${toNumber(p.stock, 3)} ${p.unit === "kg" ? "kg" : "un"}` },
              { label: "Stock minimo", value: toNumber(p.minStock, 3) },
              { label: "Estado", value: stockStateLabel(stateName) },
              { label: "Costo sin IVA", value: toCurrency(p.costNet) },
              { label: "Precio minorista", value: toCurrency(p.priceRetail) },
            ],
          };
        })
        .sort((a, b) => a.stateName.localeCompare(b.stateName));
      return {
        label: "Stock bajo, sin stock y negativo",
        icon: "ri-archive-2-line",
        columns: [
          { label: "Producto" },
          { label: "Stock", align: "right" },
          { label: "Minimo", align: "right" },
          { label: "Estado" },
          { label: "Valorizado", align: "right" },
        ],
        rows,
        totals: [`${rows.length} productos`, "", "", "", ""],
        note: "El reporte de stock no depende del periodo: muestra la situacion actual.",
      };
    }

    if (reportKey === "entries") {
      const rows: ReportRow[] = baseInvoices.map((i) => ({
        id: i.id,
        values: [
          `${i.receiptType} ${i.receiptNumber}`,
          i.supplierName,
          toDateTimeLabel(i.date),
          String(i.items.length),
          toCurrency(i.total),
          invoiceStatusLabel(i.status),
        ],
        title: `${i.receiptType} ${i.receiptNumber}`,
        fields: [
          { label: "Proveedor", value: i.supplierName },
          { label: "Comprobante", value: `${i.receiptType} ${i.receiptNumber}` },
          { label: "Fecha y hora", value: toDateTimeLabel(i.date) },
          { label: "Productos", value: String(i.items.length) },
          { label: "Neto", value: toCurrency(i.subtotalNet) },
          { label: "IVA", value: toCurrency(i.ivaTotal) },
          { label: "Percep. IVA", value: toCurrency(i.perceptionIvaTotal) },
          { label: "Percep. IIBB", value: toCurrency(i.perceptionIibbTotal) },
          { label: "Total", value: toCurrency(i.total) },
          { label: "Pagado", value: toCurrency(i.paidAmount) },
          { label: "Saldo", value: toCurrency(invoiceBalance(i)) },
          { label: "Registrado por", value: i.userName },
        ],
      }));
      return {
        label: "Ingresos de mercaderia",
        icon: "ri-inbox-archive-line",
        columns: [
          { label: "Comprobante" },
          { label: "Proveedor" },
          { label: "Fecha" },
          { label: "Productos", align: "right" },
          { label: "Total", align: "right" },
          { label: "Estado" },
        ],
        rows,
        totals: [
          `${rows.length} ingresos`,
          "",
          "",
          "",
          toCurrency(baseInvoices.reduce((a, i) => a + i.total, 0)),
          "",
        ],
        note: "Incluye la mercaderia recibida. El stock se suma al confirmar el ingreso.",
      };
    }

    if (reportKey === "suppliers") {
      const map = new Map<
        string,
        { name: string; count: number; total: number; paid: number }
      >();
      baseInvoices.forEach((i) => {
        const current = map.get(i.supplierId) ?? {
          name: i.supplierName,
          count: 0,
          total: 0,
          paid: 0,
        };
        current.count += 1;
        current.total = round2(current.total + i.total);
        current.paid = round2(current.paid + i.paidAmount);
        map.set(i.supplierId, current);
      });
      const rows: ReportRow[] = [...map.entries()]
        .map(([id, data]) => ({
          id,
          data,
          values: [
            data.name,
            String(data.count),
            toCurrency(data.total),
            toCurrency(data.paid),
            toCurrency(data.total - data.paid),
          ],
          title: data.name,
          fields: [
            { label: "Proveedor", value: data.name },
            { label: "Facturas", value: String(data.count) },
            { label: "Comprado", value: toCurrency(data.total) },
            { label: "Pagado", value: toCurrency(data.paid) },
            { label: "Saldo pendiente", value: toCurrency(data.total - data.paid) },
            {
              label: "Comprobantes",
              value:
                baseInvoices
                  .filter((i) => i.supplierId === id)
                  .map((i) => `${i.receiptType} ${i.receiptNumber}`)
                  .join(", ") || "—",
            },
          ],
        }))
        .sort((a, b) => b.data.total - a.data.total);
      return {
        label: "Compras por proveedor",
        icon: "ri-truck-line",
        columns: [
          { label: "Proveedor" },
          { label: "Facturas", align: "right" },
          { label: "Comprado", align: "right" },
          { label: "Pagado", align: "right" },
          { label: "Saldo", align: "right" },
        ],
        rows,
        totals: [
          `${rows.length} proveedores`,
          "",
          toCurrency(baseInvoices.reduce((a, i) => a + i.total, 0)),
          toCurrency(baseInvoices.reduce((a, i) => a + i.paidAmount, 0)),
          toCurrency(
            baseInvoices.reduce(
              (a, i) => a + i.total - i.paidAmount,
              0
            )
          ),
        ],
        note: "Compras del periodo segun facturas de ingreso de mercaderia.",
      };
    }

    if (reportKey === "invoices") {
      const pending = baseInvoices.filter((i) => invoiceBalance(i) > 0.5);
      const rows: ReportRow[] = pending.map((i) => ({
        id: i.id,
        values: [
          `${i.receiptType} ${i.receiptNumber}`,
          i.supplierName,
          toCurrency(i.total),
          toCurrency(i.paidAmount),
          toCurrency(invoiceBalance(i)),
          invoiceStatusLabel(i.status),
        ],
        title: `Factura ${i.receiptNumber}`,
        fields: [
          { label: "Proveedor", value: i.supplierName },
          { label: "Comprobante", value: `${i.receiptType} ${i.receiptNumber}` },
          { label: "Fecha", value: toDateTimeLabel(i.date) },
          { label: "Total", value: toCurrency(i.total) },
          { label: "Pagado", value: toCurrency(i.paidAmount) },
          { label: "Saldo", value: toCurrency(invoiceBalance(i)) },
          { label: "Estado", value: invoiceStatusLabel(i.status) },
          {
            label: "Pagos",
            value:
              state.supplierPayments
                .filter((p) => p.invoiceId === i.id)
                .map(
                  (p) =>
                    `${toDateTimeLabel(p.date)} · ${p.methodName} · ${toCurrency(
                      p.amount
                    )}`
                )
                .join(" | ") || "Sin pagos",
          },
        ],
      }));
      return {
        label: "Facturas pendientes y pagos",
        icon: "ri-file-list-3-line",
        columns: [
          { label: "Factura" },
          { label: "Proveedor" },
          { label: "Total", align: "right" },
          { label: "Pagado", align: "right" },
          { label: "Saldo", align: "right" },
          { label: "Estado" },
        ],
        rows,
        totals: [
          `${rows.length} pendientes`,
          "",
          toCurrency(pending.reduce((a, i) => a + i.total, 0)),
          toCurrency(pending.reduce((a, i) => a + i.paidAmount, 0)),
          toCurrency(pending.reduce((a, i) => a + invoiceBalance(i), 0)),
          "",
        ],
        note: "Solo facturas con saldo pendiente dentro del periodo filtrado.",
      };
    }

    if (reportKey === "treasury") {
      const rows: ReportRow[] = baseMovements.map((m) => ({
        id: m.id,
        values: [
          toDateTimeLabel(m.date),
          m.accountName,
          movementKindLabel(m),
          m.origin,
          `${m.type === "ingreso" ? "+" : "−"}${toCurrency(m.amount)}`,
        ],
        title: movementKindLabel(m),
        fields: [
          { label: "Fecha y hora", value: toDateTimeLabel(m.date) },
          { label: "Cuenta", value: m.accountName },
          { label: "Tipo", value: movementKindLabel(m) },
          { label: "Concepto", value: m.origin },
          { label: "Contraparte", value: m.counterAccountName ?? "—" },
          { label: "Importe", value: toCurrency(m.amount) },
          { label: "Usuario", value: m.userName },
          { label: "Observacion", value: m.note || "—" },
        ],
      }));
      const income = baseMovements
        .filter((m) => m.type === "ingreso")
        .reduce((a, m) => a + m.amount, 0);
      const outflow = baseMovements
        .filter((m) => m.type === "egreso")
        .reduce((a, m) => a + m.amount, 0);
      return {
        label: "Movimientos de tesoreria",
        icon: "ri-arrow-left-right-line",
        columns: [
          { label: "Fecha y hora" },
          { label: "Cuenta" },
          { label: "Tipo" },
          { label: "Concepto" },
          { label: "Importe", align: "right" },
        ],
        rows,
        totals: [
          `${rows.length} movimientos`,
          "",
          "",
          `Neto ${toCurrency(income - outflow)}`,
          "",
        ],
        note: "Incluye ventas confirmadas, pagos a proveedores, ingresos y transferencias internas.",
      };
    }

    if (reportKey === "employees") {
      const paymentRows = employeeData.payments.map((p) => ({
        date: p.date,
        row: {
          id: `pago-${p.id}`,
          values: [
            toDateTimeLabel(p.date),
            p.employeeName,
            "Pago de sueldo",
            toCurrency(p.grossAmount),
            toCurrency(p.discountsTotal),
            toCurrency(p.netAmount),
            "Registrado",
          ],
          title: `Pago de sueldo · ${p.employeeName}`,
          fields: [
            { label: "Empleado", value: p.employeeName },
            { label: "Tipo de movimiento", value: "Pago de sueldo" },
            { label: "Fecha y hora", value: toDateTimeLabel(p.date) },
            { label: "Periodo liquidado", value: `${p.periodFrom} al ${p.periodTo}` },
            {
              label: "Periodicidad",
              value: p.periodicity === "semanal" ? "Semanal" : "Mensual",
            },
            { label: "Importe bruto", value: toCurrency(p.grossAmount) },
            {
              label: "Mercaderia retirada descontada",
              value: toCurrency(p.discountsTotal),
            },
            {
              label: "Adelantos descontados",
              value: toCurrency(p.advanceDiscountsTotal ?? 0),
            },
            {
              label: "Descuentos totales",
              value: toCurrency(
                (p.discountsTotal ?? 0) + (p.advanceDiscountsTotal ?? 0)
              ),
            },
            { label: "Neto pagado", value: toCurrency(p.netAmount) },
            { label: "Cuenta de Tesoreria", value: p.accountName },
            { label: "Usuario responsable", value: p.userName },
            { label: "Estado", value: "Registrado (prototipo local)" },
            { label: "Observacion", value: p.note || "—" },
            {
              label: "Retiros descontados",
              value:
                p.discounts.length > 0
                  ? p.discounts
                      .map((d) => `${d.date} · ${toCurrency(d.amount)}`)
                      .join(" | ")
                  : "Sin descuentos aplicados",
            },
          ],
        },
      }));

      const withdrawalRows = employeeData.withdrawals.map((w) => ({
        date: w.date,
        row: {
          id: `retiro-${w.id}`,
          values: [
            toDateTimeLabel(w.date),
            w.employeeName,
            "Retiro de mercaderia",
            toCurrency(w.total),
            "—",
            "—",
            w.settledPaymentId ? "Descontado" : "Pendiente",
          ],
          title: `Retiro de mercaderia · ${w.employeeName}`,
          fields: [
            { label: "Empleado", value: w.employeeName },
            { label: "Tipo de movimiento", value: "Retiro de mercaderia" },
            { label: "Fecha y hora", value: toDateTimeLabel(w.date) },
            { label: "Usuario responsable", value: w.userName },
            {
              label: "Estado financiero",
              value: w.settledPaymentId
                ? `Descontado en un pago de sueldo${
                    w.settledAt ? ` (${toDateTimeLabel(w.settledAt)})` : ""
                  }`
                : "Pendiente de descuento (no mueve dinero)",
            },
            { label: "Total retirado", value: toCurrency(w.total) },
            {
              label: "Precios aplicados",
              value: w.items
                .map(
                  (i) =>
                    `${i.productName} · ${toNumber(
                      i.quantity,
                      i.unit === "kg" ? 3 : 0
                    )} ${i.unit === "kg" ? "kg" : "un"} × ${toCurrency(
                      i.unitPrice
                    )} = ${toCurrency(i.subtotal)}`
                )
                .join(" | "),
            },
            { label: "Observacion", value: w.note || "—" },
          ],
        },
      }));

      const advanceRows = employeeData.advances.map((a) => ({
        date: a.date,
        row: {
          id: `adelanto-${a.id}`,
          values: [
            toDateTimeLabel(a.date),
            a.employeeName,
            "Adelanto de sueldo",
            toCurrency(a.amount),
            "—",
            "—",
            a.settledPaymentId ? "Descontado" : "Pendiente",
          ],
          title: `Adelanto de sueldo · ${a.employeeName}`,
          fields: [
            { label: "Empleado", value: a.employeeName },
            { label: "Tipo de movimiento", value: "Adelanto de sueldo" },
            { label: "Fecha y hora", value: toDateTimeLabel(a.date) },
            { label: "Importe entregado", value: toCurrency(a.amount) },
            { label: "Cuenta de Tesoreria", value: a.accountName },
            { label: "Usuario responsable", value: a.userName },
            {
              label: "Estado financiero",
              value: a.settledPaymentId
                ? `Descontado en un pago de sueldo${
                    a.settledAt ? ` (${toDateTimeLabel(a.settledAt)})` : ""
                  }`
                : "Pendiente de descuento (el egreso ya se registro al entregarlo)",
            },
            { label: "Observacion", value: a.note || "—" },
          ],
        },
      }));

      const rows: ReportRow[] = [
        ...paymentRows,
        ...withdrawalRows,
        ...advanceRows,
      ]
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((item) => item.row);

      return {
        label: "Empleados: sueldos, retiros y adelantos",
        icon: "ri-team-line",
        columns: [
          { label: "Fecha y hora" },
          { label: "Empleado" },
          { label: "Movimiento" },
          { label: "Importe bruto", align: "right" },
          { label: "Descuentos", align: "right" },
          { label: "Neto pagado", align: "right" },
          { label: "Estado" },
        ],
        rows,
        totals: [
          `${employeeData.payments.length} pago(s) · ${employeeData.withdrawals.length} retiro(s) · ${employeeData.advances.length} adelanto(s)`,
          "",
          "",
          toCurrency(employeeData.paidGross),
          toCurrency(
            employeeData.paidDiscounts + employeeData.paidAdvanceDiscounts
          ),
          toCurrency(employeeData.paidNet),
          `${employeeData.pendingWithdrawals.length} retiro(s) y ${employeeData.pendingAdvances.length} adelanto(s) pendiente(s)`,
        ],
        note: "Datos de demostracion guardados localmente en este dispositivo. No representan liquidaciones legales ni una integracion definitiva con un backend. Los retiros solo afectan el inventario al registrarse; los adelantos generan un egreso real al entregarse. El descuento posterior en el sueldo es unicamente financiero.",
      };
    }

    const rows: ReportRow[] = baseInvoices.map((i) => ({
      id: i.id,
      values: [
        `${i.receiptType} ${i.receiptNumber}`,
        i.supplierName,
        toDateTimeLabel(i.date),
        toCurrency(i.subtotalNet),
        toCurrency(i.perceptionIvaTotal),
        toCurrency(i.perceptionIibbTotal),
        toCurrency(i.total),
      ],
      title: `Percepciones ${i.receiptNumber}`,
      fields: [
        { label: "Proveedor", value: i.supplierName },
        { label: "Comprobante", value: `${i.receiptType} ${i.receiptNumber}` },
        { label: "Fecha", value: toDateTimeLabel(i.date) },
        { label: "Neto", value: toCurrency(i.subtotalNet) },
        { label: "IVA", value: toCurrency(i.ivaTotal) },
        { label: "Percep. IVA", value: `${toCurrency(i.perceptionIvaTotal)} (${i.perceptionIvaRate}%)` },
        { label: "Percep. IIBB", value: `${toCurrency(i.perceptionIibbTotal)} (${i.perceptionIibbRate}%)` },
        { label: "Total factura", value: toCurrency(i.total) },
        {
          label: "Regla de distribucion",
          value:
            i.taxDistributionRule === "neto"
              ? "Proporcional al neto"
              : i.taxDistributionRule === "iva"
                ? "Proporcional al IVA"
                : "Partes iguales",
        },
      ],
    }));
    return {
      label: "Percepciones de IVA e ingresos brutos",
      icon: "ri-percent-line",
      columns: [
        { label: "Factura" },
        { label: "Proveedor" },
        { label: "Fecha" },
        { label: "Neto", align: "right" },
        { label: "Perc. IVA", align: "right" },
        { label: "Perc. IIBB", align: "right" },
        { label: "Total", align: "right" },
      ],
      rows,
      totals: [
        `${rows.length} facturas`,
        "",
        "",
        toCurrency(baseInvoices.reduce((a, i) => a + i.subtotalNet, 0)),
        toCurrency(baseInvoices.reduce((a, i) => a + i.perceptionIvaTotal, 0)),
        toCurrency(baseInvoices.reduce((a, i) => a + i.perceptionIibbTotal, 0)),
        toCurrency(baseInvoices.reduce((a, i) => a + i.total, 0)),
      ],
      note: "Desglosado por factura y proveedor. Los totales surgen de la carga del ingreso de mercaderia.",
    };
  }, [
    reportKey,
    baseSales,
    baseInvoices,
    baseMovements,
    employeeData,
    state.products,
    state.supplierPayments,
    productId,
    accountId,
  ]);

  const active = reports.find((r) => r.key === reportKey);

  const dailySeries = useMemo(() => {
    const map = new Map<string, number>();
    baseSales.forEach((s) => {
      const key = toDateKey(new Date(s.date));
      map.set(key, round2((map.get(key) ?? 0) + s.total));
    });
    const entries = [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    const max = entries.reduce((a, [, v]) => Math.max(a, v), 0);
    return { entries, max };
  }, [baseSales]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-lg border border-background-200 bg-background-50 p-4">
          <p className="text-xs text-foreground-500">Ventas del periodo</p>
          <p className="text-xl font-semibold tabular-nums text-foreground-950">
            {toCurrency(kpis.salesTotal)}
          </p>
        </div>
        <div className="rounded-lg border border-background-200 bg-background-50 p-4">
          <p className="text-xs text-foreground-500">Compras del periodo</p>
          <p className="text-xl font-semibold tabular-nums text-foreground-950">
            {toCurrency(kpis.purchasesTotal)}
          </p>
        </div>
        <div className="rounded-lg border border-background-200 bg-background-50 p-4">
          <p className="text-xs text-foreground-500">Deuda proveedores</p>
          <p className="text-xl font-semibold tabular-nums text-danger">
            {toCurrency(kpis.debt)}
          </p>
        </div>
        <div className="rounded-lg border border-background-200 bg-background-50 p-4">
          <p className="text-xs text-foreground-500">Neto tesoreria</p>
          <p
            className={`text-xl font-semibold tabular-nums ${
              kpis.net >= 0 ? "text-success" : "text-danger"
            }`}
          >
            {toCurrency(kpis.net)}
          </p>
        </div>
      </div>

      <section className="rounded-lg border border-background-200 bg-background-50 p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
          <h3 className="text-sm font-semibold text-foreground-950">
            Filtros del reporte
          </h3>
          <div className="flex items-center gap-2">
            <Chip tone="secondary" icon="ri-calendar-line">
              {from} → {to}
            </Chip>
            <Button
              size="sm"
              variant="outline"
              icon="ri-filter-off-line"
              onClick={() => {
                setFrom(toDateKey(defaultFrom));
                setTo(toDateKey(new Date()));
                setSupplierId("all");
                setProductId("all");
                setSellerId("all");
                setChannel("all");
                setAccountId("all");
                setMovementType("all");
                setEmployeeId("all");
              }}
            >
              Limpiar
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2">
          <div>
            <label className="block text-[11px] text-foreground-500 mb-1">Desde</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full h-9 px-2 rounded-md border border-background-300 bg-background-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
          <div>
            <label className="block text-[11px] text-foreground-500 mb-1">Hasta</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full h-9 px-2 rounded-md border border-background-300 bg-background-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
          <div>
            <label className="block text-[11px] text-foreground-500 mb-1">Proveedor</label>
            <Select
              value={supplierId}
              onChange={setSupplierId}
              options={[
                { value: "all", label: "Todos" },
                ...state.suppliers.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
          </div>
          <div>
            <label className="block text-[11px] text-foreground-500 mb-1">Producto</label>
            <Select
              value={productId}
              onChange={setProductId}
              options={[
                { value: "all", label: "Todos" },
                ...state.products.map((p) => ({ value: p.id, label: p.name })),
              ]}
            />
          </div>
          <div>
            <label className="block text-[11px] text-foreground-500 mb-1">Vendedor</label>
            <Select
              value={sellerId}
              onChange={setSellerId}
              options={[
                { value: "all", label: "Todos" },
                ...state.users.map((u) => ({ value: u.id, label: u.name })),
              ]}
            />
          </div>
          <div>
            <label className="block text-[11px] text-foreground-500 mb-1">Tipo de venta</label>
            <Select
              value={channel}
              onChange={setChannel}
              options={[
                { value: "all", label: "Todas" },
                { value: "retail", label: "Minorista" },
                { value: "wholesale", label: "Mayorista" },
              ]}
            />
          </div>
          <div>
            <label className="block text-[11px] text-foreground-500 mb-1">Cuenta</label>
            <Select
              value={accountId}
              onChange={setAccountId}
              options={[
                { value: "all", label: "Todas" },
                ...state.accounts.map((a) => ({ value: a.id, label: a.name })),
              ]}
            />
          </div>
        </div>
        {reportKey === "treasury" ? (
          <div className="mt-2 max-w-[240px]">
            <label className="block text-[11px] text-foreground-500 mb-1">
              Tipo de movimiento
            </label>
            <Select
              value={movementType}
              onChange={setMovementType}
              options={movementKindOptions}
            />
          </div>
        ) : null}
        {reportKey === "employees" ? (
          <div className="mt-2 max-w-[280px]">
            <label className="block text-[11px] text-foreground-500 mb-1">
              Empleado
            </label>
            <Select
              value={employeeId}
              onChange={setEmployeeId}
              options={[
                { value: "all", label: "Todos los empleados" },
                ...state.employees.map((e) => ({
                  value: e.id,
                  label: `${e.firstName} ${e.lastName}`.trim(),
                })),
              ]}
            />
          </div>
        ) : null}
      </section>

      <div className="rounded-lg border border-background-200 bg-background-50 p-2 flex gap-1 overflow-x-auto">
        {reports.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => setReportKey(r.key)}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer ${
              reportKey === r.key
                ? "bg-primary-500 text-background-50"
                : "text-foreground-600 hover:bg-background-100"
            }`}
          >
            <i className={r.icon} />
            {r.label}
          </button>
        ))}
      </div>

      {reportKey === "employees" ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="rounded-lg border border-background-200 bg-background-50 p-4">
            <p className="text-xs text-foreground-500">Sueldos pagados (neto)</p>
            <p className="text-xl font-semibold tabular-nums text-foreground-950">
              {toCurrency(employeeData.paidNet)}
            </p>
            <p className="text-[11px] text-foreground-400">
              {employeeData.payments.length} pago(s) · bruto{" "}
              {toCurrency(employeeData.paidGross)}
            </p>
          </div>
          <div className="rounded-lg border border-background-200 bg-background-50 p-4">
            <p className="text-xs text-foreground-500">Descuentos aplicados</p>
            <p className="text-xl font-semibold tabular-nums text-danger">
              {toCurrency(employeeData.paidDiscounts)}
            </p>
            <p className="text-[11px] text-foreground-400">
              Retiros {toCurrency(employeeData.paidDiscounts)} · adelantos{" "}
              {toCurrency(employeeData.paidAdvanceDiscounts)}
            </p>
          </div>
          <div className="rounded-lg border border-accent-200 bg-accent-100/60 p-4">
            <p className="text-xs text-foreground-600">Adelantos pendientes</p>
            <p className="text-xl font-semibold tabular-nums text-accent-700">
              {toCurrency(employeeData.advancePendingTotal)}
            </p>
            <p className="text-[11px] text-foreground-500">
              {employeeData.pendingAdvances.length} adelanto(s) sin descontar
            </p>
          </div>
          <div className="rounded-lg border border-warning/30 bg-warning-soft p-4">
            <p className="text-xs text-foreground-600">Retiros pendientes</p>
            <p className="text-xl font-semibold tabular-nums text-warning">
              {toCurrency(employeeData.pendingTotal)}
            </p>
            <p className="text-[11px] text-foreground-500">
              {employeeData.pendingWithdrawals.length} retiro(s) sin descontar
            </p>
          </div>
          <div className="rounded-lg border border-background-200 bg-background-50 p-4">
            <p className="text-xs text-foreground-500">Total retirado</p>
            <p className="text-xl font-semibold tabular-nums text-foreground-950">
              {toCurrency(employeeData.withdrawnTotal)}
            </p>
            <p className="text-[11px] text-foreground-400">
              {employeeData.withdrawals.length} retiro(s) · adelantos{" "}
              {toCurrency(employeeData.advancesTotal)}
            </p>
          </div>
        </div>
      ) : null}

      {reportKey === "sales" && dailySeries.entries.length > 0 ? (
        <section className="rounded-lg border border-background-200 bg-background-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground-950">
              Evolucion diaria de ventas
            </h3>
            <span className="text-xs text-foreground-500">
              Maximo {toCurrency(dailySeries.max)}
            </span>
          </div>
          <div className="flex items-end gap-2 h-32">
            {dailySeries.entries.map(([key, value]) => (
              <div key={key} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                <div
                  className="w-full rounded-t-sm bg-primary-500/80 hover:bg-primary-500 transition-colors"
                  style={{
                    height: `${Math.max(4, (value / (dailySeries.max || 1)) * 100)}%`,
                  }}
                  title={`${key} · ${toCurrency(value)}`}
                />
                <span className="text-[9px] text-foreground-400 truncate w-full text-center">
                  {key.slice(5)}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-lg border border-background-200 bg-background-50">
        <div className="px-4 py-3 border-b border-background-200 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-md bg-secondary-100 text-secondary-900 flex items-center justify-center">
              <i className={active?.icon ?? "ri-bar-chart-2-line"} />
            </span>
            <h3 className="text-sm font-semibold text-foreground-950">
              {reportData.label}
            </h3>
          </div>
          <span className="text-xs text-foreground-500">
            {reportData.rows.length} registro(s) · clic en una fila para ver el detalle
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-xs text-foreground-500 border-b border-background-200 bg-background-100/60">
                {reportData.columns.map((c) => (
                  <th
                    key={c.label}
                    className={`py-2.5 px-4 font-medium ${
                      c.align === "right" ? "text-right" : ""
                    }`}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-background-100">
              {reportData.rows.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-background-100/60 cursor-pointer"
                  onClick={() =>
                    setDetail({ title: row.title, fields: row.fields })
                  }
                >
                  {row.values.map((value, index) => (
                    <td
                      key={`${row.id}-${index}`}
                      className={`py-2.5 px-4 ${
                        reportData.columns[index]?.align === "right"
                          ? "text-right tabular-nums"
                          : ""
                      } ${index === 0 ? "text-foreground-900 font-medium" : "text-foreground-700"}`}
                    >
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-background-200 bg-background-100/70 text-xs font-semibold text-foreground-800">
                {reportData.totals.map((value, index) => (
                  <td
                    key={`total-${index}`}
                    className={`py-2.5 px-4 ${
                      reportData.columns[index]?.align === "right"
                        ? "text-right tabular-nums"
                        : ""
                    }`}
                  >
                    {value}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>

        {reportData.rows.length === 0 ? (
          <div className="py-14 text-center text-foreground-400">
            <i className="ri-bar-chart-2-line text-5xl" />
            <p className="mt-3 text-sm">
              No hay datos para los filtros elegidos.
            </p>
          </div>
        ) : null}

        <p className="px-4 py-2.5 border-t border-background-200 text-[11px] text-foreground-400">
          {reportData.note}
        </p>
      </section>

      <ReportDetailModal
        open={Boolean(detail)}
        title={detail?.title ?? ""}
        fields={detail?.fields ?? []}
        onClose={() => setDetail(null)}
      />
    </div>
  );
};

export default ReportsPage;