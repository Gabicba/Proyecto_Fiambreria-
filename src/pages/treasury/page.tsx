import { useMemo, useState } from "react";
import type { FinanceMovement } from "@/types";
import { useApp } from "@/store/AppContext";
import Button from "@/components/base/Button";
import Chip from "@/components/base/Chip";
import Select from "@/components/base/Select";
import TreasuryFormModal, {
  type TreasuryFormMode,
} from "./components/TreasuryFormModal";
import MovementDetailModal from "./components/MovementDetailModal";
import EmployeeModule from "./components/employees/EmployeeModule";
import {
  accountBalance,
  accountIncomeToday,
  accountOutflowToday,
  methodName,
} from "@/utils/accounts";
import {
  movementKindLabel,
  movementKindOptions,
  movementKindTone,
  movementMatchesFilter,
} from "@/utils/treasury";
import { invoiceBalance } from "@/utils/purchases";
import {
  toCurrency,
  toDateKey,
  toDateTimeLabel,
} from "@/utils/format";

type Tab = "movements" | "employees";

const accountIcon = (type: string): string => {
  if (type === "efectivo") return "ri-money-dollar-circle-line";
  if (type === "banco") return "ri-bank-line";
  if (type === "billetera") return "ri-smartphone-line";
  if (type === "tarjeta") return "ri-bank-card-line";
  return "ri-wallet-3-line";
};

const TreasuryPage = () => {
  const { state } = useApp();
  const [tab, setTab] = useState<Tab>("movements");
  const [accountFilter, setAccountFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<TreasuryFormMode>("income");
  const [detail, setDetail] = useState<FinanceMovement | null>(null);

  const today = toDateKey(new Date());

  const balances = useMemo(() => {
    const total = state.accounts.reduce(
      (a, acc) => a + accountBalance(acc, state.financeMovements),
      0
    );
    const cash = state.accounts
      .filter((a) => a.type === "efectivo")
      .reduce((a, acc) => a + accountBalance(acc, state.financeMovements), 0);
    const bank = state.accounts
      .filter((a) => a.type === "banco" || a.type === "billetera")
      .reduce((a, acc) => a + accountBalance(acc, state.financeMovements), 0);
    const debt = state.purchaseInvoices.reduce(
      (a, i) => a + invoiceBalance(i),
      0
    );
    return { total, cash, bank, debt };
  }, [state.accounts, state.financeMovements, state.purchaseInvoices]);

  const movements = useMemo(
    () =>
      [...state.financeMovements]
        .filter((m) => accountFilter === "all" || m.accountId === accountFilter)
        .filter((m) => movementMatchesFilter(m, typeFilter))
        .filter((m) => {
          const key = toDateKey(new Date(m.date));
          if (fromDate && key < fromDate) return false;
          if (toDate && key > toDate) return false;
          return true;
        })
        .sort((a, b) => b.date.localeCompare(a.date)),
    [state.financeMovements, accountFilter, typeFilter, fromDate, toDate]
  );

  const totals = useMemo(() => {
    const income = movements
      .filter((m) => m.type === "ingreso")
      .reduce((a, m) => a + m.amount, 0);
    const outflow = movements
      .filter((m) => m.type === "egreso")
      .reduce((a, m) => a + m.amount, 0);
    return { income, outflow, count: movements.length };
  }, [movements]);

  const openForm = (mode: TreasuryFormMode) => {
    setFormMode(mode);
    setFormOpen(true);
  };

  const clearFilters = () => {
    setAccountFilter("all");
    setTypeFilter("all");
    setFromDate("");
    setToDate("");
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-lg border border-background-200 bg-background-50 p-4">
          <p className="text-xs text-foreground-500">Capital total</p>
          <p className="text-2xl font-semibold tabular-nums text-foreground-950">
            {toCurrency(balances.total)}
          </p>
          <p className="text-[11px] text-foreground-400">
            Suma de todas las cuentas
          </p>
        </div>
        <div className="rounded-lg border border-background-200 bg-background-50 p-4">
          <p className="text-xs text-foreground-500">Efectivo</p>
          <p className="text-2xl font-semibold tabular-nums text-foreground-950">
            {toCurrency(balances.cash)}
          </p>
        </div>
        <div className="rounded-lg border border-background-200 bg-background-50 p-4">
          <p className="text-xs text-foreground-500">Bancos y billeteras</p>
          <p className="text-2xl font-semibold tabular-nums text-foreground-950">
            {toCurrency(balances.bank)}
          </p>
        </div>
        <div className="rounded-lg border border-background-200 bg-background-50 p-4">
          <p className="text-xs text-foreground-500">Deuda con proveedores</p>
          <p className="text-2xl font-semibold tabular-nums text-danger">
            {toCurrency(balances.debt)}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-background-200 bg-background-50 p-2 flex items-center gap-1 flex-wrap">
        <button
          type="button"
          onClick={() => setTab("movements")}
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium cursor-pointer ${
            tab === "movements"
              ? "bg-primary-500 text-background-50"
              : "text-foreground-600 hover:bg-background-100"
          }`}
        >
          <i className="ri-arrow-left-right-line" />
          Cuentas y movimientos
        </button>
        <button
          type="button"
          onClick={() => setTab("employees")}
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium cursor-pointer ${
            tab === "employees"
              ? "bg-primary-500 text-background-50"
              : "text-foreground-600 hover:bg-background-100"
          }`}
        >
          <i className="ri-team-line" />
          Empleados
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
              tab === "employees"
                ? "bg-background-50/20"
                : "bg-background-200 text-foreground-600"
            }`}
          >
            {state.employees.filter((e) => e.active).length}
          </span>
        </button>
        <div className="ml-auto flex items-center gap-2 px-1">
          {tab === "movements" ? (
            <>
              <Button
                size="sm"
                variant="outline"
                icon="ri-arrow-left-right-line"
                onClick={() => openForm("transfer")}
              >
                Transferencia interna
              </Button>
              <Button
                size="sm"
                icon="ri-add-line"
                onClick={() => openForm("income")}
              >
                Registrar ingreso
              </Button>
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-foreground-500 px-2">
              <i className="ri-information-line" />
              Retiros y sueldos de demostracion
            </span>
          )}
        </div>
      </div>

      {tab === "movements" ? (
        <>
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-foreground-950">
                Cuentas y saldos
              </h3>
              <span className="text-xs text-foreground-500">
                {state.accounts.length} cuentas
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {state.accounts.map((account) => {
                const balance = accountBalance(account, state.financeMovements);
                const income = accountIncomeToday(
                  account.id,
                  state.financeMovements,
                  today
                );
                const outflow = accountOutflowToday(
                  account.id,
                  state.financeMovements,
                  today
                );
                const selected = accountFilter === account.id;
                return (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() =>
                      setAccountFilter(selected ? "all" : account.id)
                    }
                    className={`text-left rounded-lg border p-4 transition-colors cursor-pointer ${
                      selected
                        ? "border-primary-400 bg-primary-50"
                        : "border-background-200 bg-background-50 hover:border-primary-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${
                            account.active
                              ? "bg-secondary-100 text-secondary-900"
                              : "bg-background-100 text-foreground-400"
                          }`}
                        >
                          <i className={accountIcon(account.type)} />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground-900 truncate">
                            {account.name}
                          </p>
                          <p className="text-[11px] text-foreground-400 truncate">
                            {methodName(state.paymentMethods, account.methodId) ||
                              "Sin medio"}
                          </p>
                        </div>
                      </div>
                      {!account.active ? (
                        <Chip tone="neutral">Inactiva</Chip>
                      ) : null}
                    </div>
                    <p className="mt-2 text-lg font-semibold tabular-nums text-foreground-950">
                      {toCurrency(balance)}
                    </p>
                    <p className="text-[11px] text-foreground-400">
                      Hoy +{toCurrency(income)} / −{toCurrency(outflow)}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-lg border border-background-200 bg-background-50">
            <div className="p-4 border-b border-background-200 flex flex-col lg:flex-row gap-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1">
                <Select
                  value={accountFilter}
                  onChange={setAccountFilter}
                  options={[
                    { value: "all", label: "Todas las cuentas" },
                    ...state.accounts.map((a) => ({
                      value: a.id,
                      label: a.name,
                    })),
                  ]}
                />
                <Select
                  value={typeFilter}
                  onChange={setTypeFilter}
                  options={movementKindOptions}
                />
                <div>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    aria-label="Desde"
                    className="w-full h-9 px-2 rounded-md border border-background-300 bg-background-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  />
                </div>
                <div>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    aria-label="Hasta"
                    className="w-full h-9 px-2 rounded-md border border-background-300 bg-background-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  icon="ri-filter-off-line"
                  onClick={clearFilters}
                >
                  Limpiar
                </Button>
              </div>
            </div>

            <div className="px-4 py-2.5 border-b border-background-200 flex items-center gap-4 flex-wrap text-xs">
              <span className="text-foreground-500">
                {totals.count} movimiento(s)
              </span>
              <span className="text-success">
                Ingresos {toCurrency(totals.income)}
              </span>
              <span className="text-danger">
                Egresos {toCurrency(totals.outflow)}
              </span>
              <span className="text-foreground-500">
                Neto {toCurrency(totals.income - totals.outflow)}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[880px]">
                <thead>
                  <tr className="text-left text-xs text-foreground-500 border-b border-background-200 bg-background-100/60">
                    <th className="py-2.5 px-4 font-medium">Fecha y hora</th>
                    <th className="py-2.5 px-4 font-medium">Cuenta</th>
                    <th className="py-2.5 px-4 font-medium">Tipo</th>
                    <th className="py-2.5 px-4 font-medium">Concepto</th>
                    <th className="py-2.5 px-4 font-medium">Origen / destino</th>
                    <th className="py-2.5 px-4 font-medium text-right">Importe</th>
                    <th className="py-2.5 px-4 font-medium text-right">Ver</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-background-100">
                  {movements.map((m) => (
                    <tr
                      key={m.id}
                      className="hover:bg-background-100/60 cursor-pointer"
                      onClick={() => setDetail(m)}
                    >
                      <td className="py-2.5 px-4 text-xs text-foreground-600 whitespace-nowrap">
                        {toDateTimeLabel(m.date)}
                      </td>
                      <td className="py-2.5 px-4 text-foreground-800">
                        {m.accountName}
                      </td>
                      <td className="py-2.5 px-4">
                        <Chip tone={movementKindTone(m)}>
                          {movementKindLabel(m)}
                        </Chip>
                      </td>
                      <td className="py-2.5 px-4 text-foreground-700">
                        {m.origin}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-foreground-500">
                        {m.counterAccountName ?? "—"}
                      </td>
                      <td
                        className={`py-2.5 px-4 text-right tabular-nums font-medium ${
                          m.type === "ingreso" ? "text-success" : "text-danger"
                        }`}
                      >
                        {m.type === "ingreso" ? "+" : "−"}
                        {toCurrency(m.amount)}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <i className="ri-eye-line text-foreground-400" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {movements.length === 0 ? (
              <div className="py-14 text-center text-foreground-400">
                <i className="ri-arrow-left-right-line text-5xl" />
                <p className="mt-3 text-sm">
                  No hay movimientos con los filtros elegidos.
                </p>
              </div>
            ) : null}
          </section>

          <p className="text-[11px] text-foreground-400 flex items-start gap-1.5">
            <i className="ri-information-line mt-0.5" />
            Las ventas impactan financieramente solo cuando Caja confirma la
            operacion. Caja del dia y Control de ventas siguen funcionando con la
            misma regla.
          </p>
        </>
      ) : null}

      {tab === "employees" ? <EmployeeModule /> : null}

      <TreasuryFormModal
        open={formOpen}
        mode={formMode}
        defaultAccountId={accountFilter === "all" ? undefined : accountFilter}
        onClose={() => setFormOpen(false)}
      />

      <MovementDetailModal movement={detail} onClose={() => setDetail(null)} />
    </div>
  );
};

export default TreasuryPage;