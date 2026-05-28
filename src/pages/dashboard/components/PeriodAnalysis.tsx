import { useState, useMemo } from 'react';

interface SaleForPeriod {
  finalizedAt?: string;
  createdAt: string;
  finalAmount: number;
  items: Array<{
    product: { retailPrice: number; purchasePrice: number };
    quantity: number;
    weightKg?: number;
  }>;
}

interface PeriodResult {
  label: string;
  revenue: number;
  cost: number;
  profit: number;
  count: number;
}

interface PeriodAnalysisProps {
  sales: SaleForPeriod[];
}

const PERIODS = [
  { key: 'day', label: 'Por Día (últimos 14)' },
  { key: 'week', label: 'Por Semana (últimas 8)' },
  { key: 'month', label: 'Por Mes (últimos 12)' },
  { key: 'semester', label: 'Por Semestre (últimos 4)' },
  { key: 'year', label: 'Por Año (últimos 3)' },
] as const;

type PeriodKey = (typeof PERIODS)[number]['key'];

function formatDateLabel(date: Date, period: PeriodKey): string {
  if (period === 'day') return `${date.getDate()}/${date.getMonth() + 1}`;
  if (period === 'week') {
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    return `${weekStart.getDate()}/${weekStart.getMonth() + 1}`;
  }
  if (period === 'month') {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${months[date.getMonth()]} '${date.getFullYear().toString().slice(2)}`;
  }
  if (period === 'semester') {
    const s = date.getMonth() < 6 ? 'S1' : 'S2';
    return `${s} ${date.getFullYear()}`;
  }
  return `${date.getFullYear()}`;
}

export default function PeriodAnalysis({ sales }: PeriodAnalysisProps) {
  const [period, setPeriod] = useState<PeriodKey>('month');

  const data = useMemo<PeriodResult[]>(() => {
    const now = new Date();
    const groups: Record<string, PeriodResult> = {};

    let backCount = 14;
    if (period === 'week') backCount = 8;
    if (period === 'month') backCount = 12;
    if (period === 'semester') backCount = 4;
    if (period === 'year') backCount = 3;

    // Initialize empty buckets
    for (let i = backCount - 1; i >= 0; i--) {
      const d = new Date(now);
      if (period === 'day') d.setDate(d.getDate() - i);
      else if (period === 'week') d.setDate(d.getDate() - i * 7);
      else if (period === 'month') d.setMonth(d.getMonth() - i);
      else if (period === 'semester') d.setMonth(d.getMonth() - i * 6);
      else if (period === 'year') d.setFullYear(d.getFullYear() - i);

      const key = formatDateLabel(d, period);
      if (!groups[key]) {
        groups[key] = { label: key, revenue: 0, cost: 0, profit: 0, count: 0 };
      }
    }

    sales.forEach((s) => {
      const date = new Date(s.finalizedAt || s.createdAt);
      const key = formatDateLabel(date, period);
      if (!groups[key]) return;

      groups[key].revenue += s.finalAmount;
      groups[key].count += 1;

      const cost = s.items.reduce((sum, item) => {
        const qty = item.weightKg ?? item.quantity;
        return sum + item.product.purchasePrice * qty;
      }, 0);
      groups[key].cost += cost;
      groups[key].profit += s.finalAmount - cost;
    });

    return Object.values(groups);
  }, [sales, period]);

  const totals = useMemo(() => {
    return data.reduce(
      (acc, d) => ({
        revenue: acc.revenue + d.revenue,
        cost: acc.cost + d.cost,
        profit: acc.profit + d.profit,
        count: acc.count + d.count,
      }),
      { revenue: 0, cost: 0, profit: 0, count: 0 }
    );
  }, [data]);

  const marginPct = totals.revenue > 0 ? Math.round((totals.profit / totals.revenue) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex flex-wrap gap-1.5">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              period === p.key
                ? 'bg-verde-700 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Ingresos</p>
          <p className="text-lg font-bold text-gray-800">${Math.round(totals.revenue).toLocaleString('es-AR')}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Costos</p>
          <p className="text-lg font-bold text-gray-600">${Math.round(totals.cost).toLocaleString('es-AR')}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Ganancia Neta</p>
          <p className="text-lg font-bold text-naranja-600">${Math.round(totals.profit).toLocaleString('es-AR')}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Margen</p>
          <p className="text-lg font-bold text-verde-700">{marginPct}%</p>
        </div>
      </div>

      {/* Bars */}
      <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
        {data.map((d) => {
          const maxRev = Math.max(...data.map((x) => x.revenue), 1);
          const revPct = (d.revenue / maxRev) * 100;
          const costPct = d.revenue > 0 ? (d.cost / d.revenue) * 100 : 0;
          const profitPct = d.revenue > 0 ? (d.profit / d.revenue) * 100 : 0;

          return (
            <div key={d.label} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-gray-700 w-16">{d.label}</span>
                <span className="text-gray-500">{d.count} ventas</span>
                <span className="font-semibold text-gray-800">
                  ${Math.round(d.revenue).toLocaleString('es-AR')}
                </span>
              </div>
              <div className="flex gap-1 h-5">
                <div
                  className="rounded-l-md bg-emerald-500"
                  style={{ width: `${revPct}%` }}
                  title={`Ganancia: $${Math.round(d.profit).toLocaleString('es-AR')}`}
                />
                <div
                  className="rounded-r-md bg-gray-300"
                  style={{ width: `${Math.max(0, 100 - revPct)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>Costo: ${Math.round(d.cost).toLocaleString('es-AR')} ({Math.round(costPct)}%)</span>
                <span className="text-naranja-600 font-medium">
                  Ganancia: ${Math.round(d.profit).toLocaleString('es-AR')} ({Math.round(profitPct)}%)
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}