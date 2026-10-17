import { useEffect, useMemo, useState } from "react";
import type { Channel, Combo, ComboComponent } from "@/types";
import { useApp } from "@/store/AppContext";
import Modal from "@/components/base/Modal";
import Button from "@/components/base/Button";
import NumberInput from "@/components/base/NumberInput";
import Select from "@/components/base/Select";
import Chip from "@/components/base/Chip";
import {
  comboEstimatedCost,
  comboNormalPrice,
} from "@/utils/pricing";
import { round2, toCurrency, uid } from "@/utils/format";

interface ComboModalProps {
  open: boolean;
  onClose: () => void;
  combo: Combo | null;
  presetProductId?: string;
  onSaved: (combo: Combo) => void;
}

interface DraftComponent {
  id: string;
  productId: string;
  quantity: number;
}

const channelOptions = [
  { value: "retail", label: "Minorista" },
  { value: "wholesale", label: "Mayorista" },
  { value: "both", label: "Ambos" },
];

const ComboModal = ({
  open,
  onClose,
  combo,
  presetProductId,
  onSaved,
}: ComboModalProps) => {
  const { state, productMap } = useApp();
  const [name, setName] = useState("");
  const [channel, setChannel] = useState<Channel | "both">("both");
  const [price, setPrice] = useState(0);
  const [components, setComponents] = useState<DraftComponent[]>([]);
  const [error, setError] = useState("");

  const productOptions = state.products.map((p) => ({
    value: p.id,
    label: `${p.name} (${p.unit === "kg" ? "kg" : "un"})`,
    hint: p.brand,
  }));

  const defaultProductId = presetProductId ?? state.products[0]?.id ?? "";

  useEffect(() => {
    if (!open) return;
    if (combo) {
      setName(combo.name);
      setChannel(combo.channel);
      setPrice(combo.price);
      setComponents(
        combo.components.map((c) => ({
          id: uid("comp"),
          productId: c.productId,
          quantity: c.quantity,
        }))
      );
    } else {
      setName("");
      setChannel("both");
      setPrice(0);
      setComponents(
        presetProductId
          ? [{ id: uid("comp"), productId: presetProductId, quantity: 1 }]
          : []
      );
    }
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, combo, presetProductId]);

  const estimatedCost = useMemo(
    () => comboEstimatedCost({ components }, productMap),
    [components, productMap]
  );

  const normalRetail = useMemo(
    () => comboNormalPrice({ components }, productMap, "retail"),
    [components, productMap]
  );
  const normalWholesale = useMemo(
    () => comboNormalPrice({ components }, productMap, "wholesale"),
    [components, productMap]
  );

  const addComponent = () =>
    setComponents((prev) => [
      ...prev,
      { id: uid("comp"), productId: defaultProductId, quantity: 1 },
    ]);

  const updateComponent = (id: string, patch: Partial<DraftComponent>) =>
    setComponents((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c))
    );

  const removeComponent = (id: string) =>
    setComponents((prev) => prev.filter((c) => c.id !== id));

  const save = () => {
    if (!name.trim()) {
      setError("El combo necesita un nombre.");
      return;
    }
    if (components.length === 0) {
      setError("El combo necesita al menos un componente.");
      return;
    }
    if (components.some((c) => !c.productId || c.quantity <= 0)) {
      setError("Cada componente debe tener producto y cantidad mayor a 0.");
      return;
    }
    const final: Combo = {
      id: combo?.id ?? uid("combo"),
      name: name.trim(),
      channel,
      price: round2(price),
      active: combo?.active ?? true,
      createdAt: combo?.createdAt ?? new Date().toISOString(),
      components: components.map<ComboComponent>((c) => ({
        productId: c.productId,
        quantity: c.quantity,
      })),
    };
    onSaved(final);
  };

  const referenceNormal = channel === "wholesale" ? normalWholesale : normalRetail;
  const profit = round2(price - estimatedCost);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={combo ? "Editar combo" : "Nuevo combo"}
      subtitle="El combo no tiene stock propio: al venderlo se descuentan sus componentes."
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button icon="ri-save-3-line" onClick={save}>
            Guardar combo
          </Button>
        </>
      }
    >
      {error ? (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          <i className="ri-error-warning-line" /> {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-foreground-600 mb-1">
            Nombre del combo *
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Combo Panchos"
            className="w-full h-9 px-3 rounded-md border border-background-300 bg-background-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground-600 mb-1">
            Aplica a
          </label>
          <Select
            value={channel}
            onChange={(v) => setChannel(v as Channel | "both")}
            options={channelOptions}
          />
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-foreground-500">
            Componentes
          </h4>
          <Button size="sm" variant="outline" icon="ri-add-line" onClick={addComponent}>
            Agregar componente
          </Button>
        </div>

        {components.length === 0 ? (
          <p className="text-sm text-foreground-400 py-4 text-center border border-dashed border-background-300 rounded-md">
            Agregá los productos que forman el combo.
          </p>
        ) : (
          <div className="space-y-2">
            {components.map((c) => {
              const product = productMap.get(c.productId);
              return (
                <div
                  key={c.id}
                  className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center rounded-md border border-background-200 p-2"
                >
                  <div className="flex-1">
                    <Select
                      value={c.productId}
                      onChange={(v) => updateComponent(c.id, { productId: v })}
                      options={productOptions}
                    />
                  </div>
                  <div className="w-full sm:w-32">
                    <NumberInput
                      value={c.quantity}
                      onChange={(v) => updateComponent(c.id, { quantity: v })}
                      decimals={product?.unit === "kg" ? 3 : 0}
                      suffix={product?.unit === "kg" ? "kg" : "un"}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeComponent(c.id)}
                    className="w-9 h-9 flex items-center justify-center rounded-md border border-background-300 text-foreground-500 hover:bg-danger-soft hover:text-danger cursor-pointer shrink-0"
                    aria-label="Quitar componente"
                  >
                    <i className="ri-close-line" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-foreground-600 mb-1">
            Precio promocional del combo *
          </label>
          <NumberInput value={price} onChange={setPrice} suffix="$" />
        </div>
        <div className="md:col-span-2 grid grid-cols-2 gap-3">
          <div className="rounded-md bg-background-100 px-3 py-2">
            <p className="text-xs text-foreground-500">Precio normal componentes</p>
            <p className="text-sm font-medium text-foreground-800 tabular-nums">
              {toCurrency(referenceNormal)}
            </p>
          </div>
          <div className="rounded-md bg-background-100 px-3 py-2">
            <p className="text-xs text-foreground-500">Costo estimado</p>
            <p className="text-sm font-medium text-foreground-800 tabular-nums">
              {toCurrency(estimatedCost)}
            </p>
          </div>
        </div>
      </div>

      <div
        className={`mt-3 flex items-center justify-between rounded-md px-3 py-2 text-sm ${
          profit < 0 ? "bg-danger-soft text-danger" : "bg-success-soft text-success"
        }`}
      >
        <span className="font-medium">
          {profit < 0 ? "Perdida estimada por combo" : "Ganancia estimada por combo"}
        </span>
        <span className="font-semibold tabular-nums">{toCurrency(profit)}</span>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-foreground-500">
        <Chip tone="neutral" icon="ri-information-line">
          Al venderlo se descuenta stock de cada componente
        </Chip>
      </div>
    </Modal>
  );
};

export default ComboModal;