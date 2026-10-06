import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Product } from "@/types";
import { useApp } from "@/store/AppContext";
import { useToast } from "@/components/base/Toast";
import Button from "@/components/base/Button";
import Chip from "@/components/base/Chip";
import Select from "@/components/base/Select";
import ProductFormModal from "./components/ProductFormModal";
import BulkUpdateModal from "./components/BulkUpdateModal";
import StockMovementsModal from "./components/StockMovementsModal";
import IconButton from "@/components/base/IconButton";
import { costWithIva, markup } from "@/utils/pricing";
import { getStockState, stockStateLabel, stockStateTone } from "@/utils/inventory";
import { normalizeText, toCurrency, toNumber } from "@/utils/format";

const ProductsPage = () => {
  const { state, productMap, upsertProduct, bulkUpdatePrices, currentUser } =
    useApp();
  const { notify } = useToast();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [unitFilter, setUnitFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [stockModalId, setStockModalId] = useState<string | null>(null);

  // Restaura la posicion exacta al volver de un acceso rapido (combos, reglas u ofertas).
  useEffect(() => {
    const saved = sessionStorage.getItem("products:restoreScroll");
    if (saved === null) return;
    sessionStorage.removeItem("products:restoreScroll");
    const y = Number(saved);
    if (!Number.isFinite(y) || y <= 0) return;
    window.scrollTo(0, y);
    requestAnimationFrame(() => window.scrollTo(0, y));
  }, []);

  const stockModalFor = stockModalId ? productMap.get(stockModalId) ?? null : null;

  const supplierName = (ids: string[]): string =>
    ids
      .map((id) => state.suppliers.find((s) => s.id === id)?.name ?? "")
      .filter(Boolean)
      .join(", ") || "—";

  const categoryName = (id: string): string =>
    state.categories.find((c) => c.id === id)?.name ?? "—";

  const filtered = useMemo(() => {
    const q = normalizeText(query).trim();
    return state.products.filter((p) => {
      if (categoryId !== "all" && p.categoryId !== categoryId) return false;
      if (unitFilter !== "all" && p.unit !== unitFilter) return false;
      if (stockFilter !== "all") {
        const s = getStockState(p);
        if (stockFilter === "low" && s !== "low") return false;
        if (stockFilter === "out" && s !== "out") return false;
        if (stockFilter === "negative" && s !== "negative") return false;
      }
      if (q) {
        const hay = normalizeText(
          `${p.name} ${p.brand} ${p.internalCode} ${p.barcode}`
        );
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [state.products, query, categoryId, unitFilter, stockFilter]);

  const kpis = useMemo(() => {
    const low = state.products.filter((p) => getStockState(p) === "low").length;
    const out = state.products.filter((p) => getStockState(p) === "out").length;
    const negative = state.products.filter(
      (p) => getStockState(p) === "negative"
    ).length;
    const value = state.products.reduce(
      (a, p) => a + costWithIva(p) * p.stock,
      0
    );
    return { low, out, negative, value };
  }, [state.products]);

  const toggleSelect = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );

  const toggleAll = () =>
    setSelected((prev) =>
      prev.length === filtered.length ? [] : filtered.map((p) => p.id)
    );

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setFormOpen(true);
  };

  const handleSaved = (product: Product) => {
    upsertProduct(product, currentUser?.name ?? "Sistema");
    setFormOpen(false);
    notify("Producto guardado", "success", product.name);
  };

  // Guarda donde estaba el usuario antes de saltar a Promociones, para volver al mismo punto.
  const goToPromotions = (query: string) => {
    setFormOpen(false);
    sessionStorage.setItem("products:restoreScroll", String(window.scrollY));
    navigate(`/precios?${query}`, { state: { fromProducts: true } });
  };

  const handleBuildCombo = (productId: string) => goToPromotions(`combo=${productId}`);

  const handleCreateRule = (productId: string) => goToPromotions(`tier=${productId}`);

  const handleCreateOffer = (productId: string) => goToPromotions(`offer=${productId}`);

  const applyBulk = (
    updates: {
      productId: string;
      costNet: number;
      priceRetail: number;
      priceWholesale: number;
    }[]
  ) => {
    if (!currentUser) return;
    bulkUpdatePrices(updates, currentUser);
    setBulkOpen(false);
    setSelected([]);
    setBulkMode(false);
    notify("Precios actualizados", "success", `${updates.length} productos`);
  };

  const selectedProducts = selected
    .map((id) => productMap.get(id))
    .filter((p): p is Product => Boolean(p));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="rounded-lg border border-background-200 bg-background-50 p-4">
          <p className="text-xs text-foreground-500">Productos</p>
          <p className="text-2xl font-semibold text-foreground-950">
            {state.products.length}
          </p>
        </div>
        <div className="rounded-lg border border-background-200 bg-background-50 p-4">
          <p className="text-xs text-foreground-500">Stock bajo</p>
          <p className="text-2xl font-semibold text-warning">{kpis.low}</p>
        </div>
        <div className="rounded-lg border border-background-200 bg-background-50 p-4">
          <p className="text-xs text-foreground-500">Sin stock</p>
          <p className="text-2xl font-semibold text-warning">{kpis.out}</p>
        </div>
        <div className="rounded-lg border border-background-200 bg-background-50 p-4">
          <p className="text-xs text-foreground-500">Stock negativo</p>
          <p className="text-2xl font-semibold text-danger">{kpis.negative}</p>
        </div>
        <div className="rounded-lg border border-background-200 bg-background-50 p-4 col-span-2 lg:col-span-1">
          <p className="text-xs text-foreground-500">Valorizado (costo)</p>
          <p className="text-2xl font-semibold text-foreground-950 tabular-nums">
            {toCurrency(kpis.value)}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-background-200 bg-background-50">
        <div className="p-4 border-b border-background-200 flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="relative flex items-center flex-1">
            <i className="ri-search-line absolute left-3 text-foreground-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, marca o codigo..."
              className="w-full h-9 pl-9 pr-3 rounded-md border border-background-300 bg-background-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 lg:w-auto">
            <Select
              className="min-w-[140px]"
              value={categoryId}
              onChange={setCategoryId}
              options={[
                { value: "all", label: "Todas las categorias" },
                ...state.categories.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
            <Select
              className="min-w-[120px]"
              value={unitFilter}
              onChange={setUnitFilter}
              options={[
                { value: "all", label: "Todas las unidades" },
                { value: "unidad", label: "Unidad" },
                { value: "kg", label: "Kilogramos" },
              ]}
            />
            <Select
              className="min-w-[130px]"
              value={stockFilter}
              onChange={setStockFilter}
              options={[
                { value: "all", label: "Todo el stock" },
                { value: "low", label: "Stock bajo" },
                { value: "out", label: "Sin stock" },
                { value: "negative", label: "Stock negativo" },
              ]}
            />
          </div>
          <div className="flex items-center gap-2 lg:ml-auto">
            <Button
              variant={bulkMode ? "secondary" : "outline"}
              icon="ri-checkbox-multiple-line"
              onClick={() => {
                setBulkMode((b) => !b);
                setSelected([]);
              }}
            >
              Modo seleccion masiva
            </Button>
            <Button icon="ri-add-line" onClick={openNew}>
              Nuevo
            </Button>
          </div>
        </div>

        {bulkMode ? (
          <div className="px-4 py-2.5 border-b border-background-200 flex items-center justify-between gap-3 bg-background-100 flex-wrap">
            <span className="text-sm text-foreground-600">
              {selected.length} producto(s) seleccionado(s)
            </span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={toggleAll}>
                {selected.length === filtered.length && filtered.length > 0
                  ? "Deseleccionar todo"
                  : "Seleccionar todo"}
              </Button>
              <Button
                size="sm"
                disabled={selected.length === 0}
                icon="ri-edit-2-line"
                onClick={() => setBulkOpen(true)}
              >
                Actualizacion masiva
              </Button>
            </div>
          </div>
        ) : null}

        {/* Desktop table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-foreground-500 border-b border-background-200 bg-background-100/60">
                {bulkMode ? <th className="py-2.5 px-4 w-10" /> : null}
                <th className="py-2.5 px-4 font-medium">Producto</th>
                <th className="py-2.5 px-4 font-medium">Proveedor</th>
                <th className="py-2.5 px-4 font-medium text-right">Costo c/IVA</th>
                <th className="py-2.5 px-4 font-medium text-right">Minorista</th>
                <th className="py-2.5 px-4 font-medium text-right">Mayorista</th>
                <th className="py-2.5 px-4 font-medium text-right">Stock</th>
                <th className="py-2.5 px-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-background-100">
              {filtered.map((p) => {
                const cs = getStockState(p);
                return (
                  <tr key={p.id} className="hover:bg-background-100/50">
                    {bulkMode ? (
                      <td className="py-2.5 px-4">
                        <input
                          type="checkbox"
                          checked={selected.includes(p.id)}
                          onChange={() => toggleSelect(p.id)}
                          className="w-4 h-4 accent-primary-500"
                        />
                      </td>
                    ) : null}
                    <td className="py-2.5 px-4">
                      <button
                        type="button"
                        onClick={() => openEdit(p)}
                        className="text-left cursor-pointer"
                      >
                        <span className="block font-medium text-foreground-900 hover:text-primary-600">
                          {p.name}
                        </span>
                        <span className="block text-xs text-foreground-400">
                          {p.brand} · {categoryName(p.categoryId)} ·{" "}
                          {p.unit === "kg" ? "kg" : "un"}
                        </span>
                      </button>
                    </td>
                    <td className="py-2.5 px-4 text-foreground-600 text-xs">
                      {supplierName(p.supplierIds)}
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums text-foreground-700">
                      {toCurrency(costWithIva(p))}
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums">
                      <span className="block text-foreground-900">
                        {toCurrency(p.priceRetail)}
                      </span>
                      <span
                        className={`block text-xs ${
                          markup(p.priceRetail, costWithIva(p)) < 0
                            ? "text-danger"
                            : "text-foreground-400"
                        }`}
                      >
                        MK {toNumber(markup(p.priceRetail, costWithIva(p)), 0)}%
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums">
                      <span className="block text-foreground-900">
                        {toCurrency(p.samePrice ? p.priceRetail : p.priceWholesale)}
                      </span>
                      <span
                        className={`block text-xs ${
                          markup(
                            p.samePrice ? p.priceRetail : p.priceWholesale,
                            costWithIva(p)
                          ) < 0
                            ? "text-danger"
                            : "text-foreground-400"
                        }`}
                      >
                        MK{" "}
                        {toNumber(
                          markup(
                            p.samePrice ? p.priceRetail : p.priceWholesale,
                            costWithIva(p)
                          ),
                          0
                        )}
                        %
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <span className="block tabular-nums text-foreground-800">
                        {toNumber(p.stock, p.unit === "kg" ? 3 : 0)}
                      </span>
                      <Chip tone={stockStateTone(cs)}>
                        {stockStateLabel(cs)}
                      </Chip>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <IconButton
                          icon="ri-edit-line"
                          label="Editar producto"
                          onClick={() => openEdit(p)}
                        />
                        <IconButton
                          icon="ri-archive-2-line"
                          label="Ajustar stock y ver movimientos"
                          onClick={() => setStockModalId(p.id)}
                        />
                        <IconButton
                          icon="ri-price-tag-3-line"
                          label="Crear regla de precio"
                          onClick={() => handleCreateRule(p.id)}
                        />
                        <IconButton
                          icon="ri-flashlight-line"
                          label="Crear oferta temporal"
                          onClick={() => handleCreateOffer(p.id)}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="lg:hidden divide-y divide-background-100">
          {filtered.map((p) => {
            const cs = getStockState(p);
            return (
              <div key={p.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    {bulkMode ? (
                      <input
                        type="checkbox"
                        checked={selected.includes(p.id)}
                        onChange={() => toggleSelect(p.id)}
                        className="w-4 h-4 mt-1 accent-primary-500"
                      />
                    ) : null}
                    <div className="min-w-0">
                      <p className="font-medium text-foreground-900 truncate">
                        {p.name}
                      </p>
                      <p className="text-xs text-foreground-400">
                        {p.brand} · {p.unit === "kg" ? "kg" : "un"}
                      </p>
                    </div>
                  </div>
                  <Chip tone={stockStateTone(cs)}>
                    {toNumber(p.stock, p.unit === "kg" ? 3 : 0)}
                  </Chip>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-md bg-background-100 p-2">
                    <p className="text-foreground-400">Costo c/IVA</p>
                    <p className="text-foreground-800 tabular-nums">
                      {toCurrency(costWithIva(p))}
                    </p>
                  </div>
                  <div className="rounded-md bg-background-100 p-2">
                    <p className="text-foreground-400">Minorista</p>
                    <p className="text-foreground-800 tabular-nums">
                      {toCurrency(p.priceRetail)}
                    </p>
                  </div>
                  <div className="rounded-md bg-background-100 p-2">
                    <p className="text-foreground-400">Mayorista</p>
                    <p className="text-foreground-800 tabular-nums">
                      {toCurrency(p.samePrice ? p.priceRetail : p.priceWholesale)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    icon="ri-edit-line"
                    onClick={() => openEdit(p)}
                  >
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    icon="ri-archive-2-line"
                    onClick={() => setStockModalId(p.id)}
                  >
                    Inventario
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center text-foreground-400">
            <i className="ri-inbox-line text-5xl" />
            <p className="mt-3 text-sm">No hay productos que coincidan.</p>
          </div>
        ) : null}
      </div>

      <ProductFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        product={editing}
        onSaved={handleSaved}
        onBuildCombo={handleBuildCombo}
        onCreateRule={handleCreateRule}
        onCreateOffer={handleCreateOffer}
      />

      <BulkUpdateModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        selected={selectedProducts}
        onApply={applyBulk}
      />

      <StockMovementsModal
        open={Boolean(stockModalFor)}
        onClose={() => setStockModalId(null)}
        product={stockModalFor}
      />
    </div>
  );
};

export default ProductsPage;