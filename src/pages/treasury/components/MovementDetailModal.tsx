import type { FinanceMovement } from "@/types";
import { useApp } from "@/store/AppContext";
import Modal from "@/components/base/Modal";
import Button from "@/components/base/Button";
import Chip from "@/components/base/Chip";
import {
  movementKindLabel,
  movementKindTone,
} from "@/utils/treasury";
import { toCurrency, toDateTimeLabel } from "@/utils/format";

interface MovementDetailModalProps {
  movement: FinanceMovement | null;
  onClose: () => void;
}

const MovementDetailModal = ({ movement, onClose }: MovementDetailModalProps) => {
  const { state } = useApp();
  if (!movement) return null;

  const counter = movement.counterAccountId
    ? state.accounts.find((a) => a.id === movement.counterAccountId)
    : null;
  const sale = movement.saleId
    ? state.sales.find((s) => s.id === movement.saleId)
    : null;

  return (
    <Modal
      open
      onClose={onClose}
      title="Detalle del movimiento"
      subtitle={`${movement.accountName} · ${toDateTimeLabel(movement.date)}`}
      footer={
        <Button variant="ghost" onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <Chip tone={movementKindTone(movement)} icon="ri-arrow-left-right-line">
          {movementKindLabel(movement)}
        </Chip>
        <p
          className={`text-xl font-bold tabular-nums ${
            movement.type === "ingreso" ? "text-success" : "text-danger"
          }`}
        >
          {movement.type === "ingreso" ? "+" : "−"}
          {toCurrency(movement.amount)}
        </p>
      </div>

      <dl className="divide-y divide-background-100 text-sm">
        <div className="flex justify-between py-2 gap-3">
          <dt className="text-foreground-500">Cuenta</dt>
          <dd className="text-foreground-900 text-right">{movement.accountName}</dd>
        </div>
        {counter ? (
          <div className="flex justify-between py-2 gap-3">
            <dt className="text-foreground-500">Cuenta contraparte</dt>
            <dd className="text-foreground-900 text-right">{counter.name}</dd>
          </div>
        ) : null}
        <div className="flex justify-between py-2 gap-3">
          <dt className="text-foreground-500">Concepto</dt>
          <dd className="text-foreground-900 text-right">{movement.origin}</dd>
        </div>
        <div className="flex justify-between py-2 gap-3">
          <dt className="text-foreground-500">Fecha y hora</dt>
          <dd className="text-foreground-900 text-right">
            {toDateTimeLabel(movement.date)}
          </dd>
        </div>
        <div className="flex justify-between py-2 gap-3">
          <dt className="text-foreground-500">Usuario</dt>
          <dd className="text-foreground-900 text-right">{movement.userName}</dd>
        </div>
        {movement.note ? (
          <div className="flex justify-between py-2 gap-3">
            <dt className="text-foreground-500">Observacion</dt>
            <dd className="text-foreground-900 text-right">{movement.note}</dd>
          </div>
        ) : null}
        {sale ? (
          <div className="flex justify-between py-2 gap-3">
            <dt className="text-foreground-500">Venta asociada</dt>
            <dd className="text-foreground-900 text-right">#{sale.number}</dd>
          </div>
        ) : null}
        {movement.referenceId ? (
          <div className="flex justify-between py-2 gap-3">
            <dt className="text-foreground-500">Referencia</dt>
            <dd className="text-foreground-500 text-right text-xs">
              {movement.referenceId}
            </dd>
          </div>
        ) : null}
      </dl>
    </Modal>
  );
};

export default MovementDetailModal;