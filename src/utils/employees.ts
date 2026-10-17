import type {
  Employee,
  EmployeeAdvance,
  EmployeeSalaryPayment,
  EmployeeWithdrawal,
} from "@/types";
import { round2 } from "@/utils/format";

export const employeeFullName = (employee: Employee): string =>
  `${employee.firstName} ${employee.lastName}`.trim();

export const employeeInitials = (employee: Employee): string => {
  const first = employee.firstName.trim().charAt(0);
  const last = employee.lastName.trim().charAt(0);
  return `${first}${last}`.toUpperCase();
};

export const periodicityLabel = (
  periodicity: Employee["periodicity"]
): string => (periodicity === "semanal" ? "Pago semanal" : "Pago mensual");

export const employeeTenureLabel = (startDate: string): string => {
  if (!startDate) return "—";
  const start = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) return "—";
  const now = new Date();
  let months =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months -= 1;
  if (months < 0) return "Recien ingresa";
  if (months < 1) return "Menos de 1 mes";
  if (months < 12) return `${months} mes(es)`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest === 0 ? `${years} anio(s)` : `${years} anio(s) y ${rest} mes(es)`;
};

export const employeePendingWithdrawals = (
  employeeId: string,
  withdrawals: EmployeeWithdrawal[]
): EmployeeWithdrawal[] =>
  withdrawals
    .filter((w) => w.employeeId === employeeId && !w.settledPaymentId)
    .sort((a, b) => b.date.localeCompare(a.date));

export const employeePendingTotal = (
  employeeId: string,
  withdrawals: EmployeeWithdrawal[]
): number =>
  round2(
    employeePendingWithdrawals(employeeId, withdrawals).reduce(
      (acc, w) => acc + w.total,
      0
    )
  );

export const employeeWithdrawals = (
  employeeId: string,
  withdrawals: EmployeeWithdrawal[]
): EmployeeWithdrawal[] =>
  withdrawals
    .filter((w) => w.employeeId === employeeId)
    .sort((a, b) => b.date.localeCompare(a.date));

export const employeeAdvances = (
  employeeId: string,
  advances: EmployeeAdvance[]
): EmployeeAdvance[] =>
  advances
    .filter((a) => a.employeeId === employeeId)
    .sort((a, b) => b.date.localeCompare(a.date));

export const employeePendingAdvances = (
  employeeId: string,
  advances: EmployeeAdvance[]
): EmployeeAdvance[] =>
  employeeAdvances(employeeId, advances).filter((a) => !a.settledPaymentId);

export const employeePendingAdvancesTotal = (
  employeeId: string,
  advances: EmployeeAdvance[]
): number =>
  round2(
    employeePendingAdvances(employeeId, advances).reduce(
      (acc, a) => acc + a.amount,
      0
    )
  );

export const employeePayments = (
  employeeId: string,
  payments: EmployeeSalaryPayment[]
): EmployeeSalaryPayment[] =>
  payments
    .filter((p) => p.employeeId === employeeId)
    .sort((a, b) => b.date.localeCompare(a.date));

export const employeeLastPayment = (
  employeeId: string,
  payments: EmployeeSalaryPayment[]
): EmployeeSalaryPayment | null => employeePayments(employeeId, payments)[0] ?? null;

export interface EmployeeFinanceSummary {
  pendingTotal: number;
  pendingCount: number;
  withdrawnTotal: number;
  paidTotal: number;
  paymentCount: number;
  advancePendingTotal: number;
  advancePendingCount: number;
  advanceTotal: number;
}

export const employeeSummary = (
  employeeId: string,
  withdrawals: EmployeeWithdrawal[],
  payments: EmployeeSalaryPayment[],
  advances: EmployeeAdvance[] = []
): EmployeeFinanceSummary => {
  const own = employeeWithdrawals(employeeId, withdrawals);
  const ownPayments = employeePayments(employeeId, payments);
  const ownAdvances = employeeAdvances(employeeId, advances);
  return {
    pendingTotal: round2(
      own.filter((w) => !w.settledPaymentId).reduce((a, w) => a + w.total, 0)
    ),
    pendingCount: own.filter((w) => !w.settledPaymentId).length,
    withdrawnTotal: round2(own.reduce((a, w) => a + w.total, 0)),
    paidTotal: round2(ownPayments.reduce((a, p) => a + p.netAmount, 0)),
    paymentCount: ownPayments.length,
    advancePendingTotal: round2(
      ownAdvances
        .filter((a) => !a.settledPaymentId)
        .reduce((acc, a) => acc + a.amount, 0)
    ),
    advancePendingCount: ownAdvances.filter((a) => !a.settledPaymentId).length,
    advanceTotal: round2(ownAdvances.reduce((acc, a) => acc + a.amount, 0)),
  };
};

export type EmployeeMovementKind = "pago" | "retiro" | "adelanto";

export interface EmployeeMovementRow {
  id: string;
  kind: EmployeeMovementKind;
  date: string;
  amount: number;
  userName: string;
  label: string;
  state: string;
  stateTone: "success" | "warning" | "neutral" | "secondary";
  paymentId?: string;
  withdrawalId?: string;
  advanceId?: string;
}

/** Historial unificado de la ficha: pagos de sueldo + retiros de mercaderia. */
export const employeeMovements = (
  employeeId: string,
  withdrawals: EmployeeWithdrawal[],
  payments: EmployeeSalaryPayment[],
  advances: EmployeeAdvance[] = []
): EmployeeMovementRow[] => {
  const rows: EmployeeMovementRow[] = [];
  employeeAdvances(employeeId, advances).forEach((a) => {
    rows.push({
      id: a.id,
      kind: "adelanto",
      date: a.date,
      amount: a.amount,
      userName: a.userName,
      label: `Adelanto de sueldo · ${a.accountName}`,
      state: a.settledPaymentId ? "Descontado" : "Pendiente de descuento",
      stateTone: a.settledPaymentId ? "secondary" : "warning",
      advanceId: a.id,
    });
  });
  employeePayments(employeeId, payments).forEach((p) => {
    rows.push({
      id: p.id,
      kind: "pago",
      date: p.date,
      amount: p.netAmount,
      userName: p.userName,
      label: `Pago de sueldo · ${p.periodFrom} al ${p.periodTo}`,
      state: "Registrado",
      stateTone: "success",
      paymentId: p.id,
    });
  });
  employeeWithdrawals(employeeId, withdrawals).forEach((w) => {
    rows.push({
      id: w.id,
      kind: "retiro",
      date: w.date,
      amount: w.total,
      userName: w.userName,
      label: `Retiro de mercaderia · ${w.items.length} producto(s)`,
      state: w.settledPaymentId ? "Descontado" : "Pendiente de descuento",
      stateTone: w.settledPaymentId ? "secondary" : "warning",
      withdrawalId: w.id,
    });
  });
  return rows.sort((a, b) => b.date.localeCompare(a.date));
};

/** Pagos registrados del empleado que se solapan con el periodo indicado. */
export const salaryPaymentsInPeriod = (
  employeeId: string,
  periodFrom: string,
  periodTo: string,
  payments: EmployeeSalaryPayment[]
): EmployeeSalaryPayment[] => {
  if (!periodFrom || !periodTo) return [];
  return payments
    .filter(
      (p) =>
        p.employeeId === employeeId &&
        p.periodFrom <= periodTo &&
        periodFrom <= p.periodTo
    )
    .sort((a, b) => b.date.localeCompare(a.date));
};

/** Periodo sugerido segun la periodicidad del empleado. */
export const suggestedPeriod = (
  periodicity: Employee["periodicity"],
  now: Date = new Date()
): { from: string; to: string } => {
  const key = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  if (periodicity === "mensual") {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: key(first), to: key(now) };
  }
  const from = new Date(now);
  from.setDate(now.getDate() - 6);
  return { from: key(from), to: key(now) };
};