import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useApp, findTodaySales } from "@/store/AppContext";
import Button from "@/components/base/Button";
import Chip from "@/components/base/Chip";
import { getStockState, stockStateLabel, stockStateTone } from "@/utils/inventory";
import { round2, toCurrency, toNumber, toTimeLabel } from "@/utils/format";

const DashboardPage = () => {
  const { state, currentUser } = useApp();
  const navigate = useNavigate();

  const todaySales = useMemo(() => findTodaySales(state.sales), [state.sales]);

  const kpis = useMemo(() => {
    const income = round2(todaySales.reduce((a, s) => a + s.total, 0));
    const profit = round2(todaySales.reduce((a, s) => a + s.estimatedProfit, 0));
    return {
      count: todaySales.length,
      income,
      profit,
      ticket: todaySales.length ? round2(income / todaySales.length) : 0,
    };
  }, [todaySales]);

  const alerts = useMemo(
    () =>
      state.products
        .filter((p) => getStockState(p) !== "normal")
        .sort((a, b) => a.stock - b.stock)
        .slice(0, 6),
    [state.products]
  );

  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; total: number }>();
    todaySales.forEach((sale) => {
      sale.items.forEach((item) => {
        const key = item.name;
        const current = map.get(key) ?? { name: item.name, qty: 0, total: 0 };
        current.qty += item.quantity;
        current.total = round2(current.total + item.subtotal);
        map.set(key, current);
      });
    });
    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [todaySales]);

  const recentSales = todaySales.slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-foreground-950 p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1">
          <p className="text-foreground-400 text-sm">
            Hola, {currentUser?.name} · {currentUser?.roleLabel}
          </p>
          <h2 className="text-background-50 text-xl md:text-2xl font-semibold mt-1">
            Resumen operativo de hoy
          </h2>
          <p className="text-foreground-400 text-sm mt-1 max-w-lg">
            Prototipo del nucleo operativo: ventas, stock, promociones y caja del
            dia conectados en un mismo circuito.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button icon="ri-shopping-cart-2-line" onClick={() => navigate("/ventas")}>
            Ir a Caja de venta
          </Button>
          <Button
            variant="outlineLight"
            icon="ri-add-line"
            onClick={() => navigate("/productos")}
          >
            Nuevo producto
          </Button>
          <Button
            variant="outlineLight"
            icon="ri-gift-2-line"
            onClick={() => navigate("/precios")}
          >
            Promociones
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-lg border border-background-200 bg-background-50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-foreground-500">Ventas de hoy</p>
            <span className="w-7 h-7 rounded-md bg-primary-100 text-primary-700 flex items-center justify-center">
              <i className="ri-shopping-bag-3-line" />
            </span>
          </div>
          <p className="text-2xl font-semibold text-foreground-950 mt-2">
            {kpis.count}
          </p>
        </div>
        <div className="rounded-lg border border-background-200 bg-background-50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-foreground-500">Ingresos</p>
            <span className="w-7 h-7 rounded-md bg-secondary-100 text-secondary-900 flex items-center justify-center">
              <i className="ri-money-dollar-circle-line" />
            </span>
          </div>
          <p className="text-2xl font-semibold text-foreground-950 mt-2 tabular-nums">
            {toCurrency(kpis.income)}
          </p>
        </div>
        <div className="rounded-lg border border-background-200 bg-background-50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-foreground-500">Ganancia estimada</p>
            <span className="w-7 h-7 rounded-md bg-success-soft text-success flex items-center justify-center">
              <i className="ri-line-chart-line" />
            </span>
          </div>
          <p
            className={`text-2xl font-semibold mt-2 tabular-nums ${
              kpis.profit < 0 ? "text-danger" : "text-success"
            }`}
          >
            {toCurrency(kpis.profit)}
          </p>
        </div>
        <div className="rounded-lg border border-background-200 bg-background-50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-foreground-500">Ticket promedio</p>
            <span className="w-7 h-7 rounded-md bg-accent-100 text-accent-700 flex items-center justify-center">
              <i className="ri-receipt-line" />
            </span>
          </div>
          <p className="text-2xl font-semibold text-foreground-950 mt-2 tabular-nums">
            {toCurrency(kpis.ticket)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-lg border border-background-200 bg-background-50 lg:col-span-2">
          <div className="px-4 py-3 border-b border-background-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground-950">
              Ultimas ventas de hoy
            </h3>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate("/caja")}
              icon="ri-arrow-right-line"
            >
              Ver caja del dia
            </Button>
          </div>
          <ul className="divide-y divide-background-100">
            {recentSales.map((sale) => (
              <li
                key={sale.id}
                className="px-4 py-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground-900">
                      #{sale.number}
                    </span>
                    <Chip
                      tone={sale.channel === "retail" ? "primary" : "accent"}
                    >
                      {sale.channel === "retail" ? "Minorista" : "Mayorista"}
                    </Chip>
                    <span className="text-xs text-foreground-400">
                      {toTimeLabel(sale.date)}
                    </span>
                  </div>
                  <p className="text-xs text-foreground-500 truncate mt-0.5">
                    {sale.customer || "Consumidor final"} ·{" "}
                    {sale.payments.map((p) => p.methodName).join(" + ")}
                  </p>
                </div>
                <span className="text-sm font-semibold text-foreground-950 tabular-nums">
                  {toCurrency(sale.total)}
                </span>
              </li>
            ))}
            {recentSales.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-foreground-400">
                Todavia no hay ventas hoy.
              </li>
            ) : null}
          </ul>
        </div>

        <div className="rounded-lg border border-background-200 bg-background-50">
          <div className="px-4 py-3 border-b border-background-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground-950">
              Alertas de stock
            </h3>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate("/productos")}
            >
              Gestionar
            </Button>
          </div>
          <ul className="divide-y divide-background-100">
            {alerts.map((p) => (
              <li
                key={p.id}
                className="px-4 py-3 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="text-sm text-foreground-800 truncate">{p.name}</p>
                  <p className="text-xs text-foreground-400">
                    {toNumber(p.stock, p.unit === "kg" ? 3 : 0)}{" "}
                    {p.unit === "kg" ? "kg" : "un"}
                  </p>
                </div>
                <Chip tone={stockStateTone(getStockState(p))}>
                  {stockStateLabel(getStockState(p))}
                </Chip>
              </li>
            ))}
            {alerts.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-foreground-400">
                Todo el stock esta en orden.
              </li>
            ) : null}
          </ul>
        </div>
      </div>

      <div className="rounded-lg border border-background-200 bg-background-50">
        <div className="px-4 py-3 border-b border-background-200">
          <h3 className="text-sm font-semibold text-foreground-950">
            Productos mas vendidos hoy
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-4">
          {topProducts.map((p, i) => (
            <div
              key={p.name}
              className="rounded-md border border-background-200 p-3"
            >
              <div className="flex items-center justify-between">
                <span className="w-6 h-6 rounded-md bg-accent-500 text-foreground-950 flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </span>
                <span className="text-xs text-foreground-400 tabular-nums">
                  {toNumber(p.qty, p.qty % 1 === 0 ? 0 : 3)}
                </span>
              </div>
              <p className="text-sm text-foreground-800 mt-2 truncate">
                {p.name}
              </p>
              <p className="text-sm font-semibold text-foreground-950 tabular-nums">
                {toCurrency(p.total)}
              </p>
            </div>
          ))}
          {topProducts.length === 0 ? (
            <p className="text-sm text-foreground-400 col-span-full py-6 text-center">
              Sin ventas registradas hoy.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;