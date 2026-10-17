import { useEffect, useMemo, useState } from "react";
import type { Product, Unit } from "@/types";
import { useApp } from "@/store/AppContext";
import Modal from "@/components/base/Modal";
import Button from "@/components/base/Button";
import NumberInput from "@/components/base/NumberInput";
import Select from "@/components/base/Select";
import Chip from "@/components/base/Chip";
import { round2, toCurrency, toNumber, uid } from "@/utils/format";
import { costWithIva, margin, markup, multiplier } from "@/utils/pricing";
import { getStockState, stockStateLabel, stockStateTone } from "@/utils/inventory";

interface ProductFormModalProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
  onSaved: (product: Product) => void;
  onBuildCombo: (productId: string) => void;
  onCreateRule: (productId: string) => void;
  onCreateOffer: (productId: string) => void;
}

const emptyProduct = (categoryId: string): Product => ({
  id: uid("prod"),
  name: "",
  brand: "",
  categoryId,
  barcode: "",
  internalCode: "",
  supplierIds: [],
  unit: "unidad",
  costNet: 0,
  iva: 21,
  priceRetail: 0,
  priceWholesale: 0,
  samePrice: false,
  stock: 0,
  minStock: 0,
  active: true,
  createdAt: new Date().toISOString(),
});

const ProductFormModal = ({
  open,
  onClose,
  product,
  onSaved,
  onBuildCombo,
  onCreateRule,
  onCreateOffer,
}: ProductFormModalProps) => {
  const { state } = useApp();
  const [draft, setDraft] = useState<Product>(
    emptyProduct(state.categories[0]?.id ?? "")
  );
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setDraft(product ?? emptyProduct(state.categories[0]?.id ?? ""));
      setError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product]);

  const costIva = costWithIva(draft);
  const set = <K extends keyof Product>(key: K, value: Product[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const setRetailPrice = (price: number) =>
    setDraft((prev) => ({
      ...prev,
      priceRetail: price,
      priceWholesale: prev.samePrice ? price : prev.priceWholesale,
    }));

  const setWholesalePrice = (price: number) =>
    setDraft((prev) => ({ ...prev, priceWholesale: price }));

  const markupRetail = markup(draft.priceRetail, costIva);
  const markupWholesale = markup(draft.priceWholesale, costIva);
  const marginRetail = margin(draft.priceRetail, costIva);
  const marginWholesale = margin(draft.priceWholesale, costIva);
  const multRetail = multiplier(draft.priceRetail, costIva);
  const multWholesale = multiplier(draft.priceWholesale, costIva);
  const profitRetail = round2(draft.priceRetail - costIva);
  const profitWholesale = round2(draft.priceWholesale - costIva);

  const categories = state.categories.map((c) => ({
    value: c.id,
    label: c.name,
  }));
  const unitOptions = [
    { value: "unidad", label: "Unidad" },
    { value: "kg", label: "Kilogramos" },
  ];

  const toggleSupplier = (id: string) =>
    setDraft((prev) => ({
      ...prev,
      supplierIds: prev.supplierIds.includes(id)
        ? prev.supplierIds.filter((s) => s !== id)
        : [...prev.supplierIds, id],
    }));

  const stockState = useMemo(() => getStockState(draft), [draft]);

  const save = () => {
    if (!draft.name.trim()) {
      setError("El nombre del producto es obligatorio.");
      return;
    }
    if (draft.priceRetail <= 0) {
      setError("El precio minorista debe ser mayor a 0.");
      return;
    }
    const finalProduct: Product = {
      ...draft,
      priceWholesale: draft.samePrice ? draft.priceRetail : draft.priceWholesale,
      samePrice: draft.samePrice,
    };
    onSaved(finalProduct);
  };

  const lossRetail = profitRetail < 0;
  const lossWholesale = profitWholesale < 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={product ? "Editar producto" : "Nuevo producto"}
      subtitle="Informacion, costos, precios, rentabilidad e inventario en una sola ficha."
      size="xl"
      footer={
        <>
          {product ? (
            <div className="mr-auto flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                icon="ri-gift-2-line"
                onClick={() => onBuildCombo(product.id)}
              >
                Armar combo
              </Button>
              <Button
                variant="outline"
                icon="ri-price-tag-3-line"
                onClick={() => onCreateRule(product.id)}
              >
                Crear regla de precio
              </Button>
              <Button
                variant="outline"
                icon="ri-flashlight-line"
                onClick={() => onCreateOffer(product.id)}
              >
                Crear oferta
              </Button>
            </div>
          ) : null}
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button icon="ri-save-3-line" onClick={save}>
            Guardar producto
          </Button>
        </>
      }
    >
      {error ? (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          <i className="ri-error-warning-line" /> {error}
        </div>
      ) : null}

      <div className="space-y-5">
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-foreground-500 mb-2">
            Informacion
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-foreground-600 mb-1">
                Nombre *
              </label>
              <input
                value={draft.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Ej: Jamon cocido"
                className="w-full h-9 px-3 rounded-md border border-background-300 bg-background-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground-600 mb-1">
                Marca
              </label>
              <input
                value={draft.brand}
                onChange={(e) => set("brand", e.target.value)}
                placeholder="Ej: Paladini"
                className="w-full h-9 px-3 rounded-md border border-background-300 bg-background-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground-600 mb-1">
                Categoria
              </label>
              <Select
                value={draft.categoryId}
                onChange={(v) => set("categoryId", v)}
                options={categories}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground-600 mb-1">
                Codigo de barras
              </label>
              <input
                value={draft.barcode}
                onChange={(e) => set("barcode", e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-background-300 bg-background-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground-600 mb-1">
                Codigo interno
              </label>
              <input
                value={draft.internalCode}
                onChange={(e) => set("internalCode", e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-background-300 bg-background-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground-600 mb-1">
                Unidad
              </label>
              <Select
                value={draft.unit}
                onChange={(v) => set("unit", v as Unit)}
                options={unitOptions}
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-xs font-medium text-foreground-600 mb-1">
              Proveedor/es
            </label>
            <div className="flex flex-wrap gap-2">
              {state.suppliers.map((s) => {
                const active = draft.supplierIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleSupplier(s.id)}
                    className={`px-3 py-1.5 rounded-full border text-xs font-medium cursor-pointer ${
                      active
                        ? "bg-primary-500 text-background-50 border-primary-500"
                        : "border-background-300 text-foreground-600 hover:bg-background-100"
                    }`}
                  >
                    {s.name}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="rounded-md border border-background-200 p-4">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-foreground-500">
              Precios y costos
            </h4>
            <label className="flex items-center gap-2 text-sm text-foreground-700 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.samePrice}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setDraft((prev) => ({
                    ...prev,
                    samePrice: checked,
                    priceWholesale: checked ? prev.priceRetail : prev.priceWholesale,
                  }));
                }}
                className="w-4 h-4 accent-primary-500"
              />
              Usar el mismo precio para minorista y mayorista
            </label>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground-600 mb-1">
                Costo sin IVA
              </label>
              <NumberInput
                value={draft.costNet}
                onChange={(v) => set("costNet", v)}
                suffix="$"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground-600 mb-1">
                IVA %
              </label>
              <NumberInput
                value={draft.iva}
                onChange={(v) => set("iva", v)}
                suffix="%"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground-600 mb-1">
                Costo con IVA
              </label>
              <div className="h-9 px-3 rounded-md border border-background-200 bg-background-100 flex items-center text-sm text-foreground-700 tabular-nums">
                {toCurrency(costIva)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Chip tone="primary" icon="ri-user-line">
                  Minorista
                </Chip>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground-600 mb-1">
                    Precio minorista
                  </label>
                  <NumberInput
                    value={draft.priceRetail}
                    onChange={setRetailPrice}
                    suffix="$"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground-600 mb-1">
                    Multiplicador
                  </label>
                  <NumberInput
                    value={multRetail}
                    onChange={(v) => setRetailPrice(round2(costIva * v))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground-600 mb-1">
                    Markup %
                  </label>
                  <NumberInput
                    value={markupRetail}
                    onChange={(v) => setRetailPrice(round2(costIva * (1 + v / 100)))}
                    suffix="%"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground-600 mb-1">
                    Margen %
                  </label>
                  <div className="h-9 px-3 rounded-md border border-background-200 bg-background-100 flex items-center text-sm text-foreground-700 tabular-nums">
                    {toNumber(marginRetail, 1)}%
                  </div>
                </div>
              </div>
              <div
                className={`flex items-center justify-between rounded-md px-3 py-2 text-sm ${
                  lossRetail
                    ? "bg-danger-soft text-danger"
                    : "bg-success-soft text-success"
                }`}
              >
                <span className="font-medium">
                  {lossRetail ? "Perdida por unidad" : "Ganancia minorista"}
                </span>
                <span className="font-semibold tabular-nums">
                  {toCurrency(profitRetail)}
                </span>
              </div>
            </div>

            <div className={`space-y-3 ${draft.samePrice ? "opacity-50" : ""}`}>
              <div className="flex items-center gap-2">
                <Chip tone="accent" icon="ri-store-3-line">
                  Mayorista
                </Chip>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground-600 mb-1">
                    Precio mayorista
                  </label>
                  <NumberInput
                    value={draft.priceWholesale}
                    onChange={setWholesalePrice}
                    disabled={draft.samePrice}
                    suffix="$"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground-600 mb-1">
                    Multiplicador
                  </label>
                  <NumberInput
                    value={multWholesale}
                    onChange={(v) => setWholesalePrice(round2(costIva * v))}
                    disabled={draft.samePrice}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground-600 mb-1">
                    Markup %
                  </label>
                  <NumberInput
                    value={markupWholesale}
                    onChange={(v) =>
                      setWholesalePrice(round2(costIva * (1 + v / 100)))
                    }
                    disabled={draft.samePrice}
                    suffix="%"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground-600 mb-1">
                    Margen %
                  </label>
                  <div className="h-9 px-3 rounded-md border border-background-200 bg-background-100 flex items-center text-sm text-foreground-700 tabular-nums">
                    {toNumber(marginWholesale, 1)}%
                  </div>
                </div>
              </div>
              <div
                className={`flex items-center justify-between rounded-md px-3 py-2 text-sm ${
                  lossWholesale
                    ? "bg-danger-soft text-danger"
                    : "bg-success-soft text-success"
                }`}
              >
                <span className="font-medium">
                  {lossWholesale ? "Perdida por unidad" : "Ganancia mayorista"}
                </span>
                <span className="font-semibold tabular-nums">
                  {toCurrency(profitWholesale)}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-foreground-500 mb-2">
            Inventario
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-foreground-600 mb-1">
                Stock actual {draft.unit === "kg" ? "(kg)" : "(un)"}
              </label>
              <NumberInput
                value={draft.stock}
                onChange={(v) => set("stock", v)}
                decimals={draft.unit === "kg" ? 3 : 0}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground-600 mb-1">
                Stock minimo {draft.unit === "kg" ? "(kg)" : "(un)"}
              </label>
              <NumberInput
                value={draft.minStock}
                onChange={(v) => set("minStock", v)}
                decimals={draft.unit === "kg" ? 3 : 0}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-foreground-500">Estado:</span>
              <Chip tone={stockStateTone(stockState)}>
                {stockStateLabel(stockState)}
              </Chip>
            </div>
          </div>
        </section>
      </div>
    </Modal>
  );
};

export default ProductFormModal;