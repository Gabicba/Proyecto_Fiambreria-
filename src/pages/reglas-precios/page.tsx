import { useState, useMemo, useCallback } from 'react';
import { loadPricingTiers, savePricingTiers, type PricingTier } from '@/mocks/pricingRules';
import { loadProducts, type Product } from '@/mocks/productsStore';

// Product images by category
const PRODUCT_IMAGES: Record<string, string> = {
  Fiambres: 'https://readdy.ai/api/search-image?query=A%20beautifully%20sliced%20cured%20ham%20leg%20on%20a%20clean%20white%20marble%20cutting%20board%2C%20professional%20food%20photography%2C%20warm%20natural%20lighting%2C%20appetizing%20deli%20meat%20presentation%20with%20herbs%20and%20rosemary%20garnish%2C%20simple%20white%20background&width=300&height=300&seq=ham001&orientation=squarish',
  Quesos: 'https://readdy.ai/api/search-image?query=A%20large%20wedge%20of%20fresh%20Argentine%20cheese%20on%20a%20wooden%20board%2C%20professional%20food%20photography%2C%20soft%20warm%20lighting%2C%20artisan%20dairy%20product%20with%20creamy%20texture%20visible%2C%20simple%20clean%20background&width=300&height=300&seq=cheese001&orientation=squarish',
  Embutidos: 'https://readdy.ai/api/search-image?query=Traditional%20Argentine%20salami%20slices%20arranged%20on%20a%20rustic%20cutting%20board%2C%20professional%20food%20photography%2C%20warm%20studio%20lighting%2C%20cured%20meat%20delicacy%20with%20peppercorns%20visible%2C%20clean%20white%20background&width=300&height=300&seq=salami001&orientation=squarish',
  Carnes: 'https://readdy.ai/api/search-image?query=Fresh%20raw%20breaded%20milanesa%20steaks%20on%20a%20white%20ceramic%20plate%2C%20professional%20food%20photography%2C%20bright%20natural%20lighting%2C%20Argentine%20beef%20cutlets%20ready%20to%20cook%2C%20clean%20minimal%20background&width=300&height=300&seq=milanesa001&orientation=squarish',
  Panadería: 'https://readdy.ai/api/search-image?query=Freshly%20baked%20crusty%20Argentine%20bread%20loaves%20on%20a%20wooden%20table%2C%20professional%20food%20photography%2C%20warm%20golden%20lighting%2C%20artisan%20bakery%20product%20with%20steam%20rising%2C%20simple%20clean%20background&width=300&height=300&seq=bread001&orientation=squarish',
};

function getProductImage(product: Product): string {
  return PRODUCT_IMAGES[product.category] || PRODUCT_IMAGES['Fiambres'];
}

function formatMoney(value: number): string {
  return value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const DEFAULT_TIER_TEMPLATES = [
  { unitLabel: '1/2 KG', quantity: 0.5 },
  { unitLabel: '1/2 KG Molido', quantity: 0.5 },
  { unitLabel: '1 KG', quantity: 1 },
  { unitLabel: '2 KG', quantity: 2 },
  { unitLabel: '4 KG', quantity: 4 },
];

export default function ReglasPrecios() {
  const [tiers, setTiers] = useState<PricingTier[]>(() => loadPricingTiers());
  const [showModal, setShowModal] = useState(false);
  const [editingTier, setEditingTier] = useState<PricingTier | null>(null);
  const [selectedProductId, setSelectedProductId] = useState('');

  // Form state
  const [formProductId, setFormProductId] = useState('');
  const [formUnitLabel, setFormUnitLabel] = useState('1 KG');
  const [formQuantity, setFormQuantity] = useState('1');
  const [formTotalPrice, setFormTotalPrice] = useState('');
  const [formAppliesTo, setFormAppliesTo] = useState<'retail' | 'wholesale' | 'both'>('retail');
  const [formCustomLabel, setFormCustomLabel] = useState(false);

  const products = loadProducts();

  const activeTiers = useMemo(() => tiers.filter((t) => t.isActive), [tiers]);
  const inactiveTiers = useMemo(() => tiers.filter((t) => !t.isActive), [tiers]);

  const groupedByProduct = useMemo(() => {
    const map: Record<
      string,
      { product: Product; tiers: PricingTier[] }
    > = {};
    for (const tier of tiers) {
      const product = products.find((p) => p.id === tier.productId);
      if (!product) continue;
      if (!map[tier.productId]) {
        map[tier.productId] = { product, tiers: [] };
      }
      map[tier.productId].tiers.push(tier);
    }
    return Object.values(map).sort((a, b) => a.product.name.localeCompare(b.product.name));
  }, [tiers, products]);

  const updateTiers = useCallback((newTiers: PricingTier[]) => {
    setTiers(newTiers);
    savePricingTiers(newTiers);
  }, []);

  const toggleTier = useCallback(
    (id: string) => {
      updateTiers(tiers.map((t) => (t.id === id ? { ...t, isActive: !t.isActive } : t)));
    },
    [tiers, updateTiers]
  );

  const deleteTier = useCallback(
    (id: string) => {
      if (confirm('¿Eliminar esta regla de precio?')) {
        updateTiers(tiers.filter((t) => t.id !== id));
      }
    },
    [tiers, updateTiers]
  );

  const openCreate = (productId?: string) => {
    setEditingTier(null);
    setFormProductId(productId || '');
    setFormUnitLabel('1 KG');
    setFormQuantity('1');
    setFormTotalPrice('');
    setFormAppliesTo('retail');
    setFormCustomLabel(false);
    setShowModal(true);
  };

  const openEdit = (tier: PricingTier) => {
    setEditingTier(tier);
    setFormProductId(tier.productId);
    setFormUnitLabel(tier.unitLabel);
    setFormQuantity(tier.quantity.toString());
    setFormTotalPrice(tier.totalPrice.toString());
    setFormAppliesTo(tier.appliesTo);
    setFormCustomLabel(
      !DEFAULT_TIER_TEMPLATES.some((t) => t.unitLabel === tier.unitLabel)
    );
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const product = products.find((p) => p.id === formProductId);
    if (!product) return;

    const tier: PricingTier = {
      id: editingTier?.id || `T${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      productId: formProductId,
      productName: product.name,
      productImage: getProductImage(product),
      unitLabel: formUnitLabel,
      quantity: parseFloat(formQuantity) || 1,
      totalPrice: parseFloat(formTotalPrice.replace(',', '.')) || 0,
      isActive: editingTier?.isActive ?? true,
      appliesTo: formAppliesTo,
    };

    if (editingTier) {
      updateTiers(tiers.map((t) => (t.id === editingTier.id ? tier : t)));
    } else {
      updateTiers([...tiers, tier]);
    }
    setShowModal(false);
  };

  const handleTemplateClick = (template: { unitLabel: string; quantity: number }) => {
    setFormUnitLabel(template.unitLabel);
    setFormQuantity(template.quantity.toString());
    setFormCustomLabel(false);
  };

  const selectedProduct = products.find((p) => p.id === formProductId);
  const unitPricePreview = selectedProduct && formTotalPrice
    ? parseFloat(formTotalPrice.replace(',', '.')) / (parseFloat(formQuantity) || 1)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-verde-800 text-white px-4 md:px-6 py-3 flex items-center gap-3">
        <span className="w-8 h-8 flex items-center justify-center bg-verde-700 rounded-lg">
          <i className="ri-percent-line" />
        </span>
        <div>
          <h1 className="text-base font-bold">Reglas de Precios</h1>
          <p className="text-xs text-verde-300">Precios escalonados por cantidad · 1kg / 2kg / 4kg</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => openCreate()}
            className="flex items-center gap-1.5 px-3 py-2 bg-verde-700 hover:bg-verde-600 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-add-line" />
            Nueva regla
          </button>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-6">
        {/* Active tiers cards */}
        {activeTiers.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-800">Reglas activas</h2>
              <span className="text-xs text-gray-400">{activeTiers.length} regla{activeTiers.length !== 1 ? 's' : ''}</span>
            </div>

            {groupedByProduct.map(({ product, tiers: productTiers }) => {
              const activeProductTiers = productTiers.filter((t) => t.isActive);
              if (activeProductTiers.length === 0) return null;

              return (
                <div key={product.id} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <img
                      src={getProductImage(product)}
                      alt={product.name}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                    <span className="text-xs font-medium text-gray-600">{product.name}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {activeProductTiers.map((tier) => {
                      const unitPrice = tier.totalPrice / tier.quantity;
                      return (
                        <div
                          key={tier.id}
                          className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
                        >
                          <div className="p-4 flex items-start gap-3">
                            <div className="relative flex-shrink-0">
                              <img
                                src={getProductImage(product)}
                                alt={product.name}
                                className="w-14 h-14 rounded-full object-cover border-2 border-gray-100"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-lg font-bold text-gray-800">{tier.unitLabel}</p>
                              <p className="text-xl font-bold text-verde-700">
                                ${formatMoney(tier.totalPrice)}
                              </p>
                              <p className="text-xs text-gray-400">
                                ${formatMoney(unitPrice)} / {product.unit}
                              </p>
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                {tier.appliesTo === 'retail' ? 'Minorista' : tier.appliesTo === 'wholesale' ? 'Mayorista' : 'Ambos'}
                              </p>
                            </div>
                          </div>
                          <div className="px-4 pb-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => toggleTier(tier.id)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                                  tier.isActive ? 'bg-verde-600' : 'bg-gray-300'
                                }`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    tier.isActive ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                              <span className={`text-xs font-medium ${tier.isActive ? 'text-verde-700' : 'text-gray-400'}`}>
                                {tier.isActive ? 'Activa' : 'Pausada'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openEdit(tier)}
                                className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-verde-700 rounded-md hover:bg-verde-50 transition-colors cursor-pointer"
                              >
                                <i className="ri-edit-line text-sm" />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteTier(tier.id)}
                                className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                              >
                                <i className="ri-delete-bin-line text-sm" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => openCreate(product.id)}
                      className="border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-verde-400 hover:text-verde-600 transition-colors cursor-pointer min-h-[130px]"
                    >
                      <i className="ri-add-line text-xl" />
                      <span className="text-xs font-medium">Agregar regla</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Products without tiers — quick add */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">Productos sin reglas</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {products
              .filter((p) => !tiers.some((t) => t.productId === p.id))
              .map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => openCreate(product.id)}
                  className="bg-white border border-gray-200 rounded-xl p-3 text-left hover:border-verde-400 hover:shadow-sm transition-all cursor-pointer"
                >
                  <img
                    src={getProductImage(product)}
                    alt={product.name}
                    className="w-10 h-10 rounded-full object-cover mb-2"
                  />
                  <p className="text-xs font-medium text-gray-800 truncate">{product.name}</p>
                  <p className="text-[10px] text-gray-400">${formatMoney(product.retailPrice)} / {product.unit}</p>
                </button>
              ))}
          </div>
        </div>

        {/* All tiers table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">Todas las ofertas</h2>
            <span className="text-xs text-gray-400">
              {activeTiers.length} activas · {inactiveTiers.length} pausadas
            </span>
          </div>
          {tiers.length === 0 ? (
            <div className="p-8 text-center">
              <span className="w-12 h-12 flex items-center justify-center bg-gray-100 rounded-xl mx-auto mb-3">
                <i className="ri-percent-line text-2xl text-gray-400" />
              </span>
              <p className="text-sm text-gray-400">Sin reglas de precio configuradas</p>
              <button
                type="button"
                onClick={() => openCreate()}
                className="mt-2 text-sm text-verde-700 font-medium hover:underline cursor-pointer"
              >
                Crear la primera regla
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Producto</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Cantidad</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Precio total</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Precio / unidad</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Aplica a</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-500">Estado</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {tiers.map((tier) => {
                    const product = products.find((p) => p.id === tier.productId);
                    const unitPrice = tier.totalPrice / tier.quantity;
                    return (
                      <tr
                        key={tier.id}
                        className={`border-b border-gray-100 last:border-0 hover:bg-gray-50 ${
                          !tier.isActive ? 'opacity-60' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <img
                              src={getProductImage(product || { category: 'Fiambres' } as Product)}
                              alt={tier.productName}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                            <span className="text-sm font-medium text-gray-800">{tier.productName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-gray-700">{tier.unitLabel}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-800">
                          ${formatMoney(tier.totalPrice)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          ${formatMoney(unitPrice)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-gray-500">
                            {tier.appliesTo === 'retail'
                              ? 'Minorista'
                              : tier.appliesTo === 'wholesale'
                                ? 'Mayorista'
                                : 'Ambos'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => toggleTier(tier.id)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                              tier.isActive ? 'bg-verde-600' : 'bg-gray-300'
                            }`}
                          >
                            <span
                              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                tier.isActive ? 'translate-x-5' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openEdit(tier)}
                              className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-verde-700 rounded-md hover:bg-verde-50 transition-colors cursor-pointer"
                            >
                              <i className="ri-edit-line text-sm" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteTier(tier.id)}
                              className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                            >
                              <i className="ri-delete-bin-line text-sm" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-800">
                {editingTier ? 'Editar regla' : 'Nueva regla de precio'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <i className="ri-close-line" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Product */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Producto</label>
                <select
                  required
                  value={formProductId}
                  onChange={(e) => setFormProductId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500 bg-white"
                >
                  <option value="">Seleccionar producto...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — ${formatMoney(p.retailPrice)} / {p.unit}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick templates */}
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Plantilla rápida</label>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_TIER_TEMPLATES.map((template) => (
                    <button
                      key={template.unitLabel}
                      type="button"
                      onClick={() => handleTemplateClick(template)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                        formUnitLabel === template.unitLabel && !formCustomLabel
                          ? 'bg-verde-700 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {template.unitLabel}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setFormCustomLabel(true);
                      setFormUnitLabel('');
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                      formCustomLabel
                        ? 'bg-verde-700 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Personalizado
                  </button>
                </div>
              </div>

              {/* Unit label */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Etiqueta</label>
                <input
                  type="text"
                  required
                  value={formUnitLabel}
                  onChange={(e) => {
                    setFormUnitLabel(e.target.value);
                    setFormCustomLabel(true);
                  }}
                  placeholder="Ej: 1 KG, 2 KG, 1/2 KG Molido"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Cantidad numérica</label>
                  <input
                    type="number"
                    required
                    min="0.1"
                    step="0.1"
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Precio total</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input
                      type="text"
                      required
                      value={formTotalPrice}
                      onChange={(e) => setFormTotalPrice(e.target.value)}
                      placeholder="11.700"
                      className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500"
                    />
                  </div>
                </div>
              </div>

              {/* Preview */}
              {selectedProduct && unitPricePreview > 0 && (
                <div className="bg-verde-50 rounded-lg p-3 space-y-1">
                  <p className="text-xs text-verde-700 font-medium">Vista previa</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Precio regular:</span>
                    <span className="font-medium text-gray-800">
                      ${formatMoney(selectedProduct.retailPrice * (parseFloat(formQuantity) || 1))}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Con regla:</span>
                    <span className="font-bold text-verde-700">${formatMoney(parseFloat(formTotalPrice.replace(',', '.')) || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Ahorro:</span>
                    <span className="font-bold text-naranja-600">
                      ${formatMoney(
                        selectedProduct.retailPrice * (parseFloat(formQuantity) || 1) -
                          (parseFloat(formTotalPrice.replace(',', '.')) || 0)
                      )}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Aplica a</label>
                <select
                  value={formAppliesTo}
                  onChange={(e) => setFormAppliesTo(e.target.value as 'retail' | 'wholesale' | 'both')}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-verde-500 bg-white"
                >
                  <option value="retail">Minorista</option>
                  <option value="wholesale">Mayorista</option>
                  <option value="both">Ambos</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-verde-700 hover:bg-verde-800 text-white font-semibold rounded-xl transition-colors cursor-pointer text-sm whitespace-nowrap"
                >
                  {editingTier ? 'Guardar cambios' : 'Crear regla'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer text-sm whitespace-nowrap"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}