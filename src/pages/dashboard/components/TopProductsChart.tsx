import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface TopProductsChartProps {
  sales: Array<{
    items: Array<{
      product: { id: string; name: string; retailPrice: number; purchasePrice: number };
      quantity: number;
      weightKg?: number;
    }>;
  }>;
  limit?: number;
}

export default function TopProductsChart({ sales, limit = 8 }: TopProductsChartProps) {
  const data = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number }> = {};

    sales.forEach((s) => {
      s.items.forEach((item) => {
        const qty = item.weightKg ?? item.quantity;
        const id = item.product.id;
        if (!map[id]) {
          map[id] = { name: item.product.name, qty: 0, revenue: 0 };
        }
        map[id].qty += qty;
        map[id].revenue += item.product.retailPrice * qty;
      });
    });

    return Object.values(map)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit)
      .map((d) => ({
        ...d,
        qtyRounded: Math.round(d.qty * 100) / 100,
      }));
  }, [sales, limit]);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 5, left: 0, bottom: 0 }}
        >
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: '#6B7280' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: '#374151' }}
            axisLine={false}
            tickLine={false}
            width={110}
            interval={0}
          />
          <Tooltip
            formatter={(value: number, _name: string, props: { payload: { name: string; qtyRounded: number } }) => [
              `$${value.toLocaleString('es-AR')} · ${props.payload.qtyRounded} unidades`,
              props.payload.name,
            ]}
            contentStyle={{
              borderRadius: '12px',
              border: '1px solid #E5E7EB',
              fontSize: '13px',
            }}
          />
          <Bar dataKey="revenue" radius={[0, 6, 6, 0]} maxBarSize={20}>
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={index < 3 ? '#16A34A' : '#D1FAE5'}
                stroke={index < 3 ? '#16A34A' : '#A7F3D0'}
                strokeWidth={1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}