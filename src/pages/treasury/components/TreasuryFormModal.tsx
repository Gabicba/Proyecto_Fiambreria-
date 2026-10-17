import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/store/AppContext";
import { useToast } from "@/components/base/Toast";
import Modal from "@/components/base/Modal";
import Button from "@/components/base/Button";
import Select from "@/components/base/Select";
import NumberInput from "@/components/base/NumberInput";
import { accountBalance } from "@/utils/accounts";
import { round2, toCurrency } from "@/utils/format";

export type TreasuryFormMode = "income" | "transfer";

interface TreasuryFormModalProps {
  open: boolean;
  mode: TreasuryFormMode;
  defaultAccountId?: string;
  onClose: () => void;
}

const toLocalInput = (date: Date): string =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

const TreasuryFormModal = ({
  open,
  mode,
  defaultAccountId,
  onClose,
}: TreasuryFormModalProps) => {
  const {
    state,
    currentUser,
    registerTreasuryIncome,
    registerTreasuryTransfer,
  } = useApp();
  const { notify } = useToast();

  const [accountId, setAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(toLocalInput(new Date()));
  const [origin, setOrigin] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const activeAccounts = useMemo(
    () => state.accounts.filter((a) => a.active),
    [state.accounts]
  );

  useEffect(() => {
    if (!open) return;
    const fallback = defaultAccountId || activeAccounts[0]?.id || "";
    setAccountId(fallback);
    setToAccountId(
      activeAccounts.find((a) => a.id !== fallback)?.id ?? ""
    );
    setAmount(0);
    setDate(toLocalInput(new Date()));
    setOrigin("");
    setNote("");
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, defaultAccountId]);

  const available = useMemo(() => {
    const account = state.accounts.find((a) => a.id === accountId);
    return account ? accountBalance(account, state.financeMovements) : 0;
  }, [accountId, state.accounts, state.financeMovements]);

  const submit = () => {
    if (!currentUser) return;
    if (!accountId) {
      setError("Selecciona una cuenta.");
      return;
    }
    if (!date) {
      setError("Indica fecha y hora.");
      return;
    }
    if (amount <= 0) {
      setError("Ingresa un importe mayor a cero.");
      return;
    }
    if (mode === "income") {
      if (!origin.trim()) {
        setError("Describe el origen del ingreso.");
        return;
      }
      const ok = registerTreasuryIncome({
        accountId,
        amount: round2(amount),
        date: new Date(date).toISOString(),
        origin,
        note,
        user: currentUser,
      });
      if (!ok) {
        setError("No se pudo registrar el ingreso.");
        return;
      }
      notify("Ingreso registrado", "success", toCurrency(amount));
      onClose();
      return;
    }

    if (!toAccountId) {
      setError("Selecciona la cuenta de destino.");
      return;
    }
    const result = registerTreasuryTransfer({
      fromAccountId: accountId,
      toAccountId,
      amount: round2(amount),
      date: new Date(date).toISOString(),
      note,
      user: currentUser,
    });
    if (!result.ok) {
      setError(result.error ?? "No se pudo registrar la transferencia.");
      return;
    }
    notify(
      "Transferencia registrada",
      "success",
      `${toCurrency(amount)} · sin cambiar el capital total`
    );
    onClose();
  };

  const isIncome = mode === "income";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isIncome ? "Registrar ingreso de dinero" : "Transferencia interna"}
      subtitle={
        isIncome
          ? "Ingreso con descripcion y origen. Impacta directo en la cuenta."
          : "Mueve dinero entre cuentas sin modificar el capital total."
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            icon={isIncome ? "ri-add-line" : "ri-arrow-left-right-line"}
            onClick={submit}
          >
            {isIncome ? "Registrar ingreso" : "Transferir"}
          </Button>
        </>
      }
    >
      {error ? (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          <i className="ri-error-warning-line" /> {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-foreground-600 mb-1">
            {isIncome ? "Cuenta destino *" : "Cuenta de origen *"}
          </label>
          <Select
            value={accountId}
            onChange={setAccountId}
            options={activeAccounts.map((a) => ({
              value: a.id,
              label: a.name,
              hint: toCurrency(accountBalance(a, state.financeMovements)),
            }))}
          />
          {!isIncome ? (
            <p className="mt-1 text-xs text-foreground-400">
              Disponible: {toCurrency(available)}
            </p>
          ) : null}
        </div>
        {!isIncome ? (
          <div>
            <label className="block text-xs font-medium text-foreground-600 mb-1">
              Cuenta destino *
            </label>
            <Select
              value={toAccountId}
              onChange={setToAccountId}
              options={activeAccounts
                .filter((a) => a.id !== accountId)
                .map((a) => ({ value: a.id, label: a.name }))}
            />
          </div>
        ) : null}
        <div>
          <label className="block text-xs font-medium text-foreground-600 mb-1">
            Importe *
          </label>
          <NumberInput value={amount} onChange={setAmount} suffix="$" autoFocus />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground-600 mb-1">
            Fecha y hora *
          </label>
          <input
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full h-9 px-3 rounded-md border border-background-300 bg-background-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>
        {isIncome ? (
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-foreground-600 mb-1">
              Descripcion / origen *
            </label>
            <input
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              maxLength={120}
              placeholder="Ej: aporte de caja, cobro de cliente, venta de equipamiento..."
              className="w-full h-9 px-3 rounded-md border border-background-300 bg-background-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
        ) : null}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-foreground-600 mb-1">
            Observacion (opcional)
          </label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={160}
            className="w-full h-9 px-3 rounded-md border border-background-300 bg-background-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>
      </div>

      {!isIncome ? (
        <p className="mt-4 text-xs text-foreground-500 flex items-start gap-1.5">
          <i className="ri-information-line mt-0.5" />
          Se registran dos movimientos vinculados: egreso en la cuenta de origen e
          ingreso en la de destino. El capital total no cambia.
        </p>
      ) : null}
    </Modal>
  );
};

export default TreasuryFormModal;