import type {
  Account,
  Channel,
  FinanceMovement,
  PaymentMethod,
} from "@/types";
import { round2, toDateKey } from "@/utils/format";

/** Saldo actual de una cuenta: saldo inicial + ingresos - egresos historicos. */
export const accountBalance = (
  account: Account,
  movements: FinanceMovement[]
): number => {
  const net = movements
    .filter((m) => m.accountId === account.id)
    .reduce((acc, m) => acc + (m.type === "ingreso" ? m.amount : -m.amount), 0);
  return round2(account.initialBalance + net);
};

/** Movimientos de una cuenta, mas recientes primero. */
export const accountMovements = (
  accountId: string,
  movements: FinanceMovement[]
): FinanceMovement[] =>
  movements
    .filter((m) => m.accountId === accountId)
    .sort((a, b) => b.date.localeCompare(a.date));

/** Ingresos de hoy (fecha local) de una cuenta. No incluye aperturas. */
export const accountIncomeToday = (
  accountId: string,
  movements: FinanceMovement[],
  dateKey: string = toDateKey(new Date())
): number =>
  round2(
    movements
      .filter(
        (m) =>
          m.accountId === accountId &&
          m.type === "ingreso" &&
          toDateKey(new Date(m.date)) === dateKey
      )
      .reduce((acc, m) => acc + m.amount, 0)
  );

/** Egresos/reversiones de hoy (fecha local) de una cuenta. */
export const accountOutflowToday = (
  accountId: string,
  movements: FinanceMovement[],
  dateKey: string = toDateKey(new Date())
): number =>
  round2(
    movements
      .filter(
        (m) =>
          m.accountId === accountId &&
          m.type === "egreso" &&
          toDateKey(new Date(m.date)) === dateKey
      )
      .reduce((acc, m) => acc + m.amount, 0)
  );

export interface AccountLedgerRow extends FinanceMovement {
  balanceAfter: number;
}

/** Movimientos de una cuenta con el saldo resultante de cada uno (mas nuevos primero). */
export const accountLedger = (
  account: Account,
  movements: FinanceMovement[]
): AccountLedgerRow[] => {
  const own = movements
    .filter((m) => m.accountId === account.id)
    .sort((a, b) => a.date.localeCompare(b.date));
  let running = account.initialBalance;
  const rows = own.map((m) => {
    running = round2(
      running + (m.type === "ingreso" ? m.amount : -m.amount)
    );
    return { ...m, balanceAfter: running };
  });
  return rows.reverse();
};

/** Cuentas habilitadas para un medio de pago y un tipo de venta. */
export const accountsForMethod = (
  accounts: Account[],
  methodId: string,
  channel: Channel
): Account[] =>
  accounts.filter(
    (a) =>
      a.active &&
      a.methodId === methodId &&
      (channel === "retail" ? a.retail : a.wholesale)
  );

/** Medios de pago activos. */
export const activePaymentMethods = (
  methods: PaymentMethod[]
): PaymentMethod[] => methods.filter((m) => m.active);

export const methodName = (
  methods: PaymentMethod[],
  methodId: string
): string => methods.find((m) => m.id === methodId)?.name ?? "—";