import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/store/AppContext";
import { useToast } from "@/components/base/Toast";
import Modal from "@/components/base/Modal";
import Button from "@/components/base/Button";
import Select from "@/components/base/Select";
import NumberInput from "@/components/base/NumberInput";
import {
  employeeFullName,
  employeePendingAdvances,
  employeePendingWithdrawals,
  periodicityLabel,
  salaryPaymentsInPeriod,
  suggestedPeriod,
} from "@/utils/employees";
import { accountBalance } from "@/utils/accounts";
import { round2, toCurrency, toDateTimeLabel } from "@/utils/format";

interface EmployeeSalaryPaymentModalProps {
  open: boolean;
  employeeId: string | null;
  onClose: () => void;
}

const toLocalInput = (date: Date): string =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

const EmployeeSalaryPaymentModal = ({
  open,
  employeeId,
  onClose,
}: EmployeeSalaryPaymentModalProps) => {
  const { state, currentUser, registerEmployeeSalaryPayment } = useApp();
  const { notify } = useToast();

  const employee = state.employees.find((e) => e.id === employeeId) ?? null;

  const pending = useMemo(
    () =>
      employee ? employeePendingWithdrawals(employee.id, state.employeeWithdrawals) : [],
    [employee, state.employeeWithdrawals]
  );

  const pendingAdvances = useMemo(
    () =>
      employee ? employeePendingAdvances(employee.id, state.employeeAdvances) : [],
    [employee, state.employeeAdvances]
  );

  const activeAccounts = useMemo(
    () => state.accounts.filter((a) => a.active),
    [state.accounts]
  );

  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [gross, setGross] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedAdvanceIds, setSelectedAdvanceIds] = useState<string[]>([]);
  const [date, setDate] = useState(toLocalInput(new Date()));
  const [accountId, setAccountId] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmedDuplicate, setConfirmedDuplicate] = useState(false);

  useEffect(() => {
    if (!open || !employee) return;
    const period = suggestedPeriod(employee.periodicity);
    setPeriodFrom(period.from);
    setPeriodTo(period.to);
    setGross(employee.referenceSalary);
    setSelectedIds(
      employeePendingWithdrawals(employee.id, state.employeeWithdrawals).map(
        (w) => w.id
      )
    );
    setSelectedAdvanceIds(
      employeePendingAdvances(employee.id, state.employeeAdvances).map(
        (a) => a.id
      )
    );
    setDate(toLocalInput(new Date()));
    setAccountId(activeAccounts[0]?.id ?? "");
    setNote("");
    setError("");
    setSubmitting(false);
    setConfirmedDuplicate(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, employeeId]);

  // Aviso de duplicado: ya existe un pago del empleado en ese periodo.
  const duplicates = useMemo(
    () =>
      employee
        ? salaryPaymentsInPeriod(
            employee.id,
            periodFrom,
            periodTo,
            state.employeePayments
          )
        : [],
    [employee, periodFrom, periodTo, state.employeePayments]
  );
  const hasDuplicate = duplicates.length > 0;

  const selected = pending.filter((w) => selectedIds.includes(w.id));
  const discountsTotal = round2(selected.reduce((a, w) => a + w.total, 0));
  const selectedAdvances = pendingAdvances.filter((a) =>
    selectedAdvanceIds.includes(a.id)
  );
  const advanceTotal = round2(
    selectedAdvances.reduce((a, x) => a + x.amount, 0)
  );
  const net = round2(Math.max(0, gross - discountsTotal - advanceTotal));

  const account = state.accounts.find((a) => a.id === accountId) ?? null;
  const available = account ? accountBalance(account, state.financeMovements) : 0;
  const insufficient = account ? net > available + 0.01 : false;

  const toggle = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const toggleAdvance = (id: string) =>
    setSelectedAdvanceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const submit = () => {
    if (!employee || !currentUser) return;
    if (gross <= 0) {
      setError("Ingresa un importe bruto mayor a cero.");
      return;
    }
    if (!accountId) {
      setError("Selecciona una cuenta de Tesoreria.");
      return;
    }
    if (hasDuplicate && !confirmedDuplicate) {
      setError(
        "Ya existe un pago para este empleado en ese periodo. Confirma que queres registrarlo igual."
      );
      return;
    }
    setSubmitting(true);
    const result = registerEmployeeSalaryPayment({
      employeeId: employee.id,
      periodFrom,
      periodTo,
      grossAmount: gross,
      withdrawalIds: selectedIds,
      advanceIds: selectedAdvanceIds,
      date: new Date(date).toISOString(),
      accountId,
      note,
      user: currentUser,
      confirmDuplicate: confirmedDuplicate,
    });
    if (result.error || !result.payment) {
      setSubmitting(false);
      setError(result.error ?? "No se pudo registrar el pago.");
      return;
    }
    notify(
      "Pago de sueldo registrado",
      "success",
      `${toCurrency(result.payment.netAmount)} · ${result.payment.accountName}`
    );
    setSubmitting(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Registrar pago de sueldo"
      subtitle={
        employee
          ? `${employeeFullName(employee)} · ${periodicityLabel(employee.periodicity)}`
          : "Selecciona un empleado"
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            icon="ri-hand-coin-line"
            onClick={submit}
            disabled={submitting || !employee || (hasDuplicate && !confirmedDuplicate)}
          >
            {hasDuplicate ? "Confirmar pago adicional" : "Confirmar pago"}
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
            Periodo desde *
          </label>
          <input
            type="date"
            value={periodFrom}
            onChange={(e) => setPeriodFrom(e.target.value)}
            className="w-full h-9 px-3 rounded-md border border-background-300 bg-background-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground-600 mb-1">
            Periodo hasta *
          </label>
          <input
            type="date"
            value={periodTo}
            onChange={(e) => setPeriodTo(e.target.value)}
            className="w-full h-9 px-3 rounded-md border border-background-300 bg-background-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground-600 mb-1">
            Importe bruto *
          </label>
          <NumberInput value={gross} onChange={setGross} suffix="$" min={0} />
          <p className="mt-1 text-[11px] text-foreground-400">
            Referencia del empleado: {toCurrency(employee?.referenceSalary ?? 0)}.
          </p>
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground-600 mb-1">
            Fecha y hora del pago *
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
            Cuenta de Tesoreria *
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
      </div>

      {hasDuplicate ? (
        <div className="mt-4 rounded-lg border border-warning/40 bg-warning-soft px-3 py-2.5">
          <p className="flex items-start gap-1.5 text-sm text-warning font-medium">
            <i className="ri-alert-line mt-0.5" />
            Ya existe un pago registrado para este periodo
          </p>
          <ul className="mt-1.5 space-y-0.5 text-[11px] text-foreground-600">
            {duplicates.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3">
                <span>
                  {p.periodFrom} al {p.periodTo} · {toDateTimeLabel(p.date)}
                </span>
                <span className="tabular-nums whitespace-nowrap">
                  {toCurrency(p.netAmount)}
                </span>
              </li>
            ))}
          </ul>
          <label className="mt-2 flex items-start gap-2 text-[11px] text-foreground-700 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmedDuplicate}
              onChange={(e) => setConfirmedDuplicate(e.target.checked)}
              className="w-4 h-4 mt-0.5 accent-primary-500"
            />
            Confirmo que se trata de un pago adicional y quiero registrarlo igual.
          </label>
        </div>
      ) : null}

      <div className="mt-4 rounded-lg border border-background-200 bg-background-100/60 p-3">
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-sm font-medium text-foreground-900">
            Retiros pendientes a descontar
          </p>
          {pending.length > 0 ? (
            <button
              type="button"
              onClick={() =>
                setSelectedIds(
                  selectedIds.length === pending.length
                    ? []
                    : pending.map((w) => w.id)
                )
              }
              className="text-xs text-primary-700 hover:underline cursor-pointer"
            >
              {selectedIds.length === pending.length
                ? "Quitar todos"
                : "Seleccionar todos"}
            </button>
          ) : null}
        </div>
        {pending.length === 0 ? (
          <p className="text-xs text-foreground-500">
            No hay retiros pendientes de descuento para este empleado.
          </p>
        ) : (
          <div className="space-y-1.5">
            {pending.map((w) => (
              <label
                key={w.id}
                className="flex items-center gap-3 rounded-md border border-background-200 bg-background-50 px-3 py-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(w.id)}
                  onChange={() => toggle(w.id)}
                  className="w-4 h-4 accent-primary-500"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-foreground-900">
                    {toDateTimeLabel(w.date)}
                  </span>
                  <span className="block text-[11px] text-foreground-400 truncate">
                    {w.items.map((i) => i.productName).join(", ")}
                  </span>
                </span>
                <span className="text-sm tabular-nums text-foreground-800 whitespace-nowrap">
                  {toCurrency(w.total)}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 rounded-lg border border-background-200 bg-background-100/60 p-3">
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-sm font-medium text-foreground-900">
            Adelantos pendientes a descontar
          </p>
          {pendingAdvances.length > 0 ? (
            <button
              type="button"
              onClick={() =>
                setSelectedAdvanceIds(
                  selectedAdvanceIds.length === pendingAdvances.length
                    ? []
                    : pendingAdvances.map((a) => a.id)
                )
              }
              className="text-xs text-primary-700 hover:underline cursor-pointer"
            >
              {selectedAdvanceIds.length === pendingAdvances.length
                ? "Quitar todos"
                : "Seleccionar todos"}
            </button>
          ) : null}
        </div>
        {pendingAdvances.length === 0 ? (
          <p className="text-xs text-foreground-500">
            No hay adelantos pendientes de descuento para este empleado.
          </p>
        ) : (
          <div className="space-y-1.5">
            {pendingAdvances.map((a) => (
              <label
                key={a.id}
                className="flex items-center gap-3 rounded-md border border-background-200 bg-background-50 px-3 py-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedAdvanceIds.includes(a.id)}
                  onChange={() => toggleAdvance(a.id)}
                  className="w-4 h-4 accent-primary-500"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-foreground-900">
                    {toDateTimeLabel(a.date)}
                  </span>
                  <span className="block text-[11px] text-foreground-400 truncate">
                    {a.accountName}
                    {a.note ? ` · ${a.note}` : ""}
                  </span>
                </span>
                <span className="text-sm tabular-nums text-foreground-800 whitespace-nowrap">
                  {toCurrency(a.amount)}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 rounded-lg border border-secondary-200 bg-secondary-100/70 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-secondary-900 mb-2">
          Previsualizacion del pago
        </p>
        <dl className="space-y-1 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-foreground-600">Importe bruto</dt>
            <dd className="tabular-nums text-foreground-950">{toCurrency(gross)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-foreground-600">
              Mercaderia retirada ({selected.length} retiro(s))
            </dt>
            <dd className="tabular-nums text-danger">−{toCurrency(discountsTotal)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-foreground-600">
              Adelantos aplicados ({selectedAdvances.length})
            </dt>
            <dd className="tabular-nums text-danger">−{toCurrency(advanceTotal)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-secondary-200 pt-1.5">
            <dt className="font-semibold text-foreground-900">Neto a pagar</dt>
            <dd className="text-lg font-semibold tabular-nums text-foreground-950">
              {toCurrency(net)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-foreground-600">Cuenta</dt>
            <dd className="text-foreground-900">{account?.name ?? "—"}</dd>
          </div>
        </dl>
        {insufficient ? (
          <p className="mt-2 flex items-start gap-1.5 text-[11px] text-warning">
            <i className="ri-error-warning-line mt-0.5" />
            El neto supera el saldo disponible ({toCurrency(available)}). El pago
            se registra igual y la cuenta queda en negativo.
          </p>
        ) : null}
        <p className="mt-2 text-[11px] text-foreground-500 flex items-start gap-1.5">
          <i className="ri-information-line mt-0.5" />
          Al confirmar se registra un unico egreso por el neto en la cuenta
          elegida. Los retiros y adelantos seleccionados quedan marcados como
          descontados y no se vuelven a descontar.
        </p>
      </div>

      <div className="mt-3">
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
    </Modal>
  );
};

export default EmployeeSalaryPaymentModal;