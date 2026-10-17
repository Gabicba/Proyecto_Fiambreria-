import { createPortal } from "react-dom";
import type { Sale } from "@/types";
import Modal from "@/components/base/Modal";
import Button from "@/components/base/Button";
import { toDateTimeLabel } from "@/utils/format";
import ReceiptDocument from "./ReceiptDocument";

interface ReceiptModalProps {
  open: boolean;
  onClose: () => void;
  sale: Sale | null;
}

const ReceiptModal = ({ open, onClose, sale }: ReceiptModalProps) => {
  if (!open || !sale) return null;

  const handlePrint = () => window.print();

  const printLayer =
    typeof document !== "undefined"
      ? createPortal(
          <div className="receipt-print-portal">
            <ReceiptDocument sale={sale} />
          </div>,
          document.body
        )
      : null;

  return (
    <>
      {printLayer}
      <Modal
        open={open}
        onClose={onClose}
        title="Ticket de venta"
        subtitle={`Venta #${sale.number} · ${toDateTimeLabel(sale.date)}`}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>
              Cerrar
            </Button>
            <Button
              variant="primary"
              icon="ri-printer-line"
              onClick={handlePrint}
            >
              Imprimir ticket
            </Button>
          </>
        }
      >
        <div className="bg-background-100 rounded-md p-3 overflow-x-auto">
          <div className="mx-auto w-[80mm] bg-white rounded border border-background-200 overflow-hidden">
            <ReceiptDocument sale={sale} />
          </div>
        </div>
        <p className="mt-3 text-xs text-foreground-400 flex items-center gap-1.5">
          <i className="ri-information-line" />
          Se imprime en formato ticket (80 mm). Documento sin validez fiscal.
        </p>
      </Modal>
    </>
  );
};

export default ReceiptModal;