import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface PaymentMethodPieProps {
  sales: Array<{
    paymentMethod: string;
    finalAmount: number;
    mixedPayment?: { cash: number; debit: number; transfer: number; mercadoPago: number };
  }>;
}

const COLORS = ['#16A34A', '#3B82F6', '#8B5CF6', '#06B6D4', '#F59E0B', '#EF4444'];

const LABELS: Record<string, string> = {
  cash: 'Efectivo',
  debit: 'Débito',
  credit: 'Crédito',
  transfer: 'Transferencia',
  'mercado-pago': 'Mercado Pago',
  mixed: 'Mixto',
};

export default function PaymentMethodPie({ sales }: PaymentMethodPieProps) {
  const data = useMemo(() => {
    const map: Record<string, number> = {};

    sales.forEach((s) => {
      if (s.paymentMethod === 'mixed' && s.mixedPayment) {
        const mp = s.mixedPayment;
        if (mp.cash > 0) map['cash'] = (map['cash'] || 0) + mp.cash;
        if (mp.debit > 0) map['debit'] = (map['debit'] || 0) + mp.debit;
        if (mp.transfer > 0) map['transfer'] = (map['transfer'] || 0) + mp.transfer;
        if (mp.mercadoPago > 0) map['mercado-pago'] = (map['mercado-pago'] || 0) + mp.mercadoPago;
      } else {
        map[s.paymentMethod] = (map[s.paymentMethod] || 0) + s.finalAmount;
      }
    });

    return Object.entries(map)
      .map(([key, value]) => ({
        name: LABELS[key] || key,
        value: Math.round(value),
        key,
      }))
      .sort((a, b) => b.value - a.value);
  }, [sales]);

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="h-64 w-full flex items-center">
      <div className="w-1/2 h-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [`$${value.toLocaleString('es-AR')}`, '']}
              contentStyle={{
                borderRadius: '12px',
                border: '1px solid #E5E7EB',
                fontSize: '13px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="w-1/2 space-y-2 pl-2">
        {data.map((entry, index) => {
          const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0;
          return (
            <div key={entry.key} className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-700 truncate">{entry.name}</p>
                <p className="text-[10px] text-gray-400">{pct}% · ${entry.value.toLocaleString('es-AR')}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}