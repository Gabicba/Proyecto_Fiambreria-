import Modal from "@/components/base/Modal";
import Button from "@/components/base/Button";
import Chip from "@/components/base/Chip";
import type { HeldSale } from "@/types";
import { toCurrency, toDateTimeLabel } from "@/utils/format";

interface HeldSalesModalProps {
  open: boolean;
  onClose: () => void;
  heldSales: HeldSale[];
  onLoad: (held: HeldSale) => void;
  onRemove: (heldId: string) => void;
}

const HeldSalesModal = ({
  open,
  onClose,
  heldSales,
  onLoad,
  onRemove,
}: HeldSalesModalProps) => (
  <Modal
    open={open}
    onClose={onClose}
    title="Ventas guardadas (preventas)"
    subtitle="Una preventa no descuenta stock ni genera ingreso hasta que se cobra."
    size="lg"
  >
    {heldSales.length === 0 ? (
      <div className="flex flex-col items-center justify-center text-center text-foreground-400 py-12">
        <i className="ri-inbox-line text-5xl" />
        <p className="mt-3 text-sm">Todavia no hay preventas guardadas.</p>
      </div>
    ) : (
      <ul className="space-y-3">
        {heldSales.map((held) => {
          const total = held.items.reduce((a, i) => a + i.subtotal, 0);
          return (
            <li
              key={held.id}
              className="rounded-md border border-background-200 p-4"
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <Chip tone={held.channel === "retail" ? "primary" : "accent"}>
                    {held.channel === "retail" ? "MINORISTA" : "MAYORISTA"}
                  </Chip>
                  <span className="text-sm text-foreground-700">
                    {held.customer || "Consumidor final"}
                  </span>
                </div>
                <span className="text-sm font-semibold text-foreground-950 tabular-nums">
                  {toCurrency(total)}
                </span>
              </div>
              <p className="text-xs text-foreground-500 mt-1">
                {toDateTimeLabel(held.createdAt)} · {held.sellerName} ·{" "}
                {held.items.length} item(s)
              </p>
              <ul className="mt-2 text-xs text-foreground-600 space-y-0.5">
                {held.items.map((item) => (
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
              <div className="mt-3 flex items-center gap-2">
                <Button size="sm" icon="ri-play-line" onClick={() => onLoad(held)}>
                  Recuperar y continuar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  icon="ri-delete-bin-6-line"
                  onClick={() => onRemove(held.id)}
                >
                  Eliminar
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    )}
  </Modal>
);

export default HeldSalesModal;