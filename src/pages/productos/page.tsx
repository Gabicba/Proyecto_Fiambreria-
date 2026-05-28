import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import StockAdjustmentModal from './components/StockAdjustmentModal';
import {
  loadProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  saveProducts,
  type Product,
} from '@/mocks/productsStore';
import { getSuppliers } from '@/mocks/suppliers';

const categories = ['Fiambres', 'Embutidos', 'Quesos', 'Carnes', 'Panadería', 'Otros'];
const units = ['kg', 'un', 'g', 'lt', 'pack'];

function emptyForm(): Omit<Product, 'id'> {
  return {
    code: '',
    barcode: '',
    name: '',
    category: 'Fiambres',
    unit: 'kg',
    purchasePrice: 0,
    retailPrice: 0,
    wholesalePrice: 0,
    taxRate: 0,
    profitMargin: 30,
    minStock: 5,
    currentStock: 0,
    expirationDate: '',
    pluCode: '',
    supplier: '',
  };
}

function computeMargin(cost: number, price: number): number {
  if (!cost || cost <= 0) return 0;
  return Math.round(((price - cost) / cost) * 100);
}

export default function Productos() {
  const [allProducts, setAllProducts] = useState<Product[]>(loadProducts);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Product, 'id'>>(emptyForm);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Quick scan ref for outside click detection
  const quickScanRef = useRef<HTMLDivElement>(null);

  // Bulk update state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkSupplier, setBulkSupplier] = useState<string>('');
  const [bulkAction, setBulkAction] = useState<'percentage' | 'margin' | 'fixed'>('percentage');
  const [bulkPercentage, setBulkPercentage] = useState<number>(0);
  const [bulkMargin, setBulkMargin] = useState<number>(30);
  const [bulkFixedCost, setBulkFixedCost] = useState<number>(0);
  const [bulkFixedRetail, setBulkFixedRetail] = useState<number>(0);
  const [bulkFixedWholesale, setBulkFixedWholesale] = useState<number>(0);
  const [bulkField, setBulkField] = useState<'all' | 'purchasePrice' | 'retailPrice' | 'wholesalePrice'>('all');
  const [bulkPreview, setBulkPreview] = useState<Product[]>([]);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);

  // Track which preview rows are in inline-edit mode
  const [bulkEditIds, setBulkEditIds] = useState<Set<string>>(new Set());
  const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState<'supplier' | 'search'>('supplier');
  const [bulkSearch, setBulkSearch] = useState('');

  // Quick barcode scanner + stock adjustment
  const [quickScan, setQuickScan] = useState('');
  const [quickScanResults, setQuickScanResults] = useState<Product[]>([]);
  const [quickScanOpen, setQuickScanOpen] = useState(false);
  const [stockAdjustProduct, setStockAdjustProduct] = useState<Product | null>(null);

  const suppliers = useMemo(() => getSuppliers(), []);

  const refresh = useCallback(() => {
    setAllProducts(loadProducts());
  }, []);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 2500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // Close quick scan dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (quickScanRef.current && !quickScanRef.current.contains(e.target as Node)) {
        setQuickScanOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    let list = allProducts;
    if (categoryFilter !== 'all') {
      list = list.filter((p) => p.category === categoryFilter);
    }
    const term = search.trim().toLowerCase();
    if (!term) return list;
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.barcode.includes(term) ||
        p.code.toLowerCase().includes(term)
    );
  }, [allProducts, search, categoryFilter]);

  const openCreate = useCallback(() => {
    setEditingId(null);
    setForm(emptyForm());
    setShowModal(true);
  }, []);

  const openCreateWithSearch = useCallback(() => {
    setEditingId(null);
    const guessedName = search.trim();
    setForm({
      ...emptyForm(),
      name: guessedName,
      code: '',
      barcode: '',
    });
    setShowModal(true);
  }, [search]);

  const openEdit = useCallback((product: Product) => {
    setEditingId(product.id);
    setForm({
      code: product.code,
      barcode: product.barcode,
      name: product.name,
      category: product.category,
      unit: product.unit,
      purchasePrice: product.purchasePrice,
      retailPrice: product.retailPrice,
      wholesalePrice: product.wholesalePrice,
      taxRate: product.taxRate,
      profitMargin: product.profitMargin,
      minStock: product.minStock,
      currentStock: product.currentStock,
      expirationDate: product.expirationDate,
      pluCode: product.pluCode,
      supplier: product.supplier,
    });
    setShowModal(true);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) return;

    if (editingId) {
      updateProduct(editingId, form);
      setToast('Producto actualizado');
    } else {
      addProduct(form);
      setToast('Producto creado');
    }
    refresh();
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm());
  };

  const handleDelete = (id: string) => {
    deleteProduct(id);
    refresh();
    setConfirmDelete(null);
    setToast('Producto eliminado');
  };

  const handleQuickScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (quickScanResults.length === 1) {
      openEdit(quickScanResults[0]);
      setQuickScan('');
      setQuickScanResults([]);
      setQuickScanOpen(false);
    } else if (quickScanResults.length > 1) {
      setQuickScanOpen(true);
    }
  };

  const handleQuickScanChange = (value: string) => {
    setQuickScan(value);
    const term = value.trim();
    if (!term) {
      setQuickScanResults([]);
      setQuickScanOpen(false);
      return;
    }
    const results = allProducts.filter(
      (p) =>
        p.barcode.includes(term) ||
        p.code.toLowerCase().includes(term.toLowerCase()) ||
        p.name.toLowerCase().includes(term.toLowerCase())
    );
    setQuickScanResults(results);
    setQuickScanOpen(results.length > 0);
  };

  const selectQuickScanResult = (product: Product) => {
    openEdit(product);
    setQuickScan('');
    setQuickScanResults([]);
    setQuickScanOpen(false);
  };

  const handleStockAdjustment = (productId: string, adjustment: number) => {
    const current = loadProducts();
    const updated = current.map((p) => {
      if (p.id !== productId) return p;
      return { ...p, currentStock: Math.max(0, p.currentStock + adjustment) };
    });
    saveProducts(updated);
    refresh();
    setToast(`Stock ajustado: ${adjustment > 0 ? '+' : ''}${adjustment}`);
  };

  const setField = <K extends keyof Omit<Product, 'id'>>(
    field: K,
    value: Omit<Product, 'id'>[K]
  ) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      // Auto-compute margin when cost or retail changes
      if (field === 'purchasePrice' || field === 'retailPrice') {
        const cost = field === 'purchasePrice' ? (value as number) : next.purchasePrice;
        const price = field === 'retailPrice' ? (value as number) : next.retailPrice;
        next.profitMargin = computeMargin(cost, price);
      }
      return next;
    });
  };

  // ── BULK UPDATE LOGIC ──
  const targetBulkProducts = useMemo(() => {
    if (bulkMode === 'supplier') {
      if (!bulkSupplier) return [];
      return allProducts.filter((p) => p.supplier === bulkSupplier);
    }
    // search mode
    const term = bulkSearch.trim().toLowerCase();
    if (!term) return [];
    return allProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.code.toLowerCase().includes(term) ||
        p.barcode.includes(term)
    );
  }, [allProducts, bulkMode, bulkSupplier, bulkSearch]);

  const buildBulkPreview = useCallback(() => {
    const list = targetBulkProducts;
    if (!list.length) return;
    const preview = list.map((p) => {
      const next = { ...p };
      if (bulkAction === 'percentage') {
        const factor = 1 + bulkPercentage / 100;
        if (bulkField === 'all' || bulkField === 'purchasePrice') {
          next.purchasePrice = Math.round(p.purchasePrice * factor);
        }
        if (bulkField === 'all' || bulkField === 'retailPrice') {
          next.retailPrice = Math.round(p.retailPrice * factor);
        }
        if (bulkField === 'all' || bulkField === 'wholesalePrice') {
          next.wholesalePrice = Math.round(p.wholesalePrice * factor);
        }
        next.profitMargin = computeMargin(next.purchasePrice, next.retailPrice);
      } else if (bulkAction === 'margin') {
        if (bulkField === 'all' || bulkField === 'purchasePrice') {
          next.retailPrice = Math.round(p.purchasePrice * (1 + bulkMargin / 100));
          next.wholesalePrice = Math.round(p.purchasePrice * (1 + (bulkMargin - 5) / 100));
        } else {
          const base = bulkField === 'retailPrice' ? p.retailPrice : p.wholesalePrice;
          next.purchasePrice = Math.round(base / (1 + (bulkField === 'retailPrice' ? p.profitMargin : Math.max(p.profitMargin - 5, 10)) / 100));
          next.retailPrice = Math.round(next.purchasePrice * (1 + bulkMargin / 100));
          next.wholesalePrice = Math.round(next.purchasePrice * (1 + (bulkMargin - 5) / 100));
        }
        next.profitMargin = computeMargin(next.purchasePrice, next.retailPrice);
      } else if (bulkAction === 'fixed') {
        if (bulkField === 'all' || bulkField === 'purchasePrice') {
          next.purchasePrice = Math.round(bulkFixedCost);
        }
        if (bulkField === 'all' || bulkField === 'retailPrice') {
          next.retailPrice = Math.round(bulkFixedRetail);
        }
        if (bulkField === 'all' || bulkField === 'wholesalePrice') {
          next.wholesalePrice = Math.round(bulkFixedWholesale);
        }
        next.profitMargin = computeMargin(next.purchasePrice, next.retailPrice);
      }
      return next;
    });
    setBulkPreview(preview);
    setBulkSelectedIds(new Set(preview.map((p) => p.id)));
    setBulkEditIds(new Set());
  }, [targetBulkProducts, bulkAction, bulkPercentage, bulkMargin, bulkField, bulkFixedCost, bulkFixedRetail, bulkFixedWholesale]);

  const toggleBulkEdit = (id: string) => {
    setBulkEditIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleBulkSelect = (id: string) => {
    setBulkSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllBulkSelect = () => {
    setBulkSelectedIds((prev) => {
      if (prev.size === bulkPreview.length) {
        return new Set();
      }
      return new Set(bulkPreview.map((p) => p.id));
    });
  };

  const updateBulkPreviewField = (id: string, field: keyof Product, value: number) => {
    setBulkPreview((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const next = { ...p, [field]: value } as Product;
        if (field === 'purchasePrice' || field === 'retailPrice') {
          next.profitMargin = computeMargin(next.purchasePrice, next.retailPrice);
        }
        return next;
      })
    );
  };

  const applyBulkUpdate = () => {
    if (!bulkPreview.length) return;
    const selectedPreview = bulkPreview.filter((p) => bulkSelectedIds.has(p.id));
    if (!selectedPreview.length) {
      setToast('No hay productos seleccionados');
      return;
    }
    const current = loadProducts();
    const updated = current.map((p) => {
      const match = selectedPreview.find((bp) => bp.id === p.id);
      if (match) {
        return { ...match };
      }
      return p;
    });
    saveProducts(updated);
    refresh();
    setBulkConfirmOpen(false);
    setShowBulkModal(false);
    setBulkPreview([]);
    setBulkSupplier('');
    setBulkSearch('');
    setBulkMode('supplier');
    setBulkEditIds(new Set());
    setBulkSelectedIds(new Set());
    setToast(`Actualizados ${selectedPreview.length} productos${bulkMode === 'supplier' ? ` de ${bulkSupplier}` : ''}`);
  };

  const lowStockCount = allProducts.filter((p) => p.currentStock <= p.minStock).length;
  const totalProducts = allProducts.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-verde-800 text-white px-4 md:px-6 py-3 flex items-center gap-3">
        <span className="w-8 h-8 flex items-center justify-center bg-verde-700 rounded-lg">
          <i className="ri-box-3-line" />
        </span>
        <div className="flex-1">
          <h1 className="text-base font-bold">Productos</h1>
          <p className="text-xs text-verde-300">Catálogo completo — buscá, editá o creá productos</p>
        </div>
      </div>

      {/* Quick barcode scanner */}
      <div className="px-4 md:px-6 pt-4 md:pt-6 pb-0 relative z-40" ref={quickScanRef}>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-gray-400">
            <i className="ri-barcode-line" />
          </span>
          <input
            type="text"
            placeholder="Escaneá código de barras, escribí código interno o nombre..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-verde-500 bg-white"
            value={quickScan}
            onChange={(e) => handleQuickScanChange(e.target.value)}
            onKeyDown={handleQuickScan}
            onFocus={() => {
              if (quickScanResults.length > 0) setQuickScanOpen(true);
            }}
          />
          {/* Dropdown results */}
          {quickScanOpen && quickScanResults.length > 0 && (
            <div className="quick-scan-dropdown absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-80 overflow-y-auto z-50">
              {quickScanResults.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => selectQuickScanResult(product)}
                  className="w-full text-left px-4 py-3 hover:bg-verde-50 border-b border-gray-100 last:border-0 cursor-pointer flex items-center gap-3"
                >
                  <span className="w-8 h-8 flex items-center justify-center bg-verde-50 text-verde-700 rounded-lg shrink-0 text-xs font-bold">
                    {product.code.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{product.name}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-400">
                      <span>Código: <span className="text-gray-600 font-medium">{product.code}</span></span>
                      {product.barcode && <span>Barras: <span className="text-gray-600 font-medium">{product.barcode}</span></span>}
                      <span className="inline-flex items-center px-1.5 py-0.5 bg-verde-50 text-verde-700 text-[10px] font-medium rounded">
                        {product.category}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-gray-800">${product.retailPrice.toLocaleString('es-AR')}</p>
                    <p className="text-xs text-gray-400">Stock: {product.currentStock}{product.unit}</p>
                  </div>
                </button>
              ))}
              {quickScanResults.length > 5 && (
                <div className="px-4 py-2 text-xs text-gray-400 text-center border-t border-gray-100">
                  {quickScanResults.length} resultados — seguí escribiendo para filtrar
                </div>
              )}
            </div>
          )}
          {quickScanOpen && quickScanResults.length === 0 && quickScan.trim() && (
            <div className="quick-scan-dropdown absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50">
              <div className="px-4 py-4 text-center">
                <span className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-xl mx-auto mb-2">
                  <i className="ri-search-line text-xl text-gray-400" />
                </span>
                <p className="text-sm text-gray-500">No se encontró "{quickScan.trim()}"</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearch(quickScan.trim());
                    setQuickScan('');
                    setQuickScanResults([]);
                    setQuickScanOpen(false);
                  }}
                  className="mt-2 text-xs text-verde-600 hover:text-verde-800 font-medium cursor-pointer"
                >
                  Ver en tabla de productos →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-5">
        {/* Stats + actions */}
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 flex-1">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Productos</p>
              <p className="text-2xl font-bold text-gray-800">{totalProducts}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Stock bajo</p>
              <p className="text-2xl font-bold text-red-600">{lowStockCount}</p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setShowBulkModal(true);
                setBulkPreview([]);
                setBulkSupplier('');
                setBulkSearch('');
                setBulkMode('supplier');
                setBulkAction('percentage');
                setBulkPercentage(0);
                setBulkField('all');
                setBulkSelectedIds(new Set());
                setBulkEditIds(new Set());
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-naranja-600 hover:bg-naranja-700 text-white text-sm font-medium rounded-xl transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-price-tag-3-line" />
              Actualización masiva
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2.5 bg-verde-700 hover:bg-verde-800 text-white text-sm font-medium rounded-xl transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-add-line" />
              Nuevo producto
            </button>
          </div>
        </div>

        {/* Search + filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-gray-400">
              <i className="ri-search-line" />
            </span>
            <input
              type="text"
              placeholder="Buscar por nombre, código de barras o código interno..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-verde-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-verde-500 bg-white cursor-pointer"
          >
            <option value="all">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Results count */}
        {search.trim() && (
          <p className="text-xs text-gray-500">
            {filtered.length} resultado{filtered.length !== 1 ? 's' : ''} para "{search.trim()}"
          </p>
        )}

        {/* Empty search with create suggestion */}
        {filtered.length === 0 && search.trim() && (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <span className="w-12 h-12 flex items-center justify-center bg-gray-100 rounded-xl mx-auto mb-3">
              <i className="ri-search-line text-2xl text-gray-400" />
            </span>
            <p className="text-gray-500 text-sm mb-1">No se encontró "{search.trim()}"</p>
            <p className="text-xs text-gray-400 mb-4">¿Querés crearlo como producto nuevo?</p>
            <button
              type="button"
              onClick={openCreateWithSearch}
              className="px-4 py-2 bg-verde-700 hover:bg-verde-800 text-white text-sm font-medium rounded-xl transition-colors cursor-pointer whitespace-nowrap inline-flex items-center gap-2"
            >
              <i className="ri-add-line" />
              Crear "{search.trim()}"
            </button>
          </div>
        )}

        {/* Table */}
        {filtered.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Código</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Nombre</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Categoría</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Unidad</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Proveedor</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Costo</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Minorista</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Mayorista</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Margen</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Stock</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Vencimiento</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((product) => {
                    const lowStock = product.currentStock <= product.minStock;
                    const expired = product.expirationDate && new Date(product.expirationDate) < new Date();
                    const nearExp = product.expirationDate && new Date(product.expirationDate) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
                    return (
                      <tr key={product.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-700 whitespace-nowrap">{product.code}</td>
                        <td className="px-4 py-3 text-gray-800 min-w-[160px]">{product.name}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-1 bg-verde-50 text-verde-700 text-xs font-medium rounded-md">
                            {product.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{product.unit}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs max-w-[140px] truncate" title={product.supplier}>
                          {product.supplier || '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">${product.purchasePrice.toLocaleString('es-AR')}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-800">${product.retailPrice.toLocaleString('es-AR')}</td>
                        <td className="px-4 py-3 text-right text-gray-600">${product.wholesalePrice.toLocaleString('es-AR')}</td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-verde-700 font-medium">{product.profitMargin}%</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={lowStock ? 'text-red-600 font-semibold' : 'text-gray-700'}>
                            {product.currentStock}{product.unit}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {product.expirationDate ? (
                            <span className={`text-xs font-medium px-2 py-1 rounded-md ${
                              expired ? 'text-red-600 bg-red-50' :
                              nearExp ? 'text-naranja-600 bg-naranja-50' :
                              'text-gray-500 bg-gray-50'
                            }`}>
                              {new Date(product.expirationDate).toLocaleDateString('es-AR')}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex gap-1.5 justify-end">
                            <button
                              type="button"
                              onClick={() => openEdit(product)}
                              className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-verde-700 hover:bg-verde-50 rounded-lg transition-colors cursor-pointer"
                              title="Editar"
                            >
                              <i className="ri-edit-line" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setStockAdjustProduct(product)}
                              className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-naranja-600 hover:bg-naranja-50 rounded-lg transition-colors cursor-pointer"
                              title="Ajustar stock"
                            >
                              <i className="ri-archive-line" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDelete(product.id)}
                              className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Eliminar"
                            >
                              <i className="ri-delete-bin-line" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── BULK UPDATE MODAL ── */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="text-base font-semibold text-gray-800">Actualización masiva de precios</h3>
              <button
                type="button"
                onClick={() => {
                  setShowBulkModal(false);
                  setBulkPreview([]);
                  setBulkSupplier('');
                  setBulkSearch('');
                  setBulkMode('supplier');
                  setBulkEditIds(new Set());
                  setBulkSelectedIds(new Set());
                }}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <i className="ri-close-line" />
              </button>
            </div>

            <div className="p-4 space-y-5">
              {/* Step 1: Seleccionar productos */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                  1. ¿Cómo seleccionar productos?
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {[
                    { key: 'supplier' as const, label: 'Por proveedor', icon: 'ri-truck-line' },
                    { key: 'search' as const, label: 'Por búsqueda', icon: 'ri-search-line' },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => {
                        setBulkMode(opt.key);
                        setBulkPreview([]);
                      }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-all cursor-pointer whitespace-nowrap ${
                        bulkMode === opt.key
                          ? 'border-verde-500 bg-verde-50 text-verde-800'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <i className={opt.icon} />
                      {opt.label}
                    </button>
                  ))}
                </div>

                {bulkMode === 'supplier' && (
                  <>
                    <select
                      value={bulkSupplier}
                      onChange={(e) => {
                        setBulkSupplier(e.target.value);
                        setBulkPreview([]);
                      }}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500 bg-white"
                    >
                      <option value="">Elegir proveedor...</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                    {bulkSupplier && (
                      <p className="text-xs text-gray-500 mt-1.5">
                        {targetBulkProducts.length} producto{targetBulkProducts.length !== 1 ? 's' : ''} asociado{targetBulkProducts.length !== 1 ? 's' : ''} a <strong>{bulkSupplier}</strong>
                      </p>
                    )}
                  </>
                )}

                {bulkMode === 'search' && (
                  <>
                    <input
                      type="text"
                      placeholder="Buscar por nombre, código interno o código de barras..."
                      value={bulkSearch}
                      onChange={(e) => {
                        setBulkSearch(e.target.value);
                        setBulkPreview([]);
                      }}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500"
                    />
                    {bulkSearch.trim() && (
                      <p className="text-xs text-gray-500 mt-1.5">
                        {targetBulkProducts.length} producto{targetBulkProducts.length !== 1 ? 's' : ''} coincide{targetBulkProducts.length !== 1 ? 'n' : ''} con <strong>"{bulkSearch.trim()}"</strong>
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Step 2: Choose action */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                  2. Tipo de ajuste
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'percentage', label: 'Porcentaje (±%)', icon: 'ri-percent-line' },
                    { key: 'margin', label: 'Margen sobre costo', icon: 'ri-scales-3-line' },
                    { key: 'fixed', label: 'Precio fijo', icon: 'ri-money-dollar-circle-line' },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => {
                        setBulkAction(opt.key as typeof bulkAction);
                        setBulkPreview([]);
                      }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-all cursor-pointer whitespace-nowrap ${
                        bulkAction === opt.key
                          ? 'border-verde-500 bg-verde-50 text-verde-800'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <i className={opt.icon} />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 3: Field selection */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                  3. ¿Qué precios modificar?
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'all', label: 'Todos' },
                    { key: 'purchasePrice', label: 'Costo' },
                    { key: 'retailPrice', label: 'Minorista' },
                    { key: 'wholesalePrice', label: 'Mayorista' },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => {
                        setBulkField(opt.key as typeof bulkField);
                        setBulkPreview([]);
                      }}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all cursor-pointer ${
                        bulkField === opt.key
                          ? 'border-verde-500 bg-verde-50 text-verde-800'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 4: Value input */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                {bulkAction === 'percentage' && (
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                      Porcentaje de ajuste
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        step="0.1"
                        value={bulkPercentage}
                        onChange={(e) => {
                          setBulkPercentage(parseFloat(e.target.value) || 0);
                          setBulkPreview([]);
                        }}
                        className="w-32 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500"
                        placeholder="Ej: 10"
                      />
                      <span className="text-sm text-gray-500">%</span>
                      <span className="text-xs text-gray-400">
                        {bulkPercentage > 0 ? 'Aumento' : bulkPercentage < 0 ? 'Descuento' : 'Sin cambio'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">
                      Use valores negativos para bajar precios. Ej: -5 baja un 5%.
                    </p>
                  </div>
                )}

                {bulkAction === 'margin' && (
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                      Margen de ganancia deseado (%)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={bulkMargin}
                        onChange={(e) => {
                          setBulkMargin(parseFloat(e.target.value) || 0);
                          setBulkPreview([]);
                        }}
                        className="w-32 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500"
                        placeholder="30"
                      />
                      <span className="text-sm text-gray-500">%</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">
                      Se recalculan precios minorista y mayorista desde el costo. Mayorista = margen - 5%.
                    </p>
                  </div>
                )}

                {bulkAction === 'fixed' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1.5 block">Costo ($)</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={bulkFixedCost || ''}
                        onChange={(e) => {
                          setBulkFixedCost(parseFloat(e.target.value) || 0);
                          setBulkPreview([]);
                        }}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1.5 block">Minorista ($)</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={bulkFixedRetail || ''}
                        onChange={(e) => {
                          setBulkFixedRetail(parseFloat(e.target.value) || 0);
                          setBulkPreview([]);
                        }}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1.5 block">Mayorista ($)</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={bulkFixedWholesale || ''}
                        onChange={(e) => {
                          setBulkFixedWholesale(parseFloat(e.target.value) || 0);
                          setBulkPreview([]);
                        }}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500"
                        placeholder="0"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Preview button */}
              <button
                type="button"
                disabled={(bulkMode === 'supplier' && !bulkSupplier) || (bulkMode === 'search' && !bulkSearch.trim()) || (bulkAction === 'fixed' && bulkField === 'all' && (!bulkFixedCost || !bulkFixedRetail))}
                onClick={buildBulkPreview}
                className="w-full py-2.5 border border-verde-500 text-verde-700 hover:bg-verde-50 disabled:opacity-40 disabled:hover:bg-transparent font-medium rounded-xl transition-colors cursor-pointer text-sm whitespace-nowrap"
              >
                <span className="flex items-center justify-center gap-2">
                  <i className="ri-eye-line" />
                  Previsualizar cambios
                </span>
              </button>

              {/* Preview table */}
              {bulkPreview.length > 0 && (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-verde-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={bulkSelectedIds.size === bulkPreview.length && bulkPreview.length > 0}
                          onChange={toggleAllBulkSelect}
                          className="w-4 h-4 rounded border-gray-300 text-verde-600 focus:ring-verde-500 cursor-pointer"
                        />
                        <span className="text-sm font-semibold text-verde-800">
                          {bulkSelectedIds.size} de {bulkPreview.length} seleccionados
                        </span>
                      </label>
                    </div>
                    <p className="text-xs text-verde-600">
                      Hacé clic en el lápiz para editar manualmente los precios.
                    </p>
                  </div>
                  <div className="overflow-x-auto max-h-96 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-xs font-medium text-gray-500 w-10">
                            <input
                              type="checkbox"
                              checked={bulkSelectedIds.size === bulkPreview.length && bulkPreview.length > 0}
                              onChange={toggleAllBulkSelect}
                              className="w-4 h-4 rounded border-gray-300 text-verde-600 focus:ring-verde-500 cursor-pointer"
                            />
                          </th>
                          <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Producto</th>
                          <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Costo antes</th>
                          <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Costo después</th>
                          <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Minorista antes</th>
                          <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Minorista después</th>
                          <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Mayorista antes</th>
                          <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Mayorista después</th>
                          <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Margen</th>
                          <th className="text-center px-4 py-2 text-xs font-medium text-gray-500">Editar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkPreview.map((p) => {
                          const original = allProducts.find((ap) => ap.id === p.id)!;
                          const costChanged = original.purchasePrice !== p.purchasePrice;
                          const retailChanged = original.retailPrice !== p.retailPrice;
                          const wholesaleChanged = original.wholesalePrice !== p.wholesalePrice;
                          const isEditing = bulkEditIds.has(p.id);
                          const isSelected = bulkSelectedIds.has(p.id);
                          return (
                            <tr key={p.id} className={`border-b border-gray-100 last:border-0 ${!isSelected ? 'bg-gray-50/60' : ''}`}>
                              <td className="px-3 py-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleBulkSelect(p.id)}
                                  className="w-4 h-4 rounded border-gray-300 text-verde-600 focus:ring-verde-500 cursor-pointer"
                                />
                              </td>
                              <td className={`px-4 py-2 font-medium ${isSelected ? 'text-gray-800' : 'text-gray-400'}`}>{p.name}</td>
                              <td className="px-4 py-2 text-right text-gray-400">${original.purchasePrice.toLocaleString('es-AR')}</td>
                              <td className={`px-4 py-2 text-right ${costChanged && isSelected ? 'text-verde-700' : 'text-gray-400'}`}>
                                {isEditing ? (
                                  <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={p.purchasePrice}
                                    onChange={(e) => updateBulkPreviewField(p.id, 'purchasePrice', parseFloat(e.target.value) || 0)}
                                    className="w-24 px-2 py-1 border border-gray-200 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-verde-500"
                                  />
                                ) : (
                                  <span className={`font-medium ${isSelected ? '' : 'text-gray-400'}`}>${p.purchasePrice.toLocaleString('es-AR')}</span>
                                )}
                              </td>
                              <td className="px-4 py-2 text-right text-gray-400">${original.retailPrice.toLocaleString('es-AR')}</td>
                              <td className={`px-4 py-2 text-right ${retailChanged && isSelected ? 'text-verde-700' : 'text-gray-400'}`}>
                                {isEditing ? (
                                  <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={p.retailPrice}
                                    onChange={(e) => updateBulkPreviewField(p.id, 'retailPrice', parseFloat(e.target.value) || 0)}
                                    className="w-24 px-2 py-1 border border-gray-200 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-verde-500"
                                  />
                                ) : (
                                  <span className={`font-medium ${isSelected ? '' : 'text-gray-400'}`}>${p.retailPrice.toLocaleString('es-AR')}</span>
                                )}
                              </td>
                              <td className="px-4 py-2 text-right text-gray-400">${original.wholesalePrice.toLocaleString('es-AR')}</td>
                              <td className={`px-4 py-2 text-right ${wholesaleChanged && isSelected ? 'text-verde-700' : 'text-gray-400'}`}>
                                {isEditing ? (
                                  <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={p.wholesalePrice}
                                    onChange={(e) => updateBulkPreviewField(p.id, 'wholesalePrice', parseFloat(e.target.value) || 0)}
                                    className="w-24 px-2 py-1 border border-gray-200 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-verde-500"
                                  />
                                ) : (
                                  <span className={`font-medium ${isSelected ? '' : 'text-gray-400'}`}>${p.wholesalePrice.toLocaleString('es-AR')}</span>
                                )}
                              </td>
                              <td className={`px-4 py-2 text-right font-medium ${isSelected ? 'text-verde-700' : 'text-gray-400'}`}>{p.profitMargin}%</td>
                              <td className="px-4 py-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => toggleBulkEdit(p.id)}
                                  className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                                    isEditing ? 'bg-verde-100 text-verde-700' : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
                                  }`}
                                >
                                  <i className={isEditing ? 'ri-check-line' : 'ri-pencil-line'} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-3 border-t border-gray-200 bg-gray-50 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setBulkConfirmOpen(true)}
                      className="flex-1 py-2.5 bg-verde-700 hover:bg-verde-800 text-white font-semibold rounded-xl transition-colors cursor-pointer text-sm whitespace-nowrap"
                    >
                      Aplicar cambios ({bulkSelectedIds.size} productos)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBulkPreview([]);
                        setBulkEditIds(new Set());
                        setBulkSelectedIds(new Set());
                      }}
                      className="px-4 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer text-sm whitespace-nowrap"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bulk confirm modal */}
      {bulkConfirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-10 h-10 flex items-center justify-center bg-naranja-50 text-naranja-600 rounded-lg">
                <i className="ri-alert-line text-lg" />
              </span>
              <h3 className="text-base font-semibold text-gray-800">¿Aplicar cambios?</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Se actualizarán <strong>{bulkSelectedIds.size}</strong> de <strong>{bulkPreview.length}</strong> productos seleccionados{bulkMode === 'supplier' && <>{' de '}<strong>{bulkSupplier}</strong></>}. 
              Los productos no seleccionados no se modificarán.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={applyBulkUpdate}
                className="flex-1 py-2.5 bg-verde-700 hover:bg-verde-800 text-white font-semibold rounded-xl transition-colors cursor-pointer text-sm whitespace-nowrap"
              >
                Confirmar y aplicar
              </button>
              <button
                type="button"
                onClick={() => setBulkConfirmOpen(false)}
                className="px-4 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer text-sm whitespace-nowrap"
              >
                Volver
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="text-base font-semibold text-gray-800">
                {editingId ? 'Editar producto' : 'Nuevo producto'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setEditingId(null);
                  setForm(emptyForm());
                }}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <i className="ri-close-line" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Nombre del producto *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setField('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500"
                    placeholder="Ej: Jamón cocido"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Código interno *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.code}
                    onChange={(e) => setField('code', e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500"
                    placeholder="JAM001"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Código de barras
                  </label>
                  <input
                    type="text"
                    value={form.barcode}
                    onChange={(e) => setField('barcode', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500"
                    placeholder="7790123456001"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    PLU
                  </label>
                  <input
                    type="text"
                    value={form.pluCode}
                    onChange={(e) => setField('pluCode', e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500"
                    placeholder="PLU001"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Categoría *
                  </label>
                  <select
                    required
                    value={form.category}
                    onChange={(e) => setField('category', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500 bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Unidad *
                  </label>
                  <select
                    required
                    value={form.unit}
                    onChange={(e) => setField('unit', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500 bg-white"
                  >
                    {units.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Proveedor
                  </label>
                  <select
                    value={form.supplier}
                    onChange={(e) => setField('supplier', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500 bg-white"
                  >
                    <option value="">Sin proveedor</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Precio costo ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.purchasePrice || ''}
                    onChange={(e) => setField('purchasePrice', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Precio minorista ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.retailPrice || ''}
                    onChange={(e) => setField('retailPrice', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Precio mayorista ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.wholesalePrice || ''}
                    onChange={(e) => setField('wholesalePrice', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Margen (%)
                  </label>
                  <input
                    type="number"
                    value={form.profitMargin}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-700"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Stock actual
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.currentStock || ''}
                    onChange={(e) => setField('currentStock', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Stock mínimo
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.minStock || ''}
                    onChange={(e) => setField('minStock', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Vencimiento
                  </label>
                  <input
                    type="date"
                    value={form.expirationDate}
                    onChange={(e) => setField('expirationDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Tasa de impuesto (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={form.taxRate}
                    onChange={(e) => setField('taxRate', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-verde-700 hover:bg-verde-800 text-white font-semibold rounded-xl transition-colors cursor-pointer text-sm whitespace-nowrap"
                >
                  {editingId ? 'Guardar cambios' : 'Crear producto'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingId(null);
                    setForm(emptyForm());
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

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-10 h-10 flex items-center justify-center bg-red-50 text-red-500 rounded-lg">
                <i className="ri-alert-line text-lg" />
              </span>
              <h3 className="text-base font-semibold text-gray-800">¿Eliminar producto?</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Esta acción no se puede deshacer. El producto se eliminará del catálogo.
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

      {/* Stock Adjustment Modal */}
      {stockAdjustProduct && (
        <StockAdjustmentModal
          product={stockAdjustProduct}
          onClose={() => setStockAdjustProduct(null)}
          onSave={handleStockAdjustment}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 bg-verde-800 text-white px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 animate-fade-in-up">
          <i className="ri-check-line" />
          {toast}
        </div>
      )}
    </div>
  );
}