import { useEffect, useState } from "react";
import type { Sale } from "@/types";
import Modal from "@/components/base/Modal";
import Button from "@/components/base/Button";
import { toCurrency } from "@/utils/format";

interface AnnulSaleModalProps {
  open: boolean;
  onClose: () => void;
  sale: Sale | null;
  onConfirm: (reason: string) => void;
}

const reasons = [
  "Cliente canceló compra",
  "Cobro incorrecto",
  "Venta duplicada",
  "Error de carga",
];

const AnnulSaleModal = ({
  open,
  onClose,
  sale,
  onConfirm,
}: AnnulSaleModalProps) => {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setReason("");
      setError("");
    }
  }, [open]);

  if (!sale) return null;

  const submit = () => {
    if (!reason.trim()) {
      setError("El motivo de anulación es obligatorio para continuar.");
      return;
    }
    onConfirm(reason.trim());
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Anular Venta #${sale.number}`}
      subtitle="Esta acción es irreversible y genera movimientos inversos trazables."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="danger" icon="ri-arrow-go-back-line" onClick={submit}>
            Confirmar anulación
          </Button>
        </>
      }
    >
      <div className="rounded-md border border-danger/40 bg-danger-soft px-4 py-3">
        <p className="text-sm font-semibold text-danger flex items-center gap-2">
          <i className="ri-error-warning-line" />
          Vas a anular una venta ya confirmada
        </p>
        <p className="text-xs text-foreground-700 mt-1">
          Se reintegrará el stock descontado y se registrarán contramovimientos
          de dinero en cada cuenta por el total de{" "}
          <strong className="tabular-nums">{toCurrency(sale.total)}</strong>. No
          se borra el movimiento original: queda el ingreso y su reversión.
        </p>
      </div>

      <ul className="mt-3 border border-background-200 rounded-md divide-y divide-background-100">
        {sale.payments.map((p) => (
          <li key={p.id} className="px-3 py-2 flex items-center justify-between">
            <span className="text-sm text-foreground-700">
              {p.methodName}
              <span className="text-foreground-400"> · {p.accountName}</span>
            </span>
            <span className="text-sm font-medium tabular-nums text-danger">
              − {toCurrency(p.amount)}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-4">
        <label className="block text-xs font-medium text-foreground-600 mb-1">
          Motivo de anulación *
        </label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {reasons.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setReason(r)}
              className={`px-2.5 py-1 rounded-full text-xs border cursor-pointer transition-colors ${
                reason === r
                  ? "bg-primary-500 text-background-50 border-primary-500"
                  : "border-background-300 text-foreground-600 hover:bg-background-100"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          maxLength={200}
          placeholder="Describí el motivo de la anulación."
          className="w-full px-3 py-2 rounded-md border border-background-300 bg-background-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
        />
        {error ? (
          <p className="mt-1.5 text-xs text-danger flex items-center gap-1">
            <i className="ri-error-warning-line" /> {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
};

export default AnnulSaleModal;