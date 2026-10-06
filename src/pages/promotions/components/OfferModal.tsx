import { useEffect, useState } from "react";
import type { Channel, OfferEndMode, PricingRule } from "@/types";
import { useApp } from "@/store/AppContext";
import Modal from "@/components/base/Modal";
import Button from "@/components/base/Button";
import NumberInput from "@/components/base/NumberInput";
import Select from "@/components/base/Select";
import Chip from "@/components/base/Chip";
import { toCurrency, toNumber, uid } from "@/utils/format";
import {
  basePrice,
  offerEndModeOf,
  offerRemaining,
  offerStatus,
} from "@/utils/pricing";

interface OfferModalProps {
  open: boolean;
  onClose: () => void;
  rule: PricingRule | null;
  presetProductId?: string;
  onSaved: (rule: PricingRule) => void;
}

const channelOptions = [
  { value: "retail", label: "Minorista" },
  { value: "wholesale", label: "Mayorista" },
  { value: "both", label: "Ambos" },
];

const endModes: { value: OfferEndMode; label: string; hint: string }[] = [
  { value: "date", label: "Hasta fecha", hint: "Termina en la fecha lí­mite." },
  {
    value: "quota",
    label: "Cupo promocional",
    hint: "Termina al consumir una cantidad en oferta.",
  },
  {
    value: "stock",
    label: "Hasta agotar stock",
    hint: "Aplica mientras haya stock disponible.",
  },
  {
    value: "date-quota",
    label: "Fecha + cupo",
    hint: "Termina cuando ocurra primero cualquiera de las dos.",
  },
];

const statusTone = (
  status: ReturnType<typeof offerStatus>
): "success" | "warning" | "danger" | "neutral" => {
  if (status === "activa") return "success";
  if (status === "agotada") return "warning";
  if (status === "vencida") return "danger";
  return "neutral";
};

const statusLabel = (status: ReturnType<typeof offerStatus>): string => {
  switch (status) {
    case "activa":
      return "Activa";
    case "agotada":
      return "Agotada";
    case "vencida":
      return "Vencida";
    default:
      return "Pausada";
  }
};

const OfferModal = ({
  open,
  onClose,
  rule,
  presetProductId,
  onSaved,
}: OfferModalProps) => {
  const { state, productMap } = useApp();
  const [productId, setProductId] = useState("");
  const [channel, setChannel] = useState<Channel | "both">("both");
  const [label, setLabel] = useState("");
  const [offerPrice, setOfferPrice] = useState(0);
  const [endMode, setEndMode] = useState<OfferEndMode>("date");
  const [maxUnits, setMaxUnits] = useState(0);
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState("");

  const productOptions = state.products.map((p) => ({
    value: p.id,
    label: `${p.name} (${p.unit === "kg" ? "kg" : "un"})`,
    hint: p.brand,
  }));

  useEffect(() => {
    if (!open) return;
    if (rule) {
      setProductId(rule.productId);
      setChannel(rule.channel);
      setLabel(rule.label);
      setOfferPrice(rule.offerPrice ?? 0);
      setEndMode(offerEndModeOf(rule));
      setMaxUnits(rule.maxUnits ?? 0);
      setEndDate(rule.endDate ? rule.endDate.slice(0, 10) : "");
    } else {
      setProductId(presetProductId ?? state.products[0]?.id ?? "");
      setChannel("both");
      setLabel("");
      setOfferPrice(0);
      setEndMode("date");
      setMaxUnits(0);
      setEndDate("");
    }
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, rule, presetProductId]);

  const product = productMap.get(productId);
  const normal = product ? basePrice(product, "retail") : 0;
  const unitLabel = product?.unit === "kg" ? "kg" : "un";
  const decimals = product?.unit === "kg" ? 3 : 0;

  const includesQuota = endMode === "quota" || endMode === "date-quota";
  const includesDate = endMode === "date" || endMode === "date-quota";
  const onlyStock = endMode === "stock";

  const save = () => {
    if (!productId) {
      setError("Seleccioná un producto.");
      return;
    }
    if (offerPrice <= 0) {
      setError("El precio de oferta debe ser mayor a 0.");
      return;
    }
    if (includesQuota && maxUnits <= 0) {
      setError("Ingresá la cantidad promocional del cupo (mayor a 0).");
      return;
    }
    if (includesDate && !endDate) {
      setError("Elegí la fecha de finalización de la oferta.");
      return;
    }
    const finalRule: PricingRule = {
      id: rule?.id ?? uid("rule"),
      productId,
      type: "temporal-offer",
      channel,
      active: rule?.active ?? true,
      label: label.trim() || `${product?.name ?? "Producto"} en oferta`,
      offerPrice,
      maxUnits: includesQuota ? maxUnits : null,
      consumedUnits: rule?.consumedUnits ?? 0,
      endDate:
        (includesDate || onlyStock) && endDate
          ? new Date(`${endDate}T23:59:59`).toISOString()
          : null,
      tiers: [],
      offerEndMode: endMode,
    };
    onSaved(finalRule);
  };

  const previewRule: PricingRule = {
    id: rule?.id ?? "preview",
    productId,
    type: "temporal-offer",
    channel,
    active: rule?.active ?? true,
    label,
    offerPrice,
    maxUnits: includesQuota ? maxUnits : null,
    consumedUnits: rule?.consumedUnits ?? 0,
    endDate: null,
    tiers: [],
    offerEndMode: endMode,
  };
  const currentStatus = offerStatus(previewRule, product);
  const remaining =
    includesQuota && rule ? offerRemaining(rule) : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={rule ? "Editar oferta temporal" : "Nueva oferta temporal"}
      subtitle="Precio especial por tiempo, por cupo promocional o hasta agotar stock. El cupo se consume recién con la venta confirmada por Caja."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button icon="ri-save-3-line" onClick={save}>
            Guardar oferta
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
        <div>
          <label className="block text-xs font-medium text-foreground-600 mb-1">
            Producto *
          </label>
          <Select value={productId} onChange={setProductId} options={productOptions} />
          {product ? (
            <p className="text-xs text-foreground-400 mt-1">
              Unidad: {unitLabel} · Stock físico actual:{" "}
              {toNumber(product.stock, decimals)} {unitLabel}
            </p>
          ) : null}
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
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-foreground-600 mb-1">
            Etiqueta
          </label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ej: Oferta Queso cremoso"
            className="w-full h-9 px-3 rounded-md border border-background-300 bg-background-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground-600 mb-1">
            Precio de oferta *
          </label>
          <NumberInput value={offerPrice} onChange={setOfferPrice} suffix="$" />
          {product ? (
            <p className="text-xs text-foreground-400 mt-1">
              Precio minorista normal: {toCurrency(normal)}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-xs font-medium text-foreground-600 mb-2">
          ¿Cómo termina la oferta?
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {endModes.map((mode) => {
            const active = endMode === mode.value;
            return (
              <button
                key={mode.value}
                type="button"
                onClick={() => setEndMode(mode.value)}
                className={`text-left rounded-md border px-3 py-2 cursor-pointer transition-colors ${
                  active
                    ? "border-primary-400 bg-primary-50"
                    : "border-background-200 hover:bg-background-100"
                }`}
              >
                <span className="flex items-center gap-2">
                  <i
                    className={`text-base ${
                      active
                        ? "ri-radio-button-line text-primary-600"
                        : "ri-checkbox-blank-circle-line text-foreground-400"
                    }`}
                  />
                  <span className="text-sm font-medium text-foreground-900">
                    {mode.label}
                  </span>
                </span>
                <span className="block text-xs text-foreground-500 mt-0.5 pl-6">
                  {mode.hint}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        {includesQuota ? (
          <div>
            <label className="block text-xs font-medium text-foreground-600 mb-1">
              Cantidad promocional (cupo) *
            </label>
            <NumberInput
              value={maxUnits}
              onChange={setMaxUnits}
              decimals={decimals}
              suffix={unitLabel}
            />
            <p className="text-xs text-foreground-400 mt-1">
              Es el cupo en oferta, no el stock físico. Ej: podés ofertar solo
              {" "}{toNumber(maxUnits, decimals)} {unitLabel} aunque haya más stock.
            </p>
            {rule ? (
              <p className="text-xs text-foreground-500 mt-1">
                Consumido: {toNumber(rule.consumedUnits, decimals)} {unitLabel} ·
                Restan: {toNumber(remaining ?? 0, decimals)} {unitLabel}
              </p>
            ) : null}
          </div>
        ) : null}

        {includesDate || onlyStock ? (
          <div>
            <label className="block text-xs font-medium text-foreground-600 mb-1">
              {onlyStock ? "Fecha límite (opcional)" : "Vigencia hasta *"}
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-background-300 bg-background-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
            {onlyStock ? (
              <p className="text-xs text-foreground-400 mt-1">
                Si no cargás fecha, la oferta aplica solo mientras haya stock.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-md border border-background-200 bg-background-100 px-3 py-2">
        <span className="text-xs text-foreground-500">Estado resultante</span>
        <Chip tone={statusTone(currentStatus)}>
          {statusLabel(currentStatus)}
        </Chip>
        <span className="text-xs text-foreground-500 ml-auto">
          El cupo se descuenta al confirmar la venta en Caja.
        </span>
      </div>
    </Modal>
  );
};

export default OfferModal;