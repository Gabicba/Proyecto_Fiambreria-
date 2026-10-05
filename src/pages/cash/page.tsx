import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Account, Sale } from "@/types";
import {
  useApp,
  findTodaySales,
  findTodaySalesWithAnnulled,
} from "@/store/AppContext";
import { useToast } from "@/components/base/Toast";
import Chip from "@/components/base/Chip";
import Button from "@/components/base/Button";
import Select from "@/components/base/Select";
import ReceiptModal from "@/components/feature/ReceiptModal";
import AnnulSaleModal from "@/components/feature/AnnulSaleModal";
import SaleDetailModal from "./components/SaleDetailModal";
import OpenCashModal from "./components/OpenCashModal";
import AccountDetailModal from "./components/AccountDetailModal";
import {
  accountBalance,
  accountIncomeToday,
  accountOutflowToday,
} from "@/utils/accounts";
import { saleStatusLabel, saleStatusTone } from "@/utils/sales";
import {
  round2,
  toCurrency,
  toDateKey,
  toDateTimeLabel,
  toNumber,
  toTimeLabel,
} from "@/utils/format";

const CashPage = () => {
  const { state, currentUser, openCashSession, annulSale } = useApp();
  const { notify } = useToast();
  const navigate = useNavigate();

  const [channelFilter, setChannelFilter] = useState("all");
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);
  const [openCashOpen, setOpenCashOpen] = useState(false);
  const [accountDetail, setAccountDetail] = useState<Account | null>(null);
  const [annulTarget, setAnnulTarget] = useState<Sale | null>(null);

  const todayKey = toDateKey(new Date());
  const session = useMemo(
    () => state.cashSessions.find((c) => c.dateKey === todayKey) ?? null,
    [state.cashSessions, todayKey]
  );

  // KPIs de ventas confirmadas (las anuladas no cuentan como ingreso).
  const todaySales = useMemo(() => findTodaySales(state.sales), [state.sales]);
  const todayList = useMemo(
    () => findTodaySalesWithAnnulled(state.sales),
    [state.sales]
  );

  const pendingCount = useMemo(
    () => state.sales.filter((s) => s.status === "pendiente").length,
    [state.sales]
  );

  const filtered = useMemo(
    () =>
      todayList.filter(
        (s) => channelFilter === "all" || s.channel === channelFilter
      ),
    [todayList, channelFilter]
  );

  const kpis = useMemo(() => {
    const income = round2(todaySales.reduce((a, s) => a + s.total, 0));
    const items = todaySales.reduce(
      (a, s) => a + s.items.reduce((b, i) => b + i.quantity, 0),
      0
    );
    const profit = round2(todaySales.reduce((a, s) => a + s.estimatedProfit, 0));
    const annulled = todayList.filter((s) => s.status === "anulada");
    const annulTotal = round2(annulled.reduce((a, s) => a + s.total, 0));
    return {
      count: todaySales.length,
      income,
      items,
      profit,
      annulCount: annulled.length,
      annulTotal,
      ticket: todaySales.length ? round2(income / todaySales.length) : 0,
    };
  }, [todaySales, todayList]);

  // Efectivo esperado = inicial + ventas confirmadas en efectivo - reversiones.
  const cashAccount = useMemo(
    () => state.accounts.find((a) => a.type === "efectivo") ?? null,
    [state.accounts]
  );
  const expectedCash = useMemo(() => {
    if (!cashAccount) return 0;
    const income = accountIncomeToday(
      cashAccount.id,
      state.financeMovements,
      todayKey
    );
    const outflow = accountOutflowToday(
      cashAccount.id,
      state.financeMovements,
      todayKey
    );
    return round2((session?.initialCash ?? 0) + income - outflow);
  }, [cashAccount, state.financeMovements, todayKey, session]);

  // Cuentas de cobro (las que tienen medio asociado).
  const accountCards = useMemo(
    () => state.accounts.filter((a) => a.methodId),
    [state.accounts]
  );

  const handleOpenCash = (initialCash: number, note: string) => {
    if (!currentUser) return;
    openCashSession({ initialCash, note, user: currentUser });
    setOpenCashOpen(false);
    notify(
      "Caja abierta",
      "success",
      `Efectivo inicial ${toCurrency(initialCash)}.`
    );
  };

  const handleOpenSaleFromAccount = (saleId: string) => {
    const sale = state.sales.find((s) => s.id === saleId) ?? null;
    setAccountDetail(null);
    if (sale) setSelectedSale(sale);
  };

  const handleAnnul = (reason: string) => {
    if (!annulTarget || !currentUser) return;
    const targetNumber = annulTarget.number;
    const result = annulSale(annulTarget.id, reason, currentUser);
    setAnnulTarget(null);
    setSelectedSale(null);
    if (result) {
      notify(
        `Venta #${targetNumber} anulada`,
        "info",
        "Se revirtieron el dinero y el stock en una sola operación."
      );
    } else {
      notify(
        `La venta #${targetNumber} ya estaba anulada`,
        "info",
        "No se generaron impactos duplicados."
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* Apertura de caja */}
      {session ? (
        <div className="rounded-lg border border-success/30 bg-success-soft px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="w-10 h-10 rounded-md bg-success/15 text-success flex items-center justify-center shrink-0">
            <i className="ri-lock-unlock-line text-xl" />
          </span>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-foreground-950">
                CAJA ABIERTA
              </span>
              <Chip tone="success">Turno en curso</Chip>
            </div>
            <p className="text-xs text-foreground-600 mt-0.5">
              Abierta por {session.openedByName} ·{" "}
              {toDateTimeLabel(session.openedAt)}
              {session.note ? ` · ${session.note}` : ""}
            </p>
          </div>
          <div className="sm:text-right">
            <p className="text-xs text-foreground-500">Efectivo inicial</p>
            <p className="text-xl font-bold tabular-nums text-foreground-950">
              {toCurrency(session.initialCash)}
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-warning/40 bg-warning-soft px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="w-10 h-10 rounded-md bg-warning/15 text-warning flex items-center justify-center shrink-0">
            <i className="ri-lock-line text-xl" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground-950">
              CAJA CERRADA
            </p>
            <p className="text-xs text-foreground-600 mt-0.5">
              Registrá el efectivo inicial para comenzar la jornada. No se cuenta
              como venta ni ingreso del día.
            </p>
          </div>
          <Button
            icon="ri-lock-unlock-line"
            onClick={() => setOpenCashOpen(true)}
          >
            Abrir caja
          </Button>
        </div>
      )}

      {pendingCount > 0 ? (
        <div className="rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <span className="text-sm text-warning flex items-center gap-2">
            <i className="ri-time-line" />
            Hay {pendingCount} operación(es) pendiente(s) de control de caja.
          </span>
          <Button
            size="sm"
            variant="outline"
            icon="ri-arrow-right-line"
            onClick={() => navigate("/control-ventas")}
          >
            Ir a Control de ventas
          </Button>
        </div>
      ) : null}

      {/* Resumen del día */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-lg border border-background-200 bg-background-50 p-4">
          <p className="text-xs text-foreground-500">Ventas confirmadas hoy</p>
          <p className="text-2xl font-semibold text-foreground-950">
            {kpis.count}
          </p>
          <p className="text-xs text-foreground-400 mt-1">
            Ticket promedio {toCurrency(kpis.ticket)}
          </p>
        </div>
        <div className="rounded-lg border border-background-200 bg-background-50 p-4">
          <p className="text-xs text-foreground-500">Ingresos del día</p>
          <p className="text-2xl font-semibold text-success tabular-nums">
            {toCurrency(kpis.income)}
          </p>
          <p className="text-xs text-foreground-400 mt-1">
            {toNumber(kpis.items, kpis.items % 1 === 0 ? 0 : 2)} items vendidos
          </p>
        </div>
        <div className="rounded-lg border border-background-200 bg-background-50 p-4">
          <p className="text-xs text-foreground-500">Efectivo esperado</p>
          <p className="text-2xl font-semibold text-foreground-950 tabular-nums">
            {toCurrency(expectedCash)}
          </p>
          <p className="text-xs text-foreground-400 mt-1">
            Inicial + ventas efectivo − reversiones
          </p>
        </div>
        <div className="rounded-lg border border-background-200 bg-background-50 p-4">
          <p className="text-xs text-foreground-500">Anulaciones / reversiones</p>
          <p
            className={`text-2xl font-semibold tabular-nums ${
              kpis.annulCount > 0 ? "text-danger" : "text-foreground-950"
            }`}
          >
            {toCurrency(kpis.annulTotal)}
          </p>
          <p className="text-xs text-foreground-400 mt-1">
            {kpis.annulCount} venta(s) anulada(s)
          </p>
        </div>
      </div>

      {/* Saldos / ingresos por cuenta */}
      <section className="rounded-lg border border-background-200 bg-background-50">
        <div className="px-4 py-3 border-b border-background-200 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-sm font-semibold text-foreground-950">
              Saldos / ingresos por cuenta
            </h3>
            <p className="text-xs text-foreground-500 mt-0.5">
              El dinero ingresa a cada cuenta recién cuando Caja confirma la
              venta.
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            icon="ri-settings-3-line"
            onClick={() => navigate("/configuracion")}
          >
            Gestionar cuentas
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 p-4">
          {accountCards.map((account) => {
            const balance = accountBalance(account, state.financeMovements);
            const income = accountIncomeToday(
              account.id,
              state.financeMovements,
              todayKey
            );
            return (
              <button
                key={account.id}
                type="button"
                onClick={() => setAccountDetail(account)}
                className="text-left rounded-lg border border-background-200 bg-background-50 p-4 hover:border-primary-300 hover:bg-background-100/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-8 h-8 rounded-md bg-secondary-100 text-secondary-900 flex items-center justify-center shrink-0">
                      <i
                        className={
                          account.type === "efectivo"
                            ? "ri-money-dollar-circle-line"
                            : account.type === "banco"
                              ? "ri-bank-line"
                              : account.type === "billetera"
                                ? "ri-smartphone-line"
                                : account.type === "tarjeta"
                                  ? "ri-bank-card-line"
                                  : "ri-wallet-3-line"
                        }
                      />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground-900 truncate">
                        {account.name}
                      </p>
                      <p className="text-[11px] text-foreground-500 truncate">
                        {account.typeLabel}
                      </p>
                    </div>
                  </div>
                  <i className="ri-arrow-right-s-line text-foreground-400" />
                </div>
                <p className="mt-3 text-xs text-foreground-500">Saldo actual</p>
                <p className="text-xl font-bold tabular-nums text-foreground-950">
                  {toCurrency(balance)}
                </p>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-foreground-500">Ingresado hoy</span>
                  <span className="font-semibold text-success tabular-nums">
                    + {toCurrency(income)}
                  </span>
                </div>
              </button>
            );
          })}
          {accountCards.length === 0 ? (
            <p className="text-sm text-foreground-400 col-span-full py-6 text-center">
              No hay cuentas de cobro configuradas.
            </p>
          ) : null}
        </div>
      </section>

      {/* Detalle de ventas */}
      <div className="rounded-lg border border-background-200 bg-background-50">
        <div className="px-4 py-3 border-b border-background-200 flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-sm font-semibold text-foreground-950">
            Ventas del día (confirmadas y anuladas)
          </h3>
          <div className="w-40">
            <Select
              value={channelFilter}
              onChange={setChannelFilter}
              options={[
                { value: "all", label: "Todas" },
                { value: "retail", label: "Minorista" },
                { value: "wholesale", label: "Mayorista" },
              ]}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="text-left text-xs text-foreground-500 border-b border-background-200">
                <th className="py-2.5 px-4 font-medium">Hora</th>
                <th className="py-2.5 px-4 font-medium">Venta</th>
                <th className="py-2.5 px-4 font-medium">Vendedor</th>
                <th className="py-2.5 px-4 font-medium">Tipo</th>
                <th className="py-2.5 px-4 font-medium">Estado</th>
                <th className="py-2.5 px-4 font-medium">Metodo / Cuenta</th>
                <th className="py-2.5 px-4 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-background-100">
              {filtered.map((sale) => (
                <tr
                  key={sale.id}
                  className="hover:bg-background-100/60 cursor-pointer"
                  onClick={() => setSelectedSale(sale)}
                >
                  <td className="py-2.5 px-4 text-foreground-600 tabular-nums">
                    {toTimeLabel(sale.date)}
                  </td>
                  <td className="py-2.5 px-4 font-medium text-foreground-900">
                    #{sale.number}
                  </td>
                  <td className="py-2.5 px-4 text-foreground-600">
                    {sale.sellerName}
                  </td>
                  <td className="py-2.5 px-4">
                    <Chip tone={sale.channel === "retail" ? "primary" : "accent"}>
                      {sale.channel === "retail" ? "Minorista" : "Mayorista"}
                    </Chip>
                  </td>
                  <td className="py-2.5 px-4">
                    <Chip tone={saleStatusTone(sale.status)}>
                      {saleStatusLabel(sale.status)}
                    </Chip>
                  </td>
                  <td className="py-2.5 px-4 text-foreground-600 text-xs">
                    {sale.payments
                      .map((p) => `${p.methodName} (${p.accountName})`)
                      .join(" + ")}
                  </td>
                  <td
                    className={`py-2.5 px-4 text-right font-medium tabular-nums ${
                      sale.status === "anulada"
                        ? "text-foreground-400 line-through"
                        : "text-foreground-900"
                    }`}
                  >
                    {toCurrency(sale.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-foreground-400">
              <i className="ri-cash-line text-5xl" />
              <p className="mt-3 text-sm">
                Todavia no hay ventas confirmadas hoy.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-foreground-400">
        <i className="ri-information-line" />
        <span>
          Las ventas que Caja confirma impactan acá, descuentan stock y acreditan
          cada cuenta. Al anular una venta confirmada se generan movimientos
          inversos trazables.
        </span>
      </div>

      <SaleDetailModal
        open={Boolean(selectedSale)}
        onClose={() => setSelectedSale(null)}
        sale={selectedSale}
        onAnnul={
          currentUser?.role === "admin" && selectedSale?.status === "finalizada"
            ? () => setAnnulTarget(selectedSale)
            : undefined
        }
        onPrint={
          selectedSale
            ? () => {
                setReceiptSale(selectedSale);
                setSelectedSale(null);
              }
            : undefined
        }
      />

      <ReceiptModal
        open={Boolean(receiptSale)}
        onClose={() => setReceiptSale(null)}
        sale={receiptSale}
      />

      <OpenCashModal
        open={openCashOpen}
        onClose={() => setOpenCashOpen(false)}
        onConfirm={handleOpenCash}
      />

      <AccountDetailModal
        open={Boolean(accountDetail)}
        onClose={() => setAccountDetail(null)}
        account={accountDetail}
        onOpenSale={handleOpenSaleFromAccount}
      />

      <AnnulSaleModal
        open={Boolean(annulTarget)}
        onClose={() => setAnnulTarget(null)}
        sale={annulTarget}
        onConfirm={handleAnnul}
      />
    </div>
  );
};

export default CashPage;