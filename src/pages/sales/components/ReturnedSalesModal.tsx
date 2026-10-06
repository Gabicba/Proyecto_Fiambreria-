import Modal from "@/components/base/Modal";
import Button from "@/components/base/Button";
import Chip from "@/components/base/Chip";
import type { Sale } from "@/types";
import { toCurrency, toDateTimeLabel } from "@/utils/format";

interface ReturnedSalesModalProps {
  open: boolean;
  onClose: () => void;
  sales: Sale[];
  onCorrect: (sale: Sale) => void;
}

const ReturnedSalesModal = ({
  open,
  onClose,
  sales,
  onCorrect,
}: ReturnedSalesModalProps) => (
  <Modal
    open={open}
    onClose={onClose}
    title="Operaciones devueltas por Caja"
    subtitle="Revisá el motivo, ajustá productos o cantidades y reenviá la operación al control de caja."
    size="lg"
  >
    {sales.length === 0 ? (
      <div className="flex flex-col items-center justify-center text-center text-foreground-400 py-12">
        <i className="ri-checkbox-circle-line text-5xl" />
        <p className="mt-3 text-sm">No tenés operaciones devueltas.</p>
      </div>
    ) : (
      <ul className="space-y-3">
        {sales.map((sale) => (
          <li
            key={sale.id}
            className="rounded-md border border-background-200 p-4"
          >
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-foreground-950 tabular-nums">
                  #{sale.number}
                </span>
                <Chip tone={sale.channel === "retail" ? "primary" : "accent"}>
                  {sale.channel === "retail" ? "MINORISTA" : "MAYORISTA"}
                </Chip>
                <span className="text-xs text-foreground-500">
                  {toDateTimeLabel(sale.sentAt)}
                </span>
              </div>
              <span className="text-sm font-semibold text-foreground-950 tabular-nums">
                {toCurrency(sale.total)}
              </span>
            </div>
            <p className="text-xs text-foreground-500 mt-1">
              {sale.customer || "Consumidor final"} · {sale.items.length} item(s)
            </p>
            {sale.returnReason ? (
              <p className="mt-2 text-xs text-danger flex items-start gap-1">
                <i className="ri-error-warning-line mt-0.5" />
                <span>
                  <strong>Motivo:</strong> {sale.returnReason}
                </span>
              </p>
            ) : null}
            <ul className="mt-2 text-xs text-foreground-600 space-y-0.5">
              {sale.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-2">
                  <span className="truncate">
                    {item.name} · {item.quantity}{" "}
                    {item.unit === "kg" ? "kg" : "un"}
                  </span>
                  <span className="tabular-nums">
                    {toCurrency(item.subtotal)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3">
              <Button
                size="sm"
                icon="ri-edit-2-line"
                onClick={() => onCorrect(sale)}
              >
                Corregir y reenviar
              </Button>
            </div>
          </li>
        ))}
      </ul>
    )}
  </Modal>
);

export default ReturnedSalesModal;