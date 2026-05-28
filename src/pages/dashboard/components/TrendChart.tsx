import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TrendChartProps {
  sales: Array<{
    finalizedAt?: string;
    createdAt: string;
    finalAmount: number;
  }>;
  days?: number;
}

export default function TrendChart({ sales, days = 30 }: TrendChartProps) {
  const data = useMemo(() => {
    const now = new Date();
    const result: { date: string; label: string; total: number; count: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      result.push({
        date: dateStr,
        label: `${d.getDate()}/${d.getMonth() + 1}`,
        total: 0,
        count: 0,
      });
    }

    sales.forEach((s) => {
      const saleDate = (s.finalizedAt || s.createdAt).split('T')[0];
      const day = result.find((d) => d.date === saleDate);
      if (day) {
        day.total += s.finalAmount;
        day.count += 1;
      }
    });

    return result;
  }, [sales, days]);

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#16A34A" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#6B7280' }}
            axisLine={false}
            tickLine={false}
            interval={Math.floor(days / 8)}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#6B7280' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            formatter={(value: number, _name: string, props: { payload: { count: number } }) => [
              `$${value.toLocaleString('es-AR')} · ${props.payload.count} ventas`,
              'Ventas',
            ]}
            contentStyle={{
              borderRadius: '12px',
              border: '1px solid #E5E7EB',
              fontSize: '13px',
            }}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#16A34A"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorSales)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}