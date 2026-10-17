import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/store/AppContext";
import { useToast } from "@/components/base/Toast";
import Modal from "@/components/base/Modal";
import Button from "@/components/base/Button";
import Select from "@/components/base/Select";
import NumberInput from "@/components/base/NumberInput";
import { accountBalance } from "@/utils/accounts";
import {
  employeeFullName,
  employeePendingAdvancesTotal,
  periodicityLabel,
} from "@/utils/employees";
import { toCurrency, toDateKey } from "@/utils/format";

interface EmployeeAdvanceModalProps {
  open: boolean;
  employeeId: string | null;
  onClose: () => void;
}

const toLocalInput = (date: Date): string =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

const EmployeeAdvanceModal = ({
  open,
  employeeId,
  onClose,
}: EmployeeAdvanceModalProps) => {
  const { state, currentUser, registerEmployeeAdvance } = useApp();
  const { notify } = useToast();

  const activeEmployees = useMemo(
    () => state.employees.filter((e) => e.active),
    [state.employees]
  );
  const activeAccounts = useMemo(
    () => state.accounts.filter((a) => a.active),
    [state.accounts]
  );

  const [employeeSel, setEmployeeSel] = useState("");
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(toLocalInput(new Date()));
  const [accountId, setAccountId] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmedDuplicate, setConfirmedDuplicate] = useState(false);

  useEffect(() => {
    if (!open) return;
    const fallback = employeeId ?? activeEmployees[0]?.id ?? "";
    setEmployeeSel(fallback);
    setAmount(0);
    setDate(toLocalInput(new Date()));
    setAccountId(activeAccounts[0]?.id ?? "");
    setNote("");
    setError("");
    setSubmitting(false);
    setConfirmedDuplicate(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, employeeId]);

  const employee = state.employees.find((e) => e.id === employeeSel) ?? null;
  const account = state.accounts.find((a) => a.id === accountId) ?? null;
  const available = account ? accountBalance(account, state.financeMovements) : 0;
  const insufficient = account ? amount > available + 0.01 : false;
  const pendingTotal = employee
    ? employeePendingAdvancesTotal(employee.id, state.employeeAdvances)
    : 0;

  // Evita cargar dos veces el mismo adelanto (mismo empleado, importe y dia).
  const duplicate = useMemo(() => {
    if (!employee || amount <= 0 || !date) return null;
    const day = toDateKey(new Date(date));
    return (
      state.employeeAdvances.find(
        (a) =>
          a.employeeId === employee.id &&
          !a.settledPaymentId &&
          Math.abs(a.amount - amount) < 0.01 &&
          toDateKey(new Date(a.date)) === day
      ) ?? null
    );
  }, [employee, amount, date, state.employeeAdvances]);

  const toggleConfirmed = () => setConfirmedDuplicate((v) => !v);

  const submit = () => {
    if (!employee || !currentUser) return;
    if (amount <= 0) {
      setError("Ingresa un importe mayor a cero.");
      return;
    }
    if (!accountId) {
      setError("Selecciona la cuenta de Tesoreria de origen.");
      return;
    }
    if (duplicate && !confirmedDuplicate) {
      setError(
        "Ya existe un adelanto igual para este empleado en la misma fecha. Confirma para registrarlo igual."
      );
      return;
    }
    setSubmitting(true);
    const result = registerEmployeeAdvance({
      employeeId: employee.id,
      amount,
      date: new Date(date).toISOString(),
      accountId,
      note,
      user: currentUser,
    });
    if (result.error || !result.advance) {
      setSubmitting(false);
      setError(result.error ?? "No se pudo registrar el adelanto.");
      return;
    }
    notify(
      "Adelanto registrado",
      "success",
      `${toCurrency(result.advance.amount)} · ${result.advance.accountName}`
    );
    setSubmitting(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Registrar adelanto de sueldo"
      subtitle={
        employee
          ? `${employeeFullName(employee)} · ${
              employee.periodicity === "semanal" ? "Pago semanal" : "Pago mensual"
            }`
          : "Selecciona un empleado"
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            icon="ri-wallet-3-line"
            onClick={submit}
            disabled={submitting || !employee || (Boolean(duplicate) && !confirmedDuplicate)}
          >
            Confirmar adelanto
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
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-foreground-600 mb-1">
            Empleado *
          </label>
          <Select
            value={employeeSel}
            onChange={setEmployeeSel}
            options={activeEmployees.map((e) => ({
              value: e.id,
              label: employeeFullName(e),
              hint: periodicityLabel(e.periodicity),
            }))}
          />
          <p className="mt-1 text-[11px] text-foreground-400">
            Solo empleados activos. Los inactivos conservan su historial.
          </p>
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground-600 mb-1">
            Importe del adelanto *
          </label>
          <NumberInput value={amount} onChange={setAmount} suffix="$" min={0} />
          <p className="mt-1 text-[11px] text-foreground-400">
            Adelantos pendientes del empleado: {toCurrency(pendingTotal)}.
          </p>
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
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-foreground-600 mb-1">
            Cuenta de Tesoreria de origen *
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
          <p className="mt-1 text-[11px] text-foreground-400">
            El egreso afecta unicamente esta cuenta.
          </p>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-foreground-600 mb-1">
            Observacion (opcional)
          </label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={160}
            placeholder="Ej: adelanto solicitado por el empleado..."
            className="w-full h-9 px-3 rounded-md border border-background-300 bg-background-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>
      </div>

      {duplicate ? (
        <div className="mt-4 rounded-lg border border-warning/40 bg-warning-soft px-3 py-2.5">
          <p className="flex items-start gap-1.5 text-sm text-warning font-medium">
            <i className="ri-alert-line mt-0.5" />
            Posible adelanto duplicado
          </p>
          <ul className="mt-1.5 space-y-0.5 text-[11px] text-foreground-600">
            <li className="flex items-center justify-between gap-3">
              <span>
                {duplicate.employeeName} · mismo importe ·{" "}
                {toDateKey(new Date(duplicate.date))}
              </span>
              <span className="tabular-nums whitespace-nowrap">
                {toCurrency(duplicate.amount)}
              </span>
            </li>
          </ul>
          <label className="mt-2 flex items-start gap-2 text-[11px] text-foreground-700 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmedDuplicate}
              onChange={toggleConfirmed}
              className="w-4 h-4 mt-0.5 accent-primary-500"
            />
            Confirmo que se trata de otro adelanto y quiero registrarlo igual.
          </label>
        </div>
      ) : null}

      <div className="mt-4 rounded-lg border border-secondary-200 bg-secondary-100/70 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-secondary-900 mb-2">
          Previsualizacion del adelanto
        </p>
        <dl className="space-y-1 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-foreground-600">Importe entregado</dt>
            <dd className="tabular-nums font-semibold text-foreground-950">
              {toCurrency(amount)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-foreground-600">Cuenta de origen</dt>
            <dd className="text-foreground-900">{account?.name ?? "—"}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-foreground-600">Saldo disponible</dt>
            <dd className="tabular-nums text-foreground-900">
              {account ? toCurrency(available) : "—"}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-secondary-200 pt-1.5">
            <dt className="text-foreground-700">Queda pendiente de descuento</dt>
            <dd className="tabular-nums text-warning font-medium">
              {toCurrency(amount)}
            </dd>
          </div>
        </dl>
        {insufficient ? (
          <p className="mt-2 flex items-start gap-1.5 text-[11px] text-warning">
            <i className="ri-error-warning-line mt-0.5" />
            El importe supera el saldo disponible. El egreso se registra igual y
            la cuenta queda en negativo.
          </p>
        ) : null}
        <p className="mt-2 text-[11px] text-foreground-500 flex items-start gap-1.5">
          <i className="ri-information-line mt-0.5" />
          Se registra un egreso real en la cuenta elegida. El descuento en el
          sueldo es solo financiero: el dinero no vuelve a salir de Tesoreria.
        </p>
      </div>
    </Modal>
  );
};

export default EmployeeAdvanceModal;