import type { Sale } from "@/types";
import Modal from "@/components/base/Modal";
import Button from "@/components/base/Button";
import Chip from "@/components/base/Chip";
import { saleStatusLabel, saleStatusTone } from "@/utils/sales";
import { toCurrency, toDateTimeLabel, toNumber } from "@/utils/format";

interface SaleDetailModalProps {
  open: boolean;
  onClose: () => void;
  sale: Sale | null;
  onPrint?: () => void;
  onAnnul?: () => void;
}

const SaleDetailModal = ({
  open,
  onClose,
  sale,
  onPrint,
  onAnnul,
}: SaleDetailModalProps) => {
  if (!sale) return null;

  const canAnnul = Boolean(onAnnul) && sale.status === "finalizada";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Venta #${sale.number}`}
      subtitle={`${toDateTimeLabel(sale.date)} · ${saleStatusLabel(sale.status)}`}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
          {canAnnul ? (
            <Button
              variant="danger"
              icon="ri-arrow-go-back-line"
              onClick={onAnnul}
            >
              Anular venta
            </Button>
          ) : null}
          {onPrint ? (
            <Button variant="primary" icon="ri-printer-line" onClick={onPrint}>
              Imprimir ticket
            </Button>
          ) : null}
        </>
      }
    >
      <div className="flex items-center gap-2 -mt-1 mb-3">
        <Chip tone={saleStatusTone(sale.status)}>
          {saleStatusLabel(sale.status)}
        </Chip>
        {sale.confirmedByName ? (
          <span className="text-xs text-foreground-500">
            Confirmada por {sale.confirmedByName}
          </span>
        ) : null}
      </div>

      {sale.status === "anulada" ? (
        <div className="mb-3 rounded-md border border-danger/40 bg-danger-soft px-3 py-2.5">
          <p className="text-sm font-semibold text-danger flex items-center gap-1.5">
            <i className="ri-error-warning-line" /> Venta anulada
          </p>
          <p className="text-xs text-foreground-700 mt-0.5">
            {sale.annulReason || "Sin motivo registrado"}
            {sale.annulledByName ? ` · por ${sale.annulledByName}` : ""}
            {sale.annulledAt ? ` · ${toDateTimeLabel(sale.annulledAt)}` : ""}
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-md bg-background-100 px-3 py-2">
          <p className="text-xs text-foreground-500">Vendedor</p>
          <p className="text-sm text-foreground-800">{sale.sellerName}</p>
        </div>
        <div className="rounded-md bg-background-100 px-3 py-2">
          <p className="text-xs text-foreground-500">Cliente</p>
          <p className="text-sm text-foreground-800 truncate">
            {sale.customer || "Consumidor final"}
          </p>
        </div>
        <div className="rounded-md bg-background-100 px-3 py-2">
          <p className="text-xs text-foreground-500">Tipo</p>
          <Chip tone={sale.channel === "retail" ? "primary" : "accent"}>
            {sale.channel === "retail" ? "MINORISTA" : "MAYORISTA"}
          </Chip>
        </div>
        <div className="rounded-md bg-background-100 px-3 py-2">
          <p className="text-xs text-foreground-500">Ganancia estimada</p>
          <p
            className={`text-sm font-medium tabular-nums ${
              sale.estimatedProfit < 0 ? "text-danger" : "text-success"
            }`}
          >
            {toCurrency(sale.estimatedProfit)}
          </p>
        </div>
      </div>

      <h4 className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wide text-foreground-500">
        Productos
      </h4>
      <div className="overflow-x-auto border border-background-200 rounded-md">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="text-left text-xs text-foreground-500 bg-background-100/60">
              <th className="py-2 px-3 font-medium">Nombre</th>
              <th className="py-2 px-3 font-medium text-right">Cantidad</th>
              <th className="py-2 px-3 font-medium text-right">Precio</th>
              <th className="py-2 px-3 font-medium">Promocion</th>
              <th className="py-2 px-3 font-medium text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-background-100">
            {sale.items.map((item) => (
              <tr key={item.id}>
                <td className="py-2 px-3 text-foreground-800">{item.name}</td>
                <td className="py-2 px-3 text-right tabular-nums">
                  {toNumber(item.quantity, item.unit === "kg" ? 3 : 0)}{" "}
                  {item.unit === "kg" ? "kg" : "un"}
                </td>
                <td className="py-2 px-3 text-right tabular-nums">
                  {toCurrency(item.unitPrice)}
                </td>
                <td className="py-2 px-3">
                  {item.promotionLabel ? (
                    <Chip tone="primary">{item.promotionLabel}</Chip>
                  ) : (
                    <span className="text-xs text-foreground-400">—</span>
                  )}
                </td>
                <td className="py-2 px-3 text-right tabular-nums font-medium">
                  {toCurrency(item.subtotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h4 className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wide text-foreground-500">
        Cobros
      </h4>
      <ul className="border border-background-200 rounded-md divide-y divide-background-100">
        {sale.payments.map((p) => (
          <li key={p.id} className="px-3 py-2 flex items-center justify-between">
            <span className="text-sm text-foreground-700">
              {p.methodName}
              <span className="text-foreground-400"> · {p.accountName}</span>
            </span>
            <span className="text-sm font-medium tabular-nums text-foreground-900">
              {toCurrency(p.amount)}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-center justify-between rounded-md bg-foreground-950 px-4 py-3">
        <span className="text-sm text-foreground-300">TOTAL</span>
        <span className="text-xl font-bold text-background-50 tabular-nums">
          {toCurrency(sale.total)}
        </span>
      </div>
    </Modal>
  );
};

export default SaleDetailModal;