import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface SalesByDayProps {
  sales: Array<{
    finalizedAt?: string;
    createdAt: string;
    finalAmount: number;
  }>;
}

export default function SalesByDayChart({ sales }: SalesByDayProps) {
  const data = useMemo(() => {
    const now = new Date();
    const days: { name: string; date: string; total: number; count: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      days.push({
        name: dayNames[d.getDay()],
        date: dateStr,
        total: 0,
        count: 0,
      });
    }

    sales.forEach((s) => {
      const saleDate = (s.finalizedAt || s.createdAt).split('T')[0];
      const day = days.find((d) => d.date === saleDate);
      if (day) {
        day.total += s.finalAmount;
        day.count += 1;
      }
    });

    return days;
  }, [sales]);

  const maxVal = Math.max(...data.map((d) => d.total), 1);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12, fill: '#6B7280' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#6B7280' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            formatter={(value: number) => [`$${value.toLocaleString('es-AR')}`, 'Ventas']}
            labelFormatter={(label: string) => label}
            contentStyle={{
              borderRadius: '12px',
              border: '1px solid #E5E7EB',
              fontSize: '13px',
            }}
          />
          <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={48}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.total === maxVal ? '#16A34A' : '#D1FAE5'}
                stroke={entry.total === maxVal ? '#16A34A' : '#A7F3D0'}
                strokeWidth={1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}