import { useState, useEffect } from 'react';
import { useSalesStore } from '@/mocks/salesStore';

export default function AdminPage() {
  const { sales, confirmSale, finalizeSale, cancelSale, getPendingSales, getConfirmedSales, getFinalizedSales } = useSalesStore();
  const [activeTab, setActiveTab] = useState<'pending' | 'confirmed' | 'finalized'>('pending');
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [adminAmountPaid, setAdminAmountPaid] = useState('');
  const [showTicket, setShowTicket] = useState(false);

  const pendingSales = getPendingSales();
  const confirmedSales = getConfirmedSales();
  const finalizedSales = getFinalizedSales();

  const selectedSale = selectedSaleId ? sales.find((s) => s.id === selectedSaleId) : null;

  // Pre-fill amount paid from seller if available, or auto-fill for non-cash methods
  useEffect(() => {
    if (selectedSale) {
      if (selectedSale.paymentMethod === 'cash' && selectedSale.cashAmount !== undefined) {
        setAdminAmountPaid(selectedSale.cashAmount.toString());
      } else if (selectedSale.paymentMethod === 'cash') {
        setAdminAmountPaid('');
      } else {
        // For non-cash methods (debit, credit, transfer, mercadopago), payment is exact
        setAdminAmountPaid(selectedSale.finalAmount.toString());
      }
    } else {
      setAdminAmountPaid('');
    }
  }, [selectedSaleId, selectedSale]);

  const changeAmount = selectedSale && adminAmountPaid
    ? parseFloat(adminAmountPaid) - selectedSale.finalAmount
    : 0;

  const handleConfirm = () => {
    if (!selectedSale || !adminAmountPaid) return;
    const paid = parseFloat(adminAmountPaid);
    if (paid < selectedSale.finalAmount) return;
    confirmSale(selectedSale.id, paid, changeAmount);
    setShowTicket(true);
  };

  const handleFinalize = (saleId: string) => {
    finalizeSale(saleId);
    setShowTicket(false);
    setSelectedSaleId(null);
  };

  const handlePrint = () => {
    setShowTicket(false);
    if (selectedSale) {
      handleFinalize(selectedSale.id);
    }
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex items-center px-2 py-1 bg-yellow-50 text-yellow-700 text-xs font-medium rounded-md">Pendiente</span>;
      case 'confirmed':
        return <span className="inline-flex items-center px-2 py-1 bg-verde-50 text-verde-700 text-xs font-medium rounded-md">Confirmada</span>;
      case 'finalized':
        return <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-md">Finalizada</span>;
      default:
        return null;
    }
  };

  const tabCount = (tab: 'pending' | 'confirmed' | 'finalized') => {
    switch (tab) {
      case 'pending': return pendingSales.length;
      case 'confirmed': return confirmedSales.length;
      case 'finalized': return finalizedSales.length;
    }
  };

  const currentList = activeTab === 'pending' ? pendingSales : activeTab === 'confirmed' ? confirmedSales : finalizedSales;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sub-header */}
      <div className="bg-verde-800 text-white px-4 md:px-6 py-3 flex items-center gap-3">
        <span className="w-8 h-8 flex items-center justify-center bg-verde-700 rounded-lg">
          <i className="ri-shield-star-line" />
        </span>
        <div>
          <h1 className="text-base font-bold">Panel de Administración</h1>
          <p className="text-xs text-verde-300">Gestión completa del sistema</p>
        </div>
      </div>

      <div className="p-4 md:p-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Ventas Pendientes</p>
            <p className="text-2xl font-bold text-yellow-600">{pendingSales.length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Confirmadas Hoy</p>
            <p className="text-2xl font-bold text-verde-700">{confirmedSales.length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Finalizadas Hoy</p>
            <p className="text-2xl font-bold text-gray-600">{finalizedSales.length}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl w-fit">
          {(['pending', 'confirmed', 'finalized'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setActiveTab(tab);
                setSelectedSaleId(null);
                setShowTicket(false);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-white text-verde-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'pending' && 'Pendientes'}
              {tab === 'confirmed' && 'Confirmadas'}
              {tab === 'finalized' && 'Finalizadas'}
              <span className="ml-1.5 text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">{tabCount(tab)}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sales list */}
          <div className="flex-1">
            {currentList.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
                <span className="w-12 h-12 flex items-center justify-center bg-gray-100 rounded-xl mx-auto mb-3">
                  <i className="ri-inbox-line text-2xl text-gray-400" />
                </span>
                <p className="text-gray-500 text-sm">
                  {activeTab === 'pending' && 'No hay ventas pendientes'}
                  {activeTab === 'confirmed' && 'No hay ventas confirmadas'}
                  {activeTab === 'finalized' && 'No hay ventas finalizadas'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {currentList.map((sale) => (
                  <button
                    key={sale.id}
                    type="button"
                    onClick={() => {
                      setSelectedSaleId(sale.id);
                      setShowTicket(false);
                    }}
                    className={`w-full text-left bg-white border rounded-xl p-4 transition-all cursor-pointer ${
                      selectedSaleId === sale.id
                        ? 'border-verde-500 ring-1 ring-verde-500'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-800">{sale.id}</span>
                        {getStatusBadge(sale.status)}
                      </div>
                      <span className="text-xs text-gray-400">{formatDate(sale.createdAt)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="text-gray-500">
                        {sale.customerName ? `Cliente: ${sale.customerName}` : 'Cliente: —'}
                        <span className="mx-2 text-gray-300">|</span>
                        <span className="text-gray-500">{sale.paymentMethodLabel}</span>
                        {sale.installments > 1 && (
                          <span className="text-naranja-600 ml-1">({sale.installments} cuotas)</span>
                        )}
                      </div>
                      <span className="font-bold text-verde-700">${sale.finalAmount.toLocaleString('es-AR')}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{sale.items.length} producto(s) — {sale.origin === 'retail' ? 'Minorista' : 'Mayorista'}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sale detail */}
          {selectedSale && (
            <div className="w-full lg:w-[400px] space-y-4">
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">Detalle de la venta</h3>
                <div className="space-y-2 mb-4">
                  {selectedSale.items.map((item, idx) => {
                    const qty = item.weightKg ?? item.quantity;
                    return (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          {item.product.name} × {qty}{item.product.unit === 'kg' ? 'kg' : ''}
                        </span>
                        <span className="text-gray-800 font-medium">
                          ${(item.product.retailPrice * qty).toLocaleString('es-AR')}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="border-t border-gray-100 pt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="text-gray-700">${selectedSale.subtotal.toLocaleString('es-AR')}</span>
                  </div>
                  {selectedSale.interestAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Interés ({selectedSale.interestRate}%)</span>
                      <span className="text-naranja-600">+${selectedSale.interestAmount.toLocaleString('es-AR')}</span>
                    </div>
                  )}
                  {selectedSale.fixedFeeAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Comisión</span>
                      <span className="text-naranja-600">+${selectedSale.fixedFeeAmount.toLocaleString('es-AR')}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base pt-1 border-t border-gray-100">
                    <span>Total</span>
                    <span className="text-verde-700">${selectedSale.finalAmount.toLocaleString('es-AR')}</span>
                  </div>
                </div>
              </div>

              {selectedSale.status === 'pending' && (
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">Confirmar pago</h3>
                  <div className="space-y-3">
                    {/* Seller cash amount info */}
                    {selectedSale.cashAmount !== undefined && selectedSale.paymentMethod === 'cash' && (
                      <div className="bg-verde-50 rounded-lg p-3">
                        <p className="text-xs text-verde-700 font-semibold mb-1">Monto indicado por el vendedor</p>
                        <p className="text-lg font-bold text-verde-800">
                          ${selectedSale.cashAmount.toLocaleString('es-AR')}
                        </p>
                        <p className="text-xs text-verde-600 mt-1">
                          Vuelto a entregar: ${Math.round((selectedSale.cashAmount ?? 0) - selectedSale.finalAmount).toLocaleString('es-AR')}
                        </p>
                      </div>
                    )}

                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">
                        {selectedSale.cashAmount !== undefined
                          ? 'Verificar / ajustar monto recibido'
                          : 'Monto recibido'}
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                        <input
                          type="number"
                          min={selectedSale.finalAmount}
                          value={adminAmountPaid}
                          onChange={(e) => setAdminAmountPaid(e.target.value)}
                          className="w-full pl-7 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500"
                          placeholder={selectedSale.finalAmount.toString()}
                        />
                      </div>
                    </div>
                    {adminAmountPaid && parseFloat(adminAmountPaid) >= selectedSale.finalAmount && (
                      <div className="bg-verde-50 rounded-lg p-3">
                        <p className="text-sm text-verde-800 font-medium">
                          Vuelto a entregar: <strong>${Math.round(changeAmount).toLocaleString('es-AR')}</strong>
                        </p>
                      </div>
                    )}
                    {adminAmountPaid && parseFloat(adminAmountPaid) < selectedSale.finalAmount && (
                      <p className="text-xs text-red-500">El monto recibido es menor al total</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={!adminAmountPaid || parseFloat(adminAmountPaid) < selectedSale.finalAmount}
                        onClick={handleConfirm}
                        className="flex-1 py-2.5 bg-verde-700 hover:bg-verde-800 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold rounded-xl transition-colors cursor-pointer text-sm whitespace-nowrap"
                      >
                        Confirmar pago
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          cancelSale(selectedSale.id);
                          setSelectedSaleId(null);
                        }}
                        className="px-4 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer text-sm whitespace-nowrap"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {selectedSale.status === 'confirmed' && !showTicket && (
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">Acciones</h3>
                  <div className="space-y-2">
                    <div className="bg-gray-50 rounded-lg p-3 text-sm">
                      <p className="text-gray-600">Monto recibido: <strong className="text-gray-800">${selectedSale.amountPaid?.toLocaleString('es-AR')}</strong></p>
                      <p className="text-gray-600">Vuelto: <strong className="text-verde-700">${selectedSale.changeAmount?.toLocaleString('es-AR')}</strong></p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowTicket(true)}
                      className="w-full py-2.5 bg-naranja-500 hover:bg-naranja-600 text-white font-semibold rounded-xl transition-colors cursor-pointer text-sm whitespace-nowrap"
                    >
                      <span className="flex items-center justify-center gap-2">
                        <i className="ri-printer-line" />
                        Imprimir ticket
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFinalize(selectedSale.id)}
                      className="w-full py-2.5 bg-verde-700 hover:bg-verde-800 text-white font-semibold rounded-xl transition-colors cursor-pointer text-sm whitespace-nowrap"
                    >
                      Finalizar sin imprimir
                    </button>
                  </div>
                </div>
              )}

              {showTicket && selectedSale && (
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                    <div className="text-center mb-4">
                      <p className="text-lg font-bold text-gray-800">Gestión Pro</p>
                      <p className="text-xs text-gray-500">Fiambrería</p>
                      <p className="text-xs text-gray-400 mt-1">{formatDate(selectedSale.createdAt)}</p>
                    </div>
                    <div className="border-t border-b border-gray-300 py-2 space-y-1">
                      {selectedSale.items.map((item, idx) => {
                        const qty = item.weightKg ?? item.quantity;
                        return (
                          <div key={idx} className="flex justify-between text-xs">
                            <span className="text-gray-700">{item.product.name} × {qty}</span>
                            <span className="text-gray-800 font-medium">${(item.product.retailPrice * qty).toLocaleString('es-AR')}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="py-2 space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Subtotal</span>
                        <span>${selectedSale.subtotal.toLocaleString('es-AR')}</span>
                      </div>
                      {selectedSale.interestAmount > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Interés</span>
                          <span>+${selectedSale.interestAmount.toLocaleString('es-AR')}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-sm">
                        <span>TOTAL</span>
                        <span>${selectedSale.finalAmount.toLocaleString('es-AR')}</span>
                      </div>
                    </div>
                    <div className="border-t border-gray-300 pt-2 text-xs space-y-0.5">
                      <p className="text-gray-500">Pago: {selectedSale.paymentMethodLabel}</p>
                      <p className="text-gray-500">Recibido: ${selectedSale.amountPaid?.toLocaleString('es-AR')}</p>
                      <p className="text-gray-500">Vuelto: ${selectedSale.changeAmount?.toLocaleString('es-AR')}</p>
                      {selectedSale.customerName && (
                        <p className="text-gray-500">Cliente: {selectedSale.customerName}</p>
                      )}
                    </div>
                    <div className="text-center mt-4">
                      <p className="text-[10px] text-gray-400">¡Gracias por su compra!</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="w-full mt-3 py-2.5 bg-verde-700 hover:bg-verde-800 text-white font-semibold rounded-xl transition-colors cursor-pointer text-sm whitespace-nowrap"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <i className="ri-check-line" />
                      Ticket impreso — Finalizar venta
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}