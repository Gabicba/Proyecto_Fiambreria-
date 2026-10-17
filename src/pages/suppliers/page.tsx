import { useMemo, useState } from "react";
import type { PurchaseInvoice, Supplier } from "@/types";
import { useApp } from "@/store/AppContext";
import { useToast } from "@/components/base/Toast";
import Button from "@/components/base/Button";
import Chip from "@/components/base/Chip";
import Select from "@/components/base/Select";
import IconButton from "@/components/base/IconButton";
import SupplierFormModal from "./components/SupplierFormModal";
import SupplierDetailModal from "./components/SupplierDetailModal";
import PurchaseEntryModal from "./components/PurchaseEntryModal";
import PurchaseInvoiceDetailModal from "./components/PurchaseInvoiceDetailModal";
import SupplierPaymentModal from "./components/SupplierPaymentModal";
import {
  invoiceBalance,
  invoiceStatusLabel,
  invoiceStatusTone,
  supplierDebt,
  supplierInvoices,
} from "@/utils/purchases";
import {
  normalizeText,
  toCurrency,
  toDateKey,
  toDateTimeLabel,
} from "@/utils/format";

type Tab = "suppliers" | "entry" | "invoices";

const SuppliersPage = () => {
  const { state, currentUser, saveSupplier } = useApp();
  const { notify } = useToast();

  const [tab, setTab] = useState<Tab>("suppliers");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [invoiceSupplier, setInvoiceSupplier] = useState("all");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("all");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [entryOpen, setEntryOpen] = useState(false);
  const [entrySupplierId, setEntrySupplierId] = useState("");
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);

  const detailSupplier = detailId
    ? state.suppliers.find((s) => s.id === detailId) ?? null
    : null;
  const invoice = invoiceId
    ? state.purchaseInvoices.find((i) => i.id === invoiceId) ?? null
    : null;
  const paymentInvoice = paymentId
    ? state.purchaseInvoices.find((i) => i.id === paymentId) ?? null
    : null;

  const kpis = useMemo(() => {
    const active = state.suppliers.filter((s) => s.active).length;
    const debt = state.purchaseInvoices.reduce(
      (a, i) => a + invoiceBalance(i),
      0
    );
    const pending = state.purchaseInvoices.filter((i) => i.status !== "pagada").length;
    const monthKey = toDateKey(new Date()).slice(0, 7);
    const purchasedMonth = state.purchaseInvoices
      .filter((i) => toDateKey(new Date(i.date)).slice(0, 7) === monthKey)
      .reduce((a, i) => a + i.total, 0);
    return { active, debt, pending, purchasedMonth };
  }, [state.suppliers, state.purchaseInvoices]);

  const suppliers = useMemo(() => {
    const q = normalizeText(query).trim();
    return state.suppliers
      .filter((s) => {
        if (statusFilter === "pending") {
          return supplierDebt(s.id, state.purchaseInvoices) > 0.5;
        }
        if (statusFilter === "clean") {
          return supplierDebt(s.id, state.purchaseInvoices) <= 0.5;
        }
        return true;
      })
      .filter((s) =>
        q
          ? normalizeText(`${s.name} ${s.contact} ${s.cuit} ${s.phone}`).includes(q)
          : true
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [state.suppliers, state.purchaseInvoices, query, statusFilter]);

  const invoices = useMemo(() => {
    const q = normalizeText(query).trim();
    return [...state.purchaseInvoices]
      .filter((i) => invoiceSupplier === "all" || i.supplierId === invoiceSupplier)
      .filter((i) => invoiceStatusFilter === "all" || i.status === invoiceStatusFilter)
      .filter((i) =>
        q
          ? normalizeText(
              `${i.supplierName} ${i.receiptNumber} ${i.receiptType}`
            ).includes(q)
          : true
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [state.purchaseInvoices, invoiceSupplier, invoiceStatusFilter, query]);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (supplier: Supplier) => {
    setEditing(supplier);
    setFormOpen(true);
  };

  const handleSaved = (supplier: Supplier) => {
    saveSupplier(supplier, currentUser?.name ?? "Sistema");
    setFormOpen(false);
    setEditing(null);
    notify("Proveedor guardado", "success", supplier.name);
  };

  const openEntry = (supplierId = "") => {
    setEntrySupplierId(supplierId);
    setEntryOpen(true);
    setTab("entry");
  };

  const tabButton = (key: Tab, label: string, icon: string, count?: number) => (
    <button
      type="button"
      onClick={() => setTab(key)}
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${
        tab === key
          ? "bg-primary-500 text-background-50"
          : "text-foreground-600 hover:bg-background-100"
      }`}
    >
      <i className={icon} />
      {label}
      {typeof count === "number" ? (
        <span
          className={`text-[10px] min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center ${
            tab === key
              ? "bg-background-50/20 text-background-50"
              : "bg-background-200 text-foreground-600"
          }`}
        >
          {count}
        </span>
      ) : null}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-lg border border-background-200 bg-background-50 p-4">
          <p className="text-xs text-foreground-500">Proveedores activos</p>
          <p className="text-2xl font-semibold text-foreground-950">{kpis.active}</p>
          <p className="text-[11px] text-foreground-400">
            {state.suppliers.filter((s) => s.kind === "hipermercado").length}{" "}
            hipermercado(s)
          </p>
        </div>
        <div className="rounded-lg border border-background-200 bg-background-50 p-4">
          <p className="text-xs text-foreground-500">Deuda con proveedores</p>
          <p className="text-2xl font-semibold text-danger tabular-nums">
            {toCurrency(kpis.debt)}
          </p>
        </div>
        <div className="rounded-lg border border-background-200 bg-background-50 p-4">
          <p className="text-xs text-foreground-500">Facturas sin cancelar</p>
          <p className="text-2xl font-semibold text-warning">{kpis.pending}</p>
          <p className="text-[11px] text-foreground-400">
            {state.purchaseInvoices.length} ingresos registrados
          </p>
        </div>
        <div className="rounded-lg border border-background-200 bg-background-50 p-4">
          <p className="text-xs text-foreground-500">Compras del mes</p>
          <p className="text-2xl font-semibold text-foreground-950 tabular-nums">
            {toCurrency(kpis.purchasedMonth)}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-background-200 bg-background-50 p-2 flex items-center gap-1 flex-wrap">
        {tabButton("suppliers", "Proveedores", "ri-truck-line", state.suppliers.length)}
        {tabButton(
          "entry",
          "Ingreso de mercaderia",
          "ri-inbox-archive-line",
          state.purchaseInvoices.length
        )}
        {tabButton("invoices", "Facturas y pagos", "ri-file-list-3-line")}
        <div className="ml-auto flex items-center gap-2 px-1">
          <Button size="sm" variant="outline" icon="ri-refresh-line" onClick={() => {
            setQuery("");
            setStatusFilter("all");
            setInvoiceSupplier("all");
            setInvoiceStatusFilter("all");
          }}>
            Limpiar filtros
          </Button>
          <Button size="sm" icon="ri-add-line" onClick={openNew}>
            Nuevo proveedor
          </Button>
        </div>
      </div>

      {tab === "suppliers" ? (
        <section className="rounded-lg border border-background-200 bg-background-50">
          <div className="p-4 border-b border-background-200 flex flex-col lg:flex-row gap-3">
            <div className="relative flex items-center flex-1">
              <i className="ri-search-line absolute left-3 text-foreground-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nombre, contacto, CUIT o telefono..."
                className="w-full h-9 pl-9 pr-3 rounded-md border border-background-300 bg-background-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>
            <Select
              className="lg:w-56"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "all", label: "Todos los estados" },
                { value: "pending", label: "Con pagos pendientes" },
                { value: "clean", label: "Al dia" },
              ]}
            />
            <Button icon="ri-truck-line" onClick={() => openEntry()}>
              Ingreso de mercaderia
            </Button>
          </div>

          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-foreground-500 border-b border-background-200 bg-background-100/60">
                  <th className="py-2.5 px-4 font-medium">Proveedor</th>
                  <th className="py-2.5 px-4 font-medium">Contacto</th>
                  <th className="py-2.5 px-4 font-medium">Estado financiero</th>
                  <th className="py-2.5 px-4 font-medium text-right">Total pendiente</th>
                  <th className="py-2.5 px-4 font-medium text-right">Facturas</th>
                  <th className="py-2.5 px-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-background-100">
                {suppliers.map((s) => {
                  const debt = supplierDebt(s.id, state.purchaseInvoices);
                  const list = supplierInvoices(s.id, state.purchaseInvoices);
                  return (
                    <tr key={s.id} className="hover:bg-background-100/50">
                      <td className="py-2.5 px-4">
                        <button
                          type="button"
                          onClick={() => setDetailId(s.id)}
                          className="text-left cursor-pointer"
                        >
                          <span className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-foreground-900 hover:text-primary-600">
                              {s.name}
                            </span>
                            {s.kind === "hipermercado" ? (
                              <Chip tone="accent">Hipermercado</Chip>
                            ) : null}
                            {!s.active ? <Chip tone="neutral">Inactivo</Chip> : null}
                          </span>
                          <span className="block text-xs text-foreground-400">
                            {s.cuit || "Sin CUIT"}
                          </span>
                        </button>
                      </td>
                      <td className="py-2.5 px-4 text-xs text-foreground-600">
                        <span className="block">{s.contact || "—"}</span>
                        <span className="block text-foreground-400">{s.phone || "—"}</span>
                      </td>
                      <td className="py-2.5 px-4">
                        <Chip tone={debt > 0.5 ? "danger" : "success"}>
                          {debt > 0.5 ? "Con pagos pendientes" : "Al dia"}
                        </Chip>
                      </td>
                      <td className="py-2.5 px-4 text-right tabular-nums font-medium">
                        {toCurrency(debt)}
                      </td>
                      <td className="py-2.5 px-4 text-right tabular-nums text-foreground-600">
                        {list.length}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <IconButton
                            icon="ri-eye-line"
                            label="Ver ficha del proveedor"
                            onClick={() => setDetailId(s.id)}
                          />
                          <IconButton
                            icon="ri-edit-line"
                            label="Editar proveedor"
                            onClick={() => openEdit(s)}
                          />
                          <IconButton
                            icon="ri-inbox-archive-line"
                            label="Registrar ingreso de mercaderia"
                            onClick={() => openEntry(s.id)}
                            disabled={!s.active}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="lg:hidden divide-y divide-background-100">
            {suppliers.map((s) => {
              const debt = supplierDebt(s.id, state.purchaseInvoices);
              return (
                <div key={s.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setDetailId(s.id)}
                      className="text-left cursor-pointer min-w-0"
                    >
                      <p className="font-medium text-foreground-900 truncate">{s.name}</p>
                      <p className="text-xs text-foreground-400">
                        {s.contact || "Sin contacto"} · {s.phone || "Sin telefono"}
                      </p>
                    </button>
                    <Chip tone={debt > 0.5 ? "danger" : "success"}>
                      {debt > 0.5 ? "Pendiente" : "Al dia"}
                    </Chip>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-foreground-500">Deuda</span>
                    <span className="text-sm font-semibold tabular-nums">
                      {toCurrency(debt)}
                    </span>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      icon="ri-eye-line"
                      onClick={() => setDetailId(s.id)}
                    >
                      Ficha
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      icon="ri-inbox-archive-line"
                      onClick={() => openEntry(s.id)}
                      disabled={!s.active}
                    >
                      Ingreso
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {suppliers.length === 0 ? (
            <div className="py-14 text-center text-foreground-400">
              <i className="ri-truck-line text-5xl" />
              <p className="mt-3 text-sm">No hay proveedores que coincidan.</p>
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === "entry" ? (
        <div className="space-y-4">
          <section className="rounded-lg border border-primary-200 bg-primary-50 p-5">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              <span className="w-12 h-12 rounded-md bg-primary-500 text-background-50 flex items-center justify-center shrink-0">
                <i className="ri-inbox-archive-line text-2xl" />
              </span>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-foreground-950">
                  Registrar ingreso de mercaderia
                </h3>
                <p className="text-sm text-foreground-600 mt-0.5 max-w-2xl">
                  Carga la factura del proveedor, agrega productos, revisa los
                  nuevos costos y precios, y confirma. El stock se suma al actual
                  y la deuda queda registrada aunque no se pague en el momento.
                </p>
              </div>
              <Button icon="ri-add-line" onClick={() => openEntry()}>
                Nuevo ingreso
              </Button>
            </div>
          </section>

          <section className="rounded-lg border border-background-200 bg-background-50">
            <div className="px-4 py-3 border-b border-background-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground-950">
                Ingresos recientes
              </h3>
              <span className="text-xs text-foreground-500">
                {state.purchaseInvoices.length} facturas
              </span>
            </div>
            <ul className="divide-y divide-background-100">
              {[...state.purchaseInvoices]
                .sort((a, b) => b.date.localeCompare(a.date))
                .slice(0, 8)
                .map((i) => (
                  <li key={i.id} className="px-4 py-3 flex items-center gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground-900 truncate">
                        {i.supplierName}
                      </p>
                      <p className="text-xs text-foreground-400">
                        {i.receiptType} {i.receiptNumber} · {toDateTimeLabel(i.date)} ·{" "}
                        {i.items.length} productos
                      </p>
                    </div>
                    <Chip tone={invoiceStatusTone(i.status)}>
                      {invoiceStatusLabel(i.status)}
                    </Chip>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums">
                        {toCurrency(i.total)}
                      </p>
                      <p className="text-[11px] text-foreground-400">
                        Saldo {toCurrency(invoiceBalance(i))}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      icon="ri-eye-line"
                      onClick={() => setInvoiceId(i.id)}
                    >
                      Ver
                    </Button>
                  </li>
                ))}
            </ul>
            {state.purchaseInvoices.length === 0 ? (
              <p className="py-10 text-center text-sm text-foreground-400">
                Todavia no hay ingresos registrados.
              </p>
            ) : null}
          </section>
        </div>
      ) : null}

      {tab === "invoices" ? (
        <section className="rounded-lg border border-background-200 bg-background-50">
          <div className="p-4 border-b border-background-200 flex flex-col lg:flex-row gap-3">
            <div className="relative flex items-center flex-1">
              <i className="ri-search-line absolute left-3 text-foreground-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por proveedor o comprobante..."
                className="w-full h-9 pl-9 pr-3 rounded-md border border-background-300 bg-background-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>
            <Select
              className="lg:w-64"
              value={invoiceSupplier}
              onChange={setInvoiceSupplier}
              options={[
                { value: "all", label: "Todos los proveedores" },
                ...state.suppliers.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
            <Select
              className="lg:w-52"
              value={invoiceStatusFilter}
              onChange={setInvoiceStatusFilter}
              options={[
                { value: "all", label: "Todos los estados" },
                { value: "pendiente", label: "Pendientes" },
                { value: "parcial", label: "Parcialmente pagadas" },
                { value: "pagada", label: "Pagadas" },
              ]}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[820px]">
              <thead>
                <tr className="text-left text-xs text-foreground-500 border-b border-background-200 bg-background-100/60">
                  <th className="py-2.5 px-4 font-medium">Comprobante</th>
                  <th className="py-2.5 px-4 font-medium">Proveedor</th>
                  <th className="py-2.5 px-4 font-medium">Fecha</th>
                  <th className="py-2.5 px-4 font-medium text-right">Total</th>
                  <th className="py-2.5 px-4 font-medium text-right">Pagado</th>
                  <th className="py-2.5 px-4 font-medium text-right">Saldo</th>
                  <th className="py-2.5 px-4 font-medium">Estado</th>
                  <th className="py-2.5 px-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-background-100">
                {invoices.map((i) => (
                  <tr key={i.id} className="hover:bg-background-100/50">
                    <td className="py-2.5 px-4">
                      <span className="block text-foreground-900">
                        {i.receiptType} {i.receiptNumber}
                      </span>
                      <span className="block text-[11px] text-foreground-400">
                        {i.items.length} productos
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-foreground-700">{i.supplierName}</td>
                    <td className="py-2.5 px-4 text-xs text-foreground-500">
                      {toDateTimeLabel(i.date)}
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums">
                      {toCurrency(i.total)}
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums text-success">
                      {toCurrency(i.paidAmount)}
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums font-medium">
                      {toCurrency(invoiceBalance(i))}
                    </td>
                    <td className="py-2.5 px-4">
                      <Chip tone={invoiceStatusTone(i.status)}>
                        {invoiceStatusLabel(i.status)}
                      </Chip>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <IconButton
                          icon="ri-eye-line"
                          label="Ver detalle de la factura"
                          onClick={() => setInvoiceId(i.id)}
                        />
                        <IconButton
                          icon="ri-hand-coin-line"
                          label="Registrar pago"
                          onClick={() => setPaymentId(i.id)}
                          disabled={invoiceBalance(i) <= 0}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {invoices.length === 0 ? (
            <div className="py-14 text-center text-foreground-400">
              <i className="ri-file-list-3-line text-5xl" />
              <p className="mt-3 text-sm">No hay facturas que coincidan.</p>
            </div>
          ) : null}
        </section>
      ) : null}

      <p className="text-[11px] text-foreground-400 flex items-center gap-1.5">
        <i className="ri-information-line" />
        Los comprobantes adjuntos y estos movimientos son datos de demostracion
        guardados en el navegador. La persistencia definitiva se implementara con
        una transaccion atomica en el backend.
      </p>

      <SupplierFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        supplier={editing}
        onSaved={handleSaved}
      />

      <SupplierDetailModal
        open={Boolean(detailSupplier)}
        supplier={detailSupplier}
        onClose={() => setDetailId(null)}
        onEdit={(s) => openEdit(s)}
        onNewEntry={(s) => {
          setDetailId(null);
          openEntry(s.id);
        }}
        onPayInvoice={(inv: PurchaseInvoice) => setPaymentId(inv.id)}
      />

      <PurchaseEntryModal
        open={entryOpen}
        onClose={() => setEntryOpen(false)}
        defaultSupplierId={entrySupplierId}
        onSaved={() => setTab("invoices")}
      />

      <PurchaseInvoiceDetailModal
        open={Boolean(invoice)}
        invoice={invoice}
        onClose={() => setInvoiceId(null)}
        onPay={(inv) => {
          setInvoiceId(null);
          setPaymentId(inv.id);
        }}
      />

      <SupplierPaymentModal
        open={Boolean(paymentInvoice)}
        invoice={paymentInvoice}
        onClose={() => setPaymentId(null)}
      />
    </div>
  );
};

export default SuppliersPage;