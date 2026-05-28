import { useMemo, useState, useCallback } from 'react';
import { useSalesStore } from '@/mocks/salesStore';

interface ArqueoData {
  cash: string;
  debit: string;
  credit: string;
  transfer: string;
  mercadoPago: string;
}

const STORAGE_ARQUEO_KEY = 'fiambreria_arqueo_';

function getTodayKey(): string {
  return STORAGE_ARQUEO_KEY + new Date().toISOString().split('T')[0];
}

function loadArqueo(): ArqueoData | null {
  try {
    const data = localStorage.getItem(getTodayKey());
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

function saveArqueo(data: ArqueoData): void {
  localStorage.setItem(getTodayKey(), JSON.stringify(data));
}

export default function CajaDia() {
  const { sales } = useSalesStore();
  const [showArqueo, setShowArqueo] = useState(false);
  const [arqueo, setArqueo] = useState<ArqueoData>(loadArqueo() || {
    cash: '',
    debit: '',
    credit: '',
    transfer: '',
    mercadoPago: '',
  });

  const today = new Date().toISOString().split('T')[0];

  const todaySales = useMemo(() => {
    return sales.filter((s) => {
      if (s.status !== 'finalized') return false;
      const saleDate = s.finalizedAt || s.createdAt;
      return saleDate.startsWith(today);
    });
  }, [sales, today]);

  // Real money breakdown: split mixed payments into individual methods
  const realMoneyByMethod = useMemo(() => {
    const map: Record<string, { count: number; amount: number; received: number }> = {
      cash: { count: 0, amount: 0, received: 0 },
      debit: { count: 0, amount: 0, received: 0 },
      credit: { count: 0, amount: 0, received: 0 },
      transfer: { count: 0, amount: 0, received: 0 },
      'mercado-pago': { count: 0, amount: 0, received: 0 },
    };

    todaySales.forEach((s) => {
      if (s.paymentMethod === 'mixed' && s.mixedPayment) {
        if (s.mixedPayment.cash > 0) {
          map['cash'].count += 1;
          map['cash'].amount += s.mixedPayment.cash;
          map['cash'].received += s.mixedPayment.cash;
        }
        if (s.mixedPayment.debit > 0) {
          map['debit'].count += 1;
          map['debit'].amount += s.mixedPayment.debit;
          map['debit'].received += s.mixedPayment.debit;
        }
        if (s.mixedPayment.transfer > 0) {
          map['transfer'].count += 1;
          map['transfer'].amount += s.mixedPayment.transfer;
          map['transfer'].received += s.mixedPayment.transfer;
        }
        if (s.mixedPayment.mercadoPago > 0) {
          map['mercado-pago'].count += 1;
          map['mercado-pago'].amount += s.mixedPayment.mercadoPago;
          map['mercado-pago'].received += s.mixedPayment.mercadoPago;
        }
      } else {
        map[s.paymentMethod].count += 1;
        map[s.paymentMethod].amount += s.finalAmount;

        if (s.paymentMethod === 'cash' && s.cashAmount && s.cashAmount > s.finalAmount) {
          map['cash'].received += s.cashAmount;
        } else {
          map[s.paymentMethod].received += s.finalAmount;
        }
      }
    });

    return map;
  }, [todaySales]);

  const totalReceived = useMemo(() => {
    return Object.values(realMoneyByMethod).reduce((sum, m) => sum + m.received, 0);
  }, [realMoneyByMethod]);

  const totalChange = useMemo(() => {
    return todaySales.reduce((sum, s) => {
      if (s.paymentMethod === 'cash' && s.cashAmount && s.cashAmount > s.finalAmount) {
        return sum + (s.cashAmount - s.finalAmount);
      }
      return sum;
    }, 0);
  }, [todaySales]);

  const totalSales = todaySales.reduce((sum, s) => sum + s.finalAmount, 0);
  const totalItems = todaySales.reduce((sum, s) => sum + s.items.reduce((is, i) => is + i.quantity, 0), 0);
  const totalProfit = todaySales.reduce((sum, s) => {
    return sum + s.items.reduce((itemSum, item) => {
      const qty = item.weightKg ?? item.quantity;
      return itemSum + (item.product.retailPrice - item.product.purchasePrice) * qty;
    }, 0);
  }, 0);

  const paymentLabels: Record<string, { label: string; icon: string; color: string; accountName?: string }> = {
    cash: { label: 'Efectivo', icon: 'ri-money-dollar-circle-line', color: 'text-emerald-600', accountName: 'Caja Efectivo' },
    debit: { label: 'Débito', icon: 'ri-bank-card-line', color: 'text-blue-600', accountName: 'Tarjeta de Débito' },
    credit: { label: 'Crédito', icon: 'ri-bank-card-2-line', color: 'text-purple-600', accountName: 'Tarjeta de Crédito' },
    transfer: { label: 'Transferencia', icon: 'ri-arrow-left-right-line', color: 'text-cyan-600', accountName: 'Cuenta Bancaria' },
    'mercado-pago': { label: 'Mercado Pago', icon: 'ri-wallet-3-line', color: 'text-blue-500', accountName: 'Mercado Pago' },
  };

  const handleArqueoChange = useCallback((field: keyof ArqueoData, value: string) => {
    setArqueo((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSaveArqueo = () => {
    saveArqueo(arqueo);
    setShowArqueo(false);
  };

  const arqueoTotals: Record<string, number> = {
    cash: parseFloat(arqueo.cash) || 0,
    debit: parseFloat(arqueo.debit) || 0,
    credit: parseFloat(arqueo.credit) || 0,
    transfer: parseFloat(arqueo.transfer) || 0,
    'mercado-pago': parseFloat(arqueo.mercadoPago) || 0,
  };

  // Build method summary for today (only today's sales, no total account balance)
  const todayMethodSummary = useMemo(() => {
    return Object.entries(realMoneyByMethod)
      .filter(([, data]) => data.count > 0)
      .map(([method, data]) => {
        const config = paymentLabels[method] || { label: method, icon: 'ri-bank-line', color: 'text-gray-600' };
        return {
          method,
          label: config.label,
          icon: config.icon,
          color: config.color,
          accountName: config.accountName,
          count: data.count,
          amount: data.amount,
          received: data.received,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [realMoneyByMethod]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-verde-800 text-white px-4 md:px-6 py-3 flex items-center gap-3">
        <span className="w-8 h-8 flex items-center justify-center bg-verde-700 rounded-lg">
          <i className="ri-safe-2-line" />
        </span>
        <div>
          <h1 className="text-base font-bold">Caja del Día</h1>
          <p className="text-xs text-verde-300">Resumen de movimientos diarios · {new Date().toLocaleDateString('es-AR')}</p>
        </div>
        <div className="ml-auto">
          <button
            type="button"
            onClick={() => setShowArqueo(true)}
            className="flex items-center gap-2 px-3 py-2 bg-verde-700 hover:bg-verde-600 text-white text-sm rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-calculator-line" />
            Arqueo de caja
          </button>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Ventas Hoy</p>
            <p className="text-2xl font-bold text-gray-800">{todaySales.length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Ingresos Netos</p>
            <p className="text-2xl font-bold text-verde-700">${totalSales.toLocaleString('es-AR')}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Items Vendidos</p>
            <p className="text-2xl font-bold text-gray-800">{totalItems}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Ganancia Estimada</p>
            <p className="text-2xl font-bold text-naranja-600">${Math.round(totalProfit).toLocaleString('es-AR')}</p>
          </div>
        </div>

        {/* Methods with sales today — only today's amounts, no total balance */}
        {todayMethodSummary.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">Métodos de pago con ventas hoy</h3>
              <span className="text-xs text-gray-400">Solo ventas del día</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
              {todayMethodSummary.map((item) => (
                <div key={item.method} className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-8 h-8 flex items-center justify-center rounded-lg text-white text-sm ${
                      item.method === 'cash' ? 'bg-emerald-500' :
                      item.method === 'debit' ? 'bg-indigo-500' :
                      item.method === 'credit' ? 'bg-violet-500' :
                      item.method === 'transfer' ? 'bg-blue-500' :
                      'bg-sky-500'
                    }`}>
                      <i className={item.icon} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                      {item.accountName && (
                        <p className="text-xs text-gray-400">{item.accountName}</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Ventas hoy</span>
                      <span className="font-semibold text-verde-700">${item.amount.toLocaleString('es-AR')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Cantidad</span>
                      <span className="font-medium text-gray-700">{item.count} venta{item.count !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Recibido</span>
                      <span className="font-medium text-gray-700">${item.received.toLocaleString('es-AR')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Extra info row for cash received and change */}
        {todaySales.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Dinero Total Recibido</p>
              <p className="text-2xl font-bold text-gray-800">${totalReceived.toLocaleString('es-AR')}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Suma real de lo que pagaron los clientes</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Vuelto Entregado</p>
              <p className="text-2xl font-bold text-red-500">${totalChange.toLocaleString('es-AR')}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Diferencia entre recibido e ingreso neto</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Ingreso Neto = Recibido − Vuelto</p>
              <p className="text-xl font-bold text-verde-700">${totalSales.toLocaleString('es-AR')}</p>
            </div>
          </div>
        )}

        {/* Payment method breakdown with received amounts */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">Ingresos por método de pago</h3>
            <span className="text-xs text-gray-400">Incluye vueltos en efectivo</span>
          </div>
          {todaySales.length === 0 ? (
            <div className="p-8 text-center">
              <span className="w-12 h-12 flex items-center justify-center bg-gray-100 rounded-xl mx-auto mb-3">
                <i className="ri-safe-2-line text-2xl text-gray-400" />
              </span>
              <p className="text-sm text-gray-400">No hay ventas finalizadas hoy</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Método / Cuenta</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Ventas</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Total Ventas</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Recibido</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Vuelto</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Neto</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">% del Total</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(realMoneyByMethod)
                    .filter(([, data]) => data.count > 0)
                    .map(([method, data]) => {
                      const config = paymentLabels[method] || { label: method, icon: 'ri-bank-line', color: 'text-gray-600' };
                      const change = data.received - data.amount;
                      return (
                        <tr key={method} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className={`w-5 h-5 flex items-center justify-center ${config.color}`}>
                                <i className={config.icon} />
                              </span>
                              <div>
                                <span className="font-medium text-gray-800">{config.label}</span>
                                {config.accountName && (
                                  <span className="block text-[10px] text-gray-400">
                                    {config.accountName}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-600">{data.count}</td>
                          <td className="px-4 py-3 text-right font-medium text-gray-700">${data.amount.toLocaleString('es-AR')}</td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-800">${data.received.toLocaleString('es-AR')}</td>
                          <td className="px-4 py-3 text-right">
                            {change > 0 ? (
                              <span className="text-red-500 font-medium">${change.toLocaleString('es-AR')}</span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-verde-700">${data.amount.toLocaleString('es-AR')}</td>
                          <td className="px-4 py-3 text-right text-gray-600">{totalSales > 0 ? Math.round((data.amount / totalSales) * 100) : 0}%</td>
                        </tr>
                      );
                    })}
                </tbody>
                <tfoot className="bg-gray-50 border-t border-gray-200">
                  <tr>
                    <td className="px-4 py-3 font-semibold text-gray-800">Total</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-700">{todaySales.length}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-700">${totalSales.toLocaleString('es-AR')}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-800">${totalReceived.toLocaleString('es-AR')}</td>
                    <td className="px-4 py-3 text-right font-bold text-red-500">${totalChange.toLocaleString('es-AR')}</td>
                    <td className="px-4 py-3 text-right font-bold text-verde-800">${totalSales.toLocaleString('es-AR')}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-700">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Today's sales list */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">Detalle de ventas</h3>
          </div>
          {todaySales.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-gray-400">Aún no se han registrado ventas hoy</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Venta</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Hora</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Cliente</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Método / Cuenta</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Recibido</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Vuelto</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {todaySales.map((sale) => {
                    const time = new Date(sale.finalizedAt || sale.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
                    const config = paymentLabels[sale.paymentMethod] || { label: sale.paymentMethod, icon: 'ri-bank-line', color: 'text-gray-600' };
                    const received = sale.paymentMethod === 'cash' && sale.cashAmount ? sale.cashAmount : sale.finalAmount;
                    const change = sale.paymentMethod === 'cash' && sale.cashAmount ? sale.cashAmount - sale.finalAmount : 0;

                    return (
                      <tr key={sale.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-800 font-medium">{sale.id}</td>
                        <td className="px-4 py-3 text-gray-500">{time}</td>
                        <td className="px-4 py-3 text-gray-600">{sale.customerName || '—'}</td>
                        <td className="px-4 py-3">
                          <div>
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-md">
                              <span className={`w-3 h-3 flex items-center justify-center ${config.color}`}>
                                <i className={config.icon} />
                              </span>
                              {config.label}
                            </span>
                            {config.accountName && (
                              <span className="block text-[10px] text-gray-400 mt-0.5">
                                {config.accountName}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">${received.toLocaleString('es-AR')}</td>
                        <td className="px-4 py-3 text-right">
                          {change > 0 ? (
                            <span className="text-red-500 font-medium">${change.toLocaleString('es-AR')}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-verde-700">${sale.finalAmount.toLocaleString('es-AR')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Arqueo Modal — compares manual count against today's sales (not total account balance) */}
      {showArqueo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-800">Arqueo de Caja</h3>
                <p className="text-xs text-gray-500">{new Date().toLocaleDateString('es-AR')}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowArqueo(false)}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <i className="ri-close-line" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-600">
                Ingresá el dinero real que tenés. Se comparará contra las <strong>ventas de hoy</strong> registradas por método de pago.
              </p>

              {(
                [
                  { key: 'cash' as const, label: 'Caja Efectivo', icon: 'ri-money-dollar-circle-line', color: 'bg-emerald-50 text-emerald-600' },
                  { key: 'debit' as const, label: 'Tarjeta de Débito', icon: 'ri-bank-card-line', color: 'bg-blue-50 text-blue-600' },
                  { key: 'credit' as const, label: 'Tarjeta de Crédito', icon: 'ri-bank-card-2-line', color: 'bg-purple-50 text-purple-600' },
                  { key: 'transfer' as const, label: 'Cuenta Bancaria', icon: 'ri-arrow-left-right-line', color: 'bg-cyan-50 text-cyan-600' },
                  { key: 'mercado-pago' as const, label: 'Mercado Pago', icon: 'ri-wallet-3-line', color: 'bg-blue-50 text-blue-500' },
                ] as const
              ).map((field) => {
                const todaySalesAmount = realMoneyByMethod[field.key]?.amount ?? 0;
                const declared = arqueoTotals[field.key];
                const diff = declared - todaySalesAmount;
                const hasDiff = Math.abs(diff) > 0.01;

                return (
                  <div key={field.key} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-7 h-7 flex items-center justify-center rounded-md ${field.color}`}>
                          <i className={field.icon} />
                        </span>
                        <span className="text-sm font-medium text-gray-700">{field.label}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Ventas hoy: <strong className="text-gray-600">${todaySalesAmount.toLocaleString('es-AR')}</strong></p>
                        {hasDiff && (
                          <p className={`text-xs font-bold ${diff > 0 ? 'text-red-500' : 'text-red-500'}`}>
                            Diferencia: ${Math.abs(diff).toLocaleString('es-AR')} {diff > 0 ? '(sobra)' : '(falta)'}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500"
                        placeholder="Conteo manual..."
                        value={arqueo[field.key]}
                        onChange={(e) => handleArqueoChange(field.key, e.target.value)}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Total comparison */}
              <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Total ventas hoy (sistema)</p>
                  <p className="text-lg font-bold text-gray-800">${totalSales.toLocaleString('es-AR')}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Total arqueo manual</p>
                  <p className="text-lg font-bold text-gray-800">
                    ${Object.values(arqueoTotals).reduce((s, v) => s + v, 0).toLocaleString('es-AR')}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-gray-200 flex gap-2">
              <button
                type="button"
                onClick={handleSaveArqueo}
                className="flex-1 py-2.5 bg-verde-700 hover:bg-verde-800 text-white font-semibold rounded-xl transition-colors cursor-pointer text-sm whitespace-nowrap"
              >
                Guardar arqueo
              </button>
              <button
                type="button"
                onClick={() => setShowArqueo(false)}
                className="px-4 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer text-sm whitespace-nowrap"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}