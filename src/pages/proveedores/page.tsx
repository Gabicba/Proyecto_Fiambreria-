import { useState, useMemo, useCallback } from 'react';
import {
  loadProducts,
  type Product,
} from '@/mocks/productsStore';
import {
  getSuppliers,
  addSupplier,
  updateSupplier,
  deleteSupplier,
  type Supplier,
} from '@/mocks/suppliers';
import {
  addPayment,
  loadPayments,
  getTotalPaidToSupplier,
  deletePayment,
  loadCategories,
  addCategory,
  updatePayment,
  type SupplierPayment,
} from '@/mocks/supplierPayments';
import { addMovement } from '@/mocks/treasury';
import {
  addAccountMovement,
  deleteAccountMovement,
  getAccountByMethodKey,
} from '@/mocks/accounts';

interface SupplierSummary {
  supplier: Supplier;
  productCount: number;
  totalStock: number;
  totalPurchaseValue: number;
  totalRetailValue: number;
  products: Product[];
  totalPaid: number;
  payments: SupplierPayment[];
}

const emptyForm = {
  name: '',
  contactName: '',
  phone: '',
  email: '',
  address: '',
  cuit: '',
  notes: '',
};

const emptyNewSupplier = {
  name: '',
  contactName: '',
  phone: '',
  cuit: '',
};

const paymentMethods = [
  'Efectivo',
  'Transferencia',
  'Cheque',
  'Débito',
  'Crédito',
  'Mercado Pago',
];

const fundSources = [
  'Caja Minorista',
  'Caja Mayorista',
  'Tesorería',
];

const todayStr = () => {
  const d = new Date();
  return d.toISOString().split('T')[0];
};

export default function Proveedores() {
  const [suppliersList, setSuppliersList] = useState<Supplier[]>(getSuppliers);
  const [allPayments, setAllPayments] = useState<SupplierPayment[]>(loadPayments);
  const [categories, setCategories] = useState<string[]>(loadCategories);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentSupplierId, setPaymentSupplierId] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [paymentSource, setPaymentSource] = useState('Tesorería');
  const [paymentDate, setPaymentDate] = useState(todayStr());
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentCategory, setPaymentCategory] = useState('');
  const [expandedSupplier, setExpandedSupplier] = useState<string | null>(null);
  const [confirmDeletePayment, setConfirmDeletePayment] = useState<string | null>(null);

  // Inline new supplier within payment modal
  const [showNewSupplierInline, setShowNewSupplierInline] = useState(false);
  const [newSupplierForm, setNewSupplierForm] = useState(emptyNewSupplier);

  // Inline new category within payment modal
  const [showNewCategoryInline, setShowNewCategoryInline] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const refreshSuppliers = useCallback(() => {
    setSuppliersList(getSuppliers());
    setCategories(loadCategories());
  }, []);

  const refreshPayments = useCallback(() => {
    setAllPayments(loadPayments());
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (supplier: Supplier) => {
    setEditingId(supplier.id);
    setForm({
      name: supplier.name,
      contactName: supplier.contactName,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      cuit: supplier.cuit,
      notes: supplier.notes,
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    if (editingId) {
      updateSupplier(editingId, form);
    } else {
      addSupplier(form);
    }
    refreshSuppliers();
    setShowModal(false);
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    deleteSupplier(id);
    refreshSuppliers();
    setConfirmDelete(null);
  };

  const openPayment = (supplierId?: string) => {
    setPaymentSupplierId(supplierId || '');
    setPaymentAmount('');
    setPaymentMethod('Efectivo');
    setPaymentSource('Tesorería');
    setPaymentDate(todayStr());
    setPaymentNotes('');
    setPaymentCategory('');
    setShowNewSupplierInline(false);
    setNewSupplierForm(emptyNewSupplier);
    setShowNewCategoryInline(false);
    setNewCategoryName('');
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) return;

    let supplier: Supplier | undefined;

    // If creating inline new supplier
    if (showNewSupplierInline) {
      if (!newSupplierForm.name.trim()) return;
      const created = addSupplier({
        name: newSupplierForm.name.trim(),
        contactName: newSupplierForm.contactName.trim(),
        phone: newSupplierForm.phone.trim(),
        email: '',
        address: '',
        cuit: newSupplierForm.cuit.trim(),
        notes: '',
      });
      supplier = created;
      refreshSuppliers();
    } else {
      if (!paymentSupplierId) return;
      supplier = suppliersList.find((s) => s.id === paymentSupplierId);
    }

    if (!supplier) return;

    // Handle new category
    let finalCategory = paymentCategory;
    if (showNewCategoryInline && newCategoryName.trim()) {
      const updatedCategories = addCategory(newCategoryName.trim());
      setCategories(updatedCategories);
      finalCategory = newCategoryName.trim();
    }

    const newPayment = addPayment({
      supplierId: supplier.id,
      supplierName: supplier.name,
      amount,
      paymentMethod,
      source: paymentSource,
      date: new Date(paymentDate).toISOString(),
      notes: paymentNotes,
      category: finalCategory,
    });

    // Register in treasury accounts — map payment method to account method key
    const methodKeyMap: Record<string, string> = {
      'Efectivo': 'cash',
      'Transferencia': 'transfer',
      'Cheque': 'cheque',
      'Débito': 'debit',
      'Crédito': 'credit',
      'Mercado Pago': 'mercado-pago',
    };
    const methodKey = methodKeyMap[paymentMethod];
    const account = methodKey ? getAccountByMethodKey(methodKey) : undefined;

    if (account) {
      const movement = addAccountMovement({
        accountId: account.id,
        accountName: account.name,
        type: 'out',
        amount,
        description: `Pago a ${supplier.name}${finalCategory ? ' — ' + finalCategory : ''} — Fuente: ${paymentSource}${paymentNotes ? ' — ' + paymentNotes : ''}`,
        date: new Date(paymentDate).toISOString(),
      });
      updatePayment(newPayment.id, { accountMovementId: movement.id });
    }

    // Also register in legacy treasury for backward compatibility
    addMovement({
      type: 'out',
      category: 'supplier',
      amount,
      description: `Pago a ${supplier.name}${finalCategory ? ' — ' + finalCategory : ''} — ${paymentMethod} — Fuente: ${paymentSource}${paymentNotes ? ' — ' + paymentNotes : ''}`,
    });

    refreshPayments();
    setShowPaymentModal(false);
    setExpandedSupplier(supplier.id);
  };

  const handleDeletePayment = (paymentId: string) => {
    const payment = allPayments.find((p) => p.id === paymentId);
    if (payment?.accountMovementId) {
      deleteAccountMovement(payment.accountMovementId);
    }
    deletePayment(paymentId);
    refreshPayments();
    setConfirmDeletePayment(null);
  };

  const filteredSuppliers = useMemo(() => {
    if (!search.trim()) return suppliersList;
    const term = search.toLowerCase();
    return suppliersList.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        s.contactName.toLowerCase().includes(term) ||
        s.phone.includes(term) ||
        s.cuit.includes(term)
    );
  }, [suppliersList, search]);

  const supplierSummaries = useMemo(() => {
    const map: Record<string, SupplierSummary> = {};

    filteredSuppliers.forEach((supplier) => {
      map[supplier.name] = {
        supplier,
        productCount: 0,
        totalStock: 0,
        totalPurchaseValue: 0,
        totalRetailValue: 0,
        products: [],
        totalPaid: getTotalPaidToSupplier(supplier.id),
        payments: allPayments.filter((p) => p.supplierId === supplier.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      };
    });

    loadProducts().forEach((p) => {
      const summary = map[p.supplier];
      if (summary) {
        summary.productCount += 1;
        summary.totalStock += p.currentStock;
        summary.totalPurchaseValue += p.purchasePrice * p.currentStock;
        summary.totalRetailValue += p.retailPrice * p.currentStock;
        summary.products.push(p);
      }
    });

    return Object.values(map).sort((a, b) => b.totalRetailValue - a.totalRetailValue);
  }, [filteredSuppliers, allPayments]);

  const totalPurchaseValue = supplierSummaries.reduce((s, sup) => s + sup.totalPurchaseValue, 0);
  const totalRetailValue = supplierSummaries.reduce((s, sup) => s + sup.totalRetailValue, 0);
  const totalPaidAll = supplierSummaries.reduce((s, sup) => s + sup.totalPaid, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-verde-800 text-white px-4 md:px-6 py-3 flex items-center gap-3">
        <span className="w-8 h-8 flex items-center justify-center bg-verde-700 rounded-lg">
          <i className="ri-truck-line" />
        </span>
        <div>
          <h1 className="text-base font-bold">Proveedores</h1>
          <p className="text-xs text-verde-300">Gestión de proveedores, pagos y productos asociados</p>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-6">
        {/* Summary + actions */}
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Proveedores</p>
              <p className="text-2xl font-bold text-gray-800">{suppliersList.length}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Valor Inventario (Costo)</p>
              <p className="text-2xl font-bold text-verde-700">${totalPurchaseValue.toLocaleString('es-AR')}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Valor Inventario (Venta)</p>
              <p className="text-2xl font-bold text-naranja-600">${totalRetailValue.toLocaleString('es-AR')}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Total Pagado a Proveedores</p>
              <p className="text-2xl font-bold text-gray-800">${totalPaidAll.toLocaleString('es-AR')}</p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => openPayment()}
              className="flex items-center gap-2 px-4 py-2.5 bg-naranja-600 hover:bg-naranja-700 text-white text-sm font-medium rounded-xl transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-money-dollar-circle-line" />
              Registrar pago
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2.5 bg-verde-700 hover:bg-verde-800 text-white text-sm font-medium rounded-xl transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-add-line" />
              Agregar proveedor
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-gray-400">
            <i className="ri-search-line" />
          </span>
          <input
            type="text"
            placeholder="Buscar proveedor por nombre, contacto, teléfono o CUIT..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-verde-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Suppliers */}
        <div className="space-y-4">
          {supplierSummaries.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
              <span className="w-12 h-12 flex items-center justify-center bg-gray-100 rounded-xl mx-auto mb-3">
                <i className="ri-truck-line text-2xl text-gray-400" />
              </span>
              <p className="text-gray-500 text-sm">
                {search.trim() ? 'No se encontraron proveedores' : 'No hay proveedores registrados'}
              </p>
              {!search.trim() && (
                <button
                  type="button"
                  onClick={openCreate}
                  className="mt-3 text-sm text-verde-600 hover:text-verde-800 font-medium cursor-pointer"
                >
                  Agregar el primer proveedor →
                </button>
              )}
            </div>
          )}

          {supplierSummaries.map((summary) => {
            const s = summary.supplier;
            const isExpanded = expandedSupplier === s.id;
            const debt = summary.totalPurchaseValue - summary.totalPaid;
            return (
              <div key={s.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                {/* Supplier header */}
                <div className="p-4 border-b border-gray-100 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className="w-10 h-10 flex items-center justify-center bg-verde-50 text-verde-700 rounded-lg shrink-0">
                      <i className="ri-truck-line text-lg" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-gray-800 truncate">{s.name}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-400 mt-0.5">
                        {s.contactName && <span>👤 {s.contactName}</span>}
                        {s.phone && <span>📞 {s.phone}</span>}
                        {s.cuit && <span>🆔 {s.cuit}</span>}
                      </div>
                      {s.notes && (
                        <p className="text-xs text-gray-400 mt-1 truncate">📝 {s.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-gray-800">${summary.totalRetailValue.toLocaleString('es-AR')}</p>
                    <p className="text-xs text-gray-400">Valor venta · Margen ${(summary.totalRetailValue - summary.totalPurchaseValue).toLocaleString('es-AR')}</p>
                    <div className="flex gap-2 mt-2 justify-end">
                      <button
                        type="button"
                        onClick={() => openPayment(s.id)}
                        className="px-2.5 py-1 text-xs border border-naranja-200 text-naranja-600 hover:bg-naranja-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <i className="ri-money-dollar-circle-line mr-1" />
                        Pagar
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(s)}
                        className="px-2.5 py-1 text-xs border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <i className="ri-edit-line mr-1" />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(s.id)}
                        className="px-2.5 py-1 text-xs border border-red-100 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <i className="ri-delete-bin-line mr-1" />
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>

                {/* Financial summary bar */}
                <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex flex-wrap gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 text-xs">Costo inventario:</span>{' '}
                    <span className="font-medium text-gray-700">${summary.totalPurchaseValue.toLocaleString('es-AR')}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs">Total pagado:</span>{' '}
                    <span className="font-medium text-verde-700">${summary.totalPaid.toLocaleString('es-AR')}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs">Saldo:</span>{' '}
                    <span className={`font-medium ${debt > 0 ? 'text-red-600' : 'text-verde-700'}`}>
                      {debt > 0 ? `-$${debt.toLocaleString('es-AR')}` : `$${Math.abs(debt).toLocaleString('es-AR')}`}
                    </span>
                    <span className="text-xs text-gray-400 ml-1">({debt > 0 ? 'Deuda' : 'A favor'})</span>
                  </div>
                  <div className="flex-1 text-right">
                    <button
                      type="button"
                      onClick={() => setExpandedSupplier(isExpanded ? null : s.id)}
                      className="text-xs text-verde-700 hover:text-verde-900 font-medium cursor-pointer inline-flex items-center gap-1"
                    >
                      {isExpanded ? 'Ocultar pagos' : `Ver pagos (${summary.payments.length})`}
                      <i className={isExpanded ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} />
                    </button>
                  </div>
                </div>

                {/* Payments history */}
                {isExpanded && (
                  <div className="px-4 py-3 border-b border-gray-100">
                    {summary.payments.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">Sin pagos registrados a este proveedor</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="text-left px-3 py-2 font-medium text-gray-500 text-xs">Fecha</th>
                              <th className="text-left px-3 py-2 font-medium text-gray-500 text-xs">Método</th>
                              <th className="text-left px-3 py-2 font-medium text-gray-500 text-xs">Categoría</th>
                              <th className="text-left px-3 py-2 font-medium text-gray-500 text-xs">Fuente</th>
                              <th className="text-left px-3 py-2 font-medium text-gray-500 text-xs">Notas</th>
                              <th className="text-right px-3 py-2 font-medium text-gray-500 text-xs">Monto</th>
                              <th className="text-right px-3 py-2 font-medium text-gray-500 text-xs"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {summary.payments.map((p) => (
                              <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                                <td className="px-3 py-2 text-gray-600 text-xs whitespace-nowrap">
                                  {new Date(p.date).toLocaleDateString('es-AR')}
                                </td>
                                <td className="px-3 py-2">
                                  <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-md">
                                    {p.paymentMethod}
                                  </span>
                                </td>
                                <td className="px-3 py-2">
                                  {p.category ? (
                                    <span className="inline-flex items-center px-2 py-0.5 bg-verde-50 text-verde-700 text-xs font-medium rounded-md">
                                      {p.category}
                                    </span>
                                  ) : (
                                    <span className="text-gray-300 text-xs">—</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-gray-600 text-xs">{p.source}</td>
                                <td className="px-3 py-2 text-gray-500 text-xs max-w-[200px] truncate">{p.notes || '—'}</td>
                                <td className="px-3 py-2 text-right font-semibold text-gray-800">${p.amount.toLocaleString('es-AR')}</td>
                                <td className="px-3 py-2 text-right">
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeletePayment(p.id)}
                                    className="text-xs text-red-500 hover:text-red-700 cursor-pointer"
                                  >
                                    <i className="ri-delete-bin-line" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Products table */}
                {summary.products.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-4 py-2 font-medium text-gray-500">Producto</th>
                          <th className="text-left px-4 py-2 font-medium text-gray-500">Categoría</th>
                          <th className="text-right px-4 py-2 font-medium text-gray-500">Stock</th>
                          <th className="text-right px-4 py-2 font-medium text-gray-500">Costo</th>
                          <th className="text-right px-4 py-2 font-medium text-gray-500">Venta</th>
                          <th className="text-right px-4 py-2 font-medium text-gray-500">Margen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.products.map((p) => {
                          const low = p.currentStock <= p.minStock;
                          return (
                            <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                              <td className="px-4 py-2 text-gray-800">{p.name}</td>
                              <td className="px-4 py-2">
                                <span className="inline-flex items-center px-2 py-0.5 bg-verde-50 text-verde-700 text-xs font-medium rounded-md">
                                  {p.category}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-right">
                                <span className={low ? 'text-red-600 font-semibold' : 'text-gray-700'}>
                                  {p.currentStock}{p.unit}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-right text-gray-600">${p.purchasePrice.toLocaleString('es-AR')}</td>
                              <td className="px-4 py-2 text-right font-semibold text-gray-800">${p.retailPrice.toLocaleString('es-AR')}</td>
                              <td className="px-4 py-2 text-right">
                                <span className="text-verde-700 font-medium">{p.profitMargin}%</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="px-4 py-3 text-sm text-gray-400 italic">
                    Sin productos asociados todavía
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="text-base font-semibold text-gray-800">
                {editingId ? 'Editar proveedor' : 'Agregar proveedor'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setForm(emptyForm);
                  setEditingId(null);
                }}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <i className="ri-close-line" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">
                  Nombre del proveedor *</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ej: Fiambres del Sur"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Contacto</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500"
                    value={form.contactName}
                    onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
                    placeholder="Nombre del contacto"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Teléfono</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="11-4567-8901"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Email</label>
                  <input
                    type="email"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="ventas@proveedor.com"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">CUIT/CUIL</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500"
                    value={form.cuit}
                    onChange={(e) => setForm((f) => ({ ...f, cuit: e.target.value }))}
                    placeholder="20-12345678-9"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Dirección</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500"
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="Av. Corrientes 1234, CABA"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Notas</label>
                <textarea
                  rows={2}
                  maxLength={500}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500 resize-none"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Entrega martes y viernes, pedido mínimo $50.000..."
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-verde-700 hover:bg-verde-800 text-white font-semibold rounded-xl transition-colors cursor-pointer text-sm whitespace-nowrap"
                >
                  {editingId ? 'Guardar cambios' : 'Agregar proveedor'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setForm(emptyForm);
                    setEditingId(null);
                  }}
                  className="px-4 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer text-sm whitespace-nowrap"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="text-base font-semibold text-gray-800">Registrar pago a proveedor</h3>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <i className="ri-close-line" />
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="p-4 space-y-4">
              {/* Supplier selection */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Proveedor *</label>
                <select
                  value={showNewSupplierInline ? '__NEW__' : paymentSupplierId}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '__NEW__') {
                      setShowNewSupplierInline(true);
                      setPaymentSupplierId('');
                    } else {
                      setShowNewSupplierInline(false);
                      setPaymentSupplierId(val);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500 bg-white"
                >
                  <option value="">Seleccionar proveedor...</option>
                  {suppliersList.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                  <option value="__NEW__">+ Nuevo proveedor...</option>
                </select>
              </div>

              {/* Inline new supplier form */}
              {showNewSupplierInline && (
                <div className="bg-verde-50 border border-verde-200 rounded-lg p-3 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-verde-800 font-medium mb-1">
                    <i className="ri-add-circle-line" />
                    Nuevo proveedor
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Nombre *</label>
                    <input
                      type="text"
                      required={showNewSupplierInline}
                      value={newSupplierForm.name}
                      onChange={(e) => setNewSupplierForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500"
                      placeholder="Ej: Fiambres del Sur"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Contacto</label>
                      <input
                        type="text"
                        value={newSupplierForm.contactName}
                        onChange={(e) => setNewSupplierForm((f) => ({ ...f, contactName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500"
                        placeholder="Nombre del contacto"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Teléfono</label>
                      <input
                        type="text"
                        value={newSupplierForm.phone}
                        onChange={(e) => setNewSupplierForm((f) => ({ ...f, phone: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500"
                        placeholder="11-4567-8901"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">CUIT/CUIL</label>
                    <input
                      type="text"
                      value={newSupplierForm.cuit}
                      onChange={(e) => setNewSupplierForm((f) => ({ ...f, cuit: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500"
                      placeholder="20-12345678-9"
                    />
                  </div>
                </div>
              )}

              {/* Category selection */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Categoría</label>
                <select
                  value={showNewCategoryInline ? '__NEW__' : paymentCategory}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '__NEW__') {
                      setShowNewCategoryInline(true);
                      setPaymentCategory('');
                    } else {
                      setShowNewCategoryInline(false);
                      setPaymentCategory(val);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500 bg-white"
                >
                  <option value="">Sin categoría</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="__NEW__">+ Nueva categoría...</option>
                </select>
              </div>

              {/* Inline new category */}
              {showNewCategoryInline && (
                <div className="bg-naranja-50 border border-naranja-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-naranja-800 font-medium mb-1">
                    <i className="ri-add-circle-line" />
                    Nueva categoría
                  </div>
                  <input
                    type="text"
                    required={showNewCategoryInline}
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-naranja-500"
                    placeholder="Ej: Quesos frescos"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Monto *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Fecha</label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Método de pago</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500 bg-white"
                  >
                    {paymentMethods.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Fuente de fondos</label>
                  <select
                    value={paymentSource}
                    onChange={(e) => setPaymentSource(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500 bg-white"
                  >
                    {fundSources.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Notas</label>
                <textarea
                  rows={2}
                  maxLength={500}
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500 resize-none"
                  placeholder="N° de transferencia, factura asociada, etc."
                />
              </div>

              {/* Supplier balance summary */}
              {paymentSupplierId && !showNewSupplierInline && (
                <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>Costo inventario:</span>
                    <span className="font-medium">
                      ${(() => {
                        const summary = supplierSummaries.find((ss) => ss.supplier.id === paymentSupplierId);
                        return summary ? summary.totalPurchaseValue.toLocaleString('es-AR') : '0';
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span>Total pagado:</span>
                    <span className="font-medium text-verde-700">
                      ${(() => {
                        const summary = supplierSummaries.find((ss) => ss.supplier.id === paymentSupplierId);
                        return summary ? summary.totalPaid.toLocaleString('es-AR') : '0';
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between mt-1 pt-1 border-t border-gray-200">
                    <span>Saldo:</span>
                    <span className="font-medium">
                      {(() => {
                        const summary = supplierSummaries.find((ss) => ss.supplier.id === paymentSupplierId);
                        if (!summary) return '$0';
                        const debt = summary.totalPurchaseValue - summary.totalPaid;
                        return debt > 0 ? `-$${debt.toLocaleString('es-AR')}` : `$${Math.abs(debt).toLocaleString('es-AR')}`;
                      })()}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-verde-700 hover:bg-verde-800 text-white font-semibold rounded-xl transition-colors cursor-pointer text-sm whitespace-nowrap"
                >
                  Guardar pago
                </button>
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer text-sm whitespace-nowrap"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete supplier confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-10 h-10 flex items-center justify-center bg-red-50 text-red-500 rounded-lg">
                <i className="ri-alert-line text-lg" />
              </span>
              <h3 className="text-base font-semibold text-gray-800">¿Eliminar proveedor?</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Esta acción no se puede deshacer. Los productos asociados no se eliminan, pero quedarán sin proveedor asignado.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleDelete(confirmDelete)}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-colors cursor-pointer text-sm whitespace-nowrap"
              >
                Eliminar
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer text-sm whitespace-nowrap"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete payment confirmation */}
      {confirmDeletePayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-10 h-10 flex items-center justify-center bg-red-50 text-red-500 rounded-lg">
                <i className="ri-alert-line text-lg" />
              </span>
              <h3 className="text-base font-semibold text-gray-800">¿Eliminar pago?</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              El pago se eliminará del historial del proveedor y no se descontará automáticamente de tesorería. Hacé el ajuste manual si es necesario.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleDeletePayment(confirmDeletePayment)}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-colors cursor-pointer text-sm whitespace-nowrap"
              >
                Eliminar
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeletePayment(null)}
                className="px-4 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer text-sm whitespace-nowrap"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}