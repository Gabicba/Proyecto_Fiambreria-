import { useEffect, useState } from "react";
import type { Channel, PricingRule, QuantityTier } from "@/types";
import { useApp } from "@/store/AppContext";
import Modal from "@/components/base/Modal";
import Button from "@/components/base/Button";
import NumberInput from "@/components/base/NumberInput";
import Select from "@/components/base/Select";
import { round3, toCurrency, uid } from "@/utils/format";

interface TierRuleModalProps {
  open: boolean;
  onClose: () => void;
  rule: PricingRule | null;
  presetProductId?: string;
  onSaved: (rule: PricingRule) => void;
}

interface TierDraft {
  id: string;
  from: number;
  to: number | null;
  open: boolean;
  price: number;
}

const channelOptions = [
  { value: "retail", label: "Minorista" },
  { value: "wholesale", label: "Mayorista" },
  { value: "both", label: "Ambos" },
];

const TierRuleModal = ({
  open,
  onClose,
  rule,
  presetProductId,
  onSaved,
}: TierRuleModalProps) => {
  const { state, productMap } = useApp();
  const [productId, setProductId] = useState("");
  const [channel, setChannel] = useState<Channel | "both">("both");
  const [label, setLabel] = useState("");
  const [tiers, setTiers] = useState<TierDraft[]>([]);
  const [error, setError] = useState("");

  const product = productMap.get(productId);
  const isKg = product?.unit === "kg";
  const step = isKg ? 0.001 : 1;
  const decimals = isKg ? 3 : 0;
  const productOptions = state.products.map((p) => ({
    value: p.id,
    label: `${p.name} (${p.unit === "kg" ? "kg" : "un"})`,
    hint: p.brand,
  }));

  const mkTier = (from: number, to: number | null, tierOpen: boolean, price: number): TierDraft => ({
    id: uid("tier"),
    from,
    to,
    open: tierOpen,
    price,
  });

  useEffect(() => {
    if (!open) return;
    const initialProduct = presetProductId ?? state.products[0]?.id ?? "";
    if (rule) {
      setProductId(rule.productId);
      setChannel(rule.channel);
      setLabel(rule.label);
      setTiers(
        rule.tiers.map((t) => ({
          id: t.id || uid("tier"),
          from: t.from,
          to: t.to,
          open: t.to === null,
          price: t.price,
        }))
      );
    } else {
      const p = productMap.get(initialProduct);
      setProductId(initialProduct);
      setChannel("both");
      setLabel("");
      setTiers([
        mkTier(0, p?.unit === "kg" ? 0.499 : 5, false, 0),
      ]);
    }
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, rule, presetProductId]);

  const addTier = () => {
    const list = [...tiers].sort((a, b) => a.from - b.from);
    const last = list[list.length - 1];
    const nextFrom = last
      ? last.open
        ? last.from
        : round3((last.to ?? last.from) + step)
      : 0;
    setTiers((prev) => [
      ...prev,
      mkTier(nextFrom, isKg ? round3(nextFrom + 0.499) : nextFrom + 4, false, 0),
    ]);
  };

  const updateTier = (id: string, patch: Partial<TierDraft>) =>
    setTiers((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const removeTier = (id: string) =>
    setTiers((prev) => prev.filter((t) => t.id !== id));

  const validate = (): string => {
    if (!productId) return "Selecciona un producto.";
    if (tiers.length === 0) return "Agrega al menos un tramo.";
    const sorted = [...tiers].sort((a, b) => a.from - b.from);
    for (let i = 0; i < sorted.length; i += 1) {
      const t = sorted[i];
      if (!t.open && (t.to ?? 0) < t.from) {
        return `El tramo ${i + 1} termina (${t.to}) antes de que empiece (${t.from}).`;
      }
      if (t.price <= 0) {
        return `El tramo ${i + 1} necesita un precio mayor a 0.`;
      }
      if (i > 0) {
        const prev = sorted[i - 1];
        const prevTo = prev.open ? Infinity : prev.to ?? prev.from;
        if (t.from <= prevTo) {
          return `El tramo ${i + 1} comienza en ${t.from}, pero el tramo anterior termina en ${
            prev.open ? "infinito" : prev.to
          }. Ajustá el inicio a partir de ${round3(prevTo + step)}.`;
        }
      }
    }
    return "";
  };

  const save = () => {
    const message = validate();
    if (message) {
      setError(message);
      return;
    }
    const finalTiers: QuantityTier[] = [...tiers]
      .sort((a, b) => a.from - b.from)
      .map((t) => ({
        id: t.id,
        from: t.from,
        to: t.open ? null : t.to,
        price: t.price,
      }));
    const finalRule: PricingRule = {
      id: rule?.id ?? uid("rule"),
      productId,
      type: isKg ? "kg-tier" : "unit-tier",
      channel,
      active: rule?.active ?? true,
      label: label.trim() || `${product?.name ?? "Producto"} por cantidad`,
      offerPrice: null,
      maxUnits: null,
      consumedUnits: rule?.consumedUnits ?? 0,
      endDate: null,
      tiers: finalTiers,
    };
    onSaved(finalRule);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={rule ? "Editar precios por cantidad" : "Nuevo precio por cantidad"}
      subtitle="Configura N tramos. Si el producto es por kg, la interfaz cambia a escalonado por kg automáticamente."
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button icon="ri-save-3-line" onClick={save}>
            Guardar tramos
          </Button>
        </>
      }
    >
      {error ? (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          <i className="ri-error-warning-line mt-0.5" /> <span>{error}</span>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-foreground-600 mb-1">
            Producto *
          </label>
          <Select
            value={productId}
            onChange={setProductId}
            options={productOptions}
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
        <div>
          <label className="block text-xs font-medium text-foreground-600 mb-1">
            Etiqueta
          </label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ej: Coca Cola por cantidad"
            className="w-full h-9 px-3 rounded-md border border-background-300 bg-background-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>
      </div>

      {product ? (
        <div className="mt-3 text-xs text-foreground-500">
          Interfaz activa:{" "}
          <strong className="text-foreground-700">
            {isKg ? "Escalonado por kg" : "Precio por cantidad (unidad)"}
          </strong>
          {isKg ? " · los tramos usan kilogramos (3 decimales)" : " · cantidades enteras"}
        </div>
      ) : null}

      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-foreground-500">
            Tramos
          </h4>
          <Button size="sm" variant="outline" icon="ri-add-line" onClick={addTier}>
            Agregar tramo
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="text-left text-xs text-foreground-500 border-b border-background-200">
                <th className="py-2 pr-2 font-medium">Desde</th>
                <th className="py-2 px-2 font-medium">Hasta</th>
                <th className="py-2 px-2 font-medium">
                  {isKg ? "Precio por kg" : "Precio por unidad"}
                </th>
                <th className="py-2 pl-2 font-medium w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-background-100">
              {[...tiers]
                .sort((a, b) => a.from - b.from)
                .map((t) => (
                  <tr key={t.id}>
                    <td className="py-2 pr-2">
                      <NumberInput
                        value={t.from}
                        onChange={(v) => updateTier(t.id, { from: v })}
                        decimals={decimals}
                        suffix={isKg ? "kg" : "un"}
                      />
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <NumberInput
                            value={t.to ?? 0}
                            onChange={(v) => updateTier(t.id, { to: v })}
                            decimals={decimals}
                            suffix={isKg ? "kg" : "un"}
                            disabled={t.open}
                          />
                        </div>
                        <label className="flex items-center gap-1 text-xs text-foreground-500 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={t.open}
                            onChange={(e) =>
                              updateTier(t.id, { open: e.target.checked })
                            }
                            className="w-4 h-4 accent-primary-500"
                          />
                          Sin limite
                        </label>
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <NumberInput
                        value={t.price}
                        onChange={(v) => updateTier(t.id, { price: v })}
                        suffix="$"
                      />
                    </td>
                    <td className="py-2 pl-2">
                      <button
                        type="button"
                        onClick={() => removeTier(t.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-md text-foreground-500 hover:bg-danger-soft hover:text-danger cursor-pointer"
                        aria-label="Quitar tramo"
                      >
                        <i className="ri-delete-bin-6-line" />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {tiers.length > 0 ? (
          <div className="mt-3 rounded-md bg-background-100 px-3 py-2 text-xs text-foreground-600">
            Vista previa:{" "}
            {[...tiers]
              .sort((a, b) => a.from - b.from)
              .map((t) => {
                const from = isKg ? t.from.toFixed(3) : t.from;
                const to = t.open
                  ? "∞"
                  : isKg
                    ? (t.to ?? 0).toFixed(3)
                    : t.to;
                return `${from}${isKg ? "kg" : "un"} a ${to}${
                  isKg ? "kg" : "un"
                } → ${toCurrency(t.price)}${isKg ? "/kg" : " c/u"}`;
              })
              .join("  ·  ")}
          </div>
        ) : null}
      </div>
    </Modal>
  );
};

export default TierRuleModal;