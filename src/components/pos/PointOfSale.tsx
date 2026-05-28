import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { products } from '@/mocks/products';
import { paymentMethods } from '@/mocks/paymentConfig';
import { calculateDiscounts } from '@/mocks/pricingRules';
import type { Product } from '@/mocks/products';
import type { PaymentMethodConfig } from '@/mocks/paymentConfig';
import type { AppliedDiscount } from '@/mocks/pricingRules';
import { useSalesStore } from '@/mocks/salesStore';
import { loadProducts } from '@/mocks/productsStore';
import type { CartItem } from '@/mocks/salesStore';

interface MixedPayment {
  cash: number;
  debit: number;
  transfer: number;
  mercadoPago: number;
}

interface PointOfSaleProps {
  mode: 'retail' | 'wholesale';
  title: string;
  subtitle: string;
  icon: string;
}

export default function PointOfSale({ mode, title, subtitle, icon }: PointOfSaleProps) {
  const navigate = useNavigate();
  const { addSale } = useSalesStore();

  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [clientName, setClientName] = useState('');

  const [selectedPayment, setSelectedPayment] = useState<PaymentMethodConfig | null>(null);
  const [selectedInstallments, setSelectedInstallments] = useState(1);
  const [mixedPayment, setMixedPayment] = useState<MixedPayment>({ cash: 0, debit: 0, transfer: 0, mercadoPago: 0 });
  const [cashAmount, setCashAmount] = useState('');
  const [sentSuccess, setSentSuccess] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);

  const priceField = mode === 'retail' ? 'retailPrice' : 'wholesalePrice';

  // Calculate discounts based on pricing rules
  const appliedDiscounts = useMemo<AppliedDiscount[]>(() => {
    return calculateDiscounts(cart, mode, priceField);
  }, [cart, mode, priceField]);

  const totalDiscount = useMemo(() => {
    return appliedDiscounts.reduce((sum, d) => sum + d.amount, 0);
  }, [appliedDiscounts]);

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return [];
    const term = search.toLowerCase();
    return loadProducts().filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.code.toLowerCase().includes(term) ||
        p.barcode.includes(term) ||
        p.pluCode.toLowerCase().includes(term)
    ).slice(0, 8);
  }, [search]);

  const addToCart = (product: Product, weightKg?: number) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1, weightKg }];
    });
    setSearch('');
    setShowDropdown(false);
    searchRef.current?.focus();
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((item) => item.product.id !== productId));
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const updateWeight = (productId: string, weightKg: number) => {
    if (weightKg <= 0) {
      setCart((prev) => prev.filter((item) => item.product.id !== productId));
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, weightKg } : item
      )
    );
  };

  const removeItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setClientName('');
    setSelectedPayment(null);
    setSelectedInstallments(1);
    setMixedPayment({ cash: 0, debit: 0, transfer: 0, mercadoPago: 0 });
    setCashAmount('');
  };

  const rawSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const price = item.product[priceField as keyof Product] as number;
      if (item.product.unit === 'kg' && item.weightKg) {
        return sum + price * item.weightKg;
      }
      return sum + price * item.quantity;
    }, 0);
  }, [cart, priceField]);

  const subtotal = rawSubtotal - totalDiscount;
  const hasItems = cart.length > 0;

  const interestConfig = useMemo(() => {
    if (!selectedPayment || !selectedPayment.hasInstallments) return null;
    return selectedPayment.installments.find((i) => i.installments === selectedInstallments);
  }, [selectedPayment, selectedInstallments]);

  const interestAmount = useMemo(() => {
    if (!interestConfig) return 0;
    return Math.round(subtotal * (interestConfig.interestRate / 100));
  }, [subtotal, interestConfig]);

  const fixedFeeAmount = useMemo(() => {
    if (!selectedPayment) return 0;
    return Math.round(subtotal * (selectedPayment.fixedFeePercent / 100));
  }, [subtotal, selectedPayment]);

  const mixedTotal = useMemo(() => {
    if (selectedPayment?.method !== 'mixed') return 0;
    return mixedPayment.cash + mixedPayment.debit + mixedPayment.transfer + mixedPayment.mercadoPago;
  }, [mixedPayment, selectedPayment]);

  const finalAmount = useMemo(() => {
    if (selectedPayment?.method === 'mixed') {
      return subtotal;
    }
    return subtotal + interestAmount + fixedFeeAmount;
  }, [subtotal, interestAmount, fixedFeeAmount, selectedPayment]);

  // Cash change calculation for the seller to preview
  const cashChange = useMemo(() => {
    if (selectedPayment?.method !== 'cash' || !cashAmount) return 0;
    const paid = parseFloat(cashAmount) || 0;
    return paid - finalAmount;
  }, [selectedPayment, cashAmount, finalAmount]);

  const handleSendToAdmin = () => {
    if (!hasItems || !selectedPayment) return;

    const paymentConfig = selectedPayment;
    const installmentConfig = paymentConfig.hasInstallments
      ? paymentConfig.installments.find((i) => i.installments === selectedInstallments)
      : null;

    const cashPaid = selectedPayment.method === 'cash'
      ? parseFloat(cashAmount) || finalAmount
      : undefined;

    addSale({
      items: [...cart],
      customerName: clientName,
      paymentMethod: paymentConfig.method,
      paymentMethodLabel: paymentConfig.label,
      installments: selectedInstallments,
      interestRate: installmentConfig?.interestRate ?? 0,
      fixedFeePercent: paymentConfig.fixedFeePercent,
      subtotal: rawSubtotal,
      interestAmount,
      fixedFeeAmount,
      finalAmount,
      origin: mode,
      sellerName: 'Usuario',
      cashAmount: cashPaid,
      mixedPayment: selectedPayment.method === 'mixed' ? mixedPayment : undefined,
    });

    setSentSuccess(true);
    setTimeout(() => {
      setSentSuccess(false);
      clearCart();
    }, 2000);
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.search-container')) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sub-header */}
      <div className="bg-verde-800 text-white px-4 md:px-6 py-3 flex items-center gap-3">
        <span className="w-8 h-8 flex items-center justify-center bg-verde-700 rounded-lg">
          <i className={icon} />
        </span>
        <div>
          <h1 className="text-base font-bold">{title}</h1>
          <p className="text-xs text-verde-300">{subtitle}</p>
        </div>
        <div className="ml-auto text-right hidden sm:block">
          <p className="text-xs text-verde-300">Vendedor</p>
          <p className="text-sm font-semibold">Usuario</p>
        </div>
      </div>

      {/* Success toast */}
      {sentSuccess && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-verde-700 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-bounce">
          <i className="ri-check-line" />
          <span className="text-sm font-medium">Venta enviada a ADMIN correctamente</span>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col lg:flex-row h-[calc(100vh-7rem)]">
        {/* Left panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search */}
          <div className="p-4 bg-white border-b border-gray-200">
            <div className="relative search-container">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-gray-400">
                <i className="ri-search-line text-lg" />
              </span>
              <input
                ref={searchRef}
                type="text"
                placeholder="Buscar por nombre, código, barcode o PLU..."
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-verde-500 focus:border-verde-500 transition-all"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && filteredProducts.length > 0) {
                    addToCart(filteredProducts[0]);
                  }
                }}
              />
              {/* Dropdown */}
              {showDropdown && filteredProducts.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-30 max-h-72 overflow-y-auto">
                  {filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center justify-between border-b border-gray-100 last:border-0 cursor-pointer"
                      onClick={() => addToCart(product)}
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-800">{product.name}</p>
                        <p className="text-xs text-gray-400">{product.code} | {product.barcode} | {product.pluCode} — {product.category} — Stock: {product.currentStock}{product.unit}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-verde-700">${(product[priceField as keyof Product] as number).toLocaleString('es-AR')}/{product.unit}</p>
                        <p className="text-[10px] text-gray-400">Costo: ${product.purchasePrice.toLocaleString('es-AR')}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {showDropdown && search.trim() && filteredProducts.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-30 px-4 py-3">
                  <p className="text-sm text-gray-400">Producto no encontrado</p>
                  <button
                    type="button"
                    onClick={() => navigate('/productos')}
                    className="mt-2 text-xs text-verde-600 hover:text-verde-800 font-medium cursor-pointer"
                  >
                    Crear producto rápido →
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Cart area */}
          <div className="flex-1 overflow-y-auto p-4">
            {!hasItems ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-16">
                <span className="w-16 h-16 flex items-center justify-center bg-gray-100 rounded-2xl mb-4">
                  <i className="ri-shopping-cart-line text-3xl text-gray-400" />
                </span>
                <p className="text-gray-500 font-medium">Carrito vacío</p>
                <p className="text-sm text-gray-400 mt-1">Buscá un producto para agregar</p>
                <p className="text-xs text-gray-400 mt-2">También podés escanear el código de barras o PLU</p>
              </div>
            ) : (
              <div className="space-y-3 max-w-3xl">
                {cart.map((item) => {
                  const isWeighted = item.product.unit === 'kg';
                  const price = item.product[priceField as keyof Product] as number;
                  const effectiveQty = isWeighted && item.weightKg ? item.weightKg : item.quantity;
                  const lineTotal = price * effectiveQty;

                  return (
                    <div
                      key={item.product.id}
                      className="bg-white border border-gray-200 rounded-xl p-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{item.product.name}</p>
                          <p className="text-xs text-gray-400">{item.product.code} — ${price.toLocaleString('es-AR')}/{item.product.unit}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 cursor-pointer"
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          >
                            <i className="ri-subtract-line" />
                          </button>
                          <span className="w-10 text-center text-sm font-medium text-gray-700">{item.quantity}</span>
                          <button
                            type="button"
                            className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 cursor-pointer"
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          >
                            <i className="ri-add-line" />
                          </button>
                        </div>
                        <div className="text-right min-w-[80px]">
                          <p className="text-sm font-semibold text-gray-800">${lineTotal.toLocaleString('es-AR')}</p>
                        </div>
                        <button
                          type="button"
                          className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors cursor-pointer"
                          onClick={() => removeItem(item.product.id)}
                        >
                          <i className="ri-delete-bin-line" />
                        </button>
                      </div>
                      {isWeighted && (
                        <div className="mt-3 flex items-center gap-3 pt-3 border-t border-gray-100">
                          <span className="text-xs text-gray-500">Peso:</span>
                          <input
                            type="number"
                            step="0.001"
                            min="0.001"
                            value={item.weightKg ?? item.quantity}
                            onChange={(e) => updateWeight(item.product.id, parseFloat(e.target.value) || 0)}
                            className="w-24 px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500"
                          />
                          <span className="text-xs text-gray-400">kg</span>
                          {item.weightKg && (
                            <span className="text-xs text-verde-600 font-medium ml-auto">
                              {item.weightKg} kg × ${price.toLocaleString('es-AR')} = ${lineTotal.toLocaleString('es-AR')}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="w-full lg:w-[420px] xl:w-[460px] bg-white border-t lg:border-t-0 lg:border-l border-gray-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Datos de la venta</h2>
            <input
              type="text"
              placeholder="Cliente (opcional)"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {hasItems && (
              <>
                {/* Totals */}
                <div className="space-y-2 bg-gray-50 rounded-lg p-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="font-medium text-gray-700">${rawSubtotal.toLocaleString('es-AR')}</span>
                  </div>
                  {totalDiscount > 0 && (
                    <div className="space-y-1">
                      {appliedDiscounts.map((d) => (
                        <div key={d.ruleId} className="flex justify-between text-sm">
                          <span className="text-verde-600">{d.ruleName}</span>
                          <span className="font-medium text-verde-700">-${d.amount.toLocaleString('es-AR')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex justify-between text-sm border-t border-gray-200 pt-1">
                    <span className="text-gray-700 font-medium">Subtotal con descuentos</span>
                    <span className="font-bold text-gray-800">${subtotal.toLocaleString('es-AR')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Items</span>
                    <span className="font-medium text-gray-700">{cart.reduce((sum, i) => sum + i.quantity, 0)}</span>
                  </div>
                  {interestAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Interés ({interestConfig?.interestRate}%)</span>
                      <span className="font-medium text-naranja-600">+${interestAmount.toLocaleString('es-AR')}</span>
                    </div>
                  )}
                  {fixedFeeAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Comisión ({selectedPayment?.fixedFeePercent}%)</span>
                      <span className="font-medium text-naranja-600">+${fixedFeeAmount.toLocaleString('es-AR')}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 pt-2 mt-1">
                    <div className="flex justify-between">
                      <span className="text-base font-bold text-gray-800">Total</span>
                      <span className="text-base font-bold text-verde-700">${finalAmount.toLocaleString('es-AR')}</span>
                    </div>
                  </div>
                </div>

                {/* Payment methods */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Método de pago</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {paymentMethods.map((method) => (
                      <button
                        key={method.method}
                        type="button"
                        onClick={() => {
                          setSelectedPayment(method);
                          setSelectedInstallments(1);
                          setCashAmount('');
                        }}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all border cursor-pointer whitespace-nowrap ${
                          selectedPayment?.method === method.method
                            ? 'border-verde-500 bg-verde-50 text-verde-800'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <span className="w-4 h-4 flex items-center justify-center">
                          <i className={method.icon} />
                        </span>
                        {method.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cash amount input */}
                {selectedPayment?.method === 'cash' && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Monto recibido</h3>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <input
                        type="number"
                        min={finalAmount}
                        value={cashAmount}
                        onChange={(e) => setCashAmount(e.target.value)}
                        className="w-full pl-7 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500"
                        placeholder={`Mínimo $${finalAmount.toLocaleString('es-AR')}`}
                      />
                    </div>
                    {cashAmount && (
                      <div className="mt-2">
                        {parseFloat(cashAmount) >= finalAmount ? (
                          <div className="bg-verde-50 rounded-lg p-2.5">
                            <p className="text-sm text-verde-800 font-medium">
                              Vuelto a entregar: <strong>${Math.round(cashChange).toLocaleString('es-AR')}</strong>
                            </p>
                            <p className="text-[10px] text-verde-600 mt-0.5">
                              El admin verá este monto y el vuelto al confirmar
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-red-500">
                            El monto recibido es menor al total (${finalAmount.toLocaleString('es-AR')})
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Installments */}
                {selectedPayment?.hasInstallments && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Cuotas</h3>
                    <div className="flex gap-2 flex-wrap">
                      {selectedPayment.installments.map((inst) => (
                        <button
                          key={inst.installments}
                          type="button"
                          onClick={() => setSelectedInstallments(inst.installments)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border cursor-pointer ${
                            selectedInstallments === inst.installments
                              ? 'border-verde-500 bg-verde-50 text-verde-800'
                              : 'border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          {inst.installments === 1 ? '1 pago' : `${inst.installments} cuotas`}
                          {inst.interestRate > 0 && (
                            <span className="block text-[10px] font-normal text-naranja-600">+{inst.interestRate}% int.</span>
                          )}
                        </button>
                      ))}
                    </div>
                    {interestConfig && interestConfig.interestRate > 0 && (
                      <p className="text-xs text-gray-500 mt-2">
                        Monto final con interés: <strong className="text-verde-700">${finalAmount.toLocaleString('es-AR')}</strong>
                        <span className="block text-[10px] text-gray-400 mt-0.5">
                          {selectedInstallments} pago{selectedInstallments > 1 ? 's' : ''} de ${Math.round(finalAmount / selectedInstallments).toLocaleString('es-AR')}
                        </span>
                      </p>
                    )}
                  </div>
                )}

                {/* Mixed payment */}
                {selectedPayment?.method === 'mixed' && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Detalle del pago mixto</h3>
                    <div className="space-y-2">
                      {[
                        { key: 'cash' as const, label: 'Efectivo', icon: 'ri-money-dollar-circle-line' },
                        { key: 'debit' as const, label: 'Débito', icon: 'ri-bank-card-line' },
                        { key: 'transfer' as const, label: 'Transferencia', icon: 'ri-arrow-left-right-line' },
                        { key: 'mercadoPago' as const, label: 'Mercado Pago', icon: 'ri-wallet-3-line' },
                      ].map((field) => (
                        <div key={field.key} className="flex items-center gap-3">
                          <span className="w-5 h-5 flex items-center justify-center text-gray-400">
                            <i className={field.icon} />
                          </span>
                          <span className="text-sm text-gray-600 w-28">{field.label}</span>
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                            <input
                              type="number"
                              min="0"
                              className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500"
                              value={mixedPayment[field.key] || ''}
                              onChange={(e) =>
                                setMixedPayment((prev) => ({
                                  ...prev,
                                  [field.key]: parseFloat(e.target.value) || 0,
                                }))
                              }
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-gray-100">
                      <span className="text-gray-500">Total ingresado</span>
                      <span className={`font-semibold ${mixedTotal === subtotal ? 'text-verde-700' : 'text-naranja-600'}`}>
                        ${mixedTotal.toLocaleString('es-AR')}
                      </span>
                    </div>
                    {mixedTotal !== subtotal && (
                      <p className="text-xs text-naranja-600">
                        {mixedTotal > subtotal
                          ? `Sobran $${(mixedTotal - subtotal).toLocaleString('es-AR')} (vuelto)`
                          : `Faltan $${(subtotal - mixedTotal).toLocaleString('es-AR')}`}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="p-4 border-t border-gray-100 space-y-2">
            <button
              type="button"
              disabled={
                !hasItems ||
                !selectedPayment ||
                (selectedPayment.method === 'mixed' && mixedTotal < subtotal) ||
                (selectedPayment.method === 'cash' && (!cashAmount || parseFloat(cashAmount) < finalAmount))
              }
              onClick={handleSendToAdmin}
              className="w-full py-3 bg-verde-700 hover:bg-verde-800 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap text-sm"
            >
              <span className="flex items-center justify-center gap-2">
                <i className="ri-send-plane-line" />
                Enviar a ADMIN
              </span>
            </button>
            <button
              type="button"
              disabled={!hasItems}
              onClick={clearCart}
              className="w-full py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 font-medium rounded-xl transition-colors cursor-pointer whitespace-nowrap text-sm"
            >
              Cancelar venta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}