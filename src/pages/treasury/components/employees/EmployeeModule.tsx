import { useMemo, useState } from "react";
import type { Employee } from "@/types";
import { useApp } from "@/store/AppContext";
import Button from "@/components/base/Button";
import Chip from "@/components/base/Chip";
import Select from "@/components/base/Select";
import IconButton from "@/components/base/IconButton";
import EmployeeFormModal from "./EmployeeFormModal";
import EmployeeDetailModal from "./EmployeeDetailModal";
import EmployeeWithdrawalModal from "./EmployeeWithdrawalModal";
import EmployeeAdvanceModal from "./EmployeeAdvanceModal";
import EmployeeSalaryPaymentModal from "./EmployeeSalaryPaymentModal";
import {
  employeeFullName,
  employeeInitials,
  employeeLastPayment,
  employeePendingAdvancesTotal,
  employeePendingTotal,
  employeeTenureLabel,
  employeePayments,
  periodicityLabel,
} from "@/utils/employees";
import {
  normalizeText,
  round2,
  toCurrency,
  toDateKey,
  toDateTimeLabel,
} from "@/utils/format";

type StatusFilter = "all" | "active" | "inactive";

const EmployeeModule = () => {
  const { state } = useApp();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [periodicityFilter, setPeriodicityFilter] = useState("all");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [withdrawFor, setWithdrawFor] = useState<string | null>(null);
  const [advanceFor, setAdvanceFor] = useState<string | null>(null);
  const [payFor, setPayFor] = useState<string | null>(null);

  const monthKey = toDateKey(new Date()).slice(0, 7);

  const kpis = useMemo(() => {
    const activeCount = state.employees.filter((e) => e.active).length;
    const pendingTotal = round2(
      state.employeeWithdrawals
        .filter((w) => !w.settledPaymentId)
        .reduce((a, w) => a + w.total, 0)
    );
    const monthPayments = state.employeePayments.filter((p) =>
      p.date.slice(0, 7) === monthKey
    );
    const monthTotal = round2(
      monthPayments.reduce((a, p) => a + p.netAmount, 0)
    );
    const advancePendingTotal = round2(
      state.employeeAdvances
        .filter((a) => !a.settledPaymentId)
        .reduce((a, x) => a + x.amount, 0)
    );
    const lastPayment = [...state.employeePayments].sort((a, b) =>
      b.date.localeCompare(a.date)
    )[0];
    return {
      activeCount,
      totalCount: state.employees.length,
      pendingTotal,
      pendingCount: state.employeeWithdrawals.filter((w) => !w.settledPaymentId)
        .length,
      advancePendingTotal,
      advancePendingCount: state.employeeAdvances.filter(
        (a) => !a.settledPaymentId
      ).length,
      monthTotal,
      monthCount: monthPayments.length,
      lastPayment,
    };
  }, [
    state.employees,
    state.employeeWithdrawals,
    state.employeeAdvances,
    state.employeePayments,
    monthKey,
  ]);

  const filtered = useMemo(() => {
    const q = normalizeText(query).trim();
    return state.employees
      .filter((e) => {
        if (statusFilter === "active" && !e.active) return false;
        if (statusFilter === "inactive" && e.active) return false;
        if (periodicityFilter !== "all" && e.periodicity !== periodicityFilter)
          return false;
        if (q) {
          const hay = normalizeText(
            `${e.firstName} ${e.lastName} ${e.phone} ${e.notes}`
          );
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1;
        return employeeFullName(a).localeCompare(employeeFullName(b));
      });
  }, [state.employees, query, statusFilter, periodicityFilter]);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (employee: Employee) => {
    setDetailId(null);
    setEditing(employee);
    setFormOpen(true);
  };

  const openWithdrawal = (employeeId: string) => {
    setDetailId(null);
    setWithdrawFor(employeeId);
  };

  const openAdvance = (employeeId: string) => {
    setDetailId(null);
    setAdvanceFor(employeeId);
  };

  const openPayment = (employeeId: string) => {
    setDetailId(null);
    setPayFor(employeeId);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-lg border border-background-200 bg-background-50 p-4">
          <p className="text-xs text-foreground-500">Empleados activos</p>
          <p className="text-2xl font-semibold text-foreground-950">
            {kpis.activeCount}
            <span className="text-sm font-normal text-foreground-400">
              {" "}
              / {kpis.totalCount}
            </span>
          </p>
          <p className="text-[11px] text-foreground-400">
            Los inactivos conservan su historial
          </p>
        </div>
        <div className="rounded-lg border border-background-200 bg-background-50 p-4">
          <p className="text-xs text-foreground-500">Descuentos pendientes</p>
          <p className="text-2xl font-semibold tabular-nums text-warning">
            {toCurrency(kpis.pendingTotal + kpis.advancePendingTotal)}
          </p>
          <p className="text-[11px] text-foreground-400">
            {kpis.pendingCount} retiro(s) · {kpis.advancePendingCount} adelanto(s)
          </p>
        </div>
        <div className="rounded-lg border border-background-200 bg-background-50 p-4">
          <p className="text-xs text-foreground-500">Sueldos del mes</p>
          <p className="text-2xl font-semibold tabular-nums text-foreground-950">
            {toCurrency(kpis.monthTotal)}
          </p>
          <p className="text-[11px] text-foreground-400">
            {kpis.monthCount} pago(s) registrados
          </p>
        </div>
        <div className="rounded-lg border border-background-200 bg-background-50 p-4">
          <p className="text-xs text-foreground-500">Ultimo pago</p>
          <p className="text-sm font-semibold text-foreground-950 mt-1">
            {kpis.lastPayment
              ? toDateTimeLabel(kpis.lastPayment.date)
              : "Sin pagos"}
          </p>
          <p className="text-[11px] text-foreground-400 truncate">
            {kpis.lastPayment
              ? `${kpis.lastPayment.employeeName} · ${toCurrency(
                  kpis.lastPayment.netAmount
                )}`
              : "Todavia no se registraron sueldos"}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-accent-200 bg-accent-100/60 px-4 py-2.5 flex items-start gap-2 flex-wrap">
        <i className="ri-information-line text-accent-700 mt-0.5" />
        <p className="text-xs text-foreground-700 flex-1">
          <strong className="font-semibold">Modulo en prototipo.</strong> Los
          empleados, retiros, adelantos y pagos que ves son datos de demostracion
          guardados en este dispositivo. No representan liquidaciones legales ni
          persistencia en un servidor.
        </p>
        <Chip tone="accent" icon="ri-flask-line">
          Datos de demostracion
        </Chip>
      </div>

      <div className="rounded-lg border border-background-200 bg-background-50 p-4 flex flex-col lg:flex-row gap-3 lg:items-center">
        <div className="relative flex items-center flex-1">
          <i className="ri-search-line absolute left-3 text-foreground-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar empleado por nombre, telefono u observacion..."
            className="w-full h-9 pl-9 pr-3 rounded-md border border-background-300 bg-background-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 lg:w-auto">
          <Select
            className="min-w-[140px]"
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as StatusFilter)}
            options={[
              { value: "all", label: "Todos los estados" },
              { value: "active", label: "Solo activos" },
              { value: "inactive", label: "Solo inactivos" },
            ]}
          />
          <Select
            className="min-w-[140px]"
            value={periodicityFilter}
            onChange={setPeriodicityFilter}
            options={[
              { value: "all", label: "Toda periodicidad" },
              { value: "semanal", label: "Pago semanal" },
              { value: "mensual", label: "Pago mensual" },
            ]}
          />
        </div>
        <Button icon="ri-user-add-line" onClick={openNew} className="lg:ml-auto">
          Nuevo empleado
        </Button>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-sm font-semibold text-foreground-950">
          Empleados ({filtered.length})
        </h3>
        <button
          type="button"
          onClick={() => {
            setQuery("");
            setStatusFilter("all");
            setPeriodicityFilter("all");
          }}
          className="text-xs text-foreground-500 hover:text-primary-700 cursor-pointer inline-flex items-center gap-1"
        >
          <i className="ri-filter-off-line" /> Limpiar filtros
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-background-300 bg-background-50 py-14 text-center text-foreground-400">
          <i className="ri-team-line text-5xl" />
          <p className="mt-3 text-sm">No hay empleados con esos filtros.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((employee) => {
            const pendingTotal = employeePendingTotal(
              employee.id,
              state.employeeWithdrawals
            );
            const advancePendingTotal = employeePendingAdvancesTotal(
              employee.id,
              state.employeeAdvances
            );
            const lastPayment = employeeLastPayment(
              employee.id,
              state.employeePayments
            );
            const paymentCount = employeePayments(
              employee.id,
              state.employeePayments
            ).length;
            return (
              <article
                key={employee.id}
                className={`rounded-lg border bg-background-50 p-4 flex flex-col ${
                  employee.active
                    ? "border-background-200"
                    : "border-background-300 bg-background-100/50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <span
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
                        employee.active
                          ? "bg-primary-100 text-primary-700"
                          : "bg-background-200 text-foreground-500"
                      }`}
                    >
                      {employeeInitials(employee)}
                    </span>
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => setDetailId(employee.id)}
                        className="text-left cursor-pointer"
                      >
                        <h4 className="text-sm font-semibold text-foreground-950 truncate hover:text-primary-700">
                          {employeeFullName(employee)}
                        </h4>
                      </button>
                      <p className="text-[11px] text-foreground-400 truncate">
                        {employee.phone || "Sin telefono"}
                      </p>
                    </div>
                  </div>
                  <Chip tone={employee.active ? "success" : "neutral"}>
                    {employee.active ? "Activo" : "Inactivo"}
                  </Chip>
                </div>

                <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                  <Chip tone="secondary" icon="ri-calendar-schedule-line">
                    {periodicityLabel(employee.periodicity)}
                  </Chip>
                  <Chip tone="neutral">
                    {employeeTenureLabel(employee.startDate)}
                  </Chip>
                </div>

                <dl className="mt-3 space-y-1 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-foreground-500">Ultimo pago</dt>
                    <dd className="text-foreground-900 text-right">
                      {lastPayment ? (
                        <>
                          {toCurrency(lastPayment.netAmount)}
                          <span className="block text-[10px] text-foreground-400">
                            {toDateTimeLabel(lastPayment.date)}
                          </span>
                        </>
                      ) : (
                        <span className="text-foreground-400">Sin pagos</span>
                      )}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-foreground-500">Descuentos pendientes</dt>
                    <dd
                      className={`text-right tabular-nums font-medium ${
                        pendingTotal > 0 ? "text-warning" : "text-foreground-700"
                      }`}
                    >
                      {toCurrency(pendingTotal)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-foreground-500">Adelantos pendientes</dt>
                    <dd
                      className={`text-right tabular-nums font-medium ${
                        advancePendingTotal > 0
                          ? "text-accent-700"
                          : "text-foreground-700"
                      }`}
                    >
                      {toCurrency(advancePendingTotal)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-foreground-500">Sueldos registrados</dt>
                    <dd className="text-foreground-900 text-right">
                      {paymentCount}
                    </dd>
                  </div>
                </dl>

                <p className="mt-2 text-[11px] text-foreground-400 line-clamp-2">
                  {employee.notes || "Sin observaciones."}
                </p>

                <div className="mt-3 pt-3 border-t border-background-100 flex items-center gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    icon="ri-eye-line"
                    onClick={() => setDetailId(employee.id)}
                  >
                    Ver ficha
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon="ri-edit-line"
                    onClick={() => openEdit(employee)}
                  >
                    Editar
                  </Button>
                  <div className="ml-auto flex items-center gap-1">
                    <IconButton
                      icon="ri-shopping-basket-2-line"
                      label="Registrar retiro de mercaderia"
                      onClick={() => openWithdrawal(employee.id)}
                      disabled={!employee.active}
                    />
                    <IconButton
                      icon="ri-wallet-3-line"
                      label="Registrar adelanto de sueldo"
                      onClick={() => openAdvance(employee.id)}
                      disabled={!employee.active}
                    />
                    <IconButton
                      icon="ri-hand-coin-line"
                      label="Registrar pago de sueldo"
                      onClick={() => openPayment(employee.id)}
                      disabled={!employee.active}
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <EmployeeFormModal
        open={formOpen}
        employee={editing}
        onClose={() => setFormOpen(false)}
      />

      <EmployeeDetailModal
        employeeId={detailId}
        onClose={() => setDetailId(null)}
        onEdit={openEdit}
        onWithdraw={(employee) => openWithdrawal(employee.id)}
        onAdvance={(employee) => openAdvance(employee.id)}
        onPay={(employee) => openPayment(employee.id)}
      />

      <EmployeeWithdrawalModal
        open={Boolean(withdrawFor)}
        employeeId={withdrawFor}
        onClose={() => setWithdrawFor(null)}
      />

      <EmployeeAdvanceModal
        open={Boolean(advanceFor)}
        employeeId={advanceFor}
        onClose={() => setAdvanceFor(null)}
      />

      <EmployeeSalaryPaymentModal
        open={Boolean(payFor)}
        employeeId={payFor}
        onClose={() => setPayFor(null)}
      />
    </div>
  );
};

export default EmployeeModule;