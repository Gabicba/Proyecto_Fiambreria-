import { useState } from "react";
import type { Employee } from "@/types";
import { useApp } from "@/store/AppContext";
import { useToast } from "@/components/base/Toast";
import Modal from "@/components/base/Modal";
import Button from "@/components/base/Button";
import Chip from "@/components/base/Chip";
import SalaryPaymentDetailModal from "./SalaryPaymentDetailModal";
import {
  employeeAdvances,
  employeeFullName,
  employeeInitials,
  employeeMovements,
  employeePayments,
  employeePendingAdvances,
  employeePendingAdvancesTotal,
  employeePendingTotal,
  employeePendingWithdrawals,
  employeeSummary,
  employeeTenureLabel,
  employeeWithdrawals,
  periodicityLabel,
} from "@/utils/employees";
import { toCurrency, toDateTimeLabel, toNumber } from "@/utils/format";

type Tab = "datos" | "pagos" | "retiros" | "adelantos" | "movimientos";

interface EmployeeDetailModalProps {
  employeeId: string | null;
  onClose: () => void;
  onEdit: (employee: Employee) => void;
  onWithdraw: (employee: Employee) => void;
  onAdvance: (employee: Employee) => void;
  onPay: (employee: Employee) => void;
}

const EmployeeDetailModal = ({
  employeeId,
  onClose,
  onEdit,
  onWithdraw,
  onAdvance,
  onPay,
}: EmployeeDetailModalProps) => {
  const { state, currentUser, saveEmployee } = useApp();
  const { notify } = useToast();
  const [tab, setTab] = useState<Tab>("datos");
  const [paymentId, setPaymentId] = useState<string | null>(null);

  const employee = state.employees.find((e) => e.id === employeeId) ?? null;
  if (!employee) return null;

  const summary = employeeSummary(
    employee.id,
    state.employeeWithdrawals,
    state.employeePayments,
    state.employeeAdvances
  );
  const payments = employeePayments(employee.id, state.employeePayments);
  const withdrawals = employeeWithdrawals(employee.id, state.employeeWithdrawals);
  const pending = employeePendingWithdrawals(
    employee.id,
    state.employeeWithdrawals
  );
  const advances = employeeAdvances(employee.id, state.employeeAdvances);
  const pendingAdvances = employeePendingAdvances(
    employee.id,
    state.employeeAdvances
  );
  const movements = employeeMovements(
    employee.id,
    state.employeeWithdrawals,
    state.employeePayments,
    state.employeeAdvances
  );

  const toggleActive = () => {
    saveEmployee(
      { ...employee, active: !employee.active },
      currentUser?.name ?? "Sistema"
    );
    notify(
      employee.active ? "Empleado desactivado" : "Empleado reactivado",
      "info",
      employeeFullName(employee)
    );
  };

  const tabs: { key: Tab; label: string; icon: string; count?: number }[] = [
    { key: "datos", label: "Datos", icon: "ri-user-3-line" },
    { key: "pagos", label: "Pagos de sueldo", icon: "ri-hand-coin-line", count: payments.length },
    { key: "retiros", label: "Retiros", icon: "ri-shopping-basket-line", count: withdrawals.length },
    { key: "adelantos", label: "Adelantos", icon: "ri-wallet-3-line", count: advances.length },
    { key: "movimientos", label: "Movimientos", icon: "ri-history-line", count: movements.length },
  ];

  return (
    <>
      <Modal
        open
        onClose={onClose}
        size="xl"
        title={employeeFullName(employee)}
        subtitle={`${periodicityLabel(employee.periodicity)} · Ingreso ${employee.startDate}`}
        footer={
          <>
            <Button
              variant="ghost"
              icon={employee.active ? "ri-user-unfollow-line" : "ri-user-add-line"}
              onClick={toggleActive}
            >
              {employee.active ? "Desactivar" : "Reactivar"}
            </Button>
            <Button
              variant="outline"
              icon="ri-edit-line"
              onClick={() => onEdit(employee)}
            >
              Editar
            </Button>
            <Button
              variant="outline"
              icon="ri-shopping-basket-2-line"
              onClick={() => onWithdraw(employee)}
              disabled={!employee.active}
            >
              Registrar retiro
            </Button>
            <Button
              variant="outline"
              icon="ri-wallet-3-line"
              onClick={() => onAdvance(employee)}
              disabled={!employee.active}
            >
              Registrar adelanto
            </Button>
            <Button icon="ri-hand-coin-line" onClick={() => onPay(employee)} disabled={!employee.active}>
              Registrar pago
            </Button>
          </>
        }
      >
        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-12 h-12 rounded-full bg-secondary-100 text-secondary-900 flex items-center justify-center font-semibold shrink-0">
              {employeeInitials(employee)}
            </span>
            <div className="min-w-0">
              <p className="text-sm text-foreground-600">{employee.phone || "Sin telefono"}</p>
              <p className="text-[11px] text-foreground-400">
                Antiguedad: {employeeTenureLabel(employee.startDate)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Chip tone={employee.active ? "success" : "neutral"}>
              {employee.active ? "Activo" : "Inactivo"}
            </Chip>
            <Chip tone="secondary" icon="ri-calendar-schedule-line">
              {periodicityLabel(employee.periodicity)}
            </Chip>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 mb-4">
          <div className="rounded-md border border-warning/30 bg-warning-soft px-3 py-2">
            <p className="text-[11px] text-foreground-600">Retiros pendientes</p>
            <p className="text-base font-semibold tabular-nums text-warning">
              {toCurrency(summary.pendingTotal)}
            </p>
            <p className="text-[10px] text-foreground-500">
              {summary.pendingCount} retiro(s)
            </p>
          </div>
          <div className="rounded-md border border-background-200 bg-background-100 px-3 py-2">
            <p className="text-[11px] text-foreground-600">Total retirado</p>
            <p className="text-base font-semibold tabular-nums text-foreground-950">
              {toCurrency(summary.withdrawnTotal)}
            </p>
          </div>
          <div className="rounded-md border border-accent-200 bg-accent-100/60 px-3 py-2">
            <p className="text-[11px] text-foreground-600">Adelantos pendientes</p>
            <p className="text-base font-semibold tabular-nums text-accent-700">
              {toCurrency(summary.advancePendingTotal)}
            </p>
            <p className="text-[10px] text-foreground-500">
              {summary.advancePendingCount} adelanto(s)
            </p>
          </div>
          <div className="rounded-md border border-background-200 bg-background-100 px-3 py-2">
            <p className="text-[11px] text-foreground-600">Sueldos pagados</p>
            <p className="text-base font-semibold tabular-nums text-foreground-950">
              {toCurrency(summary.paidTotal)}
            </p>
          </div>
          <div className="rounded-md border border-background-200 bg-background-100 px-3 py-2">
            <p className="text-[11px] text-foreground-600">Remuneracion ref.</p>
            <p className="text-base font-semibold tabular-nums text-foreground-950">
              {toCurrency(employee.referenceSalary)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-wrap mb-3 rounded-md border border-background-200 bg-background-50 p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer ${
                tab === t.key
                  ? "bg-primary-500 text-background-50"
                  : "text-foreground-600 hover:bg-background-100"
              }`}
            >
              <i className={t.icon} />
              {t.label}
              {typeof t.count === "number" ? (
                <span
                  className={`px-1.5 rounded-full text-[10px] ${
                    tab === t.key
                      ? "bg-background-50/20"
                      : "bg-background-200 text-foreground-600"
                  }`}
                >
                  {t.count}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {tab === "datos" ? (
          <div className="space-y-3">
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0 rounded-md border border-background-200 divide-y divide-background-100 md:divide-y-0">
              <div className="flex justify-between py-2 px-3 gap-3 md:border-b md:border-background-100">
                <dt className="text-xs text-foreground-500">Nombre y apellido</dt>
                <dd className="text-sm text-foreground-900 text-right">
                  {employeeFullName(employee)}
                </dd>
              </div>
              <div className="flex justify-between py-2 px-3 gap-3 md:border-b md:border-background-100">
                <dt className="text-xs text-foreground-500">Telefono</dt>
                <dd className="text-sm text-foreground-900 text-right">
                  {employee.phone || "—"}
                </dd>
              </div>
              <div className="flex justify-between py-2 px-3 gap-3 md:border-b md:border-background-100">
                <dt className="text-xs text-foreground-500">Fecha de ingreso</dt>
                <dd className="text-sm text-foreground-900 text-right">
                  {employee.startDate}
                </dd>
              </div>
              <div className="flex justify-between py-2 px-3 gap-3 md:border-b md:border-background-100">
                <dt className="text-xs text-foreground-500">Periodicidad</dt>
                <dd className="text-sm text-foreground-900 text-right">
                  {periodicityLabel(employee.periodicity)}
                </dd>
              </div>
              <div className="flex justify-between py-2 px-3 gap-3">
                <dt className="text-xs text-foreground-500">Remuneracion ref.</dt>
                <dd className="text-sm text-foreground-900 text-right tabular-nums">
                  {toCurrency(employee.referenceSalary)}
                </dd>
              </div>
              <div className="flex justify-between py-2 px-3 gap-3">
                <dt className="text-xs text-foreground-500">Estado</dt>
                <dd className="text-right">
                  <Chip tone={employee.active ? "success" : "neutral"}>
                    {employee.active ? "Activo" : "Inactivo"}
                  </Chip>
                </dd>
              </div>
            </dl>
            <div className="rounded-md border border-background-200 bg-background-100/60 px-3 py-2">
              <p className="text-xs text-foreground-500 mb-1">Observaciones</p>
              <p className="text-sm text-foreground-800">
                {employee.notes || "Sin observaciones registradas."}
              </p>
            </div>
            <p className="text-[11px] text-foreground-400 flex items-start gap-1.5">
              <i className="ri-information-line mt-0.5" />
              Los importes son informativos y de demostracion. No se calculan
              aportes, vacaciones ni liquidaciones legales.
            </p>
          </div>
        ) : null}

        {tab === "pagos" ? (
          payments.length === 0 ? (
            <div className="py-10 text-center text-foreground-400">
              <i className="ri-hand-coin-line text-4xl" />
              <p className="mt-2 text-sm">Todavia no hay pagos de sueldo.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-background-200">
              <table className="w-full text-sm min-w-[720px]">
                <thead>
                  <tr className="text-left text-xs text-foreground-500 border-b border-background-200 bg-background-100/60">
                    <th className="py-2 px-3 font-medium">Periodo</th>
                    <th className="py-2 px-3 font-medium text-right">Bruto</th>
                    <th className="py-2 px-3 font-medium text-right">Descuentos</th>
                    <th className="py-2 px-3 font-medium text-right">Neto</th>
                    <th className="py-2 px-3 font-medium">Cuenta</th>
                    <th className="py-2 px-3 font-medium">Fecha</th>
                    <th className="py-2 px-3 font-medium text-right">Ver</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-background-100">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-background-100/60">
                      <td className="py-2 px-3 text-foreground-800 whitespace-nowrap">
                        {p.periodFrom} al {p.periodTo}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-foreground-700">
                        {toCurrency(p.grossAmount)}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-danger">
                        −{toCurrency(p.discountsTotal)}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums font-medium text-foreground-950">
                        {toCurrency(p.netAmount)}
                      </td>
                      <td className="py-2 px-3 text-xs text-foreground-600">
                        {p.accountName}
                      </td>
                      <td className="py-2 px-3 text-xs text-foreground-500 whitespace-nowrap">
                        {toDateTimeLabel(p.date)}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setPaymentId(p.id)}
                          className="text-primary-700 hover:underline text-xs cursor-pointer whitespace-nowrap"
                        >
                          Detalle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : null}

        {tab === "retiros" ? (
          withdrawals.length === 0 ? (
            <div className="py-10 text-center text-foreground-400">
              <i className="ri-shopping-basket-line text-4xl" />
              <p className="mt-2 text-sm">No hay retiros registrados.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {withdrawals.map((w) => (
                <div
                  key={w.id}
                  className="rounded-md border border-background-200 bg-background-50"
                >
                  <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-background-100 flex-wrap">
                    <div>
                      <p className="text-sm text-foreground-900">
                        {toDateTimeLabel(w.date)}
                      </p>
                      <p className="text-[11px] text-foreground-400">
                        Registrado por {w.userName}
                        {w.note ? ` · ${w.note}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Chip
                        tone={w.settledPaymentId ? "secondary" : "warning"}
                        icon={
                          w.settledPaymentId
                            ? "ri-checkbox-circle-line"
                            : "ri-time-line"
                        }
                      >
                        {w.settledPaymentId ? "Descontado" : "Pendiente"}
                      </Chip>
                      <span className="text-sm font-medium tabular-nums text-foreground-950">
                        {toCurrency(w.total)}
                      </span>
                    </div>
                  </div>
                  <ul className="divide-y divide-background-100">
                    {w.items.map((line) => (
                      <li
                        key={line.id}
                        className="flex items-center justify-between gap-3 px-3 py-1.5 text-xs"
                      >
                        <span className="text-foreground-700">
                          {line.productName}
                          <span className="text-foreground-400">
                            {" "}
                            ·{" "}
                            {line.unit === "kg"
                              ? `${toNumber(line.quantity, 3)} kg`
                              : `${Math.round(line.quantity)} un`}{" "}
                            x {toCurrency(line.unitPrice)}
                          </span>
                        </span>
                        <span className="tabular-nums text-foreground-800 whitespace-nowrap">
                          {toCurrency(line.subtotal)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )
        ) : null}

        {tab === "adelantos" ? (
          advances.length === 0 ? (
            <div className="py-10 text-center text-foreground-400">
              <i className="ri-wallet-3-line text-4xl" />
              <p className="mt-2 text-sm">No hay adelantos registrados.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-background-200">
              <table className="w-full text-sm min-w-[720px]">
                <thead>
                  <tr className="text-left text-xs text-foreground-500 border-b border-background-200 bg-background-100/60">
                    <th className="py-2 px-3 font-medium">Fecha y hora</th>
                    <th className="py-2 px-3 font-medium text-right">Importe</th>
                    <th className="py-2 px-3 font-medium">Cuenta</th>
                    <th className="py-2 px-3 font-medium">Usuario</th>
                    <th className="py-2 px-3 font-medium">Estado</th>
                    <th className="py-2 px-3 font-medium">Observacion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-background-100">
                  {advances.map((a) => (
                    <tr key={a.id} className="hover:bg-background-100/60">
                      <td className="py-2 px-3 text-xs text-foreground-500 whitespace-nowrap">
                        {toDateTimeLabel(a.date)}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums font-medium text-foreground-950">
                        {toCurrency(a.amount)}
                      </td>
                      <td className="py-2 px-3 text-xs text-foreground-600">
                        {a.accountName}
                      </td>
                      <td className="py-2 px-3 text-xs text-foreground-600">
                        {a.userName}
                      </td>
                      <td className="py-2 px-3">
                        <Chip
                          tone={a.settledPaymentId ? "secondary" : "warning"}
                          icon={
                            a.settledPaymentId
                              ? "ri-checkbox-circle-line"
                              : "ri-time-line"
                          }
                        >
                          {a.settledPaymentId ? "Descontado" : "Pendiente"}
                        </Chip>
                      </td>
                      <td className="py-2 px-3 text-xs text-foreground-500 max-w-[220px] truncate">
                        {a.note || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : null}

        {tab === "movimientos" ? (
          movements.length === 0 ? (
            <div className="py-10 text-center text-foreground-400">
              <i className="ri-history-line text-4xl" />
              <p className="mt-2 text-sm">Sin movimientos registrados.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-background-200">
              <table className="w-full text-sm min-w-[680px]">
                <thead>
                  <tr className="text-left text-xs text-foreground-500 border-b border-background-200 bg-background-100/60">
                    <th className="py-2 px-3 font-medium">Fecha y hora</th>
                    <th className="py-2 px-3 font-medium">Movimiento</th>
                    <th className="py-2 px-3 font-medium">Usuario</th>
                    <th className="py-2 px-3 font-medium text-right">Importe</th>
                    <th className="py-2 px-3 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-background-100">
                  {movements.map((m) => (
                    <tr key={`${m.kind}-${m.id}`} className="hover:bg-background-100/60">
                      <td className="py-2 px-3 text-xs text-foreground-500 whitespace-nowrap">
                        {toDateTimeLabel(m.date)}
                      </td>
                      <td className="py-2 px-3 text-foreground-800">
                        <span className="inline-flex items-center gap-1.5">
                          <i
                            className={`text-foreground-400 ${
                              m.kind === "pago"
                                ? "ri-hand-coin-line"
                                : m.kind === "adelanto"
                                  ? "ri-wallet-3-line"
                                  : "ri-shopping-basket-line"
                            }`}
                          />
                          {m.label}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-xs text-foreground-600">
                        {m.userName}
                      </td>
                      <td
                        className={`py-2 px-3 text-right tabular-nums font-medium ${
                          m.kind === "pago" || m.kind === "adelanto"
                            ? "text-danger"
                            : "text-foreground-900"
                        }`}
                      >
                        {m.kind === "pago" || m.kind === "adelanto" ? "−" : ""}
                        {toCurrency(m.amount)}
                      </td>
                      <td className="py-2 px-3">
                        <Chip tone={m.stateTone}>{m.state}</Chip>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : null}

        <p className="mt-3 text-[11px] text-foreground-400 flex items-start gap-1.5">
          <i className="ri-time-line mt-0.5" />
          {pending.length > 0 || pendingAdvances.length > 0
            ? `${pending.length} retiro(s) por ${toCurrency(
                employeePendingTotal(employee.id, state.employeeWithdrawals)
              )} y ${pendingAdvances.length} adelanto(s) por ${toCurrency(
                employeePendingAdvancesTotal(employee.id, state.employeeAdvances)
              )} · se descuentan al registrar el proximo pago de sueldo.`
            : "Sin retiros ni adelantos pendientes de descuento."}
        </p>
      </Modal>

      <SalaryPaymentDetailModal
        paymentId={paymentId}
        onClose={() => setPaymentId(null)}
      />
    </>
  );
};

export default EmployeeDetailModal;