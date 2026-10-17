import { useMemo, useState } from "react";
import type { PurchaseInvoice, Supplier } from "@/types";
import { useApp } from "@/store/AppContext";
import { useToast } from "@/components/base/Toast";
import Modal from "@/components/base/Modal";
import Button from "@/components/base/Button";
import Chip from "@/components/base/Chip";
import PurchaseInvoiceDetailModal from "./PurchaseInvoiceDetailModal";
import {
  invoiceBalance,
  invoiceStatusLabel,
  invoiceStatusTone,
  supplierDebt,
  supplierInvoices,
  supplierPayments,
} from "@/utils/purchases";
import { toCurrency, toDateTimeLabel } from "@/utils/format";

interface SupplierDetailModalProps {
  open: boolean;
  supplier: Supplier | null;
  onClose: () => void;
  onEdit: (supplier: Supplier) => void;
  onNewEntry: (supplier: Supplier) => void;
  onPayInvoice: (invoice: PurchaseInvoice) => void;
}

const SupplierDetailModal = ({
  open,
  supplier,
  onClose,
  onEdit,
  onNewEntry,
  onPayInvoice,
}: SupplierDetailModalProps) => {
  const { state, currentUser, saveSupplier } = useApp();
  const { notify } = useToast();
  const [invoice, setInvoice] = useState<PurchaseInvoice | null>(null);

  const invoices = useMemo(
    () => (supplier ? supplierInvoices(supplier.id, state.purchaseInvoices) : []),
    [supplier, state.purchaseInvoices]
  );
  const payments = useMemo(
    () => (supplier ? supplierPayments(supplier.id, state.supplierPayments) : []),
    [supplier, state.supplierPayments]
  );

  if (!supplier) return null;

  const debt = supplierDebt(supplier.id, state.purchaseInvoices);
  const totalComprado = invoices.reduce((a, i) => a + i.total, 0);
  const totalPagado = invoices.reduce((a, i) => a + i.paidAmount, 0);
  const pendientes = invoices.filter((i) => i.status !== "pagada").length;
  const pricesIncludeIva = supplier.pricesIncludeIva !== false;

  const setPricesIncludeIva = (next: boolean) => {
    if (next === pricesIncludeIva) return;
    saveSupplier(
      { ...supplier, pricesIncludeIva: next },
      currentUser?.name ?? "Sistema"
    );
    notify(
      "Preferencia actualizada",
      "success",
      `Facturas ${next ? "con" : "sin"} IVA incluido`
    );
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={supplier.name}
        subtitle={`${supplier.kind === "hipermercado" ? "Hipermercado" : "Proveedor"} · ${supplier.cuit || "Sin CUIT"}`}
        size="xl"
        footer={
          <>
            <Button
              variant="outline"
              icon="ri-edit-line"
              onClick={() => onEdit(supplier)}
            >
              Editar
            </Button>
            <Button
              icon="ri-truck-line"
              onClick={() => onNewEntry(supplier)}
              disabled={!supplier.active}
            >
              Ingreso de mercaderia
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Cerrar
            </Button>
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Chip tone={debt > 0.5 ? "danger" : "success"}>
            {debt > 0.5 ? "Con pagos pendientes" : "Al dia"}
          </Chip>
          <Chip tone={supplier.active ? "success" : "neutral"}>
            {supplier.active ? "Activo" : "Inactivo"}
          </Chip>
          {supplier.kind === "hipermercado" ? (
            <Chip tone="accent" icon="ri-store-2-line">
              Hipermercado
            </Chip>
          ) : null}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="rounded-md border border-background-200 bg-background-50 p-3">
            <p className="text-xs text-foreground-500">Total pendiente</p>
            <p className="text-lg font-bold tabular-nums text-danger">
              {toCurrency(debt)}
            </p>
            <p className="text-[11px] text-foreground-400">
              {pendientes} factura(s) sin cancelar
            </p>
          </div>
          <div className="rounded-md border border-background-200 bg-background-50 p-3">
            <p className="text-xs text-foreground-500">Comprado</p>
            <p className="text-sm font-semibold tabular-nums">
              {toCurrency(totalComprado)}
            </p>
            <p className="text-[11px] text-foreground-400">
              {invoices.length} ingreso(s)
            </p>
          </div>
          <div className="rounded-md border border-background-200 bg-background-50 p-3">
            <p className="text-xs text-foreground-500">Pagado</p>
            <p className="text-sm font-semibold tabular-nums text-success">
              {toCurrency(totalPagado)}
            </p>
          </div>
          <div className="rounded-md border border-background-200 bg-background-50 p-3">
            <p className="text-xs text-foreground-500">Telefono</p>
            <p className="text-sm font-semibold">{supplier.phone || "—"}</p>
            <p className="text-[11px] text-foreground-400 truncate">
              {supplier.contact}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3 text-sm">
          <div className="rounded-md bg-background-100 p-3">
            <p className="text-xs text-foreground-500">Direccion</p>
            <p className="text-foreground-800">{supplier.address || "—"}</p>
          </div>
          <div className="rounded-md bg-background-100 p-3">
            <p className="text-xs text-foreground-500">Observaciones</p>
            <p className="text-foreground-800">{supplier.notes || "—"}</p>
          </div>
        </div>

        <div className="rounded-md border border-background-200 bg-background-50 p-3 mb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-foreground-500">Precios de factura</p>
            <p className="text-sm text-foreground-800">
              {pricesIncludeIva
                ? "Los costos se informan con IVA incluido"
                : "Los costos se informan sin IVA incluido"}
            </p>
            <p className="text-[11px] text-foreground-400">
              Preferencia editable: se precarga en cada ingreso de mercaderia y
              se puede modificar por factura.
            </p>
          </div>
          <div className="flex items-center gap-1 bg-background-100 rounded-full p-1 shrink-0">
            <button
              type="button"
              onClick={() => setPricesIncludeIva(true)}
              className={`px-3 h-8 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                pricesIncludeIva
                  ? "bg-primary-500 text-background-50"
                  : "text-foreground-600 hover:text-foreground-900"
              }`}
            >
              Con IVA
            </button>
            <button
              type="button"
              onClick={() => setPricesIncludeIva(false)}
              className={`px-3 h-8 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                !pricesIncludeIva
                  ? "bg-primary-500 text-background-50"
                  : "text-foreground-600 hover:text-foreground-900"
              }`}
            >
              Sin IVA
            </button>
          </div>
        </div>

        <h4 className="text-xs font-semibold uppercase tracking-wide text-foreground-500 mb-2">
          Historial de ingresos de mercaderia
        </h4>
        <div className="rounded-md border border-background-200 overflow-hidden mb-5">
          {invoices.length === 0 ? (
            <p className="px-3 py-6 text-sm text-foreground-400 text-center">
              Todavia no hay ingresos registrados para este proveedor.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-foreground-500 bg-background-100 border-b border-background-200">
                    <th className="py-2 px-3 font-medium">Comprobante</th>
                    <th className="py-2 px-3 font-medium">Fecha</th>
                    <th className="py-2 px-3 font-medium text-right">Total</th>
                    <th className="py-2 px-3 font-medium text-right">Pagado</th>
                    <th className="py-2 px-3 font-medium text-right">Saldo</th>
                    <th className="py-2 px-3 font-medium">Estado</th>
                    <th className="py-2 px-3 font-medium text-right">Ver</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-background-100">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-background-100/60">
                      <td className="py-2 px-3">
                        <span className="block text-foreground-900">
                          {inv.receiptType} {inv.receiptNumber}
                        </span>
                        <span className="block text-[11px] text-foreground-400">
                          {inv.items.length} productos
                        </span>
                      </td>
                      <td className="py-2 px-3 text-xs text-foreground-600">
                        {toDateTimeLabel(inv.date)}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums">
                        {toCurrency(inv.total)}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-success">
                        {toCurrency(inv.paidAmount)}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums font-medium">
                        {toCurrency(invoiceBalance(inv))}
                      </td>
                      <td className="py-2 px-3">
                        <Chip tone={invoiceStatusTone(inv.status)}>
                          {invoiceStatusLabel(inv.status)}
                        </Chip>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          icon="ri-eye-line"
                          onClick={() => setInvoice(inv)}
                        >
                          Ver
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <h4 className="text-xs font-semibold uppercase tracking-wide text-foreground-500 mb-2">
          Historial de pagos
        </h4>
        <div className="rounded-md border border-background-200">
          {payments.length === 0 ? (
            <p className="px-3 py-4 text-sm text-foreground-400">
              Sin pagos registrados.
            </p>
          ) : (
            <ul className="divide-y divide-background-100">
              {payments.map((p) => (
                <li key={p.id} className="px-3 py-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-foreground-900">
                      {toCurrency(p.amount)}{" "}
                      <span className="text-xs text-foreground-400">
                        · Factura {p.invoiceNumber} · {p.methodName} ·{" "}
                        {p.accountName}
                      </span>
                    </p>
                    <p className="text-[11px] text-foreground-400">
                      {toDateTimeLabel(p.date)} · {p.userName}
                      {p.note ? ` · ${p.note}` : ""}
                    </p>
                  </div>
                  <Chip tone="secondary">Egreso</Chip>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>

      <PurchaseInvoiceDetailModal
        open={Boolean(invoice)}
        invoice={invoice}
        onClose={() => setInvoice(null)}
        onPay={(inv) => {
          setInvoice(null);
          onPayInvoice(inv);
        }}
      />
    </>
  );
};

export default SupplierDetailModal;