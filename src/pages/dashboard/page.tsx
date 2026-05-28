import { useMemo } from 'react';
import { useSalesStore } from '@/mocks/salesStore';
import { loadProducts } from '@/mocks/productsStore';
import { loadHistoricalSales } from '@/mocks/historicalSales';
import SalesByDayChart from './components/SalesByDayChart';
import PaymentMethodPie from './components/PaymentMethodPie';
import TopProductsChart from './components/TopProductsChart';
import TrendChart from './components/TrendChart';
import PeriodAnalysis from './components/PeriodAnalysis';

export default function Dashboard() {
  const { sales: currentSales } = useSalesStore();
  const historicalSales = useMemo(() => loadHistoricalSales(), []);

  // Combine current + historical for analytics
  const allSales = useMemo(() => {
    return [...currentSales, ...historicalSales];
  }, [currentSales, historicalSales]);

  const finalizedSales = useMemo(() => allSales.filter((s) => s.status === 'finalized'), [allSales]);

  const today = new Date().toISOString().split('T')[0];
  const todaySales = useMemo(() => {
    return finalizedSales.filter((s) => (s.finalizedAt || s.createdAt).startsWith(today));
  }, [finalizedSales, today]);

  const thisWeekSales = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return finalizedSales.filter((s) => new Date(s.finalizedAt || s.createdAt) >= weekAgo);
  }, [finalizedSales]);

  const thisMonthSales = useMemo(() => {
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    return finalizedSales.filter((s) => new Date(s.finalizedAt || s.createdAt) >= monthAgo);
  }, [finalizedSales]);

  const totalRevenue = finalizedSales.reduce((sum, s) => sum + s.finalAmount, 0);

  const totalProfit = useMemo(() => {
    return finalizedSales.reduce((sum, s) => {
      return sum + s.items.reduce((itemSum, item) => {
        const qty = item.weightKg ?? item.quantity;
        return itemSum + (item.product.retailPrice - item.product.purchasePrice) * qty;
      }, 0);
    }, 0);
  }, [finalizedSales]);

  const todayRevenue = todaySales.reduce((sum, s) => sum + s.finalAmount, 0);
  const weekRevenue = thisWeekSales.reduce((sum, s) => sum + s.finalAmount, 0);
  const monthRevenue = thisMonthSales.reduce((sum, s) => sum + s.finalAmount, 0);

  const lowStock = useMemo(() => {
    return loadProducts().filter((p) => p.currentStock <= p.minStock);
  }, []);

  const nearExpiration = useMemo(() => {
    const now = new Date();
    const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    return loadProducts().filter((p) => {
      const exp = new Date(p.expirationDate);
      return exp <= threeDays && exp >= now;
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-verde-800 text-white px-4 md:px-6 py-3 flex items-center gap-3">
        <span className="w-8 h-8 flex items-center justify-center bg-verde-700 rounded-lg">
          <i className="ri-dashboard-line" />
        </span>
        <div>
          <h1 className="text-base font-bold">Dashboard</h1>
          <p className="text-xs text-verde-300">Métricas esenciales del negocio</p>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-6">
        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white border border-gray-200 rounded-xl p-3">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Ventas Total</p>
            <p className="text-xl font-bold text-gray-800">{finalizedSales.length.toLocaleString('es-AR')}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-3">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Ingresos Total</p>
            <p className="text-xl font-bold text-verde-700">${Math.round(totalRevenue).toLocaleString('es-AR')}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-3">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Ganancia Neta</p>
            <p className="text-xl font-bold text-naranja-600">${Math.round(totalProfit).toLocaleString('es-AR')}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-3">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Margen</p>
            <p className="text-xl font-bold text-gray-800">
              {totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0}%
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-3">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Hoy</p>
            <p className="text-xl font-bold text-verde-700">${Math.round(todayRevenue).toLocaleString('es-AR')}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-3">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Esta Semana</p>
            <p className="text-xl font-bold text-gray-800">${Math.round(weekRevenue).toLocaleString('es-AR')}</p>
          </div>
        </div>

        {/* Charts row 1: trend + pie */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-gray-800">Tendencia de ventas — Últimos 30 días</h3>
              <span className="text-xs text-gray-400">{finalizedSales.length.toLocaleString('es-AR')} ventas</span>
            </div>
            <TrendChart sales={finalizedSales} days={30} />
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-1">Métodos de pago</h3>
            <PaymentMethodPie sales={finalizedSales} />
          </div>
        </div>

        {/* Charts row 2: weekly bars + top products */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-1">Ventas por día — Última semana</h3>
            <SalesByDayChart sales={finalizedSales} />
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-1">Productos más vendidos</h3>
            <TopProductsChart sales={finalizedSales} limit={8} />
          </div>
        </div>

        {/* Period analysis */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Análisis de ganancia neta por período</h3>
          <PeriodAnalysis
            sales={finalizedSales.map((s) => ({
              finalizedAt: s.finalizedAt,
              createdAt: s.createdAt,
              finalAmount: s.finalAmount,
              items: s.items.map((item) => ({
                product: {
                  retailPrice: item.product.retailPrice,
                  purchasePrice: item.product.purchasePrice,
                },
                quantity: item.quantity,
                weightKg: item.weightKg,
              })),
            }))}
          />
        </div>

        {/* Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <i className="ri-error-warning-line text-red-500" />
              Alertas de stock bajo
            </h3>
            {lowStock.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Todos los productos con stock suficiente</p>
            ) : (
              <div className="space-y-2">
                {lowStock.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{p.name}</p>
                      <p className="text-xs text-gray-500">Stock: {p.currentStock}{p.unit} / Mín: {p.minStock}{p.unit}</p>
                    </div>
                    <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-1 rounded-md">Bajo</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <i className="ri-time-line text-naranja-500" />
              Próximos a vencer (3 días)
            </h3>
            {nearExpiration.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No hay productos próximos a vencer</p>
            ) : (
              <div className="space-y-2">
                {nearExpiration.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-2 bg-naranja-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{p.name}</p>
                      <p className="text-xs text-gray-500">Vence: {new Date(p.expirationDate).toLocaleDateString('es-AR')}</p>
                    </div>
                    <span className="text-xs font-medium text-naranja-600 bg-naranja-100 px-2 py-1 rounded-md">Vencimiento</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}