import { useEffect, useState } from "react";
import type { Product, Unit } from "@/types";
import { useApp } from "@/store/AppContext";
import Modal from "@/components/base/Modal";
import Button from "@/components/base/Button";
import NumberInput from "@/components/base/NumberInput";
import Select from "@/components/base/Select";
import { round2, toCurrency, uid } from "@/utils/format";

interface QuickProductModalProps {
  open: boolean;
  supplierId: string;
  defaultCostNet: number;
  defaultIva: number;
  onClose: () => void;
  onCreated: (product: Product) => void;
}

const QuickProductModal = ({
  open,
  supplierId,
  defaultCostNet,
  defaultIva,
  onClose,
  onCreated,
}: QuickProductModalProps) => {
  const { state } = useApp();
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [categoryId, setCategoryId] = useState(state.categories[0]?.id ?? "");
  const [unit, setUnit] = useState<Unit>("unidad");
  const [iva, setIva] = useState(defaultIva);
  const [costNet, setCostNet] = useState(defaultCostNet);
  const [priceRetail, setPriceRetail] = useState(0);
  const [priceWholesale, setPriceWholesale] = useState(0);
  const [minStock, setMinStock] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setName("");
    setBrand("");
    setCategoryId(state.categories[0]?.id ?? "");
    setUnit("unidad");
    setIva(defaultIva);
    setCostNet(defaultCostNet);
    const suggested = round2(defaultCostNet * (1 + defaultIva / 100) * 1.6);
    setPriceRetail(suggested);
    setPriceWholesale(round2(suggested * 0.9));
    setMinStock(0);
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const create = () => {
    if (!name.trim()) {
      setError("El nombre del producto es obligatorio.");
      return;
    }
    if (costNet <= 0) {
      setError("El costo debe ser mayor a cero.");
      return;
    }
    if (priceRetail <= 0) {
      setError("El precio minorista debe ser mayor a cero.");
      return;
    }
    const product: Product = {
      id: uid("prod"),
      name: name.trim(),
      brand: brand.trim(),
      categoryId,
      barcode: "",
      internalCode: "",
      supplierIds: supplierId ? [supplierId] : [],
      unit,
      costNet: round2(costNet),
      iva,
      priceRetail: round2(priceRetail),
      priceWholesale: round2(priceWholesale || priceRetail),
      samePrice: !priceWholesale,
      stock: 0,
      minStock,
      active: true,
      createdAt: new Date().toISOString(),
    };
    onCreated(product);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Crear producto sin perder la carga"
      subtitle="Se agrega al catalogo y vuelve al ingreso de mercaderia en curso."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button icon="ri-add-line" onClick={create}>
            Crear y agregar
          </Button>
        </>
      }
    >
      {error ? (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          <i className="ri-error-warning-line" /> {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-foreground-600 mb-1">
            Nombre *
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Queso sardo"
            className="w-full h-9 px-3 rounded-md border border-background-300 bg-background-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground-600 mb-1">
            Marca
          </label>
          <input
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="w-full h-9 px-3 rounded-md border border-background-300 bg-background-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground-600 mb-1">
            Categoria
          </label>
          <Select
            value={categoryId}
            onChange={setCategoryId}
            options={state.categories.map((c) => ({ value: c.id, label: c.name }))}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground-600 mb-1">
            Unidad
          </label>
          <Select
            value={unit}
            onChange={(v) => setUnit(v as Unit)}
            options={[
              { value: "unidad", label: "Unidad" },
              { value: "kg", label: "Kilogramos" },
            ]}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground-600 mb-1">
            IVA %
          </label>
          <NumberInput value={iva} onChange={setIva} suffix="%" />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground-600 mb-1">
            Costo sin IVA
          </label>
          <NumberInput value={costNet} onChange={setCostNet} suffix="$" />
          <p className="mt-1 text-[11px] text-foreground-400">
            Costo con IVA {toCurrency(costNet * (1 + iva / 100))}
          </p>
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground-600 mb-1">
            Stock minimo
          </label>
          <NumberInput value={minStock} onChange={setMinStock} />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground-600 mb-1">
            Precio minorista *
          </label>
          <NumberInput value={priceRetail} onChange={setPriceRetail} suffix="$" />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground-600 mb-1">
            Precio mayorista
          </label>
          <NumberInput
            value={priceWholesale}
            onChange={setPriceWholesale}
            suffix="$"
          />
        </div>
      </div>
      <p className="mt-3 text-xs text-foreground-500 flex items-start gap-1.5">
        <i className="ri-information-line mt-0.5" />
        El stock inicial queda en cero y la cantidad de esta factura se suma al
        confirmar el ingreso.
      </p>
    </Modal>
  );
};

export default QuickProductModal;