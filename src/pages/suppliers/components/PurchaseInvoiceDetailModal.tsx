import type { PurchaseInvoice, TaxDistributionRule } from "@/types";
import { useApp } from "@/store/AppContext";
import Modal from "@/components/base/Modal";
import Button from "@/components/base/Button";
import Chip from "@/components/base/Chip";
import {
  invoiceBalance,
  invoiceStatusLabel,
  invoiceStatusTone,
} from "@/utils/purchases";
import { toCurrency, toDateTimeLabel, toNumber } from "@/utils/format";

interface PurchaseInvoiceDetailModalProps {
  open: boolean;
  invoice: PurchaseInvoice | null;
  onClose: () => void;
  onPay: (invoice: PurchaseInvoice) => void;
}

const ruleLabel: Record<TaxDistributionRule, string> = {
  neto: "Proporcional al neto",
  iva: "Proporcional al IVA",
  igual: "Partes iguales",
};

const PurchaseInvoiceDetailModal = ({
  open,
  invoice,
  onClose,
  onPay,
}: PurchaseInvoiceDetailModalProps) => {
  const { state } = useApp();
  if (!invoice) return null;
  const balance = invoiceBalance(invoice);
  const payments = state.supplierPayments
    .filter((p) => p.invoiceId === invoice.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${invoice.receiptType} ${invoice.receiptNumber}`}
      subtitle={`${invoice.supplierName} · ${toDateTimeLabel(invoice.date)}`}
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
          <Button
            icon="ri-hand-coin-line"
            disabled={balance <= 0}
            onClick={() => onPay(invoice)}
          >
            {balance <= 0 ? "Factura pagada" : "Registrar pago"}
          </Button>
        </>
      }
    >
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <Chip tone={invoiceStatusTone(invoice.status)}>
          {invoiceStatusLabel(invoice.status)}
        </Chip>
        <Chip tone="neutral" icon="ri-file-text-line">
          {invoice.attachmentName ?? "Sin comprobante adjunto"}
        </Chip>
        <Chip tone="secondary" icon="ri-arrow-left-right-line">
          Regla: {ruleLabel[invoice.taxDistributionRule]}
        </Chip>
        <Chip tone={invoice.pricesIncludeIva ? "accent" : "primary"}>
          {invoice.pricesIncludeIva ? "Precios con IVA" : "Precios sin IVA"}
        </Chip>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="rounded-md border border-background-200 bg-background-50 p-3">
          <p className="text-xs text-foreground-500">Neto</p>
          <p className="text-sm font-semibold tabular-nums">
            {toCurrency(invoice.subtotalNet)}
          </p>
        </div>
        <div className="rounded-md border border-background-200 bg-background-50 p-3">
          <p className="text-xs text-foreground-500">IVA</p>
          <p className="text-sm font-semibold tabular-nums">
            {toCurrency(invoice.ivaTotal)}
          </p>
        </div>
        <div className="rounded-md border border-background-200 bg-background-50 p-3">
          <p className="text-xs text-foreground-500">Percep. IVA / IIBB</p>
          <p className="text-sm font-semibold tabular-nums">
            {toCurrency(invoice.perceptionIvaTotal)} /{" "}
            {toCurrency(invoice.perceptionIibbTotal)}
          </p>
        </div>
        <div className="rounded-md border border-primary-200 bg-primary-50 p-3">
          <p className="text-xs text-primary-700">Total factura</p>
          <p className="text-sm font-bold tabular-nums text-primary-800">
            {toCurrency(invoice.total)}
          </p>
        </div>
      </div>

      <div className="rounded-md border border-background-200 overflow-hidden mb-4">
        <div className="px-3 py-2 bg-background-100 border-b border-background-200 flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-foreground-600">
            Detalle de mercaderia
          </h4>
          <span className="text-xs text-foreground-500">
            {invoice.items.length} productos
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-foreground-500 border-b border-background-200">
                <th className="py-2 px-3 font-medium">Producto</th>
                <th className="py-2 px-3 font-medium text-right">Cantidad</th>
                <th className="py-2 px-3 font-medium text-right">Costo sin IVA</th>
                <th className="py-2 px-3 font-medium text-right">IVA</th>
                <th className="py-2 px-3 font-medium text-right">Percep.</th>
                <th className="py-2 px-3 font-medium text-right">Total</th>
                <th className="py-2 px-3 font-medium text-right">Costo ant. → nuevo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-background-100">
              {invoice.items.map((line) => (
                <tr key={line.id}>
                  <td className="py-2 px-3">
                    <span className="block text-foreground-900">{line.productName}</span>
                    <span className="block text-xs text-foreground-400">
                      {line.boxes && line.unitsPerBox
                        ? `${line.boxes} cajas x ${line.unitsPerBox} un`
                        : line.unit === "kg"
                          ? "Por kilogramo"
                          : "Por unidad"}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums">
                    {toNumber(line.quantity, line.unit === "kg" ? 3 : 0)}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums">
                    <span className="block">{toCurrency(line.costNet)}</span>
                    <span className="block text-[10px] text-foreground-400">
                      con IVA {toCurrency(line.costWithIva)}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums text-foreground-500">
                    {toCurrency(line.ivaAmount)}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums text-foreground-500">
                    {toCurrency(line.perceptionIva + line.perceptionIibb)}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums font-medium">
                    {toCurrency(line.total)}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums">
                    <span className="text-foreground-400">
                      {toCurrency(line.prevCostNet)}
                    </span>
                    <span className="mx-1 text-foreground-300">→</span>
                    <span className="font-medium text-foreground-900">
                      {toCurrency(line.costNet)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-md border border-background-200 p-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-foreground-600 mb-2">
            Precios de venta resultantes
          </h4>
          <ul className="space-y-1.5 text-sm">
            {invoice.items.map((line) => (
              <li key={`p-${line.id}`} className="flex items-center justify-between gap-2">
                <span className="truncate text-foreground-700">{line.productName}</span>
                <span className="shrink-0 text-xs tabular-nums text-foreground-500">
                  Minor. {toCurrency(line.newPriceRetail)} · Mayor.{" "}
                  {toCurrency(line.newPriceWholesale)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-foreground-400">
            Los precios se actualizaron respetando el multiplicador que tenia cada
            producto. Este cambio queda auditado.
          </p>
        </div>

        <div className="rounded-md border border-background-200 p-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-foreground-600">
              Pagos registrados
            </h4>
            <span className="text-xs text-foreground-500">
              Saldo {toCurrency(balance)}
            </span>
          </div>
          {payments.length === 0 ? (
            <p className="text-sm text-foreground-400">
              Sin pagos. La mercaderia ya ingreso al stock independientemente del pago.
            </p>
          ) : (
            <ul className="divide-y divide-background-100">
              {payments.map((p) => (
                <li key={p.id} className="py-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm text-foreground-900 tabular-nums">
                      {toCurrency(p.amount)}{" "}
                      <span className="text-xs text-foreground-400">
                        · {p.methodName} · {p.accountName}
                      </span>
                    </p>
                    <p className="text-[11px] text-foreground-400">
                      {toDateTimeLabel(p.date)} · {p.userName}
                      {p.note ? ` · ${p.note}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {invoice.note ? (
        <p className="mt-4 text-xs text-foreground-500">
          <span className="font-medium text-foreground-700">Observaciones:</span>{" "}
          {invoice.note}
        </p>
      ) : null}
    </Modal>
  );
};

export default PurchaseInvoiceDetailModal;