import { useEffect, useState } from "react";
import { useApp } from "@/store/AppContext";
import Modal from "@/components/base/Modal";
import Button from "@/components/base/Button";
import NumberInput from "@/components/base/NumberInput";
import { toCurrency, toDateTimeLabel } from "@/utils/format";

interface OpenCashModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (initialCash: number, note: string) => void;
}

const OpenCashModal = ({ open, onClose, onConfirm }: OpenCashModalProps) => {
  const { currentUser } = useApp();
  const [initialCash, setInitialCash] = useState(0);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setInitialCash(0);
      setNote("");
      setError("");
    }
  }, [open]);

  const submit = () => {
    if (!(initialCash >= 0)) {
      setError("Ingresá el efectivo inicial con el que arranca la caja.");
      return;
    }
    onConfirm(initialCash, note);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Abrir Caja del día"
      subtitle="Registrá el efectivo inicial antes de comenzar el turno."
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button icon="ri-lock-unlock-line" onClick={submit}>
            Abrir caja
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-md bg-background-100 px-3 py-2">
          <p className="text-xs text-foreground-500">Abre caja</p>
          <p className="text-sm text-foreground-800">
            {currentUser?.name ?? "—"}
          </p>
        </div>
        <div className="rounded-md bg-background-100 px-3 py-2">
          <p className="text-xs text-foreground-500">Fecha y hora</p>
          <p className="text-sm text-foreground-800">
            {toDateTimeLabel(new Date().toISOString())}
          </p>
        </div>
      </div>

      <div className="mt-3">
        <label className="block text-xs font-medium text-foreground-600 mb-1">
          Efectivo inicial *
        </label>
        <NumberInput
          value={initialCash}
          onChange={setInitialCash}
          suffix="$"
          autoFocus
        />
        <p className="mt-1.5 text-xs text-foreground-400">
          Este dinero ya existe en caja: no se cuenta como venta ni ingreso
          comercial del día. Forma parte del efectivo esperado.
        </p>
      </div>

      <div className="mt-3">
        <label className="block text-xs font-medium text-foreground-600 mb-1">
          Observación (opcional)
        </label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={120}
          placeholder="Ej: turno mañana."
          className="w-full h-9 px-3 rounded-md border border-background-300 bg-background-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
        />
      </div>

      <div className="mt-3 rounded-md border border-background-200 bg-background-50 px-3 py-2">
        <p className="text-xs text-foreground-500">Efectivo inicial a registrar</p>
        <p className="text-xl font-bold tabular-nums text-foreground-950">
          {toCurrency(initialCash)}
        </p>
      </div>

      {error ? (
        <p className="mt-2 text-xs text-danger flex items-center gap-1">
          <i className="ri-error-warning-line" /> {error}
        </p>
      ) : null}
    </Modal>
  );
};

export default OpenCashModal;